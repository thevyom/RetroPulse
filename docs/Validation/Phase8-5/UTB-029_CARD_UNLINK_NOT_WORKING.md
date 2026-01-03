# UTB-029: Card Unlink Not Working - Cards Don't Separate

**Document Created**: 2026-01-02
**Severity**: High
**Component**: Card linking/unlinking functionality
**PRD Reference**: [FR-2.4](../PRD.md#24-card-linking)
**Status**: Open

---

## Problem

When a user or admin unlinks a child card from its parent, the cards do not separate into two independent cards. The unlink action appears to fail silently.

---

## Steps to Reproduce

1. Create a board with two feedback cards
2. Drag one card onto another to link them (parent-child)
3. Verify the link icon appears on the child card
4. Click the link icon to unlink the child
5. Observe that cards remain linked (do not separate)

---

## Current Behavior

- Link icon is clickable
- No visible change after clicking
- Cards remain in parent-child relationship
- No error message displayed

---

## Expected Behavior

Per PRD FR-2.4:
- Clicking the link icon should unlink the child card
- Child card should become an independent card
- Child card should return to its original position (or end of column)
- Parent card should update its aggregated counts
- Both cards should be fully independent after unlink

---

## Root Cause Analysis (To Investigate)

Potential causes:
1. API call failing silently (check network tab)
2. WebSocket `card:unlinked` event not being handled
3. Store not updating after unlink response
4. UI not reflecting store changes

**Related Phase 8-4 failure:**
```
Error: expect(received).toBe(expected)
Expected: false
Received: true
at 06-parent-child-cards.spec.ts:70:27
```

---

## Acceptance Criteria

- [ ] Click link icon successfully unlinks child from parent
- [ ] Child card becomes independent (no parent_card_id)
- [ ] Child card visually separates from parent
- [ ] Parent's aggregated_reaction_count updates
- [ ] WebSocket broadcasts unlink to other users
- [ ] No console errors during unlink operation

---

## Files to Investigate

- `frontend/src/features/card/components/Card.tsx` - Link icon click handler
- `frontend/src/models/stores/cardStore.ts` - unlinkCard action
- `frontend/src/models/api/CardAPI.ts` - API call
- `backend/src/domains/card/card.controller.ts` - Unlink endpoint

---

*Bug identified during Phase 8-5 planning review - 2026-01-02*
