import { ObjectId } from 'mongodb';

/**
 * Board state enum
 */
export type BoardState = 'active' | 'closed';

/**
 * Column within a board
 */
export interface Column {
  id: string;
  name: string;
  color?: string;
}

/**
 * Board document as stored in MongoDB
 */
export interface BoardDocument {
  _id: ObjectId;
  name: string;
  columns: Column[];
  shareable_link: string;
  state: BoardState;
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
  created_by_hash: string;
  admins: string[]; // Array of cookie hashes
  created_at: Date;
  closed_at: Date | null;
}

/**
 * Board response for API (without internal fields)
 */
export interface Board {
  id: string;
  name: string;
  columns: Column[];
  shareable_link: string;
  state: BoardState;
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
  admins: string[];
  created_at: string;
  closed_at: string | null;
}

/**
 * Board with active users for GET /boards/:id response
 */
export interface BoardWithUsers extends Board {
  active_users: ActiveUser[];
}

/**
 * Active user in a board
 */
export interface ActiveUser {
  cookie_hash: string;
  alias: string;
  is_admin: boolean;
  last_active_at: string;
}

/**
 * Input for creating a new board
 */
export interface CreateBoardInput {
  name: string;
  columns: Column[];
  card_limit_per_user?: number | null;
  reaction_limit_per_user?: number | null;
}

/**
 * Input for updating board name
 */
export interface UpdateBoardNameInput {
  name: string;
}

/**
 * Input for renaming a column
 */
export interface RenameColumnInput {
  name: string;
}

/**
 * Convert MongoDB document to API response
 */
export function boardDocumentToBoard(doc: BoardDocument): Board {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    columns: doc.columns,
    shareable_link: doc.shareable_link,
    state: doc.state,
    card_limit_per_user: doc.card_limit_per_user,
    reaction_limit_per_user: doc.reaction_limit_per_user,
    admins: doc.admins,
    created_at: doc.created_at.toISOString(),
    closed_at: doc.closed_at ? doc.closed_at.toISOString() : null,
  };
}
