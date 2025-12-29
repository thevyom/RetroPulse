# Phase 4: ViewModel Layer (Business Logic Hooks)

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/10 complete
**Dependencies**: Phase 1-3 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the ViewModel layer following MVVM architecture. ViewModels are React hooks that encapsulate business logic, manage state, and coordinate between the View layer and Model layer. They handle data fetching, transformations, real-time event subscriptions, and user actions.

---

## 📋 Task Breakdown

### 8. useBoardViewModel

#### 8.1 Implement useBoardViewModel Hook

- [ ] Create `features/board/viewmodels/useBoardViewModel.ts`
- [ ] Implement board data loading on mount
- [ ] Implement loading and error state management
- [ ] Derive `isAdmin` from board.admins and currentUserHash
- [ ] Derive `isCreator` from board.admins[0]
- [ ] Derive `isClosed` from board.state
- [ ] Implement `handleRenameBoard(newName)` function
- [ ] Implement `handleCloseBoard()` function
- [ ] Subscribe to 'board:renamed' and 'board:closed' socket events
- [ ] Clean up subscriptions on unmount

**Interface:**
```typescript
// features/board/viewmodels/useBoardViewModel.ts
interface UseBoardViewModelResult {
  // State
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // Derived state
  isAdmin: boolean;
  isCreator: boolean;
  isClosed: boolean;

  // Actions
  handleRenameBoard: (newName: string) => Promise<void>;
  handleCloseBoard: () => Promise<void>;
  refetchBoard: () => Promise<void>;
}

export function useBoardViewModel(boardId: string): UseBoardViewModelResult {
  const { board, setBoard, updateBoardName, closeBoard } = useBoardStore();
  const { currentUser } = useUserStore();

  // Derived state
  const isAdmin = board?.admins.includes(currentUser?.cookie_hash ?? '') ?? false;
  const isCreator = board?.admins[0] === currentUser?.cookie_hash;
  const isClosed = board?.state === 'closed';

  // Load board on mount
  useEffect(() => { ... }, [boardId]);

  // Socket subscriptions
  useEffect(() => { ... }, []);

  return { ... };
}
```

**Reference**: Section 5.1 of design doc

---

#### 8.2 Write Tests for useBoardViewModel

- [ ] Test loads board data on mount
- [ ] Test derives isAdmin correctly
- [ ] Test derives isCreator correctly
- [ ] Test handleRenameBoard calls API and updates store
- [ ] Test handleCloseBoard sets closed state
- [ ] Test error handling

**Test Cases:**
```typescript
describe('useBoardViewModel', () => {
  it('loads board on mount', async () => { ... });
  it('derives isAdmin from admins array', () => { ... });
  it('derives isCreator from first admin', () => { ... });
  it('handles rename board', async () => { ... });
  it('handles close board', async () => { ... });
  it('handles API errors', async () => { ... });
  it('subscribes to socket events', () => { ... });
});
```

**Reference**: Test plan Section 4.1

---

### 9. useCardViewModel

#### 9.1 Implement useCardViewModel (Part 1 - Data & Quota)

- [ ] Create `features/card/viewmodels/useCardViewModel.ts`
- [ ] Implement card loading with embedded children
- [ ] Implement quota state (cardQuota, reactionQuota)
- [ ] Implement `checkCardQuota()` function
- [ ] Implement `checkReactionQuota()` function
- [ ] Store cards in cardStore on fetch

**Interface (Part 1):**
```typescript
interface UseCardViewModelResult {
  // State
  cards: CardWithRelationships[];
  cardsByColumn: Map<string, CardWithRelationships[]>;
  isLoading: boolean;
  error: string | null;

  // Quota
  cardQuota: CardQuota | null;
  reactionQuota: ReactionQuota | null;
  canCreateCard: boolean;
  canReact: boolean;

  // Quota actions
  checkCardQuota: () => Promise<void>;
  checkReactionQuota: () => Promise<void>;
  refetchCards: () => Promise<void>;
  // ... (continued in Part 2)
}
```

**Reference**: Section 5.2 of design doc

---

#### 9.2 Implement useCardViewModel (Part 2 - CRUD Operations)

- [ ] Implement `handleCreateCard(data)` with quota check
- [ ] Implement `handleUpdateCard(cardId, content)` function
- [ ] Implement `handleDeleteCard(cardId)` function
- [ ] Implement `handleMoveCard(cardId, columnId)` function
- [ ] Add optimistic updates with rollback on error

**Interface (Part 2):**
```typescript
interface UseCardViewModelResult {
  // ... (Part 1 state)

  // CRUD actions
  handleCreateCard: (data: CreateCardDTO) => Promise<void>;
  handleUpdateCard: (cardId: string, content: string) => Promise<void>;
  handleDeleteCard: (cardId: string) => Promise<void>;
  handleMoveCard: (cardId: string, columnId: string) => Promise<void>;

  // ... (continued in Part 3)
}
```

**Optimistic Update Pattern:**
```typescript
async function handleCreateCard(data: CreateCardDTO) {
  // 1. Check quota
  if (!canCreateCard) {
    throw new Error('Card limit reached');
  }

  // 2. Optimistic add (temporary ID)
  const tempCard = { ...data, id: 'temp-' + Date.now() };
  addCard(tempCard);

  try {
    // 3. API call
    const realCard = await cardAPI.createCard(boardId, data);
    // 4. Replace temp with real
    removeCard(tempCard.id);
    addCard(realCard);
  } catch (error) {
    // 5. Rollback on error
    removeCard(tempCard.id);
    throw error;
  }
}
```

**Reference**: Section 5.2

---

#### 9.3 Implement useCardViewModel (Part 3 - Relationships)

- [ ] Implement `handleLinkParentChild(parentId, childId)` function
- [ ] Implement `handleUnlinkChild(childId)` function
- [ ] Implement `handleLinkAction(actionId, feedbackId)` function
- [ ] Implement circular relationship validation
- [ ] Refresh cards after linking to get updated aggregation

**Interface (Part 3):**
```typescript
interface UseCardViewModelResult {
  // ... (Parts 1-2)

  // Relationship actions
  handleLinkParentChild: (parentId: string, childId: string) => Promise<void>;
  handleUnlinkChild: (childId: string) => Promise<void>;
  handleLinkAction: (actionId: string, feedbackId: string) => Promise<void>;

  // ... (continued in Part 4)
}
```

**Circular Relationship Detection:**
```typescript
function wouldCreateCycle(parentId: string, childId: string): boolean {
  // Check if childId is an ancestor of parentId
  let current = parentId;
  while (current) {
    if (current === childId) return true;
    const card = cards.get(current);
    current = card?.parent_card_id ?? null;
  }
  return false;
}
```

**Reference**: Section 5.2

---

#### 9.4 Implement useCardViewModel (Part 4 - Sorting & Filtering)

- [ ] Implement `applySortFilter(cards, sortMode, filters)` function
- [ ] Implement sort by recency (created_at desc)
- [ ] Implement sort by popularity (aggregated_reaction_count desc)
- [ ] Implement filter by user (created_by_hash)
- [ ] Implement filter by "All Users" (show all)
- [ ] Implement filter by "Anonymous" (is_anonymous)
- [ ] Implement multiple user filter (OR logic)

**Interface (Part 4):**
```typescript
type SortMode = 'recency' | 'popularity';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  showAll: boolean;
  showAnonymous: boolean;
  selectedUsers: string[]; // user hashes
}

interface UseCardViewModelResult {
  // ... (Parts 1-3)

  // Sorting & Filtering
  sortMode: SortMode;
  sortDirection: SortDirection;
  filters: FilterState;
  sortedFilteredCards: CardWithRelationships[];

  // Sort/Filter actions
  setSortMode: (mode: SortMode) => void;
  toggleSortDirection: () => void;
  toggleAllUsersFilter: () => void;
  toggleAnonymousFilter: () => void;
  toggleUserFilter: (userHash: string) => void;
}
```

**Sorting Logic:**
```typescript
function sortCards(cards: Card[], mode: SortMode, direction: SortDirection): Card[] {
  return [...cards].sort((a, b) => {
    const valueA = mode === 'recency'
      ? new Date(a.created_at).getTime()
      : a.aggregated_reaction_count;
    const valueB = mode === 'recency'
      ? new Date(b.created_at).getTime()
      : b.aggregated_reaction_count;

    return direction === 'desc' ? valueB - valueA : valueA - valueB;
  });
}
```

**Reference**: Section 5.2

---

#### 9.5 Write Tests for useCardViewModel

- [ ] Test fetches cards with embedded children
- [ ] Test quota check blocks creation when at limit
- [ ] Test create card success flow
- [ ] Test link parent-child updates aggregation
- [ ] Test unlink child decreases parent count
- [ ] Test delete card orphans children
- [ ] Test sorting by recency and popularity
- [ ] Test filtering logic (all users, anonymous, specific users)
- [ ] Test optimistic update rollback on error

**Reference**: Test plan Section 4.2

---

### 10. useParticipantViewModel

#### 10.1 Implement useParticipantViewModel Hook

- [ ] Create `features/participant/viewmodels/useParticipantViewModel.ts`
- [ ] Implement active users fetching
- [ ] Implement heartbeat timer (every 60 seconds)
- [ ] Implement `handleUpdateAlias(newAlias)` function
- [ ] Implement `handlePromoteToAdmin(userHash)` function (creator only)
- [ ] Implement filter state management (showAll, showAnonymous, filteredUsers)
- [ ] Implement `handleToggleAllUsersFilter()` function
- [ ] Implement `handleToggleAnonymousFilter()` function
- [ ] Implement `handleToggleUserFilter(userHash)` function
- [ ] Subscribe to 'user:joined' and 'user:alias_changed' events

**Interface:**
```typescript
interface UseParticipantViewModelResult {
  // State
  activeUsers: ActiveUser[];
  currentUser: UserSession | null;
  isLoading: boolean;

  // Filter state
  showAll: boolean;
  showAnonymous: boolean;
  selectedUsers: string[];

  // Actions
  handleUpdateAlias: (newAlias: string) => Promise<void>;
  handlePromoteToAdmin: (userHash: string) => Promise<void>;

  // Filter actions
  handleToggleAllUsersFilter: () => void;
  handleToggleAnonymousFilter: () => void;
  handleToggleUserFilter: (userHash: string) => void;
}
```

**Heartbeat Implementation:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    boardAPI.sendHeartbeat(boardId);
  }, 60000); // Every 60 seconds

  return () => clearInterval(interval);
}, [boardId]);
```

**Reference**: Section 5.3 of design doc

---

#### 10.2 Write Tests for useParticipantViewModel

- [ ] Test fetches active users on mount
- [ ] Test handleUpdateAlias calls API and updates store
- [ ] Test heartbeat sent every 60 seconds
- [ ] Test promote user to admin (creator only)
- [ ] Test filter toggle functions
- [ ] Test real-time event handling

**Reference**: Test plan Section 4.3

---

### 11. useDragDropViewModel

#### 11.1 Implement useDragDropViewModel Hook

- [ ] Create `features/card/viewmodels/useDragDropViewModel.ts`
- [ ] Implement drag state (isDragging, draggedItem)
- [ ] Implement `handleCardDragStart(cardId, cardType)` function
- [ ] Implement `handleCardDragOver(targetId, targetType)` validation
- [ ] Implement `handleCardDrop(sourceId, targetId, targetType)` function
- [ ] Implement circular relationship detection
- [ ] Implement card type validation (feedback-feedback, action-feedback)
- [ ] Implement `handleCardDragEnd()` cleanup

**Interface:**
```typescript
interface DragItem {
  id: string;
  type: 'feedback' | 'action';
}

interface UseDragDropViewModelResult {
  // State
  isDragging: boolean;
  draggedItem: DragItem | null;
  dropTarget: { id: string; type: 'card' | 'column' } | null;
  isValidDrop: boolean;

  // Actions
  handleDragStart: (cardId: string, cardType: CardType) => void;
  handleDragOver: (targetId: string, targetType: 'card' | 'column') => void;
  handleDrop: () => Promise<void>;
  handleDragEnd: () => void;

  // Validation
  canDropOn: (targetId: string, targetType: 'card' | 'column') => boolean;
}
```

**Drop Validation Rules:**

| Source Type | Target Type | Action | Allowed |
|-------------|-------------|--------|---------|
| feedback | feedback card | Create parent-child | ✅ (if no cycle) |
| action | feedback card | Link action to feedback | ✅ |
| feedback | column | Move to column | ✅ |
| action | column | Move to column | ✅ |
| feedback | action card | - | ❌ |
| action | action card | - | ❌ |

**Reference**: Section 5.4 of design doc

---

#### 11.2 Write Tests for useDragDropViewModel

- [ ] Test drag start sets dragged item
- [ ] Test drop validates card types
- [ ] Test prevents circular relationship
- [ ] Test drop on card vs column differentiation
- [ ] Test drag end clears state

**Reference**: Test plan Section 4.4

---

## 📁 Files to Create

```
src/features/
├── board/
│   └── viewmodels/
│       └── useBoardViewModel.ts
├── card/
│   └── viewmodels/
│       ├── useCardViewModel.ts
│       └── useDragDropViewModel.ts
└── participant/
    └── viewmodels/
        └── useParticipantViewModel.ts

tests/unit/features/
├── board/viewmodels/
│   └── useBoardViewModel.test.ts
├── card/viewmodels/
│   ├── useCardViewModel.test.ts
│   └── useDragDropViewModel.test.ts
└── participant/viewmodels/
    └── useParticipantViewModel.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| useBoardViewModel (unit) | ~8 | Load, derive, actions |
| useCardViewModel (unit) | ~15 | CRUD, quota, sort/filter |
| useParticipantViewModel (unit) | ~8 | Users, filters, heartbeat |
| useDragDropViewModel (unit) | ~6 | Drag, drop, validation |
| **Total** | **~37** | |

---

## ✅ Acceptance Criteria

- [ ] All ViewModels use stores for state management
- [ ] API calls wrapped with proper error handling
- [ ] Socket events update stores correctly
- [ ] Optimistic updates with rollback implemented
- [ ] Derived state computed efficiently (useMemo)
- [ ] Unit tests pass with >90% coverage

---

## 🧪 Related Test Plan

See [TEST_PHASE_02_VIEWMODEL_LAYER.md](../test-docs/TEST_PHASE_02_VIEWMODEL_LAYER.md) for:
- renderHook patterns for testing ViewModels
- Mock Model layer setup
- Business logic test examples
- Optimistic update and rollback testing

---

## 📝 Notes

- Use `@testing-library/react-hooks` for hook testing
- Consider extracting common patterns (loading/error) to base hook
- ViewModels should be the only layer calling APIs

---

[← Back to Master Task List](./FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 3](./FRONTEND_PHASE_03_MODEL_LAYER.md) | [Next: Phase 5 →](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md)
