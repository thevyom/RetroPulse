import { describe, it, expect } from 'vitest';
import { sha256, generateId } from '@/shared/utils/hash.js';

describe('sha256', () => {
  it('should hash a string consistently', () => {
    const input = 'test-cookie-value';
    const hash1 = sha256(input);
    const hash2 = sha256(input);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('cookie1');
    const hash2 = sha256('cookie2');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce a 64-character hex string', () => {
    const hash = sha256('test');

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

describe('generateId', () => {
  it('should generate a valid UUID', () => {
    const id = generateId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    expect(ids.size).toBe(100);
  });
});
