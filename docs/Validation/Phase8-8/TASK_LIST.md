# Phase 8.8 Task List - E2E Test Fixes

**Created**: 2026-01-06
**Status**: Ready for Implementation
**Author**: Principal Engineer
**Prerequisites**: Phase 8.7 Complete

---

## Overview

This phase focuses on fixing E2E test failures to achieve ≥90% pass rate. Analysis identified rate limiting as the primary cause (~60% of failures).

---

## Task Summary

| Phase | Tasks | Description | Estimate |
|-------|-------|-------------|----------|
| **1: Rate Limiting Fix** | 1.1 - 1.3 | Backend rate limit bypass for E2E | ~30 min |
| **2: Modal Handler Fix** | 2.1 - 2.3 | AliasPromptModal E2E helper | ~30 min |
| **3: Debug Infrastructure** | 3.1 - 3.3 | Logging and error detection | ~30 min |
| **4: Specific Test Fixes** | 4.1 - 4.6 | Individual test fixes | ~1 hr |
| **5: Documentation** | 5.1 - 5.2 | E2E setup guides | ~30 min |

**Total Estimate**: ~3 hours

---

## Phase 1: Rate Limiting Fix

### Task 1.1: Add DISABLE_RATE_LIMIT Environment Variable

**Priority:** P0
**Estimate:** 15 min
**Dependencies:** None

**File:** `backend/src/shared/middleware/rate-limit.ts`

**Current Code (line 25-31):**
```typescript
const commonOptions = {
  standardHeaders: true,
  legacyHeaders: true,
  skip: () => process.env.NODE_ENV === 'test',
  validate: { xForwardedForHeader: false },
};
```

**Updated Code:**
```typescript
const commonOptions = {
  standardHeaders: true,
  legacyHeaders: true,
  skip: () =>
    process.env.NODE_ENV === 'test' ||
    process.env.DISABLE_RATE_LIMIT === 'true',
  validate: { xForwardedForHeader: false },
};
```

**Acceptance Criteria:**
- [ ] Rate limiting skipped when `DISABLE_RATE_LIMIT=true`
- [ ] No change to production behavior
- [ ] Unit tests still pass

---

### Task 1.2: Add Rate Limit Detection to E2E Tests

**Priority:** P0
**Estimate:** 10 min
**Dependencies:** None

**File:** `frontend/tests/e2e/helpers.ts`

**Add helper function:**
```typescript
/**
 * Check if page is showing rate limit error
 * Returns true if rate limited, false otherwise
 */
export async function checkForRateLimit(page: Page): Promise<boolean> {
  const rateLimitAlert = page.getByText(/rate limit/i);
  const isRateLimited = await rateLimitAlert.isVisible().catch(() => false);

  if (isRateLimited) {
    console.error('[E2E:RATE_LIMIT] Page is rate limited!');
    console.error('[E2E:RATE_LIMIT] Start backend with: DISABLE_RATE_LIMIT=true npm run dev');
    return true;
  }
  return false;
}
```

**Update waitForBoardLoad:**
```typescript
// Add after DOM content loaded check
const isRateLimited = await checkForRateLimit(page);
if (isRateLimited) {
  throw new Error('E2E Test Failed: Backend rate limiting is active. Start backend with DISABLE_RATE_LIMIT=true');
}
```

**Acceptance Criteria:**
- [ ] Clear error message when rate limited
- [ ] Tests fail fast with actionable message
- [ ] No false positives

---

### Task 1.3: Update Global Setup Health Check

**Priority:** P1
**Estimate:** 5 min
**Dependencies:** Task 1.1

**File:** `frontend/tests/e2e/global-setup.ts`

**Add to health check output:**
```typescript
console.log('\n⚠️  IMPORTANT: Start backend with rate limiting disabled:');
console.log('   DISABLE_RATE_LIMIT=true npm run dev');
console.log('   Or: NODE_ENV=test npm run dev\n');
```

**Acceptance Criteria:**
- [ ] Clear instructions shown at test start
- [ ] Message visible in test output

---

## Phase 2: Modal Handler Fix

### Task 2.1: Refactor handleAliasPromptModal

**Priority:** P0
**Estimate:** 20 min
**Dependencies:** None

**File:** `frontend/tests/e2e/helpers.ts`

**Current Issues:**
1. Uses `dispatchEvent('click')` instead of real click
2. Multiple fallback locators add confusion
3. No proper error when modal doesn't close

**Updated Implementation:**
```typescript
export async function handleAliasPromptModal(
  page: Page,
  alias?: string,
  debug = true
): Promise<boolean> {
  const log = (msg: string) => {
    if (debug) console.log(`[handleAliasPromptModal] ${msg}`);
  };

  // Check for alias input with increased timeout
  const aliasInput = page.getByTestId('alias-input');

  log('Checking for alias modal...');
  try {
    await aliasInput.waitFor({ state: 'visible', timeout: 5000 });
    log('Alias modal found');
  } catch {
    log('No alias modal found');
    return false;
  }

  // Generate or use provided alias
  const userAlias = alias || `E2EUser${Date.now().toString().slice(-4)}`;
  log(`Entering alias: ${userAlias}`);

  await aliasInput.clear();
  await aliasInput.fill(userAlias);

  // Wait for React state update
  await page.waitForTimeout(200);

  // Find and click Join Board button using test ID
  const joinButton = page.getByTestId('join-board-button');

  log('Waiting for Join Board button to be enabled...');
  await expect(joinButton).toBeEnabled({ timeout: 3000 });

  log('Clicking Join Board button...');
  await joinButton.click();

  // Wait for modal to close
  log('Waiting for modal to close...');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).not.toBeVisible({ timeout: 5000 });

  log('Modal closed successfully');
  return true;
}
```

**Acceptance Criteria:**
- [ ] Uses `data-testid` locators (most reliable)
- [ ] Uses real `.click()` not `dispatchEvent`
- [ ] Verifies modal actually closes
- [ ] Clear debug output

---

### Task 2.2: Fix AliasPromptModal Close Button

**Priority:** P1
**Estimate:** 5 min
**Dependencies:** None

**File:** `frontend/src/features/participant/components/AliasPromptModal.tsx`

**Issue:** CSS selector `[&>button]:hidden` may not hide Radix close button

**Verify and fix if needed:**
```typescript
<DialogContent
  className="sm:max-w-md"
  onPointerDownOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
  // Explicitly hide close button
  hideCloseButton={true}
>
```

**Or use Radix prop:**
```typescript
// Check if DialogContent supports this prop
<DialogContent hideClose={true}>
```

**Acceptance Criteria:**
- [ ] No "Close" button visible in modal
- [ ] Modal only closable via Join Board button
- [ ] Unit tests pass

---

### Task 2.3: Update ALIAS E2E Tests

**Priority:** P1
**Estimate:** 5 min
**Dependencies:** Task 2.1

**File:** `frontend/tests/e2e/12-participant-bar.spec.ts`

**Update ALIAS tests to use fresh browser context:**
```typescript
test.describe('AliasPromptModal (ALIAS)', () => {
  test('ALIAS-001: Modal appears for new users', async ({ browser }) => {
    // Use fresh context to ensure no session cookie
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const testBoardId = getBoardId('default');
      await page.goto(`http://localhost:5173/boards/${testBoardId}`);

      // Modal should appear
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Title should be present
      await expect(page.getByText('Join the Retrospective')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
```

**Acceptance Criteria:**
- [ ] Each ALIAS test uses fresh browser context
- [ ] No session cookie contamination
- [ ] Tests isolated from each other

---

## Phase 3: Debug Infrastructure

### Task 3.1: Add Structured Logging

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** None

**File:** `frontend/tests/e2e/helpers.ts`

**Add logging utilities:**
```typescript
// Log levels for E2E debugging
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const E2E_LOG_LEVEL = process.env.E2E_LOG_LEVEL || 'INFO';

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  return levels.indexOf(level) >= levels.indexOf(E2E_LOG_LEVEL as LogLevel);
}

export function e2eLog(context: string, message: string, level: LogLevel = 'INFO'): void {
  if (!shouldLog(level)) return;
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}][${level}][${context}] ${message}`);
}
```

**Acceptance Criteria:**
- [ ] Consistent log format across helpers
- [ ] Configurable log level
- [ ] Timestamps for debugging timing issues

---

### Task 3.2: Add Page State Logger

**Priority:** P1
**Estimate:** 10 min
**Dependencies:** Task 3.1

**File:** `frontend/tests/e2e/helpers.ts`

**Add helper to log page state on failure:**
```typescript
export async function logPageState(page: Page, context: string): Promise<void> {
  try {
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.locator('body').textContent() || '';

    e2eLog(context, `URL: ${url}`, 'DEBUG');
    e2eLog(context, `Title: ${title}`, 'DEBUG');
    e2eLog(context, `Body (first 200 chars): ${bodyText.slice(0, 200)}`, 'DEBUG');

    // Check for common error states
    if (bodyText.includes('Rate limited')) {
      e2eLog(context, 'PAGE STATE: Rate limited error detected', 'ERROR');
    }
    if (bodyText.includes('Error')) {
      e2eLog(context, 'PAGE STATE: Error detected on page', 'WARN');
    }
  } catch (error) {
    e2eLog(context, `Failed to log page state: ${error}`, 'ERROR');
  }
}
```

**Acceptance Criteria:**
- [ ] Logs useful page state on failure
- [ ] Detects rate limit errors
- [ ] Doesn't fail tests if logging fails

---

### Task 3.3: Add Test Hooks for Debugging

**Priority:** P2
**Estimate:** 5 min
**Dependencies:** Task 3.2

**File:** `frontend/tests/e2e/helpers.ts` (or test files)

**Add afterEach hook for failed test debugging:**
```typescript
// In test files that need debugging
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    e2eLog('afterEach', `Test "${testInfo.title}" failed`, 'WARN');
    await logPageState(page, 'afterEach');
  }
});
```

**Acceptance Criteria:**
- [ ] Automatic page state logging on failure
- [ ] Helps diagnose flaky tests
- [ ] Minimal performance impact on passing tests

---

## Phase 4: Specific Test Fixes

### Task 4.1: Fix Multi-User Offline Detection Tests

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** Phase 1

**Tests:** AVT-003, AVT-004, AVT-006

**Issue:** Tests don't wait long enough for user disconnect to propagate

**Fix:**
```typescript
// In multi-user tests, wait for websocket disconnect propagation
async function waitForUserOffline(page: Page, alias: string, timeout = 10000): Promise<void> {
  const offlineAvatar = page.locator(
    `[data-testid^="participant-avatar-${alias.toLowerCase().replace(/\s+/g, '-')}"]`
  ).filter({ has: page.locator('.bg-gray-300') });

  await offlineAvatar.waitFor({ state: 'visible', timeout });
}
```

**Acceptance Criteria:**
- [ ] AVT-003 passes (offline non-admin grey fill)
- [ ] AVT-004 passes (offline admin muted gold)
- [ ] AVT-006 passes (offline user no ring)

---

### Task 4.2: Fix Tooltip Hover Tests

**Priority:** P1
**Estimate:** 10 min
**Dependencies:** None

**Test:** ME-009

**Issue:** Tooltip doesn't appear on programmatic hover

**Fix:**
```typescript
// Use explicit hover with delay
await meSection.hover();
await page.waitForTimeout(400); // Wait for tooltip delay (300ms) + buffer

const tooltip = page.getByRole('tooltip');
await expect(tooltip).toBeVisible({ timeout: 2000 });
```

**Acceptance Criteria:**
- [ ] ME-009 passes (tooltip shows full alias)
- [ ] Works consistently across runs

---

### Task 4.3: Fix Context Menu Tests

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** None

**Tests:** CTX-002, CTX-007, CTX-010, CTX-012

**Issue:** Context menu timing and selector issues

**Fix:**
```typescript
// Wait for menu to fully open using Radix state
async function waitForContextMenuOpen(page: Page): Promise<void> {
  const menu = page.locator('[data-testid="avatar-context-menu"]');
  await menu.waitFor({ state: 'visible', timeout: 3000 });
  // Also check Radix state
  await page.locator('[data-radix-menu-content][data-state="open"]')
    .waitFor({ state: 'visible', timeout: 1000 });
}
```

**Acceptance Criteria:**
- [ ] CTX-002 passes (menu shows user name header)
- [ ] CTX-007 passes (Make Admin visible for admin)
- [ ] CTX-010 passes (Make Admin promotes user)
- [ ] CTX-012 passes (click outside closes menu)

---

### Task 4.4: Fix Card Unlink Selector

**Priority:** P1
**Estimate:** 10 min
**Dependencies:** None

**Test:** 09-drag-drop - "click link icon unlinks child"

**Issue:** `waitForCardUnlinked` selector doesn't match actual DOM

**Fix:** Update selector to match actual card structure:
```typescript
// Find standalone card (not nested under parent)
const standaloneCard = page
  .locator('[id^="card-"]')
  .filter({ hasText: childContent })
  .filter({ has: page.locator('[data-testid="card-header"]') })
  // Standalone cards have drag handle visible
  .locator('[aria-label*="drag"]');
```

**Acceptance Criteria:**
- [ ] Unlink test passes
- [ ] Selector works for all card types

---

### Task 4.5: Fix Admin Promotion Tests

**Priority:** P1
**Estimate:** 10 min
**Dependencies:** Task 4.3

**Tests:** CTX-007, CTX-010

**Issue:** Admin promotion needs socket event propagation time

**Fix:**
```typescript
// After clicking Make Admin, wait for avatar color change
await makeAdminMenuItem.click();

// Wait for socket event to propagate and UI to update
await page.waitForTimeout(500);

// Verify avatar turned gold (admin color)
const promotedAvatar = page.locator(
  `[data-testid^="participant-avatar-${targetAlias}"]`
).filter({ has: page.locator('.bg-amber-400') });

await promotedAvatar.waitFor({ state: 'visible', timeout: 5000 });
```

**Acceptance Criteria:**
- [ ] CTX-010 passes (user promoted to admin)
- [ ] Avatar color updates to gold
- [ ] Works in multi-user scenario

---

### Task 4.6: Add Test Data Cleanup

**Priority:** P2
**Estimate:** 10 min
**Dependencies:** None

**File:** `frontend/tests/e2e/helpers.ts`

**Add cleanup utility:**
```typescript
/**
 * Reset board state between tests (if needed)
 * Note: Most tests should use fresh board from global setup
 */
export async function cleanupTestBoard(boardId: string): Promise<void> {
  // Call backend API to reset board state
  // Only use for tests that modify shared state
  try {
    await fetch(`http://localhost:3001/v1/boards/${boardId}/test/reset`, {
      method: 'POST',
      headers: { 'X-Admin-Secret': process.env.E2E_ADMIN_SECRET || '' },
    });
  } catch (error) {
    console.warn('[cleanup] Board reset failed:', error);
  }
}
```

**Acceptance Criteria:**
- [ ] Test isolation improved
- [ ] No state leakage between tests
- [ ] API endpoint exists in backend

---

## Phase 5: Documentation

### Task 5.1: Create E2E Setup Guide

**Priority:** P2
**Estimate:** 20 min
**Dependencies:** All previous tasks

**File:** `docs/Validation/Phase8-8/E2E_SETUP_GUIDE.md`

**Content:**
- Prerequisites (Node.js, MongoDB, etc.)
- Backend setup with rate limit disabled
- Frontend dev server setup
- Running E2E tests
- Debugging failed tests
- Common issues and solutions

**Acceptance Criteria:**
- [ ] Guide covers all setup steps
- [ ] Common issues documented
- [ ] Works for new developers

---

### Task 5.2: Update Test README

**Priority:** P2
**Estimate:** 10 min
**Dependencies:** Task 5.1

**File:** `frontend/tests/e2e/README.md`

**Add:**
```markdown
## Running E2E Tests

### Prerequisites

1. Start backend with rate limiting disabled:
   ```bash
   cd backend
   DISABLE_RATE_LIMIT=true npm run dev
   ```

2. Start frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Run tests:
   ```bash
   npm run test:e2e
   ```

### Debugging Failed Tests

Set `E2E_LOG_LEVEL=DEBUG` for verbose output:
```bash
E2E_LOG_LEVEL=DEBUG npm run test:e2e
```
```

**Acceptance Criteria:**
- [ ] Clear setup instructions
- [ ] Debugging tips included
- [ ] Rate limit note prominent

---

## Execution Order

```
Phase 1 (P0 - Required first):
Task 1.1 → Task 1.2 → Task 1.3

Phase 2 (P0 - Can parallel with Phase 1):
Task 2.1 → Task 2.2 → Task 2.3

Phase 3 (P1 - After Phase 1):
Task 3.1 → Task 3.2 → Task 3.3

Phase 4 (P1 - After Phases 1-3):
Tasks 4.1-4.6 (can be parallel)

Phase 5 (P2 - After all fixes):
Task 5.1 → Task 5.2
```

---

## Verification

After each phase, run:
```bash
cd frontend && npx playwright test 12-participant-bar.spec.ts --reporter=list
```

Expected improvement:
- After Phase 1: ~30 more tests pass (ALIAS tests)
- After Phase 2: ~10 more tests pass
- After Phase 4: ~15 more tests pass
- Final: ≥90% pass rate

---

## Sign-off Checklist

- [ ] Task 1.1: Rate limit env var added
- [ ] Task 1.2: Rate limit detection added
- [ ] Task 1.3: Global setup updated
- [ ] Task 2.1: Modal handler refactored
- [ ] Task 2.2: Close button verified
- [ ] Task 2.3: ALIAS tests updated
- [ ] Task 3.1: Structured logging added
- [ ] Task 3.2: Page state logger added
- [ ] Task 3.3: Debug hooks added
- [ ] Task 4.1: Offline detection fixed
- [ ] Task 4.2: Tooltip hover fixed
- [ ] Task 4.3: Context menu fixed
- [ ] Task 4.4: Unlink selector fixed
- [ ] Task 4.5: Admin promotion fixed
- [ ] Task 4.6: Cleanup utility added
- [ ] Task 5.1: E2E setup guide created
- [ ] Task 5.2: Test README updated
- [ ] E2E pass rate ≥90%
- [ ] No unit test regressions

---

*Phase 8.8 Task List by Principal Engineer - 2026-01-06*
