import { ObjectId } from 'mongodb';

/**
 * User session document as stored in MongoDB
 */
export interface UserSessionDocument {
  _id: ObjectId;
  board_id: ObjectId;
  cookie_hash: string;
  alias: string;
  last_active_at: Date;
  created_at: Date;
}

/**
 * User session for API response
 */
export interface UserSession {
  board_id: string;
  cookie_hash: string;
  alias: string;
  is_admin: boolean;
  last_active_at: string;
  created_at: string;
}

/**
 * Active user in a board (used in GET /boards/:id/users response)
 */
export interface ActiveUser {
  cookie_hash: string;
  alias: string;
  is_admin: boolean;
  last_active_at: string;
  created_at: string;
}

/**
 * Input for joining a board
 */
export interface JoinBoardInput {
  alias: string;
}

/**
 * Input for updating user alias
 */
export interface UpdateAliasInput {
  alias: string;
}

/**
 * Convert MongoDB document to API response format
 */
export function userSessionDocumentToUserSession(
  doc: UserSessionDocument,
  isAdmin: boolean
): UserSession {
  return {
    board_id: doc.board_id.toHexString(),
    cookie_hash: doc.cookie_hash,
    alias: doc.alias,
    is_admin: isAdmin,
    last_active_at: doc.last_active_at.toISOString(),
    created_at: doc.created_at.toISOString(),
  };
}

/**
 * Convert MongoDB document to ActiveUser format
 */
export function userSessionDocumentToActiveUser(
  doc: UserSessionDocument,
  isAdmin: boolean
): ActiveUser {
  return {
    cookie_hash: doc.cookie_hash,
    alias: doc.alias,
    is_admin: isAdmin,
    last_active_at: doc.last_active_at.toISOString(),
    created_at: doc.created_at.toISOString(),
  };
}
