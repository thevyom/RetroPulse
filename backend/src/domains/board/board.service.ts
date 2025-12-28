import { BoardRepository } from './board.repository.js';
import {
  Board,
  BoardDocument,
  BoardWithUsers,
  CreateBoardInput,
  boardDocumentToBoard,
} from './types.js';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { env } from '@/shared/config/index.js';
import { eventBroadcaster, type IEventBroadcaster } from '@/gateway/socket/index.js';

export class BoardService {
  private broadcaster: IEventBroadcaster;

  constructor(
    private readonly boardRepository: BoardRepository,
    broadcaster?: IEventBroadcaster
  ) {
    this.broadcaster = broadcaster ?? eventBroadcaster;
  }

  /**
   * Format shareable link as full URL
   */
  private formatShareableLink(linkCode: string): string {
    return `${env.APP_URL}/join/${linkCode}`;
  }

  /**
   * Create a new board
   */
  async createBoard(input: CreateBoardInput, creatorHash: string): Promise<Board> {
    const doc = await this.boardRepository.create(input, creatorHash);

    const board = boardDocumentToBoard(doc);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Get a board by ID
   */
  async getBoard(id: string): Promise<Board> {
    const doc = await this.boardRepository.findById(id);

    if (!doc) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    const board = boardDocumentToBoard(doc);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Get board with active users (for GET /boards/:id response)
   * Note: Active users will be populated by UserSessionService
   */
  async getBoardWithUsers(id: string): Promise<BoardWithUsers> {
    const board = await this.getBoard(id);

    // Active users will be added by the controller using UserSessionService
    return {
      ...board,
      active_users: [],
    };
  }

  /**
   * Get board by shareable link code
   */
  async getBoardByLink(linkCode: string): Promise<Board> {
    const doc = await this.boardRepository.findByShareableLink(linkCode);

    if (!doc) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    const board = boardDocumentToBoard(doc);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Update board name (admin only) - uses atomic operation
   */
  async updateBoardName(id: string, name: string, userHash: string): Promise<Board> {
    // First check if board exists and get its state
    const existingBoard = await this.boardRepository.findById(id);

    if (!existingBoard) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (existingBoard.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Atomic update with admin check
    const doc = await this.boardRepository.updateName(id, name, {
      requireActive: true,
      requireAdmin: userHash,
    });

    if (!doc) {
      // If update failed after board exists and is active, user is not admin
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Admin access required', 403);
    }

    const board = boardDocumentToBoard(doc);

    // Emit real-time event
    this.broadcaster.boardRenamed(id, name);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Close a board (admin only) - uses atomic operation
   */
  async closeBoard(id: string, userHash: string): Promise<Board> {
    // First check if board exists
    const existingBoard = await this.boardRepository.findById(id);

    if (!existingBoard) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Atomic update with admin check
    const doc = await this.boardRepository.closeBoard(id, {
      requireAdmin: userHash,
    });

    if (!doc) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Admin access required', 403);
    }

    const board = boardDocumentToBoard(doc);

    // Emit real-time event
    this.broadcaster.boardClosed(id, board.closed_at!);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Add a co-admin (creator only) - uses atomic operation
   */
  async addAdmin(boardId: string, userHashToPromote: string, requesterHash: string): Promise<Board> {
    // First check if board exists and get its state
    const existingBoard = await this.boardRepository.findById(boardId);

    if (!existingBoard) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (existingBoard.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Atomic update with creator check
    const doc = await this.boardRepository.addAdmin(boardId, userHashToPromote, {
      requireActive: true,
      requireCreator: requesterHash,
    });

    if (!doc) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Only the board creator can perform this action', 403);
    }

    const board = boardDocumentToBoard(doc);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Rename a column (admin only) - uses atomic operation
   */
  async renameColumn(
    boardId: string,
    columnId: string,
    newName: string,
    userHash: string
  ): Promise<Board> {
    // First check if board exists and get its state
    const existingBoard = await this.boardRepository.findById(boardId);

    if (!existingBoard) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (existingBoard.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Check if column exists
    const columnExists = existingBoard.columns.some((col) => col.id === columnId);
    if (!columnExists) {
      throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found', 400);
    }

    // Atomic update with admin check
    const doc = await this.boardRepository.renameColumn(boardId, columnId, newName, {
      requireActive: true,
      requireAdmin: userHash,
    });

    if (!doc) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Admin access required', 403);
    }

    const board = boardDocumentToBoard(doc);

    return {
      ...board,
      shareable_link: this.formatShareableLink(doc.shareable_link),
    };
  }

  /**
   * Delete a board (creator only, or admin secret bypass)
   */
  async deleteBoard(id: string, userHash: string, isAdminSecret = false): Promise<void> {
    if (!isAdminSecret) {
      await this.ensureCreator(id, userHash);
    }

    // Note: Cascade delete of cards, reactions, user_sessions will be handled
    // by calling their respective repositories. For now, just delete the board.
    const deleted = await this.boardRepository.delete(id);

    if (!deleted) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Emit real-time event
    this.broadcaster.boardDeleted(id);
  }

  /**
   * Check if user is admin of the board
   */
  async isAdmin(boardId: string, userHash: string): Promise<boolean> {
    return this.boardRepository.isAdmin(boardId, userHash);
  }

  /**
   * Check if user is creator of the board
   */
  async isCreator(boardId: string, userHash: string): Promise<boolean> {
    return this.boardRepository.isCreator(boardId, userHash);
  }

  /**
   * Get raw board document (for internal use)
   */
  async getBoardDocument(id: string): Promise<BoardDocument | null> {
    return this.boardRepository.findById(id);
  }

  // ===== Private helpers =====

  private async ensureCreator(boardId: string, userHash: string): Promise<void> {
    const isCreator = await this.boardRepository.isCreator(boardId, userHash);

    if (!isCreator) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Only the board creator can perform this action', 403);
    }
  }
}
