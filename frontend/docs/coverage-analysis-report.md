# Frontend Unit/Integration Test Coverage Analysis

**Generated:** 2026-01-01
**Test Framework:** Vitest 4.0.16 with v8 coverage
**Total Tests:** 956 (949 passed, 6 failed, 1 skipped)
**Test Suites:** 37 (34 passed, 3 failed)

---

## Executive Summary

The frontend test suite has **good overall coverage** with 956 tests across 37 test files. However, there are:
- **6 failing tests** that need immediate attention (mostly timeouts)
- **3 source files with no unit tests** that are not excluded from coverage
- **Coverage thresholds configured at 85%** for statements/lines, 82% branches, 80% functions

The coverage report cannot be generated because tests are failing. Once the 6 failing tests are fixed, coverage metrics will be available.

---

## Test Results Summary

### Failing Tests (P0 - Fix Immediately)

| Test File | Test Name | Failure Reason |
|-----------|-----------|----------------|
| `RetroCard.test.tsx` | should have aria-label for full header drag handle | Assertion mismatch - aria-label changed |
| `RetroColumn.test.tsx` | should allow posting anonymously | Timeout (5000ms) |
| `RetroColumn.test.tsx` | should call onEditColumnTitle when new name is submitted | Timeout (5000ms) |
| `CreateBoardDialog.test.tsx` | should clear alias error when user types | Timeout (5000ms) |
| `CreateBoardDialog.test.tsx` | should not navigate on API error | Timeout (5000ms) |
| `CreateBoardDialog.test.tsx` | should mark alias input as invalid when error exists | Timeout (5000ms) |

**Root Cause Analysis:**
1. **RetroCard.test.tsx** - The aria-label has been updated in the source but not in the test. Expected: `"Drag handle - drag card header to move"`, Actual: `"Drag handle - press Space to pick up, arrow keys to move, Space to drop"`
2. **Timeout failures** - Tests involving `userEvent.type()` or complex async interactions are timing out. May need `waitFor` adjustments or increased test timeout.

---

## Coverage by Feature Area

### features/card/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `RetroCard.tsx` | Yes (RetroCard.test.tsx - 90+ tests) | Excellent |
| `RetroColumn.tsx` | Yes (RetroColumn.test.tsx) | Excluded from coverage (E2E tested) |
| `useCardViewModel.ts` | Yes (60 tests) | Excellent |
| `useDragDropViewModel.ts` | Yes | Good |

### features/board/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `RetroBoardPage.tsx` | Yes (2 test files) | Excluded from coverage (E2E tested) |
| `RetroBoardHeader.tsx` | Yes (20 tests) | Excluded from coverage |
| `SortBar.tsx` | Yes (9 tests) | Good |
| `useBoardViewModel.ts` | Yes | Good |

### features/participant/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `ParticipantBar.tsx` | Yes | Good |
| `ParticipantAvatar.tsx` | Yes (29 tests) | Excluded from coverage |
| `ParticipantDropdown.tsx` | N/A | Excluded from coverage |
| `AdminDropdown.tsx` | **No** | **NEEDS TESTS (P1)** |
| `useParticipantViewModel.ts` | Yes | Good |

### features/home/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `HomePage.tsx` | Yes | Good |
| `CreateBoardDialog.tsx` | Yes (but 4 failing) | Needs fixes |
| `useCreateBoardViewModel.ts` | Yes | Good |

### features/user/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `MyUserCard.tsx` | Yes (9 tests, 1 skipped) | Excluded from coverage |

### models/api/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `BoardAPI.ts` | Yes | Good |
| `CardAPI.ts` | Yes | Good |
| `ReactionAPI.ts` | Yes | Good |
| `client.ts` | Yes | Excluded from coverage |

### models/stores/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `boardStore.ts` | Yes | Good |
| `cardStore.ts` | Yes | Good |
| `userStore.ts` | Yes | Good |

### models/socket/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `SocketService.ts` | Yes | Good |
| `socket-types.ts` | N/A (types only) | Types file |

### shared/
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `ErrorBoundary.tsx` | Yes | Good |
| `LoadingIndicator.tsx` | Yes | Good |
| `cardRelationships.ts` | Yes | Good |
| `validation/index.ts` | Yes | Good |
| `useKeyboardShortcuts.ts` | **No** | **NEEDS TESTS (P1)** |

### Other
| File | Has Tests | Coverage Status |
|------|-----------|-----------------|
| `App.tsx` | **No** | **NEEDS TESTS (P2)** |
| `lib/utils.ts` | **No** | **Small utility - P3** |

---

## Files Needing Immediate Attention

### P0 - Fix Failing Tests

1. **`tests/unit/features/card/components/RetroCard.test.tsx`**
   - Update aria-label assertion on line 1169
   - Change expected value to: `"Drag handle - press Space to pick up, arrow keys to move, Space to drop"`

2. **`tests/unit/features/card/components/RetroColumn.test.tsx`**
   - Increase test timeout or add proper `waitFor` handling
   - Tests timing out: anonymous posting, column title editing

3. **`tests/unit/features/home/components/CreateBoardDialog.test.tsx`**
   - Fix 4 timeout issues in Form Validation, Form Submission, and Accessibility tests
   - Consider using `waitFor` with longer timeout or mock timers

### P1 - Add Missing Tests

1. **`src/features/participant/components/AdminDropdown.tsx`**
   - **Priority:** High - User-facing admin functionality
   - **Test cases needed:**
     ```typescript
     describe('AdminDropdown', () => {
       it('should render manage admins button');
       it('should show current admins with check icon');
       it('should show non-admin users for promotion');
       it('should call onPromoteToAdmin when user is clicked');
       it('should show "Promoting..." state during API call');
       it('should show "All users are admins" when applicable');
       it('should show "No users to promote" when empty');
       it('should filter out already-admin users');
     });
     ```

2. **`src/shared/hooks/useKeyboardShortcuts.ts`**
   - **Priority:** High - Core interaction hook
   - **Test cases needed:**
     ```typescript
     describe('useKeyboardShortcuts', () => {
       describe('parseKeyCombo', () => {
         it('should parse single key');
         it('should parse ctrl+key combinations');
         it('should parse shift+key combinations');
         it('should parse multi-modifier combinations');
       });

       describe('isInputElement', () => {
         it('should return true for input elements');
         it('should return true for textarea elements');
         it('should return true for contentEditable elements');
         it('should return false for div elements');
       });

       describe('hook behavior', () => {
         it('should register keydown listener on mount');
         it('should unregister on unmount');
         it('should call handler on matching key');
         it('should skip shortcuts when in input field');
         it('should prevent default when configured');
         it('should not fire when disabled');
       });
     });
     ```

### P2 - Nice to Have Tests

1. **`src/App.tsx`**
   - Simple routing component - mainly tested via E2E
   - **Test cases:**
     ```typescript
     describe('App', () => {
       it('should render HomePage at root route');
       it('should render RetroBoardPage at /boards/:boardId');
       it('should include ErrorBoundary');
       it('should include Toaster');
     });
     ```

### P3 - Low Priority

1. **`src/lib/utils.ts`**
   - Single utility function (`cn`) from shadcn/ui
   - Tested indirectly through component tests
   - Optional: Add simple unit test for `cn` function

---

## Integration Test Coverage

The project has 6 integration test files covering critical flows:

| Test File | Coverage Area | Status |
|-----------|---------------|--------|
| `card-creation.integration.test.ts` | Card CRUD operations | Passing |
| `card-quota.integration.test.ts` | Card quota enforcement | Passing |
| `reaction-quota.integration.test.ts` | Reaction limits | Passing (with act() warnings) |
| `drag-drop.integration.test.ts` | Drag-drop operations | Passing |
| `parent-child-linking.integration.test.ts` | Card relationships | Passing |
| `realtime-events.integration.test.ts` | Socket.io events | Passing |

---

## Coverage Configuration

From `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    lines: 85,
    functions: 80,
    branches: 82,
    statements: 85,
  },
  exclude: [
    // UI library components (externally tested)
    'src/components/ui/**',
    // Type-only files
    'src/models/types/board.ts',
    'src/models/types/card.ts',
    'src/models/types/reaction.ts',
    'src/models/types/user.ts',
    // View components (E2E tested)
    'src/features/board/components/RetroBoardPage.tsx',
    'src/features/board/components/BoardHeader.tsx',
    'src/features/board/components/SortableCardHeader.tsx',
    'src/features/card/components/RetroColumn.tsx',
    'src/features/participant/components/ParticipantDropdown.tsx',
    'src/features/participant/components/ParticipantAvatar.tsx',
    'src/features/user/components/MyUserCard.tsx',
  ],
}
```

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Fix the 6 failing tests** - These are blocking coverage report generation
   - RetroCard aria-label assertion fix (~5 min)
   - CreateBoardDialog timeout fixes (~30 min)
   - RetroColumn timeout fixes (~20 min)

2. **Add tests for AdminDropdown.tsx** (~2 hours)
   - High-value admin functionality
   - Straightforward component testing

3. **Add tests for useKeyboardShortcuts.ts** (~1 hour)
   - Core hook that affects UX
   - Utility functions are easy to unit test

### Future Improvements

1. **Address act() warnings** in reaction-quota tests
2. **Consider adding App.tsx tests** for routing confidence
3. **Improve test stability** by using more deterministic waits
4. **Add visual regression tests** for UI components

---

## Test Statistics

- **Unit Tests:** 37 files, ~900 tests
- **Integration Tests:** 6 files, ~50 tests
- **E2E Tests:** 10 spec files (Playwright)
- **Total Test Coverage:** Estimated 85%+ (pending coverage report)

---

## Appendix: File Coverage Matrix

| Source File | Unit Test | Integration Test | E2E Test | Notes |
|-------------|-----------|------------------|----------|-------|
| RetroCard.tsx | 90+ tests | card-creation | retro-session | Excellent |
| RetroColumn.tsx | Excluded | N/A | retro-session | E2E only |
| useCardViewModel.ts | 60 tests | All card tests | N/A | Excellent |
| useBoardViewModel.ts | Yes | realtime-events | board-lifecycle | Good |
| CreateBoardDialog.tsx | Yes (4 failing) | N/A | board-creation | Needs fixes |
| AdminDropdown.tsx | **None** | N/A | admin-operations | **Gap** |
| useKeyboardShortcuts.ts | **None** | N/A | N/A | **Gap** |
| App.tsx | **None** | N/A | All E2E | Low priority |
