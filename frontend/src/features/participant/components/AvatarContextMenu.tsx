/**
 * AvatarContextMenu Component
 * Right-click context menu for participant avatars.
 * Provides filter and admin management actions.
 *
 * Note: Long-press touch support planned for Phase 8.7 (Task 2.2).
 * Radix ContextMenu doesn't support controlled open state.
 */

import { Eye, Crown } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// ============================================================================
// Types
// ============================================================================

export interface AvatarContextMenuUser {
  alias: string;
  is_admin: boolean;
}

export interface AvatarContextMenuProps {
  /** The child element (avatar) to wrap */
  children: React.ReactNode;
  /** User data for the avatar */
  user: AvatarContextMenuUser;
  /** Whether the current user is an admin */
  isCurrentUserAdmin: boolean;
  /** Callback when "Make Admin" is clicked */
  onMakeAdmin?: (alias: string) => void;
  /** Callback when "Filter by user" is clicked */
  onFilterByUser: (alias: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AvatarContextMenu({
  children,
  user,
  isCurrentUserAdmin,
  onMakeAdmin,
  onFilterByUser,
}: AvatarContextMenuProps) {
  const showMakeAdmin = isCurrentUserAdmin && !user.is_admin && onMakeAdmin;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        data-testid={`avatar-context-trigger-${user.alias.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent data-testid="avatar-context-menu">
        <ContextMenuLabel data-testid="avatar-context-menu-label">
          {user.alias}
          {user.is_admin && <span className="ml-1 text-amber-500">(Admin)</span>}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onFilterByUser(user.alias)}
          data-testid="avatar-context-filter"
        >
          <Eye className="mr-2 h-4 w-4" />
          Filter by user
        </ContextMenuItem>
        {showMakeAdmin && (
          <ContextMenuItem
            onClick={() => onMakeAdmin(user.alias)}
            data-testid="avatar-context-make-admin"
          >
            <Crown className="mr-2 h-4 w-4 text-amber-500" />
            Make Admin
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default AvatarContextMenu;
