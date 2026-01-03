import { Router, RequestHandler } from 'express';
import { BoardController } from './board.controller.js';
import { validateBody } from '@/shared/middleware/index.js';
import {
  createBoardSchema,
  updateBoardNameSchema,
  updateColumnNameSchema,
  addAdminSchema,
} from '@/shared/validation/index.js';

export function createBoardRoutes(controller: BoardController): Router {
  const router = Router();

  // POST /boards - Create a new board
  router.post('/', validateBody(createBoardSchema), controller.createBoard as RequestHandler);

  // GET /boards/by-link/:linkCode - Get board by shareable link
  router.get('/by-link/:linkCode', controller.getBoardByLink as RequestHandler);

  // GET /boards/:id - Get board details
  router.get('/:id', controller.getBoard as RequestHandler);

  // PATCH /boards/:id/name - Update board name
  router.patch('/:id/name', validateBody(updateBoardNameSchema), controller.updateBoardName as RequestHandler);

  // PATCH /boards/:id/close - Close a board
  router.patch('/:id/close', controller.closeBoard as RequestHandler);

  // POST /boards/:id/admins - Add a co-admin
  router.post('/:id/admins', validateBody(addAdminSchema), controller.addAdmin as RequestHandler);

  // PATCH /boards/:id/columns/:columnId - Rename a column
  router.patch(
    '/:id/columns/:columnId',
    validateBody(updateColumnNameSchema),
    controller.renameColumn as RequestHandler
  );

  // DELETE /boards/:id - Delete a board
  router.delete('/:id', controller.deleteBoard as RequestHandler);

  return router;
}

// Export a factory function that creates routes with dependencies
export const boardRoutes = createBoardRoutes;
