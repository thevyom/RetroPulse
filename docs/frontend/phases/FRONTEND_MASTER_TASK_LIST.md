# Frontend Master Task List - RetroPulse

> **Single source of truth** for all frontend implementation phases and tasks.
> Last Updated: 2025-12-31 | Total Phases: 9 | Completed: 8/9

---

## 📁 Documentation Structure

```
docs/frontend/
├── FRONTEND_CORE_CONTEXT.md          ← Codebase summary (AI/developer onboarding)
├── FRONTEND_PROJECT_OVERVIEW.md      ← Quick context (start here)
├── phases/
│   ├── FRONTEND_MASTER_TASK_LIST.md  ← You are here (task tracking)
│   ├── FRONTEND_PHASE_01_PROJECT_SETUP.md
│   ├── FRONTEND_PHASE_02_SHARED_UTILITIES.md
│   ├── FRONTEND_PHASE_03_MODEL_LAYER.md
│   ├── FRONTEND_PHASE_04_VIEWMODEL_LAYER.md
│   ├── 




FRONTEND_PHASE_05_VIEW_COMPONENTS.md
│   ├── FRONTEND_PHASE_06_INTEGRATION_REALTIME.md
│   ├── FRONTEND_PHASE_07_E2E_TESTING.md
│   ├── FRONTEND_PHASE_08_POLISH_PRODUCTION.md
│   └── FRONTEND_PHASE_09_DOCUMENTATION.md
├── test-docs/
│   ├── FRONTEND_TEST_MASTER_PLAN.md  ← Test strategy overview
│   ├── TEST_PHASE_01_ProjectSetup.md ← Phase 1 test report
│   ├── TEST_PHASE_01_VIEW_LAYER.md
│   ├── TEST_PHASE_02_VIEWMODEL_LAYER.md
│   ├── TEST_PHASE_03_MODEL_LAYER.md
│   ├── TEST_PHASE_04_INTEGRATION.md
│   ├── TEST_PHASE_05_E2E.md
│   ├── TEST_PHASE_06_REALTIME.md
│   └── TEST_PHASE_07_DRAGDROP.md
├── code-review/
│   ├── CR_PHASE_01_ProjectSetup.md   ← Phase 1 code review
│   ├── CR_PHASE_02_SharedUtilities.md
│   ├── CR_PHASE_03_ModelLayer.md
│   ├── CR_PHASE_04_ViewModelLayer.md ← Phase 4 code review
│   ├── TEST_PHASE_02_SharedUtilities.md
│   ├── TEST_PHASE_03_ModelLayer.md
│   └── TEST_PHASE_04_ViewModelLayer.md ← Phase 4 test report
├── FRONTEND_COMPONENT_DESIGN.md      ← Component architecture
└── FRONTEND_TEST_PLAN.md             ← Original test plan (legacy)
```

---

## 📊 Phase Summary

| # | Phase | Status | Tasks | Priority | Test Plan | Details |
|---|-------|--------|-------|----------|-----------|---------|
| 1 | [Project Setup](./FRONTEND_PHASE_01_PROJECT_SETUP.md) | ✅ Done | 4/4 | High | [Tests](../test-docs/TEST_PHASE_01_ProjectSetup.md) | Vite, React, TypeScript, testing framework |
| 2 | [Shared Utilities](./FRONTEND_PHASE_02_SHARED_UTILITIES.md) | ✅ Done | 6/6 | High | [Tests](../code-review/TEST_PHASE_02_SharedUtilities.md) | Validation, ErrorBoundary, LoadingIndicator |
| 3 | [Model Layer](./FRONTEND_PHASE_03_MODEL_LAYER.md) | ✅ Done | 16/16 | High | [Tests](../code-review/TEST_PHASE_03_ModelLayer.md) | API services, WebSocket, Zustand stores |
| 4 | [ViewModel Layer](./FRONTEND_PHASE_04_VIEWMODEL_LAYER.md) | ✅ Done | 10/10 | High | [Tests](../code-review/TEST_PHASE_04_ViewModelLayer.md) | Business logic hooks (MVVM) |
| 5 | [View Components](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md) | ✅ Done | 18/18 | High | [Tests](../code-review/TEST_PHASE_05_ViewComponents.md) | UI components (React + shadcn/ui) |
| 6 | [Integration & Real-time](./FRONTEND_PHASE_06_INTEGRATION_REALTIME.md) | ✅ Done | 4/4 | Medium | [Tests](../code-review/TEST_PHASE_06_IntegrationRealtime.md) | Socket.io events, drag-and-drop |
| 7 | [E2E Testing](./FRONTEND_PHASE_07_E2E_TESTING.md) | ✅ Done | 10/10 | Medium | [Tests](../code-review/CR_PHASE_07_E2ETesting.md) | MSW mocks, Playwright tests |
| 8 | [Polish & Production](./FRONTEND_PHASE_08_POLISH_PRODUCTION.md) | ✅ Done | 14/14 + fixes | Medium | [Tests](../code-review/TEST_PHASE_08_PolishProduction.md) | Error handling, performance, a11y |
| 9 | [Documentation](./FRONTEND_PHASE_09_DOCUMENTATION.md) | 🔲 Not Started | 0/4 | Low | - | JSDoc, README, CONTRIBUTING |

**Overall Progress**: 82/84 tasks complete (98%)

---

## 🎯 Current Focus: Phase 9 - Documentation

**Phase 8 Completed:** Polish & Production Readiness with 699 tests passing (93% coverage).

**Completed in Phase 8:**
- All Phase 7 PE concerns addressed (34 waitForTimeout calls replaced, UUID isolation, global teardown)
- ErrorBoundary integrated at App level
- Toast notifications via sonner library
- React.memo on all key components (RetroCard, RetroColumn, ParticipantAvatar, ParticipantBar)
- Column/card background colors per column type (pastel theme)
- Aggregated reaction count labels for parent cards
- Responsive columns with min-width flex layout
- CI/CD pipeline with health check loop
- Pre-commit hooks with typecheck

**Next tasks to implement (Phase 9):**
1. JSDoc documentation for all public APIs
2. README.md updates for frontend
3. CONTRIBUTING.md guide
4. Component Storybook (optional)

[→ View Phase 9 Details](./FRONTEND_PHASE_09_DOCUMENTATION.md)

---

## 📈 Test Coverage Summary

| Category | Unit Tests | Integration Tests | E2E Tests | Status |
|----------|------------|-------------------|-----------|--------|
| Shared Utils | 116 | - | - | ✅ |
| API Services | 56 | - | - | ✅ |
| Stores | 112 | - | - | ✅ |
| Socket Service | 31 | - | - | ✅ |
| ViewModels | 160+ | - | - | ✅ |
| View Components | 95 | - | - | ✅ |
| Real-time Integration | - | 15 | - | ✅ |
| Drag-Drop Integration | - | 21 | - | ✅ |
| MSW Integration | - | 38 (10 skipped) | - | ✅ |
| E2E Flows | - | - | 47 | ✅ |
| **Total** | **699** | **46** | **47** | **792 tests** |

Target: 80%+ code coverage
**Current Coverage:** 93.70% lines, 83.03% branches, 93.35% functions, 93.13% statements

**Test Architecture Decisions** (see [Test Master Plan](../test-docs/FRONTEND_TEST_MASTER_PLAN.md)):
- Safari testing: Not required for MVP
- CI: GitHub Actions with parallel runners
- E2E backend: Real backend + socket.io-client
- Test isolation: UUID-based board IDs + fresh browser contexts
- Cleanup: `/test/cleanup` endpoint as global teardown

---

## 🏗️ Architecture Overview

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

**Pattern**: MVVM (Model-View-ViewModel)

---

## 🔧 Cross-Cutting Concerns

### Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19+ |
| Language | TypeScript | 5+ |
| Build Tool | Vite | Latest |
| State | Zustand | 5+ |
| UI Library | shadcn/ui + Tailwind CSS | Latest |
| Icons | Lucide React | Latest |
| Drag & Drop | @dnd-kit | Latest |
| Real-time | Socket.io-client | 4+ |
| HTTP | Axios | Latest |
| Testing | Vitest + Playwright | Latest |

> **UI Library Decision:** shadcn/ui chosen over Material-UI for smaller bundle (~5-15KB vs 80-150KB), faster tests, build-time CSS (Tailwind), and full component ownership.

### Tech Debt
| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| - | - | - | No tech debt - All phases completed cleanly |

### Documentation
| Item | Status |
|------|--------|
| Component Design V2 | ✅ Complete |
| Test Plan | ✅ Complete |
| API Integration Guide | 🔲 Pending |
| Code Review Phase 1-6 | ✅ Complete |

---

## ✅ Success Criteria

The frontend is considered complete when:

1. ✅ All 84 tasks completed and merged (82/84 - 98%)
2. ✅ Unit test coverage >80% (699 tests passing, 93% coverage)
3. ✅ All integration test suites pass (46 tests)
4. ✅ All E2E scenarios pass (47 tests)
5. ✅ Real-time sync working (WebSocket integration complete)
6. ✅ Drag-and-drop fully functional (@dnd-kit integrated)
7. ✅ Accessibility audit passed (ARIA labels, keyboard shortcuts)
8. ✅ Production build optimized (ErrorBoundary, toast notifications, memoization)
9. 🔲 Documentation complete (Phase 9)

---

## 📚 Quick Context Files

Before starting work, read these documents:

| File | Purpose | When to Use |
|------|---------|-------------|
| [FRONTEND_PROJECT_OVERVIEW.md](../FRONTEND_PROJECT_OVERVIEW.md) | **Start here** - Compact summary | Quick context, architecture overview |
| [FRONTEND_COMPONENT_DESIGN.md](../FRONTEND_COMPONENT_DESIGN.md) | Component architecture | Understanding structure, props, responsibilities |
| [Test Master Plan](../test-docs/FRONTEND_TEST_MASTER_PLAN.md) | Testing strategy overview | Writing tests, coverage requirements |
| [Test Phase Files](../test-docs/) | Detailed test plans by layer | Specific test patterns and examples |

**Backend Reference** (for API integration):
- [BACKEND_API_SPECIFICATION_V2.md](../../BACKEND_API_SPECIFICATION_V2.md) - API endpoints and schemas
- [BACKEND_CORE_CONTEXT.md](../../BACKEND_CORE_CONTEXT.md) - Backend patterns and real-time events

---

## 🔄 How to Use This System

### For AI Assistants

1. **Starting a new phase:**
   - Read [FRONTEND_PROJECT_OVERVIEW.md](../FRONTEND_PROJECT_OVERVIEW.md) for quick context
   - Read [FRONTEND_COMPONENT_DESIGN.md](../FRONTEND_COMPONENT_DESIGN.md) for architecture
   - Open the specific phase file for detailed tasks

2. **During implementation:**
   - Work from the phase file's task checklist
   - Update task status as you complete items
   - Note any blockers or dependencies

3. **After completing a phase:**
   - Update phase status in this master file
   - Update test counts if applicable
   - Note any tech debt created

### For Developers

1. Check current focus in "Current Focus" section above
2. Open the linked phase file for detailed breakdown
3. Use checkboxes to track progress
4. Update master file when phase status changes

### Task Status Legend

- `✅ Done` - Task completed and tested
- `🔲 Not Started` - Task not yet begun
- `🚧 In Progress` - Currently being worked on
- `⏳ Blocked` - Waiting on dependency
- `⏸️ On Hold` - Deprioritized

---

## 📅 Estimated Timeline

| Phase | Duration |
|-------|----------|
| Phase 1-2 (Setup & Utilities) | ✅ Complete |
| Phase 3 (Model Layer) | ✅ Complete |
| Phase 4 (ViewModel Layer) | ✅ Complete |
| Phase 5 (View Components) | ✅ Complete |
| Phase 6 (Integration & Real-time) | ✅ Complete |
| Phase 7 (E2E Testing) | ✅ Complete |
| Phase 8 (Polish & Production) | ✅ Complete |
| Phase 9 (Documentation) | 1-2 days |
| **Remaining** | **1-2 days** |

---

*This master list provides navigation only. For detailed tasks, see individual phase files.*
