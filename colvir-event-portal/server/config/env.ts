import dotenv from 'dotenv';

dotenv.config();

/**
 * Значения, которые исторически лежали в репозитории как примеры.
 * Сервер отказывается стартовать в production, если они не заменены.
 */
const REJECTED_SECRETS = new Set([
  'colvir_events_secret_key_2026',
  'change_me',
  'changeme',
  'secret',
  'password'
]);

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  publicUrl: string;

  database: {
    url: string;
    ssl: boolean;
    poolMax: number;
  };

  jwt: {
    secret: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    issuer: string;
    audience: string;
  };

  cookies: {
    accessName: string;
    refreshName: string;
    secure: boolean;
    domain?: string;
    sameSite: 'lax' | 'strict' | 'none';
  };

  ad: {
    domain: string;
    allowedEmailDomains: string[];
    adminGroups: string[];
    /** Группы, дающие доступ к порталу вообще. Пусто = любой успешный bind. */
    requiredGroups: string[];
  };

  ldap: {
    enabled: boolean;
    url: string;
    bindDn: string;
    bindPassword: string;
    searchBase: string;
    userSearchFilter: string;
    tlsRejectUnauthorized: boolean;
    timeoutMs: number;
  };

  /**
   * Файловый каталог пользователей — ТОЛЬКО для локальной разработки и тестов.
   * В production наличие этой настройки приводит к отказу старта.
   */
  devDirectoryFile?: string;

  sso: {
    enabled: boolean;
    header: string;
    /** Список доверенных IP/CIDR reverse-proxy. Пусто = SSO выключен. */
    trustedProxies: string[];
  };

  security: {
    corsOrigins: string[];
    trustProxyHops: number;
    forceHttps: boolean;
    loginRateLimitPerMinute: number;
  };
}

class ConfigError extends Error {}

function requireEnv(name: string, errors: string[]): string {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`Не задана обязательная переменная окружения ${name}`);
    return '';
  }
  return value;
}

function parseList(raw: string | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function parseInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const errors: string[] = [];
  const nodeEnv = (env.NODE_ENV as NodeEnv) || 'development';
  const isProduction = nodeEnv === 'production';

  const databaseUrl = requireEnv('DATABASE_URL', errors);

  const jwtSecret = env.JWT_SECRET?.trim() ?? '';
  if (!jwtSecret) {
    errors.push('Не задана обязательная переменная окружения JWT_SECRET');
  } else if (REJECTED_SECRETS.has(jwtSecret.toLowerCase())) {
    errors.push(
      'JWT_SECRET содержит значение из примера конфигурации. Сгенерируйте новый секрет: openssl rand -base64 48'
    );
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET должен быть не короче 32 символов');
  }

  const ldapUrl = env.LDAP_URL?.trim() ?? '';
  const ldapBindDn = env.LDAP_BIND_DN?.trim() ?? '';
  const ldapBindPassword = env.LDAP_BIND_PASSWORD ?? '';
  const ldapSearchBase = env.LDAP_SEARCH_BASE?.trim() ?? '';
  const ldapEnabled = Boolean(ldapUrl && ldapBindDn && ldapBindPassword && ldapSearchBase);

  const devDirectoryFile = env.AUTH_DEV_DIRECTORY_FILE?.trim() || undefined;

  if (isProduction) {
    if (devDirectoryFile) {
      errors.push(
        'AUTH_DEV_DIRECTORY_FILE задан при NODE_ENV=production. Файловый каталог пользователей допустим только в разработке и тестах.'
      );
    }
    if (!ldapEnabled) {
      errors.push(
        'В production обязательны LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD и LDAP_SEARCH_BASE — без них аутентификация Active Directory невозможна.'
      );
    }
    if (ldapUrl.startsWith('ldap://') && !parseBool(env.LDAP_ALLOW_PLAINTEXT, false)) {
      errors.push(
        'LDAP_URL использует незашифрованный ldap://. Укажите ldaps://…:636 либо явно подтвердите риск через LDAP_ALLOW_PLAINTEXT=true (например, если TLS терминируется на уровне сети).'
      );
    }
  }

  if (!ldapEnabled && !devDirectoryFile) {
    errors.push(
      'Не настроен ни один источник учетных записей: задайте параметры LDAP_* либо AUTH_DEV_DIRECTORY_FILE для локальной разработки.'
    );
  }

  const ssoTrustedProxies = parseList(env.SSO_TRUSTED_PROXIES);
  const ssoEnabled = parseBool(env.SSO_ENABLED, false);
  if (ssoEnabled && ssoTrustedProxies.length === 0) {
    errors.push(
      'SSO_ENABLED=true требует SSO_TRUSTED_PROXIES — список IP/CIDR reverse-proxy, которому разрешено присылать заголовок пользователя. Иначе заголовок можно подделать снаружи.'
    );
  }

  const adminGroups = parseList(env.AD_ADMIN_GROUPS);
  if (adminGroups.length === 0) {
    errors.push(
      'Не задан AD_ADMIN_GROUPS — группы Active Directory, дающие права администратора (например: Colvir-Event-Managers).'
    );
  }

  if (errors.length > 0) {
    throw new ConfigError(
      'Некорректная конфигурация приложения:\n' + errors.map((e) => `  • ${e}`).join('\n')
    );
  }

  const secureCookies = parseBool(env.COOKIE_SECURE, isProduction);

  return {
    nodeEnv,
    isProduction,
    port: parseInteger(env.PORT, 3000),
    publicUrl: env.PUBLIC_URL?.trim() || `http://localhost:${parseInteger(env.PORT, 3000)}`,

    database: {
      url: databaseUrl,
      ssl: parseBool(env.DATABASE_SSL, false),
      poolMax: parseInteger(env.DATABASE_POOL_MAX, 10)
    },

    jwt: {
      secret: jwtSecret,
      accessTtlSeconds: parseInteger(env.JWT_ACCESS_TTL_SECONDS, 15 * 60),
      refreshTtlSeconds: parseInteger(env.JWT_REFRESH_TTL_SECONDS, 12 * 60 * 60),
      issuer: env.JWT_ISSUER?.trim() || 'colvir-event-portal',
      audience: env.JWT_AUDIENCE?.trim() || 'colvir-event-portal-web'
    },

    cookies: {
      accessName: env.COOKIE_ACCESS_NAME?.trim() || 'colvir_session',
      refreshName: env.COOKIE_REFRESH_NAME?.trim() || 'colvir_refresh',
      secure: secureCookies,
      domain: env.COOKIE_DOMAIN?.trim() || undefined,
      sameSite: (env.COOKIE_SAMESITE?.trim() as 'lax' | 'strict' | 'none') || 'lax'
    },

    ad: {
      domain: env.AD_DOMAIN?.trim() || 'COLVIR.COM',
      allowedEmailDomains: parseList(env.AD_ALLOWED_EMAIL_DOMAINS, [
        'colvir.com',
        'colvir.ru',
        'colvir.kz'
      ]).map((d) => d.toLowerCase().replace(/^@/, '')),
      adminGroups: adminGroups.map((g) => g.toLowerCase()),
      requiredGroups: parseList(env.AD_REQUIRED_GROUPS).map((g) => g.toLowerCase())
    },

    ldap: {
      enabled: ldapEnabled,
      url: ldapUrl,
      bindDn: ldapBindDn,
      bindPassword: ldapBindPassword,
      searchBase: ldapSearchBase,
      userSearchFilter:
        env.LDAP_USER_SEARCH_FILTER?.trim() ||
        '(&(objectClass=user)(|(userPrincipalName={{username}})(sAMAccountName={{sam}})(mail={{username}})))',
      tlsRejectUnauthorized: parseBool(env.LDAP_TLS_REJECT_UNAUTHORIZED, true),
      timeoutMs: parseInteger(env.LDAP_TIMEOUT_MS, 8000)
    },

    devDirectoryFile,

    sso: {
      enabled: ssoEnabled,
      header: (env.SSO_USER_HEADER?.trim() || 'x-remote-user').toLowerCase(),
      trustedProxies: ssoTrustedProxies
    },

    security: {
      corsOrigins: parseList(env.CORS_ORIGINS),
      trustProxyHops: parseInteger(env.TRUST_PROXY_HOPS, isProduction ? 1 : 0),
      forceHttps: parseBool(env.FORCE_HTTPS, isProduction),
      loginRateLimitPerMinute: parseInteger(env.LOGIN_RATE_LIMIT_PER_MINUTE, 10)
    }
  };
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

export function resetConfigCache(): void {
  cached = undefined;
}
