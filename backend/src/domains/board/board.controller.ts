import { Response, NextFunction } from 'express';
import { BoardService } from './board.service.js';
import { UserSessionService } from '@/domains/user/user-session.service.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { sendSuccess, requireParam } from '@/shared/utils/index.js';
import { logger } from '@/shared/logger/index.js';

export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly userSessionService?: UserSessionService
  ) {}

  /**
   * POST /boards - Create a new board
   * UTB-014: Auto-joins creator if creator_alias is provided
   */
  createBoard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('POST /boards', {
      userHash: req.hashedCookieId.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const board = await this.boardService.createBoard(req.body, req.hashedCookieId);

      // UTB-014: Auto-join creator if alias provided
      let userSession = null;
      if (req.body.creator_alias && this.userSessionService) {
        userSession = await this.userSessionService.joinBoard(
          board.id,
          req.hashedCookieId,
          req.body.creator_alias
        );
      }

      sendSuccess(res, { ...board, user_session: userSession }, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /boards/:id - Get board details
   */
  getBoard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('GET /boards/:id', {
      boardId: req.params.id,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');
      const board = await this.boardService.getBoardWithUsers(id);

      // Check if current user is admin
      const isAdmin = await this.boardService.isAdmin(id, req.hashedCookieId);

      sendSuccess(res, {
        ...board,
        is_current_user_admin: isAdmin,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /boards/by-link/:linkCode - Get board by shareable link
   */
  getBoardByLink = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('GET /boards/by-link/:linkCode', {
      linkCode: req.params.linkCode,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
    });

    try {
      const linkCode = requireParam(req.params.linkCode, 'Link code');
      const board = await this.boardService.getBoardByLink(linkCode);
      sendSuccess(res, board);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /boards/:id/name - Update board name
   */
  updateBoardName = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('PATCH /boards/:id/name', {
      boardId: req.params.id,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');
      const { name } = req.body;
      const board = await this.boardService.updateBoardName(id, name, req.hashedCookieId, req.isAdminOverride);
      sendSuccess(res, board);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /boards/:id/close - Close a board
   */
  closeBoard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('PATCH /boards/:id/close', {
      boardId: req.params.id,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');
      const board = await this.boardService.closeBoard(id, req.hashedCookieId, req.isAdminOverride);
      sendSuccess(res, board);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /boards/:id/admins - Add a co-admin
   */
  addAdmin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('POST /boards/:id/admins', {
      boardId: req.params.id,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');
      const { user_cookie_hash } = req.body;
      const board = await this.boardService.addAdmin(id, user_cookie_hash, req.hashedCookieId, req.isAdminOverride);
      sendSuccess(res, board, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /boards/:id/columns/:columnId - Rename a column
   */
  renameColumn = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('PATCH /boards/:id/columns/:columnId', {
      boardId: req.params.id,
      columnId: req.params.columnId,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
      bodyKeys: Object.keys(req.body),
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');
      const columnId = requireParam(req.params.columnId, 'Column ID');
      const { name } = req.body;
      const board = await this.boardService.renameColumn(id, columnId, name, req.hashedCookieId, req.isAdminOverride);
      sendSuccess(res, board);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /boards/:id - Delete a board
   */
  deleteBoard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    logger.debug('DELETE /boards/:id', {
      boardId: req.params.id,
      userHash: req.hashedCookieId.substring(0, 8) + '...',
    });

    try {
      const id = requireParam(req.params.id, 'Board ID');

      await this.boardService.deleteBoard(id, req.hashedCookieId, req.isAdminOverride);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
