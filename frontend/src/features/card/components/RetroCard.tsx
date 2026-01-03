/**
 * RetroCard Component
 * Individual card with reactions, delete, nested children support, and drag-drop.
 * Supports drag-and-drop via @dnd-kit.
 */

import { memo, useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRight, Ghost, GripVertical, Link2, ThumbsUp, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Card, LinkedFeedbackCard } from '@/models/types';
import type { ColumnType } from './RetroColumn';
import { cn } from '@/lib/utils';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Scrolls to a card element and applies a highlight animation
 * @param cardId - The ID of the card to scroll to
 */
export function scrollToCard(cardId: string): void {
  const element = document.getElementById(`card-${cardId}`);
  if (!element) return;

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Add highlight animation class
  element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');

  // Remove highlight after 2 seconds
  setTimeout(() => {
    element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
  }, 2000);
}

/**
 * Truncates text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// ============================================================================
// Types for Linked Cards
// ============================================================================

export interface LinkedActionCard {
  id: string;
  content: string;
}

// ============================================================================
// Types
// ============================================================================

// Card background colors (darker shades than column, per UI spec)
const cardBgColors: Record<ColumnType, string> = {
  went_well: 'bg-green-200',    // Darker than column's green-50
  to_improve: 'bg-amber-200',   // Darker than column's orange-50
  action_item: 'bg-blue-200',   // Darker than column's blue-50
};

export interface RetroCardProps {
  card: Card;
  columnType: ColumnType;
  isOwner: boolean;
  isClosed: boolean;
  canReact: boolean;
  hasReacted: boolean;
  // DnD props
  isDragging?: boolean;
  isValidDropTarget?: (targetId: string, targetType: 'card' | 'column') => boolean;
  // Linked cards for visual indicators (UTB-004)
  linkedActionCards?: LinkedActionCard[];
  linkedFeedbackCards?: LinkedFeedbackCard[];
  onReact: () => Promise<void>;
  onUnreact: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUnlinkFromParent: () => Promise<void>;
  onUpdateCard?: (content: string) => Promise<void>;
  // Child card reaction props (UTB-007)
  onReactToChild?: (childId: string) => Promise<void>;
  onUnreactFromChild?: (childId: string) => Promise<void>;
  hasUserReactedToChild?: (childId: string) => boolean;
  // Child card unlink handler
  onUnlinkChild?: (childId: string) => Promise<void>;
  level?: number;
}

// ============================================================================
// Component
// ============================================================================

export const RetroCard = memo(function RetroCard({
  card,
  columnType,
  isOwner,
  isClosed,
  canReact,
  hasReacted,
  isDragging: externalIsDragging = false,
  isValidDropTarget,
  linkedActionCards = [],
  linkedFeedbackCards = [],
  onReact,
  onUnreact,
  onDelete,
  onUnlinkFromParent,
  onUpdateCard,
  onReactToChild,
  onUnreactFromChild,
  hasUserReactedToChild,
  onUnlinkChild,
  level = 0,
}: RetroCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handler for clicking on linked card previews
  const handleLinkedCardClick = useCallback((linkedCardId: string) => {
    scrollToCard(linkedCardId);
  }, []);

  // Determine if this card has action-feedback links
  const hasLinkedActions = linkedActionCards.length > 0;
  const hasLinkedFeedback = linkedFeedbackCards.length > 0 || (card.linked_feedback_cards && card.linked_feedback_cards.length > 0);

  // Use embedded linked_feedback_cards if available, otherwise use passed prop
  const feedbackCardsToShow = card.linked_feedback_cards && card.linked_feedback_cards.length > 0
    ? card.linked_feedback_cards
    : linkedFeedbackCards;

  const hasParent = !!card.parent_card_id;
  const hasChildren = card.children && card.children.length > 0;
  const reactionCount = card.aggregated_reaction_count;

  // Draggable: Cards with parents cannot be dragged (already linked)
  const canDrag = !hasParent && !isClosed;
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging: isThisCardDragging,
  } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      cardId: card.id,
      cardType: card.card_type,
    },
    disabled: !canDrag,
  });

  // Droppable: This card can receive drops from other cards
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${card.id}`,
    data: {
      type: 'card',
      cardId: card.id,
      cardType: card.card_type,
    },
    disabled: isClosed,
  });

  // Combine refs for both draggable and droppable on the same element
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Transform style for dragging
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isThisCardDragging ? 0.5 : 1,
      }
    : undefined;

  // Check if this card is a valid drop target
  const isValidTarget = externalIsDragging && isValidDropTarget?.(card.id, 'card');

  const handleReactionClick = async () => {
    if (isClosed) return;

    setIsSubmitting(true);
    try {
      if (hasReacted) {
        await onUnreact();
      } else {
        await onReact();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setIsSubmitting(true);
    try {
      await onUnlinkFromParent();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Card Content Editing (UTB-020)
  // ============================================================================

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // Start editing when owner clicks on content
  const handleContentClick = useCallback(() => {
    if (isOwner && !isClosed && onUpdateCard) {
      setEditContent(card.content);
      setIsEditing(true);
    }
  }, [isOwner, isClosed, onUpdateCard, card.content]);

  // Save changes on blur
  const handleEditBlur = useCallback(async () => {
    if (!isEditing || !onUpdateCard) return;

    const trimmedContent = editContent.trim();

    // Only save if content changed and is not empty
    if (trimmedContent && trimmedContent !== card.content) {
      setIsSubmitting(true);
      try {
        await onUpdateCard(trimmedContent);
      } finally {
        setIsSubmitting(false);
      }
    }

    setIsEditing(false);
  }, [isEditing, editContent, card.content, onUpdateCard]);

  // Handle keyboard events for save (Enter) and cancel (Escape)
  const handleEditKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      // Cancel editing, restore original content
      setEditContent(card.content);
      setIsEditing(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on Enter (but allow Shift+Enter for newlines)
      e.preventDefault();
      void handleEditBlur();
    }
  }, [card.content, handleEditBlur]);

  // Handler for child card reaction clicks (UTB-007)
  const handleChildReactionClick = useCallback(async (childId: string) => {
    if (isClosed) return;
    if (!onReactToChild || !onUnreactFromChild || !hasUserReactedToChild) return;

    const hasReactedToChild = hasUserReactedToChild(childId);

    try {
      if (hasReactedToChild) {
        await onUnreactFromChild(childId);
      } else {
        await onReactToChild(childId);
      }
    } catch {
      // Error handling is done in the parent viewmodel
    }
  }, [isClosed, onReactToChild, onUnreactFromChild, hasUserReactedToChild]);

  // Handler for unlinking a nested child card
  const handleUnlinkChildClick = useCallback(async (childId: string) => {
    if (isClosed || !onUnlinkChild) return;
    try {
      await onUnlinkChild(childId);
    } catch {
      // Error handling is done in the parent viewmodel
    }
  }, [isClosed, onUnlinkChild]);

  return (
    <TooltipProvider>
      <div
        id={`card-${card.id}`}
        ref={setNodeRef}
        style={style}
        className={cn(
          'group rounded-lg border border-border p-3 shadow-md transition-all duration-200 hover:shadow-lg',
          cardBgColors[columnType],
          level > 0 && 'ml-4 border-l-2 border-l-primary/30',
          isThisCardDragging && 'opacity-50 shadow-lg',
          isOver && isValidTarget && 'ring-2 ring-primary ring-offset-2',
          isOver && !isValidTarget && 'ring-2 ring-destructive ring-offset-2'
        )}
        {...attributes}
      >
        {/* Card Header - Full width drag handle (UTB-019) */}
        <div
          className={cn(
            'mb-2 flex items-start justify-between min-h-[30px]',
            canDrag && !hasParent && 'cursor-grab active:cursor-grabbing',
            hasParent && 'cursor-default',
            canDrag && !hasParent && 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded'
          )}
          {...(!hasParent && canDrag ? listeners : {})}
          tabIndex={canDrag && !hasParent ? 0 : undefined}
          role={canDrag && !hasParent ? 'button' : undefined}
          aria-label={canDrag && !hasParent ? `Drag card: ${card.content.substring(0, 30)}${card.content.length > 30 ? '...' : ''}` : undefined}
          aria-roledescription={canDrag && !hasParent ? 'draggable' : undefined}
          data-testid="card-header"
        >
          {/* Left: Drag Handle Icon or Link Icon */}
          <div className="flex items-center gap-2">
            {hasParent ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={isClosed || isSubmitting}
                    className="cursor-pointer text-muted-foreground transition-all duration-150 hover:text-primary hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Unlink from parent card"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to unlink from parent</TooltipContent>
              </Tooltip>
            ) : (
              <div
                className={cn(
                  'text-muted-foreground opacity-0 group-hover:opacity-100',
                  canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
                )}
                aria-hidden="true"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}

            {/* Author */}
            {!card.is_anonymous && card.created_by_alias && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{card.created_by_alias}</span>
              </div>
            )}
            {card.is_anonymous && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center text-muted-foreground" aria-label="Anonymous card">
                    <Ghost className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Anonymous</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Right: Actions - stop propagation to prevent drag interference (UTB-019) */}
          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            {/* Reaction Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('min-w-8 min-h-8 gap-1 px-2 flex items-center justify-center', hasReacted && 'text-primary')}
                  onClick={handleReactionClick}
                  disabled={isClosed || (!canReact && !hasReacted) || isSubmitting}
                  aria-label={hasReacted ? 'Remove reaction' : 'Add reaction'}
                >
                  <ThumbsUp className={cn('h-3 w-3', hasReacted && 'fill-current')} />
                  {reactionCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs font-medium">{reactionCount}</span>
                      {hasChildren && (
                        <span className="text-[10px] text-muted-foreground" data-testid="reaction-own-count">
                          ({card.direct_reaction_count} own)
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isClosed
                  ? 'Board is closed'
                  : !canReact && !hasReacted
                    ? 'Reaction limit reached'
                    : hasReacted
                      ? 'Remove your reaction'
                      : 'Add reaction'}
              </TooltipContent>
            </Tooltip>

            {/* Delete Button (owner only) */}
            {isOwner && !isClosed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-8 min-h-8 flex items-center justify-center text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    aria-label="Delete card"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete card</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Card Content (UTB-020: Editable for owner) */}
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            disabled={isSubmitting}
            className="min-h-[60px] resize-none text-sm"
            aria-label="Edit card content"
            data-testid="card-edit-textarea"
          />
        ) : (
          <p
            className={cn(
              'whitespace-pre-wrap text-sm text-foreground',
              isOwner && !isClosed && onUpdateCard && 'cursor-pointer hover:bg-black/5 rounded px-1 -mx-1 transition-colors'
            )}
            onClick={handleContentClick}
            role={isOwner && !isClosed && onUpdateCard ? 'button' : undefined}
            tabIndex={isOwner && !isClosed && onUpdateCard ? 0 : undefined}
            onKeyDown={isOwner && !isClosed && onUpdateCard ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleContentClick();
              }
            } : undefined}
            aria-label={isOwner && !isClosed && onUpdateCard ? 'Click to edit card content' : undefined}
            data-testid="card-content"
          >
            {card.content}
          </p>
        )}

        {/* Link Indicators (UTB-004) */}
        {hasLinkedActions && (
          <div className="mt-2 rounded-md bg-blue-100 p-2" data-testid="linked-actions-section">
            <div className="mb-1 text-xs font-medium text-blue-700">Linked Actions</div>
            <div className="space-y-1">
              {linkedActionCards.map((actionCard) => (
                <button
                  key={actionCard.id}
                  type="button"
                  onClick={() => handleLinkedCardClick(actionCard.id)}
                  className="flex w-full items-center gap-1 rounded bg-blue-50 px-2 py-1 text-left text-xs text-blue-600 transition-colors hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  aria-label={`Navigate to linked action: ${truncateText(actionCard.content, 30)}`}
                >
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{truncateText(actionCard.content)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hasLinkedFeedback && (
          <div className="mt-2 rounded-md bg-green-100 p-2" data-testid="linked-feedback-section">
            <div className="mb-1 text-xs font-medium text-green-700">Links to</div>
            <div className="space-y-1">
              {feedbackCardsToShow.map((feedbackCard) => (
                <button
                  key={feedbackCard.id}
                  type="button"
                  onClick={() => handleLinkedCardClick(feedbackCard.id)}
                  className="flex w-full items-center gap-1 rounded bg-green-50 px-2 py-1 text-left text-xs text-green-600 transition-colors hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-green-400"
                  aria-label={`Navigate to linked feedback: ${truncateText(feedbackCard.content, 30)}`}
                >
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{truncateText(feedbackCard.content)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Children Cards (recursive) */}
        {hasChildren && (
          <div className="mt-2 space-y-2">
            {card.children!.map((child) => (
              <div
                key={child.id}
                className="rounded-md border-l-2 border-l-primary/20 bg-muted/30 p-2 text-sm"
              >
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {/* Unlink child button - clickable Link2 icon */}
                  {onUnlinkChild && !isClosed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleUnlinkChildClick(child.id)}
                          className="cursor-pointer text-muted-foreground transition-all duration-150 hover:text-primary hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                          aria-label="Unlink child card"
                        >
                          <Link2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Click to unlink</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  {!child.is_anonymous && child.created_by_alias && (
                    <span>{child.created_by_alias}</span>
                  )}
                  {child.is_anonymous && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center" aria-label="Anonymous child card">
                          <Ghost className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Anonymous</TooltipContent>
                    </Tooltip>
                  )}
                  {/* Child card reaction button (UTB-007) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'ml-auto min-w-8 min-h-8 gap-1 px-1.5 flex items-center justify-center text-xs',
                      hasUserReactedToChild?.(child.id) && 'text-primary'
                    )}
                    onClick={() => handleChildReactionClick(child.id)}
                    disabled={isClosed || (!canReact && !hasUserReactedToChild?.(child.id))}
                    aria-label={hasUserReactedToChild?.(child.id) ? 'Remove reaction from child card' : 'Add reaction to child card'}
                  >
                    <ThumbsUp className={cn('h-3 w-3', hasUserReactedToChild?.(child.id) && 'fill-current')} />
                    {child.direct_reaction_count > 0 && (
                      <span>{child.direct_reaction_count}</span>
                    )}
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{child.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Card?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The card and all its reactions will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
});

export default RetroCard;
