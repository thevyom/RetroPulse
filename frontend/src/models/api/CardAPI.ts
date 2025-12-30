/**
 * Card API Service
 * Handles all card-related HTTP operations
 */

import { apiClient, extractData } from './client';
import type {
  ApiResponse,
  Card,
  CardsResponse,
  CreateCardDTO,
  CreateCardResponse,
  UpdateCardDTO,
  UpdateCardResponse,
  MoveCardDTO,
  MoveCardResponse,
  LinkCardsDTO,
  LinkCardsResponse,
  UnlinkCardsDTO,
  CardQuota,
  GetCardsParams,
} from '../types';

// ============================================================================
// Card API Service
// ============================================================================

export const CardAPI = {
  /**
   * Get all cards for a board
   * @param boardId - The board ID
   * @param params - Optional query parameters
   * @returns Cards with metadata
   */
  async getCards(boardId: string, params?: GetCardsParams): Promise<CardsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.column_id) {
      queryParams.set('column_id', params.column_id);
    }
    if (params?.created_by) {
      queryParams.set('created_by', params.created_by);
    }
    if (params?.include_relationships !== undefined) {
      queryParams.set('include_relationships', String(params.include_relationships));
    }

    const queryString = queryParams.toString();
    const url = `/boards/${boardId}/cards${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ApiResponse<CardsResponse>>(url);
    return extractData(response);
  },

  /**
   * Check card creation quota for current user
   * @param boardId - The board ID
   * @returns Quota information
   */
  async checkCardQuota(boardId: string): Promise<CardQuota> {
    const response = await apiClient.get<ApiResponse<CardQuota>>(`/boards/${boardId}/cards/quota`);
    return extractData(response);
  },

  /**
   * Create a new card
   * @param boardId - The board ID
   * @param data - Card data
   * @returns The created card
   */
  async createCard(boardId: string, data: CreateCardDTO): Promise<CreateCardResponse> {
    const response = await apiClient.post<ApiResponse<CreateCardResponse>>(
      `/boards/${boardId}/cards`,
      data
    );
    return extractData(response);
  },

  /**
   * Update card content (creator only)
   * @param cardId - The card ID
   * @param data - New content
   * @returns Updated card info
   */
  async updateCard(cardId: string, data: UpdateCardDTO): Promise<UpdateCardResponse> {
    const response = await apiClient.put<ApiResponse<UpdateCardResponse>>(`/cards/${cardId}`, data);
    return extractData(response);
  },

  /**
   * Delete a card (creator only)
   * @param cardId - The card ID
   */
  async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(`/cards/${cardId}`);
  },

  /**
   * Move card to a different column (creator only)
   * @param cardId - The card ID
   * @param data - New column ID
   * @returns Updated card info
   */
  async moveCard(cardId: string, data: MoveCardDTO): Promise<MoveCardResponse> {
    const response = await apiClient.patch<ApiResponse<MoveCardResponse>>(
      `/cards/${cardId}/column`,
      data
    );
    return extractData(response);
  },

  /**
   * Link two cards (parent-child or action-feedback)
   * @param sourceCardId - The source card ID
   * @param data - Target card and link type
   * @returns Link confirmation
   */
  async linkCards(sourceCardId: string, data: LinkCardsDTO): Promise<LinkCardsResponse> {
    const response = await apiClient.post<ApiResponse<LinkCardsResponse>>(
      `/cards/${sourceCardId}/link`,
      data
    );
    return extractData(response);
  },

  /**
   * Unlink two cards
   * @param sourceCardId - The source card ID
   * @param data - Target card and link type
   */
  async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
    await apiClient.delete(`/cards/${sourceCardId}/link`, { data });
  },

  /**
   * Get a single card by ID
   * @param cardId - The card ID
   * @returns The card
   */
  async getCard(cardId: string): Promise<Card> {
    const response = await apiClient.get<ApiResponse<Card>>(`/cards/${cardId}`);
    return extractData(response);
  },
};

export type CardAPIType = typeof CardAPI;
