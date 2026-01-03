/**
 * ParticipantAvatar Component
 * Individual avatar for a participant with filter toggle functionality.
 */

import { memo } from 'react';
import { Crown, Ghost, User, Users } from 'lucide-react';
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
        return <span className="text-xs font-semibold leading-none tracking-tight">{alias ? getInitials(alias) : '??'}</span>;
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
          className={cn(
            'relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isSelected && 'ring-2 ring-primary ring-offset-2'
          )}
          aria-label={`Filter by ${getTooltipText()}`}
          aria-pressed={isSelected}
          data-testid={type === 'user' ? `participant-avatar-${alias?.replace(/\s+/g, '-').toLowerCase()}` : `${type}-avatar`}
          data-avatar-type={type}
        >
          <Avatar
            className={cn(
              'h-8 w-8 cursor-pointer transition-opacity hover:opacity-80',
              type === 'all' && 'bg-primary text-primary-foreground',
              type === 'anonymous' && 'bg-muted text-muted-foreground',
              type === 'me' && 'bg-blue-500 text-white',
              type === 'user' && 'bg-accent text-accent-foreground'
            )}
          >
            <AvatarFallback className="bg-inherit text-inherit">{renderContent()}</AvatarFallback>
          </Avatar>

          {/* Admin Crown */}
          {isAdmin && type === 'user' && (
            <Crown
              className="absolute -right-1 -top-1 h-3 w-3 text-yellow-500"
              aria-label="Admin"
            />
          )}

          {/* Online/Offline Presence Indicator */}
          {type === 'user' && isOnline !== undefined && (
            <span
              className={cn(
                'absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background',
                isOnline ? 'bg-green-500' : 'bg-gray-400'
              )}
              aria-label={isOnline ? 'Online' : 'Offline'}
              data-testid={`presence-indicator-${alias?.replace(/\s+/g, '-').toLowerCase()}`}
            />
          )}
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
