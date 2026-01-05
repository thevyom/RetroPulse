# UTB-038: Right-Click Admin Promotion Not Implemented

**Document Created**: 2026-01-03
**Severity**: High (Missing Feature)
**Status**: Open

---

## Problem Summary

The design spec calls for right-click/long-press on participant avatar to show context menu with "Make Admin" option. This functionality does not appear to be implemented.

---

## Design Spec Reference

From [DESIGN_PARTICIPANT_AVATARS_V2.md](../Phase8-6/DESIGN_PARTICIPANT_AVATARS_V2.md):

```
Right-click on non-admin avatar:
┌─────────────────────┐
│ John Smith          │
├─────────────────────┤
│ Filter by user      │
│ Make Admin      👑  │
└─────────────────────┘
```

---

## Current Behavior

- Right-clicking on participant avatar does nothing (or shows browser context menu)
- No "Make Admin" option visible
- Long-press on mobile not tested

---

## Expected Behavior

When an admin right-clicks on another participant's avatar:
1. Context menu appears
2. Shows user's name
3. "Filter by user" option
4. "Make Admin" option (if user is not already admin)

When a non-admin right-clicks:
1. Context menu appears
2. Shows user's name
3. "Filter by user" option only
4. No "Make Admin" option

---

## Implementation Notes

Need to:
1. Add `onContextMenu` handler to ParticipantAvatar
2. Create ContextMenu component (can use Radix UI ContextMenu)
3. Check if current user is admin before showing "Make Admin"
4. Call existing `handlePromoteToAdmin` function

---

## Related

- This feature was intended to replace the AdminDropdown button
- AdminDropdown should be removed once this is working

---

## Acceptance Criteria

- [ ] Right-click on participant avatar shows context menu
- [ ] Context menu shows user's name at top
- [ ] "Filter by user" option works
- [ ] "Make Admin" option visible only to admins
- [ ] "Make Admin" promotes user and shows toast notification
- [ ] Avatar changes to gold fill after promotion
- [ ] Long-press works on mobile/touch devices

---

*Bug identified during user testing - 2026-01-03*
