import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/logger/index.js';
import { sendError, ErrorCodes } from '@/shared/types/index.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error (sanitized)
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    sendError(res, err.code as typeof ErrorCodes[keyof typeof ErrorCodes], err.message, err.statusCode, err.details);
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
  sendError(res, ErrorCodes.VALIDATION_ERROR, 'Route not found', 404);
}
