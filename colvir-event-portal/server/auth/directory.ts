import { Client, InvalidCredentialsError, type Entry } from 'ldapts';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { getConfig, type AppConfig } from '../config/env.js';

/** Профиль сотрудника, каким его отдает каталог. */
export interface DirectoryProfile {
  upn: string;
  samAccountName: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  title: string;
  company: string;
  /** Полные DN групп, как их возвращает memberOf. */
  memberOf: string[];
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly reason: string,
    readonly status = 401
  ) {
    super(message);
  }
}

export class DirectoryUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: string
  ) {
    super(message);
  }
}

export interface Directory {
  readonly kind: 'ldap' | 'file';
  /** Проверяет пароль и возвращает профиль. Бросает AuthenticationError при неудаче. */
  authenticate(username: string, password: string): Promise<DirectoryProfile>;
  /** Читает профиль без проверки пароля — для SSO и периодической синхронизации. */
  lookup(username: string): Promise<DirectoryProfile>;
}

function firstValue(entry: Entry, key: string): string {
  const raw = entry[key];
  if (raw === undefined || raw === null) return '';
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first === undefined ? '' : String(first);
  }
  return String(raw);
}

function multiValue(entry: Entry, key: string): string[] {
  const raw = entry[key];
  if (raw === undefined || raw === null) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((value) => String(value));
}

const USER_ATTRIBUTES = [
  'dn',
  'userPrincipalName',
  'sAMAccountName',
  'mail',
  'givenName',
  'sn',
  'displayName',
  'department',
  'title',
  'company',
  'memberOf',
  'userAccountControl'
];

/** Флаг ACCOUNTDISABLE в userAccountControl Active Directory. */
const UAC_ACCOUNT_DISABLED = 0x0002;

/**
 * Экранирование значения для LDAP-фильтра по RFC 4515. Без него логин вида
 * `*)(objectClass=*` превращается в инъекцию в поисковый фильтр.
 */
export function escapeLdapFilterValue(value: string): string {
  return value.replace(/[\\*()\0/]/g, (char) => {
    switch (char) {
      case '\\':
        return '\\5c';
      case '*':
        return '\\2a';
      case '(':
        return '\\28';
      case ')':
        return '\\29';
      case '\0':
        return '\\00';
      case '/':
        return '\\2f';
      default:
        return char;
    }
  });
}

export class LdapDirectory implements Directory {
  readonly kind = 'ldap' as const;

  constructor(private readonly config: AppConfig) {}

  private createClient(): Client {
    return new Client({
      url: this.config.ldap.url,
      timeout: this.config.ldap.timeoutMs,
      connectTimeout: this.config.ldap.timeoutMs,
      tlsOptions: {
        rejectUnauthorized: this.config.ldap.tlsRejectUnauthorized
      }
    });
  }

  private buildFilter(username: string): string {
    const escaped = escapeLdapFilterValue(username);
    const sam = escapeLdapFilterValue(username.split('@')[0]);
    return this.config.ldap.userSearchFilter
      .replaceAll('{{username}}', escaped)
      .replaceAll('{{sam}}', sam);
  }

  /** Находит запись пользователя, подключаясь сервисной учетной записью. */
  private async findEntry(username: string): Promise<Entry> {
    const client = this.createClient();
    try {
      try {
        await client.bind(this.config.ldap.bindDn, this.config.ldap.bindPassword);
      } catch (error) {
        throw new DirectoryUnavailableError(
          'Не удалось подключиться к контроллеру домена сервисной учетной записью',
          `service_bind_failed: ${(error as Error).message}`
        );
      }

      const { searchEntries } = await client.search(this.config.ldap.searchBase, {
        scope: 'sub',
        filter: this.buildFilter(username),
        attributes: USER_ATTRIBUTES,
        sizeLimit: 2
      });

      if (searchEntries.length === 0) {
        throw new AuthenticationError(
          'Учетная запись не найдена в Active Directory',
          'user_not_found'
        );
      }
      if (searchEntries.length > 1) {
        throw new AuthenticationError(
          'Логину соответствует несколько учетных записей Active Directory',
          'ambiguous_user'
        );
      }

      return searchEntries[0];
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  private toProfile(entry: Entry): DirectoryProfile {
    const upn = firstValue(entry, 'userPrincipalName') || firstValue(entry, 'mail');
    const firstName = firstValue(entry, 'givenName');
    const lastName = firstValue(entry, 'sn');

    return {
      upn: upn.toLowerCase(),
      samAccountName: firstValue(entry, 'sAMAccountName'),
      email: (firstValue(entry, 'mail') || upn).toLowerCase(),
      firstName,
      lastName,
      displayName: firstValue(entry, 'displayName') || `${lastName} ${firstName}`.trim(),
      department: firstValue(entry, 'department'),
      title: firstValue(entry, 'title'),
      company: firstValue(entry, 'company'),
      memberOf: multiValue(entry, 'memberOf')
    };
  }

  private assertEnabled(entry: Entry): void {
    const uac = Number.parseInt(firstValue(entry, 'userAccountControl'), 10);
    if (Number.isFinite(uac) && (uac & UAC_ACCOUNT_DISABLED) !== 0) {
      throw new AuthenticationError(
        'Учетная запись отключена администратором домена',
        'account_disabled',
        403
      );
    }
  }

  async authenticate(username: string, password: string): Promise<DirectoryProfile> {
    // Пустой пароль в LDAP означает анонимный bind, который завершается успешно.
    // Без этой проверки любой существующий логин пускало бы без пароля.
    if (!password || password.trim().length === 0) {
      throw new AuthenticationError('Не указан доменный пароль', 'empty_password');
    }

    const entry = await this.findEntry(username);
    this.assertEnabled(entry);

    const userDn = String(entry.dn);
    const client = this.createClient();
    try {
      await client.bind(userDn, password);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new AuthenticationError(
          'Неверный логин или пароль',
          'invalid_credentials'
        );
      }
      throw new DirectoryUnavailableError(
        'Контроллер домена отклонил проверку учетных данных',
        `user_bind_error: ${(error as Error).message}`
      );
    } finally {
      await client.unbind().catch(() => undefined);
    }

    return this.toProfile(entry);
  }

  async lookup(username: string): Promise<DirectoryProfile> {
    const entry = await this.findEntry(username);
    this.assertEnabled(entry);
    return this.toProfile(entry);
  }
}

interface FileDirectoryUser {
  upn: string;
  samAccountName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  department?: string;
  title?: string;
  company?: string;
  memberOf?: string[];
  disabled?: boolean;
  /** scrypt-хеш пароля в формате scrypt$<saltHex>$<hashHex>. */
  passwordHash: string;
}

/**
 * Каталог из JSON-файла для локальной разработки и автотестов, когда доменного
 * контроллера нет. Пароли хранятся в виде scrypt-хешей — открытых паролей в
 * файле нет. В production такой каталог запрещен (см. проверку в config/env.ts).
 */
export class FileDirectory implements Directory {
  readonly kind = 'file' as const;

  constructor(private readonly filePath: string) {}

  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
  }

  private static verifyPassword(password: string, stored: string): boolean {
    const [scheme, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  }

  private async load(): Promise<FileDirectoryUser[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.users ?? []);
    } catch (error) {
      throw new DirectoryUnavailableError(
        `Не удалось прочитать файл каталога ${this.filePath}`,
        `file_directory_unreadable: ${(error as Error).message}`
      );
    }
  }

  private async find(username: string): Promise<FileDirectoryUser> {
    const users = await this.load();
    const needle = username.trim().toLowerCase();
    const found = users.find(
      (user) =>
        user.upn.toLowerCase() === needle ||
        user.email?.toLowerCase() === needle ||
        user.samAccountName?.toLowerCase() === needle
    );
    if (!found) {
      throw new AuthenticationError('Учетная запись не найдена в каталоге', 'user_not_found');
    }
    if (found.disabled) {
      throw new AuthenticationError('Учетная запись отключена', 'account_disabled', 403);
    }
    return found;
  }

  private toProfile(user: FileDirectoryUser): DirectoryProfile {
    const firstName = user.firstName ?? '';
    const lastName = user.lastName ?? '';
    return {
      upn: user.upn.toLowerCase(),
      samAccountName: user.samAccountName ?? user.upn.split('@')[0],
      email: (user.email ?? user.upn).toLowerCase(),
      firstName,
      lastName,
      displayName: user.displayName ?? `${lastName} ${firstName}`.trim(),
      department: user.department ?? '',
      title: user.title ?? '',
      company: user.company ?? '',
      memberOf: user.memberOf ?? []
    };
  }

  async authenticate(username: string, password: string): Promise<DirectoryProfile> {
    if (!password || password.trim().length === 0) {
      throw new AuthenticationError('Не указан пароль', 'empty_password');
    }
    const user = await this.find(username);
    if (!FileDirectory.verifyPassword(password, user.passwordHash)) {
      throw new AuthenticationError('Неверный логин или пароль', 'invalid_credentials');
    }
    return this.toProfile(user);
  }

  async lookup(username: string): Promise<DirectoryProfile> {
    return this.toProfile(await this.find(username));
  }
}

let directory: Directory | undefined;

export function getDirectory(config: AppConfig = getConfig()): Directory {
  if (!directory) {
    if (config.ldap.enabled) {
      directory = new LdapDirectory(config);
    } else if (config.devDirectoryFile) {
      console.warn(
        '[auth] ВНИМАНИЕ: используется файловый каталог пользователей ' +
          `(${config.devDirectoryFile}). Допустимо только для разработки и тестов.`
      );
      directory = new FileDirectory(config.devDirectoryFile);
    } else {
      // loadConfig() не пропускает такую конфигурацию, но оставляем явную ошибку.
      throw new Error('Не сконфигурирован источник учетных записей');
    }
  }
  return directory;
}

export function resetDirectoryCache(): void {
  directory = undefined;
}
