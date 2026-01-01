# QA Test Plan - Bug Fixes UTB-001 through UTB-013

**Document Version**: 1.1
**Date**: 2026-01-01
**QA Lead**: [TBD]
**Status**: In Progress

---

## Test Execution Summary

| Bug ID | Status | Unit Tests | Integration Tests | Manual Verification |
|--------|--------|------------|-------------------|---------------------|
| UTB-001 | **FIXED** | 31/31 PASS | Pending Backend | Pending |
| UTB-002 | Pending | - | - | - |
| UTB-003 | Pending | - | - | - |
| UTB-004 | Pending | - | - | - |
| UTB-005 | Pending | - | - | - |
| UTB-006 | Pending | - | - | - |
| UTB-007 | Pending | - | - | - |
| UTB-008 | Pending | - | - | - |
| UTB-009 | Pending | - | - | - |
| UTB-010 | Pending | - | - | - |
| UTB-011 | Blocked (UTB-001) | - | - | - |
| UTB-012 | Pending | - | - | - |
| UTB-013 | Pending | - | - | - |

---

## Test Plan Overview

This document defines the quality assurance test plan for verifying bug fixes UTB-001 through UTB-013. Tests are organized by bug ID with explicit pass/fail criteria, prerequisites, and regression considerations.

### Test Environment Requirements

| Component | Version/Configuration |
|-----------|----------------------|
| Browser - Primary | Chrome 120+ |
| Browser - Secondary | Firefox 120+, Safari 17+ |
| Viewport - Desktop | 1920x1080 |
| Viewport - Tablet | 1024x768 |
| Network | Standard broadband |
| Backend | Latest staging deployment |
| Test Data | Clean database per test suite |

---

## Test Suite 1: Board Creation (UTB-001, UTB-005, UTB-008)

### TS-1.1: Creator Alias Prompt (UTB-001) - **FIXED 2026-01-01**

#### TC-1.1.1: Alias Field Presence - **PASS**
**Priority**: P0 - Critical
**Prerequisites**: Fresh browser session, home page loaded
**Tested By**: Unit Test (CreateBoardDialog.test.tsx)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Click "Create New Board" | Dialog opens | PASS |
| 2 | Observe dialog fields | "Your Name" input field visible between board name and columns | PASS |
| 3 | Check field label | Label reads "Your Name" | PASS |
| 4 | Check placeholder | Placeholder text provides example ("John") | PASS |

**Pass Criteria**: Alias input field is visible and properly labeled

---

#### TC-1.1.2: Alias Validation - Empty - **PASS**
**Priority**: P0 - Critical
**Prerequisites**: Create Board dialog open
**Tested By**: Unit Test (CreateBoardDialog.test.tsx)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enter valid board name "Test Board" | Board name field accepts input | PASS |
| 2 | Leave alias field empty | - | - |
| 3 | Click "Create Board" button | Button is disabled | PASS |
| 4 | Observe error message | "Alias is required" on submit attempt | PASS |

**Pass Criteria**: Cannot create board without alias

---

#### TC-1.1.3: Alias Validation - Too Long - **PASS**
**Priority**: P1
**Prerequisites**: Create Board dialog open
**Tested By**: Unit Test (CreateBoardDialog.test.tsx)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enter valid board name | - | PASS |
| 2 | Enter 31+ character alias | - | PASS |
| 3 | Click Create | Error message appears | PASS |
| 4 | Observe error | "Alias must be 30 characters or less" | PASS |

**Pass Criteria**: Long aliases rejected with clear error

---

#### TC-1.1.4: Alias Validation - Invalid Characters - **PASS**
**Priority**: P1
**Prerequisites**: Create Board dialog open
**Tested By**: Unit Test (CreateBoardDialog.test.tsx)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enter alias with special chars: "User@#$%" | - | PASS |
| 2 | Click Create | Error message appears | PASS |
| 3 | Observe error | Explains allowed characters | PASS |

**Pass Criteria**: Invalid characters rejected

---

#### TC-1.1.5: Successful Board Creation with Alias - **PASS (Unit)**
**Priority**: P0 - Critical
**Prerequisites**: Fresh browser session
**Tested By**: Unit Test (CreateBoardDialog.test.tsx)
**Note**: Backend integration pending

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to home page | Home page loads | PASS |
| 2 | Click "Create New Board" | Dialog opens | PASS |
| 3 | Enter board name "Sprint 42 Retro" | Name accepted | PASS |
| 4 | Enter alias "John" | Alias accepted | PASS |
| 5 | Click "Create Board" | API called with `creator_alias: "John"` | PASS |
| 6 | Observe board page | Redirected to new board | PASS |
| 7 | Check participant bar | "John" appears as admin | Pending Backend |
| 8 | Check MyUserCard | Shows "John" as current user | Pending Backend |

**Pass Criteria**: Creator appears in participant bar with entered alias

---

### TS-1.2: Column Customization (UTB-005)

#### TC-1.2.1: Default Columns Editable
**Priority**: P0 - Critical
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe default columns | 3 columns shown as editable chips |
| 2 | Click on first column name | Text becomes editable OR input appears |
| 3 | Change name to "Successes" | Name updates |
| 4 | Blur field | Name persists as "Successes" |

**Pass Criteria**: Column names can be edited inline

---

#### TC-1.2.2: Add New Column
**Priority**: P0 - Critical
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate "+" button near columns | Button visible |
| 2 | Click "+" button | New column appears |
| 3 | Observe new column | Has default name like "New Column" |
| 4 | Observe column count | 4 columns now shown |
| 5 | Edit new column name | Can change name |

**Pass Criteria**: Can add columns up to maximum

---

#### TC-1.2.3: Remove Column
**Priority**: P0 - Critical
**Prerequisites**: Create Board dialog with 3 columns

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate "×" button on second column | Remove button visible on hover |
| 2 | Click "×" button | Second column removed |
| 3 | Observe column count | 2 columns remain |

**Pass Criteria**: Columns can be removed

---

#### TC-1.2.4: Cannot Remove Last Column
**Priority**: P1
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Remove all but one column | 1 column remains |
| 2 | Try to remove last column | Button disabled OR action prevented |
| 3 | Observe feedback | Tooltip/message explains minimum |

**Pass Criteria**: At least 1 column required

---

#### TC-1.2.5: Maximum Column Limit
**Priority**: P1
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add columns until 6 exist | 6 columns shown |
| 2 | Try to add 7th column | "+" button disabled OR error shown |

**Pass Criteria**: Maximum 6 columns enforced

---

#### TC-1.2.6: Column Name Validation
**Priority**: P1
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit column to 31+ characters | Error appears |
| 2 | Edit column to empty string | Error appears |
| 3 | Create two columns with same name | Duplicate error appears |

**Pass Criteria**: Invalid column names rejected

---

### TS-1.3: Card/Reaction Limits (UTB-008)

#### TC-1.3.1: Advanced Settings Collapsed by Default
**Priority**: P1
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe dialog | "Advanced Settings" section collapsed |
| 2 | Only board name, alias, columns visible | Limits not visible by default |

**Pass Criteria**: Advanced settings hidden by default

---

#### TC-1.3.2: Expand Advanced Settings
**Priority**: P1
**Prerequisites**: Create Board dialog open

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Advanced Settings" header | Section expands |
| 2 | Observe contents | Card limit and reaction limit controls visible |

**Pass Criteria**: Can expand advanced settings

---

#### TC-1.3.3: Set Card Limit
**Priority**: P0 - Critical
**Prerequisites**: Advanced settings expanded

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe card limit default | "Unlimited" selected |
| 2 | Select "Limit" option | Number input appears |
| 3 | Enter "10" | Value accepted |
| 4 | Create board | Board created with limit |
| 5 | Create 10 cards | All succeed |
| 6 | Try to create 11th card | Blocked with quota message |

**Pass Criteria**: Card limit enforced after creation

---

#### TC-1.3.4: Set Reaction Limit
**Priority**: P0 - Critical
**Prerequisites**: Board with reaction limit of 5

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create 5 reactions on different cards | All succeed |
| 2 | Try to add 6th reaction | Blocked with quota message |

**Pass Criteria**: Reaction limit enforced

---

---

## Test Suite 2: Board Header (UTB-003)

### TS-2.1: Share/Copy Link Button

#### TC-2.1.1: Button Visibility
**Priority**: P0 - Critical
**Prerequisites**: Board page loaded

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe header | "Share" or link icon button visible |
| 2 | Hover over button | Tooltip shows "Copy board link" or similar |

**Pass Criteria**: Share button visible in header

---

#### TC-2.1.2: Copy Link Success
**Priority**: P0 - Critical
**Prerequisites**: Board page loaded, clipboard permissions granted

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click share button | - |
| 2 | Observe feedback | Toast: "Link copied to clipboard!" |
| 3 | Paste in new tab | Board URL pasted correctly |
| 4 | Navigate to pasted URL | Same board loads |

**Pass Criteria**: URL copied and works when pasted

---

#### TC-2.1.3: Share on Closed Board
**Priority**: P1
**Prerequisites**: Closed board page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe header | Share button still visible |
| 2 | Click share button | Link copied successfully |

**Pass Criteria**: Can share closed boards

---

---

## Test Suite 3: Card UX (UTB-002, UTB-004, UTB-007, UTB-011)

### TS-3.1: Unlink Button Visibility (UTB-002)

#### TC-3.1.1: Link Icon Hover State
**Priority**: P0 - Critical
**Prerequisites**: Board with parent-child cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create parent-child relationship | Child card shows link icon |
| 2 | Hover over link icon | Color changes (e.g., to primary blue) |
| 3 | Observe cursor | Changes to pointer |
| 4 | Observe tooltip | "Click to unlink from parent" appears |

**Pass Criteria**: Clear visual feedback on hover

---

#### TC-3.1.2: Unlink Action
**Priority**: P0 - Critical
**Prerequisites**: Board with linked cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click link icon on child card | Card unlinks |
| 2 | Observe child card | No longer indented/nested under parent |
| 3 | Observe child card | Now standalone card |

**Pass Criteria**: Clicking unlinks successfully

---

### TS-3.2: Action-Feedback Link Indicators (UTB-004)

#### TC-3.2.1: Feedback Card Shows Linked Action
**Priority**: P0 - Critical
**Prerequisites**: Board with feedback and action columns

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create feedback card "Need better tests" | Card created |
| 2 | Create action card "Add unit tests" | Card created in Actions |
| 3 | Drag action onto feedback card | Link created |
| 4 | Observe feedback card | Shows "Linked Actions: Add unit tests..." |

**Pass Criteria**: Feedback shows linked action indicator

---

#### TC-3.2.2: Action Card Shows Linked Feedback
**Priority**: P0 - Critical
**Prerequisites**: Action linked to feedback (from TC-3.2.1)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe action card | Shows "Links to: Need better tests..." |

**Pass Criteria**: Action shows linked feedback indicator

---

#### TC-3.2.3: Click to Navigate
**Priority**: P1
**Prerequisites**: Linked action-feedback pair, scrollable board

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll so linked card is off-screen | Target card not visible |
| 2 | Click link on source card | Page scrolls to target |
| 3 | Observe target card | Briefly highlighted (ring effect) |

**Pass Criteria**: Clicking navigates and highlights

---

### TS-3.3: Child Card Reactions (UTB-007)

#### TC-3.3.1: Child Card Has Reaction Button
**Priority**: P0 - Critical
**Prerequisites**: Parent card with child card visible

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe child card in parent | Thumbs up button visible |
| 2 | Button shows current reaction count | Count displayed |

**Pass Criteria**: Child cards have clickable reaction button

---

#### TC-3.3.2: React to Child Card
**Priority**: P0 - Critical
**Prerequisites**: Parent with unreacted child

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Note parent's aggregated count (e.g., 3) | Baseline recorded |
| 2 | Click reaction on child card | Reaction added |
| 3 | Observe child reaction count | Increments by 1 |
| 4 | Observe parent aggregated count | Increments by 1 (now 4) |
| 5 | Observe "(Agg)" indicator on parent | Visible |

**Pass Criteria**: Child reactions update parent aggregate

---

#### TC-3.3.3: Remove Reaction from Child
**Priority**: P1
**Prerequisites**: Already reacted to child

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click reaction on child again | Reaction removed |
| 2 | Observe counts | Both child and parent decrease |

**Pass Criteria**: Can toggle reaction off

---

### TS-3.4: Card Deletion for Creator (UTB-011)

**Dependency**: Requires UTB-001 to be fixed first

#### TC-3.4.1: Creator Can Delete Own Card
**Priority**: P0 - Critical
**Prerequisites**: Create new board (creator has alias set)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a card as board creator | Card created |
| 2 | Hover over the card | Delete button (trash icon) visible |
| 3 | Click delete button | Confirmation dialog appears |
| 4 | Confirm deletion | Card deleted |

**Pass Criteria**: Board creator can delete their cards

---

---

## Test Suite 4: Data Layer (UTB-006)

### TS-4.1: Aggregated Count Updates on Link

#### TC-4.1.1: Count Updates When Linking
**Priority**: P0 - Critical
**Prerequisites**: Two cards with reactions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create Card A with 3 reactions | Count shows 3 |
| 2 | Create Card B with 2 reactions | Count shows 2 |
| 3 | Drag Card B onto Card A | B becomes child of A |
| 4 | Observe Card A's count | Shows "5 (Agg)" |

**Pass Criteria**: Parent shows sum of all reactions

---

#### TC-4.1.2: Count Updates When Unlinking
**Priority**: P0 - Critical
**Prerequisites**: Parent with child from TC-4.1.1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Parent shows "5 (Agg)" | Baseline confirmed |
| 2 | Click unlink on child card | Child unlinked |
| 3 | Observe parent's count | Now shows "3" (own reactions only) |
| 4 | Observe child's count | Shows "2" |

**Pass Criteria**: Counts update correctly after unlink

---

#### TC-4.1.3: Real-time Update for Other Users
**Priority**: P1
**Prerequisites**: Two browser sessions on same board

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A links Card B as child of Card A | Link created |
| 2 | Observe User B's screen | Parent's aggregated count updates |

**Pass Criteria**: Aggregation updates propagate in real-time

---

---

## Test Suite 5: Sorting & Filtering (UTB-009, UTB-010, UTB-012, UTB-013)

### TS-5.1: Sorting (UTB-009)

#### TC-5.1.1: Sort by Recency - Newest First
**Priority**: P0 - Critical
**Prerequisites**: Board with 3+ cards created at different times

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ensure sort mode is "Recency" | Mode selected |
| 2 | Ensure direction is "Descending" | Arrow points down |
| 3 | Observe card order | Newest card at top |

**Pass Criteria**: Cards sorted newest first

---

#### TC-5.1.2: Sort by Recency - Oldest First
**Priority**: P0 - Critical
**Prerequisites**: Same board

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click direction toggle | Changes to ascending |
| 2 | Observe card order | Oldest card at top |

**Pass Criteria**: Direction toggle reverses order

---

#### TC-5.1.3: Sort by Popularity - Most First
**Priority**: P0 - Critical
**Prerequisites**: Board with cards having different reaction counts

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Popularity" sort mode | Mode changes |
| 2 | Ensure direction is "Descending" | - |
| 3 | Observe card order | Card with most reactions at top |

**Pass Criteria**: Cards sorted by reaction count

---

#### TC-5.1.4: Popularity Uses Aggregated Count
**Priority**: P0 - Critical
**Prerequisites**: Parent with children (aggregated count = 10), standalone card (count = 8)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sort by popularity descending | - |
| 2 | Observe order | Parent (10 agg) above standalone (8) |

**Pass Criteria**: Aggregated count used for parent sorting

---

### TS-5.2: Re-render Performance (UTB-010)

#### TC-5.2.1: Header Stable During Sort Change
**Priority**: P1
**Prerequisites**: Board page loaded, React DevTools installed

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open React DevTools Profiler | Ready to record |
| 2 | Start recording | Recording |
| 3 | Change sort mode | Cards reorder |
| 4 | Stop recording | - |
| 5 | Examine RetroBoardHeader | Should not show re-render |

**Pass Criteria**: Header component doesn't re-render

---

#### TC-5.2.2: Participant Bar Stable During Sort Change
**Priority**: P1
**Prerequisites**: Same setup

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle sort direction | Cards reorder |
| 2 | Examine ParticipantBar in profiler | Should not show re-render |

**Pass Criteria**: Participant bar doesn't re-render

---

### TS-5.3: Anonymous Filter (UTB-012)

#### TC-5.3.1: Anonymous Filter Shows Only Anonymous Cards
**Priority**: P0 - Critical
**Prerequisites**: Board with mixed anonymous and attributed cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe all cards visible | Both types shown |
| 2 | Click Anonymous avatar in participant bar | Filter activates |
| 3 | Observe cards | ONLY anonymous cards visible |
| 4 | Count attributed cards | Zero attributed cards visible |

**Pass Criteria**: Only anonymous cards shown when filter active

---

#### TC-5.3.2: Anonymous Filter Clears User Selection
**Priority**: P1
**Prerequisites**: Board with users, user filter active

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a user avatar to filter by user | User's cards shown |
| 2 | Click Anonymous avatar | Anonymous filter activates |
| 3 | Observe user filter | User selection cleared |

**Pass Criteria**: Filters are mutually exclusive

---

#### TC-5.3.3: Toggle Anonymous Filter Off
**Priority**: P1
**Prerequisites**: Anonymous filter active

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Anonymous avatar again | Filter deactivates |
| 2 | Observe cards | All cards visible again |

**Pass Criteria**: Can toggle filter off

---

### TS-5.4: Anonymous Filter Visual Indicator (UTB-013)

#### TC-5.4.1: Visual Highlight When Active
**Priority**: P0 - Critical
**Prerequisites**: Board with anonymous cards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Observe Anonymous avatar (inactive) | Normal styling |
| 2 | Click Anonymous avatar | Filter activates |
| 3 | Observe Anonymous avatar (active) | Ring/highlight visible |
| 4 | Compare to selected user avatar | Similar styling applied |

**Pass Criteria**: Active state clearly visible

---

---

## Regression Test Suite

### RTS-1: Existing Functionality Verification

#### RTC-1.1: Basic Board Creation Still Works
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create board with defaults | Board creates with 3 columns |

---

#### RTC-1.2: Card CRUD Operations
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create card | Card appears |
| 2 | Edit card content | Content updates |
| 3 | Delete card | Card removed |

---

#### RTC-1.3: Drag-Drop Parent-Child
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag card onto another | Child relationship created |
| 2 | Visual nesting correct | Child indented |

---

#### RTC-1.4: Reactions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add reaction | Count increments |
| 2 | Remove reaction | Count decrements |

---

#### RTC-1.5: Real-time Updates
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Two users on same board | - |
| 2 | User A creates card | User B sees it appear |

---

#### RTC-1.6: Board Close
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin closes board | Board becomes read-only |
| 2 | Try to create card | Blocked |

---

## Test Execution Checklist

### Pre-Execution
- [ ] Test environment verified
- [ ] Test data prepared
- [ ] All browsers installed
- [ ] Network conditions normal
- [ ] Staging deployment updated with fixes

### Execution Tracking

| Test Suite | Assigned To | Status | Pass | Fail | Blocked |
|------------|-------------|--------|------|------|---------|
| TS-1: Board Creation | | Pending | - | - | - |
| TS-2: Board Header | | Pending | - | - | - |
| TS-3: Card UX | | Pending | - | - | - |
| TS-4: Data Layer | | Pending | - | - | - |
| TS-5: Sorting & Filtering | | Pending | - | - | - |
| RTS-1: Regression | | Pending | - | - | - |

### Post-Execution
- [ ] All test results documented
- [ ] Defects logged for failures
- [ ] Regression issues escalated
- [ ] Sign-off obtained

---

## Exit Criteria

Testing is complete when:
1. All P0-Critical tests pass
2. 90%+ of P1 tests pass
3. No regression failures
4. All failures have logged defects
5. QA Lead signs off

---

*Test plan prepared for QA team. Assign testers during sprint planning.*
