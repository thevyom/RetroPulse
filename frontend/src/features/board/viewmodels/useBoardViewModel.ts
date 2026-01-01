/**
 * Board ViewModel Hook
 * Manages board-level state and operations following MVVM pattern
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBoardStore } from '../../../models/stores/boardStore';
import { useUserStore } from '../../../models/stores/userStore';
import { BoardAPI } from '../../../models/api/BoardAPI';
import { socketService } from '../../../models/socket/SocketService';
import type { Board } from '../../../models/types';
import { validateBoardName, validateColumnName } from '../../../shared/validation';

// ============================================================================
// Types
// ============================================================================

export interface UseBoardViewModelResult {
  // State
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // Derived state
  isAdmin: boolean;
  isCreator: boolean;
  isClosed: boolean;

  // Actions
  handleRenameBoard: (newName: string) => Promise<void>;
  handleCloseBoard: () => Promise<void>;
  handleRenameColumn: (columnId: string, newName: string) => Promise<void>;
  refetchBoard: () => Promise<void>;
}

// ============================================================================
// Options
// ============================================================================

export interface UseBoardViewModelOptions {
  /**
   * Automatically fetch board on mount. Default: true
   * Set to false in tests to control when data fetching occurs.
   */
  autoFetch?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBoardViewModel(
  boardId: string,
  options: UseBoardViewModelOptions = {}
): UseBoardViewModelResult {
  const { autoFetch = true } = options;
  // Store state
  const board = useBoardStore((state) => state.board);
  const storeIsLoading = useBoardStore((state) => state.isLoading);
  const storeError = useBoardStore((state) => state.error);
  const setBoard = useBoardStore((state) => state.setBoard);
  const updateBoardName = useBoardStore((state) => state.updateBoardName);
  const closeBoard = useBoardStore((state) => state.closeBoard);
  const renameColumn = useBoardStore((state) => state.renameColumn);
  const setLoading = useBoardStore((state) => state.setLoading);
  const setError = useBoardStore((state) => state.setError);

  const currentUser = useUserStore((state) => state.currentUser);

  // Local state for operation errors
  const [operationError, setOperationError] = useState<string | null>(null);

  // Combined error state
  const error = operationError || storeError;

  // ============================================================================
  // Derived State
  // ============================================================================

  const isAdmin = useMemo(() => {
    if (!board || !currentUser) return false;
    return board.admins.includes(currentUser.cookie_hash);
  }, [board, currentUser]);

  const isCreator = useMemo(() => {
    if (!board || !currentUser) return false;
    return board.admins[0] === currentUser.cookie_hash;
  }, [board, currentUser]);

  const isClosed = useMemo(() => {
    return board?.state === 'closed';
  }, [board]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;

    setLoading(true);
    setOperationError(null);

    try {
      const boardData = await BoardAPI.getBoard(boardId);
      setBoard(boardData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load board';
      setError(message);
    }
  }, [boardId, setBoard, setLoading, setError]);

  // Load board on mount (unless autoFetch is disabled)
  useEffect(() => {
    if (autoFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching on mount is intentional
      void fetchBoard();
    }
  }, [autoFetch, fetchBoard]);

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!boardId) return;

    // Handler for board renamed event
    const handleBoardRenamed = (event: { board_id: string; name: string }) => {
      if (event.board_id === boardId) {
        updateBoardName(event.name);
      }
    };

    // Handler for board closed event
    const handleBoardClosed = (event: { board_id: string; closed_at: string }) => {
      if (event.board_id === boardId) {
        closeBoard(event.closed_at);
      }
    };

    // Subscribe to socket events
    socketService.on('board:renamed', handleBoardRenamed);
    socketService.on('board:closed', handleBoardClosed);

    // Cleanup subscriptions on unmount
    return () => {
      socketService.off('board:renamed', handleBoardRenamed);
      socketService.off('board:closed', handleBoardClosed);
    };
  }, [boardId, updateBoardName, closeBoard]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleRenameBoard = useCallback(
    async (newName: string) => {
      if (!boardId) return;

      // Validate input
      const validation = validateBoardName(newName);
      if (!validation.isValid) {
        setOperationError(validation.error || 'Invalid board name');
        throw new Error(validation.error || 'Invalid board name');
      }

      // Check if board is closed
      if (isClosed) {
        setOperationError('Cannot rename a closed board');
        throw new Error('Cannot rename a closed board');
      }

      setOperationError(null);

      try {
        const response = await BoardAPI.updateBoardName(boardId, { name: newName });
        updateBoardName(response.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename board';
        setOperationError(message);
        throw err;
      }
    },
    [boardId, isClosed, updateBoardName]
  );

  const handleCloseBoard = useCallback(async () => {
    if (!boardId) return;

    // Check if already closed
    if (isClosed) {
      setOperationError('Board is already closed');
      throw new Error('Board is already closed');
    }

    setOperationError(null);

    try {
      const response = await BoardAPI.closeBoard(boardId);
      closeBoard(response.closed_at);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close board';
      setOperationError(message);
      throw err;
    }
  }, [boardId, isClosed, closeBoard]);

  const handleRenameColumn = useCallback(
    async (columnId: string, newName: string) => {
      if (!boardId) return;

      // Validate input
      const validation = validateColumnName(newName);
      if (!validation.isValid) {
        setOperationError(validation.error || 'Invalid column name');
        throw new Error(validation.error || 'Invalid column name');
      }

      // Check if board is closed
      if (isClosed) {
        setOperationError('Cannot rename column on a closed board');
        throw new Error('Cannot rename column on a closed board');
      }

      setOperationError(null);

      try {
        const response = await BoardAPI.renameColumn(boardId, columnId, { name: newName });
        renameColumn(response.column_id, response.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename column';
        setOperationError(message);
        throw err;
      }
    },
    [boardId, isClosed, renameColumn]
  );

  const refetchBoard = useCallback(async () => {
    await fetchBoard();
  }, [fetchBoard]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    board,
    isLoading: storeIsLoading,
    error,

    // Derived state
    isAdmin,
    isCreator,
    isClosed,

    // Actions
    handleRenameBoard,
    handleCloseBoard,
    handleRenameColumn,
    refetchBoard,
  };
}
