import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ErrorCodes } from '@/shared/types/index.js';

/**
 * Allowlist of IPs that get very high rate limits.
 * These are localhost addresses - safe because in production deployments
 * behind a load balancer, client IPs will never be localhost.
 *
 * This allows E2E tests and local development to run without rate limiting issues.
 */
const ALLOWLIST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

/**
 * Rate limits for allowlisted IPs (very high to effectively bypass limits)
 */
const ALLOWLIST_LIMITS = {
  standard: 10000, // 10,000 requests per minute for normal endpoints
  admin: 5000, // 5,000 requests per minute for admin endpoints
  strict: 1000, // 1,000 requests per minute for sensitive operations
};

/**
 * Check if an IP is in the allowlist
 */
function isAllowlistedIp(req: Request): boolean {
  const clientIp = req.ip || req.socket?.remoteAddress || '';
  return ALLOWLIST_IPS.some((ip) => clientIp.includes(ip));
}

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
 * Check if rate limiting should be skipped entirely
 * Skipped in test environment or when DISABLE_RATE_LIMIT=true
 */
function shouldSkipRateLimit(): boolean {
  return (
    process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true'
  );
}

/**
 * Common rate limiter options
 * Enables both standard (RateLimit-*) and legacy (X-RateLimit-*) headers for client visibility
 */
const commonOptions = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers (RFC 6585)
  legacyHeaders: true, // Enable `X-RateLimit-*` headers for broader client compatibility
  skip: shouldSkipRateLimit,
  // Disable validation warnings - we handle IPv6 properly via trust proxy
  validate: { xForwardedForHeader: false },
};

/**
 * Standard rate limiter for normal API endpoints
 * 100 requests per minute per IP (10,000 for localhost)
 */
export const standardRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => (isAllowlistedIp(req) ? ALLOWLIST_LIMITS.standard : 100),
  handler: createRateLimitHandler(),
});

/**
 * Stricter rate limiter for admin endpoints
 * 100 requests per minute per IP (5,000 for localhost)
 */
export const adminRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => (isAllowlistedIp(req) ? ALLOWLIST_LIMITS.admin : 100),
  handler: createRateLimitHandler('Too many admin requests, please try again later'),
});

/**
 * Very strict rate limiter for sensitive operations
 * 5 requests per minute per IP (1,000 for localhost)
 */
export const strictRateLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => (isAllowlistedIp(req) ? ALLOWLIST_LIMITS.strict : 5),
  handler: createRateLimitHandler('Too many requests for this operation, please try again later'),
});
