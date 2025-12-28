import { Router } from 'express';
import { UserSessionController } from './user-session.controller.js';
import { validateBody } from '@/shared/middleware/index.js';
import { joinBoardSchema, updateAliasSchema } from '@/shared/validation/index.js';

/**
 * Create user session routes
 * Note: These routes are mounted under /v1/boards/:id
 * and handled separately from main board routes
 * Authentication is already handled at the /v1 level in app.ts
 */
export function createUserSessionRoutes(
  controller: UserSessionController
): Router {
  const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

  // POST /boards/:id/join - Join a board
  router.post('/join', validateBody(joinBoardSchema), controller.joinBoard);

  // GET /boards/:id/users - Get active users
  router.get('/users', controller.getActiveUsers);

  // PATCH /boards/:id/users/heartbeat - Update heartbeat
  router.patch('/users/heartbeat', controller.updateHeartbeat);

  // PATCH /boards/:id/users/alias - Update alias
  router.patch('/users/alias', validateBody(updateAliasSchema), controller.updateAlias);

  return router;
}

// Export for use in tests
export const userSessionRoutes = createUserSessionRoutes;
