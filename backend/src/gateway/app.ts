import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Db, MongoClient } from 'mongodb';
import { env } from '@/shared/config/index.js';
import {
  authMiddleware,
  adminOverrideMiddleware,
  errorHandler,
  notFoundHandler,
  requestLogger,
  standardRateLimiter,
  adminRateLimiter,
} from '@/shared/middleware/index.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { healthRoutes } from './routes/health.js';
import { BoardRepository, BoardService, BoardController, createBoardRoutes } from '@/domains/board/index.js';
import { UserSessionRepository, UserSessionService, UserSessionController, createUserSessionRoutes } from '@/domains/user/index.js';
import { CardRepository, CardService, CardController, createBoardCardRoutes, createCardRoutes } from '@/domains/card/index.js';
import { ReactionRepository, ReactionService, ReactionController, createCardReactionRoutes, createBoardReactionRoutes } from '@/domains/reaction/index.js';
import { AdminService, AdminController, createAdminRoutes } from '@/domains/admin/index.js';

/**
 * App configuration options
 */
interface AppOptions {
  db?: Db;
  mongoClient?: MongoClient; // For transaction support in cascade deletes
}

export function createApp(dbOrOptions?: Db | AppOptions): Express {
  // Handle both old signature (db only) and new signature (options object)
  let options: AppOptions;
  if (dbOrOptions && typeof dbOrOptions === 'object' && 'db' in dbOrOptions) {
    options = dbOrOptions as AppOptions;
  } else {
    options = { db: dbOrOptions as Db | undefined };
  }
  const { db, mongoClient } = options;
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

  // Admin override for E2E tests (checks X-Admin-Secret header)
  app.use(adminOverrideMiddleware);

  // Request logging
  app.use(requestLogger);

  // Health check routes (no auth required)
  app.use('/health', healthRoutes);

  // Rate limiting for all API routes (skipped in test environment)
  app.use('/v1', standardRateLimiter);

  // Authentication middleware for all API routes
  app.use('/v1', (req, res, next) => {
    authMiddleware(req as AuthenticatedRequest, res, next);
  });

  // Wire up domain routes (manual dependency injection)
  if (db) {
    // Board domain
    const boardRepository = new BoardRepository(db);
    const boardService = new BoardService(boardRepository);

    // User session domain
    // ⚠️ IMPORTANT: User session routes MUST be registered AFTER board routes.
    // Board routes take precedence for /v1/boards/:id/* paths due to Express routing order.
    // The user session routes use mergeParams to access :id from the parent path.
    // Avoid adding board routes that conflict with: /join, /users, /users/heartbeat, /users/alias
    const userSessionRepository = new UserSessionRepository(db);
    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);

    // UTB-014: Pass userSessionService to BoardController for auto-join on board creation
    const boardController = new BoardController(boardService, userSessionService);
    app.use('/v1/boards', createBoardRoutes(boardController));

    const userSessionController = new UserSessionController(userSessionService);
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));

    // Card domain
    const cardRepository = new CardRepository(db);
    const cardService = new CardService(cardRepository, boardRepository, userSessionRepository);
    const cardController = new CardController(cardService);
    // Board-scoped card routes (/v1/boards/:boardId/cards)
    app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
    // Card-scoped routes (/v1/cards/:id)
    app.use('/v1/cards', createCardRoutes(cardController));

    // Reaction domain
    const reactionRepository = new ReactionRepository(db);
    const reactionService = new ReactionService(
      reactionRepository,
      cardRepository,
      boardRepository,
      userSessionRepository
    );
    const reactionController = new ReactionController(reactionService);
    // Card-scoped reaction routes (/v1/cards/:id/reactions)
    app.use('/v1/cards/:id/reactions', createCardReactionRoutes(reactionController));
    // Board-scoped reaction routes (/v1/boards/:id/reactions)
    app.use('/v1/boards/:id/reactions', createBoardReactionRoutes(reactionController));

    // Admin test routes (/v1/boards/:id/test/*) with stricter rate limiting
    const adminService = new AdminService(
      db,
      boardRepository,
      cardRepository,
      reactionRepository,
      userSessionRepository
    );
    const adminController = new AdminController(adminService);
    app.use('/v1/boards/:id/test', adminRateLimiter, createAdminRoutes(adminController));

    // Wire up cascade delete dependencies for board service
    // Transaction support requires a MongoClient (mongodb-memory-server doesn't support replica sets)
    boardService.setCascadeDeleteDependencies({
      getCardIdsByBoard: (boardId) => cardRepository.getCardIdsByBoard(boardId),
      deleteReactionsByCards: (cardIds, session) => reactionRepository.deleteByCards(cardIds, session),
      deleteCardsByBoard: (boardId, session) => cardRepository.deleteByBoard(boardId, session),
      deleteSessionsByBoard: (boardId, session) => userSessionRepository.deleteByBoard(boardId, session),
      deleteBoardById: (boardId, session) => boardRepository.delete(boardId, session),
      // Provide MongoClient for transaction support in production
      getMongoClient: mongoClient ? () => mongoClient : undefined,
    });
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
