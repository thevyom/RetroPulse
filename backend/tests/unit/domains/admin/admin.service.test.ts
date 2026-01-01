import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId, Db, Collection } from 'mongodb';
import { AdminService } from '@/domains/admin/admin.service.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import { CardRepository } from '@/domains/card/card.repository.js';
import { ReactionRepository } from '@/domains/reaction/reaction.repository.js';
import { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import type { BoardDocument } from '@/domains/board/types.js';
import type { CardDocument } from '@/domains/card/types.js';

// Mock dependencies
vi.mock('@/domains/board/board.repository.js');
vi.mock('@/domains/card/card.repository.js');
vi.mock('@/domains/reaction/reaction.repository.js');
vi.mock('@/domains/user/user-session.repository.js');

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: Partial<Db>;
  let mockCollection: Partial<Collection>;
  let mockBoardRepository: Partial<BoardRepository>;
  let mockCardRepository: Partial<CardRepository>;
  let mockReactionRepository: Partial<ReactionRepository>;
  let mockUserSessionRepository: Partial<UserSessionRepository>;

  const boardId = new ObjectId();
  const mockBoardDoc: BoardDocument = {
    _id: boardId,
    name: 'Test Board',
    columns: [
      { id: 'col-1', name: 'What went well' },
      { id: 'col-2', name: 'What to improve' },
    ],
    shareable_link: 'abc12345',
    state: 'active',
    card_limit_per_user: null,
    reaction_limit_per_user: null,
    created_by_hash: 'creator-hash',
    admins: ['creator-hash'],
    created_at: new Date(),
    closed_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection = {
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      insertMany: vi.fn().mockResolvedValue({ insertedCount: 1 }),
      bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };

    mockBoardRepository = {
      findById: vi.fn(),
    };

    mockCardRepository = {
      getCardIdsByBoard: vi.fn(),
      deleteByBoard: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      setParentCard: vi.fn(),
      addLinkedFeedback: vi.fn(),
      incrementDirectReactionCount: vi.fn(),
      incrementAggregatedReactionCount: vi.fn(),
    };

    mockReactionRepository = {
      deleteByCards: vi.fn(),
      upsert: vi.fn(),
    };

    mockUserSessionRepository = {
      deleteByBoard: vi.fn(),
      upsert: vi.fn(),
    };

    service = new AdminService(
      mockDb as Db,
      mockBoardRepository as BoardRepository,
      mockCardRepository as CardRepository,
      mockReactionRepository as ReactionRepository,
      mockUserSessionRepository as UserSessionRepository
    );
  });

  describe('clearBoard', () => {
    it('should clear all data for a board', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.getCardIdsByBoard!).mockResolvedValue(['card-1', 'card-2']);
      vi.mocked(mockReactionRepository.deleteByCards!).mockResolvedValue(5);
      vi.mocked(mockCardRepository.deleteByBoard!).mockResolvedValue(2);
      vi.mocked(mockUserSessionRepository.deleteByBoard!).mockResolvedValue(3);

      const result = await service.clearBoard(boardId.toHexString());

      expect(result).toEqual({
        cards_deleted: 2,
        reactions_deleted: 5,
        sessions_deleted: 3,
      });
      expect(mockBoardRepository.findById).toHaveBeenCalledWith(boardId.toHexString());
      expect(mockCardRepository.getCardIdsByBoard).toHaveBeenCalledWith(boardId.toHexString());
      expect(mockReactionRepository.deleteByCards).toHaveBeenCalledWith(['card-1', 'card-2']);
      expect(mockCardRepository.deleteByBoard).toHaveBeenCalledWith(boardId.toHexString());
      expect(mockUserSessionRepository.deleteByBoard).toHaveBeenCalledWith(boardId.toHexString());
    });

    it('should throw BOARD_NOT_FOUND if board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(service.clearBoard(boardId.toHexString())).rejects.toThrow('Board not found');
    });

    it('should handle empty board gracefully', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.getCardIdsByBoard!).mockResolvedValue([]);
      vi.mocked(mockReactionRepository.deleteByCards!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.deleteByBoard!).mockResolvedValue(0);
      vi.mocked(mockUserSessionRepository.deleteByBoard!).mockResolvedValue(0);

      const result = await service.clearBoard(boardId.toHexString());

      expect(result).toEqual({
        cards_deleted: 0,
        reactions_deleted: 0,
        sessions_deleted: 0,
      });
    });
  });

  describe('resetBoard', () => {
    it('should clear data and not reopen an active board', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.getCardIdsByBoard!).mockResolvedValue([]);
      vi.mocked(mockReactionRepository.deleteByCards!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.deleteByBoard!).mockResolvedValue(0);
      vi.mocked(mockUserSessionRepository.deleteByBoard!).mockResolvedValue(0);

      const result = await service.resetBoard(boardId.toHexString());

      expect(result.board_reopened).toBe(false);
      expect(mockDb.collection).not.toHaveBeenCalled();
    });

    it('should reopen a closed board', async () => {
      const closedBoard: BoardDocument = {
        ...mockBoardDoc,
        state: 'closed',
        closed_at: new Date(),
      };
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(closedBoard);
      vi.mocked(mockCardRepository.getCardIdsByBoard!).mockResolvedValue([]);
      vi.mocked(mockReactionRepository.deleteByCards!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.deleteByBoard!).mockResolvedValue(0);
      vi.mocked(mockUserSessionRepository.deleteByBoard!).mockResolvedValue(0);

      const result = await service.resetBoard(boardId.toHexString());

      expect(result.board_reopened).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('boards');
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: boardId },
        { $set: { state: 'active', closed_at: null } }
      );
    });

    it('should throw BOARD_NOT_FOUND if board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(service.resetBoard(boardId.toHexString())).rejects.toThrow('Board not found');
    });
  });

  describe('seedTestData', () => {
    const mockCardDoc: CardDocument = {
      _id: new ObjectId(),
      board_id: boardId,
      column_id: 'col-1',
      content: 'Test content',
      card_type: 'feedback',
      is_anonymous: false,
      created_by_hash: 'test-hash',
      created_by_alias: 'TestUser',
      created_at: new Date(),
      updated_at: null,
      direct_reaction_count: 0,
      aggregated_reaction_count: 0,
      parent_card_id: null,
      linked_feedback_ids: [],
    };

    it('should seed test data into a board', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      const input = {
        num_users: 2,
        num_cards: 3,
        num_action_cards: 1,
        num_reactions: 2,
        create_relationships: false,
      };

      const result = await service.seedTestData(boardId.toHexString(), input);

      expect(result.users_created).toBe(2);
      expect(result.cards_created).toBe(3);
      expect(result.action_cards_created).toBe(1);
      expect(result.reactions_created).toBe(2);
      expect(result.user_aliases).toHaveLength(2);
      // With batch mode, we use insertMany directly on collections
      expect(mockCollection.insertMany).toHaveBeenCalled();
    });

    it('should throw BOARD_NOT_FOUND if board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(
        service.seedTestData(boardId.toHexString(), {
          num_users: 1,
          num_cards: 1,
          num_action_cards: 0,
          num_reactions: 0,
          create_relationships: false,
        })
      ).rejects.toThrow('Board not found');
    });

    it('should throw BOARD_CLOSED if board is closed', async () => {
      const closedBoard: BoardDocument = {
        ...mockBoardDoc,
        state: 'closed',
        closed_at: new Date(),
      };
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(closedBoard);

      await expect(
        service.seedTestData(boardId.toHexString(), {
          num_users: 1,
          num_cards: 1,
          num_action_cards: 0,
          num_reactions: 0,
          create_relationships: false,
        })
      ).rejects.toThrow('Cannot seed data into closed board');
    });

    it('should create relationships when requested', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      const input = {
        num_users: 2,
        num_cards: 6, // Need at least 3 for parent-child (floor(6/3) = 2)
        num_action_cards: 2,
        num_reactions: 0,
        create_relationships: true,
      };

      const result = await service.seedTestData(boardId.toHexString(), input);

      expect(result.relationships_created).toBeGreaterThan(0);
      // With batch mode, relationships are created via bulkWrite
      expect(mockCollection.bulkWrite).toHaveBeenCalled();
    });

    it('should deduplicate reactions (one per user per card)', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      const input = {
        num_users: 1,
        num_cards: 1,
        num_action_cards: 0,
        num_reactions: 5, // Request 5, but only 1 unique (same user+card)
        create_relationships: false,
      };

      const result = await service.seedTestData(boardId.toHexString(), input);

      // With batch mode, duplicates are filtered before insert
      // Only 1 unique user+card pair, so only 1 reaction created
      expect(result.reactions_created).toBe(1);
    });

    it('should generate unique aliases', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      const input = {
        num_users: 5,
        num_cards: 1,
        num_action_cards: 0,
        num_reactions: 0,
        create_relationships: false,
      };

      const result = await service.seedTestData(boardId.toHexString(), input);

      expect(result.user_aliases).toHaveLength(5);
      // All aliases should be unique
      const uniqueAliases = new Set(result.user_aliases);
      expect(uniqueAliases.size).toBe(5);
    });
  });
});
