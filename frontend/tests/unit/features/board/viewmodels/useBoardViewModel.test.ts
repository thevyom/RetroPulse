/**
 * useBoardViewModel Tests
 * Comprehensive unit tests for the Board ViewModel hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBoardViewModel } from '../../../../../src/features/board/viewmodels/useBoardViewModel';
import { useBoardStore } from '../../../../../src/models/stores/boardStore';
import { useUserStore } from '../../../../../src/models/stores/userStore';
import { BoardAPI } from '../../../../../src/models/api/BoardAPI';
import { socketService } from '../../../../../src/models/socket/SocketService';
import type { Board, UserSession } from '../../../../../src/models/types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../../src/models/api/BoardAPI', () => ({
  BoardAPI: {
    getBoard: vi.fn(),
    updateBoardName: vi.fn(),
    closeBoard: vi.fn(),
    renameColumn: vi.fn(),
  },
}));

vi.mock('../../../../../src/models/socket/SocketService', () => ({
  socketService: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockBoard: Board = {
  id: 'board-123',
  name: 'Sprint 42 Retro',
  shareable_link: 'http://localhost/boards/board-123',
  state: 'active',
  closed_at: null,
  columns: [
    { id: 'col-1', name: 'What Went Well', color: '#10b981' },
    { id: 'col-2', name: 'Improvements', color: '#f59e0b' },
    { id: 'col-3', name: 'Actions', color: '#3b82f6' },
  ],
  admins: ['hash-admin-1', 'hash-admin-2'],
  active_users: [],
  card_limit_per_user: 5,
  reaction_limit_per_user: 10,
  created_at: '2025-12-28T10:00:00Z',
  created_by_hash: 'hash-admin-1',
};

const mockCurrentUser: UserSession = {
  cookie_hash: 'hash-admin-1',
  alias: 'TestUser',
  is_admin: true,
  last_active_at: '2025-12-28T11:00:00Z',
  created_at: '2025-12-28T10:00:00Z',
};

const mockNonAdminUser: UserSession = {
  cookie_hash: 'hash-user-3',
  alias: 'RegularUser',
  is_admin: false,
  last_active_at: '2025-12-28T11:00:00Z',
  created_at: '2025-12-28T10:00:00Z',
};

// ============================================================================
// Test Suite
// ============================================================================

describe('useBoardViewModel', () => {
  beforeEach(() => {
    // Reset stores
    useBoardStore.setState({
      board: null,
      isLoading: false,
      error: null,
    });
    useUserStore.setState({
      currentUser: mockCurrentUser,
      activeUsers: [],
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Board Loading Tests
  // ============================================================================

  describe('Board Loading', () => {
    it('should load board data on mount', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.board).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.board).toEqual(mockBoard);
      expect(BoardAPI.getBoard).toHaveBeenCalledWith('board-123');
    });

    it('should handle API error during load', async () => {
      const error = new Error('Network error');
      vi.mocked(BoardAPI.getBoard).mockRejectedValue(error);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.board).toBeNull();
    });

    it('should refetch board when refetchBoard is called', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Refetch
      await act(async () => {
        await result.current.refetchBoard();
      });

      expect(BoardAPI.getBoard).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Derived State Tests
  // ============================================================================

  describe('Derived State', () => {
    it('should derive isAdmin correctly when user is in admins array', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should derive isAdmin as false when user is not in admins array', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      useUserStore.setState({ currentUser: mockNonAdminUser });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isAdmin).toBe(false);
    });

    it('should derive isCreator correctly when user is first admin', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isCreator).toBe(true);
    });

    it('should derive isCreator as false when user is not first admin', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      useUserStore.setState({
        currentUser: { ...mockCurrentUser, cookie_hash: 'hash-admin-2' },
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Second admin, not creator
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isCreator).toBe(false);
    });

    it('should derive isClosed correctly for active board', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isClosed).toBe(false);
    });

    it('should derive isClosed correctly for closed board', async () => {
      const closedBoard: Board = {
        ...mockBoard,
        state: 'closed',
        closed_at: '2025-12-28T12:00:00Z',
      };
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(closedBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(closedBoard);
      });

      expect(result.current.isClosed).toBe(true);
    });

    it('should derive isAdmin as false when no current user', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      useUserStore.setState({ currentUser: null });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isCreator).toBe(false);
    });
  });

  // ============================================================================
  // Action Tests - Rename Board
  // ============================================================================

  describe('handleRenameBoard', () => {
    it('should rename board successfully', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.updateBoardName).mockResolvedValue({
        id: 'board-123',
        name: 'Updated Board Name',
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      await act(async () => {
        await result.current.handleRenameBoard('Updated Board Name');
      });

      expect(BoardAPI.updateBoardName).toHaveBeenCalledWith('board-123', {
        name: 'Updated Board Name',
      });
    });

    it('should validate board name before renaming', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Try to rename with empty name
      await expect(
        act(async () => {
          await result.current.handleRenameBoard('');
        })
      ).rejects.toThrow('Board name is required');

      expect(BoardAPI.updateBoardName).not.toHaveBeenCalled();
    });

    it('should reject rename on closed board', async () => {
      const closedBoard: Board = {
        ...mockBoard,
        state: 'closed',
        closed_at: '2025-12-28T12:00:00Z',
      };
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(closedBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isClosed).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.handleRenameBoard('New Name');
        })
      ).rejects.toThrow('Cannot rename a closed board');

      expect(BoardAPI.updateBoardName).not.toHaveBeenCalled();
    });

    it('should handle API error during rename', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.updateBoardName).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Verify the operation throws with the correct message
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await result.current.handleRenameBoard('New Name');
        });
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toBe('Server error');

      // Verify the API was called
      expect(BoardAPI.updateBoardName).toHaveBeenCalledWith('board-123', { name: 'New Name' });
    });

    it('should validate board name length', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      const longName = 'A'.repeat(100); // MAX is 75

      await expect(
        act(async () => {
          await result.current.handleRenameBoard(longName);
        })
      ).rejects.toThrow('Board name must be 75 characters or less');
    });
  });

  // ============================================================================
  // Action Tests - Close Board
  // ============================================================================

  describe('handleCloseBoard', () => {
    it('should close board successfully', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.closeBoard).mockResolvedValue({
        id: 'board-123',
        state: 'closed',
        closed_at: '2025-12-28T12:00:00Z',
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      await act(async () => {
        await result.current.handleCloseBoard();
      });

      expect(BoardAPI.closeBoard).toHaveBeenCalledWith('board-123');
      expect(result.current.isClosed).toBe(true);
    });

    it('should reject closing already closed board', async () => {
      const closedBoard: Board = {
        ...mockBoard,
        state: 'closed',
        closed_at: '2025-12-28T12:00:00Z',
      };
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(closedBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isClosed).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.handleCloseBoard();
        })
      ).rejects.toThrow('Board is already closed');

      expect(BoardAPI.closeBoard).not.toHaveBeenCalled();
    });

    it('should handle API error during close', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.closeBoard).mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // The operation should throw with the correct message
      let thrownError: Error | null = null;
      try {
        await act(async () => {
          await result.current.handleCloseBoard();
        });
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toBe('Permission denied');

      // Verify the API was called
      expect(BoardAPI.closeBoard).toHaveBeenCalledWith('board-123');
    });
  });

  // ============================================================================
  // Action Tests - Rename Column
  // ============================================================================

  describe('handleRenameColumn', () => {
    it('should rename column successfully', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.renameColumn).mockResolvedValue({
        board_id: 'board-123',
        column_id: 'col-1',
        name: 'Great Stuff',
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      await act(async () => {
        await result.current.handleRenameColumn('col-1', 'Great Stuff');
      });

      expect(BoardAPI.renameColumn).toHaveBeenCalledWith('board-123', 'col-1', {
        name: 'Great Stuff',
      });
    });

    it('should validate column name before renaming', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      await expect(
        act(async () => {
          await result.current.handleRenameColumn('col-1', '');
        })
      ).rejects.toThrow('Column name is required');

      expect(BoardAPI.renameColumn).not.toHaveBeenCalled();
    });

    it('should reject column rename on closed board', async () => {
      const closedBoard: Board = {
        ...mockBoard,
        state: 'closed',
        closed_at: '2025-12-28T12:00:00Z',
      };
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(closedBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isClosed).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.handleRenameColumn('col-1', 'New Column Name');
        })
      ).rejects.toThrow('Cannot rename column on a closed board');

      expect(BoardAPI.renameColumn).not.toHaveBeenCalled();
    });

    it('should validate column name length', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      const longName = 'A'.repeat(50); // MAX is 30

      await expect(
        act(async () => {
          await result.current.handleRenameColumn('col-1', longName);
        })
      ).rejects.toThrow('Column name must be 30 characters or less');
    });
  });

  // ============================================================================
  // Socket Event Tests
  // ============================================================================

  describe('Socket Events', () => {
    it('should subscribe to board:renamed and board:closed events on mount', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(socketService.on).toHaveBeenCalledWith('board:renamed', expect.any(Function));
        expect(socketService.on).toHaveBeenCalledWith('board:closed', expect.any(Function));
      });
    });

    it('should unsubscribe from socket events on unmount', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      const { result, unmount } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toBeTruthy();
      });

      unmount();

      expect(socketService.off).toHaveBeenCalledWith('board:renamed', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('board:closed', expect.any(Function));
    });

    it('should update board name when board:renamed event is received', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      let renamedHandler: ((event: { board_id: string; name: string }) => void) | undefined;
      vi.mocked(socketService.on).mockImplementation((event, handler) => {
        if (event === 'board:renamed') {
          renamedHandler = handler as typeof renamedHandler;
        }
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Simulate socket event
      act(() => {
        renamedHandler?.({ board_id: 'board-123', name: 'Socket Updated Name' });
      });

      expect(result.current.board?.name).toBe('Socket Updated Name');
    });

    it('should update board state when board:closed event is received', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      let closedHandler: ((event: { board_id: string; closed_at: string }) => void) | undefined;
      vi.mocked(socketService.on).mockImplementation((event, handler) => {
        if (event === 'board:closed') {
          closedHandler = handler as typeof closedHandler;
        }
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      expect(result.current.isClosed).toBe(false);

      // Simulate socket event
      act(() => {
        closedHandler?.({ board_id: 'board-123', closed_at: '2025-12-28T13:00:00Z' });
      });

      expect(result.current.isClosed).toBe(true);
      expect(result.current.board?.closed_at).toBe('2025-12-28T13:00:00Z');
    });

    it('should ignore socket events for different board', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);

      let renamedHandler: ((event: { board_id: string; name: string }) => void) | undefined;
      vi.mocked(socketService.on).mockImplementation((event, handler) => {
        if (event === 'board:renamed') {
          renamedHandler = handler as typeof renamedHandler;
        }
      });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Simulate socket event for different board
      act(() => {
        renamedHandler?.({ board_id: 'other-board', name: 'Should Not Update' });
      });

      // Should still have original name
      expect(result.current.board?.name).toBe('Sprint 42 Retro');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty boardId', async () => {
      const { result } = renderHook(() => useBoardViewModel(''));

      // Should not call API with empty boardId
      expect(BoardAPI.getBoard).not.toHaveBeenCalled();
      expect(result.current.board).toBeNull();
    });

    it('should handle concurrent rename operations', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.updateBoardName)
        .mockResolvedValueOnce({ id: 'board-123', name: 'First' })
        .mockResolvedValueOnce({ id: 'board-123', name: 'Second' });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // Fire two renames concurrently
      await act(async () => {
        await Promise.all([
          result.current.handleRenameBoard('First'),
          result.current.handleRenameBoard('Second'),
        ]);
      });

      // Last write wins
      expect(result.current.board?.name).toBe('Second');
    });

    it('should clear operation error on successful operation', async () => {
      vi.mocked(BoardAPI.getBoard).mockResolvedValue(mockBoard);
      vi.mocked(BoardAPI.updateBoardName)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ id: 'board-123', name: 'Success' });

      const { result } = renderHook(() => useBoardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.board).toEqual(mockBoard);
      });

      // First call fails - verify it throws
      let firstError: Error | null = null;
      try {
        await act(async () => {
          await result.current.handleRenameBoard('Fail');
        });
      } catch (e) {
        firstError = e as Error;
      }

      expect(firstError).not.toBeNull();
      expect(firstError?.message).toBe('First error');

      // Second call succeeds
      await act(async () => {
        await result.current.handleRenameBoard('Success');
      });

      // After successful call, board name should be updated
      await waitFor(() => {
        expect(result.current.board?.name).toBe('Success');
      });

      // Error should be cleared (second call clears error at start)
      expect(result.current.error).toBeNull();
    });
  });
});
