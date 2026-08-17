import { query, withTransaction } from '../db/pool.js';
import { sanitizePlainText } from '../utils/sanitize.js';

export type CmsContent = Record<string, string>;

export async function getCmsContent(): Promise<CmsContent> {
  const { rows } = await query<{ key: string; value: string }>(
    'SELECT key, value FROM cms_content'
  );
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/**
 * Обновляет только те ключи, которые уже определены в базе миграцией:
 * произвольные ключи из запроса игнорируются, чтобы CMS не превращалась
 * в свалку и не принимала неожиданные поля.
 */
export async function updateCmsContent(patch: CmsContent): Promise<CmsContent> {
  const { rows } = await query<{ key: string }>('SELECT key FROM cms_content');
  const known = new Set(rows.map((row) => row.key));

  await withTransaction(async (client) => {
    for (const [key, value] of Object.entries(patch)) {
      if (!known.has(key)) continue;
      await client.query(
        'UPDATE cms_content SET value = $2, updated_at = now() WHERE key = $1',
        [key, sanitizePlainText(String(value)).slice(0, 2000)]
      );
    }
  });

  return getCmsContent();
}

export async function listCoffeeSlots(): Promise<string[]> {
  const { rows } = await query<{ slot: string }>(
    'SELECT slot FROM coffee_slots ORDER BY position, slot'
  );
  return rows.map((row) => row.slot);
}

export async function addCoffeeSlot(slot: string): Promise<string[]> {
  const clean = sanitizePlainText(slot).trim().slice(0, 100);
  if (clean) {
    await query(
      `INSERT INTO coffee_slots (slot, position)
       VALUES ($1, COALESCE((SELECT max(position) + 1 FROM coffee_slots), 1))
       ON CONFLICT (slot) DO NOTHING`,
      [clean]
    );
  }
  return listCoffeeSlots();
}

export async function deleteCoffeeSlot(slot: string): Promise<string[]> {
  await query('DELETE FROM coffee_slots WHERE slot = $1', [slot]);
  return listCoffeeSlots();
}

export async function listOrganizerTags(): Promise<string[]> {
  const { rows } = await query<{ tag: string }>('SELECT tag FROM organizer_tags ORDER BY tag');
  return rows.map((row) => row.tag);
}

export async function addOrganizerTag(tag: string): Promise<string[]> {
  const clean = sanitizePlainText(tag).trim().slice(0, 120);
  if (clean) {
    await query('INSERT INTO organizer_tags (tag) VALUES ($1) ON CONFLICT (tag) DO NOTHING', [
      clean
    ]);
  }
  return listOrganizerTags();
}
