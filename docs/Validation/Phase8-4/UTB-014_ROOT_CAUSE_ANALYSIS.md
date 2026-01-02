# UTB-014: Root Cause Analysis and Proposed Solution

**Date**: 2026-01-02
**Bug**: Current user not appearing in participant bar / MyUserCard not showing
**Status**: Root cause identified, partial fix implemented

---

## Problem Summary

The current user's avatar doesn't appear in the ParticipantBar, and the MyUserCard component doesn't show in the header. This prevents users from seeing themselves as participants and editing their alias.

---

## Root Cause Analysis

### Issue 1: Missing Backend Endpoint

**Finding**: The frontend calls `GET /boards/:id/users/me` to fetch the current user's session, but this endpoint **did not exist** on the backend.

**Error observed**:
```
[UTB-014 DEBUG] Could not fetch current user session: ApiRequestError: Route not found
```

**Impact**: `getCurrentUserSession()` always returned null, so `currentUser` was never populated.

### Issue 2: User Session Not Created on Board Creation

**Finding**: When a board is created with `creator_alias`, the backend does NOT automatically create a user session for the creator.

**Flow analysis**:
1. Frontend calls `POST /boards` with `creator_alias: "John"`
2. Backend creates the board and sets the creator's cookie_hash as admin
3. Backend does NOT create a `user_sessions` document for the creator
4. User navigates to board page
5. Frontend calls `GET /boards/:id/users/me` - returns null (no session exists)
6. Frontend calls `PATCH /boards/:id/users/heartbeat` - fails with "User session not found. Please join the board first."

**Error observed**:
```
Heartbeat failed: ApiRequestError: User session not found. Please join the board first.
```

### Issue 3: Missing Join Flow

**Finding**: The proper flow requires users to call `POST /boards/:id/join` with an alias to create their session. The frontend skips this step after board creation.

**Backend API available**:
- `POST /boards/:id/join` - Creates user session with alias
- `GET /boards/:id/users` - Get active users (requires session)
- `PATCH /boards/:id/users/heartbeat` - Update activity (requires session)
- `PATCH /boards/:id/users/alias` - Update alias (requires session)
- `GET /boards/:id/users/me` - **WAS MISSING** - Get current user's session

---

## Changes Already Made

### 1. Added `GET /boards/:id/users/me` Endpoint (Backend)

**Files modified**:
- `backend/src/domains/user/user-session.routes.ts` - Added route
- `backend/src/domains/user/user-session.controller.ts` - Added controller method

**Implementation**:
```typescript
// Route
router.get('/users/me', controller.getCurrentUserSession);

// Controller
getCurrentUserSession = async (req, res, next) => {
  const boardId = requireParam(req.params.id, 'Board ID');
  const cookieHash = req.hashedCookieId;
  const userSession = await this.userSessionService.getUserSession(boardId, cookieHash);
  sendSuccess(res, { user_session: userSession });
};
```

The service method `getUserSession()` already existed in `user-session.service.ts`.

### 2. Updated Frontend API (Partial)

**File**: `frontend/src/models/api/BoardAPI.ts`

Changed `getCurrentUserSession()` to call the new `/users/me` endpoint.

### 3. Added `creator_alias` to Schema (Partial)

**File**: `backend/src/shared/validation/schemas.ts`

Added optional `creator_alias` field to `createBoardSchema`.

---

## Proposed Complete Solution

### Option A: Frontend Auto-Join After Board Creation (Recommended)

After creating a board, immediately call `/join` with the creator's alias.

**Changes required**:
1. Modify `useCreateBoardViewModel.ts`:
```typescript
const createBoard = async (data: CreateBoardDTO) => {
  const board = await BoardAPI.createBoard(data);

  // Auto-join the board with the creator's alias
  if (data.creator_alias) {
    await BoardAPI.joinBoard(board.id, { alias: data.creator_alias });
  }

  return board;
};
```

**Pros**: No backend changes needed beyond the `/users/me` endpoint
**Cons**: Two API calls instead of one

### Option B: Backend Auto-Join on Board Creation

Modify the backend to auto-create a user session when `creator_alias` is provided.

**Changes required**:
1. Inject `UserSessionService` into `BoardController` or `BoardService`
2. After creating board, call `userSessionService.joinBoard()` with creator_alias
3. Optionally return the user_session in the board creation response

**Pros**: Single API call, cleaner UX
**Cons**: More complex backend changes, service interdependency

### Option C: Hybrid - Return Session in Board Creation Response

Modify backend `POST /boards` to optionally return the user session.

**Changes required**:
1. Update `BoardController.createBoard` to accept `creator_alias`
2. If `creator_alias` provided, create user session
3. Return `{ board: {...}, user_session: {...} }` in response
4. Update frontend to use returned session

**Pros**: Single call, session immediately available
**Cons**: Changes board creation response structure

---

## Additional Issues Discovered

### Cookie Persistence

The user reported having to re-enter their alias every time they create a board. This is expected behavior because:

1. The `retro_session_id` cookie identifies the browser, not the user's name
2. Alias is per-board (stored in `user_sessions` collection)
3. There's no global "remembered alias" feature

**Potential enhancement**: Store last-used alias in localStorage and pre-fill the form.

### Race Condition (Previously Identified)

A race condition was identified where `setActiveUsers()` could overwrite users added by `addActiveUser()`. This was "fixed" but the fix is irrelevant if `getCurrentUserSession()` never succeeds in the first place.

---

## Testing Requirements

Once the fix is implemented:

### Unit Tests
1. Test `GET /boards/:id/users/me` returns session when exists
2. Test `GET /boards/:id/users/me` returns null when no session
3. Test `GET /boards/:id/users/me` returns 404 when board doesn't exist
4. Test auto-join flow after board creation

### Integration Tests
1. Create board with alias → verify user appears in participant bar
2. Create board → join → verify MyUserCard shows correct alias
3. Multiple users joining → verify all appear in participant list

### E2E Tests
1. Full flow: Create board → see avatar → edit alias → see updated avatar

---

## Files to Modify (Summary)

### Backend (Already Partially Done)
- [x] `backend/src/domains/user/user-session.routes.ts` - Added `/users/me` route
- [x] `backend/src/domains/user/user-session.controller.ts` - Added controller method
- [x] `backend/src/shared/validation/schemas.ts` - Added `creator_alias` to schema
- [ ] Need to implement auto-join on board creation (Option A, B, or C)

### Frontend (Already Partially Done)
- [x] `frontend/src/models/api/BoardAPI.ts` - Updated `getCurrentUserSession()`
- [ ] `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts` - Add auto-join call
- [ ] Remove debug logging after fix is verified

### Tests (Not Done)
- [ ] `backend/tests/unit/user-session.controller.test.ts`
- [ ] `backend/tests/integration/user-session.routes.test.ts`
- [ ] `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts`

---

## Debug Logging Added (To Be Removed)

The following files have debug logging that should be removed after the fix:

1. `frontend/src/models/api/client.ts` - Request/response interceptors
2. `frontend/src/models/api/BoardAPI.ts` - getCurrentUserSession logging
3. `frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts` - createBoard logging
4. `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` - fetch logging
5. `frontend/src/features/board/components/RetroBoardPage.tsx` - participantVM state logging

---

## Recommended Next Steps

1. **Choose solution approach** (Option A recommended for simplicity)
2. **Implement the fix** with proper error handling
3. **Restart backend** to pick up new route
4. **Test manually** using browser DevTools
5. **Write unit and integration tests**
6. **Remove debug logging**
7. **Update bug fix report** with final solution

---

*Analysis by Principal Engineer Agent - 2026-01-02*
