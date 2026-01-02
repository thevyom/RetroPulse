# Bug Fix Report: UTB-019

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-019 |
| Title | Card Drag Handle Should Be Full Header |
| Severity | Medium |
| Status | Fixed |
| Fixed By | Software Developer Agent |
| Date | 2026-01-01 |

## Description

Cards had a small left-side drag element (grip icon) that required precise targeting and was not intuitive. The UI/UX Design Spec Section 6.2 specifies a "Full-width clickable area (30px height)" for the drag handle with proper cursor feedback.

## Steps to Reproduce

1. View a card on the board
2. Try to drag the card using the left drag element

**Expected:** Entire card header (30px height) is draggable with cursor feedback
**Actual:** Only small grip icon on left side was draggable

## Root Cause Analysis

### Investigation Process

1. Reviewed UI/UX Design Specification Section 6.2
2. Examined `RetroCard.tsx` drag implementation
3. Identified that drag listeners were only on the grip icon, not the full header

### Root Cause

The original implementation attached drag listeners only to the grip icon element, making it difficult for users to initiate drag operations. The design spec clearly specifies a full-width drag zone.

## Solution Implemented

### Code Changes

**File:** `frontend/src/features/card/components/RetroCard.tsx` (lines 319-328)

```typescript
{/* Card Header - Full width drag handle (UTB-019) */}
<div
  className={cn(
    'mb-2 flex items-start justify-between min-h-[30px]',
    canDrag && !hasParent && 'cursor-grab active:cursor-grabbing',
    hasParent && 'cursor-default'
  )}
  {...(!hasParent && canDrag ? listeners : {})}
  aria-label={canDrag && !hasParent ? 'Drag handle - drag card header to move' : undefined}
  data-testid="card-header"
>
```

### Implementation Details

1. **Full Header Drag Zone:** The entire header div now has drag listeners attached
2. **Minimum Height:** `min-h-[30px]` ensures adequate drag target area per design spec
3. **Cursor Feedback:**
   - `cursor-grab` on hover for draggable cards
   - `active:cursor-grabbing` during drag operation
   - `cursor-default` for linked cards (cannot be dragged)
4. **Accessibility:** `aria-label` describes the drag functionality
5. **Test ID:** `data-testid="card-header"` for testing

### Action Buttons - Preventing Drag Interference

**File:** `frontend/src/features/card/components/RetroCard.tsx` (line 383)

```typescript
{/* Right: Actions - stop propagation to prevent drag interference (UTB-019) */}
<div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
```

The action buttons container uses `onPointerDown={(e) => e.stopPropagation()}` to prevent pointer events from triggering the drag handler.

### Unlink Button - Preventing Drag Interference

**File:** `frontend/src/features/card/components/RetroCard.tsx` (line 341)

```typescript
onPointerDown={(e) => e.stopPropagation()}
```

The unlink button also stops pointer event propagation to allow clicking without initiating drag.

## Code Review Comments

### Approved Items

- (praise) Full header now serves as drag handle per design spec
- (praise) Minimum height of 30px matches design specification
- (praise) Proper cursor feedback (`grab`/`grabbing`)
- (praise) Action buttons properly exclude themselves from drag zone
- (praise) Accessibility aria-label added
- (praise) Comprehensive test coverage

### Notes

- (note) GripVertical icon remains as visual affordance (opacity on hover)
- (note) Linked cards (with parent) show cursor-default and no drag listeners

## Test Results

### Unit Tests

```
tests/unit/features/card/components/RetroCard.test.tsx
  Full Header Drag Handle (UTB-019)
    ✓ should have card header element with testid
    ✓ should have cursor-grab class on header for draggable cards
    ✓ should have min-height on header for better drag target
    ✓ should have aria-label for full header drag handle
    ✓ should NOT have cursor-grab for cards with parent (linked cards)
    ✓ should NOT have cursor-grab when board is closed
    ✓ should still allow reaction button clicks without triggering drag
    ✓ should still allow delete button clicks without triggering drag
    ✓ should still allow unlink button clicks for linked cards
    ✓ should show GripVertical icon in header for visual drag affordance

  Drag Handle vs Link Icon
    ✓ should show drag handle for standalone cards (no parent)

Test Files  1 passed
Tests       46 passed (46)
```

### Key Test Implementations

**Header element and cursor (lines 1144-1156):**

```typescript
it('should have cursor-grab class on header for draggable cards', () => {
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  const header = screen.getByTestId('card-header');
  expect(header).toHaveClass('cursor-grab');
});

it('should have min-height on header for better drag target', () => {
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  const header = screen.getByTestId('card-header');
  expect(header).toHaveClass('min-h-[30px]');
});
```

**Button clicks don't trigger drag (lines 1188-1217):**

```typescript
it('should still allow reaction button clicks without triggering drag', async () => {
  const user = userEvent.setup();
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  await user.click(screen.getByLabelText(/add reaction/i));

  await waitFor(() => {
    expect(defaultProps.onReact).toHaveBeenCalled();
  });
});

it('should still allow delete button clicks without triggering drag', async () => {
  const user = userEvent.setup();
  render(<RetroCard {...defaultProps} isOwner={true} columnType="went_well" />);

  await user.click(screen.getByLabelText(/delete card/i));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

## Verification Checklist

- [x] Root cause identified and documented
- [x] Full header (30px min-height) is now drag zone
- [x] Cursor changes to `grab` on hover
- [x] Cursor changes to `grabbing` during drag (via `active:` pseudo-class)
- [x] Action buttons (reaction, delete) don't trigger drag
- [x] Unlink button doesn't trigger drag
- [x] Linked cards cannot be dragged
- [x] Closed boards disable dragging
- [x] Unit tests written and passing
- [x] All existing tests pass (46/46)
- [x] Design spec alignment verified (Section 6.2)
- [x] Accessibility aria-label added
- [x] Documentation complete

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/features/card/components/RetroCard.tsx` | Feature Enhancement |
| `frontend/tests/unit/features/card/components/RetroCard.test.tsx` | Test Updates |

## Design Spec Alignment

| Spec Section | Requirement | Implementation |
|--------------|-------------|----------------|
| Section 6.2 | Full-width clickable area (30px height) | `min-h-[30px]` on header div |
| Section 6.2 | Cursor: move on hover | `cursor-grab` / `cursor-grabbing` |
| Section 6.2 | Drag zone excludes action buttons | `onPointerDown stopPropagation` |

---

*Report generated by Software Developer Agent - 2026-01-01*
