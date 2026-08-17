import { query } from '../db/pool.js';
import type { DirectoryProfile } from '../auth/directory.js';
import { normalizeGroups, type UserRole } from '../auth/roles.js';

export interface UserRecord {
  id: string;
  upn: string;
  samAccountName: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  title: string;
  company: string;
  telegram: string;
  phone: string;
  interests: string[];
  avatarUrl: string | null;
  role: UserRole;
  adGroups: string[];
  adSyncedAt: string | null;
  lastLoginAt: string | null;
}

interface UserRow {
  id: string;
  upn: string;
  sam_account_name: string | null;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  department: string;
  title: string;
  company: string;
  telegram: string;
  phone: string;
  interests: string[];
  avatar_url: string | null;
  role: UserRole;
  ad_groups: string[];
  ad_synced_at: Date | null;
  last_login_at: Date | null;
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    upn: row.upn,
    samAccountName: row.sam_account_name,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    department: row.department,
    title: row.title,
    company: row.company,
    telegram: row.telegram,
    phone: row.phone,
    interests: row.interests ?? [],
    avatarUrl: row.avatar_url,
    role: row.role,
    adGroups: row.ad_groups ?? [],
    adSyncedAt: row.ad_synced_at?.toISOString() ?? null,
    lastLoginAt: row.last_login_at?.toISOString() ?? null
  };
}

const SELECT_COLUMNS = `
  id, upn, sam_account_name, email, first_name, last_name, display_name,
  department, title, company, telegram, phone, interests, avatar_url,
  role, ad_groups, ad_synced_at, last_login_at
`;

/**
 * Создаёт или обновляет локальную проекцию учётной записи AD.
 *
 * ФИО, отдел, должность и роль всегда перезаписываются данными из каталога —
 * Active Directory остаётся источником истины. Telegram, телефон, интересы и
 * аватар пользователь редактирует сам, поэтому они не трогаются.
 */
export async function upsertUserFromDirectory(
  profile: DirectoryProfile,
  role: UserRole
): Promise<UserRecord> {
  const groups = normalizeGroups(profile.memberOf);

  const { rows } = await query<UserRow>(
    `INSERT INTO users (upn, sam_account_name, email, first_name, last_name, display_name,
                        department, title, company, role, ad_groups, ad_synced_at, last_login_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now())
     ON CONFLICT (upn) DO UPDATE SET
       sam_account_name = EXCLUDED.sam_account_name,
       email            = EXCLUDED.email,
       first_name       = EXCLUDED.first_name,
       last_name        = EXCLUDED.last_name,
       display_name     = EXCLUDED.display_name,
       department       = EXCLUDED.department,
       title            = EXCLUDED.title,
       company          = EXCLUDED.company,
       role             = EXCLUDED.role,
       ad_groups        = EXCLUDED.ad_groups,
       ad_synced_at     = now(),
       last_login_at    = now(),
       updated_at       = now()
     RETURNING ${SELECT_COLUMNS}`,
    [
      profile.upn,
      profile.samAccountName || null,
      profile.email,
      profile.firstName,
      profile.lastName,
      profile.displayName,
      profile.department,
      profile.title,
      profile.company,
      role,
      groups
    ]
  );

  return toUser(rows[0]);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRow>(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

export async function findUserByUpn(upn: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRow>(`SELECT ${SELECT_COLUMNS} FROM users WHERE upn = $1`, [
    upn.toLowerCase()
  ]);
  return rows[0] ? toUser(rows[0]) : null;
}

export interface EditableProfileFields {
  telegram?: string;
  phone?: string;
  interests?: string[];
  avatarUrl?: string | null;
}

/** Пользователь может менять только эти поля — остальные приходят из AD. */
export async function updateEditableProfile(
  userId: string,
  fields: EditableProfileFields
): Promise<UserRecord | null> {
  const { rows } = await query<UserRow>(
    `UPDATE users SET
       telegram   = COALESCE($2, telegram),
       phone      = COALESCE($3, phone),
       interests  = COALESCE($4, interests),
       avatar_url = COALESCE($5, avatar_url),
       updated_at = now()
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [
      userId,
      fields.telegram ?? null,
      fields.phone ?? null,
      fields.interests ?? null,
      fields.avatarUrl ?? null
    ]
  );
  return rows[0] ? toUser(rows[0]) : null;
}
