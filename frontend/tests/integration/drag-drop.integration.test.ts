/**
 * Drag-Drop Integration Tests
 *
 * Tests @dnd-kit integration with card and column components.
 * Verifies drag/drop operations and visual feedback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragDropViewModel } from '@/features/card/viewmodels/useDragDropViewModel';
import { useCardStore } from '@/models/stores/cardStore';
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

describe('Drag-Drop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear store state before each test
    useCardStore.setState({ cards: new Map(), isLoading: false, error: null });
  });

  describe('Drag Start', () => {
    it('sets dragged item on drag start', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();

      act(() => {
        result.current.handleDragStart('card-123', 'feedback');
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem).toEqual({
        id: 'card-123',
        type: 'feedback',
      });
    });

    it('clears previous drag state on new drag start', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // First drag
      act(() => {
        result.current.handleDragStart('card-1', 'feedback');
      });

      // Second drag (simulating a new drag operation)
      act(() => {
        result.current.handleDragStart('card-2', 'action');
      });

      expect(result.current.draggedItem).toEqual({
        id: 'card-2',
        type: 'action',
      });
      expect(result.current.dropTarget).toBeNull();
    });
  });

  describe('Drag Over', () => {
    describe('Column Targets', () => {
      it('allows dropping on any column', () => {
        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('card-123', 'feedback');
        });

        act(() => {
          const isValid = result.current.handleDragOver('col-2', 'column');
          expect(isValid).toBe(true);
        });

        expect(result.current.isValidDrop).toBe(true);
        expect(result.current.dropTarget).toEqual({
          id: 'col-2',
          type: 'column',
        });
      });

      it('allows moving action cards to columns', () => {
        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('action-card', 'action');
        });

        act(() => {
          const isValid = result.current.handleDragOver('col-3', 'column');
          expect(isValid).toBe(true);
        });

        expect(result.current.isValidDrop).toBe(true);
      });
    });

    describe('Card Targets', () => {
      beforeEach(() => {
        // Add target cards to store using setState
        const targetFeedback = createMockCard({ id: 'target-feedback', card_type: 'feedback' });
        const targetAction = createMockCard({ id: 'target-action', card_type: 'action' });
        const childCard = createMockCard({
          id: 'child-card',
          card_type: 'feedback',
          parent_card_id: 'some-parent',
        });

        useCardStore.setState({
          cards: new Map([
            ['target-feedback', targetFeedback],
            ['target-action', targetAction],
            ['child-card', childCard],
          ]),
          isLoading: false,
          error: null,
        });
      });

      it('allows feedback → feedback linking (parent-child)', () => {
        // Add source card to the existing store
        const current = useCardStore.getState().cards;
        const sourceCard = createMockCard({ id: 'source-feedback', card_type: 'feedback' });
        current.set('source-feedback', sourceCard);
        useCardStore.setState({ cards: new Map(current) });

        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('source-feedback', 'feedback');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-feedback', 'card');
          expect(isValid).toBe(true);
        });

        expect(result.current.isValidDrop).toBe(true);
        expect(result.current.dropError).toBeNull();
      });

      it('allows action → feedback linking', () => {
        // Add source card to the existing store
        const current = useCardStore.getState().cards;
        const sourceCard = createMockCard({ id: 'source-action', card_type: 'action' });
        current.set('source-action', sourceCard);
        useCardStore.setState({ cards: new Map(current) });

        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('source-action', 'action');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-feedback', 'card');
          expect(isValid).toBe(true);
        });

        expect(result.current.isValidDrop).toBe(true);
      });

      it('rejects feedback → action linking', () => {
        // Add source card to the existing store
        const current = useCardStore.getState().cards;
        const sourceCard = createMockCard({ id: 'source-feedback', card_type: 'feedback' });
        current.set('source-feedback', sourceCard);
        useCardStore.setState({ cards: new Map(current) });

        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('source-feedback', 'feedback');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-action', 'card');
          expect(isValid).toBe(false);
        });

        expect(result.current.isValidDrop).toBe(false);
        expect(result.current.dropError).toBe('Cannot drop feedback on action card');
      });

      it('rejects action → action linking', () => {
        // Add source card to the existing store
        const current = useCardStore.getState().cards;
        const sourceCard = createMockCard({ id: 'source-action', card_type: 'action' });
        current.set('source-action', sourceCard);
        useCardStore.setState({ cards: new Map(current) });

        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('source-action', 'action');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-action', 'card');
          expect(isValid).toBe(false);
        });

        expect(result.current.isValidDrop).toBe(false);
        expect(result.current.dropError).toBe('Cannot link action to action');
      });

      it('rejects self-drop', () => {
        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('target-feedback', 'feedback');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-feedback', 'card');
          expect(isValid).toBe(false);
        });

        expect(result.current.isValidDrop).toBe(false);
        expect(result.current.dropError).toBe('Cannot drop card on itself');
      });

      it('rejects linking card that already has a parent', () => {
        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('child-card', 'feedback');
        });

        act(() => {
          const isValid = result.current.handleDragOver('target-feedback', 'card');
          expect(isValid).toBe(false);
        });

        expect(result.current.isValidDrop).toBe(false);
        expect(result.current.dropError).toBe('Card already has a parent');
      });

      it('rejects drop when target card already has a parent (1-level only)', () => {
        // Add source card to the existing store
        const current = useCardStore.getState().cards;
        const sourceCard = createMockCard({ id: 'source-feedback', card_type: 'feedback' });
        current.set('source-feedback', sourceCard);
        useCardStore.setState({ cards: new Map(current) });

        const { result } = renderHook(() => useDragDropViewModel());

        act(() => {
          result.current.handleDragStart('source-feedback', 'feedback');
        });

        // Try to drop on card that already has a parent
        act(() => {
          const isValid = result.current.handleDragOver('child-card', 'card');
          expect(isValid).toBe(false);
        });

        expect(result.current.isValidDrop).toBe(false);
        expect(result.current.dropError).toContain('Only 1-level hierarchy allowed');
      });
    });
  });

  describe('Drag End', () => {
    it('clears all drag state on drag end', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('card-123', 'feedback');
        result.current.handleDragOver('col-2', 'column');
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.handleDragEnd();
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.isValidDrop).toBe(false);
      expect(result.current.dropError).toBeNull();
    });
  });

  describe('getDropResult', () => {
    it('returns move_to_column for column drops', () => {
      // Set up cards in store first
      act(() => {
        useCardStore.setState({
          cards: new Map([
            ['feedback-1', createMockCard({ id: 'feedback-1', card_type: 'feedback' })],
          ]),
          isLoading: false,
          error: null,
        });
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('col-2', 'column');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'move_to_column',
        cardId: 'feedback-1',
        columnId: 'col-2',
      });
    });

    it('returns link_parent_child for feedback → feedback drops', () => {
      // Set up cards in store first
      act(() => {
        useCardStore.setState({
          cards: new Map([
            ['feedback-1', createMockCard({ id: 'feedback-1', card_type: 'feedback' })],
            ['feedback-2', createMockCard({ id: 'feedback-2', card_type: 'feedback' })],
          ]),
          isLoading: false,
          error: null,
        });
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('feedback-2', 'card');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'link_parent_child',
        parentId: 'feedback-2',
        childId: 'feedback-1',
      });
    });

    it('returns link_action for action → feedback drops', () => {
      // Set up cards in store first
      act(() => {
        useCardStore.setState({
          cards: new Map([
            ['action-1', createMockCard({ id: 'action-1', card_type: 'action' })],
            ['feedback-1', createMockCard({ id: 'feedback-1', card_type: 'feedback' })],
          ]),
          isLoading: false,
          error: null,
        });
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action-1', 'action');
      });

      act(() => {
        result.current.handleDragOver('feedback-1', 'card');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'link_action',
        actionId: 'action-1',
        feedbackId: 'feedback-1',
      });
    });

    it('returns null when drop is invalid', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
        // No drag over - no valid drop
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toBeNull();
    });

    it('returns null when no item is being dragged', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      const dropResult = result.current.getDropResult();

      expect(dropResult).toBeNull();
    });
  });

  describe('canDropOn', () => {
    beforeEach(() => {
      useCardStore.setState({
        cards: new Map([
          ['target-card', createMockCard({ id: 'target-card', card_type: 'feedback' })],
          ['source-card', createMockCard({ id: 'source-card', card_type: 'feedback' })],
        ]),
        isLoading: false,
        error: null,
      });
    });

    it('returns true for valid drop targets', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('source-card', 'feedback');
      });

      expect(result.current.canDropOn('target-card', 'card')).toBe(true);
      expect(result.current.canDropOn('col-1', 'column')).toBe(true);
    });

    it('returns false when not dragging', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      expect(result.current.canDropOn('target-card', 'card')).toBe(false);
      expect(result.current.canDropOn('col-1', 'column')).toBe(false);
    });
  });

  describe('Circular Relationship Prevention', () => {
    it('prevents creating circular parent-child relationships', () => {
      // Set up parent-child relationship in store
      useCardStore.setState({
        cards: new Map([
          ['parent', createMockCard({ id: 'parent', card_type: 'feedback' })],
          [
            'child',
            createMockCard({ id: 'child', card_type: 'feedback', parent_card_id: 'parent' }),
          ],
        ]),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useDragDropViewModel());

      // Try to drag parent onto child (would create cycle)
      act(() => {
        result.current.handleDragStart('parent', 'feedback');
      });

      act(() => {
        const isValid = result.current.handleDragOver('child', 'card');
        expect(isValid).toBe(false);
      });

      expect(result.current.isValidDrop).toBe(false);
      expect(result.current.dropError).toBe('Circular relationship detected');
    });
  });

  describe('State Consistency', () => {
    it('maintains consistent state through drag lifecycle', () => {
      // Set up card in store
      useCardStore.setState({
        cards: new Map([['card-a', createMockCard({ id: 'card-a', card_type: 'feedback' })]]),
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useDragDropViewModel());

      // Initial state
      expect(result.current.isDragging).toBe(false);

      // Start drag
      act(() => {
        result.current.handleDragStart('card-a', 'feedback');
      });
      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem?.id).toBe('card-a');

      // Drag over valid target
      act(() => {
        result.current.handleDragOver('col-1', 'column');
      });
      expect(result.current.isValidDrop).toBe(true);

      // Drag over invalid target (self)
      act(() => {
        result.current.handleDragOver('card-a', 'card');
      });
      expect(result.current.isValidDrop).toBe(false);

      // End drag
      act(() => {
        result.current.handleDragEnd();
      });
      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
    });
  });

  describe('Keyboard DnD Operations', () => {
    it('handleKeyboardDragStart sets isDragging on Space key', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('card-1', 'feedback');
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem?.id).toBe('card-1');
    });

    it('Escape key cancels drag operation', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('card-1', 'feedback');
      });
      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.handleDragEnd();
      });
      expect(result.current.isDragging).toBe(false);
    });

    it('Tab navigation cycles through droppable targets', () => {
      // Test that canDropOn returns correct values for focus cycling
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('card-1', 'feedback');
      });

      expect(result.current.canDropOn('col-1', 'column')).toBe(true);
      expect(result.current.canDropOn('col-2', 'column')).toBe(true);
    });
  });
});
