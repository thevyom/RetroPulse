/**
 * useCreateBoardViewModel Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCreateBoardViewModel } from '@/features/home/viewmodels/useCreateBoardViewModel';
import { BoardAPI } from '@/models/api';

// Mock the BoardAPI
vi.mock('@/models/api', () => ({
  BoardAPI: {
    createBoard: vi.fn(),
  },
}));

const mockBoardAPI = vi.mocked(BoardAPI);

describe('useCreateBoardViewModel', () => {
  const mockBoardResponse = {
    id: 'board-123',
    name: 'Test Board',
    shareable_link: 'http://example.com/boards/board-123',
    state: 'active' as const,
    columns: [
      { id: 'col-1', name: 'What Went Well', color: '#22c55e' },
      { id: 'col-2', name: 'To Improve', color: '#f97316' },
      { id: 'col-3', name: 'Action Items', color: '#3b82f6' },
    ],
    created_at: new Date().toISOString(),
    created_by_hash: 'user-123',
    admins: ['user-123'],
    card_limit_per_user: null,
    reaction_limit_per_user: null,
  };

  const mockCreateData = {
    name: 'Test Board',
    columns: [
      { name: 'What Went Well', color: '#22c55e' },
      { name: 'To Improve', color: '#f97316' },
      { name: 'Action Items', color: '#3b82f6' },
    ],
    card_limit_per_user: null,
    reaction_limit_per_user: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardAPI.createBoard.mockResolvedValue(mockBoardResponse);
  });

  describe('Initial State', () => {
    it('should initialize with isCreating false', () => {
      const { result } = renderHook(() => useCreateBoardViewModel());
      expect(result.current.isCreating).toBe(false);
    });

    it('should initialize with error null', () => {
      const { result } = renderHook(() => useCreateBoardViewModel());
      expect(result.current.error).toBeNull();
    });

    it('should provide createBoard function', () => {
      const { result } = renderHook(() => useCreateBoardViewModel());
      expect(typeof result.current.createBoard).toBe('function');
    });
  });

  describe('createBoard', () => {
    it('should set isCreating to true during API call', async () => {
      // Make the API call take some time
      mockBoardAPI.createBoard.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBoardResponse), 100))
      );

      const { result } = renderHook(() => useCreateBoardViewModel());

      // Start the creation
      act(() => {
        result.current.createBoard(mockCreateData);
      });

      // Should be creating
      expect(result.current.isCreating).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it('should call BoardAPI.createBoard with correct data', async () => {
      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        await result.current.createBoard(mockCreateData);
      });

      expect(mockBoardAPI.createBoard).toHaveBeenCalledWith(mockCreateData);
      expect(mockBoardAPI.createBoard).toHaveBeenCalledTimes(1);
    });

    it('should return created board on success', async () => {
      const { result } = renderHook(() => useCreateBoardViewModel());

      let createdBoard;
      await act(async () => {
        createdBoard = await result.current.createBoard(mockCreateData);
      });

      expect(createdBoard).toEqual(mockBoardResponse);
    });

    it('should set isCreating to false after success', async () => {
      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        await result.current.createBoard(mockCreateData);
      });

      expect(result.current.isCreating).toBe(false);
    });

    it('should clear error on new request', async () => {
      // First, cause an error
      mockBoardAPI.createBoard.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        try {
          await result.current.createBoard(mockCreateData);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe('First error');

      // Now make a successful request
      mockBoardAPI.createBoard.mockResolvedValueOnce(mockBoardResponse);

      await act(async () => {
        await result.current.createBoard(mockCreateData);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should set error on API failure', async () => {
      mockBoardAPI.createBoard.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        try {
          await result.current.createBoard(mockCreateData);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should set isCreating to false after error', async () => {
      mockBoardAPI.createBoard.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        try {
          await result.current.createBoard(mockCreateData);
        } catch {
          // Expected error
        }
      });

      expect(result.current.isCreating).toBe(false);
    });

    it('should rethrow the error', async () => {
      const error = new Error('API Error');
      mockBoardAPI.createBoard.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateBoardViewModel());

      await expect(
        act(async () => {
          await result.current.createBoard(mockCreateData);
        })
      ).rejects.toThrow('API Error');
    });

    it('should handle non-Error objects', async () => {
      mockBoardAPI.createBoard.mockRejectedValue('String error');

      const { result } = renderHook(() => useCreateBoardViewModel());

      await act(async () => {
        try {
          await result.current.createBoard(mockCreateData);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Failed to create board');
    });
  });

  describe('Concurrent Calls', () => {
    it('should handle multiple calls correctly', async () => {
      const { result } = renderHook(() => useCreateBoardViewModel());

      // Call twice in quick succession
      const promise1 = act(async () => {
        await result.current.createBoard(mockCreateData);
      });
      const promise2 = act(async () => {
        await result.current.createBoard(mockCreateData);
      });

      await Promise.all([promise1, promise2]);

      expect(mockBoardAPI.createBoard).toHaveBeenCalledTimes(2);
      expect(result.current.isCreating).toBe(false);
    });
  });
});
