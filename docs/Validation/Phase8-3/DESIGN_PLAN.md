# Design Plan - Bug Fixes Session 01011530

**Created**: 2026-01-01
**Status**: Planning

---

## 1. Root Cause Analysis

### Critical Issue: UTB-014 (User Registration)

The participant bar shows "No participants yet" because the current user is not being added to the `activeUsers` array after alias login.

**Investigation Required:**
- `frontend/src/features/participant/` - how users are added to participant list
- `frontend/src/models/stores/` - user state management
- Backend API response for user registration

**Suspected Flow:**
```
User enters alias → API call → Response received → ??? → activeUsers NOT updated
```

This blocks:
- UTB-015: Cards can't show alias (no user reference)
- UTB-020: Can't determine ownership (no user hash match)

---

## 2. Component Architecture

### ParticipantBar Component Tree
```
ParticipantBar.tsx
├── ParticipantAvatar.tsx  ← UTB-021, UTB-022, UTB-023
├── AdminDropdown.tsx
└── Filter logic           ← UTB-017
```

### RetroCard Component Areas
```
RetroCard.tsx
├── Header (drag handle)    ← UTB-019
├── Author display          ← UTB-015, UTB-018
├── Content (editable)      ← UTB-020
└── Reactions (aggregated)  ← UTB-016
```

---

## 3. Bug Groupings & Dependencies

### Group A: User Identity Chain (SEQUENTIAL)
```
UTB-014 ─── Root cause: User not in activeUsers
    │
    ├── UTB-015 ─── Cards show "Anonymous" (depends on user lookup)
    │
    └── UTB-020 ─── Cannot edit (depends on ownership check)
```

### Group B: Filter Behavior (INDEPENDENT)
```
UTB-017 ─── Single-selection filter only
           Files: ParticipantBar.tsx, filter state logic
```

### Group C: Reaction Aggregation (INDEPENDENT)
```
UTB-016 ─── Show aggregated vs own reaction counts
           Files: RetroCard.tsx, reaction display logic
```

### Group D: Card UI/UX (INDEPENDENT, COMBINABLE)
```
UTB-018 ─── Ghost icon for anonymous
UTB-019 ─── Full-header drag handle
           Files: RetroCard.tsx only
```

### Group E: Avatar Enhancements (INDEPENDENT, COMBINABLE)
```
UTB-021 ─── First/last name initials
UTB-022 ─── Tooltip on hover
           Files: ParticipantAvatar.tsx
```

### Group F: Layout Overflow (INDEPENDENT)
```
UTB-023 ─── Participant overflow handling
           Files: ParticipantBar.tsx, CSS
```

---

## 4. Parallelization Strategy

### Phase 1: Critical Path (Sequential)
One agent handles the user identity chain because each bug depends on the previous fix.

| Order | Bug | Description | Estimated Scope |
|-------|-----|-------------|-----------------|
| 1.1 | UTB-014 | Register user in activeUsers | Store/ViewModel investigation |
| 1.2 | UTB-015 | Display user alias on cards | RetroCard author lookup |
| 1.3 | UTB-020 | Enable card editing | Ownership check + edit mode |

### Phase 2: Independent Fixes (Parallel - 5 Agents)

| Agent | Bugs | Files | Scope |
|-------|------|-------|-------|
| Agent 2 | UTB-016 | RetroCard.tsx | Add agg/own toggle display |
| Agent 3 | UTB-017 | ParticipantBar.tsx, ViewModel | Single-select enforcement |
| Agent 4 | UTB-018, UTB-019 | RetroCard.tsx | Ghost icon + drag handle |
| Agent 5 | UTB-021, UTB-022 | ParticipantAvatar.tsx | Initials + tooltip |
| Agent 6 | UTB-023 | ParticipantBar.tsx | Overflow scroll/+N |

---

## 5. Technical Approach Per Bug

### UTB-014: User Registration
**Hypothesis**: The user is authenticated but not added to the board's active users list.

**Investigation:**
1. Check `boardStore` or `userStore` for participant management
2. Trace alias submission → API response → state update
3. Verify WebSocket/polling updates active users

**Fix Approach:**
- Ensure user is added to `activeUsers` on successful alias entry
- May need to call `addActiveUser` or similar after login

### UTB-015: Card Author Display
**Current Code (line 293-301):**
```tsx
{!card.is_anonymous && card.created_by_alias && (
  <span>{card.created_by_alias}</span>
)}
{card.is_anonymous && (
  <span className="italic">Anonymous</span>
)}
```

**Fix Approach:**
- Depends on UTB-014 fix to provide `created_by_alias`
- May need to look up alias from `activeUsers` by `created_by_hash`

### UTB-016: Aggregated Reaction Toggle
**Current Code (line 318-324):**
```tsx
<span className="text-xs font-medium">{reactionCount}</span>
{hasChildren && (
  <span className="text-[10px] text-muted-foreground">(Agg)</span>
)}
```

**Fix Approach:**
- Add `direct_reaction_count` display alongside aggregated
- Format: `5 (2 own)` or toggle button

### UTB-017: Single-Select Filter
**Fix Approach:**
- Modify `onToggleUser` to clear `selectedUsers` before adding new
- Ensure `showAll`, `showOnlyAnonymous`, and single user are mutually exclusive

### UTB-018: Ghost Icon
**Current Code (line 299-301):**
```tsx
{card.is_anonymous && (
  <span className="italic">Anonymous</span>
)}
```

**Fix Approach:**
```tsx
import { Ghost } from 'lucide-react';
// ...
{card.is_anonymous && (
  <Tooltip>
    <TooltipTrigger><Ghost className="h-4 w-4" /></TooltipTrigger>
    <TooltipContent>Anonymous</TooltipContent>
  </Tooltip>
)}
```

### UTB-019: Full Header Drag Handle
**Current Code (line 280-290):**
Drag handle is a small `GripVertical` icon.

**Fix Approach:**
- Extend drag listeners to entire header row
- Use CSS `cursor: grab` on header
- Exclude action buttons from drag zone

### UTB-020: Card Editing
**Fix Approach:**
- Add `onClick` handler to card content
- Track `isEditing` state
- Show `textarea` in edit mode
- Call API on blur/enter

### UTB-021: Avatar Initials
**Fix Approach:**
```ts
function getInitials(alias: string): string {
  const words = alias.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
```

### UTB-022: Avatar Tooltip
**Fix Approach:**
- Wrap avatar in `<Tooltip>` from shadcn/ui
- Set `delayDuration={300}`
- Display full alias

### UTB-023: Overflow Handling
**Fix Approach:**
- Add `overflow-x-auto` and `max-w-[calc(100%-200px)]` to avatar container
- OR implement "+N more" with dropdown

---

## 6. Risk Assessment

| Bug | Risk | Mitigation |
|-----|------|------------|
| UTB-014 | High - affects multiple features | Thorough testing of auth flow |
| UTB-019 | Medium - may conflict with DnD | Test all drag scenarios |
| UTB-020 | Medium - concurrent edit handling | Test WebSocket lock behavior |
| UTB-023 | Low - CSS only | Test various participant counts |

---

## 7. Files Modified Summary

| File | Bugs |
|------|------|
| `ParticipantBar.tsx` | UTB-017, UTB-023 |
| `ParticipantAvatar.tsx` | UTB-021, UTB-022 |
| `RetroCard.tsx` | UTB-015, UTB-016, UTB-018, UTB-019, UTB-020 |
| Store/ViewModel (TBD) | UTB-014 |

---

---

## 8. E2E Infrastructure Bugs

Reference: `docs/Validation/01011100/E2E_INFRASTRUCTURE_BUGS.md`

### E2E-001: Playwright fill() Does Not Trigger React State Updates

**Severity**: High
**Component**: Playwright + React controlled inputs

**Root Cause**: React's synthetic event system requires `input` and `change` events. Playwright's `fill()` sets DOM value directly, bypassing React's event handlers.

**Workaround Applied**: Use `pressSequentially()` instead of `fill()`:
```typescript
// BAD - does not trigger React state update
await input.fill('Test Board');

// GOOD - fires key events that React handles
await input.pressSequentially('Test Board');
```

**Status**: Workaround applied. No further action required.

---

### E2E-002: Playwright Cannot Trigger @dnd-kit Drag Operations

**Severity**: Critical
**Component**: Playwright + @dnd-kit library

**Root Cause**:
1. @dnd-kit PointerSensor needs native `pointer*` events (not `mouse*`)
2. KeyboardSensor needs focus on the element with `listeners` attached
3. Drag handle (`<div {...listeners}>`) is separate from card container

**Attempts Failed**:
- Playwright `dragTo()` - @dnd-kit doesn't recognize native drag events
- Manual pointer events - Playwright fires `mouse*` not `pointer*`
- KeyboardSensor - Focus goes to card, not drag handle

**Impact**: 16+ E2E tests failing across drag-drop operations

**Recommended Approach**:
1. Create custom TestSensor for @dnd-kit (loaded only in test env)
2. OR expose programmatic drag API: `window.__testDrag(sourceId, targetId)`
3. OR move drag-drop testing to integration layer with React Testing Library

**Status**: Not resolved. Manual testing required for drag-drop flows.

---

### E2E-003: Admin Status Detection Timing

**Severity**: Medium
**Component**: Playwright + WebSocket session

**Root Cause**: After board creation, admin status takes 1-2 seconds to establish via WebSocket.

**Workaround Applied**: `waitForAdminStatus()` helper with fallbacks:
```typescript
export async function waitForAdminStatus(page: Page): Promise<void> {
  await page.waitForSelector('text="No participants yet"', { state: 'hidden' });
  await page.waitForSelector(
    '[aria-label="Admin"], [aria-label="Edit board name"], button:has-text("Close Board")',
    { timeout: 5000 }
  );
}
```

**Status**: Partially resolved. Some tests still skipped due to flakiness.

---

## 9. Updated Bug Groupings

### Group G: E2E Infrastructure (INDEPENDENT)
```
E2E-001 ─── React input fill workaround (RESOLVED)
E2E-002 ─── @dnd-kit drag-drop incompatibility (REQUIRES ARCHITECTURE)
E2E-003 ─── Admin timing flakiness (WORKAROUND APPLIED)
```

---

*Document created by Principal Engineer - 2026-01-01*
