# Test Phase 7: Drag-and-Drop Tests

**Status**: 🔲 NOT STARTED
**Tests**: 0/~22 complete
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

  test('touch events work for drag and drop', async () => {
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

    // Simulate touch events
    fireEvent.touchStart(draggable, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    fireEvent.touchMove(draggable, {
      touches: [{ clientX: 150, clientY: 200 }]
    })
    fireEvent.touchEnd(dropTarget)

    expect(mockLinkCards).toHaveBeenCalledWith('child-1', 'parent-1')
  })

  test('keyboard alternative: Enter to select, Tab to target, Enter to drop', async () => {
    const mockLinkCards = vi.fn()

    render(
      <DndContext onDragEnd={(event) => {
        mockLinkCards(event.active?.id, event.over?.id)
      }}>
        <RetroCard card={childCard} />
        <RetroCard card={parentCard} />
      </DndContext>
    )

    const dragHandle = screen.getByTestId(`drag-handle-${childCard.id}`)

    // Focus and activate with Enter
    dragHandle.focus()
    fireEvent.keyDown(dragHandle, { key: 'Enter' })

    // Tab to target
    fireEvent.keyDown(document, { key: 'Tab' })

    // Drop with Enter
    fireEvent.keyDown(document, { key: 'Enter' })

    expect(mockLinkCards).toHaveBeenCalled()
  })

  test('1-level hierarchy: drop child on parent\'s child is blocked', async () => {
    const grandparent = { id: 'gp', parent_card_id: null }
    const parent = { id: 'p', parent_card_id: 'gp' }
    const child = { id: 'c', parent_card_id: null }

    const mockLinkCards = vi.fn()

    render(
      <DndContext onDragEnd={mockLinkCards}>
        <RetroCard card={grandparent} />
        <RetroCard card={parent} />
        <RetroCard card={child} />
      </DndContext>
    )

    const draggable = screen.getByTestId(`drag-handle-${child.id}`)
    const dropTarget = screen.getByTestId(`drop-zone-${parent.id}`)

    fireEvent.dragStart(draggable)
    fireEvent.dragOver(dropTarget)

    // Parent already has parent, so it can't accept children (1-level max)
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

  test('mobile/tablet touch drag works', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    const boardId = await createBoard(page, 'Touch Drag Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')

    const child = page.locator('text="Child"').locator('..')
    const parent = page.locator('text="Parent"')

    const childHandle = child.locator('[data-testid="drag-handle"]')
    const childBox = await childHandle.boundingBox()
    const parentBox = await parent.boundingBox()

    // Simulate touch drag
    await page.touchscreen.tap(childBox!.x + 22, childBox!.y + 22)
    await page.mouse.move(parentBox!.x + 50, parentBox!.y + 50)
    await page.touchscreen.tap(parentBox!.x + 50, parentBox!.y + 50)

    // Verify link
    await expect(child.locator('[data-testid="link-icon"]')).toBeVisible()
  })

  test('two users drag same card simultaneously: last write wins', async ({ browser }) => {
    const aliceContext = await browser.newContext()
    const bobContext = await browser.newContext()

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, 'Concurrent Drag Test')
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    await createCard(alice, 'went-well', 'Target1')
    await createCard(alice, 'went-well', 'Target2')
    await createCard(alice, 'went-well', 'Shared card')

    const aliceShared = alice.locator('text="Shared card"').locator('..')
    const bobShared = bob.locator('text="Shared card"').locator('..')

    // Both try to drag to different targets
    const aliceTarget = alice.locator('text="Target1"')
    const bobTarget = bob.locator('text="Target2"')

    // Start both drags (race condition)
    await Promise.all([
      aliceShared.locator('[data-testid="drag-handle"]').dragTo(aliceTarget),
      bobShared.locator('[data-testid="drag-handle"]').dragTo(bobTarget)
    ])

    // Wait for sync - one of them wins
    await alice.waitForTimeout(500)

    // Both should see same final state
    const aliceLink = await aliceShared.locator('[data-testid="link-icon"]').isVisible()
    const bobLink = await bobShared.locator('[data-testid="link-icon"]').isVisible()

    expect(aliceLink).toBe(bobLink) // Consistent state

    await aliceContext.close()
    await bobContext.close()
  })

  test('drag preview shows card content', async ({ page }) => {
    const boardId = await createBoard(page, 'Preview Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Card with preview')

    const card = page.locator('text="Card with preview"').locator('..')
    const handle = card.locator('[data-testid="drag-handle"]')

    // Start drag but don't drop
    await handle.hover()
    await page.mouse.down()
    await page.mouse.move(300, 300)

    // Drag preview should contain card text
    await expect(page.locator('[data-testid="drag-preview"]'))
      .toContainText('Card with preview')

    await page.mouse.up()
  })

  test('drop zone animation on valid drop', async ({ page }) => {
    const boardId = await createBoard(page, 'Animation Test')
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')

    const child = page.locator('text="Child"').locator('..')
    const parent = page.locator('text="Parent"')

    await child.locator('[data-testid="drag-handle"]').dragTo(parent)

    // Check for animation class on parent after drop
    await expect(parent).toHaveClass(/drop-success-animation/)
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
| Component-level Drag | ~11 | @dnd-kit events, touch, keyboard, 1-level |
| Circular Prevention | ~3 | Cycle detection |
| E2E Drag-Drop | ~9 | Visual verification, touch, concurrent, preview |
| **Total** | **~23** | |

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
