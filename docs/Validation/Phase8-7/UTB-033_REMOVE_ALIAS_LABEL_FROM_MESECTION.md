# UTB-033: Remove Alias Label and Pen Icon from MeSection

**Document Created**: 2026-01-03
**Severity**: Low (UI Polish)
**Status**: Open

---

## Problem Summary

The MeSection shows "Vyom" label and pencil icon next to the avatar. This creates visual clutter - the avatar alone should be sufficient for user identity.

---

## Current State

```
╭JO╮  Vyom  ✏️
```

## Proposed State

```
╭JO╮
```

Just the avatar with:
- Initials
- Gold fill if admin
- Green ring if online
- Click to filter to my cards
- Edit alias via right-click context menu (same as other participants)

---

## Rationale

- Cleaner, more consistent with other participant avatars
- Edit functionality can move to context menu
- Reduces header clutter
- User already knows who they are

---

## Acceptance Criteria

- [ ] Remove alias text label from MeSection
- [ ] Remove pencil/edit icon from MeSection
- [ ] Add right-click context menu with "Edit Alias" option
- [ ] Avatar-only display matches other participants

---

*Bug identified during user testing - 2026-01-03*
