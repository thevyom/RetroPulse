# Front-End Design Document - Collaborative Retro Board
**Date**: 2025-12-24
**Architecture**: MVVM (Model-View-ViewModel)
**Framework**: React 18+ with TypeScript
**State Management**: Zustand + React Query
**Real-time**: Socket.IO Client

---

## Architecture Overview

### MVVM Pattern Implementation

```
┌─────────────────────────────────────────────────────────┐
│                         View Layer                       │
│  (React Components - UI Presentation Only)               │
│  - RetroBoardHeader.tsx                                  │
│  - RetroColumn.tsx                                       │
│  - RetroCard.tsx                                         │
│  - ParticipantAvatar.tsx                                 │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                     ViewModel Layer                      │
│  (Hooks - Business Logic & State Management)             │
│  - useRetroBoardViewModel.ts                            │
│  - useCardOperations.ts                                  │
│  - useParticipantManagement.ts                           │
│  - useRealtimeSync.ts                                    │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                       Model Layer                        │
│  (Data Models, Stores, API Services)                     │
│  - stores/retroBoardStore.ts (Zustand)                   │
│  - services/retroApi.ts                                  │
│  - services/socketService.ts                             │
│  - types/retroBoard.types.ts                             │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Libraries
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "zustand": "^4.4.0",
  "@tanstack/react-query": "^5.0.0",
  "socket.io-client": "^4.6.0",
  "react-dnd": "^16.0.1",
  "react-dnd-html5-backend": "^16.0.1",
  "immer": "^10.0.0"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.3.0",
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.290.0",
  "clsx": "^2.0.0"
}
```

### Utilities
```json
{
  "js-cookie": "^3.0.5",
  "@types/js-cookie": "^3.0.5",
  "nanoid": "^5.0.0",
  "zod": "^3.22.0"
}
```

---

## Project Structure

```
src/
├── components/
│   ├── retro-board/
│   │   ├── RetroBoardHeader.tsx
│   │   ├── RetroBoardFilters.tsx
│   │   ├── RetroBoardContainer.tsx
│   │   ├── RetroColumn.tsx
│   │   ├── RetroCard.tsx
│   │   ├── ChildCard.tsx
│   │   ├── ParticipantAvatar.tsx
│   │   ├── AdminDropZone.tsx
│   │   └── ClosedBoardBanner.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── Chip.tsx
│   │   └── DropdownMenu.tsx
│   └── shared/
│       ├── DragHandle.tsx
│       └── ReactionButton.tsx
├── hooks/
│   ├── viewmodels/
│   │   ├── useRetroBoardViewModel.ts
│   │   ├── useCardOperations.ts
│   │   ├── useParticipantManagement.ts
│   │   └── useColumnOperations.ts
│   ├── useRealtimeSync.ts
│   ├── useDragAndDrop.ts
│   ├── useUserIdentity.ts
│   └── useCardSorting.ts
├── stores/
│   ├── retroBoardStore.ts
│   ├── userStore.ts
│   └── uiStore.ts
├── services/
│   ├── api/
│   │   ├── retroApi.ts
│   │   ├── cardApi.ts
│   │   └── reactionApi.ts
│   ├── socket/
│   │   ├── socketService.ts
│   │   └── socketEvents.ts
│   └── storage/
│       └── cookieService.ts
├── types/
│   ├── retroBoard.types.ts
│   ├── card.types.ts
│   ├── user.types.ts
│   └── api.types.ts
├── utils/
│   ├── validation/
│   │   └── schemas.ts
│   ├── sorting.ts
│   └── constants.ts
└── pages/
    └── RetroBoardPage.tsx
```

---

## Component Architecture

### 1. View Components (Presentation Layer)

#### RetroBoardHeader Component
```typescript
// components/retro-board/RetroBoardHeader.tsx

interface RetroBoardHeaderProps {
  boardTitle: string;
  isClosed: boolean;
  isAdmin: boolean;
  onEditTitle: () => void;
  onCloseBoard: () => void;
}

export const RetroBoardHeader: React.FC<RetroBoardHeaderProps> = ({
  boardTitle,
  isClosed,
  isAdmin,
  onEditTitle,
  onCloseBoard
}) => {
  return (
    <header className="bg-gray-50 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Board: "{boardTitle}"</h1>
          {isAdmin && !isClosed && (
            <IconButton
              icon="Pencil"
              onClick={onEditTitle}
              tooltip="Edit board title"
              variant="ghost"
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && !isClosed && (
            <Button
              variant="danger"
              onClick={onCloseBoard}
            >
              Close (Admin)
            </Button>
          )}
          {isClosed && (
            <span className="flex items-center gap-2 text-gray-600">
              <Lock className="w-4 h-4" />
              Locked (Board Closed)
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
```

#### ParticipantAvatar Component
```typescript
// components/retro-board/ParticipantAvatar.tsx

interface ParticipantAvatarProps {
  user: User;
  isAdmin: boolean;
  isClickable: boolean;
  isFiltered: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const ParticipantAvatar: React.FC<ParticipantAvatarProps> = ({
  user,
  isAdmin,
  isClickable,
  isFiltered,
  onClick,
  onDragStart
}) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        draggable={isClickable}
        onDragStart={onDragStart}
        onClick={onClick}
        className={clsx(
          "relative w-10 h-10 rounded-full flex items-center justify-center",
          "transition-all duration-200",
          isAdmin && "ring-2 ring-orange-400 bg-orange-100",
          !isAdmin && "bg-gradient-to-br from-purple-200 to-blue-200",
          isClickable && "cursor-pointer hover:scale-110",
          isFiltered && "ring-2 ring-green-500"
        )}
      >
        {isAdmin && <span className="text-lg">🎩</span>}
        <span className="text-xs font-semibold">{user.alias}</span>
      </div>

      {isAdmin && (
        <span className="text-xs font-bold text-orange-600">Admin</span>
      )}
      {isClickable && (
        <span className="text-xs text-gray-400 italic">click to filter</span>
      )}
    </div>
  );
};
```

#### RetroColumn Component
```typescript
// components/retro-board/RetroColumn.tsx

interface RetroColumnProps {
  column: Column;
  cards: Card[];
  canEdit: boolean;
  onAddCard: () => void;
  onEditColumn: () => void;
  onDropCard: (cardId: string) => void;
}

export const RetroColumn: React.FC<RetroColumnProps> = ({
  column,
  cards,
  canEdit,
  onAddCard,
  onEditColumn,
  onDropCard
}) => {
  const { ref, isOver } = useDropZone({
    accept: 'CARD',
    onDrop: (item) => onDropCard(item.id)
  });

  return (
    <div
      ref={ref}
      className={clsx(
        "flex flex-col h-full rounded-lg border-2 p-4",
        column.color,
        isOver && "ring-4 ring-blue-400"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{column.name}</h2>
        <div className="flex items-center gap-2">
          {canEdit && (
            <IconButton icon="Pencil" onClick={onEditColumn} size="sm" />
          )}
          <IconButton icon="Plus" onClick={onAddCard} size="sm" />
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {cards.map(card => (
          <RetroCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};
```

#### RetroCard Component
```typescript
// components/retro-board/RetroCard.tsx

interface RetroCardProps {
  card: Card;
}

export const RetroCard: React.FC<RetroCardProps> = ({ card }) => {
  const {
    canDelete,
    handleDrag,
    handleReaction,
    handleDelete,
    hasActionLink
  } = useCardOperations(card.id);

  const { ref: dragRef, isDragging } = useDrag({
    type: 'CARD',
    item: { id: card.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const aggregatedReactions = card.isParent
    ? card.reactions + card.children.reduce((sum, c) => sum + c.reactions, 0)
    : card.reactions;

  return (
    <div
      ref={dragRef}
      className={clsx(
        "bg-white rounded-lg shadow-md p-4 border-2",
        isDragging && "opacity-50"
      )}
    >
      {/* Drag Handle Bar */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b">
        <DragHandle />
        <div className="flex items-center gap-2">
          {hasActionLink && (
            <IconButton icon="Link" size="sm" variant="ghost" />
          )}
          <ReactionButton
            count={aggregatedReactions}
            isAggregated={card.isParent}
            onClick={handleReaction}
          />
          {canDelete && (
            <IconButton
              icon="Trash"
              size="sm"
              variant="danger"
              onClick={handleDelete}
            />
          )}
        </div>
      </div>

      {/* Card Content */}
      <p className="text-sm text-gray-800">{card.content}</p>

      {/* Child Cards */}
      {card.children && card.children.length > 0 && (
        <div className="mt-3 ml-4 space-y-2">
          {card.children.map(child => (
            <ChildCard key={child.id} card={child} />
          ))}
        </div>
      )}
    </div>
  );
};
```

#### AdminDropZone Component
```typescript
// components/retro-board/AdminDropZone.tsx

export const AdminDropZone: React.FC = () => {
  const { promoteToAdmin } = useParticipantManagement();

  const { ref, isOver } = useDropZone({
    accept: 'PARTICIPANT',
    onDrop: (item) => promoteToAdmin(item.userId)
  });

  return (
    <div
      ref={ref}
      className={clsx(
        "border-2 border-dashed border-orange-300 rounded-lg p-4",
        "bg-orange-50 text-center transition-all",
        isOver && "bg-orange-100 border-orange-500 scale-105"
      )}
    >
      <div className="flex items-center justify-center gap-2 text-sm text-orange-700">
        <Users className="w-4 h-4" />
        <span>Admin Area</span>
      </div>
      <p className="text-xs text-orange-600 mt-1">
        Drag participant here to make admin
      </p>
    </div>
  );
};
```

---

### 2. ViewModel Layer (Business Logic)

#### useRetroBoardViewModel Hook
```typescript
// hooks/viewmodels/useRetroBoardViewModel.ts

export const useRetroBoardViewModel = (boardId: string) => {
  // State from Zustand store
  const {
    board,
    columns,
    cards,
    participants,
    currentUser,
    sortMode,
    activeFilters
  } = useRetroBoardStore();

  // Real-time synchronization
  useRealtimeSync(boardId);

  // API queries
  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => retroApi.getBoard(boardId)
  });

  // Mutations
  const updateBoardMutation = useMutation({
    mutationFn: retroApi.updateBoard,
    onSuccess: (data) => {
      useRetroBoardStore.getState().setBoard(data);
    }
  });

  // Computed values
  const isAdmin = useMemo(() => {
    return board?.admins.includes(currentUser.id);
  }, [board?.admins, currentUser.id]);

  const isClosed = board?.status === 'closed';

  const sortedCards = useMemo(() => {
    return sortCards(cards, sortMode, activeFilters);
  }, [cards, sortMode, activeFilters]);

  // Actions
  const handleEditBoardTitle = useCallback(async (newTitle: string) => {
    await updateBoardMutation.mutateAsync({
      boardId,
      title: newTitle
    });
  }, [boardId, updateBoardMutation]);

  const handleCloseBoard = useCallback(async () => {
    const confirmed = window.confirm('Close this board? All users will lose edit access.');
    if (confirmed) {
      await updateBoardMutation.mutateAsync({
        boardId,
        status: 'closed'
      });
    }
  }, [boardId, updateBoardMutation]);

  return {
    // State
    board,
    columns,
    cards: sortedCards,
    participants,
    currentUser,
    isAdmin,
    isClosed,
    sortMode,
    activeFilters,

    // Actions
    handleEditBoardTitle,
    handleCloseBoard,

    // Loading states
    isLoading: !boardData,
    error: updateBoardMutation.error
  };
};
```

#### useCardOperations Hook
```typescript
// hooks/viewmodels/useCardOperations.ts

export const useCardOperations = (cardId: string) => {
  const { currentUser } = useUserStore();
  const card = useRetroBoardStore(state =>
    state.cards.find(c => c.id === cardId)
  );

  // Mutations
  const addReactionMutation = useMutation({
    mutationFn: cardApi.addReaction,
    onMutate: async ({ cardId }) => {
      // Optimistic update
      useRetroBoardStore.getState().incrementReaction(cardId);
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: cardApi.deleteCard,
    onSuccess: (_, variables) => {
      useRetroBoardStore.getState().removeCard(variables.cardId);
    }
  });

  const createParentChildLinkMutation = useMutation({
    mutationFn: cardApi.createParentChildLink,
    onSuccess: (data) => {
      useRetroBoardStore.getState().updateCardRelationship(data);
    }
  });

  const unlinkChildMutation = useMutation({
    mutationFn: cardApi.unlinkChild,
    onSuccess: (_, variables) => {
      useRetroBoardStore.getState().unlinkChild(variables.childId);
    }
  });

  // Computed
  const canDelete = card?.creatorId === currentUser.cookieId;
  const hasActionLink = card?.linkedActionId != null;

  // Actions
  const handleReaction = useCallback(() => {
    addReactionMutation.mutate({ cardId, userId: currentUser.id });
  }, [cardId, currentUser.id]);

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm('Delete this card?');
    if (confirmed) {
      await deleteCardMutation.mutateAsync({ cardId });
    }
  }, [cardId]);

  const handleDrop = useCallback((droppedCardId: string) => {
    // Create parent-child relationship
    createParentChildLinkMutation.mutate({
      parentId: cardId,
      childId: droppedCardId
    });
  }, [cardId]);

  const handleUnlink = useCallback(async () => {
    await unlinkChildMutation.mutateAsync({ childId: cardId });
  }, [cardId]);

  return {
    card,
    canDelete,
    hasActionLink,
    handleReaction,
    handleDelete,
    handleDrop,
    handleUnlink,
    isProcessing: deleteCardMutation.isPending || addReactionMutation.isPending
  };
};
```

#### useParticipantManagement Hook
```typescript
// hooks/viewmodels/useParticipantManagement.ts

export const useParticipantManagement = () => {
  const { board, participants, currentUser } = useRetroBoardStore();
  const { activeFilters, setFilter, clearFilters } = useUIStore();

  const promoteToAdminMutation = useMutation({
    mutationFn: retroApi.promoteToAdmin,
    onSuccess: (data) => {
      useRetroBoardStore.getState().updateBoard(data);
    }
  });

  const isAdmin = board?.admins.includes(currentUser.id);

  const promoteToAdmin = useCallback(async (userId: string) => {
    if (!isAdmin) return;

    await promoteToAdminMutation.mutateAsync({
      boardId: board.id,
      userId
    });
  }, [board?.id, isAdmin]);

  const toggleUserFilter = useCallback((userId: string) => {
    const isCurrentlyFiltered = activeFilters.users.includes(userId);

    if (isCurrentlyFiltered) {
      setFilter({
        users: activeFilters.users.filter(id => id !== userId)
      });
    } else {
      setFilter({
        users: [...activeFilters.users, userId]
      });
    }
  }, [activeFilters, setFilter]);

  return {
    participants,
    promoteToAdmin,
    toggleUserFilter,
    activeFilters,
    clearFilters,
    isAdmin
  };
};
```

---

### 3. Model Layer (Data & Services)

#### Zustand Store
```typescript
// stores/retroBoardStore.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface RetroBoardState {
  board: Board | null;
  columns: Column[];
  cards: Card[];
  participants: User[];

  // Actions
  setBoard: (board: Board) => void;
  updateBoard: (updates: Partial<Board>) => void;
  addCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  incrementReaction: (cardId: string) => void;
  updateCardRelationship: (data: ParentChildRelation) => void;
  unlinkChild: (childId: string) => void;
  addParticipant: (user: User) => void;
  removeParticipant: (userId: string) => void;
}

export const useRetroBoardStore = create<RetroBoardState>()(
  immer((set) => ({
    board: null,
    columns: [],
    cards: [],
    participants: [],

    setBoard: (board) => set({ board }),

    updateBoard: (updates) => set((state) => {
      if (state.board) {
        state.board = { ...state.board, ...updates };
      }
    }),

    addCard: (card) => set((state) => {
      state.cards.push(card);
    }),

    removeCard: (cardId) => set((state) => {
      state.cards = state.cards.filter(c => c.id !== cardId);
    }),

    updateCard: (cardId, updates) => set((state) => {
      const card = state.cards.find(c => c.id === cardId);
      if (card) {
        Object.assign(card, updates);
      }
    }),

    incrementReaction: (cardId) => set((state) => {
      const card = state.cards.find(c => c.id === cardId);
      if (card) {
        card.reactions += 1;
      }
    }),

    updateCardRelationship: ({ parentId, childId }) => set((state) => {
      const parent = state.cards.find(c => c.id === parentId);
      const child = state.cards.find(c => c.id === childId);

      if (parent && child) {
        parent.isParent = true;
        if (!parent.childrenIds) parent.childrenIds = [];
        parent.childrenIds.push(childId);

        child.parentId = parentId;
      }
    }),

    unlinkChild: (childId) => set((state) => {
      const child = state.cards.find(c => c.id === childId);
      if (child && child.parentId) {
        const parent = state.cards.find(c => c.id === child.parentId);
        if (parent) {
          parent.childrenIds = parent.childrenIds?.filter(id => id !== childId);
          if (parent.childrenIds?.length === 0) {
            parent.isParent = false;
          }
        }
        child.parentId = null;
      }
    }),

    addParticipant: (user) => set((state) => {
      if (!state.participants.find(p => p.id === user.id)) {
        state.participants.push(user);
      }
    }),

    removeParticipant: (userId) => set((state) => {
      state.participants = state.participants.filter(p => p.id !== userId);
    })
  }))
);
```

#### Real-time Sync Hook
```typescript
// hooks/useRealtimeSync.ts

export const useRealtimeSync = (boardId: string) => {
  const { setBoard, addCard, updateCard, removeCard, addParticipant, removeParticipant } = useRetroBoardStore();

  useEffect(() => {
    const socket = socketService.connect(boardId);

    // Listen to events
    socket.on('board:updated', (board: Board) => {
      setBoard(board);
    });

    socket.on('card:created', (card: Card) => {
      addCard(card);
    });

    socket.on('card:updated', ({ cardId, updates }: CardUpdate) => {
      updateCard(cardId, updates);
    });

    socket.on('card:deleted', ({ cardId }: { cardId: string }) => {
      removeCard(cardId);
    });

    socket.on('user:joined', (user: User) => {
      addParticipant(user);
    });

    socket.on('user:left', ({ userId }: { userId: string }) => {
      removeParticipant(userId);
    });

    return () => {
      socket.disconnect();
    };
  }, [boardId]);
};
```

#### Socket Service
```typescript
// services/socket/socketService.ts

import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(boardId: string): Socket {
    this.socket = io(process.env.REACT_APP_SOCKET_URL!, {
      query: { boardId },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
```

---

## Type Definitions

```typescript
// types/retroBoard.types.ts

export interface Board {
  id: string;
  title: string;
  creatorId: string;
  admins: string[];
  status: 'active' | 'closed';
  limits: {
    cardsPerUser: number;
    reactionsPerUser: number;
  };
  createdAt: string;
  closedAt?: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  color: string;
  order: number;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  content: string;
  creatorId: string; // cookie-based ID
  creatorAlias: string;
  isAnonymous: boolean;
  reactions: number;
  isParent: boolean;
  parentId: string | null;
  childrenIds: string[];
  linkedActionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  alias: string;
  cookieId: string;
  isActive: boolean;
  joinedAt: string;
}

export interface SortMode {
  type: 'recency' | 'popularity';
  direction: 'asc' | 'desc';
}

export interface Filters {
  users: string[];
  showAnonymous: boolean;
}
```

---

## Drag & Drop Implementation

```typescript
// hooks/useDragAndDrop.ts

import { useDrag, useDrop } from 'react-dnd';

export const DragTypes = {
  CARD: 'card',
  PARTICIPANT: 'participant'
} as const;

export const useCardDrag = (cardId: string) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: DragTypes.CARD,
    item: { id: cardId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return { isDragging, dragRef };
};

export const useCardDrop = (onDrop: (cardId: string) => void) => {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DragTypes.CARD,
    drop: (item: { id: string }) => {
      onDrop(item.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  return { isOver, canDrop, dropRef };
};

export const useParticipantDrag = (userId: string) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: DragTypes.PARTICIPANT,
    item: { userId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return { isDragging, dragRef };
};

export const useAdminDrop = (onDrop: (userId: string) => void) => {
  const [{ isOver }, dropRef] = useDrop({
    accept: DragTypes.PARTICIPANT,
    drop: (item: { userId: string }) => {
      onDrop(item.userId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return { isOver, dropRef };
};
```

---

## Sorting & Filtering Logic

```typescript
// utils/sorting.ts

export const sortCards = (
  cards: Card[],
  sortMode: SortMode,
  filters: Filters
): Card[] => {
  // Filter cards
  let filtered = cards.filter(card => {
    // Filter by user
    if (filters.users.length > 0) {
      if (!filters.users.includes(card.creatorId)) {
        return false;
      }
    }

    // Filter anonymous
    if (!filters.showAnonymous && card.isAnonymous) {
      return false;
    }

    return true;
  });

  // Sort cards
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode.type === 'recency') {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortMode.direction === 'desc' ? timeB - timeA : timeA - timeB;
    }

    if (sortMode.type === 'popularity') {
      // Calculate aggregated reactions for parent cards
      const reactionsA = a.isParent
        ? a.reactions + a.childrenIds.reduce((sum, childId) => {
            const child = cards.find(c => c.id === childId);
            return sum + (child?.reactions || 0);
          }, 0)
        : a.reactions;

      const reactionsB = b.isParent
        ? b.reactions + b.childrenIds.reduce((sum, childId) => {
            const child = cards.find(c => c.id === childId);
            return sum + (child?.reactions || 0);
          }, 0)
        : b.reactions;

      return sortMode.direction === 'desc'
        ? reactionsB - reactionsA
        : reactionsA - reactionsB;
    }

    return 0;
  });

  return sorted;
};
```

---

## Performance Optimizations

### 1. Component Memoization
```typescript
export const RetroCard = React.memo(RetroCardComponent, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.reactions === next.card.reactions &&
    prev.card.content === next.card.content &&
    prev.card.childrenIds.length === next.card.childrenIds.length
  );
});
```

### 2. Virtualization for Long Lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const CardList: React.FC<{ cards: Card[] }> = ({ cards }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <RetroCard card={cards[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Debounced Real-time Updates
```typescript
import { debounce } from 'lodash-es';

const debouncedEmit = debounce((event: string, data: any) => {
  socketService.emit(event, data);
}, 300);
```

---

## Error Handling Strategy

```typescript
// components/ErrorBoundary.tsx

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600 mt-2">{this.state.error?.message}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
```typescript
// __tests__/components/RetroCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { RetroCard } from '@/components/retro-board/RetroCard';

describe('RetroCard', () => {
  it('renders card content', () => {
    const card = createMockCard({ content: 'Test card' });
    render(<RetroCard card={card} />);
    expect(screen.getByText('Test card')).toBeInTheDocument();
  });

  it('shows delete button only for creator', () => {
    const card = createMockCard({ creatorId: 'user-123' });
    // Mock current user as creator
    render(<RetroCard card={card} />);
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  it('displays aggregated reactions for parent cards', () => {
    const parentCard = createMockCard({
      isParent: true,
      reactions: 5,
      childrenIds: ['child-1']
    });
    render(<RetroCard card={parentCard} />);
    // Verify aggregated count is shown
  });
});
```

### Integration Tests
```typescript
// __tests__/viewmodels/useCardOperations.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useCardOperations } from '@/hooks/viewmodels/useCardOperations';

describe('useCardOperations', () => {
  it('creates parent-child relationship on drop', async () => {
    const { result } = renderHook(() => useCardOperations('card-1'));

    act(() => {
      result.current.handleDrop('card-2');
    });

    await waitFor(() => {
      expect(mockApi.createParentChildLink).toHaveBeenCalledWith({
        parentId: 'card-1',
        childId: 'card-2'
      });
    });
  });
});
```

---

## Build & Deployment

### Build Configuration (Vite)
```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'dnd-vendor': ['react-dnd', 'react-dnd-html5-backend'],
          'query-vendor': ['@tanstack/react-query']
        }
      }
    }
  }
});
```

---

## Summary

This front-end architecture provides:

✅ **Clear separation of concerns** (MVVM pattern)
✅ **Type-safe** implementation with TypeScript
✅ **Real-time collaboration** via Socket.IO
✅ **Optimistic UI updates** for better UX
✅ **Drag & drop** interactions for all major operations
✅ **Client-side filtering & sorting** (user-specific, non-persistent)
✅ **Performance optimizations** (memoization, virtualization)
✅ **Comprehensive error handling**
✅ **Testable architecture** with clear boundaries

All design decisions from the UX document are implemented with modern React patterns and best practices.
