import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
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
import { socketGateway, eventBroadcaster } from '@/gateway/socket/index.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CardCreatedPayload,
  UserLeftPayload,
} from '@/gateway/socket/socket-types.js';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

/**
 * E2E Test Suite: WebSocket Real-time Events
 *
 * Tests Socket.io events for real-time collaboration:
 * - Connection and room management
 * - Card events (created, updated, deleted)
 * - User presence events (joined, left)
 * - Reaction events
 */
describe('WebSocket E2E Tests', () => {
  let app: Express;
  let httpServer: HttpServer;
  let db: Db;
  let serverPort: number;

  beforeAll(async () => {
    db = await startTestDb();

    app = createTestApp();

    // Set up all repositories
    const boardRepository = new BoardRepository(db);
    const userSessionRepository = new UserSessionRepository(db);
    const cardRepository = new CardRepository(db);
    const reactionRepository = new ReactionRepository(db);

    // Set up services with real event broadcaster
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

    // Wire up cascade delete dependencies
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

    // Wire up routes
    app.use('/v1/boards', createBoardRoutes(boardController));
    app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));
    app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
    app.use('/v1/cards', createCardRoutes(cardController));
    app.use('/v1/cards/:id/reactions', createCardReactionRoutes(reactionController));
    app.use('/v1/boards/:id/reactions', createBoardReactionRoutes(reactionController));

    addErrorHandlers(app);

    // Create HTTP server and initialize Socket.io with the singleton gateway
    httpServer = createServer(app);
    socketGateway.initialize(httpServer);

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        serverPort = typeof address === 'object' ? address!.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await socketGateway.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearTestDb(db);
  });

  // Helper to create a connected client
  function createClient(cookies?: string): TypedClientSocket {
    const extraHeaders: Record<string, string> = {};
    if (cookies) {
      extraHeaders['Cookie'] = cookies;
    }
    return Client(`http://localhost:${serverPort}`, {
      extraHeaders,
      autoConnect: false,
    });
  }

  // Helper to wait for an event with timeout
  function waitForEvent<T>(
    socket: TypedClientSocket,
    event: keyof ServerToClientEvents,
    timeout = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event as string, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  describe('Connection and Room Management', () => {
    it('should connect to the socket server', async () => {
      const client = createClient();

      await new Promise<void>((resolve, reject) => {
        client.on('connect', resolve);
        client.on('connect_error', reject);
        client.connect();
      });

      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('should join a board room', async () => {
      // Create a board first
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Socket Test Board',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie']?.[0] || '';

      const client = createClient(cookies);
      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
        client.connect();
      });

      // Join the board room using new object format
      client.emit('join-board', { boardId, userAlias: 'TestUser' });

      // Wait a bit for the room join to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(client.connected).toBe(true);
      client.disconnect();
    });
  });

  describe('Card Events', () => {
    it('should receive card:created event when a card is created', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Card Event Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie']?.[0] || '';

      // Join the board
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies)
        .send({ alias: 'EventTester' });

      // Connect socket and join room
      const client = createClient(cookies);
      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
        client.connect();
      });

      client.emit('join-board', { boardId, userAlias: 'EventTester' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start listening for card:created event
      const eventPromise = waitForEvent<CardCreatedPayload>(client, 'card:created');

      // Create a card
      await request(app)
        .post(`/v1/boards/${boardId}/cards`)
        .set('Cookie', cookies)
        .send({
          column_id: 'col-1',
          content: 'Test card for socket event',
          card_type: 'feedback',
          is_anonymous: false,
        });

      // Wait for the event
      const event = await eventPromise;

      expect(event.boardId).toBe(boardId);
      expect(event.content).toBe('Test card for socket event');
      expect(event.columnId).toBe('col-1');
      expect(event.cardType).toBe('feedback');

      client.disconnect();
    });
  });

  describe('User Presence Events', () => {
    it('should emit user:left when client disconnects with alias', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Presence Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies1 = createResponse.headers['set-cookie']?.[0] || '';

      // Join the board as user 1
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies1)
        .send({ alias: 'User1' });

      // Connect user 2 to listen for events
      const user2Response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'User2' });
      const cookies2 = user2Response.headers['set-cookie']?.[0] || '';

      const listener = createClient(cookies2);
      await new Promise<void>((resolve) => {
        listener.on('connect', resolve);
        listener.connect();
      });

      listener.emit('join-board', { boardId, userAlias: 'User2' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Connect user 1
      const leaver = createClient(cookies1);
      await new Promise<void>((resolve) => {
        leaver.on('connect', resolve);
        leaver.connect();
      });

      leaver.emit('join-board', { boardId, userAlias: 'User1' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start listening for user:left event
      const eventPromise = waitForEvent<UserLeftPayload>(listener, 'user:left');

      // Disconnect user 1
      leaver.disconnect();

      // Wait for the event
      const event = await eventPromise;

      expect(event.boardId).toBe(boardId);
      expect(event.userAlias).toBe('User1');

      listener.disconnect();
    });

    it('should emit user:left when client leaves board room', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Leave Room Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies1 = createResponse.headers['set-cookie']?.[0] || '';

      // Join the board as user 1
      await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .set('Cookie', cookies1)
        .send({ alias: 'LeavingUser' });

      // Connect user 2 to listen for events
      const user2Response = await request(app)
        .post(`/v1/boards/${boardId}/join`)
        .send({ alias: 'Listener' });
      const cookies2 = user2Response.headers['set-cookie']?.[0] || '';

      const listener = createClient(cookies2);
      await new Promise<void>((resolve) => {
        listener.on('connect', resolve);
        listener.connect();
      });

      listener.emit('join-board', { boardId, userAlias: 'Listener' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Connect leaving user
      const leaver = createClient(cookies1);
      await new Promise<void>((resolve) => {
        leaver.on('connect', resolve);
        leaver.connect();
      });

      leaver.emit('join-board', { boardId, userAlias: 'LeavingUser' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start listening for user:left event
      const eventPromise = waitForEvent<UserLeftPayload>(listener, 'user:left');

      // Leave the room (not disconnect)
      leaver.emit('leave-board', boardId);

      // Wait for the event
      const event = await eventPromise;

      expect(event.boardId).toBe(boardId);
      expect(event.userAlias).toBe('LeavingUser');

      leaver.disconnect();
      listener.disconnect();
    });
  });

  describe('Legacy Format Support', () => {
    it('should support legacy string format for join-board', async () => {
      // Create a board
      const createResponse = await request(app)
        .post('/v1/boards')
        .send({
          name: 'Legacy Format Test',
          columns: [{ id: 'col-1', name: 'Column 1' }],
        });

      const boardId = createResponse.body.data.id;
      const cookies = createResponse.headers['set-cookie']?.[0] || '';

      const client = createClient(cookies);
      await new Promise<void>((resolve) => {
        client.on('connect', resolve);
        client.connect();
      });

      // Use legacy string format
      client.emit('join-board', boardId);

      // Wait a bit for the room join to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(client.connected).toBe(true);
      client.disconnect();
    });
  });
});
