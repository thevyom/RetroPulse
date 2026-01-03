import { ReactionRepository } from './reaction.repository.js';
import { CardRepository } from '../card/card.repository.js';
import { BoardRepository } from '../board/board.repository.js';
import { UserSessionRepository } from '../user/user-session.repository.js';
import { Reaction, ReactionQuota, AddReactionInput, reactionDocumentToReaction } from './types.js';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';
import { eventBroadcaster, type IEventBroadcaster } from '@/gateway/socket/index.js';

export class ReactionService {
  private broadcaster: IEventBroadcaster;

  constructor(
    private readonly reactionRepository: ReactionRepository,
    private readonly cardRepository: CardRepository,
    private readonly boardRepository: BoardRepository,
    private readonly userSessionRepository: UserSessionRepository,
    broadcaster?: IEventBroadcaster
  ) {
    this.broadcaster = broadcaster ?? eventBroadcaster;
  }

  /**
   * Add a reaction to a card
   */
  async addReaction(cardId: string, input: AddReactionInput, userHash: string): Promise<Reaction> {
    // Get the card
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    const boardId = card.board_id.toHexString();

    // Check board exists and is active
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Check if user already has a reaction on this card
    const existingReaction = await this.reactionRepository.findByCardAndUser(cardId, userHash);

    // If this would be a new reaction, check the limit
    if (!existingReaction && board.reaction_limit_per_user !== null) {
      const currentCount = await this.reactionRepository.countUserReactionsOnBoard(boardId, userHash);
      if (currentCount >= board.reaction_limit_per_user) {
        throw new ApiError(
          ErrorCodes.REACTION_LIMIT_REACHED,
          `Reaction limit of ${board.reaction_limit_per_user} reached`,
          403
        );
      }
    }

    // Get user's alias from session
    const session = await this.userSessionRepository.findByBoardAndUser(boardId, userHash);
    const userAlias = session?.alias ?? null;

    // Upsert the reaction
    const { document, isNew } = await this.reactionRepository.upsert(
      cardId,
      userHash,
      userAlias,
      input.reaction_type
    );

    // If this is a new reaction, update card reaction counts
    if (isNew) {
      await this.updateReactionCounts(cardId, 1);
    }

    const reaction = reactionDocumentToReaction(document);

    // Emit real-time event (only for new reactions)
    if (isNew) {
      // Get updated card counts
      const updatedCard = await this.cardRepository.findById(cardId);
      if (updatedCard) {
        this.broadcaster.reactionAdded({
          cardId,
          boardId,
          userAlias,
          reactionType: input.reaction_type,
          directCount: updatedCard.direct_reaction_count,
          aggregatedCount: updatedCard.aggregated_reaction_count,
          parentCardId: updatedCard.parent_card_id?.toHexString() ?? null,
        });
      }
    }

    return reaction;
  }

  /**
   * Remove a reaction from a card
   */
  async removeReaction(cardId: string, userHash: string): Promise<void> {
    // Get the card
    const card = await this.cardRepository.findById(cardId);
    if (!card) {
      throw new ApiError(ErrorCodes.CARD_NOT_FOUND, 'Card not found', 404);
    }

    const boardId = card.board_id.toHexString();

    // Check board exists and is active
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    if (board.state === 'closed') {
      throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);
    }

    // Check if reaction exists
    const existingReaction = await this.reactionRepository.findByCardAndUser(cardId, userHash);
    if (!existingReaction) {
      throw new ApiError(ErrorCodes.REACTION_NOT_FOUND, 'Reaction not found', 404);
    }

    // Get user's alias for the event before deletion
    const session = await this.userSessionRepository.findByBoardAndUser(boardId, userHash);
    const userAlias = session?.alias ?? null;

    // Delete the reaction
    const deleted = await this.reactionRepository.delete(cardId, userHash);
    if (!deleted) {
      throw new ApiError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete reaction', 500);
    }

    // Update card reaction counts
    await this.updateReactionCounts(cardId, -1);

    // Emit real-time event
    const updatedCard = await this.cardRepository.findById(cardId);
    if (updatedCard) {
      this.broadcaster.reactionRemoved({
        cardId,
        boardId,
        userAlias,
        directCount: updatedCard.direct_reaction_count,
        aggregatedCount: updatedCard.aggregated_reaction_count,
        parentCardId: updatedCard.parent_card_id?.toHexString() ?? null,
      });
    }
  }

  /**
   * Update reaction counts for a card and its parent (if any)
   */
  private async updateReactionCounts(cardId: string, delta: number): Promise<void> {
    // Update the card's direct reaction count
    await this.cardRepository.incrementDirectReactionCount(cardId, delta);

    // Get the card to check if it has a parent
    const card = await this.cardRepository.findById(cardId);
    if (card?.parent_card_id) {
      // Update parent's aggregated reaction count
      await this.cardRepository.incrementAggregatedReactionCount(
        card.parent_card_id.toHexString(),
        delta
      );
    }
  }

  /**
   * Get reaction quota for a user on a board
   */
  async getReactionQuota(boardId: string, userHash: string): Promise<ReactionQuota> {
    // Check board exists
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
    }

    const limit = board.reaction_limit_per_user;
    const currentCount = await this.reactionRepository.countUserReactionsOnBoard(boardId, userHash);

    if (limit === null) {
      return {
        current_count: currentCount,
        limit: null,
        can_react: true,
        limit_enabled: false,
      };
    }

    return {
      current_count: currentCount,
      limit,
      can_react: currentCount < limit,
      limit_enabled: true,
    };
  }

  /**
   * Check if user has reacted to a card
   */
  async hasUserReacted(cardId: string, userHash: string): Promise<boolean> {
    return this.reactionRepository.hasUserReacted(cardId, userHash);
  }

  /**
   * Get user's reaction on a card (if any)
   */
  async getUserReaction(cardId: string, userHash: string): Promise<Reaction | null> {
    const reaction = await this.reactionRepository.findByCardAndUser(cardId, userHash);
    return reaction ? reactionDocumentToReaction(reaction) : null;
  }

  /**
   * Delete all reactions for a card (for cascade delete)
   */
  async deleteReactionsForCard(cardId: string): Promise<number> {
    return this.reactionRepository.deleteByCard(cardId);
  }

  /**
   * Delete all reactions for multiple cards (for board cascade delete)
   */
  async deleteReactionsForCards(cardIds: string[]): Promise<number> {
    return this.reactionRepository.deleteByCards(cardIds);
  }
}
