/**
 * Parent-Child Linking Integration Tests with MSW
 *
 * Tests the card linking flow with real ViewModels and mocked API.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { server, resetMockData } from '../mocks/server';
import { createMockCard, setMockCards } from '../mocks/handlers';
import { useCardViewModel } from '@/features/card/viewmodels/useCardViewModel';
import { useDragDropViewModel } from '@/features/card/viewmodels/useDragDropViewModel';
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

describe('Parent-Child Linking Integration', () => {
  const boardId = 'board-123';

  describe('Link Validation', () => {
    it('validates feedback → feedback linking', async () => {
      const parentCard = createMockCard({ id: 'parent-card', card_type: 'feedback' });
      const childCard = createMockCard({ id: 'child-card', card_type: 'feedback' });
      setMockCards([parentCard, childCard]);

      // Add cards to store for validation
      useCardStore.setState({
        cards: new Map([
          ['parent-card', parentCard],
          ['child-card', childCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('child-card', 'feedback');
      });

      let isValid;
      act(() => {
        isValid = result.current.handleDragOver('parent-card', 'card');
      });

      expect(isValid).toBe(true);
      expect(result.current.isValidDrop).toBe(true);
    });

    it('rejects feedback → action linking', async () => {
      const feedbackCard = createMockCard({ id: 'feedback-card', card_type: 'feedback' });
      const actionCard = createMockCard({ id: 'action-card', card_type: 'action' });
      setMockCards([feedbackCard, actionCard]);

      useCardStore.setState({
        cards: new Map([
          ['feedback-card', feedbackCard],
          ['action-card', actionCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('feedback-card', 'feedback');
      });

      let isValid;
      act(() => {
        isValid = result.current.handleDragOver('action-card', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Cannot drop feedback on action card');
    });

    it('allows action → feedback linking', async () => {
      const actionCard = createMockCard({ id: 'action-card', card_type: 'action' });
      const feedbackCard = createMockCard({ id: 'feedback-card', card_type: 'feedback' });
      setMockCards([actionCard, feedbackCard]);

      useCardStore.setState({
        cards: new Map([
          ['action-card', actionCard],
          ['feedback-card', feedbackCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action-card', 'action');
      });

      let isValid;
      act(() => {
        isValid = result.current.handleDragOver('feedback-card', 'card');
      });

      expect(isValid).toBe(true);
    });
  });

  describe('Link Creation', () => {
    it('creates parent-child link via API', async () => {
      const parentCard = createMockCard({ id: 'parent-card', card_type: 'feedback' });
      const childCard = createMockCard({ id: 'child-card', card_type: 'feedback' });
      setMockCards([parentCard, childCard]);

      const { result } = renderHook(() => useCardViewModel(boardId));

      // Wait for initial card load
      await act(async () => {
        await result.current.refetchCards();
      });

      // Link child to parent
      await act(async () => {
        await result.current.handleLinkParentChild('parent-card', 'child-card');
      });

      // Reload cards to get updated data
      await act(async () => {
        await result.current.refetchCards();
      });

      // Child should now have parent_card_id
      const linkedChild = result.current.cards.find((c) => c.id === 'child-card');
      expect(linkedChild?.parent_card_id).toBe('parent-card');
    });

    it('creates action-feedback link via API', async () => {
      const actionCard = createMockCard({
        id: 'action-card',
        card_type: 'action',
        linked_feedback_ids: [],
      });
      const feedbackCard = createMockCard({ id: 'feedback-card', card_type: 'feedback' });
      setMockCards([actionCard, feedbackCard]);

      const { result } = renderHook(() => useCardViewModel(boardId));

      // Wait for initial card load
      await act(async () => {
        await result.current.refetchCards();
      });

      // Link action to feedback
      await act(async () => {
        await result.current.handleLinkActionToFeedback('action-card', 'feedback-card');
      });

      // Reload cards to get updated data
      await act(async () => {
        await result.current.refetchCards();
      });

      // Action should have feedback in linked_feedback_ids
      const linkedAction = result.current.cards.find((c) => c.id === 'action-card');
      expect(linkedAction?.linked_feedback_ids).toContain('feedback-card');
    });
  });

  describe('Link Removal', () => {
    it('unlinks child from parent', async () => {
      const parentCard = createMockCard({ id: 'parent-card', card_type: 'feedback' });
      const childCard = createMockCard({
        id: 'child-card',
        card_type: 'feedback',
        parent_card_id: 'parent-card',
      });
      setMockCards([parentCard, childCard]);

      const { result } = renderHook(() => useCardViewModel(boardId));

      // Wait for initial card load
      await act(async () => {
        await result.current.refetchCards();
      });

      // Verify child is linked
      const linkedChild = result.current.cards.find((c) => c.id === 'child-card');
      expect(linkedChild?.parent_card_id).toBe('parent-card');

      // Unlink child
      await act(async () => {
        await result.current.handleUnlinkChild('child-card');
      });

      // Reload and verify unlinked
      await act(async () => {
        await result.current.refetchCards();
      });

      const unlinkedChild = result.current.cards.find((c) => c.id === 'child-card');
      expect(unlinkedChild?.parent_card_id).toBeNull();
    });
  });

  describe('Circular Relationship Prevention', () => {
    it('prevents circular parent-child relationships', async () => {
      const parentCard = createMockCard({ id: 'parent', card_type: 'feedback' });
      const childCard = createMockCard({
        id: 'child',
        card_type: 'feedback',
        parent_card_id: 'parent',
      });

      useCardStore.setState({
        cards: new Map([
          ['parent', parentCard],
          ['child', childCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      // Try to drag parent onto its own child
      act(() => {
        result.current.handleDragStart('parent', 'feedback');
      });

      let isValid;
      act(() => {
        isValid = result.current.handleDragOver('child', 'card');
      });

      expect(isValid).toBe(false);
      expect(result.current.dropError).toBe('Circular relationship detected');
    });
  });

  describe('Drop Results', () => {
    it('returns correct drop result for parent-child', async () => {
      const parentCard = createMockCard({ id: 'parent', card_type: 'feedback' });
      const childCard = createMockCard({ id: 'child', card_type: 'feedback' });

      useCardStore.setState({
        cards: new Map([
          ['parent', parentCard],
          ['child', childCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('child', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('parent', 'card');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'link_parent_child',
        parentId: 'parent',
        childId: 'child',
      });
    });

    it('returns correct drop result for action-feedback link', async () => {
      const actionCard = createMockCard({ id: 'action', card_type: 'action' });
      const feedbackCard = createMockCard({ id: 'feedback', card_type: 'feedback' });

      useCardStore.setState({
        cards: new Map([
          ['action', actionCard],
          ['feedback', feedbackCard],
        ]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('action', 'action');
      });

      act(() => {
        result.current.handleDragOver('feedback', 'card');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'link_action',
        actionId: 'action',
        feedbackId: 'feedback',
      });
    });

    it('returns correct drop result for column move', async () => {
      const card = createMockCard({ id: 'card-to-move', card_type: 'feedback' });

      useCardStore.setState({
        cards: new Map([['card-to-move', card]]),
      });

      const { result } = renderHook(() => useDragDropViewModel());

      act(() => {
        result.current.handleDragStart('card-to-move', 'feedback');
      });

      act(() => {
        result.current.handleDragOver('col-2', 'column');
      });

      const dropResult = result.current.getDropResult();

      expect(dropResult).toEqual({
        action: 'move_to_column',
        cardId: 'card-to-move',
        columnId: 'col-2',
      });
    });
  });
});
