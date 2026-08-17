import type { Request } from 'express';
import { query } from '../db/pool.js';

export type AuthAuditEvent =
  | 'login_password'
  | 'login_sso'
  | 'logout'
  | 'refresh'
  | 'access_denied'
  | 'admin_action';

export interface AuditEntry {
  eventType: AuthAuditEvent;
  upn?: string | null;
  success: boolean;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * В интерфейсе входа написано, что все попытки логируются службой безопасности.
 * Здесь это действительно происходит: запись уходит и в stdout (для сборщика
 * логов), и в таблицу auth_audit_log.
 */
export async function recordAuthEvent(entry: AuditEntry): Promise<void> {
  const line = [
    `[auth-audit] ${entry.eventType}`,
    `success=${entry.success}`,
    entry.upn ? `upn=${entry.upn}` : null,
    entry.reason ? `reason=${entry.reason}` : null,
    entry.ip ? `ip=${entry.ip}` : null
  ]
    .filter(Boolean)
    .join(' ');

  if (entry.success) {
    console.log(line);
  } else {
    console.warn(line);
  }

  try {
    await query(
      `INSERT INTO auth_audit_log (event_type, upn, success, reason, ip_address, user_agent, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        entry.eventType,
        entry.upn ?? null,
        entry.success,
        entry.reason ?? null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.details ? JSON.stringify(entry.details) : null
      ]
    );
  } catch (error) {
    // Отказ журнала не должен ломать вход, но обязан быть заметен в логах.
    console.error('[auth-audit] Не удалось записать событие в базу:', (error as Error).message);
  }
}

export function requestContext(req: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null
  };
}
