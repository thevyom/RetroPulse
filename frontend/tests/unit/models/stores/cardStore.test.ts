/**
 * Card Store Tests
 * Tests for Zustand card state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCardStore,
  cardSelectors,
  selectParentsWithAggregated,
} from '@/models/stores/cardStore';
import type { Card } from '@/models/types';

describe('cardStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useCardStore.setState({
      cards: new Map(),
      isLoading: false,
      error: null,
    });
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockCard: Card = {
    id: 'card-1',
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Great team collaboration!',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'user-hash',
    created_by_alias: 'Alice',
    created_at: '2025-12-29T00:00:00Z',
    direct_reaction_count: 3,
    aggregated_reaction_count: 5,
    parent_card_id: null,
    linked_feedback_ids: [],
    children: [],
  };

  const mockCardWithChildren: Card = {
    ...mockCard,
    id: 'parent-1',
    children: [
      {
        id: 'child-1',
        content: 'Child card content',
        is_anonymous: false,
        created_by_alias: 'Bob',
        created_at: '2025-12-29T01:00:00Z',
        direct_reaction_count: 2,
        aggregated_reaction_count: 2,
      },
      {
        id: 'child-2',
        content: 'Another child',
        is_anonymous: false,
        created_by_alias: 'Charlie',
        created_at: '2025-12-29T02:00:00Z',
        direct_reaction_count: 1,
        aggregated_reaction_count: 1,
      },
    ],
  };

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have empty cards map initially', () => {
      expect(useCardStore.getState().cards.size).toBe(0);
    });

    it('should have isLoading false initially', () => {
      expect(useCardStore.getState().isLoading).toBe(false);
    });

    it('should have null error initially', () => {
      expect(useCardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // addCard Tests
  // ============================================================================

  describe('addCard', () => {
    it('should add card to store', () => {
      useCardStore.getState().addCard(mockCard);

      expect(useCardStore.getState().cards.get('card-1')).toEqual(mockCard);
    });

    it('should add multiple cards', () => {
      const card2 = { ...mockCard, id: 'card-2' };

      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard(card2);

      expect(useCardStore.getState().cards.size).toBe(2);
    });
  });

  // ============================================================================
  // updateCard Tests
  // ============================================================================

  describe('updateCard', () => {
    it('should update card properties', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().updateCard('card-1', { content: 'Updated content' });

      expect(useCardStore.getState().cards.get('card-1')?.content).toBe('Updated content');
    });

    it('should preserve children array when updating', () => {
      useCardStore.getState().addCard(mockCardWithChildren);

      useCardStore.getState().updateCard('parent-1', { content: 'Updated' });

      const card = useCardStore.getState().cards.get('parent-1');
      expect(card?.children).toHaveLength(2);
    });

    it('should not modify other cards', () => {
      const card2 = { ...mockCard, id: 'card-2', content: 'Card 2 content' };
      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard(card2);

      useCardStore.getState().updateCard('card-1', { content: 'Updated' });

      expect(useCardStore.getState().cards.get('card-2')?.content).toBe('Card 2 content');
    });

    it('should handle non-existent card gracefully', () => {
      useCardStore.getState().updateCard('non-existent', { content: 'Updated' });

      expect(useCardStore.getState().cards.size).toBe(0);
    });
  });

  // ============================================================================
  // removeCard Tests
  // ============================================================================

  describe('removeCard', () => {
    it('should remove card from store', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().removeCard('card-1');

      expect(useCardStore.getState().cards.get('card-1')).toBeUndefined();
    });

    it('should handle non-existent card gracefully', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().removeCard('non-existent');

      expect(useCardStore.getState().cards.size).toBe(1);
    });
  });

  // ============================================================================
  // setCards Tests
  // ============================================================================

  describe('setCards', () => {
    it('should set multiple cards at once', () => {
      const cards = [mockCard, { ...mockCard, id: 'card-2' }, { ...mockCard, id: 'card-3' }];

      useCardStore.getState().setCards(cards);

      expect(useCardStore.getState().cards.size).toBe(3);
    });

    it('should clear loading and error', () => {
      useCardStore.setState({ isLoading: true, error: 'Previous error' });

      useCardStore.getState().setCards([mockCard]);

      expect(useCardStore.getState().isLoading).toBe(false);
      expect(useCardStore.getState().error).toBeNull();
    });

    it('should replace existing cards', () => {
      useCardStore.getState().addCard({ ...mockCard, id: 'old-card' });

      useCardStore.getState().setCards([mockCard]);

      expect(useCardStore.getState().cards.get('old-card')).toBeUndefined();
      expect(useCardStore.getState().cards.size).toBe(1);
    });
  });

  // ============================================================================
  // setCardsWithChildren Tests
  // ============================================================================

  describe('setCardsWithChildren', () => {
    it('should populate embedded children', () => {
      useCardStore.getState().setCardsWithChildren([mockCardWithChildren]);

      const card = useCardStore.getState().cards.get('parent-1');
      expect(card?.children).toHaveLength(2);
    });

    it('should handle cards without children', () => {
      useCardStore.getState().setCardsWithChildren([mockCard]);

      const card = useCardStore.getState().cards.get('card-1');
      expect(card?.children).toEqual([]);
    });

    it('should update parent reference when child exists as full card', () => {
      // Create a child card that also exists as a full card in the list
      const childAsFullCard = {
        id: 'child-1',
        board_id: 'board-1',
        column_id: 'col-1',
        content: 'Child as full card',
        card_type: 'feedback' as const,
        is_anonymous: false,
        created_by_hash: 'hash-child',
        created_by_alias: 'ChildUser',
        created_at: '2025-12-28T11:00:00Z',
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null, // Initially null
        linked_feedback_ids: [],
        children: [],
      };

      const parentWithChildRef = {
        ...mockCardWithChildren,
        children: [
          {
            id: 'child-1',
            content: 'Child content',
            is_anonymous: false,
            created_by_alias: 'ChildUser',
            created_at: '2025-12-28T11:00:00Z',
            direct_reaction_count: 0,
            aggregated_reaction_count: 0,
          },
        ],
      };

      // Pass both parent and child as full cards
      useCardStore.getState().setCardsWithChildren([parentWithChildRef, childAsFullCard]);

      // The child card should have its parent_card_id updated
      const childCard = useCardStore.getState().cards.get('child-1');
      expect(childCard?.parent_card_id).toBe('parent-1');
    });
  });

  // ============================================================================
  // incrementReactionCount Tests
  // ============================================================================

  describe('incrementReactionCount', () => {
    it('should increment direct reaction count', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().incrementReactionCount('card-1');

      expect(useCardStore.getState().cards.get('card-1')?.direct_reaction_count).toBe(4);
    });

    it('should increment aggregated reaction count', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().incrementReactionCount('card-1');

      expect(useCardStore.getState().cards.get('card-1')?.aggregated_reaction_count).toBe(6);
    });

    it('should increment parent aggregated count for child card', () => {
      const parentCard = { ...mockCard, id: 'parent-1' };
      const childCard = {
        ...mockCard,
        id: 'child-1',
        parent_card_id: 'parent-1',
      };

      useCardStore.getState().addCard(parentCard);
      useCardStore.getState().addCard(childCard);

      useCardStore.getState().incrementReactionCount('child-1');

      expect(useCardStore.getState().cards.get('parent-1')?.aggregated_reaction_count).toBe(6);
    });
  });

  // ============================================================================
  // decrementReactionCount Tests
  // ============================================================================

  describe('decrementReactionCount', () => {
    it('should decrement direct reaction count', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().decrementReactionCount('card-1');

      expect(useCardStore.getState().cards.get('card-1')?.direct_reaction_count).toBe(2);
    });

    it('should not go below zero', () => {
      useCardStore.getState().addCard({
        ...mockCard,
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
      });

      useCardStore.getState().decrementReactionCount('card-1');

      expect(useCardStore.getState().cards.get('card-1')?.direct_reaction_count).toBe(0);
    });

    it('should decrement parent aggregated count for child card', () => {
      const parentCard = { ...mockCard, id: 'parent-1' };
      const childCard = {
        ...mockCard,
        id: 'child-1',
        parent_card_id: 'parent-1',
      };

      useCardStore.getState().addCard(parentCard);
      useCardStore.getState().addCard(childCard);

      useCardStore.getState().decrementReactionCount('child-1');

      expect(useCardStore.getState().cards.get('parent-1')?.aggregated_reaction_count).toBe(4);
    });
  });

  // ============================================================================
  // moveCard Tests
  // ============================================================================

  describe('moveCard', () => {
    it('should update card column_id', () => {
      useCardStore.getState().addCard(mockCard);

      useCardStore.getState().moveCard('card-1', 'col-2');

      expect(useCardStore.getState().cards.get('card-1')?.column_id).toBe('col-2');
    });

    it('should handle non-existent card gracefully', () => {
      useCardStore.getState().moveCard('non-existent', 'col-2');

      expect(useCardStore.getState().cards.size).toBe(0);
    });
  });

  // ============================================================================
  // Selector Tests
  // ============================================================================

  describe('getCard', () => {
    it('should return card by ID', () => {
      useCardStore.getState().addCard(mockCard);

      const card = useCardStore.getState().getCard('card-1');

      expect(card).toEqual(mockCard);
    });

    it('should return undefined for non-existent card', () => {
      const card = useCardStore.getState().getCard('non-existent');

      expect(card).toBeUndefined();
    });
  });

  describe('getCardsByColumn', () => {
    it('should return cards filtered by column', () => {
      const card2 = { ...mockCard, id: 'card-2', column_id: 'col-2' };

      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard(card2);

      const cards = useCardStore.getState().getCardsByColumn('col-1');

      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe('card-1');
    });

    it('should exclude child cards (cards with parent_card_id)', () => {
      const childCard = { ...mockCard, id: 'child-1', parent_card_id: 'card-1' };

      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard(childCard);

      const cards = useCardStore.getState().getCardsByColumn('col-1');

      expect(cards).toHaveLength(1);
    });

    it('should sort cards by created_at', () => {
      const olderCard = { ...mockCard, id: 'old', created_at: '2025-12-28T00:00:00Z' };
      const newerCard = { ...mockCard, id: 'new', created_at: '2025-12-30T00:00:00Z' };

      useCardStore.getState().addCard(newerCard);
      useCardStore.getState().addCard(olderCard);

      const cards = useCardStore.getState().getCardsByColumn('col-1');

      expect(cards[0].id).toBe('old');
      expect(cards[1].id).toBe('new');
    });
  });

  describe('getParentCards', () => {
    it('should return only cards without parent', () => {
      const childCard = { ...mockCard, id: 'child-1', parent_card_id: 'card-1' };

      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard(childCard);

      const parents = useCardStore.getState().getParentCards();

      expect(parents).toHaveLength(1);
      expect(parents[0].id).toBe('card-1');
    });
  });

  describe('getChildCards', () => {
    it('should return children for parent card', () => {
      useCardStore.getState().addCard(mockCardWithChildren);

      const children = useCardStore.getState().getChildCards('parent-1');

      expect(children).toHaveLength(2);
    });

    it('should return empty array for card without children', () => {
      useCardStore.getState().addCard(mockCard);

      const children = useCardStore.getState().getChildCards('card-1');

      expect(children).toEqual([]);
    });
  });

  describe('getCardCount', () => {
    it('should return total card count', () => {
      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard({ ...mockCard, id: 'card-2' });

      expect(useCardStore.getState().getCardCount()).toBe(2);
    });
  });

  // ============================================================================
  // Standalone Selectors Tests
  // ============================================================================

  describe('cardSelectors', () => {
    it('getCard should return card by ID', () => {
      useCardStore.getState().addCard(mockCard);

      expect(cardSelectors.getCard('card-1')).toEqual(mockCard);
    });

    it('getAllCards should return all cards as array', () => {
      useCardStore.getState().addCard(mockCard);
      useCardStore.getState().addCard({ ...mockCard, id: 'card-2' });

      expect(cardSelectors.getAllCards()).toHaveLength(2);
    });

    it('getCardsByColumn should filter by column', () => {
      useCardStore.getState().addCard(mockCard);

      expect(cardSelectors.getCardsByColumn('col-1')).toHaveLength(1);
      expect(cardSelectors.getCardsByColumn('col-2')).toHaveLength(0);
    });

    it('isLoading should return loading state', () => {
      expect(cardSelectors.isLoading()).toBe(false);

      useCardStore.setState({ isLoading: true });

      expect(cardSelectors.isLoading()).toBe(true);
    });

    it('getError should return error state', () => {
      expect(cardSelectors.getError()).toBeNull();

      useCardStore.setState({ error: 'Something went wrong' });

      expect(cardSelectors.getError()).toBe('Something went wrong');
    });
  });

  describe('selectParentsWithAggregated', () => {
    it('should calculate aggregated reaction count including children', () => {
      useCardStore.getState().addCard({
        ...mockCard,
        id: 'parent-1',
        direct_reaction_count: 3,
        children: [
          {
            id: 'child-1',
            content: 'Child 1',
            is_anonymous: false,
            created_by_alias: 'Bob',
            created_at: '2025-12-29T00:00:00Z',
            direct_reaction_count: 2,
            aggregated_reaction_count: 2,
          },
        ],
      });

      const parents = selectParentsWithAggregated();

      expect(parents[0].aggregated_reaction_count).toBe(5); // 3 + 2
    });
  });

  // ============================================================================
  // setLoading Tests
  // ============================================================================

  describe('setLoading', () => {
    it('should set loading to true', () => {
      useCardStore.getState().setLoading(true);

      expect(useCardStore.getState().isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      useCardStore.setState({ isLoading: true });

      useCardStore.getState().setLoading(false);

      expect(useCardStore.getState().isLoading).toBe(false);
    });
  });

  // ============================================================================
  // setError Tests
  // ============================================================================

  describe('setError', () => {
    it('should set error message', () => {
      useCardStore.getState().setError('Failed to fetch cards');

      expect(useCardStore.getState().error).toBe('Failed to fetch cards');
    });

    it('should clear loading when setting error', () => {
      useCardStore.setState({ isLoading: true });

      useCardStore.getState().setError('Network error');

      expect(useCardStore.getState().isLoading).toBe(false);
    });

    it('should clear error with null', () => {
      useCardStore.setState({ error: 'Previous error' });

      useCardStore.getState().setError(null);

      expect(useCardStore.getState().error).toBeNull();
    });
  });

  // ============================================================================
  // clearCards Tests
  // ============================================================================

  describe('clearCards', () => {
    it('should reset all state to initial values', () => {
      useCardStore.getState().addCard(mockCard);
      useCardStore.setState({ isLoading: true, error: 'Some error' });

      useCardStore.getState().clearCards();

      expect(useCardStore.getState().cards.size).toBe(0);
      expect(useCardStore.getState().isLoading).toBe(false);
      expect(useCardStore.getState().error).toBeNull();
    });
  });
});
