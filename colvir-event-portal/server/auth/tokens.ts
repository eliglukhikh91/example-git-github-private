import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { getConfig } from '../config/env.js';
import type { UserRole } from './roles.js';

export interface SessionClaims {
  /** users.id */
  sub: string;
  upn: string;
  email: string;
  role: UserRole;
  /** Тип токена — доступ или обновление. */
  typ: 'access' | 'refresh';
}

export interface VerifiedSession extends SessionClaims {
  exp: number;
  iat: number;
}

function sign(claims: SessionClaims, ttlSeconds: number): string {
  const config = getConfig();
  return jwt.sign(claims, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  });
}

export function signAccessToken(claims: Omit<SessionClaims, 'typ'>): string {
  return sign({ ...claims, typ: 'access' }, getConfig().jwt.accessTtlSeconds);
}

export function signRefreshToken(claims: Omit<SessionClaims, 'typ'>): string {
  return sign({ ...claims, typ: 'refresh' }, getConfig().jwt.refreshTtlSeconds);
}

export function verifyToken(token: string, expectedType: 'access' | 'refresh'): VerifiedSession {
  const config = getConfig();
  const payload = jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }) as VerifiedSession;

  if (payload.typ !== expectedType) {
    throw new jwt.JsonWebTokenError(
      `Ожидался токен типа ${expectedType}, получен ${payload.typ ?? 'неизвестный'}`
    );
  }

  return payload;
}

/**
 * Токены кладутся только в httpOnly-cookie: JavaScript страницы их не видит,
 * поэтому XSS не дает возможности угнать сессию.
 */
export function setSessionCookies(
  res: Response,
  claims: Omit<SessionClaims, 'typ'>
): { accessToken: string; refreshToken: string } {
  const config = getConfig();
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);

  res.cookie(config.cookies.accessName, accessToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain,
    path: '/',
    maxAge: config.jwt.accessTtlSeconds * 1000
  });

  res.cookie(config.cookies.refreshName, refreshToken, {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain,
    // Refresh-токен отправляется браузером только на эндпоинт обновления сессии.
    path: '/api/auth/refresh',
    maxAge: config.jwt.refreshTtlSeconds * 1000
  });

  return { accessToken, refreshToken };
}

export function clearSessionCookies(res: Response): void {
  const config = getConfig();
  const base = {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    domain: config.cookies.domain
  } as const;

  res.clearCookie(config.cookies.accessName, { ...base, path: '/' });
  res.clearCookie(config.cookies.refreshName, { ...base, path: '/api/auth/refresh' });
}
