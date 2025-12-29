# Test Phase 7: Drag-and-Drop Tests

**Status**: 🔲 NOT STARTED
**Tests**: 0/~15 complete
**Coverage Target**: All drag interactions

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test drag-and-drop interactions using @dnd-kit at the component level and Playwright for E2E visual verification. These tests validate card linking, moving, and visual feedback.

---

## 📋 Test Suites

### 7.1 Component-level Drag Testing

**File**: `tests/integration/drag-drop.integration.test.tsx`

**Pattern**: @dnd-kit with simulated events

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { vi } from 'vitest'
import { RetroCard } from '@/features/card/components/RetroCard'
import { RetroColumn } from '@/features/card/components/RetroColumn'

describe('@dnd-kit Drag and Drop', () => {
  const parentCard = {
    id: 'parent-1',
    content: 'Parent card',
    column_type: 'went_well',
    children: []
  }

  const childCard = {
    id: 'child-1',
    content: 'Child card',
    column_type: 'went_well',
    children: []
  }

  test('drag feedback card onto another creates parent-child', async () => {
    const mockLinkCards = vi.fn()

    render(
      <DndContext onDragEnd={(event) => {
        if (event.over?.data.current?.type === 'card') {
          mockLinkCards(event.active.id, event.over.id)
        }
      }}>
        <RetroCard card={parentCard} />
        <RetroCard card={childCard} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${childCard.id}`)
    const dropTarget = screen.getByTestId(`drop-zone-${parentCard.id}`)

    // Simulate drag events
    fireEvent.dragStart(draggable)
    fireEvent.dragOver(dropTarget)
    fireEvent.drop(dropTarget)
    fireEvent.dragEnd(draggable)

    expect(mockLinkCards).toHaveBeenCalledWith('child-1', 'parent-1')
  })

  test('drag-over highlights drop zone', async () => {
    render(
      <DndContext>
        <RetroCard card={parentCard} />
        <RetroCard card={childCard} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${childCard.id}`)
    const dropTarget = screen.getByTestId(`drop-zone-${parentCard.id}`)

    fireEvent.dragStart(draggable)
    fireEvent.dragEnter(dropTarget)

    expect(dropTarget).toHaveClass('drag-over-highlight')

    fireEvent.dragLeave(dropTarget)

    expect(dropTarget).not.toHaveClass('drag-over-highlight')
  })

  test('drag card to column moves card', async () => {
    const mockMoveCard = vi.fn()

    render(
      <DndContext onDragEnd={(event) => {
        if (event.over?.data.current?.type === 'column') {
          mockMoveCard(event.active.id, event.over.id)
        }
      }}>
        <RetroColumn columnType="went_well" cards={[childCard]} />
        <RetroColumn columnType="to_improve" cards={[]} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${childCard.id}`)
    const dropColumn = screen.getByTestId('drop-zone-to_improve')

    fireEvent.dragStart(draggable)
    fireEvent.dragOver(dropColumn)
    fireEvent.drop(dropColumn)

    expect(mockMoveCard).toHaveBeenCalledWith('child-1', 'to_improve')
  })

  test('linked card cannot be dragged', () => {
    const linkedCard = {
      ...childCard,
      parent_card_id: 'parent-1'
    }

    render(
      <DndContext>
        <RetroCard card={linkedCard} />
      </DndContext>
    )

    // Drag handle should not exist for linked card
    expect(screen.queryByTestId(`drag-handle-${linkedCard.id}`))
      .not.toBeInTheDocument()

    // Link icon should be present instead
    expect(screen.getByTestId(`link-icon-${linkedCard.id}`))
      .toBeInTheDocument()
  })

  test('action card can drop on feedback card', async () => {
    const actionCard = {
      id: 'action-1',
      content: 'Action item',
      column_type: 'action_item',
      card_type: 'action'
    }

    const feedbackCard = {
      id: 'feedback-1',
      content: 'Feedback card',
      column_type: 'went_well',
      card_type: 'feedback'
    }

    const mockLinkAction = vi.fn()

    render(
      <DndContext onDragEnd={(event) => {
        mockLinkAction(event.active.id, event.over?.id)
      }}>
        <RetroCard card={feedbackCard} />
        <RetroCard card={actionCard} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${actionCard.id}`)
    const dropTarget = screen.getByTestId(`drop-zone-${feedbackCard.id}`)

    fireEvent.dragStart(draggable)
    fireEvent.drop(dropTarget)

    expect(mockLinkAction).toHaveBeenCalledWith('action-1', 'feedback-1')
  })

  test('invalid drop target shows error indicator', async () => {
    const actionCard1 = { id: 'action-1', card_type: 'action' }
    const actionCard2 = { id: 'action-2', card_type: 'action' }

    render(
      <DndContext>
        <RetroCard card={actionCard1} />
        <RetroCard card={actionCard2} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${actionCard1.id}`)
    const dropTarget = screen.getByTestId(`drop-zone-${actionCard2.id}`)

    fireEvent.dragStart(draggable)
    fireEvent.dragEnter(dropTarget)

    // Should show invalid indicator (red border or icon)
    expect(dropTarget).toHaveClass('drop-invalid')
  })
})
```

---

### 7.2 Circular Relationship Prevention

**File**: `tests/unit/features/card/viewmodels/useDragDropViewModel.test.ts`

```typescript
describe('Circular Relationship Prevention', () => {
  test('detects direct cycle: A → B, trying B → A', () => {
    const cards = new Map([
      ['A', { id: 'A', parent_card_id: null }],
      ['B', { id: 'B', parent_card_id: 'A' }]
    ])

    const { result } = renderHook(() => useDragDropViewModel(cards))

    // Try to make A child of B (would create B → A → B cycle)
    const canDrop = result.current.canDropOn('A', 'B', 'card')

    expect(canDrop).toBe(false)
  })

  test('detects indirect cycle: A → B → C, trying C → A', () => {
    const cards = new Map([
      ['A', { id: 'A', parent_card_id: null }],
      ['B', { id: 'B', parent_card_id: 'A' }],
      ['C', { id: 'C', parent_card_id: 'B' }]
    ])

    const { result } = renderHook(() => useDragDropViewModel(cards))

    // Try to make A child of C (would create C → A → B → C cycle)
    const canDrop = result.current.canDropOn('A', 'C', 'card')

    expect(canDrop).toBe(false)
  })

  test('allows valid parent-child relationship', () => {
    const cards = new Map([
      ['A', { id: 'A', parent_card_id: null }],
      ['B', { id: 'B', parent_card_id: null }]
    ])

    const { result } = renderHook(() => useDragDropViewModel(cards))

    const canDrop = result.current.canDropOn('B', 'A', 'card')

    expect(canDrop).toBe(true)
  })
})
```

---

### 7.3 E2E Drag-and-Drop with Playwright

**File**: `tests/e2e/drag-drop.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard } from './helpers'

test.describe('E2E: Drag and Drop Interactions', () => {
  test('drag card to create parent-child relationship', async ({ page }) => {
    const boardId = await createBoard(page, 'Drag Test')
    await joinBoard(page, boardId, 'Alice')

    // Create two cards
    await createCard(page, 'went-well', 'Parent card')
    await createCard(page, 'went-well', 'Child card')

    // Get card elements
    const parentCard = page.locator('text="Parent card"').locator('..')
    const childCard = page.locator('text="Child card"').locator('..')

    // Perform drag and drop
    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Verify link icon appears on child
    await expect(childCard.locator('[data-testid="link-icon"]'))
      .toBeVisible()

    // Verify aggregation - parent shows combined count
    await expect(parentCard.locator('[data-testid="reaction-count"]'))
      .toBeVisible()
  })

  test('drag action card onto feedback card creates link', async ({ page }) => {
    const boardId = await createBoard(page, 'Action Link Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Feedback card')
    await createCard(page, 'action-item', 'Action item')

    const feedbackCard = page.locator('text="Feedback card"').locator('..')
    const actionCard = page.locator('text="Action item"').locator('..')

    await actionCard.locator('[data-testid="drag-handle"]').dragTo(feedbackCard)

    // Action card shows linked feedback reference
    await expect(actionCard.locator('[data-testid="linked-feedback"]'))
      .toContainText('Feedback card')
  })

  test('verify no gap between parent and child cards', async ({ page }) => {
    const boardId = await createBoard(page, 'Gap Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')

    const parentCard = page.locator('text="Parent"').locator('..')
    const childCard = page.locator('text="Child"').locator('..')

    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Get bounding boxes
    const parentBox = await parentCard.boundingBox()
    const childBox = await childCard.boundingBox()

    // Child should be immediately below parent (no gap)
    expect(childBox!.y).toBe(parentBox!.y + parentBox!.height)

    // Child should be aligned with parent (same left edge or indented)
    expect(childBox!.x).toBeGreaterThanOrEqual(parentBox!.x)
  })

  test('unlink child by clicking link icon', async ({ page }) => {
    // After linking...
    const childCard = page.locator('text="Child"').locator('..')

    await childCard.locator('[data-testid="link-icon"]').click()

    // Link icon replaced by drag handle
    await expect(childCard.locator('[data-testid="drag-handle"]'))
      .toBeVisible()
    await expect(childCard.locator('[data-testid="link-icon"]'))
      .not.toBeVisible()
  })

  test('drag card to different column moves it', async ({ page }) => {
    const boardId = await createBoard(page, 'Move Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Movable card')

    const card = page.locator('text="Movable card"').locator('..')
    const targetColumn = page.locator('[data-testid="column-to_improve"]')

    await card.locator('[data-testid="drag-handle"]').dragTo(targetColumn)

    // Card now in different column
    await expect(targetColumn.locator('text="Movable card"')).toBeVisible()
    await expect(page.locator('[data-testid="column-went_well"]')
      .locator('text="Movable card"')).not.toBeVisible()
  })
})
```

---

## 📁 Files to Create

```
tests/
├── integration/
│   └── drag-drop.integration.test.tsx
├── unit/features/card/viewmodels/
│   └── useDragDropViewModel.test.ts (circular prevention tests)
└── e2e/
    └── drag-drop.spec.ts
```

---

## 🧪 Test Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Component-level Drag | ~7 | @dnd-kit events, highlighting |
| Circular Prevention | ~3 | Cycle detection |
| E2E Drag-Drop | ~5 | Visual verification |
| **Total** | **~15** | |

---

## ✅ Acceptance Criteria

- [ ] Drag handle visible on standalone cards
- [ ] Link icon replaces drag handle for linked cards
- [ ] Drop zones highlight on drag-over
- [ ] Invalid drops show error indicator
- [ ] Circular relationships prevented
- [ ] No visual gap between parent and child
- [ ] E2E tests verify actual drag operations

---

## 📝 Drop Validation Rules

| Source Type | Target Type | Action | Allowed |
|-------------|-------------|--------|---------|
| feedback | feedback card | Create parent-child | ✅ (if no cycle) |
| action | feedback card | Link action to feedback | ✅ |
| feedback | column | Move to column | ✅ |
| action | column | Move to column | ✅ |
| feedback | action card | - | ❌ |
| action | action card | - | ❌ |

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 6](./TEST_PHASE_06_REALTIME.md)
