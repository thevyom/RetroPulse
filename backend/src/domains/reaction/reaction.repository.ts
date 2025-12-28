import { Collection, Db, ObjectId } from 'mongodb';
import type { ReactionDocument, ReactionType } from './types.js';
import { logger } from '@/shared/logger/index.js';

export class ReactionRepository {
  private collection: Collection<ReactionDocument>;

  constructor(db: Db) {
    this.collection = db.collection<ReactionDocument>('reactions');
  }

  /**
   * Validate and convert string to ObjectId
   */
  private toObjectId(id: string): ObjectId | null {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return new ObjectId(id);
  }

  /**
   * Add or update a reaction (upsert - one reaction per user per card)
   * Returns: { document, isNew } where isNew indicates if this was a new reaction
   */
  async upsert(
    cardId: string,
    userHash: string,
    userAlias: string | null,
    reactionType: ReactionType
  ): Promise<{ document: ReactionDocument; isNew: boolean }> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      throw new Error('Invalid card ID');
    }

    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      { card_id: cardObjectId, user_cookie_hash: userHash },
      {
        $set: {
          user_alias: userAlias,
          reaction_type: reactionType,
        },
        $setOnInsert: {
          card_id: cardObjectId,
          user_cookie_hash: userHash,
          created_at: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Failed to upsert reaction');
    }

    // Check if this was a new insert by comparing timestamps
    const isNew = result.created_at.getTime() === now.getTime();

    logger.debug('Reaction upserted', {
      reactionId: result._id.toHexString(),
      cardId,
      isNew,
    });

    return { document: result, isNew };
  }

  /**
   * Find reaction by card and user
   */
  async findByCardAndUser(cardId: string, userHash: string): Promise<ReactionDocument | null> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      return null;
    }

    return this.collection.findOne({
      card_id: cardObjectId,
      user_cookie_hash: userHash,
    });
  }

  /**
   * Find all reactions for a card
   */
  async findByCard(cardId: string): Promise<ReactionDocument[]> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      return [];
    }

    return this.collection
      .find({ card_id: cardObjectId })
      .sort({ created_at: -1 })
      .toArray();
  }

  /**
   * Delete a reaction by card and user
   */
  async delete(cardId: string, userHash: string): Promise<boolean> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      return false;
    }

    const result = await this.collection.deleteOne({
      card_id: cardObjectId,
      user_cookie_hash: userHash,
    });

    if (result.deletedCount === 1) {
      logger.debug('Reaction deleted', { cardId, userHash: userHash.substring(0, 8) + '...' });
    }

    return result.deletedCount === 1;
  }

  /**
   * Delete all reactions for a card (cascade delete)
   */
  async deleteByCard(cardId: string): Promise<number> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      return 0;
    }

    const result = await this.collection.deleteMany({ card_id: cardObjectId });

    logger.debug('Reactions deleted for card', { cardId, count: result.deletedCount });

    return result.deletedCount;
  }

  /**
   * Delete all reactions for multiple cards (for board cascade delete)
   */
  async deleteByCards(cardIds: string[]): Promise<number> {
    if (cardIds.length === 0) {
      return 0;
    }

    const cardObjectIds = cardIds
      .map((id) => this.toObjectId(id))
      .filter((id): id is ObjectId => id !== null);

    if (cardObjectIds.length === 0) {
      return 0;
    }

    const result = await this.collection.deleteMany({
      card_id: { $in: cardObjectIds },
    });

    logger.debug('Reactions deleted for cards', { cardCount: cardIds.length, reactionCount: result.deletedCount });

    return result.deletedCount;
  }

  /**
   * Count user's reactions on a board (across all cards on that board)
   * This requires joining with cards collection
   */
  async countUserReactionsOnBoard(boardId: string, userHash: string): Promise<number> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    const pipeline = [
      // Lookup cards to filter by board
      {
        $lookup: {
          from: 'cards',
          localField: 'card_id',
          foreignField: '_id',
          as: 'card',
        },
      },
      // Unwind the card (one card per reaction)
      { $unwind: '$card' },
      // Filter by board and user
      {
        $match: {
          'card.board_id': boardObjectId,
          user_cookie_hash: userHash,
        },
      },
      // Count
      { $count: 'total' },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.length > 0 && results[0] ? (results[0].total as number) : 0;
  }

  /**
   * Count reactions for a specific card
   */
  async countByCard(cardId: string): Promise<number> {
    const cardObjectId = this.toObjectId(cardId);
    if (!cardObjectId) {
      return 0;
    }

    return this.collection.countDocuments({ card_id: cardObjectId });
  }

  /**
   * Check if user has reacted to a card
   */
  async hasUserReacted(cardId: string, userHash: string): Promise<boolean> {
    const reaction = await this.findByCardAndUser(cardId, userHash);
    return reaction !== null;
  }

  /**
   * Ensure indexes exist (call during app startup)
   */
  async ensureIndexes(): Promise<void> {
    // Unique index for one reaction per user per card
    await this.collection.createIndex(
      { card_id: 1, user_cookie_hash: 1 },
      { unique: true }
    );

    // Index for counting user reactions (used with $lookup to cards)
    await this.collection.createIndex({ user_cookie_hash: 1 });

    // Index for card-based queries
    await this.collection.createIndex({ card_id: 1 });

    logger.debug('Reaction indexes ensured');
  }
}
