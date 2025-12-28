import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '@/shared/config/index.js';
import {
  authMiddleware,
  errorHandler,
  notFoundHandler,
  requestLogger,
} from '@/shared/middleware/index.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { healthRoutes } from './routes/health.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy (for secure cookies behind reverse proxy)
  app.set('trust proxy', 1);

  // CORS configuration
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing
  app.use(cookieParser(env.COOKIE_SECRET));

  // Request logging
  app.use(requestLogger);

  // Health check routes (no auth required)
  app.use('/health', healthRoutes);

  // Authentication middleware for all API routes
  app.use('/v1', (req, res, next) => {
    authMiddleware(req as AuthenticatedRequest, res, next);
  });

  // API routes will be added here
  // app.use('/v1/boards', boardRoutes);
  // app.use('/v1/cards', cardRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
