# UX Enhancement: Avatar Context Menu for Admin Actions

**Document Created**: 2026-01-01
**Type**: UX Enhancement
**Priority**: P1 (Should Have)
**Status**: Approved for Implementation

---

## Summary

Replace the "Make Admin" dropdown button in the header with a context menu on participant avatars. This keeps the primary click action (filter) intact while providing secondary admin actions via right-click (desktop) or long-press (touch).

---

## Problem Statement

The current "Make Admin" dropdown in the header:
- Takes up valuable header space
- Is disconnected from the user it affects
- Adds visual clutter to the participant bar

---

## Proposed Solution

### Interaction Model

| Platform | Primary Action | Secondary Action |
|----------|----------------|------------------|
| Desktop | Click → Filter by user | Right-click → Context menu |
| Touch | Tap → Filter by user | Long-press → Context menu |

### Context Menu Options

For board admins viewing non-admin participants:
```
┌─────────────────────┐
│ 👑 Make Admin       │
│ ─────────────────── │
│ 👁️ View Cards       │  (filters to this user)
└─────────────────────┘
```

For board creator viewing co-admins:
```
┌─────────────────────┐
│ ❌ Remove Admin     │
│ ─────────────────── │
│ 👁️ View Cards       │
└─────────────────────┘
```

For non-admins (no admin actions available):
```
┌─────────────────────┐
│ 👁️ View Cards       │
└─────────────────────┘
```

### Visual Feedback

- Right-click/long-press shows context menu at cursor/finger position
- Menu dismisses on click outside or Escape key
- Selected action provides immediate feedback (toast for admin changes)

### Discoverability

To help users discover the context menu:
1. Tooltip on hover shows: `"John Smith"` (first hover) → `"John Smith (right-click for options)"` (for admins)
2. First-time admin hint: Brief tooltip on first board creation explaining the feature

---

## Acceptance Criteria

- [ ] Right-click on avatar opens context menu (desktop)
- [ ] Long-press on avatar opens context menu (touch/tablet)
- [ ] Primary click action (filter) remains unchanged
- [ ] "Make Admin" option visible only to current admins
- [ ] "Remove Admin" option visible only to board creator
- [ ] Context menu dismisses on click outside or Escape
- [ ] Remove "Make Admin" dropdown button from header
- [ ] Tooltip hints at context menu availability for admins

---

## PRD Reference

This enhancement modifies:
- [FR-1.3.1](../../PRD.md#13-board-administration): Board admin designation method
- [FR-1.3.2](../../PRD.md#13-board-administration): Admin selection interface

---

## Design Spec Reference

This enhancement modifies:
- [UI_UX_DESIGN_SPECIFICATION.md Section 4.3](../../frontend/UI_UX_DESIGN_SPECIFICATION.md#43-participants-section): Participants section interaction

---

## Implementation Notes

### Components Affected

- [ParticipantBar.tsx](../../../frontend/src/features/participant/components/ParticipantBar.tsx)
- [ParticipantAvatar.tsx](../../../frontend/src/features/participant/components/ParticipantAvatar.tsx) (new or modified)

### shadcn/ui Components

Use `<ContextMenu>` from shadcn/ui:
```tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
```

### Event Handling

```tsx
// Desktop: onContextMenu for right-click
// Touch: onTouchStart + timer for long-press (500ms)
```

---

## Related Documents

- [PRD.md](../../PRD.md) - Updated with new interaction model
- [UI_UX_DESIGN_SPECIFICATION.md](../../frontend/UI_UX_DESIGN_SPECIFICATION.md) - Updated Section 4.3
- [USER_TESTING_BUGS_01011530.md](../01011530/USER_TESTING_BUGS_01011530.md) - Origin of enhancement idea

---

*Enhancement proposed during user testing session - 2026-01-01*
