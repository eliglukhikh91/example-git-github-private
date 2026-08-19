import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prepareTestEnv, startTestServer, type TestClient } from './helpers.js';

prepareTestEnv();

const { createApp } = await import('../server/app.js');
const { runMigrations } = await import('../server/db/migrate.js');
const { query, closePool } = await import('../server/db/pool.js');
const { runScheduledTasks } = await import('../server/scheduler.js');

let employee: TestClient;
let admin: TestClient;

async function login(client: TestClient, email: string, password: string): Promise<void> {
  const response = await client.request('/api/auth/ad/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(response.status, 200, `не удалось войти как ${email}`);
}

/** Дедлайн, до которого запись еще открыта. */
function inFuture(minutes = 60): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function tomorrow(): string {
  const date = new Date(Date.now() + 24 * 60 * 60_000);
  return date.toISOString().slice(0, 10);
}

before(async () => {
  await runMigrations();
  await query('DELETE FROM coffee_cycles');
  await query('DELETE FROM notifications');
  await query('DELETE FROM users');

  const app = createApp();
  employee = await startTestServer(app);
  admin = await startTestServer(app);

  await login(employee, 'i.ivanov@colvir.com', 'UserPass123!');
  await login(admin, 'a.admin@colvir.com', 'AdminPass123!');
});

after(async () => {
  await Promise.all([employee.close(), admin.close()]);
  await closePool();
});

describe('Оформление портала', () => {
  test('тема общая и доступна всем на чтение', async () => {
    const response = await employee.request('/api/theme');
    assert.equal(response.status, 200);
    assert.equal(response.body.theme, 'classic');
  });

  test('рядовой сотрудник не может сменить тему', async () => {
    const response = await employee.request('/api/theme', {
      method: 'POST',
      body: { theme: 'newyear' }
    });
    assert.equal(response.status, 403);
  });

  test('администратор меняет тему для всех', async () => {
    const changed = await admin.request('/api/theme', {
      method: 'POST',
      body: { theme: 'newyear' }
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.theme, 'newyear');

    // Сотрудник видит ту же тему — она хранится на сервере, а не в браузере.
    const seen = await employee.request('/api/theme');
    assert.equal(seen.body.theme, 'newyear');

    await admin.request('/api/theme', { method: 'POST', body: { theme: 'classic' } });
  });

  test('неизвестная тема отклоняется', async () => {
    const response = await admin.request('/api/theme', {
      method: 'POST',
      body: { theme: 'halloween' }
    });
    assert.equal(response.status, 400);
  });
});

describe('Тег темы у мероприятия', () => {
  let eventId = '';

  test('мероприятие сохраняет выбранную тему подборки', async () => {
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Новогодний квиз',
        date: '2026-12-25',
        maxParticipants: 40,
        themeTag: 'newyear'
      }
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.event.themeTag, 'newyear');
    eventId = created.body.event.id;
  });

  test('без темы мероприятие в подборки не попадает', async () => {
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: { title: 'Обычная встреча', date: '2026-09-01', maxParticipants: 10 }
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.event.themeTag, null);
  });

  test('неизвестная тема отклоняется, а не пишется в базу', async () => {
    // Иначе значение упало бы на check-ограничении миграции 008 с невнятной
    // для пользователя ошибкой базы.
    const response = await admin.request('/api/events', {
      method: 'POST',
      body: { title: 'Хеллоуин', date: '2026-10-31', maxParticipants: 10, themeTag: 'halloween' }
    });
    assert.equal(response.status, 400);
  });

  test('тему подборки можно снять при правке', async () => {
    const events = await admin.request('/api/events');
    const target = events.body.events.find((e: any) => e.id === eventId);

    const updated = await admin.request(`/api/events/${eventId}`, {
      method: 'PUT',
      body: { ...target, themeTag: null }
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.event.themeTag, null);
  });

  test('тег виден рядовому сотруднику: по нему собирается подборка', async () => {
    // Свое мероприятие, а не из предыдущих тестов: там тег как раз снимали.
    const created = await admin.request('/api/events', {
      method: 'POST',
      body: {
        title: 'Весенний субботник',
        date: '2026-04-12',
        maxParticipants: 25,
        themeTag: 'spring'
      }
    });
    assert.equal(created.status, 201);

    const response = await employee.request('/api/events');
    const seen = response.body.events.find((e: any) => e.id === created.body.event.id);
    assert.equal(seen.themeTag, 'spring', 'сотрудник должен получать themeTag с мероприятиями');
  });
});

describe('Random Coffee: цикл и подбор', () => {
  let cycleId: number;

  test('сотрудник не может открыть цикл', async () => {
    const response = await employee.request('/api/coffee/cycles', {
      method: 'POST',
      body: { meetingDate: tomorrow(), registrationEndsAt: inFuture() }
    });
    assert.equal(response.status, 403);
  });

  test('администратор открывает цикл', async () => {
    const response = await admin.request('/api/coffee/cycles', {
      method: 'POST',
      body: {
        title: 'Тестовый раунд',
        meetingDate: tomorrow(),
        registrationEndsAt: inFuture()
      }
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.cycle.status, 'open');
    cycleId = response.body.cycle.id;
  });

  test('второй открытый цикл одновременно завести нельзя', async () => {
    const response = await admin.request('/api/coffee/cycles', {
      method: 'POST',
      body: { meetingDate: tomorrow(), registrationEndsAt: inFuture() }
    });
    assert.equal(response.status, 409);
  });

  test('сотрудник отмечает несколько слотов', async () => {
    const state = await employee.request('/api/coffee/state');
    assert.equal(state.status, 200);
    const slots: string[] = state.body.slots.slice(0, 3);
    assert.ok(slots.length >= 2, 'в справочнике должно быть несколько слотов');

    const saved = await employee.request('/api/coffee/availability', {
      method: 'PUT',
      body: { slots }
    });
    assert.equal(saved.status, 200);
    assert.deepEqual([...saved.body.myAvailability].sort(), [...slots].sort());
  });

  test('слот вне справочника игнорируется', async () => {
    const state = await employee.request('/api/coffee/state');
    const real: string = state.body.slots[0];

    const saved = await employee.request('/api/coffee/availability', {
      method: 'PUT',
      body: { slots: [real, 'в три часа ночи'] }
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.myAvailability, [real]);
  });

  test('подбор требует минимум двух участников', async () => {
    const response = await admin.request(`/api/coffee/cycles/${cycleId}/match`, {
      method: 'POST'
    });
    assert.equal(response.status, 409);
  });

  test('подбор сводит двоих и уведомляет обоих', async () => {
    const state = await employee.request('/api/coffee/state');
    const shared: string[] = state.body.slots.slice(0, 2);

    await employee.request('/api/coffee/availability', {
      method: 'PUT',
      body: { slots: shared }
    });
    await admin.request('/api/coffee/availability', {
      method: 'PUT',
      body: { slots: shared }
    });

    const result = await admin.request(`/api/coffee/cycles/${cycleId}/match`, { method: 'POST' });
    assert.equal(result.status, 200);
    assert.equal(result.body.matches.length, 1);
    assert.equal(result.body.matches[0].members.length, 2);
    assert.ok(shared.includes(result.body.matches[0].slot), 'слот должен подходить обоим');
    assert.equal(result.body.notified, 2, 'уведомление должны получить оба участника');
  });

  test('оба участника видят одну и ту же пару', async () => {
    const mine = await employee.request('/api/coffee/state');
    const theirs = await admin.request('/api/coffee/state');

    assert.ok(mine.body.myMatch, 'сотрудник должен видеть свою пару');
    assert.ok(theirs.body.myMatch, 'администратор должен видеть свою пару');
    assert.equal(
      mine.body.myMatch.id,
      theirs.body.myMatch.id,
      'это должна быть одна и та же встреча, а не два независимых результата'
    );
  });

  test('личное уведомление приходит сотруднику, а не только админу', async () => {
    const response = await employee.request('/api/notifications');
    assert.equal(response.status, 200);

    const match = response.body.notifications.find(
      (item: any) => item.type === 'random_coffee_match'
    );
    assert.ok(match, 'в личной ленте должно быть уведомление о паре');
    assert.equal(match.audience, 'user');
    assert.match(match.messageText, /подобран коллега/i);
  });

  test('после подбора доступность менять нельзя', async () => {
    const response = await employee.request('/api/coffee/availability', {
      method: 'PUT',
      body: { slots: [] }
    });
    // Открытого цикла больше нет — сервер отвечает понятной ошибкой.
    assert.equal(response.status, 409);
  });

  test('повторный подбор по тому же циклу отклоняется', async () => {
    const response = await admin.request(`/api/coffee/cycles/${cycleId}/match`, {
      method: 'POST'
    });
    assert.equal(response.status, 409);
  });

  test('чужое уведомление нельзя отметить прочитанным', async () => {
    const mine = await employee.request('/api/notifications');
    const notificationId = mine.body.notifications[0].id;

    const foreign = await startTestServer(createApp());
    try {
      await login(foreign, 'a.admin@colvir.com', 'AdminPass123!');
      // Администратор закрывает только административные записи.
      const response = await foreign.request(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      assert.equal(response.body.success, false);
    } finally {
      await foreign.close();
    }
  });
});

describe('Планировщик Random Coffee', () => {
  test('подбирает пары по истекшему дедлайну', async () => {
    // Открываем цикл и вручную отматываем дедлайн в прошлое.
    const created = await admin.request('/api/coffee/cycles', {
      method: 'POST',
      body: { meetingDate: tomorrow(), registrationEndsAt: inFuture(120) }
    });
    assert.equal(created.status, 201);
    const cycleId = created.body.cycle.id;

    const state = await employee.request('/api/coffee/state');
    const shared: string[] = state.body.slots.slice(0, 2);
    await employee.request('/api/coffee/availability', { method: 'PUT', body: { slots: shared } });
    await admin.request('/api/coffee/availability', { method: 'PUT', body: { slots: shared } });

    await query(
      `UPDATE coffee_cycles SET registration_ends_at = now() - interval '1 minute' WHERE id = $1`,
      [cycleId]
    );

    const result = await runScheduledTasks();
    assert.equal(result.matchedCycles, 1, 'планировщик должен закрыть просроченный цикл');
    assert.equal(result.notified, 2);

    const { rows } = await query<{ status: string }>(
      'SELECT status FROM coffee_cycles WHERE id = $1',
      [cycleId]
    );
    assert.equal(rows[0].status, 'matched');
  });
});
