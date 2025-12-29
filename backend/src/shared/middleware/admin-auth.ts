import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import { env } from '@/shared/config/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { sendError } from '@/shared/utils/index.js';

const ADMIN_SECRET_HEADER = 'x-admin-secret';

/**
 * Compare two strings using constant-time comparison to prevent timing attacks.
 * Hashes both inputs to ensure equal-length comparison, preventing secret length leakage.
 */
function safeCompare(a: string, b: string): boolean {
  // Hash both inputs to produce fixed-length values, preventing length-based timing leaks
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();

  return timingSafeEqual(aHash, bHash);
}

/**
 * Admin authentication middleware
 * Checks for valid admin secret key in header
 */
export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const adminSecret = req.headers[ADMIN_SECRET_HEADER];

  if (!adminSecret) {
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Admin secret key required', 401);
    return;
  }

  // Use constant-time comparison to prevent timing attacks
  if (!safeCompare(String(adminSecret), env.ADMIN_SECRET_KEY)) {
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Invalid admin secret key', 401);
    return;
  }

  next();
}
