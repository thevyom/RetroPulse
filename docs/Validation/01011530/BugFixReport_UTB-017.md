# Bug Fix Report: UTB-017

**Bug ID**: UTB-017
**Title**: Filter Should Be Single-Selection Only
**Status**: Fixed
**Date**: 2026-01-01
**Developer**: Software Developer Agent

---

## Bug Information

**Description**: Filter may allow multi-select. Should be single-select only: All, Anonymous, OR one user at a time.

**Expected Behavior**: Clicking a participant filter should deselect any previously selected filter. Only one filter option should be active at a time.

**Actual Behavior (Before Fix)**: Clicking multiple user avatars would add each user to the `selectedUsers` array, allowing multiple users to be selected simultaneously.

**Severity**: Medium
**Component**: ParticipantBar / useParticipantViewModel

---

## Root Cause Analysis

The bug was located in the `handleToggleUserFilter` function within `useParticipantViewModel.ts`.

### Original Code (Buggy)

```typescript
const handleToggleUserFilter = useCallback((alias: string) => {
  setSelectedUsers((prev) => {
    const isSelected = prev.includes(alias);
    const newSelected = isSelected ? prev.filter((a) => a !== alias) : [...prev, alias];

    // If no users selected, show all
    if (newSelected.length === 0) {
      setShowAll(true);
    } else {
      setShowAll(false);
      // User filters are mutually exclusive with anonymous-only
      setShowOnlyAnonymous(false);
    }

    return newSelected;
  });
}, []);
```

**Problem**: The line `[...prev, alias]` appends the new selection to the existing array instead of replacing it, allowing multi-selection.

---

## Solution Implemented

### Fixed Code

```typescript
const handleToggleUserFilter = useCallback((alias: string) => {
  setSelectedUsers((prev) => {
    const isSelected = prev.includes(alias);

    // Single-select only: clicking the same user deselects, clicking a different user replaces selection
    // UTB-017: Filter should be single-selection only (All, Anonymous, OR one user at a time)
    if (isSelected) {
      // Deselecting the current user - revert to show all
      setShowAll(true);
      setShowOnlyAnonymous(false);
      return [];
    } else {
      // Selecting a new user - replace any existing selection with just this user
      setShowAll(false);
      setShowOnlyAnonymous(false);
      return [alias];
    }
  });
}, []);
```

### Key Changes

1. **Single-select enforcement**: Changed `[...prev, alias]` to `[alias]` to ensure only one user can be selected at a time
2. **Clear state on selection**: Any new user selection clears both `showAll` and `showOnlyAnonymous` flags
3. **Deselect behavior**: Clicking the already-selected user deselects it and reverts to "show all" state
4. **Added documentation**: Included comments explaining the single-select behavior and referencing the bug ID

---

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` | Bug fix |
| `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts` | Test update |
| `frontend/tests/unit/features/participant/components/ParticipantBar.test.tsx` | Test addition |

---

## Code Review Comments

### Summary: Approved

| Category | Status |
|----------|--------|
| Correctness | Pass |
| Security | N/A |
| Tests | Pass |
| Edge Cases | Pass |
| Readability | Pass |
| Consistency | Pass |

### Feedback

- **(praise)** Good use of comments explaining the behavior and referencing the bug ID
- **(praise)** Clean logic with clear handling of select/deselect cases
- **(praise)** Comprehensive test coverage added for single-select behavior

No blocking issues identified.

---

## Test Results

### Tests Added

**ViewModel Tests** (`useParticipantViewModel.test.ts`):
- `should enforce single user selection only (UTB-017 fix)` - Verifies that selecting a second user replaces the first

**Component Tests** (`ParticipantBar.test.tsx`):
- `should show single user as selected when selectedUsers contains one user`
- `should show mutually exclusive filter states - user selected`
- `should show mutually exclusive filter states - anonymous selected`
- `should show mutually exclusive filter states - all users selected`
- `should call onToggleUser with correct alias for single selection`

### Test Execution

```
Test Files  2 passed (2)
Tests       58 passed (58)
Duration    8.99s
```

All 58 tests in the participant test suites pass, including:
- 34 tests in `useParticipantViewModel.test.ts`
- 24 tests in `ParticipantBar.test.tsx`

---

## Verification Checklist

- [x] Filter only allows single user selection
- [x] Selecting a new user deselects the previous user
- [x] Selecting "All" deselects any user selection
- [x] Selecting "Anonymous" deselects any user selection
- [x] Selecting a user deselects "All" and "Anonymous"
- [x] Visual indicator (ring) shows only on the active filter
- [x] Unit tests cover single-select behavior
- [x] All existing tests still pass
- [x] Code review completed with no blocking issues

---

## Related Documentation

- Task List: `docs/Validation/01011530/TASK_LIST.md` (Task 2.2)
- Component: `frontend/src/features/participant/components/ParticipantBar.tsx`
- ViewModel: `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`

---

*Report generated by Software Developer Agent - 2026-01-01*
