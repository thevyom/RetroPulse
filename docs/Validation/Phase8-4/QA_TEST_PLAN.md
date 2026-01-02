# QA Test Plan - Bug Fixes Session 01012330

**Created**: 2026-01-01 23:30
**Updated**: 2026-01-02 (UTB-014 Clean Solution Tests Added)
**Status**: Planning

---

## 1. Test Strategy Overview

### Testing Approach
- Run failing unit tests individually to verify fixes
- Run full unit test suite to ensure no regressions
- Run targeted E2E tests to verify touch target fix
- **NEW**: Test UTB-024 (Unlink) and UTB-025 (Aggregated Count) fixes
- Run full E2E suite as final verification

### Test Framework
- Unit: Vitest + React Testing Library
- E2E: Playwright

---

## 2. Unit Test Verification

### Fix 1.1: RetroCard Aria-Label

**Test File**: `frontend/tests/unit/features/card/components/RetroCard.test.tsx`

**Run Command**:
```bash
cd frontend
npm run test:run -- tests/unit/features/card/components/RetroCard.test.tsx -t "aria-label"
```

**Expected Result**: Test passes with updated assertion

---

### Fix 1.2: RetroColumn Timeouts

**Test File**: `frontend/tests/unit/features/card/components/RetroColumn.test.tsx`

**Specific Tests**:
```bash
# Test: posting anonymously
npm run test:run -- tests/unit/features/card/components/RetroColumn.test.tsx -t "posting anonymously"

# Test: editing column title
npm run test:run -- tests/unit/features/card/components/RetroColumn.test.tsx -t "editing column title"
```

**Run Full File**:
```bash
npm run test:run -- tests/unit/features/card/components/RetroColumn.test.tsx
```

**Expected Result**: All 19 tests pass (no timeouts)

---

### Fix 1.3: CreateBoardDialog Timeouts

**Test File**: `frontend/tests/unit/features/board/components/CreateBoardDialog.test.tsx`

**Specific Tests**:
```bash
# Test: clear alias error
npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx -t "clear alias error"

# Test: API error navigation
npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx -t "API error"

# Test: invalid alias input
npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx -t "invalid alias"
```

**Run Full File**:
```bash
npm run test:run -- tests/unit/features/board/components/CreateBoardDialog.test.tsx
```

**Expected Result**: All tests pass (no timeouts)

---

## 3. E2E Test Verification

### Fix 2.1: Touch Target Size

**Test File**: `frontend/tests/e2e/08-tablet-viewport.spec.ts`

**Run Command**:
```bash
cd frontend
BACKEND_URL=http://localhost:3001 npx playwright test 08-tablet-viewport.spec.ts -g "add card button is easily tappable"
```

**Expected Result**: Test passes (button >= 32px or assertion relaxed)

---

## 4. Full Test Suite Verification

### Unit Tests (Post-Fix)

```bash
cd frontend
npm run test:run
```

**Expected Results**:
| Metric | Before | After |
|--------|--------|-------|
| Total Tests | 956 | 956+ |
| Passed | 949 | 956+ |
| Failed | 6 | 0 |
| Skipped | 1 | 1 |

---

### E2E Tests (Post-Fix)

```bash
cd frontend
BACKEND_URL=http://localhost:3001 npm run test:e2e
```

**Expected Results**:
| Metric | Before | After |
|--------|--------|-------|
| Total | 92 | 92 |
| Passed | 60 | 61+ |
| Failed | 10 | 9 |
| Skipped | 22 | 22 |

**Note**: Parent-child drag tests will still fail (E2E-002 infrastructure issue)

---

## 5. Regression Testing

### Critical Paths to Verify

After all fixes, manually verify:

- [ ] Board creation flow works
- [ ] Card creation (attributed and anonymous) works
- [ ] Card reactions work
- [ ] Filter toggles work correctly (All Users clears Anonymous)
- [ ] Add card dialog opens and closes properly
- [ ] Column edit dialog works

---

## 6. Test Execution Plan

### Phase 1: Fix Unit Tests

| Step | Command | Expected |
|------|---------|----------|
| 1 | Fix RetroCard.test.tsx | Run, verify pass |
| 2 | Fix RetroColumn.test.tsx | Run, verify pass |
| 3 | Fix CreateBoardDialog.test.tsx | Run, verify pass |
| 4 | Run full unit suite | 956+ tests pass |

### Phase 2: Fix E2E Test

| Step | Command | Expected |
|------|---------|----------|
| 5 | Fix touch target | Run specific test, verify pass |
| 6 | Run tablet viewport suite | 8/9 tests pass |

### Phase 3: Full Verification

| Step | Command | Expected |
|------|---------|----------|
| 7 | Run all unit tests | All pass |
| 8 | Run all E2E tests | 61+ pass, 9 fail (drag), 22 skip |

---

## 7. Bug Fix Report Template

Each fix should document:

```markdown
# Bug Fix Report - [Test Name]

## Issue
[Description of failing test]

## Root Cause
[Why it was failing]

## Solution
[What was changed]

## Code Changes
[Relevant code snippets]

## Test Results
[Output from test run]

## Verification
- [ ] Specific test passes
- [ ] Full file passes
- [ ] No regressions
```

---

## 8. NEW: UTB-014 Test Plan (Clean Solution)

### Overview

UTB-014 fix involves backend auto-joining the creator when `creator_alias` is provided during board creation.

### Backend Unit Tests

**File**: `backend/tests/unit/board.controller.test.ts` (new or existing)

| Test Case | Expected Behavior |
|-----------|-------------------|
| createBoard with creator_alias calls joinBoard | userSessionService.joinBoard called with correct params |
| createBoard without creator_alias skips joinBoard | userSessionService.joinBoard NOT called |
| createBoard returns user_session when alias provided | Response includes user_session object |
| createBoard returns null user_session when no alias | Response has user_session: null |

**Run Command**:
```bash
cd backend && npm test -- -t "createBoard"
```

### Frontend Unit Tests

**File**: `frontend/tests/unit/features/home/viewmodels/useCreateBoardViewModel.test.ts`

| Test Case | Expected Behavior |
|-----------|-------------------|
| createBoard sets currentUser when user_session returned | useUserStore.setCurrentUser called |
| createBoard doesn't set currentUser when no session | useUserStore.setCurrentUser NOT called |

**Run Command**:
```bash
cd frontend && npm run test:run -- tests/unit/features/home/viewmodels/useCreateBoardViewModel.test.ts
```

### Integration Tests

**Manual Verification Steps**:

1. Start backend server: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser, navigate to home page
4. Create a board with alias "TestUser"
5. Verify:
   - [ ] Board page loads without errors
   - [ ] ParticipantBar shows "TestUser" avatar
   - [ ] MyUserCard shows in header
   - [ ] No console errors about heartbeat
   - [ ] No "Please join the board first" errors

### E2E Tests

**File**: `frontend/tests/e2e/11-bug-regression.spec.ts` (add new tests)

```typescript
test.describe('UTB-014: User appears in participant bar after board creation', () => {
  test('creator appears in participant bar immediately', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Create board with alias
    await page.getByRole('button', { name: /create board/i }).click();
    await page.getByLabel(/board name/i).fill('Test Board');
    await page.getByLabel(/your name/i).fill('John Smith');
    await page.getByRole('button', { name: /create/i }).click();

    // Wait for board page
    await page.waitForURL(/\/board\//);

    // Verify user appears in participant bar
    await expect(page.getByRole('button', { name: /JS/i })).toBeVisible();
  });

  test('creator can send heartbeat without error', async ({ page }) => {
    // Create board as above
    // Wait 60+ seconds
    // Verify no heartbeat errors in console
  });

  test('creator can edit their alias', async ({ page }) => {
    // Create board as above
    // Click on MyUserCard
    // Change alias
    // Verify avatar updates
  });
});
```

**Run Command**:
```bash
cd frontend && BACKEND_URL=http://localhost:3001 npx playwright test 11-bug-regression.spec.ts -g "UTB-014"
```

### API Endpoint Verification

**Test the fix directly with curl**:

```bash
# Create board with creator_alias
curl -X POST http://localhost:3001/v1/boards \
  -H "Content-Type: application/json" \
  -H "Cookie: retro_session_id=test-session-123" \
  -d '{"name": "Test Board", "creator_alias": "John Smith"}'

# Expected response includes user_session:
# {
#   "id": "...",
#   "name": "Test Board",
#   ...
#   "user_session": {
#     "alias": "John Smith",
#     "is_admin": true,
#     "cookie_hash": "...",
#     "last_active_at": "..."
#   }
# }

# Verify session exists
curl http://localhost:3001/v1/boards/{board_id}/users/me \
  -H "Cookie: retro_session_id=test-session-123"

# Expected: Returns the user session (not null)
```

### Debug Logging Removal Verification

After removing debug logs, verify:

1. [ ] No `[UTB-014 DEBUG]` messages in browser console
2. [ ] No `[UTB-014 DEBUG]` messages in terminal output
3. [ ] Application still functions correctly
4. [ ] Tests still pass

**Files to Check**:
- `frontend/src/models/api/client.ts`
- `frontend/src/models/api/BoardAPI.ts`
- `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts`
- `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`
- `frontend/src/features/board/components/RetroBoardPage.tsx`

---

## 9. NEW: UTB-024 & UTB-025 Test Plan

### UTB-024: Child Card Unlink

**Manual Testing Steps**:
1. Create a board and add an alias
2. Create two cards in the same column
3. Drag one card onto another to link them
4. Verify parent-child relationship is shown (child indented under parent)
5. Click the Link2 icon on the child card
6. Verify the child card becomes a standalone card
7. Verify parent's children array is empty
8. Verify parent's aggregated_reaction_count is recalculated

**Unit Test Cases** (new tests to add):
```bash
npm run test:run -- tests/unit/models/stores/cardStore.test.ts -t "unlinkChild"
```

| Test Case | Expected |
|-----------|----------|
| unlinkChild removes child from parent.children | Parent has empty children array |
| unlinkChild sets child.parent_card_id to null | Child is standalone |
| unlinkChild updates parent.aggregated_reaction_count | Count decreases by child's count |

**E2E Test Cases** (existing suite):
```bash
BACKEND_URL=http://localhost:3001 npx playwright test 06-parent-child-cards.spec.ts -g "unlink"
```

---

### UTB-025: Parent Aggregated Count on Child Reaction

**Manual Testing Steps**:
1. Create parent-child cards as above
2. Note parent's aggregated count (e.g., "5 (2 own)")
3. Click thumbs up on the child card
4. Verify parent's aggregated count increases by 1
5. Click thumbs up again to remove reaction
6. Verify parent's aggregated count decreases by 1

**Unit Test Cases** (new tests to add):
```bash
npm run test:run -- tests/unit/models/stores/cardStore.test.ts -t "incrementReactionCount"
```

| Test Case | Expected |
|-----------|----------|
| incrementReactionCount updates card's direct_reaction_count | +1 |
| incrementReactionCount updates card's aggregated_reaction_count | +1 |
| incrementReactionCount updates parent's aggregated_reaction_count | +1 |
| incrementReactionCount updates child entry in parent.children | Child's count +1 |
| decrementReactionCount reverses all above | -1 for all |

---

## 9. Test Execution Order

### Recommended Order:

1. **Phase 1**: Fix unit tests (1.1 → 1.2 → 1.3) - Sequential
2. **Phase 2**: Fix runtime bugs (UTB-024, UTB-025) - Parallel
3. **Phase 3**: Fix E2E test (2.1) - Independent
4. **Phase 4**: Full verification

### Parallel Agent Allocation:

| Agent | Tasks | Independence |
|-------|-------|--------------|
| Agent 1 | UTB-024 | Independent - CardAPI, viewmodel |
| Agent 2 | UTB-025 | Independent - cardStore only |
| Agent 3 | Unit tests 1.1-1.3 | Sequential within agent |
| Agent 4 | E2E fix 2.1 | Independent |

---

## 10. Known Issues (Not Addressed This Session)

| Issue | Reason |
|-------|--------|
| E2E-002: @dnd-kit drag | Requires architecture change (deferred) |
| E2E-003: Admin timing | See Phase 5 Admin Board Design |
| Parent-child E2E tests | Blocked by E2E-002 |

---

## 11. Session Results (01012330)

### Unit Tests

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Total | 963 | 963 | - |
| Passed | 956 | 962 | +6 |
| Failed | 6 | 0 | Fixed |
| Skipped | 1 | 1 | - |

### E2E Tests

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Total | 113 | 113 | - |
| Passed | 60 | 80 | +20 |
| Failed | 10 | 13 | +3 (new failures identified) |
| Skipped | 43 | 20 | -23 (tests now running) |

### E2E Failure Breakdown

| Category | Count | Tests | Root Cause |
|----------|-------|-------|------------|
| @dnd-kit drag (E2E-002) | 4 | 06-parent-child-cards.spec.ts | Infrastructure limitation |
| Card editing (UTB-020) | 3 | 11-bug-regression.spec.ts | Component behavior |
| Avatar initials (UTB-021) | 2 | 11-bug-regression.spec.ts | Test setup |
| Avatar tooltip (UTB-022) | 1 | 11-bug-regression.spec.ts | Selector issue |
| Touch targets | 1 | 08-tablet-viewport.spec.ts | Multiple elements |
| Drag handles a11y | 1 | 10-accessibility-basic.spec.ts | Aria-label pattern |
| Aggregated count | 1 | 11-bug-regression.spec.ts | UTB-016/025 related |

---

## 12. NEW: Admin Test Infrastructure Test Plan

Reference: [ADMIN_TEST_BOARD_DESIGN.md](ADMIN_TEST_BOARD_DESIGN.md)

### Phase 5 Verification

| Task | Test Command | Expected |
|------|--------------|----------|
| 5.1 Backend | `cd backend && npm test -- -t "session_id"` | Accepts custom session_id |
| 5.2 Global Setup | `npx playwright test --grep "Home Page"` | Admin board created |
| 5.3 Admin Helper | `npx playwright test 02-board-lifecycle.spec.ts` | Uses admin session |
| 5.4 Migration | `npx playwright test -g "admin"` | All admin tests pass |

### Admin Board Verification Steps

1. Run E2E global setup
2. Check `.test-boards.json` contains admin entry
3. Navigate to admin board with known session_id
4. Verify admin dropdown appears immediately (< 1s)
5. Perform admin action (close board)
6. Verify action succeeds without retry

---

## 13. NEW: Remaining E2E Test Fixes Plan

### Phase 6 Verification

| Task | Test Command | Expected |
|------|--------------|----------|
| 6.1 Card Editing | `npx playwright test 11-bug-regression.spec.ts -g "UTB-020"` | 3 tests pass |
| 6.2 Avatar Initials | `npx playwright test 11-bug-regression.spec.ts -g "UTB-021"` | 2 tests pass |
| 6.3 Avatar Tooltip | `npx playwright test 11-bug-regression.spec.ts -g "UTB-022"` | 1 test passes |
| 6.4 Touch Targets | `npx playwright test 08-tablet-viewport.spec.ts -g "adequate"` | 1 test passes |
| 6.5 Drag Handles | `npx playwright test 10-accessibility-basic.spec.ts -g "drag handles"` | 1 test passes |

### Manual Verification Checklist

After Phase 6 fixes:

- [ ] Card owner can click card content to edit
- [ ] Edited content saves on blur
- [ ] Escape cancels edit without saving
- [ ] Single name avatar shows "JO" for "John"
- [ ] Two-word name avatar shows "JS" for "John Smith"
- [ ] Hovering user avatar shows full name tooltip
- [ ] All touch targets >= 32px on tablet viewport
- [ ] Drag handles have proper aria-label

---

## 14. Final Verification Commands

### Full Suite (After All Phases)

```bash
# Unit Tests
cd frontend && npm run test:run

# Expected: 962+ pass, 0 fail, 1 skip

# E2E Tests
cd frontend && BACKEND_URL=http://localhost:3001 npm run test:e2e

# Expected: 90+ pass, ~4 fail (drag only), ~19 skip
```

### Success Criteria (Updated)

| Metric | Target | Current |
|--------|--------|---------|
| Unit Tests Pass | 962+ | 962 |
| Unit Tests Fail | 0 | 0 |
| E2E Tests Pass | 90+ | 80 |
| E2E Tests Fail | ~4 (drag only) | 13 |
| E2E Skipped | ~19 | 20 |

---

*Document created by Principal Engineer - 2026-01-01*
*Updated: 2026-01-02 - Added session results and Phase 5/6 test plans*
*Updated: 2026-01-01 - Added UTB-024 and UTB-025 test plans*
