# E2E Tests

End-to-end tests for RetroPulse frontend using Playwright.

## Prerequisites

1. **Backend** running on port 3001
2. **Frontend** dev server on port 5173
3. **MongoDB** connection (backend dependency)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_BACKEND_READY` | Set automatically by global-setup when backend is available | `false` |
| `TEST_BOARD_ID` | Board ID to use for tests | `test-board-e2e` |
| `BASE_URL` | Frontend URL | `http://localhost:5173` |

## Running Tests

### Quick Start

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run E2E tests
cd frontend && npm run test:e2e
```

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/retro-session.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug mode
npx playwright test --debug
```

## Test Structure

```
tests/e2e/
├── helpers.ts              # Shared helper functions
├── global-setup.ts         # Backend health check before tests
├── global-teardown.ts      # Cleanup after tests (if implemented)
├── retro-session.spec.ts   # Multi-user retro session tests
├── drag-drop.spec.ts       # Drag-and-drop interactions
├── parent-child-cards.spec.ts  # Card linking tests
├── card-quota.spec.ts      # Quota enforcement tests
├── sorting-filtering.spec.ts   # Sort and filter UI tests
├── admin-operations.spec.ts    # Admin permissions tests
├── tablet-viewport.spec.ts     # Responsive layout tests
├── accessibility-basic.spec.ts # Keyboard and ARIA tests
├── anonymous-cards.spec.ts     # Privacy feature tests
└── board-lifecycle.spec.ts     # Board creation/closing tests
```

## Helper Functions

All tests import from `helpers.ts`:

```typescript
// Board operations
createBoard(page, name)         // Create new board
joinBoard(page, boardId, alias) // Join existing board
waitForBoardLoad(page)          // Wait for columns to render
closeBoard(page)                // Close board (admin only)
isBoardClosed(page)             // Check if board is closed

// Card operations
createCard(page, columnId, content, options)  // Create a card
findCardByContent(page, content)              // Find card locator
deleteCard(page, content)                     // Delete a card
addReaction(page, cardContent)                // Add reaction to card
getReactionCount(page, cardContent)           // Get reaction count

// Drag-and-drop
dragCardOntoCard(page, source, target)  // Link cards via drag
dragCardToColumn(page, content, colId)  // Move card to column
isCardLinked(page, content)             // Check if card has parent
isCardInColumn(page, content, colId)    // Check card location

// Wait helpers (replace waitForTimeout)
waitForCardLinked(page, content)        // Wait for link icon
waitForCardUnlinked(page, content)      // Wait for link icon to disappear
waitForReactionCount(page, content, n)  // Wait for reaction count
waitForParticipantCount(page, n)        // Wait for participant avatars
waitForBoardClosed(page)                // Wait for closed state
waitForAdminBadge(page)                 // Wait for admin promotion
```

## Test Patterns

### Multi-User Tests

```typescript
test('two users see updates in real-time', async ({ browser }) => {
  // Create separate browser contexts for each user
  const user1Context = await browser.newContext();
  const user2Context = await browser.newContext();

  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  try {
    // Both users join the same board
    await user1Page.goto(`/boards/${boardId}`);
    await user2Page.goto(`/boards/${boardId}`);

    // User 1 creates a card
    await createCard(user1Page, 'col-1', 'Hello from User 1');

    // User 2 should see it via WebSocket
    await expect(user2Page.locator('text="Hello from User 1"')).toBeVisible();
  } finally {
    // Always clean up contexts
    await user1Context.close();
    await user2Context.close();
  }
});
```

### Waiting for State Changes

```typescript
// DON'T use fixed timeouts
await page.waitForTimeout(1000); // BAD

// DO use proper assertions
await waitForCardLinked(page, content);           // Wait for link icon
await expect(locator).toBeVisible();              // Wait for element
await page.waitForLoadState('networkidle');       // Wait for API calls
await page.waitForSelector('text="Expected"');   // Wait for text
```

## Troubleshooting

### Tests Skip Immediately

**Symptom:** All tests show "skipped" status

**Cause:** Backend not available at `http://localhost:3001/health`

**Solution:**
1. Start backend: `cd backend && npm run dev`
2. Check health endpoint: `curl http://localhost:3001/health`
3. Re-run tests

### Backend Health Check Fails

**Symptom:** Global setup reports "Backend not available"

**Check:**
1. Backend is running on port 3001
2. MongoDB is connected
3. Health endpoint responds: `curl http://localhost:3001/health`

### Tests Flaky or Timeout

**Common Causes:**
- Slow network/API responses
- Race conditions with WebSocket updates
- DOM not ready before assertion

**Solutions:**
1. Use helper wait functions instead of timeouts
2. Increase test timeout in `playwright.config.ts`
3. Use `expect().toPass({ timeout })` for retrying assertions

### Multi-User Tests Fail

**Symptom:** WebSocket updates not propagating between users

**Check:**
1. Socket.io server is running
2. Both users successfully joined board
3. Use `waitForParticipantCount()` to verify join

### Visual Tests Fail in CI

**Cause:** Different font rendering on CI server

**Solution:**
1. Use tolerance in visual comparisons
2. Use bounding box assertions instead of screenshots
3. Avoid pixel-perfect assertions

## CI Integration

Add to `.github/workflows/test.yml`:

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  services:
    mongodb:
      image: mongo:6
      ports:
        - 27017:27017

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'

    # Install Playwright browsers
    - run: npx playwright install --with-deps chromium

    # Start backend
    - name: Start backend
      run: |
        cd backend
        npm install
        npm run dev &
        sleep 5

    # Start frontend
    - name: Start frontend
      run: |
        cd frontend
        npm install
        npm run dev &
        sleep 5

    # Run E2E tests
    - name: Run E2E tests
      run: cd frontend && npm run test:e2e

    # Upload test results on failure
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

## Adding New Tests

1. Create new spec file in `tests/e2e/`
2. Import helpers from `./helpers`
3. Use `test.skip(!process.env.E2E_BACKEND_READY)` at start
4. Follow existing patterns for multi-user tests
5. Use wait helpers instead of timeouts
