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
import { NoOpEventBroadcaster } from '@/gateway/socket/index.js';

/**
 * E2E Test Suite: Board Lifecycle
 *
 * Tests complete retrospective workflows:
 * - Create board → join users → create cards → link → react → close → delete
 */
describe('Board Lifecycle E2E Tests', () => {
  let app: Express;
  let db: Db;
  let boardRepository: BoardRepository;
  let cardRepository: CardRepository;

  beforeAll(async () => {
    db = await startTestDb();

    app = createTestApp();

    // Set up all repositories
    boardRepository = new BoardRepository(db);
    const userSessionRepository = new UserSessionRepository(db);
    cardRepository = new CardRepository(db);
    const reactionRepository = new ReactionRepository(db);

    // Set up event broadcaster (no-op for tests)
    const eventBroadcaster = new NoOpEventBroadcaster();

    // Set up services
    const boardService = new BoardService(boardRepository, eventBroadcaster);
    const userSessionService = new UserSessionService(
      userSessionRepository,
      boardRepository,
      eventBroadcaster
    );
    const cardService = new CardService(
      cardRepository,
      boardRepository,
      userSessionRepository,
      eventBroadcaster
    );
    const reactionService = new ReactionService(
      reactionRepository,
      cardRepository,
      boardRepository,
      userSessionRepository,
      eventBroadcaster
    );

    // Set up controllers
    const boardController = new BoardController(boardService);
    const userSessionController = new UserSessionController(userSessionService);
    const cardController = new CardController(cardService);
    const reactionController = new ReactionController(reactionService);

    // Wire up routes
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

  describe('Complete Retrospective Workflow', () => {
    it('should complete full board lifecycle: create → join → cards → link → react → close → delete', async () => {
      // Step 1: Create a board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Sprint 23 Retro',
          columns: [
            { id: 'went-well', name: 'What Went Well', color: '#D5E8D4' },
            { id: 'improve', name: 'What To Improve', color: '#FFE6CC' },
            { id: 'actions', name: 'Action Items', color: '#DAE8FC' },
          ],
          card_limit_per_user: 5,
          reaction_limit_per_user: 10,
        });

      expect(createBoardResponse.status).toBe(201);
      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];
      expect(board.state).toBe('active');
      expect(board.columns).toHaveLength(3);

      // Step 2: Multiple users join the board
      const user1JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Facilitator' });
      expect(user1JoinResponse.status).toBe(200);

      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Developer1' });
      expect(user2JoinResponse.status).toBe(200);
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      const user3JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Developer2' });
      expect(user3JoinResponse.status).toBe(200);
      const user3Cookies = user3JoinResponse.headers['set-cookie'];

      // Step 3: Users create feedback cards
      const feedbackCard1Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'went-well',
          content: 'Great collaboration on the sprint!',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(feedbackCard1Response.status).toBe(201);
      const feedbackCard1 = feedbackCard1Response.body.data;

      const feedbackCard2Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user3Cookies)
        .send({
          column_id: 'improve',
          content: 'Need better documentation for APIs',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(feedbackCard2Response.status).toBe(201);
      const feedbackCard2 = feedbackCard2Response.body.data;

      // Child feedback card (will be linked to parent)
      const feedbackCard3Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'improve',
          content: 'Specifically need OpenAPI specs',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(feedbackCard3Response.status).toBe(201);
      const feedbackCard3 = feedbackCard3Response.body.data;

      // Step 4: Create action card
      const actionCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'actions',
          content: 'Action: Create OpenAPI documentation for all endpoints',
          card_type: 'action',
          is_anonymous: false,
        });
      expect(actionCardResponse.status).toBe(201);
      const actionCard = actionCardResponse.body.data;

      // Step 5: Link cards (parent-child relationship)
      const linkParentChildResponse = await request(app)
        .post(`/v1/cards/${feedbackCard3.id}/link`)
        .set('Cookie', user2Cookies)
        .send({
          target_card_id: feedbackCard2.id,
          link_type: 'parent_of',
        });
      expect(linkParentChildResponse.status).toBe(201);

      // Step 6: Link action card to feedback
      const linkActionResponse = await request(app)
        .post(`/v1/cards/${actionCard.id}/link`)
        .set('Cookie', creatorCookies)
        .send({
          target_card_id: feedbackCard2.id,
          link_type: 'linked_to',
        });
      expect(linkActionResponse.status).toBe(201);

      // Step 7: Users react to cards
      const reaction1Response = await request(app)
        .post(`/v1/cards/${feedbackCard1.id}/reactions`)
        .set('Cookie', user2Cookies)
        .send({ reaction_type: 'thumbs_up' });
      expect(reaction1Response.status).toBe(201);

      const reaction2Response = await request(app)
        .post(`/v1/cards/${feedbackCard1.id}/reactions`)
        .set('Cookie', user3Cookies)
        .send({ reaction_type: 'thumbs_up' });
      expect(reaction2Response.status).toBe(201);

      const reaction3Response = await request(app)
        .post(`/v1/cards/${feedbackCard2.id}/reactions`)
        .set('Cookie', creatorCookies)
        .send({ reaction_type: 'thumbs_up' });
      expect(reaction3Response.status).toBe(201);

      // Step 8: Verify card with reactions has correct counts
      const cardWithReactionsResponse = await request(app)
        .get(`/v1/cards/${feedbackCard1.id}`);
      expect(cardWithReactionsResponse.status).toBe(200);
      expect(cardWithReactionsResponse.body.data.direct_reaction_count).toBe(2);

      // Step 9: Verify board data with relationships
      // We created 4 cards, but feedbackCard3 was linked as child of feedbackCard2
      // So only 3 top-level cards are returned (feedbackCard1, feedbackCard2 with children, actionCard)
      const getBoardCardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(getBoardCardsResponse.status).toBe(200);
      expect(getBoardCardsResponse.body.data.cards.length).toBe(3);

      // Step 10: Close the board
      const closeBoardResponse = await request(app)
        .patch(`/v1/boards/${board.id}/close`)
        .set('Cookie', creatorCookies);
      expect(closeBoardResponse.status).toBe(200);
      expect(closeBoardResponse.body.data.state).toBe('closed');
      expect(closeBoardResponse.body.data.closed_at).not.toBeNull();

      // Step 11: Verify read-only state - cannot create new cards
      const failedCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'went-well',
          content: 'This should fail',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(failedCardResponse.status).toBe(409);
      expect(failedCardResponse.body.error.code).toBe('BOARD_CLOSED');

      // Step 12: Delete the board
      const deleteBoardResponse = await request(app)
        .delete(`/v1/boards/${board.id}`)
        .set('Cookie', creatorCookies);
      expect(deleteBoardResponse.status).toBe(204);

      // Step 13: Verify board no longer exists
      const getDeletedBoardResponse = await request(app)
        .get(`/v1/boards/${board.id}`);
      expect(getDeletedBoardResponse.status).toBe(404);
    });
  });

  describe('Card Limit Enforcement', () => {
    it('should prevent exceeding card limit for feedback cards', async () => {
      // Create board with low limit
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Limited Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: 2,
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create 2 cards (at limit)
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        expect(response.status).toBe(201);
      }

      // Try to create 3rd card - should fail
      const failedResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'This should fail',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(failedResponse.status).toBe(403);
      expect(failedResponse.body.error.code).toBe('CARD_LIMIT_REACHED');
    });

    it('should allow action cards even when feedback limit is reached', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Limited Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: 1,
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create 1 feedback card (at limit)
      const feedbackResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Feedback card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(feedbackResponse.status).toBe(201);

      // Action card should still work
      const actionResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Action card - should succeed',
          card_type: 'action',
          is_anonymous: false,
        });

      expect(actionResponse.status).toBe(201);
      expect(actionResponse.body.data.card_type).toBe('action');
    });
  });

  describe('Reaction Limit Enforcement', () => {
    it('should prevent exceeding reaction limit per user', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Reaction Limited Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          reaction_limit_per_user: 2,
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Join as user
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'ReactUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create 3 cards
      const cardIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', creatorCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        cardIds.push(response.body.data.id);
      }

      // React to 2 cards (at limit)
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post(`/v1/cards/${cardIds[i]}/reactions`)
          .set('Cookie', userCookies)
          .send({ reaction_type: 'thumbs_up' });
        expect(response.status).toBe(201);
      }

      // Try to react to 3rd card - should fail
      const failedResponse = await request(app)
        .post(`/v1/cards/${cardIds[2]}/reactions`)
        .set('Cookie', userCookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(failedResponse.status).toBe(403);
      expect(failedResponse.body.error.code).toBe('REACTION_LIMIT_REACHED');
    });
  });

  describe('Circular Relationship Prevention', () => {
    it('should enforce 1-level hierarchy (parent cannot become child)', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create 3 cards
      const card1Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Card 1',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const card1Id = card1Response.body.data.id;

      const card2Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Card 2',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const card2Id = card2Response.body.data.id;

      const card3Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Card 3',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const card3Id = card3Response.body.data.id;

      // Link: Card1 becomes child of Card2 (Card2 is parent)
      const link1Response = await request(app)
        .post(`/v1/cards/${card2Id}/link`)
        .set('Cookie', userCookies)
        .send({
          target_card_id: card1Id,
          link_type: 'parent_of',
        });
      expect(link1Response.status).toBe(201);

      // Try to link Card2 as child of Card3 (Card3 is parent)
      // This should fail because Card2 already has children (1-level hierarchy)
      const link2Response = await request(app)
        .post(`/v1/cards/${card3Id}/link`)
        .set('Cookie', userCookies)
        .send({
          target_card_id: card2Id,
          link_type: 'parent_of',
        });

      // Card2 has children (Card1), so it cannot become a child
      expect(link2Response.status).toBe(400);
      expect(link2Response.body.error.code).toBe('PARENT_CANNOT_BE_CHILD');
    });
  });

  describe('Closed Board Restrictions', () => {
    it('should enforce read-only on closed board', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Join and create a card
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'User1' });

      const cardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Test card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const cardId = cardResponse.body.data.id;

      // Close the board
      await request(app)
        .patch(`/v1/boards/${board.id}/close`)
        .set('Cookie', creatorCookies);

      // Try various write operations - all should fail with BOARD_CLOSED
      const createCardResult = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'New card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(createCardResult.status).toBe(409);
      expect(createCardResult.body.error.code).toBe('BOARD_CLOSED');

      const updateCardResult = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', creatorCookies)
        .send({ content: 'Updated content' });
      expect(updateCardResult.status).toBe(409);
      expect(updateCardResult.body.error.code).toBe('BOARD_CLOSED');

      const deleteCardResult = await request(app)
        .delete(`/v1/cards/${cardId}`)
        .set('Cookie', creatorCookies);
      expect(deleteCardResult.status).toBe(409);
      expect(deleteCardResult.body.error.code).toBe('BOARD_CLOSED');

      const reactionResult = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', creatorCookies)
        .send({ reaction_type: 'thumbs_up' });
      expect(reactionResult.status).toBe(409);
      expect(reactionResult.body.error.code).toBe('BOARD_CLOSED');

      // READ operations should still work
      const getBoardResult = await request(app).get(`/v1/boards/${board.id}`);
      expect(getBoardResult.status).toBe(200);

      const getCardsResult = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(getCardsResult.status).toBe(200);
    });
  });

  describe('Card Quota Check API', () => {
    it('should return correct quota status', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Quota Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: 3,
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'QuotaUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Check initial quota
      const quota1Response = await request(app)
        .get(`/v1/boards/${board.id}/cards/quota`)
        .set('Cookie', userCookies);

      expect(quota1Response.status).toBe(200);
      expect(quota1Response.body.data.current_count).toBe(0);
      expect(quota1Response.body.data.limit).toBe(3);
      expect(quota1Response.body.data.can_create).toBe(true);
      expect(quota1Response.body.data.limit_enabled).toBe(true);

      // Create 2 cards
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
      }

      // Check quota after creating cards
      const quota2Response = await request(app)
        .get(`/v1/boards/${board.id}/cards/quota`)
        .set('Cookie', userCookies);

      expect(quota2Response.status).toBe(200);
      expect(quota2Response.body.data.current_count).toBe(2);
      expect(quota2Response.body.data.can_create).toBe(true);

      // Create 1 more to hit limit
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Card 3',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Check quota at limit
      const quota3Response = await request(app)
        .get(`/v1/boards/${board.id}/cards/quota`)
        .set('Cookie', userCookies);

      expect(quota3Response.status).toBe(200);
      expect(quota3Response.body.data.current_count).toBe(3);
      expect(quota3Response.body.data.can_create).toBe(false);
    });
  });

  describe('Reaction Quota Check API', () => {
    it('should return correct reaction quota status', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Reaction Quota Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          reaction_limit_per_user: 2,
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Create cards
      const cardsToCreate = 3;
      const cardIds: string[] = [];
      for (let i = 0; i < cardsToCreate; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', creatorCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        cardIds.push(response.body.data.id);
      }

      // Join as another user
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Reactor' });
      const reactorCookies = joinResponse.headers['set-cookie'];

      // Check initial quota
      const quota1Response = await request(app)
        .get(`/v1/boards/${board.id}/reactions/quota`)
        .set('Cookie', reactorCookies);

      expect(quota1Response.status).toBe(200);
      expect(quota1Response.body.data.current_count).toBe(0);
      expect(quota1Response.body.data.limit).toBe(2);
      expect(quota1Response.body.data.can_react).toBe(true);

      // Add reactions
      await request(app)
        .post(`/v1/cards/${cardIds[0]}/reactions`)
        .set('Cookie', reactorCookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${cardIds[1]}/reactions`)
        .set('Cookie', reactorCookies)
        .send({ reaction_type: 'thumbs_up' });

      // Check quota at limit
      const quota2Response = await request(app)
        .get(`/v1/boards/${board.id}/reactions/quota`)
        .set('Cookie', reactorCookies);

      expect(quota2Response.status).toBe(200);
      expect(quota2Response.body.data.current_count).toBe(2);
      expect(quota2Response.body.data.can_react).toBe(false);
    });
  });

  describe('Bulk Card Fetch with Relationships', () => {
    it('should return cards with embedded relationships', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Relationship Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create parent feedback card
      const parentResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Parent card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const parentId = parentResponse.body.data.id;

      // Create child feedback card
      const childResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Child card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const childId = childResponse.body.data.id;

      // Create action card
      const actionResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Action item',
          card_type: 'action',
          is_anonymous: false,
        });
      const actionId = actionResponse.body.data.id;

      // Link parent to child: parentId is parent_of childId
      // API semantics: source is parent of target (target becomes child of source)
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', userCookies)
        .send({
          target_card_id: childId,
          link_type: 'parent_of',
        });

      // Link action to parent feedback
      await request(app)
        .post(`/v1/cards/${actionId}/link`)
        .set('Cookie', userCookies)
        .send({
          target_card_id: parentId,
          link_type: 'linked_to',
        });

      // Fetch all cards with relationships
      const getCardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);

      expect(getCardsResponse.status).toBe(200);
      const { cards } = getCardsResponse.body.data;

      // Only top-level cards are returned (child cards are embedded)
      // After linking, we should have: parent (with child embedded) and action card
      expect(cards.length).toBe(2);

      // Find parent card and verify it has children embedded
      const parentCard = cards.find((c: any) => c.id === parentId);
      expect(parentCard).toBeDefined();
      expect(parentCard!.children).toBeDefined();
      expect(parentCard!.children.length).toBe(1);
      expect(parentCard!.children[0].id).toBe(childId);

      // Find action card and verify it has linked feedback
      const actionCard = cards.find((c: any) => c.id === actionId);
      expect(actionCard).toBeDefined();
      expect(actionCard!.linked_feedback_cards).toBeDefined();
      expect(actionCard!.linked_feedback_cards.length).toBe(1);
      expect(actionCard!.linked_feedback_cards[0].id).toBe(parentId);
    });
  });

  describe('Aggregated Reaction Count', () => {
    it('should correctly aggregate reaction counts from children to parent', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Aggregation Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create parent and child cards
      const parentResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Parent',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const parentId = parentResponse.body.data.id;

      const childResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Child',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const childId = childResponse.body.data.id;

      // Link parent to child: parentId is parent_of childId
      // API semantics: source is parent of target (target becomes child of source)
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', userCookies)
        .send({
          target_card_id: childId,
          link_type: 'parent_of',
        });

      // React to parent directly
      const user2Join = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2Join.headers['set-cookie'];

      await request(app)
        .post(`/v1/cards/${parentId}/reactions`)
        .set('Cookie', user2Cookies)
        .send({ reaction_type: 'thumbs_up' });

      // React to child
      const user3Join = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User3' });
      const user3Cookies = user3Join.headers['set-cookie'];

      await request(app)
        .post(`/v1/cards/${childId}/reactions`)
        .set('Cookie', user3Cookies)
        .send({ reaction_type: 'thumbs_up' });

      // Check parent card - should have direct_count=1, aggregated_count=1
      // Note: aggregated_count only includes descendants' reactions, not the card's own direct reactions
      const parentCardResponse = await request(app)
        .get(`/v1/cards/${parentId}`);

      expect(parentCardResponse.status).toBe(200);
      expect(parentCardResponse.body.data.direct_reaction_count).toBe(1);
      expect(parentCardResponse.body.data.aggregated_reaction_count).toBe(1);

      // Check child card - should have direct_count=1, aggregated_count=0
      // Child has no children, so aggregated count is 0
      const childCardResponse = await request(app)
        .get(`/v1/cards/${childId}`);

      expect(childCardResponse.status).toBe(200);
      expect(childCardResponse.body.data.direct_reaction_count).toBe(1);
      expect(childCardResponse.body.data.aggregated_reaction_count).toBe(0);
    });
  });

  describe('Card CRUD Operations', () => {
    it('should allow owner to update card content', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Update Card Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'CardOwner' });
      const ownerCookies = joinResponse.headers['set-cookie'];

      // Create card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', ownerCookies)
        .send({
          column_id: 'col-1',
          content: 'Original content',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(createCardResponse.status).toBe(201);
      const cardId = createCardResponse.body.data.id;

      // Update card
      const updateResponse = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', ownerCookies)
        .send({ content: 'Updated content' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.content).toBe('Updated content');

      // Verify update persisted
      const getCardResponse = await request(app).get(`/v1/cards/${cardId}`);
      expect(getCardResponse.body.data.content).toBe('Updated content');
    });

    it('should allow owner to delete their card', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Delete Card Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'CardOwner' });
      const ownerCookies = joinResponse.headers['set-cookie'];

      // Create card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', ownerCookies)
        .send({
          column_id: 'col-1',
          content: 'Card to delete',
          card_type: 'feedback',
          is_anonymous: false,
        });

      const cardId = createCardResponse.body.data.id;

      // Delete card
      const deleteResponse = await request(app)
        .delete(`/v1/cards/${cardId}`)
        .set('Cookie', ownerCookies);

      expect(deleteResponse.status).toBe(204);

      // Verify card is gone
      const getCardResponse = await request(app).get(`/v1/cards/${cardId}`);
      expect(getCardResponse.status).toBe(404);
    });

    it('should make children top-level when parent is deleted', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Delete Parent Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create parent and child cards
      const parentResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Parent card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const parentId = parentResponse.body.data.id;

      const childResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Child card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const childId = childResponse.body.data.id;

      // Link parent -> child
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', userCookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // Verify child has parent
      const childBeforeDelete = await request(app).get(`/v1/cards/${childId}`);
      expect(childBeforeDelete.body.data.parent_card_id).toBe(parentId);

      // Delete parent
      await request(app)
        .delete(`/v1/cards/${parentId}`)
        .set('Cookie', userCookies);

      // Child should now be top-level (no parent)
      const childAfterDelete = await request(app).get(`/v1/cards/${childId}`);
      expect(childAfterDelete.status).toBe(200);
      expect(childAfterDelete.body.data.parent_card_id).toBeNull();

      // Child should appear in board cards list
      const boardCardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      const cardIds = boardCardsResponse.body.data.cards.map((c: any) => c.id);
      expect(cardIds).toContain(childId);
    });
  });

  describe('Reaction Remove Operations', () => {
    it('should decrement count when reaction is removed', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Remove Reaction Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create card
      const cardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Test card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const cardId = cardResponse.body.data.id;

      // Add reaction
      await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', userCookies)
        .send({ reaction_type: 'thumbs_up' });

      // Verify count is 1
      const cardAfterAdd = await request(app).get(`/v1/cards/${cardId}`);
      expect(cardAfterAdd.body.data.direct_reaction_count).toBe(1);

      // Remove reaction
      const removeResponse = await request(app)
        .delete(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', userCookies);

      expect(removeResponse.status).toBe(204);

      // Verify count is 0
      const cardAfterRemove = await request(app).get(`/v1/cards/${cardId}`);
      expect(cardAfterRemove.body.data.direct_reaction_count).toBe(0);
    });

    it('should decrement parent aggregated count when child reaction is removed', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Aggregated Remove Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create parent and child
      const parentResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Parent',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const parentId = parentResponse.body.data.id;

      const childResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Child',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const childId = childResponse.body.data.id;

      // Link parent -> child
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', userCookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // React to child
      await request(app)
        .post(`/v1/cards/${childId}/reactions`)
        .set('Cookie', userCookies)
        .send({ reaction_type: 'thumbs_up' });

      // Verify parent aggregated count is 1
      const parentAfterAdd = await request(app).get(`/v1/cards/${parentId}`);
      expect(parentAfterAdd.body.data.aggregated_reaction_count).toBe(1);

      // Remove reaction from child
      await request(app)
        .delete(`/v1/cards/${childId}/reactions`)
        .set('Cookie', userCookies);

      // Parent aggregated count should be 0
      const parentAfterRemove = await request(app).get(`/v1/cards/${parentId}`);
      expect(parentAfterRemove.body.data.aggregated_reaction_count).toBe(0);
    });
  });

  describe('Unlink Operations', () => {
    it('should make child top-level when unlinked from parent', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Unlink Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      // Use creator cookies - creator is admin and can unlink
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Create parent and child
      const parentResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Parent',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const parentId = parentResponse.body.data.id;

      const childResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Child',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const childId = childResponse.body.data.id;

      // Link
      await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', creatorCookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      // Verify linked
      const childBeforeUnlink = await request(app).get(`/v1/cards/${childId}`);
      expect(childBeforeUnlink.body.data.parent_card_id).toBe(parentId);

      // Unlink
      const unlinkResponse = await request(app)
        .delete(`/v1/cards/${parentId}/link`)
        .set('Cookie', creatorCookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });

      expect(unlinkResponse.status).toBe(204);

      // Child should be top-level
      const childAfterUnlink = await request(app).get(`/v1/cards/${childId}`);
      expect(childAfterUnlink.body.data.parent_card_id).toBeNull();

      // Both cards should appear in board cards list
      const boardCardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(boardCardsResponse.body.data.cards.length).toBe(2);
    });

    it('should remove action-feedback link when unlinked', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Unlink Action Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      // Use creator cookies - creator is admin and can unlink
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Create feedback and action cards
      const feedbackResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Feedback card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const feedbackId = feedbackResponse.body.data.id;

      const actionResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Action card',
          card_type: 'action',
          is_anonymous: false,
        });
      const actionId = actionResponse.body.data.id;

      // Link action to feedback
      await request(app)
        .post(`/v1/cards/${actionId}/link`)
        .set('Cookie', creatorCookies)
        .send({ target_card_id: feedbackId, link_type: 'linked_to' });

      // Verify linked
      const actionBeforeUnlink = await request(app).get(`/v1/cards/${actionId}`);
      expect(actionBeforeUnlink.body.data.linked_feedback_cards).toHaveLength(1);
      expect(actionBeforeUnlink.body.data.linked_feedback_cards[0].id).toBe(feedbackId);

      // Unlink
      const unlinkResponse = await request(app)
        .delete(`/v1/cards/${actionId}/link`)
        .set('Cookie', creatorCookies)
        .send({ target_card_id: feedbackId, link_type: 'linked_to' });

      expect(unlinkResponse.status).toBe(204);

      // Verify unlinked
      const actionAfterUnlink = await request(app).get(`/v1/cards/${actionId}`);
      expect(actionAfterUnlink.body.data.linked_feedback_cards).toHaveLength(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject card with empty content', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Validation Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Try to create card with empty content
      const response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: '',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(response.status).toBe(400);
    });

    it('should reject card with invalid column_id', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Validation Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Try to create card with non-existent column
      const response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'non-existent-column',
          content: 'Test content',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('COLUMN_NOT_FOUND');
    });

    it('should allow unlimited cards when card_limit_per_user is null', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Unlimited Cards Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          // No card_limit_per_user = unlimited
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create 10 cards - should all succeed
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        expect(response.status).toBe(201);
      }

      // Verify quota shows unlimited
      const quotaResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards/quota`)
        .set('Cookie', userCookies);

      expect(quotaResponse.body.data.limit_enabled).toBe(false);
      expect(quotaResponse.body.data.can_create).toBe(true);
    });

    it('should allow unlimited reactions when reaction_limit_per_user is null', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Unlimited Reactions Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          // No reaction_limit_per_user = unlimited
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      // Create 10 cards
      const cardIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', creatorCookies)
          .send({
            column_id: 'col-1',
            content: `Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        cardIds.push(response.body.data.id);
      }

      // Join as reactor
      const reactorJoin = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Reactor' });
      const reactorCookies = reactorJoin.headers['set-cookie'];

      // React to all 10 cards - should all succeed
      for (const cardId of cardIds) {
        const response = await request(app)
          .post(`/v1/cards/${cardId}/reactions`)
          .set('Cookie', reactorCookies)
          .send({ reaction_type: 'thumbs_up' });
        expect(response.status).toBe(201);
      }

      // Verify quota shows unlimited
      const quotaResponse = await request(app)
        .get(`/v1/boards/${board.id}/reactions/quota`)
        .set('Cookie', reactorCookies);

      expect(quotaResponse.body.data.limit_enabled).toBe(false);
      expect(quotaResponse.body.data.can_react).toBe(true);
    });
  });
});
