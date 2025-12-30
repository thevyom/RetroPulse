# Code Review: Phase 4 - ViewModel Layer

**Review Date:** 2025-12-30
**Reviewer:** Claude Code
**Phase:** FRONTEND_PHASE_04_VIEWMODEL_LAYER

## Overview

Phase 4 implements the ViewModel layer following the MVVM (Model-View-ViewModel) pattern. This layer provides React hooks that bridge the Model layer (stores, APIs) with future View components, managing state transformations, business logic, and user interactions.

### Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `src/features/board/viewmodels/useBoardViewModel.ts` | 247 | Board state management |
| `src/features/card/viewmodels/useCardViewModel.ts` | 863 | Card CRUD, sorting, filtering |
| `src/features/card/viewmodels/useDragDropViewModel.ts` | 270 | Drag-drop validation logic |
| `src/features/participant/viewmodels/useParticipantViewModel.ts` | 364 | User state, heartbeat, filters |
| `src/features/*/viewmodels/index.ts` | ~7 each | Export barrels |
| `src/features/index.ts` | 26 | Central feature exports |

### Test Coverage

| Test File | Tests | Coverage Focus |
|-----------|-------|----------------|
| `useBoardViewModel.test.ts` | 40+ | Board operations, socket events |
| `useCardViewModel.test.ts` | 60+ | CRUD, reactions, filtering |
| `useDragDropViewModel.test.ts` | 25+ | Drag validation, drop results |
| `useParticipantViewModel.test.ts` | 35+ | User management, heartbeat |

**Total Tests:** 471 passing

---

## Summary

### (praise) Architecture & Design

Excellent adherence to MVVM pattern with clear separation:
- ViewModels encapsulate all business logic
- Clean interface contracts via TypeScript types
- Consistent patterns across all hooks
- Good use of `useCallback` and `useMemo` for performance

### (praise) Real-time Support

Well-implemented socket event handling:
- Proper subscription/unsubscription in useEffect cleanup
- Board-scoped event filtering
- Optimistic updates with rollback on failure

### (praise) Input Validation

Consistent validation before operations:
- Uses shared validation utilities
- Validates board state (closed check) before mutations
- Clear error messages

---

## Blocking Issues

### 1. (blocking) Missing `isLoading` Reset on Success in `fetchBoard`

**File:** `useBoardViewModel.ts:82-95`

```typescript
const fetchBoard = useCallback(async () => {
  if (!boardId) return;
  setLoading(true);
  setOperationError(null);
  try {
    const boardData = await BoardAPI.getBoard(boardId);
    setBoard(boardData);
    // Missing: setLoading(false) - relies on setBoard to clear it
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load board';
    setError(message);
    // setError also clears loading
  }
}, [boardId, setBoard, setLoading, setError]);
```

**Issue:** The `fetchBoard` function relies on `setBoard` (in the store) to set `isLoading: false`. This creates implicit coupling and if `setBoard` ever changes, loading state could be left stale.

**Fix:** Explicitly call `setLoading(false)` in the try block after `setBoard`.

### 2. (blocking) Stale Closure in `sendHeartbeat` Dependency

**File:** `useParticipantViewModel.ts:136-149`

```typescript
const sendHeartbeat = useCallback(async () => {
  if (!boardId) return;
  try {
    const response = await BoardAPI.sendHeartbeat(boardId);
    if (currentUser?.alias) {  // <- currentUser captured at callback creation
      updateHeartbeat(currentUser.alias, response.last_active_at);
    }
  } catch (err) {
    console.warn('Heartbeat failed:', err);
  }
}, [boardId, currentUser?.alias, updateHeartbeat]);
```

**Issue:** The `currentUser?.alias` is correctly in deps, but the heartbeat interval effect at line 152-167 has `sendHeartbeat` in deps which changes when `currentUser?.alias` changes, causing interval to restart. This is correct but could lead to missed heartbeats during alias changes.

**Fix:** Consider using a ref for the callback or debouncing the interval restart.

### 3. (blocking) Race Condition in `handleAliasChanged` Socket Handler

**File:** `useParticipantViewModel.ts:195-203`

```typescript
const handleAliasChanged = (event: { board_id: string; old_alias: string; new_alias: string }) => {
  if (event.board_id === boardId) {
    const users = activeUsers.map((user) =>  // <- activeUsers from closure
      user.alias === event.old_alias ? { ...user, alias: event.new_alias } : user
    );
    setActiveUsers(users);
  }
};
```

**Issue:** The `activeUsers` array is captured in the closure at the time the effect runs. If multiple alias change events arrive quickly, earlier events may operate on stale data.

**Fix:** Use functional update pattern:
```typescript
setActiveUsers((prevUsers) =>
  prevUsers.map((user) =>
    user.alias === event.old_alias ? { ...user, alias: event.new_alias } : user
  )
);
```

---

## Suggestions

### 4. (suggestion) Duplicate `wouldCreateCycle` and `hasParent` Functions

**Files:**
- `useCardViewModel.ts:142-166`
- `useDragDropViewModel.ts:69-95`

Both ViewModels have identical implementations of `wouldCreateCycle` and `hasParent` functions.

**Fix:** Extract to a shared utility in `src/shared/utils/cardRelationships.ts`:
```typescript
export function wouldCreateCycle(cards: Map<string, Card>, parentId: string, childId: string): boolean;
export function hasParent(cards: Map<string, Card>, cardId: string): boolean;
```

### 5. (suggestion) Large `useCardViewModel` Hook (863 lines)

**File:** `useCardViewModel.ts`

This hook handles many responsibilities:
- Card CRUD operations
- Quota management
- Sorting and filtering
- Relationship linking
- Reaction handling
- Socket events

**Fix:** Consider splitting into smaller, focused hooks:
- `useCardOperations` - CRUD
- `useCardFilters` - Sorting/filtering
- `useCardRelationships` - Parent-child, action links
- `useCardReactions` - Reaction handling

These can be composed in `useCardViewModel` or used independently.

### 6. (suggestion) Missing Admin Check for Some Board Operations

**File:** `useBoardViewModel.ts`

The `handleRenameBoard` and `handleCloseBoard` functions don't verify `isAdmin` before attempting the operation - they rely on the backend to reject unauthorized requests.

**Fix:** Add frontend guard for better UX:
```typescript
const handleRenameBoard = useCallback(async (newName: string) => {
  if (!isAdmin) {
    setOperationError('Only admins can rename the board');
    throw new Error('Only admins can rename the board');
  }
  // ... rest of implementation
}, [boardId, isClosed, isAdmin, updateBoardName]);
```

### 7. (suggestion) Consider AbortController for Fetch Operations

**Files:** All ViewModels

When components unmount during pending API calls, the async operations continue and may attempt to update unmounted components.

**Fix:** Use AbortController pattern:
```typescript
useEffect(() => {
  const controller = new AbortController();

  const loadData = async () => {
    try {
      const data = await CardAPI.getCards(boardId, { signal: controller.signal });
      // ...
    } catch (err) {
      if (err.name === 'AbortError') return;
      // handle error
    }
  };

  loadData();
  return () => controller.abort();
}, [boardId]);
```

### 8. (suggestion) Hardcoded Heartbeat Interval

**File:** `useParticipantViewModel.ts:18`

```typescript
const HEARTBEAT_INTERVAL = 60000; // 60 seconds
```

**Fix:** Consider making this configurable via environment variable or props:
```typescript
const HEARTBEAT_INTERVAL = import.meta.env.VITE_HEARTBEAT_INTERVAL || 60000;
```

---

## Nits

### 9. (nit) Inconsistent Return Type for Early Returns

**File:** `useBoardViewModel.ts:140`, `useParticipantViewModel.ts:223`

```typescript
const handleRenameBoard = useCallback(async (newName: string) => {
  if (!boardId) return;  // Returns undefined
  // ... rest returns void implicitly
```

For consistency with the Promise<void> return type, consider:
```typescript
if (!boardId) return Promise.resolve();
```

### 10. (nit) Magic String 'thumbs_up' for Reaction Type

**File:** `useCardViewModel.ts:721`

```typescript
await ReactionAPI.addReaction(cardId, { type: 'thumbs_up' });
```

**Fix:** Use a constant or enum from the types:
```typescript
import { REACTION_TYPES } from '../../../models/types/reaction';
// ...
await ReactionAPI.addReaction(cardId, { type: REACTION_TYPES.THUMBS_UP });
```

### 11. (nit) Console.warn for Non-Critical Errors

**Files:** `useParticipantViewModel.ts:122, 147`

Using `console.warn` in production code. Consider:
- Using a proper logging utility
- Conditionally logging based on environment

---

## Security Considerations

### (praise) Good Security Practices

1. **Input Validation:** All user inputs validated before API calls
2. **Authorization Checks:** Creator-only operations properly guarded
3. **Closed Board Protection:** Operations blocked on closed boards
4. **No Sensitive Data Exposure:** Cookie hashes used instead of raw cookies

### Potential Improvements

1. **Rate Limiting Awareness:** Consider client-side debouncing for rapid user actions
2. **XSS Prevention:** Content validation should sanitize HTML (handled at display layer)

---

## Test Coverage Assessment

### Well Covered
- All happy path scenarios
- Error handling and rollback
- Socket event handling
- Filter state management
- Quota enforcement

### Missing Coverage
- Concurrent operation handling (race conditions)
- Network timeout scenarios
- AbortController cancellation
- Memory leak scenarios (unmount during pending operations)

---

## Action Items Summary

| Priority | Issue | Location | Effort |
|----------|-------|----------|--------|
| Blocking | Stale closure in alias change handler | useParticipantViewModel.ts:195-203 | Low |
| Blocking | Implicit isLoading reset | useBoardViewModel.ts:82-95 | Low |
| Blocking | Heartbeat interval restart on alias change | useParticipantViewModel.ts:152-167 | Medium |
| Suggestion | Extract duplicate utility functions | useCardViewModel, useDragDropViewModel | Low |
| Suggestion | Split large useCardViewModel hook | useCardViewModel.ts | High |
| Suggestion | Add admin checks on board operations | useBoardViewModel.ts | Low |
| Suggestion | Add AbortController for API calls | All ViewModels | Medium |
| Suggestion | Make heartbeat interval configurable | useParticipantViewModel.ts | Low |

---

## Conclusion

The Phase 4 ViewModel layer is well-structured and follows good React patterns. The MVVM architecture is correctly implemented with clear separation of concerns. The main areas for improvement are:

1. **Fix the race condition in alias change handler** (blocking)
2. **Consider splitting the large useCardViewModel** for maintainability
3. **Extract duplicate utility functions** to reduce code duplication
4. **Add AbortController** for better cleanup on unmount

Overall quality: **Good** - Ready for merge after addressing blocking issues.

---

## Independent Test Review by Principal Engineer

**Review Date:** 2025-12-30
**Reviewer:** Claude Code (Principal Engineer Audit)
**Scope:** Full independent review of Phase 4 ViewModel Layer - Security, Observability, Code Quality

### Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Build | `pnpm run build` | ❌ 4 TypeScript errors |
| Unit Tests | `pnpm test:run` | ✅ 471 tests pass |
| Lint | `pnpm lint` | ❌ 7 errors, 12 warnings |

---

### P0 - Build Blocking Issues (4)

#### Build Error 1: Unused Import
**File:** `src/features/card/viewmodels/useCardViewModel.ts:17`

```typescript
import type {
  Card,
  CardQuota,
  CreateCardDTO,
  CardType,  // ← Unused import
} from '../../../models/types';
```

**Fix:** Remove `CardType` from imports as it's not used.

---

#### Build Error 2: Invalid Reaction DTO Property
**File:** `src/features/card/viewmodels/useCardViewModel.ts:697`

```typescript
await ReactionAPI.addReaction(cardId, { type: 'thumbs_up' });
```

**Issue:** The `AddReactionDTO` interface expects `reaction_type`, not `type`.

**Fix:**
```typescript
await ReactionAPI.addReaction(cardId, { reaction_type: 'thumbs_up' });
```

---

#### Build Error 3: Missing Ref Initial Value
**File:** `src/features/participant/viewmodels/useParticipantViewModel.ts:85`

```typescript
const sendHeartbeatRef = useRef<() => Promise<void>>();
```

**Issue:** `useRef` called without initial value when TypeScript expects an argument.

**Fix:**
```typescript
const sendHeartbeatRef = useRef<(() => Promise<void>) | undefined>(undefined);
```

---

#### Build Error 4: Invalid Reaction Test Property
**File:** `tests/unit/features/card/viewmodels/useCardViewModel.test.ts:787`

```typescript
vi.mocked(ReactionAPI.addReaction).mockResolvedValue({
  id: 'reaction-1',
  card_id: 'card-1',
  type: 'thumbs_up',  // ← Should be reaction_type
  ...
});
```

**Fix:** Change `type` to `reaction_type` to match `Reaction` interface.

---

### P0 - ESLint React Compiler Errors (4)

#### Error 1: Ref Update During Render
**File:** `useParticipantViewModel.ts:156`

```typescript
// Keep ref updated with latest sendHeartbeat
sendHeartbeatRef.current = sendHeartbeat;
```

**Issue:** React Compiler error - Cannot update ref during render. Refs should only be updated in effects or event handlers.

**Fix:** Move ref assignment into a useEffect:
```typescript
useEffect(() => {
  sendHeartbeatRef.current = sendHeartbeat;
}, [sendHeartbeat]);
```

---

#### Error 2-4: useMemo Dependency Mismatch
**File:** `useBoardViewModel.ts:64-72`

```typescript
const isAdmin = useMemo(() => {
  if (!board || !currentUser?.cookie_hash) return false;
  return board.admins.includes(currentUser.cookie_hash);
}, [board, currentUser?.cookie_hash]);
```

**Issue:** React Compiler infers different dependencies than manually specified. Inferred `currentUser.cookie_hash` but source uses `currentUser?.cookie_hash`.

**Fix:** Either let React Compiler handle memoization or align dependencies:
```typescript
const isAdmin = useMemo(() => {
  if (!board || !currentUser) return false;
  return board.admins.includes(currentUser.cookie_hash);
}, [board, currentUser]);
```

---

#### Error 5: setState in Effect Body
**File:** `useBoardViewModel.ts:99`

```typescript
useEffect(() => {
  fetchBoard();  // fetchBoard calls setLoading, setBoard, etc.
}, [fetchBoard]);
```

**Issue:** Calling setState synchronously within effect body triggers cascading renders.

**Recommendation:** This is a common pattern for data fetching. Consider using:
1. React Query / TanStack Query for data fetching
2. useReducer for complex state transitions
3. Accept the warning if the pattern is intentional

---

### P1 - Security Issues (3)

#### Security 1: Missing Input Sanitization for XSS
**Files:** All ViewModels handling user content

**Current State:** Content validation checks length but doesn't sanitize HTML/script injection.

```typescript
// Current validation in useCardViewModel.ts
const validation = validateCardContent(data.content);
```

**Risk:** Medium - XSS attacks if content is rendered without escaping in View layer.

**Recommendation:**
1. Add HTML entity encoding for display (View layer responsibility)
2. Consider DOMPurify for rich text support
3. Add CSP headers on backend

```typescript
// Add to shared/validation/index.ts
export function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

#### Security 2: Missing Rate Limiting Awareness
**Files:** All action handlers

**Current State:** No client-side debouncing for rapid user actions.

```typescript
// Users can spam handleCreateCard, handleAddReaction, etc.
await result.current.handleCreateCard({ ... });
await result.current.handleCreateCard({ ... }); // Immediate repeat
```

**Risk:** Low - Backend should rate limit, but client experience suffers.

**Recommendation:** Add debounce/throttle for user-triggered actions:
```typescript
const debouncedCreateCard = useMemo(
  () => debounce(handleCreateCard, 300),
  [handleCreateCard]
);
```

---

#### Security 3: Cookie Hash Exposure in Logs
**File:** `useParticipantViewModel.ts:125`

```typescript
console.warn('Could not fetch current user session:', err);
```

**Risk:** Low - Session errors could contain sensitive info.

**Recommendation:** Filter sensitive data before logging:
```typescript
console.warn('Could not fetch current user session:', err.message);
```

---

### P2 - Observability Issues (4)

#### Observability 1: Inconsistent Logging Strategy
**Files:** All ViewModels

**Current State:** Mix of `console.warn` and `console.error`, no structured logging.

| File | Location | Method |
|------|----------|--------|
| useParticipantViewModel.ts:125 | Session fetch failure | `console.warn` |
| useParticipantViewModel.ts:151 | Heartbeat failure | `console.warn` |
| SocketService.ts:96 | Connection error | `console.error` |

**Recommendation:** Implement a logging utility:
```typescript
// src/shared/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, context?: object) => void;
  info: (message: string, context?: object) => void;
  warn: (message: string, context?: object) => void;
  error: (message: string, context?: object) => void;
}

export const logger: Logger = {
  debug: (msg, ctx) => import.meta.env.DEV && console.debug(`[DEBUG] ${msg}`, ctx),
  info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx),
};
```

---

#### Observability 2: Missing Operation Telemetry
**Current State:** No tracking of user actions for analytics or debugging.

**Recommendation:** Add telemetry hooks:
```typescript
// Track significant operations
const trackOperation = useCallback((operation: string, success: boolean, duration: number) => {
  // Could send to analytics service
  if (import.meta.env.DEV) {
    console.debug(`[TELEMETRY] ${operation}: ${success ? 'SUCCESS' : 'FAILURE'} (${duration}ms)`);
  }
}, []);
```

---

#### Observability 3: Missing Error Boundary Integration
**Current State:** ViewModel errors set local state but don't integrate with global error tracking.

**Recommendation:** Add error reporting hook:
```typescript
const reportError = useCallback((error: Error, context: string) => {
  setOperationError(error.message);
  // Integration point for Sentry, DataDog, etc.
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, { tags: { context } });
  }
}, []);
```

---

#### Observability 4: Missing Performance Monitoring
**Current State:** No tracking of API call latency or re-render counts.

**Recommendation:** Add performance marks for critical paths:
```typescript
const fetchCards = useCallback(async () => {
  const startTime = performance.now();
  try {
    const response = await CardAPI.getCards(boardId);
    performance.measure('fetchCards', { start: startTime });
    // ...
  } catch (err) {
    performance.measure('fetchCards-error', { start: startTime });
    // ...
  }
}, [boardId]);
```

---

### P2 - Code Quality Issues (5)

#### Quality 1: Large Hook Size
**File:** `useCardViewModel.ts` - 839 lines

**Recommendation:** Split into focused hooks:
- `useCardOperations.ts` - CRUD operations
- `useCardFilters.ts` - Sorting/filtering logic
- `useCardRelationships.ts` - Parent-child linking
- `useCardReactions.ts` - Reaction handling

---

#### Quality 2: Magic Strings
**File:** `useCardViewModel.ts:697`

```typescript
await ReactionAPI.addReaction(cardId, { reaction_type: 'thumbs_up' });
```

**Fix:** Use constant:
```typescript
import { REACTION_TYPES } from '../../../models/types/reaction';
// ...
await ReactionAPI.addReaction(cardId, { reaction_type: REACTION_TYPES.THUMBS_UP });
```

---

#### Quality 3: Missing AbortController
**Files:** All ViewModels

**Current State:** No request cancellation on unmount.

**Risk:** Memory leaks, state updates on unmounted components.

**Recommendation:**
```typescript
useEffect(() => {
  const controller = new AbortController();

  const loadData = async () => {
    try {
      const data = await CardAPI.getCards(boardId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setCardsWithChildren(data.cards);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  };

  loadData();
  return () => controller.abort();
}, [boardId]);
```

---

#### Quality 4: Hardcoded Configuration
**File:** `useParticipantViewModel.ts:18`

```typescript
const HEARTBEAT_INTERVAL = 60000; // 60 seconds
```

**Recommendation:** Make configurable:
```typescript
const HEARTBEAT_INTERVAL = import.meta.env.VITE_HEARTBEAT_INTERVAL
  ? parseInt(import.meta.env.VITE_HEARTBEAT_INTERVAL, 10)
  : 60000;
```

---

#### Quality 5: Test Warning - Missing act() Wrappers
**File:** `useParticipantViewModel.test.ts`

Multiple tests show React warning:
```
An update to TestComponent inside a test was not wrapped in act(...)
```

**Fix:** Wrap state-triggering operations in `act()`:
```typescript
await act(async () => {
  await waitFor(() => {
    expect(result.current.activeUsers.length).toBeGreaterThan(0);
  });
});
```

---

### P3 - Test Coverage Gaps

#### Gap 1: Concurrent Operation Tests
No tests for race conditions when multiple operations fire simultaneously.

#### Gap 2: Network Timeout Tests
No tests for API timeout scenarios.

#### Gap 3: Memory Leak Tests
No tests verifying cleanup on unmount during pending operations.

#### Gap 4: AbortController Behavior
Not currently testable as AbortController is not implemented.

---

### Security Assessment Summary

| Category | Status | Notes |
|----------|--------|-------|
| Input Validation | ✅ Good | Content length and format validated |
| Authorization Checks | ✅ Good | Creator-only operations guarded |
| Closed Board Protection | ✅ Good | All mutations blocked on closed boards |
| Cookie Hash Privacy | ✅ Good | Raw cookies not exposed |
| XSS Prevention | ⚠️ Partial | Needs View-layer escaping |
| Rate Limiting | ⚠️ Partial | Relies on backend |
| CSRF Protection | ✅ Good | Using `withCredentials: true` |

---

### Observability Assessment Summary

| Category | Status | Notes |
|----------|--------|-------|
| Error Logging | ⚠️ Partial | Inconsistent patterns |
| Structured Logging | ❌ Missing | No logger utility |
| Telemetry/Analytics | ❌ Missing | No operation tracking |
| Performance Monitoring | ❌ Missing | No latency tracking |
| Error Reporting Integration | ❌ Missing | No Sentry/DataDog hooks |

---

### Action Items Summary

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Fix TypeScript build errors (4) | Low | Blocking |
| P0 | Fix React Compiler ESLint errors (4) | Low | Blocking |
| P1 | Add XSS sanitization to View layer | Medium | Security |
| P1 | Add client-side rate limiting | Low | UX |
| P2 | Implement logger utility | Medium | Observability |
| P2 | Add AbortController for API calls | Medium | Stability |
| P2 | Split large useCardViewModel hook | High | Maintainability |
| P3 | Add missing test coverage | Medium | Quality |

---

### Required Fixes Before Merge

1. **MUST FIX - Build Errors:**
   ```typescript
   // useCardViewModel.ts - Remove unused CardType import
   // useCardViewModel.ts:697 - Change { type: 'thumbs_up' } to { reaction_type: 'thumbs_up' }
   // useParticipantViewModel.ts:85 - Add undefined initial value to useRef
   // useCardViewModel.test.ts:787 - Change type to reaction_type
   ```

2. **MUST FIX - React Compiler Errors:**
   ```typescript
   // useParticipantViewModel.ts:156 - Move ref update into useEffect
   // useBoardViewModel.ts:64-72 - Align useMemo dependencies with React Compiler inference
   ```

3. **SHOULD ADD - Observability:**
   - Create `src/shared/utils/logger.ts` with structured logging
   - Add environment-aware log filtering

---

### Conclusion

Phase 4 ViewModel implementation demonstrates solid MVVM architecture with good separation of concerns. However, there are critical build and lint errors that must be fixed before proceeding to Phase 5.

The main gaps are:
1. **Build failures** due to type mismatches (reaction_type vs type)
2. **React Compiler warnings** for memoization and ref handling patterns
3. **Missing observability infrastructure** (logging, telemetry, error reporting)
4. **Security hardening needed** at the View layer for XSS prevention

Overall assessment: **Needs Work** - Fix P0 issues before merge.

---

*Independent Review Complete - 2025-12-30*
