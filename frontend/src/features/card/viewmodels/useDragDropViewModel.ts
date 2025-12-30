/**
 * Drag-Drop ViewModel Hook
 * Manages drag-and-drop logic for cards following MVVM pattern
 */

import { useCallback, useState } from 'react';
import { useCardStore } from '../../../models/stores/cardStore';
import type { CardType } from '../../../models/types';
import { wouldCreateCycle, hasParent } from '../../../shared/utils';

// ============================================================================
// Types
// ============================================================================

export interface DragItem {
  id: string;
  type: CardType;
}

export interface DropTarget {
  id: string;
  type: 'card' | 'column';
}

export type DropResult =
  | { action: 'link_parent_child'; parentId: string; childId: string }
  | { action: 'link_action'; actionId: string; feedbackId: string }
  | { action: 'move_to_column'; cardId: string; columnId: string }
  | null;

export interface UseDragDropViewModelResult {
  // State
  isDragging: boolean;
  draggedItem: DragItem | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  dropError: string | null;

  // Actions
  handleDragStart: (cardId: string, cardType: CardType) => void;
  handleDragOver: (targetId: string, targetType: 'card' | 'column') => boolean;
  handleDragEnd: () => void;
  getDropResult: () => DropResult;

  // Validation
  canDropOn: (targetId: string, targetType: 'card' | 'column') => boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDragDropViewModel(): UseDragDropViewModelResult {
  // Store state
  const cardsMap = useCardStore((state) => state.cards);

  // Local state
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  /**
   * Validate if drop is allowed
   */
  const validateDrop = useCallback(
    (
      sourceId: string,
      sourceType: CardType,
      targetId: string,
      targetType: 'card' | 'column'
    ): { valid: boolean; error: string | null } => {
      // Dropping on column is always valid (just move)
      if (targetType === 'column') {
        return { valid: true, error: null };
      }

      // Dropping on a card - validate card types
      const targetCard = cardsMap.get(targetId);
      if (!targetCard) {
        return { valid: false, error: 'Target card not found' };
      }

      const targetCardType = targetCard.card_type;

      // Case 1: Feedback → Feedback = Create parent-child
      if (sourceType === 'feedback' && targetCardType === 'feedback') {
        // Check for self-drop
        if (sourceId === targetId) {
          return { valid: false, error: 'Cannot drop card on itself' };
        }

        // Check for circular relationship
        if (wouldCreateCycle(cardsMap, targetId, sourceId)) {
          return { valid: false, error: 'Circular relationship detected' };
        }

        // Check 1-level hierarchy: source cannot already be a child
        if (hasParent(cardsMap, sourceId)) {
          return { valid: false, error: 'Card already has a parent' };
        }

        // Check 1-level hierarchy: target cannot already be a child
        if (hasParent(cardsMap, targetId)) {
          return {
            valid: false,
            error: 'Target card is already a child. Only 1-level hierarchy allowed',
          };
        }

        return { valid: true, error: null };
      }

      // Case 2: Action → Feedback = Link action to feedback
      if (sourceType === 'action' && targetCardType === 'feedback') {
        return { valid: true, error: null };
      }

      // Case 3: Feedback → Action = Not allowed
      if (sourceType === 'feedback' && targetCardType === 'action') {
        return { valid: false, error: 'Cannot drop feedback on action card' };
      }

      // Case 4: Action → Action = Not allowed
      if (sourceType === 'action' && targetCardType === 'action') {
        return { valid: false, error: 'Cannot link action to action' };
      }

      return { valid: false, error: 'Invalid drop combination' };
    },
    [cardsMap]
  );

  // ============================================================================
  // Actions
  // ============================================================================

  const handleDragStart = useCallback((cardId: string, cardType: CardType) => {
    setDraggedItem({ id: cardId, type: cardType });
    setDropTarget(null);
    setIsValidDrop(false);
    setDropError(null);
  }, []);

  const handleDragOver = useCallback(
    (targetId: string, targetType: 'card' | 'column'): boolean => {
      if (!draggedItem) {
        return false;
      }

      setDropTarget({ id: targetId, type: targetType });

      const validation = validateDrop(draggedItem.id, draggedItem.type, targetId, targetType);
      setIsValidDrop(validation.valid);
      setDropError(validation.error);

      return validation.valid;
    },
    [draggedItem, validateDrop]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
    setIsValidDrop(false);
    setDropError(null);
  }, []);

  const getDropResult = useCallback((): DropResult => {
    if (!draggedItem || !dropTarget || !isValidDrop) {
      return null;
    }

    // Drop on column = move
    if (dropTarget.type === 'column') {
      return {
        action: 'move_to_column',
        cardId: draggedItem.id,
        columnId: dropTarget.id,
      };
    }

    // Drop on card
    const targetCard = cardsMap.get(dropTarget.id);
    if (!targetCard) {
      return null;
    }

    // Feedback → Feedback = parent-child link
    if (draggedItem.type === 'feedback' && targetCard.card_type === 'feedback') {
      return {
        action: 'link_parent_child',
        parentId: dropTarget.id,
        childId: draggedItem.id,
      };
    }

    // Action → Feedback = action link
    if (draggedItem.type === 'action' && targetCard.card_type === 'feedback') {
      return {
        action: 'link_action',
        actionId: draggedItem.id,
        feedbackId: dropTarget.id,
      };
    }

    return null;
  }, [draggedItem, dropTarget, isValidDrop, cardsMap]);

  const canDropOn = useCallback(
    (targetId: string, targetType: 'card' | 'column'): boolean => {
      if (!draggedItem) {
        return false;
      }

      const validation = validateDrop(draggedItem.id, draggedItem.type, targetId, targetType);
      return validation.valid;
    },
    [draggedItem, validateDrop]
  );

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isDragging: draggedItem !== null,
    draggedItem,
    dropTarget,
    isValidDrop,
    dropError,

    // Actions
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    getDropResult,

    // Validation
    canDropOn,
  };
}
