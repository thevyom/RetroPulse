# Future Needs: Admin/Super-User Features

**Created**: 2026-01-02
**Status**: Deferred
**Context**: Features identified during E2E admin testing analysis but not needed for immediate scope

---

## 1. Deferred Features

These features were identified during the E2E admin testing design but are deferred for future implementation.

---

## 2. Admin Dashboard Board (/admin)

### 2.1 Concept

A special board type that provides system-wide administrative capabilities.

### 2.2 Potential Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Board Overview | List all boards with stats | P2 |
| User Management | View active users across boards | P3 |
| System Health | WebSocket connections, API latency | P3 |
| Data Cleanup | Delete old/orphaned boards | P2 |
| Test Data Reset | Clear all test data in one action | P1 |

### 2.3 Why Deferred

1. Out of scope for E2E testing problem
2. Requires significant frontend development
3. Security implications need careful design
4. No immediate user need identified

### 2.4 Implementation Notes (For Future Reference)

```typescript
// Potential route structure
GET  /admin/boards           // List all boards
GET  /admin/boards/:id       // Board details with all users
POST /admin/boards/:id/reset // Reset board to clean state
GET  /admin/health           // System health check
GET  /admin/stats            // Usage statistics
```

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Concept

More granular permissions than current admin/non-admin binary.

### 3.2 Potential Roles

| Role | Permissions |
|------|-------------|
| Viewer | Read cards only |
| Participant | Create cards, react |
| Moderator | Delete any card, edit columns |
| Admin | Full board control |
| Super-Admin | System-wide access |

### 3.3 Why Deferred

1. Current binary admin model works for retrospectives
2. Adds complexity without clear benefit
3. Would require database schema changes
4. UI complexity increases

---

## 4. Audit Logging

### 4.1 Concept

Track admin actions for accountability.

### 4.2 Potential Events

- Board created/closed/deleted
- User promoted to admin
- Cards deleted by admin
- Columns edited

### 4.3 Why Deferred

1. No compliance requirement identified
2. Storage overhead
3. UI for viewing logs needed

---

## 5. Multi-Tenant Admin

### 5.1 Concept

Organization-level admin for enterprise deployments.

### 5.2 Why Deferred

1. Product is single-tenant currently
2. Major architectural change
3. No customer requirement

---

## 6. Implementation Timeline

These features should be reconsidered when:

1. **Admin Dashboard**: User feedback indicates need for board management
2. **RBAC**: Enterprise customers require permission granularity
3. **Audit Logging**: Compliance requirements emerge
4. **Multi-Tenant**: SaaS offering planned

---

## 7. References

- [SUPER_USER_RECOMMENDATIONS.md](SUPER_USER_RECOMMENDATIONS.md) - Current E2E solution
- [ADMIN_TEST_BOARD_DESIGN.md](../01012330/ADMIN_TEST_BOARD_DESIGN.md) - Initial design exploration

---

*Document created by Principal Engineer - 2026-01-02*
