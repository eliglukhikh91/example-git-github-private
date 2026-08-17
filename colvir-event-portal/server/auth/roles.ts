import type { AppConfig } from '../config/env.js';
import type { DirectoryProfile } from './directory.js';

export type UserRole = 'user' | 'admin';

/**
 * Извлекает CN из DN группы: `CN=Colvir-Event-Managers,OU=Groups,DC=colvir,DC=com`
 * превращается в `colvir-event-managers`.
 */
export function groupCommonName(dn: string): string {
  const match = /^\s*CN=([^,]+)/i.exec(dn);
  const raw = match ? match[1] : dn;
  return raw.trim().toLowerCase();
}

export function normalizeGroups(memberOf: readonly string[]): string[] {
  return memberOf.map(groupCommonName).filter(Boolean);
}

/**
 * Роль определяется исключительно членством в группах Active Directory.
 * Никаких PIN-кодов и списков email в коде клиента.
 */
export function resolveRole(memberOf: readonly string[], config: AppConfig): UserRole {
  const groups = new Set(normalizeGroups(memberOf));
  const isAdmin = config.ad.adminGroups.some((group) => groups.has(groupCommonName(group)));
  return isAdmin ? 'admin' : 'user';
}

/** Проверяет, что у сотрудника есть группа, дающая доступ к порталу. */
export function hasPortalAccess(memberOf: readonly string[], config: AppConfig): boolean {
  if (config.ad.requiredGroups.length === 0) return true;
  const groups = new Set(normalizeGroups(memberOf));
  return config.ad.requiredGroups.some((group) => groups.has(groupCommonName(group)));
}

/** Домен корпоративной почты должен входить в белый список. */
export function isAllowedEmailDomain(email: string, config: AppConfig): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return config.ad.allowedEmailDomains.includes(domain);
}

export function assertDirectoryProfileAllowed(
  profile: DirectoryProfile,
  config: AppConfig
): { ok: true } | { ok: false; reason: string; message: string } {
  if (!isAllowedEmailDomain(profile.upn, config) && !isAllowedEmailDomain(profile.email, config)) {
    return {
      ok: false,
      reason: 'domain_not_allowed',
      message: `Доступ разрешён только сотрудникам с корпоративной почтой (${config.ad.allowedEmailDomains
        .map((d) => '@' + d)
        .join(', ')})`
    };
  }

  if (!hasPortalAccess(profile.memberOf, config)) {
    return {
      ok: false,
      reason: 'missing_required_group',
      message:
        'Учётная запись не входит в группу Active Directory, которой разрешён доступ к порталу мероприятий'
    };
  }

  return { ok: true };
}
