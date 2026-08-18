import { query } from '../db/pool.js';

/**
 * Общие настройки приложения. Пока единственная — активная тема оформления:
 * ее выбирает администратор, и она применяется у всех сотрудников.
 */

export const THEMES = ['classic', 'spring', 'birthday', 'newyear'] as const;
export type ThemeName = (typeof THEMES)[number];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export interface ThemeState {
  theme: ThemeName;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getTheme(): Promise<ThemeState> {
  const { rows } = await query<{ value: string; updated_at: Date | null; display_name: string | null }>(
    `SELECT s.value, s.updated_at, u.display_name
     FROM app_settings s
     LEFT JOIN users u ON u.id = s.updated_by
     WHERE s.key = 'theme'`
  );

  const row = rows[0];
  return {
    theme: isThemeName(row?.value) ? row.value : 'classic',
    updatedAt: row?.updated_at?.toISOString() ?? null,
    updatedBy: row?.display_name ?? null
  };
}

export async function setTheme(theme: ThemeName, userId: string): Promise<ThemeState> {
  await query(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ('theme', $1, $2, now())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [theme, userId]
  );
  return getTheme();
}
