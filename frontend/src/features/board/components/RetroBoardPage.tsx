/**
 * RetroBoardPage Component
 * Main container for the retrospective board view.
 * Orchestrates all sub-components and provides data via ViewModels.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useBoardViewModel } from '../viewmodels/useBoardViewModel';
import { useCardViewModel } from '../../card/viewmodels/useCardViewModel';
import { useParticipantViewModel } from '../../participant/viewmodels/useParticipantViewModel';
import { useDragDropViewModel } from '../../card/viewmodels/useDragDropViewModel';
import { LoadingIndicator } from '@/shared/components/LoadingIndicator';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { RetroBoardHeader } from './RetroBoardHeader';
import { ParticipantBar } from '../../participant/components/ParticipantBar';
import { SortBar } from './SortBar';
import { RetroColumn } from '../../card/components/RetroColumn';
import { socketService } from '@/models/socket/SocketService';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BoardContentProps {
  boardId: string;
}

// Column type enum for better type safety
type ColumnType = 'went_well' | 'to_improve' | 'action_item';

// Infer column type from name (moved outside component to avoid recreation)
function inferColumnType(columnName: string): ColumnType {
  const name = columnName.toLowerCase();
  if (name.includes('well') || name.includes('good') || name.includes('liked')) {
    return 'went_well';
  }
  if (name.includes('improve') || name.includes('better') || name.includes('change')) {
    return 'to_improve';
  }
  return 'action_item';
}

// ============================================================================
// Board Content Component (wrapped in ErrorBoundary)
// ============================================================================

function BoardContent({ boardId }: BoardContentProps) {
  // ViewModels
  const boardVM = useBoardViewModel(boardId);
  const cardVM = useCardViewModel(boardId);
  const participantVM = useParticipantViewModel(boardId);
  const dragDropVM = useDragDropViewModel();

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to prevent accidental drags
      },
    })
  );

  // Connect to WebSocket on mount (only boardId triggers reconnection)
  // Alias is passed but changes to alias should NOT cause reconnection
  useEffect(() => {
    socketService.connect(boardId);

    return () => {
      socketService.disconnect();
    };
  }, [boardId]);

  // DnD event handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const cardId = active.id as string;
      const cardType = active.data.current?.cardType ?? 'feedback';
      dragDropVM.handleDragStart(cardId, cardType);
    },
    [dragDropVM]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) return;

      const rawId = over.id as string;
      const targetType = over.data.current?.type ?? 'column';
      // Strip 'drop-' prefix from card drop targets to get the actual card ID
      const targetId = targetType === 'card' && rawId.startsWith('drop-') ? rawId.slice(5) : rawId;
      dragDropVM.handleDragOver(targetId, targetType);
    },
    [dragDropVM]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { over } = event;

      if (over && dragDropVM.isValidDrop) {
        const result = dragDropVM.getDropResult();

        if (result) {
          try {
            switch (result.action) {
              case 'link_parent_child':
                await cardVM.handleLinkParentChild(result.parentId, result.childId);
                break;
              case 'link_action':
                await cardVM.handleLinkActionToFeedback(result.actionId, result.feedbackId);
                break;
              case 'move_to_column':
                await cardVM.handleMoveCard(result.cardId, result.columnId);
                break;
            }
          } catch (error) {
            // Show user-visible error notification
            toast.error('Failed to move card', {
              description: error instanceof Error ? error.message : 'Please try again',
            });
          }
        }
      }

      dragDropVM.handleDragEnd();
    },
    [dragDropVM, cardVM]
  );

  // Memoize filtered cards per column to avoid recalculating on every render
  const filteredCardsByColumn = useMemo(() => {
    const result = new Map<string, typeof cardVM.cards>();

    boardVM.board?.columns.forEach((column) => {
      const columnCards = cardVM.cardsByColumn.get(column.id) ?? [];
      const filtered = columnCards.filter((card) => {
        // Apply user filters
        if (!participantVM.showAll && participantVM.selectedUsers.length > 0) {
          if (card.is_anonymous) return false;
          if (!participantVM.selectedUsers.includes(card.created_by_hash)) return false;
        }
        // Apply anonymous filter
        if (!participantVM.showAnonymous && card.is_anonymous) return false;
        return true;
      });
      result.set(column.id, filtered);
    });

    return result;
  }, [
    boardVM.board?.columns,
    cardVM.cardsByColumn,
    participantVM.showAll,
    participantVM.selectedUsers,
    participantVM.showAnonymous,
  ]);

  // Loading state
  if (boardVM.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingIndicator variant="skeleton" skeletonType="board" aria-label="Loading board" />
      </div>
    );
  }

  // Error state
  if (boardVM.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-destructive" role="alert">
          {boardVM.error}
        </div>
        <button
          onClick={() => boardVM.refetchBoard()}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No board found
  if (!boardVM.board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Board not found</div>
      </div>
    );
  }

  const { board, isAdmin, isClosed, handleRenameBoard, handleCloseBoard, handleRenameColumn } =
    boardVM;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <RetroBoardHeader
        boardName={board.name}
        isAdmin={isAdmin}
        isClosed={isClosed}
        currentUser={participantVM.currentUser}
        onEditTitle={handleRenameBoard}
        onCloseBoard={handleCloseBoard}
        onUpdateAlias={participantVM.handleUpdateAlias}
      />

      {/* Participant Bar and Sort Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <ParticipantBar
          activeUsers={participantVM.activeUsers}
          currentUserHash={participantVM.currentUser?.cookie_hash ?? ''}
          isCreator={participantVM.isCurrentUserCreator}
          admins={board.admins}
          showAll={participantVM.showAll}
          showAnonymous={participantVM.showAnonymous}
          selectedUsers={participantVM.selectedUsers}
          onToggleAllUsers={participantVM.handleToggleAllUsersFilter}
          onToggleAnonymous={participantVM.handleToggleAnonymousFilter}
          onToggleUser={participantVM.handleToggleUserFilter}
          onPromoteToAdmin={participantVM.handlePromoteToAdmin}
        />
        <SortBar
          sortMode={cardVM.sortMode}
          sortDirection={cardVM.sortDirection}
          onSortModeChange={cardVM.setSortMode}
          onToggleDirection={cardVM.toggleSortDirection}
        />
      </div>

      {/* Columns with DnD Context */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            // Use memoized filtered cards
            const filteredCards = filteredCardsByColumn.get(column.id) ?? [];

            return (
              <RetroColumn
                key={column.id}
                columnId={column.id}
                columnType={inferColumnType(column.name)}
                title={column.name}
                color={column.color}
                cards={filteredCards}
                isAdmin={isAdmin}
                isClosed={isClosed}
                canCreateCard={cardVM.canCreateCard}
                currentUserHash={participantVM.currentUser?.cookie_hash ?? ''}
                canReact={cardVM.canReact}
                hasUserReacted={cardVM.hasUserReacted}
                isDragging={dragDropVM.isDragging}
                draggedCardId={dragDropVM.draggedItem?.id ?? null}
                isValidDropTarget={(targetId, targetType) =>
                  dragDropVM.canDropOn(targetId, targetType)
                }
                onCreateCard={cardVM.handleCreateCard}
                onDeleteCard={cardVM.handleDeleteCard}
                onAddReaction={cardVM.handleAddReaction}
                onRemoveReaction={cardVM.handleRemoveReaction}
                onUnlinkChild={cardVM.handleUnlinkChild}
                onEditColumnTitle={
                  isAdmin ? (newName) => handleRenameColumn(column.id, newName) : undefined
                }
              />
            );
          })}
        </div>

        {/* Drag Overlay - shows dragged card preview */}
        <DragOverlay>
          {dragDropVM.draggedItem && (
            <div className="rounded-lg border border-primary bg-card p-3 opacity-80 shadow-lg">
              <p className="text-sm text-foreground">
                {cardVM.cards.find((c) => c.id === dragDropVM.draggedItem?.id)?.content ?? ''}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Closed board overlay */}
      {isClosed && (
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-10',
            'bg-background/50 backdrop-blur-[1px]'
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RetroBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  if (!boardId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">No board ID provided</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BoardContent boardId={boardId} />
    </ErrorBoundary>
  );
}

export default RetroBoardPage;
