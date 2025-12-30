# Test Phase 3: Model Layer (API & State Tests)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~35 complete
**Coverage Target**: 85%+

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test the Model layer: API services for HTTP request/response handling, Zustand stores for state mutations, and WebSocket service for event processing. Mock axios and socket.io-client at this level.

---

## 📋 Test Suites

### 3.1 BoardAPI Service Tests

**File**: `tests/unit/features/board/models/BoardAPI.test.ts`

**Pattern**: Mock axios

```typescript
import axios from 'axios'
import { vi } from 'vitest'
import { BoardAPI } from './BoardAPI'

vi.mock('axios')

describe('BoardAPI', () => {
  const api = new BoardAPI()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('getBoard makes GET request with correct URL', async () => {
    const mockBoard = { id: '123', name: 'Sprint 42' }
    axios.get.mockResolvedValue({ data: { success: true, data: mockBoard } })

    const result = await api.getBoard('123')

    expect(axios.get).toHaveBeenCalledWith('/v1/boards/123')
    expect(result).toEqual(mockBoard)
  })

  test('createBoard makes POST request with correct payload', async () => {
    const newBoard = { name: 'New Board' }
    axios.post.mockResolvedValue({
      data: { success: true, data: { id: 'new-123', ...newBoard } }
    })

    const result = await api.createBoard(newBoard)

    expect(axios.post).toHaveBeenCalledWith('/v1/boards', newBoard)
    expect(result.id).toBe('new-123')
  })

  test('updateBoardName makes PATCH request', async () => {
    axios.patch.mockResolvedValue({
      data: { success: true, data: { id: '123', name: 'New Name' } }
    })

    await api.updateBoardName('123', 'New Name')

    expect(axios.patch).toHaveBeenCalledWith(
      '/v1/boards/123/name',
      { name: 'New Name' }
    )
  })

  test('handles API error responses', async () => {
    axios.get.mockRejectedValue({
      response: {
        status: 404,
        data: { error: { code: 'BOARD_NOT_FOUND' } }
      }
    })

    await expect(api.getBoard('invalid')).rejects.toThrow('Board not found')
  })

  test('handles network errors', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'))

    await expect(api.getBoard('123')).rejects.toThrow('Network Error')
  })
})
```

**Test Cases** (~11 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | getBoard correct URL | GET /v1/boards/:id |
| 2 | createBoard correct payload | POST with body |
| 3 | updateBoardName PATCH | PATCH /v1/boards/:id/name |
| 4 | closeBoard request | PATCH with closed state |
| 5 | 404 error handling | Throws Board not found |
| 6 | 500 error handling | Throws server error |
| 7 | Network error handling | Throws network error |
| 8 | Response data extraction | Unwraps data.data |
| 9 | renameColumn PATCH | PATCH /v1/boards/:id/columns/:columnId |
| 10 | joinBoard without alias | POST → backend generates alias |
| 11 | getBoard returns embedded columns | columns array in response |

---

### 3.2 CardAPI Service Tests

**File**: `tests/unit/features/card/models/CardAPI.test.ts`

**Test Cases** (~11 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | getCards with relationships | include_relationships=true |
| 2 | createCard payload | POST with content, type |
| 3 | updateCard PATCH | Correct URL and body |
| 4 | deleteCard DELETE | DELETE /cards/:id |
| 5 | linkParentChild POST | Correct relationship payload |
| 6 | checkCardQuota GET | Returns quota object |
| 7 | Error code mapping | Maps backend codes |
| 8 | unlinkChild DELETE | DELETE /cards/:id/link |
| 9 | linkActionFeedback POST | type: 'action_feedback' in payload |
| 10 | Error 409 BOARD_CLOSED | Mapped to BoardClosedError |

---

### 3.3 Zustand Store Tests

**File**: `tests/unit/features/card/models/cardStore.test.ts`

**Pattern**: Direct store testing

```typescript
import { cardStore } from './cardStore'

describe('cardStore', () => {
  beforeEach(() => {
    cardStore.setState({ cards: new Map(), cardsByBoard: new Map() })
  })

  test('addCard adds card to store', () => {
    const card = { id: '1', board_id: 'board-1', content: 'Test' }

    cardStore.getState().addCard(card)

    expect(cardStore.getState().cards.get('1')).toEqual(card)
    expect(cardStore.getState().cardsByBoard.get('board-1')).toContain('1')
  })

  test('removeCard removes from store', () => {
    const card = { id: '1', board_id: 'board-1', content: 'Test' }
    cardStore.getState().addCard(card)

    cardStore.getState().removeCard('1')

    expect(cardStore.getState().cards.get('1')).toBeUndefined()
  })

  test('setCardsWithChildren populates embedded children', () => {
    const cards = [
      {
        id: 'parent',
        children: [
          { id: 'child1', content: 'Child 1' },
          { id: 'child2', content: 'Child 2' }
        ]
      }
    ]

    cardStore.getState().setCardsWithChildren(cards)

    const parent = cardStore.getState().cards.get('parent')
    expect(parent.children).toHaveLength(2)
  })

  test('incrementReactionCount updates count', () => {
    cardStore.getState().addCard({
      id: '1',
      direct_reaction_count: 5
    })

    cardStore.getState().incrementReactionCount('1')

    expect(cardStore.getState().cards.get('1').direct_reaction_count).toBe(6)
  })

  test('updateCard merges properties', () => {
    cardStore.getState().addCard({
      id: '1',
      content: 'Original',
      column_type: 'went_well'
    })

    cardStore.getState().updateCard('1', { content: 'Updated' })

    const card = cardStore.getState().cards.get('1')
    expect(card.content).toBe('Updated')
    expect(card.column_type).toBe('went_well')
  })
})
```

**Test Cases per Store** (~12 tests each):
| Store | Key Tests |
|-------|-----------|
| boardStore | setBoard, updateName, closeBoard, clearBoard, updateColumn |
| cardStore | addCard, removeCard, setCardsWithChildren, incrementReaction, selectorByColumn, selectorParentsWithAggregated, updateCardPreserveChildren |
| userStore | setCurrentUser, updateAlias, clearUser |

**Additional Store Tests**:
```typescript
test('selector for cards filtered by column', () => {
  cardStore.getState().addCard({ id: '1', column_type: 'went_well' })
  cardStore.getState().addCard({ id: '2', column_type: 'to_improve' })

  const wentWellCards = cardStore.getState().selectByColumn('went_well')
  expect(wentWellCards).toHaveLength(1)
  expect(wentWellCards[0].id).toBe('1')
})

test('selector for parent cards with aggregated counts', () => {
  const parent = { id: 'p1', direct_reaction_count: 3, children: [
    { id: 'c1', direct_reaction_count: 2 }
  ]}
  cardStore.getState().setCardsWithChildren([parent])

  const parents = cardStore.getState().selectParentsWithAggregated()
  expect(parents[0].aggregated_reaction_count).toBe(5)
})

test('updateCard preserves children array', () => {
  const card = { id: '1', content: 'Original', children: [{ id: 'c1' }] }
  cardStore.getState().addCard(card)

  cardStore.getState().updateCard('1', { content: 'Updated' })

  const updated = cardStore.getState().cards.get('1')
  expect(updated.content).toBe('Updated')
  expect(updated.children).toHaveLength(1)
})
```

---

### 3.4 SocketService Tests

**File**: `tests/unit/shared/services/SocketService.test.ts`

**Pattern**: Mock socket.io-client

```typescript
import { vi } from 'vitest'
import { SocketService } from './SocketService'
import { io } from 'socket.io-client'

vi.mock('socket.io-client')

describe('SocketService', () => {
  let mockSocket

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn()
    }
    io.mockReturnValue(mockSocket)
  })

  test('connect establishes socket connection', () => {
    const service = new SocketService()
    service.connect('board-123')

    expect(io).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    expect(mockSocket.emit).toHaveBeenCalledWith('join-board', {
      boardId: 'board-123'
    })
  })

  test('subscribes to events with handler', () => {
    const service = new SocketService()
    const handler = vi.fn()

    service.on('card:created', handler)

    expect(mockSocket.on).toHaveBeenCalledWith('card:created', handler)
  })

  test('unsubscribes from events', () => {
    const service = new SocketService()
    const handler = vi.fn()

    service.off('card:created', handler)

    expect(mockSocket.off).toHaveBeenCalledWith('card:created', handler)
  })

  test('disconnect removes listeners and closes socket', () => {
    const service = new SocketService()
    service.connect('board-123')

    service.disconnect()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  test('emit sends event to server', () => {
    const service = new SocketService()
    service.connect('board-123')

    service.emit('heartbeat', {})

    expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat', {})
  })
})
```

**Test Cases** (~11 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | Connect establishes connection | io() called |
| 2 | Join board on connect | join-board emitted |
| 3 | Subscribe to events | on() registered |
| 4 | Unsubscribe from events | off() called |
| 5 | Disconnect closes socket | disconnect() called |
| 6 | Emit sends events | emit() called |
| 7 | Reconnection config | Options set correctly |
| 8 | Exponential backoff | 1s, 2s, 4s, max 30s |
| 9 | Heartbeat interval | Emitted every 60s |
| 10 | Event queue during disconnect | Events queued, replayed on connect |

---

## 📁 Files to Create

```
tests/unit/
├── features/
│   ├── board/models/
│   │   ├── BoardAPI.test.ts
│   │   └── boardStore.test.ts
│   ├── card/models/
│   │   ├── CardAPI.test.ts
│   │   └── cardStore.test.ts
│   └── user/models/
│       └── userStore.test.ts
└── shared/services/
    └── SocketService.test.ts
```

---

## ✅ Acceptance Criteria

- [ ] All API services have unit tests
- [ ] All Zustand stores have unit tests
- [ ] SocketService has unit tests
- [ ] HTTP methods and URLs verified
- [ ] Error handling tested
- [ ] Coverage >= 85%

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 2](./TEST_PHASE_02_VIEWMODEL_LAYER.md) | [Next: Phase 4 →](./TEST_PHASE_04_INTEGRATION.md)
