# QA Test Plan - Bug Fixes Session 01011530

**Created**: 2026-01-01
**Status**: Planning

---

## 1. Test Strategy Overview

### Testing Approach
- Unit tests for all modified functions
- Integration tests for component interactions
- E2E tests for critical user flows
- Manual verification for UI/UX changes

### Test Framework
- Unit: Vitest + React Testing Library
- E2E: Playwright

---

## 2. Test Coverage Requirements Per Bug

### UTB-014: User Registration in Participant Bar

**Unit Tests:**
```
frontend/tests/unit/features/participant/
├── participantStore.test.ts
│   ├── should add current user to activeUsers on alias entry
│   ├── should include user hash and alias
│   └── should set isAdmin for creator
└── ParticipantBar.test.tsx
    ├── should display current user avatar
    └── should show admin badge for creator
```

**Integration Tests:**
```
frontend/tests/unit/features/board/
└── BoardViewModel.test.ts
    ├── should register user when joining board
    └── should update activeUsers from WebSocket events
```

**E2E Tests:**
```
frontend/tests/e2e/
└── participant.spec.ts
    ├── should show user in participant bar after alias entry
    └── should persist user visibility after refresh
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Current user avatar appears | ParticipantBar.test.tsx |
| User shown as primary | ParticipantBar.test.tsx |
| Admin designation visible | ParticipantBar.test.tsx |
| Board management accessible | E2E test |

---

### UTB-015: Card Author Display

**Unit Tests:**
```
frontend/tests/unit/features/card/
└── RetroCard.test.tsx
    ├── should display creator alias for attributed cards
    ├── should display ghost icon for anonymous cards
    └── should show "Anonymous" tooltip for ghost icon
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Attributed cards show alias | RetroCard.test.tsx |
| Anonymous cards show indicator | RetroCard.test.tsx |
| Creator sees own alias | E2E test |

---

### UTB-016: Aggregated Reaction Toggle

**Unit Tests:**
```
frontend/tests/unit/features/card/
└── RetroCard.test.tsx
    ├── should display aggregated count for parent cards
    ├── should display own count separately
    └── should toggle between agg/own views (if toggle implemented)
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Aggregated count displayed | RetroCard.test.tsx |
| Own count displayed | RetroCard.test.tsx |
| Clear visual distinction | RetroCard.test.tsx |

---

### UTB-017: Single-Select Filter

**Unit Tests:**
```
frontend/tests/unit/features/participant/
└── ParticipantBar.test.tsx
    ├── should deselect previous user when new user clicked
    ├── should deselect user when "All" clicked
    ├── should allow only one filter active at a time
    └── should highlight active filter
```

**Integration Tests:**
```
frontend/tests/unit/features/board/
└── BoardViewModel.test.ts
    └── should filter cards by single selected user
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Only one filter active | ParticipantBar.test.tsx |
| Clicking new deselects previous | ParticipantBar.test.tsx |
| "All" is default | ParticipantBar.test.tsx |
| Visual indicator | ParticipantBar.test.tsx |

---

### UTB-018: Ghost Icon for Anonymous

**Unit Tests:**
```
frontend/tests/unit/features/card/
└── RetroCard.test.tsx
    ├── should render Ghost icon for anonymous cards
    ├── should not render "Anonymous" text
    └── should show tooltip "Anonymous" on hover
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Ghost icon shows | RetroCard.test.tsx |
| Icon is recognizable | Visual verification |
| Tooltip on hover | RetroCard.test.tsx |

---

### UTB-019: Full Header Drag Handle

**Unit Tests:**
```
frontend/tests/unit/features/card/
└── RetroCard.test.tsx
    ├── should apply grab cursor to entire header
    ├── should not prevent button clicks in header
    └── should enable drag from anywhere in header
```

**E2E Tests:**
```
frontend/tests/e2e/
└── card-drag.spec.ts
    ├── should drag card when clicking header area
    └── should still allow reaction/delete button clicks
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Entire header draggable | E2E test |
| Cursor: grab on hover | Visual verification |
| Cursor: grabbing on drag | Visual verification |
| Buttons still clickable | RetroCard.test.tsx |

---

### UTB-020: Card Editing

**Unit Tests:**
```
frontend/tests/unit/features/card/
└── RetroCard.test.tsx
    ├── should enter edit mode on click
    ├── should show textarea in edit mode
    ├── should save on blur
    ├── should save on Enter key
    └── should cancel on Escape key
```

**Integration Tests:**
```
frontend/tests/unit/features/card/
└── cardViewModel.test.ts
    ├── should call API to update card content
    └── should show optimistic update
```

**E2E Tests:**
```
frontend/tests/e2e/
└── card-edit.spec.ts
    ├── should allow owner to edit card content
    └── should prevent non-owner from editing
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Creator can click to edit | E2E test |
| Edit mode visual indicator | RetroCard.test.tsx |
| Changes saved on blur/enter | RetroCard.test.tsx |

---

### UTB-021: Avatar Initials

**Unit Tests:**
```
frontend/tests/unit/features/participant/
└── ParticipantAvatar.test.tsx
    ├── should show first two letters for single word ("John" → "JO")
    ├── should show first/last initials for two words ("John Smith" → "JS")
    ├── should handle multiple names ("John A. Smith" → "JS")
    └── should uppercase initials
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Single name: first two | ParticipantAvatar.test.tsx |
| Two names: first/last | ParticipantAvatar.test.tsx |
| Uppercase | ParticipantAvatar.test.tsx |
| Consistent colors | ParticipantAvatar.test.tsx |

---

### UTB-022: Avatar Tooltip

**Unit Tests:**
```
frontend/tests/unit/features/participant/
└── ParticipantAvatar.test.tsx
    ├── should render tooltip with full alias
    ├── should show tooltip on hover
    └── should have appropriate delay
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Tooltip appears on hover | ParticipantAvatar.test.tsx |
| Shows full alias | ParticipantAvatar.test.tsx |
| 300ms delay | ParticipantAvatar.test.tsx |
| Works for Anonymous | ParticipantAvatar.test.tsx |

---

### UTB-023: Participant Overflow

**Unit Tests:**
```
frontend/tests/unit/features/participant/
└── ParticipantBar.test.tsx
    ├── should render horizontal scroll for many participants
    ├── OR should show "+N more" with dropdown
    └── should keep controls accessible
```

**E2E Tests:**
```
frontend/tests/e2e/
└── participant.spec.ts
    └── should handle 15+ participants gracefully
```

**Acceptance Criteria Mapping:**
| Criteria | Test |
|----------|------|
| Overflow handled | ParticipantBar.test.tsx |
| All participants accessible | E2E test |
| Controls remain accessible | E2E test |

---

## 3. Test Execution Plan

### Phase 1: Critical Path Tests
Run after UTB-014 → UTB-015 → UTB-020 fixes:

```bash
cd frontend
npm run test:run -- tests/unit/features/participant/participantStore.test.ts
npm run test:run -- tests/unit/features/participant/ParticipantBar.test.tsx
npm run test:run -- tests/unit/features/card/RetroCard.test.tsx
npm run test:e2e -- tests/e2e/participant.spec.ts
```

### Phase 2: Parallel Bug Tests
Each agent runs tests for their assigned bugs:

| Agent | Test Commands |
|-------|---------------|
| Agent 2 (UTB-016) | `npm run test:run -- RetroCard.test.tsx -t "aggregated"` |
| Agent 3 (UTB-017) | `npm run test:run -- ParticipantBar.test.tsx -t "filter"` |
| Agent 4 (UTB-018,019) | `npm run test:run -- RetroCard.test.tsx -t "ghost\|drag"` |
| Agent 5 (UTB-021,022) | `npm run test:run -- ParticipantAvatar.test.tsx` |
| Agent 6 (UTB-023) | `npm run test:run -- ParticipantBar.test.tsx -t "overflow"` |

### Final Integration Test
After all fixes merged:

```bash
cd frontend
npm run test:run
npm run test:e2e
```

---

## 4. Manual Test Checklist

### Visual Verification Required

| Bug | Manual Check |
|-----|--------------|
| UTB-014 | Avatar appears in participant bar |
| UTB-018 | Ghost icon looks correct |
| UTB-019 | Cursor changes on hover/drag |
| UTB-021 | Initials look correct for various names |
| UTB-023 | Scroll/overflow looks good with many users |

### User Flow Verification

- [ ] Join board → Enter alias → See self in participant bar
- [ ] Create card (attributed) → See alias on card
- [ ] Create card (anonymous) → See ghost icon
- [ ] Click card header → Drag successfully
- [ ] Click reaction button → Button works (not drag)
- [ ] Click filter avatar → Previous deselects
- [ ] Hover avatar → See full name tooltip

---

## 5. Bug Fix Report Template

Each agent must create: `docs/Validation/01011530/BugFixReport_[ID].md`

```markdown
# Bug Fix Report - [ID]

## Bug Information
- ID: [UTB-XXX]
- Severity: [High/Medium/Low]
- Component: [Component name]
- PRD Reference: [FR-X.X.X]

## Root Cause Analysis
[What was causing the bug]

## Solution Implemented
[Description of the fix]

### Code Changes
[Relevant code snippets]

## Code Review Comments
[Notes from /code-review skill]

## Test Results
```
[Test output]
```

## Verification Checklist
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Manual verification completed
- [ ] No regressions in related features
```

---

## 6. Regression Test Areas

After all fixes, verify no regressions in:

| Area | Tests |
|------|-------|
| Card creation | Create attributed and anonymous cards |
| Card reactions | React/unreact on cards |
| Card linking | Parent-child relationships |
| Card deletion | Delete owned cards |
| Filter functionality | All filter modes work |
| Participant display | All users visible |
| Admin features | Promote to admin works |

---

---

## 7. E2E Infrastructure Bug Test Coverage

Reference: `docs/Validation/01011100/E2E_INFRASTRUCTURE_BUGS.md`

### E2E-001: Playwright fill() React State Issue

**Status**: Workaround applied - no additional tests needed

**Verification**:
```bash
# All form-based E2E tests use pressSequentially()
grep -r "pressSequentially" frontend/tests/e2e/
```

**Affected Test Files**:
- `01-board-creation.spec.ts`
- Any test using input fields

---

### E2E-002: @dnd-kit Drag Operations

**Status**: Not testable via E2E - alternative testing required

**Unit/Integration Tests** (to compensate):
```
frontend/tests/unit/features/card/
├── useCardViewModel.test.ts
│   ├── should handle drag start correctly
│   ├── should update card position on drag end
│   └── should handle parent-child linking
└── RetroCard.test.tsx
    ├── should render drag handle
    └── should apply drag listeners to header
```

**Manual Test Checklist**:
- [ ] Drag card within same column
- [ ] Drag card to different column
- [ ] Link child card to parent
- [ ] Unlink child from parent
- [ ] Drag parent (children should follow)

**E2E Tests Marked as Skip**:
```
frontend/tests/e2e/
└── 09-drag-drop.spec.ts
    └── All 8 drag tests - test.skip() with reason
```

---

### E2E-003: Admin Status Detection Timing

**Status**: Workaround applied - some tests skipped

**Helper Function Tests**:
```
frontend/tests/e2e/utils/
└── test-helpers.ts
    └── waitForAdminStatus() function
```

**Affected E2E Tests**:
```
frontend/tests/e2e/
└── 01-board-creation.spec.ts
    └── "user becomes admin of created board" - flaky, uses helper
```

**Manual Verification**:
- [ ] Create board → verify admin controls appear within 3 seconds
- [ ] Check Close Board button visible
- [ ] Check Edit button visible
- [ ] Verify Admin badge in participant bar

---

## 8. E2E Test Execution Commands

### Run All E2E Tests (with known failures)
```bash
cd frontend
npm run test:e2e
```

### Run E2E Tests Excluding Drag-Drop
```bash
cd frontend
npx playwright test --grep-invert "drag"
```

### Check pressSequentially Migration
```bash
# Should show no results (all fill() converted)
grep -r "\.fill(" frontend/tests/e2e/*.spec.ts
```

---

## 9. Known E2E Failures Summary

| Test File | Tests | Issue | Status |
|-----------|-------|-------|--------|
| `09-drag-drop.spec.ts` | 8 | E2E-002: @dnd-kit incompatible | Skipped |
| `01-board-creation.spec.ts` | 1 | E2E-003: Admin timing flaky | Uses helper |

**Expected E2E Results**:
- Total: ~25 tests
- Pass: ~15 tests
- Skip: 8-10 tests (drag-drop + flaky)
- Fail: 0 (after workarounds)

---

*Document created by Principal Engineer - 2026-01-01*
