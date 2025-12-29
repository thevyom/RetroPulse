# Phase 7: End-to-End Integration Testing

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/10 complete
**Dependencies**: Phase 6 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement comprehensive testing at two levels: (1) Integration tests using MSW to mock API responses while testing real ViewModels and stores, and (2) E2E tests using Playwright to test the full stack including backend and real-time features.

---

## 📋 Task Breakdown

### 21. Integration Tests with MSW

#### 21.1 Set up MSW for API Mocking

- [ ] Create `tests/mocks/handlers.ts`
- [ ] Mock all BoardAPI endpoints
- [ ] Mock all CardAPI endpoints
- [ ] Mock all ReactionAPI endpoints
- [ ] Return realistic test data

**MSW Handler Setup:**
```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Board endpoints
  rest.post('/api/boards', (req, res, ctx) => {
    return res(ctx.json({
      id: 'board-123',
      name: req.body.name,
      columns: ['Went Well', 'To Improve', 'Action Items'],
      state: 'active',
      admins: ['user-hash-1'],
      created_at: new Date().toISOString(),
    }));
  }),

  rest.get('/api/boards/:boardId', (req, res, ctx) => {
    return res(ctx.json({
      id: req.params.boardId,
      name: 'Test Retrospective',
      columns: ['Went Well', 'To Improve', 'Action Items'],
      state: 'active',
      admins: ['user-hash-1'],
    }));
  }),

  // Card endpoints
  rest.get('/api/boards/:boardId/cards', (req, res, ctx) => {
    return res(ctx.json([
      { id: 'card-1', content: 'Test card 1', column_type: 'went_well' },
      { id: 'card-2', content: 'Test card 2', column_type: 'to_improve' },
    ]));
  }),

  rest.post('/api/boards/:boardId/cards', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.json({
      id: 'new-card-' + Date.now(),
      ...body,
      created_at: new Date().toISOString(),
    }));
  }),

  // Quota endpoints
  rest.get('/api/boards/:boardId/users/me/quota/card', (req, res, ctx) => {
    return res(ctx.json({ used: 1, limit: 2 }));
  }),

  // ... more handlers
];
```

**Reference**: Test plan Section 6

---

#### 21.2 Write Card Creation Integration Test

- [ ] Test full flow: quota check → dialog → create → card appears
- [ ] Use real ViewModels (not mocked)
- [ ] Verify API calls with MSW

**Test Example:**
```typescript
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

const server = setupServer(...handlers);

describe('Card creation flow', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates a card and adds it to the column', async () => {
    render(<RetroBoardPage />);

    // Wait for board to load
    await screen.findByText('Test Retrospective');

    // Click add card button
    const addButton = screen.getByRole('button', { name: /add card/i });
    await userEvent.click(addButton);

    // Fill dialog
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'New card content');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    // Verify card appears
    expect(await screen.findByText('New card content')).toBeInTheDocument();
  });
});
```

**Reference**: Test plan Section 6.1

---

#### 21.3 Write Parent-Child Linking Integration Test

- [ ] Test drag child onto parent
- [ ] Verify aggregation updates
- [ ] Test unlink functionality

**Reference**: Test plan Section 6.2

---

#### 21.4 Write Card Quota Enforcement Integration Test

- [ ] Test quota check before creation
- [ ] Test creation blocked at limit
- [ ] Test action cards exempt from limit

**Reference**: Test plan Section 6.1

---

#### 21.5 Write Reaction Quota Integration Test

- [ ] Test reaction quota check
- [ ] Test reaction limit enforcement
- [ ] Test board isolation (quota per board)

**Reference**: Test plan Section 6.2

---

### 22. Playwright E2E Tests

#### 22.1 Set up Playwright Configuration

- [ ] Create `playwright.config.ts`
- [ ] Configure test directory and browsers
- [ ] Set up webServer for dev mode
- [ ] Create E2E test helpers (createBoard, joinBoard, createCard)

**Playwright Config:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Helpers:**
```typescript
// tests/e2e/helpers.ts
import { Page } from '@playwright/test';

export async function createBoard(page: Page, name: string) {
  await page.goto('/');
  await page.fill('[data-testid="board-name-input"]', name);
  await page.click('[data-testid="create-board-button"]');
  await page.waitForURL(/\/board\//);
  return page.url().split('/board/')[1];
}

export async function createCard(page: Page, column: string, content: string) {
  await page.click(`[data-testid="add-card-${column}"]`);
  await page.fill('[data-testid="card-content-input"]', content);
  await page.click('[data-testid="create-card-submit"]');
  await page.waitForSelector(`text="${content}"`);
}

export async function joinBoard(page: Page, boardId: string) {
  await page.goto(`/board/${boardId}`);
  await page.waitForSelector('[data-testid="board-header"]');
}
```

**Reference**: Test plan Section 7.2

---

#### 22.2 Write E2E: Complete Retro Session

- [ ] Test 3 users join board
- [ ] Test all users see each other in real-time
- [ ] Test card creation from different users
- [ ] Test real-time card sync
- [ ] Test parent-child linking via drag-drop
- [ ] Test reactions with real-time updates
- [ ] Test board closure

**Multi-User Test Pattern:**
```typescript
import { test, expect, chromium } from '@playwright/test';
import { createBoard, joinBoard, createCard } from './helpers';

test('complete retro session with 3 users', async ({ browser }) => {
  // Create 3 browser contexts (simulates 3 users)
  const user1 = await browser.newPage();
  const user2 = await browser.newPage();
  const user3 = await browser.newPage();

  // User 1 creates board
  const boardId = await createBoard(user1, 'Team Retro');

  // Users 2 and 3 join
  await joinBoard(user2, boardId);
  await joinBoard(user3, boardId);

  // Verify all see each other
  for (const page of [user1, user2, user3]) {
    await expect(page.locator('[data-testid="participant-count"]')).toHaveText('3');
  }

  // User 1 creates a card
  await createCard(user1, 'went-well', 'Great teamwork!');

  // Verify all users see the card
  for (const page of [user2, user3]) {
    await expect(page.locator('text="Great teamwork!"')).toBeVisible();
  }

  // User 1 closes board
  await user1.click('[data-testid="close-board-button"]');
  await user1.click('[data-testid="confirm-close"]');

  // Verify all see closed state
  for (const page of [user1, user2, user3]) {
    await expect(page.locator('[data-testid="board-closed-indicator"]')).toBeVisible();
  }
});
```

**Reference**: Test plan Section 7.3

---

#### 22.3 Write E2E: Card Quota Enforcement

- [ ] Test create 2 cards (limit=2)
- [ ] Test 3rd card blocked with error
- [ ] Test action card creation succeeds
- [ ] Test delete card frees quota

**Reference**: Test plan Section 7.4

---

#### 22.4 Write E2E: Anonymous Card Privacy

- [ ] Test anonymous card hides creator name
- [ ] Test public card shows creator
- [ ] Test user can delete own anonymous card

**Reference**: Test plan Section 7.5

---

#### 22.5 Write E2E: Drag-and-Drop Interactions

- [ ] Test drag card to create parent-child (Playwright dragTo API)
- [ ] Test link icon appears after linking
- [ ] Test drag action card onto feedback card
- [ ] Test verify no gap between parent and child

**Playwright Drag Test:**
```typescript
test('drag to create parent-child relationship', async ({ page }) => {
  await page.goto(`/board/${boardId}`);

  const childCard = page.locator('[data-testid="card-child-id"]');
  const parentCard = page.locator('[data-testid="card-parent-id"]');

  await childCard.dragTo(parentCard);

  // Verify link icon appears on child
  await expect(childCard.locator('[data-testid="link-icon"]')).toBeVisible();

  // Verify no gap between parent and child
  const parentBox = await parentCard.boundingBox();
  const childBox = await childCard.boundingBox();
  expect(childBox.y).toBe(parentBox.y + parentBox.height);
});
```

**Reference**: Test plan Section 9.2

---

## 📁 Files to Create

```
tests/
├── mocks/
│   ├── handlers.ts
│   └── server.ts
├── integration/
│   ├── card-creation.test.ts
│   ├── parent-child-linking.test.ts
│   ├── card-quota.test.ts
│   └── reaction-quota.test.ts
└── e2e/
    ├── helpers.ts
    ├── retro-session.spec.ts
    ├── card-quota.spec.ts
    ├── anonymous-cards.spec.ts
    └── drag-drop.spec.ts

playwright.config.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| MSW Integration | ~5 | API mocking, full flows |
| E2E: Retro session | ~7 | Multi-user real-time |
| E2E: Quotas | ~4 | Limit enforcement |
| E2E: Anonymous | ~3 | Privacy features |
| E2E: Drag-drop | ~4 | Visual interactions |
| **Total** | **~23** | |

---

## ✅ Acceptance Criteria

- [ ] MSW handlers cover all API endpoints
- [ ] Integration tests run in isolation
- [ ] E2E tests work with real backend
- [ ] Multi-user scenarios tested
- [ ] All tests pass in CI environment
- [ ] Test coverage report generated

---

## 🧪 Related Test Plans

- [TEST_PHASE_04_INTEGRATION.md](../test-docs/TEST_PHASE_04_INTEGRATION.md) - MSW handlers, integration test patterns
- [TEST_PHASE_05_E2E.md](../test-docs/TEST_PHASE_05_E2E.md) - Playwright setup, E2E test examples

---

## 📝 Notes

- MSW v2 has new API syntax - use latest docs
- Playwright tests require running backend
- Use `test.describe.serial` for dependent tests
- Consider test data cleanup between runs

---

[← Back to Master Task List](./FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 6](./FRONTEND_PHASE_06_INTEGRATION_REALTIME.md) | [Next: Phase 8 →](./FRONTEND_PHASE_08_POLISH_PRODUCTION.md)
