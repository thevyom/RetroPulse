# UX Decisions Summary - Collaborative Retro Board
**Date**: 2025-12-24
**PRD Version**: 1.2

## Overview
This document summarizes all key user experience and technical decisions made for the MVP after detailed clarification sessions.

---

## User Interface Design Decisions

### 1. Active User Visibility
**Decision**: Display all active user aliases at the top of the board

**Rationale**:
- Provides transparency about who is currently participating
- Enables easy admin designation from active users
- Creates sense of presence and collaboration

**Implementation**:
- Prominent display area at top of board
- Updates in real-time as users join/leave
- Used for co-admin selection interface

---

### 2. Parent-Child Card Relationships
**Decision**: Drag one card onto another to create parent-child relationship

**How it works**:
- User drags first card and drops it onto second card
- Dragged card becomes child of target card (target becomes parent)
- Each child can have exactly one parent
- Parent can have multiple children
- Parent-child relationships work across columns
- Child cards have visual indicators (border/background/indent) showing association with parent
- Any user can unlink a child by clicking unlink button on the child card

**Rationale**:
- Intuitive drag-and-drop interaction
- Simpler data model than separate groups table
- One-to-many relationship is easier to implement and understand
- Visual feedback during operation
- Unlinking is straightforward and accessible to all users

---

### 3. Action Item Linking Flow
**Decision**: Drag action item card onto feedback card to create hyperlink

**How it works**:
1. User creates action item in action items column
2. User drags action item onto target feedback card
3. System creates clickable hyperlink on feedback card
4. Clicking hyperlink navigates to/highlights the action item

**Rationale**:
- Consistent with drag-and-drop pattern for grouping
- Visual, intuitive linking mechanism
- Clear cause-and-effect relationship
- Hyperlink provides clear navigation path

---

### 4. Admin Designation
**Decision**: Select co-admins from active alias list at top of board

**How it works**:
- Admin interface shows list of active user aliases
- Creator/admin selects users to designate as co-admins
- No limit on number of co-admins
- Co-admins have same privileges as creator (except cannot remove creator status)

**Rationale**:
- Simple selection from known, active users
- No manual alias entry required (less error-prone)
- Unlimited co-admins supports various team sizes
- Keeps admin management simple

**Note**: Admin transfer not supported - creator remains creator but can share admin privileges

---

### 5. Board Closure Notification
**Decision**: Display banner at top of board when closed

**How it works**:
- Admin clicks close board button
- System prompts for confirmation
- Upon closure, banner appears at top for all users
- Banner clearly indicates read-only state
- All editing features disabled (grayed out or hidden)

**Rationale**:
- Non-intrusive (doesn't block view with modal)
- Persistent reminder of board state
- Doesn't interrupt users mid-task
- Clear visual distinction between active/closed states

**Future enhancement (P3)**: Admin can reopen board within 24 hours of closure

---

### 6. Anonymous Card Deletion
**Decision**: Show delete button only to card creator, use cookies for identity

**How it works**:
- Delete button visible only on cards created by current user
- System uses browser cookie to maintain user identity
- Anonymous cards still track creator via cookie
- If user returns with same cookie, they can delete their anonymous cards

**Limitations**:
- Cookie cleared = can't delete anonymous cards
- Different browser = different identity

**Rationale**:
- Simple implementation without full authentication
- Preserves anonymity while allowing card management
- Cookie-based session adequate for MVP use case
- Prevents accidental deletion by others

---

### 7. Card Organization and Sorting
**Decision**: Cards arrange ONLY by sorting - no manual reordering

**How it works**:
- Cards within each column are arranged by sorting (popularity or recency)
- User applies sort (popularity or recency) to a column
- Sort affects only that user's view
- Other users don't see the sorted order
- Sort preference doesn't persist across page refreshes
- When sorting by popularity, parent cards use aggregated reaction count (own + children)
- Standalone and child cards use their own direct reaction count for sorting
- Drag operations are used ONLY for: creating parent-child relationships, linking action items, and moving cards across columns

**Rationale**:
- Eliminates complexity of manual positioning
- Avoids conflict between manual order and sort order
- Simpler implementation (client-side only)
- Each facilitator/participant can organize their view
- Parent-child relationships provide the organizational structure
- Aggregated reaction counts ensure parents sort appropriately based on total engagement

---

### 8. Column Configuration
**Decision**: Board and column names can be renamed by admins; advanced column management deferred to P2

**How it works**:
- Creator configures columns during board creation
- After creation, board admins can rename the board and column names
- Advanced operations (add, remove, reorder columns) are not available in MVP
- Column removal blocked if column contains cards

**Rationale**:
- Simple renaming provides flexibility for MVP without complexity
- Allows correction of typos or refinement during session
- Advanced column management adds significant complexity to real-time sync
- Most retro sessions don't require adding/removing columns mid-session

**Future enhancement (P2)**: Advanced column management (add, remove, reorder columns)

---

### 9. Reaction Aggregation for Parent Cards
**Decision**: Parent cards display aggregated reaction count (own + children); used for sorting

**How it works**:
- Each card stores its own direct reaction count
- Parent cards calculate and display aggregated count: own reactions + sum of all children's reactions
- Standalone cards and child cards display only their own direct reactions
- When sorting by popularity, parent cards use aggregated count
- When sorting by popularity, standalone and child cards use direct count
- System automatically updates parent's aggregated count when child reactions change

**Rationale**:
- Parent cards represent a theme/group, so total engagement across theme is meaningful
- Sorting parents by aggregated count ensures highly-engaged themes rise to the top
- Allows users to react to individual cards (parent or children) as they see fit
- Provides flexibility: react to parent if it represents the theme, or react to specific children
- Aggregation is automatic and transparent to users

**Display considerations**:
- Visual design will determine whether to show "5 (12 total)" vs just "12" on parent cards
- Decision deferred to UI design phase

---

## Technical Design Decisions

### 10. Limit Scope
**Decision**: Card and reaction limits apply across entire board (not per-column)

**How it works**:
- If limit is 3 cards, user can create max 3 cards total across all columns
- If limit is 5 reactions, user can give max 5 reactions total across all cards

**Rationale**:
- Simpler for users to understand
- Easier to implement and display quota
- Prevents gaming of per-column limits
- Adequate for managing large team participation

**Future enhancement (P3)**: Per-column limits as advanced feature

---

### 11. User Identity Management
**Decision**: Browser cookie-based alias storage with anonymity protection

**How it works**:
- User alias stored in browser cookie
- Returning users automatically recognized
- Anonymous card creators not identifiable even by admins
- System tracks ownership but doesn't expose anonymous identity

**Security considerations**:
- Cookies can be cleared
- Different browsers = different identities
- Not secure authentication (acceptable for MVP)

**Future enhancement (P3)**: SSO integration for enterprise use

---

### 12. Conflict Resolution Strategy
**Decision**: Last-write-wins for concurrent operations

**How it works**:
- If two users perform same operation simultaneously (move card, create parent-child link), most recent change is applied
- No conflict notifications or resolution UI
- Optimistic updates with eventual consistency

**Rationale**:
- Simplest implementation
- Conflicts rare in practice (different users work on different cards)
- Non-destructive (only affects card relationships or column placement)
- Real-time sync makes conflicts short-lived

**Trade-off**: Potential for brief confusion if two users simultaneously create parent-child links or move same card

---

### 13. Admin Model
**Decision**: No admin transfer, but multiple co-admins with equal privileges

**How it works**:
- Board creator is permanent creator
- Creator can designate unlimited co-admins
- Co-admins have same privileges (close board, designate other co-admins, rename board/columns)
- Creator cannot transfer "creator" status to another user

**Rationale**:
- Simpler implementation and mental model
- Multiple admins solve same problem as transfer
- Prevents accidental ownership loss
- Adequate for collaborative teams

---

### 14. Unlinking Permissions
**Decision**: Any user can unlink any child card from its parent

**How it works**:
- Each child card displays an unlink button
- Any user (not just the card creator) can click unlink
- Unlinking restores the child card to a standalone card
- No special permissions required

**Rationale**:
- Collaborative environment where organization is a shared activity
- Simplifies UX (no need to track who created the link)
- Users can reorganize cards as discussion evolves
- Aligns with philosophy that any user can create parent-child relationships

---

## Impact on MVP Scope

### Features Confirmed for P0 (MVP)
- Cookie-based user identity
- Active alias display
- Parent-child card relationships via drag-and-drop
- Cross-column parent-child relationships
- Unlinking (any user can unlink)
- Reaction aggregation for parent cards
- Sorting by aggregated counts (parents) and direct counts (standalone/children)
- No manual card reordering (sort-only organization)
- Drag-to-link action items
- Move cards across columns via drag-and-drop
- Banner-based board closure notification
- Board-wide card/reaction limits
- Last-write-wins conflict resolution
- Board and column renaming by admins
- User-specific sorting

### Features Deferred to P2
- Advanced column management (add, remove, reorder columns)

### Features Deferred to P3
- Board reopen capability (24-hour window)
- Per-column limits
- Admin transfer capability
- Persistent sort preferences

---

## Design Principles Applied

1. **Simplicity First**: Chose simpler implementations for MVP (last-write-wins, cookie-based identity, parent-child over complex grouping, sort-only ordering eliminates positioning conflicts)

2. **Drag-and-Drop Consistency**: Used consistent interaction pattern for parent-child linking, action item linking, and cross-column movement

3. **Progressive Disclosure**: Advanced features (advanced column management, per-column limits, board reopen) deferred to later phases

4. **User Control**: Sorting is user-specific; admins can designate multiple co-admins and rename board/columns; users control anonymity per-card; any user can unlink child cards

5. **Real-time Collaboration**: All persistent changes (parent-child relationships, linking, reactions, column movement) synchronized immediately

6. **Transparency**: Active users visible; reaction attribution shown; admin designation clear; aggregated reaction counts show total engagement

7. **Collaborative Organization**: Parent-child relationships and unlinking available to all users, not restricted to creators

---

## Open Design Questions for UI/UX Team

While functional requirements are clear, visual design details remain to be specified:

1. **Parent-Child Visual Treatment**: Border style? Background color? Indent? Connecting lines? How to show hierarchy clearly?

2. **Unlink Button Appearance**: Icon style? Placement on child card? Hover state? Confirmation dialog?

3. **Parent Card Reaction Display**: Show "5 (12 total)" or just "12"? How to indicate aggregation visually?

4. **Action Item Hyperlink Appearance**: Icon? Text label? Badge count? Color?

5. **Delete Button Placement**: On card hover? Always visible? Icon style?

6. **Banner Style**: Color scheme? Dismissible or permanent? Animation?

7. **Active User Display**: Avatar support? Color coding? Status indicators?

8. **Drag Visual Feedback**: Ghost image? Highlight drop zones? Different visuals for parent-child linking vs column movement? Cursor changes?

9. **Sort UI**: Dropdown? Toggle buttons? Column headers? How to indicate current sort mode?

10. **Pastel Color Palette**: Specific colors for each column type? Accessibility considerations?

11. **Board/Column Rename UI**: Inline editing? Modal dialog? Keyboard shortcuts?

These will be addressed in the design phase with wireframes and mockups.
