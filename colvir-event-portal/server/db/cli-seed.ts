/**
 * CLI-обёртка для заливки демо-данных: `npm run seed [-- --force]`.
 * Вынесена отдельно по той же причине, что и cli-migrate.ts.
 */
import { runMigrations } from './migrate.js';
import { seedDemoData } from './seed.js';
import { closePool } from './pool.js';

const force = process.argv.includes('--force');

runMigrations()
  .then(() => seedDemoData({ force }))
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error: Error) => {
    console.error('[seed] Ошибка:', error.message);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
