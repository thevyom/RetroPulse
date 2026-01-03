# UTB-026: Current User (MyUser) Should Have Special Avatar Position

**Document Created**: 2026-01-01
**Severity**: Medium
**Type**: UX Enhancement
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 4.3](../frontend/UI_UX_DESIGN_SPECIFICATION.md#43-participants-section)
**Status**: Open

---

## Problem

The current user's avatar is mixed in with other participants, making it hard to identify "me" at a glance.

---

## Current Behavior

All participant avatars are displayed in a single row with no distinction for the current user.

---

## Expected Behavior

The current user (myUser) should be displayed as a special avatar with distinct positioning and styling.

---

## Proposed Solution

**Recommended Layout:**
```
[All] [👻] [Me]  |  [User1] [User2] [User3...]
 ↑     ↑    ↑    |      ↑
Filter options   |  Other participants
(left section)   |  (right section, scrollable)
```

**Design Details:**

1. **Left Section (Filter Controls):**
   - "All" - Shows all cards (default)
   - "👻" (Anonymous) - Shows anonymous cards only
   - "Me" - Current user's avatar with "Me" label or distinct border

2. **Separator:** Vertical divider line

3. **Right Section (Other Participants):**
   - All other active users
   - Scrollable if overflow

**Current User Avatar Styling:**
- Distinct border color (e.g., primary blue)
- "Me" label below avatar OR
- Subtle "You" badge on avatar

---

## Benefits

1. Easy to find "my" cards quickly
2. Clear separation between filter controls and participant list
3. Current user always visible (not scrolled out of view)
4. More intuitive mental model

---

## Acceptance Criteria

- [ ] Current user avatar is visually distinct from other participants
- [ ] Current user avatar is always visible (not in scrollable area)
- [ ] Clear visual separation between filter controls and participant list
- [ ] "Me" or "You" indicator on current user avatar

---

## Design Spec Update Required

Update Section 4.3 Layout:
```
**Layout**:
┌─────────────────────────────────────────────────────────────┐
│ [All] [👻] [Me]  │  [👤U1] [👤U2] [👤U3] ... (scrollable)   │
│  ↑ filter controls    ↑ other participants                   │
└─────────────────────────────────────────────────────────────┘
```

---

*Enhancement identified during user testing session - 2026-01-01*
