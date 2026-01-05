/**
 * ParticipantBar Component
 * Displays active users as avatars with filter functionality.
 * Layout: [All, Anon, Me] | [Participants]
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import { memo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import { ParticipantAvatar } from './ParticipantAvatar';
import { MeSection } from './MeSection';
import { AvatarContextMenu } from './AvatarContextMenu';
import { validateAlias } from '@/shared/validation';
import type { ActiveUser } from '@/models/types';

// ============================================================================
// Types
// ============================================================================

export interface ParticipantBarProps {
  activeUsers: ActiveUser[];
  currentUserHash: string;
  currentUserAlias?: string;
  currentUserIsAdmin: boolean;
  showAll: boolean;
  showAnonymous: boolean;
  showOnlyAnonymous: boolean;
  showOnlyMe: boolean;
  selectedUsers: string[];
  onlineAliases: Set<string>;
  onToggleAllUsers: () => void;
  onToggleAnonymous: () => void;
  onToggleMe: () => void;
  onToggleUser: (alias: string) => void;
  /** Promote a user to admin - called from context menu (Task 3.4) */
  onPromoteToAdmin?: (alias: string) => Promise<void>;
  onUpdateAlias: (newAlias: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const ParticipantBar = memo(function ParticipantBar({
  activeUsers,
  currentUserHash,
  currentUserAlias,
  currentUserIsAdmin,
  showAll,
  showAnonymous: _showAnonymous,
  showOnlyAnonymous,
  showOnlyMe,
  selectedUsers,
  onlineAliases,
  onToggleAllUsers,
  onToggleAnonymous,
  onToggleMe,
  onToggleUser,
  onPromoteToAdmin,
  onUpdateAlias,
}: ParticipantBarProps) {
  // Note: _showAnonymous is kept for backward compatibility but showOnlyAnonymous is used for visual state
  void _showAnonymous;

  // Edit alias dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedAlias, setEditedAlias] = useState(currentUserAlias ?? '');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current user from the scrollable list (they appear in MeSection)
  // Use alias comparison since ActiveUser doesn't have cookie_hash
  const otherUsers = activeUsers.filter((user) => user.alias !== currentUserAlias);

  // Handle opening edit dialog
  const handleOpenEditDialog = () => {
    setEditedAlias(currentUserAlias ?? '');
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  // Handle alias update submission
  const handleEditSubmit = async () => {
    // Validate
    const validation = validateAlias(editedAlias);
    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid alias');
      return;
    }

    // Skip if unchanged
    if (editedAlias === currentUserAlias) {
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
    <TooltipProvider>
      <nav className="flex items-center w-full" role="toolbar" aria-label="Participant filters">
        {/* Filter Controls Section - fixed left: All, Anon, Me */}
        <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Filter options">
          {/* All Users */}
          <ParticipantAvatar
            type="all"
            isSelected={showAll && selectedUsers.length === 0 && !showOnlyMe}
            onClick={onToggleAllUsers}
          />

          {/* Anonymous */}
          <ParticipantAvatar
            type="anonymous"
            isSelected={showOnlyAnonymous}
            onClick={onToggleAnonymous}
          />

          {/* Me - part of filter group */}
          {currentUserAlias && (
            <MeSection
              alias={currentUserAlias}
              isAdmin={currentUserIsAdmin}
              isSelected={showOnlyMe}
              onFilter={onToggleMe}
              onEditAlias={handleOpenEditDialog}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-3" aria-hidden="true" />

        {/* Other Participants - scrollable middle */}
        {/* Admin promotion moved to AvatarContextMenu (right-click) per Task 3.4 */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          role="group"
          aria-label="Other participants"
          data-testid="participant-avatar-container"
        >
          {otherUsers.map((user) => (
            <AvatarContextMenu
              key={user.alias}
              user={user}
              isCurrentUserAdmin={currentUserIsAdmin}
              onMakeAdmin={onPromoteToAdmin}
              onFilterByUser={onToggleUser}
            >
              <ParticipantAvatar
                type="user"
                alias={user.alias}
                isAdmin={user.is_admin}
                isSelected={selectedUsers.includes(user.alias)}
                isOnline={onlineAliases.has(user.alias)}
                onClick={() => onToggleUser(user.alias)}
              />
            </AvatarContextMenu>
          ))}

          {otherUsers.length === 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">No other participants</span>
          )}
        </div>
      </nav>

      {/* Edit Alias Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Your Alias</DialogTitle>
            <DialogDescription>
              Choose a display name that other participants will see.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            )}
            {/* UUID display - moved from header per design */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Your ID:</span>{' '}
              <code className="bg-muted px-1 rounded">{currentUserHash?.slice(0, 12)}...</code>
              <p className="text-xs mt-1">(This identifies you across sessions)</p>
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
    </TooltipProvider>
  );
});

export default ParticipantBar;
