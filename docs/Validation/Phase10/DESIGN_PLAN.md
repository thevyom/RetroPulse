# Phase 10 Design Plan: Admin Dashboard

**Created**: 2026-01-07
**Status**: Draft - Pending Approval
**Author**: Principal Engineer

---

## 1. Executive Summary

Phase 10 implements an Admin Dashboard for RetroPulse that provides operators visibility into system health, active usage, and errors. This enables proactive monitoring and debugging without external infrastructure dependencies.

### Goals

1. **Operational Visibility** - See active users, boards, and connections in real-time
2. **Health Monitoring** - Monitor system health (DB, memory, uptime)
3. **Error Awareness** - Track and view recent errors
4. **Minimal Infrastructure** - No external dependencies (Prometheus/Grafana optional)

### Non-Goals (Deferred)

- Historical data / trending (requires time-series storage)
- Alerting / notifications (requires external service)
- Multi-tenant admin (single deployment assumed)
- OpenTelemetry / distributed tracing (evaluated, deferred - see Appendix A)

---

## 2. Problem Statement

### Current State

| Capability | Status | Location |
|------------|--------|----------|
| Prometheus metrics | Partial | `GET /health/metrics` |
| Basic health check | Complete | `GET /health/` |
| Detailed health check | Complete | `GET /health/detailed` |
| Admin authentication | Complete | `X-Admin-Secret` header |
| WebSocket connection tracking | Complete | `SocketGateway` |
| Admin UI / Dashboard | **Missing** | - |

### Pain Points

1. **No visibility into active usage** - Cannot see how many users are connected
2. **No board overview** - Cannot see which boards are active
3. **No error visibility** - Errors only in server logs
4. **Metrics require external tools** - Prometheus format not human-readable

### User Stories

> As an **operator**, I want to see how many users are currently connected, so I can understand system load.

> As an **operator**, I want to see a list of active boards with user counts, so I can identify heavily-used boards.

> As an **operator**, I want to see recent errors, so I can debug issues without searching logs.

> As an **operator**, I want to see system health at a glance, so I can detect problems early.

---

## 3. Proposed Solution

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /admin (protected route)                                 │  │
│  │                                                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │ Users   │ │ Boards  │ │ Errors  │ │ Memory  │        │  │
│  │  │   42    │ │    8    │ │    3    │ │ 128MB   │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ Active Boards                                       │ │  │
│  │  │ ┌─────────────────────────────────────────────────┐ │ │  │
│  │  │ │ Sprint 23 Retro    │ 5 users │ 12 cards │ Open  │ │ │  │
│  │  │ │ Team Alpha Review  │ 3 users │  8 cards │ Open  │ │ │  │
│  │  │ └─────────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ Recent Errors (last 5 minutes)                      │ │  │
│  │  │ ┌─────────────────────────────────────────────────┐ │ │  │
│  │  │ │ 09:41:23 │ VALIDATION_ERROR │ Invalid board ID  │ │ │  │
│  │  │ │ 09:40:15 │ NOT_FOUND       │ Board not found   │ │ │  │
│  │  │ └─────────────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (polling every 10-30s)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
│                                                                  │
│  New Admin API Endpoints:                                        │
│  ├── GET /v1/admin/stats     → Aggregate metrics                │
│  ├── GET /v1/admin/boards    → Active boards with details       │
│  └── GET /v1/admin/errors    → Recent errors from buffer        │
│                                                                  │
│  Existing (reused):                                              │
│  ├── GET /health/detailed    → System health                    │
│  └── GET /health/metrics     → Prometheus format (keep)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Why This Approach

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **A) Built-in Dashboard** | Simple, no infra, real-time capable | Custom code, limited visualization | **Selected** |
| B) Grafana + Prometheus | Industry standard, rich viz | Infra overhead, overkill for small deploy | Deferred |
| C) OpenTelemetry | Distributed tracing | Complexity, infra needs | Deferred (see Appendix A) |
| D) CLI/terminal only | Zero UI work | Less accessible | Rejected |

**Rationale**: RetroPulse is a single-service application with a small team. A lightweight built-in dashboard provides immediate value without infrastructure complexity. The existing `/health/metrics` endpoint preserves the upgrade path to Grafana if needed later.

---

## 4. Technical Design

### 4.1 Backend API Endpoints

#### GET /v1/admin/stats

**Authentication**: `X-Admin-Secret` header required

**Response**:
```typescript
interface AdminStats {
  connections: {
    websocket_active: number;      // From gauge metric
    http_requests_last_minute: number;
  };
  boards: {
    total: number;                 // All boards in DB
    active: number;                // Boards with recent activity (last 1 hour)
    open: number;                  // Boards not closed
  };
  users: {
    active_sessions: number;       // Users with recent heartbeat
    unique_today: number;          // Distinct users today
  };
  errors: {
    last_5_minutes: number;
    last_hour: number;
  };
  system: {
    uptime_seconds: number;
    memory_used_mb: number;
    memory_total_mb: number;
  };
  timestamp: string;               // ISO 8601
}
```

**Implementation Notes**:
- Aggregate from existing Prometheus metrics where possible
- Cache for 5 seconds to prevent expensive queries on refresh

---

#### GET /v1/admin/boards

**Authentication**: `X-Admin-Secret` header required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | `open` \| `closed` \| `all` | `open` | Filter by board status |
| sort | `activity` \| `users` \| `created` | `activity` | Sort order |
| limit | number | 50 | Max results |

**Response**:
```typescript
interface AdminBoardList {
  boards: AdminBoard[];
  total: number;
  timestamp: string;
}

interface AdminBoard {
  id: string;
  name: string;
  status: 'open' | 'closed';
  created_at: string;
  last_activity_at: string;
  stats: {
    user_count: number;           // Active users (with heartbeat)
    card_count: number;
    reaction_count: number;
  };
  creator_hash_prefix: string;    // First 8 chars for identification
}
```

**Implementation Notes**:
- Join with user session heartbeats for active user count
- Use aggregation pipeline for efficient card/reaction counts
- Index on `last_activity_at` for sorting

---

#### GET /v1/admin/errors

**Authentication**: `X-Admin-Secret` header required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| minutes | number | 5 | Time window |
| limit | number | 100 | Max results |

**Response**:
```typescript
interface AdminErrorList {
  errors: AdminError[];
  total: number;
  window_minutes: number;
  timestamp: string;
}

interface AdminError {
  id: string;
  timestamp: string;
  code: string;                   // e.g., "VALIDATION_ERROR", "NOT_FOUND"
  message: string;
  path: string;                   // Request path
  method: string;                 // HTTP method
  correlation_id?: string;        // For log tracing
  count: number;                  // Occurrences of same error (grouped)
}
```

**Implementation Notes**:
- Requires in-memory error buffer (circular buffer, max 1000 entries)
- Group identical errors by code + message + path
- No sensitive data (no request bodies, no user identifiers)

---

### 4.2 Error Buffer Implementation

New module: `backend/src/shared/observability/error-buffer.ts`

```typescript
interface BufferedError {
  id: string;
  timestamp: Date;
  code: string;
  message: string;
  path: string;
  method: string;
  correlationId?: string;
}

class ErrorBuffer {
  private buffer: BufferedError[] = [];
  private readonly maxSize = 1000;

  add(error: BufferedError): void {
    this.buffer.push(error);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
  }

  getRecent(minutes: number, limit: number): BufferedError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.buffer
      .filter(e => e.timestamp >= cutoff)
      .slice(-limit);
  }

  getGrouped(minutes: number): GroupedError[] {
    // Group by code + message + path, count occurrences
  }
}

export const errorBuffer = new ErrorBuffer();
```

**Integration Point**: `error-handler.ts` middleware calls `errorBuffer.add()` after logging.

---

### 4.3 Frontend Components

#### Route Structure

```
/admin                    → AdminDashboard (protected)
  ├── AdminStatsCards     → 4 metric cards
  ├── AdminBoardList      → Board table with details
  └── AdminErrorList      → Recent errors
```

#### Authentication Flow

```typescript
// AdminDashboard.tsx
function AdminDashboard() {
  const [adminSecret, setAdminSecret] = useState(
    localStorage.getItem('admin_secret') || ''
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validate secret on mount
  useEffect(() => {
    if (adminSecret) {
      validateAdminSecret(adminSecret).then(setIsAuthenticated);
    }
  }, [adminSecret]);

  if (!isAuthenticated) {
    return <AdminLoginForm onSubmit={setAdminSecret} />;
  }

  return <AdminDashboardContent />;
}
```

#### Data Fetching

```typescript
// useAdminStats.ts
function useAdminStats(refreshInterval = 10000) {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => fetchAdminStats(adminSecret),
    refetchInterval: refreshInterval,
  });
}
```

**Note**: Uses polling (not WebSocket) for simplicity. Admin dashboard doesn't need sub-second updates.

---

### 4.4 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Admin secret exposure | Stored in localStorage (user's browser only), transmitted via header |
| Brute force | Rate limiting on admin endpoints (stricter than normal) |
| Information disclosure | No PII in responses (user hashes truncated, no content) |
| CSRF | Admin secret header provides protection |
| Production exposure | Document: admin endpoints should be behind VPN/firewall in production |

**Rate Limiting**:
```typescript
// Stricter rate limit for admin endpoints
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 requests per minute
  message: 'Too many admin requests'
});
```

---

## 5. UI Mockups

### 5.1 Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RetroPulse Admin                                         [Refresh] [↻] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────┐│
│  │ Connections   │  │ Active Boards │  │ Errors (5m)   │  │ Memory    ││
│  │      42       │  │       8       │  │       3       │  │  128 MB   ││
│  │  ↑ 5 from 1h  │  │  ↓ 2 from 1h  │  │  ⚠ warning    │  │  of 512   ││
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────┘│
│                                                                         │
│  Active Boards                                              [View All] │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Board Name              │ Users │ Cards │ Reactions │ Last Active  ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ Sprint 23 Retrospective │   5   │  12   │    23     │ 2 min ago    ││
│  │ Team Alpha Review       │   3   │   8   │    15     │ 5 min ago    ││
│  │ Q4 Planning Session     │   8   │  24   │    42     │ 12 min ago   ││
│  │ ...                     │       │       │           │              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  Recent Errors                                              [View All] │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Time     │ Code             │ Message                  │ Count     ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 09:41:23 │ VALIDATION_ERROR │ Invalid board ID format  │ 2         ││
│  │ 09:40:15 │ NOT_FOUND        │ Board not found          │ 1         ││
│  │ 09:38:42 │ RATE_LIMIT       │ Too many requests        │ 5         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  System Health                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ MongoDB: ● Connected (12ms)    Uptime: 2d 4h 12m                    ││
│  │ Memory: 128MB / 512MB (25%)    Version: 1.0.0                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Login Form

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         RetroPulse Admin                                │
│                                                                         │
│                    ┌─────────────────────────────┐                     │
│                    │ Admin Secret                │                     │
│                    │ ●●●●●●●●●●●●●●●●            │                     │
│                    └─────────────────────────────┘                     │
│                                                                         │
│                         [  Login  ]                                     │
│                                                                         │
│                    Invalid admin secret ✗                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Plan

### 6.1 Task Breakdown

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| **Backend** | | | |
| B1 | Create error buffer module | Low | - |
| B2 | Integrate error buffer with error handler | Low | B1 |
| B3 | Create admin stats endpoint | Medium | - |
| B4 | Create admin boards endpoint | Medium | - |
| B5 | Create admin errors endpoint | Low | B1, B2 |
| B6 | Add admin routes with rate limiting | Low | B3, B4, B5 |
| **Frontend** | | | |
| F1 | Create admin route and auth flow | Medium | - |
| F2 | Create AdminStatsCards component | Low | B3 |
| F3 | Create AdminBoardList component | Medium | B4 |
| F4 | Create AdminErrorList component | Low | B5 |
| F5 | Create AdminDashboard layout | Low | F2, F3, F4 |
| F6 | Add auto-refresh and loading states | Low | F5 |
| **Testing** | | | |
| T1 | Unit tests for error buffer | Low | B1 |
| T2 | Integration tests for admin endpoints | Medium | B6 |
| T3 | E2E test for admin dashboard | Medium | F5 |
| **Documentation** | | | |
| D1 | Update API documentation | Low | B6 |
| D2 | Add admin dashboard to deployment guide | Low | F5 |

### 6.2 Sequencing

```
Phase 10.1: Backend Foundation
├── B1: Error buffer module
├── B2: Error handler integration
├── B3: Admin stats endpoint
├── B4: Admin boards endpoint
├── B5: Admin errors endpoint
└── B6: Admin routes

Phase 10.2: Frontend Dashboard
├── F1: Admin route and auth
├── F2: Stats cards
├── F3: Board list
├── F4: Error list
├── F5: Dashboard layout
└── F6: Polish (refresh, loading)

Phase 10.3: Testing & Documentation
├── T1: Unit tests
├── T2: Integration tests
├── T3: E2E tests
├── D1: API docs
└── D2: Deployment guide
```

---

## 7. File Changes

### 7.1 New Files

| Path | Description |
|------|-------------|
| `backend/src/shared/observability/error-buffer.ts` | In-memory error buffer |
| `backend/src/domains/admin/admin-dashboard.controller.ts` | Admin API handlers |
| `backend/src/domains/admin/admin-dashboard.service.ts` | Admin business logic |
| `backend/src/domains/admin/admin-dashboard.routes.ts` | Route definitions |
| `backend/src/domains/admin/admin-dashboard.types.ts` | TypeScript interfaces |
| `frontend/src/features/admin/pages/AdminDashboard.tsx` | Dashboard page |
| `frontend/src/features/admin/components/AdminStatsCards.tsx` | Metric cards |
| `frontend/src/features/admin/components/AdminBoardList.tsx` | Board table |
| `frontend/src/features/admin/components/AdminErrorList.tsx` | Error table |
| `frontend/src/features/admin/components/AdminLoginForm.tsx` | Auth form |
| `frontend/src/features/admin/hooks/useAdminStats.ts` | Data fetching |
| `frontend/src/features/admin/hooks/useAdminBoards.ts` | Data fetching |
| `frontend/src/features/admin/hooks/useAdminErrors.ts` | Data fetching |

### 7.2 Modified Files

| Path | Change |
|------|--------|
| `backend/src/shared/middleware/error-handler.ts` | Add error buffer integration |
| `backend/src/gateway/routes/index.ts` | Register admin dashboard routes |
| `frontend/src/App.tsx` | Add `/admin` route |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard loads successfully | 100% | E2E test |
| Stats refresh without error | 100% | E2E test |
| Board list displays correctly | 100% | E2E test |
| Error list displays correctly | 100% | E2E test |
| Response time for /admin/stats | < 200ms | Integration test |
| Response time for /admin/boards | < 500ms | Integration test |
| Admin auth rejects invalid secret | 100% | Integration test |

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Error buffer memory growth | Medium | Low | Circular buffer with max size |
| Admin secret in localStorage | Medium | Medium | Document security best practices |
| Expensive board aggregation queries | Medium | Medium | Caching, pagination, indexes |
| Dashboard polling overloads server | Low | Low | Rate limiting, reasonable intervals |
| Security audit flags admin endpoint | Medium | Medium | Document production deployment behind VPN |

---

## 10. Future Enhancements (Out of Scope)

| Enhancement | Rationale for Deferral |
|-------------|------------------------|
| Historical data / charts | Requires time-series storage (InfluxDB/Prometheus) |
| Alerting | Requires external notification service |
| OpenTelemetry tracing | Evaluated (see Appendix A), overkill for current scale |
| Multi-board admin actions | Focus on visibility first, actions later |
| Export to CSV/JSON | Low priority, can access API directly |

---

## Appendix A: OpenTelemetry Evaluation

### Why OpenTelemetry Was Considered

OpenTelemetry (OTel) provides:
- Distributed tracing (see exactly where time is spent in a request)
- Automatic instrumentation (HTTP, MongoDB, Socket.IO)
- Unified observability (traces, metrics, logs correlated)

### Why Deferred

| Factor | Assessment |
|--------|------------|
| Service count | 1 backend (no distributed tracing benefit) |
| Infrastructure | Requires Jaeger/Zipkin collector |
| Team bandwidth | Learning curve + infra management |
| Current pain points | Need visibility, not detailed tracing |
| Upgrade path | Prometheus metrics preserved; OTel can be added later |

### Recommendation

Adopt OpenTelemetry when:
1. A second backend service is added
2. Performance debugging becomes a frequent need
3. Moving to Kubernetes (OTel Operator simplifies setup)

---

## Appendix B: Prometheus vs Built-in Dashboard

### Current Prometheus Metrics (Already Implemented)

```
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}
websocket_connections_active
boards_created_total
cards_created_total{card_type}
reactions_total{action}
```

### Why Not Grafana for This Phase

| Factor | Grafana | Built-in Dashboard |
|--------|---------|-------------------|
| Setup time | Hours (infra + dashboards) | Days (code) |
| Maintenance | Grafana + Prometheus containers | Part of app |
| Customization | JSON dashboard definitions | React components |
| Real-time | Requires Prometheus scraping | Direct API calls |
| Team familiarity | New tool to learn | Existing React/TS skills |

**Decision**: Built-in dashboard for immediate needs; Grafana remains an option for future scaling.

---

*Phase 10 Design Plan - 2026-01-07*
*Pending user approval before implementation*
