import { ObjectId } from 'mongodb';

/**
 * Card type enum
 */
export type CardType = 'feedback' | 'action';

/**
 * Link type enum for card relationships
 */
export type LinkType = 'parent_of' | 'linked_to';

/**
 * Card document as stored in MongoDB
 */
export interface CardDocument {
  _id: ObjectId;
  board_id: ObjectId;
  column_id: string;
  content: string;
  card_type: CardType;
  is_anonymous: boolean;
  created_by_hash: string;
  created_by_alias: string | null;
  created_at: Date;
  updated_at: Date | null;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  parent_card_id: ObjectId | null;
  linked_feedback_ids: ObjectId[];
}

/**
 * Card response for API (without internal fields)
 */
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
  updated_at: string | null;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  parent_card_id: string | null;
  linked_feedback_ids: string[];
}

/**
 * Child card (embedded in parent card response)
 */
export interface ChildCard {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_by_alias: string | null;
  created_at: string;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
}

/**
 * Linked feedback card (embedded in action card response)
 */
export interface LinkedFeedbackCard {
  id: string;
  content: string;
  created_by_alias: string | null;
  created_at: string;
}

/**
 * Card with embedded relationships for GET /boards/:id/cards response
 */
export interface CardWithRelationships extends Card {
  children: ChildCard[];
  linked_feedback_cards: LinkedFeedbackCard[];
}

/**
 * Cards response with summary statistics
 */
export interface CardsResponse {
  cards: CardWithRelationships[];
  total_count: number;
  cards_by_column: Record<string, number>;
}

/**
 * Input for creating a new card
 */
export interface CreateCardInput {
  column_id: string;
  content: string;
  card_type: CardType;
  is_anonymous?: boolean;
}

/**
 * Input for updating a card
 */
export interface UpdateCardInput {
  content: string;
}

/**
 * Input for moving a card to a different column
 */
export interface MoveCardInput {
  column_id: string;
}

/**
 * Input for linking cards
 */
export interface LinkCardsInput {
  target_card_id: string;
  link_type: LinkType;
}

/**
 * Card quota information
 */
export interface CardQuota {
  current_count: number;
  limit: number | null;
  can_create: boolean;
  limit_enabled: boolean;
}

/**
 * Convert MongoDB document to API response
 */
export function cardDocumentToCard(doc: CardDocument): Card {
  return {
    id: doc._id.toHexString(),
    board_id: doc.board_id.toHexString(),
    column_id: doc.column_id,
    content: doc.content,
    card_type: doc.card_type,
    is_anonymous: doc.is_anonymous,
    created_by_hash: doc.created_by_hash,
    created_by_alias: doc.created_by_alias,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at ? doc.updated_at.toISOString() : null,
    direct_reaction_count: doc.direct_reaction_count,
    aggregated_reaction_count: doc.aggregated_reaction_count,
    parent_card_id: doc.parent_card_id ? doc.parent_card_id.toHexString() : null,
    linked_feedback_ids: doc.linked_feedback_ids.map((id) => id.toHexString()),
  };
}

/**
 * Convert MongoDB document to ChildCard format
 */
export function cardDocumentToChildCard(doc: CardDocument): ChildCard {
  return {
    id: doc._id.toHexString(),
    content: doc.content,
    is_anonymous: doc.is_anonymous,
    created_by_alias: doc.created_by_alias,
    created_at: doc.created_at.toISOString(),
    direct_reaction_count: doc.direct_reaction_count,
    aggregated_reaction_count: doc.aggregated_reaction_count,
  };
}

/**
 * Convert MongoDB document to LinkedFeedbackCard format
 */
export function cardDocumentToLinkedFeedbackCard(doc: CardDocument): LinkedFeedbackCard {
  return {
    id: doc._id.toHexString(),
    content: doc.content,
    created_by_alias: doc.created_by_alias,
    created_at: doc.created_at.toISOString(),
  };
}
