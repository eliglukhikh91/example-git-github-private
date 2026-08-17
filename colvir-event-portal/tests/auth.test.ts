import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prepareTestEnv, startTestServer, type TestClient } from './helpers.js';

prepareTestEnv();

// Импорты после prepareTestEnv: конфигурация читается при первом обращении.
const { createApp } = await import('../server/app.js');
const { runMigrations } = await import('../server/db/migrate.js');
const { query, closePool } = await import('../server/db/pool.js');

let client: TestClient;

before(async () => {
  await runMigrations();
  await query('DELETE FROM auth_audit_log');
  await query('DELETE FROM events');
  await query('DELETE FROM users');
  client = await startTestServer(createApp());
});

after(async () => {
  await client.close();
  await closePool();
});

describe('Аутентификация Active Directory', () => {
  test('пустой пароль отклоняется и не приводит к анонимному bind', async () => {
    const response = await client.request('/api/auth/ad/login', {
      method: 'POST',
      body: { email: 'i.ivanov@colvir.com', password: '' }
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
  });

  test('неверный пароль отклоняется', async () => {
    const response = await client.request('/api/auth/ad/login', {
      method: 'POST',
      body: { email: 'i.ivanov@colvir.com', password: 'НеверныйПароль' }
    });
    assert.equal(response.status, 401);
    assert.match(response.body.message, /Неверный доменный логин или пароль/);
  });

  test('несуществующая учётная запись даёт тот же ответ, что и неверный пароль', async () => {
    const response = await client.request('/api/auth/ad/login', {
      method: 'POST',
      body: { email: 'nobody@colvir.com', password: 'ЛюбойПароль' }
    });
    // Сообщения совпадают, чтобы эндпоинт нельзя было использовать
    // для перебора существующих логинов домена.
    assert.equal(response.status, 401);
    assert.match(response.body.message, /Неверный доменный логин или пароль/);
  });

  test('учётная запись вне разрешённых доменов не пускается', async () => {
    const response = await client.request('/api/auth/ad/login', {
      method: 'POST',
      body: { email: 'e.external@partner.org', password: 'ExternalPass123!' }
    });
    assert.equal(response.status, 403);
    assert.match(response.body.message, /корпоративной почтой/);
  });

  test('верный пароль выдаёт сессию в httpOnly-cookie', async () => {
    const response = await client.request('/api/auth/ad/login', {
      method: 'POST',
      body: { email: 'i.ivanov@colvir.com', password: 'UserPass123!' }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, 'i.ivanov@colvir.com');
    assert.equal(response.body.user.role, 'user');
    assert.ok(client.cookies.has('colvir_session'), 'должна быть установлена cookie сессии');

    // Токена нет в теле ответа — только в cookie, недоступной JavaScript.
    assert.equal(response.body.token, undefined);
    assert.equal(response.body.accessToken, undefined);
  });

  test('/api/auth/me возвращает профиль по cookie', async () => {
    const response = await client.request('/api/auth/me');
    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, 'i.ivanov@colvir.com');
    assert.equal(response.body.user.isAdmin, false);
  });

  test('роль администратора выдаётся по группе AD, а не по PIN', async () => {
    const anonymous = await startTestServer(createApp());
    try {
      const response = await anonymous.request('/api/auth/ad/login', {
        method: 'POST',
        body: { email: 'a.admin@colvir.com', password: 'AdminPass123!' }
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.user.role, 'admin');
      assert.ok(response.body.user.adGroups.includes('colvir-event-managers'));
    } finally {
      await anonymous.close();
    }
  });

  test('выход очищает cookie сессии', async () => {
    const session = await startTestServer(createApp());
    try {
      await session.request('/api/auth/ad/login', {
        method: 'POST',
        body: { email: 'i.ivanov@colvir.com', password: 'UserPass123!' }
      });
      assert.ok(session.cookies.has('colvir_session'));

      const response = await session.request('/api/auth/logout', { method: 'POST' });
      assert.equal(response.status, 200);
      assert.equal(session.cookies.has('colvir_session'), false);

      const me = await session.request('/api/auth/me');
      assert.equal(me.status, 401);
    } finally {
      await session.close();
    }
  });

  test('все попытки входа попадают в журнал безопасности', async () => {
    const { rows } = await query<{ event_type: string; success: boolean; reason: string | null }>(
      `SELECT event_type, success, reason FROM auth_audit_log ORDER BY id`
    );

    assert.ok(rows.length > 0, 'журнал не должен быть пустым');
    assert.ok(
      rows.some((row) => row.success === false && row.reason === 'invalid_credentials'),
      'неудачная попытка входа должна быть записана'
    );
    assert.ok(
      rows.some((row) => row.event_type === 'login_password' && row.success),
      'успешный вход должен быть записан'
    );
  });
});

describe('Сквозная аутентификация SSO', () => {
  test('заголовок X-Remote-User с недоверенного адреса отклоняется', async () => {
    const anonymous = await startTestServer(createApp());
    try {
      // Запрос приходит с 127.0.0.1, а доверенным прокси объявлен 10.99.99.99.
      const response = await anonymous.request('/api/auth/ad/sso', {
        method: 'POST',
        headers: { 'x-remote-user': 'a.admin@colvir.com' }
      });

      assert.equal(response.status, 403);
      assert.match(response.body.message, /корпоративный шлюз/);
      assert.equal(anonymous.cookies.has('colvir_session'), false);
    } finally {
      await anonymous.close();
    }
  });

  test('отказ SSO записывается в журнал с причиной untrusted_source', async () => {
    const { rows } = await query<{ count: number }>(
      `SELECT count(*)::bigint AS count FROM auth_audit_log
       WHERE event_type = 'login_sso' AND reason = 'untrusted_source'`
    );
    assert.ok(rows[0].count > 0);
  });
});
