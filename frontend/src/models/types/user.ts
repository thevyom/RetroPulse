/**
 * User-related TypeScript types
 * Matches the backend API specification
 */

// ============================================================================
// User Types
// ============================================================================

export interface UserSession {
  cookie_hash: string;
  alias: string;
  is_admin: boolean;
  last_active_at: string;
  created_at: string;
}

export interface ActiveUser {
  alias: string;
  is_admin: boolean;
  last_active_at: string;
  created_at: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface UpdateAliasDTO {
  alias: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ActiveUsersResponse {
  active_users: ActiveUser[];
  total_count: number;
}

export interface HeartbeatResponse {
  alias: string;
  last_active_at: string;
}

export interface UpdateAliasResponse {
  alias: string;
  last_active_at: string;
}
