# Phase 8.7 Task List - Avatar System v2

**Created**: 2026-01-05
**Status**: Ready for Implementation
**Author**: Principal Engineer
**Prerequisites**: Phase 8.6 Bug Fixes Complete

---

## Overview

This phase implements a complete redesign of the participant avatar system, incorporating feedback from QA testing (UTB-033 through UTB-038).

---

## Task Summary

| Phase | Tasks | Description | Estimate |
|-------|-------|-------------|----------|
| **1: Core Components** | 1.1 - 1.5 | Avatar indicators, MeSection, layout | ~2.5 hrs |
| **2: Features** | 2.1 - 2.4 | Context menu, alias prompt, cleanup | ~2 hrs |
| **3: Testing** | 3.1 - 3.3 | Unit, E2E, regression | ~1.5 hrs |

**Total Estimate**: ~6 hours

---

## Incorporated Bug Fixes

| Bug ID | Title | Incorporated Into |
|--------|-------|-------------------|
| UTB-033 | Remove Alias Label from MeSection | Task 1.2 |
| UTB-034 | Black Ring on Avatar | Task 1.1 |
| UTB-035 | Avatar Grey Color Looks Inactive | Task 1.1 |
| UTB-038 | Right-Click Admin Promotion Not Working | Task 2.1 |

---

## Phase 1: Core Components

### Task 1.1: Simplify Avatar Status Indicators

**Priority:** P1
**Estimate:** 45 min
**Dependencies:** None
**Incorporates:** UTB-034, UTB-035

**File:** `frontend/src/features/participant/components/ParticipantAvatar.tsx`

**Design Spec:**

| User Type | Background | Ring | Text |
|-----------|------------|------|------|
| Online Non-Admin | `bg-blue-500` | `ring-2 ring-green-500` | `text-white` |
| Online Admin | `bg-amber-400` | `ring-2 ring-green-500` | `text-gray-800` |
| Offline Non-Admin | `bg-gray-300` | None | `text-gray-600` |
| Offline Admin | `bg-amber-200` | None | `text-gray-700` |
| Selected | Any above | `ring-[3px] ring-primary scale-110` | - |

**Implementation:**
```tsx
<div className={cn(
  "h-9 w-9 rounded-full flex items-center justify-center",
  "text-sm font-semibold transition-all cursor-pointer",
  // Background based on admin + online status
  isAdmin
    ? (isOnline ? "bg-amber-400 text-gray-800" : "bg-amber-200 text-gray-700")
    : (isOnline ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"),
  // Ring for online status
  isOnline && "ring-2 ring-green-500",
  // Selection state (overrides online ring)
  isSelected && "ring-[3px] ring-primary scale-110"
)}>
  {initials}
</div>
```

**Remove:**
- Crown icon (admin indicated by gold fill)
- Presence dot indicator (online indicated by green ring)
- Any black border/outline

**Acceptance Criteria:**
- [ ] Online non-admin: Blue fill + green ring
- [ ] Online admin: Gold fill + green ring
- [ ] Offline: Grey/muted fill + no ring
- [ ] Selected: Thicker ring + scale
- [ ] No black ring/border anywhere
- [ ] Avatars feel "alive" when online

---

### Task 1.2: Create MeSection Component

**Priority:** P1
**Estimate:** 30 min
**Dependencies:** Task 1.1
**Incorporates:** UTB-033

**Create file:** `frontend/src/features/participant/components/MeSection.tsx`

**Design:** Avatar only - no label, no pencil icon (per UTB-033)

```tsx
import { cn } from "@/lib/utils";

interface MeSectionProps {
  alias: string;
  isAdmin: boolean;
  isSelected: boolean;
  onFilter: () => void;
}

export function MeSection({ alias, isAdmin, isSelected, onFilter }: MeSectionProps) {
  const initials = alias
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onFilter}
      className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center",
        "text-sm font-semibold transition-all",
        // Always online (it's the current user)
        isAdmin ? "bg-amber-400 text-gray-800" : "bg-blue-500 text-white",
        "ring-2 ring-green-500",
        // Selection state
        isSelected && "ring-[3px] ring-primary scale-110",
        "hover:scale-105"
      )}
      title={`${alias} (You) - Click to filter`}
    >
      {initials}
    </button>
  );
}
```

**Note:** Edit alias functionality moves to context menu (Task 2.1)

**Acceptance Criteria:**
- [ ] Avatar only - no text label
- [ ] No pencil/edit icon visible
- [ ] Gold fill if admin, blue if not
- [ ] Always has green ring (user is always online to themselves)
- [ ] Click filters to own cards
- [ ] Tooltip shows full alias

---

### Task 1.3: Update ParticipantBar Layout

**Priority:** P1
**Estimate:** 60 min
**Dependencies:** Task 1.2

**File:** `frontend/src/features/participant/components/ParticipantBar.tsx`

**Layout Structure:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [All] [Anon] │ [P1] [P2] [P3] [P4] ... (scrollable) │ [Me]              │
│   Fixed      │        Scrollable Middle             │  Fixed Right      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
<div className="flex items-center w-full">
  {/* Filter Controls - fixed left */}
  <div className="flex items-center gap-2 shrink-0">
    <AllUsersButton isSelected={!selectedFilter} onClick={clearFilter} />
    <AnonymousButton isSelected={selectedFilter === 'anonymous'} onClick={filterAnonymous} />
  </div>

  {/* Divider */}
  <div className="h-6 w-px bg-border mx-3 shrink-0" />

  {/* Other Participants - scrollable middle */}
  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
    {otherParticipants.map(p => (
      <ParticipantAvatar
        key={p.alias}
        user={p}
        isOnline={onlineAliases.has(p.alias)}
        isSelected={selectedFilter === p.alias}
        onClick={() => handleFilterByUser(p.alias)}
      />
    ))}
  </div>

  {/* Divider */}
  <div className="h-6 w-px bg-border mx-3 shrink-0" />

  {/* Me Section - fixed right */}
  <MeSection
    alias={currentUser.alias}
    isAdmin={currentUser.is_admin}
    isSelected={selectedFilter === currentUser.alias}
    onFilter={handleFilterByMe}
  />
</div>
```

**Filter Logic Update:**
```typescript
// Filter out current user from other participants
const otherParticipants = activeUsers.filter(
  (user) => user.alias !== currentUser?.alias
);
```

**Acceptance Criteria:**
- [ ] Current user in MeSection (right side only)
- [ ] Current user NOT in scrollable participant list
- [ ] Dividers visible between sections
- [ ] Horizontal scroll only when overflow
- [ ] All filter buttons functional
- [ ] Selected state visible on avatars

---

### Task 1.4: Remove MyUserCard from Header

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** Task 1.3

**File:** `frontend/src/features/board/components/RetroBoardHeader.tsx`

**Actions:**
1. Remove `<MyUserCard>` component from header
2. Remove unused import
3. Verify MeSection in ParticipantBar provides same functionality

```tsx
// REMOVE this entire section:
<MyUserCard
  user={currentUser}
  onEditAlias={() => setIsEditAliasOpen(true)}
/>
```

**Acceptance Criteria:**
- [ ] No user card in header top-right area
- [ ] MeSection in ParticipantBar replaces functionality
- [ ] No broken imports or references
- [ ] Edit alias via context menu works

---

### Task 1.5: Move UUID to Edit Dialog

**Priority:** P2
**Estimate:** 20 min
**Dependencies:** Task 1.4

**File:** Find `EditAliasDialog` component

**Add UUID display inside dialog:**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Your Alias</DialogTitle>
      <DialogDescription>
        Choose a display name that other participants will see.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <Input
        value={editAlias}
        onChange={(e) => setEditAlias(e.target.value)}
        placeholder="Enter alias"
      />

      {/* UUID - moved from header */}
      <div className="text-sm text-muted-foreground border-t pt-3">
        <span className="font-medium">Your ID:</span>{' '}
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{userHash?.slice(0, 12)}...</code>
        <p className="text-xs mt-1 text-muted-foreground/70">
          This identifies you across browser sessions
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Acceptance Criteria:**
- [ ] UUID shown only in Edit Alias dialog
- [ ] UUID NOT shown in header or MeSection
- [ ] Truncated display with explanation text
- [ ] Copy functionality optional (nice to have)

---

## Phase 2: Additional Features

### Task 2.1: Create AvatarContextMenu Component

**Priority:** P1
**Estimate:** 45 min
**Dependencies:** Task 1.3
**Incorporates:** UTB-038

**Create file:** `frontend/src/features/participant/components/AvatarContextMenu.tsx`

```tsx
import { useState, useRef } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface AvatarContextMenuProps {
  children: React.ReactNode;
  user: { alias: string; is_admin: boolean };
  isCurrentUser: boolean;
  isCurrentUserAdmin: boolean;
  onFilterByUser: (alias: string) => void;
  onMakeAdmin?: (alias: string) => void;
  onEditAlias?: () => void;
}

export function AvatarContextMenu({
  children,
  user,
  isCurrentUser,
  isCurrentUserAdmin,
  onFilterByUser,
  onMakeAdmin,
  onEditAlias,
}: AvatarContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {/* Header with user name */}
        <div className="px-2 py-1.5 text-sm font-medium">
          {user.alias}
          {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
          {user.is_admin && <span className="ml-1 text-amber-500">★</span>}
        </div>
        <ContextMenuSeparator />

        {/* Filter option - always visible */}
        <ContextMenuItem onClick={() => onFilterByUser(user.alias)}>
          <Eye className="mr-2 h-4 w-4" />
          Filter by {isCurrentUser ? 'my' : 'their'} cards
        </ContextMenuItem>

        {/* Edit alias - only for current user */}
        {isCurrentUser && onEditAlias && (
          <ContextMenuItem onClick={onEditAlias}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit my alias
          </ContextMenuItem>
        )}

        {/* Make Admin - only for admins viewing non-admin others */}
        {isCurrentUserAdmin && !user.is_admin && !isCurrentUser && onMakeAdmin && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onMakeAdmin(user.alias)}>
              <Crown className="mr-2 h-4 w-4 text-amber-500" />
              Make Admin
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

**Integration in ParticipantBar:**
```tsx
{otherParticipants.map(p => (
  <AvatarContextMenu
    key={p.alias}
    user={p}
    isCurrentUser={false}
    isCurrentUserAdmin={currentUser.is_admin}
    onFilterByUser={handleFilterByUser}
    onMakeAdmin={handlePromoteToAdmin}
  >
    <ParticipantAvatar ... />
  </AvatarContextMenu>
))}

{/* MeSection also wrapped */}
<AvatarContextMenu
  user={currentUser}
  isCurrentUser={true}
  isCurrentUserAdmin={currentUser.is_admin}
  onFilterByUser={handleFilterByMe}
  onEditAlias={() => setIsEditAliasOpen(true)}
>
  <MeSection ... />
</AvatarContextMenu>
```

**Acceptance Criteria:**
- [ ] Right-click opens context menu on all avatars
- [ ] Menu header shows user name + admin star if applicable
- [ ] "Filter by cards" always visible
- [ ] "Edit my alias" visible only on own avatar
- [ ] "Make Admin" visible only to admins viewing non-admin
- [ ] Admin promotion works and shows toast
- [ ] Avatar updates to gold after promotion

---

### Task 2.2: Add Long-Press Support for Touch

**Priority:** P2
**Estimate:** 30 min
**Dependencies:** Task 2.1

**Update `AvatarContextMenu.tsx` to support touch devices:**

```tsx
const [showMenu, setShowMenu] = useState(false);
const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
const timerRef = useRef<NodeJS.Timeout | null>(null);
const isLongPressRef = useRef(false);

const handleTouchStart = (e: React.TouchEvent) => {
  isLongPressRef.current = false;
  timerRef.current = setTimeout(() => {
    isLongPressRef.current = true;
    const touch = e.touches[0];
    setMenuPosition({ x: touch.clientX, y: touch.clientY });
    setShowMenu(true);
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(50);
  }, 500);
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (timerRef.current) clearTimeout(timerRef.current);
  if (isLongPressRef.current) {
    e.preventDefault(); // Prevent click after long-press
  }
};

const handleTouchMove = () => {
  if (timerRef.current) clearTimeout(timerRef.current);
};

// Cleanup
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, []);
```

**Acceptance Criteria:**
- [ ] 500ms long-press opens context menu on touch
- [ ] Normal tap still triggers filter action
- [ ] Moving finger cancels long-press
- [ ] Menu positioned at touch location
- [ ] Haptic feedback on menu open (if supported)
- [ ] Works on tablet viewport

---

### Task 2.3: Create AliasPromptModal Component

**Priority:** P1
**Estimate:** 45 min
**Dependencies:** Phase 1 complete

**Create file:** `frontend/src/features/participant/components/AliasPromptModal.tsx`

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AliasPromptModalProps {
  isOpen: boolean;
  onJoin: (alias: string) => void;
}

export function AliasPromptModal({ isOpen, onJoin }: AliasPromptModalProps) {
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 1) return 'Please enter a name';
    if (trimmed.length > 50) return 'Name must be 50 characters or less';
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) return 'Only letters, numbers, and spaces allowed';
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate(alias);
    if (validationError) {
      setError(validationError);
      return;
    }
    onJoin(alias.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle>Join the Retrospective</DialogTitle>
          <DialogDescription>
            What should we call you? This name will be visible to other participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Input
            value={alias}
            onChange={(e) => {
              setAlias(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
            maxLength={50}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={alias.trim().length === 0}
          className="w-full"
          size="lg"
        >
          Join Board
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration:** Show when user accesses board without existing session cookie.

**Acceptance Criteria:**
- [ ] Modal appears for new users (no session cookie)
- [ ] Modal NOT shown for returning users with valid cookie
- [ ] Cannot dismiss (no X button, no click outside, no Escape)
- [ ] Validates: 1-50 chars, alphanumeric + spaces only
- [ ] Submit button disabled when empty
- [ ] Enter key submits form
- [ ] After submit: creates session, joins board, sets cookie

---

### Task 2.4: Remove AdminDropdown Button

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** Task 2.1

**Find and remove AdminDropdown from header/participant bar:**

1. Search for `AdminDropdown` component usage
2. Remove the component from render
3. Remove unused import
4. Admin promotion now happens exclusively via context menu

**Files to check:**
- `frontend/src/features/board/components/RetroBoardHeader.tsx`
- `frontend/src/features/participant/components/ParticipantBar.tsx`

**Acceptance Criteria:**
- [ ] No "Manage Admins" or similar dropdown visible
- [ ] Admin promotion works via right-click context menu only
- [ ] No broken imports or references
- [ ] Component file can be deleted if no longer used

---

## Phase 3: Testing & QA

### Task 3.1: Unit Tests for Avatar Components

**Priority:** P1
**Estimate:** 45 min

**Files to create/update:**
- `frontend/tests/unit/features/participant/components/ParticipantAvatar.test.tsx`
- `frontend/tests/unit/features/participant/components/MeSection.test.tsx`
- `frontend/tests/unit/features/participant/components/AvatarContextMenu.test.tsx`

**Test Cases:**
```typescript
describe('ParticipantAvatar', () => {
  it('shows blue background for online non-admin', () => {});
  it('shows gold background for online admin', () => {});
  it('shows grey background for offline user', () => {});
  it('shows green ring for online users', () => {});
  it('shows no ring for offline users', () => {});
  it('shows thicker ring and scale when selected', () => {});
  it('displays correct initials from alias', () => {});
});

describe('MeSection', () => {
  it('renders avatar only, no text label', () => {});
  it('always shows green ring (user is online)', () => {});
  it('calls onFilter when clicked', () => {});
});

describe('AvatarContextMenu', () => {
  it('shows filter option for all users', () => {});
  it('shows edit alias only for current user', () => {});
  it('shows make admin only for admin viewing non-admin', () => {});
  it('hides make admin for non-admin users', () => {});
});
```

**Acceptance Criteria:**
- [ ] All avatar state combinations tested
- [ ] MeSection renders correctly
- [ ] Context menu visibility rules tested
- [ ] 100% pass rate

---

### Task 3.2: E2E Tests for Participant Bar

**Priority:** P1
**Estimate:** 45 min

**File:** `frontend/tests/e2e/12-participant-bar.spec.ts`

**Test Cases:**
```typescript
test.describe('Participant Bar - Avatar System v2', () => {
  test('current user appears in MeSection on right', async ({ page }) => {});
  test('current user NOT in other participants list', async ({ page }) => {});
  test('right-click opens context menu', async ({ page }) => {});
  test('context menu shows correct options for admin', async ({ page }) => {});
  test('admin can promote non-admin via context menu', async ({ page }) => {});
  test('avatar turns gold after promotion', async ({ page }) => {});
  test('filter by user works from context menu', async ({ page }) => {});
  test('edit alias opens dialog from context menu', async ({ page }) => {});
});

test.describe('Alias Prompt Modal', () => {
  test('modal appears for new users', async ({ page }) => {});
  test('modal cannot be dismissed without alias', async ({ page }) => {});
  test('valid alias enables join button', async ({ page }) => {});
  test('invalid alias shows error message', async ({ page }) => {});
});
```

**Acceptance Criteria:**
- [ ] All user flows tested
- [ ] Multi-user scenarios tested
- [ ] Touch/long-press tested (if possible in Playwright)
- [ ] ≥90% pass rate

---

### Task 3.3: Run Full Regression Suite

**Priority:** P0
**Estimate:** 30 min

**Commands:**
```bash
# Unit tests
cd frontend && npm run test:run

# E2E tests
cd frontend && npm run test:e2e

# Generate coverage report
cd frontend && npm run test:coverage
```

**Acceptance Criteria:**
- [ ] Unit test pass rate: 100%
- [ ] E2E test pass rate: ≥90%
- [ ] No regressions from Phase 8.6
- [ ] Coverage maintained or improved

---

## Execution Plan

### Recommended Order

```
Phase 1 (Sequential - dependencies):
Task 1.1 → Task 1.2 → Task 1.3 → Task 1.4/1.5 (parallel)

Phase 2 (Partial parallel after 1.3):
Task 2.1 → Task 2.2 (depends on 2.1)
Task 2.3 (can run parallel with 2.1)
Task 2.4 (after 2.1)

Phase 3 (After all implementation):
Tasks 3.1, 3.2 (parallel) → Task 3.3
```

### Visual Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1.1 Avatar Indicators                                                  │
│       └─→ 1.2 MeSection                                                 │
│             └─→ 1.3 ParticipantBar Layout                               │
│                   └─→ 1.4 Remove MyUserCard ─┬─→ 2.1 Context Menu       │
│                   └─→ 1.5 UUID to Dialog ────┘     └─→ 2.2 Long-Press   │
│                                                    └─→ 2.4 Remove Admin DD│
│                   └─→ 2.3 Alias Prompt (parallel)                       │
│                                                                         │
│  After all above: 3.1 Unit Tests ─┬─→ 3.3 Regression                    │
│                   3.2 E2E Tests  ─┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Test Infrastructure Fixes (Prerequisite)

**Priority:** P0 - Must be done before Phase 3 testing
**Estimate:** 1.5 hrs

These issues were identified during Phase 8.6 QA and must be resolved in Phase 8.7:

### Task 0.1: Fix Unit Test Props

**Files affected:**
- `tests/unit/features/card/components/RetroCard.test.tsx` (~50 errors)
- `tests/unit/features/card/components/RetroColumn.test.tsx` (~20 errors)
- `tests/unit/features/participant/components/ParticipantBar.test.tsx` (~10 errors)

**Issues:**
1. Missing `columnType` prop in RetroCard test fixtures
2. Missing `onUpdateAlias` prop in ParticipantBar tests
3. `LinkedFeedbackCard` type missing `created_by_alias` and `created_at` fields

**Fix pattern:**
```typescript
// Add to all RetroCard test renders:
columnType: 'feedback' | 'action' | 'improvement'

// Add to ParticipantBar tests:
onUpdateAlias: vi.fn().mockResolvedValue(undefined)

// Fix LinkedFeedbackCard fixtures:
{ id: 'card-1', content: 'Test', created_by_alias: 'User', created_at: '2026-01-01' }
```

### Task 0.2: Fix E2E Test Infrastructure

**Files affected:**
- `tests/e2e/global-setup.ts`
- `tests/e2e/global-teardown.ts`
- `tests/e2e/helpers.ts`
- `tests/e2e/utils/admin-helpers.ts`

**Issues:**
1. Missing `@types/node` in tsconfig for E2E tests
2. Type-only imports needed (`FullConfig`, `APIRequestContext`)
3. Unused variables in test fixtures

**Fix:**
1. Create `tests/e2e/tsconfig.json` with node types:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "types": ["node", "@playwright/test"]
  }
}
```

2. Update imports to use `type`:
```typescript
import type { FullConfig } from '@playwright/test';
```

### Task 0.3: Fix Integration Test Types

**File:** `tests/integration/card-creation.integration.test.ts`

**Issue:** Type inference failing for API response

**Fix:** Add explicit type annotation to response handling

### Task 0.4: Add Long-Press Touch Support

**File:** `frontend/src/features/participant/components/AvatarContextMenu.tsx`

**Issue:** Radix ContextMenu doesn't support controlled `open` state.

**Solution:** Use DropdownMenu instead for touch support, or implement custom portal-based menu.

**Note:** This was removed in Phase 8.6 fix. Re-implement with correct approach.

---

## Sign-off Checklist

- [ ] All Phase 0 test fixes complete
- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tests passing
- [ ] UTB-033 resolved (no alias label)
- [ ] UTB-034 resolved (no black ring)
- [ ] UTB-035 resolved (vibrant colors)
- [ ] UTB-038 resolved (context menu works)
- [ ] Visual QA review complete
- [ ] No regressions from Phase 8.6
- [ ] TypeScript build passes (source + tests)

---

*Task List by Principal Engineer - 2026-01-05*
*Updated: 2026-01-06 - Added Phase 0 test infrastructure fixes*
*Ready for implementation after Phase 8.6*
