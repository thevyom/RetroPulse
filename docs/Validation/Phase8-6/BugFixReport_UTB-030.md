# Bug Fix Report: UTB-030

**Bug ID:** UTB-030
**Title:** New Participant Alias Not Shown
**Priority:** P0 - Critical
**Status:** Fixed
**Date:** 2026-01-03

---

## Bug Description

When a new participant joins the board, their alias is not displayed in the participant bar. The avatar may show but without the correct alias/initials.

## Root Cause Analysis

**Issue:** Socket payload field name mismatch between backend (camelCase) and frontend (snake_case).

The backend sends the `user:joined` event with camelCase field names:
```typescript
// backend/src/gateway/socket/socket-types.ts
export interface UserJoinedPayload {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}
```

However, the frontend was expecting snake_case field names:
```typescript
// frontend/src/models/socket/socket-types.ts (BEFORE)
export interface UserJoinedEvent extends BaseEvent {
  board_id: string;
  alias: string;
  is_admin: boolean;
}
```

This mismatch caused the frontend handler to read `undefined` values for `event.board_id`, `event.alias`, and `event.is_admin`, resulting in:
1. Board ID comparison failing (undefined !== boardId)
2. New user not being added to the active users list
3. Alias not being displayed in the participant bar

## Solution Implemented

### File 1: `frontend/src/models/socket/socket-types.ts`

Updated the `UserJoinedEvent` interface to use camelCase field names matching the backend:

```typescript
// BEFORE (broken - expects snake_case):
export interface UserJoinedEvent extends BaseEvent {
  board_id: string;
  alias: string;
  is_admin: boolean;
}

// AFTER (fixed - matches backend camelCase):
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}
```

### File 2: `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`

Updated the `handleUserJoined` handler to use the new camelCase field names:

```typescript
// BEFORE (broken):
const handleUserJoined = (event: { board_id: string; alias: string; is_admin: boolean }) => {
  if (event.board_id === boardId) {
    const newUser: ActiveUser = {
      alias: event.alias,
      is_admin: event.is_admin,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    addActiveUser(newUser);
    setUserOnline(event.alias);
  }
};

// AFTER (fixed):
const handleUserJoined = (event: { boardId: string; userAlias: string; isAdmin: boolean }) => {
  if (event.boardId === boardId) {
    const newUser: ActiveUser = {
      alias: event.userAlias,
      is_admin: event.isAdmin,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    addActiveUser(newUser);
    setUserOnline(event.userAlias);
  }
};
```

## Code Review Comments

### Changes Review

1. **Type Safety:** The fix properly updates both the interface and the handler to maintain TypeScript type safety.

2. **Field Mapping:** The handler correctly maps camelCase socket fields (`userAlias`, `isAdmin`) to snake_case store fields (`alias`, `is_admin`) for consistency with the rest of the frontend data model.

3. **Online Status:** The `setUserOnline(event.userAlias)` call now receives the correct alias value, ensuring the new participant is properly marked as online.

4. **Board ID Check:** The board ID comparison now works correctly with `event.boardId`, filtering events only for the current board.

### Potential Improvements (Future)

- Consider adding a serialization layer to automatically convert between backend camelCase and frontend snake_case conventions
- Add integration tests to catch field name mismatches between frontend and backend

## Test Results

### Unit Tests Updated

File: `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts`

Updated existing tests and added new tests for UTB-030:

1. **`should add user when user:joined event is received`** - Updated to use camelCase fields
2. **`should ignore user:joined event for different board`** - Updated to use camelCase fields
3. **`should mark new user as online when user:joined event is received (UTB-030)`** - NEW: Verifies user is added and marked online
4. **`should correctly map admin status from socket event (UTB-030)`** - NEW: Verifies admin status is correctly mapped

### Test Commands

```bash
cd frontend && npm run test:run -- --grep "participant"
```

## Verification Checklist

- [x] New participants appear in participant bar immediately
- [x] Alias displayed correctly (initials generated from `userAlias`)
- [x] Admin status shown correctly (mapped from `isAdmin` to `is_admin`)
- [x] Socket event field names consistent with backend
- [x] New user marked as online after joining
- [x] Unit tests updated and passing
- [x] No breaking changes to existing functionality

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/models/socket/socket-types.ts` | Updated `UserJoinedEvent` interface to camelCase |
| `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` | Updated `handleUserJoined` handler |
| `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts` | Updated tests + added new UTB-030 specific tests |

---

*Bug Fix by Software Developer - 2026-01-03*
