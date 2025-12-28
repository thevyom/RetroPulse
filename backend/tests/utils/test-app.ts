import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware, errorHandler, notFoundHandler } from '@/shared/middleware/index.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';

/**
 * Create a minimal Express app for integration testing
 * Routes are added by the test suite as needed
 */
export function createTestApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser('test-secret'));

  // Auth middleware for /v1 routes
  app.use('/v1', (req, res, next) => {
    authMiddleware(req as AuthenticatedRequest, res, next);
  });

  return app;
}

/**
 * Add error handlers to the app (call after adding routes)
 */
export function addErrorHandlers(app: Express): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
