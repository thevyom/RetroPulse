import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from './metrics.js';

/**
 * Middleware to collect HTTP request metrics
 * Tracks request count and duration by method, path pattern, and status code
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();

  // Capture metrics on response finish
  res.on('finish', () => {
    // Calculate duration
    const endTime = process.hrtime.bigint();
    const durationInSeconds = Number(endTime - startTime) / 1e9;

    // Normalize path to avoid high cardinality
    const normalizedPath = normalizePath(req.route?.path || req.path);

    const labels = {
      method: req.method,
      path: normalizedPath,
      status: res.statusCode.toString(),
    };

    // Record metrics
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationInSeconds);
  });

  next();
}

/**
 * Normalize paths to reduce cardinality
 * Replace dynamic segments with placeholders
 */
function normalizePath(path: string): string {
  if (!path || path === '/') return '/';

  // Common patterns to normalize:
  // - MongoDB ObjectIds: 24 hex characters
  // - UUIDs: 8-4-4-4-12 hex with hyphens
  // - Numeric IDs

  return path
    // Replace MongoDB ObjectIds
    .replace(/\/[a-f0-9]{24}/gi, '/:id')
    // Replace UUIDs
    .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace link codes (8-10 alphanumeric chars)
    .replace(/\/[a-zA-Z0-9]{8,10}(?=\/|$)/g, '/:linkCode');
}
