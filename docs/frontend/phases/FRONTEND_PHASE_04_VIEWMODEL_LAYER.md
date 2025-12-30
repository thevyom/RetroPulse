# Phase 4: ViewModel Layer (Business Logic Hooks)

**Status**: ✅ COMPLETE
**Priority**: High
**Tasks**: 10/10 complete
**Dependencies**: Phase 1-3 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the ViewModel layer following MVVM architecture. ViewModels are React hooks that encapsulate business logic, manage state, and coordinate between the View layer and Model layer. They handle data fetching, transformations, real-time event subscriptions, and user actions.

---

## 📋 Task Breakdown

### 8. useBoardViewModel

#### 8.1 Implement useBoardViewModel Hook

- [x] Create `features/board/viewmodels/useBoardViewModel.ts`
- [x] Implement board data loading on mount
- [x] Implement loading and error state management
- [x] Derive `isAdmin` from board.admins and currentUserHash
- [x] Derive `isCreator` from board.admins[0]
- [x] Derive `isClosed` from board.state
- [x] Implement `handleRenameBoard(newName)` function
- [x] Implement `handleCloseBoard()` function
- [x] Implement `handleRenameColumn(columnId, newName)` function
- [x] Subscribe to 'board:renamed' and 'board:closed' socket events
- [x] Clean up subscriptions on unmount

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
  handleRenameColumn: (columnId: string, newName: string) => Promise<void>;
  refetchBoard: () => Promise<void>;
}
```

**Reference**: Section 5.1 of design doc

---

#### 8.2 Write Tests for useBoardViewModel

- [x] Test loads board data on mount
- [x] Test derives isAdmin correctly
- [x] Test derives isCreator correctly
- [x] Test handleRenameBoard calls API and updates store
- [x] Test handleCloseBoard sets closed state
- [x] Test handleRenameColumn validation and API call
- [x] Test error handling
- [x] Test socket event handling
- [x] Test unmount cleanup

**Test File:** `tests/unit/features/board/viewmodels/useBoardViewModel.test.ts`

**Reference**: Test plan Section 4.1

---

### 9. useCardViewModel

#### 9.1 Implement useCardViewModel (Part 1 - Data & Quota)

- [x] Create `features/card/viewmodels/useCardViewModel.ts`
- [x] Implement card loading with embedded children
- [x] Implement quota state (cardQuota, reactionQuota)
- [x] Implement `checkCardQuota()` function
- [x] Implement `checkReactionQuota()` function
- [x] Store cards in cardStore on fetch

**Reference**: Section 5.2 of design doc

---

#### 9.2 Implement useCardViewModel (Part 2 - CRUD Operations)

- [x] Implement `handleCreateCard(data)` with quota check
- [x] Implement `handleUpdateCard(cardId, content)` function
- [x] Implement `handleDeleteCard(cardId)` function
- [x] Implement `handleMoveCard(cardId, columnId)` function
- [x] Add optimistic updates with rollback on error

**Reference**: Section 5.2

---

#### 9.3 Implement useCardViewModel (Part 3 - Relationships)

- [x] Implement `handleLinkParentChild(parentId, childId)` function
- [x] Implement `handleUnlinkChild(childId)` function
- [x] Implement `handleLinkActionToFeedback(actionId, feedbackId)` function
- [x] Implement circular relationship validation
- [x] Refresh cards after linking to get updated aggregation

**Reference**: Section 5.2

---

#### 9.4 Implement useCardViewModel (Part 4 - Sorting & Filtering)

- [x] Implement `sortCards(cards, sortMode, direction)` function
- [x] Implement `filterCards(cards, filters)` function
- [x] Implement sort by recency (created_at desc)
- [x] Implement sort by popularity (aggregated_reaction_count desc)
- [x] Implement filter by user (created_by_hash)
- [x] Implement filter by "All Users" (show all)
- [x] Implement filter by "Anonymous" (is_anonymous)
- [x] Implement multiple user filter (OR logic)

**Reference**: Section 5.2

---

#### 9.5 Write Tests for useCardViewModel

- [x] Test fetches cards with embedded children
- [x] Test quota check blocks creation when at limit
- [x] Test create card success flow
- [x] Test link parent-child updates aggregation
- [x] Test unlink child removes relationship
- [x] Test delete card with validation
- [x] Test sorting by recency and popularity
- [x] Test filtering logic (all users, anonymous, specific users)
- [x] Test optimistic update rollback on error
- [x] Test socket event handling

**Test File:** `tests/unit/features/card/viewmodels/useCardViewModel.test.ts`

**Reference**: Test plan Section 4.2

---

### 10. useParticipantViewModel

#### 10.1 Implement useParticipantViewModel Hook

- [x] Create `features/participant/viewmodels/useParticipantViewModel.ts`
- [x] Implement active users fetching
- [x] Implement heartbeat timer (every 60 seconds)
- [x] Implement `handleUpdateAlias(newAlias)` function
- [x] Implement `handlePromoteToAdmin(userHash)` function (creator only)
- [x] Implement filter state management (showAll, showAnonymous, selectedUsers)
- [x] Implement `handleToggleAllUsersFilter()` function
- [x] Implement `handleToggleAnonymousFilter()` function
- [x] Implement `handleToggleUserFilter(alias)` function
- [x] Subscribe to 'user:joined', 'user:left', and 'user:alias_changed' events
- [x] Use ref pattern for heartbeat to avoid interval restart

**Reference**: Section 5.3 of design doc

---

#### 10.2 Write Tests for useParticipantViewModel

- [x] Test fetches active users on mount
- [x] Test handleUpdateAlias calls API and updates store
- [x] Test heartbeat sent every 60 seconds
- [x] Test promote user to admin (creator only)
- [x] Test non-creator cannot promote
- [x] Test filter toggle functions
- [x] Test real-time event handling
- [x] Test cleanup on unmount

**Test File:** `tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts`

**Reference**: Test plan Section 4.3

---

### 11. useDragDropViewModel

#### 11.1 Implement useDragDropViewModel Hook

- [x] Create `features/card/viewmodels/useDragDropViewModel.ts`
- [x] Implement drag state (isDragging, draggedItem)
- [x] Implement `handleDragStart(cardId, cardType)` function
- [x] Implement `handleDragOver(targetId, targetType)` validation
- [x] Implement `handleDragEnd()` cleanup
- [x] Implement `getDropResult()` function
- [x] Implement `canDropOn(targetId, targetType)` validation
- [x] Implement circular relationship detection (using shared utility)
- [x] Implement card type validation (feedback-feedback, action-feedback)

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

- [x] Test drag start sets dragged item
- [x] Test drop validates card types
- [x] Test prevents circular relationship
- [x] Test prevents card dropping on itself
- [x] Test prevents card with parent from being linked
- [x] Test prevents linking to child card
- [x] Test drop on column vs card differentiation
- [x] Test getDropResult returns correct action type
- [x] Test drag end clears state

**Test File:** `tests/unit/features/card/viewmodels/useDragDropViewModel.test.ts`

**Reference**: Test plan Section 4.4

---

## 📁 Files Created

```
src/features/
├── board/
│   └── viewmodels/
│       ├── useBoardViewModel.ts
│       └── index.ts
├── card/
│   └── viewmodels/
│       ├── useCardViewModel.ts
│       ├── useDragDropViewModel.ts
│       └── index.ts
├── participant/
│   └── viewmodels/
│       ├── useParticipantViewModel.ts
│       └── index.ts
└── index.ts

src/shared/utils/
├── cardRelationships.ts
└── index.ts

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

## 🧪 Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| useBoardViewModel (unit) | 40+ | ✅ Pass |
| useCardViewModel (unit) | 60+ | ✅ Pass |
| useParticipantViewModel (unit) | 35+ | ✅ Pass |
| useDragDropViewModel (unit) | 25+ | ✅ Pass |
| **Total** | **471** | **✅ All Pass** |

---

## ✅ Acceptance Criteria

- [x] All ViewModels use stores for state management
- [x] API calls wrapped with proper error handling
- [x] Socket events update stores correctly
- [x] Optimistic updates with rollback implemented
- [x] Derived state computed efficiently (useMemo)
- [x] Unit tests pass with 471 tests
- [x] Input validation using shared validation utilities
- [x] Shared utility functions extracted to avoid duplication

---

## 📝 Code Review Notes

See [CR_PHASE_04_ViewModelLayer.md](../code-review/CR_PHASE_04_ViewModelLayer.md) for:
- Issues identified and fixed
- Architectural decisions
- Performance considerations

See [TEST_PHASE_04_ViewModelLayer.md](../code-review/TEST_PHASE_04_ViewModelLayer.md) for:
- Test patterns used
- Coverage analysis
- Test configuration

---

## 🔧 Code Review Fixes Applied

1. **Stale Closure Fix** - Used `useUserStore.getState()` for fresh state in socket handlers
2. **Heartbeat Interval Fix** - Used ref pattern to avoid interval restart on alias change
3. **Shared Utilities** - Extracted `wouldCreateCycle` and `hasParent` to shared utils
4. **Removed Duplicate Code** - Both useCardViewModel and useDragDropViewModel now use shared utilities

---

[← Back to Master Task List](./FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 3](./FRONTEND_PHASE_03_MODEL_LAYER.md) | [Next: Phase 5 →](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md)
