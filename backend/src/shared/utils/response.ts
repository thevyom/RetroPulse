import { Response } from 'express';
import type { ApiResponse, ApiError, ErrorCode } from '@/shared/types/index.js';

/**
 * Send a successful API response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
}

/**
 * Send an error API response
 */
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
): void {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
}
