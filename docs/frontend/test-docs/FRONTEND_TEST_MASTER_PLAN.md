# Frontend Test Master Plan

**Document Version**: 2.0
**Date**: 2025-12-28
**Architecture**: React MVVM + Vitest + Playwright
**Status**: Active

---

## 📋 Quick Navigation

| Phase | Document | Focus | Tests |
|-------|----------|-------|-------|
| Overview | This Document | Strategy, tech stack, coverage goals | - |
| Phase 1 | [View Layer Tests](./TEST_PHASE_01_VIEW_LAYER.md) | Component rendering, props, events, tablet | ~95 |
| Phase 2 | [ViewModel Layer Tests](./TEST_PHASE_02_VIEWMODEL_LAYER.md) | Business logic hooks, 1-level hierarchy | ~70 |
| Phase 3 | [Model Layer Tests](./TEST_PHASE_03_MODEL_LAYER.md) | API services, stores, WebSocket | ~35 |
| Phase 4 | [Integration Tests](./TEST_PHASE_04_INTEGRATION.md) | MSW, full flows, admin ops | ~40 |
| Phase 5 | [E2E Tests](./TEST_PHASE_05_E2E.md) | Playwright, multi-user, tablet, a11y | ~35 |
| Phase 6 | [Real-time Tests](./TEST_PHASE_06_REALTIME.md) | WebSocket events, sync, link/unlink | ~23 |
| Phase 7 | [Drag-Drop Tests](./TEST_PHASE_07_DRAGDROP.md) | @dnd-kit, touch, keyboard, concurrent | ~23 |

**Total Estimated Tests**: ~321

---

## 🎯 Testing Philosophy

This test plan follows the MVVM architecture, ensuring clear separation of concerns and comprehensive coverage across all layers.

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Pyramid                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                          │
│                    │    E2E      │  ~35 critical flows      │
│                    │  Playwright │  (tablet, a11y)          │
│                    └─────────────┘                          │
│               ┌─────────────────────┐                       │
│               │    Integration      │  ~40 scenarios        │
│               │    Vitest + MSW     │                       │
│               └─────────────────────┘                       │
│          ┌─────────────────────────────┐                    │
│          │         Unit Tests          │  ~200 tests        │
│          │       Vitest + RTL          │                    │
│          └─────────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Unit Testing | Vitest + React Testing Library | Fast, Vite-native, component testing |
| Integration Testing | Vitest + MSW (Mock Service Worker) | API mocking, ViewModel integration |
| E2E Testing | Playwright | Real browser, WebSocket, drag-drop |
| Coverage | Vitest Coverage (c8) | Code coverage reporting |
| CI/CD | GitHub Actions | Automated test execution |

---

## 📊 Coverage Goals

| Layer | Coverage Target | Test Count Estimate |
|-------|----------------|---------------------|
| View Components | 85%+ | ~95 tests |
| ViewModels | 90%+ | ~70 tests |
| Model Layer | 85%+ | ~35 tests |
| Integration | Critical paths | ~40 scenarios |
| E2E | User journeys + tablet | ~35 flows |
| Real-time | Socket events | ~23 tests |
| Drag-Drop | All interactions | ~23 tests |

---

## 🏗️ MVVM Test Separation

### Testing Boundaries

**View Components** (Phase 1):
- Test ONLY rendering and user interactions
- Mock ViewModel hooks entirely
- Verify correct props passed to children
- Test conditional rendering (loading, error states)
- DO NOT test business logic or API calls

**ViewModels** (Phase 2):
- Test business logic and state orchestration
- Mock Model layer (API services, stores)
- Verify state transformations
- Test error handling and edge cases
- DO NOT test UI rendering

**Model Layer** (Phase 3):
- Test API request/response handling
- Test Zustand store mutations
- Test WebSocket event processing
- Mock backend API responses
- DO NOT test business logic

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Flow Diagram                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   View Tests ──── Mock ViewModels ──→ ViewModel Tests       │
│        │                                    │               │
│        └────────────────────────────────────┘               │
│                          │                                  │
│                    Mock Model                               │
│                          │                                  │
│                          ▼                                  │
│                    Model Tests                              │
│                          │                                  │
│                    Mock axios                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Test Directory Structure

```
tests/
├── unit/
│   └── features/
│       ├── board/
│       │   ├── components/
│       │   │   ├── RetroBoardPage.test.tsx
│       │   │   ├── RetroBoardHeader.test.tsx
│       │   │   └── SortBar.test.tsx
│       │   ├── viewmodels/
│       │   │   └── useBoardViewModel.test.ts
│       │   └── models/
│       │       ├── BoardAPI.test.ts
│       │       └── boardStore.test.ts
│       ├── card/
│       │   ├── components/
│       │   ├── viewmodels/
│       │   └── models/
│       ├── participant/
│       └── user/
├── integration/
│   ├── cardCreation.integration.test.tsx
│   ├── parentChildLinking.integration.test.tsx
│   └── realtime-sync.integration.test.ts
├── e2e/
│   ├── helpers.ts
│   ├── completeRetroSession.spec.ts
│   ├── cardQuota.spec.ts
│   └── dragDrop.spec.ts
└── mocks/
    ├── handlers.ts
    └── server.ts
```

---

## 🚀 NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "pnpm test && pnpm test:integration && pnpm test:e2e"
  }
}
```

---

## 🔄 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   Test Execution Pipeline                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   On Every Commit:                                          │
│   ┌──────────┐    ┌──────────────┐                          │
│   │  ESLint  │───▶│  Unit Tests  │                          │
│   │TypeCheck │    │    Vitest    │                          │
│   └──────────┘    └──────────────┘                          │
│                                                             │
│   On Pull Request:                                          │
│   ┌──────────────┐    ┌─────────────────┐    ┌──────────┐   │
│   │ All Unit     │───▶│  Integration    │───▶│ Coverage │   │
│   │   Tests      │    │    Tests MSW    │    │  > 80%   │   │
│   └──────────────┘    └─────────────────┘    └──────────┘   │
│                                                             │
│   On Merge to Main:                                         │
│   ┌───────────┐    ┌──────────────────┐    ┌───────────┐    │
│   │ E2E Tests │───▶│ Visual Regression│───▶│  Deploy   │    │
│   │ Playwright│    │   (optional)     │    │  Preview  │    │
│   └───────────┘    └──────────────────┘    └───────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 How to Use This Test Plan

### For Developers

1. **Before implementing a feature**: Read the relevant phase document to understand test requirements
2. **While implementing**: Write tests alongside code, following the patterns in each phase
3. **Before PR**: Run full test suite locally (`pnpm test:all`)

### For AI Assistants

1. **Read this master plan first** for architecture understanding
2. **Read the specific phase document** when working on tests for that layer
3. **Follow the test patterns** provided in each phase document

### Test Execution Order

1. Start with **Phase 1 (View Layer)** - highest test count, most visible bugs
2. Then **Phase 2 (ViewModel)** - business logic correctness
3. Then **Phase 3 (Model)** - API contract verification
4. **Phase 4-7** - Integration, E2E, and specialized tests

---

## 🔗 Related Documents

- [Frontend Master Task List](../FRONTEND_MASTER_TASK_LIST.md)
- [Frontend Component Design](../FRONTEND_COMPONENT_DESIGN_V2.md)
- [Backend API Specification](../../BACKEND_API_SPECIFICATION_V2.md)
- [Backend Test Plan](../../BACKEND_TEST_PLAN.md)

---

## 📌 Status Tracking

| Phase | Status | Tests Written | Coverage |
|-------|--------|---------------|----------|
| Phase 1: View Layer | 🔲 NOT STARTED | 0/95 | 0% |
| Phase 2: ViewModel | 🔲 NOT STARTED | 0/70 | 0% |
| Phase 3: Model | 🔲 NOT STARTED | 0/35 | 0% |
| Phase 4: Integration | 🔲 NOT STARTED | 0/40 | 0% |
| Phase 5: E2E | 🔲 NOT STARTED | 0/35 | 0% |
| Phase 6: Real-time | 🔲 NOT STARTED | 0/23 | 0% |
| Phase 7: Drag-Drop | 🔲 NOT STARTED | 0/23 | 0% |

---

## ⚙️ E2E Configuration Decisions

Based on project requirements:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Safari testing | Not required | Not needed for MVP |
| CI environment | GitHub Actions + parallel runners | Faster feedback |
| Visual regression | Deferred | Low priority for MVP |
| Accessibility testing | Basic checks in E2E | Phase 2 for advanced |
| Performance testing | Basic assertions in E2E | Separate load testing later |
| Tablet viewport | Included (P1 priority) | 768px viewport tests |
| Test data cleanup | `/test/cleanup` endpoint | Global teardown |
| Test isolation | UUID-based board IDs | Parallel-safe |
| Session isolation | Fresh browser context per user | Clean sessions |
| Backend | Real backend + socket.io | True integration |
| 1-level hierarchy | Dual enforcement | Client + backend validation |
