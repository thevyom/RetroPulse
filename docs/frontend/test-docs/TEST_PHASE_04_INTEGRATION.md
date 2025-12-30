# Test Phase 4: Integration Tests

**Status**: 🔲 NOT STARTED
**Tests**: 0/~40 complete
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

  test('creates card in action column (card_type: action)', async () => {
    render(<RetroColumnWithViewModel boardId="board-123" columnId="action-item" />)

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))
    await userEvent.type(screen.getByLabelText(/content/i), 'Action item task')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      const card = screen.getByText('Action item task')
      expect(card.closest('[data-testid="retro-card"]'))
        .toHaveAttribute('data-card-type', 'action')
    })
  })

  test('shows error for empty content', async () => {
    render(<RetroColumnWithViewModel boardId="board-123" columnId="col-1" />)

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByText(/content is required/i)).toBeInTheDocument()
  })

  test('shows error for content exceeding 5000 chars', async () => {
    render(<RetroColumnWithViewModel boardId="board-123" columnId="col-1" />)

    await userEvent.click(screen.getByRole('button', { name: /add card/i }))
    await userEvent.type(screen.getByLabelText(/content/i), 'x'.repeat(5001))
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByText(/5000 characters or less/i)).toBeInTheDocument()
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
    server.use(
      http.delete('/v1/cards/:id/link', () => {
        return HttpResponse.json({ success: true }, { status: 200 })
      })
    )

    render(<RetroBoardPageWithRealHooks boardId="board-123" />)

    const childCard = await screen.findByText('Child')
    const linkIcon = within(childCard.closest('[data-testid="retro-card"]'))
      .getByLabelText(/unlink/i)

    await userEvent.click(linkIcon)

    // Parent aggregation should decrease
    await waitFor(() => {
      const parentCard = screen.getByText('Parent').closest('[data-testid="retro-card"]')
      expect(within(parentCard).getByLabelText(/reactions/i)).toHaveTextContent('5')
    })
  })

  test('circular relationship prevented', async () => {
    // A is parent of B, trying to make B parent of A should fail
    const childCard = screen.getByText('Child').closest('[draggable]')
    const parentCard = screen.getByText('Parent')

    // Try to drag parent onto child (reverse the relationship)
    await userEvent.dragAndDrop(
      parentCard.closest('[draggable]'),
      childCard
    )

    // Error message shown
    expect(await screen.findByRole('alert')).toHaveTextContent(/circular relationship/i)
  })

  test('1-level hierarchy enforced: child cannot have children', async () => {
    // Child card already has parent, cannot accept drop
    const standalone = screen.getByText('Standalone').closest('[draggable]')
    const child = screen.getByText('Child')

    await userEvent.dragAndDrop(standalone, child)

    expect(await screen.findByRole('alert'))
      .toHaveTextContent(/only 1 level/i)
  })

  test('cross-column parent-child relationship works', async () => {
    server.use(
      http.get('/v1/boards/:id/cards', () => {
        return HttpResponse.json({
          success: true,
          data: [
            { id: 'p1', content: 'Parent', column_type: 'went_well', children: [] },
            { id: 'c1', content: 'Child', column_type: 'to_improve', children: [] }
          ]
        })
      })
    )

    render(<RetroBoardPageWithRealHooks boardId="board-123" />)

    const child = await screen.findByText('Child')
    const parent = screen.getByText('Parent')

    await userEvent.dragAndDrop(
      child.closest('[draggable]'),
      parent
    )

    // Child now shows link icon even though in different column
    await waitFor(() => {
      expect(within(child.closest('[data-testid="retro-card"]'))
        .getByLabelText(/unlink/i)).toBeInTheDocument()
    })
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
    // User has already reacted
    const mockCard = {
      id: 'card-1',
      direct_reaction_count: 5,
      user_has_reacted: true
    }

    render(<RetroCard card={mockCard} {...props} />)

    await userEvent.click(screen.getByRole('button', { name: /react/i }))

    await waitFor(() => {
      expect(screen.getByTestId('reaction-count')).toHaveTextContent('4')
    })
  })

  test('view who reacted shows alias list on hover', async () => {
    server.use(
      http.get('/v1/cards/:id/reactions', () => {
        return HttpResponse.json({
          success: true,
          data: [
            { user_alias: 'Alice' },
            { user_alias: 'Bob' }
          ]
        })
      })
    )

    const mockCard = { id: 'card-1', direct_reaction_count: 2 }
    render(<RetroCard card={mockCard} {...props} />)

    await userEvent.hover(screen.getByTestId('reaction-count'))

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Alice')
      expect(screen.getByRole('tooltip')).toHaveTextContent('Bob')
    })
  })

  test('reaction on child updates parent aggregated count', async () => {
    const parentCard = {
      id: 'parent-1',
      direct_reaction_count: 3,
      aggregated_reaction_count: 5,
      children: [
        { id: 'child-1', direct_reaction_count: 2 }
      ]
    }

    render(<RetroCard card={parentCard} {...props} />)

    // React to child
    const childCard = screen.getByText('child content').closest('[data-testid="retro-card"]')
    await userEvent.click(within(childCard).getByRole('button', { name: /react/i }))

    // Parent aggregated count should increase
    await waitFor(() => {
      expect(screen.getByTestId('parent-aggregated-count')).toHaveTextContent('6')
    })
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

  test('column rename updates header and persists', async () => {
    server.use(
      http.patch('/v1/boards/:id/columns/:columnId', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({
          success: true,
          data: { id: 'col-1', name: body.name }
        })
      })
    )

    render(<RetroBoardPage boardId="board-123" />)

    // Find column header and click edit
    const columnHeader = await screen.findByText('What Went Well')
    await userEvent.click(within(columnHeader.closest('[data-testid="column-header"]'))
      .getByRole('button', { name: /edit/i }))

    const input = screen.getByLabelText(/column name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Successes')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('Successes')).toBeInTheDocument()
      expect(screen.queryByText('What Went Well')).not.toBeInTheDocument()
    })
  })

  test('admin designation from dropdown works', async () => {
    server.use(
      http.post('/v1/boards/:id/admins', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({
          success: true,
          data: { admins: ['creator-hash', body.user_hash] }
        })
      })
    )

    render(<RetroBoardPage boardId="board-123" />)

    // Open admin dropdown
    await userEvent.click(screen.getByRole('button', { name: /promote to admin/i }))

    // Select user
    await userEvent.click(screen.getByText('Bob'))

    // Bob should now have admin badge
    await waitFor(() => {
      const bobAvatar = screen.getByLabelText('Bob')
      expect(bobAvatar).toHaveAttribute('data-is-admin', 'true')
    })
  })

  test('co-admin can close board', async () => {
    // Setup: current user is co-admin (not creator)
    server.use(
      http.get('/v1/boards/:id', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'board-123',
            name: 'Test Board',
            state: 'active',
            admins: ['creator-hash', 'current-user-hash']
          }
        })
      })
    )

    render(<RetroBoardPage boardId="board-123" />)

    // Close button should be visible for co-admin
    const closeBtn = await screen.findByRole('button', { name: /close board/i })
    expect(closeBtn).toBeEnabled()

    await userEvent.click(closeBtn)
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getByTestId('lock-icon')).toBeVisible()
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
| Card Creation | ~11 | Quota, create, anonymous, validation |
| Parent-Child Linking | ~8 | Link, unlink, aggregation, 1-level, cross-column |
| Reaction Flow | ~8 | Add, remove, quota, tooltip, aggregation |
| Board Operations | ~10 | Rename board/column, close, alias, admin |
| **Total** | **~37** | |

---

## ✅ Acceptance Criteria

- [ ] MSW handlers cover all API endpoints
- [ ] Real ViewModels used (not mocked)
- [ ] Stores properly hydrated
- [ ] User flows work end-to-end
- [ ] Error scenarios tested with overridden handlers

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 3](./TEST_PHASE_03_MODEL_LAYER.md) | [Next: Phase 5 →](./TEST_PHASE_05_E2E.md)
