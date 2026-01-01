/**
 * ParticipantBar Component
 * Displays active users as avatars with filter functionality.
 */

import { memo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ParticipantAvatar } from './ParticipantAvatar';
import { AdminDropdown } from './AdminDropdown';
import type { ActiveUser } from '@/models/types';

// ============================================================================
// Types
// ============================================================================

export interface ParticipantBarProps {
  activeUsers: ActiveUser[];
  currentUserHash: string;
  isCreator: boolean;
  admins: string[];
  showAll: boolean;
  showAnonymous: boolean;
  showOnlyAnonymous: boolean;
  selectedUsers: string[];
  onToggleAllUsers: () => void;
  onToggleAnonymous: () => void;
  onToggleUser: (alias: string) => void;
  onPromoteToAdmin: (userHash: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const ParticipantBar = memo(function ParticipantBar({
  activeUsers,
  currentUserHash: _currentUserHash,
  isCreator,
  admins,
  showAll,
  showAnonymous: _showAnonymous,
  showOnlyAnonymous,
  selectedUsers,
  onToggleAllUsers,
  onToggleAnonymous,
  onToggleUser,
  onPromoteToAdmin,
}: ParticipantBarProps) {
  // Note: _showAnonymous is kept for backward compatibility but showOnlyAnonymous is used for visual state
  void _showAnonymous;
  // Note: _currentUserHash reserved for highlighting current user's avatar
  void _currentUserHash;
  return (
    <TooltipProvider>
      <nav className="flex items-center gap-3" role="toolbar" aria-label="Participant filters">
        {/* Special Avatars */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter options">
          {/* All Users */}
          <ParticipantAvatar
            type="all"
            isSelected={showAll && selectedUsers.length === 0}
            onClick={onToggleAllUsers}
          />

          {/* Anonymous */}
          <ParticipantAvatar
            type="anonymous"
            isSelected={showOnlyAnonymous}
            onClick={onToggleAnonymous}
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" aria-hidden="true" />

        {/* User Avatars */}
        <div className="flex items-center gap-1" role="group" aria-label="Active participants">
          {activeUsers.map((user) => (
            <ParticipantAvatar
              key={user.alias}
              type="user"
              alias={user.alias}
              isAdmin={user.is_admin}
              isSelected={selectedUsers.includes(user.alias)}
              onClick={() => onToggleUser(user.alias)}
            />
          ))}

          {activeUsers.length === 0 && (
            <span className="text-sm text-muted-foreground">No participants yet</span>
          )}
        </div>

        {/* Admin Dropdown (creator only) */}
        {isCreator && (
          <>
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <AdminDropdown
              activeUsers={activeUsers}
              admins={admins}
              onPromoteToAdmin={onPromoteToAdmin}
            />
          </>
        )}
      </nav>
    </TooltipProvider>
  );
});

export default ParticipantBar;
