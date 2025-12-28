# PRD Update Summary - Version 1.2

## Date: 2025-12-24

## Overview
This document summarizes the major architectural changes made to the Product Requirements Document from version 1.1 to version 1.2. These changes simplify the implementation while maintaining the core collaborative functionality.

---

## Major Changes

### 1. Card Organization Model Change
**Previous (v1.1)**: Card grouping with manual reordering
- Users could drag cards to manually reorder within columns
- Users could group cards by dragging onto each other
- Separate groups table in database
- Potential conflict between manual order and sort order

**New (v1.2)**: Parent-child relationships with sort-only ordering
- **Changed from "grouping" to "parent-child relationships"**
- Each child card has exactly one parent
- Parent cards can have multiple children
- Parent-child relationships work across columns
- **No manual reordering** - cards arrange ONLY by sorting (popularity or recency)
- Drag operations used ONLY for: creating parent-child links, linking action items, and moving cards across columns
- Simpler database schema (self-referencing foreign key, no separate groups table)

**Impact**: Eliminates complexity of manual positioning and potential conflicts with sorting

---

### 2. Reaction Aggregation for Parent Cards
**New Feature**: Parent cards display aggregated reaction counts

**How it works**:
- Each card stores its own direct reaction count
- Parent cards calculate and display: own reactions + sum of all children's reactions
- Standalone and child cards display only their own direct reactions
- When sorting by popularity, parent cards use aggregated count
- System automatically updates parent's aggregated count when child reactions change

**Rationale**:
- Parent cards represent themes, so total engagement across theme is meaningful
- Ensures highly-engaged themes rise to the top when sorting
- Allows flexible reaction patterns (react to parent or specific children)

**Database Impact**: Added two fields to cards table:
- `direct_reaction_count` - reactions directly on this card
- `aggregated_reaction_count` - for parents: own + children's reactions

---

### 3. Unlinking Permissions
**New Feature**: Any user can unlink child cards from parents

**Previous assumption**: Only card creator could unlink
**New decision**: Unlinking is a collaborative action available to all users

**Rationale**:
- Aligns with collaborative philosophy (any user can create parent-child links)
- Simplifies UX (no need to track who created the link)
- Users can reorganize as discussion evolves

**UI**: Unlink button displayed on each child card, clickable by any user

---

### 4. Board and Column Management
**Previous (v1.1)**: Columns locked after board creation
- No modifications allowed after board creation

**New (v1.2)**: Board and column renaming in MVP; advanced management in P2
- **MVP (P0)**: Board admins can rename board and column names
- **P2**: Advanced column management (add, remove, reorder columns)
- Column removal blocked if column contains cards

**Rationale**:
- Simple renaming provides flexibility without complexity
- Allows correction of typos or refinement during session
- Advanced column management adds significant real-time sync complexity, deferred to P2

---

## Updated Requirements

### Functional Requirements Changes

**Section 1.1 (Board Creation)**:
- **Changed FR-1.1.7**: From "Column configuration SHALL be locked" to "Board admins SHALL be able to rename board and column names"

**New Section 1.6 (Advanced Column Management) - P2**:
- FR-1.6.1: Board admins SHALL be able to add new columns
- FR-1.6.2: Board admins SHALL be able to remove columns
- FR-1.6.3: System SHALL prevent removal of columns with cards
- FR-1.6.4: Board admins SHALL be able to reorder columns
- FR-1.6.5: Column changes SHALL be synchronized in real-time

**Section 2.3 (Card Organization) - Completely Rewritten**:
- **Removed**: Manual reordering (FR-2.3.1, FR-2.3.7)
- **Removed**: Card grouping model
- **Added**: Parent-child card relationships
  - FR-2.3.1: Drag one card onto another to create parent-child relationship
  - FR-2.3.2: Dragged card becomes child of target
  - FR-2.3.3: Each child has exactly one parent
  - FR-2.3.4: Parents can have multiple children
  - FR-2.3.5: Parent-child relationships work across columns
  - FR-2.3.7: Any user can unlink child from parent
  - FR-2.3.8: Unlink button on each child card
  - FR-2.3.13: Users can move cards across columns via drag-and-drop
  - FR-2.3.14: Moving preserves parent-child relationships

**Section 2.4 (Card Sorting)**:
- **Added FR-2.4.2**: When sorting by popularity, parent cards use aggregated reaction count
- **Added FR-2.4.3**: Standalone/child cards use direct reaction count for sorting
- **Added FR-2.4.9**: Sorting determines display order within columns
- **Added FR-2.4.10**: Parent-child relationships preserved during sorting

**Section 3.1 (Reaction System)**:
- **Added FR-3.1.8**: Each card stores own direct reaction count
- **Added FR-3.1.9**: Parent cards display aggregated count (own + children)
- **Added FR-3.1.10**: Standalone/child cards display only direct count
- **Added FR-3.1.16**: System automatically updates parent aggregated count

---

## Updated User Workflows

**Workflow 4: Organizing Cards** - Completely Revised
- **Old**: Manual reordering and grouping
- **New**: Parent-child relationship creation
  - User drags card onto another to create parent-child link
  - Child visually associated with parent
  - User can unlink via button on child card
  - Sorting by popularity uses aggregated counts for parents

---

## Updated Design Decisions

**User Interface & Interaction**:
1. **Removed**: Card grouping decision
2. **Added**: Parent-child card relationships (drag one onto another, child has one parent)
3. **Added**: Card organization - sorting only, no manual reordering
4. **Added**: Reaction aggregation (parents show own + children)
5. **Updated**: Board and column renaming by admins (MVP), advanced column management (P2)

**Technical Decisions**:
13. **Updated**: Conflict resolution includes parent-child linking
15. **Added**: Unlinking permissions - any user can unlink

---

## Updated Technical Architecture

### Database Schema Changes

**Cards Table**:
- **Removed**: `position` field (no manual ordering)
- **Removed**: `group_id` field (no separate groups table)
- **Added**: `parent_card_id` (UUID, nullable, foreign key to cards.id)
- **Added**: `direct_reaction_count` (INTEGER, default 0)
- **Added**: `aggregated_reaction_count` (INTEGER, default 0)
- **Added**: INDEX on `parent_card_id`

**Removed Table**: `card_groups` (no longer needed)

### Real-time Events Updated

**Added Events**:
- `card:moved_column` - card moved to different column
- `card:linked_as_child` - parent-child relationship created
- `card:unlinked` - child unlinked from parent
- `reaction:aggregated_updated` - parent's aggregated count changed
- `board:renamed` - board name changed
- `column:renamed` - column name changed

**Removed Events**:
- `card:moved` (replaced by more specific events)

---

## Updated Success Criteria

**Added Criteria**:
- 2: Board admins can rename board and column names after creation
- 6: Users can create parent-child card relationships by dragging one card onto another
- 7: Parent cards display aggregated reaction count (own + children's reactions)
- 8: Child cards can be unlinked from parents by any user
- 9: Parent-child relationships work across columns
- 10: Users can sort cards by popularity (using aggregated counts for parents) or recency
- 11: Cards arrange by sorting only (no manual reordering)
- 11: Users can move cards across columns while preserving parent-child relationships

**Total Criteria**: Increased from 13 to 18

---

## Updated Prioritization

### P0 (MVP) - Added Features:
- Board and column renaming by admins
- Parent-child card relationships via drag-and-drop
- Reaction aggregation for parent cards
- Unlinking child cards from parents (any user can unlink)
- Cross-column parent-child relationships
- Sorting by aggregated counts (parents) and direct counts (standalone/children)
- Move cards across columns via drag-and-drop

### P0 (MVP) - Removed Features:
- Manual card reordering (eliminated entirely, not deferred)

### P2 - Added Features:
- Advanced column management (add, remove, reorder columns)

### P1 - Updated:
- Changed "Enhanced grouping visualization" to "Enhanced parent-child relationship visualization"

---

## Updated Glossary

**Added Terms**:
- **Parent Card**: A card that has one or more child cards linked to it
- **Child Card**: A card linked to a parent card in a parent-child relationship
- **Standalone Card**: A card that has no parent and no children
- **Parent-Child Relationship**: A linkage between two cards where one card (child) is associated with another card (parent)
- **Direct Reaction Count**: The number of reactions directly on a card (not including children)
- **Aggregated Reaction Count**: For parent cards, the sum of own reactions plus all children's reactions

**Removed Terms**:
- **Grouping**: (replaced by parent-child relationship)

**Updated Terms**:
- **Popularity**: Now defined as "reaction count used for sorting (aggregated for parents, direct for others)"
- **Drag-and-Drop**: Updated to "User interaction pattern for creating parent-child relationships, linking action items, and moving cards across columns"

---

## Updated Out of Scope

**Added to Out of Scope**:
- Advanced column management (P2, not MVP)
- Manual card reordering (eliminated entirely, cards arrange only by sorting)

---

## Open Design Questions

**Added Questions**:
1. Parent-child visual treatment: Border? Background? Indent? Connecting lines?
2. Unlink button appearance: Icon style? Placement? Confirmation dialog?
3. Parent card reaction display: Show "5 (12 total)" or just "12"?
4. Board/column rename UI: Inline editing? Modal? Keyboard shortcuts?
5. Drag visual feedback: Different visuals for parent-child linking vs column movement?

---

## Rationale for Changes

### Why Parent-Child Instead of Grouping?
1. **Simpler implementation**: Self-referencing foreign key vs separate groups table
2. **Clearer semantics**: One-to-many relationship easier to understand than many-to-many groups
3. **Natural hierarchy**: Matches mental model of "main theme" with "related items"
4. **Easier aggregation**: Straightforward to sum children's reactions
5. **Cross-column support**: Parent-child works naturally across columns

### Why Eliminate Manual Reordering?
1. **Conflict avoidance**: No conflict between manual position and sort order
2. **Simpler data model**: No need to store and sync position values
3. **Clear mental model**: Cards always arranged by chosen sort criterion
4. **Reduced complexity**: Fewer real-time sync scenarios to handle
5. **User clarity**: Users understand "sorted by popularity" vs "why is this card here?"

### Why Reaction Aggregation?
1. **Theme engagement**: Parent represents a theme; total engagement across theme is meaningful
2. **Better sorting**: Highly-engaged themes naturally rise to top
3. **Flexible reactions**: Users can react to parent (theme) or specific children
4. **Automatic updates**: System handles aggregation, transparent to users

---

## Migration Notes for Implementation

If implementing from v1.1 design:

### Database Migration
1. Add `parent_card_id`, `direct_reaction_count`, `aggregated_reaction_count` to cards table
2. Remove `position` field from cards table
3. Drop `card_groups` table
4. Create index on `parent_card_id`
5. Backfill `direct_reaction_count` from existing reactions
6. Calculate and backfill `aggregated_reaction_count` for any existing parent cards

### API Changes
- Remove endpoints for manual card reordering
- Add endpoint for creating parent-child link
- Add endpoint for unlinking child
- Add endpoint for renaming board
- Add endpoint for renaming column
- Update card response to include `parent_card_id`, `direct_reaction_count`, `aggregated_reaction_count`

### UI Changes
- Remove manual reordering drag handles
- Add parent-child linking drag behavior
- Add unlink button on child cards
- Add visual indicators for parent-child relationships
- Add board/column rename capability
- Update sorting to use aggregated counts for parents
- Show aggregated reaction count on parent cards

---

## Next Steps

1. **Review v1.2 changes** with stakeholders and engineering team
2. **Validate** parent-child model meets user needs for organization
3. **Design** visual treatment for parent-child relationships
4. **Plan** database migration strategy
5. **Update** technical architecture document with implementation details
6. **Create** API specifications for new endpoints
7. **Design** wireframes showing parent-child interactions
8. **Prototype** drag-and-drop behavior for parent-child linking

---

## Questions for Architecture Review

1. Database trigger strategy for updating `aggregated_reaction_count` vs application-level calculation?
2. Index strategy for parent-child queries (especially cross-column relationships)?
3. Real-time event batching strategy when multiple children's reactions change simultaneously?
4. Optimal approach for rendering parent-child visual hierarchy in UI?
5. Performance implications of aggregation calculation with 100+ cards?
6. Caching strategy for aggregated counts?

---

**Document Owner**: Product Manager
**Last Updated**: 2025-12-24
**Next Review**: After architecture review meeting
