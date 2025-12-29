import { Collection, Db, ObjectId } from 'mongodb';
import type { CardDocument, CreateCardInput, CardType, CardWithRelationships } from './types.js';
import { cardDocumentToCard, cardDocumentToChildCard, cardDocumentToLinkedFeedbackCard } from './types.js';
import { logger } from '@/shared/logger/index.js';

export class CardRepository {
  private collection: Collection<CardDocument>;

  constructor(db: Db) {
    this.collection = db.collection<CardDocument>('cards');
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
   * Create a new card
   */
  async create(
    boardId: string,
    input: CreateCardInput,
    creatorHash: string,
    creatorAlias: string | null
  ): Promise<CardDocument> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      throw new Error('Invalid board ID');
    }

    const now = new Date();

    const doc: Omit<CardDocument, '_id'> = {
      board_id: boardObjectId,
      column_id: input.column_id,
      content: input.content,
      card_type: input.card_type,
      is_anonymous: input.is_anonymous ?? false,
      created_by_hash: creatorHash,
      created_by_alias: input.is_anonymous ? null : creatorAlias,
      created_at: now,
      updated_at: null,
      direct_reaction_count: 0,
      aggregated_reaction_count: 0,
      parent_card_id: null,
      linked_feedback_ids: [],
    };

    const result = await this.collection.insertOne(doc as CardDocument);

    logger.debug('Card created', { cardId: result.insertedId.toHexString(), boardId });

    return {
      _id: result.insertedId,
      ...doc,
    } as CardDocument;
  }

  /**
   * Find card by ID
   */
  async findById(id: string): Promise<CardDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    return this.collection.findOne({ _id: objectId });
  }

  /**
   * Find all cards for a board
   */
  async findByBoard(
    boardId: string,
    options: { columnId?: string; createdBy?: string } = {}
  ): Promise<CardDocument[]> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return [];
    }

    const filter: Record<string, unknown> = { board_id: boardObjectId };

    if (options.columnId) {
      filter.column_id = options.columnId;
    }
    if (options.createdBy) {
      filter.created_by_hash = options.createdBy;
    }

    return this.collection.find(filter).sort({ created_at: -1 }).toArray();
  }

  /**
   * Find cards with embedded relationships using aggregation
   */
  async findByBoardWithRelationships(
    boardId: string,
    options: { columnId?: string; createdBy?: string; includeRelationships?: boolean } = {}
  ): Promise<CardWithRelationships[]> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return [];
    }

    const matchStage: Record<string, unknown> = { board_id: boardObjectId };

    if (options.columnId) {
      matchStage.column_id = options.columnId;
    }
    if (options.createdBy) {
      matchStage.created_by_hash = options.createdBy;
    }

    // Only fetch top-level cards (not children)
    matchStage.parent_card_id = null;

    const includeRelationships = options.includeRelationships ?? true;

    if (!includeRelationships) {
      // Simple query without relationships
      const docs = await this.collection.find(matchStage).sort({ created_at: -1 }).toArray();
      return docs.map((doc) => ({
        ...cardDocumentToCard(doc),
        children: [],
        linked_feedback_cards: [],
      }));
    }

    // Aggregation pipeline with lookups
    const pipeline = [
      { $match: matchStage },
      { $sort: { created_at: -1 as const } },
      // Lookup children
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: 'parent_card_id',
          as: 'children_docs',
        },
      },
      // Lookup linked feedback cards
      {
        $lookup: {
          from: 'cards',
          localField: 'linked_feedback_ids',
          foreignField: '_id',
          as: 'linked_feedback_docs',
        },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.map((doc) => {
      const card = cardDocumentToCard(doc as CardDocument);
      const childrenDocs = (doc.children_docs || []) as CardDocument[];
      const linkedDocs = (doc.linked_feedback_docs || []) as CardDocument[];

      return {
        ...card,
        children: childrenDocs
          .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
          .map(cardDocumentToChildCard),
        linked_feedback_cards: linkedDocs.map(cardDocumentToLinkedFeedbackCard),
      };
    });
  }

  /**
   * Count cards by column for summary statistics
   */
  async countByColumn(boardId: string): Promise<Record<string, number>> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return {};
    }

    const pipeline = [
      { $match: { board_id: boardObjectId } },
      { $group: { _id: '$column_id', count: { $sum: 1 } } },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    const cardsByColumn: Record<string, number> = {};
    for (const result of results) {
      cardsByColumn[result._id as string] = result.count as number;
    }

    return cardsByColumn;
  }

  /**
   * Count user's feedback cards on a board (for limit enforcement)
   */
  async countUserCards(
    boardId: string,
    userHash: string,
    cardType: CardType = 'feedback'
  ): Promise<number> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    return this.collection.countDocuments({
      board_id: boardObjectId,
      created_by_hash: userHash,
      card_type: cardType,
    });
  }

  /**
   * Update card content
   */
  async updateContent(
    id: string,
    content: string,
    options: { requireCreator?: string } = {}
  ): Promise<CardDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    const filter: Record<string, unknown> = { _id: objectId };

    if (options.requireCreator) {
      filter.created_by_hash = options.requireCreator;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      {
        $set: {
          content,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Move card to a different column
   */
  async moveToColumn(
    id: string,
    columnId: string,
    options: { requireCreator?: string } = {}
  ): Promise<CardDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    const filter: Record<string, unknown> = { _id: objectId };

    if (options.requireCreator) {
      filter.created_by_hash = options.requireCreator;
    }

    const result = await this.collection.findOneAndUpdate(
      filter,
      {
        $set: {
          column_id: columnId,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Set parent card ID (for parent-child linking)
   */
  async setParentCard(childId: string, parentId: string | null): Promise<CardDocument | null> {
    const childObjectId = this.toObjectId(childId);
    if (!childObjectId) {
      return null;
    }

    const parentObjectId = parentId ? this.toObjectId(parentId) : null;

    const result = await this.collection.findOneAndUpdate(
      { _id: childObjectId },
      {
        $set: {
          parent_card_id: parentObjectId,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Add linked feedback ID to an action card
   */
  async addLinkedFeedback(actionCardId: string, feedbackCardId: string): Promise<CardDocument | null> {
    const actionObjectId = this.toObjectId(actionCardId);
    const feedbackObjectId = this.toObjectId(feedbackCardId);

    if (!actionObjectId || !feedbackObjectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: actionObjectId },
      {
        $addToSet: { linked_feedback_ids: feedbackObjectId },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Remove linked feedback ID from an action card
   */
  async removeLinkedFeedback(actionCardId: string, feedbackCardId: string): Promise<CardDocument | null> {
    const actionObjectId = this.toObjectId(actionCardId);
    const feedbackObjectId = this.toObjectId(feedbackCardId);

    if (!actionObjectId || !feedbackObjectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: actionObjectId },
      {
        $pull: { linked_feedback_ids: feedbackObjectId },
        $set: { updated_at: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Increment direct reaction count
   */
  async incrementDirectReactionCount(id: string, delta: number): Promise<CardDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { direct_reaction_count: delta } },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Increment aggregated reaction count
   */
  async incrementAggregatedReactionCount(id: string, delta: number): Promise<CardDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $inc: { aggregated_reaction_count: delta } },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Orphan children (set parent_card_id to null for all children)
   */
  async orphanChildren(parentId: string): Promise<number> {
    const parentObjectId = this.toObjectId(parentId);
    if (!parentObjectId) {
      return 0;
    }

    const result = await this.collection.updateMany(
      { parent_card_id: parentObjectId },
      { $set: { parent_card_id: null, updated_at: new Date() } }
    );

    return result.modifiedCount;
  }

  /**
   * Find children of a card
   */
  async findChildren(parentId: string): Promise<CardDocument[]> {
    const parentObjectId = this.toObjectId(parentId);
    if (!parentObjectId) {
      return [];
    }

    return this.collection
      .find({ parent_card_id: parentObjectId })
      .sort({ created_at: 1 })
      .toArray();
  }

  /**
   * Find a single card by ID with its relationships (children and linked feedback)
   */
  async findByIdWithRelationships(id: string): Promise<CardWithRelationships | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return null;
    }

    const pipeline = [
      { $match: { _id: objectId } },
      // Lookup children
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: 'parent_card_id',
          as: 'children_docs',
        },
      },
      // Lookup linked feedback cards
      {
        $lookup: {
          from: 'cards',
          localField: 'linked_feedback_ids',
          foreignField: '_id',
          as: 'linked_feedback_docs',
        },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return null;
    }

    const doc = results[0];
    const card = cardDocumentToCard(doc as CardDocument);
    const childrenDocs = (doc.children_docs || []) as CardDocument[];
    const linkedDocs = (doc.linked_feedback_docs || []) as CardDocument[];

    return {
      ...card,
      children: childrenDocs
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
        .map(cardDocumentToChildCard),
      linked_feedback_cards: linkedDocs.map(cardDocumentToLinkedFeedbackCard),
    };
  }

  /**
   * Check if a card has any children (for 1-level hierarchy enforcement)
   */
  async hasChildren(cardId: string): Promise<boolean> {
    const objectId = this.toObjectId(cardId);
    if (!objectId) {
      return false;
    }

    const count = await this.collection.countDocuments({ parent_card_id: objectId }, { limit: 1 });
    return count > 0;
  }

  /**
   * Check if a card is an ancestor of another (circular reference check)
   */
  async isAncestor(potentialAncestorId: string, cardId: string): Promise<boolean> {
    const ancestorObjectId = this.toObjectId(potentialAncestorId);
    const cardObjectId = this.toObjectId(cardId);

    if (!ancestorObjectId || !cardObjectId) {
      return false;
    }

    // Traverse up the parent chain
    let currentId: ObjectId | null = cardObjectId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId.equals(ancestorObjectId)) {
        return true;
      }

      const key = currentId.toHexString();
      if (visited.has(key)) {
        // Circular reference detected in existing data
        break;
      }
      visited.add(key);

      const card = await this.collection.findOne(
        { _id: currentId },
        { projection: { parent_card_id: 1 } }
      );

      currentId = card?.parent_card_id ?? null;
    }

    return false;
  }

  /**
   * Delete a card by ID
   */
  async delete(id: string): Promise<boolean> {
    const objectId = this.toObjectId(id);
    if (!objectId) {
      return false;
    }

    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  /**
   * Delete all cards for a board (cascade delete)
   * @param boardId - Board ID whose cards should be deleted
   * @param session - Optional MongoDB session for transaction support
   */
  async deleteByBoard(boardId: string, session?: import('mongodb').ClientSession): Promise<number> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    const result = await this.collection.deleteMany(
      { board_id: boardObjectId },
      session ? { session } : undefined
    );

    logger.debug('Cards deleted for board', { boardId, count: result.deletedCount });

    return result.deletedCount;
  }

  /**
   * Get all card IDs for a board (for cascade delete of reactions)
   */
  async getCardIdsByBoard(boardId: string): Promise<string[]> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return [];
    }

    const cards = await this.collection
      .find({ board_id: boardObjectId }, { projection: { _id: 1 } })
      .toArray();

    return cards.map((card) => card._id.toHexString());
  }

  /**
   * Count total cards for a board
   */
  async countByBoard(boardId: string): Promise<number> {
    const boardObjectId = this.toObjectId(boardId);
    if (!boardObjectId) {
      return 0;
    }

    return this.collection.countDocuments({ board_id: boardObjectId });
  }

  /**
   * Ensure indexes exist (call during app startup)
   */
  async ensureIndexes(): Promise<void> {
    // Index for board queries (sorted by created_at)
    await this.collection.createIndex({ board_id: 1, created_at: -1 });

    // Index for card limit checks (user's cards on a board by type)
    await this.collection.createIndex({ board_id: 1, created_by_hash: 1, card_type: 1 });

    // Index for parent-child lookups
    await this.collection.createIndex({ parent_card_id: 1 });

    // Index for linked feedback lookups (used in $lookup aggregations)
    await this.collection.createIndex({ linked_feedback_ids: 1 });

    logger.debug('Card indexes ensured');
  }
}
