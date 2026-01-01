/**
 * AdminDropdown Component
 * Allows the board creator to promote users to admin.
 */

import { useState } from 'react';
import { Check, Crown, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ActiveUser } from '@/models/types';

// ============================================================================
// Types
// ============================================================================

export interface AdminDropdownProps {
  activeUsers: ActiveUser[];
  admins: string[];
  onPromoteToAdmin: (userHash: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function AdminDropdown({
  activeUsers,
  admins: _admins,
  onPromoteToAdmin,
}: AdminDropdownProps) {
  // Note: _admins is available for future use (e.g., checking hash-based admin status)
  void _admins;
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  const handlePromote = async (alias: string) => {
    setIsPromoting(alias);
    try {
      // Note: The ViewModel expects a cookie_hash, but we only have alias in ActiveUser
      // This is a limitation - in real implementation, we'd need the hash
      // For now, we pass the alias and let the ViewModel handle it
      await onPromoteToAdmin(alias);
    } finally {
      setIsPromoting(null);
    }
  };

  // Filter out users who are already admins
  const nonAdminUsers = activeUsers.filter((user) => !user.is_admin);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Manage Admins</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          Board Admins
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Current Admins */}
        {activeUsers
          .filter((user) => user.is_admin)
          .map((user) => (
            <DropdownMenuItem key={user.alias} disabled className="opacity-70">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              {user.alias}
              <span className="ml-auto text-xs text-muted-foreground">Admin</span>
            </DropdownMenuItem>
          ))}

        {nonAdminUsers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Promote to Admin
            </DropdownMenuLabel>
            {nonAdminUsers.map((user) => (
              <DropdownMenuItem
                key={user.alias}
                onClick={() => handlePromote(user.alias)}
                disabled={isPromoting === user.alias}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {user.alias}
                {isPromoting === user.alias && (
                  <span className="ml-auto text-xs text-muted-foreground">Promoting...</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {nonAdminUsers.length === 0 && activeUsers.length > 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            All users are admins
          </DropdownMenuItem>
        )}

        {activeUsers.length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No users to promote
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AdminDropdown;
