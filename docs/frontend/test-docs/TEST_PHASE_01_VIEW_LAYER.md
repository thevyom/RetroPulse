# Test Phase 1: View Layer (Component Tests)

**Status**: 🔲 NOT STARTED
**Tests**: 0/~80 complete
**Coverage Target**: 85%+

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md)

---

## 🎯 Phase Goal

Test all React View components for correct rendering, prop handling, and event emission. Views should be tested in isolation by mocking ViewModel hooks entirely.

---

## 📋 Test Suites

### 1.1 RetroBoardPage Container Tests

**File**: `tests/unit/features/board/components/RetroBoardPage.test.tsx`

**Pattern**: Mock ViewModel, Test Rendering

```typescript
vi.mock('../viewmodels/useBoardViewModel')
vi.mock('../viewmodels/useCardViewModel')

describe('RetroBoardPage', () => {
  test('renders loading skeleton when isLoading is true', () => {
    mockUseBoardViewModel.mockReturnValue({
      board: null,
      isLoading: true,
      error: null
    })

    render(<RetroBoardPage boardId="123" />)

    expect(screen.getByTestId('board-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  test('renders error message when error state exists', () => {
    mockUseBoardViewModel.mockReturnValue({
      board: null,
      isLoading: false,
      error: new Error('Board not found')
    })

    render(<RetroBoardPage boardId="123" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Board not found')
  })

  test('renders full board layout when loaded', () => {
    const mockBoard = { id: '123', name: 'Sprint 42', state: 'active' }
    mockUseBoardViewModel.mockReturnValue({
      board: mockBoard,
      isLoading: false,
      error: null
    })

    render(<RetroBoardPage boardId="123" />)

    expect(screen.getByRole('heading', { name: 'Sprint 42' })).toBeInTheDocument()
    expect(screen.getByTestId('participant-bar')).toBeInTheDocument()
    expect(screen.getByTestId('my-user-card')).toBeInTheDocument()
    expect(screen.getByTestId('sort-bar')).toBeInTheDocument()
  })
})
```

**Test Cases** (~15 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | Loading state shows skeleton | Skeleton visible, content hidden |
| 2 | Error state shows alert | Error message displayed |
| 3 | Success state renders layout | Header, columns, bars visible |
| 4 | Closed board shows lock icon | Lock indicator present |
| 5 | Renders 3 columns | All column types rendered |

---

### 1.2 RetroBoardHeader Tests

**File**: `tests/unit/features/board/components/RetroBoardHeader.test.tsx`

**Test Cases** (~12 tests):
| # | Test Case | Scenario | Assertion |
|---|-----------|----------|-----------|
| 1 | Admin sees edit controls | `isAdmin: true` | Edit and Close buttons visible |
| 2 | Non-admin no controls | `isAdmin: false` | Edit and Close buttons hidden |
| 3 | Closed board shows lock | `isClosed: true` | Lock icon visible, edit hidden |
| 4 | Edit title dialog | Click edit icon | Modal opens with input field |
| 5 | Close board confirmation | Click close button | Confirmation dialog appears |
| 6 | Submit new title | User types and submits | `onEditTitle` called with new value |
| 7 | Cancel edit | User cancels dialog | Modal closes, no callback |

**Example Test**:
```typescript
test('admin can open edit title dialog', async () => {
  const mockOnEdit = vi.fn()
  render(
    <RetroBoardHeader
      boardTitle="Sprint 42"
      isAdmin={true}
      isClosed={false}
      onEditTitle={mockOnEdit}
      onCloseBoard={vi.fn()}
    />
  )

  const editBtn = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editBtn)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByLabelText(/board name/i)).toHaveValue('Sprint 42')

  const input = screen.getByLabelText(/board name/i)
  await userEvent.clear(input)
  await userEvent.type(input, 'Sprint 43')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  expect(mockOnEdit).toHaveBeenCalledWith('Sprint 43')
})
```

---

### 1.3 MyUserCard Tests

**File**: `tests/unit/features/user/components/MyUserCard.test.tsx`

**Test Cases** (~10 tests):
| # | Test Case | Scenario | Assertion |
|---|-----------|----------|-----------|
| 1 | Display UUID and alias | Valid user | UUID truncated, alias shown |
| 2 | UUID tooltip | Hover over UUID | Full UUID in tooltip |
| 3 | Edit alias button appears | Hover state | Edit button visible |
| 4 | Alias edit dialog | Click edit | Modal with input field |
| 5 | Validate alias pattern | Invalid chars (e.g., @) | Error message shown |
| 6 | Update alias success | Valid new alias | `onUpdateAlias` called |
| 7 | Default alias format | AdjectiveAnimalNumber | Matches pattern regex |

**Example Test**:
```typescript
test('validates alias against pattern', async () => {
  const mockUpdate = vi.fn()
  render(
    <MyUserCard
      currentUser={{ uuid: 'abc-123', alias: 'SneakyPanda42' }}
      onUpdateAlias={mockUpdate}
    />
  )

  await userEvent.click(screen.getByRole('button', { name: /edit alias/i }))

  const input = screen.getByLabelText(/alias/i)
  await userEvent.clear(input)
  await userEvent.type(input, 'Invalid@Alias!')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  expect(screen.getByText(/only alphanumeric/i)).toBeInTheDocument()
  expect(mockUpdate).not.toHaveBeenCalled()
})
```

---

### 1.4 ParticipantBar Tests

**File**: `tests/unit/features/participant/components/ParticipantBar.test.tsx`

**Test Cases** (~18 tests):
| # | Test Case | Scenario | Assertion |
|---|-----------|----------|-----------|
| 1 | Special avatars render | All Users + Anonymous | Both visible |
| 2 | Admin has hat icon | User is admin | Hat emoji displayed |
| 3 | All Users filter active | Default state | Avatar highlighted |
| 4 | Click avatar toggles filter | Click participant | `onToggleUserFilter` called |
| 5 | Anonymous filter toggle | Click ghost icon | `onToggleAnonymousFilter` called |
| 6 | Admin dropdown visible | User is creator | Dropdown button shown |
| 7 | Promote user from dropdown | Select user | `onPromoteToAdmin` called |
| 8 | Multiple filter states | 2 users + anonymous | Correct highlighting |

**Example Test**:
```typescript
test('clicking All Users avatar toggles filter', async () => {
  const mockToggle = vi.fn()
  render(
    <ParticipantBar
      activeUsers={[{ alias: 'Alice', is_admin: true }]}
      activeFilters={{ showAll: true, showAnonymous: false, users: [] }}
      onToggleAllUsersFilter={mockToggle}
      onToggleUserFilter={vi.fn()}
      {...otherProps}
    />
  )

  const allUsersAvatar = screen.getByLabelText(/all users/i)
  await userEvent.click(allUsersAvatar)

  expect(mockToggle).toHaveBeenCalled()
})
```

---

### 1.5 RetroCard Tests

**File**: `tests/unit/features/card/components/RetroCard.test.tsx`

**Test Cases** (~25 tests):
| # | Test Case | Scenario | Assertion |
|---|-----------|----------|-----------|
| 1 | Standalone card has drag handle | No parent_card_id | Drag handle visible |
| 2 | Linked card shows link icon | Has parent_card_id | Link icon replaces drag |
| 3 | Click link icon to unlink | Child card | `onUnlinkFromParent` called |
| 4 | Delete button only for owner | User is creator | Delete button visible |
| 5 | Reaction button shows count | 5 reactions | Badge shows "5" |
| 6 | Recursive child rendering | Card with 2 children | 2 child cards rendered |
| 7 | No gap between parent-child | Visual check | Children directly below |
| 8 | Anonymous card no author | is_anonymous: true | No creator name shown |
| 9 | Aggregated count for parent | Parent with children | Combined count shown |

**Example Test**:
```typescript
test('linked child card shows link icon instead of drag handle', () => {
  const mockUnlink = vi.fn()
  const childCard = {
    id: 'child-1',
    content: 'Child card',
    parent_card_id: 'parent-1',
    children: []
  }

  render(
    <RetroCard
      card={childCard}
      isChild={true}
      onUnlinkFromParent={mockUnlink}
      {...otherProps}
    />
  )

  expect(screen.getByLabelText(/unlink from parent/i)).toBeInTheDocument()
  expect(screen.queryByLabelText(/drag card/i)).not.toBeInTheDocument()
})

test('recursively renders child cards with no gap', () => {
  const parentCard = {
    id: 'parent-1',
    content: 'Parent card',
    parent_card_id: null,
    children: [
      { id: 'child-1', content: 'Child 1', children: [] },
      { id: 'child-2', content: 'Child 2', children: [] }
    ]
  }

  render(<RetroCard card={parentCard} {...props} />)

  expect(screen.getByText('Parent card')).toBeInTheDocument()
  expect(screen.getByText('Child 1')).toBeInTheDocument()
  expect(screen.getByText('Child 2')).toBeInTheDocument()

  const childContainer = screen.getByTestId('child-cards-container')
  expect(childContainer).toHaveStyle({ marginTop: '0' })
})
```

---

### 1.6 RetroColumn Tests

**File**: `tests/unit/features/card/components/RetroColumn.test.tsx`

**Test Cases** (~15 tests):
| # | Test Case | Scenario | Assertion |
|---|-----------|----------|-----------|
| 1 | Render column header | Column name | Header shows correct title |
| 2 | Edit column name (admin) | Admin clicks edit | Edit dialog appears |
| 3 | Add card button enabled | canCreateCard: true | + button clickable |
| 4 | Add card button disabled | canCreateCard: false | + button disabled |
| 5 | Quota warning tooltip | User at limit | Tooltip shows "5/5 cards" |
| 6 | Drag-over highlight | Card dragged over | Drop zone highlighted |
| 7 | Drop card triggers callback | Card dropped | `onCardDropped` called |
| 8 | Cards sorted correctly | Sort by recency | Cards in expected order |

**Example Test**:
```typescript
test('+ button disabled when quota reached, shows tooltip', async () => {
  render(
    <RetroColumn
      column={{ id: 'col-1', name: 'What Went Well' }}
      cards={[]}
      canCreateCard={false}
      onAddCard={vi.fn()}
      {...otherProps}
    />
  )

  const addBtn = screen.getByRole('button', { name: /add card/i })
  expect(addBtn).toBeDisabled()

  await userEvent.hover(addBtn)
  expect(await screen.findByRole('tooltip')).toHaveTextContent(/card limit reached/i)
})
```

---

### 1.7 SortBar Tests

**File**: `tests/unit/features/board/components/SortBar.test.tsx`

**Test Cases** (~5 tests):
| # | Test Case | Assertion |
|---|-----------|-----------|
| 1 | Sort dropdown renders options | Recency, Popularity visible |
| 2 | Direction toggle changes icon | Arrow flips on click |
| 3 | onSortChange callback | Called with new mode |

---

## 📁 Files to Create

```
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

## ✅ Acceptance Criteria

- [ ] All View components have unit tests
- [ ] ViewModels are fully mocked (no real API calls)
- [ ] Props handling tested for all components
- [ ] Event callbacks verified with vi.fn()
- [ ] Loading, error, success states covered
- [ ] Coverage >= 85%

---

[← Back to Master Test Plan](./FRONTEND_TEST_MASTER_PLAN.md) | [Next: Phase 2 →](./TEST_PHASE_02_VIEWMODEL_LAYER.md)
