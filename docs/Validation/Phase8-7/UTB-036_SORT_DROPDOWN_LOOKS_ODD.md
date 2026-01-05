# UTB-036: Sort Dropdown Visual Styling Issues

**Document Created**: 2026-01-03
**Severity**: Low (UI Polish)
**Status**: Open

---

## Problem Summary

The "Sort by: Newest" dropdown looks visually odd/out of place in the UI.

---

## Current Issues

1. **Label placement** - "Sort by:" text positioning feels awkward
2. **Dropdown styling** - May not match overall UI style
3. **Arrow indicator** - Down arrow might be too prominent or misaligned

---

## Screenshot Analysis

```
┌─────────────────┐
│  Sort   Newest ↓│
│  by:            │
└─────────────────┘
```

The two-line label "Sort by:" looks cramped and the dropdown feels disconnected.

---

## Proposed Solutions

### Option A: Inline Label
```
Sort by: [Newest ↓]
```
Single line, cleaner appearance.

### Option B: Icon + Dropdown
```
🔽 [Newest]
```
Replace text label with sort icon.

### Option C: Integrated Button Style
```
[↕ Newest]
```
Sort icon integrated into dropdown button.

---

## Acceptance Criteria

- [ ] Sort dropdown has consistent styling with rest of UI
- [ ] Label and dropdown are visually balanced
- [ ] Arrow indicator is appropriately sized
- [ ] Overall appearance is polished

---

*Bug identified during user testing - 2026-01-03*
