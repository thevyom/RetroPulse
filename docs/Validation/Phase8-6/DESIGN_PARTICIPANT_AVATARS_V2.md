# Design: Participant Avatar System v2

**Document Created**: 2026-01-02
**Phase**: 8-6
**Status**: Draft

---

## Summary of Changes

1. **Simplify status indication** - single ring meaning (not overloaded)
2. **Keep "Me" filter button** - keep in filter group, add MeSection on right with avatar style
3. **Mandatory alias prompt** - required for new users (no cookie)
4. **Remove "Manage Admins" dropdown** - use right-click context menu instead
5. **Smart scrolling** - participant avatars scroll only when exceeding available width
6. **Remove top-right MyUserCard** - MeSection in ParticipantBar replaces it
7. **Move UUID to Edit Dialog** - show UUID only when editing alias, not in header

---

## 1. Avatar Status Indicators (Simplified)

**Problem with original proposal**: Rings were overloaded (online/offline + selection state).

**Simplified approach**:

| Visual | Meaning |
|--------|---------|
| Gold/amber fill | Admin user |
| Regular fill (blue/accent) | Non-admin user |
| Green ring (2px) | Currently online |
| No ring | Offline (subtle visual difference) |
| Thicker ring + scale | Selected for filtering |

```
Online Non-Admin    Online Admin       Offline User      Selected
╭─────╮            ╭─────╮            ╭─────╮           ╭─────╮
│ JS  │ green      │ JS  │ green     │ JS  │ no        │ JS  │ thick
│blue │ ring       │gold │ ring      │gray │ ring      │     │ ring
╰─────╯            ╰─────╯           ╰─────╯           ╰─────╯
```

**Rationale**:
- Green = online is intuitive
- No ring = offline (fade effect instead of red)
- Gold fill = admin (clear, no crown needed)
- Selection uses scale + thick ring (distinct from status)

---

## 2. "Me" Avatar (Shown Separately)

**Current state**: Three filter buttons exist:
- All Users (globe icon)
- Anonymous (ghost icon)
- Me (user icon) - generic icon, not personalized

**Problem**: The "Me" button uses a generic icon, doesn't match the avatar style.

**Proposed change**:
- Keep "Me" as a separate section (not mixed with other participants)
- Replace generic icon with actual avatar showing YOUR initials
- Shows your admin status (gold) and online status (green ring)
- Clickable to filter your own cards
- Add name label and edit button

**New layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Filters        │ Other Participants       │ Me (You)            │
│ [All] [Anon]   │ [P1] [P2] [P3] ...      │ ╭JS╮ John Smith ✏️  │
│                │                          │ gold+green          │
└─────────────────────────────────────────────────────────────────┘
```

**"Me" section details**:
- Separated by a vertical divider
- Shows your avatar with initials (not generic icon)
- Gold fill if you're admin
- Green ring (you're always online to yourself)
- Your alias displayed next to avatar
- Edit button (pencil) to change alias
- Click avatar = filter to your cards

---

## 3. Alias Prompt (Mandatory for New Users)

**Trigger condition**: User has no existing session cookie for this board.

**Flow**:
```
User visits /board/xyz
    │
    ├── Has cookie? ──Yes──> Join board with stored alias
    │
    └── No cookie ──> Show Alias Modal (blocking)
                          │
                          └── Must enter alias ──> Create session ──> Join board
```

**Modal design**:
```
┌─────────────────────────────────────────┐
│              Join the Retro             │
│                                         │
│  What should we call you?               │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  This name will be visible to others.   │
│                                         │
│              [Join Board]               │
│                                         │
└─────────────────────────────────────────┘
```

**Rules**:
- Input required (1-50 characters)
- No "skip" or "anonymous" option here
- Modal cannot be dismissed without entering alias
- Validates: alphanumeric + spaces only

**Why mandatory?**
- Encourages accountability
- Better UX than auto-generated "User_abc123" names
- Users can still post anonymous cards (that's a per-card choice)

---

## 4. Admin Management (Simplified)

**Current state**: Board creator sees a "Manage Admins" button dropdown.

**Clarification**: Any admin can promote other users to admin (not just creator).

**Proposed simplification**: Remove the separate "Manage Admins" button. Instead, integrate admin actions into avatar interaction.

### New Admin Promotion Flow

**For admins viewing other participants**:
- Click avatar = filter by that user's cards (existing behavior)
- Right-click / long-press avatar = context menu with "Make Admin" option

```
Right-click on non-admin avatar:
┌─────────────────────┐
│ John Smith          │
├─────────────────────┤
│ Filter by user      │
│ Make Admin      👑  │
└─────────────────────┘
```

**Visual feedback**:
- When promoted, avatar background changes to gold immediately
- Toast notification: "John Smith is now an admin"

**Benefits**:
- Removes extra button from header
- Contextual action (right where the user is)
- Cleaner header layout
- Admins identified by gold fill (no crown icon needed)

---

## 5. Updated Component Structure

### ParticipantBar (revised)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Filter Group     │ Other Participants         │ Me (You)                         │
│ [All] [Anon] [Me]│ [P1] [P2] [P3] ...        │ ╭JS╮ John Smith  ✏️              │
│                  │ (scrolls only if overflow) │ gold+green, clickable            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Kept: "Me" filter button in filter group (NOT removed)
- Removed: AdminDropdown button (use right-click instead)
- Kept: All, Anonymous filters
- Changed: Participant avatars scroll ONLY when exceeding available width
- Added: "Me" section with personalized avatar + name + edit (right side)

### "Me" Filter Button (in filter group)
- Keep the existing "Me" icon button in the filter group
- It filters to show only your cards (same as before)
- This is SEPARATE from the "Me" section on the right

### MeSection (right side - new design)
```
┌────────────────────────────────────────┐
│  ╭────╮                                │
│ │ JS │  John Smith  ✏️                │
│  ╰────╯                                │
│  gold if admin                         │
│  green ring (always online)            │
│  clickable = filter to my cards        │
└────────────────────────────────────────┘
```

**Purpose**: Shows current user identity with avatar-style display
**Location**: Right side of ParticipantBar (after the divider)
**Click behavior**: Same as clicking "Me" filter - shows only your cards

### Remove Top-Right MyUserCard from Header

**Current state**: There's a `MyUserCard` component in the header (top-right) showing:
```
👤 John Smith (abc123...) ✏️
```

**Decision**: REMOVE this component from the header. The MeSection in ParticipantBar replaces it.

### UUID Display - Move to Edit Dialog

**Current**: UUID shown inline in header `(abc123...)`

**New**: Show UUID only in the Edit Alias dialog:
```
┌─────────────────────────────────────────┐
│           Edit Your Alias               │
│                                         │
│  Choose a display name that other       │
│  participants will see.                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ John Smith                        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Your ID: abc123def456...               │
│  (This identifies you across sessions)  │
│                                         │
│           [Cancel]  [Save]              │
└─────────────────────────────────────────┘
```

**Rationale**:
- UUID is rarely needed by users (only for debugging/support)
- Cleaner header without redundant user display
- MeSection serves same purpose with better design
- UUID still accessible when editing alias

### Participant Avatars Scrolling

**Current behavior**: Always scrollable with fixed `max-w-[280px]`

**New behavior**:
- No fixed max-width constraint
- Use CSS `overflow-x-auto` but only activate scrolling when content exceeds container
- Avatars should fit naturally; scroll only when there are too many to display

```css
/* Instead of fixed max-width */
.participant-avatars {
  display: flex;
  flex: 1;
  min-width: 0;  /* Allow shrinking */
  overflow-x: auto;
  /* Scroll only appears when needed */
}
```

### ParticipantAvatar (revised)
```tsx
<div className={cn(
  "h-9 w-9 rounded-full flex items-center justify-center",
  "text-sm font-semibold transition-all",
  // Admin status
  isAdmin ? "bg-amber-400 text-gray-800" : "bg-accent text-accent-foreground",
  // Online status
  isOnline && "ring-2 ring-green-500",
  // Selection state
  isSelected && "ring-[3px] ring-primary scale-110"
)}>
  {initials}
</div>
```

---

## Implementation Tasks

### Must Do
- [ ] Remove crown icon from avatars
- [ ] Remove presence dot indicator
- [ ] Add green ring for online status
- [ ] Add gold fill for admin users
- [ ] Increase avatar size to 36px
- [ ] Fix initials overflow (UTB-024)
- [ ] Create AliasPromptModal component
- [ ] Make alias mandatory for new users
- [ ] Keep "Me" filter button in filter group (do NOT remove)
- [ ] Create MeSection component with avatar + name + edit
- [ ] MeSection click = filter to my cards
- [ ] Remove fixed max-width on participant avatars container
- [ ] Participant avatars scroll only when exceeding available width
- [ ] Remove MyUserCard from header (top-right)
- [ ] Move UUID display to Edit Alias dialog

### Admin Management
- [ ] Remove AdminDropdown button from header
- [ ] Add right-click context menu to ParticipantAvatar
- [ ] Context menu shows "Make Admin" for non-admins (visible to admins only)
- [ ] Any admin can promote other users

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Ring overload? | Simplified - green=online only, no red |
| "Me" filter button? | KEEP in filter group (not removed) |
| MeSection on right? | YES - avatar + name + edit, clickable for filtering |
| Alias mandatory? | Yes, for users without cookie |
| Admin management? | Keep - any admin can promote others via right-click |
| Manage Admins button? | Remove - use context menu instead |
| Participant scroll? | Only when exceeding available width (no fixed max-width) |
| Top-right MyUserCard? | REMOVE - MeSection replaces it |
| UUID display? | Move to Edit Alias dialog only |

---

*Document created: 2026-01-02*
*Last updated: 2026-01-02*
