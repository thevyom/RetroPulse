# Phase 8: Polish & Production Readiness

**Status**: ✅ COMPLETE
**Priority**: Medium
**Tasks**: 14/14 complete + 12 QA/PE fixes
**Dependencies**: Phase 7 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Harden the application for production use. This includes comprehensive error handling, optimistic updates with rollback, performance optimizations, accessibility improvements, and CI/CD pipeline setup.

---

## 📋 Task Breakdown

### 22. Phase 7 Carryover Items (from PE Review)

> These items were identified during Phase 7 Principal Engineer review and deferred to Phase 8.

#### 22.1 Replace Fixed Timeouts in E2E Tests

- [ ] Replace `waitForTimeout(1000)` with proper assertions (~15 locations)
- [ ] Replace `waitForTimeout(500)` with state-based waits (~10 locations)
- [ ] Replace `waitForTimeout(100)` with visibility checks

**Pattern to use:**
```typescript
// Instead of:
await page.waitForTimeout(1000);

// Use:
await expect(page.locator('[data-testid="expected-element"]')).toBeVisible();
// or
await page.waitForSelector('text="Expected Text"');
```

**Files to update:**
- `tests/e2e/retro-session.spec.ts`
- `tests/e2e/drag-drop.spec.ts`
- `tests/e2e/parent-child-cards.spec.ts`
- `tests/e2e/card-quota.spec.ts`
- `tests/e2e/sorting-filtering.spec.ts`
- `tests/e2e/admin-operations.spec.ts`
- `tests/e2e/tablet-viewport.spec.ts`
- `tests/e2e/board-lifecycle.spec.ts`

**Reference**: CR_PHASE_07_E2ETesting.md - Critical Finding #4

---

#### 22.2 Create E2E Test Documentation

- [ ] Create `frontend/tests/e2e/README.md`
- [ ] Document prerequisites (backend on 3001, frontend on 5173)
- [ ] Document commands to run E2E tests
- [ ] Add troubleshooting section
- [ ] Document environment variables

**README Template:**
```markdown
# E2E Tests

## Prerequisites
1. Backend running on port 3001
2. Frontend dev server on port 5173

## Running Tests
\`\`\`bash
# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm run dev

# Run E2E tests (terminal 3)
cd frontend && npm run test:e2e
\`\`\`

## Troubleshooting
- If tests skip, check backend health at http://localhost:3001/health
- Global setup auto-detects backend availability
```

**Reference**: CR_PHASE_07_E2ETesting.md - Critical Finding #2

---

#### 22.3 Use UUID for E2E Test Board Isolation

- [ ] Add uuid dependency if not present
- [ ] Update `helpers.ts` to use UUID for board IDs
- [ ] Update `global-setup.ts` to generate UUID-based board ID
- [ ] Verify parallel test isolation works

**Pattern:**
```typescript
import { v4 as uuidv4 } from 'uuid';
const testBoardId = `e2e-${uuidv4()}`;
```

**Reference**: CR_PHASE_07_E2ETesting.md - Gap Analysis

---

#### 22.4 Implement Global Teardown for E2E Tests

- [ ] Create `frontend/tests/e2e/global-teardown.ts`
- [ ] Call `/v1/boards/{boardId}/test/clear` endpoint
- [ ] Clean up test data created during test run
- [ ] Enable in `playwright.config.ts`

**Reference**: CR_PHASE_07_E2ETesting.md - Critical Finding #3

---

#### 22.5 Performance Optimizations (Carried from Phase 5-6)

- [ ] Memoize card filtering in `RetroBoardPage.tsx`
- [ ] Add column type enum instead of string-based detection
- [ ] Add toast notifications instead of `console.error` in drag handlers

**Reference**: CR_PHASE_05_ViewComponents.md, CR_PHASE_06_IntegrationRealtime.md

---

### 23. Error Handling & Edge Cases

#### 23.1 Implement Error Handling in All ViewModels

- [ ] Wrap API calls in try/catch
- [ ] Set error state on failure
- [ ] Show user-friendly error messages
- [ ] Implement retry logic for transient errors

**Error Handling Pattern:**
```typescript
async function handleCreateCard(data: CreateCardDTO) {
  setError(null);
  setIsLoading(true);

  try {
    const card = await cardAPI.createCard(boardId, data);
    addCard(card);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        setError('Rate limit exceeded. Please wait and try again.');
      } else if (error.status === 409) {
        setError('Board is closed. No new cards can be added.');
      } else {
        setError(error.message);
      }
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
    throw error; // Re-throw for component handling
  } finally {
    setIsLoading(false);
  }
}
```

**Reference**: Error handling best practices

---

#### 23.2 Implement Optimistic Updates with Rollback

- [ ] Add card to UI immediately on create
- [ ] Rollback if API fails
- [ ] Show error notification

**Optimistic Update Pattern:**
```typescript
async function handleCreateCard(data: CreateCardDTO) {
  // 1. Create optimistic card with temp ID
  const tempId = `temp-${Date.now()}`;
  const optimisticCard = {
    id: tempId,
    ...data,
    created_at: new Date().toISOString(),
    _isOptimistic: true,
  };

  // 2. Add to store immediately
  addCard(optimisticCard);

  try {
    // 3. Call API
    const realCard = await cardAPI.createCard(boardId, data);

    // 4. Replace temp with real
    removeCard(tempId);
    addCard(realCard);
  } catch (error) {
    // 5. Rollback on error
    removeCard(tempId);
    showNotification('Failed to create card', 'error');
    throw error;
  }
}
```

**Reference**: Test plan Section 8.2

---

#### 23.3 Test Error Scenarios

- [ ] Test network errors (500, timeout)
- [ ] Test validation errors (400)
- [ ] Test authorization errors (403)
- [ ] Test not found errors (404)
- [ ] Test conflict errors (409 - board closed)

**Error Scenario Tests:**
```typescript
describe('Error handling', () => {
  it('shows error on network failure', async () => {
    server.use(
      rest.post('/api/boards/:id/cards', (req, res) => {
        return res.networkError('Network error');
      })
    );

    render(<RetroColumn {...props} />);
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('shows quota error on 429', async () => {
    server.use(
      rest.post('/api/boards/:id/cards', (req, res, ctx) => {
        return res(ctx.status(429), ctx.json({ error: 'Quota exceeded' }));
      })
    );

    // ...
  });
});
```

**Reference**: Comprehensive error coverage

---

### 24. Performance Optimization

#### 24.1 Implement React.memo for Expensive Components

- [ ] Memoize RetroCard to prevent unnecessary re-renders
- [ ] Memoize ParticipantAvatar
- [ ] Use useMemo for sorted/filtered card arrays
- [ ] Use useCallback for event handlers passed to children

**Memoization Pattern:**
```typescript
// RetroCard.tsx
export const RetroCard = React.memo(function RetroCard(props: RetroCardProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.content === nextProps.card.content &&
    prevProps.card.aggregated_reaction_count === nextProps.card.aggregated_reaction_count &&
    prevProps.hasReacted === nextProps.hasReacted
  );
});

// In useCardViewModel
const sortedCards = useMemo(() => {
  return sortCards(cards, sortMode, sortDirection);
}, [cards, sortMode, sortDirection]);

const handleReact = useCallback(async (cardId: string) => {
  await reactionAPI.addReaction(boardId, cardId);
}, [boardId]);
```

**Reference**: Performance best practices

---

#### 24.2 Optimize WebSocket Event Handling

- [ ] Debounce heartbeat events
- [ ] Batch state updates from multiple events
- [ ] Prevent duplicate subscriptions

**WebSocket Optimization:**
```typescript
// Debounce rapid events
const debouncedUpdateCards = useMemo(
  () => debounce((cards: Card[]) => setCards(cards), 100),
  []
);

// Batch updates
useEffect(() => {
  const socket = getSocket();
  let pendingUpdates: CardUpdate[] = [];
  let flushTimeout: NodeJS.Timeout;

  const handleCardUpdate = (update: CardUpdate) => {
    pendingUpdates.push(update);

    clearTimeout(flushTimeout);
    flushTimeout = setTimeout(() => {
      batchUpdateCards(pendingUpdates);
      pendingUpdates = [];
    }, 50);
  };

  socket.on('card:updated', handleCardUpdate);

  return () => {
    clearTimeout(flushTimeout);
    socket.off('card:updated', handleCardUpdate);
  };
}, []);
```

**Reference**: Real-time performance

---

### 25. Accessibility & UX Polish

#### 25.1 Add ARIA Labels for UX Testing

- [ ] Label all interactive elements (buttons, inputs)
- [ ] Add role attributes where needed
- [ ] Ensure focus management for dialogs
- [ ] Add aria-busy for loading states

**Accessibility Patterns:**
```typescript
// Button with label
<IconButton
  aria-label="Add new card"
  aria-disabled={!canCreateCard}
  onClick={handleOpenDialog}
>
  <AddIcon />
</IconButton>

// Loading state
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Spinner /> : <CardList />}
</div>

// Dialog focus management
<Dialog
  open={open}
  onClose={onClose}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogTitle id="dialog-title">Create Card</DialogTitle>
  <DialogContent id="dialog-description">
    {/* ... */}
  </DialogContent>
</Dialog>
```

**Reference**: Test plan accessibility notes

---

#### 25.2 Implement Keyboard Shortcuts (Basic)

- [ ] Escape to close dialogs
- [ ] Enter to submit forms
- [ ] Tab navigation through interactive elements

**Keyboard Handler:**
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isDialogOpen) {
      closeDialog();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isDialogOpen]);
```

**Reference**: UX polish

---

### 26. CI/CD Integration

#### 26.1 Create GitHub Actions Workflow

- [ ] Create `.github/workflows/test.yml`
- [ ] Run unit tests on every commit
- [ ] Run integration tests on pull requests
- [ ] Run E2E tests on merge to main
- [ ] Upload coverage reports

**GitHub Actions Workflow:**
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
```

**Reference**: Test plan Section 10.1

---

#### 26.2 Set up Pre-commit Hooks

- [ ] Install Husky
- [ ] Run linter on pre-commit
- [ ] Run unit tests on changed files
- [ ] Run type check

**Husky Setup:**
```bash
# Install
pnpm add -D husky lint-staged
npx husky init

# .husky/pre-commit
pnpm lint-staged
pnpm typecheck
```

**lint-staged config:**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

**Reference**: Test plan Section 10.4

---

## 📁 Files to Create/Modify

```
.github/
└── workflows/
    └── test.yml

.husky/
└── pre-commit

src/features/
├── */viewmodels/*.ts          (error handling, optimistic updates)
└── */components/*.tsx         (memoization, a11y)

package.json                   (lint-staged config)
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Error scenarios | ~5 | HTTP errors, rollback |
| E2E timeout fixes | ~25 | Replace fixed waits |
| Performance | - | Manual profiling |
| Accessibility | - | Automated a11y tests |
| **Total** | **~30** | |

---

## ✅ Acceptance Criteria

### Phase 7 Carryover
- [x] E2E tests use proper waits instead of fixed timeouts
- [x] E2E README documentation exists
- [x] UUID-based test board isolation implemented
- [x] Global teardown cleans test data
- [x] Card filtering memoized

### Phase 8 Core
- [x] All API errors handled gracefully
- [x] Optimistic updates work with rollback
- [x] No unnecessary re-renders (React DevTools check)
- [x] All interactive elements have ARIA labels
- [x] CI pipeline runs on every PR
- [x] Pre-commit hooks prevent bad commits

### QA/PE/UX Review Fixes (Post Phase 8)
- [x] ErrorBoundary integrated at App level (PE Critical)
- [x] Toast notifications added via sonner (PE + UX)
- [x] Column background colors (pastel per column type)
- [x] Card background colors (darker shades per column type)
- [x] Aggregated reaction count label for parent cards
- [x] Responsive columns with min-width flex
- [x] React.memo on ParticipantAvatar and ParticipantBar
- [x] Typecheck added to pre-commit hook
- [x] Global-teardown admin secret security fix
- [x] CI backend startup race condition fix with health check

---

## 📝 Notes

- Use React DevTools Profiler to identify render bottlenecks
- Consider lighthouse audit for accessibility score
- Husky v9 has new init command
- Coverage thresholds should be enforced in CI

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 7](./FRONTEND_PHASE_07_E2E_TESTING.md) | [Next: Phase 9 →](./FRONTEND_PHASE_09_DOCUMENTATION.md)
