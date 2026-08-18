/**
 * CLI-обертка для запуска миграций: `npm run migrate`.
 *
 * Вынесена в отдельный файл намеренно. Раньше эта логика жила прямо в
 * migrate.ts под проверкой «файл запущен напрямую», и после сборки сервера
 * в один бандл проверка срабатывала ложно: точкой входа оказывался сам бандл,
 * миграции запускались повторно и процесс завершался через process.exit(0),
 * убивая только что стартовавший сервер.
 */
import { runMigrations } from './migrate.js';
import { closePool } from './pool.js';

runMigrations()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error: Error) => {
    console.error('[migrate] Ошибка:', error.message);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
