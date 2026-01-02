# User Testing Bugs - Frontend (Session 01011530)

**Document Created**: 2026-01-01
**Status**: Open Issues Requiring Resolution

---

## Bug Tracker Summary

| ID | Severity | Component | PRD Req | Status | Description |
|----|----------|-----------|---------|--------|-------------|
| UTB-014 | High | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-1.2.7](../PRD.md#12-board-access--user-identity) | Open | Current user not shown in participant bar after alias login |
| UTB-015 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.1.4](../PRD.md#21-card-creation) | Open | Current user's attributed cards show Anonymous instead of alias |
| UTB-016 | Medium | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.3](../PRD.md#23-parent-child-card-relationships) | Open | Parent cards should show aggregated vs unaggregated reaction toggle |
| UTB-017 | Medium | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-2.5.5](../PRD.md#25-card-filtering-by-user) | Open | Filter should be single-selection only |
| UTB-018 | Low | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.1.4](../PRD.md#21-card-creation) | Open | Anonymous cards should display ghost icon instead of "Anonymous" text |
| UTB-019 | Medium | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.3.1](../PRD.md#23-parent-child-card-relationships) | Open | Card drag handle should be full header, not left element |
| UTB-020 | High | [RetroCard](../../frontend/src/features/card/components/RetroCard.tsx) | [FR-2.6.1](../PRD.md#26-concurrent-card-operations) | Open | Cannot edit card content (possibly blocked by UTB-014) |
| UTB-021 | Low | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-1.2.7](../PRD.md#12-board-access--user-identity) | Open | Avatar initials should use first letters of first and last name |
| UTB-022 | Low | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | [FR-1.2.7](../PRD.md#12-board-access--user-identity) | Open | Tooltip should show full name on avatar hover |
| UTB-023 | Low | [ParticipantBar](../../frontend/src/features/participant/components/ParticipantBar.tsx) | NFR-7.1 | Open | Participant overflow should scroll or relocate controls |

---

## UTB-014: Current User Not Shown in Participant Bar

**Severity**: High
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Status**: Open

### Steps to Reproduce

1. Navigate to home page
2. Create or join a board
3. Enter alias when prompted
4. Observe participant bar at top of board

### Current Behavior

After logging in with an alias, the participant bar shows no participants. The current user's avatar does not appear.

### Expected Behavior

Current user should be shown as a participant with their alias avatar. Without visible participants, features like "unlink board" and "delete board" may be inaccessible.

### Acceptance Criteria

- [ ] Current user's avatar appears in participant bar after entering alias
- [ ] User is shown as primary participant
- [ ] Admin designation is visible for board creator
- [ ] User can access board management features (unlink, delete)

### Impact

This bug blocks multiple features:
- Cannot see who is on the board
- Cannot unlink or delete the board
- Card editing may fail (see UTB-020)
- Card deletion may fail (related to UTB-011)

---

## UTB-015: Current User's Cards Show Anonymous Instead of Alias

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.1.4](../PRD.md#21-card-creation)
**Status**: Open
**Blocked By**: UTB-014

### Steps to Reproduce

1. Log into board with an alias
2. Create a card and choose "attributed" (not anonymous)
3. Observe the card's author display

### Current Behavior

Cards show "Anonymous" text even when created as attributed cards. The current user's alias is not displayed.

### Expected Behavior

Attributed cards should display the creator's alias. Only cards explicitly marked as anonymous should show anonymous indicator.

### Acceptance Criteria

- [ ] Attributed cards show creator's alias
- [ ] Anonymous cards show anonymous indicator (per UTB-018)
- [ ] Card creator can see their own alias on cards they created

### Root Cause Analysis

This is likely a symptom of UTB-014 - if the current user is not registered in the participant list, their alias cannot be displayed on cards.

---

## UTB-016: Parent Cards Should Show Aggregated vs Unaggregated Toggle

**Severity**: Medium
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.3](../PRD.md#23-parent-child-card-relationships), [FR-3.1.9](../PRD.md#31-reaction-system)
**Status**: Open

### Steps to Reproduce

1. Create multiple cards with reactions
2. Link cards to create parent-child relationships
3. Observe the parent card's reaction count

### Current Behavior

Parent cards only show either aggregated or unaggregated count. Users cannot toggle between views.

### Expected Behavior

For linked parent cards, users should be able to see:
- Aggregated count (own + children reactions)
- Unaggregated count (own reactions only)

Suggested UI: Display both values, e.g., "5 (Agg) / 2 (Own)" or provide a toggle.

### Acceptance Criteria

- [ ] Parent cards display aggregated reaction count
- [ ] Parent cards display unaggregated (own) reaction count
- [ ] Clear visual distinction between aggregated and own counts

---

## UTB-017: Filter Should Be Single-Selection Only

**Severity**: Medium
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-2.5.5](../PRD.md#25-card-filtering-by-user)
**Status**: Open

### Steps to Reproduce

1. Open a board with multiple participants
2. Click on one participant's avatar to filter
3. Try clicking another participant while first is selected

### Current Behavior

Unclear if multi-select is possible. Filter behavior needs to be single-select.

### Expected Behavior

Filter should allow only one selection at a time:
- All Participants (default)
- Anonymous
- Current User (myUser)
- OR any single other participant

Clicking a new filter should deselect the previous one.

### Acceptance Criteria

- [ ] Only one filter can be active at a time
- [ ] Clicking a new filter deselects the previous
- [ ] "All Participants" is the default state
- [ ] Visual indicator shows currently active filter

---

## UTB-018: Anonymous Cards Should Display Ghost Icon

**Severity**: Low
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.1.4](../PRD.md#21-card-creation)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 13.3](../frontend/UI_UX_DESIGN_SPECIFICATION.md#133-shadcnui-components-used) - Lists `Ghost` icon for Anonymous filter
**Status**: Open

### Steps to Reproduce

1. Create a card and select anonymous option
2. View the card's author display

### Current Behavior

Anonymous cards display the word "Anonymous" as text.

### Expected Behavior

Anonymous cards should display a ghost icon (👻) instead of the text "Anonymous". This is more visually consistent and takes less space.

Per the UI/UX Design Spec (Section 13.3), the `Ghost` icon from Lucide React is already specified for the Anonymous filter - this should also apply to anonymous card attribution.

### Acceptance Criteria

- [ ] Anonymous cards show Ghost icon instead of "Anonymous" text
- [ ] Icon is clear and recognizable
- [ ] Tooltip on hover shows "Anonymous"

### Design Suggestion

Use `<Ghost />` from lucide-react (already in the design system) to indicate anonymous authorship. This provides:
- Visual consistency with avatar system and Anonymous filter
- Reduced text clutter
- Clear iconographic meaning

---

## UTB-019: Card Drag Handle Should Be Full Header

**Severity**: Medium
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.3.1](../PRD.md#23-parent-child-card-relationships)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 6.2](../frontend/UI_UX_DESIGN_SPECIFICATION.md#62-card-header)
**Status**: Open

### Steps to Reproduce

1. View a card on the board
2. Try to drag the card using the left drag element

### Current Behavior

Cards have a small left-side drag element (⠿⠿⠿ icon). This requires precise targeting and is not intuitive.

### Expected Behavior

Per the UI/UX Design Spec Section 6.2:
> "Full-width clickable area (30px height)"
> "Cursor: `move` on hover"

The entire card header (top area) should be draggable with `cursor: grab` on hover and `cursor: grabbing` during drag.

### Acceptance Criteria

- [ ] Entire card header area (30px) is draggable
- [ ] Cursor changes to `grab` on hover over drag zone
- [ ] Cursor changes to `grabbing` during drag
- [ ] Drag zone does not interfere with buttons/actions in header (reactions, delete, unlink)

### Design Suggestion

The UI/UX spec already defines this behavior. Implementation should:
1. Expand the drag handle to full header width
2. Exclude action buttons (👍, 🔗, 🗑️) from the drag zone using `pointer-events: none` on the drag overlay for those elements
3. Use CSS `cursor: grab` and `cursor: grabbing` for proper visual feedback

```css
.card-header-drag-zone {
  cursor: grab;
  height: 30px;
  width: 100%;
}
.card-header-drag-zone:active {
  cursor: grabbing;
}
```

---

## UTB-020: Cannot Edit Card Content

**Severity**: High
**Component**: [RetroCard.tsx](../../frontend/src/features/card/components/RetroCard.tsx)
**PRD Reference**: [FR-2.6.1](../PRD.md#26-concurrent-card-operations)
**Status**: Open
**Blocked By**: UTB-014 (suspected)

### Steps to Reproduce

1. Log into board with alias
2. Create a card
3. Try to click on the card to edit its content

### Current Behavior

Card content cannot be edited after creation. Clicking on the card does not enable edit mode.

### Expected Behavior

Card creators should be able to click on their cards to edit the content. Edit mode should lock the card for other users.

### Acceptance Criteria

- [ ] Card creator can click to edit card content
- [ ] Edit mode visual indicator appears
- [ ] Other users see "being edited" indicator
- [ ] Changes are saved on blur or enter

### Root Cause Analysis

This may be a symptom of UTB-014 - if the current user is not recognized as the card creator (due to missing alias registration), edit permissions may not be granted.

---

## UTB-021: Avatar Initials Should Use First/Last Name Letters

**Severity**: Low
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Status**: Open

### Steps to Reproduce

1. Enter alias with first and last name (e.g., "John Smith")
2. View avatar in participant bar

### Current Behavior

Avatar initials logic is unclear. May only use first letter(s) of first name.

### Expected Behavior

Avatar initials should use first letters of first and last name:
- "John" → "JO" (first two letters if single word)
- "John Smith" → "JS" (first letter of each word)
- "John A. Smith" → "JS" (first letter of first and last word)

### Acceptance Criteria

- [ ] Single name: first two letters capitalized (e.g., "John" → "JO")
- [ ] Two or more names: first letter of first and last name (e.g., "John Smith" → "JS")
- [ ] Initials are uppercase
- [ ] Consistent color assignment per user

---

## UTB-022: Tooltip Should Show Full Name on Avatar Hover

**Severity**: Low
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 13.3](../frontend/UI_UX_DESIGN_SPECIFICATION.md#133-shadcnui-components-used) - `<Tooltip>` component listed for "Hover hints, truncated text"
**Status**: Open

### Steps to Reproduce

1. Hover over a participant's avatar in the participant bar

### Current Behavior

No tooltip appears, or tooltip is missing.

### Expected Behavior

When hovering over an avatar, a tooltip should display the participant's full alias/name.

Per the UI/UX Design Spec Section 13.3, the `<Tooltip>` component from shadcn/ui is already in the design system for "Hover hints, truncated text".

### Acceptance Criteria

- [ ] Tooltip appears on avatar hover
- [ ] Tooltip displays full alias/name
- [ ] Tooltip has appropriate delay (300ms)
- [ ] Works for all participants including Anonymous
- [ ] Uses shadcn/ui `<Tooltip>` component

---

## UTB-023: Participant Overflow Should Scroll or Relocate Controls

**Severity**: Low
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: NFR-7.1 (Usability)
**Status**: Open

### Steps to Reproduce

1. Add many participants to a board (10+)
2. Observe the participant bar layout

### Current Behavior

Unclear how overflow is handled. May push other controls off screen.

### Expected Behavior

When participant count exceeds available space:
- Participant avatars should scroll horizontally, OR
- Show "+N more" indicator with dropdown

Additionally, consider relocating controls:
- Move "Copy Link" button next to board name
- Move "Sort By" to the top line header

### Acceptance Criteria

- [ ] Participant overflow is handled gracefully
- [ ] All participants are accessible (scroll or dropdown)
- [ ] Controls remain accessible with many participants

### Design Suggestion

Recommended layout restructure:

**Current:**
```
[Board Name]          [Sort By: ▾] [Direction: ▾]
[Participant Avatars...] [Copy Link]
```

**Proposed:**
```
[Board Name] [Copy Link] [Share]    [Sort: ▾] [↑↓]
[Participant Avatars... (scrollable)]
```

Benefits:
- Copy Link is more discoverable next to board name
- Participants have full width for scrolling
- Controls are grouped logically

---

## Resolution Priority

| Priority | Bug | CX Impact | PRD Reference |
|----------|-----|-----------|---------------|
| 1 | UTB-014 | Blocks multiple features - users invisible | FR-1.2.7 |
| 2 | UTB-015 | Cards show wrong author | FR-2.1.4 |
| 3 | UTB-020 | Cannot edit cards | FR-2.6.1 |
| 4 | UTB-017 | Filter behavior incorrect | FR-2.5.5 |
| 5 | UTB-016 | Aggregation visibility | FR-2.3, FR-3.1.9 |
| 6 | UTB-019 | Drag UX improvement | FR-2.3.1 |
| 7 | UTB-018 | Anonymous visual polish | FR-2.1.4 |
| 8 | UTB-021 | Avatar initials | FR-1.2.7 |
| 9 | UTB-022 | Tooltip missing | FR-1.2.7 |
| 10 | UTB-023 | Overflow handling | NFR-7.1 |

---

## Dependency Analysis

```
UTB-014 (User not in participant bar)
    │
    ├── UTB-015 (Cards show Anonymous)
    │
    ├── UTB-020 (Cannot edit cards)
    │
    └── UTB-011 (Card deletion fails) [from previous session]
```

Resolving UTB-014 is critical as it appears to be the root cause of multiple issues.

---

## Related Documents

- [PRD.md](../PRD.md) - Product requirements (v1.4)
- [UI_UX_DESIGN_SPECIFICATION.md](../frontend/UI_UX_DESIGN_SPECIFICATION.md) - Design spec (v1.1)
- [USER_TESTING_BUGS_01010101.md](../01010101/USER_TESTING_BUGS_01010101.md) - Previous testing session

## Design Spec Alignment Notes

Several bugs in this report reveal gaps between implementation and the approved UI/UX Design Specification:

| Bug | Design Spec Section | Gap |
|-----|---------------------|-----|
| UTB-018 | Section 13.3 | Ghost icon specified but not implemented for anonymous cards |
| UTB-019 | Section 6.2 | Full-width drag handle (30px) specified but not implemented |
| UTB-022 | Section 13.3 | Tooltip component in design system but not applied to avatars |
| UTB-023 | Section 4.3 | Participant section layout needs refinement for overflow |

---

*Document created during user testing session - 2026-01-01 15:30*
