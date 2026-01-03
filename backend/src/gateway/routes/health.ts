import { Router, Request, Response } from 'express';
import type { Router as IRouter } from 'express';
import { checkDatabaseHealth } from '@/shared/database/index.js';
import { sendSuccess, sendError } from '@/shared/utils/index.js';
import { ErrorCodes } from '@/shared/types/index.js';

export const healthRoutes: IRouter = Router();

// Basic health check
healthRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', service: 'retropulse-backend' });
});

// Database health check
healthRoutes.get('/db', async (_req: Request, res: Response) => {
  const isHealthy = await checkDatabaseHealth();

  if (isHealthy) {
    sendSuccess(res, { status: 'ok', database: 'connected' });
  } else {
    sendError(res, ErrorCodes.DATABASE_ERROR, 'Database connection failed', 503);
  }
});

// Ready check (for Kubernetes/Docker)
healthRoutes.get('/ready', async (_req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();

  if (dbHealthy) {
    sendSuccess(res, { status: 'ready', checks: { database: 'ok' } });
  } else {
    sendError(res, ErrorCodes.DATABASE_ERROR, 'Service not ready', 503, {
      checks: { database: 'failed' },
    });
  }
});
