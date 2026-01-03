# UTB-022: Avatar Tooltip Shows Wrong Text

**Document Created**: 2026-01-02
**Severity**: Medium (P1)
**Component**: ParticipantAvatar tooltip
**Status**: Open
**Source**: Phase 8-4 QA Report - 1 failing test

---

## Problem

Hovering over a participant avatar shows "All Users" in the tooltip instead of the user's name.

---

## Failing Test (from Phase 8-4)

| Test File | Test Name | Error |
|-----------|-----------|-------|
| 11-bug-regression.spec.ts:665 | hovering avatar shows tooltip with full name | Expected pattern: /Tooltip/i, Received: "All Users" |

---

## Steps to Reproduce

1. Open a board with multiple participants
2. Hover over a user's avatar in the participant bar
3. Expected: Tooltip shows "John Smith" (the user's name)
4. Actual: Tooltip shows "All Users"

---

## Root Cause Analysis

The tooltip is likely pointing to the wrong element or using the wrong data source:
- Tooltip may be bound to the "All Users" filter button instead of individual avatars
- Tooltip content may not be receiving the correct user prop
- CSS/positioning may be causing tooltip to appear on wrong element

---

## Files to Investigate

- `frontend/src/features/participant/components/ParticipantAvatar.tsx` - Tooltip binding
- `frontend/src/features/participant/components/ParticipantBar.tsx` - Avatar rendering

---

## Acceptance Criteria

- [ ] Hovering user avatar shows that user's full name
- [ ] Hovering "All Users" button shows "All Users" or "Show all cards"
- [ ] Hovering "Anonymous" button shows "Anonymous" or "Show anonymous cards"
- [ ] E2E test passes

---

*Bug from Phase 8-4 QA Report - 2026-01-02*
