import rateLimit from 'express-rate-limit';
import { Response } from 'express';
import { ErrorCodes } from '@/shared/types/index.js';

/**
 * Create a rate limit handler with dynamic timestamp
 */
function createRateLimitHandler(customMessage?: string) {
  return (_req: unknown, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: customMessage ?? 'Too many requests, please try again later',
      },
      timestamp: new Date().toISOString(),
    });
  };
}

/**
 * Common rate limiter options
 */
const commonOptions = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test',
  // Disable validation warnings - we handle IPv6 properly via trust proxy
  validate: { xForwardedForHeader: false },
};

/**
 * Standard rate limiter for normal API endpoints
 * 100 requests per minute per IP
 */
export const standardRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  handler: createRateLimitHandler(),
});

/**
 * Stricter rate limiter for admin endpoints
 * 10 requests per minute per IP
 */
export const adminRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  handler: createRateLimitHandler('Too many admin requests, please try again later'),
});

/**
 * Very strict rate limiter for sensitive operations
 * 5 requests per minute per IP (e.g., board creation)
 */
export const strictRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  handler: createRateLimitHandler('Too many requests for this operation, please try again later'),
});
