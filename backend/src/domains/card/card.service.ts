import { CardRepository } from './card.repository.js';
import { BoardRepository } from '../board/board.repository.js';
import { UserSessionRepository } from '../user/user-session.repository.js';
import {
  Card,
  CardWithRelationships,
  CardsResponse,
  CardQuota,
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  LinkCardsInput,
  cardDocumentToCard,
} from './types.js';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { eventBroadcaster, type IEventBroadcaster } from '@/gateway/socket/index.js';
import type { CardRefreshPayload } from '@/gateway/socket/socket-types.js';

export class CardService {
  private broadcaster: IEventBroadcaster;

  constructor(
    private readonly cardRepository: CardRepository,
    private readonly boardRepository: BoardRepository,
    private readonly userSessionRepository: UserSessionRepository,
    broadcaster?: IEventBroadcaster
  ) {
    this.broadcaster = broadcaster ?? eventBroadcaster;
  }

  /**
   * Convert CardWithRelationships to CardRefreshPayload for socket emission
   */
  private toCardRefreshPayload(card: CardWithRelationships): CardRefreshPayload {
    return {
      boardId: card.board_id,
      card: {
        id: card.id,
        boardId: card.board_id,
        columnId: card.column_id,
        content: card.content,
        cardType: card.card_type,
        isAnonymous: card.is_anonymous,
        createdByAlias: card.created_by_alias,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        directReactionCount: card.direct_reaction_count,
        aggregatedReactionCount: card.aggregated_reaction_count,
        parentCardId: card.parent_card_id,
        linkedFeedbackIds: card.linked_feedback_ids,
        children: card.children.map((child) => ({
          id: child.id,
          content: child.content,
          isAnonymous: child.is_anonymous,
          createdByAlias: child.created_by_alias,
          createdAt: child.created_at,
          directReactionCount: child.direct_reaction_count,
          aggregatedReactionCount: child.aggregated_reaction_count,
        })),
        linkedFeedbackCards: card.linked_feedback_cards.map((linked) => ({
          id: linked.id,
          content: linked.content,
          createdByAlias: linked.created_by_alias,
          createdAt: linked.created_at,
        })),
      },
    };
  }

  /**
   * Create a new card
   */
  async createCard(
    boardId: string,
    input: CreateCardInput,
    userHash: string
  ): Promise<Card> {
    // Check board exists and is active
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Validate column exists
    const columnExists = board.columns.some((col) => col.id === input.column_id);
    if (!columnExists) {
      throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found', 400);
    }

    // Check card limit for feedback cards
    if (input.card_type === 'feedback' && board.card_limit_per_user !== null) {
      const currentCount = await this.cardRepository.countUserCards(boardId, userHash, 'feedback');
      if (currentCount >= board.card_limit_per_user) {
        throw new ApiError(
          ErrorCodes.CARD_LIMIT_REACHED,
          `Card limit of ${board.card_limit_per_user} reached`,
          403
        );
      }
    }

    // Get user's alias from session
    let creatorAlias: string | null = null;
    if (!input.is_anonymous) {
      const session = await this.userSessionRepository.findByBoardAndUser(boardId, userHash);
      creatorAlias = session?.alias ?? null;
    }

    const doc = await this.cardRepository.create(boardId, input, userHash, creatorAlias);
    const card = cardDocumentToCard(doc);

    // Emit real-time event
    this.broadcaster.cardCreated({
      cardId: card.id,
      boardId,
      columnId: card.column_id,
      content: card.content,
      cardType: card.card_type,
      isAnonymous: card.is_anonymous,
      createdByAlias: card.created_by_alias,
      createdAt: card.created_at,
      directReactionCount: card.direct_reaction_count,
      aggregatedReactionCount: card.aggregated_reaction_count,
      parentCardId: card.parent_card_id,
      linkedFeedbackIds: card.linked_feedback_ids,
    });

    return card;
  }

  /**
   * Get a card by ID with its relationships (children and linked_feedback_cards)
   */
  async getCard(id: string): Promise<CardWithRelationships> {
    const card = await this.cardRepository.findByIdWithRelationships(id);
    if (!card) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    return card;
  }

  /**
   * Get all cards for a board with optional filtering and embedded relationships
   */
  async getCards(
    boardId: string,
    options: { columnId?: string; createdBy?: string; includeRelationships?: boolean } = {}
  ): Promise<CardsResponse> {
    // Check board exists
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    // Execute queries in parallel for better performance
    const [cards, cardsByColumn, totalCount] = await Promise.all([
      this.cardRepository.findByBoardWithRelationships(boardId, options),
      this.cardRepository.countByColumn(boardId),
      this.cardRepository.countByBoard(boardId),
    ]);

    return {
      cards,
      total_count: totalCount,
      cards_by_column: cardsByColumn,
    };
  }

  /**
   * Update card content (creator only)
   */
  async updateCard(id: string, input: UpdateCardInput, userHash: string): Promise<Card> {
    // Get the card first
    const existingCard = await this.cardRepository.findById(id);
    if (!existingCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    // Check board is active
    const board = await this.boardRepository.findById(existingCard.board_id.toHexString());
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Update with creator check (atomic)
    const doc = await this.cardRepository.updateContent(id, input.content, {
      requireCreator: userHash,
    });

    if (!doc) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Only the card creator can update this card', 403);
    }

    const card = cardDocumentToCard(doc);

    // Emit real-time event
    this.broadcaster.cardUpdated({
      cardId: card.id,
      boardId: existingCard.board_id.toHexString(),
      content: card.content,
      updatedAt: card.updated_at!,
    });

    return card;
  }

  /**
   * Move card to a different column (creator only)
   */
  async moveCard(id: string, input: MoveCardInput, userHash: string): Promise<Card> {
    // Get the card first
    const existingCard = await this.cardRepository.findById(id);
    if (!existingCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    // Check board is active and column exists
    const board = await this.boardRepository.findById(existingCard.board_id.toHexString());
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Validate new column exists
    const columnExists = board.columns.some((col) => col.id === input.column_id);
    if (!columnExists) {
      throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found', 400);
    }

    // Move with creator check (atomic)
    const doc = await this.cardRepository.moveToColumn(id, input.column_id, {
      requireCreator: userHash,
    });

    if (!doc) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Only the card creator can move this card', 403);
    }

    const card = cardDocumentToCard(doc);

    // Emit real-time event
    this.broadcaster.cardMoved({
      cardId: card.id,
      boardId: existingCard.board_id.toHexString(),
      columnId: input.column_id,
    });

    return card;
  }

  /**
   * Delete a card (creator only, or admin override)
   */
  async deleteCard(id: string, userHash: string, isAdminOverride = false): Promise<void> {
    // Get the card first
    const existingCard = await this.cardRepository.findById(id);
    if (!existingCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    // Check authorization (bypassed if admin override)
    if (!isAdminOverride && existingCard.created_by_hash !== userHash) {
      throw new ApiError(ErrorCodes.FORBIDDEN, 'Only the card creator can delete this card', 403);
    }

    // Check board is active
    const board = await this.boardRepository.findById(existingCard.board_id.toHexString());
    if (board && board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // If this card is a child, update parent's aggregated count
    if (existingCard.parent_card_id) {
      await this.cardRepository.incrementAggregatedReactionCount(
        existingCard.parent_card_id.toHexString(),
        -existingCard.direct_reaction_count
      );
    }

    // Orphan children (set their parent_card_id to null)
    await this.cardRepository.orphanChildren(id);

    // Delete the card (reactions will be deleted by ReactionService/Repository)
    await this.cardRepository.delete(id);

    // Emit real-time event
    this.broadcaster.cardDeleted(existingCard.board_id.toHexString(), id);
  }

  /**
   * Link two cards (source card creator or board admin only)
   */
  async linkCards(sourceCardId: string, input: LinkCardsInput, userHash: string): Promise<void> {
    // Get both cards
    const sourceCard = await this.cardRepository.findById(sourceCardId);
    const targetCard = await this.cardRepository.findById(input.target_card_id);

    if (!sourceCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Source card not found', 404);
    }
    if (!targetCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Target card not found', 404);
    }

    // Check board is active
    const board = await this.boardRepository.findById(sourceCard.board_id.toHexString());
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Authorization: must be source card creator or board admin
    const isSourceCreator = sourceCard.created_by_hash === userHash;
    const isAdmin = board.admins.includes(userHash);
    if (!isSourceCreator && !isAdmin) {
      throw new ApiError(
        ErrorCodes.FORBIDDEN,
        'Only the card creator or board admin can link cards',
        403
      );
    }

    // Both cards must be on the same board
    if (!sourceCard.board_id.equals(targetCard.board_id)) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Cards must be on the same board', 400);
    }

    if (input.link_type === 'parent_of') {
      // Parent-child linking: both must be feedback cards
      if (sourceCard.card_type !== 'feedback' || targetCard.card_type !== 'feedback') {
        throw new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          'Both cards must be feedback cards for parent-child linking',
          400
        );
      }

      // Check for circular relationship
      const wouldBeCircular = await this.cardRepository.isAncestor(input.target_card_id, sourceCardId);
      if (wouldBeCircular) {
        throw new ApiError(
          ErrorCodes.CIRCULAR_RELATIONSHIP,
          'Cannot create circular parent-child relationship',
          400
        );
      }

      // Also check if source equals target
      if (sourceCardId === input.target_card_id) {
        throw new ApiError(
          ErrorCodes.CIRCULAR_RELATIONSHIP,
          'A card cannot be its own parent',
          400
        );
      }

      // 1-level hierarchy enforcement: source card cannot already be a child
      if (sourceCard.parent_card_id) {
        throw new ApiError(
          ErrorCodes.CHILD_CANNOT_BE_PARENT,
          'A child card cannot become a parent (1-level hierarchy limit)',
          400
        );
      }

      // 1-level hierarchy enforcement: target card cannot already have children
      const targetHasChildren = await this.cardRepository.hasChildren(input.target_card_id);
      if (targetHasChildren) {
        throw new ApiError(
          ErrorCodes.PARENT_CANNOT_BE_CHILD,
          'A parent card cannot become a child (1-level hierarchy limit)',
          400
        );
      }

      // Set parent (target becomes child of source)
      await this.cardRepository.setParentCard(input.target_card_id, sourceCardId);

      // Update source's aggregated count
      await this.cardRepository.incrementAggregatedReactionCount(
        sourceCardId,
        targetCard.direct_reaction_count
      );

      // Emit real-time event
      this.broadcaster.cardLinked({
        sourceId: sourceCardId,
        targetId: input.target_card_id,
        boardId: sourceCard.board_id.toHexString(),
        linkType: 'parent_of',
      });

      // Emit card:refresh for both parent and child with full data (for post-refresh sync)
      const [updatedParent, updatedChild] = await Promise.all([
        this.cardRepository.findByIdWithRelationships(sourceCardId),
        this.cardRepository.findByIdWithRelationships(input.target_card_id),
      ]);
      if (updatedParent) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedParent));
      }
      if (updatedChild) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedChild));
      }
    } else if (input.link_type === 'linked_to') {
      // Action-feedback linking: source must be action, target must be feedback
      if (sourceCard.card_type !== 'action') {
        throw new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          'Source card must be an action card',
          400
        );
      }
      if (targetCard.card_type !== 'feedback') {
        throw new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          'Target card must be a feedback card',
          400
        );
      }

      // Add linked feedback
      await this.cardRepository.addLinkedFeedback(sourceCardId, input.target_card_id);

      // Emit real-time event
      this.broadcaster.cardLinked({
        sourceId: sourceCardId,
        targetId: input.target_card_id,
        boardId: sourceCard.board_id.toHexString(),
        linkType: 'linked_to',
      });

      // Emit card:refresh for action card with updated linked_feedback_cards
      const updatedAction = await this.cardRepository.findByIdWithRelationships(sourceCardId);
      if (updatedAction) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedAction));
      }
    }
  }

  /**
   * Unlink two cards (source card creator or board admin only)
   */
  async unlinkCards(sourceCardId: string, input: LinkCardsInput, userHash: string): Promise<void> {
    // Get both cards
    const sourceCard = await this.cardRepository.findById(sourceCardId);
    const targetCard = await this.cardRepository.findById(input.target_card_id);

    if (!sourceCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Source card not found', 404);
    }
    if (!targetCard) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Target card not found', 404);
    }

    // Check board is active
    const board = await this.boardRepository.findById(sourceCard.board_id.toHexString());
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Authorization: only board admin can unlink cards
    const isAdmin = board.admins.includes(userHash);
    if (!isAdmin) {
      throw new ApiError(
        ErrorCodes.FORBIDDEN,
        'Only board admin can unlink cards',
        403
      );
    }

    if (input.link_type === 'parent_of') {
      // Verify target is actually a child of source
      if (!targetCard.parent_card_id?.equals(sourceCard._id)) {
        throw new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          'Target card is not a child of source card',
          400
        );
      }

      // Remove parent link
      await this.cardRepository.setParentCard(input.target_card_id, null);

      // Update source's aggregated count
      await this.cardRepository.incrementAggregatedReactionCount(
        sourceCardId,
        -targetCard.direct_reaction_count
      );

      // Emit real-time event
      this.broadcaster.cardUnlinked({
        sourceId: sourceCardId,
        targetId: input.target_card_id,
        boardId: sourceCard.board_id.toHexString(),
        linkType: 'parent_of',
      });

      // Emit card:refresh for both former parent and unlinked child with full data
      const [updatedParent, updatedChild] = await Promise.all([
        this.cardRepository.findByIdWithRelationships(sourceCardId),
        this.cardRepository.findByIdWithRelationships(input.target_card_id),
      ]);
      if (updatedParent) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedParent));
      }
      if (updatedChild) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedChild));
      }
    } else if (input.link_type === 'linked_to') {
      // Remove linked feedback
      await this.cardRepository.removeLinkedFeedback(sourceCardId, input.target_card_id);

      // Emit real-time event
      this.broadcaster.cardUnlinked({
        sourceId: sourceCardId,
        targetId: input.target_card_id,
        boardId: sourceCard.board_id.toHexString(),
        linkType: 'linked_to',
      });

      // Emit card:refresh for action card with updated linked_feedback_cards
      const updatedAction = await this.cardRepository.findByIdWithRelationships(sourceCardId);
      if (updatedAction) {
        this.broadcaster.cardRefresh(this.toCardRefreshPayload(updatedAction));
      }
    }
  }

  /**
   * Check card creation quota for a user
   */
  async getCardQuota(boardId: string, userHash: string): Promise<CardQuota> {
    // Check board exists
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    const limit = board.card_limit_per_user;
    const currentCount = await this.cardRepository.countUserCards(boardId, userHash, 'feedback');

    if (limit === null) {
      return {
        current_count: currentCount,
        limit: null,
        can_create: true,
        limit_enabled: false,
      };
    }

    return {
      current_count: currentCount,
      limit,
      can_create: currentCount < limit,
      limit_enabled: true,
    };
  }

  /**
   * Check if user is the card creator
   */
  async isCardCreator(cardId: string, userHash: string): Promise<boolean> {
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      return false;
    }
    return card.created_by_hash === userHash;
  }

  /**
   * Delete all cards for a board (for cascade delete)
   * Returns array of card IDs for reaction cleanup
   */
  async deleteCardsForBoard(boardId: string): Promise<string[]> {
    const cardIds = await this.cardRepository.getCardIdsByBoard(boardId);
    await this.cardRepository.deleteByBoard(boardId);
    return cardIds;
  }
}
