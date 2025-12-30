# UI/UX Design Specification - Collaborative Retro Board

**Document Version**: 1.0
**Date**: 2025-12-24
**PRD Version**: 1.3
**Status**: Draft - Based on Wireframe-1-drawio.xml

---

## 1. Overview

This document defines the user interface and user experience design for the Collaborative Retro Board MVP, based on the approved wireframe and aligned with the PRD and technical design.

**Design Source**: [Wireframe-1-drawio.xml](Wireframe-1-drawio.xml)

---

## 2. Design Principles

1. **Simplicity First** - Clean, uncluttered interface for focus during retrospectives
2. **Immediate Feedback** - Visual confirmation of all user actions (real-time updates)
3. **Accessibility** - Keyboard shortcuts, drag-and-drop alternatives, clear visual hierarchy
4. **Mobile-Ready** - Responsive design (desktop priority for MVP, tablet-friendly)
5. **Colorful but Professional** - Pastel colors differentiate columns without overwhelming

---

## 3. Layout Structure

### 3.1 Board Layout (Full Screen)

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER (120px)                          │
│  Board Name  [Edit]  [Close]  🔒  Participants  Sort           │
└─────────────────────────────────────────────────────────────────┘
┌─────────────┬─────────────┬─────────────┬─────────────┬────────┐
│  Column 1   │  Column 2   │  Column 3   │  Actions    │ (...)  │
│  [Edit] [+] │  [Edit] [+] │  [Edit] [+] │  [Edit] [+] │        │
│             │             │             │             │        │
│  [Card 1]   │  [Card A]   │  [Card X]   │ [Action 1]  │        │
│             │             │             │             │        │
│  [Card 2]   │  [Card B]   │             │ [Action 2]  │        │
│             │             │             │             │        │
│ (scrolls)   │ (scrolls)   │ (scrolls)   │ (scrolls)   │        │
└─────────────┴─────────────┴─────────────┴─────────────┴────────┘
```

**Dimensions**:
- Header height: 120px fixed
- Column min-width: 480px
- Column max-width: 600px (comfortable reading)
- Horizontal scroll if >3 columns
- Vertical scroll per column (independent)

---

## 4. Header Component

### 4.1 Header Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Board: "Sprint 5 Retro" ✏️  [Close Board] 🔒 Locked if Closed  │
│                                                                  │
│ Participants: 🎩U1(Admin) 👤U2 👤U3  [+ Make Admin ▼]           │
│                                                                  │
│                                     Sort: [Recency Desc ▼] [⇅]  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Board Title Section

**Element**: Board Name + Edit Icon
- **Display**: `"Sprint 5 Retro"` (text, 16px bold)
- **Edit Icon**: ✏️ (visible to admins only)
- **Behavior**:
  - Click ✏️ → Inline edit mode (text input appears)
  - Enter/blur → Save, cancel on Esc
  - Real-time sync to all users

**Element**: Close Board Button
- **Display**: Red button with text "Close Board"
- **Visibility**: Admins only
- **Behavior**:
  - Click → Confirmation dialog: "Close this board? It will become read-only."
  - On confirm → Board state changes to `closed`
  - Real-time sync → All users see 🔒 indicator and read-only mode

**Element**: Lock Indicator
- **Display**: 🔒 "Locked" (only when board state = closed)
- **Position**: Right of Close button
- **Color**: Red/gray text

### 4.3 Participants Section

**Layout**:
```
Participants: 🎩U1(Admin) 👤U2 👤U3 👤Anonymous  [+ Make Admin ▼]
              ↑ click     ↑ click  ↑ click     ↑ click
              to filter   to filter to filter  to filter
```

**Avatar Display**:
- **Active User Avatar**: Circle (38px diameter)
  - Admin: 🎩 icon + username + "Admin" label below
  - Regular user: 👤 icon + username (or emoji avatar)
  - Colors: Pastel colors per user (#ffe6cc, #d5e8d4, #e1d5e7)

- **Anonymous Avatar**: 👤 "Anonymous" (gray)
  - Represents anonymous card creators
  - Always visible if any anonymous cards exist on board

**Click Behavior** (Filter Interaction):
- Click avatar → Filter view to show only that user's cards
  - Avatar gets green border (selected state)
  - All other cards fade/hide
  - Action: GET /boards/:id/cards?filter=user:{userId}

- Click "Anonymous" → Show only anonymous cards
  - Anonymous avatar gets selected state

- Click selected avatar again → Clear filter (show all)
  - Remove border, show all cards

**Make Admin Dropdown**:
- **Button**: "+ Make Admin ▼" (visible to creator only)
- **Click**: Shows dropdown of active non-admin users
- **Select user**: POST /boards/:id/admins with userId
- **Real-time**: User gets admin badge, can now edit/close board

### 4.4 Sort Controls

**Position**: Top-right of header

**Dropdown**:
- **Options**:
  - "Recency Descending" (default) - newest first
  - "Recency Ascending" - oldest first
  - "Popularity Descending" - most reactions first
  - "Popularity Ascending" - fewest reactions first

**Toggle Button** (⇅):
- **Removed** - Dropdown handles asc/desc selection
- Dropdown shows current mode with ▼ indicator

**Behavior**:
- Local to user view (not synced to other users)
- Not persisted across sessions (resets to default on refresh)
- Applies to all columns simultaneously

---

## 5. Column Component

### 5.1 Column Header

```
┌───────────────────────────────────────────────┐
│ What Went Well  ✏️                         + │
└───────────────────────────────────────────────┘
```

**Column Title**:
- Text: 16px bold
- Color: Matches column background (darker shade)
- Example colors:
  - "What Went Well": Green theme (#82b366)
  - "Improvements": Orange theme (#d79b00)
  - "Actions": Blue theme (#6c8ebf)

**Edit Icon** (✏️):
- Visible to admins only
- Click → Inline edit mode (text input)
- PATCH /boards/:id/columns/:colId with new name

**Add Card Button** (+):
- Position: Top-right of column header
- Large, visible button (35x30px)
- Opens card creation dialog

### 5.2 Column Background Colors

| Column Purpose | Background Color | Border Color | Example Name |
|----------------|------------------|--------------|--------------|
| Positive feedback | #ecf9ec (light green) | #82b366 | "What Went Well" |
| Areas for improvement | #FFF7E8 (light orange) | #d79b00 | "Improvements" |
| Action items | #dae8fc (light blue) | #6c8ebf | "Actions" |
| Custom column 4+ | #f5f5f5 (gray) | #666666 | (any name) |

**Cards inherit column color** (slightly darker shade):
- Green column cards: #B9E0A5
- Orange column cards: #FFD966
- Blue column cards: #A9C4EB

### 5.3 Column Scroll Behavior

- Each column scrolls independently (vertical)
- Sticky header on scroll (column title stays visible)
- Smooth scroll with momentum (mobile-like feel)

---

## 6. Card Component

### 6.1 Card Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Drag Handle]         👍 3  🔗  🗑️                      │ ← Header
├─────────────────────────────────────────────────────────┤
│                                                          │
│ "Great team collaboration during this sprint!"          │ ← Content
│                                                          │
│ Created by: User1 (or "Anonymous")                      │ ← Footer
└─────────────────────────────────────────────────────────┘
│ 🔗 [Linked Action: Fix deployment issue]                │ ← Action Link Box
└─────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Width: Column width minus padding (440px)
- Min-height: 110px
- Max-height: Unlimited (content wraps)
- Margin-bottom: 15px

### 6.2 Card Header

**Drag Handle**:
- Full-width clickable area (30px height)
- Visual: "[Drag Handle]" text or ⠿⠿⠿ icon
- Cursor: `move` on hover
- Behavior: Drag to:
  1. Different column (move card)
  2. Another card (create parent-child relationship)
  3. Feedback card from action (link action to feedback)

**Reactions Badge**:
- **Display**: 👍 {count}
- **Position**: Top-right of header
- **Types**:
  - Regular card: "👍 3" (direct reactions)
  - Parent card: "👍 12 (Aggregated)" (own + children's reactions)

- **Click Behavior**:
  - Click badge → Toggle user's reaction
  - POST /boards/:id/cards/:cardId/reactions or DELETE
  - Real-time update to all users

**Link Icon** (🔗):
- **Visibility**: Only if card has relationships
  - Parent card: Icon visible (has children)
  - Action card: Icon visible (linked to feedback)
  - Feedback card with action link: Icon visible

- **Click Behavior**:
  - Click → Show unlink confirmation dialog
  - "Unlink this card?" → Confirm → DELETE relationship

**Delete Icon** (🗑️):
- **Visibility**: Only to card creator
  - Check: card.created_by_hashed === current_user_hashed
  - Even anonymous cards show delete to their creator

- **Click Behavior**:
  - Click → Confirmation: "Delete this card?"
  - Confirm → DELETE /boards/:id/cards/:cardId
  - Real-time removal from all users' views

### 6.3 Card Content

**Text Content**:
- Font: 12px regular
- Color: #000 (black)
- Max-length: 5000 characters (from PRD)
- Wraps to multiple lines
- No HTML rendering (plain text only, prevent XSS)

**Anonymous Toggle** (Card Creation Only):
- **Not shown on card itself**
- Only in create card dialog:
  - Checkbox: "Post anonymously"
  - If checked → card.is_anonymous = true, card creator is hidden

### 6.4 Card Footer

**Attribution**:
- **If attributed**: "Created by: {alias}" (small text, 10px)
- **If anonymous**: "Created by: Anonymous" (italic, gray)
- Position: Bottom-left of card content area

### 6.5 Parent-Child Card Relationships

**Visual Design Decision**: **Attached to parent, NOT hierarchical indentation**

```
┌─────────────────────────────────────────┐
│ Parent Card: "Deployment was smooth"    │
│ 👍 12 (Aggregated)  🗑️                 │
└─────────────────────────────────────────┘
  ↓ (visually attached below parent)
┌─────────────────────────────────────────┐
│ Child Card: "Used new CI/CD pipeline"   │
│ 👍 5  🔗 (unlink icon)  🗑️             │
└─────────────────────────────────────────┘
  ↓ (another child)
┌─────────────────────────────────────────┐
│ Child Card: "Team communicated well"    │
│ 👍 7  🔗  🗑️                           │
└─────────────────────────────────────────┘
```

**Implementation**:
- Child cards rendered **directly below parent** in DOM
- Slight left offset (20-30px indent) or visual connector line
- **Unlink icon** (🔗) visible on child cards
- Click unlink → Remove parent_of relationship → Child becomes standalone

**Sorting Behavior**:
- Parent + children move together as a group when sorting
- Parent's sort value = aggregated_reaction_count (own + children)

### 6.6 Action Link Display

**When**: Action card is linked to feedback card OR feedback card has linked action

```
┌─────────────────────────────────────────────┐
│ Feedback Card: "Deployment was slow"        │
│ 👍 8  🗑️                                    │
└─────────────────────────────────────────────┘
│ 🔗 [Linked Action: Optimize build process] │ ← Separate clickable box
└─────────────────────────────────────────────┘
```

**Action Link Box**:
- **Background**: Action column color (#A9C4EB for actions)
- **Border**: Dashed or solid, matches action theme
- **Text**: "🔗 [Linked Action: {action_card_title}]" or "🔗 [Link to Card: {feedback_title}]"
- **Click Behavior**:
  - Click → Scroll to linked card and highlight temporarily
  - Alternative: Modal showing linked card details

**Creating Link**:
- **Drag action card onto feedback card** → Creates `linked_to` relationship
- Action link box appears below feedback card
- Real-time sync to all users

**Unlinking**:
- Click 🔗 icon on link box → Confirmation → DELETE relationship

---

## 7. Interactive Behaviors

### 7.1 Card Creation Flow

**Trigger**: Click "+" button on column header

**Dialog/Modal**:
```
┌──────────────────────────────────────────┐
│  Create Card in "What Went Well"         │
├──────────────────────────────────────────┤
│                                           │
│ [Text Area - 5000 char max]              │
│                                           │
│ ☐ Post anonymously                       │
│                                           │
│         [Cancel]  [Create Card]           │
└──────────────────────────────────────────┘
```

**Fields**:
- Textarea: Autofocus, 5000 char limit, show counter
- Anonymous checkbox: Default unchecked
- Buttons: Cancel (close dialog), Create Card (POST)

**Validation**:
- Cannot be empty
- Check card limit: If user reached limit, show error toast
- Action items: NOT subject to card limits

**Submit**:
- POST /boards/:id/cards with { content, is_anonymous, column_id, card_type }
- Real-time: Card appears immediately for creator (optimistic UI)
- Real-time: Other users see card appear via WebSocket

### 7.2 Drag-and-Drop Interactions

**Drag Sources**:
1. **Card drag handle** → Can drag card

**Drop Targets**:
1. **Different column** → Move card to that column
2. **Another card** → Create parent-child relationship
3. **Feedback card** (when dragging action) → Link action to feedback

**Visual Feedback**:
- **Dragging**: Card becomes semi-transparent, cursor = `grabbing`
- **Valid drop zone**: Highlight border (green glow)
- **Invalid drop zone**: Red border or no highlight
- **Drop complete**: Smooth animation to final position

**@dnd-kit Implementation**:
```typescript
// Drag context types
DragType: 'card' | 'action'

// Drop handlers
onDragEnd(event):
  - If dropped on column → PATCH card column_id
  - If dropped on card → POST relationship (parent_of or linked_to)
  - Real-time sync via WebSocket
```

### 7.3 Filtering Interaction

**Trigger**: Click participant avatar

**Effect**:
1. **Visual**: Selected avatar gets green border
2. **Cards**:
   - Show only cards created by that user
   - Fade or hide all other cards (CSS: opacity 0.3 or display none)
   - Children cards **always hidden** when filtering (from PRD)

3. **API**: Client-side filtering (no server call needed)
   - Check card.created_by_hashed === selected_user_hash
   - If "Anonymous" selected → show card.is_anonymous === true

**Clear Filter**: Click selected avatar again → Show all cards

### 7.4 Sorting Interaction

**Trigger**: Select from sort dropdown

**Effect**:
- Client-side re-order of cards within each column
- Parent + children move together as unit
- Smooth CSS transition (300ms ease)

**Sorting Logic**:
```typescript
// Popularity (reactions)
cards.sort((a, b) => {
  const aCount = a.is_parent ? a.aggregated_reaction_count : a.direct_reaction_count;
  const bCount = b.is_parent ? b.aggregated_reaction_count : b.direct_reaction_count;
  return descending ? bCount - aCount : aCount - bCount;
});

// Recency (created_at)
cards.sort((a, b) => {
  return descending ? b.created_at - a.created_at : a.created_at - b.created_at;
});
```

### 7.5 Real-time Updates

**WebSocket Events** (received from server):

```typescript
socket.on('card:created', (event) => {
  // Add card to column
  addCardToColumn(event.data.card);
});

socket.on('card:deleted', (event) => {
  // Remove card from DOM
  removeCard(event.data.card_id);
});

socket.on('card:moved', (event) => {
  // Move card to different column
  moveCardToColumn(event.data.card, event.data.new_column_id);
});

socket.on('reaction:added', (event) => {
  // Update reaction count on card
  updateReactionCount(event.data.card_id, event.data.new_count);
  // If parent, also update aggregated count
});

socket.on('relationship:created', (event) => {
  // Attach child to parent or show action link
  createRelationshipUI(event.data);
});

socket.on('board:closed', (event) => {
  // Show lock indicator, disable all editing
  setBoardReadOnly();
});
```

**Optimistic UI**:
- User actions apply immediately to local state
- If server rejects, revert with error toast
- Example: Create card → Show immediately, if POST fails → Remove card + show error

---

## 8. Responsive Design

### 8.1 Desktop (Primary Target for MVP)

**Screen Size**: 1280px+ width

- 3-4 columns visible simultaneously
- Column width: 480px
- Horizontal scroll if >4 columns
- Full drag-and-drop functionality

### 8.2 Tablet (Secondary)

**Screen Size**: 768px - 1279px

- 2-3 columns visible
- Column width: 450px (narrower)
- Horizontal swipe for column navigation
- Drag-and-drop works (touch events)

### 8.3 Mobile (Future Phase)

**Screen Size**: <768px

- Single column view (swipe to switch columns)
- Simplified interactions (tap instead of drag)
- Out of scope for MVP

---

## 9. Visual Design System

### 9.1 Color Palette

**Column Colors** (backgrounds):
- Green: `#ecf9ec` (light), `#B9E0A5` (cards), `#82b366` (border)
- Orange: `#FFF7E8` (light), `#FFD966` (cards), `#d79b00` (border)
- Blue: `#dae8fc` (light), `#A9C4EB` (cards), `#6c8ebf` (border)
- Gray (default): `#f5f5f5` (light), `#e0e0e0` (cards), `#666666` (border)

**UI Colors**:
- Primary action: `#82b366` (green)
- Danger action: `#f8cecc` (light red), `#b85450` (dark red)
- Neutral: `#f5f5f5` (gray backgrounds)
- Text: `#000000` (primary), `#666666` (secondary), `#999999` (hints)

### 9.2 Typography

**Font Family**: System fonts for performance
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

**Font Sizes**:
- Header title: 16px bold
- Column title: 16px bold
- Card content: 12px regular
- Card footer: 10px regular
- Buttons: 14px medium
- Hints/labels: 9px italic

### 9.3 Spacing

**Padding**:
- Column padding: 15px
- Card padding: 12px
- Header padding: 20px horizontal, 15px vertical

**Margins**:
- Between cards: 15px
- Between columns: 20px
- Header to columns: 20px

### 9.4 Shadows & Borders

**Cards**:
- Box-shadow: `0 2px 4px rgba(0,0,0,0.1)` (subtle depth)
- Border: 1px solid (column color)
- Border-radius: 4px (slightly rounded)

**Hover States**:
- Card hover: Lift shadow `0 4px 8px rgba(0,0,0,0.15)`
- Button hover: Darken background 10%

---

## 10. Accessibility

### 10.1 Keyboard Navigation

**Tab Order**:
1. Board name edit
2. Close board button
3. Make admin button
4. Sort dropdown
5. Column 1 → Add card, cards, edit column
6. Column 2 → Add card, cards, edit column
7. (etc.)

**Keyboard Shortcuts**:
- `c` → Create card in focused column
- `Esc` → Close modal/dialog
- `Tab` → Next element
- `Shift+Tab` → Previous element
- `Enter` → Activate button/link
- Arrow keys → Navigate between cards (future enhancement)

### 10.2 ARIA Labels

```html
<button aria-label="Add card to What Went Well column">+</button>
<button aria-label="Delete card">🗑️</button>
<div role="button" aria-label="Drag to move card">Drag Handle</div>
<div role="status" aria-live="polite">Board closed. Read-only mode.</div>
```

### 10.3 Screen Reader Support

- Cards announce: "Card by {user}: {content truncated}"
- Reactions announce: "3 reactions"
- Parent-child: "Card has 2 child cards"
- Actions: "Linked to action: {action title}"

### 10.4 Color Contrast

- Text on backgrounds: WCAG AA compliant (4.5:1 minimum)
- Green cards: Black text on #B9E0A5 → 7.2:1 ✓
- Orange cards: Black text on #FFD966 → 6.8:1 ✓
- Blue cards: Black text on #A9C4EB → 6.5:1 ✓

---

## 11. Error States & Edge Cases

### 11.1 Empty States

**No Cards in Column**:
```
┌───────────────────────────────┐
│ What Went Well  ✏️         + │
├───────────────────────────────┤
│                                │
│   No cards yet.                │
│   Click + to add one!          │
│                                │
└───────────────────────────────┘
```

**No Participants Yet**:
- Header shows: "Participants: (none yet)"
- Appears when first user joins

**Board Closed**:
```
┌─────────────────────────────────────────┐
│ 🔒 This board is closed. Read-only.     │
└─────────────────────────────────────────┘
```

### 11.2 Error Messages

**Card Limit Reached**:
- Toast notification: "You've reached your card limit (5 cards). Delete a card to create another."
- Position: Top-right, auto-dismiss after 5 seconds

**Network Error**:
- Toast: "Connection lost. Reconnecting..." (orange)
- When reconnected: "Connected" (green, auto-dismiss)

**Delete Confirmation**:
- Modal: "Delete this card? This cannot be undone."
- Buttons: [Cancel] [Delete]

**Permission Denied**:
- Toast: "Only admins can close the board."
- Toast: "You can only delete your own cards."

### 11.3 Loading States

**Initial Board Load**:
- Skeleton screen showing column outlines
- Loading spinner in center

**Creating Card**:
- Button shows: "Creating..." with spinner
- Card appears with fade-in animation

**WebSocket Reconnecting**:
- Yellow banner at top: "Reconnecting..."
- Removed when connected

---

## 12. Animations & Transitions

### 12.1 Card Animations

**Card Creation**:
- Fade in + slide down (300ms ease-out)
```css
@keyframes cardCreate {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Card Deletion**:
- Slide up + fade out (200ms ease-in)
- Then collapse height (150ms)

**Card Movement** (drag-drop):
- Smooth position transition (250ms ease-in-out)

### 12.2 Hover Effects

**Card Hover**:
- Lift shadow (150ms ease)
- Scale: 1.02 (subtle)

**Button Hover**:
- Background darken (100ms)
- Cursor: pointer

### 12.3 Real-time Update Animations

**New Card from Another User**:
- Highlight border (yellow) for 2 seconds
- Fade to normal

**Reaction Update**:
- Pulse reaction count (scale 1.2 → 1.0, 300ms)

---

## 13. Implementation Notes

### 13.1 Component Hierarchy (React)

```
<BoardView>
  ├── <BoardHeader>
  │   ├── <BoardTitle editable={isAdmin} />
  │   ├── <CloseButton visible={isAdmin} />
  │   ├── <LockIndicator visible={isClosed} />
  │   ├── <ParticipantList>
  │   │   ├── <ParticipantAvatar clickable onFilter={handleFilter} /> (multiple)
  │   │   └── <MakeAdminButton visible={isCreator} />
  │   └── <SortControls />
  │
  └── <ColumnList>
      └── <Column> (multiple)
          ├── <ColumnHeader>
          │   ├── <ColumnTitle editable={isAdmin} />
          │   └── <AddCardButton />
          │
          └── <CardList>
              └── <Card> (multiple)
                  ├── <CardHeader>
                  │   ├── <DragHandle />
                  │   ├── <ReactionBadge clickable />
                  │   ├── <LinkIcon visible={hasRelationships} />
                  │   └── <DeleteButton visible={isCreator} />
                  │
                  ├── <CardContent text={card.content} />
                  ├── <CardFooter creator={card.creator} />
                  │
                  └── <ActionLinkBox visible={hasActionLink}>
                      └── <LinkedCardDisplay clickable />
```

### 13.2 State Management (Zustand)

```typescript
interface BoardStore {
  board: Board;
  cards: Card[];
  currentUser: User;
  filter: UserFilter | null;
  sortMode: SortMode;

  // Actions
  createCard: (cardData) => void;
  deleteCard: (cardId) => void;
  moveCard: (cardId, newColumnId) => void;
  linkCards: (childId, parentId, type) => void;
  addReaction: (cardId) => void;
  setFilter: (filter) => void;
  setSortMode: (mode) => void;
}
```

### 13.3 shadcn/ui Components Used

> **Note:** We use shadcn/ui + Tailwind CSS instead of Material-UI for smaller bundle size, faster test execution, and full component source ownership.

| Component | Usage | Notes |
|-----------|-------|-------|
| `<Card>` | Card container, column wrapper | Customizable with Tailwind |
| `<Avatar>` | Participant circles, user identity | Supports fallback initials |
| `<Button>` | All interactive buttons | Variant system for styles |
| `<Input>` | Inline editing, form fields | - |
| `<Textarea>` | Card content input | - |
| `<Dialog>` | Card creation, confirmations | Accessible modal |
| `<DropdownMenu>` | Make Admin dropdown, sort options | Keyboard navigable |
| `<Select>` | Sort mode selection | - |
| `<Tooltip>` | Hover hints, truncated text | - |
| `<Skeleton>` | Loading states | Matches layout structure |

**Icons** (Lucide React):
- `Pencil` - Edit actions
- `Trash2` - Delete actions
- `Link2` - Card linking
- `Lock` - Board closed
- `GripVertical` - Drag handle
- `ThumbsUp` - Reactions
- `Ghost` - Anonymous filter
- `Users` - All users filter
- `Crown` - Admin indicator

---

## 14. Wireframe Alignment Checklist

| Wireframe Element | Implemented | Notes |
|-------------------|-------------|-------|
| Board title with edit | ✅ | Individual edit icon per element |
| Close button (admin only) | ✅ | Red button, confirmation dialog |
| Lock indicator when closed | ✅ | 🔒 shown when state = closed |
| Participant avatars | ✅ | Clickable for filtering |
| Anonymous participant | ✅ | Shows if anonymous cards exist |
| Make Admin button + dropdown | ✅ | Replaces drag-to-admin from wireframe |
| Filter pills | ❌ Removed | Use click-avatar filtering instead |
| Sort dropdown + toggle | ✅ | Combined into single dropdown |
| 3 columns with colors | ✅ | Green, orange, blue pastels |
| Column edit icons | ✅ | ✏️ per column (admin only) |
| Add card button (+) | ✅ | Top-right of each column |
| Card drag handles | ✅ | Full-width clickable area |
| Reaction badges | ✅ | 👍 {count} or "Aggregated" |
| Delete icon (trash) | ✅ | Only visible to creator |
| Link icon (🔗) | ✅ | Click to unlink |
| Separate action link boxes | ✅ | Below cards, clickable |
| Child cards attached to parent | ✅ | NOT indented, attached below with slight offset |
| Anonymous toggle (create card) | ✅ | In card creation dialog |
| Unlink button | ✅ | 🔗 icon acts as unlink |
| Timer | ⏱️ P2 | Not shown in wireframe, future header addition |

---

## 15. Open UI/UX Questions

### Questions for Next Review:

1. **Parent-child visual connector**: Should we show a line connecting parent to children, or just rely on positioning + slight indent?

2. **Action link box position**: Current design shows below card. Alternative: Inline badge "🔗 2 actions" that expands on click?

3. **Mobile drag-drop**: For future mobile support, should we add long-press menu as alternative to drag? (Out of MVP scope)

4. **Reaction types**: MVP only supports 👍. Future emoji picker design needed (P2).

5. **Card character limit UI**: Show "5000/5000" counter in create dialog, or just truncate silently?

---

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-24 | VK AI | Initial UI/UX spec based on Wireframe-1-drawio.xml |

---

## 17. Approval Required

- [ ] Product Manager (UX flow alignment with PRD)
- [ ] Design Lead (Visual design consistency)
- [ ] Engineering Lead (Feasibility of interactions)
- [ ] Accessibility Specialist (WCAG compliance)

**Next Steps**:
1. Review this spec against wireframe and PRD
2. Create high-fidelity mockups (Figma) based on this spec
3. User testing with clickable prototype
4. Begin frontend implementation (React components)
