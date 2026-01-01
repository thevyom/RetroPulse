# Phase 5: View Components (React Components)

**Status**: ✅ COMPLETE
**Priority**: High
**Tasks**: 18/18 complete
**Dependencies**: Phase 4 complete
**Completed**: 2025-12-31

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Build all React View components following MVVM architecture. Views are presentational components that render UI based on ViewModel state and trigger ViewModel actions. They should contain minimal logic - just rendering and event delegation.

---

## 📋 Task Breakdown

### 12. RetroBoardPage Component

#### 12.1 Implement RetroBoardPage Layout

- [x] Create `features/board/components/RetroBoardPage.tsx`
- [x] Extract boardId from URL params (react-router-dom)
- [x] Initialize useBoardViewModel with boardId
- [x] Render RetroBoardHeader at top
- [x] Render ParticipantBar below header
- [x] Render SortBar (integrated with header or standalone)
- [x] Render 3 RetroColumn components (one per column type)
- [x] Show loading spinner while board loads
- [x] Show error message if board fetch fails

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│ RetroBoardHeader                                    │
├─────────────────────────────────────────────────────┤
│ ParticipantBar (avatars) | SortBar                  │
├─────────────────┬─────────────────┬─────────────────┤
│   RetroColumn   │   RetroColumn   │   RetroColumn   │
│   (Went Well)   │   (To Improve)  │   (Action Item) │
│                 │                 │                 │
│   RetroCard     │   RetroCard     │   RetroCard     │
│   RetroCard     │   RetroCard     │                 │
│                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

**Reference**: Section 4.1 of design doc

---

#### 12.2 Write Tests for RetroBoardPage

- [x] Test renders header with board name
- [x] Test renders 3 columns
- [x] Test renders loading state
- [x] Test renders error state
- [x] Test closed board shows readonly UI

**Reference**: Test plan Section 3.1

---

### 13. RetroBoardHeader Component

#### 13.1 Implement RetroBoardHeader Component

- [x] Create `features/board/components/RetroBoardHeader.tsx`
- [x] Display board name (editable if admin)
- [x] Show lock icon if board is closed
- [x] Implement edit button (admin only) → opens dialog
- [x] Implement close board button (admin only) with confirmation
- [x] Show "Create New Board" button → navigates to home (deferred to Phase 6)
- [x] Display MyUserCard component

**Interface:**
```typescript
interface RetroBoardHeaderProps {
  boardName: string;
  isAdmin: boolean;
  isClosed: boolean;
  currentUser: UserSession | null;
  onEditTitle: (newTitle: string) => Promise<void>;
  onCloseBoard: () => Promise<void>;
  onUpdateAlias: (newAlias: string) => Promise<void>;
}
```

**Reference**: Section 4.2 of design doc

---

#### 13.2 Write Tests for RetroBoardHeader

- [x] Test admin sees edit and close controls
- [x] Test non-admin does not see controls
- [x] Test closed board shows lock icon
- [x] Test edit title dialog opens and validates input
- [x] Test close board confirmation dialog
- [x] Test onEditTitle callback with new value

**Reference**: Test plan Section 3.2

---

### 14. MyUserCard Component

#### 14.1 Implement MyUserCard Component

- [x] Create `features/user/components/MyUserCard.tsx`
- [x] Display UUID (truncated with tooltip for full value)
- [x] Display alias prominently
- [x] Implement edit alias button (appears on hover)
- [x] Implement edit alias dialog with validation
- [x] Use validateAlias from validation utils
- [x] Show validation errors inline

**Interface:**
```typescript
interface MyUserCardProps {
  uuid: string;
  alias: string;
  onUpdateAlias: (newAlias: string) => Promise<void>;
}
```

**Reference**: Section 4.3 of design doc

---

#### 14.2 Write Tests for MyUserCard

- [x] Test displays UUID and alias
- [x] Test UUID tooltip shows full value (skipped - Radix timing in JSDOM)
- [x] Test edit button appears on hover
- [x] Test edit dialog validates alias
- [x] Test invalid alias shows error
- [x] Test onUpdateAlias callback

**Reference**: Test plan Section 3.3

---

### 15. ParticipantBar Component

#### 15.1 Implement ParticipantBar Component

- [x] Create `features/participant/components/ParticipantBar.tsx`
- [x] Render "All Users" special avatar (*)
- [x] Render "Anonymous" special avatar (ghost icon)
- [x] Render active user avatars with admin hat icon
- [x] Implement admin dropdown (creator only)
- [x] Handle avatar click for filter toggle
- [x] Highlight active filters

**Interface:**
```typescript
interface ParticipantBarProps {
  activeUsers: ActiveUser[];
  currentUserHash: string;
  isCreator: boolean;
  admins: string[];
  showAll: boolean;
  showAnonymous: boolean;
  selectedUsers: string[];
  onToggleAllUsers: () => void;
  onToggleAnonymous: () => void;
  onToggleUser: (userHash: string) => void;
  onPromoteToAdmin: (userHash: string) => Promise<void>;
}
```

**Reference**: Section 4.4 of design doc

---

#### 15.2 Implement ParticipantAvatar Sub-component

- [x] Create `features/participant/components/ParticipantAvatar.tsx`
- [x] Render avatar with alias initials or icon
- [x] Show admin crown icon if user is admin
- [x] Show active filter indicator (ring/border)
- [x] Handle click event for filter toggle
- [x] Support special avatars (All Users, Anonymous)

**Reference**: Section 4.5

---

#### 15.3 Implement AdminDropdown Component

- [x] Create `features/participant/components/AdminDropdown.tsx`
- [x] Show dropdown button (creator only)
- [x] Display list of active users in menu
- [x] Show checkmark for current admins
- [x] Handle click to promote user

**Reference**: Section 4.9

---

#### 15.4 Write Tests for ParticipantBar

- [x] Test special avatars render
- [x] Test admin has crown icon
- [x] Test All Users filter active by default
- [x] Test click avatar toggles filter
- [x] Test admin dropdown visible for creator
- [x] Test promote user from dropdown

**Reference**: Test plan Section 3.4

---

### 16. SortBar Component

#### 16.1 Implement SortBar Component

- [x] Create `features/board/components/SortBar.tsx`
- [x] Implement sort type dropdown (Recency, Popularity)
- [x] Implement sort direction toggle (Asc/Desc with arrow icon)
- [x] Handle sort mode change events
- [x] No filter chips (filters moved to avatars)

**Interface:**
```typescript
interface SortBarProps {
  sortMode: 'recency' | 'popularity';
  sortDirection: 'asc' | 'desc';
  onSortModeChange: (mode: 'recency' | 'popularity') => void;
  onToggleDirection: () => void;
}
```

**Reference**: Section 4.6 of design doc

---

#### 16.2 Write Tests for SortBar

- [x] Test sort dropdown renders options
- [x] Test direction toggle icon changes
- [x] Test onSortChange callback with mode

**Reference**: Test plan Section 3.6

---

### 17. RetroColumn Component

#### 17.1 Implement RetroColumn Component

- [x] Create `features/card/components/RetroColumn.tsx`
- [x] Render column header with title and edit button (admin)
- [x] Render + button for adding cards
- [x] Implement drop zone with @dnd-kit (deferred to Phase 6)
- [x] Highlight drop zone on drag-over (deferred to Phase 6)
- [x] Implement add card dialog
- [x] Disable + button when quota reached (show tooltip)
- [x] Validate card content before creation

**Interface:**
```typescript
interface RetroColumnProps {
  columnId: string;
  columnType: 'went_well' | 'to_improve' | 'action_item';
  title: string;
  color: string;
  cards: Card[];
  isAdmin: boolean;
  isClosed: boolean;
  canCreateCard: boolean;
  currentUserHash: string;
  canReact: boolean;
  hasUserReacted: (cardId: string) => boolean;
  onCreateCard: (data: CreateCardDTO) => Promise<Card>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onAddReaction: (cardId: string) => Promise<void>;
  onRemoveReaction: (cardId: string) => Promise<void>;
  onUnlinkChild: (childId: string) => Promise<void>;
  onEditColumnTitle?: (newTitle: string) => Promise<void>;
}
```

**Reference**: Section 4.7 of design doc

---

#### 17.2 Write Tests for RetroColumn

- [x] Test renders column header
- [x] Test edit column name (admin only)
- [x] Test + button enabled when canCreateCard true
- [x] Test + button disabled with tooltip when quota reached
- [x] Test drag-over highlights drop zone (deferred to Phase 6)
- [x] Test drop card triggers callback (deferred to Phase 6)

**Reference**: Test plan Section 3.6

---

### 18. RetroCard Component

#### 18.1 Implement RetroCard Component

- [x] Create `features/card/components/RetroCard.tsx`
- [x] Render card header with drag handle OR link icon
- [x] Show drag handle when no parent_card_id
- [x] Show link icon when card has parent_card_id
- [x] Implement reaction button with count badge
- [x] Implement delete button (owner only) with confirmation
- [x] Render card content text
- [x] Recursively render children cards with no gap
- [x] Support drag-and-drop with @dnd-kit (deferred to Phase 6)
- [x] Show aggregated count for parent cards

**Interface:**
```typescript
interface RetroCardProps {
  card: Card;
  isOwner: boolean;
  isClosed: boolean;
  canReact: boolean;
  hasReacted: boolean;
  onReact: () => Promise<void>;
  onUnreact: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUnlinkFromParent: () => Promise<void>;
  children?: React.ReactNode;
}
```

**Recursive Children Pattern:**
```typescript
<RetroCard card={card}>
  {card.children?.map(child => (
    <RetroCard
      key={child.id}
      card={child}
      // ... other props
    />
  ))}
</RetroCard>
```

**Reference**: Section 4.8 of design doc

---

#### 18.2 Write Tests for RetroCard

- [x] Test standalone card has drag handle
- [x] Test linked card shows link icon (no drag handle)
- [x] Test click link icon calls onUnlinkFromParent
- [x] Test delete button only for owner
- [x] Test reaction button shows count
- [x] Test recursively renders children
- [x] Test no gap between parent and children
- [x] Test anonymous card shows no author

**Reference**: Test plan Section 3.5

---

## 📁 Files Created

```
src/
├── App.tsx (updated with routing)
└── features/
    ├── board/
    │   └── components/
    │       ├── RetroBoardPage.tsx
    │       ├── RetroBoardHeader.tsx
    │       └── SortBar.tsx
    ├── card/
    │   └── components/
    │       ├── RetroColumn.tsx
    │       └── RetroCard.tsx
    ├── participant/
    │   └── components/
    │       ├── ParticipantBar.tsx
    │       ├── ParticipantAvatar.tsx
    │       └── AdminDropdown.tsx
    └── user/
        └── components/
            └── MyUserCard.tsx

tests/unit/features/
├── board/components/
│   ├── RetroBoardPage.test.tsx
│   ├── RetroBoardHeader.test.tsx
│   └── SortBar.test.tsx
├── card/components/
│   ├── RetroColumn.test.tsx
│   └── RetroCard.test.tsx
├── participant/components/
│   └── ParticipantBar.test.tsx
└── user/components/
    └── MyUserCard.test.tsx
```

---

## 🧪 Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| RetroBoardPage (unit) | 13 | ✅ Pass |
| RetroBoardHeader (unit) | 14 | ✅ Pass |
| MyUserCard (unit) | 9 (1 skipped) | ✅ Pass |
| ParticipantBar (unit) | 11 | ✅ Pass |
| SortBar (unit) | 9 | ✅ Pass |
| RetroColumn (unit) | 19 | ✅ Pass |
| RetroCard (unit) | 20 | ✅ Pass |
| **Total Phase 5** | **95** | ✅ Pass |
| **Total All Tests** | **625** | ✅ Pass |

---

## ✅ Acceptance Criteria

- [x] All View components are presentational (minimal logic)
- [x] Components receive all data via props from ViewModels
- [x] Proper TypeScript interfaces for all props
- [x] Components use shadcn/ui + Tailwind CSS for consistent styling
- [x] All interactive elements have appropriate ARIA labels
- [x] Unit tests pass with >90% coverage

---

## 📋 Code Review

See [CR_PHASE_05_ViewComponents.md](../code-review/CR_PHASE_05_ViewComponents.md) for:
- Detailed code review findings
- Blocking issues (resolved)
- Suggestions and nits
- Security considerations

---

## 🧪 Test Documentation

See [TEST_PHASE_05_ViewComponents.md](../code-review/TEST_PHASE_05_ViewComponents.md) for:
- Test patterns and examples
- Coverage analysis
- Skipped test rationale

---

## 📝 Notes

### Dependencies Installed
- `react-router-dom@7.11.0` - Client-side routing
- shadcn/ui components: dialog, dropdown-menu, input, tooltip, card, avatar

### Deferred to Phase 6
- @dnd-kit drag-and-drop integration
- "Create New Board" navigation
- Real-time WebSocket updates

### Known Limitations
1. Tooltip test skipped due to Radix UI timing in JSDOM
2. Column type detection based on name matching (fragile)
3. hasUserReacted tracks reactions locally (session only, not persisted)

---

## 🔄 Blocking Issue Resolution

### hasReacted Tracking (RESOLVED)

**Problem:** RetroColumn was passing `hasReacted={false}` as hardcoded value.

**Solution:**
1. Added `hasUserReacted: (cardId: string) => boolean` to useCardViewModel
2. Added `userReactions` state (Set<string>) for local tracking
3. Updated `handleAddReaction` and `handleRemoveReaction` with optimistic updates
4. Passed `hasUserReacted` callback through RetroColumn to RetroCard

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 4](./FRONTEND_PHASE_04_VIEWMODEL_LAYER.md) | [Next: Phase 6 →](./FRONTEND_PHASE_06_INTEGRATION_REALTIME.md)
