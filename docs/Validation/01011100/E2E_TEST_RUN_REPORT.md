# E2E Test Run Report

**Date**: 2026-01-01
**Timeout**: 5 seconds per test
**Backend**: http://localhost:3001 (healthy)
**Frontend**: http://localhost:5173 (healthy)

---

## Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Tests | 94 | 100% |
| Passed | 63 | 67.0% |
| Failed | 23 | 24.5% |
| Skipped | 8 | 8.5% |

---

## Results by Test File

| File | Passed | Failed | Skipped | Status |
|------|--------|--------|---------|--------|
| 01-board-creation.spec.ts | 9 | 4 | 1 | Partial |
| 02-board-lifecycle.spec.ts | 9 | 0 | 0 | PASS |
| 03-retro-session.spec.ts | 4 | 0 | 5 | Partial (skipped) |
| 04-card-quota.spec.ts | 9 | 0 | 0 | PASS |
| 05-sorting-filtering.spec.ts | 6 | 0 | 1 | Partial (skipped) |
| 06-parent-child-cards.spec.ts | 0 | 8 | 0 | FAIL |
| 07-admin-operations.spec.ts | 4 | 2 | 0 | Partial |
| 08-tablet-viewport.spec.ts | 7 | 2 | 0 | Partial |
| 09-drag-drop.spec.ts | 3 | 8 | 0 | FAIL |
| 10-accessibility-basic.spec.ts | 8 | 2 | 0 | Partial |
| example.spec.ts | 1 | 1 | 0 | Partial |

---

## Failure Categories

### Category 1: Submit Button Never Enables (4 failures)
**Root Cause**: Form validation not enabling submit button after input

| Test | Error |
|------|-------|
| submit button is enabled when board name is entered | Button remains disabled after filling input |
| creates board and navigates to it | Cannot click disabled button |
| created board has default columns | Cannot click disabled button |
| shows validation error for too long board name | Cannot click disabled button |

**Symptoms**:
- `getByTestId('submit-create-board')` stays disabled
- Input is filled but button doesn't enable
- Likely a React state update or validation issue

---

### Category 2: Drag-Drop / Parent-Child Linking (16 failures)
**Root Cause**: Playwright `dragTo()` not triggering @dnd-kit events

| Test File | Tests Failed |
|-----------|--------------|
| 06-parent-child-cards.spec.ts | 8/8 |
| 09-drag-drop.spec.ts | 8/11 |

**Affected Tests**:
- drag feedback onto feedback creates parent-child
- click link icon unlinks child
- 1-level hierarchy: cannot make grandchild
- parent aggregated count shows sum of children reactions
- cross-column parent-child relationship works
- delete parent orphans children
- linked child appears directly under parent
- action card links to feedback
- drag card to different column moves it
- drag action onto feedback creates link
- link icon appears after linking
- cannot create circular relationship
- only 1-level hierarchy allowed

**Symptoms**:
- Timeout on drag operations
- No link icon appears after drag
- @dnd-kit requires specific pointer events

---

### Category 3: Admin Badge Detection (2 failures)
**Root Cause**: Selector or timing issue for admin badge

| Test | Error |
|------|-------|
| creator has admin controls visible | Timeout waiting for admin controls |
| admin badge appears on admin avatars | Badge not found |

**Symptoms**:
- Admin status may not be set immediately on board creation
- WebSocket identity establishment timing

---

### Category 4: Touch Drag-Drop (1 failure)
**Root Cause**: Touch event simulation not working

| Test | Error |
|------|-------|
| touch drag-and-drop for cards works | Touch simulation fails |

---

### Category 5: Accessibility Selectors (2 failures)
**Root Cause**: Missing DOM elements

| Test | Error |
|------|-------|
| form inputs have labels | Labels not found |
| skip link or landmarks present | Skip link/landmarks missing |

---

### Category 6: Example Test (1 failure)
**Root Cause**: Outdated test looking for Vite logo

| Test | Error |
|------|-------|
| homepage contains Vite logo | Logo not present (app doesn't use Vite logo) |

---

## Skipped Tests (8 total)

| File | Test | Reason |
|------|------|--------|
| 01-board-creation | user becomes admin of created board | Marked test.skip |
| 03-retro-session | admin can close board | Marked test.skip |
| 03-retro-session | closed board disables card creation | Marked test.skip |
| 03-retro-session | two users see each other's cards | Multi-user (skipped) |
| 03-retro-session | three users see each other in bar | Multi-user (skipped) |
| 03-retro-session | user sees board close in real-time | Multi-user (skipped) |
| 05-sorting-filtering | filter by Anonymous shows only anonymous cards | Marked test.skip |

---

## Test Timing Analysis

### Fast Tests (< 2s) - Working Well
- Home page display tests: 1.0-1.2s
- Board lifecycle tests: 0.9-1.5s
- Basic accessibility tests: 0.9-1.6s

### Medium Tests (2-4s) - Acceptable
- Card quota tests: 1.5-3.3s
- Sorting/filtering tests: 1.4-4.5s
- Admin operations: 1.7-3.8s
- Tablet viewport: 1.5-3.7s

### Slow/Timeout Tests (5s+) - All Failures
- All drag-drop tests: 5.3-5.5s (timeout)
- All parent-child tests: 5.3-5.5s (timeout)
- Board creation submit tests: 5.2-5.4s (timeout)

---

## Detailed Failure Analysis

### 1. Board Creation Submit Button Issue

**Test**: `submit button is enabled when board name is entered`
**Line**: 01-board-creation.spec.ts:121

```typescript
await page.getByTestId('create-board-button').click();
const input = page.getByTestId('board-name-input');
await input.fill('Test Board');
const submitButton = page.getByTestId('submit-create-board');
await expect(submitButton).not.toBeDisabled();  // FAILS
```

**DOM State**: Button has `disabled` attribute even after input filled
**Possible Causes**:
1. React controlled input not updating state
2. Form validation async and not completing
3. Input value not being read correctly

---

### 2. Drag-Drop Not Working

**Test**: `drag feedback onto feedback creates parent-child`
**Line**: 06-parent-child-cards.spec.ts:19

**Issue**: `dragTo()` method doesn't trigger @dnd-kit's DndContext

**How @dnd-kit works**:
1. Uses pointer events (pointerdown, pointermove, pointerup)
2. Requires DragOverlay detection
3. Needs specific event sequences

**Playwright dragTo() uses**:
- Mouse down, move, up
- May not trigger pointer sensors correctly

---

### 3. Admin Controls Not Visible

**Test**: `creator has admin controls visible`
**Line**: 07-admin-operations.spec.ts:17

**Possible Causes**:
1. Board creator not immediately marked as admin
2. Admin status determined by WebSocket session
3. Cookie/session not established in time

---

## Recommendations

### Priority 1: Fix Form Validation (4 tests)
- Investigate why input.fill() doesn't trigger form state update
- Check if controlled input has proper onChange handler
- May need to use `page.type()` instead of `fill()`

### Priority 2: Fix Drag-Drop (16 tests)
- Replace `dragTo()` with custom pointer event sequence
- Or use @dnd-kit's keyboard sensor for testing
- Create helper function for dnd-kit compatible drag

### Priority 3: Fix Admin Detection (2 tests)
- Add explicit wait for WebSocket session establishment
- Wait for admin badge selector before asserting

### Priority 4: Clean Up (3 tests)
- Remove example.spec.ts or update for RetroPulse
- Add missing accessibility landmarks
- Add form input labels

---

## Test Execution Logs

```
Session ID: 61e3d013-8edf-43de-975a-e05edcbd30e7
Demo Boards Created:
  - default: 6956c4774b604fcb9c40d05f
  - quota: 6956c4774b604fcb9c40d060
  - lifecycle: 6956c4774b604fcb9c40d061
  - a11y: 6956c4774b604fcb9c40d062
  - anon: 6956c4774b604fcb9c40d063
```

---

*Report generated: 2026-01-01*
