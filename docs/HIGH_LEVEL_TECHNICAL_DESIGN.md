# High-Level Technical Design - Collaborative Retro Board Platform

**Document Version**: 2.0
**Date**: 2025-12-25
**PRD Version**: 1.3
**Status**: Architecture Approved - Single Service + MongoDB

---

## Executive Summary

This document defines the high-level technical architecture for the Collaborative Retro Board MVP. The design prioritizes:

1. **Real-time collaboration** - Instant sync across 50+ concurrent users
2. **Simplified architecture** - Single monolithic service for MVP speed
3. **Data portability** - Repository pattern for future database migration
4. **Rapid prototyping** - Direct push architecture, minimal infrastructure
5. **Future scalability** - Clear path to microservices when needed

Key decisions:
- **Backend**: Node.js + TypeScript single service
- **Datastore**: MongoDB with repository abstraction layer
- **Frontend**: React + MVVM architecture with @dnd-kit and Material-UI
- **Real-time**: Direct push from service to Socket.io (no message queue for MVP)
- **Deployment**: Docker Compose on single physical server

---

## 1. Architecture Overview

### 1.1 System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Tier"
        Frontend["React Frontend (Browser)<br/>- MVVM Architecture<br/>- Socket.io Client<br/>- @dnd-kit (drag-drop)<br/>- Material-UI"]
    end

    subgraph "API Gateway Tier"
        Gateway["API Gateway<br/>Express + Socket.io<br/>- Auth middleware<br/>- Request routing<br/>- WebSocket gateway"]
    end

    subgraph "Application Tier"
        Service["Retro Board Service<br/>(Node.js + TypeScript)<br/>- Board Management<br/>- Card Operations<br/>- Reaction Handling<br/>- Real-time Push"]
    end

    subgraph "Data Tier"
        MongoDB["MongoDB<br/>- boards collection<br/>- cards collection<br/>- reactions collection<br/>- user_sessions collection"]
    end

    Frontend -->|HTTPS + WebSocket| Gateway
    Gateway -->|HTTP| Service
    Service -->|Direct Push| Gateway
    Service -->|Read/Write| MongoDB

    style Frontend fill:#e3f2fd
    style Gateway fill:#fff3e0
    style Service fill:#f3e5f5
    style MongoDB fill:#e8f5e9
```

### 1.2 Simplified MVP Architecture

```mermaid
flowchart LR
    subgraph "Single Physical Server"
        subgraph "Docker Containers"
            N[Nginx<br/>Reverse Proxy]
            A[API Gateway<br/>:3000]
            S[Retro Board Service<br/>:3001]
            M[(MongoDB<br/>:27017)]
        end
    end

    Client[React Frontend]

    Client <-->|HTTPS/WSS| N
    N --> A
    A <--> S
    S <--> M
    S -.Direct Push.-> A

    style Client fill:#90caf9
    style N fill:#ffcc80
    style A fill:#ce93d8
    style S fill:#a5d6a7
    style M fill:#80deea
```

---

## 2. Technology Stack Decisions

### 2.1 Backend Runtime: Node.js + TypeScript

**Decision**: Node.js 20 LTS with TypeScript

#### Trade-offs Analysis

| Criteria | Node.js + TypeScript ✅ | Python + FastAPI |
|----------|------------------------|------------------|
| **Real-time performance** | Excellent - Event loop optimized for WebSocket connections | Good - Requires async workers (Uvicorn/Gunicorn) |
| **Async/webhooks** | Native async/await, non-blocking I/O | Excellent with asyncio, but requires careful handling |
| **Type safety** | TypeScript provides full-stack type sharing with React | Python type hints less strict, no frontend sharing |
| **Ecosystem** | Massive - Socket.io, MongoDB drivers, 2M+ packages | Strong - FastAPI, Motor, but smaller WebSocket libs |
| **Concurrent connections** | Handles 10K+ connections per instance easily | Requires multi-worker setup for scale |
| **Team learning curve** | Medium - JS devs transition easily | Medium - Python syntax simpler, async harder |
| **Real-time libraries** | Socket.io (battle-tested, 50K+ stars) | python-socketio (less mature) |

#### Final Decision: **Node.js + TypeScript**

**Rationale**:
1. **Real-time is core requirement** - Node's event loop excels at concurrent WebSocket connections
2. **Type sharing** - Share interfaces between frontend and backend (Board, Card, User types)
3. **MongoDB SDK** - Excellent Node.js support with TypeScript bindings
4. **Single language** - Easier for full-stack developers to context switch
5. **Socket.io maturity** - Industry standard for real-time web apps

---

### 2.2 Datastore: MongoDB

**Decision**: MongoDB 7.0+ with repository abstraction layer

#### Trade-offs Analysis

| Criteria | MongoDB ✅ | CouchDB | PostgreSQL |
|----------|-----------|---------|------------|
| **Real-time capability** | Change Streams (requires replica set) | `/_changes` feed (single-node) | LISTEN/NOTIFY (manual) |
| **Document model** | Native JSON (BSON), excellent for cards | Native JSON, CouchDB specialty | JSONB, added later |
| **Query capabilities** | Rich aggregation pipeline, powerful | MapReduce + Mango (limited) | SQL, most powerful |
| **Learning curve** | Low - JSON queries, SQL-like | Medium - MapReduce views | Medium - SQL knowledge needed |
| **Production maturity** | Battle-tested since 2009 | Mature (2005), smaller community | Industry standard since 1996 |
| **Ecosystem** | Massive - Atlas, tools, drivers | Small - Niche use cases | Largest ecosystem |
| **Cloud hosting** | Atlas (AWS/Azure/GCP) | Cloudant (IBM), self-host | RDS, CloudSQL, Azure DB |
| **Parent-child relationships** | Manual references + aggregation | Manual joins or denormalization | Foreign keys + joins |
| **Single-node deployment** | Yes (no Change Streams) | Yes (with `/_changes`) | Yes |

#### Final Decision: **MongoDB for MVP**

**Rationale**:
1. **Familiar and proven** - Battle-tested with massive ecosystem and community
2. **Rich querying** - Aggregation pipeline excellent for parent-child reaction counts
3. **Developer productivity** - JSON queries align with TypeScript/JavaScript mindset
4. **Cloud-ready** - MongoDB Atlas provides easy scaling path when needed
5. **Talent pool** - Easier to hire developers familiar with MongoDB than CouchDB
6. **Direct push for MVP** - No need for Change Streams initially (simpler deployment)

**For MVP - No Change Streams Required**:
- Service directly broadcasts updates after database writes
- Eliminates need for 3-node replica set
- Single MongoDB instance deployment
- Can add Change Streams later when scaling

**Migration to Repository Pattern**:
```typescript
export interface BoardRepository {
  create(data: CreateBoardDTO): Promise<Board>;
  findById(id: string): Promise<Board | null>;
  // ... interface methods
}

// MongoDB implementation
export class MongoBoardRepository implements BoardRepository {
  constructor(private db: Db) {}
  async create(data: CreateBoardDTO): Promise<Board> {
    const result = await this.db.collection('boards').insertOne({
      name: data.name,
      columns: data.columns,
      created_by_hash: data.created_by_hash,
      state: 'active',
      created_at: new Date(),
    });
    return this.mapToBoard(result);
  }
}
```

---

### 2.3 Frontend Framework: React + MVVM

**Decision**: React 18+ with MVVM architecture pattern

#### Technology Choices

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Framework** | React 18 + TypeScript | Industry standard, rich ecosystem, team expertise |
| **Drag & Drop** | **@dnd-kit** | Modern, accessible, 13K+ stars, better than react-beautiful-dnd (deprecated) |
| **UI Components** | **Material-UI v5** | Card components, Chip, consistent design system |
| **State Management** | **Zustand** | Lightweight (3KB), simpler than Redux, TypeScript-first |
| **Real-time Client** | **Socket.io-client** | Pairs with backend Socket.io, auto-reconnect |
| **Build Tool** | **Vite** | Fast HMR, modern, better DX than CRA |

#### MVVM Architecture Pattern

```mermaid
graph TD
    subgraph "Feature: Board"
        BM[Models<br/>Board.ts<br/>BoardRepository.ts]
        BVM[ViewModels<br/>useBoardViewModel.ts]
        BV[Views<br/>BoardView.tsx<br/>BoardHeader.tsx]
    end

    subgraph "Feature: Card"
        CM[Models<br/>Card.ts<br/>CardRepository.ts]
        CVM[ViewModels<br/>useCardViewModel.ts<br/>useCardDragDrop.ts]
        CV[Views<br/>CardView.tsx<br/>CardList.tsx]
    end

    BV --> BVM
    BVM --> BM
    CV --> CVM
    CVM --> CM

    style BM fill:#ffccbc
    style BVM fill:#c5e1a5
    style BV fill:#b3e5fc
    style CM fill:#ffccbc
    style CVM fill:#c5e1a5
    style CV fill:#b3e5fc
```

**Example ViewModel Implementation**:

```typescript
// features/card/viewmodels/useCardViewModel.ts
export function useCardViewModel(boardId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const cardRepo = useCardRepository();
  const socket = useSocket();

  // Load initial data
  useEffect(() => {
    cardRepo.getCardsByBoard(boardId).then(setCards);
  }, [boardId]);

  // Subscribe to real-time updates
  useEffect(() => {
    socket.on('card:created', (newCard) => {
      setCards(prev => [...prev, newCard]);
    });
    return () => socket.off('card:created');
  }, []);

  // Business logic
  const createCard = async (data: CreateCardDTO) => {
    await cardRepo.create(data);
    // Real-time update handled by socket listener
  };

  return { cards, createCard };
}
```

---

## 3. Simplified Service Architecture

### 3.1 Single Service Design (MVP)

**Decision**: Single monolithic service for MVP, architect for future split

#### Service Architecture

```mermaid
graph TB
    subgraph "API Gateway (Port 3000)"
        GW[Express Router<br/>+ Socket.io Server<br/>+ Auth Middleware]
    end

    subgraph "Retro Board Service (Port 3001)"
        BL[Business Logic Layer]

        subgraph "Domain Services"
            BS[BoardService]
            CS[CardService]
            RS[ReactionService]
        end

        subgraph "Repository Layer"
            BR[BoardRepository]
            CR[CardRepository]
            RR[ReactionRepository]
        end
    end

    subgraph "MongoDB"
        DB[(boards<br/>cards<br/>reactions<br/>user_sessions)]
    end

    GW -->|Routes| BL
    BL --> BS
    BL --> CS
    BL --> RS
    BS --> BR
    CS --> CR
    RS --> RR
    BR --> DB
    CR --> DB
    RR --> DB
    CS -.Direct Push.-> GW
    BS -.Direct Push.-> GW

    style GW fill:#ffe082
    style BL fill:#ce93d8
    style BS fill:#a5d6a7
    style CS fill:#90caf9
    style RS fill:#ffab91
    style BR fill:#c5e1a5
    style CR fill:#80deea
    style RR fill:#ef9a9a
```

#### Why Single Service for MVP?

| Aspect | Single Service ✅ | Multiple Microservices |
|--------|------------------|------------------------|
| **Development speed** | Fast - no inter-service communication | Slower - manage service boundaries |
| **Deployment complexity** | Simple - 1 container | Complex - orchestrate multiple containers |
| **Debugging** | Easy - single codebase, stack traces | Hard - distributed tracing needed |
| **Transaction handling** | Native MongoDB transactions | Distributed sagas required |
| **Team size** | Perfect for 1-3 developers | Requires 4+ developers minimum |
| **Infrastructure cost** | Low - single service instance | Higher - multiple instances |

**Decision**: Single service for MVP, **clear domain boundaries** for future split

**Domain Boundaries** (prepared for future microservices):

```
/src
├── domains/
│   ├── board/
│   │   ├── BoardService.ts
│   │   ├── BoardRepository.ts
│   │   ├── BoardController.ts
│   │   └── types.ts
│   ├── card/
│   │   ├── CardService.ts
│   │   ├── CardRepository.ts
│   │   ├── CardController.ts
│   │   └── types.ts
│   └── reaction/
│       ├── ReactionService.ts
│       ├── ReactionRepository.ts
│       └── types.ts
├── shared/
│   ├── middleware/
│   └── utils/
└── gateway/
    ├── app.ts
    ├── routes.ts
    └── websocket.ts
```

**Migration Path to Microservices**:
1. Each domain folder becomes a separate service
2. Extract domain → New repository
3. Change imports to HTTP calls
4. Deploy as separate containers
5. **Estimated effort**: 1-2 weeks (vs 3+ months building microservices from scratch)

---

### 3.2 Real-time Architecture - Direct Push

**Decision**: Service directly pushes to Socket.io after database writes (no message queue)

#### Real-time Flow Diagram

```mermaid
sequenceDiagram
    participant Client1
    participant Client2
    participant Gateway as API Gateway<br/>(Socket.io Server)
    participant Service as Retro Board Service
    participant DB as MongoDB

    Client1->>Gateway: POST /boards/123/cards<br/>(Create card)
    Gateway->>Service: Forward request
    Service->>DB: Insert card document
    DB-->>Service: Card created
    Service->>Service: Map to domain object
    Service-->>Gateway: HTTP 201 Response
    Gateway-->>Client1: Card created response

    Note over Service,Gateway: Direct Push (Synchronous)
    Service->>Gateway: io.to('board:123').emit('card:created', card)
    Gateway->>Client1: WebSocket: card:created
    Gateway->>Client2: WebSocket: card:created

    Client1->>Client1: Update local state
    Client2->>Client2: Update local state
```

#### Implementation

```typescript
// retro-board-service/src/domains/card/CardService.ts
export class CardService {
  constructor(
    private cardRepo: CardRepository,
    private socketGateway: SocketGateway // Injected reference to gateway
  ) {}

  async createCard(data: CreateCardDTO, userHash: string): Promise<Card> {
    // 1. Validate and create card
    const card = await this.cardRepo.create({
      ...data,
      created_by_hash: userHash,
    });

    // 2. Direct push to Socket.io gateway
    this.socketGateway.broadcast(`board:${card.board_id}`, {
      type: 'card:created',
      data: card,
      timestamp: new Date(),
    });

    return card;
  }
}
```

```typescript
// api-gateway/src/websocket/SocketGateway.ts
export class SocketGateway {
  constructor(private io: Server) {}

  broadcast(room: string, event: RealtimeEvent): void {
    this.io.to(room).emit(event.type, event);
  }

  // Called by service via direct reference
  emitToRoom(room: string, eventType: string, data: any): void {
    this.io.to(room).emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### Why Direct Push for MVP?

| Aspect | Direct Push ✅ | MongoDB Change Streams | Redis Pub/Sub |
|--------|---------------|------------------------|---------------|
| **Infrastructure** | None - just Socket.io | Requires 3-node replica set | Requires Redis instance |
| **Complexity** | Low - explicit broadcast calls | Medium - subscribe to changes | Medium - queue setup |
| **Latency** | Immediate (< 10ms) | ~50-100ms (polling interval) | ~20-50ms |
| **Development time** | Fast - 1 day implementation | Medium - 3-5 days setup | Medium - 3-5 days |
| **Debugging** | Easy - synchronous, stack traces | Hard - async, eventual consistency | Medium - message inspection tools |
| **Failure handling** | Immediate failure visible | Silent - may miss events | Queue replay possible |
| **Single server deployment** | ✅ Perfect | ❌ Needs 3 MongoDB instances | ✅ Works |

**Trade-off**: Service coupled to Socket.io gateway (acceptable for MVP)

**Mitigation for Scale**: See Section 10 (Future Enhancements) for migration to pub/sub architecture

---

### 3.3 Data Abstraction - Repository Pattern

**Decision**: Repository pattern for database portability

#### Interface Design

```typescript
// shared/repositories/BoardRepository.ts
export interface BoardRepository {
  create(data: CreateBoardDTO): Promise<Board>;
  findById(id: string): Promise<Board | null>;
  updateName(id: string, name: string): Promise<Board>;
  closeBoard(id: string): Promise<Board>;
  addAdmin(boardId: string, userHash: string): Promise<void>;
  isAdmin(boardId: string, userHash: string): Promise<boolean>;
}

// MongoDB implementation
export class MongoBoardRepository implements BoardRepository {
  constructor(private db: Db) {}

  async create(data: CreateBoardDTO): Promise<Board> {
    const doc = {
      name: data.name,
      columns: data.columns,
      state: 'active',
      created_at: new Date(),
      created_by_hash: data.created_by_hash,
      admins: [data.created_by_hash],
      shareable_link: `${process.env.APP_URL}/board/${uuidv4()}`,
    };

    const result = await this.db.collection('boards').insertOne(doc);
    return this.mapToBoard({ _id: result.insertedId, ...doc });
  }

  async findById(id: string): Promise<Board | null> {
    const doc = await this.db.collection('boards').findOne({ _id: new ObjectId(id) });
    return doc ? this.mapToBoard(doc) : null;
  }

  private mapToBoard(doc: any): Board {
    return {
      id: doc._id.toString(),
      name: doc.name,
      shareable_link: doc.shareable_link,
      state: doc.state,
      columns: doc.columns,
      created_at: doc.created_at,
      admins: doc.admins,
    };
  }
}
```

#### Benefits

1. **Database portability** - Swap MongoDB for PostgreSQL by implementing new repository
2. **Testability** - Mock repositories in unit tests
3. **Query optimization** - Change queries without touching business logic
4. **Type safety** - Repository returns domain objects, not database types

---

## 4. API Design

### 4.1 RESTful API Structure

**Base URL**: `https://api.retroboard.com/v1`

#### Endpoints Summary

```mermaid
graph LR
    subgraph "Board Management"
        B1[POST /boards]
        B2[GET /boards/:id]
        B3[PATCH /boards/:id/name]
        B4[PATCH /boards/:id/close]
        B5[POST /boards/:id/admins]
        B6[POST /boards/:id/join]
    end

    subgraph "Card Management"
        C1[GET /boards/:id/cards]
        C2[POST /boards/:id/cards]
        C3[PUT /cards/:id]
        C4[DELETE /cards/:id]
        C5[POST /cards/:id/link]
    end

    subgraph "Reactions"
        R1[POST /cards/:id/reactions]
        R2[DELETE /cards/:id/reactions]
    end
```

#### Request/Response Format

**Request**:
```json
POST /v1/boards
{
  "name": "Sprint 42 Retro",
  "columns": [
    { "id": "col-1", "name": "What Went Well", "color": "#E8F5E9" },
    { "id": "col-2", "name": "Improvements", "color": "#FFEBEE" }
  ],
  "card_limit_per_user": 5,
  "reaction_limit_per_user": 10
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "id": "6763b4a8f1c2d3e4f5a6b7c8",
    "name": "Sprint 42 Retro",
    "shareable_link": "https://app.retroboard.com/board/6763b4a8f1c2d3e4f5a6b7c8",
    "state": "active",
    "columns": [...],
    "created_at": "2025-12-24T10:00:00Z"
  },
  "timestamp": "2025-12-24T10:00:01Z"
}
```

---

### 4.2 WebSocket Events

**Client → Server**:
```typescript
socket.emit('join-board', { board_id: '6763b4a8f1c2d3e4f5a6b7c8' });
socket.emit('leave-board', { board_id: '6763b4a8f1c2d3e4f5a6b7c8' });
socket.emit('heartbeat', { board_id: '6763b4a8f1c2d3e4f5a6b7c8', alias: 'Alice' });
```

**Server → Client**:
```typescript
socket.on('card:created', { board_id, card, user_alias });
socket.on('card:updated', { board_id, card });
socket.on('card:deleted', { board_id, card_id });
socket.on('reaction:added', { board_id, card_id, user_alias, reaction_type });
socket.on('user:joined', { board_id, user_alias });
socket.on('board:closed', { board_id });
```

---

### 4.3 Authentication & Authorization

**Cookie-based Session Auth**:

```typescript
// api-gateway/src/middleware/auth.ts
async function authMiddleware(req, res, next) {
  const sessionId = req.cookies.retro_session_id;

  if (!sessionId) {
    // First-time visitor - create session
    const newSessionId = uuidv4();
    res.cookie('retro_session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    req.hashedCookieId = sha256(newSessionId);
  } else {
    req.hashedCookieId = sha256(sessionId);
  }

  next();
}
```

---

## 5. Database Design

### 5.1 MongoDB Collections

```mermaid
erDiagram
    boards ||--o{ cards : contains
    boards ||--o{ user_sessions : tracks
    cards ||--o{ reactions : has
    cards ||--o{ cards : "parent-child"
    cards }o--o{ cards : "action-feedback link"

    boards {
        ObjectId _id PK
        string name
        string shareable_link UK
        string state
        datetime closed_at
        array columns
        int card_limit_per_user
        int reaction_limit_per_user
        datetime created_at
        string created_by_hash
        array admins
    }

    cards {
        ObjectId _id PK
        ObjectId board_id FK
        string column_id
        string content
        string card_type
        boolean is_anonymous
        string created_by_hash
        string created_by_alias
        datetime created_at
        int direct_reaction_count
        int aggregated_reaction_count
        ObjectId parent_card_id FK
        array linked_feedback_ids
    }

    reactions {
        ObjectId _id PK
        ObjectId card_id FK
        string user_cookie_hash
        string user_alias
        string reaction_type
        datetime created_at
    }

    user_sessions {
        ObjectId _id PK
        ObjectId board_id FK
        string cookie_hash UK
        string alias
        datetime last_active_at
        boolean is_admin
        datetime created_at
    }
```

### 5.2 Collection Schemas

**boards collection**:
```javascript
{
  _id: ObjectId("6763b4a8f1c2d3e4f5a6b7c8"),
  name: "Sprint 5 Retro",
  shareable_link: "https://app.com/board/6763b4a8f1c2d3e4f5a6b7c8",
  state: "active", // "active" | "closed"
  closed_at: null,
  columns: [
    { id: "col-1", name: "What Went Well", color: "#E8F5E9" },
    { id: "col-2", name: "Improvements", color: "#FFEBEE" }
  ],
  card_limit_per_user: 5,
  reaction_limit_per_user: 10,
  created_at: ISODate("2025-12-24T10:00:00Z"),
  created_by_hash: "sha256_hash_of_cookie",
  admins: ["sha256_hash_of_cookie", "sha256_hash_of_admin2"]
}
```

**cards collection**:
```javascript
{
  _id: ObjectId("6763b5c9a1b2c3d4e5f6a7b8"),
  board_id: ObjectId("6763b4a8f1c2d3e4f5a6b7c8"),
  column_id: "col-1",
  content: "Great team collaboration during sprint planning!",
  card_type: "feedback", // "feedback" | "action"
  is_anonymous: false,
  created_by_hash: "sha256_hash",
  created_by_alias: "Alice",
  created_at: ISODate("2025-12-24T10:05:00Z"),
  direct_reaction_count: 3,
  aggregated_reaction_count: 5, // Own reactions + children reactions
  parent_card_id: null, // ObjectId if child card
  linked_feedback_ids: [] // For action cards linking to feedback
}
```

**reactions collection**:
```javascript
{
  _id: ObjectId("6763b6d0b1c2d3e4f5a6b7c8"),
  card_id: ObjectId("6763b5c9a1b2c3d4e5f6a7b8"),
  user_cookie_hash: "sha256_hash",
  user_alias: "Bob",
  reaction_type: "thumbs_up",
  created_at: ISODate("2025-12-24T10:10:00Z")
}
```

**user_sessions collection**:
```javascript
{
  _id: ObjectId("6763b7e1c1d2e3f4a5b6c7d8"),
  board_id: ObjectId("6763b4a8f1c2d3e4f5a6b7c8"),
  cookie_hash: "sha256_hash",
  alias: "Alice",
  last_active_at: ISODate("2025-12-24T10:15:00Z"),
  is_admin: true,
  created_at: ISODate("2025-12-24T10:00:00Z")
}
```

### 5.3 Indexes

```javascript
// boards collection
db.boards.createIndex({ shareable_link: 1 }, { unique: true });
db.boards.createIndex({ state: 1 });

// cards collection
db.cards.createIndex({ board_id: 1, created_at: -1 });
db.cards.createIndex({ board_id: 1, created_by_hash: 1, card_type: 1 });
db.cards.createIndex({ parent_card_id: 1 });

// reactions collection
db.reactions.createIndex({ card_id: 1, user_cookie_hash: 1 }, { unique: true });
db.reactions.createIndex({ card_id: 1 });

// user_sessions collection
db.user_sessions.createIndex({ board_id: 1, last_active_at: -1 });
db.user_sessions.createIndex({ board_id: 1, cookie_hash: 1 }, { unique: true });
```

---

## 6. Security Architecture

### 6.1 Anonymous Privacy Protection

**Cookie Hashing for Privacy**:

```mermaid
flowchart LR
    A[Browser Cookie<br/>UUID: abc-123] --> B[API Gateway<br/>SHA-256 Hash]
    B --> C[Service receives<br/>Hash: ef9a7b...]
    C --> D[MongoDB stores<br/>Hash only]

    style A fill:#ffccbc
    style B fill:#c5e1a5
    style C fill:#b3e5fc
    style D fill:#80deea
```

**Implementation**:
```typescript
import crypto from 'crypto';

// In API Gateway middleware
const sessionId = req.cookies.retro_session_id; // "abc-123"
const hashedCookieId = crypto
  .createHash('sha256')
  .update(sessionId)
  .digest('hex'); // "ef9a7b..."

// Forward hash to service
req.hashedCookieId = hashedCookieId;

// Service stores hash in DB
await cardRepo.create({
  created_by_hash: req.hashedCookieId, // One-way hash
});
```

**Privacy guarantee**: Even database admin cannot reverse-engineer anonymous users

---

### 6.2 Input Validation

**Validation at API Gateway**:
```typescript
import Joi from 'joi';

const createBoardSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  columns: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().min(1).max(100).required(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    })
  ).min(1).max(10).required(),
  card_limit_per_user: Joi.number().integer().min(1).optional(),
  reaction_limit_per_user: Joi.number().integer().min(1).optional(),
});
```

**SQL Injection Prevention** (MongoDB):
```typescript
// ❌ Vulnerable (don't do this)
await db.collection('cards').find({ board_id: req.params.boardId });

// ✅ Safe - use ObjectId validation
const boardId = ObjectId.isValid(req.params.boardId)
  ? new ObjectId(req.params.boardId)
  : null;
if (!boardId) throw new ValidationError('Invalid board ID');
```

---

## 7. Performance Optimization

### 7.1 Database Query Optimization

**Aggregation for Parent-Child Reaction Counts**:
```javascript
// Calculate aggregated reaction count for parent card
db.cards.aggregate([
  { $match: { _id: parentCardId } },
  {
    $lookup: {
      from: 'cards',
      localField: '_id',
      foreignField: 'parent_card_id',
      as: 'children'
    }
  },
  {
    $project: {
      direct_reaction_count: 1,
      aggregated_reaction_count: {
        $add: [
          '$direct_reaction_count',
          { $sum: '$children.direct_reaction_count' }
        ]
      }
    }
  }
]);
```

**Cached Counts** (denormalized):
- Store `direct_reaction_count` and `aggregated_reaction_count` in card document
- Update via atomic operations when reactions change
- Avoids expensive aggregation on every read

---

### 7.2 Frontend Optimization

**Virtual Scrolling** (for >100 cards):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function CardList({ cards }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Card height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <CardView key={cards[virtualRow.index].id} card={cards[virtualRow.index]} />
      ))}
    </div>
  );
}
```

---

## 8. Monitoring & Observability

### 8.1 MVP Approach: Structured Logs

**Logging Implementation**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console(),
  ],
});

logger.info({
  event: 'card_created',
  board_id: '6763b4a8...',
  card_type: 'feedback',
  user_hashed: req.hashedCookieId,
  duration_ms: 45,
  timestamp: new Date(),
});
```

**What to Log**:
- Request/response (method, path, status, duration)
- Database operations (query type, duration)
- WebSocket events (connect, disconnect, room join)
- Business events (board created, card linked)

**What NOT to log**:
- Plain cookie values (only hashed)
- Card content (only card IDs)
- Personally identifiable information

---

## 9. Deployment Architecture

### 9.1 Single Physical Server Deployment

```mermaid
graph TB
    subgraph "Single Physical Server"
        subgraph "Nginx Layer"
            N[Nginx<br/>- HTTPS termination<br/>- WebSocket proxy<br/>- Static file serving<br/>- /api/* routing]
        end

        subgraph "Docker Compose"
            subgraph "Application Containers"
                G[API Gateway<br/>:3000]
                S[Retro Board Service<br/>:3001]
            end

            subgraph "Data Container"
                M[(MongoDB<br/>:27017<br/>File-based storage)]
            end
        end

        subgraph "Storage"
            V[Docker Volumes<br/>- MongoDB data<br/>- Logs]
        end
    end

    Internet -->|HTTPS/WSS| N
    N --> G
    G --> S
    S --> M
    M --> V

    style N fill:#ffcc80
    style G fill:#ce93d8
    style S fill:#a5d6a7
    style M fill:#80deea
    style V fill:#ffccbc
```

### 9.2 Docker Compose Configuration

**File**: `docker-compose.yml`

```yaml
version: '3.9'

services:
  # MongoDB
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 3

  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - RETRO_SERVICE_URL=http://retro-service:3001
      - NODE_ENV=production
      - FRONTEND_URL=https://retroboard.com
    depends_on:
      mongodb:
        condition: service_healthy

  # Retro Board Service
  retro-service:
    build: ./services/retro-board
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URL=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017
      - MONGODB_DATABASE=retroboard
      - NODE_ENV=production
      - GATEWAY_URL=http://api-gateway:3000
    depends_on:
      - mongodb

  # Nginx Reverse Proxy
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - api-gateway

volumes:
  mongo-data:
```

**Server Specifications** (Recommended):
- **CPU**: 4-8 cores
- **RAM**: 16-32 GB
- **Storage**: 500 GB SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

**Scaling Capacity** (single server):
- **Concurrent users**: 500-1000 users
- **Boards**: 10,000+ boards
- **WebSocket connections**: 1000+ concurrent
- **Database**: 100 GB+ data

---

## 10. Future Enhancements

### 10.1 Migration to Microservices Architecture

**When to migrate**:
- Traffic exceeds single server capacity (>1000 concurrent users)
- Need independent scaling (card service under higher load than board service)
- Multiple teams working on codebase

**Target Architecture**:

```mermaid
graph TB
    subgraph "Client Tier"
        F[React Frontend]
    end

    subgraph "API Gateway"
        G[API Gateway<br/>+ Socket.io]
    end

    subgraph "Microservices"
        B[Board Service<br/>:3001]
        C[Card Service<br/>:3002]
    end

    subgraph "Message Queue"
        R[(Redis Pub/Sub<br/>or Kafka)]
    end

    subgraph "Data Tier"
        M[(MongoDB<br/>Replica Set)]
    end

    F -->|HTTPS/WSS| G
    G --> B
    G --> C
    B --> M
    C --> M
    B -.Publish Events.-> R
    C -.Publish Events.-> R
    R -.Subscribe.-> G

    style F fill:#90caf9
    style G fill:#ce93d8
    style B fill:#a5d6a7
    style C fill:#ffab91
    style R fill:#fff59d
    style M fill:#80deea
```

**Service Decomposition**:

| Service | Responsibilities | Independent Scaling Trigger |
|---------|-----------------|----------------------------|
| **Board Service** | Board CRUD, columns, admins, board state | Low - create once, rare updates |
| **Card Service** | Card CRUD, reactions, parent-child, action links | **High** - frequent CRUD operations |

**Migration Steps**:
1. Extract `domains/card/` → New `card-service` repository
2. Replace direct function calls with HTTP client
3. Add Redis Pub/Sub for real-time events
4. Deploy as separate Docker containers
5. Update API Gateway routing

**Estimated effort**: 1-2 weeks (domain boundaries already established)

---

### 10.2 Real-time with Message Queue

**When to migrate**:
- Multiple service instances need coordination
- Need event replay capability
- Implementing event sourcing

**Architecture**:

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant S as Card Service
    participant R as Redis Pub/Sub
    participant DB as MongoDB

    C->>G: POST /cards (Create card)
    G->>S: Forward request
    S->>DB: Insert card
    DB-->>S: Card created
    S->>R: PUBLISH card:created event
    S-->>G: HTTP 201 Response
    G-->>C: Response

    R->>G: Event: card:created
    G->>C: WebSocket: card:created
```

**Redis Pub/Sub Implementation**:
```typescript
// card-service/src/events/EventPublisher.ts
import { createClient } from 'redis';

export class EventPublisher {
  private redisClient: ReturnType<typeof createClient>;

  async publish(channel: string, event: any): Promise<void> {
    await this.redisClient.publish(channel, JSON.stringify(event));
  }
}

// In CardService
await this.eventPublisher.publish('board:123:events', {
  type: 'card:created',
  data: card,
  timestamp: new Date(),
});
```

**Trade-offs**:

| Aspect | Direct Push (MVP) | Redis Pub/Sub |
|--------|------------------|---------------|
| **Latency** | Immediate (< 10ms) | ~20-50ms |
| **Infrastructure** | None | Redis instance required |
| **Multiple instances** | ❌ Doesn't scale | ✅ Scales horizontally |
| **Event replay** | ❌ Not possible | ✅ Can use Redis Streams |
| **Debugging** | Easy - synchronous | Medium - async messages |

---

### 10.3 MongoDB Change Streams

**When to use**:
- Want database-driven real-time (no manual emit)
- Multiple services need to react to data changes
- Implementing CQRS pattern

**Requirements**:
- MongoDB Replica Set (minimum 3 nodes)

**Implementation**:
```typescript
// realtime-service/src/changeStreams.ts
const changeStream = db.collection('cards').watch();

changeStream.on('change', (change) => {
  if (change.operationType === 'insert') {
    const card = change.fullDocument;
    io.to(`board:${card.board_id}`).emit('card:created', {
      type: 'card:created',
      data: card,
    });
  }
});
```

**Migration Path**:
1. Deploy MongoDB as 3-node replica set
2. Create dedicated Realtime Service
3. Subscribe to Change Streams
4. Remove direct push calls from main service
5. Decouple services from Socket.io gateway

---

## 11. Technology Stack Summary

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Frontend** | React | 18+ | Industry standard, rich ecosystem |
| | TypeScript | 5+ | Type safety, shared types with backend |
| | @dnd-kit | 6+ | Accessible drag-drop, modern |
| | Material-UI | 5+ | Card/Chip components, consistent design |
| | Zustand | 4+ | Lightweight state (3KB), simple API |
| | Socket.io-client | 4+ | Real-time sync with backend |
| **Backend** | Node.js | 20 LTS | Real-time performance, async I/O |
| | TypeScript | 5+ | Type safety, shared types |
| | Express | 4+ | Battle-tested, middleware ecosystem |
| | Socket.io | 4+ | WebSocket abstraction, fallbacks |
| | Winston | 3+ | Structured JSON logging |
| **Datastore** | MongoDB | 7.0+ | Document model, rich queries, proven |
| **Deployment** | Docker | 24+ | Containerization |
| | Docker Compose | 2+ | Orchestration (local + production) |
| | Nginx | 1.25+ | Reverse proxy, SSL, static files |
| | Ubuntu Server | 22.04 LTS | Single physical server OS |
| **Monitoring** | Logs only (MVP) | - | Structured JSON, future OTEL-ready |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-24 | VK AI | Initial high-level technical design with SurrealDB + microservices |
| 2.0 | 2025-12-25 | VK AI | Complete redesign: MongoDB + single service + direct push + Mermaid diagrams |

---

**Document Status**: Approved - Ready for Implementation

**Next Steps**:
1. Review MongoDB schema with team
2. Implement repository pattern for all domains
3. Set up Docker Compose development environment
4. Create API specification document with missing endpoints (board sharing, participant join)
5. Begin implementation with Board domain
