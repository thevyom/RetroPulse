# Frontend Master Task List - RetroPulse

> **Single source of truth** for all frontend implementation phases and tasks.
> Last Updated: 2025-12-28 | Total Phases: 9 | Completed: 0/9

---

## 📁 Documentation Structure

```
docs/frontend/
├── FRONTEND_PROJECT_OVERVIEW.md      ← Quick context (start here)
├── phases/
│   ├── FRONTEND_MASTER_TASK_LIST.md  ← You are here (task tracking)
│   ├── FRONTEND_PHASE_01_PROJECT_SETUP.md
│   ├── FRONTEND_PHASE_02_SHARED_UTILITIES.md
│   ├── FRONTEND_PHASE_03_MODEL_LAYER.md
│   ├── FRONTEND_PHASE_04_VIEWMODEL_LAYER.md
│   ├── FRONTEND_PHASE_05_VIEW_COMPONENTS.md
│   ├── FRONTEND_PHASE_06_INTEGRATION_REALTIME.md
│   ├── FRONTEND_PHASE_07_E2E_TESTING.md
│   ├── FRONTEND_PHASE_08_POLISH_PRODUCTION.md
│   └── FRONTEND_PHASE_09_DOCUMENTATION.md
├── test-docs/
│   ├── FRONTEND_TEST_MASTER_PLAN.md  ← Test strategy overview
│   ├── TEST_PHASE_01_VIEW_LAYER.md
│   ├── TEST_PHASE_02_VIEWMODEL_LAYER.md
│   ├── TEST_PHASE_03_MODEL_LAYER.md
│   ├── TEST_PHASE_04_INTEGRATION.md
│   ├── TEST_PHASE_05_E2E.md
│   ├── TEST_PHASE_06_REALTIME.md
│   └── TEST_PHASE_07_DRAGDROP.md
├── FRONTEND_COMPONENT_DESIGN.md      ← Component architecture
└── FRONTEND_TEST_PLAN.md             ← Original test plan (legacy)
```

---

## 📊 Phase Summary

| # | Phase | Status | Tasks | Priority | Test Plan | Details |
|---|-------|--------|-------|----------|-----------|---------|
| 1 | [Project Setup](./FRONTEND_PHASE_01_PROJECT_SETUP.md) | 🔲 Not Started | 0/4 | High | - | Vite, React, TypeScript, testing framework |
| 2 | [Shared Utilities](./FRONTEND_PHASE_02_SHARED_UTILITIES.md) | 🔲 Not Started | 0/6 | High | - | Validation, ErrorBoundary, LoadingIndicator |
| 3 | [Model Layer](./FRONTEND_PHASE_03_MODEL_LAYER.md) | 🔲 Not Started | 0/16 | High | [Tests](../test-docs/TEST_PHASE_03_MODEL_LAYER.md) | API services, WebSocket, Zustand stores |
| 4 | [ViewModel Layer](./FRONTEND_PHASE_04_VIEWMODEL_LAYER.md) | 🔲 Not Started | 0/10 | High | [Tests](../test-docs/TEST_PHASE_02_VIEWMODEL_LAYER.md) | Business logic hooks (MVVM) |
| 5 | [View Components](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md) | 🔲 Not Started | 0/18 | High | [Tests](../test-docs/TEST_PHASE_01_VIEW_LAYER.md) | UI components (React + MUI) |
| 6 | [Integration & Real-time](./FRONTEND_PHASE_06_INTEGRATION_REALTIME.md) | 🔲 Not Started | 0/4 | Medium | [Tests](../test-docs/TEST_PHASE_06_REALTIME.md) | Socket.io events, drag-and-drop |
| 7 | [E2E Testing](./FRONTEND_PHASE_07_E2E_TESTING.md) | 🔲 Not Started | 0/10 | Medium | [Tests](../test-docs/TEST_PHASE_05_E2E.md) | MSW mocks, Playwright tests |
| 8 | [Polish & Production](./FRONTEND_PHASE_08_POLISH_PRODUCTION.md) | 🔲 Not Started | 0/8 | Medium | - | Error handling, performance, a11y |
| 9 | [Documentation](./FRONTEND_PHASE_09_DOCUMENTATION.md) | 🔲 Not Started | 0/4 | Low | - | JSDoc, README, CONTRIBUTING |

**Overall Progress**: 0/80 tasks complete (0%)

---

## 🎯 Current Focus: Phase 1 - Project Setup

**Next tasks to implement:**
1. Initialize Vite + React + TypeScript project
2. Install and configure core dependencies (Zustand, MUI, Socket.io-client)
3. Configure Vitest + Playwright testing framework
4. Set up MVVM folder structure with path aliases

[→ View Phase 1 Details](./phases/FRONTEND_PHASE_01_PROJECT_SETUP.md)

---

## 📈 Test Coverage Summary

| Category | Unit Tests | Integration Tests | E2E Tests | Status |
|----------|------------|-------------------|-----------|--------|
| Shared Utils | ~10 | - | - | 🔲 |
| API Services | ~22 | - | - | 🔲 |
| Stores | ~12 | - | - | 🔲 |
| ViewModels | ~70 | - | - | 🔲 |
| View Components | ~95 | - | - | 🔲 |
| Integration | - | ~40 | - | 🔲 |
| Real-time | - | ~23 | - | 🔲 |
| Drag-Drop | - | ~11 | ~12 | 🔲 |
| E2E Flows | - | - | ~35 | 🔲 |
| **Total** | **~209** | **~74** | **~47** | **~321 tests planned** |

Target: 80%+ code coverage

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
| Framework | React | 18+ |
| Language | TypeScript | 5+ |
| Build Tool | Vite | Latest |
| State | Zustand | 4+ |
| UI Library | Material-UI | v5 |
| Drag & Drop | @dnd-kit | Latest |
| Real-time | Socket.io-client | 4+ |
| HTTP | Axios | Latest |
| Testing | Vitest + Playwright | Latest |

### Tech Debt
| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| - | - | - | No tech debt tracked yet |

### Documentation
| Item | Status |
|------|--------|
| Component Design V2 | ✅ Complete |
| Test Plan | ✅ Complete |
| API Integration Guide | 🔲 Pending |

---

## ✅ Success Criteria

The frontend is considered complete when:

1. 🔲 All 80 tasks completed and merged
2. 🔲 Unit test coverage >80%
3. 🔲 All integration test suites pass
4. 🔲 All E2E scenarios pass
5. 🔲 Real-time sync working (<200ms latency)
6. 🔲 Drag-and-drop fully functional
7. 🔲 Accessibility audit passed
8. 🔲 Production build optimized
9. 🔲 Documentation complete

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
| Phase 1-2 (Setup & Utilities) | 3-5 days |
| Phase 3 (Model Layer) | 1-2 weeks |
| Phase 4 (ViewModel Layer) | 1-2 weeks |
| Phase 5 (View Components) | 2-3 weeks |
| Phase 6-7 (Integration & E2E) | 1-2 weeks |
| Phase 8-9 (Polish & Docs) | 3-5 days |
| **Total** | **6-9 weeks** |

---

*This master list provides navigation only. For detailed tasks, see individual phase files.*
