/**
 * useCardViewModel Tests
 * Comprehensive unit tests for the Card ViewModel hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCardViewModel } from '../../../../../src/features/card/viewmodels/useCardViewModel';
import { useCardStore } from '../../../../../src/models/stores/cardStore';
import { useBoardStore } from '../../../../../src/models/stores/boardStore';
import { useUserStore } from '../../../../../src/models/stores/userStore';
import { CardAPI } from '../../../../../src/models/api/CardAPI';
import { ReactionAPI } from '../../../../../src/models/api/ReactionAPI';
import { socketService } from '../../../../../src/models/socket/SocketService';
import type { Card, Board, UserSession, CardQuota } from '../../../../../src/models/types';
import type { ReactionQuota } from '../../../../../src/models/types/reaction';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../../src/models/api/CardAPI', () => ({
  CardAPI: {
    getCards: vi.fn(),
    checkCardQuota: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    moveCard: vi.fn(),
    linkCards: vi.fn(),
    unlinkCards: vi.fn(),
  },
}));

vi.mock('../../../../../src/models/api/ReactionAPI', () => ({
  ReactionAPI: {
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    checkQuota: vi.fn(),
  },
}));

vi.mock('../../../../../src/models/socket/SocketService', () => ({
  socketService: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockBoard: Board = {
  id: 'board-123',
  name: 'Sprint 42 Retro',
  shareable_link: 'http://localhost/boards/board-123',
  state: 'active',
  closed_at: null,
  columns: [
    { id: 'col-1', name: 'What Went Well', color: '#10b981' },
    { id: 'col-2', name: 'Improvements', color: '#f59e0b' },
    { id: 'col-3', name: 'Actions', color: '#3b82f6' },
  ],
  admins: ['hash-admin-1'],
  active_users: [],
  card_limit_per_user: 5,
  reaction_limit_per_user: 10,
  created_at: '2025-12-28T10:00:00Z',
  created_by_hash: 'hash-admin-1',
};

const mockCurrentUser: UserSession = {
  cookie_hash: 'hash-user-1',
  alias: 'TestUser',
  is_admin: false,
  last_active_at: '2025-12-28T11:00:00Z',
  created_at: '2025-12-28T10:00:00Z',
};

const mockCards: Card[] = [
  {
    id: 'card-1',
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Great teamwork!',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'hash-user-1',
    created_by_alias: 'TestUser',
    created_at: '2025-12-28T10:30:00Z',
    direct_reaction_count: 3,
    aggregated_reaction_count: 5,
    parent_card_id: null,
    linked_feedback_ids: [],
    children: [
      {
        id: 'card-1-child',
        content: 'Especially the pairing sessions',
        is_anonymous: false,
        created_by_alias: 'AnotherUser',
        created_at: '2025-12-28T10:35:00Z',
        direct_reaction_count: 2,
        aggregated_reaction_count: 2,
      },
    ],
  },
  {
    id: 'card-2',
    board_id: 'board-123',
    column_id: 'col-2',
    content: 'Need better code reviews',
    card_type: 'feedback',
    is_anonymous: true,
    created_by_hash: 'hash-user-2',
    created_by_alias: null,
    created_at: '2025-12-28T10:40:00Z',
    direct_reaction_count: 1,
    aggregated_reaction_count: 1,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
  {
    id: 'card-3',
    board_id: 'board-123',
    column_id: 'col-3',
    content: 'Set up linting rules',
    card_type: 'action',
    is_anonymous: false,
    created_by_hash: 'hash-user-1',
    created_by_alias: 'TestUser',
    created_at: '2025-12-28T10:45:00Z',
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
];

const mockCardQuota: CardQuota = {
  current_count: 2,
  limit: 5,
  can_create: true,
  limit_enabled: true,
};

const mockReactionQuota: ReactionQuota = {
  current_count: 5,
  limit: 10,
  can_react: true,
  limit_enabled: true,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('useCardViewModel', () => {
  beforeEach(() => {
    // Reset stores
    useCardStore.setState({
      cards: new Map(),
      isLoading: false,
      error: null,
    });
    useBoardStore.setState({
      board: mockBoard,
      isLoading: false,
      error: null,
    });
    useUserStore.setState({
      currentUser: mockCurrentUser,
      activeUsers: [],
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(CardAPI.getCards).mockResolvedValue({
      cards: mockCards,
      total_count: mockCards.length,
      cards_by_column: { 'col-1': 1, 'col-2': 1, 'col-3': 1 },
    });
    vi.mocked(CardAPI.checkCardQuota).mockResolvedValue(mockCardQuota);
    vi.mocked(ReactionAPI.checkQuota).mockResolvedValue(mockReactionQuota);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Card Loading Tests
  // ============================================================================

  describe('Card Loading', () => {
    it('should load cards with embedded children on mount', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.cards.length).toBe(3);
      expect(CardAPI.getCards).toHaveBeenCalledWith('board-123', { include_relationships: true });
    });

    it('should handle API error during load', async () => {
      vi.mocked(CardAPI.getCards).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should load card and reaction quotas on mount', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cardQuota).toEqual(mockCardQuota);
        expect(result.current.reactionQuota).toEqual(mockReactionQuota);
      });

      expect(CardAPI.checkCardQuota).toHaveBeenCalledWith('board-123');
      expect(ReactionAPI.checkQuota).toHaveBeenCalledWith('board-123');
    });
  });

  // ============================================================================
  // Quota Tests
  // ============================================================================

  describe('Quota Management', () => {
    it('should derive canCreateCard from quota', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cardQuota).toBeDefined();
      });

      expect(result.current.canCreateCard).toBe(true);
    });

    it('should derive canCreateCard as false when at limit', async () => {
      vi.mocked(CardAPI.checkCardQuota).mockResolvedValue({
        ...mockCardQuota,
        current_count: 5,
        can_create: false,
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cardQuota).toBeDefined();
      });

      expect(result.current.canCreateCard).toBe(false);
    });

    it('should block card creation when quota is exceeded', async () => {
      vi.mocked(CardAPI.checkCardQuota).mockResolvedValue({
        ...mockCardQuota,
        current_count: 5,
        can_create: false,
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cardQuota).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: 'New card',
            card_type: 'feedback',
          });
        })
      ).rejects.toThrow('Card limit reached');

      expect(CardAPI.createCard).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Create Card Tests
  // ============================================================================

  describe('handleCreateCard', () => {
    it('should create card successfully with optimistic update', async () => {
      const newCard: Card = {
        id: 'card-new',
        board_id: 'board-123',
        column_id: 'col-1',
        content: 'New feedback',
        card_type: 'feedback',
        is_anonymous: false,
        created_by_hash: 'hash-user-1',
        created_by_alias: 'TestUser',
        created_at: new Date().toISOString(),
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      };

      vi.mocked(CardAPI.createCard).mockResolvedValue(newCard);

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.cards.length;

      let createdCard: Card | undefined;
      await act(async () => {
        createdCard = await result.current.handleCreateCard({
          column_id: 'col-1',
          content: 'New feedback',
          card_type: 'feedback',
        });
      });

      expect(createdCard).toEqual(newCard);
      expect(result.current.cards.length).toBe(initialCount + 1);
    });

    it('should validate content before creating', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: '',
            card_type: 'feedback',
          });
        })
      ).rejects.toThrow('Card content is required');

      expect(CardAPI.createCard).not.toHaveBeenCalled();
    });

    it('should rollback optimistic update on API error', async () => {
      vi.mocked(CardAPI.createCard).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.cards.length;

      try {
        await act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: 'New card',
            card_type: 'feedback',
          });
        });
      } catch {
        // Expected
      }

      // Should rollback to original count
      expect(result.current.cards.length).toBe(initialCount);
    });

    it('should reject creation on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: 'New card',
            card_type: 'feedback',
          });
        })
      ).rejects.toThrow('Cannot create card on a closed board');
    });
  });

  // ============================================================================
  // Update Card Tests
  // ============================================================================

  describe('handleUpdateCard', () => {
    it('should update card content successfully', async () => {
      vi.mocked(CardAPI.updateCard).mockResolvedValue({
        id: 'card-1',
        content: 'Updated content',
        updated_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleUpdateCard('card-1', 'Updated content');
      });

      expect(CardAPI.updateCard).toHaveBeenCalledWith('card-1', { content: 'Updated content' });
    });

    it('should rollback on update failure', async () => {
      vi.mocked(CardAPI.updateCard).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const originalContent = result.current.cards.find((c) => c.id === 'card-1')?.content;

      try {
        await act(async () => {
          await result.current.handleUpdateCard('card-1', 'Failed update');
        });
      } catch {
        // Expected
      }

      // Content should be rolled back
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.content).toBe(originalContent);
    });
  });

  // ============================================================================
  // Delete Card Tests
  // ============================================================================

  describe('handleDeleteCard', () => {
    it('should delete card successfully', async () => {
      vi.mocked(CardAPI.deleteCard).mockResolvedValue();

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleDeleteCard('card-1');
      });

      expect(CardAPI.deleteCard).toHaveBeenCalledWith('card-1');
      expect(result.current.cards.find((c) => c.id === 'card-1')).toBeUndefined();
    });

    it('should rollback on delete failure', async () => {
      vi.mocked(CardAPI.deleteCard).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const initialCount = result.current.cards.length;

      try {
        await act(async () => {
          await result.current.handleDeleteCard('card-1');
        });
      } catch {
        // Expected
      }

      // Card should be restored
      expect(result.current.cards.length).toBe(initialCount);
    });
  });

  // ============================================================================
  // Move Card Tests
  // ============================================================================

  describe('handleMoveCard', () => {
    it('should move card to new column', async () => {
      vi.mocked(CardAPI.moveCard).mockResolvedValue({
        id: 'card-1',
        column_id: 'col-2',
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleMoveCard('card-1', 'col-2');
      });

      expect(CardAPI.moveCard).toHaveBeenCalledWith('card-1', { column_id: 'col-2' });
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.column_id).toBe('col-2');
    });
  });

  // ============================================================================
  // Relationship Tests
  // ============================================================================

  describe('handleLinkParentChild', () => {
    it('should link feedback cards as parent-child', async () => {
      vi.mocked(CardAPI.linkCards).mockResolvedValue({
        source_card_id: 'card-1',
        target_card_id: 'card-2',
        link_type: 'parent_of',
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleLinkParentChild('card-1', 'card-2');
      });

      expect(CardAPI.linkCards).toHaveBeenCalledWith('card-1', {
        target_card_id: 'card-2',
        link_type: 'parent_of',
      });
    });

    it('should reject linking action cards as parent-child', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      // card-3 is an action card
      await expect(
        act(async () => {
          await result.current.handleLinkParentChild('card-3', 'card-1');
        })
      ).rejects.toThrow('Only feedback cards can be linked as parent-child');
    });

    it('should prevent circular relationships', async () => {
      // Set up card-2 as child of card-1
      const cardsWithParent: Card[] = [
        { ...mockCards[0] },
        {
          ...mockCards[1],
          parent_card_id: 'card-1',
        },
        { ...mockCards[2] },
      ];

      vi.mocked(CardAPI.getCards).mockResolvedValue({
        cards: cardsWithParent,
        total_count: cardsWithParent.length,
        cards_by_column: { 'col-1': 1, 'col-2': 1, 'col-3': 1 },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      // Try to make card-1 a child of card-2 (would create cycle)
      await expect(
        act(async () => {
          await result.current.handleLinkParentChild('card-2', 'card-1');
        })
      ).rejects.toThrow();
    });
  });

  describe('handleLinkActionToFeedback', () => {
    it('should link action to feedback card', async () => {
      vi.mocked(CardAPI.linkCards).mockResolvedValue({
        source_card_id: 'card-3',
        target_card_id: 'card-1',
        link_type: 'linked_to',
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await act(async () => {
        await result.current.handleLinkActionToFeedback('card-3', 'card-1');
      });

      expect(CardAPI.linkCards).toHaveBeenCalledWith('card-3', {
        target_card_id: 'card-1',
        link_type: 'linked_to',
      });
    });

    it('should reject linking feedback as action', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleLinkActionToFeedback('card-1', 'card-2');
        })
      ).rejects.toThrow('Source must be an action card');
    });
  });

  // ============================================================================
  // Sorting Tests
  // ============================================================================

  describe('Sorting', () => {
    it('should sort by recency (default)', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      expect(result.current.sortMode).toBe('recency');
      expect(result.current.sortDirection).toBe('desc');

      // Most recent card should be first (card-3 created at 10:45)
      const sorted = result.current.sortedFilteredCards;
      expect(sorted[0].id).toBe('card-3');
    });

    it('should toggle sort direction', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.toggleSortDirection();
      });

      expect(result.current.sortDirection).toBe('asc');
    });

    it('should sort by popularity', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      act(() => {
        result.current.setSortMode('popularity');
      });

      expect(result.current.sortMode).toBe('popularity');

      // Card with most reactions should be first (card-1 has 5 aggregated)
      const sorted = result.current.sortedFilteredCards;
      expect(sorted[0].id).toBe('card-1');
    });
  });

  // ============================================================================
  // Filtering Tests
  // ============================================================================

  describe('Filtering', () => {
    it('should filter by anonymous', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      // All cards shown by default
      expect(result.current.sortedFilteredCards.length).toBeGreaterThan(0);

      act(() => {
        result.current.toggleAnonymousFilter();
      });

      expect(result.current.filters.showAnonymous).toBe(false);
      // Anonymous cards should be hidden
      const anonymousCards = result.current.sortedFilteredCards.filter((c) => c.is_anonymous);
      expect(anonymousCards.length).toBe(0);
    });

    it('should filter by specific user', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      act(() => {
        result.current.toggleUserFilter('hash-user-1');
      });

      expect(result.current.filters.showAll).toBe(false);
      expect(result.current.filters.selectedUsers).toContain('hash-user-1');

      // Only user-1's cards should be shown (card-1 and card-3)
      expect(result.current.sortedFilteredCards.length).toBe(2);
      expect(
        result.current.sortedFilteredCards.every((c) => c.created_by_hash === 'hash-user-1')
      ).toBe(true);
    });

    it('should clear all filters', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      // Set some filters
      act(() => {
        result.current.toggleAnonymousFilter();
        result.current.toggleUserFilter('hash-user-1');
      });

      expect(result.current.filters.showAnonymous).toBe(false);
      expect(result.current.filters.selectedUsers.length).toBe(1);

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.showAll).toBe(true);
      expect(result.current.filters.showAnonymous).toBe(true);
      expect(result.current.filters.selectedUsers.length).toBe(0);
    });

    it('should toggle showAll filter off and back on', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      expect(result.current.filters.showAll).toBe(true);

      // Toggle off (adds user to selectedUsers)
      act(() => {
        result.current.toggleUserFilter('hash-user-1');
      });

      expect(result.current.filters.showAll).toBe(false);

      // Clear selected users
      act(() => {
        result.current.toggleUserFilter('hash-user-1');
      });

      // showAll should still be false but selectedUsers empty
      expect(result.current.filters.selectedUsers.length).toBe(0);
    });
  });

  // ============================================================================
  // Reaction Tests
  // ============================================================================

  describe('Reactions', () => {
    it('should add reaction with optimistic update', async () => {
      vi.mocked(ReactionAPI.addReaction).mockResolvedValue({
        id: 'reaction-1',
        card_id: 'card-1',
        user_cookie_hash: 'hash-user-1',
        user_alias: 'User 1',
        reaction_type: 'thumbs_up',
        created_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const initialCount =
        result.current.cards.find((c) => c.id === 'card-1')?.direct_reaction_count ?? 0;

      await act(async () => {
        await result.current.handleAddReaction('card-1');
      });

      expect(ReactionAPI.addReaction).toHaveBeenCalledWith('card-1', {
        reaction_type: 'thumbs_up',
      });
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.direct_reaction_count).toBe(initialCount + 1);
    });

    it('should block reaction when quota exceeded', async () => {
      vi.mocked(ReactionAPI.checkQuota).mockResolvedValue({
        ...mockReactionQuota,
        current_count: 10,
        can_react: false,
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.reactionQuota).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.handleAddReaction('card-1');
        })
      ).rejects.toThrow('Reaction limit reached');
    });

    it('should remove reaction with optimistic update', async () => {
      vi.mocked(ReactionAPI.removeReaction).mockResolvedValue();

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const initialCount =
        result.current.cards.find((c) => c.id === 'card-1')?.direct_reaction_count ?? 0;

      await act(async () => {
        await result.current.handleRemoveReaction('card-1');
      });

      expect(ReactionAPI.removeReaction).toHaveBeenCalledWith('card-1');
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.direct_reaction_count).toBe(initialCount - 1);
    });

    it('should rollback reaction removal on API error', async () => {
      vi.mocked(ReactionAPI.removeReaction).mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const initialCount =
        result.current.cards.find((c) => c.id === 'card-1')?.direct_reaction_count ?? 0;

      try {
        await act(async () => {
          await result.current.handleRemoveReaction('card-1');
        });
      } catch {
        // Expected
      }

      // Count should be rolled back
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.direct_reaction_count).toBe(initialCount);

      // Reset mock
      vi.mocked(ReactionAPI.removeReaction).mockResolvedValue();
    });

    it('should reject removing reaction on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleRemoveReaction('card-1');
        })
      ).rejects.toThrow('Cannot remove reaction on a closed board');
    });
  });

  // ============================================================================
  // Socket Event Tests
  // ============================================================================

  describe('Socket Events', () => {
    it('should subscribe to card events on mount', async () => {
      renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(socketService.on).toHaveBeenCalled();
      });

      expect(socketService.on).toHaveBeenCalledWith('card:created', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('card:updated', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('card:deleted', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('card:moved', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('reaction:added', expect.any(Function));
      expect(socketService.on).toHaveBeenCalledWith('reaction:removed', expect.any(Function));
    });

    it('should unsubscribe from socket events on unmount', async () => {
      const { result, unmount } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(socketService.off).toHaveBeenCalledWith('card:created', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('card:updated', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('card:deleted', expect.any(Function));
    });
  });

  // ============================================================================
  // CardsByColumn Tests
  // ============================================================================

  describe('cardsByColumn', () => {
    it('should organize cards by column', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const cardsByCol = result.current.cardsByColumn;

      expect(cardsByCol.get('col-1')).toBeDefined();
      expect(cardsByCol.get('col-2')).toBeDefined();
      expect(cardsByCol.get('col-3')).toBeDefined();

      // Only parent cards should be in the column map
      expect(cardsByCol.get('col-1')?.length).toBe(1);
      expect(cardsByCol.get('col-1')?.[0].id).toBe('card-1');
    });
  });

  // ============================================================================
  // Error Path Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle quota fetch errors gracefully', async () => {
      // Reset mocks to ensure clean state
      vi.mocked(CardAPI.checkCardQuota).mockRejectedValue(new Error('Quota fetch failed'));
      vi.mocked(ReactionAPI.checkQuota).mockRejectedValue(new Error('Reaction quota failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still load cards even if quota fails
      expect(result.current.cards.length).toBe(3);
      // Quota should remain null on error (errors are silently caught)
      expect(result.current.cardQuota).toBeNull();
      expect(result.current.reactionQuota).toBeNull();

      // Restore mocks for subsequent tests
      vi.mocked(CardAPI.checkCardQuota).mockResolvedValue(mockCardQuota);
      vi.mocked(ReactionAPI.checkQuota).mockResolvedValue(mockReactionQuota);
    });

    it('should handle move card API error', async () => {
      vi.mocked(CardAPI.moveCard).mockRejectedValue(new Error('Move failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const originalColumnId = result.current.cards.find((c) => c.id === 'card-1')?.column_id;

      try {
        await act(async () => {
          await result.current.handleMoveCard('card-1', 'col-2');
        });
      } catch {
        // Expected
      }

      // Column should be rolled back
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.column_id).toBe(originalColumnId);
    });

    it('should handle link cards API error', async () => {
      vi.mocked(CardAPI.linkCards).mockRejectedValue(new Error('Link failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleLinkParentChild('card-1', 'card-2');
        })
      ).rejects.toThrow('Link failed');
    });

    it('should handle action link API error', async () => {
      vi.mocked(CardAPI.linkCards).mockRejectedValue(new Error('Action link failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleLinkActionToFeedback('card-3', 'card-1');
        })
      ).rejects.toThrow('Action link failed');
    });

    it('should handle reaction add API error with rollback', async () => {
      vi.mocked(ReactionAPI.addReaction).mockRejectedValue(new Error('Reaction failed'));

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      const initialCount =
        result.current.cards.find((c) => c.id === 'card-1')?.direct_reaction_count ?? 0;

      try {
        await act(async () => {
          await result.current.handleAddReaction('card-1');
        });
      } catch {
        // Expected
      }

      // Reaction count should be rolled back
      const card = result.current.cards.find((c) => c.id === 'card-1');
      expect(card?.direct_reaction_count).toBe(initialCount);

      // Reset mock for subsequent tests
      vi.mocked(ReactionAPI.addReaction).mockResolvedValue({
        id: 'reaction-1',
        card_id: 'card-1',
        user_cookie_hash: 'hash-user-1',
        user_alias: 'User 1',
        reaction_type: 'thumbs_up',
        created_at: new Date().toISOString(),
      });
    });

    it('should reject update on non-existent card', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleUpdateCard('non-existent', 'New content');
        })
      ).rejects.toThrow('Card not found');
    });

    it('should reject delete on non-existent card', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleDeleteCard('non-existent');
        })
      ).rejects.toThrow('Card not found');
    });

    it('should reject move on non-existent card', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleMoveCard('non-existent', 'col-2');
        })
      ).rejects.toThrow('Card not found');
    });

    it('should reject update on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleUpdateCard('card-1', 'Updated content');
        })
      ).rejects.toThrow('Cannot update card on a closed board');
    });

    it('should reject delete on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleDeleteCard('card-1');
        })
      ).rejects.toThrow('Cannot delete card on a closed board');
    });

    it('should reject move on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleMoveCard('card-1', 'col-2');
        })
      ).rejects.toThrow('Cannot move card on a closed board');
    });

    it('should reject reaction on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleAddReaction('card-1');
        })
      ).rejects.toThrow('Cannot add reaction on a closed board');
    });

    it('should reject linking on closed board', async () => {
      useBoardStore.setState({
        board: { ...mockBoard, state: 'closed', closed_at: '2025-12-28T12:00:00Z' },
      });

      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleLinkParentChild('card-1', 'card-2');
        })
      ).rejects.toThrow('Cannot link cards on a closed board');
    });
  });

  // ============================================================================
  // Validation Edge Cases
  // ============================================================================

  describe('Validation Edge Cases', () => {
    it('should reject content exceeding max length', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const longContent = 'a'.repeat(501);

      await expect(
        act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: longContent,
            card_type: 'feedback',
          });
        })
      ).rejects.toThrow();
    });

    it('should reject whitespace-only content', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.handleCreateCard({
            column_id: 'col-1',
            content: '   \t\n  ',
            card_type: 'feedback',
          });
        })
      ).rejects.toThrow('Card content is required');
    });

    it('should reject update with empty content', async () => {
      const { result } = renderHook(() => useCardViewModel('board-123'));

      await waitFor(() => {
        expect(result.current.cards.length).toBe(3);
      });

      await expect(
        act(async () => {
          await result.current.handleUpdateCard('card-1', '');
        })
      ).rejects.toThrow();
    });
  });
});
