# Test Phase 6: Real-time Tests (WebSocket)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~15 complete
**Coverage Target**: All socket events

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test WebSocket event handling, real-time synchronization between clients, and optimistic updates with rollback. These tests verify the real-time architecture works correctly.

---

## 📋 Test Suites

### 6.1 Socket Event Handling

**File**: `tests/integration/realtime-events.integration.test.ts`

**Pattern**: Multiple socket clients

```typescript
import { io, Socket } from 'socket.io-client'
import { vi, beforeAll, afterAll, describe, test, expect } from 'vitest'

describe('Real-time Event Synchronization', () => {
  let client1: Socket
  let client2: Socket

  beforeAll(async () => {
    client1 = io('http://localhost:4000')
    client2 = io('http://localhost:4000')

    await Promise.all([
      new Promise(resolve => client1.on('connect', resolve)),
      new Promise(resolve => client2.on('connect', resolve))
    ])

    // Both join same board
    client1.emit('join-board', { boardId: 'board-123' })
    client2.emit('join-board', { boardId: 'board-123' })
  })

  afterAll(() => {
    client1.disconnect()
    client2.disconnect()
  })

  test('card:created event syncs to other clients', async () => {
    const cardCreatedHandler = vi.fn()
    client2.on('card:created', cardCreatedHandler)

    // Client 1 creates card via HTTP
    await fetch('http://localhost:4000/v1/boards/board-123/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'New card',
        card_type: 'feedback',
        column_type: 'went_well'
      })
    })

    // Wait for WebSocket event
    await vi.waitFor(() => {
      expect(cardCreatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'New card'
        })
      )
    })
  })

  test('card:updated event syncs content changes', async () => {
    const cardUpdatedHandler = vi.fn()
    client2.on('card:updated', cardUpdatedHandler)

    await fetch('http://localhost:4000/v1/cards/card-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' })
    })

    await vi.waitFor(() => {
      expect(cardUpdatedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-123',
          content: 'Updated content'
        })
      )
    })
  })

  test('card:deleted event removes card from other clients', async () => {
    const cardDeletedHandler = vi.fn()
    client2.on('card:deleted', cardDeletedHandler)

    await fetch('http://localhost:4000/v1/cards/card-123', {
      method: 'DELETE'
    })

    await vi.waitFor(() => {
      expect(cardDeletedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-123'
        })
      )
    })
  })

  test('reaction:added event updates counts', async () => {
    const reactionAddedHandler = vi.fn()
    client2.on('reaction:added', reactionAddedHandler)

    await fetch('http://localhost:4000/v1/cards/card-123/reactions', {
      method: 'POST'
    })

    await vi.waitFor(() => {
      expect(reactionAddedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'card-123'
        })
      )
    })
  })

  test('user:joined event updates participant list', async () => {
    const userJoinedHandler = vi.fn()
    client1.on('user:joined', userJoinedHandler)

    // Client 3 joins
    const client3 = io('http://localhost:4000')
    await new Promise(resolve => client3.on('connect', resolve))
    client3.emit('join-board', { boardId: 'board-123', userAlias: 'Charlie' })

    await vi.waitFor(() => {
      expect(userJoinedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          userAlias: 'Charlie'
        })
      )
    })

    client3.disconnect()
  })

  test('board:closed event disables write operations', async () => {
    const boardClosedHandler = vi.fn()
    client2.on('board:closed', boardClosedHandler)

    await fetch('http://localhost:4000/v1/boards/board-123/close', {
      method: 'PATCH'
    })

    await vi.waitFor(() => {
      expect(boardClosedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: 'board-123'
        })
      )
    })
  })
})
```

---

### 6.2 Optimistic Updates with Rollback

**File**: `tests/integration/optimistic-updates.integration.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

describe('Optimistic Updates', () => {
  test('card appears immediately before API response', async () => {
    // Delay API response to observe optimistic state
    server.use(
      http.post('/v1/boards/:id/cards', async () => {
        await new Promise(r => setTimeout(r, 500))
        return HttpResponse.json({
          success: true,
          data: { id: 'real-card-123', content: 'New card' }
        }, { status: 201 })
      })
    )

    render(<RetroColumnWithViewModel boardId="board-123" />)

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))
    await userEvent.type(screen.getByLabelText(/content/i), 'New card')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    // Card appears immediately (optimistic)
    expect(screen.getByText('New card')).toBeInTheDocument()

    // Card still there after API completes
    await waitFor(() => {
      expect(screen.getByText('New card')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  test('rollback on API error', async () => {
    server.use(
      http.post('/v1/boards/:id/cards', () => {
        return HttpResponse.json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Server error' }
        }, { status: 500 })
      })
    )

    render(<RetroColumnWithViewModel boardId="board-123" />)

    const initialCards = screen.queryAllByTestId('retro-card').length

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))
    await userEvent.type(screen.getByLabelText(/content/i), 'Will fail')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    // Card appears optimistically
    await waitFor(() => {
      expect(screen.getByText('Will fail')).toBeInTheDocument()
    })

    // Then rolls back
    await waitFor(() => {
      expect(screen.queryByText('Will fail')).not.toBeInTheDocument()
    })

    // Error shown
    expect(screen.getByRole('alert')).toHaveTextContent(/failed/i)

    // Count unchanged
    expect(screen.queryAllByTestId('retro-card').length).toBe(initialCards)
  })

  test('reaction optimistic update and rollback', async () => {
    server.use(
      http.post('/v1/cards/:id/reactions', () => {
        return HttpResponse.json({
          success: false,
          error: { code: 'QUOTA_EXCEEDED' }
        }, { status: 429 })
      })
    )

    render(<RetroCard card={{ id: '1', direct_reaction_count: 5 }} />)

    expect(screen.getByTestId('reaction-count')).toHaveTextContent('5')

    await userEvent.click(screen.getByRole('button', { name: /react/i }))

    // Optimistic: count increases
    await waitFor(() => {
      expect(screen.getByTestId('reaction-count')).toHaveTextContent('6')
    })

    // Rollback: count reverts
    await waitFor(() => {
      expect(screen.getByTestId('reaction-count')).toHaveTextContent('5')
    })
  })
})
```

---

### 6.3 Store Updates from Socket Events

**File**: `tests/integration/store-socket-sync.integration.test.tsx`

```typescript
describe('Store Updates from Socket Events', () => {
  test('card:created event adds card to store', async () => {
    const { result } = renderHook(() => useCardStore())

    // Simulate socket event
    act(() => {
      socketService.simulateEvent('card:created', {
        boardId: 'board-123',
        card: {
          id: 'new-card',
          content: 'From socket',
          column_type: 'went_well'
        }
      })
    })

    expect(result.current.cards.get('new-card')).toBeDefined()
    expect(result.current.cards.get('new-card').content).toBe('From socket')
  })

  test('board:renamed event updates board name', async () => {
    const { result } = renderHook(() => useBoardStore())

    act(() => {
      result.current.setBoard({ id: 'board-123', name: 'Original' })
    })

    act(() => {
      socketService.simulateEvent('board:renamed', {
        boardId: 'board-123',
        name: 'Renamed Board'
      })
    })

    expect(result.current.board.name).toBe('Renamed Board')
  })

  test('user:alias_changed updates participant list', async () => {
    const { result } = renderHook(() => useParticipantStore())

    act(() => {
      result.current.setActiveUsers([
        { hash: 'user-1', alias: 'OldAlias' }
      ])
    })

    act(() => {
      socketService.simulateEvent('user:alias_changed', {
        boardId: 'board-123',
        userHash: 'user-1',
        newAlias: 'NewAlias'
      })
    })

    const user = result.current.activeUsers.find(u => u.hash === 'user-1')
    expect(user.alias).toBe('NewAlias')
  })
})
```

---

### 6.4 Connection State Handling

**File**: `tests/integration/socket-connection.integration.test.ts`

```typescript
describe('Socket Connection State', () => {
  test('reconnects and rejoins board after disconnect', async () => {
    const service = new SocketService()
    const reconnectHandler = vi.fn()

    service.on('reconnect', reconnectHandler)
    service.connect('board-123')

    // Simulate disconnect
    service.simulateDisconnect()

    // Wait for reconnect
    await vi.waitFor(() => {
      expect(reconnectHandler).toHaveBeenCalled()
    })

    // Verify rejoin
    expect(service.currentBoardId).toBe('board-123')
  })

  test('shows offline indicator on disconnect', async () => {
    render(<RetroBoardPage boardId="board-123" />)

    act(() => {
      socketService.simulateDisconnect()
    })

    expect(await screen.findByTestId('offline-indicator')).toBeVisible()

    act(() => {
      socketService.simulateReconnect()
    })

    expect(screen.queryByTestId('offline-indicator')).not.toBeVisible()
  })
})
```

---

## 📁 Files to Create

```
tests/integration/
├── realtime-events.integration.test.ts
├── optimistic-updates.integration.test.tsx
├── store-socket-sync.integration.test.tsx
└── socket-connection.integration.test.ts
```

---

## 🧪 Test Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Socket Events | ~6 | card:*, reaction:*, user:*, board:* |
| Optimistic Updates | ~4 | Immediate UI, rollback |
| Store Sync | ~4 | Socket → Store updates |
| Connection State | ~2 | Reconnect, offline indicator |
| **Total** | **~16** | |

---

## ✅ Acceptance Criteria

- [ ] All socket events tested
- [ ] Multi-client sync verified
- [ ] Optimistic updates work correctly
- [ ] Rollback on error implemented
- [ ] Connection state handled

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 5](./TEST_PHASE_05_E2E.md) | [Next: Phase 7 →](./TEST_PHASE_07_DRAGDROP.md)
