# UTB-034: Black Ring on Avatar Looks Incorrect

**Document Created**: 2026-01-03
**Severity**: Medium (Visual Bug)
**Status**: Open

---

## Problem Summary

The participant avatar has a black/dark ring around it which looks visually incorrect and doesn't match the design spec.

---

## Screenshot Analysis

The avatar shows:
- White/light background with initials "JO"
- Dark black ring around the avatar

This black ring is not part of the design. According to the design spec:
- Green ring = online
- No ring = offline
- Gold fill = admin

---

## Expected Behavior

Per [DESIGN_PARTICIPANT_AVATARS_V2.md](../Phase8-6/DESIGN_PARTICIPANT_AVATARS_V2.md):

```
Online Non-Admin    Online Admin       Offline User
╭─────╮            ╭─────╮            ╭─────╮
│ JS  │ green      │ JS  │ green     │ JS  │ no
│blue │ ring       │gold │ ring      │gray │ ring
╰─────╯            ╰─────╯           ╰─────╯
```

No black ring should be present.

---

## Possible Causes

1. Border/outline CSS accidentally applied
2. Ring color not properly set (defaulting to black)
3. Shadow being misinterpreted as ring

---

## Acceptance Criteria

- [ ] Remove black ring from avatars
- [ ] Green ring only for online users
- [ ] No ring for offline users
- [ ] Gold fill (not ring) for admins

---

*Bug identified during user testing - 2026-01-03*
