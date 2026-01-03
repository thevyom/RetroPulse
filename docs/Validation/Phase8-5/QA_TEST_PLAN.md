# Phase 8-5 QA Test Plan

**Created**: 2026-01-02
**Completed**: 2026-01-02
**Status**: ✅ Implementation Complete - Pending QA Verification
**Author**: Principal Engineer (QA Perspective)

---

## 1. Test Scope

### 1.1 In Scope

| Category | Description | Test Level |
|----------|-------------|------------|
| DnD Accessibility | Keyboard drag operations, a11y tags | Unit/Integration (Phase 1) |
| E2E Infrastructure | X-Admin-Secret header, admin helpers | E2E (Phase 2) |
| UTB-029 | Card unlink not working | Unit + E2E (Phase 3) |
| UTB-030 | Aggregated count not syncing | Unit + E2E (Phase 3) |
| UTB-020 | Card editing broken (3 failing) | Unit + E2E (Phase 3) |
| UTB-022 | Avatar tooltip wrong text | Unit + E2E |
| UTB-031 | Touch target size (< 32px) | E2E |
| UTB-032 | A11y selector strict mode | E2E fix |
| UTB-014 | Participant bar E2E test | E2E (new) |
| UTB-024 | Avatar initials overflow | Unit + Visual |
| UTB-025 | Avatar filter logic | Unit + E2E |
| UTB-026 | MyUser avatar position | Unit + E2E |
| UTB-027 | Presence indicators | Unit + E2E |
| UTB-028 | Inline board rename | Unit + E2E |
| UX Enhancement | Avatar context menu | Unit + E2E |

### 1.2 Out of Scope

- Performance testing (deferred)
- Multi-browser compatibility (Chromium only)
- Mobile viewport testing (covered in Phase 8-4)

---

## 2. Test Strategy by Priority

### 2.1 Priority 1: E2E Infrastructure

**Goal:** Reduce skipped tests from 21 to <5

#### Test Suite: Admin Override (New)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| ADMIN-001 | X-Admin-Secret header grants admin access | E2E | Admin actions succeed |
| ADMIN-002 | Invalid secret returns 403 | E2E | Forbidden error |
| ADMIN-003 | No secret uses normal auth | E2E | Standard behavior |
| ADMIN-004 | Secret works for board rename | E2E | Board renamed |
| ADMIN-005 | Secret works for board close | E2E | Board closed |
| ADMIN-006 | Secret works for promote admin | E2E | User promoted |

#### Migrated Tests (Previously Skipped)

| Original Test | Reason Skipped | New Approach |
|---------------|----------------|--------------|
| creator has admin controls visible | Admin detection timing | Use adminRequest helper |
| admin badge appears on admin avatars | Admin detection timing | Use adminRequest helper |
| admin can close board | WebSocket admin detection | Direct API call + verify UI |
| closed board disables card creation | WebSocket admin detection | Direct API call + verify UI |
| two users see each other's cards | WebSocket sync | Keep skipped (infra limitation) |

---

### 2.2 Priority 1B: DnD Accessibility (Run Early)

**Goal:** Keyboard-accessible drag-drop with proper aria tags
**Why Early:** A11y tags enable better E2E selectors for QA testing

#### Test Suite: Keyboard DnD (Integration Level)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| DND-KB-001 | Space key initiates drag | Integration | isDragging = true |
| DND-KB-002 | Arrow keys move drop target | Integration | dropTarget updates |
| DND-KB-003 | Space key drops item | Integration | getDropResult() returns action |
| DND-KB-004 | Escape cancels drag | Integration | isDragging = false, no change |
| DND-KB-005 | Tab cycles through droppable targets | Integration | Focus moves correctly |
| DND-KB-006 | Screen reader announces drag state | Integration | aria-live region updated |

#### A11y Tag Verification

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| A11Y-DND-001 | Drag handle has role="button" | Unit | Role present |
| A11Y-DND-002 | Drag handle has aria-label | Unit | "Drag card: [content]" |
| A11Y-DND-003 | Drag handle has aria-pressed when active | Unit | true during drag |
| A11Y-DND-004 | Drop target has aria-dropeffect | Unit | "move" or "link" |
| A11Y-DND-005 | Live region announces drag operations | Unit | aria-live="polite" |

---

### 2.2C Priority 1C: Phase 8-4 Failing Tests (Must Fix)

**Goal:** Fix 6 failing tests from Phase 8-4 QA Report

#### UTB-020: Card Editing Broken (3 failing)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB020-001 | Card owner click enters edit mode | E2E | textarea visible |
| UTB020-002 | Edit textarea has correct testid | Unit | data-testid="card-edit-textarea" |
| UTB020-003 | Enter/blur saves edited content | E2E | Card content updated |
| UTB020-004 | Escape cancels edit without saving | E2E | Original content restored |
| UTB020-005 | Non-owner click does not edit | E2E | No textarea appears |

#### UTB-022: Avatar Tooltip Wrong Text (1 failing)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB022-001 | User avatar tooltip shows user name | E2E | "John Smith" not "All Users" |
| UTB022-002 | All Users button tooltip shows "All Users" | E2E | Correct text |
| UTB022-003 | Anonymous button tooltip shows "Anonymous" | E2E | Correct text |
| UTB022-004 | Tooltip prop passed correctly to component | Unit | title={user.name} |

#### UTB-031: Touch Target Size (1 failing)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB031-001 | Reaction button min-width >= 32px | E2E | Size check passes |
| UTB031-002 | Reaction button min-height >= 32px | E2E | Size check passes |
| UTB031-003 | Button remains visually appropriate | Visual | Screenshot review |
| UTB031-004 | Touch interactions work on tablet | E2E | Tap registers correctly |

#### UTB-032: A11y Selector Strict Mode (1 failing)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB032-001 | Drag handle selector matches single element | E2E | No strict mode violation |
| UTB032-002 | Each drag handle has unique aria-label | Unit | Unique per card content |
| UTB032-003 | Test iterates all drag handles correctly | E2E | All handles verified |

#### UTB-014: Participant Bar E2E Test (new coverage)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB014-001 | Participant bar renders on board | E2E | Component visible |
| UTB014-002 | All Users button visible and clickable | E2E | Button functional |
| UTB014-003 | Anonymous button visible and clickable | E2E | Button functional |
| UTB014-004 | User avatars render for participants | E2E | Avatars visible |
| UTB014-005 | Clicking avatar filters cards | E2E | Cards filtered correctly |
| UTB014-006 | Participant count updates on join | E2E | New avatar appears |

---

### 2.3 Priority 2: Critical Card Linking Bugs

#### UTB-029: Card Unlink

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB029-001 | Click link icon triggers unlink API call | E2E | Network request sent |
| UTB029-002 | Unlink removes parent_card_id from child | Unit | parent_card_id = null |
| UTB029-003 | Child card visually separates from parent | E2E | Cards in separate DOM positions |
| UTB029-004 | Unlink updates parent's aggregated count | E2E | Count decreases |
| UTB029-005 | WebSocket broadcasts unlink to other users | E2E | Other browser sees unlink |
| UTB029-006 | Unlinked card can be re-linked | E2E | Re-link succeeds |

#### UTB-030: Aggregated Reaction Count

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB030-001 | Linking card updates parent aggregate | E2E | Parent count = own + child |
| UTB030-002 | Unlinking card updates parent aggregate | E2E | Parent count = own only |
| UTB030-003 | Child reaction increments parent aggregate | Unit | Both counts increase |
| UTB030-004 | Parent reaction updates aggregate correctly | Unit | Aggregate = own + children |
| UTB030-005 | Multiple children aggregate correctly | E2E | Sum of all children |
| UTB030-006 | WebSocket syncs aggregate to other users | E2E | Real-time update |

---

### 2.4 Priority 3: UTB Bug Fixes

#### UTB-024: Avatar Initials

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB024-001 | Single letter fits in avatar | Unit | No overflow |
| UTB024-002 | Two letters fit in avatar | Unit | No overflow |
| UTB024-003 | Long names truncate to initials | Unit | "JS" from "John Smith" |
| UTB024-004 | Visual: initials centered | Visual | Screenshot matches |

#### UTB-025: Avatar Filter

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB025-001 | Click avatar shows only their cards | E2E | Other cards hidden |
| UTB025-002 | Click All shows all cards | E2E | All cards visible |
| UTB025-003 | Click Anonymous shows anon cards only | E2E | Named cards hidden |
| UTB025-004 | Filter state persists on card add | E2E | New card respects filter |
| UTB025-005 | Unit: filterByUser returns correct cards | Unit | Filtered array correct |

#### UTB-026: MyUser Position

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB026-001 | Current user avatar in left section | E2E | Position verified |
| UTB026-002 | Other users in right scrollable section | E2E | Scrollable container |
| UTB026-003 | Divider visible between sections | E2E | Divider present |
| UTB026-004 | "Me" label on current user | E2E | Label text present |
| UTB026-005 | Current user always visible (not scrolled) | E2E | In viewport |

#### UTB-027: Presence Indicators

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB027-001 | Online user shows green dot | E2E | 8px green indicator |
| UTB027-002 | Offline user shows gray/no dot | E2E | Indicator absent/gray |
| UTB027-003 | User join updates indicator | E2E | Real-time update |
| UTB027-004 | User leave updates indicator | E2E | Real-time update |
| UTB027-005 | Tooltip shows status | E2E | "John (online)" |
| UTB027-006 | Unit: onlineUserIds set updates | Unit | Set modified correctly |

#### UTB-028: Inline Board Rename

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB028-001 | Admin clicks title → edit mode | E2E | Input field appears |
| UTB028-002 | Enter saves new name | E2E | Title updated |
| UTB028-003 | Escape cancels edit | E2E | Original title restored |
| UTB028-004 | Blur saves new name | E2E | Title updated |
| UTB028-005 | Non-admin click → no edit mode | E2E | No input field |
| UTB028-006 | Pencil icon removed | E2E | Icon not in DOM |

#### UX Enhancement: Context Menu

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| CTX-001 | Right-click opens context menu | E2E | Menu visible |
| CTX-002 | Click outside closes menu | E2E | Menu hidden |
| CTX-003 | Escape closes menu | E2E | Menu hidden |
| CTX-004 | Make Admin option for admins | E2E | Option visible |
| CTX-005 | No Make Admin for non-admins | E2E | Option hidden |
| CTX-006 | View Cards option always present | E2E | Option visible |
| CTX-007 | Make Admin promotes user | E2E | Admin badge appears |
| CTX-008 | Long-press opens menu (touch) | E2E | Menu visible (tablet viewport) |

---

## 3. Test Environment

### 3.1 Required Setup

| Component | Requirement |
|-----------|-------------|
| Backend | Running with ADMIN_SECRET env var |
| Frontend | Dev server on localhost:5173 |
| MongoDB | Docker container with test data |
| Browser | Chromium via Playwright |

### 3.2 Environment Variables

```bash
# Backend .env (test)
ADMIN_SECRET=test-admin-secret-16ch
NODE_ENV=test

# E2E tests
ADMIN_SECRET=test-admin-secret-16ch
```

---

## 4. Test Data Requirements

### 4.1 Pre-seeded Boards

| Board ID | Purpose | Users |
|----------|---------|-------|
| test-board-admin | Admin override tests | admin@test, user@test |
| test-board-filter | Filter logic tests | 3 users with 5 cards each |
| test-board-presence | Presence tests | Dynamic join/leave |

### 4.2 User Scenarios

| Scenario | Users | Cards |
|----------|-------|-------|
| Single user | 1 | 3 |
| Multi user | 3 | 9 (3 each) |
| Anonymous mix | 2 | 4 (2 anon, 2 named) |

---

## 5. Regression Tests

### 5.1 Must-Pass from Phase 8-4

| Suite | Tests | Expected |
|-------|-------|----------|
| 01-board-creation | 13 | All pass |
| 02-board-lifecycle | 9 | All pass |
| 04-card-quota | 9 | All pass |
| 05-sorting-filtering | 6 (excl. UTB-012) | All pass |

### 5.2 Bug Fixes to Verify

| Bug ID | Verification Test |
|--------|------------------|
| UTB-003 | Copy Link copies URL to clipboard |
| UTB-007 | Child card reaction button works |
| UTB-008 | Card/reaction limits enforced |
| UTB-013 | Anonymous filter visual state |
| UTB-017 | Single-selection filter |
| UTB-018 | Anonymous ghost icon |
| UTB-021 | Avatar initials format |

---

## 6. Test Execution Plan

### 6.1 Phase 1: Infrastructure (E2E)

```bash
# Run admin override tests
npm run test:e2e -- --grep "Admin Override"

# Run migrated admin tests
npm run test:e2e -- 02-board-lifecycle.spec.ts 03-retro-session.spec.ts
```

### 6.2 Phase 2: DnD Accessibility (Unit/Integration)

```bash
# Run keyboard DnD tests
npm run test:run -- tests/integration/drag-drop.integration.test.ts

# Run a11y tag tests
npm run test:run -- tests/unit/accessibility
```

### 6.3 Phase 3: UTB Fixes (Unit + E2E)

```bash
# Run UTB-specific tests
npm run test:run -- --grep "UTB-02"
npm run test:e2e -- --grep "UTB-02"
```

### 6.4 Phase 4: Full Regression

```bash
# Full E2E suite
npm run test:e2e

# Full unit suite
npm run test:run
```

---

## 7. Acceptance Criteria

### 7.1 Pass Thresholds

| Metric | Threshold |
|--------|-----------|
| E2E Pass Rate | ≥90% |
| Unit Test Pass Rate | 100% |
| Skipped Tests | <5 |
| Critical Bugs | 0 |

### 7.2 Sign-off Requirements

- [x] All Priority 1 tests pass (E2E Infrastructure implemented)
- [x] All Priority 2 tests pass (Card linking bugs fixed)
- [x] All Priority 3 tests pass (Avatar/UI bugs fixed)
- [ ] Regression tests show no new failures (pending full test run)
- [ ] QA engineer sign-off (pending verification)

---

## 8. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| @dnd-kit E2E incompatibility | DnD E2E tests skipped | Unit/integration tests |
| Multi-browser not tested | Edge cases may exist | Future phase |
| Real WebSocket multi-user | Complex setup | Mock where needed |

---

## 9. Test Artifacts

| Artifact | Location |
|----------|----------|
| E2E Screenshots | frontend/test-results/*/screenshot.png |
| E2E Videos | frontend/test-results/*/video.webm |
| Coverage Report | frontend/coverage/ |
| Test Report | frontend/playwright-report/ |

---

*QA Test Plan by Principal Engineer - 2026-01-02*
*✅ Implementation Complete - 2026-01-02*
*Pending QA verification and full regression test run*

---

## Implementation Status

### Bugs Fixed (12/12)

| Bug ID | Description | Status |
|--------|-------------|--------|
| UTB-014 | Participant bar E2E test | ✅ Added |
| UTB-020 | Card editing broken | ✅ Fixed |
| UTB-022 | Avatar tooltip wrong text | ✅ Fixed |
| UTB-024 | Avatar initials overflow | ✅ Fixed |
| UTB-025 | Avatar filter logic | ✅ Fixed |
| UTB-026 | MyUser avatar position | ✅ Fixed |
| UTB-027 | Presence indicators | ✅ Added |
| UTB-028 | Inline board rename | ✅ Implemented |
| UTB-029 | Card unlink not working | ✅ Fixed |
| UTB-030 | Aggregated count not syncing | ✅ Fixed |
| UTB-031 | Touch target size | ✅ Fixed |
| UTB-032 | A11y selector strict mode | ✅ Fixed |

### UX Enhancement (1/1)

| Feature | Description | Status |
|---------|-------------|--------|
| Context Menu | Right-click/long-press on avatars | ✅ Implemented |

### Infrastructure (Complete)

| Component | Status |
|-----------|--------|
| X-Admin-Secret middleware | ✅ Implemented |
| E2E admin helpers | ✅ Created |
| A11y drag handle attributes | ✅ Added |
| Keyboard DnD integration tests | ✅ Added |
