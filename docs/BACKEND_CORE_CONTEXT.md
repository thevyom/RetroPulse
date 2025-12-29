# Backend Core Context - RetroPulse

> Single-file reference for understanding the backend structure, patterns, and testing setup.
> Focus: All domains (Board, User, Card, Reaction), real-time events, shared utilities, testing infrastructure.
> **Last Updated**: 2025-12-28 | **Phases Complete**: 1-6 ✅

---

## 🔹 Project & Tech Stack Snapshot

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | ≥20.0.0 |
| Language | TypeScript | 5.3+ |
| Framework | Express | 4.18 |
| Database | MongoDB | 6.3+ (driver) |
| Validation | Zod | 3.22 |
| Logging | Winston | 3.11 |
| Real-time | Socket.io | 4.7 ✅ |
| Package Manager | pnpm | - |
| Test Runner | Vitest | 1.1 |
| Test DB | mongodb-memory-server | 10.0 |
| HTTP Testing | Supertest | 6.3 |

**Project Type**: ESM (`"type": "module"`)

**Path Alias**: `@/` → `./src/` (configured in tsconfig + vitest)

**Key Scripts**:
```bash
pnpm dev           # tsx watch src/index.ts
pnpm test          # vitest run (all tests)
pnpm test:unit     # tests/unit only
pnpm test:integration  # tests/integration only
pnpm test:coverage # with v8 coverage
```

---

## 🧩 Key Shared Types & Utilities

### API Response Types (`src/shared/types/api.ts`)

```typescript
// Extended Express Request with auth
interface AuthenticatedRequest extends ExpressRequest {
  hashedCookieId: string;  // SHA-256 hash of cookie
  sessionId?: string;
}

// Standard API envelope
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

interface ApiError {
  code: string;        // ErrorCodes enum value
  message: string;
  details?: Record<string, unknown>;
}
```

### Error Codes (`src/shared/types/api.ts:38-53`)

```typescript
const ErrorCodes = {
  VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN,
  CARD_LIMIT_REACHED, REACTION_LIMIT_REACHED,
  BOARD_NOT_FOUND, CARD_NOT_FOUND, COLUMN_NOT_FOUND, USER_NOT_FOUND,
  REACTION_NOT_FOUND,  // Added in Phase 5
  BOARD_CLOSED, CIRCULAR_RELATIONSHIP,
  DATABASE_ERROR, INTERNAL_ERROR,
} as const;
```

### Zod Validation Schemas (`src/shared/validation/schemas.ts`)

| Schema | Purpose | Key Constraints |
|--------|---------|-----------------|
| `objectIdSchema` | MongoDB ObjectId | `ObjectId.isValid()` |
| `hexColorSchema` | Hex color | `/^#[0-9A-Fa-f]{6}$/` |
| `aliasSchema` | User display name | 1-50 chars, `/^[a-zA-Z0-9 _-]+$/` |
| `columnIdSchema` | Column ID | 1-50 chars, `/^[a-zA-Z0-9_-]+$/` |
| `columnSchema` | Column object | `{ id, name, color? }` |
| `createBoardSchema` | Board creation | name (1-200), columns (1-10) |
| `createCardSchema` | Card creation | content (1-5000), card_type enum |
| `linkTypeSchema` | Card linking | `'parent_of' | 'linked_to'` |

**Pattern**: Schemas export inferred DTO types:
```typescript
export type CreateBoardDTO = z.infer<typeof createBoardSchema>;
```

### Middleware Stack (`src/shared/middleware/`)

| Middleware | Purpose |
|------------|---------|
| `authMiddleware` | Extract cookie → SHA-256 hash → attach `hashedCookieId` |
| `errorHandler` | Global error → `ApiResponse` format |
| `notFoundHandler` | 404 responses |
| `requestLogger` | Winston request/response logging |

### Response Helpers (`src/shared/utils/response.ts`)

```typescript
sendSuccess(res, data, statusCode = 200)
sendError(res, code, message, statusCode, details?)
```

### ApiError Class (`src/shared/middleware/`)

```typescript
throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
```

---

## 📋 Board Domain – Core Model & Flow

### Entity Structure

```
┌─────────────────────────────────────────────────────────┐
│ BoardDocument (MongoDB)                                 │
├─────────────────────────────────────────────────────────┤
│ _id: ObjectId                                           │
│ name: string                                            │
│ columns: Column[]  →  { id, name, color? }              │
│ shareable_link: string (12-char UUID, unique index)     │
│ state: 'active' | 'closed'                              │
│ card_limit_per_user: number | null                      │
│ reaction_limit_per_user: number | null                  │
│ created_by_hash: string (creator's cookie hash)         │
│ admins: string[] (array of cookie hashes)               │
│ created_at: Date                                        │
│ closed_at: Date | null                                  │
└─────────────────────────────────────────────────────────┘
         │
         │ boardDocumentToBoard()
         ▼
┌─────────────────────────────────────────────────────────┐
│ Board (API Response)                                    │
├─────────────────────────────────────────────────────────┤
│ id: string (hex)                                        │
│ shareable_link: string (full URL with APP_URL prefix)   │
│ created_at: string (ISO)                                │
│ closed_at: string | null (ISO)                          │
│ ... (same fields, dates as ISO strings)                 │
└─────────────────────────────────────────────────────────┘
```

### Files & Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | ~108 | Interfaces, BoardState, mapper function |
| `board.repository.ts` | ~271 | MongoDB operations, atomic updates |
| `board.service.ts` | ~274 | Business logic, authorization checks |
| `board.controller.ts` | - | HTTP handlers (req/res) |
| `board.routes.ts` | - | Express routes with Zod validation |

### Repository Methods (`board.repository.ts`)

| Method | Atomic Options | Returns |
|--------|----------------|---------|
| `create(input, creatorHash)` | - | `BoardDocument` (with retry for link collision) |
| `findById(id)` | - | `BoardDocument \| null` |
| `findByShareableLink(link)` | - | `BoardDocument \| null` |
| `updateName(id, name, opts)` | `requireActive`, `requireAdmin` | `BoardDocument \| null` |
| `closeBoard(id, opts)` | `requireAdmin` | `BoardDocument \| null` |
| `addAdmin(id, userHash, opts)` | `requireActive`, `requireCreator` | `BoardDocument \| null` |
| `renameColumn(boardId, colId, name, opts)` | `requireActive`, `requireAdmin` | `BoardDocument \| null` |
| `isAdmin(id, userHash)` | - | `boolean` |
| `isCreator(id, userHash)` | - | `boolean` |
| `delete(id)` | - | `boolean` |
| `ensureIndexes()` | - | creates: `shareable_link` (unique), `state`, `created_at` |

**Key Pattern**: Atomic operations with filter options
```typescript
// Repository uses MongoDB filter composition
const filter: Record<string, unknown> = { _id: new ObjectId(id) };
if (options.requireActive) filter.state = 'active';
if (options.requireAdmin) filter.admins = userHash;

const result = await this.collection.findOneAndUpdate(filter, { $set: {...} });
```

### Service Methods (`board.service.ts`)

| Method | Auth Check | Errors Thrown |
|--------|------------|---------------|
| `createBoard(input, creatorHash)` | None | - |
| `getBoard(id)` | None | `BOARD_NOT_FOUND` |
| `getBoardByLink(linkCode)` | None | `BOARD_NOT_FOUND` |
| `updateBoardName(id, name, userHash)` | Admin | `BOARD_NOT_FOUND`, `BOARD_CLOSED`, `FORBIDDEN` |
| `closeBoard(id, userHash)` | Admin | `BOARD_NOT_FOUND`, `FORBIDDEN` |
| `addAdmin(boardId, userHash, requesterHash)` | Creator | `BOARD_NOT_FOUND`, `BOARD_CLOSED`, `FORBIDDEN` |
| `renameColumn(boardId, colId, name, userHash)` | Admin | `BOARD_NOT_FOUND`, `BOARD_CLOSED`, `COLUMN_NOT_FOUND`, `FORBIDDEN` |
| `deleteBoard(id, userHash, isAdminSecret)` | Creator (bypass with secret) | `FORBIDDEN`, `BOARD_NOT_FOUND` |

**Key Pattern**: Pre-check + atomic operation
```typescript
// 1. Check board exists and state
const existingBoard = await this.boardRepository.findById(id);
if (!existingBoard) throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, ...);
if (existingBoard.state === 'closed') throw new ApiError(ErrorCodes.BOARD_CLOSED, ...);

// 2. Atomic update with auth check
const doc = await this.boardRepository.updateName(id, name, { requireActive: true, requireAdmin: userHash });
if (!doc) throw new ApiError(ErrorCodes.FORBIDDEN, ...);
```

### Shareable Link Flow

```
Repository.create() → generateShareableLink() → 12-char UUID
                                               ↓
Service.createBoard() → formatShareableLink() → `${APP_URL}/join/${linkCode}`
```

---

## 📋 User Session Domain – Quick Reference

### Entity Structure (`src/domains/user/types.ts`)

```typescript
interface UserSessionDocument {
  _id: ObjectId;
  board_id: ObjectId;
  cookie_hash: string;
  alias: string;
  last_active_at: Date;
  created_at: Date;
}

interface ActiveUser {
  cookie_hash: string;
  alias: string;
  is_admin: boolean;  // computed from board.admins
  last_active_at: string;
  created_at: string;
}
```

### Repository Key Methods (`user-session.repository.ts`)

| Method | Purpose |
|--------|---------|
| `upsert(boardId, cookieHash, alias)` | Create or update session (join board) |
| `findActiveUsers(boardId)` | Users with `last_active_at` within 2 minutes |
| `updateHeartbeat(boardId, cookieHash)` | Refresh `last_active_at` |
| `updateAlias(boardId, cookieHash, newAlias)` | Change display name |
| `deleteByBoard(boardId)` | Cascade delete for board deletion |

**Indexes**: `(board_id, cookie_hash)` unique, `(board_id, last_active_at)` desc

**Activity Window**: `const ACTIVITY_WINDOW_MS = 2 * 60 * 1000;`

---

## 🃏 Card Domain – Core Model & Flow

### Entity Structure (`src/domains/card/types.ts`)

```
┌─────────────────────────────────────────────────────────┐
│ CardDocument (MongoDB)                                  │
├─────────────────────────────────────────────────────────┤
│ _id: ObjectId                                           │
│ board_id: ObjectId                                      │
│ column_id: string                                       │
│ content: string (max 5000 chars)                        │
│ card_type: 'feedback' | 'action'                        │
│ is_anonymous: boolean                                   │
│ created_by_hash: string                                 │
│ created_by_alias: string | null (null if anonymous)     │
│ created_at: Date                                        │
│ updated_at: Date | null                                 │
│ direct_reaction_count: number                           │
│ aggregated_reaction_count: number (includes children)   │
│ parent_card_id: ObjectId | null                         │
│ linked_feedback_ids: ObjectId[] (for action cards)      │
└─────────────────────────────────────────────────────────┘
```

### Card Types & Relationships

| Type | Limit Applies | Can Have Parent | Can Link Feedback |
|------|---------------|-----------------|-------------------|
| `feedback` | Yes (`card_limit_per_user`) | Yes (another feedback) | No |
| `action` | No | No | Yes (via `linked_feedback_ids`) |

**Relationship Types** (`link_type`):
- `parent_of`: Feedback → Feedback (parent-child, updates `aggregated_reaction_count`)
- `linked_to`: Action → Feedback (reference link via `linked_feedback_ids`)

### Repository Methods (`card.repository.ts`)

| Method | Purpose |
|--------|---------|
| `create(boardId, input, creatorHash, alias)` | Create new card |
| `findById(id)` | Get single card |
| `findByBoard(boardId, opts)` | Get cards with optional filters |
| `findByBoardWithRelationships(boardId, opts)` | Get cards with `$lookup` for children/linked |
| `countByColumn(boardId)` | Summary stats by column |
| `countUserCards(boardId, userHash, type)` | For limit enforcement |
| `updateContent(id, content, opts)` | Update with `requireCreator` option |
| `moveToColumn(id, columnId, opts)` | Move with `requireCreator` option |
| `setParentCard(childId, parentId)` | Set/clear parent relationship |
| `addLinkedFeedback(actionId, feedbackId)` | Link action → feedback |
| `removeLinkedFeedback(actionId, feedbackId)` | Unlink |
| `incrementDirectReactionCount(id, delta)` | +/- on reaction add/remove |
| `incrementAggregatedReactionCount(id, delta)` | Update parent on child reaction |
| `orphanChildren(parentId)` | Set `parent_card_id = null` for all children |
| `findChildren(parentId)` | Get child cards |
| `isAncestor(ancestorId, cardId)` | Circular reference check |
| `deleteByBoard(boardId)` | Cascade delete |
| `getCardIdsByBoard(boardId)` | Get IDs for reaction cascade |

**Indexes**: `(board_id, created_at)`, `(board_id, created_by_hash, card_type)`, `parent_card_id`, `linked_feedback_ids`

### Service Methods (`card.service.ts`)

| Method | Auth Check | Key Logic |
|--------|------------|-----------|
| `createCard(boardId, input, userHash)` | None | Limit check for feedback cards |
| `getCard(id)` | None | - |
| `getCards(boardId, opts)` | None | Parallel queries for cards + stats |
| `updateCard(id, input, userHash)` | Creator | Board active check |
| `moveCard(id, input, userHash)` | Creator | Column existence check |
| `deleteCard(id, userHash)` | Creator | Orphans children, updates parent aggregated count |
| `linkCards(sourceId, input, userHash)` | Creator or Admin | Circular check for `parent_of` |
| `unlinkCards(sourceId, input, userHash)` | Creator or Admin | Validates relationship exists |
| `getCardQuota(boardId, userHash)` | None | Returns `CardQuota` |

**Key Patterns**:
```typescript
// Aggregation with $lookup for embedded relationships
const pipeline = [
  { $match: { board_id, parent_card_id: null } },  // Top-level only
  { $lookup: { from: 'cards', localField: '_id', foreignField: 'parent_card_id', as: 'children_docs' } },
  { $lookup: { from: 'cards', localField: 'linked_feedback_ids', foreignField: '_id', as: 'linked_feedback_docs' } },
];

// Circular relationship detection (traverses parent chain)
async isAncestor(potentialAncestorId, cardId): Promise<boolean>
```

---

## 👍 Reaction Domain – Core Model & Flow

### Entity Structure (`src/domains/reaction/types.ts`)

```typescript
interface ReactionDocument {
  _id: ObjectId;
  card_id: ObjectId;
  user_cookie_hash: string;
  user_alias: string | null;
  reaction_type: 'thumbs_up';  // Extensible for future types
  created_at: Date;
}

interface ReactionQuota {
  current_count: number;
  limit: number | null;
  can_react: boolean;
  limit_enabled: boolean;
}
```

**Constraint**: One reaction per user per card (upsert pattern)

### Repository Methods (`reaction.repository.ts`)

| Method | Purpose |
|--------|---------|
| `upsert(cardId, userHash, alias, type)` | Add/update reaction, returns `{ document, isNew }` |
| `findByCardAndUser(cardId, userHash)` | Get user's reaction on a card |
| `findByCard(cardId)` | All reactions for a card |
| `delete(cardId, userHash)` | Remove reaction |
| `deleteByCard(cardId)` | Cascade delete for card |
| `deleteByCards(cardIds)` | Bulk cascade for board delete |
| `countUserReactionsOnBoard(boardId, userHash)` | Uses `$lookup` to cards |
| `countByCard(cardId)` | Count for a specific card |
| `hasUserReacted(cardId, userHash)` | Boolean check |

**Indexes**: `(card_id, user_cookie_hash)` unique, `user_cookie_hash`, `card_id`

### Service Methods (`reaction.service.ts`)

| Method | Auth Check | Key Logic |
|--------|------------|-----------|
| `addReaction(cardId, input, userHash)` | None | Limit check, updates card counts |
| `removeReaction(cardId, userHash)` | Own reaction | Updates card counts |
| `getReactionQuota(boardId, userHash)` | None | Returns `ReactionQuota` |
| `hasUserReacted(cardId, userHash)` | None | - |
| `getUserReaction(cardId, userHash)` | None | - |
| `deleteReactionsForCard(cardId)` | Internal | Cascade |
| `deleteReactionsForCards(cardIds)` | Internal | Bulk cascade |

**Reaction Count Flow**:
```
addReaction() → isNew? → incrementDirectReactionCount(+1)
                      → if card has parent → incrementAggregatedReactionCount(parent, +1)

removeReaction() → incrementDirectReactionCount(-1)
               → if card has parent → incrementAggregatedReactionCount(parent, -1)
```

### Service Dependencies

```typescript
// ReactionService constructor (4 dependencies)
constructor(
  reactionRepository: ReactionRepository,
  cardRepository: CardRepository,      // For card lookup + count updates
  boardRepository: BoardRepository,    // For board state + limit check
  userSessionRepository: UserSessionRepository  // For user alias
)
```

---

## 🔗 Route Wiring (`src/gateway/app.ts`)

```typescript
// Domain route registration order (matters for Express matching)
app.use('/v1/boards', createBoardRoutes(boardController));
app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController));  // mergeParams
app.use('/v1/boards/:boardId', createBoardCardRoutes(cardController));
app.use('/v1/cards', createCardRoutes(cardController));
app.use('/v1/cards/:id/reactions', createCardReactionRoutes(reactionController));
app.use('/v1/boards/:id/reactions', createBoardReactionRoutes(reactionController));
```

---

## 📡 Real-time Events (Socket.io) - Phase 6

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                │
│   BoardService / CardService / ReactionService / UserService    │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EventBroadcaster (IEventBroadcaster)               │
│   - Typed methods: cardCreated(), reactionAdded(), etc.         │
│   - Abstracts Socket.io from services                           │
│   - NoOpEventBroadcaster for testing                            │
└────────────────────────────┬────────────────────────────────────┘
                             │ delegates to
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SocketGateway                                │
│   - Singleton wrapping Socket.io Server                         │
│   - Room management: board:{boardId}                            │
│   - Cookie auth via handshake                                   │
│   - broadcast(boardId, eventType, payload)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ emits to room
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Connected Clients (Socket.io)                    │
│   - Join room on 'join-board' event                             │
│   - Receive typed events: card:created, reaction:added, etc.    │
└─────────────────────────────────────────────────────────────────┘
```

### Files (`src/gateway/socket/`)

| File | Purpose |
|------|---------|
| `socket-types.ts` | All event type definitions (~215 lines) |
| `SocketGateway.ts` | Socket.io server wrapper, room management (~304 lines) |
| `EventBroadcaster.ts` | Service abstraction layer (~161 lines) |
| `index.ts` | Exports |

### Event Types

**Board Events:**
```typescript
type BoardEventType = 'board:renamed' | 'board:closed' | 'board:deleted';
```

**Card Events:**
```typescript
type CardEventType = 'card:created' | 'card:updated' | 'card:deleted'
                   | 'card:moved' | 'card:linked' | 'card:unlinked';
```

**Reaction Events:**
```typescript
type ReactionEventType = 'reaction:added' | 'reaction:removed';
```

**User Events:**
```typescript
type UserEventType = 'user:joined' | 'user:left' | 'user:alias_changed';
```

### Client-to-Server Events

```typescript
interface ClientToServerEvents {
  'join-board': (boardId: string) => void;   // Join board room
  'leave-board': (boardId: string) => void;  // Leave board room
  'heartbeat': () => void;                   // Keep-alive
}
```

### Key Payloads

```typescript
// Card created - includes full card data
interface CardCreatedPayload {
  cardId: string;
  boardId: string;
  columnId: string;
  content: string;
  cardType: 'feedback' | 'action';
  isAnonymous: boolean;
  createdByAlias: string | null;
  createdAt: string;
  directReactionCount: number;
  aggregatedReactionCount: number;
  parentCardId: string | null;
  linkedFeedbackIds: string[];
}

// Reaction added - includes updated counts
interface ReactionAddedPayload {
  cardId: string;
  boardId: string;
  userAlias: string | null;
  reactionType: 'thumbs_up';
  directCount: number;
  aggregatedCount: number;
}
```

### SocketGateway Key Methods

| Method | Purpose |
|--------|---------|
| `initialize(httpServer)` | Attach Socket.io to HTTP server |
| `broadcast(boardId, eventType, payload)` | Emit to all in room |
| `broadcastExcept(boardId, eventType, payload, excludeSocketId)` | Emit excluding sender |
| `getRoomSize(boardId)` | Count clients in room |
| `disconnectRoom(boardId)` | Kick all clients (board deleted) |
| `close()` | Graceful shutdown |

### EventBroadcaster Methods

```typescript
interface IEventBroadcaster {
  // Board events
  boardRenamed(boardId: string, name: string): void;
  boardClosed(boardId: string, closedAt: string): void;
  boardDeleted(boardId: string): void;

  // Card events
  cardCreated(payload: CardCreatedPayload): void;
  cardUpdated(payload: CardUpdatedPayload): void;
  cardDeleted(boardId: string, cardId: string): void;
  cardMoved(payload: CardMovedPayload): void;
  cardLinked(payload: CardLinkedPayload): void;
  cardUnlinked(payload: CardUnlinkedPayload): void;

  // Reaction events
  reactionAdded(payload: ReactionAddedPayload): void;
  reactionRemoved(payload: ReactionRemovedPayload): void;

  // User events
  userJoined(payload: UserJoinedPayload): void;
  userLeft(payload: UserLeftPayload): void;
  userAliasChanged(payload: UserAliasChangedPayload): void;
}
```

### Room Management

```typescript
// Room naming convention
getRoomName(boardId: string): string {
  return `board:${boardId}`;
}

// Client joins room
socket.on('join-board', (boardId) => {
  socket.join(`board:${boardId}`);
  socket.data.currentBoardId = boardId;
});

// Broadcasting to room
io.to(`board:${boardId}`).emit('card:created', payload);
```

### Authentication

Socket connections authenticate via cookie:
```typescript
// In SocketGateway.authenticateSocket()
const cookieHeader = socket.handshake.headers.cookie;
const cookieId = parseCookie(cookieHeader, 'retro_session_id');
socket.data.cookieHash = sha256(cookieId);
```

### Configuration

```typescript
const HEARTBEAT_INTERVAL_MS = 30000;  // 30 seconds
const HEARTBEAT_TIMEOUT_MS = 35000;   // 35 seconds

// CORS config
cors: {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
}
```

### Testing with NoOpEventBroadcaster

Services accept `IEventBroadcaster` for testability:
```typescript
// In tests - use no-op to avoid Socket.io dependency
const broadcaster = new NoOpEventBroadcaster();
const service = new CardService(cardRepo, boardRepo, userRepo, broadcaster);
```

---

## ⚙️ Testing Infrastructure & Patterns

### Vitest Configuration (`vitest.config.ts`)

```typescript
{
  test: {
    globals: true,           // describe/it/expect without imports
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,  // Sequential for mongodb-memory-server
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000,
    hookTimeout: 120000,     // First-run binary download
    coverage: {
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    }
  },
  resolve: { alias: { '@': './src' } }
}
```

### Test Database Utilities (`tests/utils/test-db.ts`)

```typescript
// Lifecycle functions
startTestDb(): Promise<Db>   // beforeAll - creates MongoMemoryServer
stopTestDb(): Promise<void>  // afterAll - cleanup
clearTestDb(): Promise<void> // beforeEach - truncate all collections
getTestDb(): Db              // Get current db instance
getTestClient(): MongoClient // For advanced operations
```

**Usage Pattern**:
```typescript
describe('MyRepository', () => {
  beforeAll(async () => { await startTestDb(); });
  afterAll(async () => { await stopTestDb(); });
  beforeEach(async () => { await clearTestDb(); });

  it('does something', async () => {
    const db = getTestDb();
    const repo = new MyRepository(db);
    // ...
  });
});
```

### Test App Factory (`tests/utils/test-app.ts`)

```typescript
createTestApp(): Express
// - express.json()
// - cookieParser('test-secret')
// - authMiddleware on /v1/*
// - NO routes (add in test)
// - NO error handlers (add with addErrorHandlers)

addErrorHandlers(app): void
// - notFoundHandler
// - errorHandler
```

**Integration Test Pattern**:
```typescript
import request from 'supertest';
import { createTestApp, addErrorHandlers } from '../utils/test-app';
import { startTestDb, stopTestDb, clearTestDb, getTestDb } from '../utils/test-db';

describe('Board API', () => {
  let app: Express;

  beforeAll(async () => {
    const db = await startTestDb();
    app = createTestApp();

    // Wire up routes
    const repo = new BoardRepository(db);
    const service = new BoardService(repo);
    const controller = new BoardController(service);
    app.use('/v1/boards', createBoardRoutes(controller));

    addErrorHandlers(app);
  });

  afterAll(() => stopTestDb());
  beforeEach(() => clearTestDb());

  it('creates a board', async () => {
    const res = await request(app)
      .post('/v1/boards')
      .send({ name: 'Test', columns: [{ id: 'c1', name: 'Col' }] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test');
  });
});
```

### Cookie Handling in Tests

Auth middleware auto-creates cookies. To simulate specific users:
```typescript
// First request sets cookie
const res1 = await request(app).post('/v1/boards').send({...});
const cookies = res1.headers['set-cookie'];

// Use same cookie for subsequent requests
const res2 = await request(app)
  .get(`/v1/boards/${boardId}`)
  .set('Cookie', cookies);
```

---

## 🛠️ Observed Architectural Patterns & Conventions

### 1. Domain Module Structure

```
src/domains/{domain}/
├── types.ts              # Interfaces, enums, mapper functions
├── {domain}.repository.ts # MongoDB operations only
├── {domain}.service.ts    # Business logic, throws ApiError
├── {domain}.controller.ts # req/res handling, calls service
├── {domain}.routes.ts     # Express Router with Zod validation middleware
└── index.ts              # Re-exports all public APIs
```

### 2. Repository Pattern

- Constructor takes `Db` (MongoDB database instance)
- Methods return `Document | null` (not found) or throw on actual errors
- ObjectId validation: `if (!ObjectId.isValid(id)) return null;`
- Atomic operations with filter composition for auth checks
- `ensureIndexes()` method for startup

### 3. Service Pattern

- Constructor takes repository (dependency injection)
- Throws `ApiError` for business errors
- Pattern: existence check → state check → atomic operation → auth check
- Returns API types (not Document types)
- Mapper functions transform Document → API type

### 4. Document → API Type Mapping

```typescript
// Pattern in types.ts
export function boardDocumentToBoard(doc: BoardDocument): Board {
  return {
    id: doc._id.toHexString(),
    created_at: doc.created_at.toISOString(),
    // ... transform all fields
  };
}
```

### 5. Zod Validation

- Schemas defined in `shared/validation/schemas.ts`
- Applied via validation middleware in routes
- DTOs inferred: `type CreateBoardDTO = z.infer<typeof createBoardSchema>`

### 6. Error Handling

```typescript
// Throw in service
throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);

// Caught by errorHandler middleware → ApiResponse format
```

### 7. Auth Flow

```
Request → authMiddleware → extract cookie → SHA-256 hash → req.hashedCookieId
                       ↓ (no cookie)
                       create new cookie, set header, hash it
```

### 8. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `board.repository.ts` |
| Classes | PascalCase | `BoardRepository` |
| Interfaces | PascalCase | `BoardDocument` |
| Methods | camelCase | `findById` |
| MongoDB fields | snake_case | `created_at`, `shareable_link` |
| API fields | snake_case | `card_limit_per_user` |
| Error codes | SCREAMING_SNAKE | `BOARD_NOT_FOUND` |

---

## 📌 Quick Reference – Important Files & What Lives Where

### Core Shared Files

| File | Contains |
|------|----------|
| `src/shared/types/api.ts` | `AuthenticatedRequest`, `ApiResponse`, `ErrorCodes` |
| `src/shared/validation/schemas.ts` | All Zod schemas, inferred DTO types |
| `src/shared/middleware/auth.ts` | Cookie extraction, SHA-256 hashing |
| `src/shared/middleware/error-handler.ts` | Global error → JSON response |
| `src/shared/middleware/validation.ts` | Zod validation middleware factory |
| `src/shared/config/env.ts` | Environment variables (Zod-validated) |
| `src/shared/logger/logger.ts` | Winston configuration |
| `src/shared/utils/hash.ts` | `hashCookieId()` - SHA-256 |
| `src/shared/utils/response.ts` | `sendSuccess()`, `sendError()` |

### Gateway

| File | Contains |
|------|----------|
| `src/gateway/app.ts` | Express app factory, middleware stack, route wiring |
| `src/gateway/routes/health.ts` | `/health` endpoints |

**Socket.io** (`src/gateway/socket/`):
| File | Contains |
|------|----------|
| `socket-types.ts` | All event types & payloads (~215 lines) |
| `SocketGateway.ts` | Socket.io wrapper, room management (~304 lines) |
| `EventBroadcaster.ts` | `IEventBroadcaster` interface + implementations |
| `index.ts` | Exports: `socketGateway`, `eventBroadcaster`, types |

### Domain Files

**Board** (`src/domains/board/`):
| File | Contains |
|------|----------|
| `types.ts` | `Board`, `BoardDocument`, `Column`, `BoardState`, mapper |
| `board.repository.ts` | `BoardRepository` class |
| `board.service.ts` | `BoardService` class |
| `board.controller.ts` | `BoardController` class |
| `board.routes.ts` | Express router factory |

**User Session** (`src/domains/user/`):
| File | Contains |
|------|----------|
| `types.ts` | `UserSession`, `UserSessionDocument`, `ActiveUser`, mapper |
| `user-session.repository.ts` | `UserSessionRepository` class |
| `user-session.service.ts` | `UserSessionService` class |
| `user-session.controller.ts` | `UserSessionController` class |
| `user-session.routes.ts` | Express router factory |

**Card** (`src/domains/card/`):
| File | Contains |
|------|----------|
| `types.ts` | `Card`, `CardDocument`, `CardWithRelationships`, `CardQuota`, mappers |
| `card.repository.ts` | `CardRepository` class (~540 lines) |
| `card.service.ts` | `CardService` class (~427 lines) |
| `card.controller.ts` | `CardController` class |
| `card.routes.ts` | `createBoardCardRoutes`, `createCardRoutes` |

**Reaction** (`src/domains/reaction/`):
| File | Contains |
|------|----------|
| `types.ts` | `Reaction`, `ReactionDocument`, `ReactionQuota`, mapper |
| `reaction.repository.ts` | `ReactionRepository` class (~240 lines) |
| `reaction.service.ts` | `ReactionService` class (~189 lines) |
| `reaction.controller.ts` | `ReactionController` class |
| `reaction.routes.ts` | `createCardReactionRoutes`, `createBoardReactionRoutes` |

### Test Files

| File | Contains |
|------|----------|
| `tests/utils/test-db.ts` | MongoDB memory server lifecycle |
| `tests/utils/test-app.ts` | Express app factory for tests |
| `tests/unit/domains/board/*.test.ts` | Unit tests (mocked deps) |
| `tests/integration/board.test.ts` | API integration tests |

---

## 🚩 Open Questions / Inconsistencies / Notes

### 1. Cascade Delete Implementation Status
- `CardService.deleteCardsForBoard()` and `ReactionService.deleteReactionsForCards()` exist
- `BoardService.deleteBoard()` still has TODO comment - needs wiring to call these
- User sessions cascade via `UserSessionRepository.deleteByBoard()`

### 2. `is_admin` Computed in Multiple Places
- `UserSessionService` computes from `board.admins`
- Not stored in `user_sessions` collection
- Requires board lookup on every session query

### 3. ActiveUser Defined in Two Places
- `src/domains/board/types.ts:60-65`
- `src/domains/user/types.ts:30-36`
- Same shape but duplicated (potential sync issue)

### 4. Cookie Secret Hardcoded in Tests
- `test-app.ts`: `cookieParser('test-secret')`
- May not match production secret handling

### 5. Real-time Events ✅ Implemented (Phase 6)
- Socket.io gateway with room management
- `EventBroadcaster` abstraction for service→gateway communication
- `NoOpEventBroadcaster` for testing without Socket.io
- All services emit events: board, card, reaction, user

### 6. Reaction Count Aggregation
- `direct_reaction_count`: reactions directly on the card
- `aggregated_reaction_count`: includes all descendant reactions
- Updated on: link/unlink parent, add/remove reaction
- Potential race condition if many concurrent reactions

### 7. ReactionService Has 4 Dependencies
- Highest dependency count in the codebase
- Needs: `reactionRepository`, `cardRepository`, `boardRepository`, `userSessionRepository`
- Consider: facade pattern or event-driven updates

---

*End of context file. For full details, see linked source files.*
