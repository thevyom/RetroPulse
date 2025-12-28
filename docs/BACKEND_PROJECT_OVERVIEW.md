# Backend Project Overview - RetroPulse Collaborative Retro Board

**Purpose**: Quick-reference summary for starting new phases, implementing features, or onboarding.
**Last Updated**: 2025-12-27 | **Current Phase**: 4 (Card Domain)

---

## Project Status at a Glance

| Phase | Domain | Status | Tests |
|-------|--------|--------|-------|
| 1 | Infrastructure | ✅ Complete | 27 |
| 2 | Board Domain | ✅ Complete | 74 |
| 3 | User Session | ✅ Complete | 74 |
| 4 | Card Domain | ⏳ Next | ~75 planned |
| 5 | Reaction Domain | Pending | ~45 planned |
| 6 | Real-time Events | Pending | ~25 planned |
| 7-10 | Testing, Admin, Optimization | Pending | - |

**Total Tests Passing**: 175 | **Target**: 80%+ coverage

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/WSS
┌────────────────────────────▼────────────────────────────────────┐
│           API Gateway (Express + Socket.io) :3000               │
│           - Auth middleware (cookie-based, SHA-256 hashed)      │
│           - Request routing, WebSocket gateway                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Retro Board Service :3001                          │
│    ┌──────────────┬──────────────┬──────────────────────┐       │
│    │ Board Domain │ User Domain  │ Card/Reaction Domain │       │
│    │ (Phase 2 ✅) │ (Phase 3 ✅) │ (Phase 4-5 ⏳)       │       │
│    └──────────────┴──────────────┴──────────────────────┘       │
│    Repository Pattern → MongoDB                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    MongoDB :27017                               │
│    Collections: boards, cards, reactions, user_sessions         │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack**: Node.js 20 LTS, TypeScript 5+, Express, Socket.io, MongoDB 7+, Vitest, pnpm

---

## Project Structure

```
backend/
├── src/
│   ├── domains/
│   │   ├── board/          # ✅ Board CRUD, columns, admins
│   │   ├── user/           # ✅ Sessions, join, heartbeat, alias
│   │   ├── card/           # ⏳ Phase 4: CRUD, linking, limits
│   │   └── reaction/       # ⏳ Phase 5: Add/remove, aggregation
│   ├── shared/
│   │   ├── config/         # ✅ Zod-validated env config
│   │   ├── database/       # ✅ MongoDB connection with pooling
│   │   ├── middleware/     # ✅ Auth, validation, error handling
│   │   ├── utils/          # ✅ Hash (SHA-256), response helpers
│   │   └── validation/     # ✅ Zod schemas
│   └── gateway/            # ✅ Express app, health routes
└── tests/
    ├── unit/               # Repository + Service tests
    ├── integration/        # API endpoint tests
    └── utils/              # Test helpers, mongodb-memory-server
```

---

## Core API Endpoints

### Board Management (Phase 2 ✅)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards` | Cookie | Create board (creator becomes admin) |
| GET | `/v1/boards/:id` | Cookie | Get board with active users |
| GET | `/v1/boards/by-link/:linkCode` | Cookie | Get board by shareable link |
| PATCH | `/v1/boards/:id/name` | Admin | Rename board |
| PATCH | `/v1/boards/:id/close` | Admin | Close board (read-only mode) |
| PATCH | `/v1/boards/:id/columns/:colId` | Admin | Rename column |
| POST | `/v1/boards/:id/admins` | Creator | Designate co-admin |
| DELETE | `/v1/boards/:id` | Creator/Secret | Delete board + cascade |

### User Sessions (Phase 3 ✅)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards/:id/join` | Cookie | Join board with alias |
| GET | `/v1/boards/:id/users` | Cookie | Get active users (2-min window) |
| PATCH | `/v1/boards/:id/users/heartbeat` | Cookie | Update activity timestamp |
| PATCH | `/v1/boards/:id/users/alias` | Cookie | Change display name |

### Card Management (Phase 4 ⏳)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards/:id/cards` | Cookie | Create card (limit enforced) |
| GET | `/v1/boards/:id/cards` | Cookie | Get cards with embedded relationships |
| GET | `/v1/boards/:id/cards/quota` | Cookie | Check card creation quota |
| PUT | `/v1/cards/:id` | Owner | Update card content |
| DELETE | `/v1/cards/:id` | Owner | Delete card (orphans children) |
| PATCH | `/v1/cards/:id/column` | Owner | Move to different column |
| POST | `/v1/cards/:id/link` | Cookie | Link parent-child or action-feedback |
| DELETE | `/v1/cards/:id/link` | Cookie | Unlink cards |

### Reactions (Phase 5 ⏳)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/cards/:id/reactions` | Cookie | Add/update reaction (limit enforced) |
| DELETE | `/v1/cards/:id/reactions` | Cookie | Remove reaction |
| GET | `/v1/boards/:id/reactions/quota` | Cookie | Check reaction quota |

> **Full API details**: See [BACKEND_API_SPECIFICATION_V2.md](./BACKEND_API_SPECIFICATION_V2.md)

---

## Data Models (Quick Reference)

### boards
```typescript
{ _id, name, shareable_link, state: 'active'|'closed', closed_at,
  columns: [{id, name, color}], card_limit_per_user, reaction_limit_per_user,
  created_at, created_by_hash, admins: [hashes] }
```

### cards
```typescript
{ _id, board_id, column_id, content, card_type: 'feedback'|'action',
  is_anonymous, created_by_hash, created_by_alias,
  direct_reaction_count, aggregated_reaction_count,
  parent_card_id, linked_feedback_ids: [] }
```

### reactions
```typescript
{ _id, card_id, user_cookie_hash, user_alias, reaction_type, created_at }
// Unique constraint: (card_id, user_cookie_hash)
```

### user_sessions
```typescript
{ _id, board_id, cookie_hash, alias, last_active_at, created_at }
// Unique constraint: (board_id, cookie_hash)
// Active = last_active_at > (now - 2 minutes)
```

> **Full schemas & indexes**: See [HIGH_LEVEL_TECHNICAL_DESIGN.md](./HIGH_LEVEL_TECHNICAL_DESIGN.md) Section 5

---

## Key Business Rules

1. **Authentication**: Cookie-based sessions, SHA-256 hashed (never store raw cookies)
2. **Card Limits**: Only feedback cards count toward `card_limit_per_user`; action cards exempt
3. **Reaction Limits**: One reaction per user per card; limit is per-board
4. **Aggregated Counts**: Parent cards include all descendant reaction counts
5. **Closed Boards**: All writes blocked (409), reads + join allowed
6. **Active Users**: `last_active_at` within 2 minutes
7. **Admin Hierarchy**: Creator (first admin) can designate co-admins

---

## Real-time Events (Phase 6)

| Event | Trigger | Payload |
|-------|---------|---------|
| `card:created/updated/deleted/moved` | Card operations | Card data |
| `card:linked/unlinked` | Relationship changes | source, target, link_type |
| `reaction:added/removed` | Reaction changes | card_id, user_alias |
| `board:renamed/closed/deleted` | Board state changes | Board data |
| `user:joined/alias_changed` | Session changes | alias info |

---

## Testing Approach

### Test Commands
```bash
pnpm test          # All tests
pnpm test:unit     # Unit tests only (mocked)
pnpm test:integration  # Integration tests (real MongoDB via memory-server)
pnpm test:coverage # With coverage report
```

### Test Pattern
```
Unit Tests: Mock repositories, test service logic
Integration Tests: Real MongoDB (memory-server), test full API flow
E2E Tests: Full stack including WebSocket events
```

### Current Coverage
- Phase 1-3: 175 tests passing
- Target: 80%+ code coverage for services/repositories

> **Full test specifications**: See [BACKEND_TEST_PLAN.md](./BACKEND_TEST_PLAN.md)

---

## Next Steps (Phase 4: Card Domain)

### Priority Tasks
1. [ ] 4.0 - Implement Card domain models and DTOs
2. [ ] 4.1 - Implement CardRepository with MongoDB
3. [ ] 4.2 - Implement card creation with limit enforcement
4. [ ] 4.3 - Implement Card API endpoints (CRUD)
5. [ ] 4.4 - Implement card quota check API
6. [ ] 4.5 - Implement parent-child card relationships
7. [ ] 4.6 - Implement card relationship embedding in GET /cards
8. [ ] 4.7 - Implement card move to column operation

### Key Implementation Notes
- Cards have two types: `feedback` (limits apply) and `action` (no limits)
- Parent-child linking requires circular relationship detection
- Aggregated reaction counts must update on link/unlink/react operations
- `GET /cards` should use MongoDB aggregation with `$lookup` for embedded relationships

> **Full task breakdown**: See [backend_task_list.md](./backend_task_list.md) Phase 4

---

## Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BOARD_NOT_FOUND` | 404 | Board doesn't exist |
| `CARD_NOT_FOUND` | 404 | Card doesn't exist |
| `FORBIDDEN` | 403 | Not authorized (admin/owner required) |
| `CARD_LIMIT_REACHED` | 403 | User at card limit |
| `REACTION_LIMIT_REACHED` | 403 | User at reaction limit |
| `BOARD_CLOSED` | 409 | Cannot modify closed board |
| `CIRCULAR_RELATIONSHIP` | 400 | Card link would create cycle |

---

## Quick Links to Full Documentation

| Document | Use When |
|----------|----------|
| [backend_task_list.md](./backend_task_list.md) | Detailed task breakdown, progress tracking |
| [BACKEND_API_SPECIFICATION_V2.md](./BACKEND_API_SPECIFICATION_V2.md) | Full endpoint specs, request/response schemas |
| [HIGH_LEVEL_TECHNICAL_DESIGN.md](./HIGH_LEVEL_TECHNICAL_DESIGN.md) | Architecture decisions, DB design, security |
| [BACKEND_TEST_PLAN.md](./BACKEND_TEST_PLAN.md) | Test cases, coverage requirements, E2E scenarios |

---

*This overview is intentionally compact. For implementation details, refer to the linked documents.*
