# Phase 8.5.1 Deep-Dive Investigation Report

**Created**: 2026-01-02
**Status**: Investigation Complete - Ready for Implementation
**Author**: Principal Engineer

---

## Executive Summary

Following QA verification of Phase 8.5, four critical issues remain unresolved. This document provides a comprehensive root cause analysis for each issue with exact code locations and proposed fixes.

### Issues Investigated

| Issue | Severity | Root Cause | Fix Complexity |
|-------|----------|------------|----------------|
| UTB-029: Card Unlinking | P0 - Critical | Authorization check uses PARENT creator, not CHILD creator | Low |
| UTB-030: Reaction Aggregation | P0 - Critical | Multiple issues: fetchCards timing, parent not in store | Medium |
| MyUser Avatar Display | P1 - High | `user.user_hash` property doesn't exist in ActiveUser type | Low |
| Touch Target Alignment | P1 - High | Conflicting height classes, inconsistent button sizing | Low |

---

## Issue 1: UTB-029 - Card Unlinking Not Working

### Problem Statement
Clicking the unlink icon on a child card does nothing. The card remains linked to its parent.

### Investigation Flow

#### Step 1: Frontend Click Handler (VERIFIED OK)
**File**: `frontend/src/features/card/components/RetroCard.tsx`

**Lines 306-314** - Handler for unlinking nested child:
```typescript
const handleUnlinkChildClick = useCallback(async (childId: string) => {
  if (isClosed || !onUnlinkChild) return;
  try {
    await onUnlinkChild(childId);
  } catch {
    // Error handling is done in the parent viewmodel
  }
}, [isClosed, onUnlinkChild]);
```

**Lines 545-556** - Unlink button UI:
```tsx
{onUnlinkChild && !isClosed ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={() => handleUnlinkChildClick(child.id)}
        className="cursor-pointer text-muted-foreground..."
        aria-label="Unlink child card"
      >
        <Link2 className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent>Click to unlink</TooltipContent>
  </Tooltip>
) : (
  <Link2 className="h-3 w-3" />
)}
```

**Status**: ✅ Click handler correctly implemented

#### Step 2: ViewModel Handler (VERIFIED OK)
**File**: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Lines 658-689** - handleUnlinkChild:
```typescript
const handleUnlinkChild = useCallback(
  async (childId: string): Promise<void> => {
    // Check if board is closed
    if (board?.state === 'closed') {
      setOperationError('Cannot unlink card on a closed board');
      throw new Error('Cannot unlink card on a closed board');
    }

    const childCard = cardsMap.get(childId);
    if (!childCard || !childCard.parent_card_id) {
      throw new Error('Card not found or has no parent');
    }

    const parentId = childCard.parent_card_id;

    setOperationError(null);

    try {
      await CardAPI.unlinkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      // Refresh to get updated aggregation
      await fetchCards();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlink card';
      setOperationError(message);
      throw err;
    }
  },
  [board?.state, cardsMap, fetchCards]
);
```

**Status**: ✅ ViewModel correctly gets parent ID and calls API

#### Step 3: API Call (VERIFIED OK)
**File**: `frontend/src/models/api/CardAPI.ts`

**Lines 135-137**:
```typescript
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.post(`/cards/${sourceCardId}/unlink`, data);
}
```

**Endpoint**: `POST /cards/:parentId/unlink`
**Payload**: `{ target_card_id: childId, link_type: 'parent_of' }`

**Status**: ✅ Uses POST (correct per UTB-024 fix)

#### Step 4: Backend Route (VERIFIED OK)
**File**: `backend/src/domains/card/card.routes.ts`

**Line 55-56**:
```typescript
// POST /cards/:id/unlink - Unlink cards (UTB-024 fix: POST avoids DELETE body issues)
router.post('/:id/unlink', validateBody(linkCardsSchema), controller.unlinkCards);
```

**Status**: ✅ Route exists

#### Step 5: Backend Service (ROOT CAUSE FOUND)
**File**: `backend/src/domains/card/card.service.ts`

**Lines 401-432** - Authorization check:
```typescript
async unlinkCards(sourceCardId: string, input: LinkCardsInput, userHash: string): Promise<void> {
  // Get both cards
  const sourceCard = await this.cardRepository.findById(sourceCardId);  // This is the PARENT
  const targetCard = await this.cardRepository.findById(input.target_card_id);  // This is the CHILD

  // ...validation...

  // Authorization: must be source card creator or board admin
  const isSourceCreator = sourceCard.created_by_hash === userHash;  // ❌ CHECKS PARENT CREATOR
  const isAdmin = board.admins.includes(userHash);
  if (!isSourceCreator && !isAdmin) {
    throw new ApiError(
      ErrorCodes.FORBIDDEN,
      'Only the card creator or board admin can unlink cards',  // User sees this error
      403
    );
  }
  // ... rest of unlink logic
}
```

### ROOT CAUSE IDENTIFIED

**The authorization check verifies the PARENT card's creator, not the CHILD card's creator.**

When unlinking:
- `sourceCardId` = Parent card ID
- `input.target_card_id` = Child card ID
- `sourceCard.created_by_hash` = Parent's creator hash
- `userHash` = Current user's hash (who is likely the CHILD creator)

**Scenario that fails**:
1. User A creates parent card
2. User B creates child card and links it to User A's parent
3. User B tries to unlink their own child card
4. Backend checks: `parentCard.created_by_hash === userB.hash` → FALSE
5. User B is not admin → FALSE
6. Returns 403 Forbidden

**The user who created the CHILD card should be able to unlink it, not just the parent's creator.**

### Proposed Fix

**File**: `backend/src/domains/card/card.service.ts`

Change authorization to allow either parent creator OR child creator to unlink:

```typescript
// Authorization: must be source card creator, target card creator, or board admin
const isSourceCreator = sourceCard.created_by_hash === userHash;
const isTargetCreator = targetCard.created_by_hash === userHash;  // ADD THIS
const isAdmin = board.admins.includes(userHash);
if (!isSourceCreator && !isTargetCreator && !isAdmin) {  // MODIFY THIS
  throw new ApiError(
    ErrorCodes.FORBIDDEN,
    'Only the card creator or board admin can unlink cards',
    403
  );
}
```

### Why Errors Are Silent

The frontend catches the error but may not display it visibly:

**File**: `frontend/src/features/card/components/RetroCard.tsx` (Lines 307-313):
```typescript
const handleUnlinkChildClick = useCallback(async (childId: string) => {
  if (isClosed || !onUnlinkChild) return;
  try {
    await onUnlinkChild(childId);
  } catch {
    // Error handling is done in the parent viewmodel - BUT USER DOESN'T SEE IT
  }
}, [isClosed, onUnlinkChild]);
```

The ViewModel sets `operationError` but there's no toast notification for unlink failures.

---

## Issue 2: UTB-030 - Reaction Aggregation Not Syncing

### Problem Statement
Parent card's `aggregated_reaction_count` doesn't update when:
- A child card receives a reaction
- A child card is linked/unlinked

### Investigation Flow

#### Step 1: Store Logic (VERIFIED OK)
**File**: `frontend/src/models/stores/cardStore.ts`

**Lines 120-156** - incrementReactionCount:
```typescript
incrementReactionCount: (cardId) =>
  set((state) => {
    const card = state.cards.get(cardId);
    if (!card) return state;

    const newCards = new Map(state.cards);
    newCards.set(cardId, {
      ...card,
      direct_reaction_count: card.direct_reaction_count + 1,
      aggregated_reaction_count: card.aggregated_reaction_count + 1,  // ✅ Updates child
    });

    // If card has a parent, update parent's aggregated count
    if (card.parent_card_id) {
      const parent = newCards.get(card.parent_card_id);
      if (parent) {  // ⚠️ Only updates if parent is in store!
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
          aggregated_reaction_count: parent.aggregated_reaction_count + 1,  // ✅ Updates parent
          children: updatedChildren,
        });
      }
    }

    return { cards: newCards };
  }),
```

**Status**: ✅ Logic is correct IF parent is in store

#### Step 2: WebSocket Event Handler (POTENTIAL ISSUE)
**File**: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Lines 356-360**:
```typescript
const handleReactionAdded = (event: { card_id: string }) => {
  incrementReactionCount(event.card_id);  // Only knows child ID, not parent
  checkReactionQuota().catch(() => {});
};
```

**Problem**: The WebSocket event only contains `card_id`. If the parent card isn't already in the store, the store's `incrementReactionCount` function can't update it because:

```typescript
// Lines 130-131 of cardStore.ts
if (card.parent_card_id) {
  const parent = newCards.get(card.parent_card_id);  // Returns undefined if not loaded!
  if (parent) {  // This check fails, parent aggregate not updated
```

#### Step 3: Backend Reaction Event (ISSUE FOUND)
**File**: `backend/src/domains/reaction/reaction.service.ts`

**Lines 79-92** - Event emission:
```typescript
if (isNew) {
  const updatedCard = await this.cardRepository.findById(cardId);
  if (updatedCard) {
    this.broadcaster.reactionAdded({
      cardId,
      boardId,
      userAlias,
      reactionType: input.reaction_type,
      directCount: updatedCard.direct_reaction_count,
      aggregatedCount: updatedCard.aggregated_reaction_count,
      // ❌ MISSING: parentCardId - frontend doesn't know which parent to update
    });
  }
}
```

**The event payload doesn't include `parentCardId`, so if the parent isn't already loaded, other clients can't update the parent's aggregate.**

#### Step 4: handleUnlinkChild Behavior (POTENTIAL RACE CONDITION)
**File**: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Lines 675-681**:
```typescript
try {
  await CardAPI.unlinkCards(parentId, {
    target_card_id: childId,
    link_type: 'parent_of',
  });
  // Refresh to get updated aggregation
  await fetchCards();  // ⚠️ This overwrites any WebSocket updates
} catch (err) {
```

**Issue**: After unlink API succeeds, `fetchCards()` is called which:
1. Fetches fresh card data from server
2. Replaces all cards in store
3. May override WebSocket event updates that arrived during the request

### ROOT CAUSES IDENTIFIED

1. **Parent not in store**: When child reaction changes and parent isn't loaded, store can't update parent's aggregate
2. **WebSocket event incomplete**: Reaction events don't include `parentCardId`, so other clients can't proactively update parents
3. **Race condition**: `fetchCards()` after API calls may override concurrent WebSocket updates

### Proposed Fixes

#### Fix 1: Include parentCardId in WebSocket event
**File**: `backend/src/domains/reaction/reaction.service.ts`

```typescript
this.broadcaster.reactionAdded({
  cardId,
  boardId,
  userAlias,
  reactionType: input.reaction_type,
  directCount: updatedCard.direct_reaction_count,
  aggregatedCount: updatedCard.aggregated_reaction_count,
  parentCardId: updatedCard.parent_card_id?.toHexString() ?? null,  // ADD THIS
});
```

#### Fix 2: Update frontend handler to use parentCardId
**File**: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

```typescript
const handleReactionAdded = (event: {
  card_id: string;
  parent_card_id?: string | null;  // ADD
}) => {
  incrementReactionCount(event.card_id);

  // If parent exists and wasn't updated by store (not loaded), fetch it
  if (event.parent_card_id && !cardsMap.has(event.parent_card_id)) {
    // Parent isn't in our store, need to fetch to see updated aggregate
    fetchCards().catch(() => {});
  }

  checkReactionQuota().catch(() => {});
};
```

#### Fix 3: Store should be resilient to missing parent
The current store logic is correct but silent when parent is missing. This is acceptable behavior since the parent aggregate will be correct when the parent IS loaded.

---

## Issue 3: MyUser Avatar Display Issue

### Problem Statement
The logged-in user appears in both the "Me" filter button AND in the participant list. They should only appear in the "Me" position.

### Investigation Flow

#### Step 1: ParticipantBar Filter Logic (ROOT CAUSE FOUND)
**File**: `frontend/src/features/participant/components/ParticipantBar.tsx`

**Line 59**:
```typescript
// Filter out current user from the scrollable list (they have their own "Me" filter)
const otherUsers = activeUsers.filter((user) => user.user_hash !== currentUserHash);
//                                                    ^^^^^^^^^^^
//                                                    THIS PROPERTY DOESN'T EXIST!
```

**Problem**: `user.user_hash` is `undefined` for ALL users because `ActiveUser` type doesn't have this property!

#### Step 2: ActiveUser Type Definition (CONFIRMS ROOT CAUSE)
**File**: `frontend/src/models/types/user.ts`

**Lines 18-23**:
```typescript
export interface ActiveUser {
  alias: string;              // ✅ Exists
  is_admin: boolean;          // ✅ Exists
  last_active_at: string;     // ✅ Exists
  created_at: string;         // ✅ Exists
  // user_hash or cookie_hash - ❌ MISSING!
}
```

#### Step 3: How currentUserHash is Passed
**File**: `frontend/src/features/board/components/RetroBoardPage.tsx`

**Line 245**:
```typescript
currentUserHash={participantVM.currentUser?.cookie_hash ?? ''}
```

The `currentUserHash` IS correctly passed (from `UserSession.cookie_hash`), but `ActiveUser` objects don't have a corresponding property to compare against.

### ROOT CAUSE IDENTIFIED

**The filter comparison always fails because:**
- `user.user_hash` is `undefined` (property doesn't exist in ActiveUser)
- `undefined !== 'some-hash-string'` is always `true`
- Therefore, ALL users pass the filter, including current user

### Why This Happened
The `ActiveUser` type (returned by API) doesn't include `cookie_hash` or `user_hash`. The API only returns: `{ alias, is_admin, last_active_at, created_at }`.

### Proposed Fixes

#### Option A: Use alias comparison (Quick Fix)
**File**: `frontend/src/features/participant/components/ParticipantBar.tsx`

```typescript
// Add currentUserAlias prop
export interface ParticipantBarProps {
  activeUsers: ActiveUser[];
  currentUserHash: string;
  currentUserAlias: string;  // ADD THIS
  // ...
}

// Change filter to use alias
const otherUsers = activeUsers.filter((user) => user.alias !== currentUserAlias);
```

**Pros**: Quick fix, no backend changes
**Cons**: If user changes alias mid-session, may cause issues

#### Option B: Add cookie_hash to ActiveUser (Proper Fix)
**Backend API change**: Include `cookie_hash` in active users response
**Type change**: Add `cookie_hash?: string` to `ActiveUser` interface
**Filter change**: Use `user.cookie_hash !== currentUserHash`

**Pros**: Reliable, hash-based identification
**Cons**: Requires backend change, may have privacy implications

### Recommended Fix: Option A (Use alias)

The alias is already unique per board session and is the primary identifier used elsewhere. Change the filter to:

```typescript
// ParticipantBar.tsx - Update interface
currentUserAlias: string;  // Add this prop

// ParticipantBar.tsx - Update filter
const otherUsers = activeUsers.filter((user) => user.alias !== currentUserAlias);

// RetroBoardPage.tsx - Pass the alias
currentUserAlias={participantVM.currentUser?.alias ?? ''}
```

---

## Issue 4: Touch Target Alignment Issues

### Problem Statement
The min-w-8/min-h-8 (32px) touch target fix is causing visual misalignment between the reaction button and delete button.

### Investigation Flow

#### Step 1: Reaction Button (Parent Card)
**File**: `frontend/src/features/card/components/RetroCard.tsx`

**Lines 404-423**:
```tsx
<Button
  variant="ghost"
  size="sm"
  className={cn('min-w-8 min-h-8 h-7 gap-1 px-2 flex items-center justify-center', hasReacted && 'text-primary')}
  //             ^^^^^^^^ ^^^^^^^^ ^^^
  //             32px     32px     28px  ← HEIGHT CONFLICT!
```

**Issue**: `min-h-8` (32px) and `h-7` (28px) conflict. CSS will use the larger value (32px), but the explicit `h-7` creates confusion and may cause layout issues in some browsers.

#### Step 2: Delete Button (Parent Card)
**File**: `frontend/src/features/card/components/RetroCard.tsx`

**Lines 440-448**:
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
  //         ^^^ ^^^
  //         28px 28px - NO MIN SIZING!
```

**Issue**: Delete button is 28x28px, while reaction button is min 32x32px. This creates:
1. Height mismatch (32px vs 28px)
2. Inconsistent touch targets
3. Visual misalignment due to different sizes

#### Step 3: Child Card Reaction Button
**Lines 573-588**:
```tsx
<Button
  variant="ghost"
  size="sm"
  className={cn(
    'ml-auto h-5 gap-1 px-1.5 py-0 text-xs',  // h-5 = 20px - WAY TOO SMALL
    hasUserReactedToChild?.(child.id) && 'text-primary'
  )}
```

**Issue**: Child reaction button is only 20px tall - completely different from parent buttons and below the 32px minimum.

### ROOT CAUSE IDENTIFIED

**Inconsistent sizing across buttons:**

| Button | Height Class | Actual Height | Min Height | Width |
|--------|-------------|---------------|------------|-------|
| Parent Reaction | h-7 + min-h-8 | 32px | 32px | 32px+ |
| Parent Delete | h-7 w-7 | 28px | none | 28px |
| Child Reaction | h-5 | 20px | none | auto |

**The alignment breaks because:**
1. Reaction button has `min-h-8` (32px) but delete button doesn't
2. The buttons are in a flex container with `items-center`, but different heights still cause visual imbalance
3. Child cards have completely different sizing

### Proposed Fix

**Standardize all interactive buttons to 32x32px minimum:**

#### Parent Card Buttons (Lines 404-452)
```tsx
{/* Reaction Button - Remove conflicting h-7 */}
<Button
  variant="ghost"
  size="sm"
  className={cn('min-w-8 min-h-8 gap-1 px-2 flex items-center justify-center', hasReacted && 'text-primary')}
  //             Remove h-7, let min-h-8 control height
>

{/* Delete Button - Add min sizing */}
<Button
  variant="ghost"
  size="icon"
  className="min-w-8 min-h-8 flex items-center justify-center text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
  //         ^^^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //         Add min sizing and explicit centering
>
```

#### Child Card Reaction Button (Lines 573-588)
```tsx
<Button
  variant="ghost"
  size="sm"
  className={cn(
    'ml-auto min-w-8 min-h-8 gap-1 px-1.5 flex items-center justify-center text-xs',
    //       ^^^^^^^^ ^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //       Add min sizing and explicit centering (keep smaller text for visual hierarchy)
    hasUserReactedToChild?.(child.id) && 'text-primary'
  )}
>
```

---

## Summary of All Fixes

### High Priority (P0)

| Issue | File | Change |
|-------|------|--------|
| UTB-029 Unlink Auth | `backend/src/domains/card/card.service.ts:424-426` | Add `isTargetCreator` check |
| UTB-030 Reaction Event | `backend/src/domains/reaction/reaction.service.ts:84-91` | Add `parentCardId` to event |
| UTB-030 Handler | `frontend/src/features/card/viewmodels/useCardViewModel.ts:356-360` | Handle `parent_card_id` |

### Medium Priority (P1)

| Issue | File | Change |
|-------|------|--------|
| MyUser Filter | `frontend/src/features/participant/components/ParticipantBar.tsx:59` | Use `alias` comparison |
| MyUser Prop | `frontend/src/features/board/components/RetroBoardPage.tsx:245` | Pass `currentUserAlias` |
| Reaction Button | `frontend/src/features/card/components/RetroCard.tsx:407` | Remove `h-7` class |
| Delete Button | `frontend/src/features/card/components/RetroCard.tsx:443` | Add `min-w-8 min-h-8` |
| Child Reaction | `frontend/src/features/card/components/RetroCard.tsx:577` | Add `min-w-8 min-h-8` |

---

## Testing Requirements

### UTB-029 Unlink Tests
1. User A creates parent card
2. User B creates child card, links to parent
3. User B clicks unlink on their child → Should succeed
4. User A clicks unlink on User B's child → Should succeed (parent creator)
5. Admin clicks unlink → Should succeed

### UTB-030 Aggregation Tests
1. Link child to parent → Parent aggregate = parent.direct + child.direct
2. Add reaction to child → Parent aggregate increases by 1
3. Remove reaction from child → Parent aggregate decreases by 1
4. Unlink child → Parent aggregate = parent.direct only
5. Verify WebSocket updates work across browser tabs

### MyUser Tests
1. Current user appears only in "Me" position
2. Current user does NOT appear in scrollable participant list
3. Clicking "Me" filter shows only current user's cards

### Touch Target Tests
1. All buttons are at least 32x32px
2. Reaction and delete buttons are vertically aligned
3. Child card buttons are also 32x32px minimum
4. Touch interactions work on tablet viewport

---

*Deep-Dive Investigation by Principal Engineer - 2026-01-02*
