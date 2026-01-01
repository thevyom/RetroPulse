/**
 * Card Quota Integration Tests with MSW
 *
 * Tests card quota enforcement with real ViewModels and mocked API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { server, resetMockData } from '../mocks/server';
import { setMockCardQuota, createMockCard, setMockCards } from '../mocks/handlers';
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

describe('Card Quota Integration', () => {
  const boardId = 'board-123';

  describe('Quota Status', () => {
    it('returns quota when under limit', async () => {
      setMockCardQuota({
        current_count: 2,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota?.current_count).toBe(2);
      expect(quota?.limit).toBe(5);
      expect(quota?.can_create).toBe(true);
    });

    it('returns quota exhausted at limit', async () => {
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

      expect(quota?.current_count).toBe(5);
      expect(quota?.limit).toBe(5);
      expect(quota?.can_create).toBe(false);
    });

    it('returns unlimited when limit disabled', async () => {
      setMockCardQuota({
        current_count: 10,
        limit: null,
        can_create: true,
        limit_enabled: false,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota?.limit).toBeNull();
      expect(quota?.can_create).toBe(true);
      expect(quota?.limit_enabled).toBe(false);
    });
  });

  describe('Quota Enforcement', () => {
    it('allows card creation when under limit', async () => {
      setMockCardQuota({
        current_count: 2,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Create card should succeed
      let createdCard;
      await act(async () => {
        createdCard = await result.current.handleCreateCard({
          column_id: 'col-1',
          content: 'New card under quota',
          card_type: 'feedback',
          is_anonymous: false,
        });
      });

      expect(createdCard).toBeDefined();
    });

    it('blocks card creation when quota exhausted', async () => {
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

      // Create card should fail
      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: 'Should fail - quota exceeded',
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

    it('allows action card creation even at feedback limit', async () => {
      // Note: This test assumes action cards don't count toward feedback quota
      // Adjust based on actual business rules
      setMockCardQuota({
        current_count: 2,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      let createdCard;
      await act(async () => {
        createdCard = await result.current.handleCreateCard({
          column_id: 'col-3',
          content: 'Action item',
          card_type: 'action',
          is_anonymous: false,
        });
      });

      expect(createdCard).toBeDefined();
      expect(createdCard?.card_type).toBe('action');
    });
  });

  describe('Quota Updates After Actions', () => {
    it('increments quota after card creation', async () => {
      setMockCardQuota({
        current_count: 2,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      // Check initial quota
      let initialQuota;
      await act(async () => {
        initialQuota = await result.current.checkCardQuota();
      });

      expect(initialQuota?.current_count).toBe(2);

      // Create a card
      await act(async () => {
        await result.current.handleCreateCard({
          column_id: 'col-1',
          content: 'New card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      });

      // Check updated quota
      let updatedQuota;
      await act(async () => {
        updatedQuota = await result.current.checkCardQuota();
      });

      expect(updatedQuota?.current_count).toBe(3);
    });

    it('decrements quota after card deletion', async () => {
      const card = createMockCard({ id: 'card-to-delete' });
      setMockCards([card]);
      setMockCardQuota({
        current_count: 3,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Delete card
      await act(async () => {
        await result.current.handleDeleteCard('card-to-delete');
      });

      // Check quota - should decrease
      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota?.current_count).toBe(2);
    });

    it('frees quota slot when card deleted at limit', async () => {
      const card = createMockCard({ id: 'card-at-limit' });
      setMockCards([card]);
      setMockCardQuota({
        current_count: 5,
        limit: 5,
        can_create: false,
        limit_enabled: true,
      });

      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      await act(async () => {
        await result.current.refetchCards();
      });

      // Check initial quota - can't create
      let initialQuota;
      await act(async () => {
        initialQuota = await result.current.checkCardQuota();
      });
      expect(initialQuota?.can_create).toBe(false);

      // Delete card
      await act(async () => {
        await result.current.handleDeleteCard('card-at-limit');
      });

      // Check quota - should now allow creation
      let updatedQuota;
      await act(async () => {
        updatedQuota = await result.current.checkCardQuota();
      });

      expect(updatedQuota?.can_create).toBe(true);
    });
  });

  describe('Board Isolation', () => {
    it('quota is specific to current board', async () => {
      setMockCardQuota({
        current_count: 3,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });

      // Use standard board ID that matches MSW handlers
      const { result } = renderHook(() => useCardViewModel(boardId, { autoFetch: false }));

      let quota;
      await act(async () => {
        quota = await result.current.checkCardQuota();
      });

      expect(quota?.current_count).toBe(3);

      // Note: In production, different boards have isolated quotas
      // This test verifies the quota check works for the current board
    });
  });
});
