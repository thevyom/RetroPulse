/**
 * RetroBoardHeader Component
 * Displays board title, admin controls, and current user info.
 * Memoized to prevent re-renders when sort mode changes (UTB-010).
 */

import type { ChangeEvent, KeyboardEvent, FocusEvent } from 'react';
import { memo, useState, useRef, useEffect } from 'react';
import { Lock, X, Link } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { validateBoardName } from '@/shared/validation';

// ============================================================================
// Types
// ============================================================================

export interface RetroBoardHeaderProps {
  boardName: string;
  isAdmin: boolean;
  isClosed: boolean;
  onEditTitle: (newTitle: string) => Promise<void>;
  onCloseBoard: () => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const RetroBoardHeader = memo(function RetroBoardHeader({
  boardName,
  isAdmin,
  isClosed,
  onEditTitle,
  onCloseBoard,
}: RetroBoardHeaderProps) {
  // Dialog states
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

  // Inline edit state (UTB-028: replaced dialog with inline editing)
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(boardName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Sync editedTitle when boardName prop changes
  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(boardName);
    }
  }, [boardName, isEditingTitle]);

  // Handlers for inline title editing
  const handleStartEditing = () => {
    if (isAdmin && !isClosed) {
      setEditedTitle(boardName);
      setIsEditingTitle(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(boardName);
    setIsEditingTitle(false);
  };

  const handleSaveTitle = async () => {
    // Skip if unchanged
    if (editedTitle.trim() === boardName) {
      setIsEditingTitle(false);
      return;
    }

    // Validate
    const validation = validateBoardName(editedTitle);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid board name');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      await onEditTitle(editedTitle.trim());
      setIsEditingTitle(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update board name');
      inputRef.current?.focus();
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
      handleCancelEdit();
    }
  };

  const handleTitleBlur = (_e: FocusEvent<HTMLInputElement>) => {
    // Prevent save on blur if clicking inside the header (e.g., for validation feedback)
    // Only save if actually leaving the input
    if (!isSubmitting) {
      handleSaveTitle();
    }
  };

  const handleCloseBoard = async () => {
    setIsSubmitting(true);
    try {
      await onCloseBoard();
      setIsCloseDialogOpen(false);
    } catch {
      // Error is handled by the ViewModel
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = window.location.href;

    try {
      // Modern clipboard API
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          toast.success('Link copied to clipboard!');
        } else {
          toast.error('Failed to copy link');
        }
      } catch {
        toast.error('Failed to copy link to clipboard');
      }
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      {/* Left: Board Title (UTB-028: inline editing on click for admins) */}
      <div className="flex items-center gap-2">
        {isEditingTitle && isAdmin && !isClosed ? (
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            disabled={isSubmitting}
            className="text-xl font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none px-1 min-w-[200px]"
            aria-label="Edit board name"
          />
        ) : (
          <h1
            className={`text-xl font-semibold text-foreground ${
              isAdmin && !isClosed
                ? 'cursor-text hover:underline hover:decoration-muted-foreground/50 transition-all'
                : ''
            }`}
            onClick={handleStartEditing}
            title={isAdmin && !isClosed ? 'Click to edit board name' : undefined}
            role={isAdmin && !isClosed ? 'button' : undefined}
            tabIndex={isAdmin && !isClosed ? 0 : undefined}
            onKeyDown={
              isAdmin && !isClosed
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStartEditing();
                    }
                  }
                : undefined
            }
          >
            {boardName}
          </h1>
        )}
        {isClosed && (
          <div className="flex items-center gap-1 text-muted-foreground" title="Board is closed">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Closed</span>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Admin Controls */}
        {isAdmin && !isClosed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCloseDialogOpen(true)}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Close Board
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Makes the board read-only. No new cards, edits, or reactions allowed. This action cannot be undone.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Copy Link Button - visible on both active and closed boards */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                aria-label="Copy board link"
              >
                <Link className="mr-1 h-4 w-4" />
                Copy Link
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy board link</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Close Board Confirmation Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Board?</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="mb-2">Closing the board makes it permanently read-only:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>No new cards can be created</li>
                  <li>Existing cards cannot be edited or deleted</li>
                  <li>Reactions are locked</li>
                  <li>Aliases cannot be changed</li>
                </ul>
                <p className="mt-3 font-medium">This is useful for archiving completed retrospectives. This action cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCloseDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseBoard} disabled={isSubmitting}>
              {isSubmitting ? 'Closing...' : 'Close Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
});

export default RetroBoardHeader;
