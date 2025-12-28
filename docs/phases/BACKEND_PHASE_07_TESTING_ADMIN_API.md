# Phase 7: Testing & Admin APIs

**Status**: 🔲 NOT STARTED
**Priority**: Medium
**Tasks**: 0/4 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement admin-only APIs for testing and development purposes, including board clear, reset, and test data seeding endpoints. These endpoints help QA teams and developers set up consistent test scenarios.

---

## 📋 Task Breakdown

### 7.0 Implement admin secret key authentication middleware

- [ ] Create `src/shared/middleware/adminAuth.ts`
- [ ] Check `X-Admin-Secret` header against environment variable
- [ ] Return 401 Unauthorized if missing or invalid
- [ ] Write unit tests for authentication logic

**Note**: Basic admin auth middleware already exists in `src/shared/middleware/admin-auth.ts`. This task may involve enhancement or verification.

**Acceptance Criteria:**
- Only requests with valid `X-Admin-Secret` header proceed
- Invalid/missing secret returns 401
- Environment variable: `ADMIN_SECRET`

---

### 7.1 Implement board clear API for testing

- [ ] Add `POST /boards/:id/test/clear` endpoint with admin auth
- [ ] Delete all cards, reactions, user_sessions for board (keep board)
- [ ] Return count of deleted items
- [ ] Write integration tests

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

### 7.2 Implement board reset API for testing

- [ ] Add `POST /boards/:id/test/reset` endpoint with admin auth
- [ ] Reopen board if closed (state='active', closed_at=null)
- [ ] Clear all data (cards, reactions, sessions)
- [ ] Write integration tests

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

### 7.3 Implement seed test data API

- [ ] Add `POST /boards/:id/test/seed` endpoint with admin auth
- [ ] Create configurable number of users, cards, reactions, relationships
- [ ] Generate realistic test data (random aliases, card content, reactions)
- [ ] Return created entities for verification
- [ ] Write integration tests

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

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Admin Auth (unit) | ~4 | Header validation |
| Admin Service (unit) | ~8 | Clear/reset/seed logic |
| Admin API (integration) | ~12 | Full API flow with auth |
| **Total** | **~24** | |

**Test Scenarios:**
- Valid admin secret proceeds
- Invalid admin secret returns 401
- Missing admin secret returns 401
- Clear removes all data but keeps board
- Reset also reopens closed board
- Seed creates correct number of entities
- Seed creates relationships when enabled

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

## ⚠️ Considerations

1. **Production Safety**: These endpoints should ONLY be available in non-production environments. Consider:
   - Environment check in middleware
   - Different route prefix (e.g., `/test/...`)
   - Feature flag

2. **Rate Limiting**: Seed endpoint could be abused. Consider stricter rate limits.

3. **Audit Logging**: Log admin operations for accountability.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 6](./BACKEND_PHASE_06_REALTIME_EVENTS.md) | [Next: Phase 8 →](./BACKEND_PHASE_08_INTEGRATION_TESTING.md)
