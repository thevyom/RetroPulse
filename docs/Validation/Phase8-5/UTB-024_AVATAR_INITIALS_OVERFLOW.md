# UTB-024: Avatar Initials Overflow Circle Boundary

**Document Created**: 2026-01-01
**Severity**: Medium
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Design Spec Reference**: [UI_UX_DESIGN_SPECIFICATION.md Section 4.3](../frontend/UI_UX_DESIGN_SPECIFICATION.md#43-participants-section)
**Status**: Open

---

## Problem

Two-letter initials (e.g., "JS" for "John Smith") overflow or don't fit properly within the avatar circle (38px diameter).

---

## Steps to Reproduce

1. Join a board with an alias that has two words (e.g., "John Smith")
2. View the participant bar
3. Observe the avatar with initials "JS"

---

## Current Behavior

Initials text overflows or appears cramped within the 38px circle. Text may be clipped or extend beyond the circle boundary.

---

## Expected Behavior

Two-letter initials should fit comfortably within the avatar circle with proper padding.

---

## Proposed Solution

**Option A: Decrease font size** (Recommended)
- Current: ~14px font in 38px circle
- Proposed: 12px font in 38px circle
- Ratio: Circle should be ~3x the font size for comfortable fit

**Option B: Increase avatar size**
- Current: 38px diameter
- Proposed: 44px diameter
- Con: Takes more header space, may cause overflow issues sooner

**Recommendation**: Option A - decrease font to 12px

---

## Design Spec Update Required

Update Section 4.3 Avatar Display:
```
- **Active User Avatar**: Circle (38px diameter)
  - Font size: 12px bold
  - Letter spacing: -0.5px (tighter for two letters)
```

---

## Acceptance Criteria

- [ ] Two-letter initials fit within avatar circle with visible padding
- [ ] Single-letter initials remain centered and readable
- [ ] Font size is consistent across all avatars
- [ ] No text clipping or overflow

---

## CSS Implementation

```css
.avatar-initials {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.5px;
  line-height: 1;
  text-transform: uppercase;
}
```

---

*Bug identified during user testing session - 2026-01-01*
