import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * SQL-файлы миграций встраиваются в бандл esbuild как отдельные ассеты, поэтому
 * при запуске из dist-server каталог ищется рядом с бандлом.
 */
async function resolveMigrationsDir(): Promise<string> {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    migrationsDir,
    path.join(process.cwd(), 'server/db/migrations'),
    path.join(process.cwd(), 'dist-server/migrations')
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // пробуем следующий вариант
    }
  }

  throw new Error(
    `Каталог миграций не найден. Проверены пути: ${candidates.join(', ')}. ` +
      'Задайте MIGRATIONS_DIR явно.'
  );
}

/**
 * Произвольная константа, идентифицирующая блокировку миграций этого приложения.
 * Реплики, стартующие одновременно, выстраиваются в очередь на ней: без этого
 * параллельные CREATE TABLE конфликтуют в системном каталоге Postgres.
 */
const MIGRATION_LOCK_ID = 0x0c01_1e12;

export async function runMigrations(): Promise<string[]> {
  const dir = await resolveMigrationsDir();
  const pool = getPool();

  // Блокировка живёт на одном соединении, поэтому берём клиента явно
  // и держим его до конца прогона миграций.
  const lockClient = await pool.connect();
  const applied: string[] = [];

  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    await lockClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      const { rowCount } = await lockClient.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file]
      );
      if (rowCount && rowCount > 0) continue;

      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      try {
        await lockClient.query('BEGIN');
        await lockClient.query(sql);
        await lockClient.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await lockClient.query('COMMIT');
        applied.push(file);
        console.log(`[migrate] Применена миграция ${file}`);
      } catch (error) {
        await lockClient.query('ROLLBACK');
        throw new Error(`Миграция ${file} завершилась ошибкой: ${(error as Error).message}`);
      }
    }

    if (applied.length === 0) {
      console.log('[migrate] Новых миграций нет, схема актуальна');
    }
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    lockClient.release();
  }

  return applied;
}
