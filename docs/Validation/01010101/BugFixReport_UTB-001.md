# Bug Fix Report - UTB-001

**Bug ID**: UTB-001
**Title**: Add Creator Alias Input to Board Creation Dialog
**Date Fixed**: 2026-01-01
**Status**: Fixed

---

## Bug Summary

Board creators bypass the alias prompt flow entirely, resulting in no alias being set when creating a new board. This violates PRD FR-1.2.3 which requires users be prompted for alias on first board access.

---

## Root Cause

The `CreateBoardDialog` component only collected the board name field. There was no input for the creator's alias, and the `createBoard` API call did not include a `creator_alias` parameter.

---

## Solution Implemented

### Files Modified

1. **[CreateBoardDialog.tsx](../../../frontend/src/features/home/components/CreateBoardDialog.tsx)**
   - Added `creatorAlias` state variable (string)
   - Added `aliasError` state variable for validation feedback
   - Added "Your Name" input field between board name and column preview
   - Added `onChange` handler to update `creatorAlias` state
   - Imported `validateAlias` from `@/shared/validation`
   - Added alias validation in `handleSubmit` before board creation
   - Display alias validation error below input when invalid
   - Updated `createBoard` call to include `creator_alias` parameter
   - Disabled submit button when alias is empty or invalid

2. **[board.ts](../../../frontend/src/models/types/board.ts)**
   - Extended `CreateBoardDTO` interface to include optional `creator_alias` field

3. **[CreateBoardDialog.test.tsx](../../../frontend/tests/unit/features/home/components/CreateBoardDialog.test.tsx)**
   - Updated all existing tests to include alias input
   - Added new tests for alias validation (empty, max length, invalid characters)
   - Added tests for alias error display and clearing
   - Updated form submission assertions to include `creator_alias`

---

## Code Review Comments

The following items were identified and addressed during code review:

| Type | Description | Resolution |
|------|-------------|------------|
| (blocking) | Tests needed updating for new alias field | All 31 tests updated and passing |
| (blocking) | Mock assertions missing `creator_alias` | Updated all mock call verifications |
| (suggestion) | Consider clearing both errors on submit | Both errors cleared in `handleSubmit` after validation passes |
| (nit) | Long disabled condition on submit button | Kept as-is for clarity; can refactor if needed |

---

## Test Results

### Unit Tests
- **Total Tests**: 31 (CreateBoardDialog.test.tsx)
- **Passed**: 31
- **Failed**: 0

### New Test Cases Added
| Test Case | Description | Status |
|-----------|-------------|--------|
| T1.1.a | Submit blocked when alias is empty | PASS |
| T1.1.b | Submit blocked when alias exceeds 30 chars | PASS |
| T1.1.c | Submit blocked when alias contains invalid characters | PASS |
| T1.1.d | Successful creation includes alias in API request | PASS |
| should display creator alias input | Alias input field rendered | PASS |
| should display Your Name label | Label rendered correctly | PASS |
| should keep submit disabled when only board name is entered | Button disabled | PASS |
| should keep submit disabled when only alias is entered | Button disabled | PASS |
| should clear alias error when user types | Error cleared on input | PASS |
| should mark alias input as invalid when error exists | aria-invalid set | PASS |
| should have error message linked to alias input | aria-describedby set | PASS |

### Full Test Suite
- **Total Tests**: 756
- **Passed**: 756
- **Skipped**: 1
- **Failed**: 0

---

## Verification Steps

1. Navigate to home page
2. Click "Create New Board"
3. Verify "Your Name" input field is visible between board name and column preview
4. Try submitting with empty alias - should be blocked
5. Enter alias exceeding 30 characters - should show error
6. Enter alias with special characters (@#$%) - should show error
7. Enter valid alias (e.g., "John") and valid board name
8. Submit - should create board and navigate to new board
9. Verify creator appears in participant bar with entered alias

---

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| Alias input field visible in dialog | DONE |
| Alias is required (cannot be empty) | DONE |
| Alias validation (max 30 chars, valid characters) | DONE |
| Validation errors displayed appropriately | DONE |
| Submit button disabled when alias invalid | DONE |
| Creator alias sent to API on board creation | DONE |
| All unit tests passing | DONE |

---

## Notes

- Backend must accept `creator_alias` in the board creation endpoint
- Backend should auto-join the creator to the board with the provided alias
- Related task UTB-011 (Card Deletion for Creator) depends on this fix

---

*Report generated: 2026-01-01*
