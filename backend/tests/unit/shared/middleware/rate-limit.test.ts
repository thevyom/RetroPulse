import { describe, it, expect } from 'vitest';
import { ErrorCodes } from '@/shared/types/index.js';

describe('Rate Limit Middleware', () => {
  describe('rate limit configuration', () => {
    it('should export standardRateLimiter', async () => {
      const module = await import('@/shared/middleware/rate-limit.js');
      expect(module.standardRateLimiter).toBeDefined();
      expect(typeof module.standardRateLimiter).toBe('function');
    });

    it('should export adminRateLimiter', async () => {
      const module = await import('@/shared/middleware/rate-limit.js');
      expect(module.adminRateLimiter).toBeDefined();
      expect(typeof module.adminRateLimiter).toBe('function');
    });

    it('should export strictRateLimiter', async () => {
      const module = await import('@/shared/middleware/rate-limit.js');
      expect(module.strictRateLimiter).toBeDefined();
      expect(typeof module.strictRateLimiter).toBe('function');
    });

    it('should use RATE_LIMIT_EXCEEDED error code', () => {
      expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('ErrorCodeToStatusCode mapping', () => {
    it('should map RATE_LIMIT_EXCEEDED to 429', async () => {
      const { ErrorCodeToStatusCode } = await import('@/shared/types/index.js');
      expect(ErrorCodeToStatusCode[ErrorCodes.RATE_LIMIT_EXCEEDED]).toBe(429);
    });
  });
});
