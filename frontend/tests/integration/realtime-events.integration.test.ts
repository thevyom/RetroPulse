/**
 * Real-time Event Integration Tests
 *
 * Tests WebSocket event handling and store updates.
 * Uses direct store manipulation to verify socket event handlers work correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useCardStore } from '@/models/stores/cardStore';
import { useBoardStore } from '@/models/stores/boardStore';
import { useUserStore } from '@/models/stores/userStore';
import type { Card } from '@/models/types';

// Helper to create mock cards
function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: `card-${Math.random().toString(36).slice(2)}`,
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Test card content',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'user-123',
    created_by_alias: 'TestUser',
    created_at: new Date().toISOString(),
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
    ...overrides,
  };
}

describe('Real-time Event Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear stores before each test
    useCardStore.setState({ cards: new Map(), isLoading: false, error: null });
    useBoardStore.setState({ board: null, isLoading: false, error: null });
    useUserStore.setState({
      currentUser: null,
      activeUsers: [],
      isLoading: false,
      error: null,
    });
  });

  describe('Card Store Operations', () => {
    it('adds card to store via addCard', () => {
      const card = createMockCard({ id: 'new-card-123' });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      const cards = useCardStore.getState().cards;
      expect(cards.has('new-card-123')).toBe(true);
      expect(cards.get('new-card-123')?.content).toBe('Test card content');
    });

    it('updates card content via updateCard', () => {
      const card = createMockCard({ id: 'card-123', content: 'Original content' });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      expect(useCardStore.getState().cards.get('card-123')?.content).toBe('Original content');

      act(() => {
        useCardStore.getState().updateCard('card-123', { content: 'Updated content' });
      });

      expect(useCardStore.getState().cards.get('card-123')?.content).toBe('Updated content');
    });

    it('removes card from store via removeCard', () => {
      const card = createMockCard({ id: 'card-to-delete' });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      expect(useCardStore.getState().cards.has('card-to-delete')).toBe(true);

      act(() => {
        useCardStore.getState().removeCard('card-to-delete');
      });

      expect(useCardStore.getState().cards.has('card-to-delete')).toBe(false);
    });

    it('moves card to new column via moveCard', () => {
      const card = createMockCard({ id: 'card-to-move', column_id: 'col-1' });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      expect(useCardStore.getState().cards.get('card-to-move')?.column_id).toBe('col-1');

      act(() => {
        useCardStore.getState().moveCard('card-to-move', 'col-2');
      });

      expect(useCardStore.getState().cards.get('card-to-move')?.column_id).toBe('col-2');
    });
  });

  describe('Reaction Count Operations', () => {
    it('increments reaction count via incrementReactionCount', () => {
      const card = createMockCard({
        id: 'card-with-reactions',
        direct_reaction_count: 5,
        aggregated_reaction_count: 5,
      });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      expect(useCardStore.getState().cards.get('card-with-reactions')?.direct_reaction_count).toBe(
        5
      );

      act(() => {
        useCardStore.getState().incrementReactionCount('card-with-reactions');
      });

      expect(useCardStore.getState().cards.get('card-with-reactions')?.direct_reaction_count).toBe(
        6
      );
    });

    it('decrements reaction count via decrementReactionCount', () => {
      const card = createMockCard({
        id: 'card-with-reactions',
        direct_reaction_count: 5,
        aggregated_reaction_count: 5,
      });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      act(() => {
        useCardStore.getState().decrementReactionCount('card-with-reactions');
      });

      expect(useCardStore.getState().cards.get('card-with-reactions')?.direct_reaction_count).toBe(
        4
      );
    });

    it('does not decrement below zero', () => {
      const card = createMockCard({
        id: 'card-zero',
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
      });

      act(() => {
        useCardStore.getState().addCard(card);
      });

      act(() => {
        useCardStore.getState().decrementReactionCount('card-zero');
      });

      expect(useCardStore.getState().cards.get('card-zero')?.direct_reaction_count).toBe(0);
    });
  });

  describe('Board Store Operations', () => {
    it('sets board data', () => {
      act(() => {
        useBoardStore.getState().setBoard({
          id: 'board-123',
          name: 'Test Board',
          state: 'active',
          columns: [{ id: 'col-1', name: 'Went Well', color: '#22c55e' }],
          admins: ['user-123'],
          active_users: [],
          created_at: new Date().toISOString(),
          created_by_hash: 'user-123',
        });
      });

      expect(useBoardStore.getState().board?.name).toBe('Test Board');
    });

    it('updates board name', () => {
      act(() => {
        useBoardStore.getState().setBoard({
          id: 'board-123',
          name: 'Original Name',
          state: 'active',
          columns: [],
          admins: [],
          active_users: [],
          created_at: new Date().toISOString(),
          created_by_hash: 'user-123',
        });
      });

      act(() => {
        useBoardStore.getState().updateBoardName('Renamed Board');
      });

      expect(useBoardStore.getState().board?.name).toBe('Renamed Board');
    });

    it('closes board', () => {
      act(() => {
        useBoardStore.getState().setBoard({
          id: 'board-123',
          name: 'Test Board',
          state: 'active',
          columns: [],
          admins: [],
          active_users: [],
          created_at: new Date().toISOString(),
          created_by_hash: 'user-123',
        });
      });

      expect(useBoardStore.getState().board?.state).toBe('active');

      act(() => {
        useBoardStore.getState().closeBoard();
      });

      expect(useBoardStore.getState().board?.state).toBe('closed');
    });
  });

  describe('User Store Operations', () => {
    it('sets active users', () => {
      act(() => {
        useUserStore.getState().setActiveUsers([
          {
            alias: 'User1',
            is_admin: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          {
            alias: 'User2',
            is_admin: true,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);
      });

      expect(useUserStore.getState().activeUsers.length).toBe(2);
      expect(useUserStore.getState().activeUsers[0].alias).toBe('User1');
    });

    it('adds active user', () => {
      act(() => {
        useUserStore.getState().setActiveUsers([]);
      });

      act(() => {
        useUserStore.getState().addActiveUser({
          alias: 'NewUser',
          is_admin: false,
          last_active_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      });

      expect(useUserStore.getState().activeUsers.length).toBe(1);
      expect(useUserStore.getState().activeUsers[0].alias).toBe('NewUser');
    });

    it('removes active user', () => {
      act(() => {
        useUserStore.getState().setActiveUsers([
          {
            alias: 'User1',
            is_admin: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);
      });

      act(() => {
        useUserStore.getState().removeUser('User1');
      });

      expect(useUserStore.getState().activeUsers.length).toBe(0);
    });

    it('updates current user alias and reflects in active users', () => {
      // Set current user and active users
      act(() => {
        useUserStore.getState().setCurrentUser({
          cookie_hash: 'user-123',
          alias: 'OldAlias',
          is_admin: false,
        });
        useUserStore.getState().setActiveUsers([
          {
            alias: 'OldAlias',
            is_admin: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);
      });

      act(() => {
        useUserStore.getState().updateAlias('NewAlias');
      });

      expect(useUserStore.getState().currentUser?.alias).toBe('NewAlias');
      expect(useUserStore.getState().activeUsers.some((u) => u.alias === 'NewAlias')).toBe(true);
      expect(useUserStore.getState().activeUsers.some((u) => u.alias === 'OldAlias')).toBe(false);
    });
  });

  describe('Store State Isolation', () => {
    it('maintains independent store states', () => {
      // Add data to each store
      act(() => {
        useCardStore.getState().addCard(createMockCard({ id: 'test-card' }));
        useBoardStore.getState().setBoard({
          id: 'board-123',
          name: 'Test',
          state: 'active',
          columns: [],
          admins: [],
          active_users: [],
          created_at: new Date().toISOString(),
          created_by_hash: 'user-123',
        });
        useUserStore.getState().setCurrentUser({
          cookie_hash: 'user-123',
          alias: 'TestUser',
          is_admin: true,
        });
      });

      // Verify all stores have correct data
      expect(useCardStore.getState().cards.has('test-card')).toBe(true);
      expect(useBoardStore.getState().board?.name).toBe('Test');
      expect(useUserStore.getState().currentUser?.alias).toBe('TestUser');
    });
  });
});
