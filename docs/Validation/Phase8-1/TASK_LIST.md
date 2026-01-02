# Bug Fix Task List - UTB-001 through UTB-013

**Document Version**: 1.0
**Date**: 2026-01-01
**Status**: Ready for Implementation

---

## Task Overview

| Work Stream | Tasks | Estimated Effort | Priority |
|-------------|-------|------------------|----------|
| WS-1: Board Creation | 6 | Large | P0 - Critical |
| WS-2: Board Header | 2 | Small | P1 |
| WS-3: Card UX | 6 | Medium | P1 |
| WS-4: Data Layer | 3 | Medium | P1 |
| WS-5: Sorting & Filtering | 6 | Medium | P0 - Critical |

---

## Work Stream 1: Board Creation Enhancements

### Task 1.1: UTB-001 - Add Creator Alias Input - **COMPLETED 2026-01-01**
**File**: [CreateBoardDialog.tsx](../../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**Complexity**: Medium
**Status**: DONE

- [x] **1.1.1** Add `creatorAlias` state variable with initial empty string
- [x] **1.1.2** Add `aliasError` state variable for validation feedback
- [x] **1.1.3** Add Input component between board name and column preview with label "Your Name"
- [x] **1.1.4** Wire `onChange` handler to update `creatorAlias` state
- [x] **1.1.5** Import `validateAlias` from `@/shared/validation`
- [x] **1.1.6** Add alias validation in `handleSubmit` before board creation
- [x] **1.1.7** Display alias validation error below input when invalid
- [x] **1.1.8** Update `createBoard` call to include `creator_alias` parameter
- [x] **1.1.9** Disable submit button when alias is empty or invalid

**Test Cases**: (31 unit tests passing)
- [x] T1.1.a: Submit blocked when alias is empty
- [x] T1.1.b: Submit blocked when alias exceeds 30 chars
- [x] T1.1.c: Submit blocked when alias contains invalid characters
- [x] T1.1.d: Successful creation includes alias in API request
- [ ] T1.1.e: Creator appears in participant bar after board creation (Pending Backend)

---

### Task 1.2: UTB-005 - Column Customization UI
**File**: [CreateBoardDialog.tsx](../../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**Complexity**: High

- [ ] **1.2.1** Define `ColumnConfig` interface with id, name, type, color
- [ ] **1.2.2** Replace static `DEFAULT_COLUMNS` constant with `columns` state initialized from defaults
- [ ] **1.2.3** Create inline editable input for each column name
- [ ] **1.2.4** Add `handleColumnNameChange(id, name)` function to update column state
- [ ] **1.2.5** Implement column type inference based on name keywords
- [ ] **1.2.6** Add remove button (×) to each column chip
- [ ] **1.2.7** Implement `handleRemoveColumn(id)` with minimum 1 column check
- [ ] **1.2.8** Add "+" button for adding new columns
- [ ] **1.2.9** Implement `handleAddColumn()` with unique ID and default name
- [ ] **1.2.10** Add color cycling for new columns (green, orange, blue, purple, pink, teal)
- [ ] **1.2.11** Validate column names using `validateColumnName` on blur
- [ ] **1.2.12** Add maximum 6 columns constraint
- [ ] **1.2.13** Add duplicate column name validation
- [ ] **1.2.14** Update form submission to use dynamic `columns` state

**Test Cases**:
- [ ] T1.2.a: Column name can be edited inline
- [ ] T1.2.b: Column can be removed (when more than 1 exists)
- [ ] T1.2.c: Cannot remove last remaining column
- [ ] T1.2.d: New column can be added
- [ ] T1.2.e: Maximum 6 columns enforced
- [ ] T1.2.f: Duplicate names show validation error
- [ ] T1.2.g: Column type inferred from name content

---

### Task 1.3: UTB-008 - Card/Reaction Limit Controls
**File**: [CreateBoardDialog.tsx](../../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**Complexity**: Medium

- [ ] **1.3.1** Add `cardLimit` state (number | null, default null)
- [ ] **1.3.2** Add `reactionLimit` state (number | null, default null)
- [ ] **1.3.3** Add `showAdvanced` state for collapsible section
- [ ] **1.3.4** Create collapsible "Advanced Settings" section with chevron icon
- [ ] **1.3.5** Add card limit radio group: "Unlimited" (default) or "Limit"
- [ ] **1.3.6** Add number input for card limit (visible when Limit selected)
- [ ] **1.3.7** Add reaction limit radio group: "Unlimited" (default) or "Limit"
- [ ] **1.3.8** Add number input for reaction limit (visible when Limit selected)
- [ ] **1.3.9** Validate limit values are positive integers (1-999)
- [ ] **1.3.10** Wire `card_limit_per_user` and `reaction_limit_per_user` to API call

**Test Cases**:
- [ ] T1.3.a: Advanced section collapsed by default
- [ ] T1.3.b: Can expand/collapse advanced section
- [ ] T1.3.c: Card limit defaults to unlimited
- [ ] T1.3.d: Reaction limit defaults to unlimited
- [ ] T1.3.e: Can set specific card limit
- [ ] T1.3.f: Can set specific reaction limit
- [ ] T1.3.g: Invalid limit values show error

---

### Task 1.4: Update useCreateBoardViewModel
**File**: [useCreateBoardViewModel.ts](../../../frontend/src/features/home/viewmodels/useCreateBoardViewModel.ts)
**Complexity**: Low

- [ ] **1.4.1** Extend `CreateBoardDTO` to include `creator_alias` field
- [ ] **1.4.2** Update `createBoard` function signature to accept new fields
- [ ] **1.4.3** Pass all new fields to `BoardAPI.createBoard`

---

## Work Stream 2: Board Header Enhancements

### Task 2.1: UTB-003 - Add Share/Copy Link Button
**File**: [RetroBoardHeader.tsx](../../../frontend/src/features/board/components/RetroBoardHeader.tsx)
**Complexity**: Low

- [ ] **2.1.1** Import `Share2` or `Link` icon from lucide-react
- [ ] **2.1.2** Import `toast` from sonner
- [ ] **2.1.3** Create `handleCopyLink` async function
- [ ] **2.1.4** Use `navigator.clipboard.writeText(window.location.href)`
- [ ] **2.1.5** Add fallback using textarea + execCommand for older browsers
- [ ] **2.1.6** Show success toast: "Link copied to clipboard!"
- [ ] **2.1.7** Handle error with fallback or error toast
- [ ] **2.1.8** Add Button component between Close Board and MyUserCard
- [ ] **2.1.9** Style as outline variant with icon
- [ ] **2.1.10** Add tooltip: "Copy board link"

**Test Cases**:
- [ ] T2.1.a: Clicking share button copies URL to clipboard
- [ ] T2.1.b: Success toast appears after copy
- [ ] T2.1.c: Button visible on both active and closed boards

---

## Work Stream 3: Card UX Improvements

### Task 3.1: UTB-002 - Enhance Unlink Button Visibility
**File**: [RetroCard.tsx](../../../frontend/src/features/card/components/RetroCard.tsx)
**Complexity**: Low

- [ ] **3.1.1** Add hover styles to link icon button: `hover:text-primary hover:scale-110`
- [ ] **3.1.2** Add transition class: `transition-all duration-150`
- [ ] **3.1.3** Add focus ring: `focus:outline-none focus:ring-2 focus:ring-primary`
- [ ] **3.1.4** Verify tooltip text: "Click to unlink from parent"
- [ ] **3.1.5** Ensure button has `type="button"` attribute

**Test Cases**:
- [ ] T3.1.a: Hover changes link icon color
- [ ] T3.1.b: Tooltip appears on hover
- [ ] T3.1.c: Clicking unlinks card from parent
- [ ] T3.1.d: Focus state is visible for keyboard users

---

### Task 3.2: UTB-004 - Action-Feedback Link Indicators
**File**: [RetroCard.tsx](../../../frontend/src/features/card/components/RetroCard.tsx)
**Complexity**: Medium

- [ ] **3.2.1** Add `id` attribute to card container: `id={`card-${card.id}`}`
- [ ] **3.2.2** Create `scrollToCard(cardId)` utility function
- [ ] **3.2.3** For feedback cards: check `linkedActionIds` (from card data or derived)
- [ ] **3.2.4** Add "Linked Actions" section with blue background after content
- [ ] **3.2.5** Render clickable text previews of linked action cards
- [ ] **3.2.6** For action cards: check `card.linked_feedback_ids`
- [ ] **3.2.7** Add "Links to" section with green background after content
- [ ] **3.2.8** Render clickable text previews of linked feedback cards
- [ ] **3.2.9** Implement scroll + highlight animation (2s ring highlight)
- [ ] **3.2.10** Add props for `linkedActionCards` and `linkedFeedbackCards`

**Test Cases**:
- [ ] T3.2.a: Feedback card shows linked actions when present
- [ ] T3.2.b: Action card shows linked feedback when present
- [ ] T3.2.c: Clicking link scrolls to target card
- [ ] T3.2.d: Target card highlights briefly
- [ ] T3.2.e: No indicator shown when no links exist

---

### Task 3.3: UTB-007 - Child Card Reaction Buttons
**File**: [RetroCard.tsx](../../../frontend/src/features/card/components/RetroCard.tsx)
**Complexity**: Medium

- [ ] **3.3.1** Add props: `onReactToChild`, `onUnreactFromChild`, `hasUserReactedToChild`
- [ ] **3.3.2** Modify child card rendering section (lines 277-300)
- [ ] **3.3.3** Replace static reaction count with clickable Button component
- [ ] **3.3.4** Wire click handler to call `onReactToChild(child.id)` or `onUnreactFromChild(child.id)`
- [ ] **3.3.5** Add filled/unfilled icon based on `hasUserReactedToChild(child.id)`
- [ ] **3.3.6** Disable button when board is closed
- [ ] **3.3.7** Disable button when user can't react and hasn't reacted

**Upstream Changes**:
- [ ] **3.3.8** Update RetroColumn to pass child reaction handlers to RetroCard
- [ ] **3.3.9** Update useCardViewModel to handle child card reactions (same API as parent)

**Test Cases**:
- [ ] T3.3.a: Can add reaction to child card
- [ ] T3.3.b: Can remove reaction from child card
- [ ] T3.3.c: Parent aggregated count updates when child reaction changes
- [ ] T3.3.d: Reaction button disabled on closed board

---

### Task 3.4: UTB-011 - Verify Card Deletion (Post UTB-001)
**Dependency**: UTB-001 must be complete

- [ ] **3.4.1** After UTB-001 is deployed, test board creation flow
- [ ] **3.4.2** Verify creator appears in participant bar with alias
- [ ] **3.4.3** Create a card as board creator
- [ ] **3.4.4** Verify delete button appears on creator's card
- [ ] **3.4.5** Verify delete action succeeds
- [ ] **3.4.6** Document results in test report

---

## Work Stream 4: Data Layer Fixes

### Task 4.1: UTB-006 - Aggregated Count on Link
**File**: [cardStore.ts](../../../frontend/src/models/stores/cardStore.ts)
**Complexity**: Medium

- [ ] **4.1.1** Add `linkChild(parentId, childId)` action to store
- [ ] **4.1.2** Implement: update child's `parent_card_id`
- [ ] **4.1.3** Implement: add child's reactions to parent's aggregated count
- [ ] **4.1.4** Implement: add child to parent's `children` array
- [ ] **4.1.5** Add `unlinkChild(parentId, childId)` action to store
- [ ] **4.1.6** Implement: remove child's `parent_card_id`
- [ ] **4.1.7** Implement: subtract child's reactions from parent's aggregated count
- [ ] **4.1.8** Implement: remove child from parent's `children` array
- [ ] **4.1.9** Update socket handlers in useCardViewModel to use new actions

**Test Cases**:
- [ ] T4.1.a: Linking child updates parent aggregated count
- [ ] T4.1.b: Unlinking child updates parent aggregated count
- [ ] T4.1.c: Socket events trigger correct store updates
- [ ] T4.1.d: UI reflects aggregated count immediately

---

### Task 4.2: Update Socket Event Handlers
**File**: [useCardViewModel.ts](../../../frontend/src/features/card/viewmodels/useCardViewModel.ts)
**Complexity**: Low

- [ ] **4.2.1** Update `handleCardLinked` to call store's `linkChild` action
- [ ] **4.2.2** Update `handleCardUnlinked` to call store's `unlinkChild` action
- [ ] **4.2.3** Remove fetchCards() calls if store updates are sufficient
- [ ] **4.2.4** Verify optimistic update pattern works correctly

---

## Work Stream 5: Sorting & Filtering Fixes

### Task 5.1: UTB-009 - Fix Sorting Implementation
**File**: [useCardViewModel.ts](../../../frontend/src/features/card/viewmodels/useCardViewModel.ts)
**Complexity**: Medium

- [ ] **5.1.1** Locate `cardsByColumn` useMemo (line 203)
- [ ] **5.1.2** Add `sortMode` and `sortDirection` to dependency array
- [ ] **5.1.3** After grouping cards by column, apply `sortCards()` to each group
- [ ] **5.1.4** Verify `sortCards` function handles both modes correctly
- [ ] **5.1.5** Test ascending vs descending for recency
- [ ] **5.1.6** Test ascending vs descending for popularity

**Test Cases**:
- [ ] T5.1.a: Changing sort mode reorders cards
- [ ] T5.1.b: Toggling direction reverses order
- [ ] T5.1.c: Sorting by recency orders by created_at
- [ ] T5.1.d: Sorting by popularity orders by aggregated_reaction_count
- [ ] T5.1.e: Sort state persists during session

---

### Task 5.2: UTB-010 - Optimize Re-renders
**File**: [RetroBoardPage.tsx](../../../frontend/src/features/board/components/RetroBoardPage.tsx)
**Complexity**: Medium

- [ ] **5.2.1** Verify RetroBoardHeader is wrapped with React.memo (already done)
- [ ] **5.2.2** Verify ParticipantBar is wrapped with React.memo (already done)
- [ ] **5.2.3** Stabilize callback props using useCallback:
  - [ ] `handleRenameBoard`
  - [ ] `handleCloseBoard`
  - [ ] `handleUpdateAlias`
  - [ ] `onPromoteToAdmin`
- [ ] **5.2.4** Ensure primitive props don't change reference unnecessarily
- [ ] **5.2.5** Use React DevTools Profiler to verify optimization

**Test Cases**:
- [ ] T5.2.a: Changing sort mode doesn't re-render header
- [ ] T5.2.b: Changing sort mode doesn't re-render participant bar
- [ ] T5.2.c: Only card area re-renders on sort change

---

### Task 5.3: UTB-012 - Fix Anonymous Filter Logic
**File**: [useParticipantViewModel.ts](../../../frontend/src/features/participant/viewmodels/useParticipantViewModel.ts)
**Complexity**: Medium

- [ ] **5.3.1** Add `showOnlyAnonymous` state variable (default: false)
- [ ] **5.3.2** Modify `handleToggleAnonymousFilter` to toggle `showOnlyAnonymous`
- [ ] **5.3.3** When enabling anonymous-only mode, clear `selectedUsers` and set `showAll` false
- [ ] **5.3.4** Export `showOnlyAnonymous` from hook

**File**: [RetroBoardPage.tsx](../../../frontend/src/features/board/components/RetroBoardPage.tsx)
- [ ] **5.3.5** Update filter logic in `filteredCardsByColumn` useMemo
- [ ] **5.3.6** Add check: if `showOnlyAnonymous`, return only `card.is_anonymous`
- [ ] **5.3.7** Ensure user filters and anonymous-only are mutually exclusive

**Test Cases**:
- [ ] T5.3.a: Clicking Anonymous shows only anonymous cards
- [ ] T5.3.b: Non-anonymous cards are hidden
- [ ] T5.3.c: Clicking Anonymous again shows all cards
- [ ] T5.3.d: Anonymous filter clears user selection

---

### Task 5.4: UTB-013 - Anonymous Filter Visual Indicator
**File**: [ParticipantBar.tsx](../../../frontend/src/features/participant/components/ParticipantBar.tsx)
**Complexity**: Low

- [ ] **5.4.1** Update Anonymous avatar `isSelected` prop to use `showOnlyAnonymous`
- [ ] **5.4.2** Pass `showOnlyAnonymous` from RetroBoardPage to ParticipantBar

**File**: [ParticipantAvatar.tsx](../../../frontend/src/features/participant/components/ParticipantAvatar.tsx)
- [ ] **5.4.3** Verify selected state styling includes visible ring/highlight
- [ ] **5.4.4** Ensure anonymous type uses same selected styling as user type

**Test Cases**:
- [ ] T5.4.a: Anonymous avatar shows ring when selected
- [ ] T5.4.b: Visual indicator matches user avatar selected state
- [ ] T5.4.c: Clicking toggles visual state correctly

---

## Integration Tasks

### Task 6.1: API Compatibility
- [ ] **6.1.1** Verify backend accepts `creator_alias` in board creation
- [ ] **6.1.2** Verify backend handles dynamic column configurations
- [ ] **6.1.3** Ensure backward compatibility for existing boards

### Task 6.2: E2E Test Updates
**File**: [frontend/tests/e2e/](../../../frontend/tests/e2e/)
- [ ] **6.2.1** Update board creation tests to include alias
- [ ] **6.2.2** Add column customization E2E test
- [ ] **6.2.3** Add share button E2E test
- [ ] **6.2.4** Update sorting tests to verify actual reordering
- [ ] **6.2.5** Add anonymous filter behavior test

---

## Definition of Done

Each task is complete when:
1. [ ] Code changes implemented
2. [ ] Unit tests passing
3. [ ] Component/integration tests added
4. [ ] Manual testing completed
5. [ ] Code review approved
6. [ ] Documentation updated if applicable

---

## Sprint Allocation Suggestion

**Sprint 1** (Critical Path):
- Task 1.1 (UTB-001) - Must complete first
- Task 5.1 (UTB-009) - High user impact
- Task 5.3 (UTB-012) - Logic bug

**Sprint 2** (Parallel Work):
- Tasks 1.2, 1.3 (UTB-005, UTB-008)
- Task 2.1 (UTB-003)
- Tasks 3.1, 3.2 (UTB-002, UTB-004)

**Sprint 3** (Dependent/Polish):
- Task 3.3 (UTB-007)
- Task 3.4 (UTB-011 verification)
- Task 4.1 (UTB-006)
- Task 5.2 (UTB-010)
- Task 5.4 (UTB-013)

---

*Task list generated for development team. Assign owners during sprint planning.*
