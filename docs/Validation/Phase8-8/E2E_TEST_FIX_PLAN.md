# Phase 8.8 E2E Test Fix Plan

**Created**: 2026-01-06
**Status**: Analysis Complete - Ready for Implementation
**Author**: Principal Engineer
**Prerequisites**: Phase 8.7 Complete

---

## 1. Executive Summary

### Current E2E Test Status

| Metric | Current | Target |
|--------|---------|--------|
| Total Tests | 168 | 168 |
| Passing | 74 (44%) | 152+ (90%) |
| Failing | 94 (56%) | <17 (10%) |

### Root Causes Identified

| Root Cause | Impact | Tests Affected |
|------------|--------|----------------|
| **Rate Limiting** | HIGH | ~60% of failures |
| **AliasPromptModal timing** | MEDIUM | ~20% of failures |
| **Selector mismatches** | LOW | ~10% of failures |
| **DnD edge cases** | LOW | ~10% of failures |

---

## 2. Detailed Analysis

### 2.1 Rate Limiting (PRIMARY ISSUE)

**Evidence from Test Run:**
```
[waitForBoardLoad +8175ms] TIMEOUT waiting for columns. Page title: frontend
[waitForBoardLoad +8175ms] Body content (first 500 chars):
    Rate limited. Please try again laterTry Again
```

**Root Cause:**
- Backend rate limiting is configured to skip only when `NODE_ENV === 'test'`
- Backend is started with `npm run dev` (no NODE_ENV set) for E2E tests
- Standard rate limit: 100 req/min per IP
- E2E tests create boards, join boards, create cards rapidly - exceeding limits

**Location:** `backend/src/shared/middleware/rate-limit.ts:28`
```typescript
skip: () => process.env.NODE_ENV === 'test',
```

**Fix Options:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Set NODE_ENV=test** | Start backend with `NODE_ENV=test npm run dev` | Simple, no code changes | May affect other test behavior |
| **B: Add E2E flag** | Add `DISABLE_RATE_LIMIT=true` env var | Explicit control | Requires backend code change |
| **C: Increase limits for E2E** | Higher limits for localhost | No code changes | Still could hit limits |

**Recommended Fix: Option B** - Add explicit `DISABLE_RATE_LIMIT` environment variable

```typescript
// backend/src/shared/middleware/rate-limit.ts
skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
```

### 2.2 AliasPromptModal Timing Issues

**Evidence from Test Run:**
```
[handleAliasPromptModal] Button found with locator: false
[handleAliasPromptModal] Button disabled: false
[handleAliasPromptModal] All buttons in dialog: ["Join Board","Close"]
[handleAliasPromptModal] Clicking Join Board button via JavaScript...
```

**Analysis:**
- Modal IS appearing and being handled
- Button IS being found (via text locator)
- `dispatchEvent('click')` is used as fallback - this works but indicates underlying issue
- "Close" button appearing suggests Radix DialogContent has close button visible

**Root Cause:**
- Line 41 in AliasPromptModal.tsx: `className="sm:max-w-md [&>button]:hidden"` hides close button via CSS
- The CSS selector `[&>button]:hidden` targets direct child buttons
- Radix may add the Close button as a sibling or nested differently

**Fix:**
1. Verify the Radix Dialog structure
2. Use `data-testid="join-board-button"` locator first (more reliable)
3. Remove fallback to `dispatchEvent` - use proper `.click()`

### 2.3 Test Isolation Issues

**Evidence:**
- Tests share state across runs (boards accumulate participants)
- Some tests fail because previous test data still exists
- Global setup creates fresh boards but doesn't clean between tests

**Fix:**
- Add `afterEach` hooks to reset relevant state
- Consider per-test board creation for isolated tests
- Add debug logging to track board state

### 2.4 DnD Keyboard Navigation (WORKING)

**Evidence from Test Run:**
```
[dragCardOntoCard] Performing keyboard-based drag...
[dragCardOntoCard] Drag complete
[E2E:parent-child] Card linked wait completed
[E2E:parent-child] isCardLinked result: true
ok  2 [chromium] › tests\e2e\09-drag-drop.spec.ts:61:3 › drag feedback onto feedback creates parent-child (5.9s)
```

**Analysis:**
- Keyboard-based DnD IS working
- 6 out of 10 drag-drop tests pass
- Failures are due to rate limiting or selector issues, NOT DnD mechanism

---

## 3. Component Accessibility Audit

### 3.1 Components with Proper Test IDs

| Component | Test ID | Status |
|-----------|---------|--------|
| MeSection | `data-testid="me-section"` | OK |
| ParticipantAvatar | `data-testid="participant-avatar-{alias}"` | OK |
| ParticipantAvatar (all) | `data-testid="all-avatar"` | OK |
| ParticipantAvatar (anon) | `data-testid="anonymous-avatar"` | OK |
| AvatarContextMenu | `data-testid="avatar-context-menu"` | OK |
| AvatarContextMenu label | `data-testid="avatar-context-menu-label"` | OK |
| AvatarContextMenu filter | `data-testid="avatar-context-filter"` | OK |
| AvatarContextMenu edit | `data-testid="avatar-context-edit-alias"` | OK |
| AvatarContextMenu admin | `data-testid="avatar-context-make-admin"` | OK |
| AliasPromptModal input | `data-testid="alias-input"` | OK |
| AliasPromptModal button | `data-testid="join-board-button"` | OK |
| Participant container | `data-testid="participant-avatar-container"` | OK |

### 3.2 Accessibility Attributes

| Component | ARIA Attribute | Value | Status |
|-----------|---------------|-------|--------|
| ParticipantBar | `role` | `toolbar` | OK |
| ParticipantBar | `aria-label` | `Participant filters` | OK |
| Filter controls | `role` | `group` | OK |
| Filter controls | `aria-label` | `Filter options` | OK |
| Participant list | `role` | `group` | OK |
| Participant list | `aria-label` | `Other participants` | OK |
| Me section wrapper | `role` | `group` | OK |
| Me section wrapper | `aria-label` | `Current user` | OK |
| ParticipantAvatar | `aria-label` | `Filter by {tooltip}` | OK |
| ParticipantAvatar | `aria-pressed` | `{isSelected}` | OK |
| Edit dialog input | `aria-label` | `Alias` | OK |
| Edit dialog input | `aria-invalid` | `{!!error}` | OK |
| Error message | `role` | `alert` | OK |

---

## 4. Implementation Plan

### Phase 1: Fix Rate Limiting (P0 - 30 min)

**Files to modify:**
- `backend/src/shared/middleware/rate-limit.ts`

**Changes:**
1. Add `DISABLE_RATE_LIMIT` environment variable check
2. Update global-setup.ts to document required env vars
3. Add backend startup script for E2E testing

**Implementation:**
```typescript
// rate-limit.ts line 28
const commonOptions = {
  standardHeaders: true,
  legacyHeaders: true,
  skip: () =>
    process.env.NODE_ENV === 'test' ||
    process.env.DISABLE_RATE_LIMIT === 'true',
  validate: { xForwardedForHeader: false },
};
```

**E2E Test Runner Script:**
```bash
# Run backend for E2E tests
DISABLE_RATE_LIMIT=true npm run dev
```

### Phase 2: Fix AliasPromptModal Handler (P0 - 30 min)

**Files to modify:**
- `frontend/tests/e2e/helpers.ts`

**Changes:**
1. Use `data-testid` locator first (most reliable)
2. Remove `dispatchEvent` fallback - use proper `.click()`
3. Add better error messaging when modal handling fails
4. Increase wait time for modal close verification

**Implementation:**
```typescript
// helpers.ts - handleAliasPromptModal function
// Priority order for button locators:
const joinButton = dialog.getByTestId('join-board-button');
await joinButton.waitFor({ state: 'visible', timeout: 5000 });

// Use real click, not dispatchEvent
await joinButton.click();

// Wait for modal to actually close
await expect(dialog).not.toBeVisible({ timeout: 5000 });
```

### Phase 3: Add Debug Logging (P1 - 30 min)

**Files to modify:**
- `frontend/tests/e2e/helpers.ts`
- `frontend/tests/e2e/12-participant-bar.spec.ts`

**Changes:**
1. Add structured logging for all helper functions
2. Log page state on test failure
3. Add rate limit detection and early failure

**Implementation:**
```typescript
// Add rate limit detection helper
export async function checkForRateLimit(page: Page): Promise<boolean> {
  const rateLimitAlert = page.locator('text=Rate limited');
  const isRateLimited = await rateLimitAlert.isVisible().catch(() => false);
  if (isRateLimited) {
    console.error('[E2E] RATE LIMITED - Backend needs DISABLE_RATE_LIMIT=true');
    return true;
  }
  return false;
}
```

### Phase 4: Fix Specific Test Failures (P1 - 1 hour)

**Tests with specific fixes needed:**

| Test | Issue | Fix |
|------|-------|-----|
| AVT-003, AVT-004 | Multi-user offline detection | Increase wait time for user disconnect |
| ME-009 | Tooltip hover timing | Use `page.hover()` with increased delay |
| CTX-002 | Context menu header selector | Use `data-testid="avatar-context-menu-label"` |
| CTX-007, CTX-010 | Admin promotion | Add wait for socket event to propagate |
| ALIAS-001 to ALIAS-012 | Fresh context needed | Use `browser.newContext()` for each |

### Phase 5: Documentation Updates (P2 - 30 min)

**Files to create/update:**
- `docs/Validation/Phase8-8/E2E_SETUP_GUIDE.md`
- `frontend/tests/e2e/README.md`

---

## 5. Test Results After Analysis

### 12-participant-bar.spec.ts (54 tests)

| Category | Passed | Failed | Root Cause |
|----------|--------|--------|------------|
| Avatar Indicators (AVT) | 7 | 3 | Rate limiting, multi-user timing |
| MeSection (ME) | 6 | 3 | Rate limiting, tooltip timing |
| ParticipantBar Layout (PART) | 6 | 4 | Rate limiting, selector issues |
| AvatarContextMenu (CTX) | 9 | 4 | Rate limiting, timing |
| Removed Features (REM) | 5 | 1 | Rate limiting |
| AliasPromptModal (ALIAS) | 0 | 12 | Rate limiting (all) |
| **Total** | **33** | **21** | |

### 09-drag-drop.spec.ts (10 tests)

| Test | Status | Root Cause |
|------|--------|------------|
| drag card to different column | FAIL | Rate limiting |
| drag feedback onto feedback | PASS | - |
| drag action onto feedback | PASS | - |
| linked child under parent | PASS | - |
| link icon appears | FAIL | AliasPromptModal blocking |
| click link icon unlinks | FAIL | Card unlink selector |
| cannot drop on self | PASS | - |
| cannot create circular | PASS | - |
| 1-level hierarchy only | PASS | - |
| visual feedback on drag | FAIL | Rate limiting |
| **Total** | **6 pass** | **4 fail** |

---

## 6. Expected Results After Fixes

### Conservative Estimate

| Fix Phase | Tests Fixed | Cumulative Pass Rate |
|-----------|-------------|----------------------|
| Current | 0 | 44% (74/168) |
| Phase 1: Rate Limiting | +50 | 74% (124/168) |
| Phase 2: Modal Handler | +15 | 83% (139/168) |
| Phase 3: Debug Logging | +5 | 86% (144/168) |
| Phase 4: Specific Fixes | +12 | 93% (156/168) |
| **Final** | | **93%+ (156+/168)** |

### Risk Areas

| Area | Risk Level | Mitigation |
|------|------------|------------|
| Multi-user timing | MEDIUM | Increase timeouts, add explicit waits |
| Context menu animation | LOW | Use `[data-state="open"]` selector |
| Drag-drop edge cases | LOW | Already using keyboard-based approach |

---

## 7. Verification Steps

### After Phase 1 (Rate Limiting Fix)

```bash
# Terminal 1: Start backend with rate limit disabled
cd backend && DISABLE_RATE_LIMIT=true npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run E2E tests
cd frontend && npx playwright test 12-participant-bar.spec.ts --reporter=list
```

**Expected:** ALIAS tests should start passing (currently 0/12)

### After All Phases

```bash
# Full E2E suite
cd frontend && npx playwright test --reporter=html

# Open report
npx playwright show-report
```

**Expected:** ≥90% pass rate (152+/168 tests)

---

## 8. Files to Modify

### Backend

| File | Change |
|------|--------|
| `src/shared/middleware/rate-limit.ts` | Add DISABLE_RATE_LIMIT env var check |

### Frontend (Tests)

| File | Change |
|------|--------|
| `tests/e2e/helpers.ts` | Fix handleAliasPromptModal, add debug logging |
| `tests/e2e/12-participant-bar.spec.ts` | Update selectors, add rate limit detection |
| `tests/e2e/09-drag-drop.spec.ts` | Fix unlink selector |
| `tests/e2e/global-setup.ts` | Add rate limit check to health verification |

### Documentation

| File | Change |
|------|--------|
| `docs/Validation/Phase8-8/E2E_SETUP_GUIDE.md` | Create E2E test setup guide |
| `frontend/tests/e2e/README.md` | Update with rate limit instructions |

---

## 9. Sign-off Checklist

- [ ] Phase 1: Rate limiting disabled for E2E
- [ ] Phase 2: AliasPromptModal handler fixed
- [ ] Phase 3: Debug logging added
- [ ] Phase 4: Specific test fixes applied
- [ ] Phase 5: Documentation updated
- [ ] E2E pass rate ≥90%
- [ ] No regressions in unit tests
- [ ] QA engineer sign-off

---

*Phase 8.8 E2E Test Fix Plan by Principal Engineer - 2026-01-06*
*Analysis based on actual test runs with debug output*
