/**
 * MyUserCard Component
 * Displays current user's UUID and alias with edit capability.
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';
import { Pencil, User } from 'lucide-react';
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
import { validateAlias } from '@/shared/validation';

// ============================================================================
// Types
// ============================================================================

export interface MyUserCardProps {
  uuid: string;
  alias: string;
  onUpdateAlias: (newAlias: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function MyUserCard({ uuid, alias, onUpdateAlias }: MyUserCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedAlias, setEditedAlias] = useState(alias);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenEditDialog = () => {
    setEditedAlias(alias);
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    // Validate
    const validation = validateAlias(editedAlias);
    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid alias');
      return;
    }

    // Skip if unchanged
    if (editedAlias === alias) {
      setIsEditDialogOpen(false);
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      await onUpdateAlias(editedAlias);
      setIsEditDialogOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update alias');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* User Icon */}
      <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />

      {/* Alias */}
      <span className="font-medium text-foreground">{alias}</span>

      {/* Edit Button (appears on hover) */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleOpenEditDialog}
        aria-label="Edit alias"
      >
        <Pencil className="h-3 w-3" />
      </Button>

      {/* Edit Alias Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Your Alias</DialogTitle>
            <DialogDescription>
              Choose a display name that other participants will see.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                value={editedAlias}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedAlias(e.target.value)}
                placeholder="Your alias"
                aria-label="Alias"
                aria-invalid={!!editError}
                maxLength={50}
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
              <p className="mt-2 text-xs text-muted-foreground">
                1-50 characters, alphanumeric and spaces allowed.
              </p>
            </div>

            {/* UUID - moved from header */}
            <div className="text-sm text-muted-foreground border-t pt-3">
              <span className="font-medium">Your ID:</span>{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{uuid.slice(0, 12)}...</code>
              <p className="text-xs mt-1 text-muted-foreground/70">
                This identifies you across browser sessions
              </p>
            </div>
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
    </div>
  );
}

export default MyUserCard;
