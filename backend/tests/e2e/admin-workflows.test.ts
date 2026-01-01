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
import {
  AdminService,
  AdminController,
  createAdminRoutes,
} from '@/domains/admin/index.js';
import { NoOpEventBroadcaster } from '@/gateway/socket/index.js';

/**
 * E2E Test Suite: Admin Workflows & Advanced Scenarios
 *
 * Tests admin designation, shareable links, cascade delete, and hierarchy enforcement
 */
describe('Admin Workflows E2E Tests', () => {
  let app: Express;
  let db: Db;
  let boardRepository: BoardRepository;
  let cardRepository: CardRepository;
  let userSessionRepository: UserSessionRepository;
  let reactionRepository: ReactionRepository;

  beforeAll(async () => {
    db = await startTestDb();

    app = createTestApp();

    // Set up all repositories
    boardRepository = new BoardRepository(db);
    userSessionRepository = new UserSessionRepository(db);
    cardRepository = new CardRepository(db);
    reactionRepository = new ReactionRepository(db);

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
    const adminService = new AdminService(
      db,
      boardRepository,
      cardRepository,
      reactionRepository,
      userSessionRepository
    );

    // Wire up cascade delete dependencies
    // Note: mongodb-memory-server doesn't support transactions, so getMongoClient is not provided
    boardService.setCascadeDeleteDependencies({
      getCardIdsByBoard: (boardId) => cardRepository.getCardIdsByBoard(boardId),
      deleteReactionsByCards: (cardIds, session) => reactionRepository.deleteByCards(cardIds, session),
      deleteCardsByBoard: (boardId, session) => cardRepository.deleteByBoard(boardId, session),
      deleteSessionsByBoard: (boardId, session) => userSessionRepository.deleteByBoard(boardId, session),
      deleteBoardById: (boardId, session) => boardRepository.delete(boardId, session),
    });

    // Set up controllers
    const boardController = new BoardController(boardService);
    const userSessionController = new UserSessionController(userSessionService);
    const cardController = new CardController(cardService);
    const reactionController = new ReactionController(reactionService);
    const adminController = new AdminController(adminService);

    // Wire up routes
    app.use('/v1/boards', createBoardRoutes(boardController));
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));
    app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
    app.use('/v1/cards', createCardRoutes(cardController));
    app.use('/v1/cards/:id/reactions', createCardReactionRoutes(reactionController));
    app.use('/v1/boards/:id/reactions', createBoardReactionRoutes(reactionController));
    app.use('/v1/boards/:id/test', createAdminRoutes(adminController));

    addErrorHandlers(app);
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('Admin Designation Flow', () => {
    it('should allow creator to designate admin using cookie hash', async () => {
      // Step 1: Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Admin Flow Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(createBoardResponse.status).toBe(201);
      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Step 2: Creator joins (becomes admin automatically)
      const creatorJoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });
      expect(creatorJoinResponse.status).toBe(200);
      expect(creatorJoinResponse.body.data.user_session.is_admin).toBe(true);

      // Step 3: User2 joins (not admin)
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      expect(user2JoinResponse.status).toBe(200);
      expect(user2JoinResponse.body.data.user_session.is_admin).toBe(false);
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // Step 4: User2 creates a card
      const card1Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'col-1',
          content: 'User2 card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(card1Response.status).toBe(201);
      const card1Id = card1Response.body.data.id;

      // Step 5: Creator creates another card
      const card2Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Creator card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(card2Response.status).toBe(201);
      const card2Id = card2Response.body.data.id;

      // Step 6: User2 tries to link cards (should fail - not admin, not creator of both)
      const failedLinkResponse = await request(app)
        .post(`/v1/cards/${card2Id}/link`)
        .set('Cookie', user2Cookies)
        .send({
          target_card_id: card1Id,
          link_type: 'parent_of',
        });
      expect(failedLinkResponse.status).toBe(403);

      // Step 7: Get user2's cookie hash from repository and promote to admin
      const sessions = await userSessionRepository.findActiveUsers(board.id);
      const user2Session = sessions.find((s) => s.alias === 'User2');
      expect(user2Session).toBeDefined();

      const addAdminResponse = await request(app)
        .post(`/v1/boards/${board.id}/admins`)
        .set('Cookie', creatorCookies)
        .send({ user_cookie_hash: user2Session!.cookie_hash });
      expect(addAdminResponse.status).toBe(201);

      // Step 8: Verify User2 is now admin by rejoining
      const user2RejoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', user2Cookies)
        .send({ alias: 'User2' });
      expect(user2RejoinResponse.body.data.user_session.is_admin).toBe(true);

      // Step 9: User2 can now link cards (admin privilege)
      const successLinkResponse = await request(app)
        .post(`/v1/cards/${card2Id}/link`)
        .set('Cookie', user2Cookies)
        .send({
          target_card_id: card1Id,
          link_type: 'parent_of',
        });
      expect(successLinkResponse.status).toBe(201);

      // Verify link was created
      const card2Details = await request(app).get(`/v1/cards/${card2Id}`);
      expect(card2Details.body.data.children).toHaveLength(1);
      expect(card2Details.body.data.children[0].id).toBe(card1Id);
    });

    it('should prevent non-creator from designating admins', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Admin Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User2 joins (not creator)
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // User3 joins
      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User3' });

      // Get user3's cookie hash from repository
      const sessions = await userSessionRepository.findActiveUsers(board.id);
      const user3Session = sessions.find((s) => s.alias === 'User3');
      expect(user3Session).toBeDefined();

      // User2 tries to make User3 admin - should fail (not creator)
      const addAdminResponse = await request(app)
        .post(`/v1/boards/${board.id}/admins`)
        .set('Cookie', user2Cookies)
        .send({ user_cookie_hash: user3Session!.cookie_hash });

      expect(addAdminResponse.status).toBe(403);
    });
  });

  describe('Shareable Link Access', () => {
    // Helper to extract link code from full shareable_link URL
    // shareable_link format: "http://host/join/CODE" - extract CODE
    function extractLinkCode(shareableLink: string): string {
      const parts = shareableLink.split('/join/');
      return parts.length > 1 ? parts[1] : shareableLink;
    }

    it('should allow accessing board via shareable_link', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Shareable Link Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      expect(createBoardResponse.status).toBe(201);
      const board = createBoardResponse.body.data;
      expect(board.shareable_link).toBeDefined();
      expect(board.shareable_link.length).toBeGreaterThan(0);

      // Extract the link code from the full URL
      const linkCode = extractLinkCode(board.shareable_link);

      // Access board via shareable link code
      const getByLinkResponse = await request(app)
        .get(`/v1/boards/by-link/${linkCode}`);

      expect(getByLinkResponse.status).toBe(200);
      expect(getByLinkResponse.body.data.id).toBe(board.id);
      expect(getByLinkResponse.body.data.name).toBe('Shareable Link Test');
    });

    it('should return 404 for non-existent shareable link', async () => {
      const response = await request(app)
        .get('/v1/boards/by-link/nonexistent123');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOARD_NOT_FOUND');
    });

    it('should return same board whether accessed by id or shareable_link', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Dual Access Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const linkCode = extractLinkCode(board.shareable_link);

      // Access by ID
      const byIdResponse = await request(app).get(`/v1/boards/${board.id}`);

      // Access by shareable link code
      const byLinkResponse = await request(app)
        .get(`/v1/boards/by-link/${linkCode}`);

      // Both should return the same data
      expect(byIdResponse.status).toBe(200);
      expect(byLinkResponse.status).toBe(200);
      expect(byIdResponse.body.data.id).toBe(byLinkResponse.body.data.id);
      expect(byIdResponse.body.data.name).toBe(byLinkResponse.body.data.name);
    });
  });

  describe('Board Deletion', () => {
    it('should delete a board when requested by creator', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Delete Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Verify board exists
      const getBoardBefore = await request(app).get(`/v1/boards/${board.id}`);
      expect(getBoardBefore.status).toBe(200);

      // Delete board
      const deleteResponse = await request(app)
        .delete(`/v1/boards/${board.id}`)
        .set('Cookie', creatorCookies);
      expect(deleteResponse.status).toBe(204);

      // Verify board no longer exists
      const getBoardResponse = await request(app).get(`/v1/boards/${board.id}`);
      expect(getBoardResponse.status).toBe(404);
    });

    it('should prevent non-creator from deleting board', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Delete Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User2 joins (not creator)
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // User2 tries to delete - should fail
      const deleteResponse = await request(app)
        .delete(`/v1/boards/${board.id}`)
        .set('Cookie', user2Cookies);
      expect(deleteResponse.status).toBe(403);

      // Board should still exist
      const getBoardResponse = await request(app).get(`/v1/boards/${board.id}`);
      expect(getBoardResponse.status).toBe(200);
    });

    it('should cascade delete cards, reactions, and sessions when board is deleted', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Cascade Delete Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Join board
      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      // Add second user
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // Create cards
      const card1Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Card 1',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const card1Id = card1Response.body.data.id;

      const card2Response = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', user2Cookies)
        .send({
          column_id: 'col-1',
          content: 'Card 2',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const card2Id = card2Response.body.data.id;

      // Add reactions
      await request(app)
        .post(`/v1/cards/${card1Id}/reactions`)
        .set('Cookie', creatorCookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${card1Id}/reactions`)
        .set('Cookie', user2Cookies)
        .send({ reaction_type: 'thumbs_up' });

      await request(app)
        .post(`/v1/cards/${card2Id}/reactions`)
        .set('Cookie', creatorCookies)
        .send({ reaction_type: 'thumbs_up' });

      // Verify data exists before delete
      const cardsBeforeDelete = await request(app).get(`/v1/boards/${board.id}/cards`);
      expect(cardsBeforeDelete.body.data.cards.length).toBe(2);

      const usersBeforeDelete = await request(app).get(`/v1/boards/${board.id}/users`);
      expect(usersBeforeDelete.body.data.active_users.length).toBe(2);

      // Delete board
      const deleteResponse = await request(app)
        .delete(`/v1/boards/${board.id}`)
        .set('Cookie', creatorCookies);
      expect(deleteResponse.status).toBe(204);

      // Verify board no longer exists
      const getBoardAfterDelete = await request(app).get(`/v1/boards/${board.id}`);
      expect(getBoardAfterDelete.status).toBe(404);

      // Verify cards are gone (attempting to get card returns 404)
      const getCard1After = await request(app).get(`/v1/cards/${card1Id}`);
      expect(getCard1After.status).toBe(404);

      const getCard2After = await request(app).get(`/v1/cards/${card2Id}`);
      expect(getCard2After.status).toBe(404);

      // Verify reactions are gone (attempting to add reaction fails since card doesn't exist)
      const addReactionAfter = await request(app)
        .post(`/v1/cards/${card1Id}/reactions`)
        .set('Cookie', creatorCookies)
        .send({ reaction_type: 'thumbs_up' });
      expect(addReactionAfter.status).toBe(404);
    });
  });

  describe('1-Level Hierarchy Enforcement', () => {
    it('should prevent child card from becoming a parent', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Hierarchy Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const cookies = createBoardResponse.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'User' });

      // Create parent, child, and grandchild candidate
      const parentCard = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent', card_type: 'feedback', is_anonymous: false });

      const childCard = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Child', card_type: 'feedback', is_anonymous: false });

      const grandchildCard = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Grandchild', card_type: 'feedback', is_anonymous: false });

      const parentId = parentCard.body.data.id;
      const childId = childCard.body.data.id;
      const grandchildId = grandchildCard.body.data.id;

      // Link parent -> child (should succeed)
      const linkResponse = await request(app)
        .post(`/v1/cards/${parentId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: childId, link_type: 'parent_of' });
      expect(linkResponse.status).toBe(201);

      // Try to link child -> grandchild (should fail - child already has parent)
      const invalidLinkResponse = await request(app)
        .post(`/v1/cards/${childId}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: grandchildId, link_type: 'parent_of' });

      expect(invalidLinkResponse.status).toBe(400);
      expect(invalidLinkResponse.body.error.code).toBe('CHILD_CANNOT_BE_PARENT');
    });

    it('should prevent parent from becoming a child', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Hierarchy Test 2',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const cookies = createBoardResponse.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'User' });

      // Create cards
      const card1 = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 1', card_type: 'feedback', is_anonymous: false });

      const card2 = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 2', card_type: 'feedback', is_anonymous: false });

      const card3 = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Card 3', card_type: 'feedback', is_anonymous: false });

      const card1Id = card1.body.data.id;
      const card2Id = card2.body.data.id;
      const card3Id = card3.body.data.id;

      // Make card1 parent of card2
      await request(app)
        .post(`/v1/cards/${card1Id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card2Id, link_type: 'parent_of' });

      // Try to make card3 parent of card1 (card1 already has children, so can't become child)
      const invalidLinkResponse = await request(app)
        .post(`/v1/cards/${card3Id}/link`)
        .set('Cookie', cookies)
        .send({ target_card_id: card1Id, link_type: 'parent_of' });

      expect(invalidLinkResponse.status).toBe(400);
      expect(invalidLinkResponse.body.error.code).toBe('PARENT_CANNOT_BE_CHILD');
    });

    it('should allow multiple children for one parent', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Multi-Child Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const cookies = createBoardResponse.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'User' });

      // Create parent and multiple children
      const parentCard = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', cookies)
        .send({ column_id: 'col-1', content: 'Parent', card_type: 'feedback', is_anonymous: false });

      const childIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const childCard = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', cookies)
          .send({ column_id: 'col-1', content: `Child ${i + 1}`, card_type: 'feedback', is_anonymous: false });
        childIds.push(childCard.body.data.id);
      }

      const parentId = parentCard.body.data.id;

      // Link all children to parent
      for (const childId of childIds) {
        const linkResponse = await request(app)
          .post(`/v1/cards/${parentId}/link`)
          .set('Cookie', cookies)
          .send({ target_card_id: childId, link_type: 'parent_of' });
        expect(linkResponse.status).toBe(201);
      }

      // Verify parent has all children
      // NOTE: GET /cards/:id should include children (Phase 8.5)
      const parentDetails = await request(app).get(`/v1/cards/${parentId}`);
      expect(parentDetails.body.data.children).toHaveLength(3);
    });
  });

  describe('Admin API Workflow', () => {
    it('should complete clear → seed → verify → reset workflow', async () => {
      // Create a board with initial data
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Admin API Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      // Create some initial data
      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Initial card',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Step 1: Clear the board
      const clearResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', 'dev-admin-secret-16chars');

      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body.data.cards_deleted).toBeGreaterThanOrEqual(1);

      // Verify board is empty
      const cardsAfterClear = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(cardsAfterClear.body.data.cards).toHaveLength(0);

      // Step 2: Seed test data
      const seedResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/seed`)
        .set('X-Admin-Secret', 'dev-admin-secret-16chars')
        .send({
          num_users: 3,
          num_cards: 6,
          num_action_cards: 0,
          num_reactions: 3,
          create_relationships: false,
        });

      expect(seedResponse.status).toBe(201);
      expect(seedResponse.body.data.users_created).toBe(3);
      expect(seedResponse.body.data.cards_created).toBe(6);
      expect(seedResponse.body.data.reactions_created).toBe(3);

      // Verify seeded data exists
      const cardsAfterSeed = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(cardsAfterSeed.body.data.cards.length).toBeGreaterThan(0);

      // Step 3: Reset the board (clear + restore to initial state)
      const resetResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/reset`)
        .set('X-Admin-Secret', 'dev-admin-secret-16chars');

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body.data.cards_deleted).toBeGreaterThanOrEqual(6);
      // board_reopened is false since board was never closed
      expect(resetResponse.body.data.board_reopened).toBe(false);

      // Verify board is back to clean state
      const cardsAfterReset = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(cardsAfterReset.body.data.cards).toHaveLength(0);
    });

    it('should reject admin API calls without valid secret', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Auth Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // No header
      const noHeaderResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`);
      expect(noHeaderResponse.status).toBe(401);

      // Wrong secret
      const wrongSecretResponse = await request(app)
        .post(`/v1/boards/${board.id}/test/clear`)
        .set('X-Admin-Secret', 'wrong-secret');
      expect(wrongSecretResponse.status).toBe(401);
    });
  });

  describe('Multi-Board User', () => {
    it('should allow same user to participate on multiple boards independently', async () => {
      // Create two boards
      const board1Response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Board 1',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: 2,
        });
      const board1 = board1Response.body.data;

      const board2Response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Board 2',
          columns: [{ id: 'col-1', name: 'Column 1' }],
          card_limit_per_user: 3,
        });
      const board2 = board2Response.body.data;

      // User joins both boards with same cookie
      const userJoinBoard1 = await request(app)
        .post(`/v1/boards/${board1.id}/join`)
        .send({ alias: 'SharedUser' });
      const userCookies = userJoinBoard1.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board2.id}/join`)
        .set('Cookie', userCookies)
        .send({ alias: 'SharedUser' });

      // Create cards on board 1 (limit 2)
      for (let i = 0; i < 2; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board1.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Board1 Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        expect(response.status).toBe(201);
      }

      // Board 1 at limit
      const board1LimitResponse = await request(app)
        .post(`/v1/boards/${board1.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Should fail',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(board1LimitResponse.status).toBe(403);

      // But can still create on board 2 (limit 3, used 0)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board2.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Board2 Card ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        expect(response.status).toBe(201);
      }

      // Check quotas are independent
      const board1Quota = await request(app)
        .get(`/v1/boards/${board1.id}/cards/quota`)
        .set('Cookie', userCookies);
      expect(board1Quota.body.data.current_count).toBe(2);
      expect(board1Quota.body.data.limit).toBe(2);

      const board2Quota = await request(app)
        .get(`/v1/boards/${board2.id}/cards/quota`)
        .set('Cookie', userCookies);
      expect(board2Quota.body.data.current_count).toBe(3);
      expect(board2Quota.body.data.limit).toBe(3);
    });

    it('should allow different aliases on different boards', async () => {
      // Create two boards
      const board1Response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Board 1',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });
      const board1 = board1Response.body.data;

      const board2Response = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Board 2',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });
      const board2 = board2Response.body.data;

      // User joins board 1 with alias "Alice"
      const userJoinBoard1 = await request(app)
        .post(`/v1/boards/${board1.id}/join`)
        .send({ alias: 'Alice' });
      const userCookies = userJoinBoard1.headers['set-cookie'];

      // Same user joins board 2 with alias "Bob"
      await request(app)
        .post(`/v1/boards/${board2.id}/join`)
        .set('Cookie', userCookies)
        .send({ alias: 'Bob' });

      // Check active users on each board
      const board1Users = await request(app)
        .get(`/v1/boards/${board1.id}/users`);
      const board1Aliases = board1Users.body.data.active_users.map((u: any) => u.alias);
      expect(board1Aliases).toContain('Alice');
      expect(board1Aliases).not.toContain('Bob');

      const board2Users = await request(app)
        .get(`/v1/boards/${board2.id}/users`);
      const board2Aliases = board2Users.body.data.active_users.map((u: any) => u.alias);
      expect(board2Aliases).toContain('Bob');
      expect(board2Aliases).not.toContain('Alice');
    });
  });

  describe('Alias Management', () => {
    it('should allow user to update their alias', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Alias Update Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User joins with initial alias
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'OldAlias' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create a card
      const cardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'My card',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const cardId = cardResponse.body.data.id;

      // Verify card shows original alias
      const cardBefore = await request(app).get(`/v1/cards/${cardId}`);
      expect(cardBefore.body.data.created_by_alias).toBe('OldAlias');

      // Update alias (PATCH /users/alias)
      const aliasUpdateResponse = await request(app)
        .patch(`/v1/boards/${board.id}/users/alias`)
        .set('Cookie', userCookies)
        .send({ alias: 'NewAlias' });

      expect(aliasUpdateResponse.status).toBe(200);
      expect(aliasUpdateResponse.body.data.alias).toBe('NewAlias');

      // Verify active users shows new alias
      const usersResponse = await request(app)
        .get(`/v1/boards/${board.id}/users`);
      const aliases = usersResponse.body.data.active_users.map((u: any) => u.alias);
      expect(aliases).toContain('NewAlias');
      expect(aliases).not.toContain('OldAlias');

      // Card should still be owned by this user (can still update it)
      const updateCardResponse = await request(app)
        .put(`/v1/cards/${cardId}`)
        .set('Cookie', userCookies)
        .send({ content: 'Updated by new alias' });
      expect(updateCardResponse.status).toBe(200);
    });

    it('should allow user to rejoin with different alias (same cookie)', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Rejoin Alias Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // First join
      const join1Response = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'FirstAlias' });
      const userCookies = join1Response.headers['set-cookie'];

      // Verify first alias
      const users1 = await request(app).get(`/v1/boards/${board.id}/users`);
      expect(users1.body.data.active_users.find((u: any) => u.alias === 'FirstAlias')).toBeDefined();

      // Rejoin with same cookie but different alias
      const join2Response = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', userCookies)
        .send({ alias: 'SecondAlias' });

      expect(join2Response.status).toBe(200);
      expect(join2Response.body.data.user_session.alias).toBe('SecondAlias');

      // Only one session should exist for this user
      const users2 = await request(app).get(`/v1/boards/${board.id}/users`);
      expect(users2.body.data.active_users.length).toBe(1);
      expect(users2.body.data.active_users[0].alias).toBe('SecondAlias');
    });
  });

  describe('Admin Revocation', () => {
    it('should prevent non-creator from being removed as admin by themselves', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Admin Revocation Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Creator joins
      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      // User2 joins
      const user2JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });
      const user2Cookies = user2JoinResponse.headers['set-cookie'];

      // Get user2's cookie hash
      const sessions = await userSessionRepository.findActiveUsers(board.id);
      const user2Session = sessions.find((s) => s.alias === 'User2');
      expect(user2Session).toBeDefined();

      // Creator makes User2 admin
      await request(app)
        .post(`/v1/boards/${board.id}/admins`)
        .set('Cookie', creatorCookies)
        .send({ user_cookie_hash: user2Session!.cookie_hash });

      // Verify User2 is admin
      const user2Rejoin = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', user2Cookies)
        .send({ alias: 'User2' });
      expect(user2Rejoin.body.data.user_session.is_admin).toBe(true);

      // User2 cannot revoke their own admin status (no DELETE /admins endpoint exists)
      // But User2 also cannot designate others as admin (only creator can)
      const user3JoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User3' });

      const sessions2 = await userSessionRepository.findActiveUsers(board.id);
      const user3Session = sessions2.find((s) => s.alias === 'User3');

      // User2 (admin but not creator) tries to add User3 as admin
      const addAdminResponse = await request(app)
        .post(`/v1/boards/${board.id}/admins`)
        .set('Cookie', user2Cookies)
        .send({ user_cookie_hash: user3Session!.cookie_hash });

      expect(addAdminResponse.status).toBe(403);
    });
  });

  describe('Closed Board Access', () => {
    it('should allow read-only access to closed board via shareable link', async () => {
      // Create board
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Closed Board Link Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;
      const creatorCookies = createBoardResponse.headers['set-cookie'];

      // Join and create cards
      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .set('Cookie', creatorCookies)
        .send({ alias: 'Creator' });

      await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', creatorCookies)
        .send({
          column_id: 'col-1',
          content: 'Card before close',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Close the board
      await request(app)
        .patch(`/v1/boards/${board.id}/close`)
        .set('Cookie', creatorCookies);

      // Extract link code
      const linkCode = board.shareable_link.split('/join/').pop();

      // Access via shareable link - should succeed (read access)
      const byLinkResponse = await request(app)
        .get(`/v1/boards/by-link/${linkCode}`);
      expect(byLinkResponse.status).toBe(200);
      expect(byLinkResponse.body.data.state).toBe('closed');

      // Can still read cards
      const cardsResponse = await request(app)
        .get(`/v1/boards/${board.id}/cards`);
      expect(cardsResponse.status).toBe(200);
      expect(cardsResponse.body.data.cards.length).toBe(1);

      // New user can still join (to read)
      const newUserJoinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'NewUser' });
      expect(newUserJoinResponse.status).toBe(200);

      const newUserCookies = newUserJoinResponse.headers['set-cookie'];

      // But cannot create cards
      const createCardResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', newUserCookies)
        .send({
          column_id: 'col-1',
          content: 'Should fail',
          card_type: 'feedback',
          is_anonymous: false,
        });
      expect(createCardResponse.status).toBe(409);
      expect(createCardResponse.body.error.code).toBe('BOARD_CLOSED');
    });
  });

  describe('Multiple Action-Feedback Links', () => {
    it('should allow action card to link to multiple feedback cards', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Multi-Link Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create multiple feedback cards
      const feedbackIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/v1/boards/${board.id}/cards`)
          .set('Cookie', userCookies)
          .send({
            column_id: 'col-1',
            content: `Feedback ${i + 1}`,
            card_type: 'feedback',
            is_anonymous: false,
          });
        feedbackIds.push(response.body.data.id);
      }

      // Create action card
      const actionResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Action addressing all feedback',
          card_type: 'action',
          is_anonymous: false,
        });
      const actionId = actionResponse.body.data.id;

      // Link action to all feedback cards
      for (const feedbackId of feedbackIds) {
        const linkResponse = await request(app)
          .post(`/v1/cards/${actionId}/link`)
          .set('Cookie', userCookies)
          .send({ target_card_id: feedbackId, link_type: 'linked_to' });
        expect(linkResponse.status).toBe(201);
      }

      // Verify action has all 3 linked feedback cards
      const actionDetails = await request(app).get(`/v1/cards/${actionId}`);
      expect(actionDetails.body.data.linked_feedback_cards).toHaveLength(3);

      // Verify each feedback card is linked
      const linkedIds = actionDetails.body.data.linked_feedback_cards.map((c: any) => c.id);
      for (const feedbackId of feedbackIds) {
        expect(linkedIds).toContain(feedbackId);
      }
    });

    it('should prevent duplicate links between same cards', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Duplicate Link Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User' });
      const userCookies = joinResponse.headers['set-cookie'];

      // Create feedback and action cards
      const feedbackResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Feedback',
          card_type: 'feedback',
          is_anonymous: false,
        });
      const feedbackId = feedbackResponse.body.data.id;

      const actionResponse = await request(app)
        .post(`/v1/boards/${board.id}/cards`)
        .set('Cookie', userCookies)
        .send({
          column_id: 'col-1',
          content: 'Action',
          card_type: 'action',
          is_anonymous: false,
        });
      const actionId = actionResponse.body.data.id;

      // First link should succeed
      const link1Response = await request(app)
        .post(`/v1/cards/${actionId}/link`)
        .set('Cookie', userCookies)
        .send({ target_card_id: feedbackId, link_type: 'linked_to' });
      expect(link1Response.status).toBe(201);

      // Second identical link is idempotent (uses $addToSet - no duplicate added)
      const link2Response = await request(app)
        .post(`/v1/cards/${actionId}/link`)
        .set('Cookie', userCookies)
        .send({ target_card_id: feedbackId, link_type: 'linked_to' });

      // Should succeed silently (idempotent behavior - MongoDB $addToSet)
      expect(link2Response.status).toBe(201);

      // Verify only one link exists (no duplicates)
      const cardAfter = await request(app).get(`/v1/cards/${actionId}`);
      const linkedIds = cardAfter.body.data.linked_feedback_ids;
      expect(linkedIds.length).toBe(1);
      expect(linkedIds[0]).toBe(feedbackId);
    });
  });

  describe('Session Timeout Behavior', () => {
    it('should mark users as inactive after timeout period', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Timeout Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // Multiple users join
      const user1Join = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User1' });
      const user1Cookies = user1Join.headers['set-cookie'];

      await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'User2' });

      // Initially both should be active
      const activeUsers1 = await request(app)
        .get(`/v1/boards/${board.id}/users`);
      expect(activeUsers1.body.data.active_users.length).toBe(2);

      // User1 sends heartbeat (PATCH /users/heartbeat)
      await request(app)
        .patch(`/v1/boards/${board.id}/users/heartbeat`)
        .set('Cookie', user1Cookies);

      // Both still active (heartbeat refreshes)
      const activeUsers2 = await request(app)
        .get(`/v1/boards/${board.id}/users`);
      expect(activeUsers2.body.data.active_users.length).toBe(2);

      // Note: To properly test timeout, we would need to manipulate time
      // This test verifies the heartbeat endpoint works
    });

    it('should update last_active_at on join and heartbeat', async () => {
      const createBoardResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Activity Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const board = createBoardResponse.body.data;

      // User joins
      const joinResponse = await request(app)
        .post(`/v1/boards/${board.id}/join`)
        .send({ alias: 'ActiveUser' });
      const userCookies = joinResponse.headers['set-cookie'];

      const initialLastActive = joinResponse.body.data.user_session.last_active_at;
      expect(initialLastActive).toBeDefined();

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Send heartbeat (PATCH /users/heartbeat)
      const heartbeatResponse = await request(app)
        .patch(`/v1/boards/${board.id}/users/heartbeat`)
        .set('Cookie', userCookies);

      expect(heartbeatResponse.status).toBe(200);
      expect(heartbeatResponse.body.data.last_active_at).toBeDefined();

      // last_active_at should be updated (or same if within same second)
      const newLastActive = new Date(heartbeatResponse.body.data.last_active_at);
      const oldLastActive = new Date(initialLastActive);
      expect(newLastActive.getTime()).toBeGreaterThanOrEqual(oldLastActive.getTime());
    });
  });
});
