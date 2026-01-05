import { Router, RequestHandler } from 'express';
import { CardController } from './card.controller.js';
import { validateBody } from '@/shared/middleware/index.js';
import {
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  linkCardsSchema,
} from '@/shared/validation/index.js';

// Type assertion helper - controller methods are typed for AuthenticatedRequest
// but Express expects RequestHandler. The auth middleware guarantees the request is authenticated.
const asHandler = <T>(handler: T): RequestHandler => handler as unknown as RequestHandler;

/**
 * Create routes for board-scoped card operations
 * These routes are mounted at /v1/boards/:boardId
 */
export function createBoardCardRoutes(controller: CardController): Router {
  const router = Router({ mergeParams: true });

  // GET /boards/:boardId/cards - Get all cards for a board
  router.get('/cards', asHandler(controller.getCards));

  // POST /boards/:boardId/cards - Create a new card
  router.post('/cards', validateBody(createCardSchema), asHandler(controller.createCard));

  // GET /boards/:boardId/cards/quota - Check card quota
  router.get('/cards/quota', asHandler(controller.getCardQuota));

  return router;
}

/**
 * Create routes for card-scoped operations
 * These routes are mounted at /v1/cards
 */
export function createCardRoutes(controller: CardController): Router {
  const router = Router();

  // GET /cards/:id - Get a single card
  router.get('/:id', asHandler(controller.getCard));

  // PUT /cards/:id - Update card content
  router.put('/:id', validateBody(updateCardSchema), asHandler(controller.updateCard));

  // DELETE /cards/:id - Delete a card
  router.delete('/:id', asHandler(controller.deleteCard));

  // PATCH /cards/:id/column - Move card to different column
  router.patch('/:id/column', validateBody(moveCardSchema), asHandler(controller.moveCard));

  // POST /cards/:id/link - Link cards
  router.post('/:id/link', validateBody(linkCardsSchema), asHandler(controller.linkCards));

  // DELETE /cards/:id/link - Unlink cards (legacy, kept for backward compatibility)
  router.delete('/:id/link', validateBody(linkCardsSchema), asHandler(controller.unlinkCards));

  // POST /cards/:id/unlink - Unlink cards (UTB-024 fix: POST avoids DELETE body issues)
  router.post('/:id/unlink', validateBody(linkCardsSchema), asHandler(controller.unlinkCards));

  return router;
}
