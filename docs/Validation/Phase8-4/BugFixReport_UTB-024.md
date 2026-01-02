# Bug Fix Report: UTB-024

## Bug Information

| Field | Value |
|-------|-------|
| Bug ID | UTB-024 |
| Title | Child Card Unlink Button Does Not Work |
| Severity | High |
| Component | CardAPI, useCardViewModel |
| PRD Reference | FR-2.3.2 |
| Status | Fixed |
| Fixed Date | 2026-01-02 |

## Problem Description

When clicking the unlink button (Link2 icon) on a child card, nothing happened. The card remained linked to its parent with no error message displayed to the user.

### Steps to Reproduce

1. Create two cards in the same or different columns
2. Drag one card onto another to create a parent-child relationship
3. On the child card, click the Link2 (unlink) icon
4. Observe that the card does not unlink

### Expected Behavior

- The API call should be made to unlink the cards
- The child card should become a standalone card
- The parent's children array should be updated
- The UI should reflect changes immediately

### Actual Behavior

- The button appeared clickable
- No error message was shown
- The card remained linked to the parent
- The UI did not update

## Root Cause Analysis

### Code Flow Traced

```
RetroCard.tsx:356 -> handleUnlink()
  -> onUnlinkFromParent()
    -> RetroColumn.tsx:257 -> onUnlinkChild(card.id)
      -> RetroBoardPage.tsx:303 -> cardVM.handleUnlinkChild(childId)
        -> useCardViewModel.ts:651 -> handleUnlinkChild(childId)
          -> CardAPI.unlinkCards(parentId, { target_card_id: childId, link_type: 'parent_of' })
```

### Root Cause

The issue was in `CardAPI.unlinkCards()` which used axios DELETE with a request body:

```typescript
// BEFORE (broken)
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.delete(`/cards/${sourceCardId}/link`, { data });
}
```

**Why this failed:**

1. The HTTP DELETE method technically supports request bodies, but many implementations strip or ignore them
2. Some browsers and axios configurations do not properly send the body with DELETE requests
3. The backend was expecting `target_card_id` and `link_type` in `req.body`, but the body was empty
4. The `validateBody(linkCardsSchema)` middleware failed validation silently or returned an error that wasn't visible

### Technical Details

- Axios uses `{ data }` config for DELETE body, which is correct but unreliable
- Express `express.json()` middleware parses body for all methods including DELETE
- The backend integration tests with supertest worked because supertest's `.send()` handles DELETE bodies correctly
- Browser implementations vary in handling DELETE bodies

## Solution Implemented

### Approach

Changed from DELETE with body to POST with a new `/unlink` endpoint. This approach:
- Uses reliable POST method for sending body data
- Maintains backward compatibility by keeping the DELETE endpoint
- Follows acceptable REST conventions (POST for actions)

### Code Changes

#### 1. Frontend: CardAPI.ts

```typescript
// AFTER (fixed)
/**
 * Unlink two cards
 * @param sourceCardId - The source card ID
 * @param data - Target card and link type
 *
 * Note: Uses POST to /unlink endpoint instead of DELETE with body
 * because some browsers/axios configurations strip body from DELETE requests
 * (UTB-024 fix)
 */
async unlinkCards(sourceCardId: string, data: UnlinkCardsDTO): Promise<void> {
  await apiClient.post(`/cards/${sourceCardId}/unlink`, data);
},
```

#### 2. Backend: card.routes.ts

```typescript
// POST /cards/:id/link - Link cards
router.post('/:id/link', validateBody(linkCardsSchema), controller.linkCards);

// DELETE /cards/:id/link - Unlink cards (legacy, kept for backward compatibility)
router.delete('/:id/link', validateBody(linkCardsSchema), controller.unlinkCards);

// POST /cards/:id/unlink - Unlink cards (UTB-024 fix: POST avoids DELETE body issues)
router.post('/:id/unlink', validateBody(linkCardsSchema), controller.unlinkCards);
```

#### 3. Frontend Tests: CardAPI.test.ts

```typescript
describe('unlinkCards', () => {
  it('should make POST request to /unlink endpoint with link data (UTB-024 fix)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await CardAPI.unlinkCards('parent-123', {
      target_card_id: 'child-123',
      link_type: 'parent_of',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/cards/parent-123/unlink', {
      target_card_id: 'child-123',
      link_type: 'parent_of',
    });
  });

  it('should unlink action card from feedback card', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await CardAPI.unlinkCards('action-123', {
      target_card_id: 'feedback-123',
      link_type: 'linked_to',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/cards/action-123/unlink', {
      target_card_id: 'feedback-123',
      link_type: 'linked_to',
    });
  });
});
```

## Test Results

### Frontend Unit Tests

```
> vitest run tests/unit/models/api/CardAPI.test.ts

Test Files  1 passed (1)
     Tests  20 passed (20)
```

### Backend Integration Tests

```
> pnpm test -- tests/integration/card.test.ts

Test Files  24 passed (24)
     Tests  489 passed (489)
```

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/models/api/CardAPI.ts` | Changed unlinkCards to use POST /unlink |
| `backend/src/domains/card/card.routes.ts` | Added POST /unlink endpoint |
| `frontend/tests/unit/models/api/CardAPI.test.ts` | Updated tests for new API |

## Verification Checklist

- [x] Clicking unlink icon removes child from parent
- [x] Child card becomes standalone
- [x] Parent's children array is updated
- [x] UI reflects changes immediately
- [x] Frontend unit tests pass
- [x] Backend integration tests pass
- [x] Backward compatibility maintained (DELETE endpoint still works)
- [x] Code review completed

## Lessons Learned

1. DELETE requests with body are unreliable across browsers and HTTP clients
2. When body data is required for a DELETE-like operation, consider:
   - Using POST to an `/unlink` or `/remove` endpoint
   - Using query parameters (less ideal for complex data)
   - Using a dedicated endpoint with path parameters
3. Backend integration tests may pass even when frontend requests fail due to different HTTP client behavior (supertest vs axios)

## Related Documents

- [USER_TESTING_BUGS_01012330.md](./USER_TESTING_BUGS_01012330.md) - Original bug report
- [TASK_LIST.md](./TASK_LIST.md) - Task 2.1

---

*Bug fixed by: Software Developer Agent*
*Date: 2026-01-02*
