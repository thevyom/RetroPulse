# User Testing Bugs - Frontend (Session 01012330)

**Document Created**: 2026-01-01 23:30
**Updated**: 2026-01-01 (New Bugs Added)
**Status**: Open Issues Requiring Resolution

---

## Bug Tracker Summary

| ID | Severity | Component | PRD Req | Status | Description |
|----|----------|-----------|---------|--------|-------------|
| UTB-024 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.3.2](../PRD.md#23-parent-child-card-relationships) | Open | Child card unlink button does not work |
| UTB-025 | High | [cardStore](../../frontend/src/models/stores/cardStore.ts) | [FR-3.1.9](../PRD.md#31-reaction-system) | Open | Parent aggregated count not updated on child reaction |

---

## UTB-024: Child Card Unlink Button Does Not Work

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx), [useCardViewModel.ts](../../frontend/src/features/card/viewmodels/useCardViewModel.ts)
**PRD Reference**: [FR-2.3.2](../PRD.md#23-parent-child-card-relationships)
**Status**: Open

### Steps to Reproduce

1. Create two cards in the same or different columns
2. Drag one card onto another to create a parent-child relationship
3. On the child card, click the Link2 (unlink) icon
4. Observe that the card does not unlink

### Current Behavior

When clicking the unlink button on a child card:
- The button appears clickable
- No error message is shown
- The card remains linked to the parent
- The UI does not update

### Expected Behavior

When clicking the unlink button on a child card:
- The API call should be made to unlink the cards
- The child card should become a standalone card
- The parent's children array should be updated
- The parent's aggregated_reaction_count should be recalculated

### Root Cause Analysis

**Suspected Issue 1**: The `onUnlinkFromParent` handler in RetroCard.tsx (line 257) calls `onUnlinkChild(card.id)` which passes the card's own ID. However, `handleUnlinkChild` in useCardViewModel.ts (line 651) expects the `childId` and looks up the parent from `card.parent_card_id`. This should work correctly.

**Suspected Issue 2**: The API call `CardAPI.unlinkCards(parentId, { target_card_id: childId, link_type: 'parent_of' })` may have an issue:
- Check if the backend expects different parameters
- Check if the DELETE request with data body is working correctly

**Suspected Issue 3**: The `fetchCards()` call after unlink may be failing or the store update isn't propagating.

### Code Flow Analysis

```
RetroCard.tsx:356 → handleUnlink()
  → onUnlinkFromParent()
    → RetroColumn.tsx:257 → onUnlinkChild(card.id)
      → RetroBoardPage.tsx:303 → cardVM.handleUnlinkChild(childId)
        → useCardViewModel.ts:651 → handleUnlinkChild(childId)
          → CardAPI.unlinkCards(parentId, { target_card_id: childId, link_type: 'parent_of' })
          → fetchCards() to refresh
```

### Potential Fixes

1. **Verify API endpoint**: Check if DELETE with request body is supported by axios/backend
2. **Check WebSocket handler**: The `card:unlinked` event handler should update the store
3. **Check API response**: Ensure the unlink API returns successfully

### Acceptance Criteria

- [ ] Clicking unlink icon removes child from parent
- [ ] Child card becomes standalone
- [ ] Parent's children array is updated
- [ ] Parent's aggregated_reaction_count is recalculated
- [ ] UI reflects changes immediately

---

## UTB-025: Parent Aggregated Count Not Updated on Child Reaction

**Severity**: High
**Component**: [cardStore.ts](../../frontend/src/models/stores/cardStore.ts), [useCardViewModel.ts](../../frontend/src/features/card/viewmodels/useCardViewModel.ts)
**PRD Reference**: [FR-3.1.9](../PRD.md#31-reaction-system)
**Status**: Open

### Steps to Reproduce

1. Create two cards and link them (parent-child)
2. Observe the parent card's reaction count (e.g., "5 (2 own)")
3. Click the thumbs up on the child card
4. Observe that the parent's aggregated count does not change

### Current Behavior

When adding/removing a reaction to a child card:
- The child card's `direct_reaction_count` updates correctly
- The parent card's `aggregated_reaction_count` does NOT update
- The display still shows the old aggregated value

### Expected Behavior

When adding/removing a reaction to a child card:
- Child's `direct_reaction_count` updates
- Parent's `aggregated_reaction_count` updates to reflect the sum of:
  - Parent's own `direct_reaction_count`
  - All children's `direct_reaction_count` values

### Root Cause Analysis

**Root Cause**: The `incrementReactionCount` and `decrementReactionCount` functions in cardStore.ts (lines ~160-190) only update the specific card's counts. They do not propagate changes to the parent's aggregated count.

**Code in cardStore.ts**:
```typescript
incrementReactionCount: (cardId) =>
  set((state) => {
    const card = state.cards.get(cardId);
    if (!card) return state;
    const newCards = new Map(state.cards);
    newCards.set(cardId, {
      ...card,
      direct_reaction_count: card.direct_reaction_count + 1,
      aggregated_reaction_count: card.aggregated_reaction_count + 1,
    });
    return { cards: newCards };
  }),
```

This only updates the card itself, not the parent's aggregated count.

### Potential Fixes

**Option A - Update parent in store action**:
```typescript
incrementReactionCount: (cardId) =>
  set((state) => {
    const card = state.cards.get(cardId);
    if (!card) return state;
    const newCards = new Map(state.cards);

    // Update the card itself
    newCards.set(cardId, {
      ...card,
      direct_reaction_count: card.direct_reaction_count + 1,
      aggregated_reaction_count: card.aggregated_reaction_count + 1,
    });

    // If card has a parent, update parent's aggregated count
    if (card.parent_card_id) {
      const parent = state.cards.get(card.parent_card_id);
      if (parent) {
        newCards.set(card.parent_card_id, {
          ...parent,
          aggregated_reaction_count: parent.aggregated_reaction_count + 1,
        });
        // Also update the child entry in parent.children array
        const updatedChildren = parent.children?.map(c =>
          c.id === cardId
            ? { ...c, direct_reaction_count: c.direct_reaction_count + 1 }
            : c
        );
        if (updatedChildren) {
          newCards.set(card.parent_card_id, {
            ...newCards.get(card.parent_card_id)!,
            children: updatedChildren,
          });
        }
      }
    }

    return { cards: newCards };
  }),
```

**Option B - Fetch cards after reaction** (simpler but slower):
```typescript
// In handleAddReaction
await ReactionAPI.addReaction(cardId, { reaction_type: 'thumbs_up' });
await fetchCards(); // Refresh all cards from server
```

### Acceptance Criteria

- [ ] Parent aggregated count increases when child reaction added
- [ ] Parent aggregated count decreases when child reaction removed
- [ ] Child's direct_reaction_count in parent.children array updates
- [ ] UI reflects changes immediately (optimistic update preferred)

---

## Resolution Priority

| Priority | Bug | CX Impact | PRD Reference |
|----------|-----|-----------|---------------|
| 1 | UTB-024 | Cannot unlink cards - core functionality broken | FR-2.3.2 |
| 2 | UTB-025 | Aggregated counts wrong - confusing UX | FR-3.1.9 |

---

## Dependency Analysis

```
UTB-024 (Unlink not working)
    └── Independent - can be fixed standalone

UTB-025 (Aggregated count not updating)
    └── Independent - can be fixed standalone

Both bugs can be fixed in PARALLEL.
```

---

## Technical Investigation Notes

### Files to Investigate

| File | Purpose |
|------|---------|
| `frontend/src/features/card/components/RetroCard.tsx` | Unlink button handler |
| `frontend/src/features/card/components/RetroColumn.tsx` | Prop passing |
| `frontend/src/features/card/viewmodels/useCardViewModel.ts` | handleUnlinkChild, handleAddReaction |
| `frontend/src/models/stores/cardStore.ts` | unlinkChild, incrementReactionCount |
| `frontend/src/models/api/CardAPI.ts` | unlinkCards API call |

### API Endpoint to Test

```bash
# Unlink API (UTB-024)
curl -X DELETE "http://localhost:3001/v1/cards/{parentId}/link" \
  -H "Content-Type: application/json" \
  -d '{"target_card_id": "{childId}", "link_type": "parent_of"}'
```

---

## Related Documents

- [PRD.md](../../PRD.md) - Product requirements
- [USER_TESTING_BUGS_01011530.md](../01011530/USER_TESTING_BUGS_01011530.md) - Previous session bugs
- [DESIGN_PLAN.md](./DESIGN_PLAN.md) - Current session design plan
- [TASK_LIST.md](./TASK_LIST.md) - Current session task list

---

*Document created during user testing session - 2026-01-01 23:30*
