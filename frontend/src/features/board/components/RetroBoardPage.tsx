/**
 * RetroBoardPage Component
 * Main container for the retrospective board view.
 * Orchestrates all sub-components and provides data via ViewModels.
 */

import { useParams } from 'react-router-dom';
import { useBoardViewModel } from '../viewmodels/useBoardViewModel';
import { useCardViewModel } from '../../card/viewmodels/useCardViewModel';
import { useParticipantViewModel } from '../../participant/viewmodels/useParticipantViewModel';
import { LoadingIndicator } from '@/shared/components/LoadingIndicator';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { RetroBoardHeader } from './RetroBoardHeader';
import { ParticipantBar } from '../../participant/components/ParticipantBar';
import { SortBar } from './SortBar';
import { RetroColumn } from '../../card/components/RetroColumn';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BoardContentProps {
  boardId: string;
}

// ============================================================================
// Board Content Component (wrapped in ErrorBoundary)
// ============================================================================

function BoardContent({ boardId }: BoardContentProps) {
  // ViewModels
  const boardVM = useBoardViewModel(boardId);
  const cardVM = useCardViewModel(boardId);
  const participantVM = useParticipantViewModel(boardId);

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

      {/* Columns */}
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {board.columns.map((column) => {
          const columnCards = cardVM.cardsByColumn.get(column.id) ?? [];
          // Apply sorting and filtering to column cards
          const filteredCards = columnCards.filter((card) => {
            // Apply user filters
            if (!participantVM.showAll && participantVM.selectedUsers.length > 0) {
              if (card.is_anonymous) return false;
              if (!participantVM.selectedUsers.includes(card.created_by_hash)) return false;
            }
            // Apply anonymous filter
            if (!participantVM.showAnonymous && card.is_anonymous) return false;
            return true;
          });

          return (
            <RetroColumn
              key={column.id}
              columnId={column.id}
              columnType={
                column.name.toLowerCase().includes('well')
                  ? 'went_well'
                  : column.name.toLowerCase().includes('improve')
                    ? 'to_improve'
                    : 'action_item'
              }
              title={column.name}
              color={column.color}
              cards={filteredCards}
              isAdmin={isAdmin}
              isClosed={isClosed}
              canCreateCard={cardVM.canCreateCard}
              currentUserHash={participantVM.currentUser?.cookie_hash ?? ''}
              canReact={cardVM.canReact}
              hasUserReacted={cardVM.hasUserReacted}
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
