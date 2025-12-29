import { Router } from 'express';
import type { AdminController } from './admin.controller.js';
import { adminAuthMiddleware, validateParams, validateBody } from '@/shared/middleware/index.js';
import { seedTestDataSchema, objectIdParamSchema } from '@/shared/validation/schemas.js';

/**
 * Create admin test routes
 * All routes require admin secret authentication
 */
export function createAdminRoutes(controller: AdminController): Router {
  const router = Router({ mergeParams: true });

  // Apply admin auth and ObjectId validation to all routes
  router.use(adminAuthMiddleware);
  router.use(validateParams(objectIdParamSchema));

  // POST /boards/:id/test/clear - Clear all board data
  router.post('/clear', controller.clearBoard);

  // POST /boards/:id/test/reset - Reset board (clear + reopen)
  router.post('/reset', controller.resetBoard);

  // POST /boards/:id/test/seed - Seed test data
  router.post('/seed', validateBody(seedTestDataSchema), controller.seedTestData);

  return router;
}
