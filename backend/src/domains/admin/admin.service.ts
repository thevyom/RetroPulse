import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import type { BoardRepository } from '@/domains/board/board.repository.js';
import type { CardRepository } from '@/domains/card/card.repository.js';
import type { ReactionRepository } from '@/domains/reaction/reaction.repository.js';
import type { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import type { ClearBoardResult, ResetBoardResult, SeedTestDataInput, SeedTestDataResult } from './types.js';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { logger } from '@/shared/logger/index.js';
import { sha256 } from '@/shared/utils/index.js';

// Test data generation helpers
const ADJECTIVES = ['Happy', 'Quick', 'Clever', 'Brave', 'Calm', 'Eager', 'Gentle', 'Jolly', 'Kind', 'Lively'];
const NOUNS = ['Penguin', 'Tiger', 'Eagle', 'Dolphin', 'Fox', 'Panda', 'Owl', 'Wolf', 'Bear', 'Hawk'];
const CARD_TEMPLATES = [
  'We should improve how we handle deployments',
  'Great job on the sprint delivery this week',
  'Consider trying pair programming more often',
  'I noticed that our standups are running long',
  'What if we add more automated tests?',
  'The team collaboration has been excellent',
  'We need better documentation for new features',
  'The code review process is working well',
  'Could we have more async communication?',
  'Our retrospectives are very valuable',
];
const ACTION_TEMPLATES = [
  'Action: Schedule a meeting to discuss this',
  'Action: Create a wiki page for documentation',
  'Action: Set up automated testing pipeline',
  'Action: Review and update deployment process',
  'Action: Implement new communication guidelines',
];

function generateTestAlias(index: number): string {
  const adjective = ADJECTIVES[index % ADJECTIVES.length]!;
  const noun = NOUNS[index % NOUNS.length]!;
  return `${adjective}${noun}${index + 1}`;
}

function generateCardContent(index: number): string {
  return CARD_TEMPLATES[index % CARD_TEMPLATES.length]!;
}

function generateActionContent(index: number): string {
  return ACTION_TEMPLATES[index % ACTION_TEMPLATES.length]!;
}

function generateCookieHash(index: number): string {
  // Generate a consistent SHA-256 hash for testing
  const base = `test-user-${index}-seed-data`;
  return sha256(base);
}

export class AdminService {
  constructor(
    private db: Db,
    private boardRepository: BoardRepository,
    private cardRepository: CardRepository,
    private reactionRepository: ReactionRepository,
    private userSessionRepository: UserSessionRepository
  ) {}

  /**
   * Clear all data for a board (keep the board itself)
   * Internal method that skips board existence check (for use by resetBoard)
   */
  private async clearBoardData(boardId: string): Promise<ClearBoardResult> {
    // Get card IDs for reaction deletion
    const cardIds = await this.cardRepository.getCardIdsByBoard(boardId);

    // Delete in order: reactions first, then cards, then sessions
    const reactionsDeleted = await this.reactionRepository.deleteByCards(cardIds);
    const cardsDeleted = await this.cardRepository.deleteByBoard(boardId);
    const sessionsDeleted = await this.userSessionRepository.deleteByBoard(boardId);

    logger.info('Board cleared', {
      boardId,
      cardsDeleted,
      reactionsDeleted,
      sessionsDeleted,
    });

    return {
      cards_deleted: cardsDeleted,
      reactions_deleted: reactionsDeleted,
      sessions_deleted: sessionsDeleted,
    };
  }

  /**
   * Clear all data for a board (keep the board itself)
   */
  async clearBoard(boardId: string): Promise<ClearBoardResult> {
    // Verify board exists
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    return this.clearBoardData(boardId);
  }

  /**
   * Reset a board: clear all data and reopen if closed
   */
  async resetBoard(boardId: string): Promise<ResetBoardResult> {
    // Verify board exists
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Clear all data (reuse internal method to avoid double lookup)
    const clearResult = await this.clearBoardData(boardId);

    // Reopen the board if it was closed
    let boardReopened = false;
    if (board.state === 'closed') {
      await this.reopenBoard(boardId);
      boardReopened = true;
    }

    logger.info('Board reset', {
      boardId,
      boardReopened,
      ...clearResult,
    });

    return {
      ...clearResult,
      board_reopened: boardReopened,
    };
  }

  /**
   * Reopen a closed board
   */
  private async reopenBoard(boardId: string): Promise<void> {
    const collection = this.db.collection('boards');
    await collection.updateOne(
      { _id: new ObjectId(boardId) },
      {
        $set: {
          state: 'active',
          closed_at: null,
        },
      }
    );
  }

  /**
   * Seed test data into a board using batch inserts for better performance.
   * Uses MongoDB insertMany for bulk operations instead of individual inserts.
   */
  async seedTestData(boardId: string, input: SeedTestDataInput): Promise<SeedTestDataResult> {
    // Verify board exists and is active
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }
    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Cannot seed data into closed board', 400);
    }

    const columnIds = board.columns.map(col => col.id);
    if (columnIds.length === 0) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Board has no columns', 400);
    }

    const boardObjectId = new ObjectId(boardId);
    const userAliases: string[] = [];
    const now = new Date();

    // Generate user data
    const userSessionDocs = [];
    for (let i = 0; i < input.num_users; i++) {
      const alias = generateTestAlias(i);
      const cookieHash = generateCookieHash(i);
      userAliases.push(alias);
      userSessionDocs.push({
        _id: new ObjectId(),
        board_id: boardObjectId,
        cookie_hash: cookieHash,
        alias,
        last_active_at: now,
        created_at: now,
      });
    }

    // Batch insert user sessions
    if (userSessionDocs.length > 0) {
      await this.db.collection('user_sessions').insertMany(userSessionDocs, { ordered: false });
    }

    // Generate feedback cards
    const feedbackCardDocs = [];
    const feedbackCardIds: ObjectId[] = [];
    for (let i = 0; i < input.num_cards; i++) {
      const userIndex = i % input.num_users;
      const columnIndex = i % columnIds.length;
      const cookieHash = generateCookieHash(userIndex);
      const alias = userAliases[userIndex]!;
      const columnId = columnIds[columnIndex]!;
      const isAnonymous = i % 5 === 0;
      const cardId = new ObjectId();
      feedbackCardIds.push(cardId);

      feedbackCardDocs.push({
        _id: cardId,
        board_id: boardObjectId,
        column_id: columnId,
        content: generateCardContent(i),
        card_type: 'feedback',
        is_anonymous: isAnonymous,
        created_by_hash: cookieHash,
        created_by_alias: isAnonymous ? null : alias,
        created_at: now,
        updated_at: null,
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      });
    }

    // Batch insert feedback cards
    if (feedbackCardDocs.length > 0) {
      await this.db.collection('cards').insertMany(feedbackCardDocs, { ordered: false });
    }

    // Generate action cards
    const actionCardDocs = [];
    const actionCardIds: ObjectId[] = [];
    for (let i = 0; i < input.num_action_cards; i++) {
      const userIndex = i % input.num_users;
      const columnIndex = (i + 1) % columnIds.length;
      const cookieHash = generateCookieHash(userIndex);
      const alias = userAliases[userIndex]!;
      const columnId = columnIds[columnIndex]!;
      const cardId = new ObjectId();
      actionCardIds.push(cardId);

      actionCardDocs.push({
        _id: cardId,
        board_id: boardObjectId,
        column_id: columnId,
        content: generateActionContent(i),
        card_type: 'action',
        is_anonymous: false,
        created_by_hash: cookieHash,
        created_by_alias: alias,
        created_at: now,
        updated_at: null,
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        parent_card_id: null,
        linked_feedback_ids: [],
      });
    }

    // Batch insert action cards
    if (actionCardDocs.length > 0) {
      await this.db.collection('cards').insertMany(actionCardDocs, { ordered: false });
    }

    const allCardIds = [...feedbackCardIds, ...actionCardIds];

    // Create relationships if requested using bulkWrite
    let relationshipsCreated = 0;
    if (input.create_relationships && feedbackCardIds.length >= 2 && actionCardIds.length > 0) {
      const bulkOps = [];

      // Create parent-child relationships between feedback cards
      const numParentChild = Math.min(Math.floor(feedbackCardIds.length / 3), 10);
      for (let i = 0; i < numParentChild; i++) {
        const parentIndex = i;
        const childIndex = feedbackCardIds.length - 1 - i;
        if (parentIndex !== childIndex) {
          const childId = feedbackCardIds[childIndex]!;
          const parentId = feedbackCardIds[parentIndex]!;
          bulkOps.push({
            updateOne: {
              filter: { _id: childId },
              update: { $set: { parent_card_id: parentId } },
            },
          });
          relationshipsCreated++;
        }
      }

      // Link action cards to feedback cards
      const numLinks = Math.min(actionCardIds.length * 2, feedbackCardIds.length);
      for (let i = 0; i < numLinks; i++) {
        const actionIndex = i % actionCardIds.length;
        const feedbackIndex = i % feedbackCardIds.length;
        const actionId = actionCardIds[actionIndex]!;
        const feedbackId = feedbackCardIds[feedbackIndex]!;
        bulkOps.push({
          updateOne: {
            filter: { _id: actionId },
            update: { $addToSet: { linked_feedback_ids: feedbackId } },
          },
        });
        relationshipsCreated++;
      }

      if (bulkOps.length > 0) {
        await this.db.collection('cards').bulkWrite(bulkOps, { ordered: false });
      }
    }

    // Create reactions using batch insert
    let reactionsCreated = 0;
    if (input.num_reactions > 0 && allCardIds.length > 0) {
      const reactionDocs = [];
      const seenPairs = new Set<string>();
      const cardReactionCounts = new Map<string, number>();

      for (let i = 0; i < input.num_reactions; i++) {
        const userIndex = i % input.num_users;
        const cardIndex = i % allCardIds.length;
        const cookieHash = generateCookieHash(userIndex);
        const alias = userAliases[userIndex]!;
        const cardId = allCardIds[cardIndex]!;
        const pairKey = `${cardId.toHexString()}-${cookieHash}`;

        // Skip duplicates (one reaction per user per card)
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        reactionDocs.push({
          _id: new ObjectId(),
          card_id: cardId,
          user_cookie_hash: cookieHash,
          user_alias: alias,
          reaction_type: 'thumbs_up',
          created_at: now,
        });

        // Track reaction counts per card
        const cardIdStr = cardId.toHexString();
        cardReactionCounts.set(cardIdStr, (cardReactionCounts.get(cardIdStr) || 0) + 1);
        reactionsCreated++;
      }

      // Batch insert reactions
      if (reactionDocs.length > 0) {
        await this.db.collection('reactions').insertMany(reactionDocs, { ordered: false });

        // Batch update card reaction counts
        const countUpdateOps = [];
        for (const [cardIdStr, count] of cardReactionCounts) {
          countUpdateOps.push({
            updateOne: {
              filter: { _id: new ObjectId(cardIdStr) },
              update: { $inc: { direct_reaction_count: count, aggregated_reaction_count: count } },
            },
          });
        }
        if (countUpdateOps.length > 0) {
          await this.db.collection('cards').bulkWrite(countUpdateOps, { ordered: false });
        }
      }
    }

    logger.info('Test data seeded (batch mode)', {
      boardId,
      usersCreated: input.num_users,
      cardsCreated: input.num_cards,
      actionCardsCreated: input.num_action_cards,
      reactionsCreated,
      relationshipsCreated,
    });

    return {
      users_created: input.num_users,
      cards_created: input.num_cards,
      action_cards_created: input.num_action_cards,
      reactions_created: reactionsCreated,
      relationships_created: relationshipsCreated,
      user_aliases: userAliases,
    };
  }
}
