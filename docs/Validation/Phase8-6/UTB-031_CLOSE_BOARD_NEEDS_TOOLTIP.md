# UTB-031: Close Board Button Needs Tooltip Explanation

**Document Created**: 2026-01-03
**Severity**: Low (UX Enhancement)
**Status**: Open

---

## Problem Summary

The "Close Board" button lacks a tooltip explaining what closing a board means. Users may not understand the implications before clicking.

---

## Current Behavior

- "Close Board" button is visible to admins
- Clicking shows a confirmation dialog with brief text
- No hover tooltip to explain what "closed" means

---

## What "Close Board" Means

When a board is closed:

1. **Read-only mode** - No new cards can be created
2. **No edits allowed** - Existing cards cannot be modified
3. **No reactions** - Users cannot add/remove reactions
4. **No alias changes** - Users cannot update their display name
5. **View only** - Board becomes a static archive
6. **Irreversible** - Cannot be reopened (permanent action)

---

## Proposed Enhancement

### Add Hover Tooltip

```tsx
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

### Improve Confirmation Dialog

Current dialog text:
> "This action cannot be undone. The board will become read-only and no new cards or reactions can be added."

Proposed improved text:
> "Closing the board makes it permanently read-only:
> - No new cards can be created
> - Existing cards cannot be edited or deleted
> - Reactions are locked
> - Aliases cannot be changed
>
> This is useful for archiving completed retrospectives. This action cannot be undone."

---

## Affected Files

| File | Change |
|------|--------|
| [RetroBoardHeader.tsx](frontend/src/features/board/components/RetroBoardHeader.tsx) | Add tooltip to Close Board button |
| Same file | Improve confirmation dialog text |

---

## Acceptance Criteria

- [ ] Hovering over "Close Board" shows tooltip explaining the action
- [ ] Tooltip text is clear and concise
- [ ] Confirmation dialog provides detailed explanation
- [ ] Users understand the implications before confirming

---

*Enhancement identified during user testing - 2026-01-03*
