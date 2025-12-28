import { UserSessionRepository } from './user-session.repository.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import {
  ActiveUser,
  UserSession,
  userSessionDocumentToActiveUser,
  userSessionDocumentToUserSession,
} from './types.js';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { eventBroadcaster, type IEventBroadcaster } from '@/gateway/socket/index.js';

export class UserSessionService {
  private broadcaster: IEventBroadcaster;

  constructor(
    private readonly userSessionRepository: UserSessionRepository,
    private readonly boardRepository: BoardRepository,
    broadcaster?: IEventBroadcaster
  ) {
    this.broadcaster = broadcaster ?? eventBroadcaster;
  }

  /**
   * Join a board - creates or updates user session
   */
  async joinBoard(
    boardId: string,
    cookieHash: string,
    alias: string
  ): Promise<UserSession> {
    // First verify the board exists
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Check if this is a new join (user not already in board)
    const existingSession = await this.userSessionRepository.findByBoardAndUser(
      boardId,
      cookieHash
    );

    // Upsert user session
    const sessionDoc = await this.userSessionRepository.upsert(
      boardId,
      cookieHash,
      alias
    );

    // Check if user is admin
    const isAdmin = board.admins.includes(cookieHash);

    // Emit real-time event only for new joins
    if (!existingSession) {
      this.broadcaster.userJoined({
        boardId,
        userAlias: alias,
        isAdmin,
      });
    }

    return userSessionDocumentToUserSession(sessionDoc, isAdmin);
  }

  /**
   * Get active users for a board (last active within 2 minutes)
   */
  async getActiveUsers(boardId: string): Promise<ActiveUser[]> {
    // Verify board exists
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Get active sessions
    const sessions = await this.userSessionRepository.findActiveUsers(boardId);

    // Use Set for O(1) admin lookup instead of O(n) array.includes
    const adminSet = new Set(board.admins);

    // Map to ActiveUser with is_admin flag
    return sessions.map((session) =>
      userSessionDocumentToActiveUser(session, adminSet.has(session.cookie_hash))
    );
  }

  /**
   * Update user heartbeat (refresh last_active_at)
   */
  async updateHeartbeat(
    boardId: string,
    cookieHash: string
  ): Promise<{ alias: string; last_active_at: string }> {
    // Verify board exists
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Update heartbeat
    const session = await this.userSessionRepository.updateHeartbeat(
      boardId,
      cookieHash
    );

    if (!session) {
      throw new ApiError(
        ErrorCodes.USER_NOT_FOUND,
        'User session not found. Please join the board first.',
        404
      );
    }

    return {
      alias: session.alias,
      last_active_at: session.last_active_at.toISOString(),
    };
  }

  /**
   * Update user alias
   * Note: Alias updates are not allowed on closed boards (write operation)
   */
  async updateAlias(
    boardId: string,
    cookieHash: string,
    newAlias: string
  ): Promise<{ alias: string; last_active_at: string }> {
    // Verify board exists
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Closed boards are read-only - alias updates are write operations
    if (board.state === 'closed') {
      throw new ApiError(
        ErrorCodes.BOARD_CLOSED,
        'Cannot update alias on closed board',
        409
      );
    }

    // Get old alias before update
    const oldSession = await this.userSessionRepository.findByBoardAndUser(
      boardId,
      cookieHash
    );
    const oldAlias = oldSession?.alias;

    // Update alias
    const session = await this.userSessionRepository.updateAlias(
      boardId,
      cookieHash,
      newAlias
    );

    if (!session) {
      throw new ApiError(
        ErrorCodes.USER_NOT_FOUND,
        'User session not found. Please join the board first.',
        404
      );
    }

    // Emit real-time event if alias changed
    if (oldAlias && oldAlias !== newAlias) {
      this.broadcaster.userAliasChanged({
        boardId,
        oldAlias,
        newAlias,
      });
    }

    return {
      alias: session.alias,
      last_active_at: session.last_active_at.toISOString(),
    };
  }

  /**
   * Get user session by board and cookie hash
   * Throws BOARD_NOT_FOUND if board doesn't exist
   * Returns null only if session doesn't exist (user hasn't joined)
   */
  async getUserSession(
    boardId: string,
    cookieHash: string
  ): Promise<UserSession | null> {
    const board = await this.boardRepository.findById(boardId);

    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    const session = await this.userSessionRepository.findByBoardAndUser(
      boardId,
      cookieHash
    );

    if (!session) {
      return null;
    }

    const isAdmin = board.admins.includes(cookieHash);
    return userSessionDocumentToUserSession(session, isAdmin);
  }

  /**
   * Delete all sessions for a board (cascade delete)
   */
  async deleteSessionsForBoard(boardId: string): Promise<number> {
    return this.userSessionRepository.deleteByBoard(boardId);
  }
}
