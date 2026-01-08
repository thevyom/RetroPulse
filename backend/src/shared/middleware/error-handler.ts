import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/shared/logger/index.js';
import { sendError } from '@/shared/utils/index.js';
import { ErrorCodes, ErrorCodeToStatusCode, type ErrorCode } from '@/shared/types/index.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    // Use provided statusCode or look up from mapping
    this.statusCode = statusCode ?? ErrorCodeToStatusCode[code] ?? 400;
  }
}

/**
 * Sanitize error for logging - removes sensitive data but includes useful context
 */
export function sanitizeErrorForLogging(error: Error, req: Request): Record<string, unknown> {
  const authenticatedReq = req as Request & { correlationId?: string; hashedCookieId?: string };

  // Safely get params, query, body keys (they might be undefined in tests or edge cases)
  const params = req.params && Object.keys(req.params).length > 0 ? req.params : undefined;
  const queryKeys = req.query && Object.keys(req.query).length > 0 ? Object.keys(req.query) : undefined;
  const bodyKeys = req.body && Object.keys(req.body).length > 0 ? Object.keys(req.body) : undefined;

  return {
    error: {
      name: error.name,
      message: error.message,
      code: error instanceof ApiError ? error.code : undefined,
      // Only include stack in development
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    request: {
      correlationId: authenticatedReq.correlationId,
      method: req.method,
      path: req.path,
      params,
      queryKeys,
      bodyKeys,
      userHash: authenticatedReq.hashedCookieId?.substring(0, 8),
    },
    // Never log: cookies, authorization headers, request body values (may contain secrets)
  };
}

/**
 * Format Zod validation errors into readable details
 */
export function formatZodError(error: ZodError): Record<string, unknown> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'value';
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return { fields: fieldErrors };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error (sanitized - no sensitive data)
  logger.error('Request error', sanitizeErrorForLogging(err, req));

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      formatZodError(err)
    );
    return;
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    sendError(
      res,
      err.code,
      err.message,
      err.statusCode ?? ErrorCodeToStatusCode[err.code] ?? 400,
      err.details
    );
    return;
  }

  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoServerError' && (err as unknown as Record<string, unknown>).code === 11000) {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      'Duplicate key error',
      409
    );
    return;
  }

  // Handle unknown errors
  sendError(
    res,
    ErrorCodes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, ErrorCodes.NOT_FOUND, 'Route not found', 404);
}
