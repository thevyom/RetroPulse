# Bug Fix Report: UTB-020

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-020 |
| Title | Cannot Edit Card Content |
| Severity | High |
| Status | Fixed |
| Fixed By | Software Developer Agent |
| Date | 2026-01-01 |

## Description

Card creators could not edit their card content after creation. Clicking on the card did not enable edit mode. This was partially blocked by UTB-014 (user not recognized as owner) but also required new editing functionality to be implemented.

## Steps to Reproduce

1. Log into board with alias
2. Create a card
3. Try to click on the card content to edit

**Expected:** Card enters edit mode with textarea, changes save on blur/Enter
**Actual:** Nothing happens when clicking on card content

## Root Cause Analysis

### Investigation Process

1. Identified UTB-014 as a blocker (user ownership verification failed)
2. After UTB-014 fix, examined `RetroCard.tsx` for edit functionality
3. Found that edit mode was not implemented at all

### Root Cause

Two issues combined:
1. **UTB-014 Dependency:** User not recognized as owner, so edit permission check failed
2. **Missing Implementation:** No edit mode state, handlers, or UI were implemented

## Solution Implemented

### Code Changes

**File:** `frontend/src/features/card/components/RetroCard.tsx`

#### State Management (lines 130-132)

```typescript
const [isEditing, setIsEditing] = useState(false);
const [editContent, setEditContent] = useState(card.content);
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

#### Focus Management Effect (lines 236-243)

```typescript
// Focus textarea when entering edit mode
useEffect(() => {
  if (isEditing && textareaRef.current) {
    textareaRef.current.focus();
    // Move cursor to end of text
    textareaRef.current.selectionStart = textareaRef.current.value.length;
  }
}, [isEditing]);
```

#### Click Handler (lines 246-251)

```typescript
// Start editing when owner clicks on content
const handleContentClick = useCallback(() => {
  if (isOwner && !isClosed && onUpdateCard) {
    setEditContent(card.content);
    setIsEditing(true);
  }
}, [isOwner, isClosed, onUpdateCard, card.content]);
```

#### Save on Blur Handler (lines 254-270)

```typescript
// Save changes on blur
const handleEditBlur = useCallback(async () => {
  if (!isEditing || !onUpdateCard) return;

  const trimmedContent = editContent.trim();

  // Only save if content changed and is not empty
  if (trimmedContent && trimmedContent !== card.content) {
    setIsSubmitting(true);
    try {
      await onUpdateCard(trimmedContent);
    } finally {
      setIsSubmitting(false);
    }
  }

  setIsEditing(false);
}, [isEditing, editContent, card.content, onUpdateCard]);
```

#### Keyboard Handler (lines 273-283)

```typescript
// Handle keyboard events for save (Enter) and cancel (Escape)
const handleEditKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Escape') {
    // Cancel editing, restore original content
    setEditContent(card.content);
    setIsEditing(false);
  } else if (e.key === 'Enter' && !e.shiftKey) {
    // Save on Enter (but allow Shift+Enter for newlines)
    e.preventDefault();
    void handleEditBlur();
  }
}, [card.content, handleEditBlur]);
```

#### JSX Rendering (lines 439-472)

```typescript
{/* Card Content (UTB-020: Editable for owner) */}
{isEditing ? (
  <Textarea
    ref={textareaRef}
    value={editContent}
    onChange={(e) => setEditContent(e.target.value)}
    onBlur={handleEditBlur}
    onKeyDown={handleEditKeyDown}
    disabled={isSubmitting}
    className="min-h-[60px] resize-none text-sm"
    aria-label="Edit card content"
    data-testid="card-edit-textarea"
  />
) : (
  <p
    className={cn(
      'whitespace-pre-wrap text-sm text-foreground',
      isOwner && !isClosed && onUpdateCard && 'cursor-pointer hover:bg-black/5 rounded px-1 -mx-1 transition-colors'
    )}
    onClick={handleContentClick}
    role={isOwner && !isClosed && onUpdateCard ? 'button' : undefined}
    tabIndex={isOwner && !isClosed && onUpdateCard ? 0 : undefined}
    onKeyDown={isOwner && !isClosed && onUpdateCard ? (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleContentClick();
      }
    } : undefined}
    aria-label={isOwner && !isClosed && onUpdateCard ? 'Click to edit card content' : undefined}
    data-testid="card-content"
  >
    {card.content}
  </p>
)}
```

### New Textarea Component

**File:** `frontend/src/components/ui/textarea.tsx` (new file)

Standard shadcn/ui Textarea component was added to support the edit mode.

### Props Interface Update (line 95)

```typescript
onUpdateCard?: (content: string) => Promise<void>;
```

## Code Review Comments

### Approved Items

- (praise) Complete edit mode implementation with all required handlers
- (praise) Proper accessibility with role, tabIndex, aria-label, and keyboard navigation
- (praise) Trim whitespace before saving
- (praise) Prevent empty content saves
- (praise) Only save when content actually changed
- (praise) Support for multiline editing (Shift+Enter for newlines)
- (praise) Visual feedback with hover state (`hover:bg-black/5`)
- (praise) Comprehensive test coverage

### Notes

- (note) Textarea uses shadcn/ui component for design consistency
- (note) Focus management moves cursor to end of text for better UX
- (note) Board closed state disables editing

## Test Results

### Unit Tests

```
tests/unit/features/card/components/RetroCard.test.tsx
  Card Content Editing (UTB-020)
    Edit Mode Activation
      ✓ should enter edit mode when owner clicks on content
      ✓ should NOT enter edit mode when non-owner clicks on content
      ✓ should NOT enter edit mode when board is closed
      ✓ should NOT enter edit mode when onUpdateCard is not provided
      ✓ should show cursor-pointer style for editable content
      ✓ should NOT show cursor-pointer for non-owner
      ✓ should have accessible role for editable content
      ✓ should enter edit mode on keyboard activation (Enter)
      ✓ should enter edit mode on keyboard activation (Space)
    Edit Mode Behavior
      ✓ should populate textarea with current content
      ✓ should focus textarea when entering edit mode
    Saving Changes
      ✓ should call onUpdateCard with new content on blur
      ✓ should call onUpdateCard on Enter key press
      ✓ should NOT call onUpdateCard if content unchanged
      ✓ should NOT call onUpdateCard if content is empty
      ✓ should exit edit mode after saving
      ✓ should trim whitespace from content before saving
    Cancelling Edit
      ✓ should cancel edit and restore content on Escape
    Multiline Support
      ✓ should allow Shift+Enter for newlines without saving
    Accessibility
      ✓ should have aria-label on textarea
      ✓ should have aria-label on editable content

Test Files  1 passed
Tests       46 passed (46)
```

### Key Test Implementations

**Edit mode activation (lines 816-824):**

```typescript
it('should enter edit mode when owner clicks on content', async () => {
  const user = userEvent.setup();
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  const content = screen.getByTestId('card-content');
  await user.click(content);

  expect(screen.getByTestId('card-edit-textarea')).toBeInTheDocument();
});
```

**Save on blur (lines 925-939):**

```typescript
it('should call onUpdateCard with new content on blur', async () => {
  const user = userEvent.setup();
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  await user.click(screen.getByTestId('card-content'));
  const textarea = screen.getByTestId('card-edit-textarea');

  await user.clear(textarea);
  await user.type(textarea, 'Updated content');
  await user.tab(); // Blur

  await waitFor(() => {
    expect(defaultProps.onUpdateCard).toHaveBeenCalledWith('Updated content');
  });
});
```

**Cancel with Escape (lines 1012-1028):**

```typescript
it('should cancel edit and restore content on Escape', async () => {
  const user = userEvent.setup();
  render(<RetroCard {...defaultProps} columnType="went_well" />);

  await user.click(screen.getByTestId('card-content'));
  const textarea = screen.getByTestId('card-edit-textarea');

  await user.clear(textarea);
  await user.type(textarea, 'Modified content');
  await user.keyboard('{Escape}');

  // Should exit edit mode without saving
  expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
  expect(defaultProps.onUpdateCard).not.toHaveBeenCalled();
  // Original content should be displayed
  expect(screen.getByText('This is a great retro!')).toBeInTheDocument();
});
```

## Verification Checklist

- [x] Root cause identified (UTB-014 dependency + missing implementation)
- [x] Edit mode state implemented
- [x] Click-to-edit for owners
- [x] Textarea component added
- [x] Blur saves changes
- [x] Escape cancels edit
- [x] Enter saves changes
- [x] Shift+Enter allows newlines
- [x] Whitespace trimmed
- [x] Empty content prevented
- [x] Unchanged content not saved
- [x] Accessibility (role, tabIndex, aria-label, keyboard)
- [x] Visual feedback (cursor-pointer, hover state)
- [x] Non-owners cannot edit
- [x] Closed boards disable editing
- [x] Unit tests written and passing (21 new tests)
- [x] All existing tests pass (46/46)
- [x] Documentation complete

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/features/card/components/RetroCard.tsx` | Feature Implementation |
| `frontend/src/components/ui/textarea.tsx` | New Component |
| `frontend/tests/unit/features/card/components/RetroCard.test.tsx` | Test Updates |

## Dependencies

### Blocked By

- **UTB-014** (Fixed): Current User Not Shown in Participant Bar - required for owner verification

---

*Report generated by Software Developer Agent - 2026-01-01*
