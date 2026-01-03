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
  currentUserAlias?: string;
  isCreator: boolean;
  admins: string[];
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
  onPromoteToAdmin: (userHash: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export const ParticipantBar = memo(function ParticipantBar({
  activeUsers,
  currentUserHash: _currentUserHash,
  currentUserAlias,
  isCreator,
  admins,
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
}: ParticipantBarProps) {
  // Note: _showAnonymous is kept for backward compatibility but showOnlyAnonymous is used for visual state
  void _showAnonymous;
  void _currentUserHash; // Kept for backward compatibility

  // Filter out current user from the scrollable list (they have their own "Me" filter)
  // Use alias comparison since ActiveUser doesn't have cookie_hash
  const otherUsers = activeUsers.filter((user) => user.alias !== currentUserAlias);

  return (
    <TooltipProvider>
      <nav className="flex items-center gap-3" role="toolbar" aria-label="Participant filters">
        {/* Filter Controls Section - Always visible */}
        <div className="flex items-center gap-1" role="group" aria-label="Filter options">
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

          {/* Me - Current user's filter */}
          <ParticipantAvatar
            type="me"
            isSelected={showOnlyMe}
            onClick={onToggleMe}
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" aria-hidden="true" />

        {/* Other Participants - Scrollable container */}
        <div
          className="flex items-center gap-1 overflow-x-auto max-w-[280px] scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          role="group"
          aria-label="Other participants"
          data-testid="participant-avatar-container"
        >
          {otherUsers.map((user) => (
            <ParticipantAvatar
              key={user.alias}
              type="user"
              alias={user.alias}
              isAdmin={user.is_admin}
              isSelected={selectedUsers.includes(user.alias)}
              isOnline={onlineAliases.has(user.alias)}
              onClick={() => onToggleUser(user.alias)}
            />
          ))}

          {otherUsers.length === 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">No other participants</span>
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
