# Frontend Core Context - RetroPulse

**Generated:** 2025-12-31
**Phase:** 1-6 Complete (Project Setup → Integration & Real-time)
**Status:** MVVM architecture with real-time sync and drag-drop integrated. Ready for E2E Testing (Phase 7)

---

## 🔹 Project & Tech Stack Snapshot

| Aspect | Details |
|--------|---------|
| Stack | React 19 + TypeScript 5.9 + Vite 7 |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide icons |
| Routing | React Router DOM 7.11 |
| State | Zustand 5 (global) + React hooks (local) |
| Real-time | Socket.io-client 4.8 |
| Drag-Drop | @dnd-kit/core + sortable |
| HTTP | Axios with typed client |
| Testing | Vitest + RTL + Playwright + MSW |
| Build | Vite with esbuild |

**Project Structure:**
```
frontend/
├── src/
│   ├── features/           # Feature modules (MVVM)
│   │   ├── board/
│   │   │   ├── viewmodels/ # useBoardViewModel
│   │   │   └── components/ # RetroBoardPage, RetroBoardHeader, SortBar
│   │   ├── card/
│   │   │   ├── viewmodels/ # useCardViewModel, useDragDropViewModel
│   │   │   └── components/ # RetroColumn, RetroCard
│   │   ├── participant/
│   │   │   ├── viewmodels/ # useParticipantViewModel
│   │   │   └── components/ # ParticipantBar, ParticipantAvatar, AdminDropdown
│   │   └── user/
│   │       └── components/ # MyUserCard
│   ├── models/             # Data layer
│   │   ├── api/            # REST API services
│   │   ├── socket/         # WebSocket service
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
│   ├── shared/             # Cross-cutting utilities
│   │   ├── components/     # ErrorBoundary, LoadingIndicator
│   │   ├── validation/     # Input validators
│   │   └── utils/          # cardRelationships
│   ├── components/ui/      # shadcn/ui (8 components)
│   └── lib/                # cn() utility
└── tests/
    ├── unit/               # Vitest tests
    ├── integration/        # MSW-based tests
    └── e2e/                # Playwright tests
```

---

## 🧩 Key Shared Types & Utilities

### Core Domain Types

```typescript
// src/models/types/board.ts
interface Board {
  id: string;
  name: string;
  state: 'active' | 'closed';
  columns: Column[];
  admins: string[];
  active_users: ActiveUser[];
  card_limit_per_user: number | null;
}

// src/models/types/card.ts
interface Card {
  id: string;
  board_id: string;
  column_id: string;
  content: string;
  card_type: 'feedback' | 'action';
  is_anonymous: boolean;
  parent_card_id: string | null;
  linked_feedback_ids: string[];
  direct_reaction_count: number;
  aggregated_reaction_count: number;
}

// src/models/types/user.ts
interface UserSession {
  cookie_hash: string;
  alias: string;
  is_admin: boolean;
}
```

### Validation Utilities

| Function | Location | Purpose |
|----------|----------|---------|
| `validateAlias` | `shared/validation/index.ts` | Alias: 1-30 chars, alphanumeric + space/hyphen/underscore |
| `validateCardContent` | `shared/validation/index.ts` | Card: ≤150 words |
| `validateBoardName` | `shared/validation/index.ts` | Board name: ≤75 chars |
| `validateColumnName` | `shared/validation/index.ts` | Column name: ≤30 chars |

### Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ErrorBoundary` | `shared/components/ErrorBoundary.tsx` | Error catching with fallback UI |
| `LoadingIndicator` | `shared/components/LoadingIndicator.tsx` | spinner/skeleton/pulse variants |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading placeholder |

### shadcn/ui Components

| Component | Radix UI Primitive | Purpose |
|-----------|-------------------|---------|
| `Button` | Slot | Primary action buttons with variants |
| `Avatar` | @radix-ui/react-avatar | User profile images with fallback |
| `Card` | - | Card container with header/content/footer |
| `Dialog` | @radix-ui/react-dialog | Modal dialogs for forms |
| `DropdownMenu` | @radix-ui/react-dropdown-menu | Admin actions, sort options |
| `Input` | - | Form text inputs |
| `Tooltip` | @radix-ui/react-tooltip | Hover info overlays |
| `Skeleton` | - | Loading placeholders |

---

## 📋 MVVM Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│               Integration (Phase 6) ✅                   │
│   DndContext + PointerSensor │ Socket.io connection     │
│   Visual feedback (ring-primary/destructive)            │
├─────────────────────────────────────────────────────────┤
│                    View (Phase 5) ✅                     │
│   RetroBoardPage, RetroColumn, RetroCard, SortBar       │
│   ParticipantBar, AdminDropdown, MyUserCard             │
├─────────────────────────────────────────────────────────┤
│                  ViewModel (Phase 4) ✅                  │
│   useBoardViewModel, useCardViewModel, useDragDropVM    │
│   useParticipantViewModel                               │
├─────────────────────────────────────────────────────────┤
│                    Model (Phase 3) ✅                    │
│   API Services │ Zustand Stores │ SocketService         │
│   BoardAPI     │ boardStore     │ connect/disconnect    │
│   CardAPI      │ cardStore      │ room management       │
│   ReactionAPI  │ userStore      │ event handlers        │
└─────────────────────────────────────────────────────────┘
```

### ViewModel Hooks

| Hook | Location | Responsibilities |
|------|----------|------------------|
| `useBoardViewModel` | `features/board/viewmodels/` | Board CRUD, admin checks, socket events |
| `useCardViewModel` | `features/card/viewmodels/` | Card CRUD, reactions, filtering, sorting |
| `useDragDropViewModel` | `features/card/viewmodels/` | Drag validation, drop results |
| `useParticipantViewModel` | `features/participant/viewmodels/` | User management, heartbeat, filters |

### Zustand Stores

| Store | Location | State |
|-------|----------|-------|
| `useBoardStore` | `models/stores/boardStore.ts` | board, isLoading, error + actions |
| `useCardStore` | `models/stores/cardStore.ts` | cards, cardsByColumn + CRUD actions |
| `useUserStore` | `models/stores/userStore.ts` | currentUser, activeUsers + actions |

### API Services

| Service | Location | Endpoints |
|---------|----------|-----------|
| `BoardAPI` | `models/api/BoardAPI.ts` | getBoard, createBoard, joinBoard, updateName, close, addAdmin |
| `CardAPI` | `models/api/CardAPI.ts` | getCards, create, update, move, delete, link, unlink |
| `ReactionAPI` | `models/api/ReactionAPI.ts` | addReaction, removeReaction, getQuota |

### View Components (Phase 5)

| Component | Location | Responsibilities |
|-----------|----------|------------------|
| `RetroBoardPage` | `features/board/components/` | Main container, orchestrates ViewModels, ErrorBoundary wrapper |
| `RetroBoardHeader` | `features/board/components/` | Board title editing, admin controls, close board button |
| `SortBar` | `features/board/components/` | Sort mode dropdown (newest/oldest/votes), direction toggle |
| `RetroColumn` | `features/card/components/` | Column container, add card dialog, column title editing |
| `RetroCard` | `features/card/components/` | Card display, reactions, delete, child cards indicator |
| `ParticipantBar` | `features/participant/components/` | Active users list, toggle filtering by participant |
| `ParticipantAvatar` | `features/participant/components/` | User avatar with tooltip showing alias |
| `AdminDropdown` | `features/participant/components/` | Promote user to admin menu |
| `MyUserCard` | `features/user/components/` | Current user display with alias editing |

**Component Patterns:**
- Props receive callbacks from ViewModels, no direct store access
- Validation before API calls using shared validators
- Board closed state disables mutations
- ErrorBoundary wraps main content for resilience

### Integration Layer (Phase 6)

**Drag-and-Drop (@dnd-kit):**
- `DndContext` wraps RetroBoardPage with PointerSensor (8px activation distance)
- `useDraggable` on RetroCard for drag source
- `useDroppable` on RetroColumn and RetroCard (parent-child grouping)
- Visual feedback: `ring-2 ring-primary` (valid), `ring-destructive` (invalid)
- Droppable ID prefix `drop-` stripped in handleDragOver for validation

**Real-time (Socket.io):**
- Connection managed in RetroBoardPage useEffect (boardId dependency only)
- Stores updated directly on socket events (no ViewModel intermediary)
- Events: card:created, card:updated, card:deleted, card:moved, reaction:added/removed

---

## ⚙️ Testing Infrastructure

### Configuration
- **Framework:** Vitest with jsdom environment
- **Coverage:** v8 provider, 80% thresholds (lines/functions/branches/statements)
- **Setup:** `tests/setup.ts` with browser API mocks (matchMedia, ResizeObserver, IntersectionObserver)

### Test Distribution

| Layer | Tests | Files |
|-------|-------|-------|
| Validation | 63 | `tests/unit/shared/validation/` |
| Shared Components | 53 | `tests/unit/shared/components/` |
| API Services | 60+ | `tests/unit/models/api/` |
| Stores | 60+ | `tests/unit/models/stores/` |
| Socket | 15+ | `tests/unit/models/socket/` |
| ViewModels | 160+ | `tests/unit/features/*/viewmodels/` |
| View Components | 95 | `tests/unit/features/*/components/` |
| Integration | 36 | `tests/integration/` |
| E2E | 2 | `tests/e2e/` |
| **Total** | **661** | **26 files** |

### Coverage Metrics (Phase 6)
- **Statements:** 90.26%
- **Branches:** 78.92%
- **Functions:** 90.52%
- **Lines:** 90.84%

### Test Patterns
- **Mocking:** `vi.mock()` for API/socket, store mocks via factory
- **Hooks:** `renderHook` from `@testing-library/react`
- **Components:** `render` + `screen` + `userEvent` for UI testing
- **Assertions:** `@testing-library/jest-dom` matchers
- **Coverage:** Excluded: `index.ts`, `*.config.*`, `main.tsx`, `client.ts`

---

## 🛠️ Observed Patterns & Conventions

### Architecture Patterns
- **MVVM:** ViewModels encapsulate business logic, Views are pure UI
- **Barrel Exports:** Each module has `index.ts` re-exporting public API
- **Type-Only Imports:** `import type { X }` for types (verbatimModuleSyntax)
- **Optimistic Updates:** UI updates immediately, rollback on API failure

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `useBoardViewModel.ts` |
| Components | PascalCase | `ErrorBoundary` |
| Hooks | use prefix | `useBoardViewModel` |
| Types | PascalCase | `BoardState` |
| Constants | UPPER_SNAKE | `MAX_ALIAS_LENGTH` |
| DTOs | PascalCase + DTO | `CreateCardDTO` |

### Error Handling
- Validation at ViewModel layer before API calls
- Board closed check before mutations
- `ValidationResult` type: `{ isValid: boolean; error?: string }`
- ErrorBoundary for component-level error catching

### Socket.io Patterns
- Heartbeat interval: 30s (backend timeout: 35s)
- Event queue during disconnection (max 100 events)
- Room-based broadcasting (`board:{id}`)
- Typed events via `ServerToClientEvents`/`ClientToServerEvents`

---

## 📌 Quick Reference – Important Files

### Entry Points
| File | Purpose |
|------|---------|
| `src/main.tsx` | Application entry |
| `src/App.tsx` | Root component |
| `src/features/index.ts` | All ViewModel exports |
| `src/models/index.ts` | All Model layer exports |

### Configuration
| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite + path aliases |
| `vitest.config.ts` | Test configuration |
| `tailwind.config.js` | Tailwind v4 theme |
| `tsconfig.app.json` | TypeScript strict mode |

### By Feature
| Feature | Key Files |
|---------|-----------|
| Board | `features/board/viewmodels/useBoardViewModel.ts`, `features/board/components/RetroBoardPage.tsx`, `models/stores/boardStore.ts` |
| Card | `features/card/viewmodels/*.ts`, `features/card/components/RetroColumn.tsx`, `features/card/components/RetroCard.tsx` |
| Participant | `features/participant/viewmodels/*.ts`, `features/participant/components/ParticipantBar.tsx` |
| User | `features/user/components/MyUserCard.tsx`, `models/stores/userStore.ts` |
| Shared | `shared/validation/index.ts`, `shared/components/`, `shared/utils/cardRelationships.ts` |
| UI | `components/ui/` (Avatar, Button, Card, Dialog, DropdownMenu, Input, Skeleton, Tooltip) |

---

## 📊 Phase Completion Status

| Phase | Description | Status | Tests |
|-------|-------------|--------|-------|
| 1 | Project Setup | ✅ Complete | 20 |
| 2 | Shared Utilities | ✅ Complete | 138 |
| 3 | Model Layer | ✅ Complete | 337 |
| 4 | ViewModel Layer | ✅ Complete | 471 |
| 5 | View Components | ✅ Complete | 625 |
| 6 | Integration & Real-time | ✅ Complete | 661 |
| 7 | E2E Testing | 🔲 Pending | - |
| 8 | Polish & Accessibility | 🔲 Pending | - |
| 9 | Production Ready | 🔲 Pending | - |

---

## 🚩 Dependencies Summary

**Phase 5 (View Components):**
```json
{
  "react-router-dom": "^7.11.0",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-tooltip": "^1.2.8"
}
```

**Phase 6 (Integration):**
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (already in Phase 1)
- socket.io-client (already in Phase 1)

---

*Generated by /codebase-summary skill*
