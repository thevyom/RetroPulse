/**
 * ParticipantBar Component
 * Displays active users as avatars with filter functionality.
 */

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
  selectedUsers: string[];
  onToggleAllUsers: () => void;
  onToggleAnonymous: () => void;
  onToggleUser: (alias: string) => void;
  onPromoteToAdmin: (userHash: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function ParticipantBar({
  activeUsers,
  currentUserHash: _currentUserHash,
  isCreator,
  admins,
  showAll,
  showAnonymous,
  selectedUsers,
  onToggleAllUsers,
  onToggleAnonymous,
  onToggleUser,
  onPromoteToAdmin,
}: ParticipantBarProps) {
  // Note: _currentUserHash reserved for highlighting current user's avatar
  void _currentUserHash;
  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Special Avatars */}
        <div className="flex items-center gap-1">
          {/* All Users */}
          <ParticipantAvatar
            type="all"
            isSelected={showAll && selectedUsers.length === 0}
            onClick={onToggleAllUsers}
          />

          {/* Anonymous */}
          <ParticipantAvatar
            type="anonymous"
            isSelected={showAnonymous}
            onClick={onToggleAnonymous}
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* User Avatars */}
        <div className="flex items-center gap-1">
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
            <div className="h-6 w-px bg-border" />
            <AdminDropdown
              activeUsers={activeUsers}
              admins={admins}
              onPromoteToAdmin={onPromoteToAdmin}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ParticipantBar;
