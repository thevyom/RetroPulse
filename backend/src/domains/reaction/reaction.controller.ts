import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { sendSuccess } from '@/shared/utils/index.js';
import { ReactionService } from './reaction.service.js';
import type { AddReactionInput } from './types.js';

export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  /**
   * POST /cards/:id/reactions
   * Add a reaction to a card
   */
  addReaction = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: cardId } = req.params;
      const input = req.body as AddReactionInput;
      const userHash = req.hashedCookieId;

      const reaction = await this.reactionService.addReaction(cardId, input, userHash);

      sendSuccess(res, reaction, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /cards/:id/reactions
   * Remove a reaction from a card
   */
  removeReaction = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: cardId } = req.params;
      const userHash = req.hashedCookieId;

      await this.reactionService.removeReaction(cardId, userHash);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /boards/:id/reactions/quota
   * Check reaction quota for a user
   */
  getReactionQuota = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: boardId } = req.params;
      // Allow checking quota for another user (admin use case)
      const userHash = (req.query.created_by_hash as string) || req.hashedCookieId;

      const quota = await this.reactionService.getReactionQuota(boardId, userHash);

      sendSuccess(res, quota);
    } catch (error) {
      next(error);
    }
  };
}
