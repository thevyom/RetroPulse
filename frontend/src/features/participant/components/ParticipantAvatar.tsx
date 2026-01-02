/**
 * ParticipantAvatar Component
 * Individual avatar for a participant with filter toggle functionality.
 */

import { memo } from 'react';
import { Crown, Ghost, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type AvatarType = 'user' | 'all' | 'anonymous';

export interface ParticipantAvatarProps {
  type: AvatarType;
  alias?: string;
  isAdmin?: boolean;
  isSelected?: boolean;
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
  onClick,
}: ParticipantAvatarProps) {
  const renderContent = () => {
    switch (type) {
      case 'all':
        return <Users className="h-4 w-4" />;
      case 'anonymous':
        return <Ghost className="h-4 w-4" />;
      case 'user':
      default:
        return <span className="text-xs font-medium">{alias ? getInitials(alias) : '??'}</span>;
    }
  };

  const getTooltipText = () => {
    switch (type) {
      case 'all':
        return 'All Users';
      case 'anonymous':
        return 'Anonymous Cards';
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
        >
          <Avatar
            className={cn(
              'h-8 w-8 cursor-pointer transition-opacity hover:opacity-80',
              type === 'all' && 'bg-primary text-primary-foreground',
              type === 'anonymous' && 'bg-muted text-muted-foreground',
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
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {getTooltipText()}
          {isAdmin && type === 'user' && ' (Admin)'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

export default ParticipantAvatar;
