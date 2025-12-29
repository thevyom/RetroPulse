import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Db } from 'mongodb';
import {
  startTestDb,
  stopTestDb,
  clearTestDb,
  createTestApp,
  addErrorHandlers,
} from '../utils/index.js';
import {
  BoardRepository,
  BoardService,
  BoardController,
  createBoardRoutes,
} from '@/domains/board/index.js';
import {
  CardRepository,
} from '@/domains/card/index.js';
import {
  ReactionRepository,
} from '@/domains/reaction/index.js';
import {
  UserSessionRepository,
} from '@/domains/user/index.js';
import {
  AdminService,
  AdminController,
  createAdminRoutes,
} from '@/domains/admin/index.js';

const ADMIN_SECRET = 'dev-admin-secret-16chars';

describe('Admin API Integration Tests', () => {
  let app: Express;
  let db: Db;
  let boardRepository: BoardRepository;
  let cardRepository: CardRepository;
  let reactionRepository: ReactionRepository;
  let userSessionRepository: UserSessionRepository;

  beforeAll(async () => {
    db = await startTestDb();

    // Set up app with board and admin routes
    app = createTestApp();

    boardRepository = new BoardRepository(db);
    cardRepository = new CardRepository(db);
    reactionRepository = new ReactionRepository(db);
    userSessionRepository = new UserSessionRepository(db);

    const boardService = new BoardService(boardRepository);
    const boardController = new BoardController(boardService);
    app.use('/v1/boards', createBoardRoutes(boardController));

    const adminService = new AdminService(
      db,
      boardRepository,
      cardRepository,
      reactionRepository,
      userSessionRepository
    );
    const adminController = new AdminController(adminService);
    app.use('/v1/boards/:id/test', createAdminRoutes(adminController));

    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  async function createTestBoard() {
    const response = await request(app)
      .post('/v1/boards')
      .send({
        name: 'Test Board',
        columns: [
          { id: 'col-1', name: 'What Went Well' },
          { id: 'col-2', name: 'Improvements' },
        ],
      });
    return response.body.data;
  }

  describe('Admin Authentication', () => {
    it('should require admin secret header', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Admin secret key required');
    });

    it('should reject invalid admin secret', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', 'wrong-secret');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid admin secret key');
    });
  });

  describe('POST /v1/boards/:id/test/clear', () => {
    it('should clear all data for a board', async () => {
      const board = await createTestBoard();

      // Seed some data first
      const seedResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 3,
          num_cards: 5,
          num_action_cards: 2,
          num_reactions: 10,
          create_relationships: false,
        });

      expect(seedResponse.status).toBe(201);

      // Now clear the board
      const clearResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body.success).toBe(true);
      expect(clearResponse.body.data.cards_deleted).toBe(7); // 5 feedback + 2 action
      expect(clearResponse.body.data.sessions_deleted).toBe(3);
      expect(clearResponse.body.data.reactions_deleted).toBeGreaterThanOrEqual(0);
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .post('/v1/boards/507f1f77bcf86cd799439011/test/clear')
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .post('/v1/boards/invalid-id/test/clear')
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty board gracefully', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(200);
      expect(response.body.data.cards_deleted).toBe(0);
      expect(response.body.data.reactions_deleted).toBe(0);
      expect(response.body.data.sessions_deleted).toBe(0);
    });
  });

  describe('POST /v1/boards/:id/test/reset', () => {
    it('should reset an active board without reopening', async () => {
      const board = await createTestBoard();

      // Seed some data
      await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 2,
          num_cards: 3,
          num_action_cards: 0,
          num_reactions: 0,
          create_relationships: false,
        });

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/reset`)
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.board_reopened).toBe(false);
      expect(response.body.data.cards_deleted).toBe(3);
      expect(response.body.data.sessions_deleted).toBe(2);
    });

    it('should reopen a closed board', async () => {
      const board = await createTestBoard();

      // Close the board by updating it directly
      await db.collection('boards').updateOne(
        { shareable_link: board.shareable_link.split('/').pop() },
        { $set: { state: 'closed', closed_at: new Date() } }
      );

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/reset`)
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(200);
      expect(response.body.data.board_reopened).toBe(true);

      // Verify board is now active
      const updatedBoard = await boardRepository.findById(board.id);
      expect(updatedBoard?.state).toBe('active');
      expect(updatedBoard?.closed_at).toBeNull();
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .post('/v1/boards/507f1f77bcf86cd799439011/test/reset')
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });
  });

  describe('POST /v1/boards/:id/test/seed', () => {
    it('should seed test data with default values', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users_created).toBe(5); // default
      expect(response.body.data.cards_created).toBe(20); // default
      expect(response.body.data.action_cards_created).toBe(5); // default
      expect(response.body.data.user_aliases).toHaveLength(5);
    });

    it('should seed test data with custom values', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 3,
          num_cards: 10,
          num_action_cards: 2,
          num_reactions: 5,
          create_relationships: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.users_created).toBe(3);
      expect(response.body.data.cards_created).toBe(10);
      expect(response.body.data.action_cards_created).toBe(2);
      expect(response.body.data.relationships_created).toBeGreaterThan(0);
      expect(response.body.data.user_aliases).toHaveLength(3);
    });

    it('should create parent-child relationships', async () => {
      const board = await createTestBoard();

      await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 2,
          num_cards: 6,
          num_action_cards: 2,
          num_reactions: 0,
          create_relationships: true,
        });

      // Verify some cards have parents
      const cards = await cardRepository.findByBoard(board.id);
      const cardsWithParents = cards.filter(c => c.parent_card_id !== null);
      expect(cardsWithParents.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .post('/v1/boards/507f1f77bcf86cd799439011/test/seed')
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 1, num_cards: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should return 400 for closed board', async () => {
      const board = await createTestBoard();

      // Close the board
      await db.collection('boards').updateOne(
        { shareable_link: board.shareable_link.split('/').pop() },
        { $set: { state: 'closed', closed_at: new Date() } }
      );

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 1, num_cards: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should validate input constraints', async () => {
      const board = await createTestBoard();

      // num_users must be positive
      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should respect max limits', async () => {
      const board = await createTestBoard();

      // num_users max is 100
      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 200 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should generate unique user aliases', async () => {
      const board = await createTestBoard();

      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 10,
          num_cards: 1,
          num_action_cards: 0,
          num_reactions: 0,
        });

      expect(response.status).toBe(201);
      const aliases = response.body.data.user_aliases;
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(10);
    });
  });

  describe('Clear then Seed workflow', () => {
    it('should allow clearing and reseeding a board', async () => {
      const board = await createTestBoard();

      // First seed
      await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 2, num_cards: 5, num_action_cards: 0, num_reactions: 0 });

      // Clear
      const clearResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', ADMIN_SECRET);

      expect(clearResponse.body.data.cards_deleted).toBe(5);

      // Second seed with different data
      const seedResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 3, num_cards: 10, num_action_cards: 0, num_reactions: 0 });

      expect(seedResponse.status).toBe(201);
      expect(seedResponse.body.data.users_created).toBe(3);
      expect(seedResponse.body.data.cards_created).toBe(10);

      // Verify data count
      const count = await cardRepository.countByBoard(board.id);
      expect(count).toBe(10);
    });
  });

  describe('Edge Cases - Max Limits and Concurrency', () => {
    it('should handle moderate data volume (50 users, 100 cards)', async () => {
      const board = await createTestBoard();

      const startTime = Date.now();
      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 50,
          num_cards: 100,
          num_action_cards: 20,
          num_reactions: 200,
          create_relationships: true,
        });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(response.body.data.users_created).toBe(50);
      expect(response.body.data.cards_created).toBe(100);
      expect(response.body.data.action_cards_created).toBe(20);
      expect(duration).toBeLessThan(60000); // Should complete in under 60 seconds
    });

    it('should handle concurrent clear requests gracefully (idempotent)', async () => {
      const board = await createTestBoard();

      // Seed some data first
      await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({ num_users: 5, num_cards: 20, num_action_cards: 0, num_reactions: 0 });

      // Two concurrent clear requests
      const [response1, response2] = await Promise.all([
        request(app)
          .post(`/v1/boards/${board.id}/test/clear`)
          .set('X-Admin-Secret', ADMIN_SECRET),
        request(app)
          .post(`/v1/boards/${board.id}/test/clear`)
          .set('X-Admin-Secret', ADMIN_SECRET),
      ]);

      // Both should succeed (idempotent - second clears 0 items)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Combined total should equal original count (one clears all, other clears 0)
      const totalCleared = response1.body.data.cards_deleted + response2.body.data.cards_deleted;
      expect(totalCleared).toBe(20);
    });

    it('should handle clear with large dataset', async () => {
      const board = await createTestBoard();

      // Seed moderate data
      await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', ADMIN_SECRET)
        .send({
          num_users: 30,
          num_cards: 100,
          num_action_cards: 10,
          num_reactions: 200,
          create_relationships: true,
        });

      const startTime = Date.now();
      const response = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', ADMIN_SECRET);
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.cards_deleted).toBe(110); // 100 feedback + 10 action
      expect(response.body.data.sessions_deleted).toBe(30);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
    });
  });
});
