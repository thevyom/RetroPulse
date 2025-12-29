import { Response, NextFunction } from 'express';
import { UserSessionService } from './user-session.service.js';
import { AuthenticatedRequest } from '@/shared/types/index.js';
import { sendSuccess, requireParam } from '@/shared/utils/index.js';
import { JoinBoardDTO, UpdateAliasDTO } from '@/shared/validation/index.js';

export class UserSessionController {
  constructor(private readonly userSessionService: UserSessionService) {}

  /**
   * POST /boards/:id/join - Join a board
   */
  joinBoard = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const boardId = requireParam(req.params.id, 'Board ID');
      const { alias } = req.body as JoinBoardDTO;
      const cookieHash = req.hashedCookieId;

      const userSession = await this.userSessionService.joinBoard(
        boardId,
        cookieHash,
        alias
      );

      sendSuccess(res, {
        board_id: userSession.board_id,
        user_session: {
          cookie_hash: userSession.cookie_hash,
          alias: userSession.alias,
          is_admin: userSession.is_admin,
          last_active_at: userSession.last_active_at,
          created_at: userSession.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /boards/:id/users - Get active users
   */
  getActiveUsers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const boardId = requireParam(req.params.id, 'Board ID');

      const activeUsers = await this.userSessionService.getActiveUsers(boardId);

      sendSuccess(res, {
        active_users: activeUsers,
        total_count: activeUsers.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /boards/:id/users/heartbeat - Update heartbeat
   */
  updateHeartbeat = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const boardId = requireParam(req.params.id, 'Board ID');
      const cookieHash = req.hashedCookieId;

      const result = await this.userSessionService.updateHeartbeat(
        boardId,
        cookieHash
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /boards/:id/users/alias - Update user alias
   */
  updateAlias = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const boardId = requireParam(req.params.id, 'Board ID');
      const { alias } = req.body as UpdateAliasDTO;
      const cookieHash = req.hashedCookieId;

      const result = await this.userSessionService.updateAlias(
        boardId,
        cookieHash,
        alias
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
