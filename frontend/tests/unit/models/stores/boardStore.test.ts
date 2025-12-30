/**
 * Board Store Tests
 * Tests for Zustand board state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore, boardSelectors } from '@/models/stores/boardStore';
import type { Board } from '@/models/types';

describe('boardStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useBoardStore.setState({
      board: null,
      isLoading: false,
      error: null,
    });
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockBoard: Board = {
    id: 'board-123',
    name: 'Sprint 42 Retro',
    shareable_link: 'https://app.retroboard.com/board/board-123',
    state: 'active',
    closed_at: null,
    columns: [
      { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
      { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
      { id: 'col-3', name: 'Action Items', color: '#DAE8FC' },
    ],
    admins: ['admin-hash'],
    active_users: [],
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_at: '2025-12-29T00:00:00Z',
    created_by_hash: 'admin-hash',
  };

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have null board initially', () => {
      expect(useBoardStore.getState().board).toBeNull();
    });

    it('should have isLoading false initially', () => {
      expect(useBoardStore.getState().isLoading).toBe(false);
    });

    it('should have null error initially', () => {
      expect(useBoardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // setBoard Tests
  // ============================================================================

  describe('setBoard', () => {
    it('should set board state', () => {
      useBoardStore.getState().setBoard(mockBoard);

      expect(useBoardStore.getState().board).toEqual(mockBoard);
    });

    it('should clear loading and error on setBoard', () => {
      useBoardStore.setState({ isLoading: true, error: 'Previous error' });

      useBoardStore.getState().setBoard(mockBoard);

      expect(useBoardStore.getState().isLoading).toBe(false);
      expect(useBoardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // updateBoardName Tests
  // ============================================================================

  describe('updateBoardName', () => {
    it('should update board name', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().updateBoardName('New Sprint Name');

      expect(useBoardStore.getState().board?.name).toBe('New Sprint Name');
    });

    it('should not modify other board properties', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().updateBoardName('New Sprint Name');

      expect(useBoardStore.getState().board?.columns).toEqual(mockBoard.columns);
      expect(useBoardStore.getState().board?.admins).toEqual(mockBoard.admins);
    });

    it('should handle null board gracefully', () => {
      useBoardStore.getState().updateBoardName('New Name');

      expect(useBoardStore.getState().board).toBeNull();
    });
  });

  // ============================================================================
  // closeBoard Tests
  // ============================================================================

  describe('closeBoard', () => {
    it('should set board state to closed', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().closeBoard('2025-12-29T12:00:00Z');

      expect(useBoardStore.getState().board?.state).toBe('closed');
    });

    it('should set closed_at timestamp', () => {
      useBoardStore.getState().setBoard(mockBoard);

      const closedAt = '2025-12-29T12:00:00Z';
      useBoardStore.getState().closeBoard(closedAt);

      expect(useBoardStore.getState().board?.closed_at).toBe(closedAt);
    });

    it('should handle null board gracefully', () => {
      useBoardStore.getState().closeBoard('2025-12-29T12:00:00Z');

      expect(useBoardStore.getState().board).toBeNull();
    });
  });

  // ============================================================================
  // addAdmin Tests
  // ============================================================================

  describe('addAdmin', () => {
    it('should add user hash to admins array', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().addAdmin('new-admin-hash');

      expect(useBoardStore.getState().board?.admins).toContain('new-admin-hash');
      expect(useBoardStore.getState().board?.admins).toHaveLength(2);
    });

    it('should not add duplicate admin', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().addAdmin('admin-hash');

      expect(useBoardStore.getState().board?.admins).toHaveLength(1);
    });

    it('should handle null board gracefully', () => {
      useBoardStore.getState().addAdmin('new-admin-hash');

      expect(useBoardStore.getState().board).toBeNull();
    });
  });

  // ============================================================================
  // renameColumn Tests
  // ============================================================================

  describe('renameColumn', () => {
    it('should rename column by ID', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().renameColumn('col-1', 'What Should We Continue');

      const column = useBoardStore.getState().board?.columns.find((c) => c.id === 'col-1');
      expect(column?.name).toBe('What Should We Continue');
    });

    it('should not modify other columns', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().renameColumn('col-1', 'New Name');

      const col2 = useBoardStore.getState().board?.columns.find((c) => c.id === 'col-2');
      expect(col2?.name).toBe('Improvements');
    });

    it('should handle non-existent column gracefully', () => {
      useBoardStore.getState().setBoard(mockBoard);

      useBoardStore.getState().renameColumn('non-existent', 'New Name');

      expect(useBoardStore.getState().board?.columns).toEqual(mockBoard.columns);
    });
  });

  // ============================================================================
  // setLoading Tests
  // ============================================================================

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      useBoardStore.getState().setLoading(true);

      expect(useBoardStore.getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useBoardStore.setState({ isLoading: true });

      useBoardStore.getState().setLoading(false);

      expect(useBoardStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // setError Tests
  // ============================================================================

  describe('setError', () => {
    it('should set error message', () => {
      useBoardStore.getState().setError('Board not found');

      expect(useBoardStore.getState().error).toBe('Board not found');
    });

    it('should clear loading when setting error', () => {
      useBoardStore.setState({ isLoading: true });

      useBoardStore.getState().setError('Error occurred');

      expect(useBoardStore.getState().isLoading).toBe(false);
    });

    it('should clear error with null', () => {
      useBoardStore.setState({ error: 'Previous error' });

      useBoardStore.getState().setError(null);

      expect(useBoardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // clearBoard Tests
  // ============================================================================

  describe('clearBoard', () => {
    it('should reset all state to initial values', () => {
      useBoardStore.setState({
        board: mockBoard,
        isLoading: true,
        error: 'Some error',
      });

      useBoardStore.getState().clearBoard();

      expect(useBoardStore.getState().board).toBeNull();
      expect(useBoardStore.getState().isLoading).toBe(false);
      expect(useBoardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // Selector Tests
  // ============================================================================

  describe('getColumn', () => {
    it('should return column by ID', () => {
      useBoardStore.getState().setBoard(mockBoard);

      const column = useBoardStore.getState().getColumn('col-2');

      expect(column?.name).toBe('Improvements');
    });

    it('should return undefined for non-existent column', () => {
      useBoardStore.getState().setBoard(mockBoard);

      const column = useBoardStore.getState().getColumn('non-existent');

      expect(column).toBeUndefined();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      useBoardStore.getState().setBoard(mockBoard);

      const isAdmin = useBoardStore.getState().isAdmin('admin-hash');

      expect(isAdmin).toBe(true);
    });

    it('should return false for non-admin user', () => {
      useBoardStore.getState().setBoard(mockBoard);

      const isAdmin = useBoardStore.getState().isAdmin('regular-user');

      expect(isAdmin).toBe(false);
    });
  });

  describe('isBoardClosed', () => {
    it('should return false for active board', () => {
      useBoardStore.getState().setBoard(mockBoard);

      expect(useBoardStore.getState().isBoardClosed()).toBe(false);
    });

    it('should return true for closed board', () => {
      useBoardStore.getState().setBoard({
        ...mockBoard,
        state: 'closed',
        closed_at: '2025-12-29T12:00:00Z',
      });

      expect(useBoardStore.getState().isBoardClosed()).toBe(true);
    });
  });

  // ============================================================================
  // Standalone Selectors Tests
  // ============================================================================

  describe('boardSelectors', () => {
    it('getBoard should return current board', () => {
      useBoardStore.getState().setBoard(mockBoard);

      expect(boardSelectors.getBoard()).toEqual(mockBoard);
    });

    it('getColumns should return columns array', () => {
      useBoardStore.getState().setBoard(mockBoard);

      expect(boardSelectors.getColumns()).toHaveLength(3);
    });

    it('getColumns should return empty array when no board', () => {
      expect(boardSelectors.getColumns()).toEqual([]);
    });

    it('getAdmins should return admins array', () => {
      useBoardStore.getState().setBoard(mockBoard);

      expect(boardSelectors.getAdmins()).toContain('admin-hash');
    });

    it('isLoading should return loading state', () => {
      useBoardStore.setState({ isLoading: true });

      expect(boardSelectors.isLoading()).toBe(true);
    });

    it('getError should return error message', () => {
      useBoardStore.setState({ error: 'Test error' });

      expect(boardSelectors.getError()).toBe('Test error');
    });
  });
});
