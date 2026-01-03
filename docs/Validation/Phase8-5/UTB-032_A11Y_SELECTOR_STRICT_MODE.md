# UTB-032: A11y Test Selector Strict Mode Violation

**Document Created**: 2026-01-02
**Severity**: Medium (P1)
**Component**: Drag handle accessibility
**Status**: Open
**Source**: Phase 8-4 QA Report - 1 failing test

---

## Problem

Accessibility test fails due to Playwright strict mode violation - selector matches 2 elements instead of 1.

---

## Failing Test (from Phase 8-4)

| Test File | Test Name | Error |
|-----------|-----------|-------|
| 10-accessibility-basic.spec.ts:55 | drag handles have accessible names | Strict mode violation - 2 elements found |

---

## Root Cause

The test selector for drag handles is not specific enough:
- Multiple elements on the page match the selector
- Likely selecting both parent card drag handle and child card drag handle
- Or selecting drag handles from multiple cards

---

## Current Test (likely)

```typescript
// Problematic - matches multiple elements
const dragHandle = page.getByRole('button', { name: /drag/i });
await expect(dragHandle).toHaveAttribute('aria-label');
```

---

## Solution Options

**Option A: Use more specific selector**
```typescript
// Select first drag handle only
const dragHandle = page.getByRole('button', { name: /drag/i }).first();
```

**Option B: Test each drag handle individually**
```typescript
const dragHandles = page.getByRole('button', { name: /drag/i });
const count = await dragHandles.count();
for (let i = 0; i < count; i++) {
  await expect(dragHandles.nth(i)).toHaveAttribute('aria-label');
}
```

**Option C: Ensure unique aria-labels**
```typescript
// Each card should have unique aria-label including card content
// aria-label="Drag card: [card content preview]"
```

---

## Files to Update

- `frontend/tests/e2e/10-accessibility-basic.spec.ts` - Fix selector
- `frontend/src/features/card/components/RetroCard.tsx` - Ensure unique aria-labels

---

## Acceptance Criteria

- [ ] A11y test selector matches single element or handles multiple correctly
- [ ] Each drag handle has unique, descriptive aria-label
- [ ] E2E accessibility test passes
- [ ] No strict mode violations

---

*Bug from Phase 8-4 QA Report - 2026-01-02*
