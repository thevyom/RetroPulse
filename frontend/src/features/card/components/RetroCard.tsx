/**
 * RetroCard Component
 * Individual card with reactions, delete, and nested children support.
 */

import { useState } from 'react';
import { GripVertical, Link2, ThumbsUp, Trash2, User } from 'lucide-react';
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
import type { Card } from '@/models/types';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface RetroCardProps {
  card: Card;
  isOwner: boolean;
  isClosed: boolean;
  canReact: boolean;
  hasReacted: boolean;
  onReact: () => Promise<void>;
  onUnreact: () => Promise<void>;
  onDelete: () => Promise<void>;
  onUnlinkFromParent: () => Promise<void>;
  level?: number;
}

// ============================================================================
// Component
// ============================================================================

export function RetroCard({
  card,
  isOwner,
  isClosed,
  canReact,
  hasReacted,
  onReact,
  onUnreact,
  onDelete,
  onUnlinkFromParent,
  level = 0,
}: RetroCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasParent = !!card.parent_card_id;
  const hasChildren = card.children && card.children.length > 0;
  const reactionCount = card.aggregated_reaction_count;

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

  return (
    <TooltipProvider>
      <div
        className={cn(
          'group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
          level > 0 && 'ml-4 border-l-2 border-l-primary/30'
        )}
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
                    className="cursor-pointer text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Unlink from parent card"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to unlink from parent</TooltipContent>
              </Tooltip>
            ) : (
              <div
                className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
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
                    <span className="text-xs font-medium">{reactionCount}</span>
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
                  {child.direct_reaction_count > 0 && (
                    <span className="ml-auto flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {child.direct_reaction_count}
                    </span>
                  )}
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
}

export default RetroCard;
