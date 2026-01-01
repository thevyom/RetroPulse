/**
 * CreateBoardDialog Component
 * Modal form for creating a new retrospective board
 */

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { validateBoardName } from '@/shared/validation';
import { useCreateBoardViewModel } from '../viewmodels/useCreateBoardViewModel';

// ============================================================================
// Types
// ============================================================================

export interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLUMNS = [
  { name: 'What Went Well', color: '#22c55e' },
  { name: 'To Improve', color: '#f97316' },
  { name: 'Action Items', color: '#3b82f6' },
];

// ============================================================================
// Component
// ============================================================================

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const navigate = useNavigate();
  const { isCreating, createBoard } = useCreateBoardViewModel();

  // Form state
  const [boardName, setBoardName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBoardName('');
      setError(null);
    }
  }, [open]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  // Form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate board name
    const validation = validateBoardName(boardName);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid board name');
      return;
    }

    setError(null);

    try {
      const board = await createBoard({
        name: boardName.trim(),
        columns: DEFAULT_COLUMNS,
        card_limit_per_user: null,
        reaction_limit_per_user: null,
      });

      // Success - close dialog and navigate to new board
      handleOpenChange(false);
      toast.success('Board created successfully!');
      navigate(`/boards/${board.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create board';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="create-board-dialog">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Give your retrospective board a name. You can customize columns and settings later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <label htmlFor="board-name" className="mb-2 block text-sm font-medium">
              Board Name
            </label>
            <Input
              id="board-name"
              value={boardName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setBoardName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Sprint 42 Retrospective"
              aria-label="Board name"
              aria-invalid={!!error}
              aria-describedby={error ? 'board-name-error' : undefined}
              autoFocus
              disabled={isCreating}
              data-testid="board-name-input"
            />
            {error && (
              <p
                id="board-name-error"
                className="mt-2 text-sm text-destructive"
                role="alert"
                data-testid="board-name-error"
              >
                {error}
              </p>
            )}

            {/* Column preview */}
            <div className="mt-4">
              <p className="mb-2 text-sm text-muted-foreground">Default columns:</p>
              <div className="flex gap-2">
                {DEFAULT_COLUMNS.map((column, index) => (
                  <div
                    key={index}
                    className="rounded-md px-3 py-1 text-sm"
                    style={{ backgroundColor: `${column.color}20`, color: column.color }}
                  >
                    {column.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !boardName.trim()} data-testid="submit-create-board">
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Board'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateBoardDialog;
