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
import {
  CardRepository,
  CardService,
  CardController,
  createBoardCardRoutes,
  createCardRoutes,
} from '@/domains/card/index.js';

describe('Card API Integration Tests', () => {
  let app: Express;
  let boardRepository: BoardRepository;
  let userSessionRepository: UserSessionRepository;
  let cardRepository: CardRepository;

  beforeAll(async () => {
    const db = await startTestDb();

    app = createTestApp();

    // Set up repositories
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);
    cardRepository = new CardRepository(db);

    // Set up services
    const boardService = new BoardService(boardRepository);
    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);
    const cardService = new CardService(cardRepository, boardRepository, userSessionRepository);

    // Set up controllers
    const boardController = new BoardController(boardService);
    const userSessionController = new UserSessionController(userSessionService);
    const cardController = new CardController(cardService);

    // Register routes
    app.use('/v1/boards', createBoardRoutes(boardController));
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));
    app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
    app.use('/v1/cards', createCardRoutes(cardController));

    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // Helper to create a board and return ID + cookies
  async function createBoard(boardData?: Partial<{ name: string; card_limit_per_user: number }>) {
    const response = await request(app)
      .post('/v1/boards')
      .send({
        name: boardData?.name || 'Test Board',
        columns: [
          { id: 'col-1', name: 'What Went Well' },
          { id: 'col-2', name: 'Improvements' },
          { id: 'col-3', name: 'Action Items' },
        ],
        card_limit_per_user: boardData?.card_limit_per_user ?? null,
      });

    return {
      boardId: response.body.data.id,
      cookies: response.headers['set-cookie'],
    };
  }

  // Helper to join a board
  async function joinBoard(boardId: string, alias: string, cookies?: string[]) {
    const req = request(app)
      .post(`/v1/boards/${boardId}/join`)
      .send({ alias });

    if (cookies) {
      req.set('Cookie', cookies);
    }

    return req;
  }

  describe('POST /v1/boards/:boardId/cards', () => {
    it('should create a feedback card with valid input', async () => {
      const { boardId, cookies } = await createBoard();

      // Join board first
      await joinBoard(boardId, 'Alice', cookies);

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'Great teamwork this sprint!',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Great teamwork this sprint!');
      expect(response.body.data.card_type).toBe('feedback');
      expect(response.body.data.column_id).toBe('col-1');
      expect(response.body.data.created_by_alias).toBe('Alice');
      expect(response.body.data.direct_reaction_count).toBe(0);
    });

    it('should create an action card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Bob', cookies);

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-3',
          content: 'Implement automated testing',
          card_type: 'action',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.card_type).toBe('action');
    });

    it('should create an anonymous card', async () => {
      const { boardId, cookies } = await createBoard();

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-2',
          content: 'Anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.is_anonymous).toBe(true);
      expect(response.body.data.created_by_alias).toBeNull();
    });

    it('should return 400 for invalid column_id', async () => {
      const { boardId, cookies } = await createBoard();

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'nonexistent',
          content: 'Test',
          card_type: 'feedback',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('COLUMN_NOT_FOUND');
    });

    it('should return 403 when card limit is reached', async () => {
      const { boardId, cookies } = await createBoard({ card_limit_per_user: 2 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create 2 cards (at limit)
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post(`/v1/boards/${boardId}/cards`)
          .set('Cookie', cookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
          });
      }

      // Try to create a 3rd card
      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'One more card',
          card_type: 'feedback',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CARD_LIMIT_REACHED');
    });

    it('should allow action cards even when feedback limit is reached', async () => {
      const { boardId, cookies } = await createBoard({ card_limit_per_user: 1 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create 1 feedback card (at limit)
      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'Feedback card',
          card_type: 'feedback',
        });

      // Should still be able to create action card
      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-3',
          content: 'Action item',
          card_type: 'action',
        });

      expect(response.status).toBe(201);
    });

    it('should return 409 when board is closed', async () => {
      const { boardId, cookies } = await createBoard();

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'Test',
          card_type: 'feedback',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });
  });

  describe('GET /v1/boards/:boardId/cards', () => {
    it('should return all cards for a board', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create a few cards
      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 1', card_type: 'feedback' });

      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-2', content: 'Card 2', card_type: 'feedback' });

      const response = await request(app)
        .get(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.cards).toHaveLength(2);
      expect(response.body.data.total_count).toBe(2);
      expect(response.body.data.cards_by_column).toEqual({ 'col-1': 1, 'col-2': 1 });
    });

    it('should filter cards by column_id', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 1', card_type: 'feedback' });

      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-2', content: 'Card 2', card_type: 'feedback' });

      const response = await request(app)
        .get(`/v1/boards/${boardId}/cards?column_id=col-1`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.cards).toHaveLength(1);
      expect(response.body.data.cards[0].content).toBe('Card 1');
    });

    it('should embed children in parent cards', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create parent card
      const parentResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent card', card_type: 'feedback' });

      const parentId = parentResponse.body.data.id;

      // Create child card
      const childResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Child card', card_type: 'feedback' });

      const childId = childResponse.body.data.id;

      // Link parent to child
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // Get cards - should have parent with embedded child
      const response = await request(app)
        .get(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      // Only parent should be at top level
      expect(response.body.data.cards).toHaveLength(1);
      expect(response.body.data.cards[0].children).toHaveLength(1);
      expect(response.body.data.cards[0].children[0].content).toBe('Child card');
    });
  });

  describe('GET /v1/boards/:boardId/cards/quota', () => {
    it('should return quota when limit is enabled', async () => {
      const { boardId, cookies } = await createBoard({ card_limit_per_user: 5 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create 2 cards
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post(`/v1/boards/${boardId}/cards`)
          .set('Cookie', cookies)
          .send({ column_id: 'col-1', content: `Card ${i}`, card_type: 'feedback' });
      }

      const response = await request(app)
        .get(`/v1/boards/${boardId}/cards/quota`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        current_count: 2,
        limit: 5,
        can_create: true,
        limit_enabled: true,
      });
    });

    it('should return limit_enabled false when no limit configured', async () => {
      const { boardId, cookies } = await createBoard({ card_limit_per_user: undefined });

      const response = await request(app)
        .get(`/v1/boards/${boardId}/cards/quota`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.limit_enabled).toBe(false);
      expect(response.body.data.can_create).toBe(true);
    });
  });

  describe('PUT /v1/cards/:id', () => {
    it('should update card content when user is creator', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Original content', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', cookies)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('Updated content');
    });

    it('should return 403 when user is not creator', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Original', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      // Try to update without creator's cookie
      const response = await request(app)
        .put(`/v1/cards/${cardId}`)
        .send({ content: 'Updated' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /v1/cards/:id', () => {
    it('should delete card when user is creator', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'To delete', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(deleteResponse.status).toBe(204);

      // Verify card is deleted
      const getResponse = await request(app)
        .get(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(getResponse.status).toBe(404);
    });

    it('should orphan children when parent is deleted', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create parent
      const parentResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent', card_type: 'feedback' });

      const parentId = parentResponse.body.data.id;

      // Create child
      const childResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Child', card_type: 'feedback' });

      const childId = childResponse.body.data.id;

      // Link parent to child
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // Delete parent
      await request(app)
        .delete(`/v1/cards/${parentId}`)
        .set('Cookie', cookies);

      // Verify child is now orphaned (no parent)
      const childGetResponse = await request(app)
        .get(`/v1/cards/${childId}`)
        .set('Cookie', cookies);

      expect(childGetResponse.status).toBe(200);
      expect(childGetResponse.body.data.parent_card_id).toBeNull();
    });
  });

  describe('PATCH /v1/cards/:id/column', () => {
    it('should move card to different column', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/v1/cards/${cardId}/column`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-2' });

      expect(response.status).toBe(200);
      expect(response.body.data.column_id).toBe('col-2');
    });

    it('should return 400 for non-existent column', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/v1/cards/${cardId}/column`)
        .set('Cookie', cookies)
        .send({ column_id: 'nonexistent' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/cards/:id/link', () => {
    it('should link parent-child feedback cards', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const parent = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent', card_type: 'feedback' });

      const child = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Child', card_type: 'feedback' });

      const response = await request(app)
        .post(`/v1/cards/${parent.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({
          target_card_id: child.body.data.id,
          link_type: 'parent_of',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.link_type).toBe('parent_of');
    });

    it('should link action card to feedback card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const feedback = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Feedback', card_type: 'feedback' });

      const action = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-3', content: 'Action', card_type: 'action' });

      const response = await request(app)
        .post(`/v1/cards/${action.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({
          target_card_id: feedback.body.data.id,
          link_type: 'linked_to',
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 when linking card to itself', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const card = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card', card_type: 'feedback' });

      const response = await request(app)
        .post(`/v1/cards/${card.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({
          target_card_id: card.body.data.id,
          link_type: 'parent_of',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CIRCULAR_RELATIONSHIP');
    });

    it('should prevent circular parent-child relationship', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create cards
      const card1 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 1', card_type: 'feedback' });

      const card2 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 2', card_type: 'feedback' });

      const card3 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 3', card_type: 'feedback' });

      // Link: card1 -> card2 -> card3
      await request(app)
        .post(`/v1/cards/${card1.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card2.body.data.id, link_type: 'parent_of' });

      await request(app)
        .post(`/v1/cards/${card2.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card3.body.data.id, link_type: 'parent_of' });

      // Try to create cycle: card3 -> card1 (would create cycle)
      const response = await request(app)
        .post(`/v1/cards/${card3.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card1.body.data.id, link_type: 'parent_of' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CIRCULAR_RELATIONSHIP');
    });

    it('should return 400 when linking feedback card with linked_to type', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const feedback1 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Feedback 1', card_type: 'feedback' });

      const feedback2 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Feedback 2', card_type: 'feedback' });

      // Try linked_to with feedback card as source (should fail)
      const response = await request(app)
        .post(`/v1/cards/${feedback1.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({
          target_card_id: feedback2.body.data.id,
          link_type: 'linked_to',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /v1/cards/:id/link', () => {
    it('should unlink parent-child relationship', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const parent = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent', card_type: 'feedback' });

      const child = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Child', card_type: 'feedback' });

      // Link
      await request(app)
        .post(`/v1/cards/${parent.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: child.body.data.id, link_type: 'parent_of' });

      // Unlink
      const response = await request(app)
        .delete(`/v1/cards/${parent.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: child.body.data.id, link_type: 'parent_of' });

      expect(response.status).toBe(204);

      // Verify child has no parent
      const childGet = await request(app)
        .get(`/v1/cards/${child.body.data.id}`)
        .set('Cookie', cookies);

      expect(childGet.body.data.parent_card_id).toBeNull();
    });
  });

  describe('Closed board restrictions', () => {
    it('should return 409 when updating card on closed board', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      // Close board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to update
      const response = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', cookies)
        .send({ content: 'Updated' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should return 409 when deleting card on closed board', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const createResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card', card_type: 'feedback' });

      const cardId = createResponse.body.data.id;

      // Close board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to delete
      const response = await request(app)
        .delete(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should return 409 when linking cards on closed board', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const card1 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 1', card_type: 'feedback' });

      const card2 = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 2', card_type: 'feedback' });

      // Close board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to link
      const response = await request(app)
        .post(`/v1/cards/${card1.body.data.id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card2.body.data.id, link_type: 'parent_of' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });
  });

  describe('Validation', () => {
    it('should return 400 for empty content', async () => {
      const { boardId, cookies } = await createBoard();

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: '', card_type: 'feedback' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for content exceeding max length', async () => {
      const { boardId, cookies } = await createBoard();

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'x'.repeat(5001),
          card_type: 'feedback',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid card_type', async () => {
      const { boardId, cookies } = await createBoard();

      const response = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Test', card_type: 'invalid' });

      expect(response.status).toBe(400);
    });
  });
});
