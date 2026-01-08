import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID middleware
 *
 * Generates or extracts a correlation ID for request tracing across log entries.
 * - Uses existing X-Correlation-ID header if provided
 * - Generates a new UUID if none provided
 * - Sets correlation ID on request object and response header
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  // Attach to request for use throughout the request lifecycle
  (req as Request & { correlationId: string }).correlationId = correlationId;

  // Return in response header for client-side debugging
  res.setHeader('x-correlation-id', correlationId);

  next();
}
