# Phase 6: Integration & Real-time Features

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/4 complete
**Dependencies**: Phase 5 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Connect all layers together: Views consume ViewModels, ViewModels coordinate stores and APIs, real-time events flow through WebSocket to update stores, and drag-and-drop interactions are fully integrated. This phase validates the MVVM architecture works end-to-end.

---

## 📋 Task Breakdown

### 19. Real-time Event Handling

#### 19.1 Implement Real-time Event Subscriptions in ViewModels

- [ ] In useBoardViewModel: subscribe to 'board:renamed', 'board:closed'
- [ ] In useCardViewModel: subscribe to 'card:created', 'card:updated', 'card:deleted', 'card:moved', 'card:linked', 'reaction:added', 'reaction:removed'
- [ ] In useParticipantViewModel: subscribe to 'user:joined', 'user:alias_changed'
- [ ] Update stores on event reception
- [ ] Handle event cleanup on unmount

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

#### 19.2 Write Integration Tests for Real-time Sync

- [ ] Test card:created event updates all clients
- [ ] Test reaction:added event updates counts
- [ ] Test user:joined event updates active users
- [ ] Test board:closed event disables write operations

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

#### 20.1 Integrate @dnd-kit with RetroCard and RetroColumn

- [ ] Set up DndContext in RetroBoardPage
- [ ] Configure sensors (PointerSensor)
- [ ] Implement useDraggable in RetroCard
- [ ] Implement useDroppable in RetroCard and RetroColumn
- [ ] Handle onDragStart, onDragOver, onDragEnd events
- [ ] Call useDragDropViewModel for validation

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

#### 20.2 Write Integration Tests for Drag-and-Drop

- [ ] Test drag feedback card onto feedback card creates parent-child
- [ ] Test drag action card onto feedback card creates link
- [ ] Test drag card to column moves card
- [ ] Test circular relationship prevention

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

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Real-time sync (integration) | ~4 | Socket events → store updates |
| Drag-and-drop (integration) | ~4 | Drag interactions → API calls |
| **Total** | **~8** | |

---

## ✅ Acceptance Criteria

- [ ] Socket events from server update UI in real-time
- [ ] Multiple clients see changes simultaneously
- [ ] Drag-and-drop respects validation rules
- [ ] Circular relationships are prevented
- [ ] Drop targets highlight appropriately
- [ ] All integration tests pass

---

## 🧪 Related Test Plans

- [TEST_PHASE_06_REALTIME.md](../test-docs/TEST_PHASE_06_REALTIME.md) - Socket event testing, optimistic updates
- [TEST_PHASE_07_DRAGDROP.md](../test-docs/TEST_PHASE_07_DRAGDROP.md) - Drag-and-drop test patterns

---

## 📝 Notes

- Use `socket.io-mock` or similar for socket testing
- Consider debouncing rapid socket events
- Drag feedback should be visually clear (opacity, shadows)
- Test with real backend for final validation

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 5](./FRONTEND_PHASE_05_VIEW_COMPONENTS.md) | [Next: Phase 7 →](./FRONTEND_PHASE_07_E2E_TESTING.md)
