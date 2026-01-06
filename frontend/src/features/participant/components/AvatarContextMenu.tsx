/**
 * AvatarContextMenu Component
 * Right-click context menu for participant avatars.
 * Provides filter, edit alias, and admin management actions.
 *
 * Features (UTB-038 fix):
 * - Right-click opens context menu on all avatars
 * - Menu header shows user name + admin star if applicable
 * - "(You)" indicator for current user
 * - "Filter by cards" always visible
 * - "Edit my alias" visible only on own avatar
 * - "Make Admin" visible only to admins viewing non-admin
 *
 * Note: Long-press touch support planned for Phase 8.7 (Task 2.2).
 * Radix ContextMenu doesn't support controlled open state.
 */

import { Eye, Pencil, Crown } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
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
  /** Whether this menu is for the current user */
  isCurrentUser: boolean;
  /** Whether the current user is an admin */
  isCurrentUserAdmin: boolean;
  /** Callback when "Make Admin" is clicked */
  onMakeAdmin?: (alias: string) => void;
  /** Callback when "Filter by user" is clicked */
  onFilterByUser: (alias: string) => void;
  /** Callback when "Edit my alias" is clicked (only for current user) */
  onEditAlias?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AvatarContextMenu({
  children,
  user,
  isCurrentUser,
  isCurrentUserAdmin,
  onMakeAdmin,
  onFilterByUser,
  onEditAlias,
}: AvatarContextMenuProps) {
  // Show "Make Admin" only for admins viewing non-admin others
  const showMakeAdmin = isCurrentUserAdmin && !user.is_admin && !isCurrentUser && onMakeAdmin;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        data-testid={`avatar-context-trigger-${user.alias.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" data-testid="avatar-context-menu">
        {/* Header with user name */}
        <div className="px-2 py-1.5 text-sm font-medium" data-testid="avatar-context-menu-label">
          {user.alias}
          {isCurrentUser && <span className="text-muted-foreground ml-1">(You)</span>}
          {user.is_admin && <span className="ml-1 text-amber-500">★</span>}
        </div>
        <ContextMenuSeparator />

        {/* Filter option - always visible */}
        <ContextMenuItem
          onClick={() => onFilterByUser(user.alias)}
          data-testid="avatar-context-filter"
        >
          <Eye className="mr-2 h-4 w-4" />
          Filter by {isCurrentUser ? 'my' : 'their'} cards
        </ContextMenuItem>

        {/* Edit alias - only for current user */}
        {isCurrentUser && onEditAlias && (
          <ContextMenuItem onClick={onEditAlias} data-testid="avatar-context-edit-alias">
            <Pencil className="mr-2 h-4 w-4" />
            Edit my alias
          </ContextMenuItem>
        )}

        {/* Make Admin - only for admins viewing non-admin others */}
        {showMakeAdmin && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onMakeAdmin(user.alias)}
              data-testid="avatar-context-make-admin"
            >
              <Crown className="mr-2 h-4 w-4 text-amber-500" />
              Make Admin
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default AvatarContextMenu;
