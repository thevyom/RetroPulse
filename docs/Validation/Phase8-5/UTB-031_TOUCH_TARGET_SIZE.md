# UTB-031: Touch Target Size Too Small

**Document Created**: 2026-01-02
**Severity**: Medium (P1)
**Component**: Reaction button
**Status**: Open
**Source**: Phase 8-4 QA Report - 1 failing test

---

## Problem

Reaction button touch target is 28px, below the required 32px minimum for mobile accessibility.

---

## Failing Test (from Phase 8-4)

| Test File | Test Name | Error |
|-----------|-----------|-------|
| 08-tablet-viewport.spec.ts:80 | touch target sizes are adequate | Expected: >= 32, Received: 28 |

---

## WCAG Requirement

WCAG 2.1 Success Criterion 2.5.5 (Target Size):
- Interactive elements should have a minimum touch target of 44x44 CSS pixels (AAA)
- At minimum, 32x32 pixels is acceptable for most mobile usability

---

## Current State

```
Reaction button size: 28px x 28px
Required minimum: 32px x 32px
```

---

## Solution

Update reaction button CSS to ensure minimum touch target:

```css
/* Before */
.reaction-button {
  /* implicitly 28px */
}

/* After */
.reaction-button {
  min-width: 32px;   /* or min-w-8 in Tailwind */
  min-height: 32px;  /* or min-h-8 in Tailwind */
}
```

Or in Tailwind:
```tsx
<button className="min-w-8 min-h-8 ...">
  {/* reaction icon */}
</button>
```

---

## Files to Update

- `frontend/src/features/card/components/RetroCard.tsx` - Reaction button
- Or wherever the reaction/like button component is defined

---

## Acceptance Criteria

- [ ] Reaction button is at least 32x32 pixels
- [ ] Button remains visually appropriate (not oversized)
- [ ] E2E tablet viewport test passes
- [ ] Touch interactions work well on mobile/tablet

---

*Bug from Phase 8-4 QA Report - 2026-01-02*
