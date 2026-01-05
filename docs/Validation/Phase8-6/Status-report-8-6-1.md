# Phase 8.6.1 Status Report: Card Link/Unlink Real-time Sync Fix

**Date**: 2026-01-05
**Author**: Principal Engineer
**Status**: Implementation Complete, Verification Pending

---

## Summary

Implemented Option A3 (Emit Refresh Events for All Impacted Cards) to fix the card link/unlink UI sync issue. The backend now emits `card:refresh` socket events with full card data for all affected cards after link/unlink operations.

---

## Problem Statement

Card linking/unlinking operations were not reflecting in the UI after page refresh because:
1. Backend API filters out child cards (`parent_card_id = null` in card.repository.ts)
2. After page refresh, child cards don't exist as full `Card` objects in frontend store
3. Socket handlers couldn't find children to update, causing silent failures

**Debug evidence:**
```
[DEBUG] handleUnlinkChild - childCard: undefined parent_card_id: undefined
```

---

## Solution Implemented

### Backend Changes

| File | Change |
|------|--------|
| `backend/src/gateway/socket/socket-types.ts` | Added `CardRefreshPayload` interface and `'card:refresh'` event type |
| `backend/src/gateway/socket/EventBroadcaster.ts` | Added `cardRefresh()` method to emit refresh events |
| `backend/src/domains/card/card.service.ts` | Modified `linkCards` and `unlinkCards` to emit `card:refresh` for all impacted cards (parent, child, linked action cards) |
| `backend/src/domains/card/card.controller.ts` | Added type assertion helpers for route handlers |
| `backend/src/domains/card/card.routes.ts` | Added `asHandler` wrapper for type safety |
| `backend/src/domains/card/card.repository.ts` | Fixed TypeScript strict mode issues |
| `backend/src/domains/reaction/reaction.controller.ts` | Fixed type assertions |
| `backend/src/domains/reaction/reaction.routes.ts` | Added `asHandler` wrapper |

### Frontend Changes

| File | Change |
|------|--------|
| `frontend/src/models/socket/socket-types.ts` | Added `CardRefreshEvent` interface |
| `frontend/src/models/stores/cardStore.ts` | Added `upsertCard` action for full card replacement |
| `frontend/src/features/card/viewmodels/useCardViewModel.ts` | Added `handleCardRefresh` handler that transforms and upserts cards |

### Test Fixes

| File | Change |
|------|--------|
| `backend/tests/unit/domains/card/card.service.test.ts` | Fixed admin user in unlink tests |
| `backend/tests/e2e/board-lifecycle.test.ts` | Fixed unlink tests to use creator cookies |
| `backend/tests/utils/test-app.ts` | Added adminOverrideMiddleware |

---

## Test Results

### Backend Tests
- **Status**: ✅ All 493 tests passing
- **Build**: ✅ TypeScript compilation successful

### Frontend Tests
- **Unit Tests**: 986 passed, 7 failed (pre-existing issues)
- **Build**: ❌ TypeScript compilation failing (~100+ errors)

### Failing Frontend Tests (Pre-existing)
1. `RetroBoardPage.rerender.test.tsx` (6 tests) - Render count assertions affected by async session check
2. `RetroBoardPage.test.tsx` (1 test) - Complex filtering interaction timing issue

### Frontend Build Errors (Pre-existing + New)
- Unused variable warnings (TS6133) in multiple files
- Type mismatches in socket event handlers (CardLinkedEvent/CardUnlinkedEvent)
- Missing props in test files (columnType, LinkedFeedbackCard fields)
- Type incompatibilities in RetroBoardPage (JoinBoardResponse vs UserSession)

---

## Task Completion Status

| Task ID | Task | Status |
|---------|------|--------|
| A3-001 | Investigate current socket emission | ✅ Done |
| A3-002 | Add `card:refresh` socket event type | ✅ Done |
| A3-003 | Update CardService.linkCards | ✅ Done |
| A3-004 | Update CardService.unlinkCards | ✅ Done |
| A3-005 | Handle linked action cards | ✅ Done |
| A3-006 | Update CardService.deleteCard | ⏳ Pending |
| A3-007 | Add frontend `card:refresh` handler | ✅ Done |
| A3-008 | Add/update `upsertCard` store action | ✅ Done |
| A3-009 | Remove stale `card:linked`/`card:unlinked` handlers | ⏳ Pending |
| A3-010 | Backend unit tests | ✅ Done (493 pass) |
| A3-011 | Frontend unit tests | ⚠️ Partial (986 pass, 7 fail) |
| A3-012 | E2E tests | ⏳ Blocked by frontend build |

---

## Blocking Issues

### Frontend TypeScript Build Errors

The frontend build is failing with ~100+ TypeScript errors. These need to be fixed before E2E verification can proceed.

**Main categories:**
1. Socket event type mismatches (snake_case vs camelCase)
2. Missing props in test files
3. Unused variable warnings
4. Type incompatibilities in components

---

## Next Steps

1. **Fix frontend TypeScript errors** - Required to unblock E2E testing
2. **Run E2E tests** - Verify link/unlink/refresh flow works end-to-end
3. **Implement A3-006** - Add `card:refresh` on deleteCard for orphaned children
4. **Clean up A3-009** - Remove old `card:linked`/`card:unlinked` handlers if no longer needed

---

## How the Fix Works

1. User performs link/unlink operation via UI
2. Frontend calls API (`POST /cards/:id/link` or `POST /cards/:id/unlink`)
3. Backend performs the database operation
4. Backend fetches updated cards with full relationship data
5. Backend emits `card:refresh` event for EACH affected card:
   - Parent card (with updated children array)
   - Child card (with updated parent_card_id)
   - Any linked action cards
6. Frontend receives `card:refresh` events
7. Frontend calls `upsertCard()` to replace/add card in store
8. UI re-renders with updated card data

This approach ensures all clients receive complete card data regardless of whether the card previously existed in their local store.

---

## Reference Documents

- [Link-debug-and-solution.md](Link-debug-and-solution.md) - Full investigation and solution design
- [UTB-037_COLUMN_REORDERING_NOT_SUPPORTED.md](../Phase8-7/UTB-037_COLUMN_REORDERING_NOT_SUPPORTED.md) - Related bug report

---

*Report generated: 2026-01-05*
