# Integration Test Strategy: Frontend + Backend E2E Validation

**Version**: 1.0
**Date**: 2026-01-01
**Status**: Planning Phase
**Owner**: QA Engineering

---

## Executive Summary

The frontend and backend pass tests independently but fail when integrated. This document outlines a phase-aligned testing strategy to systematically identify and resolve integration issues.

| Metric | Current State |
|--------|---------------|
| Backend Tests | 265/266 passing (99.6%) |
| Frontend E2E | 23/79 passing (29.1%) |
| Integration Gap | 51 tests failing at integration |

---

## Root Cause Analysis

### Identified Failure Categories

| Category | Symptom | Root Cause | Priority |
|----------|---------|------------|----------|
| Timeout Issues | Tests timeout waiting for UI | API response times differ from mocks | P0 |
| Selector Mismatch | Can't find created cards | DOM structure differs from expectations | P0 |
| DnD Flakiness | Drag-drop tests fail intermittently | Animation/timing race conditions | P1 |
| Real-time Sync | Multi-user tests fail | WebSocket connection timing | P1 |

### Why Tests Passed Individually

```
┌─────────────────────────────────────────────────────────────────┐
│  ISOLATED TESTING (Passed)                                      │
│                                                                 │
│   Backend Tests          Frontend E2E Tests                     │
│   ┌──────────────┐       ┌──────────────┐                       │
│   │ Vitest       │       │ Playwright   │                       │
│   │ In-memory DB │       │ MSW Mocks    │                       │
│   │ Fast, stable │       │ Fast, stable │                       │
│   └──────────────┘       └──────────────┘                       │
│         ✓                      ✓                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INTEGRATED TESTING (Failing)                                   │
│                                                                 │
│   ┌──────────┐    HTTP/WS    ┌──────────┐    DB    ┌─────────┐ │
│   │ Frontend │◄─────────────►│ Backend  │◄────────►│ MongoDB │ │
│   │ :5173    │               │ :3001    │          │ :27017  │ │
│   └──────────┘               └──────────┘          └─────────┘ │
│         │                          │                    │       │
│         └──────────────────────────┼────────────────────┘       │
│                    Real network latency, real data              │
│                              ✗ FAILURES                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy: Phase-by-Phase Validation

### Overview

Test each frontend phase against the real backend before proceeding. This isolates where integration breaks.

```
Phase Order:
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Infrastructure │────►│  Model Layer   │────►│ ViewModel Layer│
│  (1 parallel)  │     │  (4 parallel)  │     │  (3 parallel)  │
└────────────────┘     └────────────────┘     └────────────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  E2E Critical  │────►│  E2E Extended  │────►│  Full Regression│
│  (2 parallel)  │     │  (3 parallel)  │     │  (sequential)   │
└────────────────┘     └────────────────┘     └────────────────┘
```

---

## Phase 1: Infrastructure Validation

**Goal**: Confirm frontend can communicate with backend
**Duration**: 0.5 day
**Parallelism**: 4 tests can run simultaneously

### Tests

| ID | Test | Description | Pass Criteria |
|----|------|-------------|---------------|
| INF-01 | Backend Health | `curl http://localhost:3001/health` | Returns `{ status: "ok" }` |
| INF-02 | Frontend Health | `curl http://localhost:5173` | Returns HTML with React app |
| INF-03 | CORS Config | Frontend fetch to backend | No CORS errors in console |
| INF-04 | WebSocket Connect | SocketService.connect() | Connection established in <3s |

### Execution

```bash
# Can run in parallel
curl http://localhost:3001/health
curl http://localhost:5173
# Frontend console check (manual or via Playwright)
# WebSocket connection test (via Playwright)
```

---

## Phase 2: Model Layer Integration

**Goal**: Verify API services work against real backend
**Duration**: 1 day
**Parallelism**: 4 test groups can run in parallel (one per API service)

### Test Groups

#### Group A: BoardAPI (INF-01 must pass first)

| ID | Test | Endpoint | Pass Criteria |
|----|------|----------|---------------|
| MOD-A1 | Create Board | POST /v1/boards | Returns board with ID |
| MOD-A2 | Get Board | GET /v1/boards/:id | Returns created board |
| MOD-A3 | Update Board | PATCH /v1/boards/:id | Name updates |
| MOD-A4 | Close Board | POST /v1/boards/:id/close | Status = closed |

#### Group B: CardAPI (INF-01 must pass first)

| ID | Test | Endpoint | Pass Criteria |
|----|------|----------|---------------|
| MOD-B1 | Create Card | POST /v1/boards/:id/cards | Returns card with ID |
| MOD-B2 | Get Cards | GET /v1/boards/:id/cards | Returns card array |
| MOD-B3 | Update Card | PATCH /v1/cards/:id | Content updates |
| MOD-B4 | Delete Card | DELETE /v1/cards/:id | Card removed |
| MOD-B5 | Link Cards | POST /v1/cards/:id/link | Parent-child created |

#### Group C: ReactionAPI (INF-01 must pass first)

| ID | Test | Endpoint | Pass Criteria |
|----|------|----------|---------------|
| MOD-C1 | Add Reaction | POST /v1/cards/:id/reactions | Reaction added |
| MOD-C2 | Remove Reaction | DELETE /v1/cards/:id/reactions/:type | Reaction removed |
| MOD-C3 | Reaction Limit | Add beyond limit | Returns 403/400 error |

#### Group D: SocketService (INF-04 must pass first)

| ID | Test | Event | Pass Criteria |
|----|------|-------|---------------|
| MOD-D1 | Join Board | join_board | Receives board:joined |
| MOD-D2 | Card Created | card:created | Event received <2s |
| MOD-D3 | Card Updated | card:updated | Event received <2s |
| MOD-D4 | Participant Join | participant:joined | Event received <2s |

---

## Phase 3: ViewModel Integration

**Goal**: Verify business logic hooks work with real API responses
**Duration**: 1 day
**Parallelism**: 3 test groups in parallel

### Test Groups

#### Group A: useBoardViewModel

| ID | Test | Scenario | Pass Criteria |
|----|------|----------|---------------|
| VM-A1 | Load Board | Navigate to /boards/:id | Board state populated |
| VM-A2 | Board Not Found | Navigate to invalid ID | Error state set |
| VM-A3 | Close Board | Admin closes board | UI reflects closed state |

#### Group B: useCardViewModel

| ID | Test | Scenario | Pass Criteria |
|----|------|----------|---------------|
| VM-B1 | Create Card | Submit card form | Card appears in column |
| VM-B2 | Edit Card | Update card content | Content persists after refresh |
| VM-B3 | Delete Card | Remove card | Card disappears |
| VM-B4 | Optimistic Update | Create card offline | Rollback on failure |

#### Group C: useParticipantViewModel

| ID | Test | Scenario | Pass Criteria |
|----|------|----------|---------------|
| VM-C1 | Self Displayed | Load board | Current user in participant list |
| VM-C2 | Other Joins | Second browser joins | Participant count increases |
| VM-C3 | Other Leaves | Second browser closes | Participant count decreases |

---

## Phase 4: E2E Critical Path

**Goal**: Fix highest-priority user journeys
**Duration**: 1.5 days
**Parallelism**: 2 test suites at a time (to avoid board state conflicts)

### Priority Order

| Priority | Test Suite | File | Est. Fix Time |
|----------|-----------|------|---------------|
| P0 | Board Creation | 01-board-creation.spec.ts | 2h |
| P0 | Board Lifecycle | 02-board-lifecycle.spec.ts | 2h |
| P1 | Retro Session | 03-retro-session.spec.ts | 3h |
| P1 | Card Quota | 04-card-quota.spec.ts | 2h |

### P0: Board Creation (13 tests)

| Test | Current Issue | Fix Strategy |
|------|---------------|--------------|
| displays home page | Selector mismatch | Verify data-testid="home-page" |
| displays logo | Timing | Add waitForLoadState |
| clicking Create opens dialog | Missing selector | Add data-testid="create-board-dialog" |
| creates board and navigates | Navigation timing | Increase timeout to 15s |

### P0: Board Lifecycle (9 tests)

| Test | Current Issue | Fix Strategy |
|------|---------------|--------------|
| board displays header | Board not loading | Check getBoardId() returns valid ID |
| can create cards | Card not appearing | Wait for API response before assertion |
| admin can close board | Close button not found | Verify admin detection logic |

---

## Phase 5: E2E Extended

**Goal**: Fix remaining test suites
**Duration**: 1.5 days
**Parallelism**: 3 test suites at a time

| Priority | Test Suite | File | Est. Fix Time |
|----------|-----------|------|---------------|
| P1 | Sorting/Filtering | 05-sorting-filtering.spec.ts | 2h |
| P1 | Parent-Child | 06-parent-child-cards.spec.ts | 2h |
| P2 | Admin Ops | 07-admin-operations.spec.ts | 2h |
| P2 | Tablet Viewport | 08-tablet-viewport.spec.ts | 1h |
| P2 | Drag-Drop | 09-drag-drop.spec.ts | 3h |
| P3 | Accessibility | 10-accessibility-basic.spec.ts | 2h |

---

## Phase 6: Full Regression

**Goal**: Verify all tests pass together
**Duration**: 0.5 day
**Parallelism**: Sequential (final validation)

### Execution

```bash
# Run complete suite
cd frontend
npm run test:e2e

# Expected outcome: 79/79 passing
```

---

## Known Issues & Mitigations

### Timing Issues

| Issue | Current Timeout | Recommended |
|-------|-----------------|-------------|
| Action timeout | 10s | 15s |
| Navigation timeout | 15s | 20s |
| WebSocket wait | implicit | Explicit 5s wait |

### Selector Issues

| Component | Current Selector | Actual DOM | Fix |
|-----------|-----------------|------------|-----|
| Home page | data-testid="home-page" | ? | Verify in browser |
| Board header | data-testid="board-header" | ? | Verify in browser |
| Card element | data-testid^="card-" | ? | Verify in browser |

### Test Data Isolation

```typescript
// Current: Shared board IDs across tests (risky)
const testBoardId = getBoardId('lifecycle');

// Recommended: Each test creates its own board
test.beforeEach(async ({ page }) => {
  const board = await createTestBoard(page);
  testBoardId = board.id;
});
```

---

## Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| E2E Pass Rate | 95%+ | 29.1% |
| Flaky Test Rate | <5% | Unknown |
| Test Duration | <10 min | 8.5 min |
| Zero skipped tests | 0 | 5 |

---

## Appendix A: Test Environment Setup

```bash
# 1. Start backend (Docker)
docker-compose -f docker-compose.test.yml up -d

# 2. Verify backend health
curl http://localhost:3001/health

# 3. Start frontend
cd frontend && npm run dev

# 4. Run E2E tests
npm run test:e2e

# 5. View report
npx playwright show-report
```

---

## Appendix B: Debug Commands

```bash
# Run single test with debug
npx playwright test board-creation --debug

# Run with headed browser
npx playwright test --headed

# Generate trace for failed tests
npx playwright test --trace on

# View traces
npx playwright show-trace trace.zip
```

---

*Document generated: 2026-01-01*
