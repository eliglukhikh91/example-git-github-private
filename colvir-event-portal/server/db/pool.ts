import pg from 'pg';
import { getConfig } from '../config/env.js';

const { Pool } = pg;

// Postgres возвращает bigint как строку, чтобы не терять точность.
// Для counts это неудобно — приводим к числу явно там, где это безопасно.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    const config = getConfig();
    pool = new Pool({
      connectionString: config.database.url,
      max: config.database.poolMax,
      ssl: config.database.ssl ? { rejectUnauthorized: true } : undefined
    });

    pool.on('error', (error) => {
      console.error('[db] Ошибка простаивающего соединения пула:', error);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = []
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

export async function withTransaction<T>(
  handler: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
