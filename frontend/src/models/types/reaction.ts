/**
 * Reaction-related TypeScript types
 * Matches the backend API specification
 */

// ============================================================================
// Reaction Types
// ============================================================================

export type ReactionType = 'thumbs_up';

export interface Reaction {
  id: string;
  card_id: string;
  user_cookie_hash: string;
  user_alias: string;
  reaction_type: ReactionType;
  created_at: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface AddReactionDTO {
  reaction_type: ReactionType;
}

// ============================================================================
// API Response Types
// ============================================================================

export type AddReactionResponse = Reaction;

export interface ReactionQuota {
  current_count: number;
  limit: number | null;
  can_react: boolean;
  limit_enabled: boolean;
}
