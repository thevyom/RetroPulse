# Phase 8.1: Home Page & Board Creation

**Status**: 🔲 Not Started
**Priority**: High (P0)
**Tasks**: 0/8 complete
**Dependencies**: Phase 8 complete
**PRD Reference**: FR-1.0 Home Page / Landing Page

[← Back to Master Task List](./FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the home page landing experience so first-time users see a welcoming entry point with the ability to create new boards, instead of being redirected to a non-existent demo board.

---

## 📋 Tasks

### 1. HomePage Component
**Priority**: P0 | **Estimate**: 2 hours

- [ ] Create `src/features/home/components/HomePage.tsx`
- [ ] Implement centered layout (max-width 600px, vertically centered)
- [ ] Add logo/title section ("🔄 RetroPulse")
- [ ] Add tagline ("Collaborative Retrospective Boards")
- [ ] Add description text
- [ ] Add "Create New Board" primary button (280px wide, 48px tall)
- [ ] Add feature list with checkmarks (4 items)
- [ ] Responsive design for mobile

**Acceptance Criteria**:
- Home page renders at `/` route
- Layout matches UI/UX spec section 3.0
- Button opens CreateBoardDialog

---

### 2. CreateBoardDialog Component
**Priority**: P0 | **Estimate**: 3 hours

- [ ] Create `src/features/home/components/CreateBoardDialog.tsx`
- [ ] Use shadcn/ui Dialog component
- [ ] Implement form fields:
  - Board name (required, 1-200 chars)
  - Column configuration (default template or custom)
  - Card limit per user (optional number)
  - Reaction limit per user (optional number)
- [ ] Add form validation with error messages
- [ ] Submit button with loading state
- [ ] Close on success, navigate to new board

**Acceptance Criteria**:
- Dialog opens when "Create New Board" is clicked
- Form validates inputs before submission
- Shows loading spinner during API call
- Navigates to `/boards/:newId` on success

---

### 3. useCreateBoardViewModel Hook
**Priority**: P0 | **Estimate**: 2 hours

- [ ] Create `src/features/home/viewmodels/useCreateBoardViewModel.ts`
- [ ] Implement state: `isCreating`, `error`, `formData`
- [ ] Implement `handleCreateBoard(data)` action
- [ ] Call BoardAPI.createBoard()
- [ ] Return new board ID on success
- [ ] Handle API errors gracefully

**Acceptance Criteria**:
- Hook manages board creation state
- Returns loading and error states
- Successfully creates board via API

---

### 4. BoardAPI.createBoard Method
**Priority**: P0 | **Estimate**: 1 hour

- [ ] Add `createBoard(data: CreateBoardInput)` to BoardAPI service
- [ ] Implement POST /v1/boards request
- [ ] Return created board with ID
- [ ] Handle validation errors (400)
- [ ] Handle server errors (500)

**API Contract**:
```typescript
interface CreateBoardInput {
  name: string
  columns?: { name: string }[]
  card_limit_per_user?: number | null
  reaction_limit_per_user?: number | null
}

// Response: Board object with id
```

---

### 5. Update App.tsx Routing
**Priority**: P0 | **Estimate**: 30 min

- [ ] Change `/` route from `Navigate to /boards/demo` to `HomePage`
- [ ] Keep `/boards/:boardId` route for RetroBoardPage
- [ ] Remove fallback redirect to demo board

**Before**:
```tsx
<Route path="*" element={<Navigate to="/boards/demo" replace />} />
```

**After**:
```tsx
<Route path="/" element={<HomePage />} />
<Route path="/boards/:boardId" element={<RetroBoardPage />} />
```

---

### 6. HomePage Unit Tests
**Priority**: P1 | **Estimate**: 2 hours

- [ ] Create `tests/unit/features/home/components/HomePage.test.tsx`
- [ ] Test: renders logo, tagline, description
- [ ] Test: renders "Create New Board" button
- [ ] Test: renders feature list
- [ ] Test: button click opens dialog
- [ ] Test: responsive layout classes

---

### 7. CreateBoardDialog Unit Tests
**Priority**: P1 | **Estimate**: 2 hours

- [ ] Create `tests/unit/features/home/components/CreateBoardDialog.test.tsx`
- [ ] Test: form renders with all fields
- [ ] Test: validation errors show for invalid input
- [ ] Test: submit button disabled when form invalid
- [ ] Test: loading state during submission
- [ ] Test: error toast on API failure
- [ ] Test: navigation on success

---

### 8. E2E Test: Create Board Flow
**Priority**: P1 | **Estimate**: 1 hour

- [ ] Add test to `tests/e2e/board-creation.spec.ts`
- [ ] Test: navigate to `/`, see home page
- [ ] Test: click "Create New Board"
- [ ] Test: fill in board name
- [ ] Test: submit form
- [ ] Test: redirected to new board
- [ ] Test: board loads with correct name

---

## 📊 Estimated Effort

| Task | Estimate |
|------|----------|
| HomePage Component | 2 hours |
| CreateBoardDialog | 3 hours |
| useCreateBoardViewModel | 2 hours |
| BoardAPI.createBoard | 1 hour |
| App.tsx Routing | 30 min |
| HomePage Tests | 2 hours |
| CreateBoardDialog Tests | 2 hours |
| E2E Test | 1 hour |
| **Total** | **~13.5 hours** |

---

## ✅ Acceptance Criteria

- [ ] First-time users landing on `/` see the home page (not "Board not found")
- [ ] Home page clearly communicates the platform purpose
- [ ] "Create New Board" button is prominently displayed
- [ ] Clicking button opens board creation dialog
- [ ] Board can be created with name + default columns
- [ ] After creation, user is redirected to the new board
- [ ] All unit tests pass
- [ ] E2E test passes

---

## 📝 Notes

- Default columns: "What Went Well", "To Improve", "Action Items"
- Card and reaction limits are optional (null = unlimited)
- No authentication required - follows existing cookie-based session model
- Board creator automatically becomes admin (handled by backend)

---

## 🔗 Related Documents

- [PRD v1.4](../../PRD.md) - FR-1.0 Home Page requirements
- [UI/UX Spec v1.1](../UI_UX_DESIGN_SPECIFICATION.md) - Section 3.0 Home Page design
- [Component Design v2.1](../FRONTEND_COMPONENT_DESIGN.md) - Section 4.0 HomePage

---

[← Back to Master Task List](./FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 8](./FRONTEND_PHASE_08_POLISH_PRODUCTION.md) | [Next: Phase 9 →](./FRONTEND_PHASE_09_DOCUMENTATION.md)
