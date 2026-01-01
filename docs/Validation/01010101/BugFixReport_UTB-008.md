# Bug Fix Report: UTB-008 - Card/Reaction Limit Controls

**Bug ID**: UTB-008
**Date**: 2026-01-01
**Status**: Fixed
**Severity**: Medium
**Component**: CreateBoardDialog

---

## Summary

The Create Board dialog had no UI to set card limits or reaction limits per user. Users could not configure quotas when creating a new board.

---

## Problem Description

The `CreateBoardDialog` component already had the underlying state and logic for card/reaction limits (from `useCreateBoardViewModel`), but there was no UI exposed to configure these values:
- `card_limit_per_user` was always `null`
- `reaction_limit_per_user` was always `null`
- No way for board creators to set quotas

---

## Root Cause Analysis

The view model supported limits, but the dialog UI never exposed controls for them. The state variables existed but weren't connected to any user-facing inputs.

---

## Solution

### Changes Made

**File: `frontend/src/features/home/components/CreateBoardDialog.tsx`**

1. Added state for controlling limit UI:
   ```tsx
   const [showAdvanced, setShowAdvanced] = useState(false);
   const [cardLimitEnabled, setCardLimitEnabled] = useState(false);
   const [reactionLimitEnabled, setReactionLimitEnabled] = useState(false);
   const [cardLimitError, setCardLimitError] = useState<string | null>(null);
   const [reactionLimitError, setReactionLimitError] = useState<string | null>(null);
   ```

2. Added validation helper:
   ```tsx
   const validateLimit = useCallback((value: number | null) => {
     if (value === null) return { isValid: true, error: null };
     if (value < 1 || value > 999) {
       return { isValid: false, error: 'Must be a number between 1 and 999' };
     }
     return { isValid: true, error: null };
   }, []);
   ```

3. Added collapsible "Advanced Settings" section with:
   - Toggle button with `aria-expanded`
   - Cards per User: Unlimited/Limit radio buttons with number input
   - Reactions per User: Unlimited/Limit radio buttons with number input
   - Validation errors with `role="alert"`
   - Proper accessibility labels

4. Updated form submission to validate limits before submitting.

5. Added reset in `useEffect` when dialog closes to reset advanced settings state.

### UI Structure

```
┌─────────────────────────────────────────┐
│ Advanced Settings              [▶/▼]    │
├─────────────────────────────────────────┤
│ Cards per User                          │
│ ○ Unlimited  ○ Limit [___]              │
│                                         │
│ Reactions per User                      │
│ ○ Unlimited  ○ Limit [___]              │
└─────────────────────────────────────────┘
```

---

## Test Results

### Unit Tests

**File**: `frontend/tests/unit/features/home/components/CreateBoardDialog.test.tsx`

**Tests Added**: 26 new tests in "Advanced Settings (UTB-008)" describe block

| Test Category | Tests |
|--------------|-------|
| Collapsible toggle | 4 tests |
| Default states | 2 tests |
| Radio button interactions | 3 tests |
| Value entry | 2 tests |
| Validation errors | 4 tests |
| Form submission | 5 tests |
| State reset | 2 tests |
| Accessibility | 4 tests |

### Test Run Output

```
> npm run test:run -- tests/unit/features/home/components/CreateBoardDialog.test.tsx

 ✓ tests/unit/features/home/components/CreateBoardDialog.test.tsx (73 tests) 45.32s

 Test Files  1 passed (1)
      Tests  73 passed (73)
```

---

## Code Review Summary

### Praise
- Clean state management with separate enabled flags and value states
- Excellent accessibility: `aria-expanded`, `aria-invalid`, `aria-label`, `role="alert"`
- Well-designed `validateLimit` callback with clear rules (1-999)
- Comprehensive test coverage (26 new tests)

### Suggestions (optional)
- Add `aria-controls` to link toggle button to content panel
- Add `disabled={isCreating}` to number inputs to match other form fields

### Verdict
**Approved** - Implementation is solid, well-tested, and follows existing patterns.

---

## Verification Steps

1. Navigate to the home page and click "Create Board"
2. Verify "Advanced Settings" toggle is visible and collapsed by default
3. Click toggle to expand - should show Cards and Reactions per User sections
4. Verify both default to "Unlimited" radio option
5. Select "Limit" for cards - number input should appear
6. Enter a valid value (e.g., 5) - no error shown
7. Enter invalid value (0 or 1000) - error message appears
8. Switch back to "Unlimited" - input disappears, error clears
9. Set both limits and create board - verify API receives correct values
10. Close and reopen dialog - verify settings are reset

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/features/home/components/CreateBoardDialog.tsx` | Added Advanced Settings UI section |
| `frontend/tests/unit/features/home/components/CreateBoardDialog.test.tsx` | Added 26 new tests |

---

*Report generated: 2026-01-01*
