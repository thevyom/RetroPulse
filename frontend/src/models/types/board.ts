/**
 * Board-related TypeScript types
 * Matches the backend API specification
 */

import type { ActiveUser, UserSession } from './user';

// Re-export user types that are used in board context
export type { ActiveUser, UserSession };

// ============================================================================
// Column Types
// ============================================================================

export interface Column {
  id: string;
  name: string;
  color: string;
}

// ============================================================================
// Board Types
// ============================================================================

export type BoardState = 'active' | 'closed';

export interface Board {
  id: string;
  name: string;
  shareable_link: string;
  state: BoardState;
  closed_at: string | null;
  columns: Column[];
  admins: string[];
  active_users: ActiveUser[];
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
  created_at: string;
  created_by_hash: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateBoardDTO {
  name: string;
  columns: Omit<Column, 'id'>[];
  card_limit_per_user?: number | null;
  reaction_limit_per_user?: number | null;
}

export interface JoinBoardDTO {
  alias: string;
}

export interface UpdateBoardNameDTO {
  name: string;
}

export interface RenameColumnDTO {
  name: string;
}

export interface AddAdminDTO {
  user_cookie_hash: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface BoardResponse {
  id: string;
  name: string;
  shareable_link: string;
  state: BoardState;
  columns: Column[];
  created_at: string;
  created_by_hash: string;
  admins: string[];
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
}

export interface JoinBoardResponse {
  board_id: string;
  user_session: UserSession;
}

export interface UpdateBoardNameResponse {
  id: string;
  name: string;
}

export interface CloseBoardResponse {
  id: string;
  state: 'closed';
  closed_at: string;
}

export interface AddAdminResponse {
  board_id: string;
  admins: string[];
}

export interface RenameColumnResponse {
  board_id: string;
  column_id: string;
  name: string;
}
