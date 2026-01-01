# Bug Fix Report: UTB-007 - Child Card Reaction Buttons

**Bug ID**: UTB-007
**Date**: 2026-01-01
**Status**: Fixed
**Severity**: Medium
**Component**: RetroCard, RetroColumn, RetroBoardPage

---

## Summary

Child cards displayed within parent cards were showing reaction counts as static text. Users could not click to react/unreact to child cards directly - they could only react to parent cards.

---

## Problem Description

When viewing a parent card with linked children, the child cards displayed their reaction count as plain text:
```tsx
{child.direct_reaction_count > 0 && (
  <span className="ml-auto flex items-center gap-1">
    <ThumbsUp className="h-3 w-3" />
    {child.direct_reaction_count}
  </span>
)}
```

This was a read-only display with no interactivity.

---

## Root Cause Analysis

The child card rendering inside RetroCard only displayed reaction counts, but didn't include:
1. Click handlers for adding/removing reactions
2. Knowledge of whether the current user had reacted to the child
3. Props to pass these handlers down from the parent component chain

---

## Solution

### Changes Made

**File 1: `frontend/src/features/card/components/RetroCard.tsx`**

1. Added new optional props to `RetroCardProps` interface:
   - `onReactToChild?: (childId: string) => Promise<void>`
   - `onUnreactFromChild?: (childId: string) => Promise<void>`
   - `hasUserReactedToChild?: (childId: string) => boolean`

2. Added `handleChildReactionClick` callback to toggle reactions on children:
   ```tsx
   const handleChildReactionClick = useCallback(async (childId: string) => {
     if (isClosed) return;
     if (!onReactToChild || !onUnreactFromChild || !hasUserReactedToChild) return;

     if (hasUserReactedToChild(childId)) {
       await onUnreactFromChild(childId);
     } else {
       await onReactToChild(childId);
     }
   }, [isClosed, onReactToChild, onUnreactFromChild, hasUserReactedToChild]);
   ```

3. Replaced static span with interactive Button:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     className={cn(
       'ml-auto h-5 gap-1 px-1.5 py-0 text-xs',
       hasUserReactedToChild?.(child.id) && 'text-primary'
     )}
     onClick={() => handleChildReactionClick(child.id)}
     disabled={isClosed || (!canReact && !hasUserReactedToChild?.(child.id))}
     aria-label={hasUserReactedToChild?.(child.id)
       ? 'Remove reaction from child card'
       : 'Add reaction to child card'}
   >
     <ThumbsUp className={cn('h-3 w-3', hasUserReactedToChild?.(child.id) && 'fill-current')} />
     {child.direct_reaction_count > 0 && (
       <span>{child.direct_reaction_count}</span>
     )}
   </Button>
   ```

**File 2: `frontend/src/features/card/components/RetroColumn.tsx`**

1. Extended `RetroColumnProps` interface with child reaction handlers:
   ```tsx
   onReactToChild?: (childId: string) => Promise<void>;
   onUnreactFromChild?: (childId: string) => Promise<void>;
   hasUserReactedToChild?: (childId: string) => boolean;
   ```

2. Destructured new props and passed them to RetroCard.

**File 3: `frontend/src/features/board/components/RetroBoardPage.tsx`**

1. Added prop threading from useCardViewModel to RetroColumn:
   ```tsx
   onReactToChild={cardVM.handleAddReaction}
   onUnreactFromChild={cardVM.handleRemoveReaction}
   hasUserReactedToChild={cardVM.hasUserReacted}
   ```

---

## Test Results

### Unit Tests

**File**: `frontend/tests/unit/features/card/components/RetroCard.test.tsx`

**Tests Added**: 10 new tests in "Child Card Reactions (UTB-007)" describe block

| Test Case | Status |
|-----------|--------|
| should render reaction button for child cards | PASS |
| should show filled icon when user has reacted to child card | PASS |
| should call onReactToChild when child reaction button is clicked | PASS |
| should call onUnreactFromChild when user has already reacted | PASS |
| should disable child reaction button when board is closed | PASS |
| should disable child reaction button when canReact is false and not reacted | PASS |
| should enable child reaction button to remove reaction even when canReact is false | PASS |
| should show reaction count on child card button | PASS |
| should have primary color when user has reacted to child | PASS |
| should render reaction button even when child has zero reactions | PASS |

### Test Run Output

```
> npm run test:run -- tests/unit/features/card/components/RetroCard.test.tsx

 ✓ tests/unit/features/card/components/RetroCard.test.tsx (35 tests) 8.42s

 Test Files  1 passed (1)
      Tests  35 passed (35)
```

---

## Code Review Summary

### Praise
- Clean prop threading pattern from viewmodel through components
- Reusing existing `handleAddReaction`/`handleRemoveReaction` for children
- Excellent accessibility with dynamic aria-labels
- Proper disabled state handling for closed boards and quota limits

### Suggestions (optional improvements)
- Extract child's reacted state to avoid repeated optional chaining
- Add test for multiple children to verify correct ID passing

### Verdict
**Approved** - Implementation is correct, well-tested, and follows existing patterns.

---

## Verification Steps

1. Navigate to a board with linked cards (parent with children)
2. Find a parent card displaying child cards
3. Hover over the reaction button on a child card
4. Click to add a reaction - count should increment
5. Click again to remove reaction - count should decrement
6. Verify button is disabled when board is closed
7. Verify button shows filled icon when user has reacted

---

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/features/card/components/RetroCard.tsx` | Added child reaction button + handlers |
| `frontend/src/features/card/components/RetroColumn.tsx` | Added child reaction prop threading |
| `frontend/src/features/board/components/RetroBoardPage.tsx` | Connected viewmodel to column |
| `frontend/tests/unit/features/card/components/RetroCard.test.tsx` | Added 10 new tests |

---

*Report generated: 2026-01-01*
