# E2E Test Setup Guide

**Created**: 2026-01-06
**Author**: Principal Engineer
**Phase**: 8.8
**Backend Environment**: Podman Container

---

## Prerequisites

- Node.js 18+
- Podman (for backend container)
- Git

---

## Quick Start

### 1. Start Backend (Podman - with rate limiting disabled)

```bash
# IMPORTANT: Disable rate limiting for E2E tests
podman run -e DISABLE_RATE_LIMIT=true -p 3001:3001 retropulse-backend

# Or if using podman-compose
DISABLE_RATE_LIMIT=true podman-compose up backend

# Or pass env var to existing container
podman run --env-file .env.e2e -p 3001:3001 retropulse-backend
```

Create `.env.e2e` file for convenience:
```bash
DISABLE_RATE_LIMIT=true
NODE_ENV=development
```

The backend will start on `http://localhost:3001`.

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`.

### 3. Run E2E Tests

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test 12-participant-bar.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run with debug logging
E2E_LOG_LEVEL=DEBUG npm run test:e2e
```

---

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `DISABLE_RATE_LIMIT` | Set to `true` to disable rate limiting | `false` |
| `NODE_ENV` | Set to `test` also disables rate limiting | `development` |

### Frontend (E2E Tests)

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_LOG_LEVEL` | Logging verbosity: `DEBUG`, `INFO`, `WARN`, `ERROR` | `INFO` |
| `BACKEND_URL` | Backend URL for tests | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL for tests | `http://localhost:5173` |

---

## Test Organization

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `01-board-creation.spec.ts` | Board creation flows | 16 |
| `02-board-lifecycle.spec.ts` | Board state management | 9 |
| `03-retro-session.spec.ts` | Retro session flows | 8 |
| `04-card-quota.spec.ts` | Card limits and anonymous | 9 |
| `05-sorting-filtering.spec.ts` | Sort and filter | 8 |
| `06-parent-child-cards.spec.ts` | Card linking | 8 |
| `07-admin-operations.spec.ts` | Admin features | 6 |
| `08-tablet-viewport.spec.ts` | Responsive design | 9 |
| `09-drag-drop.spec.ts` | Drag and drop | 10 |
| `10-accessibility-basic.spec.ts` | A11y basics | 10 |
| `11-bug-regression.spec.ts` | Bug fix verification | 21 |
| `12-participant-bar.spec.ts` | Phase 8.7 Avatar System | 54 |

### Helper Functions

Key helpers in `tests/e2e/helpers.ts`:

```typescript
// Board loading with alias modal handling
await waitForBoardLoad(page, { alias: 'TestUser' });

// Card creation
await createCard(page, 'What Went Well', 'My card content');

// Card linking
await dragCardOntoCard(page, sourceContent, targetContent);
await waitForCardLinked(page, childContent);

// Rate limit detection
await failIfRateLimited(page);

// Debug logging
e2eLog('context', 'message', 'INFO');
await logPageState(page, 'context');
```

---

## Common Issues

### 1. Rate Limited Error

**Symptom:**
```
Rate limited. Please try again later
```

**Fix:**
Start backend with rate limiting disabled:
```bash
DISABLE_RATE_LIMIT=true npm run dev
```

### 2. Alias Modal Not Closing

**Symptom:**
Tests timeout waiting for board to load, modal stays open.

**Possible Causes:**
- Rate limiting (see above)
- Backend not responding
- Session cookie issues

**Debug:**
```bash
E2E_LOG_LEVEL=DEBUG npm run test:e2e -- 12-participant-bar.spec.ts
```

### 3. Drag-Drop Tests Failing

**Symptom:**
Cards don't link after drag operation.

**Note:**
E2E tests use keyboard-based drag (Space to pick up, Arrow keys to move, Space to drop). This works with @dnd-kit's KeyboardSensor.

**Debug:**
Check the test video in `test-results/` folder.

### 4. Context Menu Not Opening

**Symptom:**
Right-click doesn't show context menu.

**Possible Causes:**
- Radix ContextMenu timing
- Component not using forwardRef

**Fix:**
Tests should wait for menu with `[data-state="open"]`:
```typescript
await page.locator('[data-radix-menu-content][data-state="open"]')
  .waitFor({ state: 'visible' });
```

---

## Test Artifacts

After test run, find artifacts in:

| Artifact | Location |
|----------|----------|
| Screenshots | `frontend/test-results/*/test-failed-*.png` |
| Videos | `frontend/test-results/*/video.webm` |
| Error Context | `frontend/test-results/*/error-context.md` |
| HTML Report | `frontend/playwright-report/index.html` |

### View HTML Report

```bash
cd frontend
npx playwright show-report
```

---

## Writing New Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForBoardLoad, getBoardId } from './helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    const boardId = getBoardId('default');
    await page.goto(`http://localhost:5173/boards/${boardId}`);
    await waitForBoardLoad(page);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('.my-element')).toBeVisible();
  });
});
```

### Using Accessibility Selectors

Prefer accessibility-based selectors:

```typescript
// Good - uses role and accessible name
page.getByRole('button', { name: /join board/i })

// Good - uses test ID
page.getByTestId('join-board-button')

// Good - uses aria-label
page.locator('[aria-label="Unlink from parent card"]')

// Avoid - fragile CSS selectors
page.locator('.btn-primary.submit-btn')
```

### Debug Logging

```typescript
import { e2eLog, logPageState } from './helpers';

test('my test', async ({ page }) => {
  e2eLog('myTest', 'Starting test', 'INFO');

  // ... test steps ...

  // On failure, log page state
  await logPageState(page, 'myTest');
});
```

---

## CI/CD Integration

### GitHub Actions Example (with Podman)

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install Podman
      run: |
        sudo apt-get update
        sudo apt-get install -y podman

    - name: Start MongoDB (Podman)
      run: podman run -d --name mongodb -p 27017:27017 mongo:7

    - name: Build Backend Image
      run: |
        cd backend
        podman build -t retropulse-backend .

    - name: Start Backend (Podman with rate limit disabled)
      run: |
        podman run -d --name backend \
          -e DISABLE_RATE_LIMIT=true \
          -e MONGODB_URI=mongodb://host.containers.internal:27017/retropulse \
          -p 3001:3001 \
          retropulse-backend
        sleep 5

    - name: Install & Build Frontend
      run: |
        cd frontend
        npm ci

    - name: Run E2E Tests
      run: |
        cd frontend
        npx playwright install --with-deps
        npm run test:e2e

    - name: Stop Containers
      if: always()
      run: |
        podman stop backend mongodb || true
        podman rm backend mongodb || true

    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

### Local Podman Commands

```bash
# Build backend image
cd backend && podman build -t retropulse-backend .

# Run backend for E2E tests
podman run -d --name retropulse-backend \
  -e DISABLE_RATE_LIMIT=true \
  -p 3001:3001 \
  retropulse-backend

# Check container logs
podman logs retropulse-backend

# Stop and remove
podman stop retropulse-backend && podman rm retropulse-backend
```

---

*E2E Setup Guide - Phase 8.8*
