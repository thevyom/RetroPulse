# Backend Core Context - RetroPulse

> Single-file reference for understanding the backend structure, patterns, and testing setup.
> Focus: Board & User domains, shared utilities, testing infrastructure.

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
| Real-time | Socket.io | 4.7 (planned) |
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

### Error Codes (`src/shared/types/api.ts:38-52`)

```typescript
const ErrorCodes = {
  VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN,
  CARD_LIMIT_REACHED, REACTION_LIMIT_REACHED,
  BOARD_NOT_FOUND, CARD_NOT_FOUND, COLUMN_NOT_FOUND, USER_NOT_FOUND,
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

### Domain Files (Board example)

| File | Contains |
|------|----------|
| `src/domains/board/types.ts` | `Board`, `BoardDocument`, `Column`, `BoardState`, mapper |
| `src/domains/board/board.repository.ts` | `BoardRepository` class |
| `src/domains/board/board.service.ts` | `BoardService` class |
| `src/domains/board/board.controller.ts` | `BoardController` class |
| `src/domains/board/board.routes.ts` | Express router factory |
| `src/domains/board/index.ts` | Public exports |

### Test Files

| File | Contains |
|------|----------|
| `tests/utils/test-db.ts` | MongoDB memory server lifecycle |
| `tests/utils/test-app.ts` | Express app factory for tests |
| `tests/unit/domains/board/*.test.ts` | Unit tests (mocked deps) |
| `tests/integration/board.test.ts` | API integration tests |

---

## 🚩 Open Questions / Inconsistencies / Smells

### 1. Cascade Delete Not Implemented
- `BoardService.deleteBoard()` has TODO comment about cascade delete
- Cards, reactions, user_sessions deletion not wired yet
- Current: only deletes board document

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

### 5. Real-time Events Not Wired
- Socket.io in dependencies but not implemented
- Service methods don't emit events yet
- Comments reference future WebSocket integration

### 6. Column Existence Check Location
- Column existence checked in service (`renameColumn`)
- Other checks (admin, state) delegated to repository atomics
- Inconsistent pattern

### 7. `getBoardWithUsers` Returns Empty Array
- Method exists but `active_users` always `[]`
- Comment says "will be populated by UserSessionService"
- Integration happens at controller level (not shown in service)

---

*End of context file. For full details, see linked source files.*
