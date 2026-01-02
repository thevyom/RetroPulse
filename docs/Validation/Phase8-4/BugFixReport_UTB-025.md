# Bug Fix Report: UTB-025

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-025 |
| Title | Parent Aggregated Count Not Updated on Child Reaction |
| Severity | High |
| Component | cardStore.ts |
| PRD Reference | FR-3.1.9 |
| Status | Fixed |
| Fixed Date | 2026-01-02 |

## Problem Description

When adding or removing a reaction to a child card, the parent card's `aggregated_reaction_count` was updated correctly, but the child entry in the `parent.children` array was not updated. This caused the UI to display stale reaction counts for child cards when viewed through the parent.

### Steps to Reproduce

1. Create two cards and link them (parent-child)
2. Observe the parent card's reaction count display
3. Click thumbs up on the child card
4. Observe that the parent's aggregated count changes, but the child entry in the parent.children array still shows old values

## Root Cause Analysis

The `incrementReactionCount` and `decrementReactionCount` functions in `cardStore.ts` were correctly updating:
1. The child card's `direct_reaction_count` and `aggregated_reaction_count`
2. The parent card's `aggregated_reaction_count`

However, they were NOT updating the child entry within the `parent.children` array. This array is used by the UI to render child cards in the parent's expanded view, so the displayed counts were stale.

### Affected Code (Before Fix)

```typescript
// incrementReactionCount - lines 120-144
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

    // If card has a parent, update parent's aggregated count
    if (card.parent_card_id) {
      const parent = newCards.get(card.parent_card_id);
      if (parent) {
        newCards.set(card.parent_card_id, {
          ...parent,
          aggregated_reaction_count: parent.aggregated_reaction_count + 1,
          // MISSING: children array update
        });
      }
    }

    return { cards: newCards };
  }),
```

## Solution Implemented

Updated both `incrementReactionCount` and `decrementReactionCount` to also update the child entry in the `parent.children` array when a child card's reaction count changes.

### Code Changes

**File: `frontend/src/models/stores/cardStore.ts`**

#### incrementReactionCount (lines 120-156)

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

    // If card has a parent, update parent's aggregated count and children array
    if (card.parent_card_id) {
      const parent = newCards.get(card.parent_card_id);
      if (parent) {
        // Update the child entry in parent.children array
        const updatedChildren = parent.children?.map((c) =>
          c.id === cardId
            ? {
                ...c,
                direct_reaction_count: c.direct_reaction_count + 1,
                aggregated_reaction_count: c.aggregated_reaction_count + 1,
              }
            : c
        );

        newCards.set(card.parent_card_id, {
          ...parent,
          aggregated_reaction_count: parent.aggregated_reaction_count + 1,
          children: updatedChildren,
        });
      }
    }

    return { cards: newCards };
  }),
```

#### decrementReactionCount (lines 158-194)

```typescript
decrementReactionCount: (cardId) =>
  set((state) => {
    const card = state.cards.get(cardId);
    if (!card) return state;

    const newCards = new Map(state.cards);
    newCards.set(cardId, {
      ...card,
      direct_reaction_count: Math.max(0, card.direct_reaction_count - 1),
      aggregated_reaction_count: Math.max(0, card.aggregated_reaction_count - 1),
    });

    // If card has a parent, update parent's aggregated count and children array
    if (card.parent_card_id) {
      const parent = newCards.get(card.parent_card_id);
      if (parent) {
        // Update the child entry in parent.children array
        const updatedChildren = parent.children?.map((c) =>
          c.id === cardId
            ? {
                ...c,
                direct_reaction_count: Math.max(0, c.direct_reaction_count - 1),
                aggregated_reaction_count: Math.max(0, c.aggregated_reaction_count - 1),
              }
            : c
        );

        newCards.set(card.parent_card_id, {
          ...parent,
          aggregated_reaction_count: Math.max(0, parent.aggregated_reaction_count - 1),
          children: updatedChildren,
        });
      }
    }

    return { cards: newCards };
  }),
```

## Test Results

### New Tests Added

**File: `frontend/tests/unit/models/stores/cardStore.test.ts`**

1. `should update child entry in parent.children array on increment` - Verifies that when a child card's reaction count is incremented, the child entry in the parent's children array is also updated.

2. `should update child entry in parent.children array on decrement` - Verifies that when a child card's reaction count is decremented, the child entry in the parent's children array is also updated.

3. `should not go below zero in parent.children array` - Verifies that the child entry counts in the parent's children array don't go below zero.

### Test Execution

```
> npm run test:run -- tests/unit/models/stores/cardStore.test.ts

 ✓ tests/unit/models/stores/cardStore.test.ts (62 tests) 68ms

 Test Files  1 passed (1)
      Tests  62 passed (62)
   Start at  00:09:01
   Duration  4.72s
```

## Verification Checklist

- [x] Parent aggregated count increases when child reaction added
- [x] Parent aggregated count decreases when child reaction removed
- [x] Child's direct_reaction_count in parent.children array updates on increment
- [x] Child's direct_reaction_count in parent.children array updates on decrement
- [x] Child's aggregated_reaction_count in parent.children array updates
- [x] Counts don't go below zero (boundary condition)
- [x] UI reflects changes immediately (optimistic update)
- [x] All existing tests continue to pass
- [x] New tests cover the fix comprehensively

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/models/stores/cardStore.ts` | Modified - Added children array updates |
| `frontend/tests/unit/models/stores/cardStore.test.ts` | Modified - Added 3 new tests |

## Code Review

The fix was reviewed and approved. Key points:
- Correct implementation following existing patterns
- Proper edge case handling with optional chaining
- Good use of `Math.max(0, ...)` to prevent negative counts
- Comprehensive test coverage

---

*Report generated: 2026-01-02*
*Fixed by: Software Developer Agent*
