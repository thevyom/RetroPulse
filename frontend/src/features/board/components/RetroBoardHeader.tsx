/**
 * RetroBoardHeader Component
 * Displays board title, admin controls, and current user info.
 * Memoized to prevent re-renders when sort mode changes (UTB-010).
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import { memo, useState } from 'react';
import { Lock, Pencil, X, Link } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { MyUserCard } from '../../user/components/MyUserCard';
import type { UserSession } from '@/models/types';
import { validateBoardName } from '@/shared/validation';

// ============================================================================
// Types
// ============================================================================

export interface RetroBoardHeaderProps {
  boardName: string;
  isAdmin: boolean;
  isClosed: boolean;
  currentUser: UserSession | null;
  onEditTitle: (newTitle: string) => Promise<void>;
  onCloseBoard: () => Promise<void>;
  onUpdateAlias: (newAlias: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const RetroBoardHeader = memo(function RetroBoardHeader({
  boardName,
  isAdmin,
  isClosed,
  currentUser,
  onEditTitle,
  onCloseBoard,
  onUpdateAlias,
}: RetroBoardHeaderProps) {
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

  // Edit form state
  const [editedTitle, setEditedTitle] = useState(boardName);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handlers
  const handleOpenEditDialog = () => {
    setEditedTitle(boardName);
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    // Validate
    const validation = validateBoardName(editedTitle);
    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid board name');
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      await onEditTitle(editedTitle);
      setIsEditDialogOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update board name');
    } finally {
      setIsSubmitting(false);
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
      {/* Left: Board Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-foreground">{boardName}</h1>
        {isClosed && (
          <div className="flex items-center gap-1 text-muted-foreground" title="Board is closed">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Closed</span>
          </div>
        )}
        {isAdmin && !isClosed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenEditDialog}
            aria-label="Edit board name"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Admin Controls */}
        {isAdmin && !isClosed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCloseDialogOpen(true)}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Close Board
          </Button>
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

        {/* Current User Card */}
        {currentUser && (
          <MyUserCard
            uuid={currentUser.cookie_hash}
            alias={currentUser.alias}
            onUpdateAlias={onUpdateAlias}
          />
        )}
      </div>

      {/* Edit Title Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board Name</DialogTitle>
            <DialogDescription>Enter a new name for this retrospective board.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
              placeholder="Board name"
              aria-label="Board name"
              aria-invalid={!!editError}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleEditSubmit();
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
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Board Confirmation Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Board?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The board will become read-only and no new cards or
              reactions can be added.
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
