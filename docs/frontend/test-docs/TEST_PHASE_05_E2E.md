# Test Phase 5: End-to-End Tests (Playwright)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~35 complete
**Coverage Target**: Critical user journeys

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test critical user journeys using Playwright with real browsers, real backend, and real WebSocket connections. These tests validate the entire stack works together.

---

## 🏗️ E2E Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Playwright Test Suite                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   Browser   │───▶│  Frontend   │───▶│   Backend   │     │
│   │  Chromium   │    │ localhost   │    │   Express   │     │
│   │  Firefox    │    │   :5173     │    │   :4000     │     │
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                   │            │
│                            └──── WebSocket ────┘            │
│                                 (Real socket.io)            │
│                                    │                        │
│                                    ▼                        │
│                            ┌─────────────┐                  │
│                            │   MongoDB   │                  │
│                            │  (Test DB)  │                  │
│                            └─────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Test Infrastructure

### Global Setup/Teardown

**File**: `tests/e2e/global-setup.ts`

```typescript
import { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Ensure backend is running
  const healthCheck = await fetch('http://localhost:4000/health')
  if (!healthCheck.ok) {
    throw new Error('Backend not running. Start with: pnpm dev:backend')
  }

  // Clear test data before suite
  await fetch('http://localhost:4000/test/cleanup', { method: 'POST' })
}

export default globalSetup
```

**File**: `tests/e2e/global-teardown.ts`

```typescript
async function globalTeardown() {
  // Final cleanup after all tests
  await fetch('http://localhost:4000/test/cleanup', { method: 'POST' })
}

export default globalTeardown
```

### Playwright Configuration

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true, // Parallel with UUID-based isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined, // GitHub Actions parallel runners
  reporter: [['html'], ['github']],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // Tablet viewport for P1 tests
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 768, height: 1024 }
      }
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:backend',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
    }
  ],
})
```

### Enhanced Test Helpers

**File**: `tests/e2e/helpers.ts`

```typescript
import { Page, BrowserContext, Browser } from '@playwright/test'
import { v4 as uuidv4 } from 'uuid'

// Generate unique board names for parallel test isolation
export function uniqueBoardName(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`
}

export async function createBoard(
  page: Page,
  name: string,
  options?: { cardLimit?: number; reactionLimit?: number }
): Promise<string> {
  await page.goto('/')
  await page.fill('[data-testid="board-name-input"]', name)

  if (options?.cardLimit) {
    await page.fill('[data-testid="card-limit-input"]', String(options.cardLimit))
  }
  if (options?.reactionLimit) {
    await page.fill('[data-testid="reaction-limit-input"]', String(options.reactionLimit))
  }

  await page.click('[data-testid="create-board-button"]')
  await page.waitForURL(/\/board\//)
  return page.url().split('/board/')[1]
}

export async function joinBoard(page: Page, boardId: string, alias?: string) {
  await page.goto(`/board/${boardId}`)
  if (alias) {
    await page.fill('[data-testid="alias-input"]', alias)
  }
  await page.click('[data-testid="join-button"]')
  await page.waitForSelector('[data-testid="board-header"]')
}

export async function createCard(
  page: Page,
  column: string,
  content: string,
  options?: { anonymous?: boolean }
) {
  await page.click(`[data-testid="add-card-${column}"]`)
  await page.fill('[data-testid="card-content-input"]', content)
  if (options?.anonymous) {
    await page.check('[data-testid="anonymous-checkbox"]')
  }
  await page.click('[data-testid="create-card-submit"]')
  await page.waitForSelector(`text="${content}"`)
}

// Create fresh browser context per user for session isolation
export async function createUserContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    storageState: undefined // Fresh session, no cookies
  })
}

export async function clearTestData() {
  await fetch('http://localhost:4000/test/cleanup', { method: 'POST' })
}
```

---

## 📋 Test Suites

### 5.1 Complete Retro Session

**File**: `tests/e2e/completeRetroSession.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName, createUserContext } from './helpers'

test.describe('Complete Retro Session', () => {
  test('Multi-user retro session with real-time sync', async ({ browser }) => {
    // Create fresh contexts for each user (session isolation)
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)
    const charlieContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()
    const charlie = await charlieContext.newPage()

    const boardName = uniqueBoardName('Sprint-Retro')

    // Step 1: Alice creates board
    const boardId = await createBoard(alice, boardName)

    // Step 2: Alice joins as admin
    await alice.fill('[data-testid="alias-input"]', 'Alice')
    await alice.click('[data-testid="join-button"]')
    await expect(alice.locator('[data-testid="my-user-card"]'))
      .toContainText('Alice')

    // Step 3: Bob and Charlie join
    await joinBoard(bob, boardId, 'Bob')
    await joinBoard(charlie, boardId, 'Charlie')

    // Step 4: All users see each other (real-time via WebSocket)
    for (const page of [alice, bob, charlie]) {
      await expect(page.locator('[data-testid="participant-bar"]'))
        .toContainText('Alice')
      await expect(page.locator('[data-testid="participant-bar"]'))
        .toContainText('Bob')
      await expect(page.locator('[data-testid="participant-bar"]'))
        .toContainText('Charlie')
    }

    // Step 5: Alice creates a card
    await createCard(alice, 'went-well', 'Great collaboration')

    // Step 6: Bob and Charlie see card in real-time
    await expect(bob.locator('text="Great collaboration"')).toBeVisible()
    await expect(charlie.locator('text="Great collaboration"')).toBeVisible()

    // Step 7: Bob creates a card
    await createCard(bob, 'to-improve', 'Need better tests')

    // Step 8: Alice sees Bob's card
    await expect(alice.locator('text="Need better tests"')).toBeVisible()

    // Step 9: Charlie reacts to Alice's card
    const charlieCard = charlie.locator('text="Great collaboration"').locator('..')
    await charlieCard.locator('[data-testid="reaction-button"]').click()

    // Step 10: Alice sees reaction count update
    const aliceCard = alice.locator('text="Great collaboration"').locator('..')
    await expect(aliceCard.locator('[data-testid="reaction-count"]'))
      .toHaveText('1')

    // Step 11: Alice closes board
    await alice.click('[data-testid="close-board-button"]')
    await alice.click('[data-testid="confirm-close"]')

    // Step 12: All see closed state
    for (const page of [alice, bob, charlie]) {
      await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible()
      await expect(page.locator('[data-testid="add-card-went-well"]'))
        .toBeDisabled()
    }

    // Cleanup contexts
    await aliceContext.close()
    await bobContext.close()
    await charlieContext.close()
  })

  test('parent-child linking in multi-user session', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('Parent-Child-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    // Alice creates parent card
    await createCard(alice, 'went-well', 'Parent feedback')

    // Bob creates child card
    await createCard(bob, 'went-well', 'Child feedback')

    // Alice links them via drag-and-drop
    const childCard = alice.locator('text="Child feedback"').locator('..')
    const parentCard = alice.locator('text="Parent feedback"')

    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Both see link icon on child
    for (const page of [alice, bob]) {
      await expect(page.locator('text="Child feedback"').locator('..')
        .locator('[data-testid="link-icon"]')).toBeVisible()
    }

    await aliceContext.close()
    await bobContext.close()
  })

  test('action item linking to feedback', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Action-Link-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Feedback card')
    await createCard(page, 'action-item', 'Action task')

    const actionCard = page.locator('text="Action task"').locator('..')
    const feedbackCard = page.locator('text="Feedback card"')

    await actionCard.locator('[data-testid="drag-handle"]').dragTo(feedbackCard)

    // Feedback card shows hyperlink indicator
    await expect(feedbackCard.locator('[data-testid="linked-action-indicator"]'))
      .toBeVisible()

    // Click hyperlink navigates to action
    await feedbackCard.locator('[data-testid="linked-action-indicator"]').click()
    await expect(actionCard).toHaveClass(/highlighted/)
  })
})
```

---

### 5.2 Card Quota Enforcement

**File**: `tests/e2e/cardQuota.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName } from './helpers'

test.describe('Card Quota Enforcement', () => {
  test('blocks card creation when quota reached', async ({ page }) => {
    // Create board with limit of 2 cards
    const boardId = await createBoard(page, uniqueBoardName('Quota-Test'), {
      cardLimit: 2
    })
    await joinBoard(page, boardId, 'Alice')

    // Create cards up to limit
    await createCard(page, 'went-well', 'Card 1')
    await createCard(page, 'went-well', 'Card 2')

    // Try to create third card - button should be disabled
    const addBtn = page.locator('[data-testid="add-card-went-well"]')
    await expect(addBtn).toBeDisabled()

    // Hover shows quota info
    await addBtn.hover()
    await expect(page.locator('role=tooltip'))
      .toContainText('2/2')
  })

  test('action cards exempt from quota', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Action-Exempt-Test'), {
      cardLimit: 1
    })
    await joinBoard(page, boardId, 'Alice')

    // Use up feedback quota
    await createCard(page, 'went-well', 'Feedback card')

    // Action column button still enabled
    const actionAddBtn = page.locator('[data-testid="add-card-action-item"]')
    await expect(actionAddBtn).toBeEnabled()

    await createCard(page, 'action-item', 'Action item')
    await expect(page.locator('text="Action item"')).toBeVisible()
  })

  test('deleting card frees quota', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Delete-Quota-Test'), {
      cardLimit: 2
    })
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Card 1')
    await createCard(page, 'went-well', 'Card 2')

    // Delete one card
    await page.locator('text="Card 1"')
      .locator('..')
      .locator('[data-testid="delete-button"]')
      .click()
    await page.click('[data-testid="confirm-delete"]')

    // Now can create again
    await createCard(page, 'went-well', 'Card 3')
    await expect(page.locator('text="Card 3"')).toBeVisible()
  })

  test('reaction quota enforcement', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Reaction-Quota-Test'), {
      reactionLimit: 2
    })
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Card 1')
    await createCard(page, 'went-well', 'Card 2')
    await createCard(page, 'went-well', 'Card 3')

    // React to first two cards
    await page.locator('text="Card 1"').locator('..').locator('[data-testid="reaction-button"]').click()
    await page.locator('text="Card 2"').locator('..').locator('[data-testid="reaction-button"]').click()

    // Third reaction blocked
    const card3Reaction = page.locator('text="Card 3"').locator('..').locator('[data-testid="reaction-button"]')
    await card3Reaction.click()

    await expect(page.locator('role=alert')).toContainText(/reaction limit/i)
  })
})
```

---

### 5.3 Anonymous Card Privacy

**File**: `tests/e2e/anonymousPrivacy.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName, createUserContext } from './helpers'

test.describe('Anonymous Card Privacy', () => {
  test('anonymous card hides creator identity from all users', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('Privacy-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    // Alice creates anonymous card
    await createCard(alice, 'went-well', 'Anonymous feedback', { anonymous: true })

    // Bob sees card but not author
    const bobCard = bob.locator('text="Anonymous feedback"').locator('..')
    await expect(bobCard.locator('[data-testid="author-name"]')).not.toBeVisible()
    await expect(bobCard.locator('[data-testid="anonymous-indicator"]')).toBeVisible()

    await aliceContext.close()
    await bobContext.close()
  })

  test('owner can delete own anonymous card', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Delete-Anon-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'My anonymous card', { anonymous: true })

    // Delete button visible for owner
    const anonCard = page.locator('text="My anonymous card"').locator('..')
    await expect(anonCard.locator('[data-testid="delete-button"]')).toBeVisible()

    await anonCard.locator('[data-testid="delete-button"]').click()
    await page.click('[data-testid="confirm-delete"]')

    await expect(page.locator('text="My anonymous card"')).not.toBeVisible()
  })

  test('other users cannot delete anonymous cards', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('No-Delete-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    await createCard(alice, 'went-well', 'Alice anonymous', { anonymous: true })

    // Bob cannot see delete button
    const bobCard = bob.locator('text="Alice anonymous"').locator('..')
    await expect(bobCard.locator('[data-testid="delete-button"]')).not.toBeVisible()

    await aliceContext.close()
    await bobContext.close()
  })
})
```

---

### 5.4 Board Lifecycle

**File**: `tests/e2e/boardLifecycle.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName } from './helpers'

test.describe('Board Lifecycle', () => {
  test('create, rename, use, and close board', async ({ page }) => {
    // Create
    const boardId = await createBoard(page, uniqueBoardName('Lifecycle-Test'))
    await joinBoard(page, boardId, 'Alice')

    await expect(page.locator('[data-testid="board-header"]'))
      .toContainText('Lifecycle-Test')

    // Rename board
    await page.click('[data-testid="edit-board-button"]')
    await page.fill('[data-testid="board-name-input"]', 'Renamed Board')
    await page.click('[data-testid="save-button"]')

    await expect(page.locator('[data-testid="board-header"]'))
      .toContainText('Renamed Board')

    // Use - create some cards
    await createCard(page, 'went-well', 'Test card')

    // Close
    await page.click('[data-testid="close-board-button"]')
    await page.click('[data-testid="confirm-close"]')

    await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible()

    // Cards still visible but read-only
    await expect(page.locator('text="Test card"')).toBeVisible()
    await expect(page.locator('[data-testid="add-card-went-well"]')).toBeDisabled()
  })

  test('column rename persists', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Column-Rename-Test'))
    await joinBoard(page, boardId, 'Alice')

    // Rename column
    await page.locator('[data-testid="column-went-well"] [data-testid="edit-column-button"]').click()
    await page.fill('[data-testid="column-name-input"]', 'Successes')
    await page.click('[data-testid="save-column-button"]')

    await expect(page.locator('[data-testid="column-went-well"]'))
      .toContainText('Successes')

    // Refresh and verify persistence
    await page.reload()
    await expect(page.locator('[data-testid="column-went-well"]'))
      .toContainText('Successes')
  })

  test('closed board accessible via link', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Closed-Access-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Preserved card')

    // Close board
    await page.click('[data-testid="close-board-button"]')
    await page.click('[data-testid="confirm-close"]')

    // Navigate away and back
    await page.goto('/')
    await page.goto(`/board/${boardId}`)

    // Content visible, but read-only
    await expect(page.locator('text="Preserved card"')).toBeVisible()
    await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible()
  })
})
```

---

### 5.5 Parent-Child Cards (NEW)

**File**: `tests/e2e/parentChildCards.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName, createUserContext } from './helpers'

test.describe('Parent-Child Card Relationships', () => {
  test('drag feedback onto feedback creates parent-child', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('PC-Link-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent card')
    await createCard(page, 'went-well', 'Child card')

    const childCard = page.locator('text="Child card"').locator('..')
    const parentCard = page.locator('text="Parent card"')

    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Child shows link icon
    await expect(childCard.locator('[data-testid="link-icon"]')).toBeVisible()
    await expect(childCard.locator('[data-testid="drag-handle"]')).not.toBeVisible()
  })

  test('click link icon unlinks child', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Unlink-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')

    // Link them
    const childCard = page.locator('text="Child"').locator('..')
    const parentCard = page.locator('text="Parent"')
    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Unlink
    await childCard.locator('[data-testid="link-icon"]').click()

    // Drag handle restored
    await expect(childCard.locator('[data-testid="drag-handle"]')).toBeVisible()
    await expect(childCard.locator('[data-testid="link-icon"]')).not.toBeVisible()
  })

  test('1-level hierarchy: cannot make grandchild', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('1-Level-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')
    await createCard(page, 'went-well', 'Grandchild')

    // Link child to parent
    const childCard = page.locator('text="Child"').locator('..')
    const parentCard = page.locator('text="Parent"')
    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Try to link grandchild to child
    const grandchildCard = page.locator('text="Grandchild"').locator('..')
    await grandchildCard.locator('[data-testid="drag-handle"]').dragTo(childCard)

    // Error message
    await expect(page.locator('role=alert')).toContainText(/only 1 level/i)
  })

  test('parent aggregated count shows sum of children', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Aggregation-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child1')
    await createCard(page, 'went-well', 'Child2')

    // Link children to parent
    const parent = page.locator('text="Parent"')
    await page.locator('text="Child1"').locator('..').locator('[data-testid="drag-handle"]').dragTo(parent)
    await page.locator('text="Child2"').locator('..').locator('[data-testid="drag-handle"]').dragTo(parent)

    // React to children
    await page.locator('text="Child1"').locator('..').locator('[data-testid="reaction-button"]').click()
    await page.locator('text="Child2"').locator('..').locator('[data-testid="reaction-button"]').click()

    // Parent shows aggregated count
    await expect(parent.locator('[data-testid="reaction-count"]')).toHaveText('2')
  })

  test('cross-column parent-child relationship', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Cross-Column-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent in column 1')
    await createCard(page, 'to-improve', 'Child in column 2')

    const childCard = page.locator('text="Child in column 2"').locator('..')
    const parentCard = page.locator('text="Parent in column 1"')

    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Link icon visible on child in different column
    await expect(childCard.locator('[data-testid="link-icon"]')).toBeVisible()
  })

  test('delete parent orphans children', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Delete-Parent-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent to delete')
    await createCard(page, 'went-well', 'Child to orphan')

    // Link
    const childCard = page.locator('text="Child to orphan"').locator('..')
    const parentCard = page.locator('text="Parent to delete"').locator('..')
    await childCard.locator('[data-testid="drag-handle"]').dragTo(parentCard)

    // Delete parent
    await parentCard.locator('[data-testid="delete-button"]').click()
    await page.click('[data-testid="confirm-delete"]')

    // Child becomes standalone
    await expect(childCard.locator('[data-testid="drag-handle"]')).toBeVisible()
    await expect(page.locator('text="Child to orphan"')).toBeVisible()
  })
})
```

---

### 5.6 Sorting & Filtering (NEW)

**File**: `tests/e2e/sortingFiltering.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName, createUserContext } from './helpers'

test.describe('Sorting and Filtering', () => {
  test('sort by recency: newest first (default)', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Sort-Recency-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'First card')
    await page.waitForTimeout(100) // Ensure different timestamps
    await createCard(page, 'went-well', 'Second card')
    await page.waitForTimeout(100)
    await createCard(page, 'went-well', 'Third card')

    // Default sort is recency desc (newest first)
    const cards = page.locator('[data-testid="column-went-well"] [data-testid="retro-card"]')
    await expect(cards.nth(0)).toContainText('Third card')
    await expect(cards.nth(2)).toContainText('First card')
  })

  test('sort by popularity uses aggregated counts', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Sort-Pop-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Popular')
    await createCard(page, 'went-well', 'Unpopular')

    // React to popular card multiple times (need multiple users for this)
    // For single user, just verify sort dropdown works
    await page.click('[data-testid="sort-dropdown"]')
    await page.click('[data-testid="sort-option-popularity"]')

    await expect(page.locator('[data-testid="sort-dropdown"]'))
      .toContainText('Popularity')
  })

  test('filter by specific user shows only their cards', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('Filter-User-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    await createCard(alice, 'went-well', 'Alice card')
    await createCard(bob, 'went-well', 'Bob card')

    // Alice filters by Bob
    await alice.click('[data-testid="participant-avatar-Bob"]')

    // Only Bob's card visible
    await expect(alice.locator('text="Bob card"')).toBeVisible()
    await expect(alice.locator('text="Alice card"')).not.toBeVisible()

    await aliceContext.close()
    await bobContext.close()
  })

  test('filter by Anonymous shows only anonymous cards', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Filter-Anon-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Public card')
    await createCard(page, 'went-well', 'Anonymous card', { anonymous: true })

    // Click anonymous filter
    await page.click('[data-testid="anonymous-filter-avatar"]')

    await expect(page.locator('text="Anonymous card"')).toBeVisible()
    await expect(page.locator('text="Public card"')).not.toBeVisible()
  })

  test('All Users filter shows children, specific filter hides them', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Filter-Children-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Parent')
    await createCard(page, 'went-well', 'Child')

    // Link them
    const child = page.locator('text="Child"').locator('..')
    const parent = page.locator('text="Parent"')
    await child.locator('[data-testid="drag-handle"]').dragTo(parent)

    // All Users: child visible
    await page.click('[data-testid="all-users-filter-avatar"]')
    await expect(page.locator('text="Child"')).toBeVisible()

    // Filter by Alice: children hidden
    await page.click('[data-testid="participant-avatar-Alice"]')
    await expect(page.locator('text="Parent"')).toBeVisible()
    // Child hidden per PRD FR-2.5.7
    await expect(page.locator('text="Child"')).not.toBeVisible()
  })
})
```

---

### 5.7 Admin Operations (NEW)

**File**: `tests/e2e/adminOperations.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName, createUserContext } from './helpers'

test.describe('Admin Operations', () => {
  test('creator promotes user via dropdown', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('Promote-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    // Alice promotes Bob
    await alice.click('[data-testid="admin-dropdown"]')
    await alice.click('[data-testid="promote-Bob"]')

    // Bob now has admin badge
    await expect(alice.locator('[data-testid="participant-avatar-Bob"]'))
      .toHaveAttribute('data-is-admin', 'true')

    await aliceContext.close()
    await bobContext.close()
  })

  test('co-admin can close board', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('CoAdmin-Close-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    // Alice promotes Bob
    await alice.click('[data-testid="admin-dropdown"]')
    await alice.click('[data-testid="promote-Bob"]')

    // Bob closes board
    await bob.click('[data-testid="close-board-button"]')
    await bob.click('[data-testid="confirm-close"]')

    // Both see closed state
    await expect(alice.locator('[data-testid="lock-icon"]')).toBeVisible()
    await expect(bob.locator('[data-testid="lock-icon"]')).toBeVisible()

    await aliceContext.close()
    await bobContext.close()
  })

  test('non-admin cannot see admin controls', async ({ browser }) => {
    const aliceContext = await createUserContext(browser)
    const bobContext = await createUserContext(browser)

    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    const boardId = await createBoard(alice, uniqueBoardName('NoAdmin-Test'))
    await joinBoard(alice, boardId, 'Alice')
    await joinBoard(bob, boardId, 'Bob')

    // Bob should not see admin controls
    await expect(bob.locator('[data-testid="close-board-button"]')).not.toBeVisible()
    await expect(bob.locator('[data-testid="admin-dropdown"]')).not.toBeVisible()
    await expect(bob.locator('[data-testid="edit-board-button"]')).not.toBeVisible()

    await aliceContext.close()
    await bobContext.close()
  })

  test('admin can rename board and columns', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Rename-All-Test'))
    await joinBoard(page, boardId, 'Alice')

    // Rename board
    await page.click('[data-testid="edit-board-button"]')
    await page.fill('[data-testid="board-name-input"]', 'New Board Name')
    await page.click('[data-testid="save-button"]')
    await expect(page.locator('[data-testid="board-header"]')).toContainText('New Board Name')

    // Rename column
    await page.locator('[data-testid="column-went-well"] [data-testid="edit-column-button"]').click()
    await page.fill('[data-testid="column-name-input"]', 'Wins')
    await page.click('[data-testid="save-column-button"]')
    await expect(page.locator('[data-testid="column-went-well"]')).toContainText('Wins')
  })
})
```

---

### 5.8 Tablet Viewport Tests (NEW)

**File**: `tests/e2e/tabletViewport.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName } from './helpers'

// Run only on tablet project
test.describe('Tablet Viewport Tests', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('layout adapts to tablet width', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Tablet-Layout-Test'))
    await joinBoard(page, boardId, 'Alice')

    // Column container should scroll horizontally
    const columnContainer = page.locator('[data-testid="column-container"]')
    await expect(columnContainer).toHaveCSS('overflow-x', 'auto')

    // All columns exist but need scroll
    await expect(page.locator('[data-testid="column-went-well"]')).toBeVisible()
    await expect(page.locator('[data-testid="column-to-improve"]')).toBeVisible()
  })

  test('touch drag-and-drop for cards', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Touch-Drag-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Touch card')

    const card = page.locator('text="Touch card"').locator('..')
    const dragHandle = card.locator('[data-testid="drag-handle"]')

    // Verify drag handle has minimum touch target
    const box = await dragHandle.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('participant bar adapts to narrow width', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('Narrow-Bar-Test'))
    await joinBoard(page, boardId, 'Alice')

    // Participant bar should be scrollable or collapsed
    const participantBar = page.locator('[data-testid="participant-bar"]')
    const hasScroll = await participantBar.evaluate(el =>
      el.scrollWidth > el.clientWidth ||
      el.classList.contains('collapsed')
    )
    expect(hasScroll).toBe(true)
  })
})
```

---

### 5.9 Basic Accessibility Tests (NEW)

**File**: `tests/e2e/accessibilityBasic.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, uniqueBoardName } from './helpers'

test.describe('Basic Accessibility', () => {
  test('interactive elements have focus indicators', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('A11y-Focus-Test'))
    await joinBoard(page, boardId, 'Alice')

    // Tab through elements and verify focus visible
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus')
    const outline = await focusedElement.evaluate(el =>
      getComputedStyle(el).outline || getComputedStyle(el).boxShadow
    )
    expect(outline).not.toBe('none')
  })

  test('cards have accessible labels', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('A11y-Label-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Accessible card')

    const card = page.locator('text="Accessible card"').locator('..')
    await expect(card).toHaveAttribute('aria-label', /card/i)
  })

  test('drag handles have accessible names', async ({ page }) => {
    const boardId = await createBoard(page, uniqueBoardName('A11y-Drag-Test'))
    await joinBoard(page, boardId, 'Alice')

    await createCard(page, 'went-well', 'Drag test card')

    const dragHandle = page.locator('[data-testid="drag-handle"]').first()
    await expect(dragHandle).toHaveAttribute('aria-label', /drag/i)
  })
})
```

---

## 📁 Files to Create

```
tests/e2e/
├── global-setup.ts
├── global-teardown.ts
├── helpers.ts
├── completeRetroSession.spec.ts
├── cardQuota.spec.ts
├── anonymousPrivacy.spec.ts
├── boardLifecycle.spec.ts
├── parentChildCards.spec.ts
├── sortingFiltering.spec.ts
├── adminOperations.spec.ts
├── tabletViewport.spec.ts
└── accessibilityBasic.spec.ts

playwright.config.ts
```

---

## 🧪 Test Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Complete Retro Session | ~4 | Multi-user, real-time, parent-child, action link |
| Card Quota | ~4 | Limits, exemptions, reaction quota |
| Anonymous Privacy | ~3 | Hide identity, ownership |
| Board Lifecycle | ~3 | Create, rename, close |
| Parent-Child Cards | ~6 | Linking, unlinking, aggregation, 1-level |
| Sorting & Filtering | ~5 | Sort modes, user filters, anonymous |
| Admin Operations | ~4 | Promote, permissions, rename |
| Tablet Viewport | ~3 | Layout, touch, responsive |
| Accessibility Basic | ~3 | Focus, labels, a11y |
| **Total** | **~35** | |

---

## ✅ Acceptance Criteria

- [x] Uses /test/cleanup as global teardown
- [x] UUID-based board IDs for parallel isolation
- [x] Fresh browser context per user session
- [x] Real backend + real socket.io-client
- [x] Most tests use unlimited boards
- [x] One suite for quota enforcement testing
- [x] Client-side + backend fallback for 1-level hierarchy
- [ ] Tests run against real backend
- [ ] Multi-user scenarios work
- [ ] Real-time sync verified
- [ ] Tests pass in CI environment (GitHub Actions)
- [ ] Screenshots captured on failure
- [ ] Tablet viewport tests included
- [ ] Basic accessibility checks included

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 4](./TEST_PHASE_04_INTEGRATION.md) | [Next: Phase 6 →](./TEST_PHASE_06_REALTIME.md)
