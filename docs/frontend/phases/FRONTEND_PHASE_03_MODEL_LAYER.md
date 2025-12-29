# Phase 3: Model Layer (API Services & State)

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/16 complete
**Dependencies**: Phase 1-2 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the Model layer following MVVM architecture: API service clients (BoardAPI, CardAPI, ReactionAPI), WebSocket service for real-time events, and Zustand state stores for local state management.

---

## 📋 Task Breakdown

### 5. API Service Infrastructure

#### 5.1 Create Axios HTTP Client Configuration

- [ ] Create `models/api/client.ts`
- [ ] Configure base URL from environment variables
- [ ] Set up request/response interceptors
- [ ] Add cookie handling for session auth (withCredentials)
- [ ] Add error response parsing

**Implementation:**
```typescript
// models/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/v1',
  withCredentials: true, // Send cookies
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data?.error;
    return Promise.reject(apiError || error);
  }
);
```

**Reference**: Section 6.2 of design doc

---

#### 5.2 Implement BoardAPI Service

- [ ] Create `models/api/BoardAPI.ts`
- [ ] Implement `getBoard(boardId)` - GET /boards/:id
- [ ] Implement `createBoard(data)` - POST /boards
- [ ] Implement `updateBoardName(boardId, name)` - PATCH /boards/:id/name
- [ ] Implement `closeBoard(boardId)` - PATCH /boards/:id/close
- [ ] Implement `addAdmin(boardId, userHash)` - POST /boards/:id/admins
- [ ] Implement `joinBoard(boardId, alias)` - POST /boards/:id/join
- [ ] Implement `updateAlias(boardId, alias)` - PATCH /boards/:id/users/alias

**Interface:**
```typescript
// models/api/BoardAPI.ts
export interface BoardAPI {
  getBoard(boardId: string): Promise<Board>;
  createBoard(data: CreateBoardDTO): Promise<Board>;
  updateBoardName(boardId: string, name: string): Promise<Board>;
  closeBoard(boardId: string): Promise<Board>;
  addAdmin(boardId: string, userHash: string): Promise<void>;
  joinBoard(boardId: string, alias: string): Promise<UserSession>;
  updateAlias(boardId: string, alias: string): Promise<UserSession>;
}
```

**Reference**: Section 6.2.1, Backend API spec

---

#### 5.3 Write Unit Tests for BoardAPI

- [ ] Mock axios for all methods
- [ ] Test correct HTTP method and URL
- [ ] Test request payload structure
- [ ] Test response data extraction
- [ ] Test error handling (404, 403, 409)

**Reference**: Test plan Section 5.1

---

#### 5.4 Implement CardAPI Service

- [ ] Create `models/api/CardAPI.ts`
- [ ] Implement `getCards(boardId, includeRelationships)` - GET /boards/:id/cards
- [ ] Implement `checkCardQuota(boardId)` - GET /boards/:id/cards/quota
- [ ] Implement `createCard(boardId, data)` - POST /boards/:id/cards
- [ ] Implement `updateCard(cardId, content)` - PUT /cards/:id
- [ ] Implement `deleteCard(cardId)` - DELETE /cards/:id
- [ ] Implement `moveCard(cardId, columnId)` - PATCH /cards/:id/column
- [ ] Implement `linkCards(sourceId, targetId, linkType)` - POST /cards/:id/link
- [ ] Implement `unlinkCards(sourceId, targetId, linkType)` - DELETE /cards/:id/link

**Interface:**
```typescript
// models/api/CardAPI.ts
export interface CardQuota {
  current_count: number;
  limit: number | null;
  can_create: boolean;
  limit_enabled: boolean;
}

export interface CardAPI {
  getCards(boardId: string, includeRelationships?: boolean): Promise<CardsResponse>;
  checkCardQuota(boardId: string): Promise<CardQuota>;
  createCard(boardId: string, data: CreateCardDTO): Promise<Card>;
  updateCard(cardId: string, content: string): Promise<Card>;
  deleteCard(cardId: string): Promise<void>;
  moveCard(cardId: string, columnId: string): Promise<Card>;
  linkCards(sourceId: string, targetId: string, linkType: LinkType): Promise<void>;
  unlinkCards(sourceId: string, targetId: string, linkType: LinkType): Promise<void>;
}
```

**Reference**: Section 6.2.2, Backend API spec

---

#### 5.5 Write Unit Tests for CardAPI

- [ ] Test all CRUD operations
- [ ] Test quota check API
- [ ] Test link/unlink operations
- [ ] Test embedded relationships parameter

**Reference**: Test plan Section 5.1

---

#### 5.6 Implement ReactionAPI Service

- [ ] Create `models/api/ReactionAPI.ts`
- [ ] Implement `addReaction(cardId, type)` - POST /cards/:id/reactions
- [ ] Implement `removeReaction(cardId)` - DELETE /cards/:id/reactions
- [ ] Implement `checkQuota(boardId)` - GET /boards/:id/reactions/quota

**Interface:**
```typescript
// models/api/ReactionAPI.ts
export interface ReactionQuota {
  current_count: number;
  limit: number | null;
  can_react: boolean;
  limit_enabled: boolean;
}

export interface ReactionAPI {
  addReaction(cardId: string, type: ReactionType): Promise<Reaction>;
  removeReaction(cardId: string): Promise<void>;
  checkQuota(boardId: string): Promise<ReactionQuota>;
}
```

**Reference**: Section 6.2.3

---

#### 5.7 Write Unit Tests for ReactionAPI

- [ ] Test add/remove operations
- [ ] Test quota check
- [ ] Test error handling

**Reference**: Test plan Section 5.1

---

### 6. WebSocket Service

#### 6.1 Implement SocketService

- [ ] Create `models/socket/SocketService.ts`
- [ ] Implement `connect(boardId)` with socket.io-client
- [ ] Implement `disconnect()` method
- [ ] Implement `on(eventType, handler)` subscription
- [ ] Implement `off(eventType)` unsubscription
- [ ] Implement `emit(eventType, data)` for client events
- [ ] Handle 'join-board' and 'leave-board' events

**Implementation:**
```typescript
// models/socket/SocketService.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(boardId: string, userAlias?: string): void {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      withCredentials: true,
    });
    this.socket.emit('join-board', { boardId, userAlias });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leave-board', this.currentBoardId);
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on<T>(event: string, handler: (data: T) => void): void { ... }
  off(event: string): void { ... }
  emit(event: string, data?: unknown): void { ... }
}

export const socketService = new SocketService();
```

**Events to Handle:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-board` | Client → Server | Join a board room |
| `leave-board` | Client → Server | Leave a board room |
| `heartbeat` | Client → Server | Keep-alive signal |
| `board:renamed` | Server → Client | Board name changed |
| `board:closed` | Server → Client | Board was closed |
| `card:created` | Server → Client | New card added |
| `card:updated` | Server → Client | Card content changed |
| `card:deleted` | Server → Client | Card removed |
| `reaction:added` | Server → Client | Reaction added |
| `reaction:removed` | Server → Client | Reaction removed |
| `user:joined` | Server → Client | User joined board |
| `user:left` | Server → Client | User left board |

**Reference**: Section 6.3 of design doc

---

#### 6.2 Write Tests for SocketService

- [ ] Mock socket.io-client
- [ ] Test connect establishes connection
- [ ] Test event subscription
- [ ] Test disconnect cleanup

**Reference**: Test plan Section 5.3

---

### 7. Zustand State Stores

#### 7.1 Implement boardStore

- [ ] Create `models/stores/boardStore.ts`
- [ ] Define Board state shape
- [ ] Implement `setBoard(board)` action
- [ ] Implement `updateBoardName(name)` action
- [ ] Implement `closeBoard(closedAt)` action
- [ ] Implement `addAdmin(userHash)` action

**Implementation:**
```typescript
// models/stores/boardStore.ts
import { create } from 'zustand';

interface BoardState {
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBoard: (board: Board) => void;
  updateBoardName: (name: string) => void;
  closeBoard: (closedAt: string) => void;
  addAdmin: (userHash: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  board: null,
  isLoading: false,
  error: null,

  setBoard: (board) => set({ board, isLoading: false, error: null }),
  updateBoardName: (name) => set((state) => ({
    board: state.board ? { ...state.board, name } : null
  })),
  closeBoard: (closedAt) => set((state) => ({
    board: state.board ? { ...state.board, state: 'closed', closed_at: closedAt } : null
  })),
  addAdmin: (userHash) => set((state) => ({
    board: state.board ? { ...state.board, admins: [...state.board.admins, userHash] } : null
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

**Reference**: Section 6.1.1 of design doc

---

#### 7.2 Write Tests for boardStore

- [ ] Test initial state
- [ ] Test setBoard updates state
- [ ] Test updateBoardName mutation
- [ ] Test closeBoard sets state to 'closed'

**Reference**: Test plan Section 5.2

---

#### 7.3 Implement cardStore

- [ ] Create `models/stores/cardStore.ts`
- [ ] Define Card state with Map<cardId, Card>
- [ ] Implement `addCard(card)` action
- [ ] Implement `updateCard(cardId, updates)` action
- [ ] Implement `removeCard(cardId)` action
- [ ] Implement `setCardsWithChildren(cards)` for API response
- [ ] Implement `incrementReactionCount(cardId)` action
- [ ] Implement `decrementReactionCount(cardId)` action
- [ ] Create derived state: cardsByColumn

**Implementation:**
```typescript
// models/stores/cardStore.ts
interface CardState {
  cards: Map<string, Card>;
  isLoading: boolean;

  // Actions
  addCard: (card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
  setCards: (cards: Card[]) => void;
  incrementReactionCount: (cardId: string) => void;
  decrementReactionCount: (cardId: string) => void;

  // Derived
  getCardsByColumn: (columnId: string) => Card[];
}
```

**Reference**: Section 6.1.2

---

#### 7.4 Write Tests for cardStore

- [ ] Test addCard adds to map
- [ ] Test setCardsWithChildren populates embedded children
- [ ] Test incrementReactionCount updates count
- [ ] Test removeCard deletes from map

**Reference**: Test plan Section 5.2

---

#### 7.5 Implement userStore

- [ ] Create `models/stores/userStore.ts`
- [ ] Define User state with currentUser and activeUsers
- [ ] Implement `setCurrentUser(user)` action
- [ ] Implement `updateAlias(newAlias)` action
- [ ] Implement `addActiveUser(user)` action
- [ ] Implement `removeUser(userHash)` action
- [ ] Implement `updateHeartbeat(userHash)` action

**Implementation:**
```typescript
// models/stores/userStore.ts
interface UserState {
  currentUser: UserSession | null;
  activeUsers: ActiveUser[];

  // Actions
  setCurrentUser: (user: UserSession) => void;
  updateAlias: (newAlias: string) => void;
  addActiveUser: (user: ActiveUser) => void;
  removeUser: (userHash: string) => void;
  updateHeartbeat: (userHash: string, lastActiveAt: string) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
}
```

**Reference**: Section 6.1.3

---

#### 7.6 Write Tests for userStore

- [ ] Test setCurrentUser updates state
- [ ] Test updateAlias modifies currentUser
- [ ] Test addActiveUser adds to array
- [ ] Test heartbeat updates last_active_at

**Reference**: Test plan Section 5.2

---

## 📁 Files to Create

```
src/models/
├── api/
│   ├── client.ts           # Axios configuration
│   ├── BoardAPI.ts         # Board API service
│   ├── CardAPI.ts          # Card API service
│   ├── ReactionAPI.ts      # Reaction API service
│   └── index.ts            # Exports
├── socket/
│   ├── SocketService.ts    # WebSocket service
│   ├── socket-types.ts     # Event type definitions
│   └── index.ts            # Exports
├── stores/
│   ├── boardStore.ts       # Board state
│   ├── cardStore.ts        # Card state
│   ├── userStore.ts        # User state
│   └── index.ts            # Exports
└── types/
    ├── board.ts            # Board types
    ├── card.ts             # Card types
    ├── user.ts             # User types
    └── index.ts            # Exports

tests/unit/models/
├── api/
│   ├── BoardAPI.test.ts
│   ├── CardAPI.test.ts
│   └── ReactionAPI.test.ts
├── socket/
│   └── SocketService.test.ts
└── stores/
    ├── boardStore.test.ts
    ├── cardStore.test.ts
    └── userStore.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| BoardAPI (unit) | ~12 | HTTP calls, error handling |
| CardAPI (unit) | ~15 | CRUD, linking, quota |
| ReactionAPI (unit) | ~6 | Add/remove, quota |
| SocketService (unit) | ~8 | Connect, events, disconnect |
| boardStore (unit) | ~6 | State mutations |
| cardStore (unit) | ~8 | Map operations, derived |
| userStore (unit) | ~6 | User state |
| **Total** | **~61** | |

---

## ✅ Acceptance Criteria

- [ ] All API methods match backend specification
- [ ] WebSocket connects and handles events
- [ ] Zustand stores update state correctly
- [ ] Types match backend API contracts
- [ ] Unit tests pass with >90% coverage

---

## 🧪 Related Test Plan

See [TEST_PHASE_03_MODEL_LAYER.md](../test-docs/TEST_PHASE_03_MODEL_LAYER.md) for:
- API service test patterns (mocking axios)
- Zustand store test patterns
- SocketService test patterns

---

## 📝 Notes

- Import types from backend if possible (shared package)
- Use MSW for integration testing in later phases
- Consider error boundary integration for API failures

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 2](./FRONTEND_PHASE_02_SHARED_UTILITIES.md) | [Next: Phase 4 →](./FRONTEND_PHASE_04_VIEWMODEL_LAYER.md)
