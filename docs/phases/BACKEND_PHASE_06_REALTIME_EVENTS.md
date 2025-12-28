# Phase 6: Real-time Event System

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/5 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement real-time event broadcasting using Socket.io to synchronize board state across all connected clients. Enable instant updates for card creation, reactions, board changes, and user presence.

---

## 📋 Task Breakdown

### 6.0 Implement Socket.io gateway setup

- [ ] Create `src/gateway/SocketGateway.ts` wrapper for Socket.io server
- [ ] Configure CORS for WebSocket connections
- [ ] Implement room management (join-board, leave-board events)
- [ ] Add heartbeat event handling
- [ ] Write unit tests for room management

**Acceptance Criteria:**
- Socket.io server starts alongside Express
- Clients can connect with cookie authentication
- Room = Board ID for scoped broadcasting
- Heartbeat keeps connection alive

**Files to Create:**
- `src/gateway/SocketGateway.ts`
- `src/gateway/socket-types.ts`
- `tests/unit/gateway/socket-gateway.test.ts`

---

### 6.1 Implement direct push from service to gateway

- [ ] Create `src/gateway/EventBroadcaster.ts` interface
- [ ] Inject SocketGateway reference into service layer
- [ ] Implement `broadcast()` method on SocketGateway
- [ ] Add event type definitions (card:created, reaction:added, etc.)
- [ ] Write unit tests for event broadcasting

**Acceptance Criteria:**
- Services can emit events without importing Socket.io directly
- Events are typed with TypeScript
- Broadcasting targets specific rooms (boards)

**Event Types to Define:**
```typescript
interface BoardEvent {
  type: 'board:renamed' | 'board:closed' | 'board:deleted';
  payload: { boardId: string; ... };
}

interface CardEvent {
  type: 'card:created' | 'card:updated' | 'card:deleted' | 'card:moved' | 'card:linked' | 'card:unlinked';
  payload: { cardId: string; boardId: string; ... };
}

interface ReactionEvent {
  type: 'reaction:added' | 'reaction:removed';
  payload: { cardId: string; userAlias: string; ... };
}

interface UserEvent {
  type: 'user:joined' | 'user:left' | 'user:alias_changed';
  payload: { boardId: string; userAlias: string; ... };
}
```

---

### 6.2 Add real-time events to BoardService

- [ ] Emit `board:renamed` event when board name changes
- [ ] Emit `board:closed` event when board is closed
- [ ] Emit `board:deleted` event when board is deleted
- [ ] Emit `user:joined` event when user joins board
- [ ] Write integration tests verifying events received by clients

**Events:**

| Event | Trigger | Payload |
|-------|---------|---------|
| `board:renamed` | `updateBoardName()` | `{ boardId, name }` |
| `board:closed` | `closeBoard()` | `{ boardId, closedAt }` |
| `board:deleted` | `deleteBoard()` | `{ boardId }` |

---

### 6.3 Add real-time events to CardService

- [ ] Emit `card:created` event after card creation
- [ ] Emit `card:updated` event after card update
- [ ] Emit `card:deleted` event after card deletion
- [ ] Emit `card:moved` event when card moves to different column
- [ ] Emit `card:linked` and `card:unlinked` events for relationships
- [ ] Write integration tests with Socket.io client

**Events:**

| Event | Trigger | Payload |
|-------|---------|---------|
| `card:created` | `createCard()` | Full card object |
| `card:updated` | `updateCard()` | `{ cardId, content, updatedAt }` |
| `card:deleted` | `deleteCard()` | `{ cardId }` |
| `card:moved` | `moveCard()` | `{ cardId, columnId }` |
| `card:linked` | `linkCards()` | `{ sourceId, targetId, linkType }` |
| `card:unlinked` | `unlinkCards()` | `{ sourceId, targetId, linkType }` |

---

### 6.4 Add real-time events to ReactionService

- [ ] Emit `reaction:added` event with user_alias and card_id
- [ ] Emit `reaction:removed` event when reaction is deleted
- [ ] Include updated reaction counts in event payload
- [ ] Write integration tests verifying all connected clients receive events

**Events:**

| Event | Trigger | Payload |
|-------|---------|---------|
| `reaction:added` | `addReaction()` | `{ cardId, userAlias, reactionType, directCount, aggregatedCount }` |
| `reaction:removed` | `removeReaction()` | `{ cardId, userAlias, directCount, aggregatedCount }` |

---

## 📁 Files to Create

```
src/gateway/
├── SocketGateway.ts      # Socket.io wrapper
├── EventBroadcaster.ts   # Interface for service → gateway
├── socket-types.ts       # Event type definitions
└── socket-handlers.ts    # Event handlers (join, leave, heartbeat)

tests/
├── unit/gateway/
│   └── socket-gateway.test.ts
└── integration/
    └── socket-events.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Socket Gateway (unit) | ~10 | Room management, connection |
| Event Broadcasting (unit) | ~8 | Event typing, broadcasting |
| Socket Events (integration) | ~15 | Full event flow with real Socket.io |
| **Total** | **~33** | |

---

## 📝 Technical Notes

### Architecture Pattern

```
Service Layer → EventBroadcaster Interface → SocketGateway → Socket.io → Clients

BoardService.updateBoardName()
  → eventBroadcaster.broadcast('board:renamed', { boardId, name })
  → socketGateway.to(boardId).emit('board:renamed', payload)
  → All clients in room receive event
```

### Room Management

```typescript
// When user joins board
socket.on('join-board', (boardId) => {
  socket.join(`board:${boardId}`);
  // Broadcast user:joined to room
});

// When broadcasting
io.to(`board:${boardId}`).emit(eventType, payload);
```

### Performance Targets

- Event latency: <200ms for 20 concurrent users
- Connection handling: Support 50 concurrent WebSocket connections
- Heartbeat interval: 30 seconds

---

## 🔗 Dependencies

- Socket.io (already in package.json)
- Phase 1-5 completed (services exist)
- Cookie authentication for WebSocket connections

---

## ⚠️ Considerations

1. **Cookie Auth for WebSocket**: Need to extract and validate cookie from handshake.

2. **Disconnection Handling**: Consider emitting `user:left` on disconnect.

3. **Reconnection Logic**: Client-side responsibility, but server should handle room rejoin.

4. **Event Ordering**: Events should be processed in order. Consider sequence numbers if needed.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 5](./BACKEND_PHASE_05_REACTION_DOMAIN.md) | [Next: Phase 7 →](./BACKEND_PHASE_07_TESTING_ADMIN_API.md)
