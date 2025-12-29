# Test Phase 5: End-to-End Tests (Playwright)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~15 complete
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
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│                            │                   │            │
│                            └──── WebSocket ────┘            │
│                                                             │
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

## 📋 Playwright Setup

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Serial for DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

**File**: `tests/e2e/helpers.ts`

```typescript
import { Page } from '@playwright/test'

export async function createBoard(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.fill('[data-testid="board-name-input"]', name)
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

export async function clearTestData() {
  // Call test cleanup endpoint
  await fetch('http://localhost:4000/test/cleanup', { method: 'POST' })
}
```

---

## 📋 Test Suites

### 5.1 Complete Retro Session

**File**: `tests/e2e/completeRetroSession.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { createBoard, joinBoard, createCard, clearTestData } from './helpers'

test.describe('Complete Retro Session', () => {
  test.beforeEach(async () => {
    await clearTestData()
  })

  test('Multi-user retro session with real-time sync', async ({ browser }) => {
    // Create 3 browser contexts (3 users)
    const alice = await browser.newPage()
    const bob = await browser.newPage()
    const charlie = await browser.newPage()

    // Step 1: Alice creates board
    const boardId = await createBoard(alice, 'Sprint 42 Retro')

    // Step 2: Alice joins as admin
    await alice.fill('[data-testid="alias-input"]', 'Alice')
    await alice.click('[data-testid="join-button"]')
    await expect(alice.locator('[data-testid="my-user-card"]'))
      .toContainText('Alice')

    // Step 3: Bob and Charlie join
    await joinBoard(bob, boardId)
    await bob.fill('[data-testid="alias-input"]', 'Bob')
    await bob.click('[data-testid="join-button"]')

    await joinBoard(charlie, boardId)
    await charlie.fill('[data-testid="alias-input"]', 'Charlie')
    await charlie.click('[data-testid="join-button"]')

    // Step 4: All users see each other (real-time)
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

    // Cleanup
    await alice.close()
    await bob.close()
    await charlie.close()
  })
})
```

---

### 5.2 Card Quota Enforcement

**File**: `tests/e2e/cardQuota.spec.ts`

```typescript
test.describe('Card Quota Enforcement', () => {
  test('blocks card creation when quota reached', async ({ page }) => {
    await createBoard(page, 'Quota Test')
    await joinBoard(page, 'board-id', 'Alice')

    // Create cards up to limit (assuming limit is 2)
    await createCard(page, 'went-well', 'Card 1')
    await createCard(page, 'went-well', 'Card 2')

    // Try to create third card
    await page.click('[data-testid="add-card-went-well"]')

    // Error shown
    await expect(page.locator('role=alert'))
      .toContainText('Card limit reached')

    // Create button disabled
    await expect(page.locator('[data-testid="create-card-submit"]'))
      .toBeDisabled()
  })

  test('action cards exempt from quota', async ({ page }) => {
    // After hitting feedback limit, action cards still work
    await page.click('[data-testid="add-card-action-item"]')
    await page.fill('[data-testid="card-content-input"]', 'Action item')
    await page.click('[data-testid="create-card-submit"]')

    await expect(page.locator('text="Action item"')).toBeVisible()
  })

  test('deleting card frees quota', async ({ page }) => {
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
})
```

---

### 5.3 Anonymous Card Privacy

**File**: `tests/e2e/anonymousPrivacy.spec.ts`

```typescript
test.describe('Anonymous Card Privacy', () => {
  test('anonymous card hides creator identity', async ({ page }) => {
    await createBoard(page, 'Privacy Test')
    await joinBoard(page, 'board-id', 'Alice')

    // Create anonymous card
    await createCard(page, 'went-well', 'Anonymous feedback', { anonymous: true })

    // Card appears without author
    const anonCard = page.locator('text="Anonymous feedback"').locator('..')
    await expect(anonCard.locator('[data-testid="author-name"]'))
      .not.toBeVisible()

    // Create non-anonymous card
    await createCard(page, 'went-well', 'Public feedback')

    // Public card shows author
    const publicCard = page.locator('text="Public feedback"').locator('..')
    await expect(publicCard.locator('[data-testid="author-name"]'))
      .toContainText('Alice')
  })

  test('owner can delete own anonymous card', async ({ page }) => {
    // Anonymous card should still show delete button for owner
    const anonCard = page.locator('text="Anonymous feedback"').locator('..')
    await expect(anonCard.locator('[data-testid="delete-button"]'))
      .toBeVisible()

    await anonCard.locator('[data-testid="delete-button"]').click()
    await page.click('[data-testid="confirm-delete"]')

    await expect(page.locator('text="Anonymous feedback"')).not.toBeVisible()
  })

  test('other users cannot see author of anonymous card', async ({ browser }) => {
    // Create context for second user
    const bob = await browser.newPage()
    await joinBoard(bob, 'board-id', 'Bob')

    // Bob sees anonymous card but no author
    const bobCard = bob.locator('text="Anonymous feedback"').locator('..')
    await expect(bobCard.locator('[data-testid="author-name"]'))
      .not.toBeVisible()

    await bob.close()
  })
})
```

---

### 5.4 Board Lifecycle

**File**: `tests/e2e/boardLifecycle.spec.ts`

```typescript
test.describe('Board Lifecycle', () => {
  test('create, use, and close board', async ({ page }) => {
    // Create
    await page.goto('/')
    await page.fill('[data-testid="board-name-input"]', 'Lifecycle Test')
    await page.click('[data-testid="create-board-button"]')

    await expect(page.locator('[data-testid="board-header"]'))
      .toContainText('Lifecycle Test')

    // Use - create some cards
    await createCard(page, 'went-well', 'Test card')

    // Rename
    await page.click('[data-testid="edit-board-button"]')
    await page.fill('[data-testid="board-name-input"]', 'Renamed Board')
    await page.click('[data-testid="save-button"]')

    await expect(page.locator('[data-testid="board-header"]'))
      .toContainText('Renamed Board')

    // Close
    await page.click('[data-testid="close-board-button"]')
    await page.click('[data-testid="confirm-close"]')

    await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible()

    // Cards still visible but read-only
    await expect(page.locator('text="Test card"')).toBeVisible()
    await expect(page.locator('[data-testid="add-card-went-well"]'))
      .toBeDisabled()
  })
})
```

---

## 📁 Files to Create

```
tests/e2e/
├── helpers.ts
├── completeRetroSession.spec.ts
├── cardQuota.spec.ts
├── anonymousPrivacy.spec.ts
└── boardLifecycle.spec.ts

playwright.config.ts
```

---

## 🧪 Test Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Complete Retro Session | ~3 | Multi-user, real-time |
| Card Quota | ~3 | Limits, exemptions |
| Anonymous Privacy | ~3 | Hide identity, ownership |
| Board Lifecycle | ~2 | Create, rename, close |
| **Total** | **~11** | |

---

## ✅ Acceptance Criteria

- [ ] Tests run against real backend
- [ ] Multi-user scenarios work
- [ ] Real-time sync verified
- [ ] Tests pass in CI environment
- [ ] Screenshots captured on failure

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Previous: Phase 4](./TEST_PHASE_04_INTEGRATION.md) | [Next: Phase 6 →](./TEST_PHASE_06_REALTIME.md)
