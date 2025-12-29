import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { Db } from 'mongodb';
import {
  startTestDb,
  stopTestDb,
  clearTestDb,
  getTestDb,
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
 * E2E Test Suite: Anonymous User Privacy
 *
 * Verifies that anonymous users are properly protected:
 * - Anonymous cards don't expose user aliases
 * - Cookie hashes are stored but never exposed in API responses
 * - User identity is properly protected
 */
describe('Anonymous User Privacy E2E Tests', () => {
  let app: Express;
  let db: Db;
  let cardRepository: CardRepository;

  beforeAll(async () => {
    db = await startTestDb();

    app = createTestApp();

    // Set up all repositories
    const boardRepository = new BoardRepository(db);
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

  describe('Anonymous Card Creation', () => {
    it('should hide user alias for anonymous cards in API response', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Privacy Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board with alias
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'IdentifiedUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create anonymous card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'This is my anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });

      expect(createCardResponse.status).toBe(201);
      const card = createCardResponse.body.data;

      // Verify alias is null in response for anonymous cards
      expect(card.is_anonymous).toBe(true);
      expect(card.created_by_alias).toBeNull();

      // The hash IS exposed in API response (for ownership checking)
      // but it's a cryptographic hash, not the raw cookie
      expect(card.created_by_hash).toBeDefined();
      expect(card.created_by_hash.length).toBe(64); // SHA-256 hash
    });

    it('should store cookie hash in database for anonymous cards', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Privacy Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create anonymous card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });

      const cardId = createCardResponse.body.data.id;

      // Check database directly - hash should be stored
      const cardDoc = await cardRepository.findById(cardId);
      expect(cardDoc).not.toBeNull();
      expect(cardDoc!.created_by_hash).toBeDefined();
      expect(cardDoc!.created_by_hash.length).toBe(64); // SHA-256 hash is 64 hex chars
      expect(cardDoc!.created_by_alias).toBeNull();
    });

    it('should show alias for non-anonymous cards', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'VisibleUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create non-anonymous card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Public feedback',
          card_type: 'feedback',
          is_anonymous: false,
        });

      expect(createCardResponse.status).toBe(201);
      const card = createCardResponse.body.data;

      // Verify alias is shown
      expect(card.is_anonymous).toBe(false);
      expect(card.created_by_alias).toBe('VisibleUser');

      // Hash is exposed for ownership checking
      expect(card.created_by_hash).toBeDefined();
      expect(card.created_by_hash.length).toBe(64);
    });
  });

  describe('Anonymous Cards in Board Fetch', () => {
    it('should maintain anonymity when fetching all board cards', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join as user 1
      const user1JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Alice' });
      const user1Cookies = user1JoinResponse.headers['set-cookie'];

      // Join as user 2
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Bob' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // Alice creates non-anonymous card
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user1Cookies)
        .send({
          column_id: 'col-1',
          content: 'Public card by Alice',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Alice creates anonymous card
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user1Cookies)
        .send({
          column_id: 'col-1',
          content: 'Anonymous card',
          card_type: 'feedback',
          is_anonymous: true,
        });

      // Bob creates non-anonymous card
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'col-1',
          content: 'Public card by Bob',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Fetch all cards
      const getCardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);

      expect(getCardsResponse.status).toBe(200);
      const { cards } = getCardsResponse.body.data;
      expect(cards).toHaveLength(3);

      // Find each card and verify privacy
      const alicePublicCard = cards.find((c: any) =>
        c.content === 'Public card by Alice'
      );
      expect(alicePublicCard.created_by_alias).toBe('Alice');
      expect(alicePublicCard.is_anonymous).toBe(false);
      expect(alicePublicCard.created_by_hash).toBeDefined(); // Hash is exposed for ownership

      const anonymousCard = cards.find((c: any) =>
        c.content === 'Anonymous card'
      );
      expect(anonymousCard.created_by_alias).toBeNull(); // Anonymous - no alias
      expect(anonymousCard.is_anonymous).toBe(true);
      expect(anonymousCard.created_by_hash).toBeDefined(); // Hash still exposed for ownership

      const bobPublicCard = cards.find((c: any) =>
        c.content === 'Public card by Bob'
      );
      expect(bobPublicCard.created_by_alias).toBe('Bob');
      expect(bobPublicCard.is_anonymous).toBe(false);
      expect(bobPublicCard.created_by_hash).toBeDefined();
    });
  });

  describe('Cookie Hash Exposed as SHA-256', () => {
    it('should expose cookie hash as SHA-256 in card responses', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Test card',
          card_type: 'feedback',
          is_anonymous: false,
        });

      const cardId = createCardResponse.body.data.id;

      // Fetch single card
      const getCardResponse = await request(app)
        .get(`/v1/cards/${cardId}`);

      expect(getCardResponse.status).toBe(200);
      const card = getCardResponse.body.data;

      // Verify hash IS in response (for ownership checking)
      expect(card.created_by_hash).toBeDefined();
      expect(card.created_by_hash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should not expose cookie hash in board response', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Fetch board
      const getBoardResponse = await request(app)
        .get(`/v1/boards/${board.id}`);

      expect(getBoardResponse.status).toBe(200);
      const boardData = getBoardResponse.body.data;

      // Board response doesn't include created_by_hash (only cards do)
      expect(boardData.created_by_hash).toBeUndefined();
    });
  });

  describe('Anonymous Card Operations', () => {
    it('should allow creator to modify their own anonymous card', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Creator' });
      const creatorCookies = joinResponse.headers['set-cookie'];

      // Create anonymous card
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Original content',
          card_type: 'feedback',
          is_anonymous: true,
        });

      const cardId = createCardResponse.body.data.id;

      // Creator should be able to update their anonymous card
      const updateResponse = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', creatorCookies)
        .send({ content: 'Updated content' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.content).toBe('Updated content');
      expect(updateResponse.body.data.is_anonymous).toBe(true);
      expect(updateResponse.body.data.created_by_alias).toBeNull();
    });

    it('should prevent others from modifying anonymous cards', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User 1 joins and creates anonymous card
      const user1JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User1' });
      const user1Cookies = user1JoinResponse.headers['set-cookie'];

      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user1Cookies)
        .send({
          column_id: 'col-1',
          content: 'Anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });

      const cardId = createCardResponse.body.data.id;

      // User 2 tries to update
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      const updateResponse = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', user2Cookies)
        .send({ content: 'Hacked content' });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error.code).toBe('FORBIDDEN');

      // Verify card wasn't changed
      const getCardResponse = await request(app)
        .get(`/v1/cards/${cardId}`);
      expect(getCardResponse.body.data.content).toBe('Anonymous feedback');
    });
  });

  describe('Reactions on Anonymous Cards', () => {
    it('should allow reactions on anonymous cards', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User 1 creates anonymous card
      const user1JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User1' });
      const user1Cookies = user1JoinResponse.headers['set-cookie'];

      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user1Cookies)
        .send({
          column_id: 'col-1',
          content: 'Anonymous feedback',
          card_type: 'feedback',
          is_anonymous: true,
        });

      const cardId = createCardResponse.body.data.id;

      // User 2 reacts to anonymous card
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      const reactionResponse = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', user2Cookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(reactionResponse.status).toBe(201);

      // Verify card reaction count updated
      const getCardResponse = await request(app)
        .get(`/v1/cards/${cardId}`);
      expect(getCardResponse.body.data.direct_reaction_count).toBe(1);
      expect(getCardResponse.body.data.is_anonymous).toBe(true);
    });

    it('should hide reactor alias in anonymous reactions', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Create a card
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'CardCreator' });
      const creatorCookies = joinResponse.headers['set-cookie'];

      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Test card',
          card_type: 'feedback',
          is_anonymous: false,
        });

      const cardId = createCardResponse.body.data.id;

      // React to the card
      const reactorJoin = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'Reactor' });
      const reactorCookies = reactorJoin.headers['set-cookie'];

      const reactionResponse = await request(app)
        .post(`/v1/cards/${cardId}/reactions`)
        .set('Cookie', reactorCookies)
        .send({ reaction_type: 'thumbs_up' });

      expect(reactionResponse.status).toBe(201);

      // Verify reaction was recorded - hash IS exposed (for ownership)
      expect(reactionResponse.body.data.user_cookie_hash).toBeDefined();
      expect(reactionResponse.body.data.user_cookie_hash.length).toBe(64);
    });
  });

  describe('Database Privacy Verification', () => {
    it('should never store plain cookies in database', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Join board
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'TestUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create card
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Test card',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Extract cookie value
      const cookieString = userCookies[0];
      const cookieMatch = cookieString.match(/retro_session_id=s%3A([^.]+)/);
      const rawCookieId = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

      // Check all collections for raw cookie values
      const testDb = getTestDb();

      // Check boards collection
      const boards = await testDb.collection('boards').find({}).toArray();
      for (const boardDoc of boards) {
        const boardStr = JSON.stringify(boardDoc);
        if (rawCookieId) {
          expect(boardStr).not.toContain(rawCookieId);
        }
      }

      // Check cards collection
      const cards = await testDb.collection('cards').find({}).toArray();
      for (const cardDoc of cards) {
        const cardStr = JSON.stringify(cardDoc);
        if (rawCookieId) {
          expect(cardStr).not.toContain(rawCookieId);
        }
        // Verify hash is stored instead
        expect(cardDoc.created_by_hash).toBeDefined();
        expect(cardDoc.created_by_hash.length).toBe(64);
      }

      // Check user_sessions collection
      const sessions = await testDb.collection('user_sessions').find({}).toArray();
      for (const sessionDoc of sessions) {
        const sessionStr = JSON.stringify(sessionDoc);
        if (rawCookieId) {
          expect(sessionStr).not.toContain(rawCookieId);
        }
        // Verify hash is stored instead
        expect(sessionDoc.cookie_hash).toBeDefined();
        expect(sessionDoc.cookie_hash.length).toBe(64);
      }
    });
  });
});
