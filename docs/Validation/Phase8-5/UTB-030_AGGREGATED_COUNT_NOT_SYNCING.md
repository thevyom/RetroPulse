# UTB-030: Aggregated Reaction Count Not Syncing Between Parent and Child

**Document Created**: 2026-01-02
**Severity**: High
**Component**: Card reaction aggregation
**PRD Reference**: [FR-2.4](../PRD.md#24-card-linking), [FR-2.3](../PRD.md#23-reactions)
**Status**: Open

---

## Problem

When cards are linked (parent-child relationship):
1. Parent card does not show the new aggregate reaction count after linking
2. Changes to child card reactions do not update parent's aggregated count
3. Changes to parent card reactions do not reflect in aggregate display

---

## Steps to Reproduce

### Scenario A: Linking doesn't update aggregate
1. Create two feedback cards
2. Add 2 reactions to card A, 3 reactions to card B
3. Link card B to card A (B becomes child of A)
4. Expected: Card A shows aggregated count of 5 (2 own + 3 child)
5. Actual: Card A still shows 2

### Scenario B: Child reaction change doesn't propagate
1. With linked cards (A parent, B child)
2. Add a reaction to child card B
3. Expected: Parent A's aggregated count increases
4. Actual: Parent A's count unchanged

### Scenario C: Parent reaction change doesn't update display
1. With linked cards (A parent, B child)
2. Add a reaction to parent card A
3. Expected: Aggregated count reflects both own + child reactions
4. Actual: Count may not update correctly

---

## Current Behavior

- `direct_reaction_count` updates correctly on individual cards
- `aggregated_reaction_count` does not recalculate on:
  - Card linking
  - Child card reaction changes
  - Parent card reaction changes

---

## Expected Behavior

Per PRD:
- Parent card displays `aggregated_reaction_count` = own reactions + sum of all children's reactions
- Count updates in real-time when:
  - A new child is linked
  - A child is unlinked
  - Any reaction is added/removed on parent or children
- WebSocket broadcasts count changes to all users

---

## Root Cause Analysis (To Investigate)

Potential causes:
1. `incrementReactionCount` in cardStore not propagating to parent
2. Backend not recalculating `aggregated_reaction_count` on link/unlink
3. WebSocket event not including updated parent data
4. Frontend not fetching parent after child reaction change

**Related Phase 8-4 failure:**
```
TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
// Waiting for aggregated count to update
at helpers.ts:780
```

---

## Acceptance Criteria

- [ ] Linking a card updates parent's aggregated_reaction_count immediately
- [ ] Unlinking a card updates parent's aggregated_reaction_count immediately
- [ ] Adding reaction to child updates parent's aggregated_reaction_count
- [ ] Removing reaction from child updates parent's aggregated_reaction_count
- [ ] Adding reaction to parent updates aggregated_reaction_count correctly
- [ ] All users see updated counts via WebSocket
- [ ] Edge case: Multiple children aggregate correctly

---

## Technical Requirements

### Backend Changes (if needed)
```typescript
// On link/unlink, recalculate parent aggregate
async function recalculateAggregatedCount(parentId: string) {
  const parent = await Card.findById(parentId);
  const children = await Card.find({ parent_card_id: parentId });

  const childSum = children.reduce((sum, c) => sum + c.direct_reaction_count, 0);
  parent.aggregated_reaction_count = parent.direct_reaction_count + childSum;
  await parent.save();

  // Broadcast update
  io.to(parent.board_id).emit('card:updated', parent);
}
```

### Frontend Changes (if needed)
```typescript
// In cardStore, when child reaction changes
incrementReactionCount(cardId) {
  const card = this.cards.get(cardId);
  card.direct_reaction_count++;

  // If card has parent, update parent's aggregate
  if (card.parent_card_id) {
    const parent = this.cards.get(card.parent_card_id);
    if (parent) {
      parent.aggregated_reaction_count++;
    }
  }
}
```

---

## Files to Investigate

- `frontend/src/models/stores/cardStore.ts` - incrementReactionCount, linkCard, unlinkCard
- `backend/src/domains/card/card.controller.ts` - link/unlink/reaction endpoints
- `backend/src/domains/card/card.service.ts` - Business logic for aggregation

---

*Bug identified during Phase 8-5 planning review - 2026-01-02*
