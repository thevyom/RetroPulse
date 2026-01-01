# Phase 6: Integration & Real-time Features

**Status**: ✅ COMPLETE
**Priority**: High
**Tasks**: 4/4 complete
**Dependencies**: Phase 5 complete
**Completion Date**: 2025-12-31

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Connect all layers together: Views consume ViewModels, ViewModels coordinate stores and APIs, real-time events flow through WebSocket to update stores, and drag-and-drop interactions are fully integrated. This phase validates the MVVM architecture works end-to-end.

---

## 📋 Task Breakdown

### 19. Real-time Event Handling

#### 19.1 Implement Real-time Event Subscriptions in ViewModels ✅

- [x] In useBoardViewModel: subscribe to 'board:renamed', 'board:closed'
- [x] In useCardViewModel: subscribe to 'card:created', 'card:updated', 'card:deleted', 'card:moved', 'card:linked', 'reaction:added', 'reaction:removed'
- [x] In useParticipantViewModel: subscribe to 'user:joined', 'user:alias_changed'
- [x] Update stores on event reception
- [x] Handle event cleanup on unmount

**Event Subscription Pattern:**
```typescript
// In useBoardViewModel
useEffect(() => {
  const socket = getSocket();

  const handleBoardRenamed = (payload: BoardRenamedPayload) => {
    if (payload.boardId === boardId) {
      updateBoardName(payload.name);
    }
  };

  const handleBoardClosed = (payload: BoardClosedPayload) => {
    if (payload.boardId === boardId) {
      setBoardState('closed');
    }
  };

  socket.on('board:renamed', handleBoardRenamed);
  socket.on('board:closed', handleBoardClosed);

  return () => {
    socket.off('board:renamed', handleBoardRenamed);
    socket.off('board:closed', handleBoardClosed);
  };
}, [boardId]);
```

**Reference**: Section 6.3, real-time architecture

---

#### 19.2 Write Integration Tests for Real-time Sync ✅

- [x] Test card:created event updates all clients
- [x] Test reaction:added event updates counts
- [x] Test user:joined event updates active users
- [x] Test board:closed event disables write operations

**Implementation:** 15 tests in `tests/integration/realtime-events.integration.test.ts`

**Test Pattern:**
```typescript
describe('Real-time sync', () => {
  it('updates cards when card:created event received', async () => {
    const { result } = renderHook(() => useCardViewModel(boardId));

    // Simulate socket event
    act(() => {
      mockSocket.emit('card:created', {
        boardId,
        card: { id: 'new-card', content: 'New card' }
      });
    });

    expect(result.current.cards).toContainEqual(
      expect.objectContaining({ id: 'new-card' })
    );
  });
});
```

**Reference**: Test plan Section 8.1

---

### 20. Drag-and-Drop Integration

#### 20.1 Integrate @dnd-kit with RetroCard and RetroColumn ✅

- [x] Set up DndContext in RetroBoardPage
- [x] Configure sensors (PointerSensor with 8px activation distance)
- [x] Implement useDraggable in RetroCard
- [x] Implement useDroppable in RetroCard and RetroColumn
- [x] Handle onDragStart, onDragOver, onDragEnd events
- [x] Call useDragDropViewModel for validation
- [x] Add visual feedback (ring-2 ring-primary for valid, ring-destructive for invalid)

**DndContext Setup:**
```typescript
// RetroBoardPage.tsx
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

function RetroBoardPage() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    })
  );

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useDragDropViewModel();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={async (event) => {
        await handleDrop();
        handleDragEnd();
      }}
    >
      {/* Columns and Cards */}
    </DndContext>
  );
}
```

**RetroCard with Draggable:**
```typescript
import { useDraggable, useDroppable } from '@dnd-kit/core';

function RetroCard({ card, ...props }: RetroCardProps) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({
      id: card.id,
      data: { type: card.type, cardId: card.id },
      disabled: !!card.parent_card_id, // Can't drag linked cards
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${card.id}`,
    data: { type: 'card', cardId: card.id, cardType: card.type },
  });

  return (
    <div
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
    >
      {/* Card content */}
    </div>
  );
}
```

**Reference**: Section 5.4, drag-drop architecture

---

#### 20.2 Write Integration Tests for Drag-and-Drop ✅

- [x] Test drag feedback card onto feedback card creates parent-child
- [x] Test drag action card onto feedback card creates link
- [x] Test drag card to column moves card
- [x] Test circular relationship prevention
- [x] Test self-drop rejection
- [x] Test already-parented card rejection
- [x] Test 1-level hierarchy enforcement

**Implementation:** 21 tests in `tests/integration/drag-drop.integration.test.ts`

**Test Pattern:**
```typescript
describe('Drag and drop', () => {
  it('creates parent-child when dragging feedback onto feedback', async () => {
    render(<RetroBoardPage />);

    const sourceCard = screen.getByTestId('card-child');
    const targetCard = screen.getByTestId('card-parent');

    // Use @dnd-kit testing utilities
    fireEvent.dragStart(sourceCard);
    fireEvent.dragOver(targetCard);
    fireEvent.drop(targetCard);

    await waitFor(() => {
      expect(mockLinkParentChild).toHaveBeenCalledWith('parent-id', 'child-id');
    });
  });
});
```

**Reference**: Test plan Section 9.1

---

## 📁 Files to Modify/Create

```
src/features/
├── board/
│   ├── viewmodels/
│   │   └── useBoardViewModel.ts    (add socket subscriptions)
│   └── components/
│       └── RetroBoardPage.tsx      (add DndContext)
├── card/
│   ├── viewmodels/
│   │   └── useCardViewModel.ts     (add socket subscriptions)
│   └── components/
│       ├── RetroCard.tsx           (add useDraggable/useDroppable)
│       └── RetroColumn.tsx         (add useDroppable)
└── participant/
    └── viewmodels/
        └── useParticipantViewModel.ts (add socket subscriptions)

tests/integration/
├── realtime-sync.test.ts
└── drag-drop.test.ts
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus | Status |
|------------|-------|-------|--------|
| Real-time sync (integration) | 15 | Socket events → store updates | ✅ |
| Drag-and-drop (integration) | 21 | Drag interactions → validation | ✅ |
| **Total** | **36** | | **✅ Complete** |

---

## ✅ Acceptance Criteria

- [x] Socket events from server update UI in real-time
- [x] Multiple clients see changes simultaneously (WebSocket integration)
- [x] Drag-and-drop respects validation rules
- [x] Circular relationships are prevented
- [x] Drop targets highlight appropriately (ring-primary/ring-destructive)
- [x] All integration tests pass (36/36)

---

## 🧪 Related Test Plans

- [TEST_PHASE_06_IntegrationRealtime.md](../code-review/TEST_PHASE_06_IntegrationRealtime.md) - Socket event testing, drag-drop testing
- [CR_PHASE_06_IntegrationRealtime.md](../code-review/CR_PHASE_06_IntegrationRealtime.md) - Code review documentation

---

## 📝 Notes

- Used Zustand store mocks for socket event testing
- PointerSensor configured with 8px activation distance
- Drag feedback uses Tailwind ring classes for visual clarity
- @dnd-kit mocks added to tests/setup.ts

---

## 🎉 Phase Completion Summary

**Completed:** 2025-12-31

### Implementation Highlights

1. **DndContext Integration** - RetroBoardPage wraps all columns in DndContext with PointerSensor
2. **Dual DnD Hooks** - RetroCard uses both useDraggable and useDroppable on same element
3. **Visual Feedback** - Ring highlights show valid (primary) vs invalid (destructive) drop targets
4. **WebSocket Lifecycle** - Connection managed in RetroBoardPage, disconnects on unmount

### Tests Added

- 15 real-time event integration tests (store operations)
- 21 drag-drop integration tests (validation, results, edge cases)
- Total: 661 tests passing, 90.26% statement coverage

### Blocking Issues Resolved

1. WebSocket reconnecting on alias change → Fixed dependency array
2. Droppable ID mismatch → Strip `drop-` prefix in handleDragOver

### Code Review

- [CR_PHASE_06_IntegrationRealtime.md](../code-review/CR_PHASE_06_IntegrationRealtime.md)
- [TEST_PHASE_06_IntegrationRealtime.md](../code-review/TEST_PHASE_06_IntegrationRealtime.md)

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 5](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md) | [Next: Phase 7 →](./FRONTEND_PHASE_07_E2E_TESTING.md)
