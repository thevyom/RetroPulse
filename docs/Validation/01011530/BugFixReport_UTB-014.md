# Bug Fix Report: UTB-014

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-014 |
| Title | Current User Not Shown in Participant Bar |
| Severity | High |
| Status | Fixed |
| Fixed By | Software Developer Agent |
| Date | 2026-01-01 |

## Description

After alias login, the participant bar shows "No participants yet". The current user is not added to `activeUsers`, causing the participant bar to appear empty even though the user is logged in.

## Steps to Reproduce

1. Navigate to home page
2. Create or join a board
3. Enter alias when prompted
4. Observe participant bar at top of board

**Expected:** Current user should be shown as a participant with their alias avatar
**Actual:** Shows "No participants yet"

## Root Cause Analysis

### Investigation Process

1. Traced the flow from `ParticipantBar.tsx` to understand where `activeUsers` comes from
2. Found `useParticipantViewModel.ts` manages the `activeUsers` state
3. Identified two data fetching functions:
   - `fetchActiveUsers()` - calls `BoardAPI.getActiveUsers()` to get all users
   - `fetchCurrentUserSession()` - calls `BoardAPI.getCurrentUserSession()` to get current user

### Root Cause

In `useParticipantViewModel.ts`, the `fetchCurrentUserSession` function was only setting the current user via `setCurrentUser(session)` but was **NOT** adding that user to the `activeUsers` array.

```typescript
// BEFORE (buggy code)
const fetchCurrentUserSession = useCallback(async () => {
  if (!boardId) return;
  try {
    const session = await BoardAPI.getCurrentUserSession(boardId);
    if (session) {
      setCurrentUser(session);  // <-- Only sets currentUser, doesn't add to activeUsers!
    }
  } catch (err) {
    console.warn('Could not fetch current user session:', err);
  }
}, [boardId, setCurrentUser]);
```

This caused a race condition where:
- If `getActiveUsers` API returned before the user was registered, `activeUsers` would be empty
- `currentUser` was set correctly, but never added to `activeUsers`
- The `ParticipantBar` iterates over `activeUsers` to render avatars, so the current user never appeared

## Solution Implemented

### Code Changes

**File:** `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`

```typescript
// AFTER (fixed code)
const fetchCurrentUserSession = useCallback(async () => {
  if (!boardId) return;

  try {
    const session = await BoardAPI.getCurrentUserSession(boardId);
    if (session) {
      setCurrentUser(session);
      // Also add current user to activeUsers so they appear in the participant bar
      const activeUser: ActiveUser = {
        alias: session.alias,
        is_admin: session.is_admin,
        last_active_at: session.last_active_at,
        created_at: session.created_at,
      };
      addActiveUser(activeUser);
    }
  } catch (err) {
    // Non-critical - session might not exist yet
    console.warn('Could not fetch current user session:', err);
  }
}, [boardId, setCurrentUser, addActiveUser]);
```

### Additional Fix: Race Condition Handling

The initial fix was incomplete. A race condition existed where:
1. `fetchActiveUsers()` and `fetchCurrentUserSession()` run in parallel
2. If `fetchCurrentUserSession()` completes first, it adds the user via `addActiveUser()`
3. But then `fetchActiveUsers()` completes and calls `setActiveUsers()` which **overwrites the entire array**
4. The user added in step 2 is lost

**Additional fix in `fetchActiveUsers()`:**

```typescript
const fetchActiveUsers = useCallback(async () => {
  // ... fetch and set active users ...
  setActiveUsers(response.active_users);

  // UTB-014: Ensure current user is in activeUsers after API response
  // This handles the race condition where getCurrentUserSession completes
  // before getActiveUsers, and setActiveUsers overwrites the added user
  const currentSession = useUserStore.getState().currentUser;
  if (currentSession) {
    addActiveUser({
      alias: currentSession.alias,
      is_admin: currentSession.is_admin,
      last_active_at: currentSession.last_active_at,
      created_at: currentSession.created_at,
    });
  }
}, [boardId, setActiveUsers, addActiveUser, setLoading, setError]);
```

### Why This Works

1. **Immediate visibility:** When the current user session is fetched, they are immediately added to `activeUsers`
2. **No duplicates:** The existing `addActiveUser` function in `userStore.ts` already handles deduplication by checking if a user with the same alias exists
3. **Race condition safe:** Both functions now ensure the current user is added after their respective operations complete
4. **Order independent:** Whether `getActiveUsers` or `getCurrentUserSession` completes first, the user will appear correctly

## Code Review Comments

### Approved Items

- (praise) Root cause correctly identified
- (praise) Fix leverages existing `addActiveUser` deduplication logic
- (praise) Dependency array correctly updated to include `addActiveUser`
- (praise) Excellent test coverage for both fix case and deduplication

### Notes

- (nit) Minor redundancy where user might be fetched twice, but this is acceptable for correctness
- (blocking) Exclude `playwright-report/index.html` from commit (generated file)

## Test Results

### Unit Tests

```
tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts
  - should add current user to activeUsers after fetching session (UTB-014 fix)
  - should not duplicate user in activeUsers if already present (UTB-014)

Test Files  2 passed (2)
Tests       46 passed (46)
```

### New Tests Added

1. **`should add current user to activeUsers after fetching session (UTB-014 fix)`**
   - Simulates empty activeUsers from API
   - Verifies current user appears in activeUsers after session fetch

2. **`should not duplicate user in activeUsers if already present (UTB-014)`**
   - Simulates API already returning current user
   - Verifies no duplicate entry is created

### Updated Tests

- `should derive isCurrentUserCreator as false for non-creator` - Updated expected count from 3 to 4
- `should reject promotion by non-creator` - Updated expected count from 3 to 4

## Verification Checklist

- [x] Root cause identified and documented
- [x] Fix implemented in `useParticipantViewModel.ts`
- [x] Unit tests written for the fix
- [x] All existing tests pass (46/46)
- [x] Code review completed
- [x] No security concerns
- [x] No performance regressions
- [x] Documentation complete

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` | Bug Fix |
| `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts` | Test Updates |

## Dependencies

This bug is a blocker for:
- **UTB-015**: Card Author Display (needs user in activeUsers for alias lookup)
- **UTB-020**: Card Editing (needs user ownership verification)

---

*Report generated by Software Developer Agent - 2026-01-01*
