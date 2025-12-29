# Phase 10: Performance Optimization & Monitoring

**Status**: 🔲 NOT STARTED
**Priority**: Low
**Tasks**: 0/4 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Optimize MongoDB queries for performance, add query performance logging, implement WebSocket connection management, and finalize health check endpoints for production readiness.

---

## 📋 Task Breakdown

### 10.0 Optimize MongoDB queries with aggregation pipelines

- [ ] Review and refactor `GET /boards/:id/cards` query
- [ ] Use $lookup for embedding children and linked_feedback_cards
- [ ] Add $facet for summary statistics (total_count, cards_by_column)
- [ ] Benchmark query performance (target: <100ms for 100 cards)

**Current Implementation:**
```typescript
// Uses Promise.all for parallel queries
const [cards, cardsByColumn, totalCount] = await Promise.all([
  this.cardRepository.findByBoardWithRelationships(boardId, options),
  this.cardRepository.countByColumn(boardId),
  this.cardRepository.countByBoard(boardId),
]);
```

**Optimized Single Query:**
```typescript
const pipeline = [
  { $match: { board_id: boardObjectId, parent_card_id: null } },
  { $sort: { created_at: -1 } },
  {
    $facet: {
      cards: [
        { $lookup: { from: 'cards', localField: '_id', foreignField: 'parent_card_id', as: 'children' } },
        { $lookup: { from: 'cards', localField: 'linked_feedback_ids', foreignField: '_id', as: 'linked_feedback' } },
      ],
      stats: [
        { $group: { _id: '$column_id', count: { $sum: 1 } } },
      ],
      total: [
        { $count: 'count' },
      ],
    },
  },
];
```

**Benchmarks:**

| Query | Cards | Target | Current |
|-------|-------|--------|---------|
| GET /boards/:id/cards | 10 | <20ms | ~15ms |
| GET /boards/:id/cards | 50 | <50ms | ~45ms |
| GET /boards/:id/cards | 100 | <100ms | ~90ms |
| GET /boards/:id/cards | 500 | <300ms | TBD |

---

### 10.1 Add database query performance logging

- [ ] Instrument all repository methods with timing logs
- [ ] Log slow queries (>100ms) at WARN level
- [ ] Include query details (collection, filter, duration)
- [ ] Write tests verifying logs are generated

**Implementation:**
```typescript
// Repository method wrapper
private async timed<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > 100) {
      logger.warn('Slow query detected', {
        operation,
        collection,
        duration: `${duration.toFixed(2)}ms`,
      });
    } else {
      logger.debug('Query completed', {
        operation,
        collection,
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error('Query failed', {
      operation,
      collection,
      duration: `${duration.toFixed(2)}ms`,
      error: error.message,
    });
    throw error;
  }
}

// Usage in repository
async findById(id: string): Promise<CardDocument | null> {
  return this.timed('findById', 'cards', async () => {
    const objectId = this.toObjectId(id);
    if (!objectId) return null;
    return this.collection.findOne({ _id: objectId });
  });
}
```

---

### 10.2 Implement WebSocket connection management

- [ ] Track active WebSocket connections per board
- [ ] Implement graceful disconnect handling
- [ ] Add reconnection logic guidance (client-side)
- [ ] Log connection/disconnection events
- [ ] Test with 50 concurrent connections

**Connection Tracking:**
```typescript
class ConnectionManager {
  private connections: Map<string, Set<string>> = new Map(); // boardId → socketIds

  addConnection(boardId: string, socketId: string): void {
    if (!this.connections.has(boardId)) {
      this.connections.set(boardId, new Set());
    }
    this.connections.get(boardId)!.add(socketId);

    logger.info('WebSocket connected', {
      boardId,
      socketId,
      activeConnections: this.getConnectionCount(boardId),
    });
  }

  removeConnection(boardId: string, socketId: string): void {
    this.connections.get(boardId)?.delete(socketId);

    logger.info('WebSocket disconnected', {
      boardId,
      socketId,
      activeConnections: this.getConnectionCount(boardId),
    });
  }

  getConnectionCount(boardId: string): number {
    return this.connections.get(boardId)?.size ?? 0;
  }

  getTotalConnections(): number {
    let total = 0;
    for (const sockets of this.connections.values()) {
      total += sockets.size;
    }
    return total;
  }
}
```

**Graceful Disconnect:**
```typescript
io.on('connection', (socket) => {
  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', { socketId: socket.id, reason });
    // Clean up room memberships
    // Emit user:left event if applicable
  });
});
```

---

### 10.3 Finalize health check endpoints

- [ ] Enhance `GET /health` endpoint (returns 200 OK)
- [ ] Enhance `GET /health/db` endpoint (checks MongoDB connection)
- [ ] Add `GET /health/websocket` endpoint (checks Socket.io status)
- [ ] Use in Docker health checks
- [ ] Write integration tests

**Health Check Responses:**

```typescript
// GET /health
{
  "status": "healthy",
  "timestamp": "2025-12-28T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}

// GET /health/db
{
  "status": "healthy",
  "database": "connected",
  "latency": "5ms"
}

// GET /health/websocket
{
  "status": "healthy",
  "connections": {
    "total": 42,
    "byBoard": {
      "board123": 5,
      "board456": 10
    }
  }
}
```

**Docker Health Check:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 📁 Files to Create/Modify

```
src/shared/
├── utils/
│   └── timing.ts         # Query timing utilities
└── monitoring/
    └── metrics.ts        # Performance metrics

src/gateway/
├── health.ts             # Enhanced health endpoints
├── SocketGateway.ts      # Add connection tracking
└── ConnectionManager.ts  # Connection management

tests/
├── unit/
│   └── monitoring/
│       └── timing.test.ts
└── integration/
    └── health.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Query Timing (unit) | ~6 | Logging, thresholds |
| Connection Manager (unit) | ~8 | Add/remove, counting |
| Health Endpoints (integration) | ~6 | All health checks |
| Performance (load) | ~5 | 50 concurrent connections |
| **Total** | **~25** | |

---

## 📝 Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p95) | <200ms |
| WebSocket Event Latency | <100ms |
| Database Query Time (p95) | <100ms |
| Memory Usage | <512MB |
| Concurrent WebSocket Connections | 50+ |

---

## 🔗 Dependencies

- Phase 1-9 completed
- MongoDB indexes created
- Socket.io gateway (Phase 6)

---

## ⚠️ Considerations

1. **Index Usage**: Verify queries use indexes with `explain()`:
   ```javascript
   db.cards.find({ board_id: ObjectId("...") }).explain("executionStats")
   ```

2. **Connection Pooling**: MongoDB driver pool size should match expected load:
   ```typescript
   const client = new MongoClient(uri, {
     maxPoolSize: 50,
     minPoolSize: 5,
   });
   ```

3. **Memory Leaks**: Watch for WebSocket connection leaks on disconnect.

4. **Logging Volume**: Query timing logs could be high volume. Consider sampling in production.

---

## 📊 Monitoring Dashboard Suggestions

Consider integrating:
- **Grafana + Prometheus** for metrics visualization
- **MongoDB Atlas** built-in monitoring
- **PM2** for Node.js process monitoring

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 9](./BACKEND_PHASE_09_ERROR_HANDLING.md)
