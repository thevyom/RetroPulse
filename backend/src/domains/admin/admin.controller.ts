import type { Request, Response, NextFunction } from 'express';
import type { AdminService } from './admin.service.js';
import type { SeedTestDataInput } from './types.js';
import { sendSuccess } from '@/shared/utils/index.js';

export class AdminController {
  constructor(private adminService: AdminService) {}

  /**
   * Clear all data for a board (keep the board itself)
   * POST /v1/boards/:id/test/clear
   */
  clearBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.adminService.clearBoard(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset a board: clear all data and reopen if closed
   * POST /v1/boards/:id/test/reset
   */
  resetBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.adminService.resetBoard(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Seed test data into a board
   * POST /v1/boards/:id/test/seed
   */
  seedTestData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const input = req.body as SeedTestDataInput;
      const result = await this.adminService.seedTestData(id, input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };
}
