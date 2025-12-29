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
 * Sanitize error for logging - removes sensitive data
 */
export function sanitizeErrorForLogging(error: Error, req: Request): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    // Only include stack in development
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    // Never log: cookies, authorization headers, request body (may contain secrets)
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
