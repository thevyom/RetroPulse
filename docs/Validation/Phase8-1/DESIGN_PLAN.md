# Bug Fix Design Plan - UTB-001 through UTB-013

**Document Version**: 1.0
**Date**: 2026-01-01
**Author**: Principal Engineer
**Status**: Draft - Awaiting Review

---

## Executive Summary

This document outlines the technical design for resolving 13 bugs identified during user testing. The bugs span 4 components with varying complexity levels. The fixes are organized into 5 logical work streams to minimize merge conflicts and enable parallel development where possible.

---

## Bug Classification Matrix

| Bug ID | Severity | Component | Complexity | Work Stream | Dependencies |
|--------|----------|-----------|------------|-------------|--------------|
| UTB-001 | High | CreateBoardDialog | Medium | WS-1: Board Creation | None |
| UTB-005 | High | CreateBoardDialog | High | WS-1: Board Creation | None |
| UTB-008 | High | CreateBoardDialog | Medium | WS-1: Board Creation | None |
| UTB-003 | High | RetroBoardHeader | Low | WS-2: Board Header | None |
| UTB-002 | High | RetroCard | Low | WS-3: Card UX | None |
| UTB-004 | High | RetroCard | Medium | WS-3: Card UX | None |
| UTB-007 | High | RetroCard | Medium | WS-3: Card UX | None |
| UTB-011 | High | RetroCard | Low | WS-3: Card UX | UTB-001 |
| UTB-006 | High | cardStore | Medium | WS-4: Data Layer | None |
| UTB-009 | High | RetroBoardPage | Medium | WS-5: Sorting & Filtering | None |
| UTB-010 | Medium | RetroBoardPage | Medium | WS-5: Sorting & Filtering | UTB-009 |
| UTB-012 | High | ParticipantBar | Low | WS-5: Sorting & Filtering | None |
| UTB-013 | High | ParticipantBar | Low | WS-5: Sorting & Filtering | None |

---

## Work Stream 1: Board Creation Enhancements

### WS-1.1: UTB-001 - Creator Alias Prompt

**Problem Analysis**:
Current `CreateBoardDialog` only collects board name. PRD FR-1.2.3 requires users be prompted for alias on first board access. Board creators bypass this flow entirely.

**Design Approach**:
1. Add "Your Name" input field to CreateBoardDialog between board name and column preview
2. Validate alias using existing `validateAlias()` function
3. Pass alias to `createBoard()` API call
4. Backend should set creator alias via existing join mechanism

**Technical Design**:

```typescript
// CreateBoardDialog.tsx - State additions
const [creatorAlias, setCreatorAlias] = useState('');
const [aliasError, setAliasError] = useState<string | null>(null);

// Form submission modification
const handleSubmit = async (e: FormEvent) => {
  // Validate alias
  const aliasValidation = validateAlias(creatorAlias);
  if (!aliasValidation.isValid) {
    setAliasError(aliasValidation.error || 'Invalid alias');
    return;
  }

  // Create board with alias
  const board = await createBoard({
    name: boardName.trim(),
    columns: DEFAULT_COLUMNS,
    card_limit_per_user: cardLimit,
    reaction_limit_per_user: reactionLimit,
    creator_alias: creatorAlias.trim(), // New field
  });
};
```

**API Changes Required**:
- Extend `CreateBoardDTO` to include optional `creator_alias` field
- Backend should auto-join creator to board with provided alias

**UI Wireframe**:
```
┌─────────────────────────────────────────┐
│ Create New Board                    [X] │
├─────────────────────────────────────────┤
│ Board Name                              │
│ ┌─────────────────────────────────────┐ │
│ │ Sprint 42 Retrospective             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Your Name (Alias)                       │
│ ┌─────────────────────────────────────┐ │
│ │ John                                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Default columns:                        │
│ [What Went Well] [To Improve] [Actions] │
│                                         │
│         [Cancel]  [Create Board]        │
└─────────────────────────────────────────┘
```

---

### WS-1.2: UTB-005 - Column Customization

**Problem Analysis**:
Default columns displayed as static chips with no editing capability. PRD FR-1.1.3/FR-1.1.6 require column customization during creation.

**Design Approach**:
1. Convert static column chips to editable inline inputs
2. Add "+" button for adding columns
3. Add "×" button on each column for removal (minimum 1 column required)
4. Maintain column type inference based on name content

**Technical Design**:

```typescript
// CreateBoardDialog.tsx - State management
interface ColumnConfig {
  id: string;
  name: string;
  type: 'feedback' | 'action';
  color: string;
}

const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

const handleColumnNameChange = (id: string, name: string) => {
  setColumns(prev => prev.map(col =>
    col.id === id
      ? { ...col, name, type: inferColumnType(name) }
      : col
  ));
};

const handleAddColumn = () => {
  const newId = `col-${Date.now()}`;
  setColumns(prev => [...prev, {
    id: newId,
    name: 'New Column',
    type: 'feedback',
    color: getNextColor(prev.length),
  }]);
};

const handleRemoveColumn = (id: string) => {
  if (columns.length <= 1) return; // Minimum 1 column
  setColumns(prev => prev.filter(col => col.id !== id));
};
```

**UI Wireframe**:
```
Default columns:
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌───┐
│ What Went Well [×]│ │ To Improve    [×]│ │ Action Items  [×]│ │ + │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └───┘
```

**Validation Rules**:
- Column name: 1-30 characters (use existing `validateColumnName`)
- Minimum 1 column required
- Maximum 6 columns (UX constraint)
- No duplicate column names

---

### WS-1.3: UTB-008 - Card/Reaction Limits

**Problem Analysis**:
No UI controls for setting limits. Both hardcoded to `null` (unlimited) in current implementation.

**Design Approach**:
1. Add collapsible "Advanced Settings" section below columns
2. Include two number inputs with "Unlimited" toggle
3. Default both to unlimited (null)

**Technical Design**:

```typescript
// CreateBoardDialog.tsx - State additions
const [cardLimit, setCardLimit] = useState<number | null>(null);
const [reactionLimit, setReactionLimit] = useState<number | null>(null);
const [showAdvanced, setShowAdvanced] = useState(false);
```

**UI Wireframe**:
```
▶ Advanced Settings (click to expand)
──────────────────────────────────────
┌─────────────────────────────────────┐
│ Cards per user:  [  ] Unlimited     │
│                  OR                 │
│                  Limit: [___10___]  │
│                                     │
│ Reactions per user: [  ] Unlimited  │
│                     OR              │
│                     Limit: [___5__] │
└─────────────────────────────────────┘
```

---

## Work Stream 2: Board Header Enhancements

### WS-2.1: UTB-003 - Copy Link Button

**Problem Analysis**:
No share mechanism in header. Users must manually copy URL from browser.

**Design Approach**:
1. Add "Share" button to RetroBoardHeader between Close Board and MyUserCard
2. Use Clipboard API to copy current URL
3. Show toast notification on success/failure

**Technical Design**:

```typescript
// RetroBoardHeader.tsx - Add share handler
const handleCopyLink = async () => {
  const boardUrl = window.location.href;
  try {
    await navigator.clipboard.writeText(boardUrl);
    toast.success('Link copied to clipboard!');
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = boardUrl;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast.success('Link copied to clipboard!');
  }
};
```

**UI Placement**:
```
┌─────────────────────────────────────────────────────────────────────┐
│ Sprint 42 Retro [✏]              [Share 🔗] [Close Board] [👤 John] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Work Stream 3: Card UX Improvements

### WS-3.1: UTB-002 - Unlink Button Visibility

**Problem Analysis**:
Link icon on child cards lacks clear hover state indicating it's clickable.

**Design Approach**:
1. Add explicit hover styles to link icon button
2. Ensure tooltip is visible and descriptive
3. Add color transition on hover

**Technical Changes**:

```typescript
// RetroCard.tsx - Enhanced link button styling
<button
  type="button"
  onClick={handleUnlink}
  disabled={isClosed || isSubmitting}
  className={cn(
    "cursor-pointer text-muted-foreground transition-colors",
    "hover:text-primary hover:scale-110",          // NEW: Visual feedback
    "focus:outline-none focus:ring-2 focus:ring-primary", // NEW: Focus state
    "disabled:cursor-not-allowed disabled:opacity-50"
  )}
  aria-label="Unlink from parent card"
>
  <Link2 className="h-4 w-4" />
</button>
```

---

### WS-3.2: UTB-004 - Action-Feedback Link Indicator

**Problem Analysis**:
No visual indication when feedback cards have linked action items, or vice versa.

**Design Approach**:
1. Add "Linked Action" indicator section at bottom of feedback cards when linked
2. Add "Links to Feedback" indicator on action cards when linked
3. Make indicators clickable to scroll/highlight target card

**Technical Design**:

```typescript
// RetroCard.tsx - New component section after card content
{/* Action Link Indicator (for feedback cards) */}
{card.card_type === 'feedback' && linkedActions.length > 0 && (
  <div className="mt-2 rounded-md bg-blue-100 p-2">
    <span className="text-xs text-blue-700 font-medium">
      Linked Actions:
    </span>
    {linkedActions.map(action => (
      <button
        key={action.id}
        onClick={() => scrollToCard(action.id)}
        className="ml-1 text-xs text-blue-600 underline hover:text-blue-800"
      >
        {action.content.slice(0, 30)}...
      </button>
    ))}
  </div>
)}

{/* Feedback Link Indicator (for action cards) */}
{card.card_type === 'action' && card.linked_feedback_ids.length > 0 && (
  <div className="mt-2 rounded-md bg-green-100 p-2">
    <span className="text-xs text-green-700 font-medium">
      Links to:
    </span>
    {linkedFeedback.map(fb => (
      <button
        key={fb.id}
        onClick={() => scrollToCard(fb.id)}
        className="ml-1 text-xs text-green-600 underline hover:text-green-800"
      >
        {fb.content.slice(0, 30)}...
      </button>
    ))}
  </div>
)}
```

**Scroll Implementation**:
```typescript
const scrollToCard = (cardId: string) => {
  const cardElement = document.getElementById(`card-${cardId}`);
  if (cardElement) {
    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cardElement.classList.add('ring-2', 'ring-primary');
    setTimeout(() => {
      cardElement.classList.remove('ring-2', 'ring-primary');
    }, 2000);
  }
};
```

---

### WS-3.3: UTB-007 - Child Card Reactions

**Problem Analysis**:
Child cards in collapsed view only show reaction count, no clickable button.

**Design Approach**:
1. Make reaction count in child card preview clickable
2. Wire up to same reaction handlers as parent cards
3. Update parent's aggregated count in real-time

**Technical Design**:

```typescript
// RetroCard.tsx - Child card section modification
{card.children!.map((child) => (
  <div key={child.id} className="rounded-md border-l-2 ...">
    {/* ... existing header ... */}

    {/* Reaction button for child cards */}
    <div className="flex items-center justify-between">
      <p className="whitespace-pre-wrap text-foreground">{child.content}</p>
      <Button
        variant="ghost"
        size="sm"
        className={cn('h-6 gap-1 px-2', hasUserReactedToChild(child.id) && 'text-primary')}
        onClick={() => onReactToChild(child.id)}
        disabled={isClosed || (!canReact && !hasUserReactedToChild(child.id))}
        aria-label={hasUserReactedToChild(child.id) ? 'Remove reaction' : 'Add reaction'}
      >
        <ThumbsUp className={cn('h-3 w-3', hasUserReactedToChild(child.id) && 'fill-current')} />
        {child.direct_reaction_count > 0 && (
          <span className="text-xs font-medium">{child.direct_reaction_count}</span>
        )}
      </Button>
    </div>
  </div>
))}
```

**Props Addition**:
```typescript
export interface RetroCardProps {
  // ... existing props ...
  onReactToChild?: (childId: string) => Promise<void>;
  onUnreactFromChild?: (childId: string) => Promise<void>;
  hasUserReactedToChild?: (childId: string) => boolean;
}
```

---

### WS-3.4: UTB-011 - Card Deletion (Blocked by UTB-001)

**Problem Analysis**:
Card deletion fails for board creator because no alias is set. Resolution depends on UTB-001.

**Design Approach**:
Once UTB-001 is resolved, board creator will have an alias. The existing delete functionality should work correctly. No code changes needed beyond UTB-001 fix.

**Verification Required**:
- After UTB-001 fix, verify isOwner check works with creator's alias
- Ensure `created_by_hash` matches creator's cookie hash

---

## Work Stream 4: Data Layer Fixes

### WS-4.1: UTB-006 - Aggregated Reaction Count on Link

**Problem Analysis**:
When cards are linked, parent's `aggregated_reaction_count` doesn't update to include child's reactions.

**Root Cause Analysis**:
The `handleCardLinked` socket handler calls `fetchCards()` but the aggregation calculation in `selectParentsWithAggregated` may not be triggered, OR the backend isn't returning updated aggregation.

**Design Approach**:
1. Verify backend returns correct aggregation on link operations
2. Ensure store update triggers re-render with new aggregation
3. Add explicit recalculation in store when parent-child link is established

**Technical Design**:

```typescript
// cardStore.ts - Add linkChild action
linkChild: (parentId: string, childId: string) =>
  set((state) => {
    const parent = state.cards.get(parentId);
    const child = state.cards.get(childId);
    if (!parent || !child) return state;

    const newCards = new Map(state.cards);

    // Update child's parent reference
    newCards.set(childId, {
      ...child,
      parent_card_id: parentId,
    });

    // Recalculate parent's aggregated count
    const childReactions = child.direct_reaction_count;
    newCards.set(parentId, {
      ...parent,
      aggregated_reaction_count: parent.aggregated_reaction_count + childReactions,
      children: [...(parent.children || []), {
        id: child.id,
        content: child.content,
        is_anonymous: child.is_anonymous,
        created_by_alias: child.created_by_alias,
        direct_reaction_count: child.direct_reaction_count,
      }],
    });

    return { cards: newCards };
  }),

unlinkChild: (parentId: string, childId: string) =>
  set((state) => {
    const parent = state.cards.get(parentId);
    const child = state.cards.get(childId);
    if (!parent || !child) return state;

    const newCards = new Map(state.cards);

    // Remove parent reference from child
    newCards.set(childId, {
      ...child,
      parent_card_id: null,
    });

    // Recalculate parent's aggregated count
    const childReactions = child.direct_reaction_count;
    newCards.set(parentId, {
      ...parent,
      aggregated_reaction_count: Math.max(0, parent.aggregated_reaction_count - childReactions),
      children: (parent.children || []).filter(c => c.id !== childId),
    });

    return { cards: newCards };
  }),
```

---

## Work Stream 5: Sorting & Filtering Fixes

### WS-5.1: UTB-009 - Sorting Not Applied

**Problem Analysis**:
Sorting state updates in useCardViewModel but cards don't reorder. The `cardsByColumn` memoization doesn't use sort state.

**Root Cause**:
`cardsByColumn` in useCardViewModel only filters by column and sorts by creation date. It doesn't apply `sortMode` and `sortDirection`.

**Design Approach**:
1. Modify `cardsByColumn` computation to apply current sort settings
2. Ensure RetroBoardPage passes sorted cards to RetroColumn

**Technical Design**:

```typescript
// useCardViewModel.ts - Fix cardsByColumn memoization
const cardsByColumn = useMemo(() => {
  const byColumn = new Map<string, Card[]>();

  // Get only parent cards (no parent_card_id) for display
  const parentCards = cards.filter((card) => !card.parent_card_id);

  parentCards.forEach((card) => {
    const existing = byColumn.get(card.column_id) || [];
    byColumn.set(card.column_id, [...existing, card]);
  });

  // Apply sorting to each column
  byColumn.forEach((columnCards, columnId) => {
    const sorted = sortCards(columnCards, sortMode, sortDirection);
    byColumn.set(columnId, sorted);
  });

  return byColumn;
}, [cards, sortMode, sortDirection]); // Add sortMode and sortDirection dependencies
```

---

### WS-5.2: UTB-010 - Board Re-render Performance

**Problem Analysis**:
Entire board re-renders when sort changes, including header and participant bar.

**Design Approach**:
1. Memoize RetroBoardHeader component
2. Memoize ParticipantBar component
3. Isolate sort state changes to card area only
4. Use React.memo with appropriate comparison functions

**Technical Design**:

```typescript
// RetroBoardHeader.tsx - Add memo wrapper
export const RetroBoardHeader = memo(function RetroBoardHeader({...}: RetroBoardHeaderProps) {
  // ... existing implementation
});

// ParticipantBar.tsx - Already memoized, verify props stability
// Ensure callbacks passed from RetroBoardPage are stable (useCallback)
```

**RetroBoardPage Optimization**:
```typescript
// Stabilize callback references
const stableHandleRenameBoard = useCallback(
  (newName: string) => boardVM.handleRenameBoard(newName),
  [boardVM.handleRenameBoard]
);

const stableHandleCloseBoard = useCallback(
  () => boardVM.handleCloseBoard(),
  [boardVM.handleCloseBoard]
);
```

---

### WS-5.3: UTB-012 - Anonymous Filter Logic

**Problem Analysis**:
Anonymous filter shows attributed cards and hides anonymous cards (inverted logic).

**Root Cause**:
In RetroBoardPage's `filteredCardsByColumn` computation:
```typescript
if (!participantVM.showAnonymous && card.is_anonymous) return false;
```
This hides anonymous cards when `showAnonymous` is false. But clicking Anonymous filter should show ONLY anonymous cards.

**Design Approach**:
1. When Anonymous filter is explicitly selected, show only anonymous cards
2. Distinguish between "hide anonymous" and "show only anonymous" states

**Technical Design**:

```typescript
// Add new state to track "anonymous only" mode
// useParticipantViewModel.ts
const [showOnlyAnonymous, setShowOnlyAnonymous] = useState(false);

const handleToggleAnonymousFilter = useCallback(() => {
  setShowOnlyAnonymous(prev => !prev);
  // When showing only anonymous, clear user selection
  if (!showOnlyAnonymous) {
    setSelectedUsers([]);
    setShowAll(false);
  }
}, [showOnlyAnonymous]);

// RetroBoardPage.tsx - Updated filter logic
const filtered = columnCards.filter((card) => {
  // Anonymous-only mode: show only anonymous cards
  if (participantVM.showOnlyAnonymous) {
    return card.is_anonymous;
  }

  // User-specific filter
  if (participantVM.selectedUsers.length > 0) {
    if (card.is_anonymous) return false;
    return participantVM.selectedUsers.includes(card.created_by_hash);
  }

  // Default: show all
  return true;
});
```

---

### WS-5.4: UTB-013 - Anonymous Filter Visual Indicator

**Problem Analysis**:
No visual distinction when Anonymous filter is active.

**Design Approach**:
1. Apply same `isSelected` styling as user avatars
2. Add ring highlight when active

**Technical Design**:

```typescript
// ParticipantBar.tsx - Update Anonymous avatar
<ParticipantAvatar
  type="anonymous"
  isSelected={showOnlyAnonymous}  // Changed from showAnonymous
  onClick={onToggleAnonymous}
/>

// ParticipantAvatar.tsx - Ensure selected state is visually distinct
<div className={cn(
  "... existing classes ...",
  isSelected && "ring-2 ring-primary ring-offset-2 bg-primary/10"
)}>
```

---

## Implementation Sequence

### Phase 1: Critical Path (Blocks Other Work)
1. **UTB-001** - Creator alias prompt (blocks UTB-011)

### Phase 2: Parallel Development
Can be developed simultaneously by different engineers:
- **Work Stream 1**: UTB-005, UTB-008 (CreateBoardDialog)
- **Work Stream 2**: UTB-003 (RetroBoardHeader)
- **Work Stream 3**: UTB-002, UTB-004 (RetroCard)
- **Work Stream 4**: UTB-006 (cardStore)
- **Work Stream 5**: UTB-009, UTB-012, UTB-013 (Sorting/Filtering)

### Phase 3: Dependent Work
- **UTB-011** - Verify after UTB-001
- **UTB-007** - After UTB-004 patterns established
- **UTB-010** - After UTB-009 sorting is working

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend API changes needed for UTB-001 | Medium | High | Coordinate with backend team early |
| Sorting fix causes performance regression | Low | Medium | Profile before/after, use React DevTools |
| Column customization breaks existing boards | Low | High | Test with existing board data |
| Anonymous filter change confuses users | Medium | Low | Add tooltip explaining behavior |

---

## Testing Strategy Reference

See [QA_TEST_PLAN.md](./QA_TEST_PLAN.md) for comprehensive test cases.

---

## Acceptance Criteria Summary

All bugs resolved when:
1. Board creators have alias set after creation
2. Board link can be copied with single click
3. Columns can be customized during creation
4. Card/reaction limits can be configured
5. Child cards can receive reactions
6. Aggregated counts update on linking
7. Unlink button is clearly clickable
8. Action-feedback links are visible
9. Sorting actually reorders cards
10. Anonymous filter shows only anonymous cards
11. Active filter has visual indicator
12. Performance is stable during sort changes

---

*Document prepared for team review. Please provide feedback by 2026-01-03.*
