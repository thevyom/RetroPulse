# Phase 8.6 Task List - Bug Fixes

**Created**: 2026-01-03
**Updated**: 2026-01-05
**Status**: Ready for Implementation
**Author**: Principal Engineer

---

## Scope Change Notice

> **Reorganization**: Avatar System v2 tasks (formerly Phase 2 & 3) have been moved to Phase 8.7.
> This phase now focuses exclusively on critical bug fixes.

---

## Task Overview

| Task | Bug ID | Description | Priority | Estimate |
|------|--------|-------------|----------|----------|
| 1.1 | UTB-029 | Fix Card Linking Duplicates | P0 | 45 min |
| 1.2 | UTB-030 | Fix New Participant Alias Not Shown | P0 | 30 min |
| 1.3 | UTB-031 | Add Close Board Tooltip | P2 | 20 min |
| 1.4 | UTB-032 | Fix Card Header Alignment | P2 | 10 min |

**Total Estimate**: ~1.75 hours

**Parallelization**: All 4 tasks are independent and can run in parallel.

---

## Task 1.1: UTB-029 - Fix Card Linking Duplicates

**Priority:** P0 - Critical
**Estimate:** 45 min

**Root Cause:** Race condition between `fetchCards()` and socket `card:linked` event

**File:** `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Fix 1 - Lines 668-679 - Remove fetchCards after link:**
```typescript
// BEFORE (broken):
const handleLinkParentChild = useCallback(
  async (parentId: string, childId: string): Promise<void> => {
    try {
      await CardAPI.linkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      await fetchCards();  // <-- REMOVE THIS - causes race condition
    } catch (err) {
      // ...
    }
  },
  [board?.state, cardsMap, fetchCards]
);

// AFTER (fixed):
const handleLinkParentChild = useCallback(
  async (parentId: string, childId: string): Promise<void> => {
    try {
      await CardAPI.linkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      // Socket event will handle store update - no fetchCards()
    } catch (err) {
      // ...
    }
  },
  [board?.state, cardsMap]  // Remove fetchCards from deps
);
```

**Fix 2 - Add idempotent check in socket handler (lines 394-399):**
```typescript
const handleCardLinked = (event: { sourceId: string; targetId: string; linkType: string }) => {
  if (event.linkType === 'parent_of') {
    const child = cardsMap.get(event.targetId);
    // Only apply if not already linked (idempotent)
    if (!child?.parent_card_id || child.parent_card_id !== event.sourceId) {
      linkChildStore(event.sourceId, event.targetId);
    }
  }
};
```

**Acceptance Criteria:**
- [ ] Linking two cards does NOT create duplicate cards
- [ ] Unlinking works correctly
- [ ] Store state remains consistent
- [ ] Socket events don't cause duplicate updates

---

## Task 1.2: UTB-030 - Fix New Participant Alias Not Shown

**Priority:** P0 - Critical
**Estimate:** 30 min

**Root Cause:** Socket field name mismatch (camelCase vs snake_case)

**File 1:** `frontend/src/models/socket/socket-types.ts`

**Lines 135-139 - Update interface:**
```typescript
// BEFORE (broken - expects snake_case):
export interface UserJoinedEvent extends BaseEvent {
  board_id: string;
  alias: string;
  is_admin: boolean;
}

// AFTER (fixed - matches backend camelCase):
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}
```

**File 2:** `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`

**Lines 235-247 - Update handler:**
```typescript
// BEFORE (broken):
const handleUserJoined = (event: { board_id: string; alias: string; is_admin: boolean }) => {
  if (event.board_id === boardId) {
    const newUser: ActiveUser = {
      alias: event.alias,
      is_admin: event.is_admin,
      // ...
    };
    addActiveUser(newUser);
  }
};

// AFTER (fixed):
const handleUserJoined = (event: { boardId: string; userAlias: string; isAdmin: boolean }) => {
  if (event.boardId === boardId) {
    const newUser: ActiveUser = {
      alias: event.userAlias,
      is_admin: event.isAdmin,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    addActiveUser(newUser);
    setUserOnline(event.userAlias);
  }
};
```

**Acceptance Criteria:**
- [ ] New participants appear in participant bar immediately
- [ ] Alias displayed correctly
- [ ] Admin status shown correctly
- [ ] Socket event field names consistent

---

## Task 1.3: UTB-031 - Add Close Board Tooltip

**Priority:** P2 - Low
**Estimate:** 20 min

**File:** `frontend/src/features/board/components/RetroBoardHeader.tsx`

**Find Close Board button and wrap with Tooltip:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// In the render:
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCloseDialogOpen(true)}
        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="mr-1 h-4 w-4" />
        Close Board
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs">
      <p>Makes the board read-only. No new cards, edits, or reactions allowed. This action cannot be undone.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Also improve confirmation dialog text:**
```tsx
// Find the AlertDialog content and update:
<AlertDialogDescription>
  Closing the board makes it permanently read-only:
  <ul className="list-disc list-inside mt-2 space-y-1">
    <li>No new cards can be created</li>
    <li>Existing cards cannot be edited or deleted</li>
    <li>Reactions are locked</li>
    <li>Aliases cannot be changed</li>
  </ul>
  <p className="mt-2 font-medium">This is useful for archiving completed retrospectives. This action cannot be undone.</p>
</AlertDialogDescription>
```

**Acceptance Criteria:**
- [ ] Tooltip appears on hover
- [ ] Tooltip text explains Close Board action
- [ ] Confirmation dialog has detailed explanation
- [ ] Users understand implications before confirming

---

## Task 1.4: UTB-032 - Fix Card Header Alignment

**Priority:** P2 - Low
**Estimate:** 10 min

**File:** `frontend/src/features/card/components/RetroCard.tsx`

**Lines 333-340 - Change items-start to items-center:**
```tsx
// BEFORE (misaligned):
<div
  className={cn(
    'mb-2 flex items-start justify-between min-h-[30px]',
    // ...
  )}
>

// AFTER (aligned):
<div
  className={cn(
    'mb-2 flex items-center justify-between',
    // ...
  )}
>
```

**Acceptance Criteria:**
- [ ] Drag handle vertically aligned with reaction button
- [ ] Anonymous/author icons vertically aligned with action buttons
- [ ] Consistent across all card states
- [ ] No visual regression

---

## Execution Plan

**All 4 tasks can run in parallel:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Agent 1: UTB-029      Agent 2: UTB-030      Agent 3: UTB-031/032      │
│  Card Linking          Participant Alias      Tooltip + Alignment       │
│  (45 min)              (30 min)               (30 min)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Testing

After implementation, run:

```bash
# Unit tests
cd frontend && npm run test:run

# E2E tests (if available)
cd frontend && npm run test:e2e
```

---

## Next Phase

After Phase 8.6 bug fixes are complete, proceed to:
- **Phase 8.7**: Avatar System v2 (complete participant bar redesign)

---

*Task List by Principal Engineer - Updated 2026-01-05*
*Ready for implementation*
