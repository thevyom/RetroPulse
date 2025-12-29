# Phase 4: Card Domain Implementation

**Status**: ✅ COMPLETED
**Completed Date**: 2025-12-28
**Tasks**: 8/8 complete

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement the Card domain including CRUD operations, card types (feedback/action), parent-child relationships, action-feedback linking, quota enforcement, and relationship embedding in queries.

---

## 📋 Task Breakdown

### 4.0 Implement Card domain models and DTOs ✅

- [x] Created `src/domains/card/types.ts` with Card, CreateCardDTO, CardWithRelationships types
- [x] Defined card types: "feedback" | "action"
- [x] Created parent-child and linked_feedback relationship types
- [x] Created converter utilities: `cardDocumentToCard`, `cardDocumentToChildCard`, `cardDocumentToLinkedFeedbackCard`

**Key Types:**
```typescript
type CardType = 'feedback' | 'action';
type LinkType = 'parent_of' | 'linked_to';

interface CardDocument {
  _id: ObjectId;
  board_id: ObjectId;
  column_id: string;
  content: string;
  card_type: CardType;
  is_anonymous: boolean;
  created_by_hash: string;
  created_by_alias: string | null;
  created_at: Date;
  updated_at: Date | null;
  direct_reaction_count: number;
  aggregated_reaction_count: number;
  parent_card_id: ObjectId | null;
  linked_feedback_ids: ObjectId[];
}
```

---

### 4.1 Implement CardRepository with MongoDB ✅

- [x] Created `src/domains/card/card.repository.ts`
- [x] Implemented `create()` method with initial reaction counts = 0
- [x] Implemented `findById()`, `findByBoard()`, `updateContent()`, `delete()` methods
- [x] Implemented `moveToColumn()` method
- [x] Added MongoDB indexes
- [x] Written unit tests (40 test cases)

**Repository Methods:**

| Method | Purpose |
|--------|---------|
| `create(boardId, input, creatorHash, alias)` | Create new card |
| `findById(id)` | Get single card |
| `findByBoard(boardId, opts)` | Get cards with optional filters |
| `findByBoardWithRelationships(boardId, opts)` | Get cards with $lookup |
| `countByColumn(boardId)` | Summary stats by column |
| `countUserCards(boardId, userHash, type)` | For limit enforcement |
| `updateContent(id, content, opts)` | Update with requireCreator |
| `moveToColumn(id, columnId, opts)` | Move with requireCreator |
| `setParentCard(childId, parentId)` | Set/clear parent relationship |
| `addLinkedFeedback(actionId, feedbackId)` | Link action → feedback |
| `removeLinkedFeedback(actionId, feedbackId)` | Unlink |
| `incrementDirectReactionCount(id, delta)` | +/- on reaction |
| `incrementAggregatedReactionCount(id, delta)` | Update parent |
| `orphanChildren(parentId)` | Set parent_card_id = null |
| `findChildren(parentId)` | Get child cards |
| `isAncestor(ancestorId, cardId)` | Circular reference check |
| `delete(id)` | Delete single card |
| `deleteByBoard(boardId)` | Cascade delete |
| `getCardIdsByBoard(boardId)` | Get IDs for reaction cascade |

**Indexes Created:**
- `(board_id, created_at)` - descending
- `(board_id, created_by_hash, card_type)` - for limit checks
- `parent_card_id` - for child lookups
- `linked_feedback_ids` - for $lookup aggregations

---

### 4.2 Implement card creation with limit enforcement ✅

- [x] Added `countUserCards()` method to CardRepository
- [x] Implemented card limit check logic in CardService
- [x] Implemented feedback card vs action card differentiation
- [x] Added authorization check (only creator can delete/update)
- [x] Written unit tests verifying limit enforcement

**Limit Rules:**
- Only **feedback** cards count toward `card_limit_per_user`
- **Action** cards are exempt from limits
- Limit of `null` means unlimited

---

### 4.3 Implement Card API endpoints (CRUD) ✅

- [x] Created `src/domains/card/card.controller.ts`
- [x] Implemented `POST /boards/:id/cards` with validation and limit check
- [x] Implemented `GET /boards/:id/cards` with filtering
- [x] Implemented `PUT /cards/:id` with owner authorization
- [x] Implemented `DELETE /cards/:id` with orphaning children
- [x] Written integration tests (36 test cases)

**API Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/boards/:boardId/cards` | Cookie | Create card (limit enforced) |
| GET | `/v1/boards/:boardId/cards` | Cookie | Get cards with relationships |
| GET | `/v1/boards/:boardId/cards/quota` | Cookie | Check card creation quota |
| PUT | `/v1/cards/:id` | Owner | Update card content |
| DELETE | `/v1/cards/:id` | Owner | Delete card (orphans children) |
| PATCH | `/v1/cards/:id/column` | Owner | Move to different column |
| POST | `/v1/cards/:id/link` | Owner/Admin | Link cards |
| DELETE | `/v1/cards/:id/link` | Owner/Admin | Unlink cards |

---

### 4.4 Implement card quota check API ✅

- [x] Added `GET /boards/:id/cards/quota` endpoint
- [x] Return current_count, limit, can_create, limit_enabled
- [x] Support checking quota for other users (admin use case)
- [x] Written integration tests verifying quota accuracy

**Response Shape:**
```typescript
interface CardQuota {
  current_count: number;
  limit: number | null;
  can_create: boolean;
  limit_enabled: boolean;
}
```

---

### 4.5 Implement parent-child card relationships ✅

- [x] Added `linkCards()` method to CardService with circular check
- [x] Added `unlinkCards()` method to CardService
- [x] Implemented `POST /cards/:id/link` endpoint
- [x] Implemented `DELETE /cards/:id/link` endpoint
- [x] Added validation: both cards must be feedback type for parent-child
- [x] Added authorization: card creator or board admin
- [x] Written integration tests including circular prevention

**Link Types:**

| Type | Source | Target | Validation |
|------|--------|--------|------------|
| `parent_of` | feedback | feedback | Circular check, same board |
| `linked_to` | action | feedback | Same board |

**Circular Detection:**
```typescript
// Traverses parent chain to detect cycles
async isAncestor(potentialAncestorId, cardId): Promise<boolean>
```

---

### 4.6 Implement card relationship embedding ✅

- [x] Created MongoDB aggregation pipeline with $lookup for children
- [x] Created MongoDB aggregation pipeline with $lookup for linked_feedback_cards
- [x] Added `include_relationships` query parameter (default: true)
- [x] Added summary statistics: total_count, cards_by_column
- [x] Optimized with Promise.all for parallel database calls
- [x] Written integration tests verifying embedded data

**Aggregation Pipeline:**
```typescript
const pipeline = [
  { $match: { board_id, parent_card_id: null } },  // Top-level only
  { $sort: { created_at: -1 } },
  { $lookup: { from: 'cards', localField: '_id', foreignField: 'parent_card_id', as: 'children_docs' } },
  { $lookup: { from: 'cards', localField: 'linked_feedback_ids', foreignField: '_id', as: 'linked_feedback_docs' } },
];
```

---

### 4.7 Implement card move to column ✅

- [x] Added `PATCH /cards/:id/column` endpoint
- [x] Validate new column_id exists in board.columns
- [x] Preserve parent-child relationships during move
- [x] Written integration tests verifying relationship preservation

---

## 📁 Files Created

```
src/domains/card/
├── types.ts              # Card, CardDocument, CardWithRelationships interfaces
├── card.repository.ts    # MongoDB operations with aggregation (~540 lines)
├── card.service.ts       # Business logic with authorization (~427 lines)
├── card.controller.ts    # Express request handlers
├── card.routes.ts        # Route definitions (board-scoped + card-scoped)
└── index.ts              # Module exports

tests/
├── unit/domains/card/
│   ├── card.repository.test.ts  # 40 test cases
│   └── card.service.test.ts     # 29 test cases
└── integration/
    └── card.test.ts             # 36 test cases
```

---

## 🧪 Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| CardRepository (unit) | 40 | ✅ Pass |
| CardService (unit) | 29 | ✅ Pass |
| Card API (integration) | 36 | ✅ Pass |
| **Total** | **105** | ✅ |

---

## 📝 Code Review Notes

All blocking issues fixed:
- ✅ Authorization for linkCards (creator or board admin)
- ✅ Authorization for unlinkCards (creator or board admin)
- ✅ Performance optimization with Promise.all
- ✅ Added linked_feedback_ids index

---

## ⚠️ Known Issues / Tech Debt

1. **Aggregated Count Updates**: When parent-child links change, aggregated counts must be recalculated. This is handled but could have race conditions with concurrent reactions.

2. **No Pagination**: `GET /boards/:id/cards` returns all cards. Consider pagination for large boards.

3. **Orphaning Logic**: When parent is deleted, children become top-level. This might need UI consideration.

---

[← Back to Master Task List](../BACKEND_MASTER_TASK_LIST.md) | [Previous: Phase 3](./BACKEND_PHASE_03_USER_SESSION.md) | [Next: Phase 5 →](./BACKEND_PHASE_05_REACTION_DOMAIN.md)
