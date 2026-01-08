/**
 * Card-related TypeScript types
 * Matches the backend API specification
 */

// ============================================================================
// Card Types
// ============================================================================

export type CardType = 'feedback' | 'action';

export type LinkType = 'parent_of' | 'linked_to';

export interface Card {
  id: string;
  board_id: string;
  column_id: string;
  content: string;
  card_type: CardType;
  is_anonymous: boolean;
  created_by_hash: string;
  created_by_alias: string | null;
  created_at: string;
  updated_at?: string;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  parent_card_id: string | null;
  linked_feedback_ids: string[];
  // Embedded relationships (when include_relationships=true)
  children?: CardChild[];
  linked_feedback_cards?: LinkedFeedbackCard[];
}

export interface CardChild {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_by_alias: string | null;
  created_at: string;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
}

export interface LinkedFeedbackCard {
  id: string;
  content: string;
  created_by_alias: string | null;
  created_at: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateCardDTO {
  column_id: string;
  content: string;
  card_type: CardType;
  is_anonymous?: boolean;
  /** Optional correlation ID for optimistic update deduplication */
  correlation_id?: string;
}

export interface UpdateCardDTO {
  content: string;
}

export interface MoveCardDTO {
  column_id: string;
}

export interface LinkCardsDTO {
  target_card_id: string;
  link_type: LinkType;
}

export interface UnlinkCardsDTO {
  target_card_id: string;
  link_type: LinkType;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CardsResponse {
  cards: Card[];
  total_count: number;
  cards_by_column: Record<string, number>;
}

export interface CardQuota {
  current_count: number;
  limit: number | null;
  can_create: boolean;
  limit_enabled: boolean;
}

export type CreateCardResponse = Card;

export interface UpdateCardResponse {
  id: string;
  content: string;
  updated_at: string;
}

export interface MoveCardResponse {
  id: string;
  column_id: string;
}

export interface LinkCardsResponse {
  source_card_id: string;
  target_card_id: string;
  link_type: LinkType;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface GetCardsParams {
  column_id?: string;
  created_by?: string;
  include_relationships?: boolean;
}
