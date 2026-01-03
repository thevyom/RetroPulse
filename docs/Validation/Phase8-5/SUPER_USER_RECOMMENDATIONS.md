# Super-User (Admin) E2E Testing Recommendations

**Created**: 2026-01-02
**Status**: Approved for Implementation
**Context**: Solving E2E admin detection timing issues (E2E-003)

---

## 1. Executive Summary

This document provides recommendations for implementing super-user capabilities to solve E2E test flakiness caused by admin status detection timing issues.

### Key Constraints (From User)

1. Super-user privileges for E2E QA via "admin mode"
2. System-wide scope
3. No need to view all boards
4. Defer creating `/admin` board to FUTURE_NEEDS.md
5. Simplest architecture
6. Focus only on solving E2E admin detection problem

---

## 2. Problem Statement

E2E tests fail because:
1. Admin status detection relies on WebSocket events
2. WebSocket connection timing is non-deterministic
3. Tests skip or fail when admin detection is delayed

### Current Flow (Broken)

```
1. User creates board → cookie_hash stored as admins[0]
2. User navigates to board
3. WebSocket connects
4. Frontend waits for admin status via WebSocket event
5. Tests timeout waiting for admin dropdown to appear
```

---

## 3. Recommended Solution: X-Admin-Secret Header

### 3.1 Concept

Add a special HTTP header that bypasses normal admin detection for E2E tests only.

```
X-Admin-Secret: <configured-secret>
```

When this header is present with the correct secret, the backend treats the request as coming from an admin, regardless of the user's actual role.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E TEST WITH ADMIN HEADER                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Test sets up admin secret in API client                      │
│  2. All requests include: X-Admin-Secret: <secret>               │
│  3. Backend middleware checks header:                            │
│     └── If valid → req.isAdminOverride = true                   │
│  4. Routes check isAdminOverride || isNormalAdmin               │
│  5. Admin actions work immediately (no WebSocket needed)         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Why This Approach

| Benefit | Description |
|---------|-------------|
| Stateless | No session persistence needed |
| Simple | ~20 lines of middleware code |
| Secure | Only works in test/dev environments |
| Reusable | Pattern already exists for `/test/clear` endpoint |
| No UI changes | Admin dropdown still shows based on real admin status |

---

## 4. Implementation Plan

### Phase 1: Backend Middleware (Est: 1 hour)

**File**: `backend/src/middleware/admin-override.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-16chars';

export function adminOverrideMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const adminSecret = req.headers['x-admin-secret'];

  if (adminSecret && adminSecret === ADMIN_SECRET) {
    // Mark request as having admin override
    (req as any).isAdminOverride = true;
  }

  next();
}
```

**File**: `backend/src/app.ts`

```typescript
import { adminOverrideMiddleware } from './middleware/admin-override.middleware';

// Apply early in middleware chain
app.use(adminOverrideMiddleware);
```

### Phase 2: Update Admin Checks (Est: 30 min)

**Pattern for routes that require admin**:

```typescript
// Before
const isAdmin = board.admins.includes(req.hashedCookieId);
if (!isAdmin) return res.status(403).json({ error: 'Admin required' });

// After
const isAdmin = board.admins.includes(req.hashedCookieId) || req.isAdminOverride;
if (!isAdmin) return res.status(403).json({ error: 'Admin required' });
```

**Routes to update**:
- `PATCH /boards/:id` (rename board)
- `PATCH /boards/:id/state` (close board)
- `DELETE /boards/:id` (delete board)
- `POST /boards/:id/admins` (add admin)
- `DELETE /cards/:id` (delete any card - if admin can delete)
- `PATCH /boards/:id/columns/:columnId` (edit column)

### Phase 3: E2E Test Helpers (Est: 30 min)

**File**: `frontend/tests/e2e/utils/admin-helpers.ts`

```typescript
import { APIRequestContext } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-16chars';

/**
 * Create an API context with admin override header
 */
export function createAdminAPIContext(
  request: APIRequestContext
): APIRequestContext {
  // Playwright doesn't allow modifying existing context
  // Instead, use extraHTTPHeaders in test config or per-request
  return request;
}

/**
 * Make an admin API request
 */
export async function adminRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown
): Promise<Response> {
  const options = {
    headers: {
      'X-Admin-Secret': ADMIN_SECRET,
    },
    data,
  };

  switch (method) {
    case 'GET':
      return request.get(url, options);
    case 'POST':
      return request.post(url, options);
    case 'PATCH':
      return request.patch(url, options);
    case 'DELETE':
      return request.delete(url, options);
  }
}

/**
 * Example: Close a board as admin
 */
export async function closeBoard(
  request: APIRequestContext,
  boardId: string
): Promise<void> {
  await adminRequest(request, 'PATCH', `/v1/boards/${boardId}/state`, {
    state: 'closed',
  });
}
```

### Phase 4: Migrate Tests (Est: 2 hours)

Update tests to use admin helpers instead of relying on WebSocket admin detection.

**Before**:
```typescript
test('admin can close board', async ({ page }) => {
  // Create board (becomes admin)
  await createBoard(page);

  // Wait for admin dropdown (FLAKY - depends on WebSocket)
  await page.waitForSelector('[data-testid="admin-dropdown"]', { timeout: 10000 });

  // Close board
  await page.click('[data-testid="admin-dropdown"]');
  await page.click('[data-testid="close-board"]');
});
```

**After**:
```typescript
test('admin can close board', async ({ page, request }) => {
  // Create board
  const boardId = await createBoard(page);

  // Close board using admin API (RELIABLE)
  await closeBoard(request, boardId);

  // Verify board is closed (no need for admin dropdown)
  await expect(page.locator('[data-testid="board-closed-badge"]')).toBeVisible();
});
```

---

## 5. Security Considerations

### 5.1 Environment Restriction

The admin secret should only be configured in:
- Local development (`.env.local`)
- CI/CD test environments

**Production should NOT have `ADMIN_SECRET` set.**

```typescript
// In middleware
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SECRET) {
  // Skip middleware entirely in production
  return next();
}
```

### 5.2 Secret Strength

For test environments:
- Minimum 16 characters
- Not the same as any real credentials
- Stored in environment variables, not code

---

## 6. Alternative Approaches (Not Recommended)

### 6.1 Pre-Seeded Admin Board

**Rejected because**:
- Requires backend changes to accept session_id
- Complex setup in global-setup.ts
- Still has timing issues with localStorage

### 6.2 Mock WebSocket Admin Events

**Rejected because**:
- Doesn't test real admin flow
- Requires intercepting WebSocket messages
- Fragile and complex

### 6.3 Admin Dashboard UI

**Deferred to FUTURE_NEEDS.md because**:
- Out of scope for E2E testing
- Requires significant frontend work
- Not needed for current problem

---

## 7. Task List

| # | Task | Priority | Est. | Status |
|---|------|----------|------|--------|
| 1 | Create admin-override middleware | P0 | 30m | Not Started |
| 2 | Wire middleware in app.ts | P0 | 10m | Not Started |
| 3 | Update board routes (rename, close, delete) | P0 | 30m | Not Started |
| 4 | Update card routes (delete) | P1 | 15m | Not Started |
| 5 | Update column routes (edit) | P1 | 15m | Not Started |
| 6 | Create E2E admin-helpers.ts | P0 | 30m | Not Started |
| 7 | Migrate 02-board-lifecycle.spec.ts | P1 | 30m | Not Started |
| 8 | Migrate 03-retro-session.spec.ts | P1 | 30m | Not Started |
| 9 | Migrate 11-bug-regression.spec.ts | P1 | 30m | Not Started |
| 10 | Remove workarounds and skips | P2 | 30m | Not Started |

---

## 8. Success Criteria

- [ ] Admin actions work immediately in E2E tests (no WebSocket wait)
- [ ] Tests that were skipped due to admin issues now pass
- [ ] No security risk in production (secret not configured)
- [ ] Minimal code changes (~100 lines total)

---

## 9. Relationship to UTB-014

UTB-014 (auto-join creator on board creation) solves a **different** problem:
- UTB-014: Creator's session not being created
- This doc: Admin status detection timing in E2E tests

**UTB-014 helps** when tests follow "create board → do admin action" flow.
**This solution helps** when tests need guaranteed admin access regardless of flow.

Both should be implemented for comprehensive coverage.

---

## 10. Files to Create/Modify

### New Files
- `backend/src/middleware/admin-override.middleware.ts`
- `frontend/tests/e2e/utils/admin-helpers.ts`

### Modified Files
- `backend/src/app.ts`
- `backend/src/domains/board/board.controller.ts`
- `backend/src/domains/board/board.routes.ts`
- `frontend/tests/e2e/02-board-lifecycle.spec.ts`
- `frontend/tests/e2e/03-retro-session.spec.ts`
- `frontend/tests/e2e/11-bug-regression.spec.ts`

---

*Document created by Principal Engineer - 2026-01-02*
