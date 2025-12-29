import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  errorHandler,
  notFoundHandler,
  ApiError,
  sanitizeErrorForLogging,
  formatZodError,
} from '@/shared/middleware/error-handler.js';
import { ErrorCodes } from '@/shared/types/index.js';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/test/path',
      method: 'POST',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('ApiError class', () => {
    it('should create error with default status code from mapping', () => {
      const error = new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('BOARD_NOT_FOUND');
      expect(error.message).toBe('Board not found');
    });

    it('should use provided status code over mapping', () => {
      const error = new ApiError(ErrorCodes.FORBIDDEN, 'Custom message', 401);
      expect(error.statusCode).toBe(401);
    });

    it('should include details when provided', () => {
      const error = new ApiError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
        field: 'name',
      });
      expect(error.details).toEqual({ field: 'name' });
    });

    it('should map all error codes correctly', () => {
      const testCases = [
        { code: ErrorCodes.VALIDATION_ERROR, expected: 400 },
        { code: ErrorCodes.UNAUTHORIZED, expected: 401 },
        { code: ErrorCodes.FORBIDDEN, expected: 403 },
        { code: ErrorCodes.BOARD_NOT_FOUND, expected: 404 },
        { code: ErrorCodes.CARD_NOT_FOUND, expected: 404 },
        { code: ErrorCodes.USER_NOT_FOUND, expected: 404 },
        { code: ErrorCodes.REACTION_NOT_FOUND, expected: 404 },
        { code: ErrorCodes.BOARD_CLOSED, expected: 409 },
        { code: ErrorCodes.RATE_LIMIT_EXCEEDED, expected: 429 },
        { code: ErrorCodes.DATABASE_ERROR, expected: 500 },
        { code: ErrorCodes.INTERNAL_ERROR, expected: 500 },
      ];

      for (const { code, expected } of testCases) {
        const error = new ApiError(code, 'Test message');
        expect(error.statusCode).toBe(expected);
      }
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should include basic error info', () => {
      const error = new Error('Test error');
      const result = sanitizeErrorForLogging(error, mockRequest as Request);

      expect(result.name).toBe('Error');
      expect(result.message).toBe('Test error');
      expect(result.path).toBe('/test/path');
      expect(result.method).toBe('POST');
    });

    it('should exclude stack in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      const result = sanitizeErrorForLogging(error, mockRequest as Request);

      expect(result.stack).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const result = sanitizeErrorForLogging(error, mockRequest as Request);

      expect(result.stack).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('formatZodError', () => {
    it('should format single field error', () => {
      const schema = z.object({ name: z.string().min(1) });
      try {
        schema.parse({ name: '' });
      } catch (e) {
        const result = formatZodError(e as ZodError);
        expect(result.fields).toHaveProperty('name');
      }
    });

    it('should format multiple field errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });
      try {
        schema.parse({ name: '', email: 'invalid' });
      } catch (e) {
        const result = formatZodError(e as ZodError);
        expect(result.fields).toHaveProperty('name');
        expect(result.fields).toHaveProperty('email');
      }
    });

    it('should format nested path errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
        }),
      });
      try {
        schema.parse({ user: { name: '' } });
      } catch (e) {
        const result = formatZodError(e as ZodError);
        expect(result.fields).toHaveProperty('user.name');
      }
    });
  });

  describe('errorHandler', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BOARD_NOT_FOUND',
            message: 'Board not found',
          }),
        })
      );
    });

    it('should handle ZodError correctly', () => {
      const schema = z.object({ name: z.string().min(1) });
      let zodError: ZodError;
      try {
        schema.parse({ name: '' });
      } catch (e) {
        zodError = e as ZodError;
      }

      errorHandler(zodError!, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
          }),
        })
      );
    });

    it('should handle MongoDB duplicate key error', () => {
      const error = new Error('E11000 duplicate key error');
      (error as Error & { code: number }).code = 11000;
      error.name = 'MongoServerError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Duplicate key error',
          }),
        })
      );
    });

    it('should handle unknown error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Secret internal error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error message in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Detailed error message',
          }),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with appropriate error', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Route not found',
          }),
        })
      );
    });
  });
});
