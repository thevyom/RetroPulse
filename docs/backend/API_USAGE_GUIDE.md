# API Usage Guide - RetroPulse Backend

A practical guide with ready-to-use examples for testing the RetroPulse API.

## Quick Start

1. Start MongoDB: `docker compose up mongodb -d`
2. Start backend: `cd backend && pnpm dev`
3. API runs at: `http://localhost:3000`

## Base URL

All API routes use the `/v1` prefix:
```
http://localhost:3000/v1/...
```

## Authentication

The API uses cookie-based sessions. A `retro_session_id` cookie is automatically set on first request.

For admin endpoints, include the header:
```
X-Admin-Secret: dev-admin-secret
```

---

## Health Check

```http
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T07:00:00.000Z"
}
```

---

## Board Management

### Create Board

```http
POST http://localhost:3000/v1/boards
Content-Type: application/json

{
  "name": "Sprint 1 Retro",
  "columns": [
    { "id": "went-well", "name": "What went well", "color": "#22c55e" },
    { "id": "improve", "name": "What to improve", "color": "#ef4444" },
    { "id": "actions", "name": "Action items", "color": "#3b82f6" }
  ],
  "card_limit_per_user": 5,
  "reaction_limit_per_user": 10
}
```

Required fields:
- `name`: 1-200 characters
- `columns`: Array of 1-10 columns, each with:
  - `id`: Unique identifier (alphanumeric, hyphens, underscores)
  - `name`: Display name (1-100 characters)
  - `color`: Optional hex color (#RRGGBB)

Optional fields:
- `card_limit_per_user`: Max feedback cards per user (null = unlimited)
- `reaction_limit_per_user`: Max reactions per user (null = unlimited)

### Get Board

```http
GET http://localhost:3000/v1/boards/{boardId}
```

### Get Board by Shareable Link

```http
GET http://localhost:3000/v1/boards/by-link/{linkCode}
```

### Update Board Name (Admin only)

```http
PATCH http://localhost:3000/v1/boards/{boardId}/name
Content-Type: application/json

{
  "name": "Updated Sprint 1 Retro"
}
```

### Close Board (Admin only)

```http
PATCH http://localhost:3000/v1/boards/{boardId}/close
```

### Add Co-Admin (Creator only)

```http
POST http://localhost:3000/v1/boards/{boardId}/admins
Content-Type: application/json

{
  "user_cookie_hash": "sha256_hash_of_user"
}
```

### Update Column Name (Admin only)

```http
PATCH http://localhost:3000/v1/boards/{boardId}/columns/{columnId}
Content-Type: application/json

{
  "name": "What Should We Continue"
}
```

### Delete Board (Creator only)

```http
DELETE http://localhost:3000/v1/boards/{boardId}
```

---

## User Sessions

### Join Board

```http
POST http://localhost:3000/v1/boards/{boardId}/join
Content-Type: application/json

{
  "alias": "Alice"
}
```

Alias rules: 1-50 characters, alphanumeric with spaces, hyphens, underscores.

### Get Active Users

```http
GET http://localhost:3000/v1/boards/{boardId}/users
```

### Update Heartbeat

Call every 60 seconds to stay "active":

```http
PATCH http://localhost:3000/v1/boards/{boardId}/users/heartbeat
```

### Update Alias

```http
PATCH http://localhost:3000/v1/boards/{boardId}/users/alias
Content-Type: application/json

{
  "alias": "Alice (Team Lead)"
}
```

---

## Cards

### Get All Cards

```http
GET http://localhost:3000/v1/boards/{boardId}/cards
```

Query parameters:
- `column_id`: Filter by column
- `created_by`: Filter by user hash
- `include_relationships`: Include children and linked cards (default: true)

### Create Card

```http
POST http://localhost:3000/v1/boards/{boardId}/cards
Content-Type: application/json

{
  "column_id": "went-well",
  "content": "Great team collaboration during sprint planning!",
  "card_type": "feedback",
  "is_anonymous": false
}
```

Required fields:
- `column_id`: Must match a column ID from the board
- `content`: 1-5000 characters
- `card_type`: "feedback" or "action"

Optional:
- `is_anonymous`: Hide author name (default: false)

### Get Single Card

```http
GET http://localhost:3000/v1/cards/{cardId}
```

### Update Card (Creator only)

```http
PUT http://localhost:3000/v1/cards/{cardId}
Content-Type: application/json

{
  "content": "Updated card content"
}
```

### Delete Card (Creator only)

```http
DELETE http://localhost:3000/v1/cards/{cardId}
```

### Move Card to Column (Creator only)

```http
PATCH http://localhost:3000/v1/cards/{cardId}/column
Content-Type: application/json

{
  "column_id": "improve"
}
```

### Link Cards

Create parent-child or action-feedback relationships:

```http
POST http://localhost:3000/v1/cards/{cardId}/link
Content-Type: application/json

{
  "target_card_id": "target_card_object_id",
  "link_type": "parent_of"
}
```

Link types:
- `parent_of`: Source becomes parent of target (both must be feedback cards)
- `linked_to`: Source (action) links to target (feedback)

### Unlink Cards

```http
DELETE http://localhost:3000/v1/cards/{cardId}/link
Content-Type: application/json

{
  "target_card_id": "target_card_object_id",
  "link_type": "parent_of"
}
```

### Check Card Quota

```http
GET http://localhost:3000/v1/boards/{boardId}/cards/quota
```

---

## Reactions

### Add Reaction

```http
POST http://localhost:3000/v1/cards/{cardId}/reactions
Content-Type: application/json

{
  "reaction_type": "thumbs_up"
}
```

### Remove Reaction

```http
DELETE http://localhost:3000/v1/cards/{cardId}/reactions
```

### Check Reaction Quota

```http
GET http://localhost:3000/v1/boards/{boardId}/reactions/quota
```

---

## Admin/Testing APIs

These require the `X-Admin-Secret` header.

### Clear Board Data

Remove all cards, reactions, and user sessions (keeps board):

```http
POST http://localhost:3000/v1/boards/{boardId}/test/clear
X-Admin-Secret: dev-admin-secret
```

### Reset Board

Reopen a closed board and clear all data:

```http
POST http://localhost:3000/v1/boards/{boardId}/test/reset
X-Admin-Secret: dev-admin-secret
```

### Seed Test Data

Populate board with realistic test data:

```http
POST http://localhost:3000/v1/boards/{boardId}/test/seed
X-Admin-Secret: dev-admin-secret
Content-Type: application/json

{
  "num_users": 5,
  "num_cards": 20,
  "num_action_cards": 5,
  "num_reactions": 50,
  "create_relationships": true
}
```

---

## VS Code REST Client

Create a file `api-tests.http` in your project:

```http
@baseUrl = http://localhost:3000
@boardId = YOUR_BOARD_ID_HERE
@cardId = YOUR_CARD_ID_HERE
@adminSecret = dev-admin-secret

### Health Check
GET {{baseUrl}}/health

### Create Board
POST {{baseUrl}}/v1/boards
Content-Type: application/json

{
  "name": "Sprint 1 Retro",
  "columns": [
    { "id": "went-well", "name": "What went well", "color": "#22c55e" },
    { "id": "improve", "name": "What to improve", "color": "#ef4444" },
    { "id": "actions", "name": "Action items", "color": "#3b82f6" }
  ]
}

### Get Board
GET {{baseUrl}}/v1/boards/{{boardId}}

### Join Board
POST {{baseUrl}}/v1/boards/{{boardId}}/join
Content-Type: application/json

{
  "alias": "Alice"
}

### Create Card
POST {{baseUrl}}/v1/boards/{{boardId}}/cards
Content-Type: application/json

{
  "column_id": "went-well",
  "content": "Great sprint!",
  "card_type": "feedback",
  "is_anonymous": false
}

### Get Cards
GET {{baseUrl}}/v1/boards/{{boardId}}/cards

### Add Reaction
POST {{baseUrl}}/v1/cards/{{cardId}}/reactions
Content-Type: application/json

{
  "reaction_type": "thumbs_up"
}

### Seed Test Data
POST {{baseUrl}}/v1/boards/{{boardId}}/test/seed
X-Admin-Secret: {{adminSecret}}
Content-Type: application/json

{
  "num_users": 5,
  "num_cards": 20,
  "num_reactions": 50
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { }
  },
  "timestamp": "2025-12-29T07:00:00.000Z"
}
```

Common error codes:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `UNAUTHORIZED` | 401 | Missing session cookie |
| `FORBIDDEN` | 403 | Not allowed (not admin/creator) |
| `NOT_FOUND` | 404 | Board/card doesn't exist |
| `BOARD_CLOSED` | 409 | Board is closed, read-only |
| `CARD_LIMIT_REACHED` | 403 | User hit card quota |
| `REACTION_LIMIT_REACHED` | 403 | User hit reaction quota |

---

## Typical Workflow

1. Create a board
2. Copy the board ID from the response
3. Join the board with an alias
4. Create cards
5. Add reactions to cards
6. (Optional) Seed test data for more realistic testing
