# Task List - Bug Fixes Session 01011530

**Created**: 2026-01-01
**Status**: Ready for Execution

---

## Execution Summary

| Phase | Agents | Bugs | Parallel? |
|-------|--------|------|-----------|
| 1 | 1 agent | UTB-014 → UTB-015 → UTB-020 | No (dependency chain) |
| 2 | 5 agents | UTB-016, UTB-017, UTB-018/019, UTB-021/022, UTB-023 | Yes |

---

## Phase 1: Critical Path (Sequential)

### Task 1.1: UTB-014 - User Registration

**Status**: [ ] Not Started

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-014: Current User Not Shown in Participant Bar

Bug Description:
After alias login, the participant bar shows "No participants yet". The current user is not added to activeUsers.

Task:
1. Read the following files to understand the flow:
   - frontend/src/features/participant/components/ParticipantBar.tsx
   - frontend/src/models/stores/ (find user/participant store)
   - frontend/src/features/board/ (find ViewModel handling user registration)

2. Read docs/Validation/01011530/TASK_LIST.md (Task 1.1)

3. Investigate and fix:
   - Trace alias entry → API response → state update
   - Ensure current user is added to activeUsers
   - Verify WebSocket/polling updates include current user

4. Write unit tests in:
   - frontend/tests/unit/features/participant/participantStore.test.ts (create if needed)
   - frontend/tests/unit/features/participant/ParticipantBar.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/participant/

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-014.md with:
- Bug information
- Root cause analysis
- Solution implemented with code snippets
- Code review comments
- Test results
- Verification checklist

Focus only on UTB-014. Do not modify other bugs.
```

**Files to Modify:**
- TBD (store/ViewModel for user registration)
- Possibly `boardStore.ts` or `participantStore.ts`

**Tests Required:**
- `participantStore.test.ts`
- `ParticipantBar.test.tsx`

---

### Task 1.2: UTB-015 - Card Author Display

**Status**: [ ] Not Started
**Depends On**: Task 1.1

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-015: Current User's Cards Show Anonymous Instead of Alias

Bug Description:
Attributed cards show "Anonymous" instead of the creator's alias. This depends on UTB-014 being fixed.

Context from UTB-014:
[Include brief summary of UTB-014 fix when launching]

Task:
1. Read the following files:
   - frontend/src/features/card/components/RetroCard.tsx (lines 293-301)
   - frontend/src/models/types.ts (Card type)
   - BugFixReport_UTB-014.md for context

2. Read docs/Validation/01011530/TASK_LIST.md (Task 1.2)

3. Fix the issue:
   - Ensure `card.created_by_alias` is populated
   - If alias comes from activeUsers, look up by `created_by_hash`
   - Display alias for attributed cards

4. Write unit tests in:
   - frontend/tests/unit/features/card/RetroCard.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/card/RetroCard.test.tsx

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-015.md

Focus only on UTB-015. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/card/components/RetroCard.tsx`
- Possibly card ViewModel for alias lookup

**Tests Required:**
- `RetroCard.test.tsx`

---

### Task 1.3: UTB-020 - Card Editing

**Status**: [ ] Not Started
**Depends On**: Task 1.1

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-020: Cannot Edit Card Content

Bug Description:
Card content cannot be edited after creation. Clicking on the card does not enable edit mode. This may depend on ownership check which requires UTB-014.

Context from UTB-014:
[Include brief summary of UTB-014 fix when launching]

Task:
1. Read the following files:
   - frontend/src/features/card/components/RetroCard.tsx
   - frontend/src/features/card/ (ViewModel for card operations)
   - BugFixReport_UTB-014.md for context

2. Read docs/Validation/01011530/TASK_LIST.md (Task 1.3)

3. Implement card editing:
   - Add onClick handler to card content area
   - Track isEditing state
   - Show textarea in edit mode
   - Save on blur or Enter
   - Cancel on Escape
   - Only allow owner to edit

4. Write unit tests in:
   - frontend/tests/unit/features/card/RetroCard.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/card/RetroCard.test.tsx

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-020.md

Focus only on UTB-020. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/card/components/RetroCard.tsx`
- Card ViewModel for update API

**Tests Required:**
- `RetroCard.test.tsx`

---

## Phase 2: Independent Fixes (Parallel)

Launch all 5 agents simultaneously after Phase 1 completes.

### Task 2.1: UTB-016 - Aggregated Reaction Toggle

**Status**: [ ] Not Started
**Can Run Parallel**: Yes

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-016: Parent Cards Should Show Aggregated vs Unaggregated Toggle

Bug Description:
Parent cards only show aggregated OR own reaction count. Users need to see both.

Task:
1. Read the following files:
   - frontend/src/features/card/components/RetroCard.tsx (lines 318-324)
   - frontend/src/models/types.ts (Card type - check for direct_reaction_count)

2. Read docs/Validation/01011530/TASK_LIST.md (Task 2.1)

3. Implement the fix:
   - Display format: "5 (2 own)" showing aggregated and direct counts
   - For parent cards with children, show both values
   - For standalone cards, just show the count

4. Write unit tests in:
   - frontend/tests/unit/features/card/RetroCard.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/card/RetroCard.test.tsx -t "aggregated"

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-016.md

Focus only on UTB-016. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/card/components/RetroCard.tsx`

**Tests Required:**
- `RetroCard.test.tsx`

---

### Task 2.2: UTB-017 - Single-Select Filter

**Status**: [ ] Not Started
**Can Run Parallel**: Yes

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-017: Filter Should Be Single-Selection Only

Bug Description:
Filter may allow multi-select. Should be single-select only: All, Anonymous, OR one user.

Task:
1. Read the following files:
   - frontend/src/features/participant/components/ParticipantBar.tsx
   - Find the ViewModel or hook managing filter state

2. Read docs/Validation/01011530/TASK_LIST.md (Task 2.2)

3. Implement the fix:
   - Modify onToggleUser to clear selectedUsers before adding new
   - Ensure showAll, showOnlyAnonymous, and single user are mutually exclusive
   - Update visual indicator for active filter

4. Write unit tests in:
   - frontend/tests/unit/features/participant/ParticipantBar.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/participant/ -t "filter"

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-017.md

Focus only on UTB-017. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/participant/components/ParticipantBar.tsx`
- Filter state ViewModel

**Tests Required:**
- `ParticipantBar.test.tsx`

---

### Task 2.3: UTB-018 + UTB-019 - Card UI Improvements

**Status**: [ ] Not Started
**Can Run Parallel**: Yes

**Agent Prompt:**
```
You are a Software Developer fixing bugs UTB-018 and UTB-019 (Card UI Improvements)

UTB-018: Anonymous cards should display Ghost icon instead of "Anonymous" text
UTB-019: Card drag handle should be full header, not just left element

Task:
1. Read the following files:
   - frontend/src/features/card/components/RetroCard.tsx
   - Lines 299-301 (anonymous display)
   - Lines 280-290 (drag handle)

2. Read docs/Validation/01011530/TASK_LIST.md (Task 2.3)

3. Fix UTB-018:
   - Import Ghost from lucide-react
   - Replace "Anonymous" text with Ghost icon
   - Add tooltip showing "Anonymous" on hover

4. Fix UTB-019:
   - Extend drag listeners to entire header area (30px height)
   - Use CSS cursor: grab on hover, cursor: grabbing on drag
   - Ensure action buttons (reactions, delete) still work (exclude from drag)

5. Write unit tests in:
   - frontend/tests/unit/features/card/RetroCard.test.tsx

6. Run tests: npm run test:run -- tests/unit/features/card/RetroCard.test.tsx

7. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-018.md and BugFixReport_UTB-019.md

Focus only on UTB-018 and UTB-019. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/card/components/RetroCard.tsx`

**Tests Required:**
- `RetroCard.test.tsx`

---

### Task 2.4: UTB-021 + UTB-022 - Avatar Enhancements

**Status**: [ ] Not Started
**Can Run Parallel**: Yes

**Agent Prompt:**
```
You are a Software Developer fixing bugs UTB-021 and UTB-022 (Avatar Enhancements)

UTB-021: Avatar initials should use first letters of first and last name
UTB-022: Tooltip should show full name on avatar hover

Task:
1. Read the following files:
   - frontend/src/features/participant/components/ParticipantAvatar.tsx
   - frontend/src/features/participant/components/ParticipantBar.tsx

2. Read docs/Validation/01011530/TASK_LIST.md (Task 2.4)

3. Fix UTB-021:
   - Create getInitials(alias) function:
     - Single word: first two letters ("John" → "JO")
     - Multiple words: first letter of first and last word ("John Smith" → "JS")
     - Always uppercase

4. Fix UTB-022:
   - Wrap avatar in <Tooltip> from shadcn/ui
   - Set delayDuration={300}
   - Display full alias in tooltip
   - Handle "Anonymous" case

5. Write unit tests in:
   - frontend/tests/unit/features/participant/ParticipantAvatar.test.tsx (create if needed)

6. Run tests: npm run test:run -- tests/unit/features/participant/

7. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-021.md and BugFixReport_UTB-022.md

Focus only on UTB-021 and UTB-022. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/participant/components/ParticipantAvatar.tsx`

**Tests Required:**
- `ParticipantAvatar.test.tsx`

---

### Task 2.5: UTB-023 - Participant Overflow

**Status**: [ ] Not Started
**Can Run Parallel**: Yes

**Agent Prompt:**
```
You are a Software Developer fixing bug UTB-023: Participant Overflow Should Scroll or Relocate Controls

Bug Description:
With many participants, the bar may overflow and push controls off screen.

Task:
1. Read the following files:
   - frontend/src/features/participant/components/ParticipantBar.tsx

2. Read docs/Validation/01011530/TASK_LIST.md (Task 2.5)

3. Implement overflow handling:
   Option A (Recommended): Horizontal scroll
   - Add overflow-x-auto to participant avatar container
   - Set max-width to prevent pushing controls
   - Add subtle scroll indicators

   Option B: "+N more" dropdown
   - Show first N avatars
   - Show "+X more" button with dropdown for rest

4. Write unit tests in:
   - frontend/tests/unit/features/participant/ParticipantBar.test.tsx

5. Run tests: npm run test:run -- tests/unit/features/participant/ -t "overflow"

6. Run the code-review skill on your changes

IMPORTANT: Create docs/Validation/01011530/BugFixReport_UTB-023.md

Focus only on UTB-023. Do not modify other bugs.
```

**Files to Modify:**
- `frontend/src/features/participant/components/ParticipantBar.tsx`

**Tests Required:**
- `ParticipantBar.test.tsx`

---

## Agent Launch Commands

### Phase 1 (Run Sequentially)
```
Agent 1: Task 1.1 (UTB-014)
         ↓ Wait for completion
         Task 1.2 (UTB-015)
         ↓ Wait for completion
         Task 1.3 (UTB-020)
```

### Phase 2 (Run in Parallel - Single Message with 5 Task Tool Calls)
```
Launch simultaneously:
- Agent 2: Task 2.1 (UTB-016)
- Agent 3: Task 2.2 (UTB-017)
- Agent 4: Task 2.3 (UTB-018 + UTB-019)
- Agent 5: Task 2.4 (UTB-021 + UTB-022)
- Agent 6: Task 2.5 (UTB-023)
```

---

## Progress Tracking

### Phase 1 Status
| Task | Bug(s) | Agent | Status | Report |
|------|--------|-------|--------|--------|
| 1.1 | UTB-014 | - | [ ] | - |
| 1.2 | UTB-015 | - | [ ] | - |
| 1.3 | UTB-020 | - | [ ] | - |

### Phase 2 Status
| Task | Bug(s) | Agent | Status | Report |
|------|--------|-------|--------|--------|
| 2.1 | UTB-016 | - | [ ] | - |
| 2.2 | UTB-017 | - | [ ] | - |
| 2.3 | UTB-018, UTB-019 | - | [ ] | - |
| 2.4 | UTB-021, UTB-022 | - | [ ] | - |
| 2.5 | UTB-023 | - | [ ] | - |

---

## Final Integration

After all agents complete:

1. **Merge all changes**
2. **Run full test suite:**
   ```bash
   cd frontend
   npm run test:run
   npm run test:e2e
   ```
3. **Manual verification** (see QA_TEST_PLAN.md)
4. **Create summary report**

---

---

## Phase 3: E2E Infrastructure Fixes

Reference: `docs/Validation/01011100/E2E_INFRASTRUCTURE_BUGS.md`

### Task 3.1: E2E-001 - React Input Fill Workaround

**Status**: [x] Completed (Workaround applied)

**Resolution**: Changed all `fill()` calls to `pressSequentially()` in E2E tests.

**Verification**:
```bash
# Ensure no fill() calls remain in form inputs
grep -r "\.fill(" frontend/tests/e2e/*.spec.ts
```

---

### Task 3.2: E2E-002 - @dnd-kit TestSensor Implementation

**Status**: [ ] Not Started
**Priority**: Low (defer to future sprint)

**Agent Prompt:**
```
You are a Software Developer implementing a TestSensor for @dnd-kit to enable E2E testing

Bug Description:
Playwright cannot trigger @dnd-kit drag operations due to event system incompatibility.

Task:
1. Read the following files:
   - frontend/src/pages/RetroBoardPage.tsx (DndContext setup)
   - @dnd-kit/core documentation for custom sensors
   - docs/Validation/01011100/E2E_INFRASTRUCTURE_BUGS.md

2. Implement TestSensor:
   - Create frontend/src/test-utils/TestSensor.ts
   - Sensor responds to custom events or data attributes
   - Only load in test environment (import.meta.env.TEST)

3. Add programmatic drag API:
   - window.__testDragStart(id)
   - window.__testDragOver(targetId)
   - window.__testDragEnd()

4. Update RetroBoardPage.tsx:
   - Conditionally include TestSensor

5. Update E2E tests:
   - Modify drag tests to use new API

6. Run tests: npm run test:e2e -- 09-drag-drop.spec.ts

IMPORTANT: Create docs/Validation/01011530/BugFixReport_E2E-002.md

This is a complex architectural change - ensure thorough testing.
```

**Files to Modify:**
- `frontend/src/test-utils/TestSensor.ts` (new)
- `frontend/src/pages/RetroBoardPage.tsx`
- `frontend/tests/e2e/09-drag-drop.spec.ts`

**Estimated Effort**: High

---

### Task 3.3: E2E-003 - Admin Status Timing Improvement

**Status**: [x] Partially Complete (Workaround applied)

**Current Workaround**: `waitForAdminStatus()` helper function

**Optional Enhancement** (Low priority):
- Add WebSocket connection status indicator
- Add explicit "ready" state after admin is established

---

## Updated Execution Summary

| Phase | Agents | Bugs | Status |
|-------|--------|------|--------|
| 1 | 1 agent | UTB-014 → UTB-015 → UTB-020 | [ ] Pending |
| 2 | 5 agents | UTB-016, UTB-017, UTB-018/019, UTB-021/022, UTB-023 | [ ] Pending |
| 3 | Deferred | E2E-001 (done), E2E-002 (future), E2E-003 (partial) | [x] Partial |

---

## Phase 3 Status

| Task | Bug | Status | Notes |
|------|-----|--------|-------|
| 3.1 | E2E-001 | [x] Complete | Workaround: pressSequentially() |
| 3.2 | E2E-002 | [ ] Deferred | Requires custom TestSensor |
| 3.3 | E2E-003 | [x] Partial | Workaround: waitForAdminStatus() |

---

*Document created by Principal Engineer - 2026-01-01*
