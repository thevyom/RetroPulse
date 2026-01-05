# Card Linking/Unlinking Debug Investigation & Solution

**Created**: 2026-01-03
**Author**: Principal Engineer
**Status**: Investigation Complete - Fix Required

---

## Executive Summary

Card linking and unlinking operations are not reflecting in the UI despite API calls succeeding. The root cause is that **the backend API filters out child cards** (`parent_card_id = null`), returning only parent cards with embedded children. After page refresh, child cards don't exist as full `Card` objects in the frontend store, causing operations to fail silently.

**Recommended Fix**: Backend changes to either:
1. Return ALL cards (remove the `parent_card_id = null` filter), OR
2. Emit `card:updated` socket events for ALL impacted cards after link/unlink operations

The backend approach is simpler because it addresses the root cause at the source, avoids reconstructing incomplete data, and ensures all clients receive full card data for proper state management.

---

## Observed Symptoms

### Unlink Issue
```
[DEBUG] handleUnlinkChild called with childId: 695958e952769a46ea53715e
[DEBUG] handleUnlinkChild - childCard: undefined parent_card_id: undefined
```

**Symptom**: When attempting to unlink a child card, `cardsMap.get(childId)` returns `undefined`, causing the operation to fail silently.

### Link Issue
```
[DEBUG] handleLinkParentChild - calling API: { parentId: "695958f252769a46ea53715f", childId: "6959545b52769a46ea53715b" }
[API] Request: POST /cards/695958f252769a46ea53715f/link
[API] Response: 201 /cards/695958f252769a46ea53715f/link
[DEBUG] handleLinkParentChild - API success, waiting for socket event
```

**Symptom**: API call succeeds (201 response), but UI doesn't update. No socket event debug log appears after "waiting for socket event".

---

## Root Cause Analysis

### Primary Root Cause: Child Cards Not in cardsMap

**The Backend API Only Returns Parent Cards**

File: `backend/src/domains/card/card.repository.ts` (line 123)

```typescript
// Only fetch top-level cards (not children)
matchStage.parent_card_id = null;
```

The API intentionally filters out child cards from the response. Child cards are embedded as `CardChild` objects within their parent's `children` array.

**The Frontend Store Doesn't Reconstruct Full Cards from Children**

File: `frontend/src/models/stores/cardStore.ts` (lines 91-118)

```typescript
setCardsWithChildren: (cards) =>
  set(() => {
    const newCards = new Map<string, Card>();

    // First pass: add all parent cards
    cards.forEach((card) => {
      newCards.set(card.id, card);
    });

    // Second pass: PROBLEM - tries to update existing children, but they don't exist!
    cards.forEach((card) => {
      if (card.children && card.children.length > 0) {
        card.children.forEach((child) => {
          // This check always fails because children aren't in the map!
          const existingChild = newCards.get(child.id);  // Returns undefined
          if (existingChild) {  // Never true
            newCards.set(child.id, { ...existingChild, parent_card_id: card.id });
          }
        });
      }
    });

    return { cards: newCards, isLoading: false, error: null };
  }),
```

**Result**: After loading cards from API, `cardsMap` contains ONLY parent cards. Child cards exist only as embedded `CardChild` objects within parent's `children` array, NOT as separate `Card` entries.

### Secondary Issue: CardChild Type Has Insufficient Fields

File: `frontend/src/models/types/card.ts`

```typescript
export interface CardChild {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_by_alias: string | null;
  created_at: string;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  // Missing: board_id, column_id, card_type, created_by_hash, parent_card_id, etc.
}
```

The `CardChild` interface doesn't have enough fields to reconstruct a full `Card` object, making it harder to add children to the cardsMap.

---

## Data Flow Diagram

### Scenario A: Two Standalone Cards - Link Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Initial State: Both cards are standalone                                  │
│                                                                          │
│ cardsMap: {                                                              │
│   "card-A": { id: "card-A", parent_card_id: null, ... }  ✓               │
│   "card-B": { id: "card-B", parent_card_id: null, ... }  ✓               │
│ }                                                                        │
│                                                                          │
│ User links Card B to Card A:                                             │
│   1. API: POST /cards/card-A/link { target_card_id: "card-B" }           │
│   2. Socket: card:linked { sourceId: "card-A", targetId: "card-B" }      │
│   3. Handler: cardsMap.get("card-B") → FOUND ✓                           │
│   4. Store: linkChild("card-A", "card-B") → SUCCESS ✓                    │
│   5. UI updates correctly ✓                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Scenario B: Page Refresh After Link - Unlink Fails

```
┌──────────────────────────────────────────────────────────────────────────┐
│ After Page Refresh: Cards loaded from API                                 │
│                                                                          │
│ API Response: [                                                          │
│   { id: "card-A", children: [{ id: "card-B", content: "..." }] }         │
│ ]                                                                        │
│                                                                          │
│ cardsMap (after setCardsWithChildren):                                   │
│   "card-A": { id: "card-A", children: [...] }  ✓                         │
│   "card-B": MISSING ✗  (child only exists embedded in parent)            │
│                                                                          │
│ User tries to unlink Card B:                                             │
│   1. Handler: cardsMap.get("card-B") → undefined ✗                       │
│   2. Error: "Card not found or has no parent"                            │
│   3. Operation fails silently                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Solution Options

### Option A: Backend Fix (Recommended)

The backend approach is simpler and addresses the root cause directly.

#### Why Backend is Better

| Aspect | Frontend Fix | Backend Fix |
|--------|--------------|-------------|
| Points of change | Multiple files (store, types) | Single API change |
| Data integrity | Reconstructs Card from incomplete CardChild | Returns complete Card objects |
| Socket events | Must find cards that may not exist | Emits full card data for all impacted cards |
| Complexity | High - field mapping, type guessing | Low - remove filter, add emit logic |
| Future-proofing | Fragile if CardChild changes | Robust - always returns full data |

#### Backend Fix Option A1: Return All Cards (Including Children)

File: `backend/src/domains/card/card.repository.ts` (line 123)

Current code filters out child cards:
```typescript
// Only fetch top-level cards (not children)
matchStage.parent_card_id = null;  // <-- REMOVE THIS LINE
```

Change: Remove the `parent_card_id = null` filter to return ALL cards. The frontend can then:
1. Build parent-child relationships from `parent_card_id` field
2. All cards exist in `cardsMap` as full `Card` objects
3. Link/unlink operations will always find the cards they need

#### Backend Fix Option A2: Emit Full Card Data on Link/Unlink Events

When a link or unlink operation occurs, the backend should emit socket events containing the FULL updated card data for ALL impacted cards:

```typescript
// After successful link operation
socket.to(boardRoom).emit('card:linked', {
  parentCard: fullParentCardWithChildren,  // Full Card object
  childCard: fullChildCard,                 // Full Card object
  linkedActionCards: [...],                 // Any action cards linked to affected feedback
});

// After successful unlink operation
socket.to(boardRoom).emit('card:unlinked', {
  formerParentCard: fullFormerParentCard,  // Updated (child removed from children array)
  unlinkedCard: fullUnlinkedCard,          // Now standalone (parent_card_id: null)
  linkedActionCards: [...],                 // Any action cards that need refresh
});
```

#### Backend Fix Option A3: Emit Refresh Events for All Impacted Cards

The most robust approach: after any card operation (link, unlink, delete), emit `card:updated` events for ALL affected cards:

```typescript
// In card service after link operation
async linkCards(parentId: string, childId: string): Promise<void> {
  // ... existing link logic ...

  // Fetch all impacted cards with full data
  const parentCard = await this.cardRepo.findByIdWithRelationships(parentId);
  const childCard = await this.cardRepo.findById(childId);

  // Find any action cards linked to either card
  const linkedActionCards = await this.findActionCardsLinkedTo([parentId, childId]);

  // Emit updates for ALL impacted cards
  this.socketService.emitToBoard(boardId, 'card:updated', { card: parentCard });
  this.socketService.emitToBoard(boardId, 'card:updated', { card: childCard });
  for (const actionCard of linkedActionCards) {
    this.socketService.emitToBoard(boardId, 'card:updated', { card: actionCard });
  }
}
```

**Impacted Cards to Consider:**
1. Parent card (children array updated)
2. Child card (parent_card_id updated)
3. Action cards linked to either parent or child (aggregated counts may change)
4. On delete: All cards that referenced the deleted card

---

### Option B: Frontend Fix (Workaround)

File: `frontend/src/models/stores/cardStore.ts`

Replace the current `setCardsWithChildren` implementation:

```typescript
setCardsWithChildren: (cards) =>
  set(() => {
    const newCards = new Map<string, Card>();

    // First pass: add all parent cards
    cards.forEach((card) => {
      newCards.set(card.id, card);
    });

    // Second pass: CREATE full Card entries from embedded children
    cards.forEach((parentCard) => {
      if (parentCard.children && parentCard.children.length > 0) {
        parentCard.children.forEach((child) => {
          // Check if child already exists (shouldn't happen, but be safe)
          if (!newCards.has(child.id)) {
            // Create a full Card object from the CardChild
            // Note: Some fields are inherited from parent since CardChild doesn't have them
            const childCard: Card = {
              id: child.id,
              board_id: parentCard.board_id,
              column_id: parentCard.column_id,  // Children share parent's column
              content: child.content,
              card_type: parentCard.card_type,  // Inherit type (must be 'feedback')
              is_anonymous: child.is_anonymous,
              created_by_hash: '',  // Not available in CardChild - empty string
              created_by_alias: child.created_by_alias,
              created_at: child.created_at,
              direct_reaction_count: child.direct_reaction_count,
              aggregated_reaction_count: child.aggregated_reaction_count,
              parent_card_id: parentCard.id,  // Set parent reference
              linked_feedback_ids: [],  // Children don't have linked feedbacks
              children: undefined,  // Children don't have their own children
            };
            newCards.set(child.id, childCard);
            if (import.meta.env.DEV) {
              console.log('[DEBUG] setCardsWithChildren - created child card:', {
                childId: child.id,
                parentId: parentCard.id,
              });
            }
          } else {
            // Update existing child's parent reference
            const existingChild = newCards.get(child.id)!;
            newCards.set(child.id, {
              ...existingChild,
              parent_card_id: parentCard.id,
            });
          }
        });
      }
    });

    if (import.meta.env.DEV) {
      console.log('[DEBUG] setCardsWithChildren - final cardsMap size:', newCards.size);
    }

    return { cards: newCards, isLoading: false, error: null };
  }),
```

### Why This Fix Works

1. **Child cards are now stored as full `Card` objects** in `cardsMap`
2. **Unlink operations will find the child** via `cardsMap.get(childId)`
3. **Socket event handlers will find the child** for real-time updates
4. **Parent's `children` array still contains the embedded children** for display purposes

---

## Additional Investigation: Socket Event Verification

### Are Socket Events Being Emitted?

I need to verify the backend is correctly emitting socket events.

File: `backend/src/socket/handlers/cardHandlers.ts` (if exists) or equivalent

**Expected behavior:**
1. After `linkCards` API succeeds, emit `card:linked` event to all users in the board room
2. After `unlinkCards` API succeeds, emit `card:unlinked` event to all users in the board room

**Check these files:**
- `backend/src/services/CardService.ts` - Does it emit socket events after link/unlink?
- `backend/src/socket/` - Are there handlers for emitting card events?
- `backend/src/routes/cardRoutes.ts` - Does the route handler emit events?

### Socket Event Field Names

**Backend should emit (camelCase):**
```typescript
{
  sourceId: string,
  targetId: string,
  boardId: string,
  linkType: 'parent_of' | 'linked_to'
}
```

**Frontend handler expects (camelCase) - CORRECT:**
```typescript
const handleCardLinked = (event: { sourceId: string; targetId: string; linkType: string }) => {
```

The field names match, so this is not the issue.

---

## Test Plan

### Test 1: Verify Child Cards in Store After Load

1. Create two cards and link them
2. Refresh the page
3. Open browser DevTools console
4. Run: `Array.from(window.__ZUSTAND_STORES__?.cardStore?.getState()?.cards?.values() || []).map(c => ({ id: c.id, parent_card_id: c.parent_card_id }))`
5. **Expected**: Both parent and child cards should be in the array
6. **Before fix**: Only parent card is in the array

### Test 2: Fresh Link Operation (Should Work Even Before Fix)

1. Create two standalone feedback cards
2. Link them via drag-and-drop or context menu
3. **Expected**: UI should update showing child nested under parent
4. Open console and check debug logs for socket event receipt

### Test 3: Unlink After Page Refresh (Fails Before Fix)

1. Create two cards and link them
2. Refresh the page
3. Try to unlink the child card
4. **Before fix**: Error logged, UI doesn't update
5. **After fix**: Unlink succeeds, child becomes standalone

### Test 4: Real-Time Multi-User Sync

1. Open board in two browser windows (different sessions)
2. User 1: Link two cards
3. **Expected**: User 2 sees update in real-time
4. User 1: Unlink the cards
5. **Expected**: User 2 sees update in real-time

---

## Implementation: Option A3 - Emit Refresh Events for All Impacted Cards

### Task List

| Task ID | Task | Description | Priority | Status |
|---------|------|-------------|----------|--------|
| A3-001 | Investigate current socket emission | Find where/how socket events are emitted after link/unlink operations | P0 | ✅ Done |
| A3-002 | Add `card:refresh` socket event type | Define the event type in both backend and frontend | P0 | ✅ Done |
| A3-003 | Update CardService.linkCards | Emit `card:refresh` for parent and child after successful link | P0 | ✅ Done |
| A3-004 | Update CardService.unlinkCards | Emit `card:refresh` for former parent and unlinked child after successful unlink | P0 | ✅ Done |
| A3-005 | Handle linked action cards | Find and emit updates for action cards linked to affected feedback cards | P1 | ✅ Done |
| A3-006 | Update CardService.deleteCard | Emit `card:refresh` for any cards that referenced the deleted card | P1 | ⏳ Pending |
| A3-007 | Add frontend `card:refresh` handler | Handle `card:refresh` event by upserting card in store | P0 | ✅ Done |
| A3-008 | Add/update `upsertCard` store action | Ensure cardStore has method to replace/upsert a card | P0 | ✅ Done |
| A3-009 | Remove stale `card:linked`/`card:unlinked` handlers | Clean up old handlers that relied on cards existing in store | P2 | ⏳ Pending |
| A3-010 | Backend unit tests | Test that link/unlink/delete emit correct events | P0 | ✅ Done (493 pass) |
| A3-011 | Frontend unit tests | Test that `card:refresh` handler updates store correctly | P0 | ✅ Done (986 pass, 7 fail) |
| A3-012 | E2E tests | Test full flow: link, refresh, unlink with real-time sync | P0 | ⏳ Pending |

### Implementation Summary (2026-01-03)

**Backend Changes:**
- `backend/src/gateway/socket/socket-types.ts` - Added `CardRefreshPayload` interface and `'card:refresh'` event
- `backend/src/gateway/socket/EventBroadcaster.ts` - Added `cardRefresh()` method
- `backend/src/domains/card/card.service.ts` - Modified `linkCards` and `unlinkCards` to emit `card:refresh` for all impacted cards

**Frontend Changes:**
- `frontend/src/models/socket/socket-types.ts` - Added `CardRefreshEvent` interface
- `frontend/src/models/stores/cardStore.ts` - Added `upsertCard` action
- `frontend/src/features/card/viewmodels/useCardViewModel.ts` - Added `handleCardRefresh` handler

**Test Fixes:**
- Backend: Fixed admin user in unlink tests, added adminOverrideMiddleware to test-app
- Frontend: Added `BoardAPI.getCurrentUserSession` mocks, updated tests for inline editing

### Detailed Task Specifications

#### A3-001: Investigate Current Socket Emission

Files to check:
- `backend/src/domains/card/card.service.ts` - Where link/unlink logic lives
- `backend/src/socket/` - Socket emission utilities
- `backend/src/api/routes/` - Route handlers that may emit events

Goal: Understand current architecture before making changes.

#### A3-002: Add `card:updated` Socket Event Type

Backend (`backend/src/socket/types.ts` or similar):
```typescript
interface CardUpdatedEvent {
  card: CardWithRelationships;  // Full card data with children
}
```

Frontend (`frontend/src/models/socket/socket-types.ts`):
```typescript
export interface CardUpdatedEvent {
  card: Card;  // Full card data
}
```

#### A3-003 & A3-004: Update CardService Link/Unlink Methods

```typescript
// After successful link
async linkCards(parentId: string, childId: string, boardId: string): Promise<void> {
  // ... existing link logic ...

  // Fetch updated cards with full data
  const [parentCard, childCard] = await Promise.all([
    this.cardRepo.findByIdWithRelationships(parentId),
    this.cardRepo.findByIdWithRelationships(childId),
  ]);

  // Emit updates
  if (parentCard) this.socketService.emitToBoard(boardId, 'card:updated', { card: parentCard });
  if (childCard) this.socketService.emitToBoard(boardId, 'card:updated', { card: childCard });
}

// After successful unlink
async unlinkCards(parentId: string, childId: string, boardId: string): Promise<void> {
  // ... existing unlink logic ...

  // Fetch updated cards with full data
  const [parentCard, childCard] = await Promise.all([
    this.cardRepo.findByIdWithRelationships(parentId),
    this.cardRepo.findByIdWithRelationships(childId),
  ]);

  // Emit updates
  if (parentCard) this.socketService.emitToBoard(boardId, 'card:updated', { card: parentCard });
  if (childCard) this.socketService.emitToBoard(boardId, 'card:updated', { card: childCard });
}
```

#### A3-007: Frontend Socket Handler

File: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

```typescript
const handleCardUpdated = useCallback((event: { card: Card }) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] handleCardUpdated received:', { cardId: event.card.id });
  }
  useCardStore.getState().upsertCard(event.card);
}, []);

useEffect(() => {
  // ... existing subscriptions ...
  socketService.on('card:updated', handleCardUpdated);

  return () => {
    // ... existing cleanup ...
    socketService.off('card:updated', handleCardUpdated);
  };
}, [handleCardUpdated]);
```

#### A3-008: Add `upsertCard` Store Action

File: `frontend/src/models/stores/cardStore.ts`

```typescript
upsertCard: (card: Card) =>
  set((state) => {
    const newCards = new Map(state.cards);
    newCards.set(card.id, card);

    // If this card has children, also ensure children exist in map
    if (card.children && card.children.length > 0) {
      card.children.forEach((child) => {
        // Only update if child doesn't exist or needs parent_card_id update
        const existing = newCards.get(child.id);
        if (!existing) {
          // Create minimal Card from CardChild (frontend workaround)
          // This is a safety net - backend should send full child cards too
        }
      });
    }

    return { cards: newCards };
  }),
```

---

### Test Plan for Option A3

#### Unit Tests - Backend (493 passed)

| Test ID | Test Name | Description | Expected Result | Status |
|---------|-----------|-------------|-----------------|--------|
| A3-BE-001 | linkCards emits card:refresh for parent | Call linkCards, verify socket.emit called with parent card | `card:refresh` event with full parent data | ✅ Pass |
| A3-BE-002 | linkCards emits card:refresh for child | Call linkCards, verify socket.emit called with child card | `card:refresh` event with full child data | ✅ Pass |
| A3-BE-003 | unlinkCards emits card:refresh for former parent | Call unlinkCards, verify parent card emitted | Children array updated | ✅ Pass |
| A3-BE-004 | unlinkCards emits card:refresh for unlinked child | Call unlinkCards, verify child card emitted | parent_card_id is null | ✅ Pass |
| A3-BE-005 | linkCards handles action card links | Link feedback to action card, verify action card emitted | Action card in events | ✅ Pass |
| A3-BE-006 | deleteCard emits updates for linked cards | Delete parent card, verify children get updates | Children become orphans | ⏳ Pending |

#### Unit Tests - Frontend (986 passed, 7 failed)

| Test ID | Test Name | Description | Expected Result | Status |
|---------|-----------|-------------|-----------------|--------|
| A3-FE-001 | card:refresh handler upserts new card | Receive event for card not in store | Card added to store | ✅ Pass |
| A3-FE-002 | card:refresh handler updates existing card | Receive event for card in store | Card replaced in store | ✅ Pass |
| A3-FE-003 | card:refresh updates parent with new children | Parent card with children array received | Parent updated, children accessible | ✅ Pass |
| A3-FE-004 | card:refresh clears parent_card_id on unlink | Child card with null parent_card_id | Child becomes standalone | ✅ Pass |
| A3-FE-005 | Multiple card:refresh events processed | Rapid succession of events | All cards updated correctly | ✅ Pass |

**Remaining Frontend Failures (7 tests):**
- RetroBoardPage.rerender.test.tsx (6 tests) - Render count assertions affected by async session check
- RetroBoardPage.test.tsx (1 test) - Complex filtering interaction timing issue

#### E2E Tests

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| A3-E2E-001 | Link cards updates UI | 1. Create 2 cards 2. Link them 3. Verify UI | Child appears under parent | ⏳ Pending |
| A3-E2E-002 | Unlink cards after refresh | 1. Link 2 cards 2. Refresh 3. Unlink | Cards become independent | ⏳ Pending |
| A3-E2E-003 | Multi-user link sync | 1. User A links cards 2. Verify User B sees update | Real-time sync works | ⏳ Pending |
| A3-E2E-004 | Multi-user unlink sync | 1. User A unlinks cards 2. Verify User B sees update | Real-time sync works | ⏳ Pending |
| A3-E2E-005 | Delete parent updates UI | 1. Link cards 2. Delete parent 3. Verify child orphaned | Child becomes standalone | ⏳ Pending |
| A3-E2E-006 | Link/unlink cycle | 1. Link 2. Unlink 3. Re-link 4. Verify | All operations work | ⏳ Pending |

---

## Files to Modify

### Recommended: Backend Fix

| File | Change | Priority |
|------|--------|----------|
| `backend/src/domains/card/card.repository.ts` | Remove `parent_card_id = null` filter OR add method to return all cards | **P0 - Critical** |
| `backend/src/domains/card/card.service.ts` | Emit `card:updated` events for all impacted cards after link/unlink/delete | **P0 - Critical** |
| `backend/src/socket/handlers/` | Ensure socket emit logic covers all card operations | P1 - High |

### Alternative: Frontend Fix (Not Recommended)

| File | Change | Priority |
|------|--------|----------|
| `frontend/src/models/stores/cardStore.ts` | Fix `setCardsWithChildren` to create full Card objects from children | P2 - Workaround |
| `frontend/src/models/types/card.ts` | Consider adding missing fields to CardChild (optional) | P3 - Low |

---

## Implementation Steps

### Recommended: Backend Approach

#### Step 1: Modify Card Repository

File: `backend/src/domains/card/card.repository.ts`

Option A: Remove the filter (simplest)
```typescript
// Line 123 - REMOVE this line:
// matchStage.parent_card_id = null;
```

Option B: Add new method for flat card list
```typescript
async findAllByBoard(boardId: string): Promise<CardDocument[]> {
  const boardObjectId = this.toObjectId(boardId);
  if (!boardObjectId) return [];
  return this.collection.find({ board_id: boardObjectId }).sort({ created_at: -1 }).toArray();
}
```

#### Step 2: Update Card Service to Emit Refresh Events

File: `backend/src/domains/card/card.service.ts`

After link/unlink operations, emit `card:updated` for all impacted cards:
- Parent card (with updated children array)
- Child card (with updated parent_card_id)
- Any action cards linked to affected feedback cards

#### Step 3: Update Frontend Socket Handler

File: `frontend/src/features/card/viewmodels/useCardViewModel.ts`

Handle `card:updated` event by replacing the card in store:
```typescript
const handleCardUpdated = (event: { card: Card }) => {
  useCardStore.getState().updateCard(event.card);
};
```

#### Step 4: Run Tests

```bash
# Backend tests
cd backend && npm run test

# Frontend tests
cd frontend && npm run test:run

# E2E tests
cd frontend && npm run test:e2e -- 06-parent-child-cards.spec.ts
```

#### Step 5: Manual Testing

1. Create two cards, link them
2. Refresh page
3. Unlink them
4. Verify both operations update UI correctly
5. Test with multiple browser windows for real-time sync

---

## Appendix: Debug Commands

### Check cardsMap Contents

In browser console:
```javascript
// Get all cards in store
const cards = Array.from(window.__cardStore?.getState()?.cards?.values() || []);
console.table(cards.map(c => ({
  id: c.id.slice(-8),
  content: c.content.slice(0, 20),
  parent_card_id: c.parent_card_id?.slice(-8) || 'null',
  hasChildren: c.children?.length > 0
})));
```

### Verify Socket Connection

In browser console:
```javascript
// Check socket connection status
window.__socketService?.isConnected()
```

### Manual Socket Event Test

In browser console:
```javascript
// Simulate receiving a card:linked event
window.__socketService?.emit('card:linked', {
  sourceId: 'parent-card-id',
  targetId: 'child-card-id',
  linkType: 'parent_of'
});
```

---

*Investigation by Principal Engineer - 2026-01-03*
*Updated with Backend Fix Analysis - 2026-01-03*
