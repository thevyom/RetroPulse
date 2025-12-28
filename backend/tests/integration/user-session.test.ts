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
  UserSessionController,
  createUserSessionRoutes,
} from '@/domains/user/index.js';

describe('User Session API Integration Tests', () => {
  let app: Express;
  let boardRepository: BoardRepository;
  let userSessionRepository: UserSessionRepository;

  beforeAll(async () => {
    const db = await startTestDb();

    // Set up app with board and user session routes
    app = createTestApp();
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);

    const boardService = new BoardService(boardRepository);
    const boardController = new BoardController(boardService);
    app.use('/v1/boards', createBoardRoutes(boardController));

    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);
    const userSessionController = new UserSessionController(userSessionService);
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));

    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('POST /v1/boards/:id/join', () => {
    it('should join board with valid alias', async () => {
      // Create a board first
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Join the board
      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.board_id).toBe(boardId);
      expect(response.body.data.user_session.alias).toBe('Alice');
      expect(response.body.data.user_session.is_admin).toBeDefined();
      expect(response.body.data.user_session.last_active_at).toBeDefined();
      expect(response.body.data.user_session.created_at).toBeDefined();
    });

    it('should return is_admin=true for board creator', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join with creator's cookie
      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Creator' });

      expect(response.status).toBe(200);
      expect(response.body.data.user_session.is_admin).toBe(true);
    });

    it('should return is_admin=false for non-admin user', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Join without creator's cookie (new user)
      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'RegularUser' });

      expect(response.status).toBe(200);
      expect(response.body.data.user_session.is_admin).toBe(false);
    });

    it('should update alias on rejoin', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // First join
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'OldAlias' });

      // Rejoin with new alias
      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'NewAlias' });

      expect(response.status).toBe(200);
      expect(response.body.data.user_session.alias).toBe('NewAlias');
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .post('/v1/boards/507f1f77bcf86cd799439011/join')
        .send({ alias: 'Alice' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should return 400 for empty alias', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for alias with invalid characters', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'Alice@123!' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept alias at max length (50 characters)', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const maxLengthAlias = 'A'.repeat(50); // Exactly 50 characters

      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: maxLengthAlias });

      expect(response.status).toBe(200);
      expect(response.body.data.user_session.alias).toBe(maxLengthAlias);
      expect(response.body.data.user_session.alias.length).toBe(50);
    });

    it('should return 400 for alias exceeding max length (51+ characters)', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const tooLongAlias = 'A'.repeat(51); // 51 characters - exceeds limit

      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: tooLongAlias });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return cookie_hash in join response', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body.data.user_session.cookie_hash).toBeDefined();
      expect(typeof response.body.data.user_session.cookie_hash).toBe('string');
      expect(response.body.data.user_session.cookie_hash.length).toBeGreaterThan(0);
    });

    it('should maintain is_admin=true for designated admin on rejoin', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const creatorCookies = createResponse.headers['set-cookie'];

      // First join as creator (admin)
      const firstJoin = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Admin1' });

      expect(firstJoin.body.data.user_session.is_admin).toBe(true);

      // Rejoin with different alias - should still be admin
      const rejoin = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Admin2' });

      expect(rejoin.status).toBe(200);
      expect(rejoin.body.data.user_session.is_admin).toBe(true);
      expect(rejoin.body.data.user_session.alias).toBe('Admin2');
    });
  });

  describe('GET /v1/boards/:id/users', () => {
    it('should return active users', async () => {
      // Create a board and join
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join as creator
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Creator' });

      // Get active users
      const response = await request(app)
        .get(`/v1/boards/${boardId}/users`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.active_users).toHaveLength(1);
      expect(response.body.data.active_users[0].alias).toBe('Creator');
      expect(response.body.data.active_users[0].is_admin).toBe(true);
      expect(response.body.data.total_count).toBe(1);
    });

    it('should return multiple active users', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const creatorCookies = createResponse.headers['set-cookie'];

      // Join as creator
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      // Join as another user (new cookie will be set)
      const user2Response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'User2' });

      const user2Cookies = user2Response.headers['set-cookie'];

      // Get active users
      const response = await request(app)
        .get(`/v1/boards/${boardId}/users`)
        .set('Cookie', creatorCookies);

      expect(response.status).toBe(200);
      expect(response.body.data.active_users).toHaveLength(2);
      expect(response.body.data.total_count).toBe(2);
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .get('/v1/boards/507f1f77bcf86cd799439011/users');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });
  });

  describe('PATCH /v1/boards/:id/users/heartbeat', () => {
    it('should update heartbeat for existing session', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Alice' });

      // Update heartbeat
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/heartbeat`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.alias).toBe('Alice');
      expect(response.body.data.last_active_at).toBeDefined();
    });

    it('should return 404 for user who has not joined', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try heartbeat without joining (new user cookie)
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/heartbeat`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .patch('/v1/boards/507f1f77bcf86cd799439011/users/heartbeat');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });
  });

  describe('PATCH /v1/boards/:id/users/alias', () => {
    it('should update alias for existing session', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'OldAlias' });

      // Update alias
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .set('Cookie', cookies)
        .send({ alias: 'NewAlias' });

      expect(response.status).toBe(200);
      expect(response.body.data.alias).toBe('NewAlias');
      expect(response.body.data.last_active_at).toBeDefined();
    });

    it('should return 400 for invalid alias', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Alice' });

      // Try to update with invalid alias
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .set('Cookie', cookies)
        .send({ alias: 'Invalid@Alias!' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for user who has not joined', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;

      // Try alias update without joining
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .send({ alias: 'NewAlias' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 for non-existent board', async () => {
      const response = await request(app)
        .patch('/v1/boards/507f1f77bcf86cd799439011/users/alias')
        .send({ alias: 'NewAlias' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should accept alias update at max length (50 characters)', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Initial' });

      const maxLengthAlias = 'B'.repeat(50); // Exactly 50 characters

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .set('Cookie', cookies)
        .send({ alias: maxLengthAlias });

      expect(response.status).toBe(200);
      expect(response.body.data.alias).toBe(maxLengthAlias);
      expect(response.body.data.alias.length).toBe(50);
    });

    it('should return 400 for alias update exceeding max length (51+ characters)', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Initial' });

      const tooLongAlias = 'B'.repeat(51); // 51 characters - exceeds limit

      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .set('Cookie', cookies)
        .send({ alias: tooLongAlias });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for alias update on closed board', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Join first
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Alice' });

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to update alias on closed board
      const response = await request(app)
        .patch(`/v1/boards/${boardId}/users/alias`)
        .set('Cookie', cookies)
        .send({ alias: 'NewAlias' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });
  });

  describe('Board with users - integration', () => {
    it('should show active users in GET /boards/:id after joining', async () => {
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie'];

      // Initially, get board should have empty active_users
      const beforeJoin = await request(app)
        .get(`/v1/boards/${boardId}`)
        .set('Cookie', cookies);

      expect(beforeJoin.body.data.active_users).toEqual([]);

      // Join the board
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'Alice' });

      // Now get users should return the joined user
      const afterJoin = await request(app)
        .get(`/v1/boards/${boardId}/users`)
        .set('Cookie', cookies);

      expect(afterJoin.body.data.active_users).toHaveLength(1);
      expect(afterJoin.body.data.active_users[0].alias).toBe('Alice');
    });

    it('should allow closed board to be joined (read-only)', async () => {
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

      // New user can still join (to view the board)
      const joinResponse = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'Viewer' });

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.data.user_session.alias).toBe('Viewer');
    });
  });
});
