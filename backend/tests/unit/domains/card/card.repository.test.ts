import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { CardRepository } from '@/domains/card/card.repository.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import { startTestDb, stopTestDb, getTestDb, clearTestDb } from '../../../utils/index.js';

describe('CardRepository', () => {
  let cardRepository: CardRepository;
  let boardRepository: BoardRepository;
  let testBoardId: string;

  beforeAll(async () => {
    await startTestDb();
    cardRepository = new CardRepository(getTestDb());
    boardRepository = new BoardRepository(getTestDb());
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create a test board for card tests
    const board = await boardRepository.create(
      {
        name: 'Test Board',
        columns: [
          { id: 'col-1', name: 'Column 1' },
          { id: 'col-2', name: 'Column 2' },
        ],
        card_limit_per_user: 5,
      },
      'board-creator-hash'
    );
    testBoardId = board._id.toHexString();
  });

  describe('create', () => {
    it('should create a feedback card with valid input', async () => {
      const input = {
        column_id: 'col-1',
        content: 'Great teamwork!',
        card_type: 'feedback' as const,
        is_anonymous: false,
      };

      const card = await cardRepository.create(testBoardId, input, 'user-hash', 'Alice');

      expect(card._id).toBeInstanceOf(ObjectId);
      expect(card.board_id.toHexString()).toBe(testBoardId);
      expect(card.column_id).toBe('col-1');
      expect(card.content).toBe('Great teamwork!');
      expect(card.card_type).toBe('feedback');
      expect(card.is_anonymous).toBe(false);
      expect(card.created_by_hash).toBe('user-hash');
      expect(card.created_by_alias).toBe('Alice');
      expect(card.created_at).toBeInstanceOf(Date);
      expect(card.updated_at).toBeNull();
      expect(card.direct_reaction_count).toBe(0);
      expect(card.aggregated_reaction_count).toBe(0);
      expect(card.parent_card_id).toBeNull();
      expect(card.linked_feedback_ids).toEqual([]);
    });

    it('should create an action card', async () => {
      const input = {
        column_id: 'col-2',
        content: 'Improve CI/CD pipeline',
        card_type: 'action' as const,
        is_anonymous: false,
      };

      const card = await cardRepository.create(testBoardId, input, 'user-hash', 'Bob');

      expect(card.card_type).toBe('action');
    });

    it('should set alias to null for anonymous card', async () => {
      const input = {
        column_id: 'col-1',
        content: 'Anonymous feedback',
        card_type: 'feedback' as const,
        is_anonymous: true,
      };

      const card = await cardRepository.create(testBoardId, input, 'user-hash', null);

      expect(card.is_anonymous).toBe(true);
      expect(card.created_by_alias).toBeNull();
    });

    it('should throw for invalid board ID', async () => {
      const input = {
        column_id: 'col-1',
        content: 'Test',
        card_type: 'feedback' as const,
      };

      await expect(
        cardRepository.create('invalid-id', input, 'hash', 'Alice')
      ).rejects.toThrow('Invalid board ID');
    });
  });

  describe('findById', () => {
    it('should find an existing card', async () => {
      const created = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Test', card_type: 'feedback' },
        'hash',
        'User'
      );

      const found = await cardRepository.findById(created._id.toHexString());

      expect(found).not.toBeNull();
      expect(found!.content).toBe('Test');
    });

    it('should return null for non-existent card', async () => {
      const found = await cardRepository.findById(new ObjectId().toHexString());
      expect(found).toBeNull();
    });

    it('should return null for invalid ObjectId', async () => {
      const found = await cardRepository.findById('invalid-id');
      expect(found).toBeNull();
    });
  });

  describe('findByBoard', () => {
    it('should find all cards for a board', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'hash1',
        'User1'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Card 2', card_type: 'feedback' },
        'hash2',
        'User2'
      );

      const cards = await cardRepository.findByBoard(testBoardId);

      expect(cards).toHaveLength(2);
    });

    it('should filter by column_id', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'hash1',
        'User1'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Card 2', card_type: 'feedback' },
        'hash2',
        'User2'
      );

      const cards = await cardRepository.findByBoard(testBoardId, { columnId: 'col-1' });

      expect(cards).toHaveLength(1);
      expect(cards[0]!.content).toBe('Card 1');
    });

    it('should filter by created_by', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'user-a',
        'User A'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'user-b',
        'User B'
      );

      const cards = await cardRepository.findByBoard(testBoardId, { createdBy: 'user-a' });

      expect(cards).toHaveLength(1);
      expect(cards[0]!.created_by_hash).toBe('user-a');
    });

    it('should return empty array for invalid board ID', async () => {
      const cards = await cardRepository.findByBoard('invalid-id');
      expect(cards).toEqual([]);
    });
  });

  describe('countUserCards', () => {
    it('should count user feedback cards', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'user-hash',
        'User'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'user-hash',
        'User'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Action', card_type: 'action' },
        'user-hash',
        'User'
      );

      const count = await cardRepository.countUserCards(testBoardId, 'user-hash', 'feedback');

      expect(count).toBe(2);
    });

    it('should return 0 for user with no cards', async () => {
      const count = await cardRepository.countUserCards(testBoardId, 'unknown-hash', 'feedback');
      expect(count).toBe(0);
    });
  });

  describe('updateContent', () => {
    it('should update card content', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Old content', card_type: 'feedback' },
        'user-hash',
        'User'
      );

      const updated = await cardRepository.updateContent(
        card._id.toHexString(),
        'New content'
      );

      expect(updated).not.toBeNull();
      expect(updated!.content).toBe('New content');
      expect(updated!.updated_at).toBeInstanceOf(Date);
    });

    it('should enforce creator requirement', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Content', card_type: 'feedback' },
        'creator-hash',
        'Creator'
      );

      const updated = await cardRepository.updateContent(
        card._id.toHexString(),
        'New content',
        { requireCreator: 'other-hash' }
      );

      expect(updated).toBeNull();
    });
  });

  describe('moveToColumn', () => {
    it('should move card to different column', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Content', card_type: 'feedback' },
        'hash',
        'User'
      );

      const moved = await cardRepository.moveToColumn(card._id.toHexString(), 'col-2');

      expect(moved).not.toBeNull();
      expect(moved!.column_id).toBe('col-2');
    });

    it('should enforce creator requirement', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Content', card_type: 'feedback' },
        'creator-hash',
        'Creator'
      );

      const moved = await cardRepository.moveToColumn(
        card._id.toHexString(),
        'col-2',
        { requireCreator: 'other-hash' }
      );

      expect(moved).toBeNull();
    });
  });

  describe('parent-child relationships', () => {
    it('should set parent card ID', async () => {
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'hash',
        'User'
      );

      const updated = await cardRepository.setParentCard(
        child._id.toHexString(),
        parent._id.toHexString()
      );

      expect(updated).not.toBeNull();
      expect(updated!.parent_card_id!.toHexString()).toBe(parent._id.toHexString());
    });

    it('should unset parent card ID', async () => {
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.setParentCard(child._id.toHexString(), parent._id.toHexString());
      const unlinked = await cardRepository.setParentCard(child._id.toHexString(), null);

      expect(unlinked!.parent_card_id).toBeNull();
    });

    it('should find children of a card', async () => {
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child1 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child 1', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child2 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child 2', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.setParentCard(child1._id.toHexString(), parent._id.toHexString());
      await cardRepository.setParentCard(child2._id.toHexString(), parent._id.toHexString());

      const children = await cardRepository.findChildren(parent._id.toHexString());

      expect(children).toHaveLength(2);
    });

    it('should orphan children when parent is deleted', async () => {
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.setParentCard(child._id.toHexString(), parent._id.toHexString());
      const orphanedCount = await cardRepository.orphanChildren(parent._id.toHexString());

      expect(orphanedCount).toBe(1);

      const updatedChild = await cardRepository.findById(child._id.toHexString());
      expect(updatedChild!.parent_card_id).toBeNull();
    });

    it('should detect ancestor relationship (circular check)', async () => {
      const grandparent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Grandparent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.setParentCard(parent._id.toHexString(), grandparent._id.toHexString());
      await cardRepository.setParentCard(child._id.toHexString(), parent._id.toHexString());

      // Child is descendant of grandparent
      const isAncestor = await cardRepository.isAncestor(
        grandparent._id.toHexString(),
        child._id.toHexString()
      );

      expect(isAncestor).toBe(true);
    });

    it('should return false for non-ancestor', async () => {
      const card1 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'hash',
        'User'
      );
      const card2 = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'hash',
        'User'
      );

      const isAncestor = await cardRepository.isAncestor(
        card1._id.toHexString(),
        card2._id.toHexString()
      );

      expect(isAncestor).toBe(false);
    });
  });

  describe('linked feedback (action-feedback links)', () => {
    it('should add linked feedback to action card', async () => {
      const actionCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Action', card_type: 'action' },
        'hash',
        'User'
      );
      const feedbackCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Feedback', card_type: 'feedback' },
        'hash',
        'User'
      );

      const updated = await cardRepository.addLinkedFeedback(
        actionCard._id.toHexString(),
        feedbackCard._id.toHexString()
      );

      expect(updated).not.toBeNull();
      expect(updated!.linked_feedback_ids).toHaveLength(1);
      expect(updated!.linked_feedback_ids[0]!.toHexString()).toBe(feedbackCard._id.toHexString());
    });

    it('should not duplicate linked feedback (idempotent)', async () => {
      const actionCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Action', card_type: 'action' },
        'hash',
        'User'
      );
      const feedbackCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Feedback', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.addLinkedFeedback(
        actionCard._id.toHexString(),
        feedbackCard._id.toHexString()
      );
      const updated = await cardRepository.addLinkedFeedback(
        actionCard._id.toHexString(),
        feedbackCard._id.toHexString()
      );

      expect(updated!.linked_feedback_ids).toHaveLength(1);
    });

    it('should remove linked feedback', async () => {
      const actionCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Action', card_type: 'action' },
        'hash',
        'User'
      );
      const feedbackCard = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Feedback', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.addLinkedFeedback(
        actionCard._id.toHexString(),
        feedbackCard._id.toHexString()
      );
      const updated = await cardRepository.removeLinkedFeedback(
        actionCard._id.toHexString(),
        feedbackCard._id.toHexString()
      );

      expect(updated!.linked_feedback_ids).toHaveLength(0);
    });
  });

  describe('reaction counts', () => {
    it('should increment direct reaction count', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card', card_type: 'feedback' },
        'hash',
        'User'
      );

      const updated = await cardRepository.incrementDirectReactionCount(
        card._id.toHexString(),
        1
      );

      expect(updated!.direct_reaction_count).toBe(1);
    });

    it('should decrement reaction count', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.incrementDirectReactionCount(card._id.toHexString(), 5);
      const updated = await cardRepository.incrementDirectReactionCount(
        card._id.toHexString(),
        -2
      );

      expect(updated!.direct_reaction_count).toBe(3);
    });

    it('should increment aggregated reaction count', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card', card_type: 'feedback' },
        'hash',
        'User'
      );

      const updated = await cardRepository.incrementAggregatedReactionCount(
        card._id.toHexString(),
        3
      );

      expect(updated!.aggregated_reaction_count).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete an existing card', async () => {
      const card = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'To delete', card_type: 'feedback' },
        'hash',
        'User'
      );

      const deleted = await cardRepository.delete(card._id.toHexString());
      const found = await cardRepository.findById(card._id.toHexString());

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('should return false for non-existent card', async () => {
      const deleted = await cardRepository.delete(new ObjectId().toHexString());
      expect(deleted).toBe(false);
    });

    it('should delete all cards for a board', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'hash',
        'User'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'hash',
        'User'
      );

      const deletedCount = await cardRepository.deleteByBoard(testBoardId);

      expect(deletedCount).toBe(2);
    });
  });

  describe('findByBoardWithRelationships', () => {
    it('should embed children in parent cards', async () => {
      const parent = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Parent', card_type: 'feedback' },
        'hash',
        'User'
      );
      const child = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Child', card_type: 'feedback' },
        'hash',
        'User'
      );

      await cardRepository.setParentCard(child._id.toHexString(), parent._id.toHexString());

      const cards = await cardRepository.findByBoardWithRelationships(testBoardId);

      // Only parent should be returned (top-level)
      expect(cards).toHaveLength(1);
      expect(cards[0]!.id).toBe(parent._id.toHexString());
      expect(cards[0]!.children).toHaveLength(1);
      expect(cards[0]!.children[0]!.id).toBe(child._id.toHexString());
    });

    it('should embed linked feedback in action cards', async () => {
      const feedback = await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Feedback', card_type: 'feedback' },
        'hash',
        'User'
      );
      const action = await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Action', card_type: 'action' },
        'hash',
        'User'
      );

      await cardRepository.addLinkedFeedback(
        action._id.toHexString(),
        feedback._id.toHexString()
      );

      const cards = await cardRepository.findByBoardWithRelationships(testBoardId);

      const actionCard = cards.find((c) => c.id === action._id.toHexString());
      expect(actionCard).toBeDefined();
      expect(actionCard!.linked_feedback_cards).toHaveLength(1);
      expect(actionCard!.linked_feedback_cards[0]!.id).toBe(feedback._id.toHexString());
    });
  });

  describe('countByColumn', () => {
    it('should count cards by column', async () => {
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 1', card_type: 'feedback' },
        'hash',
        'User'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-1', content: 'Card 2', card_type: 'feedback' },
        'hash',
        'User'
      );
      await cardRepository.create(
        testBoardId,
        { column_id: 'col-2', content: 'Card 3', card_type: 'feedback' },
        'hash',
        'User'
      );

      const counts = await cardRepository.countByColumn(testBoardId);

      expect(counts['col-1']).toBe(2);
      expect(counts['col-2']).toBe(1);
    });
  });
});
