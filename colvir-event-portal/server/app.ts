import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { getConfig } from './config/env.js';
import { createAuthRouter } from './auth/routes.js';
import { createApiRouter } from './routes/api.js';
import { query } from './db/pool.js';

export function createApp(): Express {
  const config = getConfig();
  const app = express();

  // Количество доверенных прокси задается явно: `true` заставил бы Express верить
  // произвольному X-Forwarded-For, что ломает и rate limit, и журнал аудита.
  app.set('trust proxy', config.security.trustProxyHops);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Tailwind и редактор вставляют инлайновые стили.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: config.security.forceHttps
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
        : false,
      referrerPolicy: { policy: 'same-origin' }
    })
  );

  if (config.security.corsOrigins.length > 0) {
    app.use(
      cors({
        origin: config.security.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
      })
    );
  }

  if (config.security.forceHttps) {
    app.use((req, res, next) => {
      // За reverse-proxy Express с trust proxy подставляет протокол из X-Forwarded-Proto.
      if (req.secure || req.protocol === 'https') {
        next();
        return;
      }
      res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
    });
  }

  // Изображения мероприятий приходят как data:URL, отсюда увеличенный лимит.
  app.use(express.json({ limit: '8mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Слишком много запросов, повторите позже' }
    })
  );

  app.get('/api/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({
        status: 'ok',
        service: 'Colvir Event Portal',
        environment: config.nodeEnv,
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        database: 'unavailable',
        message: (error as Error).message
      });
    }
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api', createApiRouter());

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Метод API не найден' });
  });

  // Обработчик ошибок: наружу уходит нейтральный текст, подробности — в лог.
  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[api] Необработанная ошибка ${req.method} ${req.originalUrl}:`, error);
    if (res.headersSent) return;
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  });

  return app;
}
