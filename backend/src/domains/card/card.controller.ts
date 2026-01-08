import { Response, NextFunction, RequestHandler } from 'express';
import { CardService } from './card.service.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { sendSuccess } from '@/shared/utils/index.js';
import { logger } from '@/shared/logger/index.js';

// Type assertion helper for route handlers that require authentication
type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// Cast authenticated handler to Express RequestHandler
export const asHandler = (handler: AuthenticatedHandler): RequestHandler =>
  handler as unknown as RequestHandler;

export class CardController {
  constructor(private readonly cardService: CardService) {}

  /**
   * GET /boards/:boardId/cards
   * Get all cards for a board with optional filtering
   */
  getCards = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('GET /boards/:boardId/cards', {
      boardId: req.params.boardId,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      queryKeys: Object.keys(req.query),
    });

    try {
      const { boardId } = req.params;
      const { column_id, created_by, include_relationships } = req.query;

      const result = await this.cardService.getCards(boardId!, {
        columnId: column_id as string | undefined,
        createdBy: created_by as string | undefined,
        includeRelationships: include_relationships !== 'false',
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /boards/:boardId/cards
   * Create a new card
   */
  createCard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('POST /boards/:boardId/cards', {
      boardId: req.params.boardId,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const { boardId } = req.params;
      const { column_id, content, card_type, is_anonymous, correlation_id } = req.body;

      const card = await this.cardService.createCard(
        boardId!,
        { column_id, content, card_type, is_anonymous },
        req.hashedCookieId!,
        correlation_id
      );

      sendSuccess(res, card, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /boards/:boardId/cards/quota
   * Check card creation quota for the current user
   */
  getCardQuota = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('GET /boards/:boardId/cards/quota', {
      boardId: req.params.boardId,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
    });

    try {
      const { boardId } = req.params;
      const { created_by_hash } = req.query;

      // Use query param if provided, otherwise use current user's hash
      const userHash = (created_by_hash as string) || req.hashedCookieId;

      const quota = await this.cardService.getCardQuota(boardId!, userHash!);

      sendSuccess(res, quota);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /cards/:id
   * Get a single card by ID
   */
  getCard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('GET /cards/:id', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
    });

    try {
      const { id } = req.params;

      const card = await this.cardService.getCard(id!);

      sendSuccess(res, card);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /cards/:id
   * Update card content (creator only)
   */
  updateCard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('PUT /cards/:id', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const { id } = req.params;
      const { content } = req.body;

      const card = await this.cardService.updateCard(
        id!,
        { content },
        req.hashedCookieId!
      );

      sendSuccess(res, card);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /cards/:id
   * Delete a card (creator only, or admin override)
   */
  deleteCard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('DELETE /cards/:id', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
    });

    try {
      const { id } = req.params;

      await this.cardService.deleteCard(id!, req.hashedCookieId!, req.isAdminOverride);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /cards/:id/column
   * Move card to a different column (creator only)
   */
  moveCard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('PATCH /cards/:id/column', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const { id } = req.params;
      const { column_id } = req.body;

      const card = await this.cardService.moveCard(
        id!,
        { column_id },
        req.hashedCookieId!
      );

      sendSuccess(res, card);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cards/:id/link
   * Link cards together
   */
  linkCards = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('POST /cards/:id/link', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const { id } = req.params;
      const { target_card_id, link_type } = req.body;

      await this.cardService.linkCards(
        id!,
        { target_card_id, link_type },
        req.hashedCookieId!
      );

      sendSuccess(res, {
        source_card_id: id,
        target_card_id,
        link_type,
      }, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /cards/:id/link
   * Unlink cards
   */
  unlinkCards = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('DELETE /cards/:id/link', {
      cardId: req.params.id,
      userHash: req.hashedCookieId?.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const { id } = req.params;
      const { target_card_id, link_type } = req.body;

      await this.cardService.unlinkCards(
        id!,
        { target_card_id, link_type },
        req.hashedCookieId!
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
