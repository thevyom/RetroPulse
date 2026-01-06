/**
 * RetroColumn Component
 * A column container for retro cards with add card functionality.
 * Supports drag-and-drop via @dnd-kit.
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import { memo, useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  went_well: 'bg-green-50', // #ecf9ec - light green
  to_improve: 'bg-orange-50', // #FFF7E8 - light orange
  action_item: 'bg-blue-50', // #dae8fc - light blue
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
  onUnlinkChild?: (childId: string) => Promise<void>;
  onEditColumnTitle?: (newName: string) => Promise<void>;
  // Card content editing (UTB-020)
  onUpdateCard?: (cardId: string, content: string) => Promise<void>;
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
  onUpdateCard,
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

  // Inline column title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Sync editedTitle when title prop changes
  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(title);
    }
  }, [title, isEditingTitle]);

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

  // Inline title edit handlers
  const handleStartEditingTitle = () => {
    if (isAdmin && !isClosed && onEditColumnTitle) {
      setEditedTitle(title);
      setIsEditingTitle(true);
    }
  };

  const handleCancelTitleEdit = () => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  };

  const handleSaveTitle = async () => {
    if (!onEditColumnTitle) return;

    // Skip if unchanged
    if (editedTitle.trim() === title) {
      setIsEditingTitle(false);
      return;
    }

    // Validate
    const validation = validateColumnName(editedTitle);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid column name');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await onEditColumnTitle(editedTitle.trim());
      setIsEditingTitle(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename column');
      titleInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelTitleEdit();
    }
  };

  const handleTitleBlur = () => {
    if (!isSubmitting) {
      handleSaveTitle();
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
        {/* Inline editable column title */}
        {isEditingTitle && isAdmin && !isClosed && onEditColumnTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            disabled={isSubmitting}
            className="font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none px-1 min-w-[120px]"
            aria-label="Edit column name"
          />
        ) : (
          <h2
            className={`font-semibold text-foreground ${
              isAdmin && !isClosed && onEditColumnTitle
                ? 'cursor-text hover:underline hover:decoration-muted-foreground/50 transition-all'
                : ''
            }`}
            onClick={handleStartEditingTitle}
            title={
              isAdmin && !isClosed && onEditColumnTitle ? 'Click to edit column name' : undefined
            }
            role={isAdmin && !isClosed && onEditColumnTitle ? 'button' : undefined}
            tabIndex={isAdmin && !isClosed && onEditColumnTitle ? 0 : undefined}
            aria-label={
              isAdmin && !isClosed && onEditColumnTitle ? `Edit column name: ${title}` : undefined
            }
            onKeyDown={
              isAdmin && !isClosed && onEditColumnTitle
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStartEditingTitle();
                    }
                  }
                : undefined
            }
          >
            {title}
          </h2>
        )}
        <div className="flex items-center gap-1">
          {/* Add Card Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
            onUnlinkFromParent={onUnlinkChild ? () => onUnlinkChild(card.id) : undefined}
            onUpdateCard={onUpdateCard ? (content) => onUpdateCard(card.id, content) : undefined}
            onReactToChild={onReactToChild}
            onUnreactFromChild={onUnreactFromChild}
            hasUserReactedToChild={hasUserReactedToChild}
            onUnlinkChild={onUnlinkChild}
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
                aria-label="Post anonymously"
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
    </div>
  );
});

export default RetroColumn;
