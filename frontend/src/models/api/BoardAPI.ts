/**
 * Board API Service
 * Handles all board-related HTTP operations
 */

import { apiClient, extractData } from './client';
import {
  ApiRequestError,
  type ApiResponse,
  type Board,
  type CreateBoardDTO,
  type BoardResponse,
  type JoinBoardDTO,
  type JoinBoardResponse,
  type UpdateBoardNameDTO,
  type UpdateBoardNameResponse,
  type CloseBoardResponse,
  type AddAdminDTO,
  type AddAdminResponse,
  type RenameColumnDTO,
  type RenameColumnResponse,
  type ActiveUsersResponse,
  type HeartbeatResponse,
  type UpdateAliasDTO,
  type UpdateAliasResponse,
  type UserSession,
} from '../types';

// ============================================================================
// Board API Service
// ============================================================================

export const BoardAPI = {
  /**
   * Get board by ID
   * @param boardId - The board's unique identifier
   * @returns The board with embedded active users
   */
  async getBoard(boardId: string): Promise<Board> {
    const response = await apiClient.get<ApiResponse<Board>>(`/boards/${boardId}`);
    return extractData(response);
  },

  /**
   * Create a new board
   * @param data - Board creation data
   * @returns The created board
   */
  async createBoard(data: CreateBoardDTO): Promise<BoardResponse> {
    const response = await apiClient.post<ApiResponse<BoardResponse>>('/boards', data);
    return extractData(response);
  },

  /**
   * Join a board with an alias
   * @param boardId - The board to join
   * @param data - Join data with alias
   * @returns The user session for this board
   */
  async joinBoard(boardId: string, data: JoinBoardDTO): Promise<JoinBoardResponse> {
    const response = await apiClient.post<ApiResponse<JoinBoardResponse>>(
      `/boards/${boardId}/join`,
      data
    );
    return extractData(response);
  },

  /**
   * Update board name (admin only)
   * @param boardId - The board to update
   * @param data - New name data
   * @returns Updated board info
   */
  async updateBoardName(
    boardId: string,
    data: UpdateBoardNameDTO
  ): Promise<UpdateBoardNameResponse> {
    const response = await apiClient.patch<ApiResponse<UpdateBoardNameResponse>>(
      `/boards/${boardId}/name`,
      data
    );
    return extractData(response);
  },

  /**
   * Close a board (admin only)
   * @param boardId - The board to close
   * @returns Closed board info with timestamp
   */
  async closeBoard(boardId: string): Promise<CloseBoardResponse> {
    const response = await apiClient.patch<ApiResponse<CloseBoardResponse>>(
      `/boards/${boardId}/close`
    );
    return extractData(response);
  },

  /**
   * Add a co-admin to the board (creator only)
   * @param boardId - The board
   * @param data - User hash to promote
   * @returns Updated admins list
   */
  async addAdmin(boardId: string, data: AddAdminDTO): Promise<AddAdminResponse> {
    const response = await apiClient.post<ApiResponse<AddAdminResponse>>(
      `/boards/${boardId}/admins`,
      data
    );
    return extractData(response);
  },

  /**
   * Rename a column (admin only)
   * @param boardId - The board
   * @param columnId - The column to rename
   * @param data - New column name
   * @returns Updated column info
   */
  async renameColumn(
    boardId: string,
    columnId: string,
    data: RenameColumnDTO
  ): Promise<RenameColumnResponse> {
    const response = await apiClient.patch<ApiResponse<RenameColumnResponse>>(
      `/boards/${boardId}/columns/${columnId}`,
      data
    );
    return extractData(response);
  },

  /**
   * Delete a board (creator only or admin secret)
   * @param boardId - The board to delete
   */
  async deleteBoard(boardId: string): Promise<void> {
    await apiClient.delete(`/boards/${boardId}`);
  },

  // ============================================================================
  // User Session Methods
  // ============================================================================

  /**
   * Get active users on a board
   * @param boardId - The board ID
   * @returns List of active users
   */
  async getActiveUsers(boardId: string): Promise<ActiveUsersResponse> {
    const response = await apiClient.get<ApiResponse<ActiveUsersResponse>>(
      `/boards/${boardId}/users`
    );
    return extractData(response);
  },

  /**
   * Send heartbeat to maintain active status
   * @param boardId - The board ID
   * @returns Updated heartbeat info
   */
  async sendHeartbeat(boardId: string): Promise<HeartbeatResponse> {
    const response = await apiClient.patch<ApiResponse<HeartbeatResponse>>(
      `/boards/${boardId}/users/heartbeat`
    );
    return extractData(response);
  },

  /**
   * Update user alias on a board
   * @param boardId - The board ID
   * @param data - New alias
   * @returns Updated user info
   */
  async updateAlias(boardId: string, data: UpdateAliasDTO): Promise<UpdateAliasResponse> {
    const response = await apiClient.patch<ApiResponse<UpdateAliasResponse>>(
      `/boards/${boardId}/users/alias`,
      data
    );
    return extractData(response);
  },

  /**
   * Get current user's session for a board
   * @param boardId - The board ID
   * @returns User session or null if user hasn't joined the board
   */
  async getCurrentUserSession(boardId: string): Promise<UserSession | null> {
    try {
      const response = await apiClient.get<ApiResponse<{ user_session: UserSession | null }>>(
        `/boards/${boardId}/users/me`
      );
      return extractData(response).user_session;
    } catch {
      // Return null for any error - user may not have joined yet
      return null;
    }
  },
};

export type BoardAPIType = typeof BoardAPI;
