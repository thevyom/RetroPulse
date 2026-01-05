/**
 * AvatarContextMenu Component
 * Right-click context menu for participant avatars.
 * Provides filter and admin management actions.
 * Supports long-press on touch devices (Task 3.3).
 */

import { useState, useRef, useCallback } from 'react';
import { Eye, Crown } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// Long-press threshold in milliseconds
const LONG_PRESS_DURATION = 500;

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

  // Long-press state for touch devices (Task 3.3)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPressRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsMenuOpen(true);
      // Prevent text selection and other default behaviors
      e.preventDefault();
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimer();
    if (!isLongPressRef.current) {
      // Normal tap - trigger filter action
      onFilterByUser(user.alias);
    }
    // Reset for next interaction
    touchStartPosRef.current = null;
  }, [clearTimer, onFilterByUser, user.alias]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long-press if user moves finger significantly (>10px)
    if (touchStartPosRef.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimer();
        touchStartPosRef.current = null;
      }
    }
  }, [clearTimer]);

  return (
    <ContextMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <ContextMenuTrigger
        asChild
        data-testid={`avatar-context-trigger-${user.alias.replace(/\s+/g, '-').toLowerCase()}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
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
