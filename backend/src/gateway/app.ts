import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Db } from 'mongodb';
import { env } from '@/shared/config/index.js';
import {
  authMiddleware,
  errorHandler,
  notFoundHandler,
  requestLogger,
} from '@/shared/middleware/index.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { healthRoutes } from './routes/health.js';
import { BoardRepository, BoardService, BoardController, createBoardRoutes } from '@/domains/board/index.js';
import { UserSessionRepository, UserSessionService, UserSessionController, createUserSessionRoutes } from '@/domains/user/index.js';

export function createApp(db?: Db): Express {
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

  // Wire up domain routes (manual dependency injection)
  if (db) {
    // Board domain
    const boardRepository = new BoardRepository(db);
    const boardService = new BoardService(boardRepository);
    const boardController = new BoardController(boardService);
    app.use('/v1/boards', createBoardRoutes(boardController));

    // User session domain
    // ⚠️ IMPORTANT: User session routes MUST be registered AFTER board routes.
    // Board routes take precedence for /v1/boards/:id/* paths due to Express routing order.
    // The user session routes use mergeParams to access :id from the parent path.
    // Avoid adding board routes that conflict with: /join, /users, /users/heartbeat, /users/alias
    const userSessionRepository = new UserSessionRepository(db);
    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);
    const userSessionController = new UserSessionController(userSessionService);
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
