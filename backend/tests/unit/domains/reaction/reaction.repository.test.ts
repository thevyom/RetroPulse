import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ReactionRepository } from '@/domains/reaction/reaction.repository.js';
import { CardRepository } from '@/domains/card/card.repository.js';
import { startTestDb, stopTestDb, clearTestDb, getTestDb } from '../../../utils/test-db.js';

describe('ReactionRepository', () => {
  let reactionRepository: ReactionRepository;
  let cardRepository: CardRepository;
  let testBoardId: string;
  let testCardId: string;

  beforeAll(async () => {
    await startTestDb();
    const db = getTestDb();
    reactionRepository = new ReactionRepository(db);
    cardRepository = new CardRepository(db);
    await reactionRepository.ensureIndexes();
    await cardRepository.ensureIndexes();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create a test board and card for reactions
    testBoardId = new ObjectId().toHexString();
    const card = await cardRepository.create(
      testBoardId,
      { column_id: 'col-1', content: 'Test card', card_type: 'feedback' },
      'test-user-hash',
      'TestUser'
    );
    testCardId = card._id.toHexString();
  });

  describe('upsert', () => {
    it('should create a new reaction', async () => {
      const { document, isNew } = await reactionRepository.upsert(
        testCardId,
        'user-hash-1',
        'Alice',
        'thumbs_up'
      );

      expect(isNew).toBe(true);
      expect(document._id).toBeDefined();
      expect(document.card_id.toHexString()).toBe(testCardId);
      expect(document.user_cookie_hash).toBe('user-hash-1');
      expect(document.user_alias).toBe('Alice');
      expect(document.reaction_type).toBe('thumbs_up');
      expect(document.created_at).toBeInstanceOf(Date);
    });

    it('should update existing reaction (not create duplicate)', async () => {
      // First reaction
      const { document: first, isNew: isNew1 } = await reactionRepository.upsert(
        testCardId,
        'user-hash-1',
        'Alice',
        'thumbs_up'
      );

      expect(isNew1).toBe(true);

      // Small delay to ensure timestamp difference for isNew detection
      // (isNew uses timestamp comparison which can fail within same millisecond)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Same user, same card - should update
      const { document: second, isNew: isNew2 } = await reactionRepository.upsert(
        testCardId,
        'user-hash-1',
        'Alice Updated',
        'thumbs_up'
      );

      expect(isNew2).toBe(false);
      expect(second._id.toHexString()).toBe(first._id.toHexString());
      expect(second.user_alias).toBe('Alice Updated');
    });

    it('should throw error for invalid card ID', async () => {
      await expect(
        reactionRepository.upsert('invalid-id', 'user-hash', 'User', 'thumbs_up')
      ).rejects.toThrow('Invalid card ID');
    });
  });

  describe('findByCardAndUser', () => {
    it('should find existing reaction', async () => {
      await reactionRepository.upsert(testCardId, 'user-hash-1', 'Alice', 'thumbs_up');

      const reaction = await reactionRepository.findByCardAndUser(testCardId, 'user-hash-1');

      expect(reaction).not.toBeNull();
      expect(reaction?.user_alias).toBe('Alice');
    });

    it('should return null if reaction not found', async () => {
      const reaction = await reactionRepository.findByCardAndUser(testCardId, 'non-existent');

      expect(reaction).toBeNull();
    });

    it('should return null for invalid card ID', async () => {
      const reaction = await reactionRepository.findByCardAndUser('invalid', 'user-hash');

      expect(reaction).toBeNull();
    });
  });

  describe('findByCard', () => {
    it('should find all reactions for a card', async () => {
      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-2', 'Bob', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-3', 'Charlie', 'thumbs_up');

      const reactions = await reactionRepository.findByCard(testCardId);

      expect(reactions).toHaveLength(3);
    });

    it('should return empty array for card with no reactions', async () => {
      const reactions = await reactionRepository.findByCard(testCardId);

      expect(reactions).toHaveLength(0);
    });

    it('should return empty array for invalid card ID', async () => {
      const reactions = await reactionRepository.findByCard('invalid');

      expect(reactions).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete existing reaction', async () => {
      await reactionRepository.upsert(testCardId, 'user-hash-1', 'Alice', 'thumbs_up');

      const deleted = await reactionRepository.delete(testCardId, 'user-hash-1');

      expect(deleted).toBe(true);

      const reaction = await reactionRepository.findByCardAndUser(testCardId, 'user-hash-1');
      expect(reaction).toBeNull();
    });

    it('should return false if reaction not found', async () => {
      const deleted = await reactionRepository.delete(testCardId, 'non-existent');

      expect(deleted).toBe(false);
    });

    it('should return false for invalid card ID', async () => {
      const deleted = await reactionRepository.delete('invalid', 'user-hash');

      expect(deleted).toBe(false);
    });
  });

  describe('deleteByCard', () => {
    it('should delete all reactions for a card', async () => {
      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-2', 'Bob', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-3', 'Charlie', 'thumbs_up');

      const deletedCount = await reactionRepository.deleteByCard(testCardId);

      expect(deletedCount).toBe(3);

      const reactions = await reactionRepository.findByCard(testCardId);
      expect(reactions).toHaveLength(0);
    });

    it('should return 0 for card with no reactions', async () => {
      const deletedCount = await reactionRepository.deleteByCard(testCardId);

      expect(deletedCount).toBe(0);
    });
  });

  describe('deleteByCards', () => {
    it('should delete reactions for multiple cards', async () => {
      // Create second card
      const card2 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'test-user-hash',
        'TestUser'
      );
      const card2Id = card2._id.toHexString();

      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-2', 'Bob', 'thumbs_up');
      await reactionRepository.upsert(card2Id, 'user-3', 'Charlie', 'thumbs_up');

      const deletedCount = await reactionRepository.deleteByCards([testCardId, card2Id]);

      expect(deletedCount).toBe(3);
    });

    it('should return 0 for empty card list', async () => {
      const deletedCount = await reactionRepository.deleteByCards([]);

      expect(deletedCount).toBe(0);
    });
  });

  describe('countUserReactionsOnBoard', () => {
    it('should count user reactions across all cards on board', async () => {
      // Create second card on same board
      const card2 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'test-user-hash',
        'TestUser'
      );
      const card2Id = card2._id.toHexString();

      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(card2Id, 'user-1', 'Alice', 'thumbs_up');

      const count = await reactionRepository.countUserReactionsOnBoard(testBoardId, 'user-1');

      expect(count).toBe(2);
    });

    it('should return 0 if user has no reactions', async () => {
      const count = await reactionRepository.countUserReactionsOnBoard(testBoardId, 'no-reactions');

      expect(count).toBe(0);
    });

    it('should not count reactions from other boards', async () => {
      const otherBoardId = new ObjectId().toHexString();
      const otherCard = await cardRepository.create(
        otherBoardId,
        { column_id: 'col-1', content: 'Other board card', card_type: 'feedback' },
        'test-user-hash',
        'TestUser'
      );

      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(otherCard._id.toHexString(), 'user-1', 'Alice', 'thumbs_up');

      const count = await reactionRepository.countUserReactionsOnBoard(testBoardId, 'user-1');

      expect(count).toBe(1);
    });
  });

  describe('countByCard', () => {
    it('should count reactions for a card', async () => {
      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');
      await reactionRepository.upsert(testCardId, 'user-2', 'Bob', 'thumbs_up');

      const count = await reactionRepository.countByCard(testCardId);

      expect(count).toBe(2);
    });

    it('should return 0 for card with no reactions', async () => {
      const count = await reactionRepository.countByCard(testCardId);

      expect(count).toBe(0);
    });
  });

  describe('hasUserReacted', () => {
    it('should return true if user has reacted', async () => {
      await reactionRepository.upsert(testCardId, 'user-1', 'Alice', 'thumbs_up');

      const hasReacted = await reactionRepository.hasUserReacted(testCardId, 'user-1');

      expect(hasReacted).toBe(true);
    });

    it('should return false if user has not reacted', async () => {
      const hasReacted = await reactionRepository.hasUserReacted(testCardId, 'user-1');

      expect(hasReacted).toBe(false);
    });
  });

  describe('ensureIndexes', () => {
    it('should create indexes without error', async () => {
      await expect(reactionRepository.ensureIndexes()).resolves.not.toThrow();
    });
  });
});
