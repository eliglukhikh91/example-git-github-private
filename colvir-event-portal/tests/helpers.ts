import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { FileDirectory } from '../server/auth/directory.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/colvir_events_test';

/**
 * Готовит окружение до первого импорта модулей приложения: конфигурация и пул
 * соединений кешируются при первом обращении, поэтому переменные должны быть
 * выставлены заранее.
 */
export function prepareTestEnv(): { directoryFile: string } {
  const directoryFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'colvir-test-')),
    'directory.json'
  );

  const users = [
    {
      upn: 'i.ivanov@colvir.com',
      samAccountName: 'i.ivanov',
      email: 'i.ivanov@colvir.com',
      firstName: 'Иван',
      lastName: 'Иванов',
      displayName: 'Иванов Иван',
      department: 'Департамент разработки',
      title: 'Разработчик',
      company: 'Colvir Software Solutions',
      memberOf: ['CN=Colvir-Employees,OU=Groups,DC=colvir,DC=com'],
      passwordHash: FileDirectory.hashPassword('UserPass123!')
    },
    {
      upn: 'a.admin@colvir.com',
      samAccountName: 'a.admin',
      email: 'a.admin@colvir.com',
      firstName: 'Анна',
      lastName: 'Админова',
      displayName: 'Админова Анна',
      department: 'HR & Event Team',
      title: 'Менеджер мероприятий',
      company: 'Colvir Software Solutions',
      memberOf: [
        'CN=Colvir-Employees,OU=Groups,DC=colvir,DC=com',
        'CN=Colvir-Event-Managers,OU=Groups,DC=colvir,DC=com'
      ],
      passwordHash: FileDirectory.hashPassword('AdminPass123!')
    },
    {
      upn: 'e.external@partner.org',
      samAccountName: 'e.external',
      email: 'e.external@partner.org',
      firstName: 'Егор',
      lastName: 'Внешний',
      displayName: 'Внешний Егор',
      department: 'Подрядчик',
      title: '',
      company: '',
      memberOf: [],
      passwordHash: FileDirectory.hashPassword('ExternalPass123!')
    }
  ];

  fs.writeFileSync(directoryFile, JSON.stringify(users, null, 2));

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: 'test-secret-value-that-is-long-enough-for-validation-0123456789',
    AD_DOMAIN: 'COLVIR.COM',
    AD_ALLOWED_EMAIL_DOMAINS: 'colvir.com,colvir.ru',
    AD_ADMIN_GROUPS: 'Colvir-Event-Managers',
    AUTH_DEV_DIRECTORY_FILE: directoryFile,
    SSO_ENABLED: 'true',
    SSO_TRUSTED_PROXIES: '10.99.99.99',
    COOKIE_SECURE: 'false',
    FORCE_HTTPS: 'false',
    LOGIN_RATE_LIMIT_PER_MINUTE: '1000',
    RUN_MIGRATIONS_ON_START: 'false'
  });

  return { directoryFile };
}

export interface TestClient {
  baseUrl: string;
  /** Кука сессии хранится в клиенте так же, как её хранил бы браузер. */
  cookies: Map<string, string>;
  request: (
    path: string,
    options?: { method?: string; body?: unknown; headers?: Record<string, string> }
  ) => Promise<{ status: number; body: any }>;
  close: () => Promise<void>;
}

export async function startTestServer(app: import('express').Express): Promise<TestClient> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const cookies = new Map<string, string>();

  const request: TestClient['request'] = async (requestPath, options = {}) => {
    const headers: Record<string, string> = { ...options.headers };
    if (cookies.size > 0) {
      headers.cookie = Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    }
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}${requestPath}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value === '' && /Expires=Thu, 01 Jan 1970/i.test(raw)) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }

    const text = await response.text();
    let body: any = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    return { status: response.status, body };
  };

  return {
    baseUrl,
    cookies,
    request,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}
