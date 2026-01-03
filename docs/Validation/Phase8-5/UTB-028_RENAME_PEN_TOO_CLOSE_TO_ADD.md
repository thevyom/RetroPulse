# UTB-028: Board Rename Pen Icon Too Close to Add Card Button

**Document Created**: 2026-01-01
**Severity**: Medium
**Component**: [RetroBoardHeader.tsx](../../frontend/src/features/board/components/RetroBoardHeader.tsx)
**PRD Reference**: [FR-1.1.7](../PRD.md#11-board-creation)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 4.2](../frontend/UI_UX_DESIGN_SPECIFICATION.md#42-board-title-section)
**Status**: Open

---

## Problem

The board rename pencil icon (✏️) is positioned too close to the Add Card button (+), causing user confusion and accidental clicks.

---

## Steps to Reproduce

1. Open a board
2. Look at the header area
3. Try to click the pencil icon to rename the board
4. Notice proximity to the Add Card button

---

## Current Behavior

The pencil icon for renaming the board is visually close to or confused with the Add Card (+) button, leading to:
- Accidental board renames when trying to add cards
- Accidental card creation when trying to rename board
- General confusion about which icon does what

---

## Expected Behavior

Clear visual and spatial separation between board management controls (rename) and card creation controls.

---

## Proposed Solutions

**Option A: Move Rename to Board Title** (Recommended)
```
┌─────────────────────────────────────────────────────────────┐
│ Sprint 5 Retro ✏️         [Close Board]  [Copy Link]        │
│                                                              │
│ Participants: ...                     Sort: [▼] [↑↓]        │
└─────────────────────────────────────────────────────────────┘

Columns:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ What Went   │  │ Improvements│  │ Actions     │
│ Well    [+] │  │         [+] │  │         [+] │
└─────────────┘  └─────────────┘  └─────────────┘
```
- Rename icon stays with board title in header (row 1)
- Add Card buttons are in column headers (separate row)

**Option B: Inline Title Edit on Click**
- Remove the pencil icon entirely
- Click on board title text to enter edit mode (for admins)
- Cursor changes to text cursor on hover
- Reduces icon clutter

**Option C: Increase Spacing**
- Keep current positions but add more padding/margin
- Minimum 24px gap between unrelated controls

---

## Recommendation

**Option B (Inline Edit)** provides the cleanest UX:
1. No extra icon cluttering the UI
2. Direct manipulation pattern (click text to edit)
3. Common pattern in modern apps (Notion, Trello)
4. Tooltip on hover: "Click to rename" (for admins)

Fallback: **Option A** if inline edit is technically complex.

---

## Acceptance Criteria

- [ ] Clear visual separation between board rename and add card actions
- [ ] Users can easily distinguish between the two actions
- [ ] No accidental clicks on wrong control
- [ ] Rename action is still discoverable for admins

---

## Design Spec Update Required

If Option B (Inline Edit):
```
**Board Title**:
- Display: "Sprint 5 Retro" (16px bold)
- Admin hover: cursor: text, subtle underline
- Click: Inline edit mode (text input replaces title)
- Tooltip (admin only): "Click to rename board"
- No separate pencil icon
```

---

*Bug identified during user testing session - 2026-01-01*
