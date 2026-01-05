# Phase 8.6 QA Test Plan

**Created**: 2026-01-03
**Status**: Draft - Pending Implementation
**Author**: Principal Engineer (QA Perspective)

---

## 1. Test Scope

### 1.1 In Scope

| Category | Description | Test Level |
|----------|-------------|------------|
| UTB-029 | Card linking creates duplicates | Unit + E2E |
| UTB-030 | New participant alias not shown | Unit + E2E |
| UTB-031 | Close Board tooltip | Unit + E2E |
| UTB-032 | Card header alignment | Visual + E2E |
| Avatar System v2 | Complete participant bar redesign | Unit + Integration + E2E |

### 1.2 Out of Scope

- Performance testing (deferred)
- Multi-browser compatibility (Chromium only)
- Load testing with many participants

---

## 2. Bug Fix Test Cases

### 2.1 UTB-029: Card Linking Creates Duplicates

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB029-001 | Linking two cards doesn't create duplicates | E2E | Card count unchanged (2 cards) |
| UTB029-002 | Link operation updates parent-child relationship | E2E | Child shows under parent |
| UTB029-003 | Unlink operation separates cards | E2E | Cards become independent |
| UTB029-004 | Store state remains consistent after link | Unit | cardsMap has correct count |
| UTB029-005 | Socket event doesn't create duplicate entries | Unit | No duplicate card IDs in store |
| UTB029-006 | Multiple link/unlink cycles work correctly | E2E | Cards can be re-linked after unlink |
| UTB029-007 | Aggregated count updates correctly on link | E2E | Parent shows sum of reactions |
| UTB029-008 | Aggregated count updates correctly on unlink | E2E | Parent shows only own reactions |

**Test Procedure for UTB029-001**:
```
1. Create a board with two feedback cards (Card A, Card B)
2. Count cards displayed: should be 2
3. Link Card B as child of Card A
4. Wait for UI update
5. Count cards displayed: should still be 2 (1 parent + 1 child)
6. Verify Card B appears nested under Card A
```

---

### 2.2 UTB-030: New Participant Alias Not Shown

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB030-001 | New user appears in participant bar | E2E | Avatar visible within 2s |
| UTB030-002 | New user alias displayed correctly | E2E | Initials match alias |
| UTB030-003 | New user admin status shown correctly | E2E | Gold fill if admin |
| UTB030-004 | Socket handler uses correct field names | Unit | boardId, userAlias, isAdmin |
| UTB030-005 | User:joined event triggers addActiveUser | Unit | Store updated |
| UTB030-006 | Multiple users joining show all avatars | E2E | All users visible |

**Test Procedure for UTB030-001**:
```
1. Open board in Browser A
2. Note current participant count
3. Open same board URL in Browser B (incognito)
4. Enter alias and join
5. In Browser A, verify new participant avatar appears
6. Verify avatar shows correct initials
```

---

### 2.3 UTB-031: Close Board Tooltip

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB031-001 | Tooltip appears on hover | E2E | Tooltip visible after 300ms |
| UTB031-002 | Tooltip text is descriptive | E2E | Contains "read-only" and "cannot be undone" |
| UTB031-003 | Confirmation dialog shows detailed info | E2E | Bullet points visible |
| UTB031-004 | Tooltip disappears on mouse leave | E2E | Tooltip hidden |

**Expected Tooltip Text**:
> "Makes the board read-only. No new cards, edits, or reactions allowed. This action cannot be undone."

---

### 2.4 UTB-032: Card Header Alignment

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| UTB032-001 | Left icons vertically centered | Visual | Drag handle + ghost icon aligned |
| UTB032-002 | Right icons vertically centered | Visual | Reaction + delete aligned |
| UTB032-003 | Left and right match vertically | Visual | Same baseline |
| UTB032-004 | Alignment consistent across card states | Visual | With/without children same |

**Visual Verification**:
```
CORRECT:
┌──────────────────────────────────────────┐
│ ⋮⋮  👻                      👍 1    🗑  │  <- All icons on same line
│ Card content                              │
└──────────────────────────────────────────┘

INCORRECT:
┌──────────────────────────────────────────┐
│ ⋮⋮  👻                                   │  <- Icons at different heights
│                             👍 1    🗑   │
│ Card content                              │
└──────────────────────────────────────────┘
```

---

## 3. Feature Test Cases: Avatar System v2

### 3.1 Status Indicators

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| AVT-001 | Admin avatar shows gold fill | Unit + E2E | Gold background color |
| AVT-002 | Non-admin avatar shows accent fill | Unit + E2E | Blue/accent background |
| AVT-003 | Online user shows green ring | E2E | 2px green ring visible |
| AVT-004 | Offline user shows no ring | E2E | No ring visible |
| AVT-005 | Selected avatar shows thick ring + scale | E2E | 3px ring + scale(1.1) |

### 3.2 MeSection Component

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| ME-001 | MeSection positioned on right | E2E | After divider, right side |
| ME-002 | Avatar shows current user initials | E2E | Matches alias initials |
| ME-003 | Gold fill if current user is admin | E2E | Correct color |
| ME-004 | Green ring always present (self=online) | E2E | Ring visible |
| ME-005 | Alias displayed next to avatar | E2E | Full alias text |
| ME-006 | Edit button triggers alias dialog | E2E | Dialog opens |
| ME-007 | Clicking avatar filters to own cards | E2E | Only user's cards shown |

### 3.3 Alias Prompt Modal

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| ALIAS-001 | Modal appears for new users (no cookie) | E2E | Modal blocks board view |
| ALIAS-002 | Modal not shown for returning users | E2E | Direct board access |
| ALIAS-003 | Empty alias prevents submission | E2E | Button disabled |
| ALIAS-004 | Valid alias enables submission | E2E | Button enabled |
| ALIAS-005 | Submit creates session and joins board | E2E | Board loads, cookie set |
| ALIAS-006 | Modal cannot be dismissed without alias | E2E | No close button, no esc |
| ALIAS-007 | Alias 1-50 chars only | Unit | Validation works |

### 3.4 Admin Management (Context Menu)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| CTX-001 | Right-click opens context menu | E2E | Menu visible |
| CTX-002 | Click outside closes menu | E2E | Menu hidden |
| CTX-003 | Escape closes menu | E2E | Menu hidden |
| CTX-004 | "Filter by user" option always present | E2E | Option visible |
| CTX-005 | "Make Admin" visible for admins viewing non-admin | E2E | Option visible |
| CTX-006 | "Make Admin" hidden for non-admins | E2E | Option not present |
| CTX-007 | "Make Admin" hidden when viewing admin | E2E | Option not present |
| CTX-008 | Make Admin promotes user successfully | E2E | Avatar turns gold |
| CTX-009 | Long-press opens menu on touch (500ms) | E2E | Menu visible on tablet |
| CTX-010 | Normal tap filters, doesn't open menu | E2E | Filter applied, no menu |

### 3.5 Other Participants Section

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| PART-001 | Current user NOT in other participants list | E2E | Only in MeSection |
| PART-002 | Other participants scrollable when overflow | E2E | Horizontal scroll appears |
| PART-003 | No scroll when few participants | E2E | No scrollbar visible |
| PART-004 | Clicking participant avatar filters cards | E2E | Filter applied |
| PART-005 | Divider visible between sections | E2E | Vertical line present |

### 3.6 Removed Features

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| REM-001 | MyUserCard removed from header | E2E | No user card top-right |
| REM-002 | AdminDropdown button removed | E2E | No dropdown button |
| REM-003 | Presence dot removed (ring instead) | E2E | No dot indicator |
| REM-004 | Crown icon removed | E2E | No crown on avatars |

---

## 4. Test Environment

### 4.1 Required Setup

| Component | Requirement |
|-----------|-------------|
| Backend | Running on localhost:3001 |
| Frontend | Dev server on localhost:5173 |
| MongoDB | Docker container with test data |
| Browser | Chromium via Playwright |

### 4.2 Multi-User Testing Setup

For UTB-030 and participant tests:
1. Browser A: Main test context
2. Browser B: Incognito/new context for second user
3. Both connected to same board via WebSocket

---

## 5. Test Execution Plan

### 5.1 Phase 1: Bug Fixes (Parallel)

```bash
# UTB-029 tests
npm run test:run -- tests/unit/features/card/cardLinking.test.ts
npm run test:e2e -- 06-parent-child-cards.spec.ts

# UTB-030 tests
npm run test:run -- tests/unit/features/participant/participantSocket.test.ts
npm run test:e2e -- --grep "participant joins"

# UTB-031 tests
npm run test:e2e -- --grep "close board tooltip"

# UTB-032 tests (visual)
npm run test:e2e -- --grep "card header alignment"
```

### 5.2 Phase 2: Avatar System v2

```bash
# Unit tests
npm run test:run -- tests/unit/features/participant/

# Integration tests
npm run test:run -- tests/integration/participantBar.test.ts

# E2E tests
npm run test:e2e -- 12-participant-bar.spec.ts
```

### 5.3 Phase 3: Full Regression

```bash
# Full E2E suite
npm run test:e2e

# Full unit suite
npm run test:run
```

---

## 6. Acceptance Criteria

### 6.1 Pass Thresholds

| Metric | Threshold |
|--------|-----------|
| E2E Pass Rate | ≥90% |
| Unit Test Pass Rate | 100% |
| Bug Fix Tests | 100% pass |
| New Feature Tests | 100% pass |

### 6.2 Sign-off Requirements

- [ ] All UTB-029 tests pass (card linking fixed)
- [ ] All UTB-030 tests pass (participant alias fixed)
- [ ] All UTB-031 tests pass (tooltip added)
- [ ] All UTB-032 tests pass (alignment fixed)
- [ ] All Avatar System v2 tests pass
- [ ] Regression tests show no new failures
- [ ] Visual QA review complete
- [ ] QA engineer sign-off

---

## 7. Test Data Requirements

### 7.1 Pre-seeded Scenarios

| Scenario | Board State | Users |
|----------|-------------|-------|
| Card Linking | 2 feedback cards | 1 user |
| Participant Join | Empty board | Dynamic |
| Admin Actions | 1 admin, 2 regular | 3 users |
| Avatar Display | Various aliases | 5 users |

### 7.2 User Aliases for Testing

| Alias | Expected Initials | Admin |
|-------|-------------------|-------|
| John Smith | JS | Yes |
| Alice Wonderland | AW | No |
| Bob | B | No |
| X | X | No |
| Mary Jane Watson | MW | No |

---

## 8. Regression Tests

### 8.1 Must-Pass from Previous Phases

| Suite | Tests | Critical |
|-------|-------|----------|
| 01-board-creation | 13 | Yes |
| 02-board-lifecycle | 9 | Yes |
| 06-parent-child-cards | 12 | Yes |
| 11-bug-regression | All | Yes |

### 8.2 Areas at Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Card filtering | Avatar changes may break | Keep filter buttons functional |
| WebSocket events | Socket handler changes | Update all affected handlers |
| Participant store | State structure changes | Backward-compatible updates |

---

## 9. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Multi-browser testing complex | Participant tests may be flaky | Use Playwright contexts |
| WebSocket timing | Events may race | Add explicit waits |
| Touch events in E2E | Long-press hard to simulate | Use dispatchEvent |

---

## 10. Test Artifacts

| Artifact | Location |
|----------|----------|
| E2E Screenshots | frontend/test-results/*/screenshot.png |
| E2E Videos | frontend/test-results/*/video.webm |
| Coverage Report | frontend/coverage/ |
| Test Report | frontend/playwright-report/ |
| Bug Fix Reports | docs/Validation/Phase8-6/BugFixReport_*.md |

---

*QA Test Plan by Principal Engineer - 2026-01-03*
*Pending implementation and QA verification*
