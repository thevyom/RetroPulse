/**
 * useCreateBoardViewModel Hook
 * Manages board creation state and operations
 */

import { useState, useCallback } from 'react';
import { BoardAPI } from '@/models/api';
import type { CreateBoardDTO, BoardResponse } from '@/models/types';

// ============================================================================
// Types
// ============================================================================

export interface UseCreateBoardViewModelReturn {
  isCreating: boolean;
  error: string | null;
  createBoard: (data: CreateBoardDTO) => Promise<BoardResponse>;
}

// ============================================================================
// Hook
// ============================================================================

export function useCreateBoardViewModel(): UseCreateBoardViewModelReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBoard = useCallback(async (data: CreateBoardDTO): Promise<BoardResponse> => {
    setIsCreating(true);
    setError(null);

    try {
      const board = await BoardAPI.createBoard(data);
      return board;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create board';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    isCreating,
    error,
    createBoard,
  };
}

export default useCreateBoardViewModel;
