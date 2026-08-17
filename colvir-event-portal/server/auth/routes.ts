import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getConfig } from '../config/env.js';
import {
  getDirectory,
  AuthenticationError,
  DirectoryUnavailableError,
  type DirectoryProfile
} from './directory.js';
import { assertDirectoryProfileAllowed, resolveRole } from './roles.js';
import { setSessionCookies, clearSessionCookies, verifyToken } from './tokens.js';
import { recordAuthEvent, requestContext } from './audit.js';
import { upsertUserFromDirectory, findUserById, type UserRecord } from '../services/users.js';
import { requireAuth } from './middleware.js';
import { TrustedProxyList } from './trusted-proxy.js';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Укажите корпоративный email или логин Active Directory'),
  password: z.string().min(1, 'Укажите доменный пароль')
});

/** Публичное представление пользователя — без внутренних идентификаторов AD. */
export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    upn: user.upn,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    department: user.department,
    title: user.title,
    telegram: user.telegram,
    phone: user.phone,
    interests: user.interests,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isAdmin: user.role === 'admin',
    adGroups: user.adGroups,
    adSyncedAt: user.adSyncedAt
  };
}

export function createAuthRouter(): Router {
  const config = getConfig();
  const router = Router();
  const directory = getDirectory(config);
  const trustedProxies = new TrustedProxyList(config.sso.trustedProxies);

  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.security.loginRateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Слишком много попыток входа. Повторите через минуту.'
    }
  });

  /** Общая часть: профиль из каталога → проверки доступа → сессия. */
  async function establishSession(
    req: Request,
    res: Response,
    profile: DirectoryProfile,
    eventType: 'login_password' | 'login_sso'
  ): Promise<void> {
    const context = requestContext(req);
    const verdict = assertDirectoryProfileAllowed(profile, config);

    if (!verdict.ok) {
      await recordAuthEvent({
        eventType,
        upn: profile.upn,
        success: false,
        reason: verdict.reason,
        ...context
      });
      res.status(403).json({ success: false, message: verdict.message });
      return;
    }

    const role = resolveRole(profile.memberOf, config);
    const user = await upsertUserFromDirectory(profile, role);

    setSessionCookies(res, {
      sub: user.id,
      upn: user.upn,
      email: user.email,
      role: user.role
    });

    await recordAuthEvent({
      eventType,
      upn: user.upn,
      success: true,
      reason: null,
      ...context,
      details: { role: user.role, groups: user.adGroups.length }
    });

    res.json({
      success: true,
      message: `Успешная аутентификация в домене ${config.ad.domain}`,
      user: toPublicUser(user)
    });
  }

  async function handleDirectoryError(
    req: Request,
    res: Response,
    error: unknown,
    upn: string,
    eventType: 'login_password' | 'login_sso'
  ): Promise<void> {
    const context = requestContext(req);

    if (error instanceof AuthenticationError) {
      await recordAuthEvent({
        eventType,
        upn,
        success: false,
        reason: error.reason,
        ...context
      });
      // Наружу не раскрываем, существует ли учётная запись, — иначе эндпоинт
      // превращается в средство перебора логинов домена.
      const message =
        error.status === 403
          ? error.message
          : 'Неверный доменный логин или пароль Active Directory';
      res.status(error.status).json({ success: false, message });
      return;
    }

    if (error instanceof DirectoryUnavailableError) {
      await recordAuthEvent({
        eventType,
        upn,
        success: false,
        reason: error.reason,
        ...context
      });
      console.error('[auth] Каталог недоступен:', error.reason);
      res.status(503).json({
        success: false,
        message: 'Контроллер домена Active Directory временно недоступен. Повторите попытку позже.'
      });
      return;
    }

    await recordAuthEvent({
      eventType,
      upn,
      success: false,
      reason: `unexpected: ${(error as Error).message}`,
      ...context
    });
    console.error('[auth] Непредвиденная ошибка аутентификации:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера аутентификации' });
  }

  // -------------------------------------------------------------------------
  // Статус подключения к каталогу
  // -------------------------------------------------------------------------
  router.get('/ad/status', (_req, res) => {
    res.json({
      status: 'online',
      domain: config.ad.domain,
      directory: directory.kind,
      protocol: config.ldap.url.startsWith('ldaps://')
        ? 'LDAP over TLS (636)'
        : config.ldap.enabled
          ? 'LDAP (389)'
          : 'файловый каталог разработки',
      ssoEnabled: config.sso.enabled,
      allowedDomains: config.ad.allowedEmailDomains.map((d) => '@' + d),
      serverTimeMoscow: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    });
  });

  // -------------------------------------------------------------------------
  // Вход по доменному логину и паролю
  // -------------------------------------------------------------------------
  router.post('/ad/login', loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Некорректные данные для входа'
      });
      return;
    }

    const username = parsed.data.email.trim().toLowerCase();

    try {
      const profile = await directory.authenticate(username, parsed.data.password);
      await establishSession(req, res, profile, 'login_password');
    } catch (error) {
      await handleDirectoryError(req, res, error, username, 'login_password');
    }
  });

  // -------------------------------------------------------------------------
  // Сквозной вход (Kerberos/NTLM), выполняемый корпоративным reverse-proxy
  // -------------------------------------------------------------------------
  router.post('/ad/sso', loginLimiter, async (req, res) => {
    const context = requestContext(req);

    if (!config.sso.enabled) {
      await recordAuthEvent({
        eventType: 'login_sso',
        success: false,
        reason: 'sso_disabled',
        ...context
      });
      res.status(404).json({
        success: false,
        message: 'Сквозная аутентификация SSO на этом сервере отключена'
      });
      return;
    }

    // Ключевая проверка: заголовку доверяем только если запрос действительно
    // пришёл от корпоративного reverse-proxy, который выполнил Kerberos-негошиэйшн.
    // req.socket.remoteAddress — реальный отправитель пакета, его подделать нельзя.
    if (!trustedProxies.isTrusted(req.socket.remoteAddress)) {
      await recordAuthEvent({
        eventType: 'login_sso',
        success: false,
        reason: 'untrusted_source',
        ...context,
        details: { remoteAddress: req.socket.remoteAddress ?? null }
      });
      res.status(403).json({
        success: false,
        message: 'Сквозная аутентификация доступна только через корпоративный шлюз'
      });
      return;
    }

    const headerValue = req.get(config.sso.header)?.trim();
    if (!headerValue) {
      await recordAuthEvent({
        eventType: 'login_sso',
        success: false,
        reason: 'missing_sso_header',
        ...context
      });
      res.status(401).json({
        success: false,
        message: 'Шлюз не передал имя пользователя домена. Проверьте настройку Kerberos на прокси.'
      });
      return;
    }

    // Прокси присылает либо user@domain, либо DOMAIN\user — приводим к UPN.
    const username = headerValue.includes('\\')
      ? `${headerValue.split('\\')[1]}@${config.ad.domain}`.toLowerCase()
      : headerValue.toLowerCase();

    try {
      // Пароль не проверяем — его уже проверил Kerberos на шлюзе. Но профиль и
      // группы читаем из каталога, а не из заголовка.
      const profile = await directory.lookup(username);
      await establishSession(req, res, profile, 'login_sso');
    } catch (error) {
      await handleDirectoryError(req, res, error, username, 'login_sso');
    }
  });

  // -------------------------------------------------------------------------
  // Текущая сессия
  // -------------------------------------------------------------------------
  router.get('/me', requireAuth, (req, res) => {
    res.json({ success: true, user: toPublicUser(req.user!) });
  });

  // -------------------------------------------------------------------------
  // Обновление access-токена по refresh-cookie
  // -------------------------------------------------------------------------
  router.post('/refresh', async (req, res) => {
    const token = req.cookies?.[config.cookies.refreshName];
    if (typeof token !== 'string' || !token) {
      res.status(401).json({ success: false, message: 'Сессия не найдена' });
      return;
    }

    try {
      const claims = verifyToken(token, 'refresh');
      const user = await findUserById(claims.sub);
      if (!user) {
        clearSessionCookies(res);
        res.status(401).json({ success: false, message: 'Учётная запись больше не существует' });
        return;
      }

      setSessionCookies(res, {
        sub: user.id,
        upn: user.upn,
        email: user.email,
        role: user.role
      });

      await recordAuthEvent({
        eventType: 'refresh',
        upn: user.upn,
        success: true,
        ...requestContext(req)
      });

      res.json({ success: true, user: toPublicUser(user) });
    } catch {
      clearSessionCookies(res);
      res.status(401).json({ success: false, message: 'Сессия истекла, войдите повторно' });
    }
  });

  // -------------------------------------------------------------------------
  // Повторная синхронизация профиля и групп с каталогом
  // -------------------------------------------------------------------------
  router.post('/ad/sync', requireAuth, async (req, res) => {
    const current = req.user!;
    try {
      const profile = await directory.lookup(current.upn);
      const verdict = assertDirectoryProfileAllowed(profile, config);
      if (!verdict.ok) {
        clearSessionCookies(res);
        await recordAuthEvent({
          eventType: 'access_denied',
          upn: current.upn,
          success: false,
          reason: verdict.reason,
          ...requestContext(req)
        });
        res.status(403).json({ success: false, message: verdict.message });
        return;
      }

      const role = resolveRole(profile.memberOf, config);
      const user = await upsertUserFromDirectory(profile, role);

      // Роль могла измениться — перевыпускаем токены с актуальными правами.
      setSessionCookies(res, {
        sub: user.id,
        upn: user.upn,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        message: `Данные сотрудника и группы доступа синхронизированы с ${config.ad.domain}`,
        user: toPublicUser(user)
      });
    } catch (error) {
      if (error instanceof DirectoryUnavailableError) {
        res.status(503).json({
          success: false,
          message: 'Контроллер домена временно недоступен, синхронизация не выполнена'
        });
        return;
      }
      console.error('[auth] Ошибка синхронизации с каталогом:', error);
      res.status(500).json({ success: false, message: 'Не удалось синхронизировать данные с AD' });
    }
  });

  // -------------------------------------------------------------------------
  // Выход
  // -------------------------------------------------------------------------
  router.post('/logout', async (req, res) => {
    const token = req.cookies?.[config.cookies.accessName];
    let upn: string | null = null;
    if (typeof token === 'string') {
      try {
        upn = verifyToken(token, 'access').upn;
      } catch {
        // токен уже недействителен — всё равно чистим cookie
      }
    }

    clearSessionCookies(res);
    await recordAuthEvent({
      eventType: 'logout',
      upn,
      success: true,
      ...requestContext(req)
    });

    res.json({ success: true, message: 'Сессия Active Directory завершена' });
  });

  return router;
}
