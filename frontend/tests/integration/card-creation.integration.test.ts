/**
 * Card Creation Integration Tests with MSW
 *
 * Tests the full card creation flow with real ViewModels and mocked API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { server, resetMockData } from '../mocks/server';
import { setMockCardQuota, createMockCard, setMockCards } from '../mocks/handlers';
import { useCardViewModel } from '@/features/card/viewmodels/useCardViewModel';
import { useCardStore } from '@/models/stores/cardStore';
import { useBoardStore } from '@/models/stores/boardStore';

// Mock SocketService for integration tests
vi.mock('@/models/socket/SocketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
    boardId: null,
    getSocket: vi.fn(() => null),
  },
  SocketService: vi.fn(),
}));

// Start/stop MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  // Ensure clean state before each test
  useCardStore.setState({ cards: new Map(), isLoading: false, error: null });
  useBoardStore.setState({ board: null, isLoading: false, error: null });
  resetMockData();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockData();
  vi.clearAllMocks();
  // Clear stores
  useCardStore.setState({ cards: new Map(), isLoading: false, error: null });
  useBoardStore.setState({ board: null, isLoading: false, error: null });
});
afterAll(() => server.close());

describe('Card Creation Integration', () => {
  const boardId = 'board-123';

  // Note: Tests using autoFetch: false for quota checks work well.
  // Tests involving card CRUD operations need socket.io mocking to be fully enabled.
  // The handleCreateCard tests work but some update/delete tests need more MSW handler work.

  describe('Quota Check', () => {
    it('checks quota before showing create dialog', async () => {
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      // Check quota
      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota).toBeDefined();
      expect(quota?.can_create).toBe(true);
      expect(quota?.current_count).toBe(1);
      expect(quota?.limit).toBe(5);
    });

    it('reports quota exhausted when limit reached', async () => {
      // Set quota to exhausted
      setMockCardQuota({
        current_count: 5,
        limit: 5,
        can_create: false,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota?.can_create).toBe(false);
      expect(quota?.current_count).toBe(5);
    });
  });

  describe('Card Creation Flow', () => {
    it('creates card and updates store', async () => {
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      const initialCount = result.current.cards.length;

      // Create a new card
      await act(async () => {
        await result.current.handleCreateCard({
          column_id: 'col-1',
          content: 'My new feedback',
          card_type: 'feedback',
          is_anonymous: false,
        });
      });

      // Card should be added to store
      expect(result.current.cards.length).toBe(initialCount + 1);
      expect(result.current.cards.some((c) => c.content === 'My new feedback')).toBe(true);
    });

    it('creates anonymous card', async () => {
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Create anonymous card
      let createdCard;
      await act(async () => {
        createdCard = await result.current.handleCreateCard({
          column_id: 'col-2',
          content: 'Anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });
      });

      expect(createdCard).toBeDefined();
      expect(createdCard?.is_anonymous).toBe(true);
    });

    it('creates action card in action column', async () => {
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      let createdCard;
      await act(async () => {
        createdCard = await result.current.handleCreateCard({
          column_id: 'col-3', // Action column
          content: 'New action item',
          card_type: 'action',
          is_anonymous: false,
        });
      });

      expect(createdCard).toBeDefined();
      expect(createdCard?.card_type).toBe('action');
      expect(createdCard?.column_id).toBe('col-3');
    });

    it('blocks creation when quota exhausted', async () => {
      // Set quota to exhausted
      setMockCardQuota({
        current_count: 5,
        limit: 5,
        can_create: false,
        limit_enabled: true,
      });

      const { result, unmount } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Try to create a card - should throw or return error
      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: 'Should fail',
            card_type: 'feedback',
            is_anonymous: false,
          });
        } catch (err) {
          caughtError = err as Error;
        }
      });

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('limit');

      // Clean up explicitly
      unmount();
    });
  });

  describe('Card Update Flow', () => {
    it('updates card content', async () => {
      // Set up initial cards
      const existingCard = createMockCard({
        id: 'card-update-test',
        content: 'Original content',
      });
      setMockCards([existingCard]);

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      // Wait for hook to be ready
      expect(result.current).not.toBeNull();

      await act(async () => {
        await result.current.refetchCards();
      });

      // Update the card
      await act(async () => {
        await result.current.handleUpdateCard('card-update-test', 'Updated content');
      });

      // Find the updated card
      const updatedCard = result.current.cards.find((c) => c.id === 'card-update-test');
      expect(updatedCard?.content).toBe('Updated content');
    });
  });

  describe('Card Delete Flow', () => {
    it('deletes card and removes from store', async () => {
      const cardToDelete = createMockCard({ id: 'card-to-delete' });
      const otherCard = createMockCard({ id: 'other-card' });
      setMockCards([cardToDelete, otherCard]);

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      // Wait for hook to be ready
      expect(result.current).not.toBeNull();

      await act(async () => {
        await result.current.refetchCards();
      });

      expect(result.current.cards.length).toBe(2);

      // Delete the card
      await act(async () => {
        await result.current.handleDeleteCard('card-to-delete');
      });

      expect(result.current.cards.length).toBe(1);
      expect(result.current.cards.some((c) => c.id === 'card-to-delete')).toBe(false);
    });
  });
});
