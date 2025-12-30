# Backend Future Needs

This document tracks planned enhancements and features for future implementation.

## API Enhancements

### List All Boards Endpoint

**Endpoint:** `GET /api/boards`

**Description:** Add an endpoint to retrieve all boards, with optional filtering and pagination.

**Use Cases:**
- Admin dashboard to view/manage all boards
- Development and testing convenience
- "My boards" feature (filtered by user session)

**Suggested Implementation:**
```typescript
// Query parameters
interface ListBoardsQuery {
  page?: number;        // Pagination (default: 1)
  limit?: number;       // Items per page (default: 20, max: 100)
  status?: 'open' | 'closed' | 'all';  // Filter by board status
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface ListBoardsResponse {
  boards: Board[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Priority:** Low

**Notes:** Consider adding authentication/authorization before exposing this in production to prevent unauthorized access to board listings.

---

## User Identity & Session Recovery

### Optional Email-Based Identity

**Problem:** Users lose access to their boards/admin privileges if they clear cookies or switch devices.

**Solution:** Allow users to optionally provide an email address for session recovery.

**Use Cases:**
1. Recover admin access to boards after cookie loss
2. "My boards" dashboard showing all boards user has created/joined
3. Multi-device access (same identity across devices)

### Phase 1: Email Registration & Recovery

**New Endpoints:**

```typescript
// Register email (optional, can be done anytime)
POST /v1/users/email
{
  "email": "user@example.com"
}

// Initiate recovery (shows masked email for confirmation)
POST /v1/users/recover/init
{
  "email": "user@example.com"
}
// Response: { "masked_email": "use***@example.com", "recovery_token": "..." }

// Complete recovery (validates email match)
POST /v1/users/recover/confirm
{
  "email": "user@example.com",
  "recovery_token": "..."
}
// Response: Sets new cookie linked to original identity
```

**Data Model Changes:**

```typescript
// New collection: user_identities
{
  _id: ObjectId,
  cookie_hash: string,              // Current active cookie hash
  email_encrypted: string,          // AES-256 encrypted email
  email_hash: string,               // SHA-256 hash for lookup (not reversible)
  previous_cookie_hashes: string[], // History for migration
  created_at: Date,
  updated_at: Date
}
```

**Security Considerations:**
- Store email encrypted (AES-256) - only decrypt for display (masked)
- Store email hash separately for lookup (can't reverse to get email)
- Show masked email: `use***@example.com` (first 3 chars + domain)
- Rate limit recovery attempts
- Recovery token expires in 15 minutes

**Privacy:**
- Email is optional - anonymous flow still works
- Encrypted at rest
- Never exposed in API responses (only masked version)

**Priority:** Medium

### Phase 2: Email Verification & Magic Links

**Enhancement:** Send recovery link via email instead of token-based flow.

**Flow:**
1. User requests recovery with email
2. System sends magic link to email
3. User clicks link → new cookie set, linked to original identity

**New Endpoints:**

```typescript
// Request magic link
POST /v1/users/recover/send-link
{
  "email": "user@example.com"
}

// Magic link landing (from email)
GET /v1/users/recover/verify?token=...
// Redirects to frontend with new session established
```

**Requirements:**
- Email service integration (SendGrid, AWS SES, etc.)
- Magic link token with 15-minute expiry
- One-time use tokens

**Priority:** Low (Phase 2)

---

## My Boards Dashboard

**Dependency:** Requires email-based identity (above)

**Endpoint:** `GET /v1/users/boards`

**Description:** List all boards associated with the current user's identity.

**Response:**
```typescript
{
  "boards": [
    {
      "id": "...",
      "name": "Sprint 42 Retro",
      "role": "creator" | "admin" | "member",
      "state": "active" | "closed",
      "last_active_at": "2025-12-29T...",
      "created_at": "2025-12-25T..."
    }
  ],
  "pagination": { ... }
}
```

**Priority:** Low (depends on identity system)
