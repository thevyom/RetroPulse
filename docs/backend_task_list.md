# Backend Implementation Task List - Collaborative Retro Board

**Document Version**: 1.0
**Date**: 2025-12-25
**Based on**: Backend API Specification V2.0, Test Plan V1.0
**Architecture**: Single Service + MongoDB + Direct Push

---

## Task Overview

This task list breaks down the backend implementation into discrete, testable steps following TDD principles. Each task builds incrementally on previous work, with no orphaned code.

**Total Tasks**: 44 tasks across 8 major sections
**Estimated Timeline**: 4-6 weeks (single developer)

---

## Phase 1: Project Setup & Infrastructure

- [ ] 1. Initialize project structure and dependencies
  - Create Node.js project with TypeScript 5+
  - Install core dependencies: express, socket.io, mongodb driver, joi, winston
  - Install dev dependencies: jest, supertest, @types packages
  - Configure tsconfig.json with strict mode
  - Set up ESLint and Prettier configurations
  - Create folder structure: `/src/{domains,shared,gateway,tests}`
  - _Requirements: Architecture setup, development environment_

- [ ] 1.1 Set up MongoDB connection and database utilities
  - Create `src/shared/database/MongoClient.ts` connection wrapper
  - Implement connection pooling configuration
  - Create database initialization script with indexes
  - Add connection health check function
  - Write unit tests for connection handling
  - _Requirements: MongoDB as datastore, connection management_

- [ ] 1.2 Create repository pattern interfaces and base implementations
  - Define `src/shared/repositories/BaseRepository.ts` interface
  - Define repository interfaces: `BoardRepository`, `CardRepository`, `ReactionRepository`, `UserSessionRepository`
  - Create MongoDB implementations for each repository interface
  - Write unit tests with mocked MongoDB driver
  - _Requirements: Repository pattern for data abstraction, testability_

- [ ] 1.3 Implement request validation middleware using Joi
  - Create `src/shared/middleware/validation.ts` middleware
  - Define reusable validation schemas (ObjectId, pagination, etc.)
  - Implement error formatting for validation failures
  - Write unit tests for validation edge cases
  - _Requirements: Input validation, security_

- [ ] 1.4 Set up cookie-based authentication middleware with SHA-256 hashing
  - Create `src/shared/middleware/auth.ts` middleware
  - Implement cookie extraction and hashing (SHA-256)
  - Add session creation logic for first-time users
  - Attach `hashedCookieId` to request object
  - Write unit tests for hash consistency and session handling
  - _Requirements: FR-1.2.5, FR-1.2.6, NFR-10.1 (privacy protection)_

- [ ] 1.5 Configure structured JSON logging with Winston
  - Create `src/shared/logger/Logger.ts` wrapper
  - Configure log levels (development vs production)
  - Add request/response logging middleware
  - Implement log sanitization (never log plain cookies or PII)
  - Write tests verifying no sensitive data in logs
  - _Requirements: Observability, security_

---

## Phase 2: Board Domain Implementation

- [ ] 2. Implement Board domain models and DTOs
  - Create `src/domains/board/types.ts` with Board, Column, CreateBoardDTO types
  - Define TypeScript interfaces matching MongoDB schema
  - Create domain-to-document mapping utilities
  - Write unit tests for type conversions
  - _Requirements: Type safety, shared types_

- [ ] 2.1 Implement BoardRepository with MongoDB
  - Create `src/domains/board/BoardRepository.ts`
  - Implement `create()` method with unique shareable_link generation
  - Implement `findById()`, `updateName()`, `closeBoard()`, `addAdmin()`, `isAdmin()` methods
  - Add MongoDB indexes: `{ shareable_link: 1 }` unique, `{ state: 1 }`
  - Write unit tests for all repository methods with mocked MongoDB
  - _Requirements: FR-1.1, FR-1.3, board CRUD operations_

- [ ] 2.2 Implement BoardService with business logic
  - Create `src/domains/board/BoardService.ts`
  - Implement board creation logic (set creator as first admin, generate link)
  - Implement board closure logic (set state='closed', set closed_at timestamp)
  - Implement admin management (add co-admin, verify admin permissions)
  - Add authorization checks (only admins can close, only creator can promote)
  - Write unit tests with mocked repository
  - _Requirements: FR-1.1.13, FR-1.3.1, FR-1.3.4, business logic separation_

- [ ] 2.3 Implement Board API endpoints in BoardController
  - Create `src/domains/board/BoardController.ts`
  - Implement `POST /boards` with Joi validation
  - Implement `GET /boards/:id` with active users aggregation
  - Implement `PATCH /boards/:id/name` with admin authorization
  - Implement `PATCH /boards/:id/close` with admin authorization
  - Implement `POST /boards/:id/admins` with creator-only authorization
  - Write integration tests using Supertest with real MongoDB
  - _Requirements: API specification section 2.1, RESTful design_

- [ ] 2.4 Add board deletion with cascade logic
  - Extend BoardService with `deleteBoard()` method
  - Implement cascade delete for cards, reactions, user_sessions
  - Add admin secret key authentication bypass
  - Implement `DELETE /boards/:id` endpoint
  - Write integration test verifying all related data deleted
  - _Requirements: Testing/admin API, data integrity_

- [ ] 2.5 Implement board column management (rename column)
  - Add `renameColumn()` method to BoardService
  - Implement `PATCH /boards/:id/columns/:columnId` endpoint
  - Validate column_id exists in board.columns array
  - Write unit and integration tests
  - _Requirements: FR-1.1.7, column customization_

---

## Phase 3: User Session Management

- [ ] 3. Implement UserSession domain models
  - Create `src/domains/user/types.ts` with UserSession, JoinBoardDTO types
  - Define user session lifecycle states
  - Write unit tests for type definitions
  - _Requirements: User identity management_

- [ ] 3.1 Implement UserSessionRepository with MongoDB
  - Create `src/domains/user/UserSessionRepository.ts`
  - Implement `upsert()` method (update if exists, create if new)
  - Implement `findActiveUsers()` with last_active_at filter (< 2 minutes)
  - Implement `updateHeartbeat()` to refresh last_active_at
  - Add MongoDB index: `{ board_id: 1, cookie_hash: 1 }` unique
  - Write unit tests with mocked MongoDB
  - _Requirements: FR-1.2, active user tracking_

- [ ] 3.2 Implement UserSessionService with join logic
  - Create `src/domains/user/UserSessionService.ts`
  - Implement `joinBoard()` method (upsert session, check if admin)
  - Implement `getActiveUsers()` with 2-minute activity window
  - Implement `updateAlias()` method
  - Write unit tests with mocked repository
  - _Requirements: FR-1.2.3, FR-1.2.7, user session management_

- [ ] 3.3 Implement User Session API endpoints
  - Create `src/domains/user/UserSessionController.ts`
  - Implement `POST /boards/:id/join` with alias validation
  - Implement `GET /boards/:id/users` for active users list
  - Implement `PATCH /boards/:id/users/heartbeat` to update last_active_at
  - Implement `PATCH /boards/:id/users/alias` to change display name
  - Write integration tests with real MongoDB
  - _Requirements: API specification section 2.2, user identity_

---

## Phase 4: Card Domain Implementation

- [ ] 4. Implement Card domain models and DTOs
  - Create `src/domains/card/types.ts` with Card, CreateCardDTO types
  - Define card types: "feedback" | "action"
  - Create parent-child relationship types
  - Write unit tests for type definitions
  - _Requirements: FR-2.1, card management_

- [ ] 4.1 Implement CardRepository with MongoDB
  - Create `src/domains/card/CardRepository.ts`
  - Implement `create()` method with initial reaction counts = 0
  - Implement `findById()`, `findByBoard()`, `update()`, `delete()` methods
  - Implement `moveToColumn()` method
  - Add MongoDB indexes: `{ board_id: 1, created_at: -1 }`, `{ parent_card_id: 1 }`
  - Write unit tests with mocked MongoDB
  - _Requirements: FR-2.1.1, card CRUD operations_

- [ ] 4.2 Implement card creation with limit enforcement
  - Add `countUserCards()` method to CardRepository
  - Extend CardService with card limit check logic
  - Implement feedback card vs action card differentiation
  - Add authorization check (only creator can delete/update)
  - Write unit tests verifying limit enforcement
  - _Requirements: FR-2.1.8, FR-2.1.10, card limits_

- [ ] 4.3 Implement Card API endpoints (CRUD)
  - Create `src/domains/card/CardController.ts`
  - Implement `POST /boards/:id/cards` with validation and limit check
  - Implement `GET /boards/:id/cards` with filtering (column_id, created_by)
  - Implement `PUT /cards/:id` with owner authorization
  - Implement `DELETE /cards/:id` with owner authorization and orphaning children
  - Write integration tests with real MongoDB
  - _Requirements: API specification section 2.2, card operations_

- [ ] 4.4 Implement card quota check API
  - Add `GET /boards/:id/cards/quota` endpoint to CardController
  - Return current_count, limit, can_create, limit_enabled
  - Support checking quota for other users (admin use case)
  - Write integration tests verifying quota accuracy
  - _Requirements: API specification 2.2.8, user feedback on limits_

- [ ] 4.5 Implement parent-child card relationships
  - Add `linkCards()` method to CardService with circular relationship check
  - Add `unlinkCards()` method to CardService
  - Implement `POST /cards/:id/link` endpoint for parent_of and linked_to types
  - Implement `DELETE /cards/:id/link` endpoint
  - Add validation: both cards must be feedback type for parent-child
  - Write integration tests including circular relationship prevention
  - _Requirements: FR-2.3, parent-child linking, FR-4.1 (action-feedback links)_

- [ ] 4.6 Implement card relationship embedding in GET /cards API
  - Create MongoDB aggregation pipeline with $lookup for children
  - Create MongoDB aggregation pipeline with $lookup for linked_feedback_cards
  - Add `include_relationships` query parameter (default: true)
  - Add summary statistics: total_count, cards_by_column
  - Write integration tests verifying embedded data structure
  - _Requirements: API specification 2.3.1, performance optimization_

- [ ] 4.7 Implement card move to column operation
  - Add `PATCH /cards/:id/column` endpoint
  - Validate new column_id exists in board.columns
  - Preserve parent-child relationships during move
  - Write integration tests verifying relationship preservation
  - _Requirements: FR-2.3.13, FR-2.3.14, cross-column cards_

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
