import { describe, it, expect } from 'vitest';
import type { User, Board } from '@shared/types';

describe('Path Aliases', () => {
  it('should resolve @shared alias correctly', () => {
    const user: User = {
      id: '1',
      name: 'Test User',
      color: '#ff0000',
    };
    expect(user.name).toBe('Test User');
  });

  it('should resolve Board type from @shared', () => {
    const board: Board = {
      id: '1',
      name: 'Test Board',
      createdAt: new Date(),
    };
    expect(board.name).toBe('Test Board');
  });
});
