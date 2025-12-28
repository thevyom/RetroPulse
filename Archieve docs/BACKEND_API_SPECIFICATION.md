# Backend API Specification - Collaborative Retro Board

**Document Version**: 2.0
**Date**: 2025-12-25
**Status**: Approved - MongoDB + Single Service Architecture

---

## Table of Contents

1. [API Gateway](#1-api-gateway)
2. [Board Service](#2-board-service)
3. [Card Service](#3-card-service)
4. [Realtime Service](#4-realtime-service)
5. [Repository Pattern](#5-repository-pattern)
6. [Database Schema](#6-database-schema)
7. [Test Specifications](#7-test-specifications)

---

## 1. API Gateway

### 1.1 Responsibilities

- Single entry point for all client requests
- Cookie-based authentication middleware
- Request routing to appropriate microservice
- WebSocket connection handling (Socket.io)
- CORS configuration

### 1.2 Routes Configuration

```typescript
// api-gateway/src/routes.ts

const routes = {
  // Board Service
  'POST /api/v1/boards': 'http://board-service:3001/boards',
  'GET /api/v1/boards/:id': 'http://board-service:3001/boards/:id',
  'PATCH /api/v1/boards/:id/name': 'http://board-service:3001/boards/:id/name',
  'PATCH /api/v1/boards/:id/close': 'http://board-service:3001/boards/:id/close',
  'POST /api/v1/boards/:id/admins': 'http://board-service:3001/boards/:id/admins',
  'PATCH /api/v1/boards/:id/columns/:columnId': 'http://board-service:3001/boards/:id/columns/:columnId',

  // Card Service
  'GET /api/v1/boards/:boardId/cards': 'http://card-service:3002/cards',
  'POST /api/v1/boards/:boardId/cards': 'http://card-service:3002/cards',
  'PUT /api/v1/boards/:boardId/cards/:cardId': 'http://card-service:3002/cards/:cardId',
  'DELETE /api/v1/boards/:boardId/cards/:cardId': 'http://card-service:3002/cards/:cardId',
  'PATCH /api/v1/boards/:boardId/cards/:cardId/column': 'http://card-service:3002/cards/:cardId/column',
  'POST /api/v1/boards/:boardId/cards/:cardId/link': 'http://card-service:3002/cards/:cardId/link',
  'DELETE /api/v1/boards/:boardId/cards/:cardId/link': 'http://card-service:3002/cards/:cardId/link',
  'POST /api/v1/boards/:boardId/cards/:cardId/reactions': 'http://card-service:3002/cards/:cardId/reactions',
  'DELETE /api/v1/boards/:boardId/cards/:cardId/reactions': 'http://card-service:3002/cards/:cardId/reactions',
};
```

### 1.3 Authentication Middleware

```typescript
// api-gateway/src/middleware/auth.ts

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  sessionId?: string;
  hashedCookieId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const cookieName = 'retro_session_id';
  let sessionId = req.cookies[cookieName];

  // First-time visitor - create session
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie(cookieName, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  // Hash cookie for storage (one-way)
  const hashedCookieId = crypto
    .createHash('sha256')
    .update(sessionId)
    .digest('hex');

  // Attach to request
  req.sessionId = sessionId;
  req.hashedCookieId = hashedCookieId;

  next();
}
```

### 1.4 WebSocket Gateway

```typescript
// api-gateway/src/websocket/gateway.ts

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export function setupWebSocketGateway(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join board room
    socket.on('join-board', async ({ board_id }) => {
      await socket.join(`board:${board_id}`);
      console.log(`Socket ${socket.id} joined board:${board_id}`);
    });

    // Leave board room
    socket.on('leave-board', async ({ board_id }) => {
      await socket.leave(`board:${board_id}`);
      console.log(`Socket ${socket.id} left board:${board_id}`);
    });

    // Heartbeat for active user tracking
    socket.on('heartbeat', async ({ board_id, alias }) => {
      // Forward to board service to update last_active_at
      // (handled via HTTP request to board service)
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
```

---

## 2. Board Service

### 2.1 API Endpoints

#### 2.1.1 Create Board

**Endpoint**: `POST /boards`

**Request Headers**:
```
Cookie: retro_session_id={sessionId}
```

**Request Body**:
```typescript
interface CreateBoardRequest {
  name: string;                    // Max 200 chars
  columns: Column[];               // 1-10 columns
  card_limit_per_user?: number;    // Optional, null = unlimited
  reaction_limit_per_user?: number; // Optional, null = unlimited
}

interface Column {
  id: string;        // Client-generated UUID
  name: string;      // Max 100 chars
  color?: string;    // Hex color, optional
}
```

**Example Request**:
```json
{
  "name": "Sprint 5 Retro",
  "columns": [
    { "id": "col-1", "name": "What Went Well", "color": "#ecf9ec" },
    { "id": "col-2", "name": "Improvements", "color": "#FFF7E8" },
    { "id": "col-3", "name": "Actions", "color": "#dae8fc" }
  ],
  "card_limit_per_user": 5,
  "reaction_limit_per_user": 10
}
```

**Response**: `201 Created`
```typescript
interface CreateBoardResponse {
  success: true;
  data: {
    id: string;              // board:uuid
    name: string;
    shareable_link: string;  // https://app.com/board/{id}
    state: 'active';
    columns: Column[];
    card_limit_per_user: number | null;
    reaction_limit_per_user: number | null;
    created_at: string;      // ISO 8601
    created_by: string;      // hashed
    admins: string[];        // [hashedCookieId]
  };
  timestamp: string;
}
```

**Validation**:
- Name: Required, 1-200 chars
- Columns: Required, 1-10 columns
- Column names: Required, 1-100 chars each
- Limits: If provided, must be positive integers

**Error Responses**:
```typescript
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Board name is required",
    "details": { "field": "name" }
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to create board"
  }
}
```

---

#### 2.1.2 Join Board and Set Alias

**Endpoint**: `POST /boards/:id/join`

**Purpose**: When a user visits a shareable board link, they join the board and set their display alias.

**Request Headers**:
```
Cookie: retro_session_id={sessionId}
```

**Request Body**:
```typescript
interface JoinBoardRequest {
  alias: string;  // Max 50 chars, display name for this board
}
```

**Example Request**:
```json
{
  "alias": "Alice"
}
```

**Response**: `200 OK`
```typescript
interface JoinBoardResponse {
  success: true;
  data: {
    board_id: string;
    user_session: {
      cookie_hash: string;    // Hashed (for reference)
      alias: string;
      is_admin: boolean;
      last_active_at: string;
      created_at: string;
    };
  };
  timestamp: string;
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "board_id": "6763b4a8f1c2d3e4f5a6b7c8",
    "user_session": {
      "cookie_hash": "ef9a7b3c...",
      "alias": "Alice",
      "is_admin": false,
      "last_active_at": "2025-12-25T10:00:00Z",
      "created_at": "2025-12-25T10:00:00Z"
    }
  },
  "timestamp": "2025-12-25T10:00:01Z"
}
```

**Business Logic**:
1. Validate alias (1-50 chars, no special characters except spaces, hyphens, underscores)
2. Hash the user's cookie (SHA-256)
3. Check if user already has a session for this board (upsert):
   - If exists → Update alias and last_active_at
   - If new → Create new user_session document
4. Check if user is the board creator (cookie_hash in board.admins)
5. Broadcast `user:joined` event to all connected clients in board room

**Validation**:
- Alias: Required, 1-50 chars, pattern: `^[a-zA-Z0-9 _-]+$`
- Board ID: Must be valid ObjectId and exist
- Board state: Can join even if board is closed (read-only mode)

**Error Responses**:
```typescript
// 400 Bad Request - Invalid alias
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Alias must be 1-50 characters and contain only letters, numbers, spaces, hyphens, and underscores",
    "details": { "field": "alias", "value": "Alice@123!" }
  }
}

// 404 Not Found - Board doesn't exist
{
  "success": false,
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "Board with ID '6763b4a8...' not found"
  }
}
```

**Side Effects**:
- Creates or updates user_session document in MongoDB
- Updates last_active_at timestamp
- Real-time event broadcasted: `user:joined` with { board_id, alias }

**Frontend Flow**:
```typescript
// When user visits shareable link: https://app.com/board/6763b4a8f1c2d3e4f5a6b7c8
1. Frontend prompts user for alias
2. POST /boards/6763b4a8f1c2d3e4f5a6b7c8/join with { alias: "Alice" }
3. Receive user_session data
4. Store alias in local state
5. Connect Socket.io and emit join-board event
6. Load board data with GET /boards/6763b4a8f1c2d3e4f5a6b7c8
```

---

#### 2.1.3 Get Board

**Endpoint**: `GET /boards/:id`

**Request Headers**:
```
Cookie: retro_session_id={sessionId}
```

**Response**: `200 OK`
```typescript
interface GetBoardResponse {
  success: true;
  data: {
    id: string;
    name: string;
    shareable_link: string;
    state: 'active' | 'closed';
    closed_at: string | null;
    columns: Column[];
    card_limit_per_user: number | null;
    reaction_limit_per_user: number | null;
    created_at: string;
    admins: AdminInfo[];         // Admin aliases (not hashed)
    active_users: UserInfo[];    // Currently active users
  };
  timestamp: string;
}

interface AdminInfo {
  alias: string;
  is_creator: boolean;
}

interface UserInfo {
  alias: string;
  last_active_at: string;
}
```

**Error Responses**:
```typescript
// 404 Not Found
{
  "success": false,
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "Board with ID 'board:xyz' not found"
  }
}
```

---

#### 2.1.3 Rename Board

**Endpoint**: `PATCH /boards/:id/name`

**Request Headers**:
```
Cookie: retro_session_id={sessionId}
```

**Request Body**:
```typescript
{
  "name": "Updated Sprint 5 Retro"
}
```

**Authorization**:
- Only admins can rename board
- Check: req.hashedCookieId in board.admins

**Response**: `200 OK`
```typescript
{
  "success": true,
  "data": {
    "id": "board:123",
    "name": "Updated Sprint 5 Retro"
  },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

**Error Responses**:
```typescript
// 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only admins can rename the board"
  }
}

// 409 Conflict (if board is closed)
{
  "success": false,
  "error": {
    "code": "BOARD_CLOSED",
    "message": "Cannot modify a closed board"
  }
}
```

---

#### 2.1.4 Rename Column

**Endpoint**: `PATCH /boards/:id/columns/:columnId`

**Request Body**:
```typescript
{
  "name": "What Should We Continue"
}
```

**Authorization**: Admins only

**Response**: `200 OK`
```typescript
{
  "success": true,
  "data": {
    "board_id": "board:123",
    "column_id": "col-1",
    "name": "What Should We Continue"
  }
}
```

---

#### 2.1.5 Close Board

**Endpoint**: `PATCH /boards/:id/close`

**Authorization**: Admins only

**Response**: `200 OK`
```typescript
{
  "success": true,
  "data": {
    "id": "board:123",
    "state": "closed",
    "closed_at": "2025-12-24T15:30:00Z"
  }
}
```

**Side Effects**:
- Board state changes to 'closed'
- Real-time event broadcasted: `board:closed`
- All connected clients enter read-only mode

---

#### 2.1.6 Designate Co-Admin

**Endpoint**: `POST /boards/:id/admins`

**Request Body**:
```typescript
{
  "user_cookie_hash": "hash_of_user_to_promote"
}
```

**Authorization**: Only board creator (first admin)

**Response**: `201 Created`
```typescript
{
  "success": true,
  "data": {
    "board_id": "board:123",
    "admins": ["hash1", "hash2"] // Updated admin list
  }
}
```

**Error Responses**:
```typescript
// 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the board creator can designate co-admins"
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User is not active on this board"
  }
}
```

---

#### 2.1.7 Delete Board (Testing Only)

**Endpoint**: `DELETE /boards/:id`

**Purpose**: Permanently delete a board and all associated data. **For testing purposes only** - not exposed in production UI.

**Request Headers**:
```
Cookie: retro_session_id={sessionId}
```

**Authorization**: Only board creator (first admin in admins array)

**Response**: `204 No Content`

**Error Responses**:
```typescript
// 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only the board creator can delete the board"
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "Board with ID '6763b4a8...' not found"
  }
}
```

**Side Effects**:
- Deletes board document from MongoDB
- Cascades delete to all associated data:
  - All cards in the board
  - All reactions on those cards
  - All user_sessions for the board
  - All parent-child relationships
  - All action-feedback links
- Real-time event broadcasted: `board:deleted` to all connected clients
- Disconnects all users from board Socket.io room

**Implementation Notes**:
```typescript
async deleteBoard(boardId: string, userHash: string): Promise<void> {
  const board = await this.boardRepo.findById(boardId);

  // Only creator can delete
  if (board.created_by_hash !== userHash) {
    throw new ForbiddenError('Only board creator can delete board');
  }

  // Cascade delete all associated data
  await this.db.collection('cards').deleteMany({ board_id: new ObjectId(boardId) });
  await this.db.collection('reactions').deleteMany({
    card_id: { $in: cardIds } // Get all card IDs first
  });
  await this.db.collection('user_sessions').deleteMany({ board_id: new ObjectId(boardId) });
  await this.db.collection('boards').deleteOne({ _id: new ObjectId(boardId) });

  // Broadcast deletion event
  this.socketGateway.broadcast(`board:${boardId}`, {
    type: 'board:deleted',
    data: { board_id: boardId },
  });
}
```

---

#### 2.1.8 Testing Helper APIs

These endpoints are **only available in test/development environments** (`NODE_ENV=test`).

##### Clear Board Data

**Endpoint**: `POST /boards/:id/test/clear`

**Purpose**: Remove all cards, reactions, and user sessions from a board without deleting the board itself.

**Response**: `200 OK`
```typescript
{
  "success": true,
  "data": {
    "board_id": "6763b4a8f1c2d3e4f5a6b7c8",
    "deleted": {
      "cards": 42,
      "reactions": 156,
      "user_sessions": 8
    }
  }
}
```

##### Reset Board State

**Endpoint**: `POST /boards/:id/test/reset`

**Purpose**: Reset board to initial state (reopen if closed, clear all data, reset limits).

**Response**: `200 OK`
```typescript
{
  "success": true,
  "data": {
    "board_id": "6763b4a8f1c2d3e4f5a6b7c8",
    "state": "active",
    "closed_at": null,
    "deleted_items": {
      "cards": 42,
      "reactions": 156,
      "user_sessions": 8
    }
  }
}
```

##### Seed Test Data

**Endpoint**: `POST /boards/:id/test/seed`

**Purpose**: Populate board with test data for integration testing.

**Request Body**:
```typescript
{
  "num_users": 5,          // Number of test users to create
  "num_cards": 20,         // Number of feedback cards
  "num_action_cards": 5,   // Number of action cards
  "num_reactions": 50,     // Total reactions to distribute
  "create_relationships": true  // Create parent-child links
}
```

**Response**: `201 Created`
```typescript
{
  "success": true,
  "data": {
    "board_id": "6763b4a8f1c2d3e4f5a6b7c8",
    "created": {
      "users": 5,
      "feedback_cards": 20,
      "action_cards": 5,
      "reactions": 50,
      "parent_child_links": 8,
      "action_feedback_links": 5
    },
    "test_users": [
      { "alias": "TestUser1", "cookie_hash": "hash1" },
      { "alias": "TestUser2", "cookie_hash": "hash2" }
    ]
  }
}
```

---

### 2.2 Board Service Repository Pattern

```typescript
// board-service/src/repositories/BoardRepository.ts

export interface BoardRepository {
  create(data: CreateBoardDTO): Promise<Board>;
  findById(id: string): Promise<Board | null>;
  updateName(id: string, name: string): Promise<Board>;
  updateColumnName(boardId: string, columnId: string, name: string): Promise<void>;
  closeBoard(id: string): Promise<Board>;
  addAdmin(boardId: string, userHash: string): Promise<void>;
  isAdmin(boardId: string, userHash: string): Promise<boolean>;
  getActiveUsers(boardId: string): Promise<UserSession[]>;
}

export interface CreateBoardDTO {
  name: string;
  columns: Column[];
  created_by_hash: string;
  card_limit_per_user?: number;
  reaction_limit_per_user?: number;
}

export interface Board {
  id: string;
  name: string;
  shareable_link: string;
  state: 'active' | 'closed';
  closed_at: Date | null;
  columns: Column[];
  card_limit_per_user: number | null;
  reaction_limit_per_user: number | null;
  created_at: Date;
  created_by_hash: string;
  admins: string[];
}

export interface Column {
  id: string;
  name: string;
  color?: string;
}

export interface UserSession {
  cookie_hash: string;
  alias: string;
  last_active_at: Date;
  is_admin: boolean;
}
```

---

### 2.3 SurrealDB Implementation

```typescript
// board-service/src/repositories/SurrealBoardRepository.ts

import { Surreal } from 'surrealdb.js';

export class SurrealBoardRepository implements BoardRepository {
  constructor(private db: Surreal) {}

  async create(data: CreateBoardDTO): Promise<Board> {
    const boardId = `board:${uuidv4()}`;
    const shareableLink = `${process.env.APP_URL}/board/${boardId}`;

    const result = await this.db.create('boards:board', {
      id: boardId,
      name: data.name,
      shareable_link: shareableLink,
      state: 'active',
      closed_at: null,
      columns: data.columns,
      card_limit_per_user: data.card_limit_per_user ?? null,
      reaction_limit_per_user: data.reaction_limit_per_user ?? null,
      created_at: new Date(),
      created_by_hash: data.created_by_hash,
      admins: [data.created_by_hash], // Creator is first admin
    });

    return this.mapToBoard(result);
  }

  async findById(id: string): Promise<Board | null> {
    const result = await this.db.select(`boards:${id}`);
    return result ? this.mapToBoard(result) : null;
  }

  async updateName(id: string, name: string): Promise<Board> {
    const result = await this.db.merge(`boards:${id}`, { name });
    return this.mapToBoard(result);
  }

  async updateColumnName(
    boardId: string,
    columnId: string,
    name: string
  ): Promise<void> {
    // SurrealDB: Update nested column name
    await this.db.query(
      `UPDATE boards:${boardId} SET columns[WHERE id = $colId].name = $name`,
      { colId: columnId, name }
    );
  }

  async closeBoard(id: string): Promise<Board> {
    const result = await this.db.merge(`boards:${id}`, {
      state: 'closed',
      closed_at: new Date(),
    });
    return this.mapToBoard(result);
  }

  async addAdmin(boardId: string, userHash: string): Promise<void> {
    await this.db.query(
      `UPDATE boards:${boardId} SET admins += $userHash`,
      { userHash }
    );
  }

  async isAdmin(boardId: string, userHash: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT admins FROM boards:${boardId} WHERE $userHash IN admins`,
      { userHash }
    );
    return result.length > 0;
  }

  async getActiveUsers(boardId: string): Promise<UserSession[]> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const result = await this.db.query(
      `SELECT * FROM users:user_session
       WHERE board_id = $boardId
         AND last_active_at > $threshold
       ORDER BY last_active_at DESC`,
      { boardId, threshold: twoMinutesAgo }
    );
    return result;
  }

  private mapToBoard(data: any): Board {
    return {
      id: data.id,
      name: data.name,
      shareable_link: data.shareable_link,
      state: data.state,
      closed_at: data.closed_at ? new Date(data.closed_at) : null,
      columns: data.columns,
      card_limit_per_user: data.card_limit_per_user,
      reaction_limit_per_user: data.reaction_limit_per_user,
      created_at: new Date(data.created_at),
      created_by_hash: data.created_by_hash,
      admins: data.admins,
    };
  }
}
```

---

### 2.4 Board Service Business Logic

```typescript
// board-service/src/services/BoardService.ts

export class BoardService {
  constructor(private boardRepo: BoardRepository) {}

  async createBoard(
    data: CreateBoardDTO,
    userHash: string
  ): Promise<Board> {
    // Validation
    if (!data.name || data.name.length > 200) {
      throw new ValidationError('Board name must be 1-200 characters');
    }

    if (!data.columns || data.columns.length === 0 || data.columns.length > 10) {
      throw new ValidationError('Board must have 1-10 columns');
    }

    for (const col of data.columns) {
      if (!col.name || col.name.length > 100) {
        throw new ValidationError('Column names must be 1-100 characters');
      }
    }

    // Create board
    const board = await this.boardRepo.create({
      ...data,
      created_by_hash: userHash,
    });

    return board;
  }

  async getBoardById(id: string, userHash: string): Promise<Board> {
    const board = await this.boardRepo.findById(id);
    if (!board) {
      throw new NotFoundError(`Board with ID '${id}' not found`);
    }

    // Get active users for this board
    const activeUsers = await this.boardRepo.getActiveUsers(id);

    return {
      ...board,
      active_users: activeUsers,
    };
  }

  async renameBoard(
    id: string,
    newName: string,
    userHash: string
  ): Promise<Board> {
    // Check authorization
    const isAdmin = await this.boardRepo.isAdmin(id, userHash);
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can rename the board');
    }

    // Check if board is closed
    const board = await this.boardRepo.findById(id);
    if (board.state === 'closed') {
      throw new ConflictError('Cannot modify a closed board');
    }

    // Update name
    return await this.boardRepo.updateName(id, newName);
  }

  async closeBoard(id: string, userHash: string): Promise<Board> {
    const isAdmin = await this.boardRepo.isAdmin(id, userHash);
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can close the board');
    }

    return await this.boardRepo.closeBoard(id);
  }

  async addCoAdmin(
    boardId: string,
    userHashToPromote: string,
    requestorHash: string
  ): Promise<void> {
    const board = await this.boardRepo.findById(boardId);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    // Only creator can designate co-admins
    if (board.created_by_hash !== requestorHash) {
      throw new ForbiddenError('Only the board creator can designate co-admins');
    }

    // Check if user is active on board
    const activeUsers = await this.boardRepo.getActiveUsers(boardId);
    const userExists = activeUsers.some(u => u.cookie_hash === userHashToPromote);
    if (!userExists) {
      throw new NotFoundError('User is not active on this board');
    }

    await this.boardRepo.addAdmin(boardId, userHashToPromote);
  }
}
```

---

## 3. Card Service

### 3.1 API Endpoints

#### 3.1.1 Get Cards

**Endpoint**: `GET /cards?board_id={boardId}&filter={filterType}`

**Query Parameters**:
- `board_id` (required): Board ID
- `filter` (optional): `all` | `user:{hash}` | `anonymous`
- `sort` (optional): `recency_desc` | `recency_asc` | `popularity_desc` | `popularity_asc`

**Response**: `200 OK`
```typescript
interface GetCardsResponse {
  success: true;
  data: {
    cards: Card[];
  };
  timestamp: string;
}

interface Card {
  id: string;
  board_id: string;
  column_id: string;
  content: string;
  card_type: 'feedback' | 'action';
  is_anonymous: boolean;
  created_by_alias: string | null;  // null if anonymous
  created_at: string;
  direct_reaction_count: number;
  aggregated_reaction_count: number; // For parent cards
  reactions: Reaction[];
  parent_card_id: string | null;
  child_cards: Card[];               // Nested children
  linked_cards: LinkedCard[];        // Action-feedback links
}

interface Reaction {
  id: string;
  user_alias: string;
  reaction_type: 'thumbs_up';
  created_at: string;
}

interface LinkedCard {
  id: string;
  content_preview: string;  // First 50 chars
  card_type: 'action' | 'feedback';
  link_type: 'linked_to' | 'parent_of';
}
```

---

#### 3.1.2 Create Card

**Endpoint**: `POST /cards`

**Request Body**:
```typescript
{
  "board_id": "board:123",
  "column_id": "col-1",
  "content": "Great team collaboration!",
  "card_type": "feedback",  // or "action"
  "is_anonymous": false
}
```

**Validation**:
- Content: Required, 1-5000 chars
- Column ID: Must exist in board
- Card type: 'feedback' or 'action'
- **Limit check**: If feedback card, check user hasn't exceeded card_limit_per_user

**Response**: `201 Created`
```typescript
{
  "success": true,
  "data": {
    "id": "card:uuid",
    "board_id": "board:123",
    "column_id": "col-1",
    "content": "Great team collaboration!",
    "card_type": "feedback",
    "is_anonymous": false,
    "created_by_alias": "User1",
    "created_at": "2025-12-24T10:00:00Z",
    "direct_reaction_count": 0,
    "aggregated_reaction_count": 0,
    "reactions": [],
    "parent_card_id": null,
    "child_cards": []
  }
}
```

**Error Responses**:
```typescript
// 403 Forbidden - Limit reached
{
  "success": false,
  "error": {
    "code": "CARD_LIMIT_REACHED",
    "message": "You've reached your card limit (5 cards)",
    "details": {
      "current_count": 5,
      "limit": 5
    }
  }
}

// 409 Conflict - Board closed
{
  "success": false,
  "error": {
    "code": "BOARD_CLOSED",
    "message": "Cannot create cards on a closed board"
  }
}
```

---

#### 3.1.3 Update Card Content

**Endpoint**: `PUT /cards/:cardId`

**Request Body**:
```typescript
{
  "content": "Updated content here"
}
```

**Authorization**: Only card creator

**Response**: `200 OK`

---

#### 3.1.4 Delete Card

**Endpoint**: `DELETE /cards/:cardId`

**Authorization**: Only card creator

**Response**: `204 No Content`

**Side Effects**:
- If parent card deleted → Children become standalone (parent_card_id = null)
- If child card deleted → Parent's aggregated_reaction_count updated
- Reactions deleted (cascade)
- Action links deleted (cascade)

---

#### 3.1.5 Move Card to Different Column

**Endpoint**: `PATCH /cards/:cardId/column`

**Request Body**:
```typescript
{
  "new_column_id": "col-2"
}
```

**Authorization**: Any user (cards can be moved by anyone)

**Response**: `200 OK`

---

#### 3.1.6 Link Cards (Parent-Child or Action-Feedback)

**Endpoint**: `POST /cards/:cardId/link`

**Request Body**:
```typescript
{
  "target_card_id": "card:456",
  "link_type": "parent_of" | "linked_to"
}

// link_type:
// - "parent_of": cardId becomes parent of target_card_id
// - "linked_to": cardId (action) links to target_card_id (feedback)
```

**Business Rules**:
- `parent_of`: Both cards must be feedback type
- `linked_to`: cardId must be action type, target must be feedback type
- Cannot create circular relationships

**Response**: `201 Created`
```typescript
{
  "success": true,
  "data": {
    "parent_card_id": "card:123",
    "child_card_id": "card:456",
    "link_type": "parent_of"
  }
}
```

**SurrealDB Implementation**:
```surrealql
-- Parent-child
RELATE card:456->parent_of->card:123;

-- Action-feedback
RELATE card:action->linked_to->card:feedback;
```

---

#### 3.1.7 Unlink Cards

**Endpoint**: `DELETE /cards/:cardId/link`

**Request Body**:
```typescript
{
  "target_card_id": "card:456",
  "link_type": "parent_of" | "linked_to"
}
```

**Authorization**: Any user (anyone can unlink)

**Response**: `204 No Content`

---

#### 3.1.8 Add Reaction

**Endpoint**: `POST /cards/:cardId/reactions`

**Request Body**:
```typescript
{
  "reaction_type": "thumbs_up"
}
```

**Validation**:
- Check reaction limit (if configured)
- User can only have 1 reaction per card (upsert behavior)

**Response**: `201 Created`
```typescript
{
  "success": true,
  "data": {
    "card_id": "card:123",
    "reaction_type": "thumbs_up",
    "user_alias": "User1",
    "new_direct_count": 3,
    "new_aggregated_count": 12  // If parent card
  }
}
```

**Side Effects**:
- Increment card.direct_reaction_count
- If card has parent → Update parent.aggregated_reaction_count
- Real-time broadcast: `reaction:added`

---

#### 3.1.9 Remove Reaction

**Endpoint**: `DELETE /cards/:cardId/reactions`

**Response**: `204 No Content`

**Side Effects**:
- Decrement card.direct_reaction_count
- Update parent's aggregated count if applicable

---

### 3.2 Card Service Repository Pattern

```typescript
// card-service/src/repositories/CardRepository.ts

export interface CardRepository {
  create(data: CreateCardDTO): Promise<Card>;
  findById(id: string): Promise<Card | null>;
  findByBoard(boardId: string): Promise<Card[]>;
  update(id: string, content: string): Promise<Card>;
  delete(id: string): Promise<void>;
  moveToColumn(cardId: string, newColumnId: string): Promise<void>;

  // Relationships
  linkCards(cardId: string, targetId: string, linkType: LinkType): Promise<void>;
  unlinkCards(cardId: string, targetId: string, linkType: LinkType): Promise<void>;
  getChildren(cardId: string): Promise<Card[]>;
  getLinkedCards(cardId: string, linkType: LinkType): Promise<Card[]>;

  // Reactions
  addReaction(cardId: string, userHash: string, reactionType: string): Promise<void>;
  removeReaction(cardId: string, userHash: string): Promise<void>;
  getReactions(cardId: string): Promise<Reaction[]>;
  updateReactionCounts(cardId: string): Promise<void>;

  // Validation
  countUserCards(boardId: string, userHash: string): Promise<number>;
  countUserReactions(boardId: string, userHash: string): Promise<number>;
  isCardOwner(cardId: string, userHash: string): Promise<boolean>;
}

export interface CreateCardDTO {
  board_id: string;
  column_id: string;
  content: string;
  card_type: 'feedback' | 'action';
  is_anonymous: boolean;
  created_by_hash: string;
  created_by_alias: string;
}

export interface Card {
  id: string;
  board_id: string;
  column_id: string;
  content: string;
  card_type: 'feedback' | 'action';
  is_anonymous: boolean;
  created_by_hash: string;
  created_by_alias: string | null;
  created_at: Date;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  parent_card_id: string | null;
}

export type LinkType = 'parent_of' | 'linked_to';
```

---

### 3.3 SurrealDB Card Repository Implementation

```typescript
// card-service/src/repositories/SurrealCardRepository.ts

export class SurrealCardRepository implements CardRepository {
  constructor(private db: Surreal) {}

  async create(data: CreateCardDTO): Promise<Card> {
    const cardId = `card:${uuidv4()}`;

    const result = await this.db.create('cards:card', {
      id: cardId,
      board_id: data.board_id,
      column_id: data.column_id,
      content: data.content,
      card_type: data.card_type,
      is_anonymous: data.is_anonymous,
      created_by_hash: data.created_by_hash,
      created_by_alias: data.is_anonymous ? null : data.created_by_alias,
      created_at: new Date(),
      direct_reaction_count: 0,
      aggregated_reaction_count: 0,
      parent_card_id: null,
    });

    return this.mapToCard(result);
  }

  async findByBoard(boardId: string): Promise<Card[]> {
    const result = await this.db.query(
      `SELECT * FROM cards:card WHERE board_id = $boardId ORDER BY created_at DESC`,
      { boardId }
    );
    return result.map(this.mapToCard);
  }

  async linkCards(
    cardId: string,
    targetId: string,
    linkType: LinkType
  ): Promise<void> {
    // Create graph edge
    if (linkType === 'parent_of') {
      await this.db.query(
        `RELATE ${targetId}->${linkType}->${cardId}`
      );

      // Update child's parent_card_id for easier querying
      await this.db.merge(targetId, { parent_card_id: cardId });

      // Recalculate parent's aggregated count
      await this.updateReactionCounts(cardId);
    } else if (linkType === 'linked_to') {
      await this.db.query(
        `RELATE ${cardId}->${linkType}->${targetId}`
      );
    }
  }

  async unlinkCards(
    cardId: string,
    targetId: string,
    linkType: LinkType
  ): Promise<void> {
    if (linkType === 'parent_of') {
      // Remove graph edge
      await this.db.query(
        `DELETE ${targetId}->${linkType} WHERE out = ${cardId}`
      );

      // Clear child's parent_card_id
      await this.db.merge(targetId, { parent_card_id: null });

      // Recalculate parent's aggregated count
      await this.updateReactionCounts(cardId);
    } else {
      await this.db.query(
        `DELETE ${cardId}->${linkType} WHERE out = ${targetId}`
      );
    }
  }

  async addReaction(
    cardId: string,
    userHash: string,
    reactionType: string
  ): Promise<void> {
    // Upsert reaction (user can only have 1 per card)
    await this.db.query(
      `INSERT INTO reactions:reaction {
        card_id: $cardId,
        user_cookie_hash: $userHash,
        reaction_type: $reactionType,
        created_at: time::now()
      } ON DUPLICATE KEY UPDATE reaction_type = $reactionType`,
      { cardId, userHash, reactionType }
    );

    // Increment direct count
    await this.db.query(
      `UPDATE ${cardId} SET direct_reaction_count += 1`
    );

    // Update aggregated count for this card and parent (if exists)
    await this.updateReactionCounts(cardId);
  }

  async updateReactionCounts(cardId: string): Promise<void> {
    // Get children's reaction counts
    const children = await this.getChildren(cardId);
    const childrenTotal = children.reduce(
      (sum, child) => sum + child.direct_reaction_count,
      0
    );

    // Get own direct count
    const card = await this.findById(cardId);
    const aggregated = card.direct_reaction_count + childrenTotal;

    // Update aggregated count
    await this.db.merge(cardId, {
      aggregated_reaction_count: aggregated,
    });

    // If this card has a parent, update parent's count too
    if (card.parent_card_id) {
      await this.updateReactionCounts(card.parent_card_id);
    }
  }

  async getChildren(cardId: string): Promise<Card[]> {
    const result = await this.db.query(
      `SELECT ->parent_of->card AS children FROM ${cardId}`
    );
    return result[0]?.children || [];
  }

  async countUserCards(boardId: string, userHash: string): Promise<number> {
    const result = await this.db.query(
      `SELECT count() FROM cards:card
       WHERE board_id = $boardId
         AND created_by_hash = $userHash
         AND card_type = 'feedback'
       GROUP ALL`,
      { boardId, userHash }
    );
    return result[0]?.count || 0;
  }

  async countUserReactions(boardId: string, userHash: string): Promise<number> {
    const result = await this.db.query(
      `SELECT count() FROM reactions:reaction r
       JOIN cards:card c ON r.card_id = c.id
       WHERE c.board_id = $boardId
         AND r.user_cookie_hash = $userHash
       GROUP ALL`,
      { boardId, userHash }
    );
    return result[0]?.count || 0;
  }

  async isCardOwner(cardId: string, userHash: string): Promise<boolean> {
    const card = await this.findById(cardId);
    return card?.created_by_hash === userHash;
  }

  private mapToCard(data: any): Card {
    return {
      id: data.id,
      board_id: data.board_id,
      column_id: data.column_id,
      content: data.content,
      card_type: data.card_type,
      is_anonymous: data.is_anonymous,
      created_by_hash: data.created_by_hash,
      created_by_alias: data.created_by_alias,
      created_at: new Date(data.created_at),
      direct_reaction_count: data.direct_reaction_count,
      aggregated_reaction_count: data.aggregated_reaction_count,
      parent_card_id: data.parent_card_id,
    };
  }
}
```

---

### 3.4 Card Service Business Logic

```typescript
// card-service/src/services/CardService.ts

export class CardService {
  constructor(
    private cardRepo: CardRepository,
    private boardRepo: BoardRepository
  ) {}

  async createCard(
    data: CreateCardDTO,
    userHash: string,
    userAlias: string
  ): Promise<Card> {
    // Get board to check limits and state
    const board = await this.boardRepo.findById(data.board_id);
    if (!board) {
      throw new NotFoundError('Board not found');
    }

    if (board.state === 'closed') {
      throw new ConflictError('Cannot create cards on a closed board');
    }

    // Check card limit (only for feedback cards)
    if (data.card_type === 'feedback' && board.card_limit_per_user) {
      const currentCount = await this.cardRepo.countUserCards(
        data.board_id,
        userHash
      );

      if (currentCount >= board.card_limit_per_user) {
        throw new ForbiddenError('Card limit reached', {
          current_count: currentCount,
          limit: board.card_limit_per_user,
        });
      }
    }

    // Validate content
    if (!data.content || data.content.length > 5000) {
      throw new ValidationError('Content must be 1-5000 characters');
    }

    // Create card
    const card = await this.cardRepo.create({
      ...data,
      created_by_hash: userHash,
      created_by_alias: userAlias,
    });

    return card;
  }

  async deleteCard(cardId: string, userHash: string): Promise<void> {
    // Check ownership
    const isOwner = await this.cardRepo.isCardOwner(cardId, userHash);
    if (!isOwner) {
      throw new ForbiddenError('You can only delete your own cards');
    }

    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new NotFoundError('Card not found');
    }

    // If card has children, unlink them (they become standalone)
    const children = await this.cardRepo.getChildren(cardId);
    for (const child of children) {
      await this.cardRepo.unlinkCards(cardId, child.id, 'parent_of');
    }

    // If card has parent, update parent's aggregated count
    if (card.parent_card_id) {
      await this.cardRepo.updateReactionCounts(card.parent_card_id);
    }

    // Delete card (cascades reactions and links)
    await this.cardRepo.delete(cardId);
  }

  async linkCards(
    cardId: string,
    targetId: string,
    linkType: LinkType,
    userHash: string
  ): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    const target = await this.cardRepo.findById(targetId);

    if (!card || !target) {
      throw new NotFoundError('Card not found');
    }

    // Validation based on link type
    if (linkType === 'parent_of') {
      if (card.card_type !== 'feedback' || target.card_type !== 'feedback') {
        throw new ValidationError('Parent-child links only work with feedback cards');
      }

      // Prevent circular relationships
      if (target.parent_card_id === cardId || cardId === targetId) {
        throw new ValidationError('Cannot create circular relationships');
      }
    } else if (linkType === 'linked_to') {
      if (card.card_type !== 'action' || target.card_type !== 'feedback') {
        throw new ValidationError('Action must link to feedback card');
      }
    }

    await this.cardRepo.linkCards(cardId, targetId, linkType);
  }

  async addReaction(
    cardId: string,
    userHash: string,
    reactionType: string
  ): Promise<void> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new NotFoundError('Card not found');
    }

    const board = await this.boardRepo.findById(card.board_id);
    if (board.state === 'closed') {
      throw new ConflictError('Cannot react on a closed board');
    }

    // Check reaction limit
    if (board.reaction_limit_per_user) {
      const currentCount = await this.cardRepo.countUserReactions(
        card.board_id,
        userHash
      );

      if (currentCount >= board.reaction_limit_per_user) {
        throw new ForbiddenError('Reaction limit reached');
      }
    }

    await this.cardRepo.addReaction(cardId, userHash, reactionType);
  }
}
```

---

## 4. Realtime Service

### 4.1 Responsibilities

- Subscribe to SurrealDB LIVE queries for all tables
- Receive database change events in real-time
- Publish events to Socket.io rooms (via API Gateway)
- No business logic - pure event relay

### 4.2 SurrealDB Live Query Subscriptions

```typescript
// realtime-service/src/index.ts

import { Surreal } from 'surrealdb.js';
import { io } from 'socket.io-client';

const db = new Surreal();
const gatewaySocket = io('http://api-gateway:3000');

async function setupLiveQueries() {
  await db.connect('ws://surrealdb:8000/rpc');
  await db.use({ ns: 'cards', db: 'retroboard' });

  // Subscribe to card changes
  const cardLiveQuery = await db.live('cards:card', (action, data) => {
    handleCardEvent(action, data);
  });

  // Subscribe to reaction changes
  const reactionLiveQuery = await db.live('reactions:reaction', (action, data) => {
    handleReactionEvent(action, data);
  });

  // Subscribe to board changes
  await db.use({ ns: 'boards', db: 'retroboard' });
  const boardLiveQuery = await db.live('boards:board', (action, data) => {
    handleBoardEvent(action, data);
  });

  console.log('Live queries subscribed');
}

function handleCardEvent(action: 'CREATE' | 'UPDATE' | 'DELETE', data: any) {
  const eventType = {
    CREATE: 'card:created',
    UPDATE: 'card:updated',
    DELETE: 'card:deleted',
  }[action];

  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };

  // Publish to Socket.io room
  gatewaySocket.emit('broadcast', {
    room: `board:${data.board_id}`,
    event: event,
  });
}

function handleReactionEvent(action: 'CREATE' | 'UPDATE' | 'DELETE', data: any) {
  // Get card to find board_id
  const event = {
    type: action === 'CREATE' ? 'reaction:added' : 'reaction:removed',
    data: data,
    timestamp: new Date().toISOString(),
  };

  // Publish to board room (need to fetch card.board_id first)
  // ... implementation
}

function handleBoardEvent(action: 'CREATE' | 'UPDATE' | 'DELETE', data: any) {
  let eventType = 'board:updated';

  if (data.state === 'closed') {
    eventType = 'board:closed';
  } else if (data.name !== data.old_name) {
    eventType = 'board:renamed';
  }

  const event = {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString(),
  };

  gatewaySocket.emit('broadcast', {
    room: `board:${data.id}`,
    event: event,
  });
}

setupLiveQueries();
```

### 4.3 Event Types

```typescript
// Broadcasted events

interface RealtimeEvent {
  type: EventType;
  data: any;
  timestamp: string;
}

type EventType =
  | 'card:created'
  | 'card:updated'
  | 'card:deleted'
  | 'card:moved'
  | 'card:linked'
  | 'card:unlinked'
  | 'reaction:added'
  | 'reaction:removed'
  | 'board:renamed'
  | 'board:closed'
  | 'column:renamed'
  | 'user:joined'
  | 'user:left';
```

---

## 5. Repository Pattern Summary

### 5.1 Benefits

1. **Database Abstraction**: Business logic doesn't know about SurrealDB
2. **Testability**: Easy to mock repositories in unit tests
3. **Migration Ready**: Swap SurrealDB for MongoDB by implementing new repository
4. **Separation of Concerns**: Data access isolated from business logic

### 5.2 Dependency Injection

```typescript
// board-service/src/index.ts

import { SurrealBoardRepository } from './repositories/SurrealBoardRepository';
import { BoardService } from './services/BoardService';
import { Surreal } from 'surrealdb.js';

// Setup database connection
const db = new Surreal();
await db.connect('ws://surrealdb:8000/rpc');
await db.use({ ns: 'boards', db: 'retroboard' });

// Inject repository into service
const boardRepo = new SurrealBoardRepository(db);
const boardService = new BoardService(boardRepo);

// Use in controllers
app.post('/boards', async (req, res) => {
  const board = await boardService.createBoard(req.body, req.hashedCookieId);
  res.status(201).json({ success: true, data: board });
});
```

### 5.3 Repository Interface Contract

**Key Principle**: Repository methods return **domain objects**, not database-specific types.

```typescript
// ✅ Good - Returns domain object
async findById(id: string): Promise<Board | null>

// ❌ Bad - Returns SurrealDB-specific type
async findById(id: string): Promise<SurrealRecord | null>
```

---

## 6. Database Schema

### 6.1 SurrealDB Schema Definitions

```surrealql
-- Boards Namespace
USE NS boards DB retroboard;

DEFINE TABLE board SCHEMAFULL;
DEFINE FIELD id ON board TYPE record;
DEFINE FIELD name ON board TYPE string ASSERT $value != NONE AND length($value) <= 200;
DEFINE FIELD shareable_link ON board TYPE string;
DEFINE FIELD state ON board TYPE string ASSERT $value IN ['active', 'closed'];
DEFINE FIELD closed_at ON board TYPE option<datetime>;
DEFINE FIELD columns ON board TYPE array;
DEFINE FIELD card_limit_per_user ON board TYPE option<int>;
DEFINE FIELD reaction_limit_per_user ON board TYPE option<int>;
DEFINE FIELD created_at ON board TYPE datetime DEFAULT time::now();
DEFINE FIELD created_by_hash ON board TYPE string;
DEFINE FIELD admins ON board TYPE array;

DEFINE INDEX unique_shareable_link ON board COLUMNS shareable_link UNIQUE;
DEFINE INDEX idx_board_state ON board COLUMNS state;

-- User Sessions (for active user tracking)
DEFINE TABLE user_session SCHEMAFULL;
DEFINE FIELD id ON user_session TYPE record;
DEFINE FIELD board_id ON user_session TYPE record;
DEFINE FIELD cookie_hash ON user_session TYPE string;
DEFINE FIELD alias ON user_session TYPE string ASSERT length($value) <= 50;
DEFINE FIELD last_active_at ON user_session TYPE datetime DEFAULT time::now();
DEFINE FIELD is_admin ON user_session TYPE bool DEFAULT false;
DEFINE FIELD created_at ON user_session TYPE datetime DEFAULT time::now();

DEFINE INDEX idx_active_users ON user_session COLUMNS board_id, last_active_at;
DEFINE INDEX unique_user_board ON user_session COLUMNS board_id, cookie_hash UNIQUE;

-- Cards Namespace
USE NS cards DB retroboard;

DEFINE TABLE card SCHEMAFULL;
DEFINE FIELD id ON card TYPE record;
DEFINE FIELD board_id ON card TYPE record;
DEFINE FIELD column_id ON card TYPE string;
DEFINE FIELD content ON card TYPE string ASSERT length($value) <= 5000;
DEFINE FIELD card_type ON card TYPE string ASSERT $value IN ['feedback', 'action'];
DEFINE FIELD is_anonymous ON card TYPE bool DEFAULT false;
DEFINE FIELD created_by_hash ON card TYPE string;
DEFINE FIELD created_by_alias ON card TYPE option<string>;
DEFINE FIELD created_at ON card TYPE datetime DEFAULT time::now();
DEFINE FIELD direct_reaction_count ON card TYPE int DEFAULT 0;
DEFINE FIELD aggregated_reaction_count ON card TYPE int DEFAULT 0;
DEFINE FIELD parent_card_id ON card TYPE option<record>;

DEFINE INDEX idx_board_cards ON card COLUMNS board_id, created_at;
DEFINE INDEX idx_card_creator ON card COLUMNS board_id, created_by_hash, card_type;
DEFINE INDEX idx_parent_cards ON card COLUMNS parent_card_id;

-- Graph edges for relationships
DEFINE TABLE parent_of SCHEMAFULL TYPE RELATION IN card OUT card;
DEFINE FIELD created_at ON parent_of TYPE datetime DEFAULT time::now();

DEFINE TABLE linked_to SCHEMAFULL TYPE RELATION IN card OUT card;
DEFINE FIELD created_at ON linked_to TYPE datetime DEFAULT time::now();

-- Reactions
DEFINE TABLE reaction SCHEMAFULL;
DEFINE FIELD id ON reaction TYPE record;
DEFINE FIELD card_id ON reaction TYPE record;
DEFINE FIELD user_cookie_hash ON reaction TYPE string;
DEFINE FIELD user_alias ON reaction TYPE string;
DEFINE FIELD reaction_type ON reaction TYPE string DEFAULT 'thumbs_up';
DEFINE FIELD created_at ON reaction TYPE datetime DEFAULT time::now();

DEFINE INDEX unique_user_reaction ON reaction COLUMNS card_id, user_cookie_hash UNIQUE;
DEFINE INDEX idx_card_reactions ON reaction COLUMNS card_id;
DEFINE INDEX idx_user_reactions ON reaction COLUMNS user_cookie_hash;
```

### 6.2 Data Model Diagram

```
boards:board
  ├─ id (PK)
  ├─ name
  ├─ shareable_link (UNIQUE)
  ├─ state (active/closed)
  ├─ columns: [{ id, name, color }]
  ├─ admins: [hash1, hash2, ...]
  └─ limits (card_limit, reaction_limit)

users:user_session
  ├─ id (PK)
  ├─ board_id (FK → boards:board)
  ├─ cookie_hash
  ├─ alias
  ├─ last_active_at
  └─ is_admin

cards:card
  ├─ id (PK)
  ├─ board_id (FK → boards:board)
  ├─ column_id
  ├─ content
  ├─ card_type (feedback/action)
  ├─ is_anonymous
  ├─ created_by_hash
  ├─ parent_card_id (FK → cards:card, nullable)
  ├─ direct_reaction_count
  └─ aggregated_reaction_count

parent_of (RELATION)
  ├─ in: card (child)
  └─ out: card (parent)

linked_to (RELATION)
  ├─ in: card (action)
  └─ out: card (feedback)

reactions:reaction
  ├─ id (PK)
  ├─ card_id (FK → cards:card)
  ├─ user_cookie_hash
  ├─ user_alias
  └─ reaction_type
```

---

## 7. Test Specifications

### 7.1 Unit Test Cases - API Endpoints

#### 7.1.1 Board API Tests

**Test Suite**: `POST /boards` - Create Board

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Valid board creation | `{ name: "Sprint 5", columns: [{...}], card_limit: 5 }` | `201 Created` with board object | Board has shareable_link, creator in admins |
| Empty name | `{ name: "", columns: [{...}] }` | `400 Bad Request` | Error code: `VALIDATION_ERROR` |
| Name too long (>200 chars) | `{ name: "a".repeat(201), columns: [{...}] }` | `400 Bad Request` | Error message mentions 200 char limit |
| No columns | `{ name: "Test", columns: [] }` | `400 Bad Request` | Error: "Must have 1-10 columns" |
| Too many columns (>10) | `{ name: "Test", columns: [11 columns] }` | `400 Bad Request` | Error mentions column limit |
| Invalid column color | `{ ..., columns: [{ color: "red" }] }` | `400 Bad Request` | Error: Invalid hex color format |
| Negative card limit | `{ ..., card_limit_per_user: -5 }` | `400 Bad Request` | Error: Must be positive integer |
| Default limits (null) | `{ name: "Test", columns: [{...}] }` | `201 Created` | Limits are null (unlimited) |

**Test Suite**: `POST /boards/:id/join` - Join Board

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Valid join | `{ alias: "Alice" }` | `200 OK` with user_session | Session created/updated, is_admin flag set |
| Rejoin (update alias) | Existing user with `{ alias: "Alice2" }` | `200 OK` | Alias updated, last_active_at refreshed |
| Creator joins | Board creator cookie joins | `200 OK` | is_admin = true in response |
| Empty alias | `{ alias: "" }` | `400 Bad Request` | Error: Alias required |
| Alias too long (>50) | `{ alias: "a".repeat(51) }` | `400 Bad Request` | Error: Max 50 characters |
| Invalid characters | `{ alias: "Alice@123!" }` | `400 Bad Request` | Error: Only alphanumeric, spaces, hyphens, underscores |
| Board not found | Join non-existent board | `404 Not Found` | Error: BOARD_NOT_FOUND |
| Join closed board | Join board with state=closed | `200 OK` | Can join (read-only mode) |

**Test Suite**: `GET /boards/:id` - Get Board

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Valid get | Board ID | `200 OK` with full board data | Includes admins, active_users, columns |
| Board not found | Invalid/non-existent ID | `404 Not Found` | Error: BOARD_NOT_FOUND |
| Active users included | Board with 3 active users | `200 OK` | active_users array has 3 elements |
| Inactive users excluded | Users with last_active > 2 mins | `200 OK` | Only users active in last 2 minutes shown |

**Test Suite**: `PATCH /boards/:id/name` - Rename Board

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Admin renames | Admin user, new name | `200 OK` | Name updated |
| Non-admin attempts | Non-admin user | `403 Forbidden` | Error: FORBIDDEN |
| Rename closed board | Board with state=closed | `409 Conflict` | Error: BOARD_CLOSED |
| Empty new name | `{ name: "" }` | `400 Bad Request` | Validation error |

**Test Suite**: `PATCH /boards/:id/close` - Close Board

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Admin closes | Admin user | `200 OK` | state='closed', closed_at timestamp set |
| Non-admin attempts | Non-admin user | `403 Forbidden` | Error: FORBIDDEN |
| Already closed | Board already closed | `200 OK` (idempotent) | closed_at unchanged |
| Real-time broadcast | Close board with connected users | Event sent | All clients receive `board:closed` |

**Test Suite**: `POST /boards/:id/admins` - Designate Co-Admin

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Creator designates | Creator promotes active user | `201 Created` | User added to admins array |
| Non-creator attempts | Co-admin tries to promote | `403 Forbidden` | Only creator can promote |
| Promote non-existent user | Hash not in user_sessions | `404 Not Found` | Error: USER_NOT_FOUND |
| Promote inactive user | User last_active > 2 mins | `404 Not Found` | Error: User not active |
| Promote already-admin | User already in admins | `200 OK` (idempotent) | admins array unchanged |

**Test Suite**: `DELETE /boards/:id` - Delete Board (Testing)

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Creator deletes | Creator user | `204 No Content` | Board + all associated data deleted |
| Non-creator attempts | Non-creator user | `403 Forbidden` | Error: Only creator can delete |
| Cascade delete verification | Delete board with 10 cards | `204` | Cards, reactions, user_sessions all deleted |
| Real-time broadcast | Delete with connected users | Event sent | All clients receive `board:deleted` |

---

#### 7.1.2 Card API Tests

**Test Suite**: `POST /boards/:id/cards` - Create Card

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Valid feedback card | `{ content: "Good work!", card_type: "feedback" }` | `201 Created` | Card created with direct_reaction_count=0 |
| Valid action card | `{ content: "Fix bug", card_type: "action" }` | `201 Created` | Card created, no limit check |
| Anonymous card | `{ ..., is_anonymous: true }` | `201 Created` | created_by_alias is null |
| Card limit reached | User with 5 cards, limit=5 | `403 Forbidden` | Error: CARD_LIMIT_REACHED |
| Action card ignores limit | User at limit creates action | `201 Created` | Action cards exempt from limit |
| Empty content | `{ content: "" }` | `400 Bad Request` | Error: Content required |
| Content too long (>5000) | `{ content: "a".repeat(5001) }` | `400 Bad Request` | Error: Max 5000 characters |
| Closed board | Create on closed board | `409 Conflict` | Error: BOARD_CLOSED |
| Invalid column | Non-existent column_id | `400 Bad Request` | Error: Invalid column |

**Test Suite**: `PUT /cards/:id` - Update Card

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Owner updates | Card creator updates content | `200 OK` | Content updated |
| Non-owner attempts | Different user tries update | `403 Forbidden` | Error: Not card owner |
| Update on closed board | Board is closed | `409 Conflict` | Error: BOARD_CLOSED |

**Test Suite**: `DELETE /cards/:id` - Delete Card

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Owner deletes | Card creator deletes | `204 No Content` | Card deleted, reactions cascade deleted |
| Non-owner attempts | Different user | `403 Forbidden` | Error: Not card owner |
| Delete parent card | Card with 3 children | `204` | Children become standalone (parent_id=null) |
| Delete child card | Child of parent | `204` | Parent aggregated_reaction_count updated |

**Test Suite**: `POST /cards/:id/link` - Link Cards

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Link parent-child | Two feedback cards | `201 Created` | Child has parent_card_id set |
| Link action-feedback | Action card to feedback | `201 Created` | Action has feedback in linked_feedback_ids |
| Circular relationship | Link A→B when B→A exists | `400 Bad Request` | Error: Circular relationship |
| Link wrong types | Action as parent of feedback | `400 Bad Request` | Error: Invalid card types |
| Parent aggregation | Link child with 5 reactions | `201` | Parent aggregated_count increases by 5 |

**Test Suite**: `DELETE /cards/:id/link` - Unlink Cards

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Unlink child | Remove parent-child link | `204 No Content` | child parent_card_id = null |
| Unlink action-feedback | Remove action link | `204` | Removed from linked_feedback_ids |
| Parent aggregation update | Unlink child with 5 reactions | `204` | Parent aggregated_count decreases by 5 |

**Test Suite**: `POST /cards/:id/reactions` - Add Reaction

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| First reaction | User reacts to card | `201 Created` | direct_reaction_count = 1 |
| Reaction limit reached | User at limit (10 reactions) | `403 Forbidden` | Error: REACTION_LIMIT_REACHED |
| Duplicate reaction (upsert) | User reacts to same card twice | `200 OK` | reaction_count unchanged (upsert behavior) |
| Child card reaction | React to child card | `201` | Parent aggregated_count increases |
| Closed board reaction | React on closed board | `409 Conflict` | Error: BOARD_CLOSED |

**Test Suite**: `DELETE /cards/:id/reactions` - Remove Reaction

| Test Case | Input | Expected Output | Assertion |
|-----------|-------|-----------------|-----------|
| Remove own reaction | User removes reaction | `204 No Content` | direct_reaction_count decreases |
| Remove non-existent | User hasn't reacted | `404 Not Found` | Error: Reaction not found |
| Child card unreaction | Remove from child | `204` | Parent aggregated_count decreases |

---

### 7.2 Board Service Unit Tests

```typescript
// board-service/tests/BoardService.test.ts

describe('BoardService', () => {
  let boardService: BoardService;
  let mockBoardRepo: jest.Mocked<BoardRepository>;

  beforeEach(() => {
    mockBoardRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateName: jest.fn(),
      closeBoard: jest.fn(),
      isAdmin: jest.fn(),
      // ... other methods
    } as any;

    boardService = new BoardService(mockBoardRepo);
  });

  describe('createBoard', () => {
    it('should create board with valid data', async () => {
      const input: CreateBoardDTO = {
        name: 'Sprint 5 Retro',
        columns: [
          { id: 'col-1', name: 'What Went Well', color: '#ecf9ec' },
        ],
        card_limit_per_user: 5,
      };

      const expectedBoard = {
        id: 'board:123',
        name: 'Sprint 5 Retro',
        shareable_link: 'https://app.com/board/board:123',
        state: 'active',
        // ...
      };

      mockBoardRepo.create.mockResolvedValue(expectedBoard);

      const result = await boardService.createBoard(input, 'user-hash-123');

      expect(result).toEqual(expectedBoard);
      expect(mockBoardRepo.create).toHaveBeenCalledWith({
        ...input,
        created_by_hash: 'user-hash-123',
      });
    });

    it('should throw ValidationError if name is empty', async () => {
      const input = {
        name: '',
        columns: [{ id: 'col-1', name: 'Test' }],
      };

      await expect(
        boardService.createBoard(input, 'user-hash')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if name exceeds 200 characters', async () => {
      const input = {
        name: 'a'.repeat(201),
        columns: [{ id: 'col-1', name: 'Test' }],
      };

      await expect(
        boardService.createBoard(input, 'user-hash')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if columns array is empty', async () => {
      const input = {
        name: 'Test Board',
        columns: [],
      };

      await expect(
        boardService.createBoard(input, 'user-hash')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('renameBoard', () => {
    it('should rename board if user is admin', async () => {
      mockBoardRepo.isAdmin.mockResolvedValue(true);
      mockBoardRepo.findById.mockResolvedValue({
        id: 'board:123',
        state: 'active',
        // ...
      } as Board);

      mockBoardRepo.updateName.mockResolvedValue({
        id: 'board:123',
        name: 'New Name',
      } as Board);

      const result = await boardService.renameBoard(
        'board:123',
        'New Name',
        'admin-hash'
      );

      expect(result.name).toBe('New Name');
      expect(mockBoardRepo.updateName).toHaveBeenCalledWith('board:123', 'New Name');
    });

    it('should throw ForbiddenError if user is not admin', async () => {
      mockBoardRepo.isAdmin.mockResolvedValue(false);

      await expect(
        boardService.renameBoard('board:123', 'New Name', 'user-hash')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError if board is closed', async () => {
      mockBoardRepo.isAdmin.mockResolvedValue(true);
      mockBoardRepo.findById.mockResolvedValue({
        id: 'board:123',
        state: 'closed',
      } as Board);

      await expect(
        boardService.renameBoard('board:123', 'New Name', 'admin-hash')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('closeBoard', () => {
    it('should close board if user is admin', async () => {
      mockBoardRepo.isAdmin.mockResolvedValue(true);
      mockBoardRepo.closeBoard.mockResolvedValue({
        id: 'board:123',
        state: 'closed',
        closed_at: new Date(),
      } as Board);

      const result = await boardService.closeBoard('board:123', 'admin-hash');

      expect(result.state).toBe('closed');
      expect(result.closed_at).toBeDefined();
    });

    it('should throw ForbiddenError if user is not admin', async () => {
      mockBoardRepo.isAdmin.mockResolvedValue(false);

      await expect(
        boardService.closeBoard('board:123', 'user-hash')
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
```

---

### 7.2 Card Service Tests

```typescript
// card-service/tests/CardService.test.ts

describe('CardService', () => {
  let cardService: CardService;
  let mockCardRepo: jest.Mocked<CardRepository>;
  let mockBoardRepo: jest.Mocked<BoardRepository>;

  beforeEach(() => {
    mockCardRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      countUserCards: jest.fn(),
      isCardOwner: jest.fn(),
      delete: jest.fn(),
      linkCards: jest.fn(),
      // ...
    } as any;

    mockBoardRepo = {
      findById: jest.fn(),
    } as any;

    cardService = new CardService(mockCardRepo, mockBoardRepo);
  });

  describe('createCard', () => {
    it('should create card with valid data', async () => {
      const board = {
        id: 'board:123',
        state: 'active',
        card_limit_per_user: null, // Unlimited
      } as Board;

      mockBoardRepo.findById.mockResolvedValue(board);
      mockCardRepo.create.mockResolvedValue({
        id: 'card:456',
        content: 'Test card',
        // ...
      } as Card);

      const input: CreateCardDTO = {
        board_id: 'board:123',
        column_id: 'col-1',
        content: 'Test card',
        card_type: 'feedback',
        is_anonymous: false,
        created_by_hash: 'user-hash',
        created_by_alias: 'User1',
      };

      const result = await cardService.createCard(input, 'user-hash', 'User1');

      expect(result.id).toBe('card:456');
      expect(mockCardRepo.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenError if card limit reached', async () => {
      const board = {
        id: 'board:123',
        state: 'active',
        card_limit_per_user: 5,
      } as Board;

      mockBoardRepo.findById.mockResolvedValue(board);
      mockCardRepo.countUserCards.mockResolvedValue(5); // Already at limit

      const input: CreateCardDTO = {
        board_id: 'board:123',
        column_id: 'col-1',
        content: 'Test card',
        card_type: 'feedback',
        is_anonymous: false,
        created_by_hash: 'user-hash',
        created_by_alias: 'User1',
      };

      await expect(
        cardService.createCard(input, 'user-hash', 'User1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow creating action card even if feedback limit reached', async () => {
      const board = {
        id: 'board:123',
        state: 'active',
        card_limit_per_user: 5,
      } as Board;

      mockBoardRepo.findById.mockResolvedValue(board);
      mockCardRepo.countUserCards.mockResolvedValue(5);
      mockCardRepo.create.mockResolvedValue({
        id: 'card:action1',
        card_type: 'action',
      } as Card);

      const input: CreateCardDTO = {
        board_id: 'board:123',
        column_id: 'col-actions',
        content: 'Fix deployment',
        card_type: 'action', // Action cards exempt from limit
        is_anonymous: false,
        created_by_hash: 'user-hash',
        created_by_alias: 'User1',
      };

      const result = await cardService.createCard(input, 'user-hash', 'User1');

      expect(result.card_type).toBe('action');
      // Should NOT check limit for action cards
      expect(mockCardRepo.countUserCards).not.toHaveBeenCalled();
    });

    it('should throw ConflictError if board is closed', async () => {
      const board = {
        id: 'board:123',
        state: 'closed',
      } as Board;

      mockBoardRepo.findById.mockResolvedValue(board);

      const input: CreateCardDTO = {
        board_id: 'board:123',
        column_id: 'col-1',
        content: 'Test',
        card_type: 'feedback',
        is_anonymous: false,
        created_by_hash: 'user-hash',
        created_by_alias: 'User1',
      };

      await expect(
        cardService.createCard(input, 'user-hash', 'User1')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteCard', () => {
    it('should delete card if user is owner', async () => {
      mockCardRepo.isCardOwner.mockResolvedValue(true);
      mockCardRepo.findById.mockResolvedValue({
        id: 'card:123',
        parent_card_id: null,
      } as Card);
      mockCardRepo.getChildren.mockResolvedValue([]);

      await cardService.deleteCard('card:123', 'owner-hash');

      expect(mockCardRepo.delete).toHaveBeenCalledWith('card:123');
    });

    it('should throw ForbiddenError if user is not owner', async () => {
      mockCardRepo.isCardOwner.mockResolvedValue(false);

      await expect(
        cardService.deleteCard('card:123', 'other-user-hash')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should unlink children before deleting parent card', async () => {
      mockCardRepo.isCardOwner.mockResolvedValue(true);
      mockCardRepo.findById.mockResolvedValue({
        id: 'card:parent',
        parent_card_id: null,
      } as Card);

      const children = [
        { id: 'card:child1' } as Card,
        { id: 'card:child2' } as Card,
      ];
      mockCardRepo.getChildren.mockResolvedValue(children);

      await cardService.deleteCard('card:parent', 'owner-hash');

      expect(mockCardRepo.unlinkCards).toHaveBeenCalledTimes(2);
      expect(mockCardRepo.unlinkCards).toHaveBeenCalledWith(
        'card:parent',
        'card:child1',
        'parent_of'
      );
      expect(mockCardRepo.delete).toHaveBeenCalled();
    });
  });

  describe('linkCards', () => {
    it('should link feedback cards as parent-child', async () => {
      const parent = {
        id: 'card:parent',
        card_type: 'feedback',
        parent_card_id: null,
      } as Card;

      const child = {
        id: 'card:child',
        card_type: 'feedback',
        parent_card_id: null,
      } as Card;

      mockCardRepo.findById.mockImplementation((id) =>
        Promise.resolve(id === 'card:parent' ? parent : child)
      );

      await cardService.linkCards(
        'card:parent',
        'card:child',
        'parent_of',
        'user-hash'
      );

      expect(mockCardRepo.linkCards).toHaveBeenCalledWith(
        'card:parent',
        'card:child',
        'parent_of'
      );
    });

    it('should throw ValidationError for circular relationship', async () => {
      const parent = {
        id: 'card:parent',
        card_type: 'feedback',
        parent_card_id: null,
      } as Card;

      const child = {
        id: 'card:child',
        card_type: 'feedback',
        parent_card_id: 'card:parent', // Already child of parent
      } as Card;

      mockCardRepo.findById.mockImplementation((id) =>
        Promise.resolve(id === 'card:parent' ? parent : child)
      );

      await expect(
        cardService.linkCards('card:child', 'card:parent', 'parent_of', 'user')
      ).rejects.toThrow(ValidationError);
    });

    it('should link action card to feedback card', async () => {
      const action = {
        id: 'card:action',
        card_type: 'action',
      } as Card;

      const feedback = {
        id: 'card:feedback',
        card_type: 'feedback',
      } as Card;

      mockCardRepo.findById.mockImplementation((id) =>
        Promise.resolve(id === 'card:action' ? action : feedback)
      );

      await cardService.linkCards(
        'card:action',
        'card:feedback',
        'linked_to',
        'user'
      );

      expect(mockCardRepo.linkCards).toHaveBeenCalledWith(
        'card:action',
        'card:feedback',
        'linked_to'
      );
    });

    it('should throw ValidationError if action links to action', async () => {
      const action1 = { id: 'card:action1', card_type: 'action' } as Card;
      const action2 = { id: 'card:action2', card_type: 'action' } as Card;

      mockCardRepo.findById.mockImplementation((id) =>
        Promise.resolve(id === 'card:action1' ? action1 : action2)
      );

      await expect(
        cardService.linkCards('card:action1', 'card:action2', 'linked_to', 'user')
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

---

### 7.3 Integration Tests - Complete Board Lifecycles

These tests verify the complete user journey from board creation to deletion.

#### 7.3.1 Full Retrospective Board Lifecycle

```typescript
// tests/integration/retro-board-lifecycle.test.ts

import { MongoClient, Db, ObjectId } from 'mongodb';
import request from 'supertest';
import { app } from '../../src/app';

describe('Complete Retro Board Lifecycle', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let creatorCookie: string;
  let user1Cookie: string;
  let user2Cookie: string;
  let boardId: string;

  beforeAll(async () => {
    mongoClient = await MongoClient.connect('mongodb://localhost:27017');
    db = mongoClient.db('retroboard_test');
  });

  afterAll(async () => {
    await mongoClient.close();
  });

  beforeEach(async () => {
    // Clean database
    await db.collection('boards').deleteMany({});
    await db.collection('cards').deleteMany({});
    await db.collection('reactions').deleteMany({});
    await db.collection('user_sessions').deleteMany({});

    // Setup test cookies
    creatorCookie = 'creator-session-123';
    user1Cookie = 'user1-session-456';
    user2Cookie = 'user2-session-789';
  });

  it('COMPLETE LIFECYCLE: Create board → Join users → Create cards → Link cards → Add reactions → Close board → Delete', async () => {

    // ============ STEP 1: Creator creates board ============
    const createBoardResponse = await request(app)
      .post('/v1/boards')
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        name: 'Sprint 42 Retrospective',
        columns: [
          { id: 'col-1', name: 'What Went Well', color: '#D5E8D4' },
          { id: 'col-2', name: 'Improvements', color: '#FFE6CC' },
          { id: 'col-3', name: 'Action Items', color: '#DAE8FC' }
        ],
        card_limit_per_user: 5,
        reaction_limit_per_user: 10
      });

    expect(createBoardResponse.status).toBe(201);
    expect(createBoardResponse.body.data.shareable_link).toBeDefined();

    boardId = createBoardResponse.body.data.id;

    // Verify board in database
    const boardInDb = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
    expect(boardInDb.name).toBe('Sprint 42 Retrospective');
    expect(boardInDb.admins).toHaveLength(1);

    // ============ STEP 2: Three users join board ============
    const creatorJoin = await request(app)
      .post(`/v1/boards/${boardId}/join`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({ alias: 'Alice (Scrum Master)' });

    expect(creatorJoin.status).toBe(200);
    expect(creatorJoin.body.data.user_session.is_admin).toBe(true);

    const user1Join = await request(app)
      .post(`/v1/boards/${boardId}/join`)
      .set('Cookie', `retro_session_id=${user1Cookie}`)
      .send({ alias: 'Bob' });

    expect(user1Join.status).toBe(200);
    expect(user1Join.body.data.user_session.is_admin).toBe(false);

    const user2Join = await request(app)
      .post(`/v1/boards/${boardId}/join`)
      .set('Cookie', `retro_session_id=${user2Cookie}`)
      .send({ alias: 'Charlie' });

    expect(user2Join.status).toBe(200);

    // Verify 3 user sessions in DB
    const userSessions = await db.collection('user_sessions')
      .find({ board_id: new ObjectId(boardId) })
      .toArray();
    expect(userSessions).toHaveLength(3);

    // ============ STEP 3: Users create feedback cards ============

    // Alice creates 2 cards in "What Went Well"
    const card1Response = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        column_id: 'col-1',
        content: 'Great team collaboration during sprint planning',
        card_type: 'feedback',
        is_anonymous: false
      });

    const card1Id = card1Response.body.data.id;

    const card2Response = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        column_id: 'col-1',
        content: 'All features delivered on time',
        card_type: 'feedback',
        is_anonymous: false
      });

    const card2Id = card2Response.body.data.id;

    // Bob creates 1 card in "Improvements"
    const card3Response = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${user1Cookie}`)
      .send({
        column_id: 'col-2',
        content: 'Need better test coverage',
        card_type: 'feedback',
        is_anonymous: false
      });

    const card3Id = card3Response.body.data.id;

    // Charlie creates anonymous card
    const card4Response = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${user2Cookie}`)
      .send({
        column_id: 'col-2',
        content: 'Communication could be improved',
        card_type: 'feedback',
        is_anonymous: true
      });

    const card4Id = card4Response.body.data.id;

    // Verify 4 cards in database
    const cardsInDb = await db.collection('cards')
      .find({ board_id: new ObjectId(boardId) })
      .toArray();
    expect(cardsInDb).toHaveLength(4);

    // ============ STEP 4: Link parent-child cards ============

    // Link card2 as child of card1
    await request(app)
      .post(`/v1/cards/${card1Id}/link`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        target_card_id: card2Id,
        link_type: 'parent_of'
      });

    // Verify parent-child relationship
    const card2InDb = await db.collection('cards').findOne({ _id: new ObjectId(card2Id) });
    expect(card2InDb.parent_card_id.toString()).toBe(card1Id);

    // ============ STEP 5: Create action card and link to feedback ============

    const actionCardResponse = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        column_id: 'col-3',
        content: 'Improve unit test coverage to 80%',
        card_type: 'action',
        is_anonymous: false
      });

    const actionCardId = actionCardResponse.body.data.id;

    // Link action card to improvement card (card3)
    await request(app)
      .post(`/v1/cards/${actionCardId}/link`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({
        target_card_id: card3Id,
        link_type: 'linked_to'
      });

    // Verify action-feedback link
    const actionInDb = await db.collection('cards').findOne({ _id: new ObjectId(actionCardId) });
    expect(actionInDb.linked_feedback_ids).toContain(new ObjectId(card3Id));

    // ============ STEP 6: Add reactions to cards ============

    // Bob reacts to card1
    await request(app)
      .post(`/v1/cards/${card1Id}/reactions`)
      .set('Cookie', `retro_session_id=${user1Cookie}`)
      .send({ reaction_type: 'thumbs_up' });

    // Charlie reacts to card1
    await request(app)
      .post(`/v1/cards/${card1Id}/reactions`)
      .set('Cookie', `retro_session_id=${user2Cookie}`)
      .send({ reaction_type: 'thumbs_up' });

    // Alice reacts to child card (card2)
    await request(app)
      .post(`/v1/cards/${card2Id}/reactions`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({ reaction_type: 'thumbs_up' });

    // Verify reaction counts and aggregation
    const card1WithReactions = await db.collection('cards').findOne({ _id: new ObjectId(card1Id) });
    expect(card1WithReactions.direct_reaction_count).toBe(2);
    expect(card1WithReactions.aggregated_reaction_count).toBe(3); // 2 own + 1 from child

    const reactionsInDb = await db.collection('reactions')
      .find({ card_id: { $in: [new ObjectId(card1Id), new ObjectId(card2Id)] } })
      .toArray();
    expect(reactionsInDb).toHaveLength(3);

    // ============ STEP 7: Designate co-admin ============

    const user1Hash = require('crypto')
      .createHash('sha256')
      .update(user1Cookie)
      .digest('hex');

    await request(app)
      .post(`/v1/boards/${boardId}/admins`)
      .set('Cookie', `retro_session_id=${creatorCookie}`)
      .send({ user_cookie_hash: user1Hash });

    // Verify Bob is now admin
    const boardWithCoAdmin = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
    expect(boardWithCoAdmin.admins).toHaveLength(2);

    // ============ STEP 8: Close board ============

    const closeBoardResponse = await request(app)
      .patch(`/v1/boards/${boardId}/close`)
      .set('Cookie', `retro_session_id=${creatorCookie}`);

    expect(closeBoardResponse.status).toBe(200);
    expect(closeBoardResponse.body.data.state).toBe('closed');

    const closedBoard = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
    expect(closedBoard.state).toBe('closed');
    expect(closedBoard.closed_at).toBeDefined();

    // Verify cannot create cards on closed board
    const createOnClosedResponse = await request(app)
      .post(`/v1/boards/${boardId}/cards`)
      .set('Cookie', `retro_session_id=${user2Cookie}`)
      .send({
        column_id: 'col-1',
        content: 'Should fail',
        card_type: 'feedback',
        is_anonymous: false
      });

    expect(createOnClosedResponse.status).toBe(409);
    expect(createOnClosedResponse.body.error.code).toBe('BOARD_CLOSED');

    // ============ STEP 9: Delete one card ============

    const deleteCardResponse = await request(app)
      .delete(`/v1/cards/${card4Id}`)
      .set('Cookie', `retro_session_id=${user2Cookie}`);

    expect(deleteCardResponse.status).toBe(204);

    // Verify card deleted
    const card4Check = await db.collection('cards').findOne({ _id: new ObjectId(card4Id) });
    expect(card4Check).toBeNull();

    // ============ STEP 10: Delete entire board (cleanup) ============

    const deleteBoardResponse = await request(app)
      .delete(`/v1/boards/${boardId}`)
      .set('Cookie', `retro_session_id=${creatorCookie}`);

    expect(deleteBoardResponse.status).toBe(204);

    // Verify cascade delete
    const finalBoardCheck = await db.collection('boards').findOne({ _id: new ObjectId(boardId) });
    expect(finalBoardCheck).toBeNull();

    const finalCardsCheck = await db.collection('cards')
      .find({ board_id: new ObjectId(boardId) })
      .toArray();
    expect(finalCardsCheck).toHaveLength(0);

    const finalReactionsCheck = await db.collection('reactions')
      .find({ card_id: { $in: [new ObjectId(card1Id), new ObjectId(card2Id)] } })
      .toArray();
    expect(finalReactionsCheck).toHaveLength(0);

    const finalSessionsCheck = await db.collection('user_sessions')
      .find({ board_id: new ObjectId(boardId) })
      .toArray();
    expect(finalSessionsCheck).toHaveLength(0);
  });

  it('LIFECYCLE: Card limit enforcement', async () => {
    // 1. Create board
    const board = await boardRepo.create({
      name: 'Integration Test Board',
      columns: [{ id: 'col-1', name: 'Test Column' }],
      created_by_hash: 'test-user-hash',
    });

    expect(board.id).toBeDefined();

    // 2. Create parent card
    const parentCard = await cardRepo.create({
      board_id: board.id,
      column_id: 'col-1',
      content: 'Parent card',
      card_type: 'feedback',
      is_anonymous: false,
      created_by_hash: 'test-user-hash',
      created_by_alias: 'Test User',
    });

    // 3. Create child card
    const childCard = await cardRepo.create({
      board_id: board.id,
      column_id: 'col-1',
      content: 'Child card',
      card_type: 'feedback',
      is_anonymous: false,
      created_by_hash: 'test-user-hash',
      created_by_alias: 'Test User',
    });

    // 4. Link child to parent
    await cardRepo.linkCards(parentCard.id, childCard.id, 'parent_of');

    // 5. Add reactions to parent
    await cardRepo.addReaction(parentCard.id, 'user1-hash', 'thumbs_up');
    await cardRepo.addReaction(parentCard.id, 'user2-hash', 'thumbs_up');

    // 6. Add reactions to child
    await cardRepo.addReaction(childCard.id, 'user3-hash', 'thumbs_up');

    // 7. Verify aggregated count
    const updatedParent = await cardRepo.findById(parentCard.id);

    expect(updatedParent.direct_reaction_count).toBe(2);
    expect(updatedParent.aggregated_reaction_count).toBe(3); // 2 + 1 from child

    // 8. Remove child's reaction
    await cardRepo.removeReaction(childCard.id, 'user3-hash');

    // 9. Verify parent's aggregated count updated
    const finalParent = await cardRepo.findById(parentCard.id);
    expect(finalParent.aggregated_reaction_count).toBe(2); // 2 + 0
  });

  it('should enforce card limit per user', async () => {
    const board = await boardRepo.create({
      name: 'Limited Board',
      columns: [{ id: 'col-1', name: 'Test' }],
      created_by_hash: 'user-hash',
      card_limit_per_user: 2, // Limit to 2 cards
    });

    // Create 2 cards (should succeed)
    await cardRepo.create({
      board_id: board.id,
      column_id: 'col-1',
      content: 'Card 1',
      card_type: 'feedback',
      is_anonymous: false,
      created_by_hash: 'user-hash',
      created_by_alias: 'User',
    });

    await cardRepo.create({
      board_id: board.id,
      column_id: 'col-1',
      content: 'Card 2',
      card_type: 'feedback',
      is_anonymous: false,
      created_by_hash: 'user-hash',
      created_by_alias: 'User',
    });

    // Check count
    const count = await cardRepo.countUserCards(board.id, 'user-hash');
    expect(count).toBe(2);

    // Attempt to create 3rd card should be prevented by service layer
    // (Repository doesn't enforce, service does)
  });
});
```

---

### 7.4 API Endpoint Tests (E2E)

```typescript
// tests/e2e/board-api.test.ts

import request from 'supertest';
import { app } from '../../../board-service/src/app';

describe('Board API Endpoints', () => {
  let sessionCookie: string;

  beforeEach(() => {
    // Mock cookie for tests
    sessionCookie = 'retro_session_id=test-session-uuid';
  });

  describe('POST /boards', () => {
    it('should create board and return 201', async () => {
      const response = await request(app)
        .post('/boards')
        .set('Cookie', sessionCookie)
        .send({
          name: 'Sprint 5 Retro',
          columns: [
            { id: 'col-1', name: 'What Went Well', color: '#ecf9ec' },
            { id: 'col-2', name: 'Improvements', color: '#FFF7E8' },
          ],
          card_limit_per_user: 5,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toMatch(/^board:/);
      expect(response.body.data.name).toBe('Sprint 5 Retro');
      expect(response.body.data.shareable_link).toBeDefined();
      expect(response.body.data.admins).toHaveLength(1);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/boards')
        .set('Cookie', sessionCookie)
        .send({
          columns: [{ id: 'col-1', name: 'Test' }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /boards/:id/name', () => {
    it('should rename board if user is admin', async () => {
      // First create board
      const createRes = await request(app)
        .post('/boards')
        .set('Cookie', sessionCookie)
        .send({
          name: 'Original Name',
          columns: [{ id: 'col-1', name: 'Test' }],
        });

      const boardId = createRes.body.data.id;

      // Rename board
      const response = await request(app)
        .patch(`/boards/${boardId}/name`)
        .set('Cookie', sessionCookie)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 403 if user is not admin', async () => {
      const response = await request(app)
        .patch('/boards/board:123/name')
        .set('Cookie', 'retro_session_id=different-user')
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
```

---

## 8. Error Handling Standards

### 8.1 Error Response Format

All errors follow this structure:

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details"?: any  // Optional additional context
  },
  "timestamp": "2025-12-24T10:30:00Z"
}
```

### 8.2 HTTP Status Codes

| Status | Code | Usage |
|--------|------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid session cookie |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Operation conflicts with current state (e.g., board closed) |
| 429 | Too Many Requests | Rate limit exceeded (future) |
| 500 | Internal Server Error | Unexpected server error |

### 8.3 Error Codes

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BOARD_NOT_FOUND'
  | 'CARD_NOT_FOUND'
  | 'FORBIDDEN'
  | 'BOARD_CLOSED'
  | 'CARD_LIMIT_REACHED'
  | 'REACTION_LIMIT_REACHED'
  | 'DATABASE_ERROR'
  | 'INVALID_RELATIONSHIP';
```

---

## Appendix

### A. API Request/Response Examples

See sections 2.1 and 3.1 for detailed examples.

### B. Repository Implementation Checklist

- [x] Interface defined with domain objects
- [x] SurrealDB implementation with proper error handling
- [x] Mapping functions (database → domain objects)
- [x] Unit tests with mocked dependencies
- [x] Integration tests with real database

### C. Test Coverage Goals

- Unit Tests: 80%+ coverage
- Integration Tests: Critical flows (create board → add cards → reactions)
- E2E Tests: Happy paths for all endpoints

---

**Document Status**: Draft - Ready for Review

**Next Steps**:
1. Review API specifications with frontend team
2. Validate database schema with DBA
3. Implement repository pattern for all services
4. Write comprehensive test suite
5. Set up CI/CD pipeline for automated testing
