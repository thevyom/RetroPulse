# RetroPulse E2E Testing Plan

## Overview

This document describes the end-to-end testing strategy for RetroPulse, a collaborative retrospective board application. The E2E testing infrastructure uses Docker containers for consistent, reproducible test environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Docker Test Network                            │
│                                                                      │
│   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│   │   MongoDB    │◄───│    Backend     │◄───│    Frontend      │   │
│   │   :27017     │    │    :3001       │    │    :5173         │   │
│   │              │    │   (Express)    │    │   (Vite Dev)     │   │
│   └──────────────┘    └────────────────┘    └──────────────────┘   │
│          ▲                    ▲                      ▲              │
│          │                    │                      │              │
│   ┌──────┴──────┐            │                      │              │
│   │Mongo Express│            │                      │              │
│   │   :8081     │            │                      │              │
│   └─────────────┘            │                      │              │
└──────────────────────────────┼──────────────────────┼──────────────┘
                               │                      │
                        ┌──────┴──────┐        ┌──────┴──────┐
                        │  Backend    │        │  Playwright │
                        │  Vitest     │        │  E2E Tests  │
                        │  (in-mem)   │        │             │
                        └─────────────┘        └─────────────┘
```

## Test Infrastructure

### Docker Services

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| MongoDB | retropulse-test-mongodb | 27017 | Test database |
| Mongo Express | retropulse-test-mongo-express | 8081 | DB admin UI |
| Backend | retropulse-test-backend | 3001 | REST API + WebSocket |

### Environment Configuration

The test environment uses these key variables:

```env
# Database
MONGODB_URL=mongodb://admin:testpassword@mongodb:27017
MONGODB_DATABASE=retroboard_test

# Backend
NODE_ENV=test
ADMIN_SECRET_KEY=dev-admin-secret-16chars
COOKIE_SECRET=test-cookie-secret-32chars-here

# Frontend
VITE_API_URL=http://localhost:3001/v1
VITE_SOCKET_URL=http://localhost:3001
```

## Test Suites

### Backend Tests (Vitest)

Located in `backend/tests/`:

| Suite | File | Description |
|-------|------|-------------|
| Unit | `tests/unit/**/*.test.ts` | Repository, service, utility tests |
| Integration | `tests/integration/**/*.test.ts` | API endpoint tests with DB |
| E2E | `tests/e2e/**/*.test.ts` | Full workflow tests |

#### Backend E2E Test Files

| File | Coverage |
|------|----------|
| `admin-workflows.test.ts` | Admin API: clear, reset, seed |
| `board-lifecycle.test.ts` | Create, join, close, reopen |
| `websocket.test.ts` | Real-time connectivity |
| `concurrent-users.test.ts` | Multi-user synchronization |
| `anonymous-privacy.test.ts` | Anonymity enforcement |

### Frontend E2E Tests (Playwright)

Located in `frontend/tests/e2e/`:

| File | Coverage |
|------|----------|
| `accessibility-basic.spec.ts` | Keyboard navigation, ARIA |
| `admin-operations.spec.ts` | Admin permissions |
| `board-lifecycle.spec.ts` | Board CRUD operations |
| `card-quota.spec.ts` | Card limit enforcement |
| `drag-drop.spec.ts` | DnD interactions |
| `parent-child-cards.spec.ts` | Card linking |
| `retro-session.spec.ts` | Multi-user scenarios |
| `sorting-filtering.spec.ts` | Sort/filter UI |
| `tablet-viewport.spec.ts` | Responsive layout |

## Running Tests

### Quick Start (Windows)

```powershell
# Run all tests and leave services up
.\scripts\run-e2e-tests.ps1

# Skip backend tests
.\scripts\run-e2e-tests.ps1 -SkipBackendTests

# Clean start (remove old containers)
.\scripts\run-e2e-tests.ps1 -CleanStart
```

### Quick Start (Linux/Mac)

```bash
# Make script executable
chmod +x scripts/run-e2e-tests.sh

# Run all tests
./scripts/run-e2e-tests.sh

# Skip frontend tests
./scripts/run-e2e-tests.sh --skip-frontend

# Clean start
./scripts/run-e2e-tests.sh --clean
```

### Manual Execution

```bash
# 1. Start containers
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for health
curl http://localhost:3001/health

# 3. Start frontend (in frontend/ directory)
cd frontend && npm run dev

# 4. Run backend tests (in backend/ directory)
cd backend && pnpm test

# 5. Run frontend E2E (in frontend/ directory)
cd frontend && npm run test:e2e
```

## Test Helpers

### Frontend E2E Helpers

Located in `frontend/tests/e2e/helpers.ts`:

```typescript
// Board operations
createBoard(page)           // Create new board, return board ID
joinBoard(page, boardId)    // Join existing board

// Card operations
addCard(page, column, text) // Add card to column
editCard(page, cardId)      // Edit existing card
deleteCard(page, cardId)    // Delete card

// Reactions
addReaction(page, cardId, emoji)    // Add reaction
removeReaction(page, cardId, emoji) // Remove reaction

// Drag and drop
dragCard(page, from, to)    // Move card between columns

// Verification
waitForParticipant(page, count)  // Wait for participant count
waitForCardCount(page, count)    // Wait for card count
```

### Admin API Endpoints

For test setup and cleanup:

```bash
# Clear all board data
POST /v1/boards/:id/test/clear
X-Admin-Secret: dev-admin-secret-16chars

# Reset board (clear + reopen)
POST /v1/boards/:id/test/reset
X-Admin-Secret: dev-admin-secret-16chars

# Seed test data
POST /v1/boards/:id/test/seed
X-Admin-Secret: dev-admin-secret-16chars
Content-Type: application/json

{
  "num_users": 5,
  "num_cards": 20,
  "num_action_cards": 5,
  "num_reactions": 30,
  "create_relationships": true
}
```

## Test Data Isolation

Each test run is isolated using:

1. **Session ID**: Unique identifier per test run
2. **Board Prefix**: All test boards use `e2e-` prefix
3. **Global Teardown**: Cleanup via admin API after tests
4. **Docker Volumes**: Separate volume for test data

## Coverage Requirements

### Backend

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

### Frontend

| Metric | Threshold |
|--------|-----------|
| Statements | 75% |
| Branches | 70% |
| Functions | 75% |
| Lines | 75% |

## CI/CD Integration

### GitHub Actions

Frontend CI runs E2E on main branch:

```yaml
e2e-tests:
  if: github.ref == 'refs/heads/main'
  needs: [lint-and-typecheck, unit-tests, build]
  runs-on: ubuntu-latest
  services:
    mongodb:
      image: mongo:6
      ports:
        - 27017:27017
```

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `ADMIN_SECRET` | Admin API authentication |

## Debugging

### View Container Logs

```bash
# Backend logs
docker-compose -f docker-compose.test.yml logs -f backend

# MongoDB logs
docker-compose -f docker-compose.test.yml logs -f mongodb

# All logs
docker-compose -f docker-compose.test.yml logs -f
```

### Playwright Debug Mode

```bash
# Run with browser visible
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- board-lifecycle.spec.ts

# Generate trace on failure
npm run test:e2e -- --trace on
```

### MongoDB Admin

Access Mongo Express at http://localhost:8081 to:
- View collections and documents
- Query test data
- Monitor database state

## Test Report

After running tests, view results at:
- **Report File**: `docs/DEV-TEST-REPORT.md`
- **Playwright Report**: `frontend/playwright-report/index.html`
- **Coverage Report**: `frontend/coverage/index.html`

## Cleanup

```bash
# Stop containers (preserve data)
docker-compose -f docker-compose.test.yml down

# Stop and remove data
docker-compose -f docker-compose.test.yml down -v

# Remove all test artifacts
docker-compose -f docker-compose.test.yml down -v --rmi local
```

## Troubleshooting

### Backend won't start

```bash
# Check MongoDB is healthy
docker-compose -f docker-compose.test.yml ps
docker-compose -f docker-compose.test.yml logs mongodb

# Rebuild backend
docker-compose -f docker-compose.test.yml up -d --build backend
```

### Port conflicts

```bash
# Check what's using ports
netstat -an | findstr "3001 5173 27017 8081"

# Kill conflicting processes or change ports in docker-compose.test.yml
```

### Playwright tests fail immediately

```bash
# Install browsers
cd frontend && npx playwright install chromium

# Check backend health
curl http://localhost:3001/health
```

### Tests timeout

1. Increase timeout in `playwright.config.ts`
2. Check network connectivity between containers
3. Verify backend isn't rate-limiting

---

*Last updated: 2025-12-31*
