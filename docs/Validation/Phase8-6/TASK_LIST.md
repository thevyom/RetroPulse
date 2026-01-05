# Phase 8.6 Task List

**Created**: 2026-01-03
**Status**: Draft - Pending Implementation
**Author**: Principal Engineer

---

## Agent Structure

**Agent Types Available**:
1. **Software Developer** - All implementation tasks (frontend + backend)
2. **QA Engineer** - E2E test creation, test verification

---

## Task Overview

| Phase | Tasks | Agent | Parallelizable? |
|-------|-------|-------|-----------------|
| 1: Bug Fixes (High Priority) | 1.1 - 1.4 | Software Developer | Yes (4 parallel) |
| 2: Avatar System v2 - Core | 2.1 - 2.5 | Software Developer | Partial |
| 3: Avatar System v2 - Features | 3.1 - 3.4 | Software Developer | After Phase 2 |
| 4: Testing & QA | 4.1 - 4.4 | QA Engineer | After Phase 3 |

---

## Phase 1: Bug Fixes (High Priority - Run in Parallel)

> **4 Independent Bugs - Can Run Simultaneously**
>
> Launch 4 parallel agents for maximum efficiency

### Task 1.1: UTB-029 - Fix Card Linking Duplicates
**Priority:** P0 - Critical
**Agent:** Software Developer
**Estimate:** 45 min
**Parallelizable:** Yes

**Root Cause:** Race condition between `fetchCards()` and socket `card:linked` event

**File:** `frontend/src/features/card/viewmodels/useCardViewModel.ts`

**Lines 668-679 - Remove fetchCards after link:**
```typescript
// BEFORE (broken):
const handleLinkParentChild = useCallback(
  async (parentId: string, childId: string): Promise<void> => {
    try {
      await CardAPI.linkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      await fetchCards();  // <-- REMOVE THIS - causes race condition
    } catch (err) {
      // ...
    }
  },
  [board?.state, cardsMap, fetchCards]
);

// AFTER (fixed):
const handleLinkParentChild = useCallback(
  async (parentId: string, childId: string): Promise<void> => {
    try {
      await CardAPI.linkCards(parentId, {
        target_card_id: childId,
        link_type: 'parent_of',
      });
      // Socket event will handle store update - no fetchCards()
    } catch (err) {
      // ...
    }
  },
  [board?.state, cardsMap]  // Remove fetchCards from deps
);
```

**Additional fix - Add idempotent check in socket handler (lines 394-399):**
```typescript
const handleCardLinked = (event: { sourceId: string; targetId: string; linkType: string }) => {
  if (event.linkType === 'parent_of') {
    const child = cardsMap.get(event.targetId);
    // Only apply if not already linked (idempotent)
    if (!child?.parent_card_id || child.parent_card_id !== event.sourceId) {
      linkChildStore(event.sourceId, event.targetId);
    }
  }
};
```

**Acceptance Criteria:**
- [ ] Linking two cards does NOT create duplicate cards
- [ ] Unlinking works correctly
- [ ] Store state remains consistent
- [ ] Socket events don't cause duplicate updates

---

### Task 1.2: UTB-030 - Fix New Participant Alias Not Shown
**Priority:** P0 - Critical
**Agent:** Software Developer
**Estimate:** 30 min
**Parallelizable:** Yes

**Root Cause:** Socket field name mismatch (camelCase vs snake_case)

**File 1:** `frontend/src/models/socket/socket-types.ts`

**Lines 135-139 - Update interface:**
```typescript
// BEFORE (broken - expects snake_case):
export interface UserJoinedEvent extends BaseEvent {
  board_id: string;
  alias: string;
  is_admin: boolean;
}

// AFTER (fixed - matches backend camelCase):
export interface UserJoinedEvent extends BaseEvent {
  boardId: string;
  userAlias: string;
  isAdmin: boolean;
}
```

**File 2:** `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts`

**Lines 235-247 - Update handler:**
```typescript
// BEFORE (broken):
const handleUserJoined = (event: { board_id: string; alias: string; is_admin: boolean }) => {
  if (event.board_id === boardId) {
    const newUser: ActiveUser = {
      alias: event.alias,
      is_admin: event.is_admin,
      // ...
    };
    addActiveUser(newUser);
  }
};

// AFTER (fixed):
const handleUserJoined = (event: { boardId: string; userAlias: string; isAdmin: boolean }) => {
  if (event.boardId === boardId) {
    const newUser: ActiveUser = {
      alias: event.userAlias,
      is_admin: event.isAdmin,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    addActiveUser(newUser);
    setUserOnline(event.userAlias);
  }
};
```

**Acceptance Criteria:**
- [ ] New participants appear in participant bar immediately
- [ ] Alias displayed correctly
- [ ] Admin status shown correctly
- [ ] Socket event field names consistent

---

### Task 1.3: UTB-031 - Add Close Board Tooltip
**Priority:** P2 - Low
**Agent:** Software Developer
**Estimate:** 20 min
**Parallelizable:** Yes

**File:** `frontend/src/features/board/components/RetroBoardHeader.tsx`

**Find Close Board button and wrap with Tooltip:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// In the render:
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCloseDialogOpen(true)}
        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="mr-1 h-4 w-4" />
        Close Board
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs">
      <p>Makes the board read-only. No new cards, edits, or reactions allowed. This action cannot be undone.</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Also improve confirmation dialog text:**
```tsx
// Find the AlertDialog content and update:
<AlertDialogDescription>
  Closing the board makes it permanently read-only:
  <ul className="list-disc list-inside mt-2 space-y-1">
    <li>No new cards can be created</li>
    <li>Existing cards cannot be edited or deleted</li>
    <li>Reactions are locked</li>
    <li>Aliases cannot be changed</li>
  </ul>
  <p className="mt-2 font-medium">This is useful for archiving completed retrospectives. This action cannot be undone.</p>
</AlertDialogDescription>
```

**Acceptance Criteria:**
- [ ] Tooltip appears on hover
- [ ] Tooltip text explains Close Board action
- [ ] Confirmation dialog has detailed explanation
- [ ] Users understand implications before confirming

---

### Task 1.4: UTB-032 - Fix Card Header Alignment
**Priority:** P2 - Low
**Agent:** Software Developer
**Estimate:** 10 min
**Parallelizable:** Yes

**File:** `frontend/src/features/card/components/RetroCard.tsx`

**Lines 333-340 - Change items-start to items-center:**
```tsx
// BEFORE (misaligned):
<div
  className={cn(
    'mb-2 flex items-start justify-between min-h-[30px]',
    // ...
  )}
>

// AFTER (aligned):
<div
  className={cn(
    'mb-2 flex items-center justify-between',
    // ...
  )}
>
```

**Acceptance Criteria:**
- [ ] Drag handle vertically aligned with reaction button
- [ ] Anonymous/author icons vertically aligned with action buttons
- [ ] Consistent across all card states
- [ ] No visual regression

---

## Phase 2: Avatar System v2 - Core Components

> **Software Developer Agent**
> Some tasks can run in parallel after Phase 1 completes

### Task 2.1: Simplify Avatar Status Indicators
**Priority:** P1
**Estimate:** 30 min
**Dependencies:** None

**File:** `frontend/src/features/participant/components/ParticipantAvatar.tsx`

**Update avatar styling to use ring for online status:**
```tsx
<div className={cn(
  "h-9 w-9 rounded-full flex items-center justify-center",
  "text-sm font-semibold transition-all",
  // Admin status (fill color)
  isAdmin ? "bg-amber-400 text-gray-800" : "bg-accent text-accent-foreground",
  // Online status (ring)
  isOnline && "ring-2 ring-green-500",
  // Selection state
  isSelected && "ring-[3px] ring-primary scale-110"
)}>
  {initials}
</div>
```

**Remove**:
- Crown icon
- Presence dot indicator

**Acceptance Criteria:**
- [ ] Gold fill = admin
- [ ] Green ring = online
- [ ] No ring = offline
- [ ] Selection uses thicker ring + scale

---

### Task 2.2: Create MeSection Component
**Priority:** P1
**Estimate:** 45 min
**Dependencies:** Task 2.1

**Create file:** `frontend/src/features/participant/components/MeSection.tsx`

```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface MeSectionProps {
  alias: string;
  isAdmin: boolean;
  onFilter: () => void;
  onEditAlias: () => void;
}

export function MeSection({ alias, isAdmin, onFilter, onEditAlias }: MeSectionProps) {
  const initials = alias
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      {/* Avatar */}
      <button
        onClick={onFilter}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center",
          "text-sm font-semibold transition-all",
          isAdmin ? "bg-amber-400 text-gray-800" : "bg-accent text-accent-foreground",
          "ring-2 ring-green-500",  // Always online (it's you)
          "hover:scale-105 cursor-pointer"
        )}
        title="Filter to my cards"
      >
        {initials}
      </button>

      {/* Alias + Edit */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">{alias}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onEditAlias}
          title="Edit alias"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] MeSection shows current user avatar with initials
- [ ] Gold fill if admin
- [ ] Green ring (always online)
- [ ] Alias displayed
- [ ] Edit button functional
- [ ] Click avatar filters to own cards

---

### Task 2.3: Update ParticipantBar Layout
**Priority:** P1
**Estimate:** 60 min
**Dependencies:** Task 2.2

**File:** `frontend/src/features/participant/components/ParticipantBar.tsx`

**Restructure layout:**
```tsx
<div className="flex items-center w-full">
  {/* Filter Controls - fixed left */}
  <div className="flex items-center gap-2 shrink-0">
    <AllUsersButton />
    <AnonymousButton />
  </div>

  {/* Divider */}
  <div className="h-6 w-px bg-border mx-3" />

  {/* Other Participants - scrollable middle */}
  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
    {otherParticipants.map(p => (
      <AvatarContextMenu key={p.alias} user={p} isCurrentUserAdmin={isAdmin}>
        <ParticipantAvatar
          user={p}
          isOnline={onlineAliases.has(p.alias)}
          onClick={() => handleFilterByUser(p.alias)}
        />
      </AvatarContextMenu>
    ))}
  </div>

  {/* Divider */}
  <div className="h-6 w-px bg-border mx-3" />

  {/* Me Section - fixed right */}
  <MeSection
    alias={currentUser.alias}
    isAdmin={currentUser.is_admin}
    onFilter={handleFilterByMe}
    onEditAlias={() => setIsEditAliasOpen(true)}
  />
</div>
```

**Update filter logic:**
```typescript
// Filter out current user from other participants
const otherParticipants = activeUsers.filter(
  (user) => user.alias !== currentUser?.alias
);
```

**Acceptance Criteria:**
- [ ] Current user in MeSection (right side)
- [ ] Current user NOT in scrollable list
- [ ] Dividers visible
- [ ] Scrolling only when overflow
- [ ] Filters work correctly

---

### Task 2.4: Remove MyUserCard from Header
**Priority:** P1
**Estimate:** 15 min
**Dependencies:** Task 2.3

**File:** `frontend/src/features/board/components/RetroBoardHeader.tsx`

**Remove the MyUserCard component from the header:**
```tsx
// REMOVE this section:
<MyUserCard
  user={currentUser}
  onEditAlias={() => setIsEditAliasOpen(true)}
/>
```

**Update imports to remove unused MyUserCard if no longer needed elsewhere.**

**Acceptance Criteria:**
- [ ] No user card in header top-right
- [ ] MeSection in ParticipantBar replaces functionality
- [ ] No broken imports/references

---

### Task 2.5: Move UUID to Edit Dialog
**Priority:** P2
**Estimate:** 20 min
**Dependencies:** Task 2.4

**File:** Find EditAliasDialog component

**Add UUID display to dialog:**
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
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">Your ID:</span>{' '}
        <code className="bg-muted px-1 rounded">{userHash?.slice(0, 12)}...</code>
        <p className="text-xs mt-1">(This identifies you across sessions)</p>
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
- [ ] Explanation text present

---

## Phase 3: Avatar System v2 - Additional Features

> **Software Developer Agent**
> Depends on Phase 2 completion

### Task 3.1: Create AliasPromptModal Component
**Priority:** P1
**Estimate:** 45 min
**Dependencies:** Phase 2 complete

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

  const handleSubmit = () => {
    const trimmed = alias.trim();
    if (trimmed.length < 1) {
      setError('Please enter a name');
      return;
    }
    if (trimmed.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setError('Only letters, numbers, and spaces allowed');
      return;
    }
    onJoin(trimmed);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Join the Retro</DialogTitle>
          <DialogDescription>
            What should we call you?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={alias}
            onChange={(e) => {
              setAlias(e.target.value);
              setError('');
            }}
            placeholder="Enter your name"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">
            This name will be visible to other participants.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={alias.trim().length === 0}
          className="w-full"
        >
          Join Board
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration:** Show modal when user has no cookie for this board.

**Acceptance Criteria:**
- [ ] Modal appears for new users (no cookie)
- [ ] Modal NOT shown for returning users
- [ ] Cannot dismiss without entering alias
- [ ] Validates 1-50 chars, alphanumeric + spaces
- [ ] Submitting creates session and joins board

---

### Task 3.2: Create AvatarContextMenu Component
**Priority:** P1
**Estimate:** 30 min
**Dependencies:** Task 2.3

**Create file:** `frontend/src/features/participant/components/AvatarContextMenu.tsx`

```tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface AvatarContextMenuProps {
  children: React.ReactNode;
  user: { alias: string; is_admin: boolean };
  isCurrentUserAdmin: boolean;
  onMakeAdmin?: (alias: string) => void;
  onFilterByUser: (alias: string) => void;
}

export function AvatarContextMenu({
  children,
  user,
  isCurrentUserAdmin,
  onMakeAdmin,
  onFilterByUser,
}: AvatarContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-sm font-medium border-b">
          {user.alias}
        </div>
        <ContextMenuItem onClick={() => onFilterByUser(user.alias)}>
          👁️ Filter by user
        </ContextMenuItem>
        {isCurrentUserAdmin && !user.is_admin && onMakeAdmin && (
          <ContextMenuItem onClick={() => onMakeAdmin(user.alias)}>
            👑 Make Admin
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

**Acceptance Criteria:**
- [ ] Right-click opens menu
- [ ] "Filter by user" always visible
- [ ] "Make Admin" only for admins viewing non-admin
- [ ] Menu dismisses on click outside or Escape

---

### Task 3.3: Add Long-Press Support for Touch
**Priority:** P2
**Estimate:** 30 min
**Dependencies:** Task 3.2

**Update `AvatarContextMenu.tsx`:**

```tsx
import { useState, useRef } from 'react';

// Add to component:
const [showMenu, setShowMenu] = useState(false);
const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
const timerRef = useRef<NodeJS.Timeout>();
const isLongPressRef = useRef(false);

const handleTouchStart = (e: React.TouchEvent) => {
  isLongPressRef.current = false;
  timerRef.current = setTimeout(() => {
    isLongPressRef.current = true;
    const touch = e.touches[0];
    setMenuPosition({ x: touch.clientX, y: touch.clientY });
    setShowMenu(true);
  }, 500);
};

const handleTouchEnd = () => {
  clearTimeout(timerRef.current);
  if (!isLongPressRef.current) {
    // Normal tap - do filter
    onFilterByUser(user.alias);
  }
};

const handleTouchMove = () => {
  clearTimeout(timerRef.current);
};
```

**Acceptance Criteria:**
- [ ] 500ms long-press opens menu on touch
- [ ] Normal tap still filters
- [ ] Move cancels long-press
- [ ] Works on tablet viewport

---

### Task 3.4: Remove AdminDropdown Button
**Priority:** P1
**Estimate:** 15 min
**Dependencies:** Task 3.2

**File:** Find where AdminDropdown is rendered (likely RetroBoardHeader or ParticipantBar)

**Remove the dropdown component and its import.**

Admin promotion now happens via context menu (Task 3.2).

**Acceptance Criteria:**
- [ ] No "Manage Admins" dropdown in header
- [ ] Admin promotion works via right-click menu
- [ ] No broken references

---

## Phase 4: Testing & QA

> **QA Engineer Agent**
> Run after Phase 3 completes

### Task 4.1: Create Card Linking E2E Tests
**Priority:** P0
**Estimate:** 45 min

**File:** `frontend/tests/e2e/06-parent-child-cards.spec.ts`

**Add tests for UTB-029:**
```typescript
test.describe('UTB-029: Card Linking Bug Fix', () => {
  test('linking cards does not create duplicates', async ({ page }) => {
    // Create 2 cards
    await createCard(page, 'Card A');
    await createCard(page, 'Card B');

    // Count cards
    const initialCount = await page.getByTestId('retro-card').count();
    expect(initialCount).toBe(2);

    // Link Card B to Card A
    await linkCards(page, 'Card A', 'Card B');

    // Count should still be 2
    const afterCount = await page.getByTestId('retro-card').count();
    expect(afterCount).toBe(2);
  });

  test('unlinking cards works correctly', async ({ page }) => {
    // Setup linked cards
    await createCard(page, 'Parent');
    await createCard(page, 'Child');
    await linkCards(page, 'Parent', 'Child');

    // Unlink
    await page.getByTestId('unlink-button').click();

    // Verify separated
    await expect(page.getByText('Parent')).not.toHaveAttribute('data-has-children');
  });
});
```

**Acceptance Criteria:**
- [ ] Tests for linking without duplicates
- [ ] Tests for unlinking
- [ ] Tests for aggregate count updates

---

### Task 4.2: Create Participant E2E Tests
**Priority:** P0
**Estimate:** 45 min

**File:** `frontend/tests/e2e/12-participant-bar.spec.ts`

**Add tests for UTB-030 and Avatar System v2:**
```typescript
test.describe('UTB-030: Participant Alias Fix', () => {
  test('new participant appears in bar', async ({ page, context }) => {
    // Open board
    await createBoard(page, 'Test Board');

    // Open in another context
    const page2 = await context.newPage();
    await page2.goto(page.url());
    await page2.getByPlaceholder('Enter your name').fill('New User');
    await page2.getByRole('button', { name: 'Join Board' }).click();

    // Verify in first page
    await expect(page.getByText('NU')).toBeVisible(); // Initials
  });
});

test.describe('Avatar System v2', () => {
  test('MeSection shows current user', async ({ page }) => {
    await joinBoard(page, 'John Smith');
    await expect(page.getByTestId('me-section')).toBeVisible();
    await expect(page.getByTestId('me-section')).toContainText('John Smith');
  });

  test('context menu opens on right-click', async ({ page }) => {
    await joinBoard(page, 'Admin User');
    const avatar = page.getByTestId('participant-avatar').first();
    await avatar.click({ button: 'right' });
    await expect(page.getByText('Filter by user')).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- [ ] Tests for participant joining
- [ ] Tests for MeSection
- [ ] Tests for context menu

---

### Task 4.3: Create Unit Tests for Store Changes
**Priority:** P1
**Estimate:** 30 min

**File:** `frontend/tests/unit/features/card/cardLinking.test.ts`

```typescript
describe('Card Linking Store', () => {
  it('linkChild does not create duplicates', () => {
    const store = createCardStore();
    store.setCards([mockCardA, mockCardB]);

    store.linkChild('card-a', 'card-b');
    store.linkChild('card-a', 'card-b'); // Call again

    expect(store.cards.size).toBe(2); // Still 2
  });

  it('socket handler is idempotent', () => {
    // Simulate receiving same event twice
    handleCardLinked({ sourceId: 'a', targetId: 'b', linkType: 'parent_of' });
    handleCardLinked({ sourceId: 'a', targetId: 'b', linkType: 'parent_of' });

    expect(store.cards.get('b').parent_card_id).toBe('a');
  });
});
```

**Acceptance Criteria:**
- [ ] Store idempotency tests pass
- [ ] Socket handler tests pass
- [ ] No duplicate creation scenarios

---

### Task 4.4: Run Full Regression Suite
**Priority:** P0
**Estimate:** 30 min

**Commands:**
```bash
# Unit tests
npm run test:run

# E2E tests
npm run test:e2e

# Generate report
npm run test:report
```

**Acceptance Criteria:**
- [ ] Unit test pass rate: 100%
- [ ] E2E test pass rate: ≥90%
- [ ] No new failures
- [ ] Coverage maintained

---

## Execution Summary

### Parallel Execution Recommendation

**Round 1: Bug Fixes (4 agents in parallel)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Agent 1: UTB-029      Agent 2: UTB-030      Agent 3: UTB-031/032      │
│  Card Linking          Participant Alias      Tooltip + Alignment       │
│  (45 min)              (30 min)               (30 min)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Round 2: Avatar System v2 (sequential with partial parallel)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Task 2.1 → Task 2.2 → Task 2.3 → Task 2.4 → Task 2.5                  │
│  (can parallel 2.4/2.5 after 2.3)                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Round 3: Additional Features (sequential)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Task 3.1 → Task 3.2 → Task 3.3 → Task 3.4                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Round 4: Testing (after all implementation)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  QA Agent: Tasks 4.1-4.4                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sub-Agent Prompt Templates

### Bug Fix Agent Template

```
You are a Software Developer fixing bug [ID]: [Title]

## Bug Description
[Copy from bug doc]

## Task
1. Read the following files:
   - [file1:lines]
   - [file2:lines]
2. Read docs/Validation/Phase8-6/TASK_LIST.md (Task X.Y)
3. Implement the fix as described
4. Write unit tests in [test file]
5. Run tests: `cd frontend && npm run test:run -- [test path]`
6. Run the code-review skill on your changes

## Deliverables
Create docs/Validation/Phase8-6/BugFixReport_[ID].md with:
- Bug information
- Root cause analysis
- Solution implemented (with code snippets)
- Code review comments
- Test results
- Verification checklist

Focus only on [ID]. Do not modify other bugs.
```

### Feature Agent Template

```
You are a Software Developer implementing Avatar System v2 Task [X.Y]

## Task Description
[Copy from task list]

## Context
- Project: RetroPulse retrospective board
- Frontend: React + TypeScript + Zustand + Tailwind + shadcn/ui

## Task
1. Read docs/Validation/Phase8-6/DESIGN_PARTICIPANT_AVATARS_V2.md
2. Read docs/Validation/Phase8-6/TASK_LIST.md (Task X.Y)
3. Implement the component/feature
4. Write unit tests
5. Run tests: `cd frontend && npm run test:run`
6. Run the code-review skill on your changes

## Deliverables
Update docs/Validation/Phase8-6/IMPLEMENTATION_LOG.md with:
- Task completed
- Files modified
- Test results
- Any issues encountered

Focus only on Task X.Y.
```

---

*Task List by Principal Engineer - 2026-01-03*
*Pending implementation*
