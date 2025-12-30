/**
 * Reaction API Service
 * Handles all reaction-related HTTP operations
 */

import { apiClient, extractData } from './client';
import type { ApiResponse, AddReactionDTO, AddReactionResponse, ReactionQuota } from '../types';

// ============================================================================
// Reaction API Service
// ============================================================================

export const ReactionAPI = {
  /**
   * Add a reaction to a card
   * @param cardId - The card ID
   * @param data - Reaction type
   * @returns The created reaction
   */
  async addReaction(cardId: string, data: AddReactionDTO): Promise<AddReactionResponse> {
    const response = await apiClient.post<ApiResponse<AddReactionResponse>>(
      `/cards/${cardId}/reactions`,
      data
    );
    return extractData(response);
  },

  /**
   * Remove reaction from a card
   * @param cardId - The card ID
   */
  async removeReaction(cardId: string): Promise<void> {
    await apiClient.delete(`/cards/${cardId}/reactions`);
  },

  /**
   * Check reaction quota for current user on a board
   * @param boardId - The board ID
   * @returns Quota information
   */
  async checkQuota(boardId: string): Promise<ReactionQuota> {
    const response = await apiClient.get<ApiResponse<ReactionQuota>>(
      `/boards/${boardId}/reactions/quota`
    );
    return extractData(response);
  },
};

export type ReactionAPIType = typeof ReactionAPI;
