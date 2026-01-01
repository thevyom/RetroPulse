# QA Execution Task List: Integration Testing

**Version**: 1.0
**Date**: 2026-01-01
**Est. Duration**: 4-5 days (with parallelism)
**Team Size**: 2 QA engineers recommended

---

## Task Execution Overview

```
                                    DAY 1
    ┌──────────────────────────────────────────────────────────────┐
    │  MORNING: Infrastructure (QA-1 + QA-2 parallel)              │
    │  ┌─────────────────┐  ┌─────────────────┐                    │
    │  │ QA-1: INF-01-02 │  │ QA-2: INF-03-04 │                    │
    │  │ Health Checks   │  │ CORS + WebSocket│                    │
    │  └────────┬────────┘  └────────┬────────┘                    │
    │           └────────────────────┘                             │
    │                      ▼                                       │
    │  AFTERNOON: Model Layer (QA-1 + QA-2 parallel)               │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
    │  │ BoardAPI    │  │ CardAPI     │  │ ReactionAPI │          │
    │  │ (QA-1)      │  │ (QA-2)      │  │ (QA-1 after)│          │
    │  └─────────────┘  └─────────────┘  └─────────────┘          │
    └──────────────────────────────────────────────────────────────┘

                                    DAY 2
    ┌──────────────────────────────────────────────────────────────┐
    │  Model Layer Continued + ViewModel                           │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
    │  │ SocketSvc   │  │ BoardVM     │  │ CardVM      │          │
    │  │ (QA-1)      │  │ (QA-2)      │  │ (QA-1 after)│          │
    │  └─────────────┘  └─────────────┘  └─────────────┘          │
    └──────────────────────────────────────────────────────────────┘

                                    DAY 3
    ┌──────────────────────────────────────────────────────────────┐
    │  E2E Critical Path (P0)                                      │
    │  ┌─────────────────────────┐  ┌─────────────────────────┐   │
    │  │ 01-board-creation       │  │ 02-board-lifecycle      │   │
    │  │ (QA-1)                  │  │ (QA-2)                  │   │
    │  └─────────────────────────┘  └─────────────────────────┘   │
    └──────────────────────────────────────────────────────────────┘

                                    DAY 4
    ┌──────────────────────────────────────────────────────────────┐
    │  E2E Extended (P1/P2)                                        │
    │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
    │  │ 03-retro  │  │ 04-quota  │  │ 05-sort   │  │ 06-parent │ │
    │  │ (QA-1)    │  │ (QA-2)    │  │ (QA-1)    │  │ (QA-2)    │ │
    │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
    └──────────────────────────────────────────────────────────────┘

                                    DAY 5
    ┌──────────────────────────────────────────────────────────────┐
    │  E2E Extended + Regression                                   │
    │  ┌───────────┐  ┌───────────┐  ┌─────────────────────────┐  │
    │  │ 07-admin  │  │ 08-tablet │  │ Full Regression         │  │
    │  │ 09-dnd    │  │ 10-a11y   │  │ (Both QAs)              │  │
    │  └───────────┘  └───────────┘  └─────────────────────────┘  │
    └──────────────────────────────────────────────────────────────┘
```

---

## Pre-Requisites Checklist

Before starting, ensure:

- [ ] Docker Desktop running
- [ ] Node.js 18+ installed
- [ ] Git repository cloned
- [ ] Backend containers healthy
- [ ] Frontend dev server startable

```bash
# Verification commands
docker --version
node --version
cd RetroPulse && git status
docker-compose -f docker-compose.test.yml ps
cd frontend && npm run dev
```

---

## PHASE 1: Infrastructure Validation

**Duration**: 2 hours
**Parallelism**: All 4 tasks can run in parallel

### Task INF-01: Backend Health Check
**Assignee**: QA-1 | **Est**: 15 min

- [ ] Start backend containers
  ```bash
  docker-compose -f docker-compose.test.yml up -d
  ```
- [ ] Wait for containers to be healthy (30s)
- [ ] Execute health check
  ```bash
  curl http://localhost:3001/health
  ```
- [ ] Verify response: `{ "status": "ok" }`
- [ ] Document: Backend version, response time

**Pass Criteria**: Health endpoint returns 200 with status "ok"

**Result**: [ ] PASS / [ ] FAIL
**Notes**: _________________________________

---

### Task INF-02: Frontend Health Check
**Assignee**: QA-1 | **Est**: 15 min

- [ ] Start frontend dev server
  ```bash
  cd frontend && npm run dev
  ```
- [ ] Wait for Vite to compile (10-30s)
- [ ] Open browser to http://localhost:5173
- [ ] Verify React app loads (no white screen)
- [ ] Check browser console for errors

**Pass Criteria**: App renders without console errors

**Result**: [ ] PASS / [ ] FAIL
**Notes**: _________________________________

---

### Task INF-03: CORS Configuration
**Assignee**: QA-2 | **Est**: 20 min

- [ ] Open browser DevTools → Network tab
- [ ] Navigate to http://localhost:5173
- [ ] Trigger API call (click "Create Board" if available)
- [ ] Check for CORS errors in console
- [ ] Verify OPTIONS preflight succeeds (if applicable)

**Pass Criteria**: No CORS errors in browser console

**Result**: [ ] PASS / [ ] FAIL
**Notes**: _________________________________

---

### Task INF-04: WebSocket Connection
**Assignee**: QA-2 | **Est**: 30 min

- [ ] Open browser DevTools → Network tab → WS filter
- [ ] Navigate to a board: http://localhost:5173/boards/{boardId}
- [ ] Observe WebSocket connection attempt
- [ ] Verify connection established (status: 101)
- [ ] Verify "join_board" message sent
- [ ] Verify "board:joined" response received

**Pass Criteria**: WebSocket connects and handshake completes <3s

**Result**: [ ] PASS / [ ] FAIL
**Notes**: _________________________________

---

## PHASE 2: Model Layer Integration

**Duration**: 4 hours
**Parallelism**: Groups A, B, C can run in parallel; D requires INF-04

### Task Group MOD-A: BoardAPI Tests
**Assignee**: QA-1 | **Est**: 1 hour

Execute via browser DevTools console or Playwright:

- [ ] **MOD-A1**: Create Board
  ```javascript
  // In browser console on localhost:5173
  const res = await fetch('http://localhost:3001/v1/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Test Board',
      columns: [
        { id: 'col-1', name: 'What Went Well', type: 'feedback' },
        { id: 'col-2', name: 'To Improve', type: 'feedback' },
        { id: 'col-3', name: 'Action Items', type: 'action' }
      ]
    })
  });
  const data = await res.json();
  console.log('Board ID:', data.data.id);
  ```
  - [ ] Response status: 201
  - [ ] Response contains board ID
  - [ ] Record board ID: __________________

- [ ] **MOD-A2**: Get Board
  ```javascript
  const res = await fetch('http://localhost:3001/v1/boards/{boardId}');
  const data = await res.json();
  console.log(data);
  ```
  - [ ] Response status: 200
  - [ ] Board name matches

- [ ] **MOD-A3**: Update Board
  ```javascript
  const res = await fetch('http://localhost:3001/v1/boards/{boardId}', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Updated Board Name' })
  });
  ```
  - [ ] Response status: 200
  - [ ] Name updated

- [ ] **MOD-A4**: Close Board
  ```javascript
  const res = await fetch('http://localhost:3001/v1/boards/{boardId}/close', {
    method: 'POST'
  });
  ```
  - [ ] Response status: 200
  - [ ] Board status = closed

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

### Task Group MOD-B: CardAPI Tests
**Assignee**: QA-2 | **Est**: 1.5 hours

- [ ] Create a fresh board for card tests (use MOD-A1)
- [ ] Record board ID: __________________

- [ ] **MOD-B1**: Create Card
  ```javascript
  const res = await fetch('http://localhost:3001/v1/boards/{boardId}/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Test card content',
      column_id: 'col-1',
      card_type: 'feedback'
    })
  });
  const data = await res.json();
  console.log('Card ID:', data.data.id);
  ```
  - [ ] Response status: 201
  - [ ] Card ID returned
  - [ ] Record card ID: __________________

- [ ] **MOD-B2**: Get Cards
  ```javascript
  const res = await fetch('http://localhost:3001/v1/boards/{boardId}/cards');
  const data = await res.json();
  console.log('Cards:', data.data.length);
  ```
  - [ ] Response status: 200
  - [ ] Created card in array

- [ ] **MOD-B3**: Update Card
  ```javascript
  const res = await fetch('http://localhost:3001/v1/cards/{cardId}', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Updated content' })
  });
  ```
  - [ ] Response status: 200
  - [ ] Content updated

- [ ] **MOD-B4**: Delete Card
  ```javascript
  const res = await fetch('http://localhost:3001/v1/cards/{cardId}', {
    method: 'DELETE'
  });
  ```
  - [ ] Response status: 200 or 204
  - [ ] Card no longer in GET response

- [ ] **MOD-B5**: Link Cards (Parent-Child)
  - [ ] Create parent card (action type in col-3)
  - [ ] Create child card (feedback type in col-1)
  ```javascript
  const res = await fetch('http://localhost:3001/v1/cards/{childId}/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent_card_id: '{parentId}' })
  });
  ```
  - [ ] Response status: 200
  - [ ] Child card has parent_card_id set

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

### Task Group MOD-C: ReactionAPI Tests
**Assignee**: QA-1 (after MOD-A) | **Est**: 30 min

- [ ] Use existing board and card from MOD-B
- [ ] Or create fresh test data

- [ ] **MOD-C1**: Add Reaction
  ```javascript
  const res = await fetch('http://localhost:3001/v1/cards/{cardId}/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'like' })
  });
  ```
  - [ ] Response status: 200 or 201
  - [ ] Reaction count increased

- [ ] **MOD-C2**: Remove Reaction
  ```javascript
  const res = await fetch('http://localhost:3001/v1/cards/{cardId}/reactions/like', {
    method: 'DELETE'
  });
  ```
  - [ ] Response status: 200 or 204
  - [ ] Reaction count decreased

- [ ] **MOD-C3**: Reaction Limit
  - [ ] Create board with reaction_limit: 2
  - [ ] Add 2 reactions (should succeed)
  - [ ] Add 3rd reaction (should fail)
  - [ ] Response status: 400 or 403

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

### Task Group MOD-D: SocketService Tests
**Assignee**: QA-2 (after INF-04) | **Est**: 1 hour

Use browser DevTools → Network → WS tab

- [ ] **MOD-D1**: Join Board Event
  - [ ] Connect to board
  - [ ] Verify "join_board" sent
  - [ ] Verify "board:joined" received with participant data

- [ ] **MOD-D2**: Card Created Event
  - [ ] Open second browser/incognito
  - [ ] Join same board
  - [ ] Create card in first browser
  - [ ] Verify second browser receives "card:created" <2s

- [ ] **MOD-D3**: Card Updated Event
  - [ ] Update card in first browser
  - [ ] Verify second browser receives "card:updated" <2s

- [ ] **MOD-D4**: Participant Joined Event
  - [ ] First browser joined to board
  - [ ] Open incognito and join board
  - [ ] Verify first browser receives "participant:joined" <2s

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

## PHASE 3: ViewModel Integration

**Duration**: 3 hours
**Parallelism**: Groups A, B, C can run in parallel

### Task Group VM-A: useBoardViewModel
**Assignee**: QA-2 | **Est**: 1 hour

Execute via Playwright or manual browser testing:

- [ ] **VM-A1**: Load Board Success
  - [ ] Navigate to http://localhost:5173/boards/{validBoardId}
  - [ ] Verify board header shows board name
  - [ ] Verify 3 columns rendered
  - [ ] Verify participant bar shows current user
  - [ ] Time to load: _______ seconds

- [ ] **VM-A2**: Board Not Found
  - [ ] Navigate to http://localhost:5173/boards/invalid-id-12345
  - [ ] Verify error message displayed
  - [ ] Verify no JS console errors (graceful failure)

- [ ] **VM-A3**: Close Board Reflects
  - [ ] As admin, click "Close Board"
  - [ ] Verify lock icon appears
  - [ ] Verify add buttons disabled
  - [ ] Verify cards still visible (read-only)

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

### Task Group VM-B: useCardViewModel
**Assignee**: QA-1 | **Est**: 1 hour

- [ ] **VM-B1**: Create Card via UI
  - [ ] Click "Add card" button on column 1
  - [ ] Fill dialog: content = "VM Test Card"
  - [ ] Click "Create"
  - [ ] Verify card appears in column
  - [ ] Verify card persists after page refresh

- [ ] **VM-B2**: Edit Card via UI
  - [ ] Click on existing card
  - [ ] Edit content to "Updated VM Test Card"
  - [ ] Save changes
  - [ ] Verify content updated
  - [ ] Verify persists after refresh

- [ ] **VM-B3**: Delete Card via UI
  - [ ] Hover over card
  - [ ] Click delete button
  - [ ] Confirm deletion
  - [ ] Verify card removed
  - [ ] Verify not present after refresh

- [ ] **VM-B4**: Optimistic Update (Advanced)
  - [ ] Disconnect backend temporarily
  - [ ] Attempt card creation
  - [ ] Verify error message (toast)
  - [ ] Verify UI rollback

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

### Task Group VM-C: useParticipantViewModel
**Assignee**: QA-1 or QA-2 | **Est**: 45 min

Requires two browser windows/contexts:

- [ ] **VM-C1**: Self Displayed
  - [ ] Join board in Browser 1
  - [ ] Verify your avatar appears in participant bar
  - [ ] Participant count = 1

- [ ] **VM-C2**: Other User Joins
  - [ ] Open incognito (Browser 2)
  - [ ] Join same board
  - [ ] In Browser 1, verify participant count = 2
  - [ ] Verify new avatar appears

- [ ] **VM-C3**: Other User Leaves
  - [ ] Close Browser 2
  - [ ] In Browser 1, verify participant count = 1 (within 30s)
  - [ ] Verify avatar removed

**Group Result**: [ ] PASS / [ ] FAIL
**Issues Found**: _________________________________

---

## PHASE 4: E2E Critical Path (P0)

**Duration**: 4 hours
**Parallelism**: 2 suites can run in parallel (different board IDs)

### Task E2E-01: Board Creation Suite
**Assignee**: QA-1 | **Est**: 2 hours

```bash
cd frontend
npx playwright test 01-board-creation.spec.ts --headed --debug
```

For each failing test, document:

| Test Name | Status | Error Message | Fix Needed |
|-----------|--------|---------------|------------|
| displays home page | | | |
| displays logo | | | |
| displays tagline | | | |
| displays Create button | | | |
| displays feature list | | | |
| clicking Create opens dialog | | | |
| dialog shows input | | | |
| dialog shows columns | | | |
| submit disabled when empty | | | |
| submit enabled with name | | | |
| creates board and navigates | | | |
| created board has columns | | | |
| cancel closes dialog | | | |

**Suite Result**: ___/13 passing
**Issues Found**: _________________________________

---

### Task E2E-02: Board Lifecycle Suite
**Assignee**: QA-2 | **Est**: 2 hours

```bash
cd frontend
npx playwright test 02-board-lifecycle.spec.ts --headed --debug
```

| Test Name | Status | Error Message | Fix Needed |
|-----------|--------|---------------|------------|
| board displays header | | | |
| admin can rename board | | | |
| can create cards | | | |
| admin can close board | | | |
| closed board shows lock | | | |
| closed board disables add | | | |
| closed board cards visible | | | |
| column rename persists | | | |
| closed board accessible | | | |

**Suite Result**: ___/9 passing
**Issues Found**: _________________________________

---

## PHASE 5: E2E Extended (P1/P2)

**Duration**: 6 hours
**Parallelism**: 2-3 suites at a time

### Task E2E-03: Retro Session
**Assignee**: QA-1 | **Est**: 2 hours

```bash
npx playwright test 03-retro-session.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-04: Card Quota
**Assignee**: QA-2 | **Est**: 1.5 hours

```bash
npx playwright test 04-card-quota.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-05: Sorting/Filtering
**Assignee**: QA-1 | **Est**: 1.5 hours

```bash
npx playwright test 05-sorting-filtering.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-06: Parent-Child Cards
**Assignee**: QA-2 | **Est**: 1.5 hours

```bash
npx playwright test 06-parent-child-cards.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-07: Admin Operations
**Assignee**: QA-1 | **Est**: 1 hour

```bash
npx playwright test 07-admin-operations.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-08: Tablet Viewport
**Assignee**: QA-2 | **Est**: 1 hour

```bash
npx playwright test 08-tablet-viewport.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-09: Drag-Drop
**Assignee**: QA-1 | **Est**: 2 hours

```bash
npx playwright test 09-drag-drop.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

### Task E2E-10: Accessibility
**Assignee**: QA-2 | **Est**: 1.5 hours

```bash
npx playwright test 10-accessibility-basic.spec.ts --headed
```

**Suite Result**: ___/___ passing
**Issues Found**: _________________________________

---

## PHASE 6: Full Regression

**Duration**: 2 hours
**Parallelism**: Sequential (final validation)

### Task REG-01: Complete Test Run
**Assignee**: Both QA | **Est**: 2 hours

```bash
cd frontend
npm run test:e2e
```

- [ ] All 79 tests executed
- [ ] Passing: ___
- [ ] Failing: ___
- [ ] Skipped: ___

**Generate Report**:
```bash
npx playwright show-report
```

- [ ] Screenshot report saved
- [ ] Trace files saved for failures

---

## Issue Tracking Template

For each issue found, create entry:

```markdown
### Issue #___

**Test**: [Test file and name]
**Phase**: [INF/MOD/VM/E2E]
**Severity**: [Blocker/Critical/Major/Minor]
**Assigned To**: [Dev name]

**Description**:
[What happened vs. what was expected]

**Steps to Reproduce**:
1.
2.
3.

**Error Message**:
```
[paste error]
```

**Screenshot**: [attach if applicable]

**Suggested Fix**:
[If known]

**Status**: [ ] Open / [ ] In Progress / [ ] Fixed / [ ] Verified
```

---

## Daily Standup Template

```markdown
## Day ___ Standup

### QA-1
**Completed**:
**In Progress**:
**Blocked**:
**Issues Found**:

### QA-2
**Completed**:
**In Progress**:
**Blocked**:
**Issues Found**:

### Overall Progress
- Phase 1: ___% complete
- Phase 2: ___% complete
- Phase 3: ___% complete
- Phase 4: ___% complete
- Phase 5: ___% complete
- Phase 6: ___% complete
```

---

## Sign-Off

| Phase | QA-1 Sign-Off | QA-2 Sign-Off | Date |
|-------|---------------|---------------|------|
| Infrastructure | | | |
| Model Layer | | | |
| ViewModel | | | |
| E2E Critical | | | |
| E2E Extended | | | |
| Full Regression | | | |

**Final Approval**: _______________________
**Date**: _______________

---

*Document generated: 2026-01-01*
