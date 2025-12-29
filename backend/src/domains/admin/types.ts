/**
 * Admin domain types for testing APIs
 */

/**
 * Result of clearing board data
 */
export interface ClearBoardResult {
  cards_deleted: number;
  reactions_deleted: number;
  sessions_deleted: number;
}

/**
 * Result of resetting a board
 */
export interface ResetBoardResult extends ClearBoardResult {
  board_reopened: boolean;
}

/**
 * Input for seeding test data
 */
export interface SeedTestDataInput {
  num_users: number;
  num_cards: number;
  num_action_cards: number;
  num_reactions: number;
  create_relationships: boolean;
}

/**
 * Result of seeding test data
 */
export interface SeedTestDataResult {
  users_created: number;
  cards_created: number;
  action_cards_created: number;
  reactions_created: number;
  relationships_created: number;
  user_aliases: string[];
}
