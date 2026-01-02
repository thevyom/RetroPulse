/**
 * CardAPI Service Tests
 * Tests for card-related API operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardAPI } from '@/models/api/CardAPI';
import { apiClient } from '@/models/api/client';
import type { Card, CardsResponse, CardQuota } from '@/models/types';

// Mock the API client
vi.mock('@/models/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  extractData: <T>(response: { data: { data: T } }) => response.data.data,
}));

describe('CardAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockCard: Card = {
    id: 'card-123',
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

  const mockCardsResponse: CardsResponse = {
    cards: [mockCard],
    total_count: 1,
    cards_by_column: { 'col-1': 1 },
  };

  // ============================================================================
  // getCards Tests
  // ============================================================================

  describe('getCards', () => {
    it('should make GET request with correct URL', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCardsResponse },
      });

      await CardAPI.getCards('board-123');

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123/cards');
    });

    it('should include column_id query parameter when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCardsResponse },
      });

      await CardAPI.getCards('board-123', { column_id: 'col-1' });

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123/cards?column_id=col-1');
    });

    it('should include include_relationships query parameter', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCardsResponse },
      });

      await CardAPI.getCards('board-123', { include_relationships: true });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/boards/board-123/cards?include_relationships=true'
      );
    });

    it('should return cards with metadata', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCardsResponse },
      });

      const result = await CardAPI.getCards('board-123');

      expect(result.cards).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.cards_by_column).toEqual({ 'col-1': 1 });
    });
  });

  // ============================================================================
  // checkCardQuota Tests
  // ============================================================================

  describe('checkCardQuota', () => {
    const mockQuota: CardQuota = {
      current_count: 3,
      limit: 5,
      can_create: true,
      limit_enabled: true,
    };

    it('should make GET request for quota', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockQuota },
      });

      await CardAPI.checkCardQuota('board-123');

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123/cards/quota');
    });

    it('should return quota information', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockQuota },
      });

      const result = await CardAPI.checkCardQuota('board-123');

      expect(result.current_count).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.can_create).toBe(true);
      expect(result.limit_enabled).toBe(true);
    });

    it('should handle unlimited quota', async () => {
      const unlimitedQuota: CardQuota = {
        current_count: 10,
        limit: null,
        can_create: true,
        limit_enabled: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: unlimitedQuota },
      });

      const result = await CardAPI.checkCardQuota('board-123');

      expect(result.limit).toBeNull();
      expect(result.limit_enabled).toBe(false);
    });
  });

  // ============================================================================
  // createCard Tests
  // ============================================================================

  describe('createCard', () => {
    it('should make POST request with correct payload', async () => {
      const createData = {
        column_id: 'col-1',
        content: 'New feedback',
        card_type: 'feedback' as const,
        is_anonymous: false,
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockCard },
      });

      await CardAPI.createCard('board-123', createData);

      expect(apiClient.post).toHaveBeenCalledWith('/boards/board-123/cards', createData);
    });

    it('should return created card', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockCard },
      });

      const result = await CardAPI.createCard('board-123', {
        column_id: 'col-1',
        content: 'New feedback',
        card_type: 'feedback',
      });

      expect(result.id).toBe('card-123');
      expect(result.content).toBe('Great team collaboration!');
    });
  });

  // ============================================================================
  // updateCard Tests
  // ============================================================================

  describe('updateCard', () => {
    it('should make PUT request with content', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'card-123',
            content: 'Updated content',
            updated_at: '2025-12-29T12:00:00Z',
          },
        },
      });

      await CardAPI.updateCard('card-123', { content: 'Updated content' });

      expect(apiClient.put).toHaveBeenCalledWith('/cards/card-123', {
        content: 'Updated content',
      });
    });

    it('should return updated card info', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'card-123',
            content: 'Updated content',
            updated_at: '2025-12-29T12:00:00Z',
          },
        },
      });

      const result = await CardAPI.updateCard('card-123', {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
      expect(result.updated_at).toBeDefined();
    });
  });

  // ============================================================================
  // deleteCard Tests
  // ============================================================================

  describe('deleteCard', () => {
    it('should make DELETE request', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

      await CardAPI.deleteCard('card-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/cards/card-123');
    });
  });

  // ============================================================================
  // moveCard Tests
  // ============================================================================

  describe('moveCard', () => {
    it('should make PATCH request with new column', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { success: true, data: { id: 'card-123', column_id: 'col-2' } },
      });

      await CardAPI.moveCard('card-123', { column_id: 'col-2' });

      expect(apiClient.patch).toHaveBeenCalledWith('/cards/card-123/column', {
        column_id: 'col-2',
      });
    });

    it('should return updated card info', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { success: true, data: { id: 'card-123', column_id: 'col-2' } },
      });

      const result = await CardAPI.moveCard('card-123', { column_id: 'col-2' });

      expect(result.column_id).toBe('col-2');
    });
  });

  // ============================================================================
  // linkCards Tests
  // ============================================================================

  describe('linkCards', () => {
    it('should make POST request for parent_of link', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          data: {
            source_card_id: 'parent-123',
            target_card_id: 'child-123',
            link_type: 'parent_of',
          },
        },
      });

      await CardAPI.linkCards('parent-123', {
        target_card_id: 'child-123',
        link_type: 'parent_of',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/cards/parent-123/link', {
        target_card_id: 'child-123',
        link_type: 'parent_of',
      });
    });

    it('should make POST request for linked_to link', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: {
          success: true,
          data: {
            source_card_id: 'action-123',
            target_card_id: 'feedback-123',
            link_type: 'linked_to',
          },
        },
      });

      await CardAPI.linkCards('action-123', {
        target_card_id: 'feedback-123',
        link_type: 'linked_to',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/cards/action-123/link', {
        target_card_id: 'feedback-123',
        link_type: 'linked_to',
      });
    });
  });

  // ============================================================================
  // unlinkCards Tests
  // ============================================================================

  describe('unlinkCards', () => {
    it('should make POST request to /unlink endpoint with link data (UTB-024 fix)', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

      await CardAPI.unlinkCards('parent-123', {
        target_card_id: 'child-123',
        link_type: 'parent_of',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/cards/parent-123/unlink', {
        target_card_id: 'child-123',
        link_type: 'parent_of',
      });
    });

    it('should unlink action card from feedback card', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

      await CardAPI.unlinkCards('action-123', {
        target_card_id: 'feedback-123',
        link_type: 'linked_to',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/cards/action-123/unlink', {
        target_card_id: 'feedback-123',
        link_type: 'linked_to',
      });
    });
  });

  // ============================================================================
  // getCard Tests
  // ============================================================================

  describe('getCard', () => {
    it('should make GET request for single card', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCard },
      });

      await CardAPI.getCard('card-123');

      expect(apiClient.get).toHaveBeenCalledWith('/cards/card-123');
    });

    it('should return card data', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockCard },
      });

      const result = await CardAPI.getCard('card-123');

      expect(result.id).toBe('card-123');
      expect(result.content).toBe('Great team collaboration!');
    });
  });
});
