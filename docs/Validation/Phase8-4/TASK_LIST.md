# Task List - Bug Fixes Session 01012330

**Created**: 2026-01-01 23:30
**Updated**: 2026-01-02 (UTB-014 Clean Solution Tasks Added)
**Status**: Ready for Execution

---

## Execution Summary

| Phase | Tasks | Parallel? | Est. Time |
|-------|-------|-----------|-----------|
| 1 | Unit Test Fixes (3 tasks) | No (same codebase area) | 30 min |
| 2 | Runtime Bug Fixes (2 tasks) | Yes (independent bugs) | 20 min |
| 3 | E2E Test Fix (1 task) | Yes | 10 min |
| 4 | Full Verification | No | 15 min |
| 7 | **UTB-014 Clean Solution (3 tasks)** | Partial (backend first) | 45 min |

---

## Parallel Agent Strategy

### Recommended: 4 Agents in Parallel

| Agent | Phase | Tasks | Files |
|-------|-------|-------|-------|
| Agent 1 | 1 | Unit Tests 1.1-1.3 | Test files (sequential) |
| Agent 2 | 2 | UTB-024 (Unlink) | CardAPI.ts, useCardViewModel.ts |
| Agent 3 | 2 | UTB-025 (Aggregated Count) | cardStore.ts |
| Agent 4 | 3 | Touch Target | RetroColumn.tsx or spec |

All 4 agents can run simultaneously since they touch different files.

---

## Phase 1: Unit Test Fixes (Sequential)

### Task 1.1: Fix RetroCard Aria-Label Test

**Status**: [ ] Not Started
**Priority**: P0
**Est. Time**: 5 min

**Agent Prompt**:
```
You are a Software Developer fixing a failing unit test.

Issue: RetroCard.test.tsx has a test checking the drag handle aria-label, but the source was updated and the test assertion is stale.

Task:
1. Read frontend/tests/unit/features/card/components/RetroCard.test.tsx
2. Find the test that checks aria-label for the drag handle
3. Read frontend/src/features/card/components/RetroCard.tsx to see the current aria-label value
4. Update the test assertion to match the current aria-label:
   "Drag handle - press Space to pick up, arrow keys to move, Space to drop"
5. Run: npm run test:run -- tests/unit/features/card/components/RetroCard.test.tsx -t "aria-label"
6. Verify test passes

IMPORTANT: Create docs/Validation/01012330/BugFixReport_Task1.1.md
```

**Files**:
- `frontend/tests/unit/features/card/components/RetroCard.test.tsx`

**Verification**:
```bash
npm run test:run -- tests/unit/features/card/components/RetroCard.test.tsx
```

---

### Task 1.2: Fix RetroColumn Timeout Tests

**Status**: [ ] Not Started
**Priority**: P0
**Est. Time**: 15 min

**Agent Prompt**:
```
You are a Software Developer fixing timeout issues in unit tests.

Issue: RetroColumn.test.tsx has 2 tests timing out:
- "should allow posting anonymously"
- "should call onEditColumnTitle when new name is submitted"

Task:
1. Read frontend/tests/unit/features/card/components/RetroColumn.test.tsx
2. Find the failing tests (search for "posting anonymously" and "onEditColumnTitle")
3. Analyze why they timeout:
   - Check if mocks are properly set up
   - Check if waitFor conditions can be met
   - Check if dialog interactions are awaited
4. Fix the tests by:
   - Ensuring mocks resolve correctly
   - Adding proper waits with increased timeout if needed
   - Wrapping state updates in act() if needed
5. Run: npm run test:run -- tests/unit/features/card/components/RetroColumn.test.tsx
6. Verify all 19 tests pass

IMPORTANT: Create docs/Validation/01012330/BugFixReport_Task1.2.md
```

**Files**:
- `frontend/tests/unit/features/card/components/RetroColumn.test.tsx`

**Verification**:
```bash
npm run test:run -- tests/unit/features/card/components/RetroColumn.test.tsx
```

---

### Task 1.3: Fix CreateBoardDialog Timeout Tests

**Status**: [ ] Not Started
**Priority**: P0
**Est. Time**: 20 min

**Agent Prompt**:
```
You are a Software Developer fixing timeout issues in unit tests.

Issue: CreateBoardDialog.test.tsx has 3 tests timing out:
- "should clear alias error when user types"
- "should show error and not navigate on API error"
- "should show validation error for invalid alias"

Task:
1. Read frontend/tests/unit/features/board/components/CreateBoardDialog.test.tsx
2. Find the failing tests
3. Analyze why they timeout:
   - Check BoardAPI mock setup
   - Check navigation mock setup
   - Check if async operations are properly awaited
4. Fix the tests by:
   - Ensuring API mocks return proper responses
   - Adding proper waits for async state updates
   - Ensuring dialog state changes are observable
5. Run: npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx
6. Verify all tests pass

IMPORTANT: Create docs/Validation/01012330/BugFixReport_Task1.3.md
```

**Files**:
- `frontend/tests/unit/features/board/components/CreateBoardDialog.test.tsx`

**Verification**:
```bash
npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx
```

---

## Phase 2: Runtime Bug Fixes (Parallel)

### Task 2.1: UTB-024 - Fix Child Card Unlink

**Status**: [ ] Not Started
**Priority**: P0
**Est. Time**: 15 min
**Can Run Parallel**: Yes (independent files)

**Agent Prompt**:
```
You are a Software Developer fixing bug UTB-024: Child Card Unlink Not Working

Bug Description:
When clicking the unlink button (Link2 icon) on a child card, nothing happens. The card remains linked to its parent.

Context:
- The unlink button is at RetroCard.tsx line 356
- It calls onUnlinkFromParent() which maps to onUnlinkChild(card.id)
- This calls cardVM.handleUnlinkChild(childId) in useCardViewModel.ts line 651
- The API call is CardAPI.unlinkCards(parentId, { target_card_id: childId, link_type: 'parent_of' })

Suspected Issues:
1. DELETE request with body may not work correctly in axios
2. API endpoint may expect different parameters or path

Task:
1. Read docs/Validation/01012330/USER_TESTING_BUGS_01012330.md (UTB-024)
2. Read docs/Validation/01012330/TASK_LIST.md (Task 2.1)
3. Read the following files:
   - frontend/src/models/api/CardAPI.ts (line 131)
   - frontend/src/features/card/viewmodels/useCardViewModel.ts (line 651)
   - frontend/src/features/card/components/RetroCard.tsx (line 356)

4. Debug the issue:
   - Add console.log in handleUnlinkChild to verify it's called
   - Check browser dev tools for API request/response
   - Test the API directly with curl if possible

5. Fix the issue (likely one of):
   - Change DELETE to use query params: /cards/{parentId}/link?target_card_id=X&link_type=parent_of
   - Or change to POST /cards/{parentId}/unlink with body
   - Or fix axios configuration for DELETE with body

6. Add unit test for unlinkCards API call
7. Run: npm run test:run -- tests/unit/models/api/CardAPI.test.ts
8. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01012330/BugFixReport_UTB-024.md with:
- Bug information
- Root cause analysis
- Solution implemented with code snippets
- Test results
- Verification checklist

Focus only on UTB-024. Do not modify other bugs.
```

**Files to Modify**:
- `frontend/src/models/api/CardAPI.ts`
- Possibly `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Tests Required**:
- `frontend/tests/unit/models/api/CardAPI.test.ts`

---

### Task 2.2: UTB-025 - Fix Parent Aggregated Count on Child Reaction

**Status**: [ ] Not Started
**Priority**: P0
**Est. Time**: 15 min
**Can Run Parallel**: Yes (independent files)

**Agent Prompt**:
```
You are a Software Developer fixing bug UTB-025: Parent Aggregated Count Not Updated on Child Reaction

Bug Description:
When adding/removing a reaction to a child card, the parent's aggregated_reaction_count does not update. Only the child's direct_reaction_count changes.

Context:
- Reactions are handled in useCardViewModel.ts handleAddReaction/handleRemoveReaction
- These call cardStore.incrementReactionCount/decrementReactionCount
- The store actions only update the target card, not the parent

Root Cause:
The incrementReactionCount and decrementReactionCount functions in cardStore.ts (lines ~160-190) only update the specific card's counts. They don't propagate changes to the parent's aggregated_reaction_count.

Task:
1. Read docs/Validation/01012330/USER_TESTING_BUGS_01012330.md (UTB-025)
2. Read docs/Validation/01012330/TASK_LIST.md (Task 2.2)
3. Read the following files:
   - frontend/src/models/stores/cardStore.ts (incrementReactionCount, decrementReactionCount)
   - frontend/tests/unit/models/stores/cardStore.test.ts

4. Implement the fix in cardStore.ts:
   - In incrementReactionCount: After updating the card, check if card.parent_card_id exists
   - If parent exists, also update parent.aggregated_reaction_count (+1)
   - Also update the child entry in parent.children array
   - Apply same pattern to decrementReactionCount (-1)

5. Add unit tests for the new behavior:
   - Test that child reaction increments parent aggregated count
   - Test that child reaction decrements parent aggregated count
   - Test that parent.children array is updated

6. Run: npm run test:run -- tests/unit/models/stores/cardStore.test.ts
7. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01012330/BugFixReport_UTB-025.md with:
- Bug information
- Root cause analysis
- Solution implemented with code snippets
- Test results
- Verification checklist

Focus only on UTB-025. Do not modify other bugs.
```

**Files to Modify**:
- `frontend/src/models/stores/cardStore.ts`

**Tests Required**:
- `frontend/tests/unit/models/stores/cardStore.test.ts`

---

## Phase 3: E2E Test Fix

### Task 3.1: Fix Touch Target Size Test

**Status**: [ ] Not Started
**Priority**: P1
**Est. Time**: 10 min

**Agent Prompt**:
```
You are a Software Developer fixing an E2E test assertion.

Issue: 08-tablet-viewport.spec.ts test "add card button is easily tappable" fails because button is 28px but test expects >= 32px.

Options:
A) Increase button size in RetroColumn.tsx from h-7 w-7 to h-8 w-8
B) Relax test assertion from 32 to 28 (still above WCAG 24px minimum)

Task:
1. Read frontend/tests/e2e/08-tablet-viewport.spec.ts - find the failing assertion
2. Read frontend/src/features/card/components/RetroColumn.tsx - find the Add Card button
3. Choose option A or B based on:
   - Option A: Better UX for touch devices
   - Option B: Minimal change, keeps existing design
4. Implement the fix
5. Run: BACKEND_URL=http://localhost:3001 npx playwright test 08-tablet-viewport.spec.ts -g "add card button"
6. Verify test passes

Recommendation: Option A (h-8 w-8 = 32px) for better touch accessibility

IMPORTANT: Create docs/Validation/01012330/BugFixReport_Task2.1.md
```

**Files** (choose one):
- `frontend/src/features/card/components/RetroColumn.tsx` (Option A)
- `frontend/tests/e2e/08-tablet-viewport.spec.ts` (Option B)

**Verification**:
```bash
BACKEND_URL=http://localhost:3001 npx playwright test 08-tablet-viewport.spec.ts -g "tappable"
```

---

## Phase 4: Full Verification

### Task 4.1: Run Full Unit Test Suite

**Status**: [ ] Not Started
**Priority**: P0

**Command**:
```bash
cd frontend && npm run test:run
```

**Expected**: 956+ tests pass, 0 failed

---

### Task 4.2: Run Full E2E Test Suite

**Status**: [ ] Not Started
**Priority**: P1

**Command**:
```bash
cd frontend && BACKEND_URL=http://localhost:3001 npm run test:e2e
```

**Expected**: 61+ pass, ~9 fail (drag-related), ~22 skip

---

## Progress Tracking

### Phase 1 Status (Unit Test Fixes)

| Task | Description | Status | Report |
|------|-------------|--------|--------|
| 1.1 | RetroCard aria-label | [x] DONE | Fixed aria-label assertions |
| 1.2 | RetroColumn timeouts | [x] DONE | Tests pass (was transient) |
| 1.3 | CreateBoardDialog timeouts | [x] DONE | Tests pass (was transient) |

### Phase 2 Status (Runtime Bug Fixes)

| Task | Bug | Description | Status | Report |
|------|-----|-------------|--------|--------|
| 2.1 | UTB-024 | Child card unlink | [ ] | - |
| 2.2 | UTB-025 | Parent aggregated count | [ ] | - |

### Phase 3 Status (E2E Test Fix)

| Task | Description | Status | Report |
|------|-------------|--------|--------|
| 3.1 | Touch target size | [x] DONE | Button h-7→h-8 (28→32px) |

### Phase 4 Status (Verification)

| Task | Description | Status | Result |
|------|-------------|--------|--------|
| 4.1 | Full unit tests | [x] DONE | 962 pass, 1 skip |
| 4.2 | Full E2E tests | [x] DONE | 80 pass, 13 fail, 20 skip |

## E2E Test Failure Summary (01012330)

### Expected Failures (E2E-002 - @dnd-kit Infrastructure)
- 4 tests in 06-parent-child-cards.spec.ts (drag operations)

### New Issues Found
| Test | Issue | Suggested Fix |
|------|-------|---------------|
| touch target sizes are adequate | Checks multiple elements | Needs review |
| drag handles have accessible names | aria-label pattern | Test selector issue |
| card owner can click content (x3) | Edit mode not triggered | Component behavior |
| parent card aggregated counts | UTB-016/UTB-025 related | Backend or store fix |
| avatar initials format (x2) | Test expects "JS" but gets "No participants" | Test setup issue |
| avatar tooltip (x1) | Hovering shows wrong tooltip | Selector targets wrong element |

### Root Cause: Admin Detection

Many tests fail because admin status is not reliably detected via WebSocket. See [ADMIN_TEST_BOARD_DESIGN.md](ADMIN_TEST_BOARD_DESIGN.md) for proposed solution.

---

## Agent Launch Strategy

### Option 1: Sequential (Safer, Slower)

Run all tasks sequentially with a single agent: 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 3.1

### Option 2: 4 Parallel Agents (Recommended)

Launch 4 agents simultaneously:

```
Agent 1: Tasks 1.1 → 1.2 → 1.3 (Unit tests - sequential within agent)
Agent 2: Task 2.1 (UTB-024 - Unlink)
Agent 3: Task 2.2 (UTB-025 - Aggregated Count)
Agent 4: Task 3.1 (Touch Target)
```

**Why this works**:
- Agent 1 touches only test files
- Agent 2 touches CardAPI.ts, useCardViewModel.ts
- Agent 3 touches only cardStore.ts
- Agent 4 touches RetroColumn.tsx or spec file
- No file conflicts between agents

---

## Agent Prompts for Parallel Launch

### Agent 1 Prompt (Unit Tests):
```
You are a Software Developer fixing failing unit tests.

Tasks (run sequentially):
1. Task 1.1: Fix RetroCard aria-label assertion
2. Task 1.2: Fix RetroColumn timeout tests
3. Task 1.3: Fix CreateBoardDialog timeout tests

Read docs/Validation/01012330/TASK_LIST.md for detailed instructions.

For each task:
- Identify the failing test
- Understand the root cause
- Fix the test
- Verify it passes
- Create bug fix report

Run full unit suite when done: npm run test:run
```

### Agent 2 Prompt (UTB-024):
See Task 2.1 agent prompt above.

### Agent 3 Prompt (UTB-025):
See Task 2.2 agent prompt above.

### Agent 4 Prompt (Touch Target):
See Task 3.1 agent prompt above.

---

## Success Criteria

- [x] All 6 failing unit tests now pass (Tasks 1.1-1.3)
- [ ] UTB-024: Child cards can be unlinked successfully (Task 2.1)
- [ ] UTB-025: Parent aggregated count updates on child reactions (Task 2.2)
- [x] E2E touch target test passes (Task 3.1)
- [x] Full unit suite: 962 pass, 1 skip
- [x] Full E2E suite: 80 pass, 13 fail, 20 skip
- [x] No regressions in previously passing tests

---

## Phase 5: Admin Test Infrastructure (NEW)

Reference: [ADMIN_TEST_BOARD_DESIGN.md](ADMIN_TEST_BOARD_DESIGN.md)

### Task 5.1: Backend - Accept session_id in Create Board API

**Status**: [ ] Not Started
**Priority**: P1
**Blocked By**: None

**Agent Prompt**:
```
You are a Software Developer adding session_id support to the create board API.

Task:
1. Read backend/routes/boards.ts - POST /boards endpoint
2. Add optional session_id field to CreateBoardDTO
3. If session_id is provided, use it instead of generating one
4. Store creator_session_id in board document
5. Add unit test for this behavior
6. Run: npm run test (backend)

IMPORTANT: This is for E2E testing only - validate session_id format
```

**Files**:
- `backend/routes/boards.ts`
- `backend/models/Board.ts`
- `backend/tests/boards.test.ts`

---

### Task 5.2: E2E Infrastructure - Create Admin Board in Setup

**Status**: [ ] Not Started
**Priority**: P1
**Blocked By**: Task 5.1

**Agent Prompt**:
```
You are a Software Developer updating E2E test infrastructure.

Task:
1. Read frontend/tests/e2e/global-setup.ts
2. Add ADMIN_SESSION_ID constant: 'e2e-admin-session-12345'
3. Create admin board with known session_id
4. Store admin board info in .test-boards.json:
   { admin: { id: "...", sessionId: "e2e-admin-session-12345" } }
5. Run: npx playwright test --grep "Home Page" (verify setup works)

IMPORTANT: Admin board must have known session_id for deterministic admin status
```

**Files**:
- `frontend/tests/e2e/global-setup.ts`
- `frontend/tests/e2e/.test-boards.json`

---

### Task 5.3: E2E Helpers - Create Admin Session Utility

**Status**: [ ] Not Started
**Priority**: P1
**Blocked By**: Task 5.2

**Agent Prompt**:
```
You are a Software Developer creating E2E test utilities.

Task:
1. Create frontend/tests/e2e/utils/admin-helpers.ts
2. Implement setupAdminSession(page: Page):
   - Load admin board ID and sessionId from .test-boards.json
   - Set localStorage 'session_id' to known admin session
   - Navigate to admin board
   - Wait for admin dropdown to be visible
3. Add TypeScript types for test board config
4. Export utility for use in tests

Usage in tests:
  import { setupAdminSession } from './utils/admin-helpers';
  await setupAdminSession(page);
  // Now guaranteed to have admin status
```

**Files**:
- `frontend/tests/e2e/utils/admin-helpers.ts` (new)
- `frontend/tests/e2e/utils/index.ts`

---

### Task 5.4: Migrate Admin-Requiring Tests

**Status**: [ ] Not Started
**Priority**: P2
**Blocked By**: Task 5.3

**Agent Prompt**:
```
You are a Software Developer migrating E2E tests to use admin board.

Task:
1. Identify tests that require admin status:
   - 02-board-lifecycle.spec.ts (rename, close)
   - 03-retro-session.spec.ts (close board)
   - 11-bug-regression.spec.ts (admin actions)

2. Update tests to use setupAdminSession() helper
3. Remove workarounds and retry logic
4. Run affected test files to verify

Expected: Tests should pass reliably without timing issues
```

**Files**:
- `frontend/tests/e2e/02-board-lifecycle.spec.ts`
- `frontend/tests/e2e/03-retro-session.spec.ts`
- `frontend/tests/e2e/11-bug-regression.spec.ts`

---

## Phase 6: Fix Remaining E2E Test Failures (NEW)

### Task 6.1: Fix Card Content Editing Tests (UTB-020)

**Status**: [ ] Not Started
**Priority**: P1
**Related E2E Tests**: 3 failing in 11-bug-regression.spec.ts

**Issue**: Card edit mode not triggered when clicking content.

**Agent Prompt**:
```
You are a Software Developer fixing card editing E2E tests.

Tests Failing:
- "card owner can click content to enter edit mode"
- "edited content is saved on blur"
- "Escape key cancels edit without saving"

Task:
1. Read frontend/src/features/card/components/RetroCard.tsx - edit mode logic
2. Read frontend/tests/e2e/11-bug-regression.spec.ts - failing tests
3. Debug:
   - Is click event reaching the component?
   - Is isOwner prop correctly passed?
   - Is isClosed preventing edits?
4. Fix either component or test as appropriate
5. Run: BACKEND_URL=http://localhost:3001 npx playwright test 11-bug-regression.spec.ts -g "UTB-020"
```

**Files**:
- `frontend/src/features/card/components/RetroCard.tsx`
- `frontend/tests/e2e/11-bug-regression.spec.ts`

---

### Task 6.2: Fix Avatar Initials Tests (UTB-021)

**Status**: [ ] Not Started
**Priority**: P2
**Related E2E Tests**: 2 failing in 11-bug-regression.spec.ts

**Issue**: Test expects "JS" initials but gets "No participants yet".

**Root Cause**: Test setup doesn't wait for participants to load.

**Agent Prompt**:
```
You are a Software Developer fixing avatar initials E2E tests.

Tests Failing:
- "single name shows first two letters"
- "two-word name shows first and last initials"

Task:
1. Read frontend/tests/e2e/11-bug-regression.spec.ts - UTB-021 tests
2. Analyze test setup - is participant data loading?
3. Add wait for participant bar to have non-empty avatars
4. Ensure alias is correctly set before checking initials
5. Run: BACKEND_URL=http://localhost:3001 npx playwright test 11-bug-regression.spec.ts -g "UTB-021"
```

**Files**:
- `frontend/tests/e2e/11-bug-regression.spec.ts`

---

### Task 6.3: Fix Avatar Tooltip Test (UTB-022)

**Status**: [ ] Not Started
**Priority**: P2
**Related E2E Tests**: 1 failing in 11-bug-regression.spec.ts

**Issue**: Tooltip shows "All Users" instead of user name.

**Root Cause**: Test hovers wrong avatar (All Users instead of specific user).

**Agent Prompt**:
```
You are a Software Developer fixing avatar tooltip E2E test.

Test Failing:
- "hovering avatar shows tooltip with full name"

Task:
1. Read frontend/tests/e2e/11-bug-regression.spec.ts - UTB-022 test
2. Fix selector to target user avatar, not All Users avatar
3. Ensure hover triggers tooltip display
4. Run: BACKEND_URL=http://localhost:3001 npx playwright test 11-bug-regression.spec.ts -g "UTB-022"
```

**Files**:
- `frontend/tests/e2e/11-bug-regression.spec.ts`

---

### Task 6.4: Fix Touch Target Sizes Test

**Status**: [ ] Not Started
**Priority**: P2
**Related E2E Tests**: 1 failing in 08-tablet-viewport.spec.ts

**Issue**: Test "touch target sizes are adequate" checks multiple elements.

**Agent Prompt**:
```
You are a Software Developer fixing touch target E2E test.

Test Failing:
- "touch target sizes are adequate" (different from "add card button is easily tappable")

Task:
1. Read frontend/tests/e2e/08-tablet-viewport.spec.ts - failing test
2. Identify which elements fail the 32px minimum check
3. Either:
   A) Update component CSS to increase touch targets
   B) Relax test assertion if 28px is acceptable
4. Run: BACKEND_URL=http://localhost:3001 npx playwright test 08-tablet-viewport.spec.ts
```

**Files**:
- `frontend/tests/e2e/08-tablet-viewport.spec.ts`
- Potentially multiple component files

---

### Task 6.5: Fix Drag Handle Accessibility Test

**Status**: [ ] Not Started
**Priority**: P2
**Related E2E Tests**: 1 failing in 10-accessibility-basic.spec.ts

**Issue**: Test expects specific aria-label pattern on drag handles.

**Agent Prompt**:
```
You are a Software Developer fixing accessibility E2E test.

Test Failing:
- "drag handles have accessible names"

Task:
1. Read frontend/tests/e2e/10-accessibility-basic.spec.ts - failing test
2. Read frontend/src/features/card/components/RetroCard.tsx - current aria-label
3. Update test selector to match new aria-label format:
   "Drag handle - press Space to pick up, arrow keys to move, Space to drop"
4. Run: BACKEND_URL=http://localhost:3001 npx playwright test 10-accessibility-basic.spec.ts -g "drag handles"
```

**Files**:
- `frontend/tests/e2e/10-accessibility-basic.spec.ts`

---

## Updated Phase Summary

| Phase | Tasks | Status | Notes |
|-------|-------|--------|-------|
| 1 | Unit Test Fixes (1.1-1.3) | [x] Complete | All 962 tests pass |
| 2 | Runtime Bugs (UTB-024, UTB-025) | [ ] Pending | Awaiting execution |
| 3 | E2E Touch Target (3.1) | [x] Complete | Button 28→32px |
| 4 | Verification | [x] Complete | Unit: 962 pass, E2E: 80 pass |
| 5 | Admin Test Infrastructure (NEW) | [ ] Pending | 4 tasks |
| 6 | Remaining E2E Fixes (NEW) | [ ] Pending | 5 tasks |

---

## Phase 7: UTB-014 Clean Solution (NEW)

Reference: [DESIGN_PLAN.md Section 8A](DESIGN_PLAN.md#8a-new-utb-014---clean-solution-principal-engineer-review)

### Task 7.1: Backend - Auto-Join Creator on Board Creation

**Status**: [ ] Not Started
**Priority**: P0 (Blocks UTB-015, UTB-020)
**Blocked By**: None

**Agent Prompt**:
```
You are a Software Developer implementing UTB-014 fix: Auto-join creator on board creation.

Context:
When a user creates a board with creator_alias, no user session is created. This causes the user to not appear in the participant bar and heartbeat failures.

Solution:
Modify BoardController to call userSessionService.joinBoard() after creating the board.

Task:
1. Read docs/Validation/01012330/DESIGN_PLAN.md Section 8A for full context
2. Read backend/src/domains/board/board.controller.ts
3. Read backend/src/domains/user/user-session.service.ts (joinBoard method)
4. Read backend/src/app.ts (where controllers are wired)

5. Implement the fix:
   a. Import UserSessionService in board.controller.ts
   b. Add userSessionService to BoardController constructor
   c. In createBoard method, after creating board:
      - If req.body.creator_alias exists, call userSessionService.joinBoard()
      - Include user_session in response
   d. Update app.ts to pass userSessionService to BoardController

6. Add unit tests:
   - Test createBoard with creator_alias creates session
   - Test createBoard without creator_alias returns null session

7. Run backend tests: npm test
8. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01012330/BugFixReport_UTB-014_Backend.md with:
- Bug information
- Root cause analysis
- Solution implemented with code snippets
- Test results
- Verification checklist

Focus only on backend changes. Frontend changes are in Task 7.2.
```

**Files to Modify**:
- `backend/src/domains/board/board.controller.ts`
- `backend/src/app.ts`

**Tests Required**:
- `backend/tests/unit/board.controller.test.ts`

**Verification**:
```bash
cd backend && npm test -- -t "createBoard"
```

---

### Task 7.2: Frontend - Use Returned Session & Update Types

**Status**: [ ] Not Started
**Priority**: P0
**Blocked By**: Task 7.1 (Backend must be deployed first)

**Agent Prompt**:
```
You are a Software Developer implementing UTB-014 frontend changes.

Context:
Backend now returns user_session in board creation response when creator_alias is provided. Frontend needs to use this session.

Task:
1. Read docs/Validation/01012330/DESIGN_PLAN.md Section 8A for full context
2. Read frontend/src/models/types/board.types.ts

3. Update BoardResponse type:
   - Add optional user_session?: UserSession field

4. Read frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts

5. Update createBoard function:
   - After successful API call, check if response.user_session exists
   - If yes, call useUserStore.getState().setCurrentUser(response.user_session)

6. Update unit tests if needed

7. Run: npm run test:run -- tests/unit/features/home/viewmodels/useCreateBoardViewModel.test.ts
8. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01012330/BugFixReport_UTB-014_Frontend.md

Focus only on type updates and createBoard viewmodel. Debug cleanup is in Task 7.3.
```

**Files to Modify**:
- `frontend/src/models/types/board.types.ts`
- `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts`

**Tests Required**:
- `frontend/tests/unit/features/home/viewmodels/useCreateBoardViewModel.test.ts`

**Verification**:
```bash
cd frontend && npm run test:run -- tests/unit/features/home/viewmodels
```

---

### Task 7.3: Remove UTB-014 Debug Logging

**Status**: [ ] Not Started
**Priority**: P1
**Blocked By**: Task 7.2 (Verify fix works before removing debug logs)
**Can Run Parallel**: Yes (independent files)

**Agent Prompt**:
```
You are a Software Developer cleaning up debug logging after UTB-014 fix.

Context:
UTB-014 has been fixed. Debug logging was added during investigation and needs to be removed.

Task:
1. Remove all [UTB-014 DEBUG] logging from these files:

   a. frontend/src/models/api/client.ts
      - Remove any request/response interceptor debug logs

   b. frontend/src/models/api/BoardAPI.ts
      - Remove lines with [UTB-014 DEBUG] in getCurrentUserSession

   c. frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts
      - Remove all console.log with [UTB-014 DEBUG]

   d. frontend/src/features/participant/viewmodels/useParticipantViewModel.ts
      - Remove all console.log/console.warn with [UTB-014 DEBUG]

   e. frontend/src/features/board/components/RetroBoardPage.tsx
      - Remove any debug logging related to UTB-014

2. Run full unit test suite to verify no regressions:
   npm run test:run

3. Verify in browser:
   - Create a board with alias
   - Check console for no debug messages
   - Verify user appears in participant bar

IMPORTANT: Create docs/Validation/01012330/BugFixReport_UTB-014_Cleanup.md with:
- Files modified
- Lines removed
- Test results
```

**Files to Modify**:
- `frontend/src/models/api/client.ts`
- `frontend/src/models/api/BoardAPI.ts`
- `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts`
- `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`
- `frontend/src/features/board/components/RetroBoardPage.tsx`

**Verification**:
```bash
cd frontend && npm run test:run
```

---

## Phase 7 Progress Tracking

| Task | Description | Status | Report |
|------|-------------|--------|--------|
| 7.1 | Backend auto-join | [x] Complete | 4 tests pass (492 total), CR applied |
| 7.2 | Frontend types & viewmodel | [x] Complete | 13 tests pass, CR approved |
| 7.3 | Remove debug logging | [ ] Pending | Awaiting user verification |

### E2E Verification Results (2026-01-02)
- Board creation tests: 20 passed, 2 skipped
- Full E2E suite: 80 passed, 12 failed, 21 skipped
- UTB-014 specific: Board creation flow works correctly

---

## Updated Phase Summary

| Phase | Tasks | Status | Notes |
|-------|-------|--------|-------|
| 1 | Unit Test Fixes (1.1-1.3) | [x] Complete | All 962 tests pass |
| 2 | Runtime Bugs (UTB-024, UTB-025) | [ ] Pending | Awaiting execution |
| 3 | E2E Touch Target (3.1) | [x] Complete | Button 28→32px |
| 4 | Verification | [x] Complete | Unit: 962 pass, E2E: 80 pass |
| 5 | Admin Test Infrastructure | [ ] Pending | 4 tasks |
| 6 | Remaining E2E Fixes | [ ] Pending | 5 tasks |
| 7 | **UTB-014 Clean Solution** | [ ] Pending | 3 tasks (NEW) |

---

## Recommended Execution Order

For UTB-014 fix specifically:

1. **Task 7.1** (Backend) - Must complete first
2. **Task 7.2** (Frontend) - Depends on 7.1
3. **Task 7.3** (Cleanup) - Can run after 7.2 verified

For all pending work, recommended parallel strategy:

| Agent | Tasks | Files |
|-------|-------|-------|
| Agent 1 | Task 7.1 (UTB-014 Backend) | Backend only |
| Agent 2 | Task 2.1 (UTB-024 Unlink) | CardAPI.ts, viewmodel |
| Agent 3 | Task 2.2 (UTB-025 Aggregated) | cardStore.ts |

After Agent 1 completes:
| Agent | Tasks | Files |
|-------|-------|-------|
| Agent 4 | Task 7.2 + 7.3 (UTB-014 Frontend) | Frontend only |

---

## Success Criteria (Updated)

- [x] All 6 failing unit tests now pass (Tasks 1.1-1.3)
- [x] UTB-014: Creator appears in participant bar after board creation (Tasks 7.1-7.2 complete, 7.3 pending cleanup)
- [ ] UTB-024: Child cards can be unlinked successfully (Task 2.1)
- [ ] UTB-025: Parent aggregated count updates on child reactions (Task 2.2)
- [x] E2E touch target test passes (Task 3.1)
- [x] Full unit suite: 962 pass, 1 skip
- [x] Full E2E suite: 80 pass, 12 fail, 21 skip
- [x] No regressions in previously passing tests

---

*Document created by Principal Engineer - 2026-01-01*
*Updated: 2026-01-02 - Added Phase 7 (UTB-014 Clean Solution)*
*Updated: 2026-01-02 - Added Phase 5 (Admin Infrastructure) and Phase 6 (E2E Fixes)*
*Updated: 2026-01-01 - Added UTB-024 and UTB-025 tasks*
