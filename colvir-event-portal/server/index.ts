import path from 'node:path';
import express from 'express';
import { getConfig } from './config/env.js';
import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { closePool, query } from './db/pool.js';
import { startScheduler } from './scheduler.js';
import { ensureUploadsDir } from './services/attachments.js';
import { seedDemoData } from './db/seed.js';

async function start(): Promise<void> {
  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch (error) {
    console.error('\n' + (error as Error).message + '\n');
    console.error('Проверьте .env — образец параметров лежит в .env.example\n');
    process.exit(1);
  }

  try {
    await query('SELECT 1');
  } catch (error) {
    console.error('[startup] Не удалось подключиться к базе данных:', (error as Error).message);
    console.error('[startup] Проверьте DATABASE_URL и доступность PostgreSQL.');
    process.exit(1);
  }

  // Миграции применяются на старте, чтобы деплой не требовал отдельного шага.
  // Отключается через RUN_MIGRATIONS_ON_START=false, если схемой управляет CI.
  if (process.env.RUN_MIGRATIONS_ON_START !== 'false') {
    await runMigrations();
  }

  // Демо-наполнение для стенда: включается только явным SEED_DEMO_DATA=true и
  // ничего не делает, если мероприятия в базе уже есть. Нужно, чтобы
  // docker-compose.demo.yml поднимался с данными, которые можно потыкать, —
  // отдельный npm run seed в production-образе недоступен, там нет dev-зависимостей.
  if (process.env.SEED_DEMO_DATA === 'true') {
    try {
      await seedDemoData();
    } catch (error) {
      console.error(`[colvir] Не удалось залить демо-данные: ${(error as Error).message}`);
    }
  }

  // Каталог вложений проверяется на старте, а не при первой загрузке файла:
  // иначе о том, что он не создан или доступен только на чтение, узнал бы
  // первый сотрудник, отправивший картинку.
  try {
    const uploadsDir = await ensureUploadsDir();
    console.log(`[colvir] Каталог вложений: ${uploadsDir}`);
  } catch (error) {
    console.error(
      `[colvir] Каталог вложений недоступен для записи (${config.uploads.dir}): ${
        (error as Error).message
      }`
    );
    process.exit(1);
  }

  const app = createApp();

  // Демо-стенду нужна связка «собранный клиент + непроизводственный режим
  // аутентификации»: Vite есть только среди dev-зависимостей, а в образе их нет,
  // поэтому режим отдачи клиента задается отдельно от NODE_ENV.
  const serveBuiltClient = config.isProduction || process.env.SERVE_BUILT_CLIENT === 'true';

  if (serveBuiltClient) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite подключается динамически, чтобы не попасть в production-бандл сервера.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // Фоновые задачи Random Coffee: подбор пар по дедлайну и напоминания.
  // Отключается через SCHEDULER_ENABLED=false, если задачи выносятся в CronJob.
  const scheduler =
    process.env.SCHEDULER_ENABLED === 'false' ? null : startScheduler();
  if (scheduler) {
    console.log('[colvir] Планировщик Random Coffee запущен');
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[colvir] Портал запущен на порту ${config.port} (${config.nodeEnv})`);
    console.log(`[colvir] Каталог учетных записей: ${config.ldap.enabled ? config.ldap.url : 'файловый (разработка)'}`);
    console.log(`[colvir] Домен Active Directory: ${config.ad.domain}`);
    console.log(`[colvir] SSO через reverse-proxy: ${config.sso.enabled ? 'включен' : 'выключен'}`);
    if (!config.cookies.secure) {
      console.warn('[colvir] ВНИМАНИЕ: cookie сессии передаются без флага Secure (только для локальной разработки)');
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`[colvir] Получен ${signal}, завершаю работу...`);
    scheduler?.stop();
    server.close(async () => {
      await closePool().catch(() => undefined);
      process.exit(0);
    });
    // Аварийный выход, если соединения не закрылись за 10 секунд.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch(async (error) => {
  console.error('[startup] Критическая ошибка запуска:', error);
  await closePool().catch(() => undefined);
  process.exit(1);
});
