/**
 * useDragDropViewModel Tests
 * Comprehensive unit tests for the Drag-Drop ViewModel hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDragDropViewModel } from '../../../../../src/features/card/viewmodels/useDragDropViewModel';
import { useCardStore } from '../../../../../src/models/stores/cardStore';
import type { Card } from '../../../../../src/models/types';

// ============================================================================
// Test Data
// ============================================================================

const mockCards: Card[] = [
  {
    id: 'feedback-1',
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Feedback card 1',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'hash-user-1',
    created_by_alias: 'User1',
    created_at: '2025-12-28T10:00:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
  {
    id: 'feedback-2',
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Feedback card 2',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'hash-user-2',
    created_by_alias: 'User2',
    created_at: '2025-12-28T10:05:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
  {
    id: 'feedback-child',
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Child feedback card',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'hash-user-1',
    created_by_alias: 'User1',
    created_at: '2025-12-28T10:10:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: 'feedback-1',
    linked_feedback_ids: [],
  },
  {
    id: 'action-1',
    board_id: 'board-123',
    column_id: 'col-3',
    content: 'Action card 1',
    card_type: 'action',
    is_anonymous: false,
    created_by_hash: 'hash-user-1',
    created_by_alias: 'User1',
    created_at: '2025-12-28T10:15:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
  {
    id: 'action-2',
    board_id: 'board-123',
    column_id: 'col-3',
    content: 'Action card 2',
    card_type: 'action',
    is_anonymous: false,
    created_by_hash: 'hash-user-2',
    created_by_alias: 'User2',
    created_at: '2025-12-28T10:20:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('useDragDropViewModel', () => {
  beforeEach(() => {
    // Set up card store with mock data
    const cardsMap = new Map<string, Card>();
    mockCards.forEach((card) => {
      cardsMap.set(card.id, card);
    });

    useCardStore.setState({
      cards: cardsMap,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedItem).toBeNull();
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.isValidDrop).toBe(false);
      expect(result.current.dropError).toBeNull();
    });
  });

  // ============================================================================
  // Drag Start Tests
  // ============================================================================

  describe('handleDragStart', () => {
    it('should set dragged item on drag start', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.draggedItem).toEqual({
        id: 'feedback-1',
        type: 'feedback',
      });
    });

    it('should clear previous state on new drag', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // Start first drag
      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
        result.current.handleDragOver('feedback-2', 'card');
      });

      // Start new drag
      act(() => {
        result.current.handleDragStart('action-1', 'action');
      });

      expect(result.current.draggedItem?.id).toBe('action-1');
      expect(result.current.dropTarget).toBeNull();
      expect(result.current.isValidDrop).toBe(false);
    });
  });

  // ============================================================================
  // Drag Over Tests - Column Drop
  // ============================================================================

  describe('handleDragOver - Column Drop', () => {
    it('should allow dropping any card on column', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('col-2', 'column');
      });

      expect(isValid).toBe(true);
      expect(result.current.isValidDrop).toBe(true);
      expect(result.current.dropError).toBeNull();
      expect(result.current.dropTarget).toEqual({ id: 'col-2', type: 'column' });
    });

    it('should allow dropping action card on column', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action-1', 'action');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('col-1', 'column');
      });

      expect(isValid).toBe(true);
      expect(result.current.isValidDrop).toBe(true);
    });
  });

  // ============================================================================
  // Drag Over Tests - Feedback → Feedback
  // ============================================================================

  describe('handleDragOver - Feedback to Feedback', () => {
    it('should allow feedback to drop on feedback (parent-child)', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-2', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-1', 'card');
      });

      expect(isValid).toBe(true);
      expect(result.current.isValidDrop).toBe(true);
      expect(result.current.dropError).toBeNull();
    });

    it('should prevent dropping card on itself', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-1', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.isValidDrop).toBe(false);
      expect(result.current.dropError).toBe('Cannot drop card on itself');
    });

    it('should prevent circular relationship', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // feedback-child has parent feedback-1
      // Trying to drop feedback-1 on feedback-child would create a cycle
      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-child', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Circular relationship detected');
    });

    it('should prevent dropping card that already has a parent', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // feedback-child already has feedback-1 as parent
      act(() => {
        result.current.handleDragStart('feedback-child', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-2', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Card already has a parent');
    });

    it('should prevent dropping on a card that is already a child', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // feedback-child is already a child
      act(() => {
        result.current.handleDragStart('feedback-2', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-child', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe(
        'Target card is already a child. Only 1-level hierarchy allowed'
      );
    });
  });

  // ============================================================================
  // Drag Over Tests - Action → Feedback
  // ============================================================================

  describe('handleDragOver - Action to Feedback', () => {
    it('should allow action to drop on feedback', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action-1', 'action');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-1', 'card');
      });

      expect(isValid).toBe(true);
      expect(result.current.isValidDrop).toBe(true);
      expect(result.current.dropError).toBeNull();
    });
  });

  // ============================================================================
  // Drag Over Tests - Invalid Combinations
  // ============================================================================

  describe('handleDragOver - Invalid Combinations', () => {
    it('should prevent feedback from dropping on action', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('action-1', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Cannot drop feedback on action card');
    });

    it('should prevent action from dropping on action', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action-1', 'action');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('action-2', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Cannot link action to action');
    });
  });

  // ============================================================================
  // Drag End Tests
  // ============================================================================

  describe('handleDragEnd', () => {
    it('should clear all drag state on drag end', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // Start dragging
      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
        result.current.handleDragOver('feedback-2', 'card');
      });

      expect(result.current.isDragging).toBe(true);

      // End dragging
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

  // ============================================================================
  // Get Drop Result Tests
  // ============================================================================

  describe('getDropResult', () => {
    it('should return move_to_column for column drop', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      // Need to separate act() calls so state updates are flushed
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

    it('should return link_parent_child for feedback on feedback', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-2', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('feedback-1', 'card');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'link_parent_child',
        parentId: 'feedback-1',
        childId: 'feedback-2',
      });
    });

    it('should return link_action for action on feedback', () => {
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

    it('should return null when not dragging', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      const dropResult = result.current.getDropResult();

      expect(dropResult).toBeNull();
    });

    it('should return null when drop is invalid', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
        result.current.handleDragOver('action-1', 'card'); // Invalid
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toBeNull();
    });
  });

  // ============================================================================
  // canDropOn Tests
  // ============================================================================

  describe('canDropOn', () => {
    it('should return true for valid drop targets', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-2', 'feedback');
      });

      expect(result.current.canDropOn('feedback-1', 'card')).toBe(true);
      expect(result.current.canDropOn('col-2', 'column')).toBe(true);
    });

    it('should return false for invalid drop targets', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      expect(result.current.canDropOn('action-1', 'card')).toBe(false);
      expect(result.current.canDropOn('feedback-1', 'card')).toBe(false); // Self
    });

    it('should return false when not dragging', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      expect(result.current.canDropOn('feedback-1', 'card')).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle non-existent target card', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-1', 'feedback');
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('non-existent', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Target card not found');
    });

    it('should handle drag without prior drag start', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.handleDragOver('feedback-1', 'card');
      });

      expect(isValid).toBe(false);
    });

    it('should update drop target when dragging over different targets', () => {
      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-2', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('feedback-1', 'card');
      });
      expect(result.current.dropTarget?.id).toBe('feedback-1');

      act(() => {
        result.current.handleDragOver('col-2', 'column');
      });
      expect(result.current.dropTarget?.id).toBe('col-2');
      expect(result.current.dropTarget?.type).toBe('column');
    });
  });
});
