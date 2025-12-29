# Test Phase 4: Integration Tests

**Status**: 🔲 NOT STARTED
**Tests**: 0/~30 complete
**Coverage Target**: Critical paths

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test full user flows using MSW (Mock Service Worker) to mock API responses while using real ViewModels and stores. This validates that layers work together correctly.

---

## 📋 Test Suites

### 4.1 MSW Setup

**File**: `tests/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Board endpoints
  http.post('/v1/boards', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: {
        id: 'board-123',
        name: body.name,
        columns: ['Went Well', 'To Improve', 'Action Items'],
        state: 'active',
        admins: ['user-hash-1'],
        created_at: new Date().toISOString(),
      }
    }, { status: 201 })
  }),

  http.get('/v1/boards/:boardId', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.boardId,
        name: 'Test Retrospective',
        columns: ['Went Well', 'To Improve', 'Action Items'],
        state: 'active',
        admins: ['user-hash-1'],
      }
    })
  }),

  // Card endpoints
  http.get('/v1/boards/:boardId/cards', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'card-1', content: 'Test card 1', column_type: 'went_well' },
        { id: 'card-2', content: 'Test card 2', column_type: 'to_improve' },
      ]
    })
  }),

  http.post('/v1/boards/:boardId/cards', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-card-' + Date.now(),
        ...body,
        created_at: new Date().toISOString(),
      }
    }, { status: 201 })
  }),

  // Quota endpoints
  http.get('/v1/boards/:boardId/users/me/quota/card', () => {
    return HttpResponse.json({
      success: true,
      data: { used: 1, limit: 5, can_create: true }
    })
  }),

  http.get('/v1/boards/:boardId/users/me/quota/reaction', () => {
    return HttpResponse.json({
      success: true,
      data: { used: 3, limit: 10, can_react: true }
    })
  }),

  // Reaction endpoints
  http.post('/v1/cards/:cardId/reactions', () => {
    return HttpResponse.json({
      success: true,
      data: { card_id: 'card-1', reaction_count: 6 }
    }, { status: 201 })
  }),
]
```

**File**: `tests/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

---

### 4.2 Card Creation Flow Integration

**File**: `tests/integration/cardCreation.integration.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'
import { RetroColumn } from '@/features/card/components/RetroColumn'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Integration: Card Creation Flow', () => {
  test('creates card with quota check - success flow', async () => {
    render(<RetroColumnWithViewModel boardId="board-123" columnId="col-1" />)

    // Click + button
    const addBtn = await screen.findByRole('button', { name: /add card/i })
    await userEvent.click(addBtn)

    // Dialog opens (quota check passed)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    // Fill form
    const input = screen.getByLabelText(/card content/i)
    await userEvent.type(input, 'New feedback card')

    const submitBtn = screen.getByRole('button', { name: /create/i })
    await userEvent.click(submitBtn)

    // Wait for card to appear
    await waitFor(() => {
      expect(screen.getByText('New feedback card')).toBeInTheDocument()
    })
  })

  test('creates card - quota exceeded shows error', async () => {
    // Override quota handler for this test
    server.use(
      http.get('/v1/boards/:boardId/users/me/quota/card', () => {
        return HttpResponse.json({
          success: true,
          data: { used: 5, limit: 5, can_create: false }
        })
      })
    )

    render(<RetroColumnWithViewModel boardId="board-123" columnId="col-1" />)

    const addBtn = await screen.findByRole('button', { name: /add card/i })

    // Button should be disabled
    expect(addBtn).toBeDisabled()

    // Hover shows tooltip
    await userEvent.hover(addBtn)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/limit reached/i)
  })

  test('creates anonymous card', async () => {
    render(<RetroColumnWithViewModel boardId="board-123" columnId="col-1" />)

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))

    await userEvent.type(screen.getByLabelText(/content/i), 'Anonymous feedback')
    await userEvent.click(screen.getByLabelText(/post anonymously/i))
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      const card = screen.getByText('Anonymous feedback')
      // No author shown
      expect(card.closest('[data-testid="retro-card"]'))
        .not.toHaveTextContent(/created by/i)
    })
  })
})
```

---

### 4.3 Parent-Child Linking Integration

**File**: `tests/integration/parentChildLinking.integration.test.tsx`

```typescript
describe('Integration: Parent-Child Linking', () => {
  test('link child to parent updates aggregation', async () => {
    server.use(
      http.get('/v1/boards/:id/cards', () => {
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 'parent-1',
              content: 'Parent',
              direct_reaction_count: 5,
              aggregated_reaction_count: 5,
              children: []
            },
            {
              id: 'child-1',
              content: 'Child',
              direct_reaction_count: 3,
              children: []
            }
          ]
        })
      }),
      http.post('/v1/cards/:id/link', () => {
        return HttpResponse.json({
          success: true,
          data: { parent_card_id: 'parent-1', child_card_id: 'child-1' }
        }, { status: 201 })
      })
    )

    render(<RetroBoardPageWithRealHooks boardId="board-123" />)

    await screen.findByText('Parent')
    await screen.findByText('Child')

    // Simulate drag and drop
    const childCard = screen.getByText('Child').closest('[draggable]')
    const parentCard = screen.getByText('Parent')

    await userEvent.dragAndDrop(childCard, parentCard)

    // Parent shows aggregated count (5 + 3 = 8)
    await waitFor(() => {
      const parentBadge = within(parentCard).getByLabelText(/reactions/i)
      expect(parentBadge).toHaveTextContent('8')
    })
  })

  test('unlink child from parent decreases aggregation', async () => {
    // Test that clicking link icon on child calls unlink API
    // and parent aggregation decreases
  })

  test('circular relationship prevented', async () => {
    // A is parent of B, trying to make B parent of A should fail
  })
})
```

---

### 4.4 Reaction Flow Integration

**File**: `tests/integration/reactionFlow.integration.test.tsx`

```typescript
describe('Integration: Reaction Flow', () => {
  test('add reaction updates count', async () => {
    render(<RetroCard card={mockCard} {...props} />)

    const reactionBtn = screen.getByRole('button', { name: /react/i })
    expect(screen.getByTestId('reaction-count')).toHaveTextContent('5')

    await userEvent.click(reactionBtn)

    await waitFor(() => {
      expect(screen.getByTestId('reaction-count')).toHaveTextContent('6')
    })
  })

  test('reaction quota exceeded shows error', async () => {
    server.use(
      http.get('/v1/boards/:boardId/users/me/quota/reaction', () => {
        return HttpResponse.json({
          success: true,
          data: { used: 10, limit: 10, can_react: false }
        })
      })
    )

    render(<RetroCard card={mockCard} {...props} />)

    const reactionBtn = screen.getByRole('button', { name: /react/i })
    await userEvent.click(reactionBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent(/reaction limit/i)
  })

  test('toggle reaction off decreases count', async () => {
    // User has already reacted, clicking again removes reaction
  })
})
```

---

### 4.5 Board Operations Integration

**File**: `tests/integration/boardOperations.integration.test.tsx`

```typescript
describe('Integration: Board Operations', () => {
  test('rename board updates header', async () => {
    render(<RetroBoardPage boardId="board-123" />)

    await screen.findByRole('heading', { name: 'Test Retrospective' })

    // Admin clicks edit
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))

    const input = screen.getByLabelText(/board name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Sprint 43 Retro')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading')).toHaveTextContent('Sprint 43 Retro')
    })
  })

  test('close board disables write operations', async () => {
    render(<RetroBoardPage boardId="board-123" />)

    await screen.findByRole('heading')

    // Close board
    await userEvent.click(screen.getByRole('button', { name: /close board/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      // Lock icon visible
      expect(screen.getByTestId('lock-icon')).toBeVisible()

      // Add buttons disabled
      const addButtons = screen.getAllByRole('button', { name: /add card/i })
      addButtons.forEach(btn => expect(btn).toBeDisabled())
    })
  })

  test('update alias shows in participant bar', async () => {
    render(<RetroBoardPage boardId="board-123" />)

    // Open alias edit
    await userEvent.click(screen.getByRole('button', { name: /edit alias/i }))

    const input = screen.getByLabelText(/alias/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'NewAlias123')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByTestId('my-user-card')).toHaveTextContent('NewAlias123')
    })
  })
})
```

---

## 📁 Files to Create

```
tests/
├── mocks/
│   ├── handlers.ts
│   └── server.ts
└── integration/
    ├── cardCreation.integration.test.tsx
    ├── parentChildLinking.integration.test.tsx
    ├── reactionFlow.integration.test.tsx
    └── boardOperations.integration.test.tsx
```

---

## 🧪 Test Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Card Creation | ~8 | Quota, create, anonymous |
| Parent-Child Linking | ~5 | Link, unlink, aggregation |
| Reaction Flow | ~5 | Add, remove, quota |
| Board Operations | ~6 | Rename, close, alias |
| **Total** | **~24** | |

---

## ✅ Acceptance Criteria

- [ ] MSW handlers cover all API endpoints
- [ ] Real ViewModels used (not mocked)
- [ ] Stores properly hydrated
- [ ] User flows work end-to-end
- [ ] Error scenarios tested with overridden handlers

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 3](./TEST_PHASE_03_MODEL_LAYER.md) | [Next: Phase 5 →](./TEST_PHASE_05_E2E.md)
