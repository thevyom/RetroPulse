# Phase 8.7 QA Test Plan - Avatar System v2

**Created**: 2026-01-05
**Status**: Ready for Testing (after implementation)
**Author**: Principal Engineer (QA Perspective)
**Prerequisites**: Phase 8.6 Complete

---

## 1. Test Scope

### 1.1 In Scope

| Category | Description | Test Level |
|----------|-------------|------------|
| Avatar Indicators | Color, ring, selection states | Unit + E2E |
| MeSection | Current user avatar display | Unit + E2E |
| ParticipantBar Layout | Three-section layout | Integration + E2E |
| AvatarContextMenu | Right-click functionality | Unit + E2E |
| Long-Press Touch | Mobile context menu | E2E |
| AliasPromptModal | New user onboarding | Unit + E2E |
| Removed Features | MyUserCard, AdminDropdown gone | E2E |

### 1.2 Bug Fixes Verified

| Bug ID | Title | Test Coverage |
|--------|-------|---------------|
| UTB-033 | Remove Alias Label from MeSection | ME-001 to ME-003 |
| UTB-034 | Black Ring on Avatar | AVT-001 to AVT-005 |
| UTB-035 | Avatar Grey Color Looks Inactive | AVT-001 to AVT-005 |
| UTB-038 | Right-Click Admin Promotion | CTX-001 to CTX-010 |

---

## 2. Avatar Indicator Test Cases

### 2.1 Status Indicators (AVT)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| AVT-001 | Online non-admin shows blue fill | Unit + E2E | `bg-blue-500` applied |
| AVT-002 | Online admin shows gold fill | Unit + E2E | `bg-amber-400` applied |
| AVT-003 | Offline non-admin shows grey fill | E2E | `bg-gray-300` applied |
| AVT-004 | Offline admin shows muted gold | E2E | `bg-amber-200` applied |
| AVT-005 | Online user shows green ring | E2E | `ring-2 ring-green-500` visible |
| AVT-006 | Offline user shows no ring | E2E | No ring border |
| AVT-007 | Selected avatar shows thick ring + scale | E2E | `ring-[3px] scale-110` |
| AVT-008 | No black ring/border on any avatar | E2E | No black borders |
| AVT-009 | Initials computed correctly | Unit | "John Smith" → "JS" |
| AVT-010 | Single name shows single initial | Unit | "Alice" → "A" |

**Visual Reference:**
```
Online Non-Admin    Online Admin       Offline User
╭─────╮            ╭─────╮            ╭─────╮
│ JS  │ green      │ JS  │ green     │ JS  │ no
│blue │ ring       │gold │ ring      │gray │ ring
╰─────╯            ╰─────╯           ╰─────╯
```

---

## 3. MeSection Test Cases

### 3.1 MeSection Component (ME)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| ME-001 | MeSection shows avatar only | E2E | No text label visible |
| ME-002 | No pencil/edit icon visible | E2E | Icon not present |
| ME-003 | Edit alias via context menu | E2E | Right-click shows "Edit my alias" |
| ME-004 | MeSection positioned on right | E2E | After divider, rightmost position |
| ME-005 | Avatar shows current user initials | E2E | Matches alias initials |
| ME-006 | Gold fill if current user is admin | E2E | Correct color applied |
| ME-007 | Green ring always present | E2E | User always online to themselves |
| ME-008 | Click avatar filters to own cards | E2E | Filter applied correctly |
| ME-009 | Tooltip shows full alias | E2E | Hover reveals name |

---

## 4. ParticipantBar Layout Test Cases

### 4.1 Layout Structure (PART)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| PART-001 | Three-section layout visible | E2E | Left, middle, right sections |
| PART-002 | Filter controls fixed on left | E2E | All, Anonymous buttons left |
| PART-003 | Other participants in middle | E2E | Scrollable section |
| PART-004 | MeSection fixed on right | E2E | After divider |
| PART-005 | Dividers visible between sections | E2E | Vertical lines present |
| PART-006 | Current user NOT in middle list | E2E | Only in MeSection |
| PART-007 | Middle section scrolls on overflow | E2E | Horizontal scroll appears |
| PART-008 | No scroll when few participants | E2E | No scrollbar visible |
| PART-009 | Clicking avatar filters cards | E2E | Filter applied |
| PART-010 | Selected avatar highlighted | E2E | Visual distinction |

---

## 5. Context Menu Test Cases

### 5.1 AvatarContextMenu (CTX)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| CTX-001 | Right-click opens context menu | E2E | Menu visible |
| CTX-002 | Menu shows user name header | E2E | Name at top |
| CTX-003 | Admin star shown for admins | E2E | ★ indicator |
| CTX-004 | "(You)" shown for current user | E2E | Label present |
| CTX-005 | "Filter by cards" always visible | E2E | Option present |
| CTX-006 | "Edit my alias" on own avatar only | E2E | Option conditional |
| CTX-007 | "Make Admin" for admin viewing non-admin | E2E | Option visible |
| CTX-008 | "Make Admin" hidden for non-admins | E2E | Option not present |
| CTX-009 | "Make Admin" hidden when viewing admin | E2E | Option not present |
| CTX-010 | Make Admin promotes user | E2E | Avatar turns gold |
| CTX-011 | Toast notification after promotion | E2E | Success message |
| CTX-012 | Click outside closes menu | E2E | Menu hidden |
| CTX-013 | Escape closes menu | E2E | Menu hidden |

### 5.2 Long-Press Touch (TOUCH)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| TOUCH-001 | 500ms long-press opens menu | E2E | Menu visible |
| TOUCH-002 | Normal tap filters (no menu) | E2E | Filter applied, no menu |
| TOUCH-003 | Move finger cancels long-press | E2E | No menu on drag |
| TOUCH-004 | Menu positioned at touch point | E2E | Correct position |
| TOUCH-005 | Haptic feedback on menu open | Manual | Vibration (if supported) |

---

## 6. Alias Prompt Modal Test Cases

### 6.1 AliasPromptModal (ALIAS)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| ALIAS-001 | Modal appears for new users | E2E | Blocks board view |
| ALIAS-002 | Modal NOT shown for returning users | E2E | Direct board access |
| ALIAS-003 | No close button (X) visible | E2E | Cannot dismiss |
| ALIAS-004 | Click outside doesn't close | E2E | Modal stays open |
| ALIAS-005 | Escape doesn't close | E2E | Modal stays open |
| ALIAS-006 | Empty input disables button | E2E | Button disabled |
| ALIAS-007 | Valid input enables button | E2E | Button enabled |
| ALIAS-008 | Enter key submits form | E2E | Form submitted |
| ALIAS-009 | Max 50 characters enforced | Unit | Validation error |
| ALIAS-010 | Only alphanumeric + spaces | Unit | Special chars rejected |
| ALIAS-011 | Submit creates session | E2E | Cookie set |
| ALIAS-012 | Board loads after submit | E2E | Content visible |

---

## 7. Removed Features Test Cases

### 7.1 Removed Components (REM)

| Test ID | Test Name | Type | Expected Result |
|---------|-----------|------|-----------------|
| REM-001 | MyUserCard removed from header | E2E | No user card top-right |
| REM-002 | AdminDropdown button removed | E2E | No dropdown button |
| REM-003 | Presence dot removed | E2E | No dot indicator |
| REM-004 | Crown icon removed | E2E | No crown on avatars |
| REM-005 | No alias text in MeSection | E2E | Avatar only |
| REM-006 | No pencil icon in MeSection | E2E | Icon not present |

---

## 8. Test Environment

### 8.1 Required Setup

| Component | Requirement |
|-----------|-------------|
| Backend | Running on localhost:3001 |
| Frontend | Dev server on localhost:5173 |
| MongoDB | Docker container with test data |
| Browser | Chromium via Playwright |
| Touch Testing | Chrome DevTools device emulation |

### 8.2 Multi-User Testing

For participant and admin promotion tests:
1. Browser A: Admin user context
2. Browser B: Non-admin user context
3. Both connected to same board via WebSocket

### 8.3 Touch Device Simulation

For long-press tests:
```javascript
// Playwright touch simulation
await page.touchscreen.tap(x, y);
// Or use Chrome DevTools device mode
```

---

## 9. Test Execution

### 9.1 Commands

```bash
# Unit tests for avatar components
cd frontend && npm run test:run -- tests/unit/features/participant/

# E2E tests
cd frontend && npm run test:e2e -- 12-participant-bar.spec.ts

# Full suite
cd frontend && npm run test:run
cd frontend && npm run test:e2e
```

### 9.2 Test Files

| Component | Unit Test File | E2E Test File |
|-----------|----------------|---------------|
| ParticipantAvatar | `tests/unit/features/participant/components/ParticipantAvatar.test.tsx` | - |
| MeSection | `tests/unit/features/participant/components/MeSection.test.tsx` | - |
| AvatarContextMenu | `tests/unit/features/participant/components/AvatarContextMenu.test.tsx` | - |
| AliasPromptModal | `tests/unit/features/participant/components/AliasPromptModal.test.tsx` | - |
| ParticipantBar | - | `tests/e2e/12-participant-bar.spec.ts` |
| Full Integration | - | `tests/e2e/12-participant-bar.spec.ts` |

---

## 10. Acceptance Criteria

### 10.1 Pass Thresholds

| Metric | Threshold |
|--------|-----------|
| Unit Test Pass Rate | 100% |
| E2E Test Pass Rate | ≥90% |
| Bug Fix Tests | 100% pass |
| New Feature Tests | 100% pass |

### 10.2 Sign-off Requirements

- [ ] All AVT tests pass (avatar indicators correct)
- [ ] All ME tests pass (MeSection working)
- [ ] All PART tests pass (layout correct)
- [ ] All CTX tests pass (context menu working)
- [ ] All TOUCH tests pass (mobile support)
- [ ] All ALIAS tests pass (modal working)
- [ ] All REM tests pass (removed features gone)
- [ ] UTB-033 resolved (no alias label)
- [ ] UTB-034 resolved (no black ring)
- [ ] UTB-035 resolved (vibrant colors)
- [ ] UTB-038 resolved (admin promotion works)
- [ ] Regression tests show no new failures
- [ ] Visual QA review complete
- [ ] QA engineer sign-off

---

## 11. Regression Tests

### 11.1 Must-Pass from Previous Phases

| Suite | Tests | Critical |
|-------|-------|----------|
| 01-board-creation | 13 | Yes |
| 02-board-lifecycle | 9 | Yes |
| 06-parent-child-cards | 12 | Yes |
| 11-bug-regression | All | Yes |
| Phase 8.6 bug fixes | All | Yes |

### 11.2 Areas at Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Card filtering | Layout changes may affect | Verify filter buttons work |
| Participant store | Context menu changes | Test state updates |
| WebSocket events | New handlers added | Test multi-user sync |
| Header layout | MyUserCard removed | Verify no gaps |

---

## 12. Test Data Requirements

### 12.1 User Aliases for Testing

| Alias | Expected Initials | Admin | Online |
|-------|-------------------|-------|--------|
| John Smith | JS | Yes | Yes |
| Alice Wonderland | AW | No | Yes |
| Bob Builder | BB | No | No |
| X | X | No | Yes |
| Mary Jane Watson | MW | No | Yes |

### 12.2 Pre-seeded Scenarios

| Scenario | Board State | Users |
|----------|-------------|-------|
| Single User | New board | 1 admin |
| Multi-User | Active board | 3 users (1 admin) |
| Offline Users | Active board | 5 users (2 offline) |
| New User Join | Active board | Modal trigger |

---

## 13. Test Artifacts

| Artifact | Location |
|----------|----------|
| E2E Screenshots | frontend/test-results/*/screenshot.png |
| E2E Videos | frontend/test-results/*/video.webm |
| Coverage Report | frontend/coverage/ |
| Test Report | frontend/playwright-report/ |
| Bug Fix Reports | docs/Validation/Phase8-7/BugFixReport_*.md |

---

## 14. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Touch events hard to simulate | Long-press tests may need manual QA | Use Chrome DevTools |
| Multi-browser context timing | Participant tests may be flaky | Add explicit waits |
| Haptic feedback | Cannot test programmatically | Manual verification |

---

*QA Test Plan by Principal Engineer - 2026-01-05*
*Ready for testing after Phase 8.7 implementation*
