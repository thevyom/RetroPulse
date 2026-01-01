/**
 * CreateBoardDialog Component
 * Modal form for creating a new retrospective board
 */

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
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
import { validateBoardName, validateAlias, validateColumnName } from '@/shared/validation';
import { useCreateBoardViewModel } from '../viewmodels/useCreateBoardViewModel';

// ============================================================================
// Types
// ============================================================================

export interface ColumnConfig {
  id: string;
  name: string;
  type: 'feedback' | 'action';
  color: string;
}

export interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'col-1', name: 'What Went Well', type: 'feedback', color: '#22c55e' },
  { id: 'col-2', name: 'To Improve', type: 'feedback', color: '#f97316' },
  { id: 'col-3', name: 'Action Items', type: 'action', color: '#3b82f6' },
];

const COLUMN_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
const MAX_COLUMNS = 6;
const MIN_COLUMNS = 1;

// Keywords for inferring column type
const ACTION_KEYWORDS = ['action', 'todo', 'task', 'do', 'next', 'follow'];

/**
 * Infers column type based on name keywords
 */
function inferColumnType(name: string): 'feedback' | 'action' {
  const lowercased = name.toLowerCase();
  return ACTION_KEYWORDS.some(keyword => lowercased.includes(keyword)) ? 'action' : 'feedback';
}

// ============================================================================
// Component
// ============================================================================

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const navigate = useNavigate();
  const { isCreating, createBoard } = useCreateBoardViewModel();

  // Form state
  const [boardName, setBoardName] = useState('');
  const [creatorAlias, setCreatorAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([...DEFAULT_COLUMNS]);
  const [columnErrors, setColumnErrors] = useState<Record<string, string>>({});
  const [nextColumnId, setNextColumnId] = useState(4);

  // Advanced settings state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cardLimitEnabled, setCardLimitEnabled] = useState(false);
  const [cardLimit, setCardLimit] = useState<number | null>(null);
  const [cardLimitError, setCardLimitError] = useState<string | null>(null);
  const [reactionLimitEnabled, setReactionLimitEnabled] = useState(false);
  const [reactionLimit, setReactionLimit] = useState<number | null>(null);
  const [reactionLimitError, setReactionLimitError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBoardName('');
      setCreatorAlias('');
      setError(null);
      setAliasError(null);
      setColumns([...DEFAULT_COLUMNS]);
      setColumnErrors({});
      setNextColumnId(4);
      // Reset advanced settings
      setShowAdvanced(false);
      setCardLimitEnabled(false);
      setCardLimit(null);
      setCardLimitError(null);
      setReactionLimitEnabled(false);
      setReactionLimit(null);
      setReactionLimitError(null);
    }
  }, [open]);

  /**
   * Updates a column's name and infers its type
   */
  const handleColumnNameChange = useCallback((id: string, name: string) => {
    setColumns(prev => prev.map(col =>
      col.id === id
        ? { ...col, name, type: inferColumnType(name) }
        : col
    ));
    // Clear error for this column when user types
    if (columnErrors[id]) {
      setColumnErrors(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  }, [columnErrors]);

  /**
   * Validates column name on blur
   */
  const handleColumnBlur = useCallback((id: string, name: string) => {
    const validation = validateColumnName(name);
    if (!validation.isValid) {
      setColumnErrors(prev => ({ ...prev, [id]: validation.error || 'Invalid name' }));
      return;
    }
    // Check for duplicates
    const isDuplicate = columns.some(
      col => col.id !== id && col.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setColumnErrors(prev => ({ ...prev, [id]: 'Column names must be unique' }));
    }
  }, [columns]);

  /**
   * Removes a column (minimum 1 required)
   */
  const handleRemoveColumn = useCallback((id: string) => {
    if (columns.length <= MIN_COLUMNS) return;
    setColumns(prev => prev.filter(col => col.id !== id));
    // Clear any error for the removed column
    if (columnErrors[id]) {
      setColumnErrors(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  }, [columns.length, columnErrors]);

  /**
   * Adds a new column with cycling color
   */
  const handleAddColumn = useCallback(() => {
    if (columns.length >= MAX_COLUMNS) return;
    const colorIndex = columns.length % COLUMN_COLORS.length;
    const newColumn: ColumnConfig = {
      id: `col-${nextColumnId}`,
      name: `Column ${columns.length + 1}`,
      type: 'feedback',
      color: COLUMN_COLORS[colorIndex],
    };
    setColumns(prev => [...prev, newColumn]);
    setNextColumnId(prev => prev + 1);
  }, [columns.length, nextColumnId]);

  /**
   * Validates a limit value (1-999)
   */
  const validateLimit = useCallback((value: number | null): { isValid: boolean; error: string | null } => {
    if (value === null) {
      return { isValid: true, error: null };
    }
    if (!Number.isInteger(value) || value < 1 || value > 999) {
      return { isValid: false, error: 'Must be a number between 1 and 999' };
    }
    return { isValid: true, error: null };
  }, []);

  /**
   * Handles card limit input change
   */
  const handleCardLimitChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setCardLimit(null);
      setCardLimitError(null);
      return;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setCardLimitError('Must be a valid number');
      return;
    }
    setCardLimit(numValue);
    const validation = validateLimit(numValue);
    setCardLimitError(validation.error);
  }, [validateLimit]);

  /**
   * Handles reaction limit input change
   */
  const handleReactionLimitChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setReactionLimit(null);
      setReactionLimitError(null);
      return;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setReactionLimitError('Must be a valid number');
      return;
    }
    setReactionLimit(numValue);
    const validation = validateLimit(numValue);
    setReactionLimitError(validation.error);
  }, [validateLimit]);

  /**
   * Validates all columns before submission
   */
  const validateColumns = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const names = new Set<string>();

    for (const col of columns) {
      const validation = validateColumnName(col.name);
      if (!validation.isValid) {
        errors[col.id] = validation.error || 'Invalid name';
        continue;
      }
      const normalizedName = col.name.trim().toLowerCase();
      if (names.has(normalizedName)) {
        errors[col.id] = 'Column names must be unique';
      }
      names.add(normalizedName);
    }

    setColumnErrors(errors);
    return Object.keys(errors).length === 0;
  }, [columns]);

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  // Form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate board name
    const boardValidation = validateBoardName(boardName);
    if (!boardValidation.isValid) {
      setError(boardValidation.error || 'Invalid board name');
      return;
    }

    // Validate alias
    const aliasValidation = validateAlias(creatorAlias);
    if (!aliasValidation.isValid) {
      setAliasError(aliasValidation.error || 'Invalid alias');
      return;
    }

    // Validate columns
    if (!validateColumns()) {
      return;
    }

    // Validate limits if enabled
    if (cardLimitEnabled && cardLimit !== null) {
      const cardLimitValidation = validateLimit(cardLimit);
      if (!cardLimitValidation.isValid) {
        setCardLimitError(cardLimitValidation.error);
        return;
      }
    }
    if (reactionLimitEnabled && reactionLimit !== null) {
      const reactionLimitValidation = validateLimit(reactionLimit);
      if (!reactionLimitValidation.isValid) {
        setReactionLimitError(reactionLimitValidation.error);
        return;
      }
    }

    setError(null);
    setAliasError(null);

    try {
      const board = await createBoard({
        name: boardName.trim(),
        columns: columns.map(col => ({
          ...col,
          name: col.name.trim(),
        })),
        card_limit_per_user: cardLimitEnabled ? cardLimit : null,
        reaction_limit_per_user: reactionLimitEnabled ? reactionLimit : null,
        creator_alias: creatorAlias.trim(),
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

            {/* Your Name (Alias) field */}
            <div className="mt-4">
              <label htmlFor="creator-alias" className="mb-2 block text-sm font-medium">
                Your Name
              </label>
              <Input
                id="creator-alias"
                value={creatorAlias}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setCreatorAlias(e.target.value);
                  if (aliasError) setAliasError(null);
                }}
                placeholder="John"
                aria-label="Your name or alias"
                aria-invalid={!!aliasError}
                aria-describedby={aliasError ? 'creator-alias-error' : undefined}
                disabled={isCreating}
                data-testid="creator-alias-input"
              />
              {aliasError && (
                <p
                  id="creator-alias-error"
                  className="mt-2 text-sm text-destructive"
                  role="alert"
                  data-testid="creator-alias-error"
                >
                  {aliasError}
                </p>
              )}
            </div>

            {/* Column customization */}
            <div className="mt-4" data-testid="column-customization">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Columns:</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={isCreating || columns.length >= MAX_COLUMNS}
                  className="h-7 px-2 text-xs"
                  data-testid="add-column-button"
                  aria-label="Add column"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="relative flex items-center gap-1 rounded-md px-2 py-1"
                    style={{ backgroundColor: `${column.color}20` }}
                    data-testid={`column-chip-${column.id}`}
                  >
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => handleColumnNameChange(column.id, e.target.value)}
                      onBlur={(e) => handleColumnBlur(column.id, e.target.value)}
                      className="w-24 border-none bg-transparent text-sm outline-none focus:ring-1 focus:ring-primary"
                      style={{ color: column.color }}
                      disabled={isCreating}
                      data-testid={`column-input-${column.id}`}
                      aria-label={`Column name: ${column.name}`}
                      aria-invalid={!!columnErrors[column.id]}
                    />
                    {columns.length > MIN_COLUMNS && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(column.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={isCreating}
                        data-testid={`remove-column-${column.id}`}
                        aria-label={`Remove column ${column.name}`}
                      >
                        <X className="h-3 w-3" style={{ color: column.color }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {Object.keys(columnErrors).length > 0 && (
                <div className="mt-2 space-y-1" data-testid="column-errors">
                  {Object.entries(columnErrors).map(([colId, error]) => (
                    <p
                      key={colId}
                      className="text-sm text-destructive"
                      role="alert"
                      data-testid={`column-error-${colId}`}
                    >
                      {error}
                    </p>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {columns.length} of {MAX_COLUMNS} columns (minimum {MIN_COLUMNS})
              </p>
            </div>

            {/* Advanced Settings - Collapsible Section */}
            <div className="mt-4 border-t pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                data-testid="advanced-settings-toggle"
              >
                <span>Advanced Settings</span>
                {showAdvanced ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4" data-testid="advanced-settings-content">
                  {/* Card Limit */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Cards per User</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="card-limit-type"
                          checked={!cardLimitEnabled}
                          onChange={() => {
                            setCardLimitEnabled(false);
                            setCardLimit(null);
                            setCardLimitError(null);
                          }}
                          className="h-4 w-4"
                          data-testid="card-limit-unlimited"
                        />
                        Unlimited
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="card-limit-type"
                          checked={cardLimitEnabled}
                          onChange={() => setCardLimitEnabled(true)}
                          className="h-4 w-4"
                          data-testid="card-limit-limited"
                        />
                        Limit
                      </label>
                      {cardLimitEnabled && (
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={cardLimit ?? ''}
                          onChange={handleCardLimitChange}
                          placeholder="e.g., 5"
                          className="w-24"
                          aria-label="Card limit per user"
                          aria-invalid={!!cardLimitError}
                          data-testid="card-limit-input"
                        />
                      )}
                    </div>
                    {cardLimitError && (
                      <p className="mt-1 text-sm text-destructive" role="alert" data-testid="card-limit-error">
                        {cardLimitError}
                      </p>
                    )}
                  </div>

                  {/* Reaction Limit */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Reactions per User</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="reaction-limit-type"
                          checked={!reactionLimitEnabled}
                          onChange={() => {
                            setReactionLimitEnabled(false);
                            setReactionLimit(null);
                            setReactionLimitError(null);
                          }}
                          className="h-4 w-4"
                          data-testid="reaction-limit-unlimited"
                        />
                        Unlimited
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="reaction-limit-type"
                          checked={reactionLimitEnabled}
                          onChange={() => setReactionLimitEnabled(true)}
                          className="h-4 w-4"
                          data-testid="reaction-limit-limited"
                        />
                        Limit
                      </label>
                      {reactionLimitEnabled && (
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={reactionLimit ?? ''}
                          onChange={handleReactionLimitChange}
                          placeholder="e.g., 10"
                          className="w-24"
                          aria-label="Reaction limit per user"
                          aria-invalid={!!reactionLimitError}
                          data-testid="reaction-limit-input"
                        />
                      )}
                    </div>
                    {reactionLimitError && (
                      <p className="mt-1 text-sm text-destructive" role="alert" data-testid="reaction-limit-error">
                        {reactionLimitError}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
            <Button type="submit" disabled={isCreating || !boardName.trim() || !creatorAlias.trim()} data-testid="submit-create-board">
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
