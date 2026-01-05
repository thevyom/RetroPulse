# UTB-030: New Participant Alias Not Shown

**Document Created**: 2026-01-03
**Severity**: High
**Status**: Open
**Related**: Similar to board creator ID issue

---

## Problem Summary

When a new participant joins the board, their alias is not displayed in the participant bar. The avatar may show but without the correct alias/initials.

---

## Root Cause Analysis

### Payload Field Name Mismatch

**Backend sends** ([socket-types.ts:128-132](backend/src/gateway/socket/socket-types.ts#L128-L132)):
```typescript
export interface UserJoinedPayload {
  boardId: string;
  userAlias: string;  // <-- camelCase "userAlias"
  isAdmin: boolean;   // <-- camelCase "isAdmin"
}
```

**Frontend expects** ([socket-types.ts:135-139](frontend/src/models/socket/socket-types.ts#L135-L139)):
```typescript
export interface UserJoinedEvent extends BaseEvent {
  board_id: string;   // <-- snake_case "board_id"
  alias: string;      // <-- just "alias"
  is_admin: boolean;  // <-- snake_case "is_admin"
}
```

**Frontend handler** ([useParticipantViewModel.ts:235-247](frontend/src/features/participant/viewmodels/useParticipantViewModel.ts#L235-L247)):
```typescript
const handleUserJoined = (event: { board_id: string; alias: string; is_admin: boolean }) => {
  if (event.board_id === boardId) {  // <-- backend sends "boardId"
    const newUser: ActiveUser = {
      alias: event.alias,            // <-- backend sends "userAlias"
      is_admin: event.is_admin,      // <-- backend sends "isAdmin"
      // ...
    };
    addActiveUser(newUser);
  }
};
```

### The Mismatch Table

| Field | Backend sends | Frontend expects |
|-------|---------------|------------------|
| Board ID | `boardId` | `board_id` |
| User Alias | `userAlias` | `alias` |
| Admin Status | `isAdmin` | `is_admin` |

### Result

When the frontend receives the socket event:
- `event.board_id` is `undefined` (backend sent `boardId`)
- `event.alias` is `undefined` (backend sent `userAlias`)
- `event.is_admin` is `undefined` (backend sent `isAdmin`)

The `if (event.board_id === boardId)` check fails because `undefined !== "abc123"`, so the user is never added to the active users list.

---

## Affected Files

| File | Issue |
|------|-------|
| [backend/src/gateway/socket/socket-types.ts](backend/src/gateway/socket/socket-types.ts) | Uses camelCase naming |
| [frontend/src/models/socket/socket-types.ts](frontend/src/models/socket/socket-types.ts) | Uses snake_case naming |
| [frontend/src/features/participant/viewmodels/useParticipantViewModel.ts](frontend/src/features/participant/viewmodels/useParticipantViewModel.ts) | Handler expects snake_case |

---

## Similar Issues in Codebase

This same naming convention mismatch may affect other socket events. Checking the patterns:

### Events that use camelCase (backend):
- `card:linked` - sends `sourceId`, `targetId`, `linkType`
- `user:joined` - sends `boardId`, `userAlias`, `isAdmin`

### Events that use snake_case (backend):
- `card:updated` - sends `card_id`, `content`
- `card:deleted` - sends `card_id`
- `user:left` - sends (needs to check)

The inconsistency in naming conventions across socket events is causing multiple bugs.

---

## Proposed Fixes

### Option A: Fix Frontend to Match Backend (Recommended)
Update frontend socket handler to use camelCase field names:

```typescript
// useParticipantViewModel.ts
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

Update frontend socket-types.ts:
```typescript
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}
```

### Option B: Fix Backend to Match Frontend
Update backend to send snake_case (more breaking changes):

```typescript
// backend EventBroadcaster.ts
userJoined(payload: UserJoinedPayload): void {
  this.broadcast(payload.boardId, 'user:joined', {
    board_id: payload.boardId,
    alias: payload.userAlias,
    is_admin: payload.isAdmin,
  });
}
```

### Option C: Standardize All Socket Events
Create a consistent naming convention across ALL socket events (both backend and frontend). This is the most work but prevents future bugs.

---

## Acceptance Criteria

- [ ] New participants appear in the participant bar immediately
- [ ] New participant alias is displayed correctly
- [ ] New participant admin status is shown correctly
- [ ] Socket event field names are consistent between backend and frontend

---

## Testing

1. Open board in two browser windows
2. In window 2, join the board as a new user
3. Verify window 1 shows the new participant with correct alias
4. Verify the new participant avatar shows correct initials

---

*Bug identified during user testing - 2026-01-03*
