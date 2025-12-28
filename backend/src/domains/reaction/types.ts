import { ObjectId } from 'mongodb';

/**
 * Reaction type enum - currently only thumbs_up, extensible for future types
 */
export type ReactionType = 'thumbs_up';

/**
 * Reaction document as stored in MongoDB
 */
export interface ReactionDocument {
  _id: ObjectId;
  card_id: ObjectId;
  user_cookie_hash: string;
  user_alias: string | null;
  reaction_type: ReactionType;
  created_at: Date;
}

/**
 * Reaction response for API (without internal fields)
 */
export interface Reaction {
  id: string;
  card_id: string;
  user_cookie_hash: string;
  user_alias: string | null;
  reaction_type: ReactionType;
  created_at: string;
}

/**
 * Input for adding a reaction
 */
export interface AddReactionInput {
  reaction_type: ReactionType;
}

/**
 * Reaction quota information
 */
export interface ReactionQuota {
  current_count: number;
  limit: number | null;
  can_react: boolean;
  limit_enabled: boolean;
}

/**
 * Convert MongoDB document to API response
 */
export function reactionDocumentToReaction(doc: ReactionDocument): Reaction {
  return {
    id: doc._id.toHexString(),
    card_id: doc.card_id.toHexString(),
    user_cookie_hash: doc.user_cookie_hash,
    user_alias: doc.user_alias,
    reaction_type: doc.reaction_type,
    created_at: doc.created_at.toISOString(),
  };
}
