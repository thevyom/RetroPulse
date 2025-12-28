import crypto from 'crypto';

/**
 * Hash a string using SHA-256
 * Used for hashing cookies to protect user privacy
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a random UUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
