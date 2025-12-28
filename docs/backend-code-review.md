# Backend Code Review

This document tracks code review findings for the RetroPulse backend implementation.

---

## Phase 2: Board Domain Implementation

**Review Date**: 2025-12-27
**Reviewer**: Swati (AI Assistant)
**Files Reviewed**:
- `src/domains/board/types.ts`
- `src/domains/board/board.repository.ts`
- `src/domains/board/board.service.ts`
- `src/domains/board/board.controller.ts`
- `src/domains/board/board.routes.ts`
- `tests/unit/domains/board/board.repository.test.ts`
- `tests/unit/domains/board/board.service.test.ts`
- `tests/integration/board.test.ts`

---

### Overview

The Board Domain implementation is well-structured with clear separation of concerns. Overall, this is solid production-quality code with good test coverage.

---

### Strengths

1. **Clean Architecture**: Repository → Service → Controller pattern is well-implemented with proper dependency injection
2. **Type Safety**: Strong TypeScript types with clear separation between MongoDB documents (`BoardDocument`) and API responses (`Board`)
3. **Test Coverage**: Comprehensive unit tests (27 cases) and integration tests (12 cases) using mongodb-memory-server
4. **Authorization Logic**: Proper separation of `isAdmin` vs `isCreator` checks with appropriate guards
5. **Idempotent Operations**: `addAdmin` uses `$addToSet` to prevent duplicates, `closeBoard` is idempotent

---

### Critical Issues

#### 1. Shareable Link Collision Risk

**File**: `board.repository.ts:187-192`
**Severity**: Blocking

```typescript
private generateShareableLink(): string {
  return uuidv4().replace(/-/g, '').substring(0, 8);
}
```

Using 8 characters (32 bits of entropy from UUID) creates ~4.3 billion possibilities. With birthday paradox, collision probability reaches 50% at ~65,000 boards. The unique index will cause insert failures.

**Recommendation**: Add retry logic on collision, or use a longer link (12-16 chars).

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Extended shareable link to 12 characters (48 bits of entropy)
- Added retry logic with 5 attempts on duplicate key errors (E11000)
- Collision probability now reaches 50% at ~16 million boards

```typescript
// board.repository.ts:13-60
async create(input: CreateBoardInput, creatorHash: string): Promise<BoardDocument> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const shareableLink = this.generateShareableLink();
    try {
      // ... insert logic
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
        logger.warn('Shareable link collision, retrying', { attempt: attempt + 1 });
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to generate unique shareable link after maximum retries');
}

private generateShareableLink(): string {
  return uuidv4().replace(/-/g, '').substring(0, 12);  // 12 chars now
}
```

---

#### 2. Race Condition in Authorization Checks

**File**: `board.service.ts:84-88`
**Severity**: Blocking

```typescript
async updateBoardName(id: string, name: string, userHash: string): Promise<Board> {
  await this.ensureBoardActive(id);  // Fetches board
  await this.ensureAdmin(id, userHash);  // Fetches board again
  const doc = await this.boardRepository.updateName(id, name);  // Fetches/updates again
```

Three separate DB calls create a race condition where the board could be closed or deleted between checks.

**Recommendation**: Consider atomic updates with conditions, or use optimistic locking.

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Added atomic update options to repository methods (`requireActive`, `requireAdmin`, `requireCreator`)
- Service layer now uses single atomic operations with conditions in the MongoDB query filter
- State is verified once upfront, then atomic update ensures consistency

```typescript
// board.repository.ts - atomic options added
async updateName(
  id: string,
  name: string,
  options: { requireActive?: boolean; requireAdmin?: string } = {}
): Promise<BoardDocument | null> {
  const filter: Record<string, unknown> = { _id: new ObjectId(id) };
  if (options.requireActive) filter.state = 'active';
  if (options.requireAdmin) filter.admins = options.requireAdmin;
  return this.collection.findOneAndUpdate(filter, { $set: { name } }, { returnDocument: 'after' });
}

// board.service.ts - using atomic operations
async updateBoardName(id: string, name: string, userHash: string): Promise<Board> {
  const existingBoard = await this.boardRepository.findById(id);
  if (!existingBoard) throw new ApiError(ErrorCodes.BOARD_NOT_FOUND, 'Board not found', 404);
  if (existingBoard.state === 'closed') throw new ApiError(ErrorCodes.BOARD_CLOSED, 'Board is closed', 409);

  const doc = await this.boardRepository.updateName(id, name, {
    requireActive: true,
    requireAdmin: userHash,
  });
  if (!doc) throw new ApiError(ErrorCodes.FORBIDDEN, 'Admin access required', 403);
  // ...
}
```

---

### Recommendations

#### 3. Admin Secret Check Uses `process.env` Directly

**File**: `board.controller.ts:147-149`
**Severity**: Suggestion

```typescript
const adminSecretKey = process.env.ADMIN_SECRET_KEY;
const isAdminSecret = !!(adminSecretKey && adminSecret === adminSecretKey);
```

Inconsistent with the rest of the codebase which uses `env` from config. Also vulnerable to timing attacks.

**Recommendation**: Use `env.ADMIN_SECRET_KEY` and consider constant-time comparison:
```typescript
import { timingSafeEqual } from 'crypto';
```

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Now uses `env.ADMIN_SECRET_KEY` from validated config
- Implemented timing-safe comparison with `crypto.timingSafeEqual`
- Added helper function with proper Buffer handling

```typescript
// board.controller.ts:10-31
function isValidAdminSecret(providedSecret: string | string[] | undefined): boolean {
  const expectedSecret = env.ADMIN_SECRET_KEY;
  if (!providedSecret || typeof providedSecret !== 'string') return false;
  if (providedSecret.length !== expectedSecret.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(providedSecret, 'utf8'),
      Buffer.from(expectedSecret, 'utf8')
    );
  } catch {
    return false;
  }
}
```

---

#### 4. Missing Cascade Delete

**File**: `board.service.ts:181-183`
**Severity**: Suggestion

```typescript
// Note: Cascade delete of cards, reactions, user_sessions will be handled
// by calling their respective repositories. For now, just delete the board.
const deleted = await this.boardRepository.delete(id);
```

Orphaned data will remain. The task list notes this is deferred to Phase 3-5, but consider adding a TODO enforcement or interface contract.

**Status**: Deferred to Phase 3-5

---

#### 5. Non-Null Assertions in Controller

**File**: `board.controller.ts`
**Severity**: Suggestion

Multiple instances of `req.params.id!` non-null assertions:
```typescript
const board = await this.boardService.getBoardWithUsers(id!);
```

While these are guaranteed by Express routing, explicit validation would be safer.

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Added `requireParam()` helper function for explicit validation
- All controller methods now validate params before use
- Returns proper 400 error if param is missing

```typescript
// board.controller.ts:35-41
function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new ApiError(ErrorCodes.VALIDATION_ERROR, `${name} is required`, 400);
  }
  return value;
}

// Usage in controller methods:
const id = requireParam(req.params.id, 'Board ID');
const columnId = requireParam(req.params.columnId, 'Column ID');
```

---

#### 6. Route Pattern for Link Lookup

**File**: `board.routes.ts:17-21`
**Severity**: Suggestion

```typescript
router.get('/link/:linkCode', controller.getBoardByLink);
router.get('/:id', controller.getBoard);
```

Good ordering (specific before parameterized), but `/link/:linkCode` could accidentally match if someone has a board ID starting with "link". Consider using a different pattern like `/by-link/:linkCode`.

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Renamed route from `/link/:linkCode` to `/by-link/:linkCode`
- Eliminates any potential conflict with board IDs

```typescript
// board.routes.ts:17-18
router.get('/by-link/:linkCode', controller.getBoardByLink);
```

---

#### 7. Missing Input Sanitization for Column IDs

**File**: `schemas.ts:26`
**Severity**: Suggestion

```typescript
id: z.string().min(1, 'Column ID is required'),
```

No pattern validation. Malicious column IDs could potentially cause issues with MongoDB query operators if not properly escaped.

**Recommendation**: Add regex pattern: `.regex(/^[a-zA-Z0-9_-]+$/)`

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Added `columnIdSchema` with regex validation
- Applied to column schema, createCardSchema, and moveCardSchema

```typescript
// schemas.ts:24-31
export const columnIdSchema = z
  .string()
  .min(1, 'Column ID is required')
  .max(50, 'Column ID must be 50 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Column ID can only contain letters, numbers, hyphens, and underscores',
  });

export const columnSchema = z.object({
  id: columnIdSchema,
  // ...
});
```

---

### Minor Issues

#### 8. Duplicated Shareable Link Logic

**File**: `board.service.ts`
**Severity**: Nit

The pattern `${env.APP_URL}/join/${doc.shareable_link}` is repeated 7 times.

**Recommendation**: Extract to a helper:
```typescript
private formatShareableLink(linkCode: string): string {
  return `${env.APP_URL}/join/${linkCode}`;
}
```

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Extracted to private helper method `formatShareableLink()`
- All usages now call the helper

```typescript
// board.service.ts:16-21
private formatShareableLink(linkCode: string): string {
  return `${env.APP_URL}/join/${linkCode}`;
}
```

---

#### 9. Inconsistent Error Messages

**File**: `board.service.ts:158-161`
**Severity**: Nit

```typescript
throw new ApiError(
  ErrorCodes.VALIDATION_ERROR,
  'Column not found',
  400
);
```

**Recommendation**: Use a more specific error code like `COLUMN_NOT_FOUND` for clarity.

**Status**: ✅ Resolved (2025-12-27)

**Resolution**:
- Added `COLUMN_NOT_FOUND` to ErrorCodes in `api.ts`
- Updated renameColumn to use the new error code

```typescript
// api.ts:46
COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',

// board.service.ts:198-199
if (!columnExists) {
  throw new ApiError(ErrorCodes.COLUMN_NOT_FOUND, 'Column not found', 400);
}
```

---

#### 10. Test File Organization

**Severity**: Nit

Tests are split between:
- `tests/unit/domains/board/` - Unit tests
- `tests/integration/` - Integration tests

**Recommendation**: Consider co-locating tests with source: `src/domains/board/__tests__/`

**Status**: Open (Low priority, can be addressed in future refactoring)

---

### Security Observations

| Item | Status | Notes |
|------|--------|-------|
| Cookie HttpOnly | ✅ Pass | Properly set |
| Cookie Secure (prod) | ✅ Pass | Conditional on NODE_ENV |
| SHA-256 Hashing | ✅ Pass | Cookie never stored plain |
| SQL/NoSQL Injection | ✅ Pass | Using MongoDB driver properly |
| CORS | ✅ Pass | Configured with specific origin |
| Timing Attack Prevention | ✅ Pass | Admin secret uses timingSafeEqual |
| Rate Limiting | ⚠️ Pending | Planned for Phase 9 |

---

### Test Coverage Assessment

| Component | Unit Tests | Integration Tests | Coverage |
|-----------|-----------|------------------|----------|
| BoardRepository | 24 cases | N/A | Good |
| BoardService | 17 cases | N/A | Good |
| Board API | N/A | 16 cases | Good |

**Missing Test Scenarios**:
- Concurrent modification tests
- Shareable link collision handling (retry logic)
- Edge case: very long board/column names at max length

---

### Summary

| Severity | Count | Resolved |
|----------|-------|----------|
| Blocking | 2 | 2 |
| Suggestion | 5 | 4 |
| Nit | 3 | 2 |

**Overall Assessment**: The Phase-2 implementation is now production-ready. All blocking issues have been resolved with atomic operations and collision handling. Most suggestions have been addressed. Ready to proceed to Phase 3.

---

### Second Pass Review (2025-12-27)

**Reviewer**: Swati (AI Assistant)
**Trigger**: Verification of all fixes after first-pass implementation

#### Verified Fixes

All first-pass issues were verified to be correctly implemented:

| Issue | Verification Status | Notes |
|-------|---------------------|-------|
| Shareable link collision | ✅ Verified | 12-char links, retry logic with E11000 handling |
| Race condition (atomic ops) | ✅ Verified | Repository methods accept `options` with conditions |
| Admin secret timing-safe | ✅ Verified | Uses `crypto.timingSafeEqual` with Buffer handling |
| Param validation helper | ✅ Verified | `requireParam()` validates all path params |
| Route pattern `/by-link` | ✅ Verified | Route renamed to avoid conflicts |
| Column ID schema | ✅ Verified | `columnIdSchema` with regex pattern applied |
| `COLUMN_NOT_FOUND` error | ✅ Verified | Added to `ErrorCodes` and used in service |
| `formatShareableLink()` | ✅ Verified | Extracted to private method, DRY |

#### Test Updates Required

During second-pass, several tests needed updates to match the new implementation:

1. **board.repository.test.ts**:
   - Updated shareable link length check from 8 to 12 characters

2. **board.service.test.ts**:
   - Fixed `closeBoard` tests to use new atomic pattern with `findById` + `closeBoard` mocks
   - Fixed `updateBoardName` tests to verify atomic options passed to repository
   - Fixed `addAdmin` tests to verify atomic options passed to repository
   - Fixed `renameColumn` tests - column existence check now in service layer
   - Updated expected error code from `VALIDATION_ERROR` to `COLUMN_NOT_FOUND`
   - Added new test for `FORBIDDEN` when not admin in `renameColumn`

#### Test Results After Second Pass

```
Test Files: 5 passed (5)
Tests: 86 passed (86)
Duration: 3.82s
```

#### Final Test Coverage

| Component | Unit Tests | Integration Tests | Total |
|-----------|-----------|------------------|-------|
| BoardRepository | 24 cases | N/A | 24 |
| BoardService | 20 cases | N/A | 20 |
| Board API | N/A | 16 cases | 16 |
| Hash Utils | 5 cases | N/A | 5 |
| Validation Schemas | 22 cases | N/A | 22 |

**Total Phase-2 Tests**: 86 passing

#### Quality Bar Assessment

| Criteria | Status |
|----------|--------|
| All blocking issues resolved | ✅ |
| All tests passing | ✅ |
| Atomic operations prevent race conditions | ✅ |
| Security (timing-safe comparison) | ✅ |
| Input validation (column IDs) | ✅ |
| DRY code (helper extraction) | ✅ |
| Error codes specific and meaningful | ✅ |

**Conclusion**: Phase-2 meets the high bar. All fixes verified, tests updated and passing. Ready for Phase 3.

---

## Phase 3: User Session Management

*Review pending*

---

## Phase 4: Card Domain Implementation

*Review pending*

---

## Phase 5: Reaction Domain Implementation

*Review pending*
