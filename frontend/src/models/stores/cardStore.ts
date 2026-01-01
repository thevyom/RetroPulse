/**
 * Card Store
 * Zustand store for card state management
 */

import { create } from 'zustand';
import type { Card, CardChild } from '../types';

// ============================================================================
// State Interface
// ============================================================================

interface CardStoreState {
  // State
  cards: Map<string, Card>;
  isLoading: boolean;
  error: string | null;

  // Actions
  addCard: (card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
  setCards: (cards: Card[]) => void;
  setCardsWithChildren: (cards: Card[]) => void;
  incrementReactionCount: (cardId: string) => void;
  decrementReactionCount: (cardId: string) => void;
  moveCard: (cardId: string, columnId: string) => void;
  linkChild: (parentId: string, childId: string) => void;
  unlinkChild: (parentId: string, childId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCards: () => void;

  // Selectors
  getCard: (cardId: string) => Card | undefined;
  getCardsByColumn: (columnId: string) => Card[];
  getParentCards: () => Card[];
  getChildCards: (parentId: string) => CardChild[];
  getCardCount: () => number;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useCardStore = create<CardStoreState>((set, get) => ({
  // Initial State
  cards: new Map(),
  isLoading: false,
  error: null,

  // Actions
  addCard: (card) =>
    set((state) => {
      const newCards = new Map(state.cards);
      newCards.set(card.id, card);
      return { cards: newCards };
    }),

  updateCard: (cardId, updates) =>
    set((state) => {
      const card = state.cards.get(cardId);
      if (!card) return state;

      const newCards = new Map(state.cards);
      // Preserve children array when updating
      newCards.set(cardId, {
        ...card,
        ...updates,
        children: updates.children ?? card.children,
      });
      return { cards: newCards };
    }),

  removeCard: (cardId) =>
    set((state) => {
      const newCards = new Map(state.cards);
      newCards.delete(cardId);
      return { cards: newCards };
    }),

  setCards: (cards) =>
    set(() => {
      const newCards = new Map<string, Card>();
      cards.forEach((card) => {
        newCards.set(card.id, card);
      });
      return { cards: newCards, isLoading: false, error: null };
    }),

  setCardsWithChildren: (cards) =>
    set(() => {
      const newCards = new Map<string, Card>();

      // First pass: add all cards
      cards.forEach((card) => {
        newCards.set(card.id, card);
      });

      // Second pass: ensure children are properly nested
      // (API returns children embedded, but we want to track them as separate entries too)
      cards.forEach((card) => {
        if (card.children && card.children.length > 0) {
          card.children.forEach((child) => {
            // If child card exists as full card, update its parent reference
            const existingChild = newCards.get(child.id);
            if (existingChild) {
              newCards.set(child.id, {
                ...existingChild,
                parent_card_id: card.id,
              });
            }
          });
        }
      });

      return { cards: newCards, isLoading: false, error: null };
    }),

  incrementReactionCount: (cardId) =>
    set((state) => {
      const card = state.cards.get(cardId);
      if (!card) return state;

      const newCards = new Map(state.cards);
      newCards.set(cardId, {
        ...card,
        direct_reaction_count: card.direct_reaction_count + 1,
        aggregated_reaction_count: card.aggregated_reaction_count + 1,
      });

      // If card has a parent, update parent's aggregated count
      if (card.parent_card_id) {
        const parent = newCards.get(card.parent_card_id);
        if (parent) {
          newCards.set(card.parent_card_id, {
            ...parent,
            aggregated_reaction_count: parent.aggregated_reaction_count + 1,
          });
        }
      }

      return { cards: newCards };
    }),

  decrementReactionCount: (cardId) =>
    set((state) => {
      const card = state.cards.get(cardId);
      if (!card) return state;

      const newCards = new Map(state.cards);
      newCards.set(cardId, {
        ...card,
        direct_reaction_count: Math.max(0, card.direct_reaction_count - 1),
        aggregated_reaction_count: Math.max(0, card.aggregated_reaction_count - 1),
      });

      // If card has a parent, update parent's aggregated count
      if (card.parent_card_id) {
        const parent = newCards.get(card.parent_card_id);
        if (parent) {
          newCards.set(card.parent_card_id, {
            ...parent,
            aggregated_reaction_count: Math.max(0, parent.aggregated_reaction_count - 1),
          });
        }
      }

      return { cards: newCards };
    }),

  moveCard: (cardId, columnId) =>
    set((state) => {
      const card = state.cards.get(cardId);
      if (!card) return state;

      const newCards = new Map(state.cards);
      newCards.set(cardId, {
        ...card,
        column_id: columnId,
      });
      return { cards: newCards };
    }),

  linkChild: (parentId, childId) =>
    set((state) => {
      const parent = state.cards.get(parentId);
      const child = state.cards.get(childId);
      if (!parent || !child) return state;

      const newCards = new Map(state.cards);

      // Update child's parent_card_id
      newCards.set(childId, {
        ...child,
        parent_card_id: parentId,
      });

      // Create CardChild from child card
      const childEntry: CardChild = {
        id: child.id,
        content: child.content,
        is_anonymous: child.is_anonymous,
        created_by_alias: child.created_by_alias,
        created_at: child.created_at,
        direct_reaction_count: child.direct_reaction_count,
        aggregated_reaction_count: child.aggregated_reaction_count,
      };

      // Update parent: add child to children array and update aggregated count
      const existingChildren = parent.children ?? [];
      const newAggregatedCount =
        parent.aggregated_reaction_count + child.aggregated_reaction_count;

      newCards.set(parentId, {
        ...parent,
        children: [...existingChildren, childEntry],
        aggregated_reaction_count: newAggregatedCount,
      });

      return { cards: newCards };
    }),

  unlinkChild: (parentId, childId) =>
    set((state) => {
      const parent = state.cards.get(parentId);
      const child = state.cards.get(childId);
      if (!parent || !child) return state;

      const newCards = new Map(state.cards);

      // Update child: remove parent_card_id
      newCards.set(childId, {
        ...child,
        parent_card_id: null,
      });

      // Update parent: remove child from children array and subtract aggregated count
      const existingChildren = parent.children ?? [];
      const newChildren = existingChildren.filter((c) => c.id !== childId);
      const newAggregatedCount = Math.max(
        0,
        parent.aggregated_reaction_count - child.aggregated_reaction_count
      );

      newCards.set(parentId, {
        ...parent,
        children: newChildren,
        aggregated_reaction_count: newAggregatedCount,
      });

      return { cards: newCards };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearCards: () =>
    set({
      cards: new Map(),
      isLoading: false,
      error: null,
    }),

  // Selectors
  getCard: (cardId) => get().cards.get(cardId),

  getCardsByColumn: (columnId) => {
    const { cards } = get();
    return (
      Array.from(cards.values())
        .filter((card) => card.column_id === columnId && !card.parent_card_id)
        // ISO 8601 dates can be compared as strings for chronological order
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    );
  },

  getParentCards: () => {
    const { cards } = get();
    return Array.from(cards.values()).filter((card) => !card.parent_card_id);
  },

  getChildCards: (parentId) => {
    const { cards } = get();
    const parent = cards.get(parentId);
    return parent?.children ?? [];
  },

  getCardCount: () => get().cards.size,
}));

// ============================================================================
// Standalone Selectors (for use outside React components)
// ============================================================================

export const cardSelectors = {
  getCard: (cardId: string) => useCardStore.getState().cards.get(cardId),
  getAllCards: () => Array.from(useCardStore.getState().cards.values()),
  getCardsByColumn: (columnId: string) => useCardStore.getState().getCardsByColumn(columnId),
  isLoading: () => useCardStore.getState().isLoading,
  getError: () => useCardStore.getState().error,
};

// ============================================================================
// Derived Selectors with Aggregation
// ============================================================================

export const selectParentsWithAggregated = () => {
  const { cards } = useCardStore.getState();
  const parents = Array.from(cards.values()).filter((card) => !card.parent_card_id);

  return parents.map((parent) => {
    // Calculate aggregated reaction count including children
    let aggregatedCount = parent.direct_reaction_count;

    if (parent.children) {
      aggregatedCount += parent.children.reduce(
        (sum, child) => sum + child.direct_reaction_count,
        0
      );
    }

    return {
      ...parent,
      aggregated_reaction_count: aggregatedCount,
    };
  });
};
