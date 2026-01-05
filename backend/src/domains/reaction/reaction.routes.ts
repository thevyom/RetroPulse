import { Router, RequestHandler } from 'express';
import { ReactionController } from './reaction.controller.js';
import { validateBody } from '@/shared/middleware/index.js';
import { addReactionSchema } from '@/shared/validation/index.js';

// Type assertion helper - controller methods are typed for AuthenticatedRequest
// but Express expects RequestHandler. The auth middleware guarantees the request is authenticated.
const asHandler = <T>(handler: T): RequestHandler => handler as unknown as RequestHandler;

/**
 * Create routes for card-scoped reaction operations (/v1/cards/:id/reactions)
 */
export function createCardReactionRoutes(controller: ReactionController): Router {
  const router = Router({ mergeParams: true });

  // POST /cards/:id/reactions - Add reaction
  router.post('/', validateBody(addReactionSchema), asHandler(controller.addReaction));

  // DELETE /cards/:id/reactions - Remove reaction
  router.delete('/', asHandler(controller.removeReaction));

  return router;
}

/**
 * Create routes for board-scoped reaction operations (/v1/boards/:id/reactions)
 */
export function createBoardReactionRoutes(controller: ReactionController): Router {
  const router = Router({ mergeParams: true });

  // GET /boards/:id/reactions/quota - Check reaction quota
  router.get('/quota', asHandler(controller.getReactionQuota));

  return router;
}
