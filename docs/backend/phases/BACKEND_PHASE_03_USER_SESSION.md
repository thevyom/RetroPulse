# Phase 3: User Session Management

**Status**: ✅ COMPLETED
**Completed Date**: 2025-12-27
**Tasks**: 4/4 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement user session management for board participation, including joining boards, tracking active users, heartbeat mechanism, and alias updates.

---

## 📋 Task Breakdown

### 3.0 Implement UserSession domain models ✅

- [x] Created `src/domains/user/types.ts` with UserSession, ActiveUser, JoinBoardInput types
- [x] Created `userSessionDocumentToUserSession()` mapping utility
- [x] Created `userSessionDocumentToActiveUser()` mapping utility

**Key Types:**
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

---

### 3.1 Implement UserSessionRepository with MongoDB ✅

- [x] Created `src/domains/user/user-session.repository.ts`
- [x] Implemented `upsert()` method (update if exists, create if new)
- [x] Implemented `findActiveUsers()` with 2-minute activity window
- [x] Implemented `findByBoardAndUser()`, `updateHeartbeat()`, `updateAlias()`
- [x] Implemented `deleteByBoard()`, `countByBoard()` for cascade operations
- [x] Added `ensureIndexes()` method for MongoDB indexes
- [x] Written unit tests with mongodb-memory-server (34 test cases)

**Repository Methods:**

| Method | Purpose |
|--------|---------|
| `upsert(boardId, cookieHash, alias)` | Create or update session (join board) |
| `findByBoardAndUser(boardId, cookieHash)` | Get specific user session |
| `findActiveUsers(boardId)` | Users with `last_active_at` within 2 minutes |
| `updateHeartbeat(boardId, cookieHash)` | Refresh `last_active_at` |
| `updateAlias(boardId, cookieHash, newAlias)` | Change display name |
| `deleteByBoard(boardId)` | Cascade delete for board deletion |
| `countByBoard(boardId)` | Count sessions for a board |

**Indexes Created:**
- `(board_id, cookie_hash)` - unique
- `(board_id, last_active_at)` - descending

**Activity Window:**
```typescript
const ACTIVITY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
```

---

### 3.2 Implement UserSessionService with join logic ✅

- [x] Created `src/domains/user/user-session.service.ts`
- [x] Implemented `joinBoard()` method (upsert session, check is_admin)
- [x] Implemented `getActiveUsers()` with is_admin flag for each user
- [x] Implemented `updateHeartbeat()` and `updateAlias()` methods
- [x] Implemented `getUserSession()` and `deleteSessionsForBoard()` methods
- [x] Written unit tests with mocked repository (13 test cases)

**Service Methods:**

| Method | Description |
|--------|-------------|
| `joinBoard(boardId, alias, userHash)` | Join board, returns session with is_admin |
| `getActiveUsers(boardId)` | Get active users with is_admin computed |
| `updateHeartbeat(boardId, userHash)` | Refresh activity timestamp |
| `updateAlias(boardId, userHash, newAlias)` | Change user's display name |
| `getUserSession(boardId, userHash)` | Get user's session if exists |
| `deleteSessionsForBoard(boardId)` | Cascade delete for board |

**Key Logic:**
- `is_admin` is computed by checking if `cookie_hash` exists in `board.admins`
- Active users are those with `last_active_at` within 2-minute window
- Joining closed board is allowed (users can view read-only boards)

---

### 3.3 Implement User Session API endpoints ✅

- [x] Created `src/domains/user/user-session.controller.ts`
- [x] Created `src/domains/user/user-session.routes.ts` with Zod validation
- [x] Implemented all endpoints
- [x] Written integration tests with Supertest (27 test cases)

**API Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards/:id/join` | Cookie | Join a board with alias |
| GET | `/v1/boards/:id/users` | Cookie | Get active users list |
| PATCH | `/v1/boards/:id/users/heartbeat` | Cookie | Update last_active_at |
| PATCH | `/v1/boards/:id/users/alias` | Cookie | Change display name |

**Route Registration Note:**
```typescript
// In app.ts - Order matters!
// User session routes MUST be registered AFTER board routes
// due to Express matching order for /v1/boards/:id/* paths
app.use('/v1/boards', createBoardRoutes(boardController));
app.use('/v1/boards/:id', createUserSessionRoutes(userSessionController)); // uses mergeParams
```

---

## 📁 Files Created

```
src/domains/user/
├── types.ts                      # UserSession, ActiveUser interfaces
├── user-session.repository.ts    # MongoDB operations
├── user-session.service.ts       # Business logic with admin checks
├── user-session.controller.ts    # Express request handlers
├── user-session.routes.ts        # Route definitions with Zod validation
└── index.ts                      # Module exports

tests/
├── unit/domains/user/
│   ├── user-session.repository.test.ts  # 34 test cases
│   └── user-session.service.test.ts     # 13 test cases
└── integration/
    └── user-session.test.ts             # 27 test cases
```

---

## 🧪 Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| UserSessionRepository (unit) | 34 | ✅ Pass |
| UserSessionService (unit) | 13 | ✅ Pass |
| User Session API (integration) | 27 | ✅ Pass |
| **Total** | **74** | ✅ |

---

## 📝 Notes & Decisions

1. **Upsert Pattern**: `joinBoard` uses MongoDB upsert - if session exists, update alias and timestamp; if new, create.

2. **is_admin Computation**: Not stored in `user_sessions` collection. Computed on read by checking `board.admins` array.

3. **Activity Window**: 2-minute window for "active" users. Clients should send heartbeat every 30-60 seconds.

4. **Alias Validation**: Alphanumeric, spaces, hyphens, underscores only. 1-50 characters.

---

## ⚠️ Known Issues / Tech Debt

1. **Duplicate ActiveUser Type**: Defined in both `board/types.ts` and `user/types.ts` with same shape.

2. **is_admin Computed Repeatedly**: Each `getActiveUsers` call requires fetching board to check admins.

3. **No Session Expiration**: Old sessions are never cleaned up. Consider TTL index or periodic cleanup.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 2](./BACKEND_PHASE_02_BOARD_DOMAIN.md) | [Next: Phase 4 →](./BACKEND_PHASE_04_CARD_DOMAIN.md)
