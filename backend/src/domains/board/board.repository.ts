import { Collection, Db, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import type { BoardDocument, CreateBoardInput } from './types.js';
import { logger } from '@/shared/logger/index.js';

export class BoardRepository {
  private collection: Collection<BoardDocument>;

  constructor(db: Db) {
    this.collection = db.collection<BoardDocument>('boards');
  }

  /**
   * Create a new board with retry logic for shareable link collisions
   */
  async create(input: CreateBoardInput, creatorHash: string): Promise<BoardDocument> {
    const now = new Date();
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const shareableLink = this.generateShareableLink();

      const doc: Omit<BoardDocument, '_id'> = {
        name: input.name,
        columns: input.columns,
        shareable_link: shareableLink,
        state: 'active',
        card_limit_per_user: input.card_limit_per_user ?? null,
        reaction_limit_per_user: input.reaction_limit_per_user ?? null,
        created_by_hash: creatorHash,
        admins: [creatorHash], // Creator is first admin
        created_at: now,
        closed_at: null,
      };

      try {
        const result = await this.collection.insertOne(doc as BoardDocument);

        logger.debug('Board created', { boardId: result.insertedId.toHexString() });

        return {
          _id: result.insertedId,
          ...doc,
        } as BoardDocument;
      } catch (error: unknown) {
        // Check for duplicate key error (E11000)
        if (
          error instanceof Error &&
          'code' in error &&
          (error as { code: number }).code === 11000
        ) {
          logger.warn('Shareable link collision, retrying', { attempt: attempt + 1 });
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate unique shareable link after maximum retries');
  }

  /**
   * Find board by ID
   */
  async findById(id: string): Promise<BoardDocument | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Find board by shareable link
   */
  async findByShareableLink(link: string): Promise<BoardDocument | null> {
    return this.collection.findOne({ shareable_link: link });
  }

  /**
   * Update board name with atomic state check
   * Returns null if board not found, throws if board is closed
   */
  async updateName(
    id: string,
    name: string,
    options: { requireActive?: boolean; requireAdmin?: string } = {}
  ): Promise<BoardDocument | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const filter: Record<string, unknown> = { _id: new ObjectId(id) };

    if (options.requireActive) {
      filter.state = 'active';
    }
    if (options.requireAdmin) {
      filter.admins = options.requireAdmin;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      { $set: { name } },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Close a board (set state to 'closed') with atomic admin check
   */
  async closeBoard(
    id: string,
    options: { requireAdmin?: string } = {}
  ): Promise<BoardDocument | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const filter: Record<string, unknown> = { _id: new ObjectId(id) };

    if (options.requireAdmin) {
      filter.admins = options.requireAdmin;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      {
        $set: {
          state: 'closed',
          closed_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Add a user to the admins array with atomic state/creator check
   */
  async addAdmin(
    id: string,
    userHash: string,
    options: { requireActive?: boolean; requireCreator?: string } = {}
  ): Promise<BoardDocument | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const filter: Record<string, unknown> = { _id: new ObjectId(id) };

    if (options.requireActive) {
      filter.state = 'active';
    }
    if (options.requireCreator) {
      filter.created_by_hash = options.requireCreator;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      { $addToSet: { admins: userHash } },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Check if a user is an admin of the board
   */
  async isAdmin(id: string, userHash: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) {
      return false;
    }

    const board = await this.collection.findOne(
      { _id: new ObjectId(id), admins: userHash },
      { projection: { _id: 1 } }
    );

    return board !== null;
  }

  /**
   * Check if a user is the creator of the board
   */
  async isCreator(id: string, userHash: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) {
      return false;
    }

    const board = await this.collection.findOne(
      { _id: new ObjectId(id), created_by_hash: userHash },
      { projection: { _id: 1 } }
    );

    return board !== null;
  }

  /**
   * Rename a column with atomic state/admin check
   */
  async renameColumn(
    boardId: string,
    columnId: string,
    newName: string,
    options: { requireActive?: boolean; requireAdmin?: string } = {}
  ): Promise<BoardDocument | null> {
    if (!ObjectId.isValid(boardId)) {
      return null;
    }

    const filter: Record<string, unknown> = {
      _id: new ObjectId(boardId),
      'columns.id': columnId,
    };

    if (options.requireActive) {
      filter.state = 'active';
    }
    if (options.requireAdmin) {
      filter.admins = options.requireAdmin;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      {
        $set: { 'columns.$.name': newName },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Delete a board by ID
   * @param id - Board ID to delete
   * @param session - Optional MongoDB session for transaction support
   */
  async delete(id: string, session?: import('mongodb').ClientSession): Promise<boolean> {
    if (!ObjectId.isValid(id)) {
      return false;
    }

    const result = await this.collection.deleteOne(
      { _id: new ObjectId(id) },
      session ? { session } : undefined
    );
    return result.deletedCount === 1;
  }

  /**
   * Generate a unique shareable link
   * Uses 12 chars (48 bits of entropy) to reduce collision probability
   */
  private generateShareableLink(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12);
  }

  /**
   * Ensure indexes exist (call during app startup)
   */
  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ shareable_link: 1 }, { unique: true });
    await this.collection.createIndex({ state: 1 });
    await this.collection.createIndex({ created_at: -1 });

    logger.debug('Board indexes ensured');
  }
}
