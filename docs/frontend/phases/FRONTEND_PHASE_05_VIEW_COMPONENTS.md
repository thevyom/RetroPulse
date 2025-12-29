# Phase 5: View Components (React Components)

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/18 complete
**Dependencies**: Phase 4 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Build all React View components following MVVM architecture. Views are presentational components that render UI based on ViewModel state and trigger ViewModel actions. They should contain minimal logic - just rendering and event delegation.

---

## 📋 Task Breakdown

### 12. RetroBoardPage Component

#### 12.1 Implement RetroBoardPage Layout

- [ ] Create `features/board/components/RetroBoardPage.tsx`
- [ ] Extract boardId from URL params (react-router-dom)
- [ ] Initialize useBoardViewModel with boardId
- [ ] Render RetroBoardHeader at top
- [ ] Render ParticipantBar below header
- [ ] Render SortBar (integrated with header or standalone)
- [ ] Render 3 RetroColumn components (one per column type)
- [ ] Show loading spinner while board loads
- [ ] Show error message if board fetch fails

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

- [ ] Test renders header with board name
- [ ] Test renders 3 columns
- [ ] Test renders loading state
- [ ] Test renders error state
- [ ] Test closed board shows readonly UI

**Reference**: Test plan Section 3.1

---

### 13. RetroBoardHeader Component

#### 13.1 Implement RetroBoardHeader Component

- [ ] Create `features/board/components/RetroBoardHeader.tsx`
- [ ] Display board name (editable if admin)
- [ ] Show lock icon if board is closed
- [ ] Implement edit button (admin only) → opens dialog
- [ ] Implement close board button (admin only) with confirmation
- [ ] Show "Create New Board" button → navigates to home
- [ ] Display MyUserCard component

**Interface:**
```typescript
interface RetroBoardHeaderProps {
  boardName: string;
  isAdmin: boolean;
  isClosed: boolean;
  onEditTitle: (newTitle: string) => Promise<void>;
  onCloseBoard: () => Promise<void>;
}
```

**Reference**: Section 4.2 of design doc

---

#### 13.2 Write Tests for RetroBoardHeader

- [ ] Test admin sees edit and close controls
- [ ] Test non-admin does not see controls
- [ ] Test closed board shows lock icon
- [ ] Test edit title dialog opens and validates input
- [ ] Test close board confirmation dialog
- [ ] Test onEditTitle callback with new value

**Reference**: Test plan Section 3.2

---

### 14. MyUserCard Component

#### 14.1 Implement MyUserCard Component

- [ ] Create `features/user/components/MyUserCard.tsx`
- [ ] Display UUID (truncated with tooltip for full value)
- [ ] Display alias prominently
- [ ] Implement edit alias button (appears on hover)
- [ ] Implement edit alias dialog with validation
- [ ] Use validateAlias from validation utils
- [ ] Show validation errors inline

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

- [ ] Test displays UUID and alias
- [ ] Test UUID tooltip shows full value
- [ ] Test edit button appears on hover
- [ ] Test edit dialog validates alias
- [ ] Test invalid alias shows error
- [ ] Test onUpdateAlias callback

**Reference**: Test plan Section 3.3

---

### 15. ParticipantBar Component

#### 15.1 Implement ParticipantBar Component

- [ ] Create `features/participant/components/ParticipantBar.tsx`
- [ ] Render "All Users" special avatar (*)
- [ ] Render "Anonymous" special avatar (ghost icon)
- [ ] Render active user avatars with admin hat icon
- [ ] Implement admin dropdown (creator only)
- [ ] Handle avatar click for filter toggle
- [ ] Highlight active filters

**Interface:**
```typescript
interface ParticipantBarProps {
  activeUsers: ActiveUser[];
  currentUserHash: string;
  isCreator: boolean;
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

- [ ] Create `features/participant/components/ParticipantAvatar.tsx`
- [ ] Render avatar with alias initials or icon
- [ ] Show admin hat icon (🎩) if user is admin
- [ ] Show active filter indicator (ring/border)
- [ ] Handle click event for filter toggle
- [ ] Support special avatars (All Users, Anonymous)

**Reference**: Section 4.5

---

#### 15.3 Implement AdminDropdown Component

- [ ] Create `features/participant/components/AdminDropdown.tsx`
- [ ] Show dropdown button (creator only)
- [ ] Display list of active users in menu
- [ ] Show checkmark for current admins
- [ ] Handle click to promote user

**Reference**: Section 4.9

---

#### 15.4 Write Tests for ParticipantBar

- [ ] Test special avatars render
- [ ] Test admin has hat icon
- [ ] Test All Users filter active by default
- [ ] Test click avatar toggles filter
- [ ] Test admin dropdown visible for creator
- [ ] Test promote user from dropdown

**Reference**: Test plan Section 3.4

---

### 16. SortBar Component

#### 16.1 Implement SortBar Component

- [ ] Create `features/board/components/SortBar.tsx`
- [ ] Implement sort type dropdown (Recency, Popularity)
- [ ] Implement sort direction toggle (Asc/Desc with arrow icon)
- [ ] Handle sort mode change events
- [ ] No filter chips (filters moved to avatars)

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

- [ ] Test sort dropdown renders options
- [ ] Test direction toggle icon changes
- [ ] Test onSortChange callback with mode

**Reference**: Test plan Section 3.6

---

### 17. RetroColumn Component

#### 17.1 Implement RetroColumn Component

- [ ] Create `features/card/components/RetroColumn.tsx`
- [ ] Render column header with title and edit button (admin)
- [ ] Render + button for adding cards
- [ ] Implement drop zone with @dnd-kit
- [ ] Highlight drop zone on drag-over
- [ ] Implement add card dialog
- [ ] Disable + button when quota reached (show tooltip)
- [ ] Validate card content before creation

**Interface:**
```typescript
interface RetroColumnProps {
  columnType: 'went_well' | 'to_improve' | 'action_item';
  title: string;
  cards: CardWithRelationships[];
  isAdmin: boolean;
  canCreateCard: boolean;
  onCreateCard: (content: string, isAnonymous: boolean) => Promise<void>;
  onEditColumnTitle?: (newTitle: string) => Promise<void>;
}
```

**Reference**: Section 4.7 of design doc

---

#### 17.2 Write Tests for RetroColumn

- [ ] Test renders column header
- [ ] Test edit column name (admin only)
- [ ] Test + button enabled when canCreateCard true
- [ ] Test + button disabled with tooltip when quota reached
- [ ] Test drag-over highlights drop zone
- [ ] Test drop card triggers callback

**Reference**: Test plan Section 3.6

---

### 18. RetroCard Component

#### 18.1 Implement RetroCard Component

- [ ] Create `features/card/components/RetroCard.tsx`
- [ ] Render card header with drag handle OR link icon
- [ ] Show drag handle when no parent_card_id
- [ ] Show link icon when card has parent_card_id
- [ ] Implement reaction button with count badge
- [ ] Implement delete button (owner only) with confirmation
- [ ] Render card content text
- [ ] Recursively render children cards with no gap
- [ ] Support drag-and-drop with @dnd-kit
- [ ] Show aggregated count for parent cards

**Interface:**
```typescript
interface RetroCardProps {
  card: CardWithRelationships;
  isOwner: boolean;
  canReact: boolean;
  hasReacted: boolean;
  onReact: () => Promise<void>;
  onUnreact: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUnlinkFromParent: () => Promise<void>;
  level?: number; // for nested rendering
}
```

**Recursive Children Pattern:**
```typescript
<RetroCard card={card}>
  {card.children?.map(child => (
    <RetroCard
      key={child.id}
      card={child}
      level={(level ?? 0) + 1}
      // ... other props
    />
  ))}
</RetroCard>
```

**Reference**: Section 4.8 of design doc

---

#### 18.2 Write Tests for RetroCard

- [ ] Test standalone card has drag handle
- [ ] Test linked card shows link icon (no drag handle)
- [ ] Test click link icon calls onUnlinkFromParent
- [ ] Test delete button only for owner
- [ ] Test reaction button shows count
- [ ] Test recursively renders children
- [ ] Test no gap between parent and children
- [ ] Test anonymous card shows no author

**Reference**: Test plan Section 3.5

---

## 📁 Files to Create

```
src/features/
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

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| RetroBoardPage (unit) | ~5 | Layout, loading, error |
| RetroBoardHeader (unit) | ~6 | Admin controls, edit dialog |
| MyUserCard (unit) | ~6 | UUID display, alias editing |
| ParticipantBar (unit) | ~6 | Avatars, filters, admin dropdown |
| SortBar (unit) | ~3 | Sort options, direction toggle |
| RetroColumn (unit) | ~6 | Add card, drop zone, quota |
| RetroCard (unit) | ~8 | Drag handle, reactions, children |
| **Total** | **~40** | |

---

## ✅ Acceptance Criteria

- [ ] All View components are presentational (minimal logic)
- [ ] Components receive all data via props from ViewModels
- [ ] Proper TypeScript interfaces for all props
- [ ] Components use Material-UI or consistent styling
- [ ] All interactive elements have appropriate ARIA labels
- [ ] Unit tests pass with >90% coverage

---

## 🧪 Related Test Plan

See [TEST_PHASE_01_VIEW_LAYER.md](../test-docs/TEST_PHASE_01_VIEW_LAYER.md) for:
- Component test patterns (mocking ViewModels)
- Rendering and props test examples
- Event callback verification patterns
- Accessibility testing guidance

---

## 📝 Notes

- Use `@testing-library/react` for component testing
- Consider extracting common patterns to shared components
- Views should not directly call APIs or access stores
- All actions should be callbacks from ViewModels

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 4](./FRONTEND_PHASE_04_VIEWMODEL_LAYER.md) | [Next: Phase 6 →](./FRONTEND_PHASE_06_INTEGRATION_REALTIME.md)
