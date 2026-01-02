import { Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { BoardService } from './board.service.js';
import { UserSessionService } from '@/domains/user/user-session.service.js';
import type { AuthenticatedRequest } from '@/shared/types/index.js';
import { sendSuccess, requireParam } from '@/shared/utils/index.js';
import { env } from '@/shared/config/index.js';

/**
 * Timing-safe comparison of admin secret to prevent timing attacks
 */
function isValidAdminSecret(providedSecret: string | string[] | undefined): boolean {
  const expectedSecret = env.ADMIN_SECRET_KEY;

  if (!providedSecret || typeof providedSecret !== 'string') {
    return false;
  }

  // Ensure both strings are the same length for timingSafeEqual
  if (providedSecret.length !== expectedSecret.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(providedSecret, 'utf8'),
      Buffer.from(expectedSecret, 'utf8')
    );
  } catch {
    return false;
  }
}

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
    try {
      const id = requireParam(req.params.id, 'Board ID');
      const { name } = req.body;
      const board = await this.boardService.updateBoardName(id, name, req.hashedCookieId);
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
    try {
      const id = requireParam(req.params.id, 'Board ID');
      const board = await this.boardService.closeBoard(id, req.hashedCookieId);
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
    try {
      const id = requireParam(req.params.id, 'Board ID');
      const { user_cookie_hash } = req.body;
      const board = await this.boardService.addAdmin(id, user_cookie_hash, req.hashedCookieId);
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
    try {
      const id = requireParam(req.params.id, 'Board ID');
      const columnId = requireParam(req.params.columnId, 'Column ID');
      const { name } = req.body;
      const board = await this.boardService.renameColumn(id, columnId, name, req.hashedCookieId);
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
    try {
      const id = requireParam(req.params.id, 'Board ID');
      const adminSecret = req.headers['x-admin-secret'];
      const isAdminSecret = isValidAdminSecret(adminSecret);

      await this.boardService.deleteBoard(id, req.hashedCookieId, isAdminSecret);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
