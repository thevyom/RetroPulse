/**
 * Board Store
 * Zustand store for board state management
 */

import { create } from 'zustand';
import type { Board, Column, BoardState } from '../types';

// ============================================================================
// State Interface
// ============================================================================

interface BoardStoreState {
  // State
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBoard: (board: Board) => void;
  updateBoardName: (name: string) => void;
  closeBoard: (closedAt: string) => void;
  addAdmin: (userHash: string) => void;
  renameColumn: (columnId: string, name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearBoard: () => void;

  // Selectors
  getColumn: (columnId: string) => Column | undefined;
  isAdmin: (userHash: string) => boolean;
  isBoardClosed: () => boolean;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useBoardStore = create<BoardStoreState>((set, get) => ({
  // Initial State
  board: null,
  isLoading: false,
  error: null,

  // Actions
  setBoard: (board) =>
    set({
      board,
      isLoading: false,
      error: null,
    }),

  updateBoardName: (name) =>
    set((state) => ({
      board: state.board ? { ...state.board, name } : null,
    })),

  closeBoard: (closedAt) =>
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            state: 'closed' as BoardState,
            closed_at: closedAt,
          }
        : null,
    })),

  addAdmin: (userHash) =>
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            admins: state.board.admins.includes(userHash)
              ? state.board.admins
              : [...state.board.admins, userHash],
          }
        : null,
    })),

  renameColumn: (columnId, name) =>
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            columns: state.board.columns.map((col) =>
              col.id === columnId ? { ...col, name } : col
            ),
          }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearBoard: () =>
    set({
      board: null,
      isLoading: false,
      error: null,
    }),

  // Selectors
  getColumn: (columnId) => {
    const { board } = get();
    return board?.columns.find((col) => col.id === columnId);
  },

  isAdmin: (userHash) => {
    const { board } = get();
    return board?.admins.includes(userHash) ?? false;
  },

  isBoardClosed: () => {
    const { board } = get();
    return board?.state === 'closed';
  },
}));

// ============================================================================
// Standalone Selectors (for use outside React components)
// ============================================================================

export const boardSelectors = {
  getBoard: () => useBoardStore.getState().board,
  getColumns: () => useBoardStore.getState().board?.columns ?? [],
  getAdmins: () => useBoardStore.getState().board?.admins ?? [],
  isLoading: () => useBoardStore.getState().isLoading,
  getError: () => useBoardStore.getState().error,
};
