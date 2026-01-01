# Bug Fix Report: UTB-012 and UTB-013

## Bug Information
| Field | Value |
|-------|-------|
| Bug IDs | UTB-012, UTB-013 |
| Titles | Anonymous Filter Logic Inverted, No Visual Indicator for Anonymous Filter |
| Severity | P1-HIGH (both) |
| Status | FIXED |
| Fixed Date | 2026-01-01 |
| Fixed By | Agent (Claude) |

## Problem Description

### UTB-012: Anonymous Filter Logic Inverted
Clicking the Anonymous avatar filter button was hiding anonymous cards instead of showing ONLY anonymous cards.

### UTB-013: No Visual Indicator for Active Anonymous Filter
When filtering by anonymous cards, the Anonymous avatar did not show the visual selection ring, making it unclear whether the filter was active.

### Expected Behavior
1. Clicking Anonymous avatar should show ONLY anonymous cards (exclusive filter)
2. Anonymous avatar should display selection ring when filter is active
3. User filters and anonymous-only filter should be mutually exclusive

### Actual Behavior (Before Fix)
1. Clicking Anonymous avatar was toggling visibility of anonymous cards (show/hide)
2. The `showAnonymous` state controlled hide/show, not exclusive filtering
3. No clear visual indicator when anonymous filter was active

## Root Cause Analysis

### The Bug
The `showAnonymous` state was semantically incorrect:
- It meant "include anonymous cards in results" (show/hide toggle)
- It should have meant "show ONLY anonymous cards" (exclusive filter)
- The visual indicator used `showAnonymous` which was always `true` by default

### Why This Happened
The filter logic treated anonymous as a visibility toggle rather than an exclusive filter mode. The Anonymous avatar button was overloaded with two meanings:
1. Toggle anonymous card visibility
2. Filter to show only anonymous cards

## Solution Implemented

### Design Decision
Added a new `showOnlyAnonymous` state to clarify the semantic meaning:
- `showAnonymous`: Controls whether anonymous cards are visible in results (kept for backward compatibility)
- `showOnlyAnonymous`: Exclusive filter mode - shows ONLY anonymous cards when active

### Files Modified
| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/features/participant/viewmodels/useParticipantViewModel.ts` | Modified | Added showOnlyAnonymous state, updated filter handlers |
| `frontend/src/features/board/components/RetroBoardPage.tsx` | Modified | Updated filter logic to prioritize showOnlyAnonymous |
| `frontend/src/features/participant/components/ParticipantBar.tsx` | Modified | Updated Anonymous avatar isSelected to use showOnlyAnonymous |
| `frontend/tests/unit/features/participant/viewmodels/useParticipantViewModel.test.ts` | Modified | Added 5 new tests for filter behavior |
| `frontend/tests/unit/features/participant/components/ParticipantBar.test.tsx` | Modified | Updated tests for showOnlyAnonymous prop |

### Code Changes

#### 1. useParticipantViewModel.ts - New State
```typescript
// Local state
const [showOnlyAnonymous, setShowOnlyAnonymous] = useState(false);
```

#### 2. useParticipantViewModel.ts - Updated Handler
```typescript
const handleToggleAnonymousFilter = useCallback(() => {
  setShowOnlyAnonymous((prev) => {
    const newValue = !prev;
    if (newValue) {
      // When enabling anonymous-only mode, clear user filters
      setSelectedUsers([]);
      setShowAll(false);
    } else {
      // When disabling, show all cards
      setShowAll(true);
    }
    return newValue;
  });
}, []);
```

#### 3. useParticipantViewModel.ts - User Filter Mutual Exclusivity
```typescript
const handleToggleUserFilter = useCallback((alias: string) => {
  setSelectedUsers((prev) => {
    const isSelected = prev.includes(alias);
    const newSelected = isSelected ? prev.filter((a) => a !== alias) : [...prev, alias];

    if (newSelected.length === 0) {
      setShowAll(true);
    } else {
      setShowAll(false);
      // User filters are mutually exclusive with anonymous-only
      setShowOnlyAnonymous(false);
    }

    return newSelected;
  });
}, []);
```

#### 4. RetroBoardPage.tsx - Filter Logic
```typescript
const filtered = columnCards.filter((card) => {
  // Anonymous-only filter takes priority (shows ONLY anonymous cards)
  if (participantVM.showOnlyAnonymous) {
    return card.is_anonymous === true;
  }
  // Apply user filters
  if (!participantVM.showAll && participantVM.selectedUsers.length > 0) {
    if (card.is_anonymous) return false;
    if (!participantVM.selectedUsers.includes(card.created_by_hash)) return false;
  }
  // Apply anonymous filter (hide anonymous cards when disabled)
  if (!participantVM.showAnonymous && card.is_anonymous) return false;
  return true;
});
```

#### 5. ParticipantBar.tsx - Visual Indicator
```tsx
{/* Anonymous */}
<ParticipantAvatar
  type="anonymous"
  isSelected={showOnlyAnonymous}  // Changed from showAnonymous
  onClick={onToggleAnonymous}
/>
```

## Code Review Comments

### (praise) Separate State Variable
Excellent approach adding `showOnlyAnonymous` as a separate state variable. This preserves backward compatibility with `showAnonymous` while fixing the semantic meaning of the Anonymous filter button.

### (praise) Mutual Exclusivity Logic
The mutual exclusivity logic in `handleToggleAnonymousFilter` and `handleToggleUserFilter` is well implemented - when anonymous-only is enabled, user selections are cleared, and vice versa.

### (praise) Filter Priority
The filter logic in `filteredCardsByColumn` is clean and correctly prioritizes `showOnlyAnonymous`.

### (suggestion) Documentation
Consider adding a JSDoc comment to the `showOnlyAnonymous` field in the interface to explain its difference from `showAnonymous`.

### (nit) Unused Props Pattern
The `void _showAnonymous` pattern works but consider using a comment-only approach if the prop is truly unused.

## Testing

### Unit Tests Added/Modified

#### useParticipantViewModel.test.ts (5 new tests)
1. `should have correct initial filter state` - includes showOnlyAnonymous check - PASS
2. `should toggle showOnlyAnonymous filter` - PASS
3. `should clear user selection when enabling anonymous-only filter` - PASS
4. `should restore showAll when disabling anonymous-only filter` - PASS
5. `should clear showOnlyAnonymous when selecting a user` - PASS
6. `should clear all filters including showOnlyAnonymous` - PASS

#### ParticipantBar.test.tsx (2 new tests)
1. `should show Anonymous as selected when showOnlyAnonymous is true` - PASS
2. `should NOT show Anonymous as selected when showOnlyAnonymous is false` - PASS

### Test Command
```bash
npm run test:run -- tests/unit/features/participant
```

### Test Result
All tests passed.

## Verification Checklist

### UTB-012 (Filter Logic)
- [x] Anonymous-only filter shows ONLY anonymous cards
- [x] Toggling off shows all cards
- [x] User filters excluded when anonymous-only active
- [x] Anonymous-only cleared when selecting a user

### UTB-013 (Visual Indicator)
- [x] Anonymous avatar shows ring when filter active
- [x] Anonymous avatar has no ring when filter inactive
- [x] Ring uses `showOnlyAnonymous` not `showAnonymous`

### General
- [x] Code compiles without errors
- [x] Unit tests pass
- [x] Code review completed
- [x] Security review passed (client-side only)
- [x] Backward compatibility maintained (`showAnonymous` preserved)

## Correctness Assessment

| Check | Status | Notes |
|-------|--------|-------|
| Logic fixes UTB-012 | PASS | Anonymous filter now shows ONLY anonymous cards |
| Logic fixes UTB-013 | PASS | Visual ring appears when `showOnlyAnonymous` is true |
| Mutual exclusivity | PASS | User filters and anonymous-only are exclusive |
| Edge cases handled | PASS | Clear filters works, toggling off restores showAll |

## Approval Status
**APPROVED** - The changes correctly fix both bugs with clean, well-tested implementation. The approach of adding `showOnlyAnonymous` is sound and maintains backward compatibility.
