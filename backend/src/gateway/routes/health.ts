import { Router, Request, Response } from 'express';
import type { Router as IRouter } from 'express';
import { checkDatabaseHealth, checkDatabaseHealthDetailed } from '@/shared/database/index.js';
import { sendSuccess, sendError } from '@/shared/utils/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { metricsRegistry } from '@/shared/metrics/index.js';

// Track application start time for uptime calculation
const startTime = Date.now();

// Application version from package.json (injected at build time or read from env)
const APP_VERSION = process.env.npm_package_version || '1.0.0';

export const healthRoutes: IRouter = Router();

// Basic health check
healthRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', service: 'retropulse-backend', version: APP_VERSION });
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

// Comprehensive health check with detailed status
healthRoutes.get('/detailed', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealthDetailed();
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  // Determine overall status
  const isHealthy = dbHealth.status === 'up';
  const status = isHealthy ? 'healthy' : 'unhealthy';

  const healthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    checks: {
      mongodb: {
        status: dbHealth.status,
        latency_ms: dbHealth.latency_ms,
      },
      memory: {
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
      },
      uptime_seconds: uptimeSeconds,
    },
  };

  if (isHealthy) {
    sendSuccess(res, healthResponse);
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Service unhealthy',
      },
      data: healthResponse,
    });
  }
});

// Prometheus metrics endpoint
healthRoutes.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch {
    res.status(500).end();
  }
});
