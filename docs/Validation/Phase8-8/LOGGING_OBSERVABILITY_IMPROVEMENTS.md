# Logging & Observability Improvements

> Backend code review findings - Tasks for improving debugging capabilities and production monitoring

## Overview

The current backend implementation has solid security fundamentals but lacks sufficient logging and observability for effective production debugging. This document outlines specific improvements needed.

---

## High Priority Tasks

### 1. Add Request Correlation IDs

**Problem**: No way to trace a request across log entries. Each log is isolated, making it impossible to follow a request's journey through the system.

**Files to modify**:
- `backend/src/shared/middleware/request-logger.ts`
- `backend/src/shared/logger/logger.ts`

**Implementation**:
```typescript
// New middleware: backend/src/shared/middleware/correlation-id.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}
```

**Tasks**:
- [x] Create correlation ID middleware
- [x] Add `correlationId` to `AuthenticatedRequest` type
- [x] Include correlation ID in all log entries
- [x] Pass correlation ID to WebSocket connections (N/A - WebSocket uses persistent connections, not request/response)
- [x] Return correlation ID in error responses for client debugging (via x-correlation-id header)

---

### 2. Add Service Layer Operation Logging

**Problem**: Most service methods have no logging. When issues occur in production, there's no visibility into what operations were attempted.

**Files to modify**:
- `backend/src/domains/board/board.service.ts`
- `backend/src/domains/card/card.service.ts`
- `backend/src/domains/reaction/reaction.service.ts`
- `backend/src/domains/user/user-session.service.ts`

**Current state** (card.service.ts - no logging):
```typescript
async createCard(boardId: string, input: CreateCardInput, userHash: string): Promise<Card> {
  const board = await this.boardRepository.findById(boardId);
  // ... no logging of the operation
}
```

**Required logging**:
```typescript
async createCard(boardId: string, input: CreateCardInput, userHash: string): Promise<Card> {
  logger.info('Creating card', {
    boardId,
    columnId: input.column_id,
    cardType: input.card_type,
    userHash: userHash.substring(0, 8) + '...'  // Truncate for privacy
  });

  const board = await this.boardRepository.findById(boardId);
  // ... operation logic

  logger.info('Card created', { cardId: card.id, boardId });
  return card;
}
```

**Tasks**:
- [x] Add entry logging to all public service methods
- [x] Add success logging with created/modified entity IDs
- [x] Add failure logging before throwing ApiError
- [x] Ensure user hashes are truncated (first 8 chars only)

**Methods requiring logging**:

| Service | Methods |
|---------|---------|
| BoardService | `createBoard`, `updateBoardName`, `closeBoard`, `addAdmin`, `renameColumn`, `deleteBoard` |
| CardService | `createCard`, `updateCard`, `moveCard`, `deleteCard`, `linkCards`, `unlinkCards` |
| ReactionService | `addReaction`, `removeReaction` |
| UserSessionService | `joinBoard`, `updateAlias`, `updateHeartbeat` |

---

### 3. Add Controller Layer Operation Logging

**Problem**: Controllers only log errors via the global handler. No visibility into what operations are being attempted or by whom.

**Files to modify**:
- `backend/src/domains/board/board.controller.ts`
- `backend/src/domains/card/card.controller.ts`
- `backend/src/domains/reaction/reaction.controller.ts`
- `backend/src/domains/user/user-session.controller.ts`

**Current state**:
```typescript
createCard = async (req, res, next) => {
  try {
    const card = await this.cardService.createCard(...);
    sendSuccess(res, card, 201);
  } catch (error) {
    next(error);
  }
};
```

**Required logging**:
```typescript
createCard = async (req, res, next) => {
  const { boardId } = req.params;
  logger.debug('POST /boards/:boardId/cards', {
    boardId,
    userHash: req.hashedCookieId.substring(0, 8) + '...',
    bodyKeys: Object.keys(req.body)  // Log keys only, not values
  });

  try {
    const card = await this.cardService.createCard(...);
    sendSuccess(res, card, 201);
  } catch (error) {
    next(error);
  }
};
```

**Tasks**:
- [x] Add debug-level entry logging to all controller methods
- [x] Log route, user hash (truncated), and request body keys
- [x] Consider adding response status logging (handled by request-logger middleware)

---

## Medium Priority Tasks

### 4. Add Application Metrics

**Problem**: No application metrics for monitoring. Cannot track request rates, error rates, latencies, or business metrics.

**Recommended approach**: Add Prometheus metrics via `prom-client`

**New file**: `backend/src/shared/metrics/metrics.ts`

**Metrics to implement**:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path | Request latency |
| `websocket_connections_active` | Gauge | - | Active WebSocket connections |
| `boards_created_total` | Counter | - | Boards created |
| `cards_created_total` | Counter | card_type | Cards created |
| `reactions_total` | Counter | action (add/remove) | Reaction operations |
| `db_query_duration_seconds` | Histogram | collection, operation | Database query latency |

**Tasks**:
- [x] Install `prom-client` package
- [x] Create metrics registry and middleware
- [x] Add `/metrics` endpoint (protected) - at `/health/metrics`
- [x] Instrument HTTP request handling
- [x] Instrument WebSocket connections
- [x] Instrument business operations
- [ ] Add database query timing (deferred to Task 6)

---

### 5. Enhance Health Check Endpoint

**Problem**: Health endpoint likely returns basic status without checking dependencies.

**File to modify**: `backend/src/gateway/routes/health.ts`

**Required checks**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  version: string,
  checks: {
    mongodb: {
      status: 'up' | 'down',
      latency_ms: number
    },
    memory: {
      heap_used_mb: number,
      heap_total_mb: number,
      rss_mb: number
    },
    uptime_seconds: number
  }
}
```

**Tasks**:
- [x] Add MongoDB ping check with latency measurement
- [x] Add memory usage reporting
- [x] Add uptime tracking
- [x] Add version from package.json
- [x] Return appropriate status codes (200 healthy, 503 unhealthy)

**Implementation**: Added `/health/detailed` endpoint that returns comprehensive health status

---

### 6. Add Database Query Logging

**Problem**: Repository operations don't log queries. Difficult to debug slow queries or missing data issues.

**Files to modify**:
- `backend/src/domains/board/board.repository.ts`
- `backend/src/domains/card/card.repository.ts`
- `backend/src/domains/reaction/reaction.repository.ts`
- `backend/src/domains/user/user-session.repository.ts`

**Implementation** (debug level only):
```typescript
async findById(id: string): Promise<BoardDocument | null> {
  const startTime = Date.now();

  if (!ObjectId.isValid(id)) {
    logger.debug('DB query skipped - invalid ObjectId', { collection: 'boards', id });
    return null;
  }

  const result = await this.collection.findOne({ _id: new ObjectId(id) });

  logger.debug('DB query completed', {
    collection: 'boards',
    operation: 'findOne',
    duration_ms: Date.now() - startTime,
    found: result !== null
  });

  return result;
}
```

**Tasks**:
- [x] Add debug-level logging to repository methods
- [x] Include collection name, operation type, and duration
- [x] Log whether document was found (for reads)
- [x] Log affected count (for writes/deletes)
- [x] Never log query filters containing user data

---

### 7. Improve WebSocket Event Logging

**Problem**: WebSocket broadcast events use debug level. Important events aren't visible in production logs.

**File to modify**: `backend/src/gateway/socket/SocketGateway.ts`

**Current state**:
```typescript
logger.debug('Broadcasted event', { event: eventType, room: roomName });
```

**Required changes**:
```typescript
// Connection lifecycle - info level
logger.info('Client connected', { socketId, hasCookie: !!socket.data.cookieHash });
logger.info('Client disconnected', { socketId, reason, boardId });
logger.info('Client joined board', { socketId, boardId });
logger.info('Client left board', { socketId, boardId });

// Event broadcasts - debug level (but consider info for audit-relevant events)
logger.debug('Broadcasting event', { event: eventType, room: roomName });
```

**Tasks**:
- [x] Ensure all connection lifecycle events log at info level
- [ ] Add error emission back to clients for invalid operations (deferred - requires frontend changes)
- [x] Consider info-level logging for user:joined, user:left events (user:left elevated to info)
- [x] Add socket error event handler with logging

---

## Low Priority Tasks

### 8. Add Structured Error Context

**Problem**: Error logs don't include enough context to reproduce issues.

**File to modify**: `backend/src/shared/middleware/error-handler.ts`

**Enhanced error logging**:
```typescript
logger.error('Request error', {
  error: {
    name: error.name,
    message: error.message,
    code: error instanceof ApiError ? error.code : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  },
  request: {
    method: req.method,
    path: req.path,
    params: req.params,
    queryKeys: Object.keys(req.query),
    bodyKeys: Object.keys(req.body || {}),
    correlationId: req.correlationId,
    userHash: req.hashedCookieId?.substring(0, 8),
  }
});
```

**Tasks**:
- [x] Include request params in error logs
- [x] Include query/body keys (not values)
- [x] Include correlation ID
- [x] Include truncated user hash for tracing

---

### 9. Add Log Levels Configuration

**Problem**: Cannot adjust log levels without code changes.

**File to modify**: `backend/src/shared/config/env.ts`

**Add environment variable**:
```typescript
LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
```

**Tasks**:
- [x] Add LOG_LEVEL environment variable
- [x] Configure Winston to use LOG_LEVEL
- [x] Document log levels in .env.example

---

### 10. Add API Version to Logs

**Problem**: Cannot tell which API version handled a request from logs.

**File to modify**: `backend/src/shared/middleware/request-logger.ts`

**Tasks**:
- [x] Extract API version from path (/v1/...)
- [x] Include in request completed logs
- [x] Add application version from package.json to logger defaultMeta

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Request Correlation IDs | Medium | High |
| P0 | Service Layer Logging | Medium | High |
| P1 | Controller Layer Logging | Low | Medium |
| P1 | Application Metrics | High | High |
| P1 | Enhanced Health Checks | Low | Medium |
| P2 | Database Query Logging | Medium | Medium |
| P2 | WebSocket Event Logging | Low | Low |
| P3 | Structured Error Context | Low | Low |
| P3 | Log Levels Configuration | Low | Low |
| P3 | API Version in Logs | Low | Low |

---

## Testing the Improvements

After implementing these changes, verify:

1. **Correlation IDs**: Make a request and verify the same ID appears in all related log entries
2. **Service Logging**: Perform CRUD operations and verify entry/exit logs appear
3. **Metrics**: Hit `/metrics` endpoint and verify counters increment
4. **Health Checks**: Stop MongoDB and verify health endpoint returns unhealthy status
5. **Query Logging**: Set LOG_LEVEL=debug and verify DB queries are logged

---

## Related Security Items

These logging improvements also support security requirements:

- Correlation IDs enable incident investigation
- Service logging creates audit trail for data modifications
- Metrics enable anomaly detection (unusual request patterns)
- Enhanced error context aids security incident response

See also: Security recommendations in the backend code review.
