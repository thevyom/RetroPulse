# UTB-037: New Columns Always Added at End - No Reordering

**Document Created**: 2026-01-03
**Severity**: Medium (Feature Gap)
**Status**: Open

---

## Problem Summary

When adding a new column, it's always appended to the end of the column list. There's no way to:
1. Insert a column at a specific position
2. Reorder existing columns after creation

---

## Current Behavior

1. User clicks "+ Add" to create new column
2. New column appears at the rightmost position
3. No drag handles or reorder functionality exists

---

## Expected Behavior

Users should be able to:
1. **Drag columns** to reorder them
2. Or have a **position selector** when creating new column
3. Or have **move left/right buttons** on column headers

---

## Proposed Solutions

### Option A: Drag-and-Drop Columns
- Add drag handle to column header
- Allow dragging columns to reorder
- Visual feedback during drag

### Option B: Position Dropdown on Create
```
┌─────────────────────────────────┐
│     Add New Column              │
│                                 │
│  Name: [____________]           │
│  Color: [🔴🟠🟡🟢🔵]            │
│  Position: [After "To Improve" ↓]│
│                                 │
│        [Cancel] [Add]           │
└─────────────────────────────────┘
```

### Option C: Column Header Actions
```
┌─────────────────────────┐
│ What Went Well  [⋮]     │
│                 ├─────────┤
│                 │ Move Left │
│                 │ Move Right│
│                 │ Delete    │
│                 └─────────┘
└─────────────────────────┘
```

---

## Recommendation

Option A (drag-and-drop) is most intuitive but requires more implementation effort.

Option C (header actions) is simpler to implement and still provides the functionality.

---

## Acceptance Criteria

- [ ] Users can change column order after creation
- [ ] Clear visual indication of how to reorder
- [ ] Order persists after page refresh
- [ ] Works for both admins and board creators

---

*Bug identified during user testing - 2026-01-03*
