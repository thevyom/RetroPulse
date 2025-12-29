# Frontend Project Overview - RetroPulse

> **Quick Context Document** for AI Assistants and Developers
> Last Updated: 2025-12-28 | Status: Pre-Implementation

---

## 1. Project Goals

RetroPulse is a **real-time collaborative retrospective board** for agile teams. The frontend enables:

- **Real-time collaboration** - Instant sync across 50+ concurrent users via WebSocket
- **Drag-and-drop interactions** - Card linking, column moves using @dnd-kit
- **MVVM architecture** - Clean separation of concerns for maintainability
- **Anonymous participation** - Privacy-first with optional anonymous cards

**MVP Success Criteria:**
- All 80 frontend tasks completed
- 80%+ unit test coverage
- Real-time sync <200ms latency
- Accessibility audit passed

---

## 2. Key Tasks & Priorities

### Phase Overview (9 Phases, 80 Tasks)

| Priority | Phases | Focus |
|----------|--------|-------|
| **High** | 1-5 | Core functionality: Setup, Utils, Model, ViewModel, View |
| **Medium** | 6-7 | Integration: Real-time, E2E Testing |
| **Low** | 8-9 | Polish: Performance, Accessibility, Documentation |

### Current Focus: Phase 1 - Project Setup

1. Initialize Vite + React + TypeScript
2. Install core deps (Zustand, MUI, Socket.io-client, @dnd-kit)
3. Configure Vitest + Playwright testing
4. Set up MVVM folder structure with path aliases

### Critical Path

```
Phase 1 (Setup) → Phase 3 (Model) → Phase 4 (ViewModel) → Phase 5 (View) → Phase 6 (Real-time)
                        ↓
                  Phase 2 (Utils)
```

> **Detailed Tasks:** See [FRONTEND_MASTER_TASK_LIST.md](./phases/FRONTEND_MASTER_TASK_LIST.md)

---

## 3. High-Level Architecture

### MVVM Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                          View Layer                             │
│   RetroBoardPage, Header, ParticipantBar, RetroColumn, Card     │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ViewModel Layer                           │
│   useBoardViewModel, useCardViewModel, useParticipantViewModel  │
│   useDragDropViewModel                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Model Layer                             │
│   API Services: BoardAPI, CardAPI, ReactionAPI                  │
│   WebSocket: SocketService                                      │
│   State: boardStore, cardStore, userStore (Zustand)             │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Does | Does NOT |
|-------|------|----------|
| **View** | Render UI, handle user events, display loading/error states | API calls, business logic, state mutations |
| **ViewModel** | Business logic, state orchestration, validation, error handling | DOM manipulation, direct API calls |
| **Model** | API communication, WebSocket management, state persistence | UI logic, user workflows |

### Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18+ / TypeScript 5+ |
| Build | Vite |
| State | Zustand |
| UI | Material-UI v5 |
| Drag & Drop | @dnd-kit |
| Real-time | Socket.io-client |
| HTTP | Axios |
| Testing | Vitest + Playwright |

---

## 4. Core API Overview

### Key Endpoints

| Feature | Endpoint | Method |
|---------|----------|--------|
| Get Board | `/boards/:id` | GET |
| Create Card | `/boards/:id/cards` | POST |
| Update Card | `/cards/:id` | PUT |
| Delete Card | `/cards/:id` | DELETE |
| Link Cards | `/cards/:id/link` | POST |
| Add Reaction | `/cards/:id/reactions` | POST |
| Check Quota | `/boards/:id/cards/quota` | GET |
| Join Board | `/boards/:id/join` | POST |
| Update Alias | `/boards/:id/users/alias` | PATCH |

### WebSocket Events

**Server → Client:**
- `card:created`, `card:updated`, `card:deleted`
- `reaction:added`, `reaction:removed`
- `board:renamed`, `board:closed`
- `user:joined`, `user:alias_changed`

**Client → Server:**
- `join-board`, `leave-board`, `heartbeat`

### Authentication

Cookie-based session with SHA-256 hashing:
- Session ID stored in `retro_session_id` cookie
- Backend receives hashed version only
- Supports anonymous cards (hash stored, but not exposed)

> **Full API Spec:** See [BACKEND_API_SPECIFICATION_V2.md](../BACKEND_API_SPECIFICATION_V2.md)

---

## 5. Testing Approach

### Test Strategy Summary (~235 Tests)

| Phase | Tests | Focus |
|-------|-------|-------|
| View Layer | ~80 | Component rendering, user interactions |
| ViewModel Layer | ~55 | Business logic, state management |
| Model Layer | ~25 | API services, stores, WebSocket |
| Integration | ~30 | Cross-layer communication |
| E2E | ~15 | Critical user journeys |
| Real-time | ~15 | Socket events, optimistic updates |
| Drag-Drop | ~15 | Card linking, column moves |

### Testing Patterns

**Unit Tests (Vitest):**
```typescript
// Component test pattern
render(<RetroCard card={mockCard} />)
expect(screen.getByText('Card content')).toBeInTheDocument()

// ViewModel test pattern
const { result } = renderHook(() => useCardViewModel('board-123'))
await act(() => result.current.createCard({ content: 'Test' }))
expect(result.current.cards).toHaveLength(1)
```

**Integration Tests (MSW + Vitest):**
- Mock API responses with MSW handlers
- Test ViewModel → API → Store flow
- Verify optimistic updates and rollbacks

**E2E Tests (Playwright):**
- Multi-user real-time sync
- Card quota enforcement
- Anonymous card privacy
- Board lifecycle (create → use → close)

### Coverage Target

- 80%+ code coverage
- All critical paths tested
- All WebSocket events verified

> **Detailed Test Plans:** See [FRONTEND_TEST_MASTER_PLAN.md](./test-docs/FRONTEND_TEST_MASTER_PLAN.md)

---

## 6. Component Quick Reference

### Core Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `RetroBoardPage` | Main container, orchestrates all | `boardId` |
| `RetroBoardHeader` | Title, close button, lock icon | `boardTitle`, `isAdmin`, `isClosed` |
| `MyUserCard` | Current user UUID/alias display | `currentUser`, `onUpdateAlias` |
| `ParticipantBar` | Active users, filter avatars | `activeUsers`, `admins`, `filters` |
| `RetroColumn` | Column with cards | `column`, `cards`, `canEdit` |
| `RetroCard` | Card with reactions, drag handle | `card`, `canDelete`, `isChild` |

### Shared Utilities

| Utility | Purpose |
|---------|---------|
| `validateAlias()` | Alias validation (1-50 chars, alphanumeric) |
| `validateCardContent()` | Card content validation (1-5000 chars) |
| `validateBoardName()` | Board name validation (1-200 chars) |
| `ErrorBoundary` | Catch React errors, show fallback UI |
| `LoadingIndicator` | Skeleton, spinner, progress variants |

> **Component Details:** See [FRONTEND_COMPONENT_DESIGN.md](./FRONTEND_COMPONENT_DESIGN.md)

---

## 7. Folder Structure

```
frontend/
├── src/
│   ├── features/
│   │   ├── board/
│   │   │   ├── components/     # View layer
│   │   │   ├── viewmodels/     # ViewModel hooks
│   │   │   └── models/         # Types, API services
│   │   ├── card/
│   │   └── participant/
│   ├── shared/
│   │   ├── components/         # ErrorBoundary, LoadingIndicator
│   │   ├── validation/         # Form validators
│   │   └── hooks/              # useSocket, etc.
│   ├── stores/                 # Zustand stores
│   └── services/               # API clients, SocketService
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── mocks/                      # MSW handlers
```

---

## 8. Key Design Decisions

1. **MVVM over MVC** - ViewModels encapsulate business logic, making components pure UI
2. **Zustand over Redux** - Lightweight (3KB), simpler API, TypeScript-first
3. **@dnd-kit over react-beautiful-dnd** - Modern, accessible, actively maintained
4. **Direct Push for Real-time** - Service broadcasts to Socket.io after DB writes (no message queue for MVP)
5. **Optimistic Updates** - UI updates immediately, rolls back on API error
6. **Embedded Children** - API returns cards with children embedded (`include_relationships=true`)

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| [FRONTEND_MASTER_TASK_LIST.md](./phases/FRONTEND_MASTER_TASK_LIST.md) | All 80 tasks organized by phase |
| [FRONTEND_COMPONENT_DESIGN.md](./FRONTEND_COMPONENT_DESIGN.md) | Detailed component specs |
| [FRONTEND_TEST_MASTER_PLAN.md](./test-docs/FRONTEND_TEST_MASTER_PLAN.md) | Testing strategy and patterns |
| [HIGH_LEVEL_TECHNICAL_DESIGN.md](../HIGH_LEVEL_TECHNICAL_DESIGN.md) | System architecture |
| [BACKEND_API_SPECIFICATION_V2.md](../BACKEND_API_SPECIFICATION_V2.md) | API contracts |

---

*This overview provides essential context. For implementation details, refer to the linked documents.*
