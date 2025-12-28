# Backend Implementation Task List - Collaborative Retro Board

**Document Version**: 1.2
**Date**: 2025-12-28
**Based on**: Backend API Specification V2.0, Test Plan V1.0
**Architecture**: Single Service + MongoDB + Direct Push

---

## 📚 Quick Context Files (Read First!)

> **For AI Assistants & New Developers**: Before diving into the full documentation, start with these compact summary files. They provide high-signal context without the overhead of loading multiple large documents.

| File | Purpose | When to Use |
|------|---------|-------------|
| **[BACKEND_PROJECT_OVERVIEW.md](./BACKEND_PROJECT_OVERVIEW.md)** | High-level project summary (~400 lines) | Starting a new phase, understanding overall architecture, checking current progress |
| **[BACKEND_CORE_CONTEXT.md](./BACKEND_CORE_CONTEXT.md)** | Deep technical context (~500 lines) | Implementing features, understanding patterns, testing setup, code conventions |

**Workflow for AI Assistants**:
1. **First**: Read `BACKEND_CORE_CONTEXT.md` for code patterns, types, and testing setup
2. **Then**: Reference `BACKEND_PROJECT_OVERVIEW.md` for API endpoints and business rules
3. **Only if needed**: Open the full documents below for in-depth specifications

**Full Documentation** (reference when summary files lack detail):
- [BACKEND_API_SPECIFICATION_V2.md](./BACKEND_API_SPECIFICATION_V2.md) - Complete API endpoints, schemas, behaviors
- [HIGH_LEVEL_TECHNICAL_DESIGN.md](./HIGH_LEVEL_TECHNICAL_DESIGN.md) - Architecture decisions, DB design
- [BACKEND_TEST_PLAN.md](./BACKEND_TEST_PLAN.md) - Detailed test cases, coverage requirements

---

## Task Overview

This task list breaks down the backend implementation into discrete, testable steps following TDD principles. Each task builds incrementally on previous work, with no orphaned code.

**Total Tasks**: 44 tasks across 10 major sections
**Progress**: Phase 1, 2, 3, 4 Complete ✅

---

## Project Structure (Implemented)

```
backend/
├── src/
│   ├── domains/                    # Domain modules
│   │   ├── board/                  # Board domain (Phase 2)
│   │   ├── card/                   # Card domain (Phase 4)
│   │   ├── reaction/               # Reaction domain (Phase 5)
│   │   └── user/                   # User session domain (Phase 3)
│   ├── shared/
│   │   ├── config/
│   │   │   ├── env.ts              # ✅ Zod-validated environment config
│   │   │   └── index.ts
│   │   ├── database/
│   │   │   ├── mongo-client.ts     # ✅ MongoDB connection with pooling
│   │   │   └── index.ts
│   │   ├── logger/
│   │   │   ├── logger.ts           # ✅ Winston with sanitization
│   │   │   └── index.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts             # ✅ Cookie auth + SHA-256 hashing
│   │   │   ├── admin-auth.ts       # ✅ Admin secret key auth
│   │   │   ├── validation.ts       # ✅ Zod validation middleware
│   │   │   ├── error-handler.ts    # ✅ Global error handling
│   │   │   ├── request-logger.ts   # ✅ Request/response logging
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── api.ts              # ✅ API types, error codes
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── hash.ts             # ✅ SHA-256, UUID generation
│   │   │   ├── response.ts         # ✅ sendSuccess, sendError helpers
│   │   │   └── index.ts
│   │   └── validation/
│   │       ├── schemas.ts          # ✅ All Zod schemas for API
│   │       └── index.ts
│   ├── gateway/
│   │   ├── routes/
│   │   │   └── health.ts           # ✅ Health check endpoints
│   │   ├── app.ts                  # ✅ Express app setup
│   │   └── index.ts
│   └── index.ts                    # ✅ Server entry point
├── tests/
│   ├── unit/
│   │   └── shared/
│   │       ├── utils/
│   │       │   └── hash.test.ts    # ✅ Hash utility tests
│   │       └── validation/
│   │           └── schemas.test.ts # ✅ Zod schema tests
│   ├── integration/
│   └── e2e/
├── package.json                    # ✅ pnpm project config
├── tsconfig.json                   # ✅ TypeScript with @/ alias
├── vitest.config.ts                # ✅ Vitest configuration
├── .eslintrc.cjs                   # ✅ ESLint configuration
├── .prettierrc                     # ✅ Prettier configuration
├── .gitignore                      # ✅ Git ignore rules
└── .env.example                    # ✅ Environment template

database/
└── init/
    └── 01-init-db.js               # ✅ MongoDB indexes initialization

docker-compose.yml                  # ✅ MongoDB + Mongo Express
```

---

## Phase 1: Project Setup & Infrastructure ✅ COMPLETED

- [x] 1. Initialize project structure and dependencies
  - ✅ Created Node.js project with TypeScript 5+ using pnpm
  - ✅ Installed core dependencies: express, socket.io, mongodb driver, zod, winston
  - ✅ Installed dev dependencies: vitest, supertest, @types packages
  - ✅ Configured tsconfig.json with strict mode and @/ path alias
  - ✅ Set up ESLint and Prettier configurations
  - ✅ Created folder structure: `/src/{domains,shared,gateway}` and `/tests`
  - ✅ Configured absolute imports with @/ alias mapping to /src
  - _Completed: 2025-12-27_

- [x] 1.1 Set up MongoDB connection and database utilities
  - ✅ Created `src/shared/database/mongo-client.ts` connection wrapper
  - ✅ Implemented connection pooling configuration
  - ✅ Created database initialization script with indexes (`database/init/01-init-db.js`)
  - ✅ Added connection health check function
  - ⏳ Unit tests for connection handling (pending - requires MongoDB mock)
  - _Completed: 2025-12-27_

- [x] 1.2 Create repository pattern interfaces and base implementations
  - ⏳ Deferred to Phase 2-5 (implement per domain for better cohesion)
  - _Note: Repository interfaces will be created within each domain module_

- [x] 1.3 Implement request validation middleware using Zod
  - ✅ Created `src/shared/middleware/validation.ts` middleware
  - ✅ Defined reusable Zod schemas in `src/shared/validation/schemas.ts`
  - ✅ Implemented error formatting for validation failures (ZodError → API error)
  - ✅ Written unit tests for validation schemas
  - _Completed: 2025-12-27_

- [x] 1.4 Set up cookie-based authentication middleware with SHA-256 hashing
  - ✅ Created `src/shared/middleware/auth.ts` middleware
  - ✅ Implemented cookie extraction and hashing (SHA-256)
  - ✅ Added session creation logic for first-time users
  - ✅ Attached `hashedCookieId` to request object
  - ✅ Written unit tests for hash consistency
  - _Completed: 2025-12-27_

- [x] 1.5 Configure structured JSON logging with Winston
  - ✅ Created `src/shared/logger/logger.ts` wrapper
  - ✅ Configured log levels (development vs production)
  - ✅ Added request/response logging middleware
  - ✅ Implemented log sanitization (never log plain cookies or PII)
  - ⏳ Tests verifying no sensitive data in logs (pending)
  - _Completed: 2025-12-27_

- [x] 1.6 Set up Docker Compose for development (Added)
  - ✅ Created `docker-compose.yml` with MongoDB 7.0
  - ✅ Added Mongo Express for database UI (dev profile)
  - ✅ Configured health checks and volumes
  - _Completed: 2025-12-27_

---

## Phase 2: Board Domain Implementation ✅ COMPLETED

- [x] 2. Implement Board domain models and DTOs
  - ✅ Created `src/domains/board/types.ts` with Board, Column, CreateBoardDTO types
  - ✅ Defined TypeScript interfaces matching MongoDB schema
  - ✅ Created `boardDocumentToBoard()` mapping utility
  - _Completed: 2025-12-27_

- [x] 2.1 Implement BoardRepository with MongoDB
  - ✅ Created `src/domains/board/board.repository.ts`
  - ✅ Implemented `create()` with unique shareable_link (8-char UUID)
  - ✅ Implemented `findById()`, `findByShareableLink()`, `updateName()`, `closeBoard()`
  - ✅ Implemented `addAdmin()`, `isAdmin()`, `isCreator()`, `renameColumn()`, `delete()`
  - ✅ Added `ensureIndexes()` method for MongoDB indexes
  - ✅ Written unit tests with mongodb-memory-server (15 test cases)
  - _Completed: 2025-12-27_

- [x] 2.2 Implement BoardService with business logic
  - ✅ Created `src/domains/board/board.service.ts`
  - ✅ Implemented board creation (creator as first admin, full shareable URL)
  - ✅ Implemented board closure (state='closed', closed_at timestamp)
  - ✅ Implemented admin management with authorization checks
  - ✅ Added `ensureBoardActive()`, `ensureAdmin()`, `ensureCreator()` guards
  - ✅ Written unit tests with mocked repository (12 test cases)
  - _Completed: 2025-12-27_

- [x] 2.3 Implement Board API endpoints in BoardController
  - ✅ Created `src/domains/board/board.controller.ts`
  - ✅ Created `src/domains/board/board.routes.ts` with Zod validation
  - ✅ Implemented all endpoints:
    - `POST /v1/boards` - Create board
    - `GET /v1/boards/:id` - Get board details
    - `GET /v1/boards/link/:linkCode` - Get board by shareable link
    - `PATCH /v1/boards/:id/name` - Rename board (admin)
    - `PATCH /v1/boards/:id/close` - Close board (admin)
    - `POST /v1/boards/:id/admins` - Add co-admin (creator)
    - `PATCH /v1/boards/:id/columns/:columnId` - Rename column (admin)
    - `DELETE /v1/boards/:id` - Delete board (creator or admin secret)
  - ✅ Written integration tests with Supertest (12 test cases)
  - _Completed: 2025-12-27_

- [x] 2.4 Add board deletion with cascade logic
  - ✅ Implemented `deleteBoard()` in BoardService
  - ✅ Added admin secret key bypass in controller
  - ⏳ Cascade delete for cards/reactions/sessions deferred to Phase 3-5
  - _Completed: 2025-12-27_

- [x] 2.5 Implement board column management (rename column)
  - ✅ Implemented `renameColumn()` in BoardRepository and BoardService
  - ✅ Implemented `PATCH /boards/:id/columns/:columnId` endpoint
  - ✅ Column validation (returns 400 if column not found)
  - ✅ Written unit and integration tests
  - _Completed: 2025-12-27_

### Phase 2 Files Created

```
src/domains/board/
├── types.ts              # Board, Column, BoardDocument interfaces
├── board.repository.ts   # MongoDB operations
├── board.service.ts      # Business logic with authorization
├── board.controller.ts   # Express request handlers
├── board.routes.ts       # Route definitions with Zod validation
└── index.ts              # Module exports

tests/
├── utils/
│   ├── test-db.ts        # mongodb-memory-server utilities
│   ├── test-app.ts       # Express test app factory
│   └── index.ts
├── unit/domains/board/
│   ├── board.repository.test.ts  # 15 test cases
│   └── board.service.test.ts     # 12 test cases
└── integration/
    └── board.test.ts             # 12 test cases
```

---

## Phase 3: User Session Management ✅ COMPLETED

- [x] 3. Implement UserSession domain models
  - ✅ Created `src/domains/user/types.ts` with UserSession, ActiveUser, JoinBoardInput types
  - ✅ Created `userSessionDocumentToUserSession()` and `userSessionDocumentToActiveUser()` mapping utilities
  - _Completed: 2025-12-27_

- [x] 3.1 Implement UserSessionRepository with MongoDB
  - ✅ Created `src/domains/user/user-session.repository.ts`
  - ✅ Implemented `upsert()` method (update if exists, create if new)
  - ✅ Implemented `findActiveUsers()` with 2-minute activity window
  - ✅ Implemented `findByBoardAndUser()`, `updateHeartbeat()`, `updateAlias()`
  - ✅ Implemented `deleteByBoard()`, `countByBoard()` for cascade operations
  - ✅ Added `ensureIndexes()` method for MongoDB indexes
  - ✅ Written unit tests with mongodb-memory-server (34 test cases)
  - _Completed: 2025-12-27_

- [x] 3.2 Implement UserSessionService with join logic
  - ✅ Created `src/domains/user/user-session.service.ts`
  - ✅ Implemented `joinBoard()` method (upsert session, check is_admin)
  - ✅ Implemented `getActiveUsers()` with is_admin flag for each user
  - ✅ Implemented `updateHeartbeat()` and `updateAlias()` methods
  - ✅ Implemented `getUserSession()` and `deleteSessionsForBoard()` methods
  - ✅ Written unit tests with mocked repository (13 test cases)
  - _Completed: 2025-12-27_

- [x] 3.3 Implement User Session API endpoints
  - ✅ Created `src/domains/user/user-session.controller.ts`
  - ✅ Created `src/domains/user/user-session.routes.ts` with Zod validation
  - ✅ Implemented all endpoints:
    - `POST /v1/boards/:id/join` - Join a board with alias
    - `GET /v1/boards/:id/users` - Get active users list
    - `PATCH /v1/boards/:id/users/heartbeat` - Update last_active_at
    - `PATCH /v1/boards/:id/users/alias` - Change display name
  - ✅ Written integration tests with Supertest (27 test cases)
  - _Completed: 2025-12-27_

### Phase 3 Files Created

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

## Phase 4: Card Domain Implementation ✅ COMPLETED

- [x] 4. Implement Card domain models and DTOs
  - ✅ Created `src/domains/card/types.ts` with Card, CreateCardDTO, CardWithRelationships types
  - ✅ Defined card types: "feedback" | "action"
  - ✅ Created parent-child and linked_feedback relationship types
  - ✅ Created converter utilities: cardDocumentToCard, cardDocumentToChildCard, cardDocumentToLinkedFeedbackCard
  - _Completed: 2025-12-28_

- [x] 4.1 Implement CardRepository with MongoDB
  - ✅ Created `src/domains/card/card.repository.ts`
  - ✅ Implemented `create()` method with initial reaction counts = 0
  - ✅ Implemented `findById()`, `findByBoard()`, `updateContent()`, `delete()` methods
  - ✅ Implemented `moveToColumn()` method
  - ✅ Added MongoDB indexes: `{ board_id: 1, created_at: -1 }`, `{ parent_card_id: 1 }`, `{ linked_feedback_ids: 1 }`
  - ✅ Written unit tests (40 test cases)
  - _Completed: 2025-12-28_

- [x] 4.2 Implement card creation with limit enforcement
  - ✅ Added `countUserCards()` method to CardRepository
  - ✅ Implemented card limit check logic in CardService
  - ✅ Implemented feedback card vs action card differentiation (action exempt from limits)
  - ✅ Added authorization check (only creator can delete/update)
  - ✅ Written unit tests verifying limit enforcement
  - _Completed: 2025-12-28_

- [x] 4.3 Implement Card API endpoints (CRUD)
  - ✅ Created `src/domains/card/card.controller.ts`
  - ✅ Implemented `POST /boards/:id/cards` with validation and limit check
  - ✅ Implemented `GET /boards/:id/cards` with filtering (column_id, created_by, include_relationships)
  - ✅ Implemented `PUT /cards/:id` with owner authorization
  - ✅ Implemented `DELETE /cards/:id` with owner authorization and orphaning children
  - ✅ Written integration tests (36 test cases)
  - _Completed: 2025-12-28_

- [x] 4.4 Implement card quota check API
  - ✅ Added `GET /boards/:id/cards/quota` endpoint to CardController
  - ✅ Return current_count, limit, can_create, limit_enabled
  - ✅ Support checking quota for other users (admin use case)
  - ✅ Written integration tests verifying quota accuracy
  - _Completed: 2025-12-28_

- [x] 4.5 Implement parent-child card relationships
  - ✅ Added `linkCards()` method to CardService with circular relationship check
  - ✅ Added `unlinkCards()` method to CardService
  - ✅ Implemented `POST /cards/:id/link` endpoint for parent_of and linked_to types
  - ✅ Implemented `DELETE /cards/:id/link` endpoint
  - ✅ Added validation: both cards must be feedback type for parent-child
  - ✅ Added authorization: only card creator or board admin can link/unlink
  - ✅ Written integration tests including circular relationship prevention
  - _Completed: 2025-12-28_

- [x] 4.6 Implement card relationship embedding in GET /cards API
  - ✅ Created MongoDB aggregation pipeline with $lookup for children
  - ✅ Created MongoDB aggregation pipeline with $lookup for linked_feedback_cards
  - ✅ Added `include_relationships` query parameter (default: true)
  - ✅ Added summary statistics: total_count, cards_by_column
  - ✅ Optimized with Promise.all for parallel database calls
  - ✅ Written integration tests verifying embedded data structure
  - _Completed: 2025-12-28_

- [x] 4.7 Implement card move to column operation
  - ✅ Added `PATCH /cards/:id/column` endpoint
  - ✅ Validate new column_id exists in board.columns
  - ✅ Preserve parent-child relationships during move
  - ✅ Written integration tests verifying relationship preservation
  - _Completed: 2025-12-28_

### Phase 4 Files Created

```
src/domains/card/
├── types.ts              # Card, CardDocument, CardWithRelationships interfaces
├── card.repository.ts    # MongoDB operations with aggregation pipelines
├── card.service.ts       # Business logic with authorization
├── card.controller.ts    # Express request handlers
├── card.routes.ts        # Route definitions with Zod validation
└── index.ts              # Module exports

tests/
├── unit/domains/card/
│   ├── card.repository.test.ts  # 40 test cases
│   └── card.service.test.ts     # 29 test cases
└── integration/
    └── card.test.ts             # 36 test cases
```

### Phase 4 Code Review

All blocking issues fixed:
- ✅ Authorization for linkCards (creator or board admin)
- ✅ Authorization for unlinkCards (creator or board admin)
- ✅ Performance optimization with Promise.all
- ✅ Added linked_feedback_ids index

---

## Phase 5: Reaction Domain Implementation

- [ ] 5. Implement Reaction domain models
  - Create `src/domains/reaction/types.ts` with Reaction, AddReactionDTO types
  - Define reaction types: "thumbs_up" (extensible for future types)
  - Write unit tests for type definitions
  - _Requirements: FR-3.1, reaction system_

- [ ] 5.1 Implement ReactionRepository with MongoDB
  - Create `src/domains/reaction/ReactionRepository.ts`
  - Implement `upsert()` method (one reaction per user per card)
  - Implement `findByCard()`, `delete()`, `countUserReactions()` methods
  - Add unique index: `{ card_id: 1, user_cookie_hash: 1 }`
  - Write unit tests with mocked MongoDB
  - _Requirements: FR-3.1.4, reaction uniqueness_

- [ ] 5.2 Implement reaction aggregation logic in CardService
  - Add `updateReactionCounts()` method to CardService
  - Implement direct_reaction_count increment/decrement (atomic operation)
  - Implement aggregated_reaction_count update for parent cards
  - Handle child card reactions updating parent aggregated count
  - Write unit tests for aggregation logic
  - _Requirements: FR-3.1.8, FR-3.1.9, FR-3.1.10, reaction aggregation_

- [ ] 5.3 Implement Reaction API endpoints
  - Create `src/domains/reaction/ReactionController.ts`
  - Implement `POST /cards/:id/reactions` with upsert logic
  - Implement `DELETE /cards/:id/reactions` with count updates
  - Add reaction limit enforcement (check user's total reactions on board)
  - Write integration tests with real MongoDB verifying count updates
  - _Requirements: API specification section 2.3, reaction operations_

- [ ] 5.4 Implement reaction quota check API
  - Add `GET /boards/:id/reactions/quota` endpoint
  - Return current_count, limit, can_react, limit_enabled
  - Support checking quota for other users (admin use case)
  - Ensure board isolation (reactions on board A don't affect board B quota)
  - Write integration tests verifying quota accuracy and isolation
  - _Requirements: API specification 2.3.3, user feedback on limits_

---

## Phase 6: Real-time Event System

- [ ] 6. Implement Socket.io gateway setup
  - Create `src/gateway/SocketGateway.ts` wrapper for Socket.io server
  - Configure CORS for WebSocket connections
  - Implement room management (join-board, leave-board events)
  - Add heartbeat event handling
  - Write unit tests for room management
  - _Requirements: Real-time collaboration, WebSocket architecture_

- [ ] 6.1 Implement direct push from service to gateway
  - Create `src/gateway/EventBroadcaster.ts` interface
  - Inject SocketGateway reference into service layer
  - Implement `broadcast()` method on SocketGateway
  - Add event type definitions (card:created, reaction:added, etc.)
  - Write unit tests for event broadcasting
  - _Requirements: Direct push architecture, real-time sync_

- [ ] 6.2 Add real-time events to BoardService
  - Emit `board:renamed` event when board name changes
  - Emit `board:closed` event when board is closed
  - Emit `board:deleted` event when board is deleted
  - Emit `user:joined` event when user joins board
  - Write integration tests verifying events received by clients
  - _Requirements: FR-1.2.9, real-time board updates_

- [ ] 6.3 Add real-time events to CardService
  - Emit `card:created` event after card creation
  - Emit `card:updated` event after card update
  - Emit `card:deleted` event after card deletion
  - Emit `card:moved` event when card moves to different column
  - Emit `card:linked` and `card:unlinked` events for relationships
  - Write integration tests with Socket.io client
  - _Requirements: FR-2.6.6, real-time card sync_

- [ ] 6.4 Add real-time events to ReactionService
  - Emit `reaction:added` event with user_alias and card_id
  - Emit `reaction:removed` event when reaction is deleted
  - Include updated reaction counts in event payload
  - Write integration tests verifying all connected clients receive events
  - _Requirements: FR-3.1.15, real-time reaction updates_

---

## Phase 7: Testing & Admin APIs

- [ ] 7. Implement admin secret key authentication middleware
  - Create `src/shared/middleware/adminAuth.ts`
  - Check `X-Admin-Secret` header against environment variable
  - Return 401 Unauthorized if missing or invalid
  - Write unit tests for authentication logic
  - _Requirements: Testing/admin API security_

- [ ] 7.1 Implement board clear API for testing
  - Add `POST /boards/:id/test/clear` endpoint with admin auth
  - Delete all cards, reactions, user_sessions for board (keep board)
  - Return count of deleted items
  - Write integration tests
  - _Requirements: API specification 2.5.1, test data management_

- [ ] 7.2 Implement board reset API for testing
  - Add `POST /boards/:id/test/reset` endpoint with admin auth
  - Reopen board if closed (state='active', closed_at=null)
  - Clear all data (cards, reactions, sessions)
  - Write integration tests
  - _Requirements: API specification 2.5.2, test data reset_

- [ ] 7.3 Implement seed test data API
  - Add `POST /boards/:id/test/seed` endpoint with admin auth
  - Create configurable number of users, cards, reactions, relationships
  - Generate realistic test data (random aliases, card content, reactions)
  - Return created entities for verification
  - Write integration tests
  - _Requirements: API specification 2.5.3, automated testing_

---

## Phase 8: Integration & Testing

- [ ] 8. Write unit tests for all repositories (96 test cases total)
  - Board API: 38 test cases covering validation, authorization, state transitions
  - User Session API: 7 test cases for join, heartbeat, alias updates
  - Card API: 33 test cases for CRUD, limits, relationships, quota
  - Reaction API: 12 test cases for add/remove, limits, aggregation
  - Admin API: 6 test cases for authentication and data management
  - Use mocked MongoDB driver and repositories
  - _Requirements: Test plan section 2, unit test coverage_

- [ ] 8.1 Write integration tests for board lifecycle (8 test suites)
  - Complete board lifecycle test (create → join → cards → link → react → close → delete)
  - Card limit enforcement test
  - Reaction aggregation test (parent-child)
  - Circular relationship prevention test
  - Closed board restrictions test
  - Card quota check API test
  - Reaction quota check API test
  - Bulk card fetch with relationships test
  - Use real MongoDB instance for testing
  - _Requirements: Test plan section 3, integration testing_

- [ ] 8.2 Write E2E tests for realistic scenarios (3 test suites)
  - Complete retrospective meeting scenario (5 users, full workflow)
  - Anonymous user privacy test (verify cookie hashing)
  - Concurrent users test (20 users on same board)
  - Use full HTTP + WebSocket + MongoDB stack
  - _Requirements: Test plan section 4, E2E testing_

- [ ] 8.3 Set up CI/CD pipeline configuration
  - Create GitHub Actions or CI/CD config file
  - Configure unit test run on every commit
  - Configure integration tests on pull requests
  - Add code coverage reporting (target: >80%)
  - Set up pre-commit hooks for linting and type checking
  - _Requirements: Test plan section 6, automation_

- [ ] 8.4 Create Docker Compose configuration for development
  - Create `docker-compose.yml` with MongoDB, API Gateway, Service containers
  - Add environment variable configuration
  - Create development and test profiles
  - Document setup and usage in README
  - Test full stack startup and shutdown
  - _Requirements: High-level design section 9, deployment_

---

## Phase 9: Error Handling & Edge Cases

- [ ] 9. Implement comprehensive error handling middleware
  - Create `src/shared/middleware/errorHandler.ts`
  - Define standard error response format (success: false, error object)
  - Map all error types to appropriate HTTP status codes
  - Add error logging (sanitize sensitive data)
  - Write unit tests for error formatting
  - _Requirements: API specification section 4, error responses_

- [ ] 9.1 Add closed board validation across all write endpoints
  - Create reusable `checkBoardActive()` middleware
  - Apply to all card/reaction/board write operations
  - Return 409 Conflict with BOARD_CLOSED error code
  - Write integration tests verifying all endpoints respect board state
  - _Requirements: FR-1.3.5, read-only mode_

- [ ] 9.2 Implement authorization checks for admin-only operations
  - Create `requireAdmin()` middleware
  - Check if user's cookie_hash is in board.admins array
  - Return 403 Forbidden if not admin
  - Write integration tests for all admin endpoints
  - _Requirements: FR-1.3.8, admin permissions_

- [ ] 9.3 Add request rate limiting middleware
  - Install and configure express-rate-limit
  - Set limits: 100 requests/minute per IP for normal endpoints
  - Set stricter limits: 10 requests/minute for admin endpoints
  - Add bypass for testing environment
  - Write integration tests verifying rate limits enforced
  - _Requirements: Security, DoS prevention_

---

## Phase 10: Performance Optimization & Monitoring

- [ ] 10. Optimize MongoDB queries with aggregation pipelines
  - Refactor `GET /boards/:id/cards` to use single aggregation query
  - Use $lookup for embedding children and linked_feedback_cards
  - Add $facet for summary statistics (total_count, cards_by_column)
  - Benchmark query performance (target: <100ms for 100 cards)
  - _Requirements: Performance optimization, NFR-6.3_

- [ ] 10.1 Add database query performance logging
  - Instrument all repository methods with timing logs
  - Log slow queries (>100ms) at WARN level
  - Include query details (collection, filter, duration)
  - Write tests verifying logs are generated
  - _Requirements: Observability, performance monitoring_

- [ ] 10.2 Implement WebSocket connection management
  - Track active WebSocket connections per board
  - Implement graceful disconnect handling
  - Add reconnection logic on client side
  - Log connection/disconnection events
  - Test with 50 concurrent connections
  - _Requirements: NFR-6.6, real-time reliability_

- [ ] 10.3 Add health check endpoints
  - Implement `GET /health` endpoint (returns 200 OK)
  - Implement `GET /health/db` endpoint (checks MongoDB connection)
  - Implement `GET /health/websocket` endpoint (checks Socket.io status)
  - Use in Docker health checks
  - Write integration tests
  - _Requirements: Deployment, monitoring_

---

## Success Criteria

The backend implementation will be considered complete when:

1. ✅ All 44 tasks are completed and merged to main branch
2. ✅ Unit test coverage is >80% for services and repositories
3. ✅ All 96 unit tests pass
4. ✅ All 8 integration test suites pass with real MongoDB
5. ✅ All 3 E2E test scenarios pass with full stack
6. ✅ API specification compliance verified (all endpoints implemented)
7. ✅ Real-time events working with <200ms latency for 20 concurrent users
8. ✅ Docker Compose setup allows full stack to start with `docker-compose up`
9. ✅ No sensitive data (cookies, PII) logged or stored in plain text
10. ✅ All PRD requirements mapped to implemented features are satisfied

---

## Document Status

**Status**: Ready for Implementation

**Next Steps**:
1. Review task list with team
2. Set up project repository and branch strategy
3. Begin Phase 1: Project Setup & Infrastructure
4. Follow TDD approach: write tests first, then implement features
5. Use task completion checklist to track progress

**Related Documents**:
- [BACKEND_API_SPECIFICATION_V2.md](./BACKEND_API_SPECIFICATION_V2.md) - Complete API reference
- [BACKEND_TEST_PLAN.md](./BACKEND_TEST_PLAN.md) - Detailed test specifications
- [HIGH_LEVEL_TECHNICAL_DESIGN.md](./HIGH_LEVEL_TECHNICAL_DESIGN.md) - Architecture overview
- [PRD.md](./PRD.md) - Product requirements
