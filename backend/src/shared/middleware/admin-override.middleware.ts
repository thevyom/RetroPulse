import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { env } from '@/shared/config/index.js';

/**
 * Compare two strings using constant-time comparison to prevent timing attacks.
 * Hashes both inputs to ensure equal-length comparison, preventing secret length leakage.
 */
function safeCompare(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

/**
 * Middleware to allow E2E tests to bypass admin checks.
 * Only active when ADMIN_SECRET_KEY environment variable is set.
 *
 * Usage: Add X-Admin-Secret header to requests.
 *
 * Security: This should NEVER be configured with a weak secret in production.
 * The middleware uses timing-safe comparison to prevent timing attacks.
 */
export function adminOverrideMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Skip entirely in production if explicitly disabled
  if (process.env.NODE_ENV === 'production' && !env.ADMIN_SECRET_KEY) {
    return next();
  }

  const headerSecret = req.headers['x-admin-secret'];

  if (headerSecret && typeof headerSecret === 'string') {
    // Use timing-safe comparison to prevent timing attacks
    if (safeCompare(headerSecret, env.ADMIN_SECRET_KEY)) {
      // Mark request as having admin override
      (req as any).isAdminOverride = true;
    }
  }

  next();
}
