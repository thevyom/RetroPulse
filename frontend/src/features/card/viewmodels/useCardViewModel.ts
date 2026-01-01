/**
 * Card ViewModel Hook
 * Manages card operations, sorting, filtering, and quotas following MVVM pattern
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCardStore } from '../../../models/stores/cardStore';
import { useBoardStore } from '../../../models/stores/boardStore';
import { useUserStore } from '../../../models/stores/userStore';
import { CardAPI } from '../../../models/api/CardAPI';
import { ReactionAPI } from '../../../models/api/ReactionAPI';
import { socketService } from '../../../models/socket/SocketService';
import type { Card, CardQuota, CreateCardDTO } from '../../../models/types';
import type { ReactionQuota } from '../../../models/types/reaction';
import { validateCardContent } from '../../../shared/validation';
import { wouldCreateCycle, hasParent } from '../../../shared/utils';

// ============================================================================
// Types
// ============================================================================

export type SortMode = 'recency' | 'popularity';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  showAll: boolean;
  showAnonymous: boolean;
  selectedUsers: string[];
}

export interface UseCardViewModelResult {
  // State
  cards: Card[];
  cardsByColumn: Map<string, Card[]>;
  isLoading: boolean;
  error: string | null;

  // Quota
  cardQuota: CardQuota | null;
  reactionQuota: ReactionQuota | null;
  canCreateCard: boolean;
  canReact: boolean;

  // Sorting & Filtering
  sortMode: SortMode;
  sortDirection: SortDirection;
  filters: FilterState;
  sortedFilteredCards: Card[];

  // Quota actions
  checkCardQuota: () => Promise<CardQuota>;
  checkReactionQuota: () => Promise<ReactionQuota>;
  refetchCards: () => Promise<void>;

  // CRUD actions
  handleCreateCard: (data: CreateCardDTO) => Promise<Card>;
  handleUpdateCard: (cardId: string, content: string) => Promise<void>;
  handleDeleteCard: (cardId: string) => Promise<void>;
  handleMoveCard: (cardId: string, columnId: string) => Promise<void>;

  // Relationship actions
  handleLinkParentChild: (parentId: string, childId: string) => Promise<void>;
  handleUnlinkChild: (childId: string) => Promise<void>;
  handleLinkActionToFeedback: (actionId: string, feedbackId: string) => Promise<void>;

  // Reaction actions
  handleAddReaction: (cardId: string) => Promise<void>;
  handleRemoveReaction: (cardId: string) => Promise<void>;
  hasUserReacted: (cardId: string) => boolean;

  // Sort/Filter actions
  setSortMode: (mode: SortMode) => void;
  toggleSortDirection: () => void;
  toggleAllUsersFilter: () => void;
  toggleAnonymousFilter: () => void;
  toggleUserFilter: (userHash: string) => void;
  clearFilters: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort cards by the specified mode and direction
 */
function sortCards(cards: Card[], mode: SortMode, direction: SortDirection): Card[] {
  return [...cards].sort((a, b) => {
    let comparison: number;

    if (mode === 'recency') {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      comparison = dateB - dateA; // Default: newest first
    } else {
      comparison = b.aggregated_reaction_count - a.aggregated_reaction_count;
    }

    return direction === 'desc' ? comparison : -comparison;
  });
}

/**
 * Filter cards based on filter state
 */
function filterCards(cards: Card[], filters: FilterState): Card[] {
  // If showAll is true and no specific user filters, show everything
  if (filters.showAll && filters.selectedUsers.length === 0) {
    // But if showAnonymous is false, filter out anonymous cards
    if (!filters.showAnonymous) {
      return cards.filter((card) => !card.is_anonymous);
    }
    return cards;
  }

  return cards.filter((card) => {
    // If specific users are selected, only show cards from those users
    if (filters.selectedUsers.length > 0) {
      // Anonymous cards don't match any specific user filter
      if (card.is_anonymous) {
        return false;
      }
      return filters.selectedUsers.includes(card.created_by_hash);
    }

    // No specific users selected - apply anonymous filter
    if (card.is_anonymous) {
      return filters.showAnonymous;
    }

    // If no specific users selected but showAll is false, hide all
    if (!filters.showAll) {
      return false;
    }

    return true;
  });
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCardViewModel(boardId: string): UseCardViewModelResult {
  // Store state
  const cardsMap = useCardStore((state) => state.cards);
  const storeIsLoading = useCardStore((state) => state.isLoading);
  const storeError = useCardStore((state) => state.error);
  const addCard = useCardStore((state) => state.addCard);
  const updateCard = useCardStore((state) => state.updateCard);
  const removeCard = useCardStore((state) => state.removeCard);
  const setCardsWithChildren = useCardStore((state) => state.setCardsWithChildren);
  const moveCardStore = useCardStore((state) => state.moveCard);
  const incrementReactionCount = useCardStore((state) => state.incrementReactionCount);
  const decrementReactionCount = useCardStore((state) => state.decrementReactionCount);
  const setLoading = useCardStore((state) => state.setLoading);
  const setError = useCardStore((state) => state.setError);

  const board = useBoardStore((state) => state.board);
  const currentUser = useUserStore((state) => state.currentUser);

  // Local state
  const [operationError, setOperationError] = useState<string | null>(null);
  const [cardQuota, setCardQuota] = useState<CardQuota | null>(null);
  const [reactionQuota, setReactionQuota] = useState<ReactionQuota | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recency');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    showAll: true,
    showAnonymous: true,
    selectedUsers: [],
  });
  // Track user's reactions locally (persists for session only)
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());

  // Combined error
  const error = operationError || storeError;

  // ============================================================================
  // Derived State
  // ============================================================================

  const cards = useMemo(() => {
    return Array.from(cardsMap.values());
  }, [cardsMap]);

  const cardsByColumn = useMemo(() => {
    const byColumn = new Map<string, Card[]>();

    // Get only parent cards (no parent_card_id) for display
    const parentCards = cards.filter((card) => !card.parent_card_id);

    parentCards.forEach((card) => {
      const existing = byColumn.get(card.column_id) || [];
      byColumn.set(card.column_id, [...existing, card]);
    });

    return byColumn;
  }, [cards]);

  const sortedFilteredCards = useMemo(() => {
    const parentCards = cards.filter((card) => !card.parent_card_id);
    const filtered = filterCards(parentCards, filters);
    return sortCards(filtered, sortMode, sortDirection);
  }, [cards, filters, sortMode, sortDirection]);

  const canCreateCard = useMemo(() => {
    return cardQuota?.can_create ?? true;
  }, [cardQuota]);

  const canReact = useMemo(() => {
    return reactionQuota?.can_react ?? true;
  }, [reactionQuota]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchCards = useCallback(async () => {
    if (!boardId) return;

    setLoading(true);
    setOperationError(null);

    try {
      const response = await CardAPI.getCards(boardId, { include_relationships: true });
      setCardsWithChildren(response.cards);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cards';
      setError(message);
    }
  }, [boardId, setCardsWithChildren, setLoading, setError]);

  const checkCardQuota = useCallback(async (): Promise<CardQuota> => {
    if (!boardId) {
      throw new Error('No board ID');
    }

    const quota = await CardAPI.checkCardQuota(boardId);
    setCardQuota(quota);
    return quota;
  }, [boardId]);

  const checkReactionQuota = useCallback(async (): Promise<ReactionQuota> => {
    if (!boardId) {
      throw new Error('No board ID');
    }

    const quota = await ReactionAPI.checkQuota(boardId);
    setReactionQuota(quota);
    return quota;
  }, [boardId]);

  // Load cards on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching on mount is intentional
    void fetchCards();
  }, [fetchCards]);

  // Load quotas on mount - failures are non-critical
  useEffect(() => {
    if (boardId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetching on mount is intentional
      checkCardQuota().catch(() => {
        /* Silent fail - quotas are optional */
      });
      checkReactionQuota().catch(() => {
        /* Silent fail - quotas are optional */
      });
    }
  }, [boardId, checkCardQuota, checkReactionQuota]);

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  useEffect(() => {
    if (!boardId) return;

    const handleCardCreated = (event: { card: Card }) => {
      addCard(event.card);
      // Refresh quota after card creation by others
      checkCardQuota().catch(() => {});
    };

    const handleCardUpdated = (event: { card_id: string; content: string }) => {
      updateCard(event.card_id, { content: event.content });
    };

    const handleCardDeleted = (event: { card_id: string }) => {
      removeCard(event.card_id);
      // Refresh quota after card deletion
      checkCardQuota().catch(() => {});
    };

    const handleCardMoved = (event: { card_id: string; column_id: string }) => {
      moveCardStore(event.card_id, event.column_id);
    };

    const handleReactionAdded = (event: { card_id: string }) => {
      incrementReactionCount(event.card_id);
      // Refresh reaction quota
      checkReactionQuota().catch(() => {});
    };

    const handleReactionRemoved = (event: { card_id: string }) => {
      decrementReactionCount(event.card_id);
      // Refresh reaction quota
      checkReactionQuota().catch(() => {});
    };

    const handleCardLinked = () => {
      // Refresh cards to get updated aggregation counts
      fetchCards();
    };

    const handleCardUnlinked = () => {
      // Refresh cards to get updated aggregation counts
      fetchCards();
    };

    // Subscribe to events
    socketService.on('card:created', handleCardCreated);
    socketService.on('card:updated', handleCardUpdated);
    socketService.on('card:deleted', handleCardDeleted);
    socketService.on('card:moved', handleCardMoved);
    socketService.on('reaction:added', handleReactionAdded);
    socketService.on('reaction:removed', handleReactionRemoved);
    socketService.on('card:linked', handleCardLinked);
    socketService.on('card:unlinked', handleCardUnlinked);

    return () => {
      socketService.off('card:created', handleCardCreated);
      socketService.off('card:updated', handleCardUpdated);
      socketService.off('card:deleted', handleCardDeleted);
      socketService.off('card:moved', handleCardMoved);
      socketService.off('reaction:added', handleReactionAdded);
      socketService.off('reaction:removed', handleReactionRemoved);
      socketService.off('card:linked', handleCardLinked);
      socketService.off('card:unlinked', handleCardUnlinked);
    };
  }, [
    boardId,
    addCard,
    updateCard,
    removeCard,
    moveCardStore,
    incrementReactionCount,
    decrementReactionCount,
    checkCardQuota,
    checkReactionQuota,
    fetchCards,
  ]);

  // ============================================================================
  // CRUD Actions
  // ============================================================================

  const handleCreateCard = useCallback(
    async (data: CreateCardDTO): Promise<Card> => {
      if (!boardId) {
        throw new Error('No board ID');
      }

      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot create card on a closed board');
        throw new Error('Cannot create card on a closed board');
      }

      // Validate content
      const validation = validateCardContent(data.content);
      if (!validation.isValid) {
        setOperationError(validation.error || 'Invalid card content');
        throw new Error(validation.error || 'Invalid card content');
      }

      // Check quota (skip for action cards if they're exempt)
      if (data.card_type === 'feedback') {
        const quota = await checkCardQuota();
        if (!quota.can_create) {
          setOperationError('Card limit reached');
          throw new Error('Card limit reached');
        }
      }

      setOperationError(null);

      // Optimistic add with temporary ID
      const tempId = `temp-${Date.now()}`;
      const tempCard: Card = {
        id: tempId,
        board_id: boardId,
        column_id: data.column_id,
        content: data.content,
        card_type: data.card_type,
        is_anonymous: data.is_anonymous ?? false,
        created_by_hash: currentUser?.cookie_hash ?? '',
        created_by_alias: currentUser?.alias ?? null,
        created_at: new Date().toISOString(),
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      };

      addCard(tempCard);

      try {
        const createdCard = await CardAPI.createCard(boardId, data);
        // Replace temp card with real card
        removeCard(tempId);
        addCard(createdCard);
        // Update quota
        await checkCardQuota();
        return createdCard;
      } catch (err) {
        // Rollback optimistic update
        removeCard(tempId);
        const message = err instanceof Error ? err.message : 'Failed to create card';
        setOperationError(message);
        throw err;
      }
    },
    [boardId, board?.state, currentUser, addCard, removeCard, checkCardQuota]
  );

  const handleUpdateCard = useCallback(
    async (cardId: string, content: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot update card on a closed board');
        throw new Error('Cannot update card on a closed board');
      }

      // Validate content
      const validation = validateCardContent(content);
      if (!validation.isValid) {
        setOperationError(validation.error || 'Invalid card content');
        throw new Error(validation.error || 'Invalid card content');
      }

      // Store original for rollback
      const originalCard = cardsMap.get(cardId);
      if (!originalCard) {
        throw new Error('Card not found');
      }

      setOperationError(null);

      // Optimistic update
      updateCard(cardId, { content });

      try {
        await CardAPI.updateCard(cardId, { content });
      } catch (err) {
        // Rollback
        updateCard(cardId, { content: originalCard.content });
        const message = err instanceof Error ? err.message : 'Failed to update card';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, updateCard]
  );

  const handleDeleteCard = useCallback(
    async (cardId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot delete card on a closed board');
        throw new Error('Cannot delete card on a closed board');
      }

      // Store for rollback
      const originalCard = cardsMap.get(cardId);
      if (!originalCard) {
        throw new Error('Card not found');
      }

      setOperationError(null);

      // Optimistic delete
      removeCard(cardId);

      try {
        await CardAPI.deleteCard(cardId);
        // Update quota after deletion
        await checkCardQuota();
      } catch (err) {
        // Rollback
        addCard(originalCard);
        const message = err instanceof Error ? err.message : 'Failed to delete card';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, addCard, removeCard, checkCardQuota]
  );

  const handleMoveCard = useCallback(
    async (cardId: string, columnId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot move card on a closed board');
        throw new Error('Cannot move card on a closed board');
      }

      const card = cardsMap.get(cardId);
      if (!card) {
        throw new Error('Card not found');
      }

      const originalColumnId = card.column_id;

      setOperationError(null);

      // Optimistic update
      moveCardStore(cardId, columnId);

      try {
        await CardAPI.moveCard(cardId, { column_id: columnId });
      } catch (err) {
        // Rollback
        moveCardStore(cardId, originalColumnId);
        const message = err instanceof Error ? err.message : 'Failed to move card';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, moveCardStore]
  );

  // ============================================================================
  // Relationship Actions
  // ============================================================================

  const handleLinkParentChild = useCallback(
    async (parentId: string, childId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot link cards on a closed board');
        throw new Error('Cannot link cards on a closed board');
      }

      const parentCard = cardsMap.get(parentId);
      const childCard = cardsMap.get(childId);

      if (!parentCard || !childCard) {
        throw new Error('Card not found');
      }

      // Both must be feedback type
      if (parentCard.card_type !== 'feedback' || childCard.card_type !== 'feedback') {
        setOperationError('Only feedback cards can be linked as parent-child');
        throw new Error('Only feedback cards can be linked as parent-child');
      }

      // Check for circular relationship
      if (wouldCreateCycle(cardsMap, parentId, childId)) {
        setOperationError('Cannot create circular relationship');
        throw new Error('Cannot create circular relationship');
      }

      // 1-level hierarchy: child cannot already have a parent
      if (hasParent(cardsMap, childId)) {
        setOperationError('Card already has a parent. Only 1-level hierarchy allowed');
        throw new Error('Card already has a parent. Only 1-level hierarchy allowed');
      }

      // Parent cannot be a child of another card
      if (hasParent(cardsMap, parentId)) {
        setOperationError('Parent card cannot be a child of another card');
        throw new Error('Parent card cannot be a child of another card');
      }

      setOperationError(null);

      try {
        await CardAPI.linkCards(parentId, {
          target_card_id: childId,
          link_type: 'parent_of',
        });
        // Refresh to get updated aggregation
        await fetchCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to link cards';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, fetchCards]
  );

  const handleUnlinkChild = useCallback(
    async (childId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot unlink card on a closed board');
        throw new Error('Cannot unlink card on a closed board');
      }

      const childCard = cardsMap.get(childId);
      if (!childCard || !childCard.parent_card_id) {
        throw new Error('Card not found or has no parent');
      }

      const parentId = childCard.parent_card_id;

      setOperationError(null);

      try {
        await CardAPI.unlinkCards(parentId, {
          target_card_id: childId,
          link_type: 'parent_of',
        });
        // Refresh to get updated aggregation
        await fetchCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unlink card';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, fetchCards]
  );

  const handleLinkActionToFeedback = useCallback(
    async (actionId: string, feedbackId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot link action on a closed board');
        throw new Error('Cannot link action on a closed board');
      }

      const actionCard = cardsMap.get(actionId);
      const feedbackCard = cardsMap.get(feedbackId);

      if (!actionCard || !feedbackCard) {
        throw new Error('Card not found');
      }

      // Source must be action, target must be feedback
      if (actionCard.card_type !== 'action') {
        setOperationError('Source must be an action card');
        throw new Error('Source must be an action card');
      }

      if (feedbackCard.card_type !== 'feedback') {
        setOperationError('Target must be a feedback card');
        throw new Error('Target must be a feedback card');
      }

      setOperationError(null);

      try {
        await CardAPI.linkCards(actionId, {
          target_card_id: feedbackId,
          link_type: 'linked_to',
        });
        // Refresh cards
        await fetchCards();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to link action to feedback';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, cardsMap, fetchCards]
  );

  // ============================================================================
  // Reaction Actions
  // ============================================================================

  const handleAddReaction = useCallback(
    async (cardId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot add reaction on a closed board');
        throw new Error('Cannot add reaction on a closed board');
      }

      // Check quota
      const quota = await checkReactionQuota();
      if (!quota.can_react) {
        setOperationError('Reaction limit reached');
        throw new Error('Reaction limit reached');
      }

      setOperationError(null);

      // Optimistic update
      incrementReactionCount(cardId);
      setUserReactions((prev) => new Set(prev).add(cardId));

      try {
        await ReactionAPI.addReaction(cardId, { reaction_type: 'thumbs_up' });
        await checkReactionQuota();
      } catch (err) {
        // Rollback
        decrementReactionCount(cardId);
        setUserReactions((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        const message = err instanceof Error ? err.message : 'Failed to add reaction';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, incrementReactionCount, decrementReactionCount, checkReactionQuota]
  );

  const handleRemoveReaction = useCallback(
    async (cardId: string): Promise<void> => {
      // Check if board is closed
      if (board?.state === 'closed') {
        setOperationError('Cannot remove reaction on a closed board');
        throw new Error('Cannot remove reaction on a closed board');
      }

      setOperationError(null);

      // Optimistic update
      decrementReactionCount(cardId);
      setUserReactions((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });

      try {
        await ReactionAPI.removeReaction(cardId);
        await checkReactionQuota();
      } catch (err) {
        // Rollback
        incrementReactionCount(cardId);
        setUserReactions((prev) => new Set(prev).add(cardId));
        const message = err instanceof Error ? err.message : 'Failed to remove reaction';
        setOperationError(message);
        throw err;
      }
    },
    [board?.state, incrementReactionCount, decrementReactionCount, checkReactionQuota]
  );

  const hasUserReacted = useCallback(
    (cardId: string): boolean => {
      return userReactions.has(cardId);
    },
    [userReactions]
  );

  // ============================================================================
  // Sort/Filter Actions
  // ============================================================================

  const handleSetSortMode = useCallback((mode: SortMode) => {
    setSortMode(mode);
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  const toggleAllUsersFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      showAll: !prev.showAll,
      selectedUsers: prev.showAll ? prev.selectedUsers : [],
    }));
  }, []);

  const toggleAnonymousFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      showAnonymous: !prev.showAnonymous,
    }));
  }, []);

  const toggleUserFilter = useCallback((userHash: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedUsers.includes(userHash);
      const newSelectedUsers = isSelected
        ? prev.selectedUsers.filter((h) => h !== userHash)
        : [...prev.selectedUsers, userHash];

      return {
        ...prev,
        showAll: newSelectedUsers.length === 0,
        selectedUsers: newSelectedUsers,
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      showAll: true,
      showAnonymous: true,
      selectedUsers: [],
    });
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    cards,
    cardsByColumn,
    isLoading: storeIsLoading,
    error,

    // Quota
    cardQuota,
    reactionQuota,
    canCreateCard,
    canReact,

    // Sorting & Filtering
    sortMode,
    sortDirection,
    filters,
    sortedFilteredCards,

    // Quota actions
    checkCardQuota,
    checkReactionQuota,
    refetchCards: fetchCards,

    // CRUD actions
    handleCreateCard,
    handleUpdateCard,
    handleDeleteCard,
    handleMoveCard,

    // Relationship actions
    handleLinkParentChild,
    handleUnlinkChild,
    handleLinkActionToFeedback,

    // Reaction actions
    handleAddReaction,
    handleRemoveReaction,
    hasUserReacted,

    // Sort/Filter actions
    setSortMode: handleSetSortMode,
    toggleSortDirection,
    toggleAllUsersFilter,
    toggleAnonymousFilter,
    toggleUserFilter,
    clearFilters,
  };
}
