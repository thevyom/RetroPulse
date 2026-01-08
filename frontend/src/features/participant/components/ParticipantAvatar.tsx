/**
 * ParticipantAvatar Component
 * Individual avatar for a participant with filter toggle functionality.
 */

/* eslint-disable react-refresh/only-export-components */
import { memo } from 'react';
import { Ghost, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type AvatarType = 'user' | 'all' | 'anonymous' | 'me';

export interface ParticipantAvatarProps {
  type: AvatarType;
  alias?: string;
  isAdmin?: boolean;
  isSelected?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts initials from an alias.
 * - Single word: first two letters uppercase ("John" -> "JO")
 * - Multiple words: first letter of first + first letter of last word ("John A. Smith" -> "JS")
 */
export function getInitials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return '??';

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return '??';
  }

  if (words.length === 1) {
    // Single word: first two letters
    return words[0].slice(0, 2).toUpperCase();
  }

  // Multiple words: first letter of first word + first letter of last word
  const firstInitial = words[0][0];
  const lastInitial = words[words.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export const ParticipantAvatar = memo(function ParticipantAvatar({
  type,
  alias,
  isAdmin = false,
  isSelected = false,
  isOnline,
  onClick,
}: ParticipantAvatarProps) {
  const renderContent = () => {
    switch (type) {
      case 'all':
        return <Users className="h-4 w-4" />;
      case 'anonymous':
        return <Ghost className="h-4 w-4" />;
      case 'me':
        return <User className="h-4 w-4" />;
      case 'user':
      default:
        return (
          <span className="text-sm font-semibold leading-none tracking-tight">
            {alias ? getInitials(alias) : '??'}
          </span>
        );
    }
  };

  const getTooltipText = () => {
    switch (type) {
      case 'all':
        return 'All Users';
      case 'anonymous':
        return 'Anonymous Cards';
      case 'me':
        return 'My Cards';
      case 'user':
      default:
        return alias || 'Unknown User';
    }
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={`Filter by ${getTooltipText()}`}
          aria-pressed={isSelected}
          data-testid={
            type === 'user'
              ? `participant-avatar-${alias?.replace(/\s+/g, '-').toLowerCase()}`
              : `${type}-avatar`
          }
          data-avatar-type={type}
        >
          <Avatar
            className={cn(
              // Override base Avatar's overflow-hidden to allow ring/scale to show
              'h-9 w-9 cursor-pointer transition-all hover:opacity-80 overflow-visible',
              // Filter button styles (all, anonymous, me)
              type === 'all' && 'bg-primary text-primary-foreground',
              type === 'anonymous' && 'bg-muted text-muted-foreground',
              type === 'me' && 'bg-blue-500 text-white',
              // User avatar styles - background based on admin + online status
              type === 'user' && isAdmin && isOnline && 'bg-amber-400 text-gray-800',
              type === 'user' && isAdmin && !isOnline && 'bg-amber-200 text-gray-700',
              type === 'user' && !isAdmin && isOnline && 'bg-blue-500 text-white',
              type === 'user' && !isAdmin && !isOnline && 'bg-gray-300 text-gray-600',
              // Ring for online status (only for user type)
              type === 'user' && isOnline && 'ring-2 ring-green-500',
              // Selection state - thicker ring + scale (overrides online ring)
              isSelected && 'ring-[3px] ring-primary scale-110'
            )}
          >
            <AvatarFallback className="bg-inherit text-inherit">{renderContent()}</AvatarFallback>
          </Avatar>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {getTooltipText()}
          {isAdmin && type === 'user' && ' (Admin)'}
          {type === 'user' && isOnline !== undefined && (isOnline ? ' - Online' : ' - Offline')}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

export default ParticipantAvatar;
