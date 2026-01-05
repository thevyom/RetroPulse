# UTB-035: Participant Avatar Grey Color Looks Like Sleep/Inactive

**Document Created**: 2026-01-03
**Severity**: Medium (UX Issue)
**Status**: Open

---

## Problem Summary

The participant avatar uses grey/muted background color which gives the impression the user is inactive or "asleep". This is confusing for active, online participants.

---

## Current State

- Avatar background: Grey/muted color
- Creates impression of inactive/offline user
- Doesn't feel vibrant or "alive"

---

## Proposed Solution

Use more vibrant colors for participant avatars:

| User Type | Background Color | Ring |
|-----------|-----------------|------|
| Online Non-Admin | Blue (bg-blue-500) | Green ring |
| Online Admin | Gold/Amber (bg-amber-400) | Green ring |
| Offline Non-Admin | Light grey (bg-gray-300) | No ring |
| Offline Admin | Muted gold (bg-amber-200) | No ring |

---

## Color Suggestions

**Active users** should have vibrant colors:
- `bg-blue-500` or `bg-indigo-500` for non-admins
- `bg-amber-400` or `bg-yellow-400` for admins

**Inactive users** can be muted:
- `bg-gray-300` or `bg-slate-300` for non-admins
- `bg-amber-200` for admins

---

## Design Reference

From [DESIGN_PARTICIPANT_AVATARS_V2.md](../Phase8-6/DESIGN_PARTICIPANT_AVATARS_V2.md):

```tsx
isAdmin ? "bg-amber-400 text-gray-800" : "bg-accent text-accent-foreground"
```

The issue is `bg-accent` resolves to a muted/grey color.

---

## Acceptance Criteria

- [ ] Online non-admin avatars use vibrant blue color
- [ ] Online admin avatars use gold/amber color
- [ ] Grey only used for offline/inactive users
- [ ] Active participants feel "alive" visually

---

*Bug identified during user testing - 2026-01-03*
