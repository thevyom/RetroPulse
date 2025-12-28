# Technical Design Decisions - Collaborative Retro Board
**Date**: 2025-12-24
**PRD Version**: 1.2
**Status**: Proposed for MVP - Requires Architecture Review

## Overview
This document outlines technical design decisions and assumptions for the MVP implementation. These decisions balance simplicity, cost, and scalability for the initial release while maintaining extensibility for future phases.

---

## 1. Data Model & Storage

### 1.1 Database Technology
**Decision**: PostgreSQL (SQL database)

**Rationale**:
- Strong ACID guarantees for data consistency
- Relational model fits board → columns → cards hierarchy well
- Rich indexing capabilities for real-time queries
- JSON column support for flexible metadata
- Mature ecosystem and tooling
- Cost-effective at scale
- Supports future analytics and reporting

**Alternative Considered**: MongoDB (NoSQL)
- Rejected for MVP due to need for transactional consistency across cards/reactions/groupings

---

### 1.2 Data Model Schema (Proposed)

#### Boards Table
```
boards
- id (UUID, primary key)
- name (VARCHAR)
- created_at (TIMESTAMP)
- created_by_cookie_id (VARCHAR, hashed)
- state (ENUM: 'active', 'closed')
- closed_at (TIMESTAMP, nullable)
- card_limit_per_user (INTEGER, nullable = unlimited)
- reaction_limit_per_user (INTEGER, nullable = unlimited)
- columns (JSONB) - array of {id, name, color}
- shareable_link (VARCHAR, unique, indexed)
```

#### Users/Sessions Table
```
user_sessions
- cookie_id (VARCHAR, primary key, hashed)
- board_id (UUID, foreign key)
- alias (VARCHAR)
- last_active_at (TIMESTAMP)
- is_admin (BOOLEAN)
- created_at (TIMESTAMP)
```

#### Cards Table
```
cards
- id (UUID, primary key)
- board_id (UUID, foreign key, indexed)
- column_id (VARCHAR) - references boards.columns[].id
- content (TEXT)
- created_by_cookie_id (VARCHAR, hashed)
- is_anonymous (BOOLEAN)
- card_type (ENUM: 'feedback', 'action')
- parent_card_id (UUID, nullable, foreign key to cards.id) - for parent-child relationships
- direct_reaction_count (INTEGER, default 0) - count of reactions directly on this card
- aggregated_reaction_count (INTEGER, default 0) - for parent cards: own + children's reactions
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- INDEX on (board_id, column_id)
- INDEX on (parent_card_id)
```

**Note on position field**: Removed because cards arrange ONLY by sorting (popularity or recency). No manual reordering supported in MVP.

#### Reactions Table
```
reactions
- id (UUID, primary key)
- card_id (UUID, foreign key, indexed)
- user_cookie_id (VARCHAR, hashed)
- reaction_type (VARCHAR) - 'thumbs_up' for MVP
- created_at (TIMESTAMP)
- UNIQUE constraint on (card_id, user_cookie_id)
```

#### Action Links Table
```
action_links
- id (UUID, primary key)
- action_card_id (UUID, foreign key to cards)
- feedback_card_id (UUID, foreign key to cards)
- created_at (TIMESTAMP)
- UNIQUE constraint on (action_card_id, feedback_card_id) for MVP
```

---

### 1.3 Card Ownership & Anonymous Privacy

**Decision**: Hash cookie IDs before storage, use one-way hash

**Implementation**:
- Generate random session ID on first visit (UUID v4)
- Store in HttpOnly cookie (see section 3.2)
- Hash with SHA-256 before database storage
- Store hash in created_by_cookie_id fields
- Comparison: hash incoming cookie ID, compare hashes

**Privacy Protection**:
- Database stores only hashes, not reversible to original cookie
- Even database access cannot reveal anonymous card authors
- Admins cannot inspect database to identify anonymous users

**Trade-off**: If user clears cookies, they lose ability to delete their anonymous cards
- Acceptable for MVP given simplicity benefit
- Future SSO (P3) will solve this permanently

---

### 1.4 Parent-Child Card Relationships

**Decision**: Parent-child relationship using self-referencing foreign key in cards table

**How it works**:
- Creating relationship: Update child card's parent_card_id to reference parent card's id
- Each child has exactly one parent (enforced by single parent_card_id column)
- Parent can have multiple children (one-to-many relationship)
- Unlinking: Set child card's parent_card_id to NULL
- Deleting parent card: Set all children's parent_card_id to NULL (cascade update) - children become standalone
- Deleting child card: Simple delete, no impact on parent or siblings
- Cross-column relationships: parent_card_id doesn't enforce same column_id

**Rationale**:
- Simpler than separate groups table (no junction table needed)
- Natural hierarchy representation
- Easy to query "all children of this parent" (WHERE parent_card_id = ?)
- Easy to query "parent of this child" (JOIN on parent_card_id)
- One-to-many relationship easier to implement than many-to-many grouping
- Reaction aggregation straightforward (SUM children's reactions)

**Database Triggers/Updates**:
- When reaction added/removed from child: Update parent's aggregated_reaction_count
- When child's parent_card_id changes: Recalculate both old and new parent's aggregated counts
- When child unlinked: Recalculate parent's aggregated count

---

### 1.5 Action Item Linking

**Decision**: action_links junction table with unique constraint for MVP

**MVP Implementation**:
- One action → one feedback (enforced by unique constraint)
- One feedback → multiple actions (no constraint)
- Bidirectional queries supported

**Future P2 Enhancement**:
- Remove unique constraint
- Add many-to-many support
- Add link_type field for different relationship types

**Orphaned Links**:
- Cascade delete: If feedback card deleted, delete link
- If action card deleted, delete link
- No orphaned links in database

---

### 1.6 Board State History

**Decision**: No audit log for MVP, only current state tracking

**MVP Approach**:
- Store only current board.state and board.closed_at
- Track who created board (created_by_cookie_id)
- Co-admin designation stored in user_sessions.is_admin

**Future P3 Enhancement**:
- Audit log table for admin actions
- Track who closed/reopened board
- Full change history for compliance

---

## 2. Real-time Synchronization

### 2.1 Technology Choice

**Decision**: WebSocket with fallback to long-polling

**Primary**: Socket.IO library
- Automatic WebSocket/polling fallback
- Built-in reconnection logic
- Room-based broadcasting (one room per board)
- Wide browser support
- Battle-tested in production

**Architecture**:
- WebSocket server integrated with API server
- Redis pub/sub for horizontal scaling (when needed)
- Rooms: Each board_id is a Socket.IO room

**Rationale**:
- WebSocket provides true real-time bidirectional communication
- Socket.IO handles all fallback/reconnection complexity
- Industry standard for real-time web apps
- Scales to P3 mobile with same protocol

---

### 2.2 Real-time Event Types

**Events Broadcasted to All Users in Room**:
```
- card:created
- card:updated (content edit)
- card:deleted
- card:moved_column (card moved to different column)
- card:linked_as_child (parent-child relationship created)
- card:unlinked (child unlinked from parent)
- reaction:added
- reaction:removed
- reaction:aggregated_updated (parent's aggregated count changed)
- action:linked
- board:renamed
- column:renamed
- user:joined (alias appeared)
- user:left (alias disappeared)
- board:closed
- admin:designated
```

**Event Payload Structure**:
```json
{
  "event": "card:created",
  "timestamp": "2025-12-24T10:30:00Z",
  "board_id": "uuid",
  "data": {
    "card": {...},
    "user_alias": "Alice"
  }
}
```

---

### 2.3 Concurrent Update Strategy

**Decision**: Last-write-wins with server timestamp

**Implementation**:
- Server timestamp (not client) is authoritative
- Concurrent card moves: Last update to reach server wins
- Optimistic UI updates: Client shows change immediately
- If conflict detected on server response, client reconciles to server state

**Card Edit Locking**:
- First user to request edit gets lock
- Lock stored in Redis with TTL (60 seconds)
- Lock released on save or timeout
- Other users see "being edited by [alias]" indicator

**No Conflict Notifications**:
- Users see final state after reconciliation
- Acceptable given rarity of conflicts
- Simpler implementation for MVP

---

### 2.4 Connection Recovery

**Decision**: Client-side reconnection with state reconciliation

**Reconnection Flow**:
1. Socket.IO handles automatic reconnection attempts
2. On reconnect, client sends last_updated_at timestamp
3. Server sends delta of changes since that timestamp
4. Client applies changes to catch up
5. Resume normal real-time operation

**Offline Handling**:
- Out of scope for MVP
- User sees "Connection lost" banner
- Reconnection automatic when network returns

---

## 3. Session & Identity Management

### 3.1 Cookie Strategy

**Cookie Name**: `retro_session_id`

**Cookie Settings**:
```
HttpOnly: true (prevents JavaScript access, XSS protection)
Secure: true (HTTPS only in production)
SameSite: Lax (CSRF protection, allows GET from external sites)
Max-Age: 365 days (1 year)
Path: /
```

**Session ID Format**: UUID v4 (cryptographically random)

**Cookie Disabled Fallback**:
- User sees warning: "Cookies required for this application"
- No degraded mode for MVP
- Future consideration: localStorage fallback (less secure)

---

### 3.2 Active User Tracking

**Decision**: Heartbeat mechanism with 30-second interval

**Implementation**:
- Client sends heartbeat every 30 seconds via WebSocket ping
- Server updates user_sessions.last_active_at
- User considered inactive if last_active_at > 2 minutes ago
- Active user list query: `WHERE last_active_at > NOW() - INTERVAL '2 minutes'`

**Cleanup**:
- Stale sessions (> 24 hours inactive) removed by daily cron job
- Doesn't affect cookie validity, just database cleanup

**Join/Leave Events**:
- User joins: First heartbeat after connecting
- User leaves: No heartbeat for 2 minutes OR explicit disconnect
- Broadcast user:joined / user:left events

---

### 3.3 Anonymous Card Privacy Protection

**Multi-Layer Protection**:

1. **Database Level**: Only hashed cookie IDs stored
2. **API Level**: Never expose created_by_cookie_id in API responses
3. **Admin Restriction**: Even admins cannot query card authorship
4. **Audit Logging**: No logging of cookie → user mappings

**Card Deletion Check**:
```
function canDeleteCard(cardId, userCookieId) {
  const card = db.getCard(cardId);
  const hashedCookie = sha256(userCookieId);
  return card.created_by_cookie_id === hashedCookie;
}
```

---

## 4. Limits & Quotas

### 4.1 Limit Enforcement

**Two-Layer Validation**:

**Client-Side** (UX, not security):
- Check quota before allowing card creation
- Show remaining cards/reactions count
- Disable "Add Card" button when limit reached
- Immediate user feedback

**Server-Side** (Authoritative):
- Count user's existing cards/reactions on every request
- Reject if limit exceeded
- Return 403 Forbidden with message
- Client shows error toast

**Query Optimization**:
```sql
-- Check card limit
SELECT COUNT(*) FROM cards
WHERE board_id = ?
  AND created_by_cookie_id = ?
  AND card_type = 'feedback';

-- Check reaction limit
SELECT COUNT(*) FROM reactions r
JOIN cards c ON r.card_id = c.id
WHERE c.board_id = ?
  AND r.user_cookie_id = ?;
```

**Caching** (Optional optimization):
- Cache counts in Redis with 10-second TTL
- Reduces database load for large teams
- Accept slight staleness for performance

---

### 4.2 Action Items Exemption

**Implementation**:
- cards.card_type ENUM: 'feedback' or 'action'
- Limit queries filter `WHERE card_type = 'feedback'`
- Action cards excluded from count
- Unlimited action card creation

---

### 4.3 Error Messages

**Card Limit Reached**:
```
"You've reached your card limit (3 cards).
Delete an existing card to create a new one."
```

**Reaction Limit Reached**:
```
"You've used all 5 reactions.
Remove a reaction to react to this card."
```

---

## 5. Performance & Scalability

### 5.1 Board Size Limits (Hard Caps)

**MVP Limits**:
- Max cards per board: 500 (soft limit, warning at 400)
- Max users per board: 100 concurrent
- Max reactions per card: 100 (enough for any realistic team)
- Board name: 200 characters
- Card content: 5000 characters
- Alias: 50 characters

**Rationale**:
- NFR-6.3 requires 100 cards performant
- 500 cap provides 5x headroom
- Prevents abuse and ensures performance
- Limits can be raised post-launch if needed

---

### 5.2 Database Indexing Strategy

**Critical Indexes**:
```sql
-- Frequently queried
CREATE INDEX idx_cards_board_id ON cards(board_id);
CREATE INDEX idx_cards_column_id ON cards(column_id);
CREATE INDEX idx_reactions_card_id ON reactions(card_id);
CREATE INDEX idx_user_sessions_board_id ON user_sessions(board_id);

-- Active user queries
CREATE INDEX idx_user_sessions_active ON user_sessions(board_id, last_active_at);

-- Shareable link lookup
CREATE UNIQUE INDEX idx_boards_shareable_link ON boards(shareable_link);

-- Composite for limit checks
CREATE INDEX idx_cards_user_board ON cards(board_id, created_by_cookie_id, card_type);
CREATE INDEX idx_reactions_user ON reactions(user_cookie_id);
```

---

### 5.3 Caching Strategy

**MVP Caching**:

**Redis** (if needed for scale):
- Session data (active users)
- Card edit locks
- Rate limiting counters
- Hot board data (top 10 active boards)

**Not Cached in MVP**:
- Board content (query from DB, fast enough)
- Simplicity > premature optimization

**Cache Invalidation**:
- WebSocket events trigger cache updates
- TTL-based expiration as fallback

---

### 5.4 API Rate Limiting

**Per-User Rate Limits** (using cookie_id):
```
Card creation: 10 per minute
Card updates: 20 per minute
Reactions: 30 per minute
Board creation: 5 per hour
```

**Implementation**: Token bucket algorithm in Redis

**Exceeded Limit Response**:
```
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retry_after": 45  // seconds
}
```

---

## 6. Data Retention & Archival

### 6.1 Infinite Retention (MVP)

**Approach**:
- No automatic deletion of boards or cards
- Boards remain accessible indefinitely via link
- Database grows continuously

**Growth Management**:
- Monitor database size monthly
- Alert when approaching storage limits
- Plan for archival when needed

**Estimated Growth**:
```
Assumptions:
- Average board: 50 cards, 5 users, 100 reactions
- Data per board: ~50 KB
- 1000 boards/month created
- Annual storage: ~600 MB (negligible)

Conclusion: Retention not a concern for first few years
```

---

### 6.2 Future Archival Strategy (P3)

**System Admin Features**:
- Archive boards > 1 year old with zero activity
- Move to cold storage (S3 Glacier)
- Maintain index for retrieval
- Soft delete with 30-day recovery window

---

## 7. API Design

### 7.1 API Architecture

**REST API** for CRUD operations:
```
POST   /api/boards
GET    /api/boards/:id
POST   /api/boards/:id/cards
PUT    /api/boards/:id/cards/:cardId
DELETE /api/boards/:id/cards/:cardId
POST   /api/boards/:id/cards/:cardId/reactions
DELETE /api/boards/:id/cards/:cardId/reactions
PATCH  /api/boards/:id/close
POST   /api/boards/:id/admins
```

**WebSocket** for real-time updates:
```
socket.emit('join-board', { board_id })
socket.on('card:created', callback)
socket.on('card:updated', callback)
// etc.
```

**Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

---

### 7.2 Authentication

**MVP**: Cookie-based session auth
- Cookie sent automatically with every HTTP request
- Server validates cookie and extracts user identity
- Simple, works for web MVP

**Future P3**: JWT tokens for mobile
- Add `POST /api/auth/token` endpoint
- Exchange cookie for JWT
- Mobile apps use JWT in Authorization header
- Backward compatible with cookie auth

---

### 7.3 API Versioning

**Decision**: URL versioning from day one

**Format**: `/api/v1/boards`

**Rationale**:
- Easy to introduce breaking changes in v2
- Clear contract for mobile apps
- Standard industry practice

---

## 8. Deployment & Infrastructure

### 8.1 Hosting Environment (Proposed)

**Recommendation**: Cloud-based PaaS

**Option A - AWS** (Recommended):
```
Application: AWS Elastic Beanstalk or ECS Fargate
Database: AWS RDS PostgreSQL
Redis: AWS ElastiCache Redis
WebSocket: Same app servers (Socket.IO)
File Storage: AWS S3 (future attachments)
CDN: CloudFront
```

**Option B - Heroku** (Simpler for MVP):
```
Application: Heroku Dynos
Database: Heroku Postgres
Redis: Heroku Redis
WebSocket: Included in dyno
CDN: Heroku built-in
```

**Decision Factors**:
- Heroku: Faster to deploy, higher cost at scale
- AWS: More complex setup, lower cost, better scalability

**Recommendation**: Start with Heroku for MVP, migrate to AWS at scale

---

### 8.2 Deployment Architecture

**MVP Deployment**:
```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CloudFront │  (CDN)
│     /CDN    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Load Balancer     │
└──────┬──────────────┘
       │
       ├────────────┬────────────┐
       ▼            ▼            ▼
   ┌─────┐      ┌─────┐      ┌─────┐
   │App  │      │App  │      │App  │
   │Node1│      │Node2│      │Node3│
   └──┬──┘      └──┬──┘      └──┬──┘
      │            │            │
      └────────┬───┴────────────┘
               ▼
      ┌────────────────┐
      │  Redis Pub/Sub │
      └────────────────┘
               │
               ▼
      ┌────────────────┐
      │   PostgreSQL   │
      │    (Primary)   │
      └────────────────┘
```

**Scaling Strategy**:
- Start: 2 app servers, 1 db instance
- Scale horizontally: Add app servers as needed
- Database: Vertical scaling initially, read replicas later

---

### 8.3 Backup & Recovery

**Database Backups**:
- Automated daily backups (AWS RDS or Heroku Postgres)
- Retention: 7 days
- Point-in-time recovery: 5 minutes RPO

**Disaster Recovery**:
- Multi-AZ deployment (AWS) or similar
- RTO: 1 hour (restore from backup)
- RPO: 5 minutes (continuous backup)

**Critical Data**:
- Boards, cards, reactions: Must be backed up
- Session data: Ephemeral, acceptable loss
- Redis cache: Rebuildable, acceptable loss

---

## 9. Monitoring & Observability

### 9.1 Logging Strategy

**Log Levels**:
- ERROR: Unhandled exceptions, failed requests
- WARN: Rate limit exceeded, validation failures
- INFO: Board created, user joined, board closed
- DEBUG: Detailed request/response (dev only)

**What NOT to Log** (Privacy):
- Cookie values (only hashed)
- Card content (only card IDs)
- User IP addresses (unless needed for security)

**Log Aggregation**: CloudWatch Logs or Papertrail

---

### 9.2 Metrics & Monitoring

**Key Metrics**:
```
Application:
- Requests per second
- Average response time
- Error rate (5xx errors)
- WebSocket connection count
- Active boards count

Database:
- Query latency (p50, p95, p99)
- Connection pool usage
- Slow queries (> 1 second)
- Database size growth

Business:
- Boards created per day
- Cards created per day
- Active users per hour
- Average session duration
```

**Monitoring Tools**:
- Application: New Relic or Datadog APM
- Infrastructure: CloudWatch or Heroku Metrics
- Uptime: Pingdom or UptimeRobot
- Alerts: PagerDuty for critical issues

---

### 9.3 Error Tracking

**Tool**: Sentry or Rollbar

**Captured Events**:
- Unhandled exceptions
- Failed API requests
- WebSocket disconnections
- Database errors
- Client-side JavaScript errors

**Alerting**:
- Critical: Page ops team immediately
- High: Alert within 15 minutes
- Medium: Daily digest
- Low: Weekly report

---

## 10. Security Considerations

### 10.1 Board Link Security

**Link Format**: `https://app.com/board/{board_id}`

**board_id**: UUID v4 (128-bit random)
- Guessing probability: 1 in 2^122 (practically impossible)
- No sequential IDs (prevents enumeration)

**Additional Protection** (Optional):
- Add random suffix: `/board/{uuid}?key={random_token}`
- Increases entropy even further

**Link Sharing**:
- Users share via existing secure channels (email, Slack)
- No additional access control in MVP
- Future P3: Optional password protection

---

### 10.2 Input Validation & Sanitization

**All User Input Validated**:
```
Board name: Max 200 chars, alphanumeric + spaces + punctuation
Alias: Max 50 chars, alphanumeric + spaces
Card content: Max 5000 chars, strip HTML tags
Column names: Max 100 chars each
```

**XSS Prevention**:
- Escape all user content before rendering
- Use React (auto-escapes) or similar framework
- Content-Security-Policy header

**SQL Injection Prevention**:
- Parameterized queries only (never string concatenation)
- ORM with prepared statements

---

### 10.3 HTTPS & Transport Security

**Requirements**:
- HTTPS only (redirect HTTP → HTTPS)
- TLS 1.2 minimum
- Strong cipher suites
- HSTS header for browser enforcement

**Certificate**: Let's Encrypt (free, auto-renewal)

---

## 11. Open Items for Architecture Review

### Critical Decisions Needed:

1. **Cloud Provider**: AWS vs Heroku vs Azure vs GCP?
2. **Database Instance Size**: What's the budget for initial deployment?
3. **Monitoring Budget**: Which APM tool fits budget?
4. **Domain Name**: What domain for shareable links?
5. **SSL Certificate**: Let's Encrypt or paid certificate?

### Performance Targets to Validate:

6. **Load Testing**: Can we support 50 concurrent users per board?
7. **Database Capacity**: What's the max boards before scaling needed?
8. **WebSocket Scaling**: When do we need Redis pub/sub?

### Security Review Needed:

9. **Penetration Testing**: Before production launch
10. **Cookie Security Audit**: Validate HttpOnly, Secure, SameSite settings
11. **GDPR Compliance**: Is hashed cookie ID sufficient for anonymous privacy?

---

## 12. Technology Stack Summary

**Frontend**:
- Framework: React.js (recommendation) or Vue.js
- Real-time: Socket.IO client
- Drag-and-drop: react-beautiful-dnd or @dnd-kit
- State Management: React Context or Redux
- Build: Vite or Create React App

**Backend**:
- Runtime: Node.js 18+ (or Python with FastAPI)
- Framework: Express.js (or Fastify for performance)
- WebSocket: Socket.IO
- ORM: Prisma or TypeORM (or raw SQL with parameterized queries)
- Validation: Joi or Zod

**Database**:
- Primary: PostgreSQL 14+
- Cache: Redis 6+

**Infrastructure**:
- Hosting: Heroku (MVP) → AWS (scale)
- CDN: CloudFront or Cloudflare
- Monitoring: Sentry + Datadog/New Relic

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-24 | AI/PM | Initial technical design decisions |

---

## Approval Required

This document requires review and approval from:
- [ ] Technical Architect
- [ ] Engineering Lead
- [ ] Security Team
- [ ] DevOps Team
- [ ] Product Manager

**Next Steps**: Schedule architecture review meeting to finalize decisions and create detailed technical specification.
