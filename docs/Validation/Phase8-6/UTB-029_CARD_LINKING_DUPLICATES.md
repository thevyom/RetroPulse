# UTB-029: Card Linking Creates Duplicate Cards

**Document Created**: 2026-01-03
**Severity**: High
**Status**: Open

---

## Problem Summary

When linking Card 2 to Card 1 as a parent-child relationship:
1. The link is created correctly (parent-child relationship)
2. Two NEW duplicate cards appear in the UI (copies of Card 1 and Card 2)
3. Unlinking does not work properly

---

## Root Cause Analysis

### Issue 1: Duplicate Cards on Link

**Location**: [useCardViewModel.ts:668-679](frontend/src/features/card/viewmodels/useCardViewModel.ts#L668-L679)

```typescript
const handleLinkParentChild = useCallback(
  async (parentId: string, childId: string): Promise<void> => {
    // ... validation ...

    try {
      await CardAPI.linkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      // Refresh to get updated aggregation
      await fetchCards();  // <-- This fetches ALL cards again
    } catch (err) {
      // ...
    }
  },
  [board?.state, cardsMap, fetchCards]
);
```

**Problem**: After the API call succeeds, `fetchCards()` is called which re-fetches all cards. Meanwhile, a socket event `card:linked` is also broadcast to the same client.

**The race condition**:
1. API call completes → `fetchCards()` starts loading
2. Backend broadcasts `card:linked` socket event
3. Socket handler in viewmodel calls `linkChildStore()` which modifies the store
4. `fetchCards()` completes and calls `setCardsWithChildren()`

The socket handler at [useCardViewModel.ts:394-399](frontend/src/features/card/viewmodels/useCardViewModel.ts#L394-L399):
```typescript
const handleCardLinked = (event: { sourceId: string; targetId: string; linkType: string }) => {
  if (event.linkType === 'parent_of') {
    linkChildStore(event.sourceId, event.targetId);
  }
};
```

**Combined with** the `card:created` socket handler which adds cards to the store - if the socket event fires with card data that looks new, it gets added as a duplicate.

### Issue 2: Unlink Not Working

**Location**: [useCardViewModel.ts:684-714](frontend/src/features/card/viewmodels/useCardViewModel.ts#L684-L714)

```typescript
const handleUnlinkChild = useCallback(
  async (childId: string): Promise<void> => {
    // ...
    const childCard = cardsMap.get(childId);
    if (!childCard || !childCard.parent_card_id) {
      throw new Error('Card not found or has no parent');  // <-- May fail here
    }

    const parentId = childCard.parent_card_id;  // <-- May be wrong type
    // ...
  },
  [board?.state, cardsMap, fetchCards]
);
```

**Potential issues**:

1. **Type mismatch**: `childCard.parent_card_id` may be a MongoDB ObjectId string from the API but the frontend expects it as a plain string. The comparison or lookup may fail.

2. **Store state stale**: After the duplicate card issue, the store may have corrupted state where `parent_card_id` is not set correctly on the card.

3. **API response handling**: Looking at [CardAPI.ts:135-137](frontend/src/models/api/CardAPI.ts#L135-L137):
```typescript
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.post(`/cards/${sourceCardId}/unlink`, data);
}
```
The API call may succeed but the socket event or store update may not process correctly.

---

## Reproduction Steps

1. Create a board with two feedback cards (Card 1 and Card 2)
2. Link Card 2 as a child of Card 1
3. Observe: 4 cards now appear (original 2 + 2 duplicates)
4. Try to unlink - does not work

---

## Affected Files

| File | Issue |
|------|-------|
| [useCardViewModel.ts](frontend/src/features/card/viewmodels/useCardViewModel.ts) | Race condition between fetchCards and socket events |
| [cardStore.ts](frontend/src/models/stores/cardStore.ts) | linkChild/unlinkChild may have state issues |

---

## Proposed Fixes

### Fix 1: Prevent Race Condition
Don't call `fetchCards()` after linking. Instead, rely solely on the socket event to update the store. The socket handler already calls `linkChildStore()`.

```typescript
// In handleLinkParentChild:
try {
  await CardAPI.linkCards(parentId, {
    target_card_id: childId,
    link_type: 'parent_of',
  });
  // DON'T call fetchCards() - socket event will handle update
  // await fetchCards();  <-- REMOVE THIS
} catch (err) {
  // ...
}
```

### Fix 2: Add Optimistic Update
Apply the link locally before API call, then let socket confirm:

```typescript
// Optimistic update
linkChildStore(parentId, childId);

try {
  await CardAPI.linkCards(parentId, {...});
  // Socket will confirm, no refetch needed
} catch (err) {
  // Rollback on error
  unlinkChildStore(parentId, childId);
  throw err;
}
```

### Fix 3: Deduplicate in Socket Handler
Check if link already exists before applying:

```typescript
const handleCardLinked = (event) => {
  if (event.linkType === 'parent_of') {
    const child = cardsMap.get(event.targetId);
    // Only apply if not already linked
    if (!child?.parent_card_id) {
      linkChildStore(event.sourceId, event.targetId);
    }
  }
};
```

### Fix 4: Fix Unlink Parent ID Type
Ensure `parent_card_id` is consistently a string:

```typescript
const handleUnlinkChild = useCallback(
  async (childId: string): Promise<void> => {
    const childCard = cardsMap.get(childId);
    if (!childCard) {
      throw new Error('Card not found');
    }

    // Ensure parent_card_id is a string
    const parentId = typeof childCard.parent_card_id === 'string'
      ? childCard.parent_card_id
      : childCard.parent_card_id?.toString();

    if (!parentId) {
      throw new Error('Card has no parent');
    }
    // ...
  }
);
```

---

## Acceptance Criteria

- [ ] Linking two cards does not create duplicate cards
- [ ] Unlinking a child card works correctly
- [ ] Store state remains consistent after link/unlink operations
- [ ] Socket events do not cause duplicate updates

---

*Bug identified during user testing - 2026-01-03*
