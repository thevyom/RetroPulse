import { Collection, Db, ObjectId } from 'mongodb';
import type { UserSessionDocument } from './types.js';
import { logger } from '@/shared/logger/index.js';

/**
 * Activity window in milliseconds (2 minutes)
 */
const ACTIVITY_WINDOW_MS = 2 * 60 * 1000;

export class UserSessionRepository {
  private collection: Collection<UserSessionDocument>;

  constructor(db: Db) {
    this.collection = db.collection<UserSessionDocument>('user_sessions');
  }

  /**
   * Validate and convert board ID string to ObjectId
   * @throws Error if board ID is invalid
   */
  private validateBoardId(boardId: string): ObjectId {
    if (!ObjectId.isValid(boardId)) {
      throw new Error('Invalid board ID');
    }
    return new ObjectId(boardId);
  }

  /**
   * Safely parse board ID, returning null if invalid
   * Use for methods that should return null/empty on invalid input
   */
  private tryParseBoardId(boardId: string): ObjectId | null {
    if (!ObjectId.isValid(boardId)) {
      return null;
    }
    return new ObjectId(boardId);
  }

  /**
   * Upsert a user session (create if new, update if exists)
   * Returns the session after upsert
   */
  async upsert(
    boardId: string,
    cookieHash: string,
    alias: string
  ): Promise<UserSessionDocument> {
    const boardObjectId = this.validateBoardId(boardId);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        board_id: boardObjectId,
        cookie_hash: cookieHash,
      },
      {
        $set: {
          alias,
          last_active_at: now,
        },
        $setOnInsert: {
          board_id: boardObjectId,
          cookie_hash: cookieHash,
          created_at: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    if (!result) {
      throw new Error('Failed to upsert user session');
    }

    logger.debug('User session upserted', {
      boardId,
      alias,
    });

    return result;
  }

  /**
   * Find a user session by board ID and cookie hash
   */
  async findByBoardAndUser(
    boardId: string,
    cookieHash: string
  ): Promise<UserSessionDocument | null> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return null;
    }

    return this.collection.findOne({
      board_id: boardObjectId,
      cookie_hash: cookieHash,
    });
  }

  /**
   * Find all active users for a board (last_active_at within 2 minutes)
   */
  async findActiveUsers(boardId: string): Promise<UserSessionDocument[]> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return [];
    }

    const cutoffTime = new Date(Date.now() - ACTIVITY_WINDOW_MS);

    return this.collection
      .find({
        board_id: boardObjectId,
        last_active_at: { $gte: cutoffTime },
      })
      .sort({ last_active_at: -1 })
      .toArray();
  }

  /**
   * Update heartbeat (refresh last_active_at)
   * Returns null if session not found
   */
  async updateHeartbeat(
    boardId: string,
    cookieHash: string
  ): Promise<UserSessionDocument | null> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      {
        board_id: boardObjectId,
        cookie_hash: cookieHash,
      },
      {
        $set: {
          last_active_at: new Date(),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    return result;
  }

  /**
   * Update user alias
   * Returns null if session not found
   */
  async updateAlias(
    boardId: string,
    cookieHash: string,
    newAlias: string
  ): Promise<UserSessionDocument | null> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      {
        board_id: boardObjectId,
        cookie_hash: cookieHash,
      },
      {
        $set: {
          alias: newAlias,
          last_active_at: new Date(),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    return result;
  }

  /**
   * Delete all sessions for a board (used in cascade delete)
   * @param boardId - Board ID whose sessions should be deleted
   * @param session - Optional MongoDB session for transaction support
   */
  async deleteByBoard(boardId: string, session?: import('mongodb').ClientSession): Promise<number> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    const result = await this.collection.deleteMany(
      { board_id: boardObjectId },
      session ? { session } : undefined
    );

    logger.debug('User sessions deleted for board', {
      boardId,
      count: result.deletedCount,
    });

    return result.deletedCount;
  }

  /**
   * Count all sessions for a board
   */
  async countByBoard(boardId: string): Promise<number> {
    const boardObjectId = this.tryParseBoardId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    return this.collection.countDocuments({
      board_id: boardObjectId,
    });
  }

  /**
   * Ensure indexes exist (call during app startup)
   */
  async ensureIndexes(): Promise<void> {
    // Unique index for one session per user per board
    await this.collection.createIndex(
      { board_id: 1, cookie_hash: 1 },
      { unique: true }
    );

    // Index for active users query (sorted by last_active_at)
    await this.collection.createIndex({ board_id: 1, last_active_at: -1 });

    logger.debug('UserSession indexes ensured');
  }
}
