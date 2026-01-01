/**
 * RetroColumn Component
 * A column container for retro cards with add card functionality.
 * Supports drag-and-drop via @dnd-kit.
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RetroCard } from './RetroCard';
import type { Card, CreateCardDTO } from '@/models/types';
import { validateCardContent, validateColumnName } from '@/shared/validation';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ColumnType = 'went_well' | 'to_improve' | 'action_item';

// Column background colors (pastel shades per spec)
const columnBgColors: Record<ColumnType, string> = {
  went_well: 'bg-green-50',    // #ecf9ec - light green
  to_improve: 'bg-orange-50',  // #FFF7E8 - light orange
  action_item: 'bg-blue-50',   // #dae8fc - light blue
};

export interface RetroColumnProps {
  columnId: string;
  columnType: ColumnType;
  title: string;
  color: string;
  cards: Card[];
  isAdmin: boolean;
  isClosed: boolean;
  canCreateCard: boolean;
  currentUserHash: string;
  canReact: boolean;
  hasUserReacted: (cardId: string) => boolean;
  // DnD props
  isDragging?: boolean;
  draggedCardId?: string | null;
  isValidDropTarget?: (targetId: string, targetType: 'card' | 'column') => boolean;
  onCreateCard: (data: CreateCardDTO) => Promise<Card>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onAddReaction: (cardId: string) => Promise<void>;
  onRemoveReaction: (cardId: string) => Promise<void>;
  onUnlinkChild: (childId: string) => Promise<void>;
  onEditColumnTitle?: (newName: string) => Promise<void>;
  // Child card reaction handlers (UTB-007)
  onReactToChild?: (childId: string) => Promise<void>;
  onUnreactFromChild?: (childId: string) => Promise<void>;
  hasUserReactedToChild?: (childId: string) => boolean;
}

// ============================================================================
// Component
// ============================================================================

export const RetroColumn = memo(function RetroColumn({
  columnId,
  columnType,
  title,
  color,
  cards,
  isAdmin,
  isClosed,
  canCreateCard,
  currentUserHash,
  canReact,
  hasUserReacted,
  isDragging = false,
  draggedCardId = null,
  isValidDropTarget,
  onCreateCard,
  onDeleteCard,
  onAddReaction,
  onRemoveReaction,
  onUnlinkChild,
  onEditColumnTitle,
  onReactToChild,
  onUnreactFromChild,
  hasUserReactedToChild,
}: RetroColumnProps) {
  // Add card dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCardContent, setNewCardContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit column dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editError, setEditError] = useState<string | null>(null);

  const cardType = columnType === 'action_item' ? 'action' : 'feedback';

  // Droppable hook for column as drop target
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: 'column', columnId },
    disabled: isClosed,
  });

  // Check if this column is a valid drop target
  const isValidTarget = isDragging && isValidDropTarget?.(columnId, 'column');

  const handleOpenAddDialog = () => {
    setNewCardContent('');
    setIsAnonymous(false);
    setAddError(null);
    setIsAddDialogOpen(true);
  };

  const handleAddCard = async () => {
    // Validate
    const validation = validateCardContent(newCardContent);
    if (!validation.isValid) {
      setAddError(validation.error || 'Invalid card content');
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      await onCreateCard({
        column_id: columnId,
        content: newCardContent,
        card_type: cardType,
        is_anonymous: isAnonymous,
      });
      setIsAddDialogOpen(false);
      setNewCardContent('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = () => {
    setEditedTitle(title);
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditColumn = async () => {
    if (!onEditColumnTitle) return;

    const validation = validateColumnName(editedTitle);
    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid column name');
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      await onEditColumnTitle(editedTitle);
      setIsEditDialogOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to rename column');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAdd = canCreateCard && !isClosed;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-w-[320px] flex-1 flex-col rounded-lg border',
        columnBgColors[columnType],
        'transition-all duration-200',
        isOver && isValidTarget && 'ring-2 ring-primary ring-offset-2',
        isOver && !isValidTarget && 'ring-2 ring-destructive ring-offset-2'
      )}
      style={{ borderTopColor: color, borderTopWidth: '3px' }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-1">
          {/* Edit Column Button (admin only) */}
          {isAdmin && !isClosed && onEditColumnTitle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleOpenEditDialog}
              aria-label="Edit column name"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          {/* Add Card Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleOpenAddDialog}
                    disabled={!canAdd}
                    aria-label="Add card"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!canAdd && (
                <TooltipContent>
                  {isClosed ? 'Board is closed' : 'Card limit reached'}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {cards.map((card) => (
          <RetroCard
            key={card.id}
            card={card}
            columnType={columnType}
            isOwner={card.created_by_hash === currentUserHash}
            isClosed={isClosed}
            canReact={canReact}
            hasReacted={hasUserReacted(card.id)}
            isDragging={isDragging && draggedCardId !== card.id}
            isValidDropTarget={isValidDropTarget}
            onReact={() => onAddReaction(card.id)}
            onUnreact={() => onRemoveReaction(card.id)}
            onDelete={() => onDeleteCard(card.id)}
            onUnlinkFromParent={() => onUnlinkChild(card.id)}
            onReactToChild={onReactToChild}
            onUnreactFromChild={onUnreactFromChild}
            hasUserReactedToChild={hasUserReactedToChild}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
            No cards yet
          </div>
        )}
      </div>

      {/* Add Card Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Card to {title}</DialogTitle>
            <DialogDescription>
              Share your thoughts.{' '}
              {cardType === 'action' ? 'Define an action item.' : 'Give feedback.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={newCardContent}
              onChange={(e) => setNewCardContent(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Card content"
              aria-invalid={!!addError}
            />
            {addError && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {addError}
              </p>
            )}
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">Post anonymously</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Column Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column Name</DialogTitle>
            <DialogDescription>Change the name of this column.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
              placeholder="Column name"
              aria-label="Column name"
              aria-invalid={!!editError}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleEditColumn();
                }
              }}
            />
            {editError && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {editError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditColumn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default RetroColumn;
