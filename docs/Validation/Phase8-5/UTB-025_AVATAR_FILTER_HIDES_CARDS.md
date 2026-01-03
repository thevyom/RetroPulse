# UTB-025: Clicking Participant Avatar Hides Cards Instead of Showing

**Document Created**: 2026-01-01
**Severity**: High
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-2.5.6, FR-2.5.7](../PRD.md#25-card-filtering-by-user)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 4.3](../frontend/UI_UX_DESIGN_SPECIFICATION.md#43-participants-section)
**Status**: Open

---

## Problem

Clicking on a participant avatar hides their cards instead of showing only their cards.

---

## Steps to Reproduce

1. Open a board with multiple participants and cards
2. Click on a participant's avatar in the participant bar
3. Observe the card visibility

---

## Current Behavior

Clicking on an avatar hides the cards from that user (inverted filter logic).

---

## Expected Behavior

Per PRD FR-2.5.7:
> "When a specific user filter is selected, only cards created by that user SHALL be visible"

Clicking an avatar should:
- Show ONLY that user's cards
- Hide all other users' cards

---

## Root Cause Analysis

The filter logic appears to be inverted. Likely checking `!== userId` instead of `=== userId`.

---

## Acceptance Criteria

- [ ] Clicking avatar shows only that user's cards
- [ ] All other cards are hidden/faded
- [ ] Clicking "All Users" shows all cards
- [ ] Clicking "Anonymous" shows only anonymous cards

---

*Bug identified during user testing session - 2026-01-01*
