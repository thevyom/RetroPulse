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
   * Seed test data into a board
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

    const userAliases: string[] = [];
    const createdCardIds: string[] = [];
    const feedbackCardIds: string[] = [];
    let relationshipsCreated = 0;

    // Create user sessions
    for (let i = 0; i < input.num_users; i++) {
      const alias = generateTestAlias(i);
      const cookieHash = generateCookieHash(i);

      await this.userSessionRepository.upsert(boardId, cookieHash, alias);
      userAliases.push(alias);
    }

    // Get column IDs from board
    const columnIds = board.columns.map(col => col.id);
    if (columnIds.length === 0) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Board has no columns', 400);
    }

    // Create feedback cards
    for (let i = 0; i < input.num_cards; i++) {
      const userIndex = i % input.num_users;
      const columnIndex = i % columnIds.length;
      const cookieHash = generateCookieHash(userIndex);
      const alias = userAliases[userIndex]!;
      const columnId = columnIds[columnIndex]!;

      const card = await this.cardRepository.create(
        boardId,
        {
          column_id: columnId,
          content: generateCardContent(i),
          card_type: 'feedback',
          is_anonymous: i % 5 === 0, // Every 5th card is anonymous
        },
        cookieHash,
        alias
      );

      createdCardIds.push(card._id.toHexString());
      feedbackCardIds.push(card._id.toHexString());
    }

    // Create action cards
    const actionCardIds: string[] = [];
    for (let i = 0; i < input.num_action_cards; i++) {
      const userIndex = i % input.num_users;
      const columnIndex = (i + 1) % columnIds.length; // Different column distribution
      const cookieHash = generateCookieHash(userIndex);
      const alias = userAliases[userIndex]!;
      const columnId = columnIds[columnIndex]!;

      const card = await this.cardRepository.create(
        boardId,
        {
          column_id: columnId,
          content: generateActionContent(i),
          card_type: 'action',
          is_anonymous: false,
        },
        cookieHash,
        alias
      );

      createdCardIds.push(card._id.toHexString());
      actionCardIds.push(card._id.toHexString());
    }

    // Create relationships if requested
    if (input.create_relationships && feedbackCardIds.length >= 2 && actionCardIds.length > 0) {
      // Create some parent-child relationships between feedback cards
      const numParentChild = Math.min(Math.floor(feedbackCardIds.length / 3), 10);
      for (let i = 0; i < numParentChild; i++) {
        const parentIndex = i;
        const childIndex = feedbackCardIds.length - 1 - i;
        if (parentIndex !== childIndex) {
          const childId = feedbackCardIds[childIndex]!;
          const parentId = feedbackCardIds[parentIndex]!;
          await this.cardRepository.setParentCard(childId, parentId);
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
        await this.cardRepository.addLinkedFeedback(actionId, feedbackId);
        relationshipsCreated++;
      }
    }

    // Create reactions
    let reactionsCreated = 0;
    for (let i = 0; i < input.num_reactions && createdCardIds.length > 0; i++) {
      const userIndex = i % input.num_users;
      const cardIndex = i % createdCardIds.length;
      const cookieHash = generateCookieHash(userIndex);
      const alias = userAliases[userIndex]!;
      const cardId = createdCardIds[cardIndex]!;

      try {
        const result = await this.reactionRepository.upsert(
          cardId,
          cookieHash,
          alias,
          'thumbs_up'
        );

        if (result.isNew) {
          reactionsCreated++;

          // Update card reaction counts
          await this.cardRepository.incrementDirectReactionCount(cardId, 1);

          // If card has parent, update aggregated count
          const card = await this.cardRepository.findById(cardId);
          if (card?.parent_card_id) {
            await this.cardRepository.incrementAggregatedReactionCount(
              card.parent_card_id.toHexString(),
              1
            );
          }
        }
      } catch {
        // Ignore duplicate reactions (one per user per card)
      }
    }

    logger.info('Test data seeded', {
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
