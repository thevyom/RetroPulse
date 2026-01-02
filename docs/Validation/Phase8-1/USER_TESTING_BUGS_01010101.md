# User Testing Bugs - Frontend

**Document Created**: 2026-01-01
**Status**: Open Issues Requiring Resolution

---

## Bug Tracker Summary

| ID | Severity | Component | PRD Req | Status | Description |
|----|----------|-----------|---------|--------|-------------|
| UTB-001 | High | [CreateBoardDialog](../../frontend/src/features/home/components/CreateBoardDialog.tsx) | [FR-1.2.3](../PRD.md#12-board-access-and-sharing) | Open | Board creator not prompted for alias |
| UTB-002 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.3](../PRD.md#23-parent-child-card-relationships) | Open | Unlink button not visibly clickable |
| UTB-003 | High | [RetroBoardHeader](../../frontend/src/features/board/components/RetroBoardHeader.tsx) | [FR-1.1.9](../PRD.md#11-board-creation) | Open | No "Copy Link" button for sharing board |
| UTB-004 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.4](../PRD.md#24-action-item-linking) | Open | No visual indicator for action-to-feedback links |
| UTB-005 | High | [CreateBoardDialog](../../frontend/src/features/home/components/CreateBoardDialog.tsx) | [FR-1.1.3, FR-1.1.6](../PRD.md#11-board-creation) | Open | Cannot customize columns during board creation |
| UTB-006 | High | [cardStore](../../frontend/src/models/stores/cardStore.ts) | [FR-3.1](../PRD.md#31-reaction-types) | Open | Aggregated reaction count not updating when cards linked |
| UTB-007 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-3.1](../PRD.md#31-reaction-types) | Open | Cannot add reaction to child/linked cards |
| UTB-008 | High | [CreateBoardDialog](../../frontend/src/features/home/components/CreateBoardDialog.tsx) | [FR-1.1.10, FR-1.1.11](../PRD.md#11-board-creation) | Open | Cannot set card/reaction limits during board creation |
| UTB-009 | High | [RetroBoardPage](../../frontend/src/features/board/components/RetroBoardPage.tsx) | [FR-2.4.1-2.4.12](../PRD.md#24-card-sorting-and-order) | Open | Sorting (ascending/descending) not applied to cards |
| UTB-010 | Medium | [RetroBoardPage](../../frontend/src/features/board/components/RetroBoardPage.tsx) | NFR-6.5 | Open | Entire board re-renders when sorting changes |
| UTB-011 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.2.1](../PRD.md#22-card-deletion) | Open | Card deletion fails - blocked by UTB-001 (no creator alias) |
| UTB-012 | High | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-2.5.8](../PRD.md#25-card-filtering-by-user) | Open | Anonymous filter hides anonymous cards instead of showing only anonymous |
| UTB-013 | High | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-2.5.2](../PRD.md#25-card-filtering-by-user) | Open | No visual indicator when Anonymous filter is active |

---

## UTB-001: Board Creator Not Prompted for Alias

**Severity**: High
**Component**: [CreateBoardDialog.tsx](../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**PRD Reference**: [FR-1.2.3](../PRD.md#12-board-access-and-sharing)
**Status**: Open

### Steps to Reproduce

1. Navigate to home page
2. Click "Create New Board"
3. Enter a board name and click Create
4. Observe the board page

### Current Behavior

User lands on board with no alias. They are invisible in the participant bar.

### Expected Behavior

Board creator should be prompted to enter an alias during board creation.

### Acceptance Criteria

- [ ] Board creator has an alias after creating a board
- [ ] Creator's alias appears in the participant bar
- [ ] Creator is shown as admin with their alias

---

## UTB-002: Unlink Button Not Visibly Clickable

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.3.7, FR-2.3.8](../PRD.md#23-parent-child-card-relationships)
**Status**: Open

### Steps to Reproduce

1. Create a board with multiple cards
2. Drag one card onto another to create parent-child relationship
3. Look at the child card's link icon
4. Try to hover and click the link icon

### Current Behavior

The link icon on child cards doesn't have clear visual feedback that it's clickable.

### Expected Behavior

Link icon should have hover state and tooltip indicating it can be clicked to unlink.

### Acceptance Criteria

- [ ] Link icon has clear hover state (color change)
- [ ] Tooltip appears: "Click to unlink from parent"
- [ ] Clicking unlinks the card and it becomes standalone

---

## UTB-003: No "Copy Link" Button for Sharing Board

**Severity**: High
**Component**: [RetroBoardHeader.tsx](../../frontend/src/features/board/components/RetroBoardHeader.tsx)
**PRD Reference**: [FR-1.1.9](../PRD.md#11-board-creation)
**Status**: Open

### Steps to Reproduce

1. Create or open a board
2. Try to find a "Share" or "Copy Link" button

### Current Behavior

No share/copy button in header. User must manually copy URL from browser address bar.

### Expected Behavior

Header should include a button to copy the board's shareable link to clipboard.

### Acceptance Criteria

- [ ] "Share" or "Copy Link" button visible in header
- [ ] Clicking copies the board URL to clipboard
- [ ] Success feedback shown (toast or button text change)

---

## UTB-004: No Visual Indicator for Action-to-Feedback Links

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-4.1.5, FR-4.1.6](../PRD.md#41-action-item-management)
**Status**: Open

### Steps to Reproduce

1. Create a board with feedback cards and action cards
2. Drag an action card onto a feedback card to create a link
3. Look at both cards for any link indicator

### Current Behavior

No visual change on either card after linking. Users cannot see which cards are linked.

### Expected Behavior

Feedback cards should show "Linked Action: {preview}" clickable box. Clicking should scroll to the linked action card.

### Acceptance Criteria

- [ ] Feedback cards show linked action indicator when linked
- [ ] Action cards show "Links to: {feedback}" when linked
- [ ] Clicking the link scrolls/highlights the target card

---

## UTB-005: Cannot Customize Columns During Board Creation

**Severity**: High
**Component**: [CreateBoardDialog.tsx](../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**PRD Reference**: [FR-1.1.3, FR-1.1.6](../PRD.md#11-board-creation)
**Status**: Open

### Steps to Reproduce

1. Navigate to home page
2. Click "Create New Board"
3. Try to edit, add, or remove columns

### Current Behavior

3 default columns are displayed as static chips. No controls to modify them.

### Expected Behavior

Users should be able to rename, add, and remove columns during board creation.

### Acceptance Criteria

- [ ] User can rename column names inline
- [ ] User can add new columns
- [ ] User can remove columns (minimum 1 required)

---

## UTB-006: Aggregated Reaction Count Not Updating When Cards Linked

**Severity**: High
**Component**: [cardStore.ts](../../frontend/src/models/stores/cardStore.ts)
**PRD Reference**: [FR-3.1.9, FR-3.1.16](../PRD.md#31-reaction-types)
**Status**: Open

### Steps to Reproduce

1. Create Card A with 3 reactions and Card B with 2 reactions
2. Drag Card B onto Card A to make B a child of A
3. Observe Card A's reaction count

### Current Behavior

Card A still shows "3" reactions after linking.

### Expected Behavior

Card A should show "5 (Agg)" - own reactions plus child's reactions.

### Acceptance Criteria

- [ ] Parent's aggregated count updates when child is linked
- [ ] UI shows "(Agg)" indicator on parent cards
- [ ] Unlinking child updates parent's aggregate count

---

## UTB-007: Cannot Add Reaction to Child/Linked Cards

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-3.1.1](../PRD.md#31-reaction-types)
**Status**: Open

### Steps to Reproduce

1. Create a parent-child card relationship
2. View the parent card with its children displayed
3. Try to click the reaction button on a child card

### Current Behavior

Child cards only display reaction count - no clickable button to add/remove reactions.

### Expected Behavior

Child cards should have functional reaction buttons. Reactions on children should add to parent's aggregated count.

### Acceptance Criteria

- [ ] Child cards have clickable reaction buttons
- [ ] Users can add/remove reactions on child cards
- [ ] Child reaction updates parent's aggregated count

---

## UTB-008: Cannot Set Card/Reaction Limits During Board Creation

**Severity**: High
**Component**: [CreateBoardDialog.tsx](../../frontend/src/features/home/components/CreateBoardDialog.tsx)
**PRD Reference**: [FR-1.1.10, FR-1.1.11](../PRD.md#11-board-creation)
**Status**: Open

### Steps to Reproduce

1. Navigate to home page
2. Click "Create New Board"
3. Look for card limit or reaction limit settings

### Current Behavior

No UI controls for limits. Both are hardcoded to unlimited.

### Expected Behavior

Users should be able to set card limit and reaction limit per user (default: unlimited).

### Acceptance Criteria

- [ ] User can set card limit per user
- [ ] User can set reaction limit per user
- [ ] Both default to unlimited

---

## UTB-009: Sorting Not Applied to Cards

**Severity**: High
**Component**: [RetroBoardPage.tsx](../../frontend/src/features/board/components/RetroBoardPage.tsx)
**PRD Reference**: [FR-2.4.1-2.4.12](../PRD.md#24-card-sorting-and-order)
**Status**: Open

### Steps to Reproduce

1. Open a board with multiple cards
2. Click sort mode dropdown (Newest/Popular)
3. Click direction toggle (ascending/descending)

### Current Behavior

Card order does not change. UI state updates but sorting is not applied.

### Expected Behavior

Cards should reorder based on selected sort criteria and direction.

### Acceptance Criteria

- [ ] Cards reorder when sort mode changes
- [ ] Cards reorder when direction toggles
- [ ] Sorting persists during session

---

## UTB-010: Board Re-renders on Sort Change

**Severity**: Medium
**Component**: [RetroBoardPage.tsx](../../frontend/src/features/board/components/RetroBoardPage.tsx)
**PRD Reference**: NFR-6.5
**Status**: Open

### Current Behavior

Entire board re-renders when sorting changes, including header and participant bar.

### Expected Behavior

Only the card list within columns should update. Other UI elements should remain stable.

### Acceptance Criteria

- [ ] Header does not re-render on sort change
- [ ] Participant bar does not re-render on sort change

---

## UTB-011: Card Deletion Fails for Board Creator

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.2.1](../PRD.md#22-card-deletion)
**Status**: Open
**Blocked By**: UTB-001

### Steps to Reproduce

1. Create a new board (as creator)
2. Add a card to any column
3. Try to delete the card

### Current Behavior

Delete button may not appear, or deletion fails. Board creator has no alias set.

### Expected Behavior

Board creator should be able to delete cards they created.

### Acceptance Criteria

- [ ] Board creator can delete their own cards
- [ ] (Resolved when UTB-001 is fixed)

---

## UTB-012: Anonymous Filter Logic Inverted

**Severity**: High
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-2.5.8](../PRD.md#25-card-filtering-by-user)
**Status**: Open

### Steps to Reproduce

1. Open a board with anonymous and attributed cards
2. Click the Anonymous avatar/filter

### Current Behavior

Clicking Anonymous hides anonymous cards and shows attributed cards.

### Expected Behavior

Clicking Anonymous should show ONLY anonymous cards (hide all attributed cards).

### Acceptance Criteria

- [ ] Anonymous filter shows only anonymous cards
- [ ] Attributed cards are hidden when Anonymous is selected

---

## UTB-013: No Visual Indicator for Active Anonymous Filter

**Severity**: High
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-2.5.2](../PRD.md#25-card-filtering-by-user)
**Status**: Open

### Steps to Reproduce

1. Click the Anonymous avatar to activate the filter
2. Look for visual indication that it's selected

### Current Behavior

No visual change when Anonymous filter is active.

### Expected Behavior

Active filter should have visual distinction (ring, background color, or border).

### Acceptance Criteria

- [ ] Active Anonymous filter has visual highlight
- [ ] User can clearly see which filter is selected

---

## Resolution Priority

| Priority | Bug | CX Impact | PRD Reference |
|----------|-----|-----------|---------------|
| 1 | UTB-001 | Board creators cannot participate | FR-1.2.3 |
| 2 | UTB-011 | Card deletion fails (blocked by UTB-001) | FR-2.2.1 |
| 3 | UTB-009 | Sorting doesn't work | FR-2.4.1-2.4.12 |
| 4 | UTB-005 | Cannot customize columns at creation | FR-1.1.3, FR-1.1.6 |
| 5 | UTB-008 | Cannot set limits at creation | FR-1.1.10, FR-1.1.11 |
| 6 | UTB-006 | Aggregated counts don't update | FR-3.1.9, FR-3.1.16 |
| 7 | UTB-007 | Cannot react to child cards | FR-3.1.1 |
| 8 | UTB-004 | No action-feedback link indicator | FR-4.1.5, FR-4.1.6 |
| 9 | UTB-003 | No share button | FR-1.1.9 |
| 10 | UTB-012 | Anonymous filter logic inverted | FR-2.5.8 |
| 11 | UTB-013 | No visual indicator for active filter | FR-2.5.2 |
| 12 | UTB-002 | Unlink button unclear | FR-2.3.7, FR-2.3.8 |
| 13 | UTB-010 | Performance: board re-renders | NFR-6.5 |

---

## PRD P0 Coverage Analysis

### P0 Requirements NOT Implemented in MVP

| PRD Req | Description | Bug | Status |
|---------|-------------|-----|--------|
| FR-1.1.3 | Define which columns board contains | UTB-005 | Missing |
| FR-1.1.6 | Customize column names and count | UTB-005 | Missing |
| FR-1.1.9 | Access and copy shareable link | UTB-003 | Missing |
| FR-1.1.10 | Specify max cards per user | UTB-008 | Missing |
| FR-1.1.11 | Specify max reactions per user | UTB-008 | Missing |
| FR-1.2.3 | Prompt for alias on first access | UTB-001 | Missing |
| FR-2.3.7 | Any user can unlink child card | UTB-002 | Unclear UX |
| FR-2.3.8 | Unlink button displayed on child | UTB-002 | Unclear UX |
| FR-2.4.1-2.4.12 | Card sorting functionality | UTB-009 | Not working |
| FR-3.1.1 | Add reactions to any card | UTB-007 | Missing for children |
| FR-3.1.9 | Parent displays aggregated count | UTB-006 | Not updating |
| FR-3.1.16 | Auto-update parent aggregate | UTB-006 | Not updating |
| FR-4.1.5 | Feedback shows linked action indicator | UTB-004 | Missing |
| FR-4.1.6 | Clickable hyperlink to action | UTB-004 | Missing |

### P0 Requirements Implemented

| PRD Req | Description | Status |
|---------|-------------|--------|
| FR-1.0.1-1.0.6 | Home page / landing page | ✓ Implemented |
| FR-1.1.1 | Any user can create board | ✓ Implemented |
| FR-1.1.2 | Assign board name | ✓ Implemented |
| FR-1.1.4-1.1.5 | Default column templates | ✓ Implemented |
| FR-1.1.7 | Admins can rename board/columns | ✓ Implemented |
| FR-1.1.8 | Generate unique shareable link | ✓ Implemented |
| FR-1.1.13 | Creator becomes admin | ✓ Implemented |
| FR-1.2.1-1.2.2 | Access board via link, multi-user | ✓ Implemented |
| FR-1.2.4-1.2.9 | Alias storage, user display, real-time | ✓ Implemented |
| FR-1.3.1-1.3.9 | Board administration, close board | ✓ Implemented |
| FR-2.1.1-2.1.11 | Card creation with anonymity | ✓ Implemented |
| FR-2.2.1-2.2.5 | Card deletion by creator | ✓ Implemented |
| FR-2.3.1-2.3.6 | Parent-child relationships | ✓ Implemented |
| FR-2.3.10-2.3.14 | Drag-drop, real-time sync | ✓ Implemented |
| FR-2.5.1-2.5.12 | User filtering | ✓ Implemented |
| FR-2.6.1-2.6.6 | Concurrent operations | ✓ Implemented |
| FR-3.1.2-3.1.8 | Reaction system basics | ✓ Implemented |
| FR-3.1.10-3.1.15 | Reaction limits, real-time | ✓ Implemented |
| FR-4.1.1-4.1.4 | Action item cards | ✓ Implemented |
| FR-4.1.7-4.1.11 | Action item persistence | ✓ Implemented |
| FR-5.1.1-5.1.11 | Data persistence | ✓ Implemented |

### Summary

- **Total P0 Requirements**: ~65 functional requirements
- **Implemented**: ~51 requirements (~78%)
- **Missing/Broken**: 14 requirements (~22%)
- **All missing items have corresponding bugs**: UTB-001 through UTB-009

---

## Related Documents

- [PRD.md](../PRD.md) - Product requirements
- [UI_UX_DESIGN_SPECIFICATION.md](UI_UX_DESIGN_SPECIFICATION.md) - Design spec
- [CR_PHASE_08.1_HomePage.md](code-review/CR_PHASE_08.1_HomePage.md) - HomePage code review

---

*Document created during user testing session - 2026-01-01*
