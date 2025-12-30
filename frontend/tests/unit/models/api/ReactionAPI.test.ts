/**
 * ReactionAPI Service Tests
 * Tests for reaction-related API operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactionAPI } from '@/models/api/ReactionAPI';
import { apiClient } from '@/models/api/client';
import type { AddReactionResponse, ReactionQuota } from '@/models/types';

// Mock the API client
vi.mock('@/models/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  extractData: <T>(response: { data: { data: T } }) => response.data.data,
}));

describe('ReactionAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Data
  // ============================================================================

  const mockReaction: AddReactionResponse = {
    id: 'reaction-123',
    card_id: 'card-123',
    user_cookie_hash: 'user-hash',
    user_alias: 'Alice',
    reaction_type: 'thumbs_up',
    created_at: '2025-12-29T00:00:00Z',
  };

  const mockQuota: ReactionQuota = {
    current_count: 7,
    limit: 10,
    can_react: true,
    limit_enabled: true,
  };

  // ============================================================================
  // addReaction Tests
  // ============================================================================

  describe('addReaction', () => {
    it('should make POST request with reaction type', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockReaction },
      });

      await ReactionAPI.addReaction('card-123', { reaction_type: 'thumbs_up' });

      expect(apiClient.post).toHaveBeenCalledWith('/cards/card-123/reactions', {
        reaction_type: 'thumbs_up',
      });
    });

    it('should return created reaction', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { success: true, data: mockReaction },
      });

      const result = await ReactionAPI.addReaction('card-123', {
        reaction_type: 'thumbs_up',
      });

      expect(result.id).toBe('reaction-123');
      expect(result.card_id).toBe('card-123');
      expect(result.reaction_type).toBe('thumbs_up');
      expect(result.user_alias).toBe('Alice');
    });
  });

  // ============================================================================
  // removeReaction Tests
  // ============================================================================

  describe('removeReaction', () => {
    it('should make DELETE request', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

      await ReactionAPI.removeReaction('card-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/cards/card-123/reactions');
    });
  });

  // ============================================================================
  // checkQuota Tests
  // ============================================================================

  describe('checkQuota', () => {
    it('should make GET request for quota', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockQuota },
      });

      await ReactionAPI.checkQuota('board-123');

      expect(apiClient.get).toHaveBeenCalledWith('/boards/board-123/reactions/quota');
    });

    it('should return quota information', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: mockQuota },
      });

      const result = await ReactionAPI.checkQuota('board-123');

      expect(result.current_count).toBe(7);
      expect(result.limit).toBe(10);
      expect(result.can_react).toBe(true);
      expect(result.limit_enabled).toBe(true);
    });

    it('should handle unlimited quota', async () => {
      const unlimitedQuota: ReactionQuota = {
        current_count: 15,
        limit: null,
        can_react: true,
        limit_enabled: false,
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: unlimitedQuota },
      });

      const result = await ReactionAPI.checkQuota('board-123');

      expect(result.limit).toBeNull();
      expect(result.limit_enabled).toBe(false);
    });

    it('should handle quota at limit', async () => {
      const atLimitQuota: ReactionQuota = {
        current_count: 10,
        limit: 10,
        can_react: false,
        limit_enabled: true,
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, data: atLimitQuota },
      });

      const result = await ReactionAPI.checkQuota('board-123');

      expect(result.current_count).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.can_react).toBe(false);
    });
  });
});
