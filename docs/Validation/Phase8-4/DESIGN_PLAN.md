# Design Plan - Bug Fixes & Test Fixes Session 01012330

**Created**: 2026-01-01 23:30
**Updated**: 2026-01-02 (UTB-014 Clean Solution Added)
**Status**: Planning
**Principal Engineer**: Staff Engineer

---

## 1. Session Overview

This session focuses on fixing:
1. **Failing Unit Tests** (P0) - 6 tests failing due to timeouts and assertion mismatches
2. **Accessibility Fix** - Form input label (completed in prior session)
3. **Filter Toggle Fix** - All Users clearing Anonymous (completed in prior session)
4. **E2E Test Stabilization** - Touch target size assertion
5. **NEW: UTB-024** (P0) - Child card unlink button does not work
6. **NEW: UTB-025** (P0) - Parent aggregated count not updated on child reaction
7. **NEW: UTB-014** (P0) - Current user not appearing in participant bar (CLEAN SOLUTION)

---

## 2. Issues from QA_TEST_REPORT.md

### P0 - Failing Unit Tests (Must Fix)

| # | Test File | Test Name | Issue |
|---|-----------|-----------|-------|
| 1 | RetroCard.test.tsx | aria-label for drag handle | Assertion mismatch (source updated) |
| 2 | RetroColumn.test.tsx | posting anonymously | Timeout (5000ms) |
| 3 | RetroColumn.test.tsx | editing column title | Timeout (5000ms) |
| 4 | CreateBoardDialog.test.tsx | clear alias error | Timeout (5000ms) |
| 5 | CreateBoardDialog.test.tsx | API error navigation | Timeout (5000ms) |
| 6 | CreateBoardDialog.test.tsx | invalid alias input | Timeout (5000ms) |

### P1 - E2E Test Failures

| # | Test File | Test Name | Issue |
|---|-----------|-----------|-------|
| 7 | 08-tablet-viewport.spec.ts | add card button is easily tappable | Touch target 28px < 32px assertion |
| 8 | 10-accessibility-basic.spec.ts | form inputs have labels | **FIXED** (aria-label added) |

### P2 - Coverage Gaps

| # | Missing | Est. Tests |
|---|---------|------------|
| 9 | AdminDropdown.tsx unit tests | ~8 tests |
| 10 | useKeyboardShortcuts.ts unit tests | ~12 tests |

---

## 3. Root Cause Analysis

### Unit Test Timeouts (Tests 2-6)

**Hypothesis**: Tests are timing out due to:
1. Missing mock responses for API calls
2. `waitFor` conditions never being met
3. Dialog state not updating correctly in test environment

**Investigation Needed**:
- Check if `BoardAPI` mocks return expected responses
- Check if dialog `open` state changes are being awaited correctly
- Check for missing `act()` wrappers around state updates

### RetroCard Aria-Label Mismatch (Test 1)

**Root Cause**: Agent 1 in session 01011530 updated the aria-label in RetroCard.tsx but the test assertion wasn't updated.

**Current source** (RetroCard.tsx):
```tsx
aria-label="Drag handle - press Space to pick up, arrow keys to move, Space to drop"
```

**Test expects** (likely):
```tsx
aria-label="Drag to reorder"  // or similar old value
```

### Touch Target Size (Test 7)

**Root Cause**: Add card button is 28px but test expects >= 32px.

**Options**:
1. Increase button size to 32px (affects all screens)
2. Relax test assertion to 28px (WCAG recommends 44px but 24px is minimum)
3. Add tablet-specific CSS to increase touch target

---

## 4. Fix Strategy

### Phase 1: Unit Test Fixes (Sequential - Same Files)

All unit test fixes must be done sequentially as they may interact.

| Order | Fix | Files | Scope |
|-------|-----|-------|-------|
| 1.1 | RetroCard aria-label assertion | RetroCard.test.tsx | Update expected string |
| 1.2 | RetroColumn timeout fixes | RetroColumn.test.tsx | Add mocks, fix waits |
| 1.3 | CreateBoardDialog timeout fixes | CreateBoardDialog.test.tsx | Add mocks, fix waits |

### Phase 2: E2E Test Fixes (Independent)

| Task | Fix | Files |
|------|-----|-------|
| 2.1 | Touch target size | RetroColumn.tsx OR 08-tablet-viewport.spec.ts |

---

## 5. Technical Approach

### Fix 1.1: RetroCard Aria-Label

**File**: `frontend/tests/unit/features/card/components/RetroCard.test.tsx`

**Change**: Update test assertion to match new aria-label:
```typescript
// Find the test that checks aria-label
expect(dragHandle).toHaveAttribute(
  'aria-label',
  'Drag handle - press Space to pick up, arrow keys to move, Space to drop'
);
```

### Fix 1.2: RetroColumn Timeouts

**File**: `frontend/tests/unit/features/card/components/RetroColumn.test.tsx`

**Approach**:
1. Check mock setup for `onCreateCard` - ensure it resolves
2. Add explicit `waitFor` with increased timeout
3. Ensure dialog state changes are properly awaited

```typescript
// Pattern to fix timeout
await waitFor(() => {
  expect(screen.getByRole('dialog')).toBeInTheDocument();
}, { timeout: 10000 });

// Ensure mock resolves
const mockCreateCard = vi.fn().mockResolvedValue({ id: 'card-1', ... });
```

### Fix 1.3: CreateBoardDialog Timeouts

**File**: `frontend/tests/unit/features/board/components/CreateBoardDialog.test.tsx`

**Approach**:
1. Check `BoardAPI.createBoard` mock setup
2. Ensure navigation mock is properly configured
3. Add explicit waits for async operations

### Fix 2.1: Touch Target Size

**Option A - Increase Button Size** (Recommended):
```tsx
// In RetroColumn.tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"  // was h-7 w-7 (28px → 32px)
  ...
>
```

**Option B - Relax Test Assertion**:
```typescript
// In 08-tablet-viewport.spec.ts
expect(box.width).toBeGreaterThanOrEqual(28);  // was 32
```

---

## 6. Files to Modify

| File | Fixes |
|------|-------|
| `frontend/tests/unit/features/card/components/RetroCard.test.tsx` | 1.1 |
| `frontend/tests/unit/features/card/components/RetroColumn.test.tsx` | 1.2 |
| `frontend/tests/unit/features/board/components/CreateBoardDialog.test.tsx` | 1.3 |
| `frontend/src/features/card/components/RetroColumn.tsx` OR `frontend/tests/e2e/08-tablet-viewport.spec.ts` | 2.1 |

---

## 7. Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| 1.1 | Low | Simple string update |
| 1.2 | Medium | May need deeper mock investigation |
| 1.3 | Medium | Multiple tests failing, may indicate systemic issue |
| 2.1 | Low | Either fix is straightforward |

---

## 8. NEW: Runtime Bug Fixes (UTB-024 & UTB-025)

### UTB-024: Child Card Unlink Not Working

**Severity**: P0 (High)
**Component**: RetroCard.tsx, useCardViewModel.ts, CardAPI.ts

**Root Cause Analysis**:

The unlink flow is:
1. `RetroCard.tsx:356` → `handleUnlink()` calls `onUnlinkFromParent()`
2. `RetroColumn.tsx:257` → passes `onUnlinkChild(card.id)` to `onUnlinkFromParent`
3. `RetroBoardPage.tsx:303` → `cardVM.handleUnlinkChild(childId)`
4. `useCardViewModel.ts:651` → `handleUnlinkChild(childId)`:
   - Looks up `childCard.parent_card_id`
   - Calls `CardAPI.unlinkCards(parentId, { target_card_id: childId, link_type: 'parent_of' })`

**Suspected Issues**:

1. **DELETE request with body**: Axios/backend may not support DELETE with request body
   - Solution: Use POST to a different endpoint or query params

2. **API endpoint path**: Check if `/cards/{parentId}/link` is correct
   - Backend may expect `/cards/{parentId}/unlink` or `/cards/{childId}/unlink`

3. **WebSocket event not firing**: `card:unlinked` handler may not be triggered

**Fix Strategy**:

```typescript
// Option A: Check if API uses query params instead of body
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.delete(
    `/cards/${sourceCardId}/link?target_card_id=${data.target_card_id}&link_type=${data.link_type}`
  );
}

// Option B: Change to POST if DELETE doesn't support body
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.post(`/cards/${sourceCardId}/unlink`, data);
}
```

---

### UTB-025: Parent Aggregated Count Not Updating

**Severity**: P0 (High)
**Component**: cardStore.ts

**Root Cause**: The `incrementReactionCount` and `decrementReactionCount` store actions only update the target card. They don't propagate changes to the parent's `aggregated_reaction_count`.

**Fix Strategy**:

Update `cardStore.ts` to also update parent's aggregated count when a child's reaction changes:

```typescript
incrementReactionCount: (cardId) =>
  set((state) => {
    const card = state.cards.get(cardId);
    if (!card) return state;
    const newCards = new Map(state.cards);

    // Update the card itself
    newCards.set(cardId, {
      ...card,
      direct_reaction_count: card.direct_reaction_count + 1,
      aggregated_reaction_count: card.aggregated_reaction_count + 1,
    });

    // If card has a parent, update parent's aggregated count
    if (card.parent_card_id) {
      const parent = newCards.get(card.parent_card_id);
      if (parent) {
        // Update parent's aggregated count
        const updatedParent = {
          ...parent,
          aggregated_reaction_count: parent.aggregated_reaction_count + 1,
        };

        // Update child in parent.children array
        if (parent.children) {
          updatedParent.children = parent.children.map(c =>
            c.id === cardId
              ? { ...c, direct_reaction_count: c.direct_reaction_count + 1 }
              : c
          );
        }

        newCards.set(card.parent_card_id, updatedParent);
      }
    }

    return { cards: newCards };
  }),
```

Same pattern for `decrementReactionCount`.

---

## 8A. NEW: UTB-014 - Clean Solution (Principal Engineer Review)

### Problem Statement

When a user creates a board with `creator_alias`, no user session is created. This causes:
- Current user not appearing in ParticipantBar
- MyUserCard not showing
- Heartbeat failures ("Please join the board first")
- Downstream bugs: UTB-015, UTB-020

### Previous Diagnosis Review

The existing analysis in `UTB-014_ROOT_CAUSE_ANALYSIS.md` correctly identified:
1. Missing `GET /boards/:id/users/me` endpoint → **FIXED**
2. Board creation doesn't create user session → **NOT FIXED**

### Why Previous Approaches Were Complex

| Approach | Problem |
|----------|---------|
| Frontend auto-join (Option A) | Two API calls, race conditions, complex coordination |
| Backend service injection (Option B) | Circular dependency between BoardService and UserSessionService |
| Hybrid response (Option C) | Changes board creation response structure, breaks clients |

### Clean Solution: Backend Auto-Join in Controller

Instead of injecting services into each other, handle the auto-join at the **controller level** where both services are available.

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURRENT FLOW (BROKEN)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /boards {creator_alias: "John"}                        │
│     └── BoardController → BoardService.createBoard()            │
│         └── Creates board, sets admin, NO session created       │
│  2. GET /boards/:id/users/me                                    │
│     └── Returns null (no session exists)                        │
│  3. PATCH /boards/:id/users/heartbeat                           │
│     └── Fails: "Please join the board first"                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        FIXED FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /boards {creator_alias: "John"}                        │
│     └── BoardController:                                        │
│         ├── BoardService.createBoard() → board created          │
│         ├── UserSessionService.joinBoard() → session created    │
│         └── Returns { board, user_session }                     │
│  2. GET /boards/:id/users/me                                    │
│     └── Returns session (now exists!)                           │
│  3. PATCH /boards/:id/users/heartbeat                           │
│     └── Success                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation Details

**File 1: `backend/src/domains/board/board.controller.ts`**

```typescript
import { UserSessionService } from '@/domains/user/user-session.service.js';

export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly userSessionService: UserSessionService  // ADD THIS
  ) {}

  createBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Step 1: Create the board
      const board = await this.boardService.createBoard(req.body, req.hashedCookieId);

      // Step 2: Auto-join creator if alias provided
      let userSession = null;
      if (req.body.creator_alias) {
        userSession = await this.userSessionService.joinBoard(
          board.id,
          req.hashedCookieId,
          req.body.creator_alias
        );
      }

      // Step 3: Return board with optional session
      sendSuccess(res, {
        ...board,
        user_session: userSession  // Frontend can use this immediately
      }, 201);
    } catch (error) {
      next(error);
    }
  };
}
```

**File 2: `backend/src/app.ts`** (or wherever routes are wired)

```typescript
// Update BoardController instantiation
const boardController = new BoardController(
  boardService,
  userSessionService  // ADD THIS
);
```

**File 3: `frontend/src/models/types/board.types.ts`**

```typescript
// Update BoardResponse type
export interface BoardResponse {
  id: string;
  name: string;
  // ... existing fields
  user_session?: UserSession;  // Optional - present when creator_alias provided
}
```

**File 4: `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts`**

```typescript
// Optionally use returned session to pre-populate store
const createBoard = async (data: CreateBoardDTO) => {
  setIsCreating(true);
  try {
    const response = await BoardAPI.createBoard(data);

    // If session returned, set it in the store immediately
    if (response.user_session) {
      useUserStore.getState().setCurrentUser(response.user_session);
    }

    return response;
  } finally {
    setIsCreating(false);
  }
};
```

### Debug Logging Cleanup

Remove all `[UTB-014 DEBUG]` logging from:

| File | Action |
|------|--------|
| `frontend/src/models/api/client.ts` | Remove request/response interceptor logs |
| `frontend/src/models/api/BoardAPI.ts` | Remove lines 186, 192, 195 |
| `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts` | Remove lines 29, 35, 36, 39 |
| `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` | Remove all UTB-014 DEBUG lines |
| `frontend/src/features/board/components/RetroBoardPage.tsx` | Remove any debug logging |

### Why This Solution is Clean

1. **No circular dependencies** - Controller already has access to both services
2. **Single API call** - Board + session created atomically
3. **Backwards compatible** - `user_session` is optional in response
4. **No frontend coordination** - Backend handles everything
5. **Minimal code change** - ~20 lines of backend code

### Files to Modify (Summary)

| File | Change | Lines |
|------|--------|-------|
| `backend/src/domains/board/board.controller.ts` | Add userSessionService, auto-join in createBoard | ~15 |
| `backend/src/app.ts` | Pass userSessionService to BoardController | ~2 |
| `frontend/src/models/types/board.types.ts` | Add user_session to BoardResponse | ~2 |
| `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts` | Use returned session (optional) | ~5 |
| Multiple frontend files | Remove debug logging | ~30 |

### Testing Requirements

| Test Type | Test Cases |
|-----------|------------|
| Unit (Backend) | createBoard with creator_alias creates session |
| Unit (Backend) | createBoard without creator_alias returns null session |
| Unit (Frontend) | useCreateBoardViewModel sets currentUser from response |
| Integration | Create board → navigate → user appears in ParticipantBar |
| E2E | Full flow: create board with alias → see avatar → edit alias |

---

## 9. Parallelism Analysis

### Independent Fixes (Can Run in Parallel)

| Agent | Bugs/Tasks | Files |
|-------|------------|-------|
| Agent 1 | UTB-024 (Unlink) | CardAPI.ts, useCardViewModel.ts |
| Agent 2 | UTB-025 (Aggregated Count) | cardStore.ts |
| Agent 3 | Unit Test Fixes (1.1-1.3) | Test files only |
| Agent 4 | E2E Touch Target (2.1) | RetroColumn.tsx OR spec file |

### Dependency Notes

- UTB-024 and UTB-025 are completely independent
- Unit test fixes (1.1-1.3) should be sequential (same test areas)
- E2E fix (2.1) is independent

---

## 10. Updated Success Criteria

1. All 956 unit tests pass (currently 6 failing)
2. E2E test `add card button is easily tappable` passes
3. UTB-024: Child cards can be unlinked successfully
4. UTB-025: Parent aggregated count updates on child reactions
5. No regressions in existing passing tests

---

*Document created by Principal Engineer - 2026-01-01*
*Updated: 2026-01-01 - Added UTB-024 and UTB-025 analysis*
