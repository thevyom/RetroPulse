# Bug Fix Report: UTB-021

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-021 |
| Title | Avatar initials should use first letters of first and last name |
| Severity | Low |
| Status | Fixed |
| Fixed Date | 2026-01-01 |
| Fixed By | Software Developer Agent |

## Description

Avatar initials were incorrectly calculated for names with more than two words. The previous implementation took the first letter of the first word and the first letter of the second word, resulting in incorrect initials for names like "John A. Smith" (displayed "JA" instead of "JS").

## Root Cause Analysis

The original `getInitials` function had the following logic:

```typescript
function getInitials(alias: string): string {
  const words = alias.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

**Issues identified:**

1. For multi-word names, it always took `words[1][0]` (second word) instead of the last word
2. No handling for empty strings or whitespace-only input
3. Function was not exported, preventing direct unit testing

## Solution Implemented

Updated the `getInitials` function with proper first + last word extraction:

```typescript
/**
 * Extracts initials from an alias.
 * - Single word: first two letters uppercase ("John" -> "JO")
 * - Multiple words: first letter of first + first letter of last word ("John A. Smith" -> "JS")
 */
export function getInitials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return '??';

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return '??';
  }

  if (words.length === 1) {
    // Single word: first two letters
    return words[0].slice(0, 2).toUpperCase();
  }

  // Multiple words: first letter of first word + first letter of last word
  const firstInitial = words[0][0];
  const lastInitial = words[words.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}
```

**Key changes:**

1. Uses `words[words.length - 1]` to get last word instead of `words[1]`
2. Added empty string and whitespace handling with `??` fallback
3. Exported the function for direct unit testing
4. Added JSDoc documentation

## Files Modified

| File | Change Type |
|------|-------------|
| `frontend/src/features/participant/components/ParticipantAvatar.tsx` | Modified |
| `frontend/tests/unit/features/participant/components/ParticipantAvatar.test.tsx` | Created |

## Code Review Comments

| Type | Comment |
|------|---------|
| (praise) | Excellent JSDoc documentation added |
| (praise) | Good defensive programming with edge case handling |
| (praise) | Function exported for testability |
| (nit) | Filter for empty words is safe but slightly redundant |

## Test Results

### Unit Tests Created

15 tests for `getInitials` function:

**Single word names:**
- [x] First two letters uppercase for single word ("John" -> "JO")
- [x] First two letters uppercase for lowercase name ("alice" -> "AL")
- [x] Handle single character name ("A" -> "A")
- [x] Handle two character name ("Jo" -> "JO")

**Multiple word names:**
- [x] Two words ("John Smith" -> "JS")
- [x] Three words ("John A. Smith" -> "JS")
- [x] Four words ("Mary Jane Watson Parker" -> "MP")
- [x] Lowercase multi-word names
- [x] Mixed case multi-word names

**Edge cases:**
- [x] Empty string -> "??"
- [x] Whitespace only -> "??"
- [x] Extra whitespace between words
- [x] Leading/trailing whitespace
- [x] Tabs and newlines
- [x] Names with middle initials and periods

### Test Execution

```
npm run test:run -- tests/unit/features/participant/components/ParticipantAvatar.test.tsx

Test Files  1 passed (1)
Tests       29 passed (29)
Duration    9.05s
```

## Verification Checklist

- [x] Single word names display first two letters (e.g., "Alice" -> "AL")
- [x] Two word names display first + last initials (e.g., "John Smith" -> "JS")
- [x] Three+ word names display first + last initials (e.g., "John A. Smith" -> "JS")
- [x] Empty/whitespace input displays "??"
- [x] All initials are uppercase
- [x] Unit tests pass (15/15)
- [x] Integration tests pass (4/4 initials display tests)
- [x] No regressions in ParticipantBar tests (24/24)
- [x] Code review completed

## Related Bugs

- UTB-022: Tooltip should show full name on avatar hover (fixed in same session)
