# UTB-032: Card Header Elements Misaligned

**Document Created**: 2026-01-03
**Severity**: Low (Visual)
**Status**: Open

---

## Problem Summary

The card header elements (drag handle, anonymous icon on left; reaction count, delete button on right) are not vertically aligned. The left and right sections sit at different vertical positions.

---

## Screenshot Analysis

```
┌──────────────────────────────────────────┐
│ ⋮⋮  👻                      👍 1    🗑  │  <- Icons not on same baseline
│                                          │
│ Card 1                                   │
└──────────────────────────────────────────┘
```

The ghost icon and reaction/delete buttons appear at different vertical levels.

---

## Root Cause

**Location**: [RetroCard.tsx:333-454](frontend/src/features/card/components/RetroCard.tsx#L333-L454)

```tsx
{/* Card Header - Full width drag handle (UTB-019) */}
<div
  className={cn(
    'mb-2 flex items-start justify-between min-h-[30px]',  // <-- items-start causes misalignment
    // ...
  )}
>
```

The header uses `items-start` which aligns children to the top. This causes issues when:
1. Left side has only icons (small height)
2. Right side has buttons with padding (taller)

The `min-h-[30px]` tries to compensate but doesn't fix the vertical centering.

---

## Proposed Fix

Change `items-start` to `items-center`:

```tsx
<div
  className={cn(
    'mb-2 flex items-center justify-between',  // <-- items-center for proper alignment
    canDrag && !hasParent && 'cursor-grab active:cursor-grabbing',
    // ...
  )}
>
```

Also ensure both left and right containers use `items-center`:

**Left side** (line 348):
```tsx
<div className="flex items-center gap-2">
```
This is already correct.

**Right side** (line 400):
```tsx
<div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
```
This is already correct.

The fix is simply changing the parent container from `items-start` to `items-center`.

---

## Acceptance Criteria

- [ ] Drag handle icon vertically aligned with reaction button
- [ ] Anonymous/author icons vertically aligned with action buttons
- [ ] Consistent vertical centering across all card states
- [ ] No visual regression on cards with/without children

---

*Bug identified during user testing - 2026-01-03*
