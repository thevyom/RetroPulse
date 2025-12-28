import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ReactionService } from '@/domains/reaction/reaction.service.js';
import { ReactionRepository } from '@/domains/reaction/reaction.repository.js';
import { CardRepository } from '@/domains/card/card.repository.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import { startTestDb, stopTestDb, clearTestDb, getTestDb } from '../../../utils/test-db.js';
import type { BoardDocument } from '@/domains/board/types.js';

describe('ReactionService', () => {
  let reactionService: ReactionService;
  let reactionRepository: ReactionRepository;
  let cardRepository: CardRepository;
  let boardRepository: BoardRepository;
  let userSessionRepository: UserSessionRepository;
  let testBoard: BoardDocument;
  let testCardId: string;

  beforeAll(async () => {
    await startTestDb();
    const db = getTestDb();
    reactionRepository = new ReactionRepository(db);
    cardRepository = new CardRepository(db);
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);
    reactionService = new ReactionService(
      reactionRepository,
      cardRepository,
      boardRepository,
      userSessionRepository
    );
    await reactionRepository.ensureIndexes();
    await cardRepository.ensureIndexes();
    await boardRepository.ensureIndexes();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create test board
    testBoard = await boardRepository.create(
      {
        name: 'Test Board',
        columns: [{ id: 'col-1', name: 'Column 1' }],
        card_limit_per_user: null,
        reaction_limit_per_user: 5,
      },
      'creator-hash'
    );
    // Create test card
    const card = await cardRepository.create(
      testBoard._id.toHexString(),
      { column_id: 'col-1', content: 'Test card', card_type: 'feedback' },
      'card-creator-hash',
      'CardCreator'
    );
    testCardId = card._id.toHexString();
    // Create user session
    await userSessionRepository.upsert(testBoard._id.toHexString(), 'user-hash', 'TestUser');
  });

  describe('addReaction', () => {
    it('should add a new reaction to a card', async () => {
      const reaction = await reactionService.addReaction(
        testCardId,
        { reaction_type: 'thumbs_up' },
        'user-hash'
      );

      expect(reaction.id).toBeDefined();
      expect(reaction.card_id).toBe(testCardId);
      expect(reaction.user_cookie_hash).toBe('user-hash');
      expect(reaction.user_alias).toBe('TestUser');
      expect(reaction.reaction_type).toBe('thumbs_up');
    });

    it('should increment direct_reaction_count on card', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');

      const card = await cardRepository.findById(testCardId);
      expect(card?.direct_reaction_count).toBe(1);
    });

    it('should update existing reaction without incrementing count', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');

      const card = await cardRepository.findById(testCardId);
      expect(card?.direct_reaction_count).toBe(1);
    });

    it('should throw CARD_NOT_FOUND if card does not exist', async () => {
      const fakeCardId = new ObjectId().toHexString();

      await expect(
        reactionService.addReaction(fakeCardId, { reaction_type: 'thumbs_up' }, 'user-hash')
      ).rejects.toMatchObject({
        code: 'CARD_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw BOARD_CLOSED if board is closed', async () => {
      await boardRepository.closeBoard(testBoard._id.toHexString(), { requireAdmin: 'creator-hash' });

      await expect(
        reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });

    it('should throw REACTION_LIMIT_REACHED when at limit', async () => {
      // Create multiple cards and react to them to hit the limit
      for (let i = 0; i < 5; i++) {
        const card = await cardRepository.create(
          testBoard._id.toHexString(),
          { column_id: 'col-1', content: `Card ${i}`, card_type: 'feedback' },
          'creator',
          'Creator'
        );
        await reactionService.addReaction(
          card._id.toHexString(),
          { reaction_type: 'thumbs_up' },
          'user-hash'
        );
      }

      // Try to add one more reaction
      await expect(
        reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash')
      ).rejects.toMatchObject({
        code: 'REACTION_LIMIT_REACHED',
        statusCode: 403,
      });
    });

    it('should update parent aggregated count when reacting to child card', async () => {
      // Create parent card
      const parentCard = await cardRepository.create(
        testBoard._id.toHexString(),
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'creator',
        'Creator'
      );
      // Create child card and link to parent
      const childCard = await cardRepository.create(
        testBoard._id.toHexString(),
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'creator',
        'Creator'
      );
      await cardRepository.setParentCard(childCard._id.toHexString(), parentCard._id.toHexString());

      // React to child
      await reactionService.addReaction(
        childCard._id.toHexString(),
        { reaction_type: 'thumbs_up' },
        'user-hash'
      );

      // Check parent's aggregated count
      const parent = await cardRepository.findById(parentCard._id.toHexString());
      expect(parent?.aggregated_reaction_count).toBe(1);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a card', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');
      await reactionService.removeReaction(testCardId, 'user-hash');

      const reaction = await reactionRepository.findByCardAndUser(testCardId, 'user-hash');
      expect(reaction).toBeNull();
    });

    it('should decrement direct_reaction_count on card', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');
      await reactionService.removeReaction(testCardId, 'user-hash');

      const card = await cardRepository.findById(testCardId);
      expect(card?.direct_reaction_count).toBe(0);
    });

    it('should throw REACTION_NOT_FOUND if reaction does not exist', async () => {
      await expect(reactionService.removeReaction(testCardId, 'user-hash')).rejects.toMatchObject({
        code: 'REACTION_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw BOARD_CLOSED if board is closed', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');
      await boardRepository.closeBoard(testBoard._id.toHexString(), { requireAdmin: 'creator-hash' });

      await expect(reactionService.removeReaction(testCardId, 'user-hash')).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });

    it('should update parent aggregated count when removing reaction from child card', async () => {
      // Create parent card
      const parentCard = await cardRepository.create(
        testBoard._id.toHexString(),
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'creator',
        'Creator'
      );
      // Create child card and link to parent
      const childCard = await cardRepository.create(
        testBoard._id.toHexString(),
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'creator',
        'Creator'
      );
      await cardRepository.setParentCard(childCard._id.toHexString(), parentCard._id.toHexString());

      // React then remove
      await reactionService.addReaction(
        childCard._id.toHexString(),
        { reaction_type: 'thumbs_up' },
        'user-hash'
      );
      await reactionService.removeReaction(childCard._id.toHexString(), 'user-hash');

      // Check parent's aggregated count
      const parent = await cardRepository.findById(parentCard._id.toHexString());
      expect(parent?.aggregated_reaction_count).toBe(0);
    });
  });

  describe('getReactionQuota', () => {
    it('should return quota with limit enabled', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');

      const quota = await reactionService.getReactionQuota(
        testBoard._id.toHexString(),
        'user-hash'
      );

      expect(quota).toEqual({
        current_count: 1,
        limit: 5,
        can_react: true,
        limit_enabled: true,
      });
    });

    it('should return limit_enabled: false when no limit set', async () => {
      // Create board without reaction limit
      const unlimitedBoard = await boardRepository.create(
        {
          name: 'Unlimited Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: null,
          reaction_limit_per_user: null,
        },
        'creator-hash'
      );

      const quota = await reactionService.getReactionQuota(
        unlimitedBoard._id.toHexString(),
        'user-hash'
      );

      expect(quota.limit_enabled).toBe(false);
      expect(quota.can_react).toBe(true);
      expect(quota.limit).toBeNull();
    });

    it('should return can_react: false when at limit', async () => {
      // React to 5 cards (limit)
      for (let i = 0; i < 5; i++) {
        const card = await cardRepository.create(
          testBoard._id.toHexString(),
          { column_id: 'col-1', content: `Card ${i}`, card_type: 'feedback' },
          'creator',
          'Creator'
        );
        await reactionService.addReaction(
          card._id.toHexString(),
          { reaction_type: 'thumbs_up' },
          'user-hash'
        );
      }

      const quota = await reactionService.getReactionQuota(
        testBoard._id.toHexString(),
        'user-hash'
      );

      expect(quota.current_count).toBe(5);
      expect(quota.can_react).toBe(false);
    });

    it('should throw BOARD_NOT_FOUND if board does not exist', async () => {
      const fakeBoardId = new ObjectId().toHexString();

      await expect(
        reactionService.getReactionQuota(fakeBoardId, 'user-hash')
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('hasUserReacted', () => {
    it('should return true if user has reacted', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');

      const hasReacted = await reactionService.hasUserReacted(testCardId, 'user-hash');

      expect(hasReacted).toBe(true);
    });

    it('should return false if user has not reacted', async () => {
      const hasReacted = await reactionService.hasUserReacted(testCardId, 'user-hash');

      expect(hasReacted).toBe(false);
    });
  });

  describe('getUserReaction', () => {
    it('should return reaction if exists', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');

      const reaction = await reactionService.getUserReaction(testCardId, 'user-hash');

      expect(reaction).not.toBeNull();
      expect(reaction?.reaction_type).toBe('thumbs_up');
    });

    it('should return null if no reaction', async () => {
      const reaction = await reactionService.getUserReaction(testCardId, 'user-hash');

      expect(reaction).toBeNull();
    });
  });

  describe('deleteReactionsForCard', () => {
    it('should delete all reactions for a card', async () => {
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-1');
      await userSessionRepository.upsert(testBoard._id.toHexString(), 'user-2', 'User2');
      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-2');

      const deletedCount = await reactionService.deleteReactionsForCard(testCardId);

      expect(deletedCount).toBe(2);
    });
  });

  describe('deleteReactionsForCards', () => {
    it('should delete reactions for multiple cards', async () => {
      const card2 = await cardRepository.create(
        testBoard._id.toHexString(),
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'creator',
        'Creator'
      );

      await reactionService.addReaction(testCardId, { reaction_type: 'thumbs_up' }, 'user-hash');
      await reactionService.addReaction(
        card2._id.toHexString(),
        { reaction_type: 'thumbs_up' },
        'user-hash'
      );

      const deletedCount = await reactionService.deleteReactionsForCards([
        testCardId,
        card2._id.toHexString(),
      ]);

      expect(deletedCount).toBe(2);
    });
  });
});
