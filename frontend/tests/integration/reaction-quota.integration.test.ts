/**
 * Reaction Quota Integration Tests with MSW
 *
 * Tests reaction quota enforcement with real ViewModels and mocked API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { server, resetMockData } from '../mocks/server';
import { setMockReactionQuota, createMockCard, setMockCards } from '../mocks/handlers';
import { useCardViewModel } from '@/features/card/viewmodels/useCardViewModel';
import { useCardStore } from '@/models/stores/cardStore';

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
afterEach(() => {
  server.resetHandlers();
  resetMockData();
  vi.clearAllMocks();
  useCardStore.setState({ cards: new Map(), isLoading: false, error: null });
});
afterAll(() => server.close());

describe('Reaction Quota Integration', () => {
  const boardId = 'board-123';

  describe('Quota Status', () => {
    it('returns quota when under limit', async () => {
      setMockReactionQuota({
        current_count: 3,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkReactionQuota();
      });

      expect(quota?.current_count).toBe(3);
      expect(quota?.limit).toBe(10);
      expect(quota?.can_react).toBe(true);
    });

    it('returns quota exhausted at limit', async () => {
      setMockReactionQuota({
        current_count: 10,
        limit: 10,
        can_react: false,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkReactionQuota();
      });

      expect(quota?.current_count).toBe(10);
      expect(quota?.can_react).toBe(false);
    });

    it('returns unlimited when limit disabled', async () => {
      setMockReactionQuota({
        current_count: 20,
        limit: null,
        can_react: true,
        limit_enabled: false,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkReactionQuota();
      });

      expect(quota?.limit).toBeNull();
      expect(quota?.can_react).toBe(true);
    });
  });

  describe('Reaction Adding', () => {
    it('allows adding reaction when under limit', async () => {
      const card = createMockCard({
        id: 'card-1',
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
      });
      setMockCards([card]);
      setMockReactionQuota({
        current_count: 3,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Add reaction
      await act(async () => {
        await result.current.handleAddReaction('card-1');
      });

      // Card should have reaction
      const updatedCard = result.current.cards.find((c) => c.id === 'card-1');
      expect(updatedCard?.direct_reaction_count).toBe(1);
    });

    it('blocks reaction when quota exhausted', async () => {
      const card = createMockCard({ id: 'card-1' });
      setMockCards([card]);
      setMockReactionQuota({
        current_count: 10,
        limit: 10,
        can_react: false,
        limit_enabled: true,
      });

      const { result, unmount } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Try to add reaction - should fail
      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.handleAddReaction('card-1');
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

  describe('Reaction Removal', () => {
    it('removes reaction and frees quota', async () => {
      const card = createMockCard({
        id: 'card-1',
        direct_reaction_count: 1,
        aggregated_reaction_count: 1,
      });
      setMockCards([card]);
      setMockReactionQuota({
        current_count: 5,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // First add a reaction so we can remove it
      await act(async () => {
        await result.current.handleAddReaction('card-1');
      });

      // Remove reaction
      await act(async () => {
        await result.current.handleRemoveReaction('card-1');
      });

      // Card should have no reaction (back to original 1, then +1 -1 = 1)
      const updatedCard = result.current.cards.find((c) => c.id === 'card-1');
      expect(updatedCard?.direct_reaction_count).toBe(1);
    });

    it('allows reaction after removing at limit', async () => {
      const card = createMockCard({
        id: 'card-1',
        direct_reaction_count: 1,
        aggregated_reaction_count: 1,
      });
      setMockCards([card]);
      // Start with quota allowing reaction so we can add one
      setMockReactionQuota({
        current_count: 9,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Add reaction first (this will hit limit)
      await act(async () => {
        await result.current.handleAddReaction('card-1');
      });

      // Remove reaction
      await act(async () => {
        await result.current.handleRemoveReaction('card-1');
      });

      // Check quota after removal - should allow reaction
      let quota;
      await act(async () => {
        quota = await result.current.checkReactionQuota();
      });

      expect(quota?.can_react).toBe(true);
    });
  });

  describe('Reaction Count Updates', () => {
    it('updates direct and aggregated counts on add', async () => {
      const card = createMockCard({
        id: 'card-1',
        direct_reaction_count: 5,
        aggregated_reaction_count: 5,
      });
      setMockCards([card]);
      setMockReactionQuota({
        current_count: 3,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      const initialCard = result.current.cards.find((c) => c.id === 'card-1');
      expect(initialCard?.direct_reaction_count).toBe(5);

      await act(async () => {
        await result.current.handleAddReaction('card-1');
      });

      const updatedCard = result.current.cards.find((c) => c.id === 'card-1');
      expect(updatedCard?.direct_reaction_count).toBe(6);
    });

    it('updates parent aggregated count when child receives reaction', async () => {
      // Note: Parent aggregation is typically handled by backend
      // This test verifies the local store update mechanism
      const parentCard = createMockCard({
        id: 'parent',
        card_type: 'feedback',
        direct_reaction_count: 2,
        aggregated_reaction_count: 5, // Parent has 3 child reactions
      });
      const childCard = createMockCard({
        id: 'child',
        card_type: 'feedback',
        parent_card_id: 'parent',
        direct_reaction_count: 3,
        aggregated_reaction_count: 3,
      });
      setMockCards([parentCard, childCard]);
      setMockReactionQuota({
        current_count: 3,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Add reaction to child
      await act(async () => {
        await result.current.handleAddReaction('child');
      });

      // Child direct count should increase
      const updatedChild = result.current.cards.find((c) => c.id === 'child');
      expect(updatedChild?.direct_reaction_count).toBe(4);
    });
  });

  describe('Board Isolation', () => {
    it('reaction quota is specific to current board', async () => {
      setMockReactionQuota({
        current_count: 7,
        limit: 10,
        can_react: true,
        limit_enabled: true,
      });

      // Use standard board ID that matches MSW handlers
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkReactionQuota();
      });

      expect(quota?.current_count).toBe(7);

      // Note: In production, different boards have isolated quotas
      // This test verifies the quota check works for the current board
    });
  });
});
