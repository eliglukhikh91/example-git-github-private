import type { NextFunction, Request, Response } from 'express';
import { getConfig } from '../config/env.js';
import { verifyToken } from './tokens.js';
import { findUserById, type UserRecord } from '../services/users.js';
import { recordAuthEvent, requestContext } from './audit.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

function readAccessToken(req: Request): string | undefined {
  const config = getConfig();
  const fromCookie = req.cookies?.[config.cookies.accessName];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;
  return undefined;
}

/**
 * Требует действующую сессию. Роль берется из базы, а не из токена, чтобы
 * отзыв прав администратора в AD применялся при следующем же запросе.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = readAccessToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Требуется вход в систему' });
    return;
  }

  try {
    const claims = verifyToken(token, 'access');
    const user = await findUserById(claims.sub);
    if (!user) {
      res.status(401).json({ success: false, message: 'Учетная запись больше не существует' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Сессия истекла, войдите повторно' });
  }
}

/** Требует роль администратора, вычисленную из групп Active Directory. */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Требуется вход в систему' });
    return;
  }

  if (req.user.role !== 'admin') {
    const context = requestContext(req);
    await recordAuthEvent({
      eventType: 'access_denied',
      upn: req.user.upn,
      success: false,
      reason: 'not_admin',
      ip: context.ip,
      userAgent: context.userAgent,
      details: { method: req.method, path: req.originalUrl }
    });
    res.status(403).json({
      success: false,
      message: 'Действие доступно только участникам группы администраторов Active Directory'
    });
    return;
  }

  next();
}

/** Не отклоняет запрос без сессии, но заполняет req.user, если она есть. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = readAccessToken(req);
  if (token) {
    try {
      const claims = verifyToken(token, 'access');
      const user = await findUserById(claims.sub);
      if (user) req.user = user;
    } catch {
      // анонимный запрос — просто идем дальше
    }
  }
  next();
}
