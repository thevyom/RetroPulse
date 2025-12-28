import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { CardService } from '@/domains/card/card.service.js';
import { CardRepository } from '@/domains/card/card.repository.js';
import { BoardRepository } from '@/domains/board/board.repository.js';
import { UserSessionRepository } from '@/domains/user/user-session.repository.js';
import type { CardDocument } from '@/domains/card/types.js';
import type { BoardDocument } from '@/domains/board/types.js';
import type { UserSessionDocument } from '@/domains/user/types.js';

// Mock the repositories
vi.mock('@/domains/card/card.repository.js');
vi.mock('@/domains/board/board.repository.js');
vi.mock('@/domains/user/user-session.repository.js');

describe('CardService', () => {
  let service: CardService;
  let mockCardRepository: Partial<CardRepository>;
  let mockBoardRepository: Partial<BoardRepository>;
  let mockUserSessionRepository: Partial<UserSessionRepository>;

  const boardId = new ObjectId();
  const cardId = new ObjectId();
  const userHash = 'user-hash-123';

  const mockBoardDoc: BoardDocument = {
    _id: boardId,
    name: 'Test Board',
    columns: [
      { id: 'col-1', name: 'Column 1' },
      { id: 'col-2', name: 'Column 2' },
    ],
    shareable_link: 'abc12345',
    state: 'active',
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_by_hash: 'creator-hash',
    admins: ['creator-hash'],
    created_at: new Date(),
    closed_at: null,
  };

  const mockCardDoc: CardDocument = {
    _id: cardId,
    board_id: boardId,
    column_id: 'col-1',
    content: 'Test card content',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: userHash,
    created_by_alias: 'Test User',
    created_at: new Date(),
    updated_at: null,
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
  };

  const mockSessionDoc: UserSessionDocument = {
    _id: new ObjectId(),
    board_id: boardId,
    cookie_hash: userHash,
    alias: 'Test User',
    last_active_at: new Date(),
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCardRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBoard: vi.fn(),
      findByBoardWithRelationships: vi.fn(),
      countByColumn: vi.fn(),
      countByBoard: vi.fn(),
      countUserCards: vi.fn(),
      updateContent: vi.fn(),
      moveToColumn: vi.fn(),
      setParentCard: vi.fn(),
      addLinkedFeedback: vi.fn(),
      removeLinkedFeedback: vi.fn(),
      incrementDirectReactionCount: vi.fn(),
      incrementAggregatedReactionCount: vi.fn(),
      orphanChildren: vi.fn(),
      findChildren: vi.fn(),
      isAncestor: vi.fn(),
      delete: vi.fn(),
      deleteByBoard: vi.fn(),
      getCardIdsByBoard: vi.fn(),
    };

    mockBoardRepository = {
      findById: vi.fn(),
    };

    mockUserSessionRepository = {
      findByBoardAndUser: vi.fn(),
    };

    service = new CardService(
      mockCardRepository as CardRepository,
      mockBoardRepository as BoardRepository,
      mockUserSessionRepository as UserSessionRepository
    );
  });

  describe('createCard', () => {
    it('should create a feedback card when board is active', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(2);
      vi.mocked(mockUserSessionRepository.findByBoardAndUser!).mockResolvedValue(mockSessionDoc);
      vi.mocked(mockCardRepository.create!).mockResolvedValue(mockCardDoc);

      const input = {
        column_id: 'col-1',
        content: 'Test card content',
        card_type: 'feedback' as const,
        is_anonymous: false,
      };

      const result = await service.createCard(boardId.toHexString(), input, userHash);

      expect(result.content).toBe('Test card content');
      expect(result.card_type).toBe('feedback');
      expect(mockCardRepository.create).toHaveBeenCalledWith(
        boardId.toHexString(),
        input,
        userHash,
        'Test User'
      );
    });

    it('should create anonymous card with null alias', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.create!).mockResolvedValue({
        ...mockCardDoc,
        is_anonymous: true,
        created_by_alias: null,
      });

      const input = {
        column_id: 'col-1',
        content: 'Anonymous feedback',
        card_type: 'feedback' as const,
        is_anonymous: true,
      };

      const result = await service.createCard(boardId.toHexString(), input, userHash);

      expect(result.is_anonymous).toBe(true);
      expect(result.created_by_alias).toBeNull();
      // Should not call findByBoardAndUser for anonymous cards
      expect(mockUserSessionRepository.findByBoardAndUser).not.toHaveBeenCalled();
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      const input = {
        column_id: 'col-1',
        content: 'Test',
        card_type: 'feedback' as const,
      };

      await expect(
        service.createCard(boardId.toHexString(), input, userHash)
      ).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw BOARD_CLOSED when board is closed', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue({
        ...mockBoardDoc,
        state: 'closed',
      });

      const input = {
        column_id: 'col-1',
        content: 'Test',
        card_type: 'feedback' as const,
      };

      await expect(
        service.createCard(boardId.toHexString(), input, userHash)
      ).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });

    it('should throw COLUMN_NOT_FOUND when column does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      const input = {
        column_id: 'nonexistent-col',
        content: 'Test',
        card_type: 'feedback' as const,
      };

      await expect(
        service.createCard(boardId.toHexString(), input, userHash)
      ).rejects.toMatchObject({
        code: 'COLUMN_NOT_FOUND',
        statusCode: 400,
      });
    });

    it('should throw CARD_LIMIT_REACHED when user exceeds feedback card limit', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(5); // At limit

      const input = {
        column_id: 'col-1',
        content: 'Test',
        card_type: 'feedback' as const,
      };

      await expect(
        service.createCard(boardId.toHexString(), input, userHash)
      ).rejects.toMatchObject({
        code: 'CARD_LIMIT_REACHED',
        statusCode: 403,
      });
    });

    it('should allow action card creation even when feedback limit is reached', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockUserSessionRepository.findByBoardAndUser!).mockResolvedValue(mockSessionDoc);
      vi.mocked(mockCardRepository.create!).mockResolvedValue({
        ...mockCardDoc,
        card_type: 'action',
      });

      const input = {
        column_id: 'col-1',
        content: 'Action item',
        card_type: 'action' as const,
      };

      // countUserCards should not be called for action cards
      const result = await service.createCard(boardId.toHexString(), input, userHash);

      expect(result.card_type).toBe('action');
      expect(mockCardRepository.countUserCards).not.toHaveBeenCalled();
    });
  });

  describe('getCard', () => {
    it('should return card when found', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);

      const result = await service.getCard(cardId.toHexString());

      expect(result.content).toBe('Test card content');
    });

    it('should throw CARD_NOT_FOUND when not found', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(null);

      await expect(service.getCard('nonexistent')).rejects.toMatchObject({
        code: 'CARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('getCards', () => {
    it('should return cards with summary statistics', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.findByBoardWithRelationships!).mockResolvedValue([
        { ...mockCardDoc, id: cardId.toHexString(), board_id: boardId.toHexString(), children: [], linked_feedback_cards: [], created_at: mockCardDoc.created_at.toISOString(), updated_at: null, parent_card_id: null, linked_feedback_ids: [] },
      ] as any);
      vi.mocked(mockCardRepository.countByColumn!).mockResolvedValue({ 'col-1': 1 });
      vi.mocked(mockCardRepository.countByBoard!).mockResolvedValue(1);

      const result = await service.getCards(boardId.toHexString());

      expect(result.cards).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.cards_by_column).toEqual({ 'col-1': 1 });
    });

    it('should throw BOARD_NOT_FOUND when board does not exist', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(null);

      await expect(service.getCards('nonexistent')).rejects.toMatchObject({
        code: 'BOARD_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('updateCard', () => {
    it('should update card content when user is creator', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.updateContent!).mockResolvedValue({
        ...mockCardDoc,
        content: 'Updated content',
        updated_at: new Date(),
      });

      const result = await service.updateCard(cardId.toHexString(), { content: 'Updated content' }, userHash);

      expect(result.content).toBe('Updated content');
      expect(mockCardRepository.updateContent).toHaveBeenCalledWith(
        cardId.toHexString(),
        'Updated content',
        { requireCreator: userHash }
      );
    });

    it('should throw FORBIDDEN when user is not creator', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.updateContent!).mockResolvedValue(null);

      await expect(
        service.updateCard(cardId.toHexString(), { content: 'Updated' }, 'other-hash')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should throw BOARD_CLOSED when board is closed', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue({
        ...mockBoardDoc,
        state: 'closed',
      });

      await expect(
        service.updateCard(cardId.toHexString(), { content: 'Updated' }, userHash)
      ).rejects.toMatchObject({
        code: 'BOARD_CLOSED',
        statusCode: 409,
      });
    });
  });

  describe('moveCard', () => {
    it('should move card to different column', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.moveToColumn!).mockResolvedValue({
        ...mockCardDoc,
        column_id: 'col-2',
      });

      const result = await service.moveCard(cardId.toHexString(), { column_id: 'col-2' }, userHash);

      expect(result.column_id).toBe('col-2');
    });

    it('should throw COLUMN_NOT_FOUND when target column does not exist', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      await expect(
        service.moveCard(cardId.toHexString(), { column_id: 'nonexistent' }, userHash)
      ).rejects.toMatchObject({
        code: 'COLUMN_NOT_FOUND',
        statusCode: 400,
      });
    });
  });

  describe('deleteCard', () => {
    it('should delete card when user is creator', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.orphanChildren!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.delete!).mockResolvedValue(true);

      await expect(service.deleteCard(cardId.toHexString(), userHash)).resolves.toBeUndefined();

      expect(mockCardRepository.orphanChildren).toHaveBeenCalled();
      expect(mockCardRepository.delete).toHaveBeenCalled();
    });

    it('should update parent aggregated count when deleting child card', async () => {
      const parentId = new ObjectId();
      const childDoc = {
        ...mockCardDoc,
        parent_card_id: parentId,
        direct_reaction_count: 3,
      };

      vi.mocked(mockCardRepository.findById!).mockResolvedValue(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.incrementAggregatedReactionCount!).mockResolvedValue(null as any);
      vi.mocked(mockCardRepository.orphanChildren!).mockResolvedValue(0);
      vi.mocked(mockCardRepository.delete!).mockResolvedValue(true);

      await service.deleteCard(cardId.toHexString(), userHash);

      expect(mockCardRepository.incrementAggregatedReactionCount).toHaveBeenCalledWith(
        parentId.toHexString(),
        -3
      );
    });

    it('should throw FORBIDDEN when user is not creator', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);

      await expect(
        service.deleteCard(cardId.toHexString(), 'other-hash')
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });
  });

  describe('linkCards', () => {
    it('should link parent-child feedback cards', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId };
      const childDoc = { ...mockCardDoc, _id: childId, direct_reaction_count: 2 };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc) // source card
        .mockResolvedValueOnce(childDoc); // target card
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.isAncestor!).mockResolvedValue(false);
      vi.mocked(mockCardRepository.setParentCard!).mockResolvedValue(childDoc);
      vi.mocked(mockCardRepository.incrementAggregatedReactionCount!).mockResolvedValue(parentDoc);

      await service.linkCards(
        parentId.toHexString(),
        { target_card_id: childId.toHexString(), link_type: 'parent_of' },
        userHash
      );

      expect(mockCardRepository.setParentCard).toHaveBeenCalledWith(
        childId.toHexString(),
        parentId.toHexString()
      );
      expect(mockCardRepository.incrementAggregatedReactionCount).toHaveBeenCalledWith(
        parentId.toHexString(),
        2
      );
    });

    it('should link action card to feedback card', async () => {
      const actionId = new ObjectId();
      const feedbackId = new ObjectId();
      const actionDoc = { ...mockCardDoc, _id: actionId, card_type: 'action' as const };
      const feedbackDoc = { ...mockCardDoc, _id: feedbackId, card_type: 'feedback' as const };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(actionDoc)
        .mockResolvedValueOnce(feedbackDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.addLinkedFeedback!).mockResolvedValue(actionDoc);

      await service.linkCards(
        actionId.toHexString(),
        { target_card_id: feedbackId.toHexString(), link_type: 'linked_to' },
        userHash
      );

      expect(mockCardRepository.addLinkedFeedback).toHaveBeenCalledWith(
        actionId.toHexString(),
        feedbackId.toHexString()
      );
    });

    it('should throw CIRCULAR_RELATIONSHIP when linking would create cycle', async () => {
      const card1Id = new ObjectId();
      const card2Id = new ObjectId();
      const card1Doc = { ...mockCardDoc, _id: card1Id };
      const card2Doc = { ...mockCardDoc, _id: card2Id };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(card1Doc)
        .mockResolvedValueOnce(card2Doc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.isAncestor!).mockResolvedValue(true); // Would create cycle

      await expect(
        service.linkCards(
          card1Id.toHexString(),
          { target_card_id: card2Id.toHexString(), link_type: 'parent_of' },
          userHash
        )
      ).rejects.toMatchObject({
        code: 'CIRCULAR_RELATIONSHIP',
        statusCode: 400,
      });
    });

    it('should throw when linking card to itself', async () => {
      vi.mocked(mockCardRepository.findById!).mockResolvedValue(mockCardDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.isAncestor!).mockResolvedValue(false);

      await expect(
        service.linkCards(
          cardId.toHexString(),
          { target_card_id: cardId.toHexString(), link_type: 'parent_of' },
          userHash
        )
      ).rejects.toMatchObject({
        code: 'CIRCULAR_RELATIONSHIP',
        statusCode: 400,
      });
    });

    it('should throw VALIDATION_ERROR when action card type mismatch for linked_to', async () => {
      const feedbackId = new ObjectId();
      const feedbackDoc = { ...mockCardDoc, _id: feedbackId, card_type: 'feedback' as const };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(feedbackDoc) // source is feedback, not action
        .mockResolvedValueOnce(feedbackDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);

      await expect(
        service.linkCards(
          feedbackId.toHexString(),
          { target_card_id: new ObjectId().toHexString(), link_type: 'linked_to' },
          userHash
        )
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should throw FORBIDDEN when user is not creator or admin', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId, created_by_hash: 'other-user-hash' };
      const childDoc = { ...mockCardDoc, _id: childId };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc) // source card created by someone else
        .mockResolvedValueOnce(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc); // admins = ['creator-hash']

      await expect(
        service.linkCards(
          parentId.toHexString(),
          { target_card_id: childId.toHexString(), link_type: 'parent_of' },
          userHash // userHash is not the card creator or board admin
        )
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should allow board admin to link cards even if not creator', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId, created_by_hash: 'other-user-hash' };
      const childDoc = { ...mockCardDoc, _id: childId, direct_reaction_count: 2 };
      const adminHash = 'creator-hash'; // This is in mockBoardDoc.admins

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc)
        .mockResolvedValueOnce(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.isAncestor!).mockResolvedValue(false);
      vi.mocked(mockCardRepository.setParentCard!).mockResolvedValue(childDoc);
      vi.mocked(mockCardRepository.incrementAggregatedReactionCount!).mockResolvedValue(parentDoc);

      await service.linkCards(
        parentId.toHexString(),
        { target_card_id: childId.toHexString(), link_type: 'parent_of' },
        adminHash // admin can link
      );

      expect(mockCardRepository.setParentCard).toHaveBeenCalled();
    });
  });

  describe('unlinkCards', () => {
    it('should unlink parent-child relationship', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId };
      const childDoc = { ...mockCardDoc, _id: childId, parent_card_id: parentId, direct_reaction_count: 2 };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc)
        .mockResolvedValueOnce(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.setParentCard!).mockResolvedValue({ ...childDoc, parent_card_id: null });
      vi.mocked(mockCardRepository.incrementAggregatedReactionCount!).mockResolvedValue(parentDoc);

      await service.unlinkCards(
        parentId.toHexString(),
        { target_card_id: childId.toHexString(), link_type: 'parent_of' },
        userHash
      );

      expect(mockCardRepository.setParentCard).toHaveBeenCalledWith(childId.toHexString(), null);
      expect(mockCardRepository.incrementAggregatedReactionCount).toHaveBeenCalledWith(
        parentId.toHexString(),
        -2
      );
    });

    it('should throw FORBIDDEN when user is not creator or admin', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId, created_by_hash: 'other-user-hash' };
      const childDoc = { ...mockCardDoc, _id: childId, parent_card_id: parentId };

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc) // source card created by someone else
        .mockResolvedValueOnce(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc); // admins = ['creator-hash']

      await expect(
        service.unlinkCards(
          parentId.toHexString(),
          { target_card_id: childId.toHexString(), link_type: 'parent_of' },
          userHash // userHash is not the card creator or board admin
        )
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should allow board admin to unlink cards even if not creator', async () => {
      const parentId = new ObjectId();
      const childId = new ObjectId();
      const parentDoc = { ...mockCardDoc, _id: parentId, created_by_hash: 'other-user-hash' };
      const childDoc = { ...mockCardDoc, _id: childId, parent_card_id: parentId, direct_reaction_count: 2 };
      const adminHash = 'creator-hash'; // This is in mockBoardDoc.admins

      vi.mocked(mockCardRepository.findById!)
        .mockResolvedValueOnce(parentDoc)
        .mockResolvedValueOnce(childDoc);
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.setParentCard!).mockResolvedValue({ ...childDoc, parent_card_id: null });
      vi.mocked(mockCardRepository.incrementAggregatedReactionCount!).mockResolvedValue(parentDoc);

      await service.unlinkCards(
        parentId.toHexString(),
        { target_card_id: childId.toHexString(), link_type: 'parent_of' },
        adminHash // admin can unlink
      );

      expect(mockCardRepository.setParentCard).toHaveBeenCalled();
    });
  });

  describe('getCardQuota', () => {
    it('should return quota when limit is enabled', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(3);

      const quota = await service.getCardQuota(boardId.toHexString(), userHash);

      expect(quota).toEqual({
        current_count: 3,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });
    });

    it('should return quota with can_create false when at limit', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue(mockBoardDoc);
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(5);

      const quota = await service.getCardQuota(boardId.toHexString(), userHash);

      expect(quota.can_create).toBe(false);
    });

    it('should return limit_enabled false when no limit configured', async () => {
      vi.mocked(mockBoardRepository.findById!).mockResolvedValue({
        ...mockBoardDoc,
        card_limit_per_user: null,
      });
      vi.mocked(mockCardRepository.countUserCards!).mockResolvedValue(10);

      const quota = await service.getCardQuota(boardId.toHexString(), userHash);

      expect(quota).toEqual({
        current_count: 10,
        limit: null,
        can_create: true,
        limit_enabled: false,
      });
    });
  });
});
