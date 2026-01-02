# Bug Fix Report - UTB-004

**Bug ID**: UTB-004
**Title**: Action-Feedback Link Indicators
**Date Fixed**: 2026-01-01
**Status**: Fixed

---

## Bug Summary

When a feedback card (went_well/to_improve) is linked to an action item, there's no visual indicator on either card showing this relationship. Users cannot see which cards are connected, making it harder to track the action-feedback relationship.

---

## Root Cause

The `RetroCard` component had the props, types, utility functions (`scrollToCard`, `truncateText`), and handlers partially implemented, but the actual UI section that renders the linked card indicators was missing.

---

## Solution Implemented

### Files Modified

1. **[RetroCard.tsx](../../../frontend/src/features/card/components/RetroCard.tsx)**
   - Added "Linked Actions" section with blue background (`bg-blue-100`) for feedback cards that have action items linked to them
   - Added "Links to" section with green background (`bg-green-100`) for action items showing their linked feedback cards
   - Each link is rendered as a clickable button that:
     - Uses `ArrowRight` icon for visual affordance
     - Truncates content to 50 characters using `truncateText` utility
     - Calls `handleLinkedCardClick` on click to scroll to the linked card
     - Includes proper `aria-label` for accessibility
   - Uses `feedbackCardsToShow` which prioritizes embedded `card.linked_feedback_cards` over `linkedFeedbackCards` prop

2. **[RetroCard.test.tsx](../../../frontend/tests/unit/features/card/components/RetroCard.test.tsx)**
   - Added import for `scrollToCard` function and `LinkedActionCard` type
   - Added comprehensive test suite "Link Indicators (UTB-004)" with 18 new test cases covering:
     - **Linked Actions Section**: rendering conditions, content display, truncation, click behavior, accessibility, styling
     - **Linked Feedback Section**: rendering conditions, content display, embedded vs prop priority, click behavior, accessibility, styling
     - **Both Links Present**: combined rendering
     - **scrollToCard utility function**: scroll behavior, highlight animation, timeout cleanup, null element handling

---

## Code Review Comments

The following items were identified during code review:

### Praise
- Excellent accessibility implementation with proper `aria-label` attributes describing navigation action and truncated content
- Good keyboard accessibility with focus ring styles
- Smart use of `useCallback` for click handler with stable dependencies
- Comprehensive test coverage (18+ new test cases)
- Clear visual distinction between action links (blue) and feedback links (green)
- Good use of fake timers for testing the 2-second highlight removal

### Suggestions (Optional)
- (nit) The `hasLinkedFeedback` condition could be simplified to `feedbackCardsToShow.length > 0` since that variable already handles the priority logic
- (nit) Test imports could be consolidated into a single import statement

### Verdict
**Approved** - The implementation is solid, well-tested, and follows established patterns.

---

## Test Results

```
npm run test:run -- tests/unit/features/card/components/RetroCard.test.tsx

 RUN  v4.0.16

 ✓ tests/unit/features/card/components/RetroCard.test.tsx (43 tests) 2900ms
   ✓ RetroCard > Rendering > should display card content
   ✓ RetroCard > Rendering > should display author alias for non-anonymous cards
   ✓ RetroCard > Rendering > should display "Anonymous" for anonymous cards
   ✓ RetroCard > Rendering > should display reaction count
   ✓ RetroCard > Drag Handle vs Link Icon > should show drag handle for standalone cards
   ✓ RetroCard > Drag Handle vs Link Icon > should show link icon for linked cards
   ✓ RetroCard > Drag Handle vs Link Icon > should call onUnlinkFromParent when clicked
   ✓ RetroCard > Drag Handle vs Link Icon > should have proper button attributes
   ✓ RetroCard > Drag Handle vs Link Icon > should have hover styles for unlink button
   ✓ RetroCard > Drag Handle vs Link Icon > should have transition styles
   ✓ RetroCard > Drag Handle vs Link Icon > should have focus styles (accessibility)
   ✓ RetroCard > Drag Handle vs Link Icon > should disable unlink when board is closed
   ✓ RetroCard > Reactions > should call onReact when clicked
   ✓ RetroCard > Reactions > should call onUnreact when user has already reacted
   ✓ RetroCard > Reactions > should disable reaction button when board is closed
   ✓ RetroCard > Reactions > should disable when canReact is false and not reacted
   ✓ RetroCard > Delete > should show delete button for owner
   ✓ RetroCard > Delete > should not show delete button for non-owner
   ✓ RetroCard > Delete > should not show delete button when board is closed
   ✓ RetroCard > Delete > should open confirmation dialog
   ✓ RetroCard > Delete > should call onDelete when confirmed
   ✓ RetroCard > Delete > should not call onDelete when cancelled
   ✓ RetroCard > Children Cards > should render child cards
   ✓ RetroCard > Children Cards > should show child author
   ✓ RetroCard > Children Cards > should show child reaction count
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should not render when no linked actions
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should render when linkedActionCards provided
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should render all linked action cards
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should truncate long content
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should call scrollToCard on click
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should have proper accessibility attributes
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Actions Section > should have blue background styling
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should not render when no linked feedback
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should render when linkedFeedbackCards provided
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should render all linked feedback cards
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should prefer embedded over prop
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should call scrollToCard on click
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should have proper accessibility attributes
   ✓ RetroCard > Link Indicators (UTB-004) > Linked Feedback Section > should have green background styling
   ✓ RetroCard > Link Indicators (UTB-004) > Both Links Present > should render both sections
   ✓ RetroCard > Link Indicators (UTB-004) > scrollToCard utility > should scroll and add highlight
   ✓ RetroCard > Link Indicators (UTB-004) > scrollToCard utility > should remove highlight after 2 seconds
   ✓ RetroCard > Link Indicators (UTB-004) > scrollToCard utility > should handle null element

 Test Files  1 passed (1)
      Tests  43 passed (43)
   Duration  6.90s
```

---

## Implementation Details

### UI Structure

```tsx
{/* Link Indicators (UTB-004) */}
{hasLinkedActions && (
  <div className="mt-2 rounded-md bg-blue-100 p-2" data-testid="linked-actions-section">
    <div className="mb-1 text-xs font-medium text-blue-700">Linked Actions</div>
    <div className="space-y-1">
      {linkedActionCards.map((actionCard) => (
        <button
          key={actionCard.id}
          type="button"
          onClick={() => handleLinkedCardClick(actionCard.id)}
          className="flex w-full items-center gap-1 rounded bg-blue-50 px-2 py-1 text-left text-xs text-blue-600 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          aria-label={`Navigate to linked action: ${truncateText(actionCard.content, 30)}`}
        >
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{truncateText(actionCard.content)}</span>
        </button>
      ))}
    </div>
  </div>
)}

{hasLinkedFeedback && (
  <div className="mt-2 rounded-md bg-green-100 p-2" data-testid="linked-feedback-section">
    <div className="mb-1 text-xs font-medium text-green-700">Links to</div>
    <div className="space-y-1">
      {feedbackCardsToShow.map((feedbackCard) => (
        <button
          key={feedbackCard.id}
          type="button"
          onClick={() => handleLinkedCardClick(feedbackCard.id)}
          className="flex w-full items-center gap-1 rounded bg-green-50 px-2 py-1 text-left text-xs text-green-600 transition-colors hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-green-400"
          aria-label={`Navigate to linked feedback: ${truncateText(feedbackCard.content, 30)}`}
        >
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{truncateText(feedbackCard.content)}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

### Scroll and Highlight Behavior

```tsx
export function scrollToCard(cardId: string): void {
  const element = document.getElementById(`card-${cardId}`);
  if (!element) return;

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Add highlight animation class
  element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');

  // Remove highlight after 2 seconds
  setTimeout(() => {
    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
  }, 2000);
}
```

---

## Verification Checklist

- [x] Link indicators render correctly for feedback cards with linked actions
- [x] Link indicators render correctly for action items with linked feedback
- [x] Clicking a link indicator scrolls to the linked card
- [x] Linked card receives highlight animation on scroll
- [x] Highlight animation removes after 2 seconds
- [x] Long content is truncated with ellipsis
- [x] Accessibility labels are descriptive and correct
- [x] Blue background for actions section
- [x] Green background for feedback section
- [x] All 43 unit tests pass
