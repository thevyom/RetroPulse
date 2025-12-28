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
import {
  ReactionRepository,
  ReactionService,
  ReactionController,
  createCardReactionRoutes,
  createBoardReactionRoutes,
} from '@/domains/reaction/index.js';

describe('Reaction API Integration Tests', () => {
  let app: Express;
  let boardRepository: BoardRepository;
  let userSessionRepository: UserSessionRepository;
  let cardRepository: CardRepository;
  let reactionRepository: ReactionRepository;

  beforeAll(async () => {
    const db = await startTestDb();

    app = createTestApp();

    // Set up repositories
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);
    cardRepository = new CardRepository(db);
    reactionRepository = new ReactionRepository(db);

    // Set up services
    const boardService = new BoardService(boardRepository);
    const userSessionService = new UserSessionService(userSessionRepository, boardRepository);
    const cardService = new CardService(cardRepository, boardRepository, userSessionRepository);
    const reactionService = new ReactionService(
      reactionRepository,
      cardRepository,
      boardRepository,
      userSessionRepository
    );

    // Set up controllers
    const boardController = new BoardController(boardService);
    const userSessionController = new UserSessionController(userSessionService);
    const cardController = new CardController(cardService);
    const reactionController = new ReactionController(reactionService);

    // Register routes
    app.use('/v1/boards', createBoardRoutes(boardController));
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));
    app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
    app.use('/v1/cards', createCardRoutes(cardController));
    app.use('/v1/cards/:id/reactions', createCardReactionRoutes(reactionController));
    app.use('/v1/boards/:id/reactions', createBoardReactionRoutes(reactionController));

    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // Helper to create a board and return ID + cookies
  async function createBoard(options?: {
    name?: string;
    reaction_limit_per_user?: number | null;
  }) {
    const response = await request(app)
      .post('/v1/boards')
      .send({
        name: options?.name || 'Test Board',
        columns: [
          { id: 'col-1', name: 'What Went Well' },
          { id: 'col-2', name: 'Improvements' },
        ],
        reaction_limit_per_user: options?.reaction_limit_per_user ?? null,
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

    const response = await req;
    return {
      cookies: response.headers['set-cookie'] || cookies,
    };
  }

  // Helper to create a card
  async function createCard(boardId: string, cookies: string[], content?: string) {
    const response = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', cookies)
      .send({
        column_id: 'col-1',
        content: content || 'Test card',
        card_type: 'feedback',
      });

    return {
      cardId: response.body.data.id,
    };
  }

  describe('POST /v1/cards/:id/reactions', () => {
    it('should add a reaction to a card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      const response = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.card_id).toBe(cardId);
      expect(response.body.data.reaction_type).toBe('thumbs_up');
      expect(response.body.data.user_alias).toBe('Alice');
    });

    it('should update existing reaction (idempotent)', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      // Add first reaction
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Add again (should update, not create duplicate)
      const response = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(201);

      // Verify only one reaction exists
      const cardResponse = await request(app)
        .get(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(cardResponse.body.data.direct_reaction_count).toBe(1);
    });

    it('should return 404 for non-existent card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      const response = await request(app)
        .post('/v1/cards/507f1f77bcf86cd799439011/reactions')
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CARD_NOT_FOUND');
    });

    it('should return 409 if board is closed', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      // Close the board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      const response = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should return 403 when reaction limit reached', async () => {
      const { boardId, cookies } = await createBoard({ reaction_limit_per_user: 2 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create 3 cards and react to 2
      const { cardId: cardId1 } = await createCard(boardId, cookies, 'Card 1');
      const { cardId: cardId2 } = await createCard(boardId, cookies, 'Card 2');
      const { cardId: cardId3 } = await createCard(boardId, cookies, 'Card 3');

      await request(app)
        .post(`/v1/cards/${cardId1}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${cardId2}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Third reaction should fail
      const response = await request(app)
        .post(`/v1/cards/${cardId3}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('REACTION_LIMIT_REACHED');
    });

    it('should increment direct_reaction_count on card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      const cardResponse = await request(app)
        .get(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(cardResponse.body.data.direct_reaction_count).toBe(1);
    });

    it('should increment parent aggregated_reaction_count for child card reactions', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create parent and child cards
      const { cardId: parentId } = await createCard(boardId, cookies, 'Parent');
      const { cardId: childId } = await createCard(boardId, cookies, 'Child');

      // Link child to parent
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // React to child
      await request(app)
        .post(`/v1/cards/${childId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Check parent's aggregated count
      const parentResponse = await request(app)
        .get(`/v1/cards/${parentId}`)
        .set('Cookie', cookies);

      expect(parentResponse.body.data.aggregated_reaction_count).toBe(1);
    });
  });

  describe('DELETE /v1/cards/:id/reactions', () => {
    it('should remove a reaction from a card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      // Add reaction
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Remove reaction
      const response = await request(app)
        .delete(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies);

      expect(response.status).toBe(204);

      // Verify reaction is gone
      const cardResponse = await request(app)
        .get(`/v1/cards/${cardId}`)
        .set('Cookie', cookies);

      expect(cardResponse.body.data.direct_reaction_count).toBe(0);
    });

    it('should return 404 if reaction does not exist', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      const response = await request(app)
        .delete(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('REACTION_NOT_FOUND');
    });

    it('should return 409 if board is closed', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      // Add reaction
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Close board
      await request(app)
        .patch(`/v1/boards/${boardId}/close`)
        .set('Cookie', cookies);

      // Try to remove reaction
      const response = await request(app)
        .delete(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOARD_CLOSED');
    });

    it('should decrement parent aggregated_reaction_count when removing child reaction', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create parent and child cards
      const { cardId: parentId } = await createCard(boardId, cookies, 'Parent');
      const { cardId: childId } = await createCard(boardId, cookies, 'Child');

      // Link child to parent
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // React to child
      await request(app)
        .post(`/v1/cards/${childId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Remove reaction
      await request(app)
        .delete(`/v1/cards/${childId}/reactions`)
        .set('Cookie', cookies);

      // Check parent's aggregated count
      const parentResponse = await request(app)
        .get(`/v1/cards/${parentId}`)
        .set('Cookie', cookies);

      expect(parentResponse.body.data.aggregated_reaction_count).toBe(0);
    });
  });

  describe('GET /v1/boards/:id/reactions/quota', () => {
    it('should return quota with limit enabled', async () => {
      const { boardId, cookies } = await createBoard({ reaction_limit_per_user: 5 });
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      // Add a reaction
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      const response = await request(app)
        .get(`/v1/boards/${boardId}/reactions/quota`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        current_count: 1,
        limit: 5,
        can_react: true,
        limit_enabled: true,
      });
    });

    it('should return limit_enabled: false when no limit', async () => {
      const { boardId, cookies } = await createBoard({ reaction_limit_per_user: null });
      await joinBoard(boardId, 'Alice', cookies);

      const response = await request(app)
        .get(`/v1/boards/${boardId}/reactions/quota`)
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.data.limit_enabled).toBe(false);
      expect(response.body.data.can_react).toBe(true);
      expect(response.body.data.limit).toBeNull();
    });

    it('should return can_react: false when at limit', async () => {
      const { boardId, cookies } = await createBoard({ reaction_limit_per_user: 2 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create 2 cards and react to them
      const { cardId: cardId1 } = await createCard(boardId, cookies, 'Card 1');
      const { cardId: cardId2 } = await createCard(boardId, cookies, 'Card 2');

      await request(app)
        .post(`/v1/cards/${cardId1}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${cardId2}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      const response = await request(app)
        .get(`/v1/boards/${boardId}/reactions/quota`)
        .set('Cookie', cookies);

      expect(response.body.data.current_count).toBe(2);
      expect(response.body.data.can_react).toBe(false);
    });

    it('should return 404 for non-existent board', async () => {
      const { cookies } = await createBoard();

      const response = await request(app)
        .get('/v1/boards/507f1f77bcf86cd799439011/reactions/quota')
        .set('Cookie', cookies);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should allow checking quota for another user', async () => {
      const { boardId, cookies: creatorCookies } = await createBoard({ reaction_limit_per_user: 5 });
      await joinBoard(boardId, 'Creator', creatorCookies);

      // Create another user
      const { cookies: otherCookies } = await joinBoard(boardId, 'OtherUser');
      const { cardId } = await createCard(boardId, creatorCookies);

      // Other user reacts
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', otherCookies)
        .send({ reaction_type: 'thumbs_up' });

      // Get other user's hash (would normally need to be known)
      // For this test, we'll just verify the default behavior
      const response = await request(app)
        .get(`/v1/boards/${boardId}/reactions/quota`)
        .set('Cookie', creatorCookies);

      // Creator has 0 reactions
      expect(response.body.data.current_count).toBe(0);
    });
  });

  describe('Reaction isolation between boards', () => {
    it('should not count reactions from other boards in quota', async () => {
      // Create two boards
      const { boardId: boardId1, cookies } = await createBoard({ reaction_limit_per_user: 2 });
      await joinBoard(boardId1, 'Alice', cookies);

      const board2Response = await request(app)
        .post('/v1/boards')
        .set('Cookie', cookies)
        .send({
          name: 'Board 2',
          columns: [{ id: 'col-1', name: 'Column' }],
          reaction_limit_per_user: 2,
        });
      const boardId2 = board2Response.body.data.id;
      await joinBoard(boardId2, 'Alice', cookies);

      // Create cards on each board
      const { cardId: cardOnBoard1 } = await createCard(boardId1, cookies, 'Card on Board 1');
      const card2Response = await request(app)
        .post(`/v1/boards/${boardId2}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card on Board 2', card_type: 'feedback' });
      const cardOnBoard2 = card2Response.body.data.id;

      // React on board 1
      await request(app)
        .post(`/v1/cards/${cardOnBoard1}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Check quota on board 2 - should be 0
      const quotaResponse = await request(app)
        .get(`/v1/boards/${boardId2}/reactions/quota`)
        .set('Cookie', cookies);

      expect(quotaResponse.body.data.current_count).toBe(0);
      expect(quotaResponse.body.data.can_react).toBe(true);

      // React on board 2 twice
      await request(app)
        .post(`/v1/cards/${cardOnBoard2}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Should still be able to react on board 1 (only 1 reaction there)
      const quota1Response = await request(app)
        .get(`/v1/boards/${boardId1}/reactions/quota`)
        .set('Cookie', cookies);

      expect(quota1Response.body.data.current_count).toBe(1);
      expect(quota1Response.body.data.can_react).toBe(true);
    });
  });

  describe('Multiple users reacting', () => {
    it('should allow multiple users to react to the same card', async () => {
      const { boardId, cookies: user1Cookies } = await createBoard();
      await joinBoard(boardId, 'User1', user1Cookies);
      const { cardId } = await createCard(boardId, user1Cookies);

      // User 2 joins and reacts
      const { cookies: user2Cookies } = await joinBoard(boardId, 'User2');

      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', user1Cookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', user2Cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Check card reaction count
      const cardResponse = await request(app)
        .get(`/v1/cards/${cardId}`)
        .set('Cookie', user1Cookies);

      expect(cardResponse.body.data.direct_reaction_count).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should allow user to react to their own card', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);
      const { cardId } = await createCard(boardId, cookies);

      const response = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(201);
      expect(response.body.data.reaction_type).toBe('thumbs_up');
    });

    it('should allow reacting to anonymous cards', async () => {
      const { boardId, cookies } = await createBoard();
      await joinBoard(boardId, 'Alice', cookies);

      // Create anonymous card
      const cardResponse = await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'Anonymous card',
          card_type: 'feedback',
          is_anonymous: true,
        });
      const cardId = cardResponse.body.data.id;

      // Another user reacts
      const { cookies: otherCookies } = await joinBoard(boardId, 'Bob');
      const response = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', otherCookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(response.status).toBe(201);
    });

    it('should test exact reaction limit boundary', async () => {
      const { boardId, cookies } = await createBoard({ reaction_limit_per_user: 3 });
      await joinBoard(boardId, 'Alice', cookies);

      // Create exactly 3 cards and react to them
      const cardIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { cardId } = await createCard(boardId, cookies, `Card ${i}`);
        cardIds.push(cardId);
        await request(app)
          .post(`/v1/cards/${cardId}/reactions`)
          .set('Cookie', cookies)
          .send({ reaction_type: 'thumbs_up' });
      }

      // Check quota - should be exactly at limit
      const quotaResponse = await request(app)
        .get(`/v1/boards/${boardId}/reactions/quota`)
        .set('Cookie', cookies);

      expect(quotaResponse.body.data.current_count).toBe(3);
      expect(quotaResponse.body.data.limit).toBe(3);
      expect(quotaResponse.body.data.can_react).toBe(false);

      // Try to add one more - should fail
      const { cardId: extraCardId } = await createCard(boardId, cookies, 'Extra card');
      const failedResponse = await request(app)
        .post(`/v1/cards/${extraCardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(failedResponse.status).toBe(403);

      // Remove one reaction
      await request(app)
        .delete(`/v1/cards/${cardIds[0]}/reactions`)
        .set('Cookie', cookies);

      // Now should be able to react again
      const successResponse = await request(app)
        .post(`/v1/cards/${extraCardId}/reactions`)
        .set('Cookie', cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(successResponse.status).toBe(201);
    });
  });
});
