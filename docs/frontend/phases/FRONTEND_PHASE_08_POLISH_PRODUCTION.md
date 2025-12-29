# Phase 8: Polish & Production Readiness

**Status**: 🔲 NOT STARTED
**Priority**: Medium
**Tasks**: 0/10 complete
**Dependencies**: Phase 7 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Harden the application for production use. This includes comprehensive error handling, optimistic updates with rollback, performance optimizations, accessibility improvements, and CI/CD pipeline setup.

---

## 📋 Task Breakdown

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
| Performance | - | Manual profiling |
| Accessibility | - | Automated a11y tests |
| **Total** | **~5** | |

---

## ✅ Acceptance Criteria

- [ ] All API errors handled gracefully
- [ ] Optimistic updates work with rollback
- [ ] No unnecessary re-renders (React DevTools check)
- [ ] All interactive elements have ARIA labels
- [ ] CI pipeline runs on every PR
- [ ] Pre-commit hooks prevent bad commits

---

## 📝 Notes

- Use React DevTools Profiler to identify render bottlenecks
- Consider lighthouse audit for accessibility score
- Husky v9 has new init command
- Coverage thresholds should be enforced in CI

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 7](./FRONTEND_PHASE_07_E2E_TESTING.md) | [Next: Phase 9 →](./FRONTEND_PHASE_09_DOCUMENTATION.md)
