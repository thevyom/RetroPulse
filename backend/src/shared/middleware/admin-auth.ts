import { Request, Response, NextFunction } from 'express';
import { env } from '@/shared/config/index.js';
import { sendError, ErrorCodes } from '@/shared/types/index.js';

const ADMIN_SECRET_HEADER = 'x-admin-secret';

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

  if (adminSecret !== env.ADMIN_SECRET_KEY) {
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Invalid admin secret key', 401);
    return;
  }

  next();
}
