# Phase 9: Error Handling & Edge Cases

**Status**: ✅ COMPLETE
**Priority**: Medium
**Tasks**: 4/4 complete
**Completion Date**: 2025-12-28

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement comprehensive error handling, add closed board validation across all write endpoints, implement authorization middleware, and add request rate limiting for security.

---

## 📋 Task Breakdown

### 9.0 Implement comprehensive error handling middleware

- [x] Enhance `src/shared/middleware/error-handler.ts`
- [x] Define standard error response format (success: false, error object)
- [x] Map all error types to appropriate HTTP status codes (`ErrorCodeToStatusCode`)
- [x] Add error logging (sanitize sensitive data with `sanitizeErrorForLogging`)
- [x] Write unit tests for error formatting (16 tests)

**Note**: Basic error handler already exists. This task involves enhancement and verification.

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "Board not found",
    "details": {}
  },
  "timestamp": "2025-12-28T10:00:00.000Z"
}
```

**Error Code Mapping:**

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Not authorized |
| `CARD_LIMIT_REACHED` | 403 | User at card limit |
| `REACTION_LIMIT_REACHED` | 403 | User at reaction limit |
| `BOARD_NOT_FOUND` | 404 | Board doesn't exist |
| `CARD_NOT_FOUND` | 404 | Card doesn't exist |
| `COLUMN_NOT_FOUND` | 400 | Column doesn't exist |
| `USER_NOT_FOUND` | 404 | User session not found |
| `REACTION_NOT_FOUND` | 404 | Reaction not found |
| `BOARD_CLOSED` | 409 | Cannot modify closed board |
| `CIRCULAR_RELATIONSHIP` | 400 | Would create cycle |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

### 9.1 Add closed board validation across all write endpoints

- [x] Verified `checkBoardActive()` implemented in all services
- [x] All card/reaction/board write operations check board state
- [x] Returns 409 Conflict with BOARD_CLOSED error code
- [x] Integration tests verify all endpoints respect board state

**Note**: Closed board checks are implemented in services. Verified completeness across all endpoints.

**Endpoints that should check board state:**

| Endpoint | Current Check | Status |
|----------|---------------|--------|
| `PATCH /boards/:id/name` | ✅ Service | Verify |
| `POST /boards/:id/admins` | ✅ Service | Verify |
| `PATCH /boards/:id/columns/:colId` | ✅ Service | Verify |
| `POST /boards/:boardId/cards` | ✅ Service | Verify |
| `PUT /cards/:id` | ✅ Service | Verify |
| `DELETE /cards/:id` | ✅ Service | Verify |
| `PATCH /cards/:id/column` | ✅ Service | Verify |
| `POST /cards/:id/link` | ✅ Service | Verify |
| `DELETE /cards/:id/link` | ✅ Service | Verify |
| `POST /cards/:id/reactions` | ✅ Service | Verify |
| `DELETE /cards/:id/reactions` | ✅ Service | Verify |

**Middleware Alternative:**
```typescript
// Could be applied at route level for cleaner code
const requireActiveBoard = async (req, res, next) => {
  const boardId = req.params.id || req.params.boardId;
  const board = await boardRepository.findById(boardId);
  if (board?.state === 'closed') {
    return res.status(409).json({
      success: false,
      error: { code: 'BOARD_CLOSED', message: 'Board is closed' }
    });
  }
  next();
};
```

---

### 9.2 Implement authorization checks for admin-only operations

- [x] Verified `requireAdmin()` checks in all services
- [x] Check if user's cookie_hash is in board.admins array
- [x] Returns 403 Forbidden if not admin
- [x] Integration tests verify all admin endpoints

**Note**: Authorization checks exist in services. Verified completeness across all admin operations.

**Admin-Only Endpoints:**

| Endpoint | Action | Current Check |
|----------|--------|---------------|
| `PATCH /boards/:id/name` | Rename board | ✅ Service |
| `PATCH /boards/:id/close` | Close board | ✅ Service |
| `POST /boards/:id/admins` | Add co-admin | ✅ Service (creator only) |
| `PATCH /boards/:id/columns/:colId` | Rename column | ✅ Service |
| `DELETE /boards/:id` | Delete board | ✅ Service (creator only) |
| `POST /cards/:id/link` | Link cards | ✅ Service (owner or admin) |
| `DELETE /cards/:id/link` | Unlink cards | ✅ Service (owner or admin) |

---

### 9.3 Add request rate limiting middleware

- [x] Install and configure express-rate-limit (`pnpm install express-rate-limit`)
- [x] Set limits: 100 requests/minute per IP for normal endpoints (`standardRateLimiter`)
- [x] Set stricter limits: 10 requests/minute for admin endpoints (`adminRateLimiter`)
- [x] Set very strict limits: 5 requests/minute for sensitive ops (`strictRateLimiter`)
- [x] Add bypass for testing environment (`skip: () => NODE_ENV === 'test'`)
- [x] Write unit tests verifying rate limit configuration (5 tests)

**Configuration:**
```typescript
import rateLimit from 'express-rate-limit';

// Standard rate limit
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Admin endpoints stricter limit
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many admin requests'
    }
  },
  skip: () => process.env.NODE_ENV === 'test',
});
```

**Application:**
```typescript
// Apply to all routes
app.use('/v1', standardLimiter);

// Apply stricter limit to admin routes
app.use('/v1/boards/:id/test', adminLimiter);
```

---

## 📁 Files to Create/Modify

```
src/shared/middleware/
├── error-handler.ts      # Enhance
├── rate-limit.ts         # Create
├── require-active-board.ts # Create (optional)
└── require-admin.ts      # Create (optional)

tests/
├── unit/shared/middleware/
│   ├── error-handler.test.ts
│   └── rate-limit.test.ts
└── integration/
    ├── closed-board.test.ts
    └── rate-limit.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Error Handler (unit) | ~10 | Error formatting, logging |
| Rate Limit (unit) | ~6 | Limit enforcement, bypass |
| Closed Board (integration) | ~12 | All write endpoints |
| Authorization (integration) | ~8 | Admin checks |
| **Total** | **~36** | |

---

## 📝 Technical Notes

### Error Logging Best Practices

```typescript
// Sanitize before logging
const sanitizeError = (error: Error) => ({
  name: error.name,
  message: error.message,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  // Never log: cookies, passwords, tokens
});

logger.error('Request failed', {
  error: sanitizeError(error),
  path: req.path,
  method: req.method,
  // Don't log: req.cookies, req.headers.authorization
});
```

### Rate Limit Headers

Express-rate-limit adds these headers:
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## 🔗 Dependencies

- Phase 1-8 completed
- `express-rate-limit` package (to be installed)

---

## ⚠️ Considerations

1. **Rate Limit Storage**: Default uses in-memory store. For production with multiple instances, consider Redis store.

2. **IP Extraction**: May need custom `keyGenerator` if behind proxy:
   ```typescript
   keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip
   ```

3. **Websocket Rate Limiting**: Socket.io connections need separate rate limiting.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 8](./BACKEND_PHASE_08_INTEGRATION_TESTING.md) | [Next: Phase 10 →](./BACKEND_PHASE_10_PERFORMANCE.md)
