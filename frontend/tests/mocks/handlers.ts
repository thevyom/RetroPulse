/**
 * MSW Request Handlers
 * Mock API handlers for integration testing
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  Board,
  Card,
  CardQuota,
  ReactionQuota,
  CardsResponse,
  UserSession,
} from '@/models/types';

// ============================================================================
// Test Data Factories
// ============================================================================

export function createMockBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'board-123',
    name: 'Test Retrospective',
    shareable_link: 'http://localhost:3000/board/board-123',
    state: 'active',
    closed_at: null,
    columns: [
      { id: 'col-1', name: 'What Went Well', color: '#22c55e' },
      { id: 'col-2', name: 'To Improve', color: '#f97316' },
      { id: 'col-3', name: 'Action Items', color: '#3b82f6' },
    ],
    admins: ['user-hash-1'],
    active_users: [
      {
        alias: 'TestUser',
        is_admin: true,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    card_limit_per_user: 5,
    reaction_limit_per_user: 10,
    created_at: new Date().toISOString(),
    created_by_hash: 'user-hash-1',
    ...overrides,
  };
}

export function createMockCard(overrides: Partial<Card> = {}): Card {
  const id = overrides.id || `card-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    board_id: 'board-123',
    column_id: 'col-1',
    content: 'Test card content',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'user-hash-1',
    created_by_alias: 'TestUser',
    created_at: new Date().toISOString(),
    direct_reaction_count: 0,
    aggregated_reaction_count: 0,
    parent_card_id: null,
    linked_feedback_ids: [],
    ...overrides,
  };
}

export function createMockUserSession(overrides: Partial<UserSession> = {}): UserSession {
  return {
    cookie_hash: 'user-hash-1',
    alias: 'TestUser',
    is_admin: true,
    ...overrides,
  };
}

// ============================================================================
// Stateful Mock Data (for testing scenarios)
// ============================================================================

let mockCards: Map<string, Card> = new Map();
let mockBoard: Board = createMockBoard();
let mockCardQuota: CardQuota = {
  current_count: 1,
  limit: 5,
  can_create: true,
  limit_enabled: true,
};
let mockReactionQuota: ReactionQuota = {
  current_count: 2,
  limit: 10,
  can_react: true,
  limit_enabled: true,
};

// Initialize with some default cards
resetMockData();

export function resetMockData() {
  mockCards = new Map([
    ['card-1', createMockCard({ id: 'card-1', content: 'First test card', column_id: 'col-1' })],
    ['card-2', createMockCard({ id: 'card-2', content: 'Second test card', column_id: 'col-2' })],
  ]);
  mockBoard = createMockBoard();
  mockCardQuota = {
    current_count: 1,
    limit: 5,
    can_create: true,
    limit_enabled: true,
  };
  mockReactionQuota = {
    current_count: 2,
    limit: 10,
    can_react: true,
    limit_enabled: true,
  };
}

export function setMockCards(cards: Card[]) {
  mockCards = new Map(cards.map((c) => [c.id, c]));
}

export function setMockBoard(board: Board) {
  mockBoard = board;
}

export function setMockCardQuota(quota: CardQuota) {
  mockCardQuota = quota;
}

export function setMockReactionQuota(quota: ReactionQuota) {
  mockReactionQuota = quota;
}

// ============================================================================
// API Base URL
// ============================================================================

const API_BASE = 'http://localhost:3001/v1';

// ============================================================================
// Board Handlers
// ============================================================================

const boardHandlers = [
  // GET /boards/:boardId
  http.get(`${API_BASE}/boards/:boardId`, async ({ params }) => {
    await delay(50);
    const { boardId } = params;

    if (boardId === 'not-found') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'BOARD_NOT_FOUND', message: 'Board not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { ...mockBoard, id: boardId as string },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /boards
  http.post(`${API_BASE}/boards`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { name: string };

    const newBoard = createMockBoard({
      id: `board-${Date.now()}`,
      name: body.name,
    });

    return HttpResponse.json(
      {
        success: true,
        data: newBoard,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // POST /boards/:boardId/join
  http.post(`${API_BASE}/boards/:boardId/join`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { alias: string };

    return HttpResponse.json(
      {
        success: true,
        data: {
          board_id: 'board-123',
          user_session: createMockUserSession({ alias: body.alias }),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // PATCH /boards/:boardId/name
  http.patch(`${API_BASE}/boards/:boardId/name`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { name: string };

    mockBoard.name = body.name;

    return HttpResponse.json({
      success: true,
      data: { id: params.boardId, name: body.name },
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH /boards/:boardId/close
  http.patch(`${API_BASE}/boards/:boardId/close`, async ({ params }) => {
    await delay(50);
    mockBoard.state = 'closed';
    mockBoard.closed_at = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: { id: params.boardId, state: 'closed', closed_at: mockBoard.closed_at },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /boards/:boardId/admins
  http.post(`${API_BASE}/boards/:boardId/admins`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { user_cookie_hash: string };

    mockBoard.admins.push(body.user_cookie_hash);

    return HttpResponse.json({
      success: true,
      data: { board_id: params.boardId, admins: mockBoard.admins },
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH /boards/:boardId/columns/:columnId
  http.patch(`${API_BASE}/boards/:boardId/columns/:columnId`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { name: string };
    const { boardId, columnId } = params;

    const column = mockBoard.columns.find((c) => c.id === columnId);
    if (column) {
      column.name = body.name;
    }

    return HttpResponse.json({
      success: true,
      data: { board_id: boardId, column_id: columnId, name: body.name },
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /boards/:boardId/users
  http.get(`${API_BASE}/boards/:boardId/users`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: { users: mockBoard.active_users },
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH /boards/:boardId/users/heartbeat
  http.patch(`${API_BASE}/boards/:boardId/users/heartbeat`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: { last_active_at: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }),

  // PATCH /boards/:boardId/users/alias
  http.patch(`${API_BASE}/boards/:boardId/users/alias`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { alias: string };

    return HttpResponse.json({
      success: true,
      data: createMockUserSession({ alias: body.alias }),
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /boards/:boardId/users/me
  http.get(`${API_BASE}/boards/:boardId/users/me`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: { user_session: createMockUserSession() },
      timestamp: new Date().toISOString(),
    });
  }),

  // DELETE /boards/:boardId
  http.delete(`${API_BASE}/boards/:boardId`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================================
// Card Handlers
// ============================================================================

const cardHandlers = [
  // GET /boards/:boardId/cards
  http.get(`${API_BASE}/boards/:boardId/cards`, async () => {
    await delay(50);
    const cards = Array.from(mockCards.values());

    const cardsByColumn: Record<string, number> = {};
    for (const card of cards) {
      cardsByColumn[card.column_id] = (cardsByColumn[card.column_id] || 0) + 1;
    }

    const response: CardsResponse = {
      cards,
      total_count: cards.length,
      cards_by_column: cardsByColumn,
    };

    return HttpResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  }),

  // GET /boards/:boardId/cards/quota
  http.get(`${API_BASE}/boards/:boardId/cards/quota`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: mockCardQuota,
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /boards/:boardId/cards
  http.post(`${API_BASE}/boards/:boardId/cards`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as {
      column_id: string;
      content: string;
      card_type: 'feedback' | 'action';
      is_anonymous?: boolean;
    };

    // Check quota
    if (!mockCardQuota.can_create) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_LIMIT_REACHED', message: 'Card limit reached' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const newCard = createMockCard({
      id: `card-${Date.now()}`,
      board_id: params.boardId as string,
      column_id: body.column_id,
      content: body.content,
      card_type: body.card_type,
      is_anonymous: body.is_anonymous || false,
    });

    mockCards.set(newCard.id, newCard);
    mockCardQuota.current_count++;
    mockCardQuota.can_create =
      !mockCardQuota.limit_enabled || mockCardQuota.current_count < (mockCardQuota.limit || 999);

    return HttpResponse.json(
      {
        success: true,
        data: newCard,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // GET /cards/:cardId
  http.get(`${API_BASE}/cards/:cardId`, async ({ params }) => {
    await delay(50);
    const card = mockCards.get(params.cardId as string);

    if (!card) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: card,
      timestamp: new Date().toISOString(),
    });
  }),

  // PUT /cards/:cardId
  http.put(`${API_BASE}/cards/:cardId`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { content: string };
    const card = mockCards.get(params.cardId as string);

    if (!card) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    card.content = body.content;
    card.updated_at = new Date().toISOString();
    mockCards.set(card.id, card);

    return HttpResponse.json({
      success: true,
      data: { id: card.id, content: card.content, updated_at: card.updated_at },
      timestamp: new Date().toISOString(),
    });
  }),

  // DELETE /cards/:cardId
  http.delete(`${API_BASE}/cards/:cardId`, async ({ params }) => {
    await delay(50);
    const cardId = params.cardId as string;

    if (!mockCards.has(cardId)) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    mockCards.delete(cardId);
    mockCardQuota.current_count = Math.max(0, mockCardQuota.current_count - 1);
    mockCardQuota.can_create = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /cards/:cardId/column
  http.patch(`${API_BASE}/cards/:cardId/column`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { column_id: string };
    const card = mockCards.get(params.cardId as string);

    if (!card) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    card.column_id = body.column_id;
    mockCards.set(card.id, card);

    return HttpResponse.json({
      success: true,
      data: { id: card.id, column_id: card.column_id },
      timestamp: new Date().toISOString(),
    });
  }),

  // POST /cards/:cardId/link
  http.post(`${API_BASE}/cards/:cardId/link`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { target_card_id: string; link_type: string };
    const sourceCard = mockCards.get(params.cardId as string);
    const targetCard = mockCards.get(body.target_card_id);

    if (!sourceCard || !targetCard) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (body.link_type === 'parent_of') {
      // Source becomes parent of target
      targetCard.parent_card_id = sourceCard.id;
      mockCards.set(targetCard.id, targetCard);
    } else if (body.link_type === 'linked_to') {
      // Action linked to feedback
      sourceCard.linked_feedback_ids.push(body.target_card_id);
      mockCards.set(sourceCard.id, sourceCard);
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          source_card_id: params.cardId,
          target_card_id: body.target_card_id,
          link_type: body.link_type,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // DELETE /cards/:cardId/link
  http.delete(`${API_BASE}/cards/:cardId/link`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { target_card_id: string; link_type: string };
    const sourceCard = mockCards.get(params.cardId as string);
    const targetCard = mockCards.get(body.target_card_id);

    if (!sourceCard || !targetCard) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (body.link_type === 'parent_of') {
      targetCard.parent_card_id = null;
      mockCards.set(targetCard.id, targetCard);
    } else if (body.link_type === 'linked_to') {
      sourceCard.linked_feedback_ids = sourceCard.linked_feedback_ids.filter(
        (id) => id !== body.target_card_id
      );
      mockCards.set(sourceCard.id, sourceCard);
    }

    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================================
// Reaction Handlers
// ============================================================================

const reactionHandlers = [
  // POST /cards/:cardId/reactions
  http.post(`${API_BASE}/cards/:cardId/reactions`, async ({ params, request }) => {
    await delay(50);
    const body = (await request.json()) as { type: string };
    const card = mockCards.get(params.cardId as string);

    // Check quota
    if (!mockReactionQuota.can_react) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'REACTION_LIMIT_REACHED', message: 'Reaction limit reached' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    if (!card) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    card.direct_reaction_count++;
    card.aggregated_reaction_count++;
    mockCards.set(card.id, card);
    mockReactionQuota.current_count++;
    mockReactionQuota.can_react =
      !mockReactionQuota.limit_enabled ||
      mockReactionQuota.current_count < (mockReactionQuota.limit || 999);

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: `reaction-${Date.now()}`,
          card_id: params.cardId,
          type: body.type,
          created_by_hash: 'user-hash-1',
          created_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // DELETE /cards/:cardId/reactions
  http.delete(`${API_BASE}/cards/:cardId/reactions`, async ({ params }) => {
    await delay(50);
    const card = mockCards.get(params.cardId as string);

    if (!card) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'CARD_NOT_FOUND', message: 'Card not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    card.direct_reaction_count = Math.max(0, card.direct_reaction_count - 1);
    card.aggregated_reaction_count = Math.max(0, card.aggregated_reaction_count - 1);
    mockCards.set(card.id, card);
    mockReactionQuota.current_count = Math.max(0, mockReactionQuota.current_count - 1);
    mockReactionQuota.can_react = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /boards/:boardId/reactions/quota
  http.get(`${API_BASE}/boards/:boardId/reactions/quota`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: mockReactionQuota,
      timestamp: new Date().toISOString(),
    });
  }),
];

// ============================================================================
// Export All Handlers
// ============================================================================

export const handlers = [...boardHandlers, ...cardHandlers, ...reactionHandlers];
