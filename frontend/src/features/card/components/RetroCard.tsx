/**
 * RetroCard Component
 * Individual card with reactions, delete, nested children support, and drag-drop.
 * Supports drag-and-drop via @dnd-kit.
 */

import { memo, useState, useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRight, GripVertical, Link2, ThumbsUp, Trash2, User } from 'lucide-react';
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
  // Child card reaction props (UTB-007)
  onReactToChild?: (childId: string) => Promise<void>;
  onUnreactFromChild?: (childId: string) => Promise<void>;
  hasUserReactedToChild?: (childId: string) => boolean;
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
  onReactToChild,
  onUnreactFromChild,
  hasUserReactedToChild,
  level = 0,
}: RetroCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        {/* Card Header */}
        <div className="mb-2 flex items-start justify-between">
          {/* Left: Drag Handle or Link Icon */}
          <div className="flex items-center gap-2">
            {hasParent ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleUnlink}
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
                {...listeners}
                className={cn(
                  'text-muted-foreground opacity-0 group-hover:opacity-100',
                  canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
                )}
                aria-label="Drag handle"
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
              <span className="text-xs italic text-muted-foreground">Anonymous</span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Reaction Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 gap-1 px-2', hasReacted && 'text-primary')}
                  onClick={handleReactionClick}
                  disabled={isClosed || (!canReact && !hasReacted) || isSubmitting}
                  aria-label={hasReacted ? 'Remove reaction' : 'Add reaction'}
                >
                  <ThumbsUp className={cn('h-3 w-3', hasReacted && 'fill-current')} />
                  {reactionCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs font-medium">{reactionCount}</span>
                      {hasChildren && (
                        <span className="text-[10px] text-muted-foreground">(Agg)</span>
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
                    className="h-7 w-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
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

        {/* Card Content */}
        <p className="whitespace-pre-wrap text-sm text-foreground">{card.content}</p>

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
                  <Link2 className="h-3 w-3" />
                  {!child.is_anonymous && child.created_by_alias && (
                    <span>{child.created_by_alias}</span>
                  )}
                  {child.is_anonymous && <span className="italic">Anonymous</span>}
                  {/* Child card reaction button (UTB-007) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'ml-auto h-5 gap-1 px-1.5 py-0 text-xs',
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
