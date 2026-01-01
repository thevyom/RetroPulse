/**
 * useParticipantViewModel Tests
 * Comprehensive unit tests for the Participant ViewModel hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useParticipantViewModel } from '../../../../../src/features/participant/viewmodels/useParticipantViewModel';
import { useUserStore } from '../../../../../src/models/stores/userStore';
import { useBoardStore } from '../../../../../src/models/stores/boardStore';
import { BoardAPI } from '../../../../../src/models/api/BoardAPI';
import { socketService } from '../../../../../src/models/socket/SocketService';
import type { Board, UserSession, ActiveUser } from '../../../../../src/models/types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../../src/models/api/BoardAPI', () => ({
  BoardAPI: {
    getActiveUsers: vi.fn(),
    sendHeartbeat: vi.fn(),
    updateAlias: vi.fn(),
    addAdmin: vi.fn(),
    getCurrentUserSession: vi.fn(),
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
  columns: [],
  admins: ['hash-creator', 'hash-admin-2'],
  active_users: [],
  card_limit_per_user: 5,
  reaction_limit_per_user: 10,
  created_at: '2025-12-28T10:00:00Z',
  created_by_hash: 'hash-creator',
};

const mockCurrentUser: UserSession = {
  cookie_hash: 'hash-creator',
  alias: 'BoardCreator',
  is_admin: true,
  last_active_at: '2025-12-28T11:00:00Z',
  created_at: '2025-12-28T10:00:00Z',
};

const mockActiveUsers: ActiveUser[] = [
  {
    alias: 'BoardCreator',
    is_admin: true,
    last_active_at: '2025-12-28T11:00:00Z',
    created_at: '2025-12-28T10:00:00Z',
  },
  {
    alias: 'ParticipantOne',
    is_admin: false,
    last_active_at: '2025-12-28T10:55:00Z',
    created_at: '2025-12-28T10:15:00Z',
  },
  {
    alias: 'ParticipantTwo',
    is_admin: false,
    last_active_at: '2025-12-28T10:50:00Z',
    created_at: '2025-12-28T10:20:00Z',
  },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('useParticipantViewModel', () => {
  beforeEach(() => {
    // Reset stores
    useUserStore.setState({
      currentUser: mockCurrentUser,
      activeUsers: [],
      isLoading: false,
      error: null,
    });
    useBoardStore.setState({
      board: mockBoard,
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(BoardAPI.getActiveUsers).mockResolvedValue({
      active_users: mockActiveUsers,
      total_count: mockActiveUsers.length,
    });
    vi.mocked(BoardAPI.sendHeartbeat).mockResolvedValue({
      alias: 'BoardCreator',
      last_active_at: new Date().toISOString(),
    });
    vi.mocked(BoardAPI.getCurrentUserSession).mockResolvedValue(mockCurrentUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial Loading Tests
  // ============================================================================

  describe('Initial Loading', () => {
    it('should load active users on mount', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      expect(BoardAPI.getActiveUsers).toHaveBeenCalledWith('board-123');
    });

    it('should fetch current user session on mount', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toEqual(mockCurrentUser);
      });

      expect(BoardAPI.getCurrentUserSession).toHaveBeenCalledWith('board-123');
    });

    it('should handle API error during load', async () => {
      vi.mocked(BoardAPI.getActiveUsers).mockRejectedValue(new Error('Network error'));
      // Also reject getCurrentUserSession to prevent it from clearing the error
      vi.mocked(BoardAPI.getCurrentUserSession).mockRejectedValue(new Error('Session not found'));

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      // Wait for the API call to complete and error to propagate
      await waitFor(
        () => {
          expect(result.current.error).toBe('Network error');
        },
        { timeout: 3000 }
      );
    });
  });

  // ============================================================================
  // Derived State Tests
  // ============================================================================

  describe('Derived State', () => {
    it('should derive isCurrentUserCreator correctly for creator', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      expect(result.current.isCurrentUserCreator).toBe(true);
    });

    it('should derive isCurrentUserCreator as false for non-creator', async () => {
      const nonCreatorUser = {
        ...mockCurrentUser,
        cookie_hash: 'hash-admin-2',
        alias: 'SecondAdmin',
      };

      useUserStore.setState({
        currentUser: nonCreatorUser,
      });

      // Mock API to return the non-creator user
      vi.mocked(BoardAPI.getCurrentUserSession).mockResolvedValue(nonCreatorUser);

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      expect(result.current.isCurrentUserCreator).toBe(false);
    });
  });

  // ============================================================================
  // Heartbeat Tests
  // ============================================================================

  describe('Heartbeat', () => {
    it('should send heartbeat every 60 seconds', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useParticipantViewModel('board-123'));

      expect(BoardAPI.sendHeartbeat).not.toHaveBeenCalled();

      // Advance timer by 60 seconds
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      expect(BoardAPI.sendHeartbeat).toHaveBeenCalledTimes(1);

      // Advance timer by another 60 seconds
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      expect(BoardAPI.sendHeartbeat).toHaveBeenCalledTimes(2);

      unmount();
      vi.useRealTimers();
    });

    it('should stop heartbeat on unmount', async () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useParticipantViewModel('board-123'));

      // Advance timer by 60 seconds
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      expect(BoardAPI.sendHeartbeat).toHaveBeenCalledTimes(1);

      unmount();

      // Advance timer more
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      // Should not have been called again
      expect(BoardAPI.sendHeartbeat).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should handle heartbeat failure gracefully', async () => {
      vi.useFakeTimers();
      vi.mocked(BoardAPI.sendHeartbeat).mockRejectedValue(new Error('Network error'));

      const { unmount } = renderHook(() => useParticipantViewModel('board-123'));

      // Advance timer by 60 seconds
      await act(async () => {
        vi.advanceTimersByTime(60000);
      });

      // Should not throw, just log warning
      expect(BoardAPI.sendHeartbeat).toHaveBeenCalled();

      unmount();
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Update Alias Tests
  // ============================================================================

  describe('handleUpdateAlias', () => {
    it('should update alias successfully', async () => {
      vi.mocked(BoardAPI.updateAlias).mockResolvedValue({
        alias: 'NewAlias',
        last_active_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toBeDefined();
      });

      await act(async () => {
        await result.current.handleUpdateAlias('NewAlias');
      });

      expect(BoardAPI.updateAlias).toHaveBeenCalledWith('board-123', { alias: 'NewAlias' });
      expect(result.current.currentUser?.alias).toBe('NewAlias');
    });

    it('should validate alias before updating', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.handleUpdateAlias('');
        })
      ).rejects.toThrow('Alias is required');

      expect(BoardAPI.updateAlias).not.toHaveBeenCalled();
    });

    it('should validate alias length', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toBeDefined();
      });

      const longAlias = 'A'.repeat(50); // MAX is 30

      await expect(
        act(async () => {
          await result.current.handleUpdateAlias(longAlias);
        })
      ).rejects.toThrow('Alias must be 30 characters or less');

      expect(BoardAPI.updateAlias).not.toHaveBeenCalled();
    });

    it('should reject update on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.handleUpdateAlias('NewAlias');
        })
      ).rejects.toThrow('Cannot update alias on a closed board');
    });
  });

  // ============================================================================
  // Promote Admin Tests
  // ============================================================================

  describe('handlePromoteToAdmin', () => {
    it('should promote user to admin (creator only)', async () => {
      vi.mocked(BoardAPI.addAdmin).mockResolvedValue({
        board_id: 'board-123',
        admins: ['hash-creator', 'hash-admin-2', 'hash-new-admin'],
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      await act(async () => {
        await result.current.handlePromoteToAdmin('hash-new-admin');
      });

      expect(BoardAPI.addAdmin).toHaveBeenCalledWith('board-123', {
        user_cookie_hash: 'hash-new-admin',
      });
    });

    it('should reject promotion by non-creator', async () => {
      const nonCreatorUser = {
        ...mockCurrentUser,
        cookie_hash: 'hash-admin-2',
        alias: 'SecondAdmin',
      };

      useUserStore.setState({
        currentUser: nonCreatorUser,
      });

      // Mock API to return the non-creator user
      vi.mocked(BoardAPI.getCurrentUserSession).mockResolvedValue(nonCreatorUser);

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handlePromoteToAdmin('hash-new-admin');
        })
      ).rejects.toThrow('Only the board creator can promote users to admin');

      expect(BoardAPI.addAdmin).not.toHaveBeenCalled();
    });

    it('should reject promotion of existing admin', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handlePromoteToAdmin('hash-admin-2');
        })
      ).rejects.toThrow('User is already an admin');
    });

    it('should reject promotion on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handlePromoteToAdmin('hash-new-admin');
        })
      ).rejects.toThrow('Cannot promote admin on a closed board');
    });
  });

  // ============================================================================
  // Filter Tests
  // ============================================================================

  describe('Filter Actions', () => {
    it('should have correct initial filter state', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      expect(result.current.showAll).toBe(true);
      expect(result.current.showAnonymous).toBe(true);
      expect(result.current.showOnlyAnonymous).toBe(false);
      expect(result.current.selectedUsers).toEqual([]);
    });

    it('should toggle All Users filter', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      expect(result.current.showAll).toBe(true);

      act(() => {
        result.current.handleToggleAllUsersFilter();
      });

      expect(result.current.showAll).toBe(false);

      act(() => {
        result.current.handleToggleAllUsersFilter();
      });

      expect(result.current.showAll).toBe(true);
      expect(result.current.selectedUsers).toEqual([]);
    });

    it('should toggle showOnlyAnonymous filter', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      expect(result.current.showOnlyAnonymous).toBe(false);

      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(true);
      expect(result.current.showAll).toBe(false); // Should disable showAll when anonymous-only is enabled
    });

    it('should clear user selection when enabling anonymous-only filter', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      // Select a user first
      act(() => {
        result.current.handleToggleUserFilter('ParticipantOne');
      });

      expect(result.current.selectedUsers).toContain('ParticipantOne');

      // Enable anonymous-only filter
      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(true);
      expect(result.current.selectedUsers).toEqual([]); // User selection should be cleared
    });

    it('should restore showAll when disabling anonymous-only filter', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      // Enable anonymous-only filter
      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(true);
      expect(result.current.showAll).toBe(false);

      // Disable anonymous-only filter
      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(false);
      expect(result.current.showAll).toBe(true); // Should restore showAll
    });

    it('should toggle user-specific filter', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      act(() => {
        result.current.handleToggleUserFilter('ParticipantOne');
      });

      expect(result.current.selectedUsers).toContain('ParticipantOne');
      expect(result.current.showAll).toBe(false);

      // Toggle same user off
      act(() => {
        result.current.handleToggleUserFilter('ParticipantOne');
      });

      expect(result.current.selectedUsers).not.toContain('ParticipantOne');
      expect(result.current.showAll).toBe(true); // Reverts when no users selected
    });

    it('should support multiple user filters (OR logic)', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      act(() => {
        result.current.handleToggleUserFilter('ParticipantOne');
      });

      act(() => {
        result.current.handleToggleUserFilter('ParticipantTwo');
      });

      expect(result.current.selectedUsers).toContain('ParticipantOne');
      expect(result.current.selectedUsers).toContain('ParticipantTwo');
      expect(result.current.selectedUsers.length).toBe(2);
    });

    it('should clear showOnlyAnonymous when selecting a user', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      // Enable anonymous-only filter first
      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(true);

      // Select a user
      act(() => {
        result.current.handleToggleUserFilter('ParticipantOne');
      });

      expect(result.current.selectedUsers).toContain('ParticipantOne');
      expect(result.current.showOnlyAnonymous).toBe(false); // Should be cleared
    });

    it('should clear all filters including showOnlyAnonymous', () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      // Enable anonymous-only filter
      act(() => {
        result.current.handleToggleAnonymousFilter();
      });

      expect(result.current.showOnlyAnonymous).toBe(true);

      // Clear all
      act(() => {
        result.current.handleClearFilters();
      });

      expect(result.current.showAll).toBe(true);
      expect(result.current.showAnonymous).toBe(true);
      expect(result.current.showOnlyAnonymous).toBe(false);
      expect(result.current.selectedUsers).toEqual([]);
    });
  });

  // ============================================================================
  // Socket Event Tests
  // ============================================================================

  describe('Socket Events', () => {
    it('should subscribe to user events on mount', async () => {
      renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(socketService.on).toHaveBeenCalled();
      });

      expect(socketService.on).toHaveBeenCalledWith('user:joined', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('user:left', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('user:alias_changed', expect.any(Function));
    });

    it('should unsubscribe from socket events on unmount', async () => {
      const { result, unmount } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      unmount();

      expect(socketService.off).toHaveBeenCalledWith('user:joined', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('user:left', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('user:alias_changed', expect.any(Function));
    });

    it('should add user when user:joined event is received', async () => {
      let joinedHandler:
        | ((event: { board_id: string; alias: string; is_admin: boolean }) => void)
        | undefined;
      vi.mocked(socketService.on).mockImplementation((event, handler) => {
        if (event === 'user:joined') {
          joinedHandler = handler as typeof joinedHandler;
        }
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      // Simulate socket event
      act(() => {
        joinedHandler?.({
          board_id: 'board-123',
          alias: 'NewUser',
          is_admin: false,
        });
      });

      expect(result.current.activeUsers.find((u) => u.alias === 'NewUser')).toBeDefined();
    });

    it('should ignore user:joined event for different board', async () => {
      let joinedHandler:
        | ((event: { board_id: string; alias: string; is_admin: boolean }) => void)
        | undefined;
      vi.mocked(socketService.on).mockImplementation((event, handler) => {
        if (event === 'user:joined') {
          joinedHandler = handler as typeof joinedHandler;
        }
      });

      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      const initialCount = result.current.activeUsers.length;

      // Simulate socket event for different board
      act(() => {
        joinedHandler?.({
          board_id: 'other-board',
          alias: 'NewUser',
          is_admin: false,
        });
      });

      expect(result.current.activeUsers.length).toBe(initialCount);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty boardId', () => {
      const { result } = renderHook(() => useParticipantViewModel(''));

      // Should not call APIs with empty boardId
      expect(BoardAPI.getActiveUsers).not.toHaveBeenCalled();
      expect(result.current.activeUsers).toEqual([]);
    });

    it('should refetch active users on demand', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.activeUsers.length).toBe(3);
      });

      // Refetch
      await act(async () => {
        await result.current.refetchActiveUsers();
      });

      expect(BoardAPI.getActiveUsers).toHaveBeenCalledTimes(2);
    });

    it('should send heartbeat manually', async () => {
      const { result } = renderHook(() => useParticipantViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.currentUser).toBeDefined();
      });

      await act(async () => {
        await result.current.sendHeartbeat();
      });

      expect(BoardAPI.sendHeartbeat).toHaveBeenCalledWith('board-123');
    });
  });
});
