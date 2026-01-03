# UTB-020: Card Content Editing Not Working

**Document Created**: 2026-01-02
**Severity**: High (P0)
**Component**: Card edit functionality
**Status**: Open
**Source**: Phase 8-4 QA Report - 3 failing tests

---

## Problem

Card owners cannot click on card content to enter edit mode. The edit textarea does not appear.

---

## Failing Tests (from Phase 8-4)

| Test File | Test Name | Error |
|-----------|-----------|-------|
| 11-bug-regression.spec.ts:305 | card owner can click to enter edit mode | Edit textarea not visible |
| 11-bug-regression.spec.ts | edited content is saved on blur | Timeout on textarea |
| 11-bug-regression.spec.ts | Escape cancels edit without saving | Timeout on textarea |

---

## Steps to Reproduce

1. Create a board and add a card
2. As the card owner, click on the card content text
3. Expected: Edit mode activates, textarea appears
4. Actual: Nothing happens, no textarea visible

---

## Root Cause Investigation

1. Click handler on card content not triggering edit mode
2. `card-edit-textarea` testid not present in DOM
3. Edit state not being set correctly
4. Component may be checking wrong ownership condition

---

## Files to Investigate

- `frontend/src/features/card/components/RetroCard.tsx` - Click handler, edit state
- `frontend/src/features/card/viewmodels/useCardViewModel.ts` - Edit mode logic
- Look for `isEditing` state and `setIsEditing` handler

---

## Acceptance Criteria

- [ ] Card owner can click content to enter edit mode
- [ ] Edit textarea appears with `data-testid="card-edit-textarea"`
- [ ] Enter/Blur saves edited content
- [ ] Escape cancels edit without saving
- [ ] Non-owner cannot edit card content
- [ ] All 3 E2E tests pass

---

*Bug from Phase 8-4 QA Report - 2026-01-02*
