# Phase 2: Board Domain Implementation

**Status**: ✅ COMPLETED
**Completed Date**: 2025-12-27
**Tasks**: 5/5 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the core Board domain including CRUD operations, column management, admin designation, and board lifecycle (active → closed → deleted).

---

## 📋 Task Breakdown

### 2.0 Implement Board domain models and DTOs ✅

- [x] Created `src/domains/board/types.ts` with Board, Column, CreateBoardDTO types
- [x] Defined TypeScript interfaces matching MongoDB schema
- [x] Created `boardDocumentToBoard()` mapping utility

**Key Types:**
```typescript
type BoardState = 'active' | 'closed';

interface BoardDocument {
  _id: ObjectId;
  name: string;
  columns: Column[];
  shareable_link: string;
  state: BoardState;
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
  created_by_hash: string;
  admins: string[];
  created_at: Date;
  closed_at: Date | null;
}
```

---

### 2.1 Implement BoardRepository with MongoDB ✅

- [x] Created `src/domains/board/board.repository.ts`
- [x] Implemented `create()` with unique shareable_link (12-char UUID)
- [x] Implemented `findById()`, `findByShareableLink()`
- [x] Implemented `updateName()`, `closeBoard()` with atomic options
- [x] Implemented `addAdmin()`, `isAdmin()`, `isCreator()`
- [x] Implemented `renameColumn()`, `delete()`
- [x] Added `ensureIndexes()` method for MongoDB indexes
- [x] Written unit tests with mongodb-memory-server (15 test cases)

**Repository Methods:**

| Method | Atomic Options | Returns |
|--------|----------------|---------|
| `create(input, creatorHash)` | - | BoardDocument |
| `findById(id)` | - | BoardDocument \| null |
| `findByShareableLink(link)` | - | BoardDocument \| null |
| `updateName(id, name, opts)` | requireActive, requireAdmin | BoardDocument \| null |
| `closeBoard(id, opts)` | requireAdmin | BoardDocument \| null |
| `addAdmin(id, userHash, opts)` | requireActive, requireCreator | BoardDocument \| null |
| `renameColumn(boardId, colId, name, opts)` | requireActive, requireAdmin | BoardDocument \| null |
| `isAdmin(id, userHash)` | - | boolean |
| `isCreator(id, userHash)` | - | boolean |
| `delete(id)` | - | boolean |

**Indexes Created:**
- `shareable_link` (unique)
- `state`
- `created_at` (descending)

---

### 2.2 Implement BoardService with business logic ✅

- [x] Created `src/domains/board/board.service.ts`
- [x] Implemented board creation (creator as first admin, full shareable URL)
- [x] Implemented board closure (state='closed', closed_at timestamp)
- [x] Implemented admin management with authorization checks
- [x] Added `ensureBoardActive()`, `ensureAdmin()`, `ensureCreator()` guards
- [x] Written unit tests with mocked repository (12 test cases)

**Service Methods:**

| Method | Auth Check | Errors Thrown |
|--------|------------|---------------|
| `createBoard(input, creatorHash)` | None | - |
| `getBoard(id)` | None | BOARD_NOT_FOUND |
| `getBoardByLink(linkCode)` | None | BOARD_NOT_FOUND |
| `updateBoardName(id, name, userHash)` | Admin | BOARD_NOT_FOUND, BOARD_CLOSED, FORBIDDEN |
| `closeBoard(id, userHash)` | Admin | BOARD_NOT_FOUND, FORBIDDEN |
| `addAdmin(boardId, userHash, requesterHash)` | Creator | BOARD_NOT_FOUND, BOARD_CLOSED, FORBIDDEN |
| `renameColumn(boardId, colId, name, userHash)` | Admin | BOARD_NOT_FOUND, BOARD_CLOSED, COLUMN_NOT_FOUND, FORBIDDEN |
| `deleteBoard(id, userHash, isAdminSecret)` | Creator (or secret) | FORBIDDEN, BOARD_NOT_FOUND |

---

### 2.3 Implement Board API endpoints ✅

- [x] Created `src/domains/board/board.controller.ts`
- [x] Created `src/domains/board/board.routes.ts` with Zod validation
- [x] Implemented all endpoints
- [x] Written integration tests with Supertest (12 test cases)

**API Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards` | Cookie | Create board (creator becomes admin) |
| GET | `/v1/boards/:id` | Cookie | Get board details |
| GET | `/v1/boards/by-link/:linkCode` | Cookie | Get board by shareable link |
| PATCH | `/v1/boards/:id/name` | Admin | Rename board |
| PATCH | `/v1/boards/:id/close` | Admin | Close board (read-only mode) |
| POST | `/v1/boards/:id/admins` | Creator | Designate co-admin |
| PATCH | `/v1/boards/:id/columns/:columnId` | Admin | Rename column |
| DELETE | `/v1/boards/:id` | Creator/Secret | Delete board |

---

### 2.4 Add board deletion with cascade logic ✅

- [x] Implemented `deleteBoard()` in BoardService
- [x] Added admin secret key bypass in controller
- [ ] ⏳ Cascade delete for cards/reactions/sessions deferred to Phase 3-5

**Note:** Cascade delete methods exist in Card/Reaction services but are not yet wired into BoardService.deleteBoard().

---

### 2.5 Implement board column management ✅

- [x] Implemented `renameColumn()` in BoardRepository and BoardService
- [x] Implemented `PATCH /boards/:id/columns/:columnId` endpoint
- [x] Column validation (returns 400 if column not found)
- [x] Written unit and integration tests

---

## 📁 Files Created

```
src/domains/board/
├── types.ts              # Board, Column, BoardDocument interfaces
├── board.repository.ts   # MongoDB operations
├── board.service.ts      # Business logic with authorization
├── board.controller.ts   # Express request handlers
├── board.routes.ts       # Route definitions with Zod validation
└── index.ts              # Module exports

tests/
├── unit/domains/board/
│   ├── board.repository.test.ts  # 15 test cases
│   └── board.service.test.ts     # 12 test cases
└── integration/
    └── board.test.ts             # 12 test cases
```

---

## 🧪 Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| BoardRepository (unit) | 15 | ✅ Pass |
| BoardService (unit) | 12 | ✅ Pass |
| Board API (integration) | 12 | ✅ Pass |
| **Total** | **39** | ✅ |

---

## 📝 Notes & Decisions

1. **Shareable Link**: 12-character UUID substring for shorter URLs, with retry on collision.

2. **Atomic Operations**: Repository methods use MongoDB filter composition for auth checks in a single atomic operation.

3. **Admin Hierarchy**: Creator (first admin) can designate co-admins. Only creator can delete board.

4. **Closed Board**: When closed, all write operations return 409 BOARD_CLOSED. Read operations still allowed.

---

## ⚠️ Known Issues / Tech Debt

1. **Cascade Delete Not Wired**: `CardService.deleteCardsForBoard()` and `ReactionService.deleteReactionsForCards()` exist but are not called from `BoardService.deleteBoard()`.

2. **Column Addition/Removal**: Not implemented. Only column rename is supported.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 1](./BACKEND_PHASE_01_INFRASTRUCTURE.md) | [Next: Phase 3 →](./BACKEND_PHASE_03_USER_SESSION.md)
