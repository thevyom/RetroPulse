# Test Phase 2: ViewModel Layer (Business Logic Tests)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~70 complete
**Coverage Target**: 90%+

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test all ViewModel hooks for correct business logic, state management, and API coordination. ViewModels should be tested using `renderHook` with mocked Model layer (API services and stores).

---

## 📋 Test Suites

### 2.1 useBoardViewModel Tests

**File**: `tests/unit/features/board/viewmodels/useBoardViewModel.test.ts`

**Pattern**: renderHook + Mock Model

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useBoardViewModel } from './useBoardViewModel'

vi.mock('../models/BoardAPI')
vi.mock('../models/boardStore')

describe('useBoardViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('loads board data on mount', async () => {
    const mockBoard = { id: '123', name: 'Sprint 42', state: 'active' }
    mockBoardAPI.getBoard.mockResolvedValue(mockBoard)

    const { result } = renderHook(() => useBoardViewModel('123'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.board).toBeNull()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.board).toEqual(mockBoard)
    expect(mockBoardAPI.getBoard).toHaveBeenCalledWith('123')
  })

  test('derives isAdmin from board.admins and currentUser', () => {
    const mockBoard = {
      id: '123',
      admins: ['hash1', 'hash2'],
      state: 'active'
    }
    mockBoardStore.getState.mockReturnValue({ board: mockBoard })
    mockUserStore.getState.mockReturnValue({
      currentUser: { cookie_hash: 'hash1' }
    })

    const { result } = renderHook(() => useBoardViewModel('123'))

    expect(result.current.isAdmin).toBe(true)
    expect(result.current.isCreator).toBe(true)
  })

  test('handleRenameBoard calls API and updates store', async () => {
    mockBoardAPI.updateBoardName.mockResolvedValue({
      id: '123',
      name: 'Updated Name'
    })

    const { result } = renderHook(() => useBoardViewModel('123'))

    await result.current.handleRenameBoard('Updated Name')

    expect(mockBoardAPI.updateBoardName).toHaveBeenCalledWith('123', 'Updated Name')
    expect(mockBoardStore.updateBoardName).toHaveBeenCalledWith('Updated Name')
  })

  test('handleCloseBoard sets closed state', async () => {
    const closedBoard = {
      id: '123',
      state: 'closed',
      closed_at: new Date()
    }
    mockBoardAPI.closeBoard.mockResolvedValue(closedBoard)

    const { result } = renderHook(() => useBoardViewModel('123'))

    await result.current.handleCloseBoard()

    expect(result.current.isClosed).toBe(true)
    expect(mockBoardStore.closeBoard).toHaveBeenCalled()
  })

  test('handles API error gracefully', async () => {
    const error = new Error('Network error')
    mockBoardAPI.getBoard.mockRejectedValue(error)

    const { result } = renderHook(() => useBoardViewModel('123'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toEqual(error)
    expect(result.current.board).toBeNull()
  })
})
```

**Test Cases** (~18 tests):
| # | Test Case | Mock Setup | Assertion |
|---|-----------|------------|-----------|
| 1 | Loads board on mount | API returns board | board state populated |
| 2 | Derives isAdmin correctly | User in admins array | isAdmin: true |
| 3 | Derives isCreator correctly | User is first admin | isCreator: true |
| 4 | handleRenameBoard success | API resolves | Store updated |
| 5 | handleCloseBoard success | API resolves | isClosed: true |
| 6 | API error handling | API rejects | error state set |
| 7 | Socket subscription on mount | - | Events registered |
| 8 | Socket cleanup on unmount | - | Events unregistered |
| 9 | handleRenameColumn success | API resolves | Column name updated |
| 10 | Column rename validation | Empty name | Error thrown, no API call |
| 11 | Concurrent rename handling | Two renames | Last write wins |

---

### 2.2 useCardViewModel Tests

**File**: `tests/unit/features/card/viewmodels/useCardViewModel.test.ts`

**Test Cases** (~28 tests):
| # | Test Case | Mock Setup | Assertion |
|---|-----------|------------|-----------|
| 1 | Fetch cards with children | API returns nested | cards state has children |
| 2 | Create card checks quota first | Quota can_create:false | API blocked, error shown |
| 3 | Create card success | API returns 201 | Card added to store |
| 4 | Link parent-child updates aggregation | API success | Parent count increases |
| 5 | Unlink child from parent | API success | Parent count decreases |
| 6 | Delete card orphans children | API success | Children parent_id null |
| 7 | Sorting by recency | Multiple cards | Sorted by created_at desc |
| 8 | Sorting by popularity | Cards with reactions | Sorted by count desc |
| 9 | Filter by user | User filter active | Only user's cards shown |
| 10 | Filter by All Users | Default filter | All cards visible |
| 11 | Optimistic update rollback | API error | Card removed from UI |
| 12 | Filter + Sort combined | User filter + popularity | Correct order & filter |
| 13 | Anonymous filter hides attributed children | Anonymous filter | Children hidden if attributed |
| 14 | Move card updates column index | API success | cardsByColumn updated |
| 15 | Action cards exempt from quota | card_type: action | No quota check |
| 16 | 1-level hierarchy client block | Drop child on parent's child | Error before API call |
| 17 | 1-level hierarchy backend fallback | API rejects 400 | Error shown to user |

**Example Tests**:
```typescript
test('checkCardQuota before create prevents API call if at limit', async () => {
  mockCardAPI.checkCardQuota.mockResolvedValue({
    current_count: 5,
    limit: 5,
    can_create: false
  })

  const { result } = renderHook(() => useCardViewModel('board-123'))

  await waitFor(() => expect(result.current.cardQuota).toBeDefined())

  await expect(
    result.current.handleCreateCard({
      content: 'New card',
      card_type: 'feedback'
    })
  ).rejects.toThrow('Card limit reached')

  expect(mockCardAPI.createCard).not.toHaveBeenCalled()
})

test('applySortFilter sorts by popularity correctly', () => {
  const cards = [
    { id: '1', aggregated_reaction_count: 3 },
    { id: '2', aggregated_reaction_count: 10 },
    { id: '3', aggregated_reaction_count: 5 }
  ]
  const sortMode = { type: 'popularity', direction: 'desc' }
  const filters = { showAll: true, showAnonymous: true, users: [] }

  const { result } = renderHook(() => useCardViewModel('board-123'))

  const sorted = result.current.applySortFilter(cards, sortMode, filters)

  expect(sorted.map(c => c.id)).toEqual(['2', '3', '1'])
})

test('optimistic update rollback on API error', async () => {
  mockCardAPI.createCard.mockRejectedValue(new Error('Network error'))

  const { result } = renderHook(() => useCardViewModel('board-123'))

  const initialCount = result.current.cards.length

  try {
    await result.current.handleCreateCard({ content: 'Test' })
  } catch {}

  // Card should be rolled back
  expect(result.current.cards.length).toBe(initialCount)
})
```

---

### 2.3 useParticipantViewModel Tests

**File**: `tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts`

**Test Cases** (~15 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | Fetch active users on mount | Active users populated |
| 2 | Filter inactive users | User not in active list |
| 3 | Update alias success | API called, store updated |
| 4 | Promote user to admin | Admin API called |
| 5 | Toggle All Users filter | Filter state updated |
| 6 | Toggle Anonymous filter | showAnonymous toggled |
| 7 | Toggle user-specific filter | User added to filters |
| 8 | Heartbeat sent periodically | API called every 60s |
| 9 | Stale user cleanup | User inactive > 2min | Removed from activeUsers |
| 10 | Multiple user filter OR logic | 2 users selected | Shows cards from either |
| 11 | Admin promotion updates board | API success | board.admins includes user |

**Example Test**:
```typescript
test('handleUpdateAlias calls API and updates store', async () => {
  mockBoardAPI.updateAlias.mockResolvedValue({
    alias: 'NewAlias123',
    last_active_at: new Date()
  })

  const { result } = renderHook(() => useParticipantViewModel('board-123'))

  await result.current.handleUpdateAlias('NewAlias123')

  expect(mockBoardAPI.updateAlias).toHaveBeenCalledWith('board-123', 'NewAlias123')
  expect(mockUserStore.updateAlias).toHaveBeenCalledWith('NewAlias123')
})

test('heartbeat sent every 60 seconds', async () => {
  vi.useFakeTimers()

  renderHook(() => useParticipantViewModel('board-123'))

  expect(mockBoardAPI.updateHeartbeat).not.toHaveBeenCalled()

  vi.advanceTimersByTime(60000)
  await waitFor(() => {
    expect(mockBoardAPI.updateHeartbeat).toHaveBeenCalledTimes(1)
  })

  vi.advanceTimersByTime(60000)
  await waitFor(() => {
    expect(mockBoardAPI.updateHeartbeat).toHaveBeenCalledTimes(2)
  })

  vi.useRealTimers()
})
```

---

### 2.4 useDragDropViewModel Tests

**File**: `tests/unit/features/card/viewmodels/useDragDropViewModel.test.ts`

**Test Cases** (~13 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | Drag start sets dragged item | isDragging: true, draggedItem set |
| 2 | Drop on card validates types | Validation passes |
| 3 | Drop action on feedback | handleLinkAction called |
| 4 | Circular relationship blocked | Drop prevented, error shown |
| 5 | Drop on column moves card | handleMoveCard called |
| 6 | Drag end clears state | isDragging: false, draggedItem: null |
| 7 | 1-level hierarchy enforcement | Child has parent | Cannot become parent |
| 8 | Action on action blocked | Both action type | Drop rejected |
| 9 | Action→feedback→action chain | Valid multi-link | All links created |

**Example Test**:
```typescript
test('prevents circular relationship when dropping', () => {
  const cardA = { id: 'A', parent_card_id: 'B' }
  const cardB = { id: 'B', parent_card_id: null }

  const { result } = renderHook(() => useDragDropViewModel())

  result.current.handleCardDragStart('B', 'feedback')

  const canDrop = result.current.handleCardDragOver('A', 'card')

  expect(canDrop).toBe(false)
  expect(result.current.dropError).toBe('Circular relationship detected')
})
```

---

## 📁 Files to Create

```
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

## ✅ Acceptance Criteria

- [ ] All ViewModel hooks have unit tests
- [ ] Model layer (APIs, stores) fully mocked
- [ ] Business logic transformations tested
- [ ] Error handling paths covered
- [ ] Optimistic updates and rollbacks tested
- [ ] Coverage >= 90%

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 1](./TEST_PHASE_01_VIEW_LAYER.md) | [Next: Phase 3 →](./TEST_PHASE_03_MODEL_LAYER.md)
