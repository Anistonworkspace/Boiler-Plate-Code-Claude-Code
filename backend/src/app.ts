import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { requestId, requestLogger } from './middleware/requestLogger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { authRouter } from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false }));
  app.use(compression());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(requestLogger);
  app.use(generalLimiter);

  app.get('/api/health', async (_req, res) => {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
    };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'down';
    }
    const allOk = Object.values(checks).every((v) => v === 'ok');
    res.status(allOk ? 200 : 503).json({ success: allOk, data: checks });
  });

  setupSwagger(app);

  app.use('/api/auth', authRouter);

  app.use((req, _res, next) => next(new NotFoundError(`Route not found: ${req.method} ${req.path}`)));
  app.use(errorHandler);

  return app;
}
