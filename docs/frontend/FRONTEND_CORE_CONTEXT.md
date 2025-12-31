# Frontend Core Context - RetroPulse

**Generated:** 2025-12-31
**Phase:** 1-4 Complete (Project Setup → ViewModel Layer)
**Status:** MVVM foundation complete, ready for View layer (Phase 5)

---

## 🔹 Project & Tech Stack Snapshot

| Aspect | Details |
|--------|---------|
| Stack | React 19 + TypeScript 5.9 + Vite 7 |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide icons |
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
│   ├── features/           # Feature modules (MVVM ViewModels)
│   │   ├── board/viewmodels/
│   │   ├── card/viewmodels/
│   │   └── participant/viewmodels/
│   ├── models/             # Data layer
│   │   ├── api/            # REST API services
│   │   ├── socket/         # WebSocket service
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
│   ├── shared/             # Cross-cutting utilities
│   │   ├── components/     # ErrorBoundary, LoadingIndicator
│   │   ├── validation/     # Input validators
│   │   └── utils/          # cardRelationships
│   ├── components/ui/      # shadcn/ui components
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

---

## 📋 MVVM Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────┐
│                     View (Phase 5)                       │
│           React components, UI rendering                 │
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
| Components | 53 | `tests/unit/shared/components/` |
| API Services | 60+ | `tests/unit/models/api/` |
| Stores | 60+ | `tests/unit/models/stores/` |
| Socket | 15+ | `tests/unit/models/socket/` |
| ViewModels | 160+ | `tests/unit/features/` |
| E2E | 2 | `tests/e2e/` |
| **Total** | **471** | **18 files** |

### Test Patterns
- **Mocking:** `vi.mock()` for API/socket, store mocks via factory
- **Hooks:** `renderHook` from `@testing-library/react`
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
| Board | `features/board/viewmodels/useBoardViewModel.ts`, `models/stores/boardStore.ts` |
| Card | `features/card/viewmodels/{useCardViewModel,useDragDropViewModel}.ts`, `models/stores/cardStore.ts` |
| Participant | `features/participant/viewmodels/useParticipantViewModel.ts`, `models/stores/userStore.ts` |
| Shared | `shared/validation/index.ts`, `shared/components/`, `shared/utils/cardRelationships.ts` |

---

## 📊 Phase Completion Status

| Phase | Description | Status | Tests |
|-------|-------------|--------|-------|
| 1 | Project Setup | ✅ Complete | 20 |
| 2 | Shared Utilities | ✅ Complete | 138 |
| 3 | Model Layer | ✅ Complete | 337 |
| 4 | ViewModel Layer | ✅ Complete | 471 |
| 5 | View Components | 🔲 Pending | - |
| 6 | Real-time Integration | 🔲 Pending | - |
| 7 | Drag-Drop UI | 🔲 Pending | - |
| 8 | Polish & Testing | 🔲 Pending | - |
| 9 | E2E Testing | 🔲 Pending | - |

---

*Generated by /codebase-summary skill*
