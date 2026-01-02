# Bug Fix Report: UTB-002 - Unlink Button Not Obvious

**Date**: 2026-01-01
**Status**: FIXED
**Severity**: P1 - UX Issue
**Component**: RetroCard

---

## Bug Description

The link icon on child cards that unlinks them from their parent was not visually obvious as a clickable button. Users may not realize they can click it to unlink a card from its parent.

---

## Root Cause Analysis

The original implementation had minimal styling on the unlink button:
```tsx
className="cursor-pointer text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
```

This only changed the text color slightly on hover (`hover:text-foreground`), which was not visually distinct enough to signal interactivity.

---

## Solution Implemented

### File Modified
`frontend/src/features/card/components/RetroCard.tsx` (line 185)

### Changes Applied

| Requirement | Implementation |
|-------------|----------------|
| Hover color change | `hover:text-primary` - Changes to primary color on hover |
| Scale on hover | `hover:scale-110` - Subtle scale animation |
| Smooth transitions | `transition-all duration-150` - 150ms transition for all properties |
| Focus ring | `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1` |
| Rounded corners | `rounded` - For focus ring appearance |
| Button type | Already present: `type="button"` |
| Tooltip text | Already present: "Click to unlink from parent" |

### Updated className
```tsx
className="cursor-pointer text-muted-foreground transition-all duration-150 hover:text-primary hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
```

---

## Unit Tests Added

**File**: `frontend/tests/unit/features/card/components/RetroCard.test.tsx`

5 new tests added to the "Drag Handle vs Link Icon" describe block:

1. `should have proper button attributes for unlink button` - Verifies `type="button"`
2. `should have hover styles for unlink button` - Verifies `hover:text-primary` and `hover:scale-110`
3. `should have transition styles for unlink button` - Verifies `transition-all` and `duration-150`
4. `should have focus styles for unlink button (keyboard accessibility)` - Verifies focus ring classes
5. `should disable unlink button when board is closed` - Verifies disabled state

### Test Results
```
Test Files  1 passed (1)
Tests       25 passed (25)
Duration    7.41s
```

---

## Code Review Summary

| Category | Status | Notes |
|----------|--------|-------|
| Correctness | PASS | Implements all required styling |
| Security | N/A | UI styling only, no security impact |
| Tests | PASS | 5 new tests covering all requirements |
| Edge Cases | PASS | Disabled state verified |
| Accessibility | PASS | Focus states added for keyboard navigation |
| Performance | PASS | CSS-only, no JS overhead |

### Review Verdict: **APPROVED**

---

## Verification Steps

1. Navigate to a retro board with linked cards (child cards attached to parents)
2. Observe the link icon on child cards
3. Hover over the link icon - should see:
   - Color change to primary color
   - Subtle scale animation (10% larger)
   - Smooth 150ms transition
4. Tab to the link icon (keyboard) - should see:
   - Focus ring around the button
5. Click the link icon - should unlink the card from its parent

---

## Task Checklist Completion

From `TASK_LIST.md` - Task 3.1 (UTB-002):

- [x] **3.1.1** Add hover styles: `hover:text-primary hover:scale-110`
- [x] **3.1.2** Add transition class: `transition-all duration-150`
- [x] **3.1.3** Add focus ring: `focus:outline-none focus:ring-2 focus:ring-primary`
- [x] **3.1.4** Verify tooltip text: "Click to unlink from parent" (confirmed)
- [x] **3.1.5** Ensure button has `type="button"` (confirmed)

Test Cases:
- [x] T3.1.a: Hover changes link icon color
- [x] T3.1.b: Tooltip appears on hover (existing functionality)
- [x] T3.1.c: Clicking unlinks card from parent (existing test)
- [x] T3.1.d: Focus state is visible for keyboard users

---

## Files Changed

| File | Change Type |
|------|-------------|
| `frontend/src/features/card/components/RetroCard.tsx` | Modified (1 line) |
| `frontend/tests/unit/features/card/components/RetroCard.test.tsx` | Modified (+39 lines) |
| `docs/Validation/01010101/BugFixReport_UTB-002.md` | Created |
