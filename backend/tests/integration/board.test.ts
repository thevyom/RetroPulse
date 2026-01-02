import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import {
  startTestDb,
  stopTestDb,
  getTestDb,
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
  UserSessionRepository,
  UserSessionService,
} from '@/domains/user/index.js';

describe('Board API Integration Tests', () => {
  let app: Express;
  let boardRepository: BoardRepository;
  let userSessionRepository: UserSessionRepository;

  beforeAll(async () => {
    const db = await startTestDb();

    // Set up app with board routes
    app = createTestApp();
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);
    const boardService = new BoardService(boardRepository);
    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);
    // UTB-014: Pass userSessionService for auto-join on board creation
    const boardController = new BoardController(boardService, userSessionService);
    app.use('/v1/boards', createBoardRoutes(boardController));
    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('POST /v1/boards', () => {
    it('should create a board with valid input', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Sprint 42 Retro',
          columns: [
            { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
            { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
          ],
          card_limit_per_user: 5,
          reaction_limit_per_user: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Sprint 42 Retro');
      expect(response.body.data.columns).toHaveLength(2);
      expect(response.body.data.shareable_link).toContain('/join/');
      expect(response.body.data.state).toBe('active');
      expect(response.body.data.admins).toHaveLength(1);
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: '',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty columns', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for more than 10 columns', async () => {
      const columns = Array.from({ length: 11 }, (_, i) => ({
        id: `col-${i}`,
        name: `Column ${i}`,
      }));

      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/boards/:id', () => {
    it('should get board by ID', async () => {
      // Create a board first
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      const response = await request(app).get(`/v1/boards/${boardId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Test Board');
      expect(response.body.data.active_users).toEqual([]);
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app).get('/v1/boards/507f1f77bcf86cd799439011');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });
  });

  describe('PATCH /v1/boards/:id/name', () => {
    it('should update board name when user is admin', async () => {
      // Create a board (creator is automatically admin)
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Old Name',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/name`)
        .set('Cookie', cookies)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 403 when user is not admin', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try to update without creator's cookie (new session)
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/name`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /v1/boards/:id/close', () => {
    it('should close board when user is admin', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.state).toBe('closed');
      expect(response.body.data.closed_at).not.toBeNull();
    });

    it('should prevent updates on closed board', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to update name
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/name`)
        .set('Cookie', cookies)
        .send({ name: 'New Name' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });
  });

  describe('POST /v1/boards/:id/admins', () => {
    it('should add co-admin when requester is creator', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const response = await request(app)
        .post(`/v1/boards/${boardId}/admins`)
        .set('Cookie', cookies)
        .send({ user_cookie_hash: 'new-admin-hash' });

      expect(response.status).toBe(201);
      expect(response.body.data.admins).toContain('new-admin-hash');
    });

    it('should return 403 when requester is not creator', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try without creator's cookie
      const response = await request(app)
        .post(`/v1/boards/${boardId}/admins`)
        .send({ user_cookie_hash: 'new-admin-hash' });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /v1/boards/:id/columns/:columnId', () => {
    it('should rename column when user is admin', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Old Name' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/columns/col-1`)
        .set('Cookie', cookies)
        .send({ name: 'New Column Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.columns[0].name).toBe('New Column Name');
    });

    it('should return 400 for non-existent column', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/columns/nonexistent`)
        .set('Cookie', cookies)
        .send({ name: 'New Name' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v1/boards/:id', () => {
    it('should delete board when user is creator', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      const deleteResponse = await request(app)
        .delete(`/v1/boards/${boardId}`)
        .set('Cookie', cookies);

      expect(deleteResponse.status).toBe(204);

      // Verify board is deleted
      const getResponse = await request(app).get(`/v1/boards/${boardId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 403 when user is not creator', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try without creator's cookie
      const response = await request(app).delete(`/v1/boards/${boardId}`);

      expect(response.status).toBe(403);
    });

    it('should delete board with valid X-Admin-Secret header', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Delete using admin secret (without creator cookie)
      const deleteResponse = await request(app)
        .delete(`/v1/boards/${boardId}`)
        .set('X-Admin-Secret', 'dev-admin-secret-16chars');

      expect(deleteResponse.status).toBe(204);

      // Verify board is deleted
      const getResponse = await request(app).get(`/v1/boards/${boardId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 403 for invalid X-Admin-Secret', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try with wrong admin secret
      const response = await request(app)
        .delete(`/v1/boards/${boardId}`)
        .set('X-Admin-Secret', 'wrong-secret');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /v1/boards/by-link/:linkCode', () => {
    it('should get board by shareable link code', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const shareableLink = createResponse.body.data.shareable_link;
      // Extract link code from full URL (e.g., "http://localhost:3000/join/abc123def456")
      const linkCode = shareableLink.split('/join/')[1];

      const response = await request(app).get(`/v1/boards/by-link/${linkCode}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Test Board');
    });

    it('should return 404 for non-existent link code', async () => {
      const response = await request(app).get('/v1/boards/by-link/nonexistent1');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });
  });

  describe('POST /v1/boards - UTB-014: Auto-join on board creation', () => {
    it('should auto-join creator when creator_alias is provided', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          creator_alias: 'John Smith',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user_session).not.toBeNull();
      expect(response.body.data.user_session.alias).toBe('John Smith');
      expect(response.body.data.user_session.is_admin).toBe(true);
    });

    it('should return null user_session when creator_alias is not provided', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user_session).toBeNull();
    });

    it('should create user session in database when creator_alias is provided', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          creator_alias: 'Jane Doe',
        });

      const boardId = response.body.data.id;

      // Verify session exists in database
      const sessions = await userSessionRepository.findActiveUsers(boardId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].alias).toBe('Jane Doe');
    });

    it('should return 400 for empty string creator_alias (validation rejects)', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          creator_alias: '',
        });

      // Empty string alias is rejected by validation
      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/boards - edge cases', () => {
    it('should accept board name at max length (200 chars)', async () => {
      const maxLengthName = 'A'.repeat(200);

      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: maxLengthName,
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name.length).toBe(200);
    });

    it('should reject board name exceeding max length', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'A'.repeat(201),
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid hex color format', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1', color: 'red' }],
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid lowercase hex color', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1', color: '#aabbcc' }],
        });

      expect(response.status).toBe(201);
    });

    it('should reject invalid column ID format', async () => {
      const response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col@invalid!', name: 'Column 1' }],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Closed board restrictions', () => {
    it('should return 409 when renaming column on closed board', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to rename column
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/columns/col-1`)
        .set('Cookie', cookies)
        .send({ name: 'New Name' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should return 409 when adding admin on closed board', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to add admin
      const response = await request(app)
        .post(`/v1/boards/${boardId}/admins`)
        .set('Cookie', cookies)
        .send({ user_cookie_hash: 'new-admin-hash' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });
  });
});
