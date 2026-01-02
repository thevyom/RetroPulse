# Admin Test Board Design

**Created**: 2026-01-02 00:00
**Status**: Proposal

---

## 1. Problem Statement

Several E2E tests fail because they:
1. Need admin privileges that weren't properly established
2. Rely on admin-specific actions (close board, edit board, etc.)
3. Have timing issues with WebSocket admin status detection (E2E-003)

Current workarounds are scattered and inconsistent. Tests skip when admin detection fails.

---

## 2. Proposed Solution: Dedicated Admin Test Board

Create a pre-seeded "admin board" specifically for tests that require admin privileges.

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   E2E Test Setup                        │
├─────────────────────────────────────────────────────────┤
│  global-setup.ts                                        │
│  ├── Create demo boards (existing)                      │
│  │   ├── default                                        │
│  │   ├── quota                                          │
│  │   ├── lifecycle                                      │
│  │   └── a11y                                           │
│  │                                                      │
│  └── Create ADMIN board (NEW)                           │
│      ├── Pre-configured admin user                      │
│      ├── Known creator_session_id                       │
│      └── Stored in .test-boards.json                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Admin Test Flow                       │
├─────────────────────────────────────────────────────────┤
│  1. Load ADMIN board ID from .test-boards.json          │
│  2. Set localStorage with known session ID              │
│  3. Navigate to board                                   │
│  4. Session ID matches creator → Admin status           │
│  5. Run admin-specific tests                            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Key Changes

#### global-setup.ts
```typescript
// Create admin board with known session ID
const ADMIN_SESSION_ID = 'e2e-admin-session-id-12345';

const adminBoard = await createBoard({
  name: 'Admin Test Board',
  alias: `admin-${sessionId}`,
  columns: defaultColumns,
  creator_alias: 'E2E Admin',
  session_id: ADMIN_SESSION_ID  // Pass known session ID
});

// Store in test boards config
boardIds.admin = {
  id: adminBoard.id,
  sessionId: ADMIN_SESSION_ID
};
```

#### Test Helper
```typescript
// tests/e2e/utils/admin-helpers.ts
export async function setupAdminSession(page: Page) {
  const { admin } = await loadTestBoards();

  // Set known session ID in localStorage before navigation
  await page.evaluate((sessionId) => {
    localStorage.setItem('session_id', sessionId);
  }, admin.sessionId);

  // Navigate to admin board
  await page.goto(`/board/${admin.id}`);

  // Wait for admin status (should be immediate with matching session)
  await expect(page.getByTestId('admin-dropdown')).toBeVisible({ timeout: 5000 });
}
```

---

## 3. Implementation Plan

### Phase 1: Backend Support

| Task | Description | File |
|------|-------------|------|
| 3.1 | Accept `session_id` in create board API | `backend/routes/boards.ts` |
| 3.2 | Store creator session ID in board document | `backend/models/Board.ts` |

### Phase 2: E2E Infrastructure

| Task | Description | File |
|------|-------------|------|
| 3.3 | Update global-setup to create admin board | `tests/e2e/global-setup.ts` |
| 3.4 | Create admin-helpers.ts utility | `tests/e2e/utils/admin-helpers.ts` |
| 3.5 | Update .test-boards.json schema | `tests/e2e/.test-boards.json` |

### Phase 3: Test Migration

| Task | Description | Tests |
|------|-------------|-------|
| 3.6 | Migrate admin-requiring tests | `02-board-lifecycle.spec.ts` |
| 3.7 | Migrate close board tests | `03-retro-session.spec.ts` |
| 3.8 | Remove workarounds | All affected specs |

---

## 4. Test Categories and Admin Needs

| Test File | Admin Tests | Current Status |
|-----------|-------------|----------------|
| 02-board-lifecycle.spec.ts | Rename, Close | Uses workaround |
| 03-retro-session.spec.ts | Close board | Skipped |
| 11-bug-regression.spec.ts | Admin actions | Partially works |

---

## 5. Benefits

1. **Deterministic Admin Status**: No timing issues with WebSocket detection
2. **Faster Tests**: No need to wait for admin status
3. **Cleaner Code**: Remove workarounds and retries
4. **Isolation**: Admin tests don't interfere with regular tests

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Backend API change | Keep backwards compatible |
| Session ID conflicts | Use unique prefix for E2E |
| Test isolation | Each spec can reset to known state |

---

## 7. Alternative Approaches Considered

### A. Mock WebSocket Admin Detection
- Pros: No backend changes
- Cons: Doesn't test real admin flow

### B. Retry with Longer Timeouts
- Pros: Simple
- Cons: Slow, still flaky

### C. Admin API Endpoint (Chosen Partial)
- Already have `/v1/boards/:id/test/clear` for test data
- Could add `/v1/boards/:id/test/set-admin` to force admin status
- Requires backend changes but keeps test realistic

---

## 8. Recommended Next Steps

1. **Immediate**: Document which tests need admin privileges
2. **Short-term**: Implement admin board in global-setup
3. **Long-term**: Consider admin API endpoint for flexibility

---

*Document created by Principal Engineer - 2026-01-02*
