# Phase 8.6 QA Test Plan - Bug Fixes

**Created**: 2026-01-03
**Updated**: 2026-01-05
**Status**: Ready for Testing
**Author**: Principal Engineer (QA Perspective)

---

## Scope Change Notice

> **Reorganization**: Avatar System v2 tests have been moved to Phase 8.7 QA Test Plan.
> This plan now covers only the 4 bug fixes.

---

## 1. Test Scope

### 1.1 In Scope

| Bug ID | Description | Test Level |
|--------|-------------|------------|
| UTB-029 | Card linking creates duplicates | Unit + E2E |
| UTB-030 | New participant alias not shown | Unit + E2E |
| UTB-031 | Close Board tooltip missing | E2E |
| UTB-032 | Card header alignment | Visual + E2E |

### 1.2 Out of Scope (Moved to Phase 8.7)

- Avatar System v2 redesign
- MeSection component
- Context menu functionality
- Alias prompt modal

---

## 2. Bug Fix Test Cases

### 2.1 UTB-029: Card Linking Creates Duplicates

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB029-001 | Linking two cards doesn't create duplicates | E2E | Card count unchanged (2 cards) |
| UTB029-002 | Link operation updates parent-child relationship | E2E | Child shows under parent |
| UTB029-003 | Unlink operation separates cards | E2E | Cards become independent |
| UTB029-004 | Store state remains consistent after link | Unit | cardsMap has correct count |
| UTB029-005 | Socket event doesn't create duplicate entries | Unit | No duplicate card IDs in store |
| UTB029-006 | Multiple link/unlink cycles work correctly | E2E | Cards can be re-linked after unlink |
| UTB029-007 | Aggregated count updates correctly on link | E2E | Parent shows sum of reactions |
| UTB029-008 | Aggregated count updates correctly on unlink | E2E | Parent shows only own reactions |

**Test Procedure for UTB029-001**:
```
1. Create a board with two feedback cards (Card A, Card B)
2. Count cards displayed: should be 2
3. Link Card B as child of Card A
4. Wait for UI update
5. Count cards displayed: should still be 2 (1 parent + 1 child)
6. Verify Card B appears nested under Card A
```

---

### 2.2 UTB-030: New Participant Alias Not Shown

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB030-001 | New user appears in participant bar | E2E | Avatar visible within 2s |
| UTB030-002 | New user alias displayed correctly | E2E | Initials match alias |
| UTB030-003 | New user admin status shown correctly | E2E | Gold fill if admin |
| UTB030-004 | Socket handler uses correct field names | Unit | boardId, userAlias, isAdmin |
| UTB030-005 | User:joined event triggers addActiveUser | Unit | Store updated |
| UTB030-006 | Multiple users joining show all avatars | E2E | All users visible |

**Test Procedure for UTB030-001**:
```
1. Open board in Browser A
2. Note current participant count
3. Open same board URL in Browser B (incognito)
4. Enter alias and join
5. In Browser A, verify new participant avatar appears
6. Verify avatar shows correct initials
```

---

### 2.3 UTB-031: Close Board Tooltip

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB031-001 | Tooltip appears on hover | E2E | Tooltip visible after 300ms |
| UTB031-002 | Tooltip text is descriptive | E2E | Contains "read-only" and "cannot be undone" |
| UTB031-003 | Confirmation dialog shows detailed info | E2E | Bullet points visible |
| UTB031-004 | Tooltip disappears on mouse leave | E2E | Tooltip hidden |

**Expected Tooltip Text**:
> "Makes the board read-only. No new cards, edits, or reactions allowed. This action cannot be undone."

---

### 2.4 UTB-032: Card Header Alignment

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB032-001 | Left icons vertically centered | Visual | Drag handle + ghost icon aligned |
| UTB032-002 | Right icons vertically centered | Visual | Reaction + delete aligned |
| UTB032-003 | Left and right match vertically | Visual | Same baseline |
| UTB032-004 | Alignment consistent across card states | Visual | With/without children same |

**Visual Verification**:
```
CORRECT:
┌──────────────────────────────────────────┐
│ ⋮⋮  👻                      👍 1    🗑  │  <- All icons on same line
│ Card content                              │
└──────────────────────────────────────────┘

INCORRECT:
┌──────────────────────────────────────────┐
│ ⋮⋮  👻                                   │  <- Icons at different heights
│                             👍 1    🗑   │
│ Card content                              │
└──────────────────────────────────────────┘
```

---

## 3. Test Environment

### 3.1 Required Setup

| Component | Requirement |
|-----------|-------------|
| Backend | Running on localhost:3001 |
| Frontend | Dev server on localhost:5173 |
| MongoDB | Docker container with test data |
| Browser | Chromium via Playwright |

### 3.2 Multi-User Testing Setup

For UTB-030 participant tests:
1. Browser A: Main test context
2. Browser B: Incognito/new context for second user
3. Both connected to same board via WebSocket

---

## 4. Test Execution

### 4.1 Commands

```bash
# Unit tests for bug fixes
cd frontend && npm run test:run -- --grep "UTB-029\|UTB-030"

# E2E tests
cd frontend && npm run test:e2e -- --grep "card linking\|participant\|close board\|card header"

# Full suite
cd frontend && npm run test:run
cd frontend && npm run test:e2e
```

### 4.2 Test Files

| Bug | Unit Test File | E2E Test File |
|-----|----------------|---------------|
| UTB-029 | `tests/unit/features/card/viewmodels/useCardViewModel.test.ts` | `tests/e2e/06-parent-child-cards.spec.ts` |
| UTB-030 | `tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts` | `tests/e2e/12-participant-bar.spec.ts` |
| UTB-031 | N/A | `tests/e2e/02-board-lifecycle.spec.ts` |
| UTB-032 | N/A | `tests/e2e/03-card-management.spec.ts` |

---

## 5. Acceptance Criteria

### 5.1 Pass Thresholds

| Metric | Threshold |
|--------|-----------|
| Bug Fix Tests | 100% pass |
| Unit Test Pass Rate | 100% |
| E2E Pass Rate | ≥90% |

### 5.2 Sign-off Requirements

- [ ] All UTB-029 tests pass (card linking fixed)
- [ ] All UTB-030 tests pass (participant alias fixed)
- [ ] All UTB-031 tests pass (tooltip added)
- [ ] All UTB-032 tests pass (alignment fixed)
- [ ] Regression tests show no new failures
- [ ] QA engineer sign-off

---

## 6. Regression Tests

### 6.1 Must-Pass from Previous Phases

| Suite | Tests | Critical |
|-------|-------|----------|
| 01-board-creation | 13 | Yes |
| 02-board-lifecycle | 9 | Yes |
| 06-parent-child-cards | 12 | Yes |
| 11-bug-regression | All | Yes |

### 6.2 Areas at Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Card store | Link changes may affect state | Verify cardsMap integrity |
| WebSocket events | Field name changes | Update all affected handlers |
| Participant store | Socket handler changes | Test multi-user scenarios |

---

## 7. Test Artifacts

| Artifact | Location |
|----------|----------|
| E2E Screenshots | frontend/test-results/*/screenshot.png |
| E2E Videos | frontend/test-results/*/video.webm |
| Coverage Report | frontend/coverage/ |
| Test Report | frontend/playwright-report/ |

---

## 8. Next Phase

After Phase 8.6 QA complete, proceed to:
- **Phase 8.7 QA**: Avatar System v2 testing

---

*QA Test Plan by Principal Engineer - Updated 2026-01-05*
*Ready for testing*
