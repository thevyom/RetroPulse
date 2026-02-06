# Phase 10 Task List: Admin Dashboard

**Created**: 2026-01-07
**Status**: Draft - Pending Approval
**Reference**: [DESIGN_PLAN.md](./DESIGN_PLAN.md)

---

## Overview

| Phase | Tasks | Status |
|-------|-------|--------|
| 10.1 Backend Foundation | 6 | Pending |
| 10.2 Frontend Dashboard | 6 | Pending |
| 10.3 Testing & Documentation | 5 | Pending |
| **Total** | **17** | |

---

## Phase 10.1: Backend Foundation

### B1: Create Error Buffer Module

**Status**: [ ] Pending

**Description**: Create an in-memory circular buffer to store recent errors for the admin dashboard.

**File**: `backend/src/shared/observability/error-buffer.ts`

**Acceptance Criteria**:
- [ ] `ErrorBuffer` class with `add()` and `getRecent()` methods
- [ ] Circular buffer with max 1000 entries
- [ ] `getGrouped()` method to aggregate by code + message + path
- [ ] Exported singleton `errorBuffer`
- [ ] TypeScript interfaces for `BufferedError` and `GroupedError`

**Estimated Effort**: Low

---

### B2: Integrate Error Buffer with Error Handler

**Status**: [ ] Pending

**Dependencies**: B1

**Description**: Modify the existing error handler middleware to add errors to the buffer.

**File**: `backend/src/shared/middleware/error-handler.ts`

**Acceptance Criteria**:
- [ ] Import `errorBuffer` singleton
- [ ] Call `errorBuffer.add()` with error details
- [ ] Include correlation ID if available
- [ ] No PII in buffered errors (no request bodies, truncated user hashes)

**Estimated Effort**: Low

---

### B3: Create Admin Stats Endpoint

**Status**: [ ] Pending

**Description**: Create endpoint to return aggregate statistics for the admin dashboard.

**Files**:
- `backend/src/domains/admin/admin-dashboard.service.ts`
- `backend/src/domains/admin/admin-dashboard.controller.ts`
- `backend/src/domains/admin/admin-dashboard.types.ts`

**Acceptance Criteria**:
- [ ] `GET /v1/admin/stats` endpoint
- [ ] Requires `X-Admin-Secret` header
- [ ] Returns `AdminStats` interface (connections, boards, users, errors, system)
- [ ] WebSocket connection count from Prometheus gauge
- [ ] Board counts from database
- [ ] Error counts from error buffer
- [ ] System stats from Node.js process
- [ ] Response cached for 5 seconds

**Estimated Effort**: Medium

---

### B4: Create Admin Boards Endpoint

**Status**: [ ] Pending

**Description**: Create endpoint to return list of boards with activity details.

**Files**:
- `backend/src/domains/admin/admin-dashboard.service.ts`
- `backend/src/domains/admin/admin-dashboard.controller.ts`

**Acceptance Criteria**:
- [ ] `GET /v1/admin/boards` endpoint
- [ ] Requires `X-Admin-Secret` header
- [ ] Query params: `status` (open/closed/all), `sort` (activity/users/created), `limit`
- [ ] Returns `AdminBoardList` interface
- [ ] Includes user count (from session heartbeats)
- [ ] Includes card count, reaction count
- [ ] Efficient aggregation (single query or aggregation pipeline)

**Estimated Effort**: Medium

---

### B5: Create Admin Errors Endpoint

**Status**: [ ] Pending

**Dependencies**: B1, B2

**Description**: Create endpoint to return recent errors from the buffer.

**Files**:
- `backend/src/domains/admin/admin-dashboard.service.ts`
- `backend/src/domains/admin/admin-dashboard.controller.ts`

**Acceptance Criteria**:
- [ ] `GET /v1/admin/errors` endpoint
- [ ] Requires `X-Admin-Secret` header
- [ ] Query params: `minutes` (default 5), `limit` (default 100)
- [ ] Returns `AdminErrorList` interface
- [ ] Groups identical errors by code + message + path
- [ ] Includes occurrence count

**Estimated Effort**: Low

---

### B6: Register Admin Dashboard Routes

**Status**: [ ] Pending

**Dependencies**: B3, B4, B5

**Description**: Create route file and register with Express app.

**Files**:
- `backend/src/domains/admin/admin-dashboard.routes.ts`
- `backend/src/gateway/routes/index.ts`

**Acceptance Criteria**:
- [ ] Routes registered under `/v1/admin/`
- [ ] Admin auth middleware applied to all routes
- [ ] Stricter rate limiting (30 req/min)
- [ ] All routes require `X-Admin-Secret` header

**Estimated Effort**: Low

---

## Phase 10.2: Frontend Dashboard

### F1: Create Admin Route and Auth Flow

**Status**: [ ] Pending

**Description**: Create protected `/admin` route with authentication.

**Files**:
- `frontend/src/features/admin/pages/AdminDashboard.tsx`
- `frontend/src/features/admin/components/AdminLoginForm.tsx`
- `frontend/src/App.tsx`

**Acceptance Criteria**:
- [ ] `/admin` route in React Router
- [ ] Login form with admin secret input
- [ ] Secret stored in localStorage
- [ ] Validation against backend
- [ ] Redirect to login if invalid/missing secret
- [ ] Logout button to clear stored secret

**Estimated Effort**: Medium

---

### F2: Create AdminStatsCards Component

**Status**: [ ] Pending

**Dependencies**: B3

**Description**: Create component to display 4 key metrics as cards.

**Files**:
- `frontend/src/features/admin/components/AdminStatsCards.tsx`
- `frontend/src/features/admin/hooks/useAdminStats.ts`

**Acceptance Criteria**:
- [ ] 4 cards: Connections, Active Boards, Errors, Memory
- [ ] Fetches from `/v1/admin/stats`
- [ ] Auto-refresh every 10 seconds
- [ ] Loading state while fetching
- [ ] Error state if request fails
- [ ] Visual indicators (warning if errors > 0)

**Estimated Effort**: Low

---

### F3: Create AdminBoardList Component

**Status**: [ ] Pending

**Dependencies**: B4

**Description**: Create component to display table of active boards.

**Files**:
- `frontend/src/features/admin/components/AdminBoardList.tsx`
- `frontend/src/features/admin/hooks/useAdminBoards.ts`

**Acceptance Criteria**:
- [ ] Table with columns: Name, Users, Cards, Reactions, Last Active
- [ ] Fetches from `/v1/admin/boards`
- [ ] Sort by activity (most recent first)
- [ ] Pagination or "View All" link
- [ ] Auto-refresh every 30 seconds
- [ ] Loading and error states

**Estimated Effort**: Medium

---

### F4: Create AdminErrorList Component

**Status**: [ ] Pending

**Dependencies**: B5

**Description**: Create component to display recent errors.

**Files**:
- `frontend/src/features/admin/components/AdminErrorList.tsx`
- `frontend/src/features/admin/hooks/useAdminErrors.ts`

**Acceptance Criteria**:
- [ ] Table with columns: Time, Code, Message, Count
- [ ] Fetches from `/v1/admin/errors`
- [ ] Grouped by error type
- [ ] Auto-refresh every 10 seconds
- [ ] "No errors" message when empty
- [ ] Loading and error states

**Estimated Effort**: Low

---

### F5: Create AdminDashboard Layout

**Status**: [ ] Pending

**Dependencies**: F2, F3, F4

**Description**: Compose dashboard layout with all components.

**Files**:
- `frontend/src/features/admin/pages/AdminDashboard.tsx`

**Acceptance Criteria**:
- [ ] Header with title and refresh button
- [ ] Stats cards at top
- [ ] Board list in middle
- [ ] Error list below
- [ ] System health section at bottom
- [ ] Responsive layout (stack on mobile)
- [ ] Consistent styling with rest of app

**Estimated Effort**: Low

---

### F6: Add Auto-refresh and Loading States

**Status**: [ ] Pending

**Dependencies**: F5

**Description**: Polish the dashboard with proper loading, error, and refresh behavior.

**Files**:
- All admin feature components

**Acceptance Criteria**:
- [ ] Loading skeleton on initial load
- [ ] Non-blocking refresh (show stale data while refreshing)
- [ ] Last updated timestamp
- [ ] Manual refresh button
- [ ] Error toast on failed refresh
- [ ] Graceful degradation (show available data if one endpoint fails)

**Estimated Effort**: Low

---

## Phase 10.3: Testing & Documentation

### T1: Unit Tests for Error Buffer

**Status**: [ ] Pending

**Dependencies**: B1

**Description**: Unit tests for the error buffer module.

**File**: `backend/tests/unit/shared/observability/error-buffer.test.ts`

**Test Cases**:
- [ ] `add()` stores error correctly
- [ ] Circular buffer respects max size
- [ ] `getRecent()` filters by time window
- [ ] `getGrouped()` aggregates correctly
- [ ] Thread-safe under concurrent adds

**Estimated Effort**: Low

---

### T2: Integration Tests for Admin Endpoints

**Status**: [ ] Pending

**Dependencies**: B6

**Description**: Integration tests for admin API endpoints.

**File**: `backend/tests/integration/admin/admin-dashboard.test.ts`

**Test Cases**:
- [ ] Stats endpoint returns correct schema
- [ ] Boards endpoint returns correct schema
- [ ] Errors endpoint returns correct schema
- [ ] All endpoints reject missing X-Admin-Secret
- [ ] All endpoints reject invalid X-Admin-Secret
- [ ] Rate limiting works correctly
- [ ] Query params work correctly

**Estimated Effort**: Medium

---

### T3: E2E Tests for Admin Dashboard

**Status**: [ ] Pending

**Dependencies**: F5

**Description**: End-to-end tests for the admin dashboard.

**File**: `frontend/tests/e2e/admin-dashboard.spec.ts`

**Test Cases**:
- [ ] Login form accepts valid secret
- [ ] Login form rejects invalid secret
- [ ] Dashboard displays stats cards
- [ ] Dashboard displays board list
- [ ] Dashboard displays error list
- [ ] Refresh button updates data
- [ ] Logout clears session

**Estimated Effort**: Medium

---

### D1: Update API Documentation

**Status**: [ ] Pending

**Dependencies**: B6

**Description**: Document the new admin API endpoints.

**File**: `docs/backend/BACKEND_API_SPECIFICATION.md`

**Sections**:
- [ ] Admin Stats endpoint
- [ ] Admin Boards endpoint
- [ ] Admin Errors endpoint
- [ ] Authentication requirements
- [ ] Rate limiting

**Estimated Effort**: Low

---

### D2: Update Deployment Guide

**Status**: [ ] Pending

**Dependencies**: F5

**Description**: Document admin dashboard deployment and security.

**File**: `docs/DEPLOYMENT_GUIDE.md`

**Sections**:
- [ ] Admin secret configuration
- [ ] Security recommendations (VPN/firewall)
- [ ] Accessing the dashboard
- [ ] Monitoring best practices

**Estimated Effort**: Low

---

## Summary

### Critical Path

```
B1 (Error Buffer)
 └── B2 (Error Handler Integration)
      └── B5 (Errors Endpoint)
           └── B6 (Routes)
                └── F1 (Auth)
                     └── F4 (Error List)
                          └── F5 (Dashboard)
                               └── T3 (E2E Tests)

B3 (Stats Endpoint) ──┐
B4 (Boards Endpoint) ─┼── B6 (Routes) ─── F2, F3 ─── F5
B5 (Errors Endpoint) ─┘
```

### Estimated Total Effort

| Category | Low | Medium | Total |
|----------|-----|--------|-------|
| Backend | 4 | 2 | 6 |
| Frontend | 3 | 3 | 6 |
| Testing | 2 | 2 | 4 |
| Docs | 2 | 0 | 2 |
| **Total** | **11** | **7** | **18** |

---

*Task List - Phase 10 Admin Dashboard*
*Pending user approval before implementation*
