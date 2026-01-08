import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/logger/index.js';

/**
 * Extract API version from path (e.g., /v1/boards -> 'v1')
 */
function extractApiVersion(path: string): string | undefined {
  const match = path.match(/^\/(v\d+)\//);
  return match ? match[1] : undefined;
}

/**
 * Request logging middleware
 * Logs incoming requests and response times
 * Includes correlation ID for request tracing and API version
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  const apiVersion = extractApiVersion(req.path);

  // Log request
  logger.debug('Incoming request', {
    correlationId,
    apiVersion,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';

    logger[logLevel]('Request completed', {
      correlationId,
      apiVersion,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
    });

    // Warn on slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        correlationId,
        apiVersion,
        method: req.method,
        path: req.path,
        duration_ms: duration,
      });
    }
  });

  next();
}
