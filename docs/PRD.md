# Product Requirements Document: Collaborative Retro Board Platform

## Document Information
- **Product Name**: Collaborative Retro Board (working title)
- **Version**: 1.4
- **Last Updated**: 2025-12-31
- **Status**: Draft
- **Platform**: Web-based application

## Executive Summary

This document defines the functional and non-functional requirements for a collaborative retro board platform that enables teams to conduct effective retrospectives and brainstorming sessions through flexible card-based collaboration.

## Product Overview

### Purpose
Enable teams to collaboratively collect, organize, and prioritize feedback during retrospectives and brainstorming sessions with flexibility for both anonymous and attributed contributions.

### Goals
- Provide psychological safety through optional anonymity
- Enable rich engagement beyond simple agreement/disagreement
- Support flexible organization and prioritization of feedback
- Create customizable board structures for different meeting types
- Ensure actionable outcomes through integrated action item tracking

### Success Metrics (Ongoing Post-Launch)
These metrics will be tracked after launch to measure product adoption and usage:
- User adoption and board creation rate
- Cards created per board session
- Engagement rate (reactions and groupings)
- Action item completion rate
- User satisfaction scores
- Average session duration
- Return user rate

## User Personas (To Be Detailed)

### Primary Users
1. **Board Creator/Admin**: Creates and manages retro boards, controls board settings and lifecycle
2. **Team Participant**: Contributes cards and reactions
3. **Silent Contributor**: Prefers anonymous participation
4. **Co-Admin**: Designated by board creator to help manage the board

## Functional Requirements

### 1. Board Management

#### 1.0 Home Page / Landing Page
**Priority**: P0 (Must Have)

**Requirements**:
- FR-1.0.1: System SHALL provide a home page / landing page as the entry point for the application
- FR-1.0.2: Home page SHALL display a welcome message introducing the platform
- FR-1.0.3: Home page SHALL provide a prominent "Create New Board" button/action
- FR-1.0.4: Clicking "Create New Board" SHALL initiate the board creation workflow (FR-1.1)
- FR-1.0.5: Home page SHALL be accessible at the root URL of the application
- FR-1.0.6: Users accessing the root URL SHALL see the home page instead of being redirected to a specific board

**Acceptance Criteria**:
- First-time users landing on the root URL see a welcoming home page
- Home page clearly communicates the purpose of the platform
- "Create New Board" button is prominently displayed and easily discoverable
- Clicking the button navigates user to board creation flow
- No automatic redirect to non-existent or demo boards

---

#### 1.1 Board Creation
**Priority**: P0 (Must Have)

**Requirements**:
- FR-1.1.1: Any user SHALL be able to create a new retro board
- FR-1.1.2: Board creator SHALL be able to assign a name to the board
- FR-1.1.3: Board creator SHALL be able to define which columns the board contains
- FR-1.1.4: System SHALL provide default column templates
- FR-1.1.5: Default template SHALL include columns: "What Went Well", "What Did Not Go Well", "What Should We Continue", "What Actions Should We Learn"
- FR-1.1.6: Board creator SHALL be able to customize column names and count
- FR-1.1.7: Board admins SHALL be able to rename the board and column names after creation
- FR-1.1.8: Each board SHALL generate a unique shareable link upon creation
- FR-1.1.9: Board creator SHALL be able to access and copy the shareable link
- FR-1.1.10: Board creator SHALL be able to specify the maximum number of feedback cards each user can create across the entire board (default: unlimited)
- FR-1.1.11: Board creator SHALL be able to specify the maximum number of reactions each user can give across the entire board (default: unlimited)
- FR-1.1.12: Card and reaction limits SHALL not apply to action item cards
- FR-1.1.13: Board creator automatically becomes the board admin upon creation
- FR-1.1.14: Board creator SHALL be able to configure feedback timer duration (default: 10 minutes) for P2 feature

**Acceptance Criteria**:
- User can create a board with a custom name
- User can select from default column template or create custom columns
- Board admins can rename the board and columns after creation
- User can set card creation limits per user across entire board (or leave unlimited)
- User can set reaction limits per user across entire board (or leave unlimited)
- User can configure feedback timer duration (default 10 minutes) - P2
- System generates a unique, shareable URL for the board
- Link provides access to the board for anyone who receives it
- Creator is assigned admin role automatically

#### 1.2 Board Access & User Identity
**Priority**: P0 (Must Have)

**Requirements**:
- FR-1.2.1: Users with the shareable link SHALL be able to access the board via web browser
- FR-1.2.2: Multiple users SHALL be able to access the same board simultaneously
- FR-1.2.3: When first accessing a board, user SHALL be prompted to create an alias/display name
- FR-1.2.4: User alias SHALL be used for attribution on cards and reactions
- FR-1.2.5: User alias SHALL be stored in browser cookie to maintain identity across sessions
- FR-1.2.6: System SHALL recognize returning users by cookie and restore their alias
- FR-1.2.7: All active user aliases SHALL be displayed at the top of the board
- FR-1.2.8: Real-time updates SHALL be visible to all users simultaneously
- FR-1.2.9: Changes made by one user SHALL be immediately reflected for all other users viewing the board
- FR-1.2.10: Anonymous card creators SHALL not be identifiable even by admins

**Acceptance Criteria**:
- Any user with the link can open the board in their web browser
- User is prompted to create an alias upon first access
- Alias is stored in browser cookie for session persistence
- Returning users maintain same alias automatically
- Active aliases are visible at top of board
- Multiple users can view and interact with the same board concurrently
- All users see updates in real-time (cards added, reactions, movements, etc.)
- Anonymous card authorship remains protected

#### 1.3 Board Administration
**Priority**: P0 (Must Have)

**Requirements**:
- FR-1.3.1: Board admin (creator) SHALL be able to designate other active users as co-admins
- FR-1.3.2: Admin SHALL select co-admins from list of active aliases displayed at top of board
- FR-1.3.3: Multiple co-admins MAY be designated (no limit)
- FR-1.3.4: Board admin SHALL be able to close the board to end the active session
- FR-1.3.5: When a board is closed, it SHALL become read-only
- FR-1.3.6: Users SHALL be able to view closed boards but not add cards, reactions, or make changes
- FR-1.3.7: When board is closed, a banner SHALL be displayed at top indicating read-only state
- FR-1.3.8: Only board admins (creator and co-admins) SHALL be able to close a board
- FR-1.3.9: Board state (active/closed) SHALL be persisted and visible to all users

**Acceptance Criteria**:
- Board creator can designate co-admins from active user list
- Admin selection interface shows all active aliases
- Multiple co-admins can be designated
- Admins can close the board when the session is complete
- Closed boards display banner indicating read-only state
- Closed boards display all content but prevent any modifications
- Only admins have access to board closure functionality

#### 1.4 Future Board Types
**Priority**: P2 (Future)

**Requirements**:
- FR-1.4.1: System architecture SHALL support expansion to quadrant-based layouts (e.g., SWOT analysis)
- FR-1.4.2: Board format selection SHALL be available to board creators in future releases

#### 1.5 Future Board Management
**Priority**: P3 (Future)

**Requirements**:
- FR-1.5.1: Board admin SHALL be able to reopen a closed board within 24 hours of closure
- FR-1.5.2: Reopening capability SHALL expire 24 hours after board closure

#### 1.6 Advanced Column Management
**Priority**: P2 (Future)

**Requirements**:
- FR-1.6.1: Board admins SHALL be able to add new columns to existing boards
- FR-1.6.2: Board admins SHALL be able to remove columns from boards
- FR-1.6.3: System SHALL prevent removal of columns that contain cards
- FR-1.6.4: Board admins SHALL be able to reorder columns
- FR-1.6.5: Column changes SHALL be synchronized in real-time to all users

**Acceptance Criteria**:
- Admins can add new columns after board creation
- Admins can remove empty columns
- System blocks removal of columns containing cards
- Admins can reorder columns via drag-and-drop or similar mechanism
- All column changes appear immediately for all users

---

#### 1.7 Facilitation Timer
**Priority**: P2 (Future)

**Requirements**:
- FR-1.7.1: Board SHALL include a single timer visible to all users
- FR-1.7.2: Timer SHALL display minutes and seconds only
- FR-1.7.3: Timer SHALL have configurable countdown duration (default: 10 minutes)
- FR-1.7.4: Timer duration SHALL be configurable at board creation
- FR-1.7.5: Board admins (creator and co-admins) SHALL be able to adjust timer duration before starting
- FR-1.7.6: Board admins SHALL see Start and Reset buttons for timer control
- FR-1.7.7: Only board admins SHALL be able to start and reset the timer
- FR-1.7.8: When admin starts timer, it SHALL count down from configured duration
- FR-1.7.9: When countdown reaches zero, timer SHALL automatically switch to counting up
- FR-1.7.10: Timer SHALL be implemented client-side (browser-local, no real-time sync of timer ticks)
- FR-1.7.11: When admin starts timer, a one-time sync event SHALL notify all users to start their local timers
- FR-1.7.12: All users SHALL see the timer start simultaneously
- FR-1.7.13: Timer SHALL not be displayed on closed boards

**Acceptance Criteria**:
- Timer is visible to all users on active boards
- Timer shows minutes and seconds format (MM:SS)
- Default duration is 10 minutes
- Timer duration can be set at board creation
- Admins can adjust duration before starting
- Admins see Start and Reset buttons
- Non-admin users do not see timer controls
- Timer counts down from configured time
- Timer automatically switches to counting up at zero
- When admin starts timer, all users' timers start
- Each user's timer runs locally in their browser
- Timer is hidden on closed boards

---

#### 1.8 Future Authentication
**Priority**: P3 (Future)

**Requirements**:
- FR-1.8.1: System SHALL be extensible to integrate with company SSO (Single Sign-On)
- FR-1.8.2: SSO integration SHALL replace alias-based identity in future releases
- FR-1.8.3: System architecture SHALL accommodate migration from alias-based to SSO-based identity

### 2. Card Management

#### 2.1 Card Creation
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.1.1: Any user SHALL be able to create feedback cards on the board
- FR-2.1.2: User SHALL be able to place a card in any column
- FR-2.1.3: User SHALL choose whether to attach their alias to each card (per-card choice)
- FR-2.1.4: Cards without alias SHALL display as anonymous
- FR-2.1.5: Cards SHALL display content text entered by the user
- FR-2.1.6: Cards in different columns SHALL be displayed in different pastel colors
- FR-2.1.7: Color assignment SHALL be consistent for each column
- FR-2.1.8: System SHALL enforce card creation limits per user if configured by board creator
- FR-2.1.9: User SHALL receive feedback when they reach their card creation limit
- FR-2.1.10: Card creation limits SHALL only apply to feedback cards, not action items
- FR-2.1.11: Board SHALL be editable only when in active state (not closed)

**Acceptance Criteria**:
- User can add a card to any column on an active board
- User can toggle anonymity for each individual card
- Cards display appropriate column-based pastel color
- Card content is clearly visible and readable
- System prevents card creation beyond configured limits
- User is notified of remaining card quota
- Card creation is disabled on closed boards

#### 2.2 Card Deletion
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.2.1: Only the original creator of a card SHALL be able to delete that card
- FR-2.2.2: System SHALL track card ownership via cookie-stored alias
- FR-2.2.3: Delete button SHALL be visible only to the card creator
- FR-2.2.4: System SHALL track card ownership even for anonymous cards
- FR-2.2.5: Deleted cards SHALL be permanently removed from the board

**Acceptance Criteria**:
- Only card creator can delete their own cards
- Delete button appears only for cards created by current user
- Other users cannot see delete option on cards they didn't create
- Anonymous card creators can still delete their own cards if they return with same cookie/alias

#### 2.3 Parent-Child Card Relationships
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.3.1: Users SHALL be able to create parent-child relationships by dragging one card onto another card
- FR-2.3.2: When a card is dragged onto another card, the dragged card becomes a child of the target card
- FR-2.3.3: Each child card SHALL have exactly one parent card
- FR-2.3.4: Parent cards MAY have multiple child cards
- FR-2.3.5: Parent-child relationships MAY exist across different columns
- FR-2.3.6: Child cards SHALL be visually associated with their parent (indentation, border, or similar indicator)
- FR-2.3.7: Any user SHALL be able to unlink a child card from its parent
- FR-2.3.8: Unlink button SHALL be displayed on each child card
- FR-2.3.9: Unlinking a child card restores it to a standalone card
- FR-2.3.10: Drag operation SHALL provide visual feedback during parent-child linking
- FR-2.3.11: Parent-child relationships SHALL be synchronized in real-time across all users
- FR-2.3.12: Parent-child linking SHALL only be possible on active boards (not closed)
- FR-2.3.13: Users SHALL be able to move any card to a different column via drag-and-drop
- FR-2.3.14: Moving a card to a different column SHALL preserve its parent-child relationships

**Acceptance Criteria**:
- Users can drag one card onto another to create parent-child relationship
- Dragged card becomes child of target card
- Each child can have only one parent at a time
- Parent can have multiple children
- Parent-child links work across columns
- Child cards are visually distinguished from standalone cards
- Any user can unlink any child card via unlink button
- Unlinking restores card to standalone state
- Drag-and-drop provides clear visual feedback during linking
- All users see parent-child relationships in real-time
- Parent-child linking is disabled on closed boards
- Users can move cards across columns while preserving relationships

#### 2.4 Card Sorting and Order
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.4.1: Users SHALL be able to sort cards by popularity (reaction count)
- FR-2.4.2: When sorting by popularity, parent cards SHALL use their aggregated reaction count (own + children)
- FR-2.4.3: When sorting by popularity, standalone and child cards SHALL use their own direct reaction count
- FR-2.4.4: Users SHALL be able to sort cards by recency (creation time)
- FR-2.4.5: Users SHALL be able to toggle sort order between ascending and descending via separate button
- FR-2.4.6: Default sort SHALL be recency descending (newest first)
- FR-2.4.7: Sorting SHALL be applied per column
- FR-2.4.8: Sorting SHALL be user-specific (view-only for that user)
- FR-2.4.9: Sorting SHALL not be persisted across sessions
- FR-2.4.10: Other users SHALL not see another user's sort preference
- FR-2.4.11: Sorting determines the display order of cards within each column
- FR-2.4.12: Parent-child visual relationships SHALL be preserved during sorting

**Acceptance Criteria**:
- Cards can be sorted by popularity (ascending or descending)
- Cards can be sorted by recency (ascending or descending)
- Parent cards sort by aggregated reaction count (own + children)
- Standalone and child cards sort by their own reaction count
- User can toggle between ascending and descending order
- Default is recency descending (newest first)
- User can switch between sorting modes (popularity/recency)
- Sorting is local to the user's view only
- Sort preference resets when user leaves/refreshes
- Parent-child relationships remain visually clear when sorting is applied

---

#### 2.5 Card Filtering by User
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.5.1: Users SHALL be able to filter cards by card creator
- FR-2.5.2: Filter options SHALL be displayed as pills in the board header
- FR-2.5.3: On active boards, filter options SHALL include: "All Users" (default), "Anonymous", current user's alias, and all other active user aliases
- FR-2.5.4: On closed boards, filter options SHALL include only users who contributed cards to the board
- FR-2.5.5: Filter SHALL be single-selection (one filter active at a time)
- FR-2.5.6: When "All Users" filter is selected, all cards and their children SHALL be visible
- FR-2.5.7: When a specific user filter is selected, only cards created by that user SHALL be visible (children created by other users are hidden)
- FR-2.5.8: When "Anonymous" filter is selected, only anonymous cards SHALL be visible (excludes attributed children)
- FR-2.5.9: Child cards SHALL only be visible when "All Users" filter is selected
- FR-2.5.10: Filter preference SHALL not persist across sessions (resets on page refresh)
- FR-2.5.11: Filter SHALL be user-specific (each user can set their own filter independently)
- FR-2.5.12: Filter changes SHALL not be synchronized to other users

**Acceptance Criteria**:
- Filter pills are displayed in board header
- Active boards show: "All Users", "Anonymous", current user, and all active users
- Closed boards show only users who contributed cards
- Single filter can be selected at a time
- "All Users" shows all cards including children
- Specific user filter shows only that user's cards (hides children by others)
- "Anonymous" filter shows only anonymous cards (not their attributed children)
- Children only visible with "All Users" filter
- Filter resets on page refresh
- Each user's filter is independent
- Filter changes are local only (not synced)

---

#### 2.6 Concurrent Card Operations
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.6.1: Only one user SHALL be able to edit a specific card at a time
- FR-2.6.2: Other users SHALL be able to add reactions to a card while it is being edited
- FR-2.6.3: System SHALL prevent concurrent edit conflicts on the same card
- FR-2.6.4: Users SHALL receive indication when a card is being edited by another user
- FR-2.6.5: If two users move the same card simultaneously, last write wins
- FR-2.6.6: System SHALL apply the most recent card position/grouping change

**Acceptance Criteria**:
- Card content editing is locked to single user at a time
- Other users can still interact with card (reactions) during editing
- Visual indicator shows when card is being edited
- Concurrent move operations resolve with last-write-wins
- No data loss from concurrent edit or move attempts

### 3. Reactions & Engagement

#### 3.1 Reaction System
**Priority**: P0 (Must Have)

**Requirements**:
- FR-3.1.1: Users SHALL be able to add reaction symbols to any card
- FR-3.1.2: Default reaction symbol SHALL be thumbs up
- FR-3.1.3: System SHALL support multiple reaction symbol types for future use
- FR-3.1.4: Each user SHALL be limited to one reaction symbol per card
- FR-3.1.5: Users SHALL be able to modify their reaction on a card
- FR-3.1.6: Users SHALL be able to remove their reaction from a card
- FR-3.1.7: Users SHALL be able to see which users gave reactions to each card
- FR-3.1.8: Each card SHALL store its own direct reaction count
- FR-3.1.9: Parent cards SHALL display aggregated reaction count (own reactions plus all children's reactions)
- FR-3.1.10: Standalone cards and child cards SHALL display only their own direct reaction count
- FR-3.1.11: Reaction count SHALL be displayed on each card
- FR-3.1.12: System SHALL enforce reaction limits per user if configured by board creator
- FR-3.1.13: User SHALL receive feedback when they reach their reaction limit
- FR-3.1.14: Reactions SHALL only be possible on active boards (not closed)
- FR-3.1.15: Reaction changes SHALL be synchronized in real-time across all users
- FR-3.1.16: System SHALL automatically update parent's aggregated count when child reactions change

**Acceptance Criteria**:
- Users can add thumbs up reaction to cards
- Each user can only have one reaction per card at a time
- Users can change their reaction symbol
- Users can remove their reaction completely
- Reaction attribution is visible (users can see who reacted)
- Each card displays its own direct reaction count
- Parent cards display aggregated count (own + children's reactions)
- System prevents reactions beyond configured limits
- Reactions are disabled on closed boards
- All users see reaction updates in real-time
- Parent aggregated count updates automatically when child reactions change

#### 3.2 Reaction Types
**Priority**: P1 (Should Have)

**Requirements**:
- FR-3.2.1: System architecture SHALL support expansion to multiple reaction symbol types
- FR-3.2.2: Users MAY be able to select different reaction symbols in future releases

**Acceptance Criteria**:
- System can accommodate additional reaction types without major refactoring

### 4. Action Items

#### 4.1 Action Item Cards
**Priority**: P0 (Must Have)

**Requirements**:
- FR-4.1.1: Action items SHALL be special card types
- FR-4.1.2: Users SHALL create action item cards in the action items column
- FR-4.1.3: Users SHALL link action items to feedback cards by dragging the action item onto a feedback card
- FR-4.1.4: When action item is dragged onto feedback card, a hyperlink SHALL be created
- FR-4.1.5: Feedback cards with linked action items SHALL display a hyperlink/indicator
- FR-4.1.6: Clicking the hyperlink SHALL navigate to or highlight the linked action item
- FR-4.1.7: Action items SHALL be displayed in an action items column
- FR-4.1.8: Users SHALL be able to see the linkage between action items and their source cards
- FR-4.1.9: Any user SHALL be able to create action items
- FR-4.1.10: Action items SHALL persist with the board data
- FR-4.1.11: Action items SHALL not count toward user card creation limits

**Acceptance Criteria**:
- Users can create action item cards in action items column
- Users can drag action items onto feedback cards to create links
- Feedback cards display hyperlink when action item is linked
- Clicking hyperlink navigates to linked action item
- Visual linkage shows connection between action items and source cards
- Action items column displays all action items for the board
- Action items can be created even when user reaches feedback card limit

#### 4.2 Advanced Action-Feedback Linking
**Priority**: P2 (Future)

**Requirements**:
- FR-4.2.1: System architecture SHALL support linking multiple feedback cards to a single action item
- FR-4.2.2: System architecture SHALL support linking multiple action items to a single feedback card
- FR-4.2.3: Many-to-many relationship between action items and feedback cards SHALL be supported in future releases

**Acceptance Criteria**:
- System can be extended to support complex action-feedback relationships
- Data model accommodates many-to-many linkages

### 5. Data Persistence

#### 5.1 Data Storage
**Priority**: P0 (Must Have)

**Requirements**:
- FR-5.1.1: All board data SHALL be stored in a datastore
- FR-5.1.2: Cards SHALL be persisted with their content, author information, timestamps, and reactions
- FR-5.1.3: Columns SHALL be persisted with their names and configuration
- FR-5.1.4: Board metadata SHALL be persisted (name, creation date, unique ID, state, limits)
- FR-5.1.5: Board configuration SHALL include card limit and reaction limit settings
- FR-5.1.6: Board state (active/closed) SHALL be persisted
- FR-5.1.7: Admin and co-admin designations SHALL be persisted
- FR-5.1.8: Card groupings and positions SHALL be persisted
- FR-5.1.9: Action item linkages SHALL be persisted
- FR-5.1.10: User aliases and session information SHALL be maintained
- FR-5.1.11: Board state SHALL be recoverable if session is interrupted

**Acceptance Criteria**:
- Board data survives browser refresh
- Users can return to a board using the shareable link
- All cards, reactions, and groupings are preserved
- Board configuration (limits, admins, state) is preserved
- Board state is consistent across all connected users
- Closed boards remain read-only across sessions

## Non-Functional Requirements

### 6. Performance

**Priority**: P0 (Must Have)

**Requirements**:
- NFR-6.1: Board SHALL load in web browser within 3 seconds on standard broadband connection
- NFR-6.2: Card creation SHALL provide immediate visual feedback to user
- NFR-6.3: System SHALL support boards with at least 100 cards without performance degradation
- NFR-6.4: Real-time updates SHALL be delivered to all users within 1 second
- NFR-6.5: Drag-and-drop operations SHALL feel responsive with minimal lag
- NFR-6.6: System SHALL support at least 50 concurrent users on a single board

### 7. Usability

**Priority**: P0 (Must Have)

**Requirements**:
- NFR-7.1: Interface SHALL be intuitive for first-time users
- NFR-7.2: Card operations (create, move, react) SHALL require minimal clicks/interactions
- NFR-7.3: Board state SHALL be visually clear at a glance
- NFR-7.4: Pastel colors SHALL provide sufficient contrast for readability
- NFR-7.5: Text on cards SHALL be clearly legible

### 8. Scalability

**Priority**: P1 (Should Have)

**Requirements**:
- NFR-8.1: System SHALL support multiple concurrent boards
- NFR-8.2: System SHALL support multiple concurrent users per board
- NFR-8.3: Data storage SHALL scale to accommodate growing number of boards and cards

### 9. Reliability

**Priority**: P0 (Must Have)

**Requirements**:
- NFR-9.1: User actions SHALL not result in data loss
- NFR-9.2: System SHALL handle concurrent edits gracefully using optimistic locking or similar
- NFR-9.3: Board data SHALL be recoverable in case of system failure
- NFR-9.4: Real-time synchronization SHALL handle network interruptions gracefully
- NFR-9.5: Users SHALL be notified of connection issues

### 10. Security & Privacy

**Priority**: P0 (Must Have)

**Requirements**:
- NFR-10.1: Anonymous card creators' identity SHALL remain protected
- NFR-10.2: Board links SHALL be sufficiently unique to prevent guessing
- NFR-10.3: Only card creators SHALL have deletion privileges for their cards
- NFR-10.4: System SHALL prevent unauthorized modification of board structure by non-creators

## User Workflows

### Workflow 1: Creating and Sharing a Retro Board

**Actors**: Board Creator

**Preconditions**: User has access to the web platform

**Steps**:
1. User accesses the platform home page via web browser
2. User clicks "Create New Board" button on the home page
3. User enters board name
4. User selects column structure (default template or custom)
5. User optionally configures card creation limit per user (default: unlimited)
6. User optionally configures reaction limit per user (default: unlimited)
7. System creates board and generates unique shareable link
8. System assigns creator as board admin
9. User copies link and shares with team members via email, chat, etc.

**Postconditions**: Active board is accessible via shareable link, creator is admin

---

### Workflow 2: Joining and Contributing to a Retro Board

**Actors**: Team Participant

**Preconditions**: User has received board shareable link

**Steps**:
1. User clicks on shareable link in web browser
2. System prompts user to create an alias/display name
3. User enters alias and joins the board
4. User views board columns and existing cards (if any)
5. User creates card in desired column
6. User enters card content
7. User chooses whether to attach their alias or post anonymously
8. User submits card
9. Card appears on board in appropriate column with column-specific pastel color
10. Card appears in real-time for all other users viewing the board

**Postconditions**: Card is visible to all board participants, user identity is maintained for session

---

### Workflow 3: Reacting to Cards

**Actors**: Team Participant

**Preconditions**: User has accessed board, cards exist on board

**Steps**:
1. User views cards on board
2. User selects card to react to
3. User clicks thumbs up reaction symbol
4. System records reaction with user alias attribution
5. Reaction appears immediately on the card
6. Reaction count updates on card
7. Other users see the reaction update in real-time
8. User can view who has reacted by hovering/clicking reaction indicator
9. User can modify their reaction or remove it

**Postconditions**: User's reaction is recorded and visible to all participants

---

### Workflow 4: Organizing Cards with Parent-Child Relationships

**Actors**: Team Participant or Facilitator

**Preconditions**: Multiple cards exist on active board

**Steps**:
1. User views cards in a column
2. User identifies related cards
3. User drags first card onto second card to create parent-child relationship
4. System makes dragged card a child of the target card
5. Child card is visually associated with parent (indentation/border)
6. User drags additional cards onto the parent to add more children
7. System provides visual feedback during drag operation
8. User can unlink child cards by clicking unlink button on child card
9. User selects automatic sorting option (by popularity or recency) - applies to their view only
10. When sorting by popularity, parent cards sort by aggregated reaction count (own + children)
11. All participants see updated parent-child relationships in real-time (except individual sort preferences)
12. Parent-child relationships are persisted

**Postconditions**: Related cards are linked via parent-child relationships, organization is visible to all users

---

### Workflow 5: Creating Action Items

**Actors**: Team Participant or Facilitator

**Preconditions**: Feedback cards exist on board

**Steps**:
1. User identifies feedback card requiring action
2. User creates action item card in action items column
3. User enters action item details
4. User drags action item card onto the feedback card
5. System creates hyperlink on feedback card
6. Feedback card displays hyperlink/indicator showing linked action
7. Clicking hyperlink navigates to or highlights the action item

**Postconditions**: Action item is tracked and linked to source feedback, hyperlink visible on feedback card

---

### Workflow 6: Closing a Board

**Actors**: Board Admin

**Preconditions**: User is designated as board admin (creator or co-admin), board is active

**Steps**:
1. Admin decides retrospective session is complete
2. Admin clicks close board button
3. System prompts for confirmation
4. Admin confirms board closure
5. System changes board state to closed/read-only
6. Banner appears at top of board for all users indicating read-only state
7. All participants see the banner notification
8. Board content remains visible but no editing is possible (no card creation, reactions, movements)

**Postconditions**: Board is in read-only state with banner displayed, content is preserved for viewing

## Assumptions & Dependencies

### Assumptions
- Users will have internet connectivity via standard web browsers
- Users will participate in good faith
- Board links will be shared through existing communication channels (email, Slack, Teams, etc.)
- Teams will conduct retrospectives with sufficient frequency to benefit from the tool
- Users have modern web browsers with JavaScript enabled
- Average team size for retrospectives is 5-20 people
- Boards will be retained indefinitely (no automatic cleanup/archival in MVP)
- System admin capabilities for board management will be added in P3

### Dependencies
- Datastore selection and setup (database technology choice)
- Frontend framework selection for web interface
- Real-time communication technology (WebSockets, Server-Sent Events, or similar)
- Hosting infrastructure and deployment platform
- Browser compatibility requirements (modern browsers: Chrome, Firefox, Safari, Edge)

### Technical Architecture Notes
- System APIs SHALL be designed to support future native mobile applications (P3)
- API design should be platform-agnostic to enable mobile client development
- Real-time synchronization protocol should work across web and mobile platforms

### Out of Scope for Initial Release (MVP)
- Multiple reaction types (only thumbs up in MVP)
- Multi-select filtering (single selection only in MVP)
- Persistent filter preferences (filter resets on refresh)
- Advanced column management (adding, removing, reordering columns - P2)
- Manual card reordering (cards arrange only by sorting)
- Facilitation timer (P2 feature)
- Email notifications
- Any export functionality
- Commenting on cards
- File attachments to cards
- Integration with external tools (Jira, Slack, etc.)
- Mobile native applications
- Offline functionality
- Board templates beyond default retrospective format
- Advanced analytics and reporting
- Voting/polling mechanisms beyond reactions
- Many-to-many action-feedback linking
- Board cloning
- System admin features (archival, deletion)
- SSO/Enterprise authentication

## Design Decisions

The following key UX and technical decisions have been made for the MVP:

### User Interface & Interaction

1. **Active User Display**: All active user aliases are displayed at the top of the board for transparency and admin management

2. **Parent-Child Card Relationships**: Users create parent-child links by dragging one card onto another; the dragged card becomes a child of the target card. Each child has exactly one parent, but parents can have multiple children. Relationships work across columns.

3. **Card Organization**: Cards are arranged ONLY by sorting (popularity or recency) - there is no manual reordering. Drag operations are used only for creating parent-child relationships, action item linking, and moving cards across columns.

4. **Reaction Aggregation**: Parent cards display aggregated reaction count (own reactions plus all children's reactions). Standalone and child cards display only their own direct reaction count. When sorting by popularity, parent cards use their aggregated count.

5. **Action Item Linking**: Action items are linked to feedback cards by dragging the action item onto the feedback card, creating a clickable hyperlink on the feedback card

6. **Admin Designation**: Admins select co-admins from the list of active aliases shown at top of board; no limit on number of co-admins

7. **Board Closure Notification**: When board is closed, a banner appears at top indicating read-only state

8. **Card Deletion UI**: Delete button is visible only to the card creator; anonymous card creators can delete if they return with same browser cookie

9. **Sorting Behavior**: Sorting is user-specific (local view only) and not persisted across sessions. Sorting determines card display order within columns. Separate ascending/descending toggle with default of recency descending.

10. **User Filtering**: Filter pills in header allow filtering by card creator (All Users, Anonymous, specific users). Single-selection only. Children only visible with "All Users" filter. Filter is user-specific and non-persistent.

11. **Board and Column Renaming**: Admins can rename the board and column names after creation (MVP). Advanced column management (add, remove, reorder) is deferred to P2.

12. **Facilitation Timer (P2)**: Client-side countdown/count-up timer visible to all users, controlled by admins. Configurable duration (default 10 minutes). One-time sync event to start all timers simultaneously.

### Technical Decisions

13. **Limit Scope**: Card and reaction limits are enforced across the entire board (not per-column). Future P3 enhancement may add per-column limits.

14. **User Identity Management**: User alias stored in browser cookie for session continuity; anonymous card authorship protected even from admins

15. **Conflict Resolution**: Last-write-wins strategy for concurrent card movements and parent-child linking (simple, no conflict notifications)

16. **Admin Transfer**: Not supported; board creator remains creator but can designate multiple co-admins with equivalent privileges

17. **Unlinking Permissions**: Any user can unlink any child card from its parent (not restricted to creator)

18. **Filter Implementation**: Client-side filtering (no server-side filtering), single-selection model, non-persistent across sessions

## Prioritization

### P0 - Must Have (MVP)
- Web-based platform accessible via modern browsers
- Home page / landing page with "Create New Board" entry point
- Board creation with customizable columns and default templates
- Board and column renaming by admins
- Configurable card and reaction limits per user
- User alias creation for identity
- Card creation with optional anonymity
- Thumbs up reaction system with attribution
- Ability to modify/remove reactions
- Parent-child card relationships via drag-and-drop
- Reaction aggregation for parent cards (own + children)
- Unlinking child cards from parents (any user can unlink)
- Cross-column parent-child relationships
- Automatic sorting (popularity using aggregated counts, recency)
- Ascending/descending sort order toggle
- User filtering by card creator (pills in header)
- Filter options: All Users, Anonymous, current user, active users
- Move cards across columns via drag-and-drop
- Action items linked to feedback cards
- Board administration and co-admin designation
- Board closure to read-only state
- Real-time synchronization across all users
- Data persistence across sessions
- Shareable board links
- Pastel color coding by column
- Concurrent editing prevention for cards

### P1 - Should Have (Post-MVP)
- Enhanced parent-child relationship visualization
- Responsive design for tablets
- Improved sorting algorithms and filters

### P2 - Next Phase
- Facilitation timer (countdown/count-up) with admin controls
- Advanced column management (add, remove, reorder columns)
- Multiple reaction symbol types
- Board cloning for recurring retrospectives
- Action item export functionality (CSV, JSON)
- Many-to-many action-feedback linking
- Quadrant-based layouts (SWOT analysis)
- Board templates library
- Commenting on cards

### P3 - Future Enhancements
- Board reopen capability (within 24 hours of closure)
- Per-column card and reaction limits
- System admin board archival and deletion capabilities
- Full board export functionality (PDF, CSV including all cards and data)
- SSO/Enterprise authentication integration
- Mobile native applications with API support
- Advanced analytics and reporting
- Integration with external tools (Jira, Slack, Teams)
- Facilitation timer and voting tools
- File attachments to cards
- Offline functionality with sync

## Success Criteria

The MVP will be considered successful when:
1. Users can access the home page and create new retro boards via "Create New Board" button
2. Users can create and share retro boards via web browser with customizable columns and limits
3. Board admins can rename board and column names after creation
4. Users can create an alias and join boards via shareable links
5. Users can contribute feedback cards anonymously or with attribution
6. Users can give, modify, and remove thumbs up reactions with full attribution visibility
7. Users can create parent-child card relationships by dragging one card onto another
8. Parent cards display aggregated reaction count (own + children's reactions)
9. Child cards can be unlinked from parents by any user
10. Parent-child relationships work across columns
11. Users can sort cards by popularity (using aggregated counts for parents) or recency
12. Users can toggle between ascending and descending sort order
13. Users can filter cards by creator using filter pills (All Users, Anonymous, specific users)
14. Filter correctly hides children when specific user or Anonymous filter is selected
15. Users can move cards across columns while preserving parent-child relationships
16. Users can create action items linked to feedback cards
17. Board admins can designate co-admins and close boards to read-only state
18. All data persists reliably across sessions and browser refreshes
19. Multiple users (at least 20) can collaborate on the same board simultaneously with real-time updates
20. Concurrent editing conflicts are prevented without data loss
21. Board remains performant with at least 100 cards
22. System respects configured card and reaction limits per user

## Appendix

### Glossary
- **Board**: A workspace containing columns and cards for a specific retro or brainstorming session
- **Active Board**: A board that is open for editing and participation
- **Closed Board**: A board in read-only state where no modifications are allowed
- **Card**: A single feedback item or contribution placed in a column
- **Feedback Card**: A regular card created by users (subject to creation limits)
- **Action Item Card**: A special card type representing a task or follow-up, linked to feedback cards
- **Parent Card**: A card that has one or more child cards linked to it
- **Child Card**: A card linked to a parent card in a parent-child relationship
- **Standalone Card**: A card that has no parent and no children
- **Parent-Child Relationship**: A linkage between two cards where one card (child) is associated with another card (parent)
- **Column**: A vertical section of the board representing a category or question
- **Reaction**: A symbol (like thumbs up) used to express agreement or support for a card
- **Direct Reaction Count**: The number of reactions directly on a card (not including children)
- **Aggregated Reaction Count**: For parent cards, the sum of own reactions plus all children's reactions
- **Popularity**: The reaction count used for sorting (aggregated for parents, direct for others)
- **Anonymous**: A card posted without alias attribution
- **Attributed**: A card showing the creator's alias
- **Alias**: A display name chosen by the user when joining a board
- **Board Admin**: The creator of the board with full administrative privileges
- **Co-Admin**: A user designated by the board admin to have administrative privileges
- **Shareable Link**: A unique URL that provides access to a specific board
- **Real-time Synchronization**: Immediate propagation of changes to all users viewing the board
- **Drag-and-Drop**: User interaction pattern for creating parent-child relationships, linking action items, and moving cards across columns
- **Filter**: A user-specific view control that shows only cards matching selected criteria (user, anonymous, or all)
- **Filter Pills**: UI elements displayed as pills/chips in the board header representing filter options
- **Ascending Order**: Sort order from lowest to highest (oldest first for recency, fewest reactions first for popularity)
- **Descending Order**: Sort order from highest to lowest (newest first for recency, most reactions first for popularity)
- **Facilitation Timer (P2)**: A countdown/count-up timer used to manage retrospective session phases, controlled by board admins
- **Countdown Phase**: Timer phase counting down from configured duration to zero
- **Count-up Phase**: Timer phase that begins after countdown reaches zero, counting upward indefinitely

### Reference Documents
- PR/FAQ: Collaborative Retro Board Platform
- (Design documents to be created separately)
- (Technical architecture documents to be created separately)
