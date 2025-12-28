import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { sha256 } from '@/shared/utils/index.js';
import { env } from '@/shared/config/index.js';

const COOKIE_NAME = 'retro_session_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

/**
 * Authentication middleware
 * Creates or retrieves session cookie and hashes it for privacy
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  let sessionId = req.cookies[COOKIE_NAME] as string | undefined;

  if (!sessionId) {
    // First-time visitor - create session
    sessionId = uuidv4();
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  // Hash the cookie for privacy (stored in DB, never the plain value)
  req.hashedCookieId = sha256(sessionId);
  req.sessionId = sessionId; // Keep original for cookie management only

  next();
}
