# Phase 7: Testing & Admin APIs

**Status**: ✅ COMPLETED
**Priority**: Medium
**Tasks**: 4/4 complete
**Test Count**: 32 tests (8 unit, 24 integration)

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement admin-only APIs for testing and development purposes, including board clear, reset, and test data seeding endpoints. These endpoints help QA teams and developers set up consistent test scenarios.

---

## 📋 Task Breakdown

### 7.0 Implement admin secret key authentication middleware ✅

- [x] Create `src/shared/middleware/admin-auth.ts`
- [x] Check `X-Admin-Secret` header against environment variable
- [x] Return 401 Unauthorized if missing or invalid
- [x] Use timing-safe comparison to prevent timing attacks (with length-leak fix)

**Acceptance Criteria:**
- ✅ Only requests with valid `X-Admin-Secret` header proceed
- ✅ Invalid/missing secret returns 401
- ✅ Uses `crypto.timingSafeEqual` for constant-time comparison
- ✅ Hashes inputs before comparison to prevent secret length leakage

---

### 7.1 Implement board clear API for testing ✅

- [x] Add `POST /boards/:id/test/clear` endpoint with admin auth
- [x] Delete all cards, reactions, user_sessions for board (keep board)
- [x] Return count of deleted items
- [x] Add ObjectId validation for :id param
- [x] Write integration tests

**Request:**
```http
POST /v1/boards/:id/test/clear
X-Admin-Secret: <secret>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cards_deleted": 15,
    "reactions_deleted": 42,
    "sessions_deleted": 5
  }
}
```

---

### 7.2 Implement board reset API for testing ✅

- [x] Add `POST /boards/:id/test/reset` endpoint with admin auth
- [x] Reopen board if closed (state='active', closed_at=null)
- [x] Clear all data (cards, reactions, sessions)
- [x] Write integration tests

**Request:**
```http
POST /v1/boards/:id/test/reset
X-Admin-Secret: <secret>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "board_reopened": true,
    "cards_deleted": 15,
    "reactions_deleted": 42,
    "sessions_deleted": 5
  }
}
```

---

### 7.3 Implement seed test data API ✅

- [x] Add `POST /boards/:id/test/seed` endpoint with admin auth
- [x] Create configurable number of users, cards, reactions, relationships
- [x] Generate realistic test data (random aliases, card content, reactions)
- [x] Return created entities for verification
- [x] Write integration tests

**Request:**
```http
POST /v1/boards/:id/test/seed
X-Admin-Secret: <secret>
Content-Type: application/json

{
  "num_users": 5,
  "num_cards": 20,
  "num_action_cards": 5,
  "num_reactions": 50,
  "create_relationships": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users_created": 5,
    "cards_created": 20,
    "action_cards_created": 5,
    "reactions_created": 50,
    "relationships_created": 8,
    "user_aliases": ["TestUser1", "TestUser2", ...]
  }
}
```

**Zod Schema (already exists):**
```typescript
// From src/shared/validation/schemas.ts
const seedTestDataSchema = z.object({
  num_users: z.number().int().positive().max(100).default(5),
  num_cards: z.number().int().positive().max(500).default(20),
  num_action_cards: z.number().int().nonnegative().max(50).default(5),
  num_reactions: z.number().int().nonnegative().max(1000).default(50),
  create_relationships: z.boolean().default(true),
});
```

---

## 📁 Files to Create/Modify

```
src/domains/admin/
├── admin.service.ts      # Clear, reset, seed logic
├── admin.controller.ts   # Request handlers
├── admin.routes.ts       # Route definitions
└── index.ts              # Module exports

tests/
├── unit/domains/admin/
│   └── admin.service.test.ts
└── integration/
    └── admin.test.ts
```

---

## 🧪 Test Requirements - ✅ COMPLETED

| Test Suite | Tests | Status |
|------------|-------|--------|
| Admin Service (unit) | 8 | ✅ |
| Admin API (integration) | 24 | ✅ |
| **Total** | **32** | ✅ |

**Test Scenarios Covered:**
- ✅ Valid admin secret proceeds
- ✅ Invalid admin secret returns 401
- ✅ Missing admin secret returns 401
- ✅ Invalid ObjectId returns 400
- ✅ Clear removes all data but keeps board
- ✅ Clear handles empty board gracefully
- ✅ Reset also reopens closed board
- ✅ Seed creates correct number of entities
- ✅ Seed creates relationships when enabled
- ✅ Seed respects max limits
- ✅ Seed generates unique aliases
- ✅ Moderate data volume performance (50 users, 100 cards)
- ✅ Concurrent clear requests handled gracefully (idempotent)
- ✅ Clear with large dataset performance test

---

## 📝 Technical Notes

### Test Data Generation

```typescript
// Example seed data generator
function generateTestAlias(index: number): string {
  const adjectives = ['Happy', 'Quick', 'Clever', 'Brave', 'Calm'];
  const nouns = ['Penguin', 'Tiger', 'Eagle', 'Dolphin', 'Fox'];
  return `${adjectives[index % 5]}${nouns[index % 5]}${index}`;
}

function generateCardContent(): string {
  const templates = [
    'We should improve...',
    'Great job on...',
    'Consider trying...',
    'I noticed that...',
    'What if we...',
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}
```

### Cascade Delete Order

When clearing/resetting:
1. Delete reactions (via `deleteByCards()`)
2. Delete cards (via `deleteByBoard()`)
3. Delete user sessions (via `deleteByBoard()`)
4. (For reset only) Update board state

---

## 🔗 Dependencies

- Phase 1-5 completed (all services exist)
- Admin auth middleware (partially exists)
- Seed schema (already in schemas.ts)

---

## ⚠️ Considerations - ✅ ADDRESSED

1. **Production Safety**: ✅ REVIEWED & UPDATED
   - ~~Environment check removed~~ - QA feedback: production check blocked legitimate use cases
   - Route prefix `/test/...` used for clarity
   - Admin secret header provides sufficient protection
   - Enables production smoke tests, QA testing, demo resets

2. **Security Hardening**: ✅ IMPLEMENTED
   - Timing-safe comparison using `crypto.timingSafeEqual`
   - SHA-256 hashing of inputs before comparison (prevents length leakage)
   - ObjectId validation on all routes
   - Input validation via Zod schemas

3. **Audit Logging**: ✅ IMPLEMENTED
   - All admin operations logged via `logger.info()`

---

## 📊 Implementation Summary

| Component | File | Status |
|-----------|------|--------|
| Types | `src/domains/admin/types.ts` | ✅ |
| Service | `src/domains/admin/admin.service.ts` | ✅ |
| Controller | `src/domains/admin/admin.controller.ts` | ✅ |
| Routes | `src/domains/admin/admin.routes.ts` | ✅ |
| Index | `src/domains/admin/index.ts` | ✅ |
| Auth Middleware | `src/shared/middleware/admin-auth.ts` | ✅ Enhanced |
| App Wiring | `src/gateway/app.ts` | ✅ |
| Unit Tests | `tests/unit/domains/admin/admin.service.test.ts` | ✅ |
| Integration Tests | `tests/integration/admin.test.ts` | ✅ |

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 6](./BACKEND_PHASE_06_REALTIME_EVENTS.md) | [Next: Phase 8 →](./BACKEND_PHASE_08_INTEGRATION_TESTING.md)
