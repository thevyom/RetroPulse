/**
 * MeSection Component
 * Shows the current user's identity with avatar-style display.
 * Part of the filter group (All, Anon, Me) on the left side of ParticipantBar.
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pencil } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface MeSectionProps {
  alias: string;
  isAdmin: boolean;
  isSelected?: boolean;
  onFilter: () => void;
  onEditAlias: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts initials from an alias.
 * - Single word: first two letters uppercase ("John" -> "JO")
 * - Multiple words: first letter of first + first letter of last word ("John Smith" -> "JS")
 */
function getInitials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return '??';

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return '??';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const firstInitial = words[0][0];
  const lastInitial = words[words.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export function MeSection({ alias, isAdmin, isSelected = false, onFilter, onEditAlias }: MeSectionProps) {
  const initials = getInitials(alias);

  return (
    <div className="flex items-center gap-2" data-testid="me-section">
      {/* Avatar */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={onFilter}
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center',
              'text-sm font-semibold transition-all',
              // Admin status (fill color)
              isAdmin ? 'bg-amber-400 text-gray-800' : 'bg-accent text-accent-foreground',
              // Always online (it's you) - green ring
              'ring-2 ring-green-500',
              // Selected state - add visual indicator
              isSelected && 'ring-offset-2 ring-offset-primary',
              'hover:scale-105 cursor-pointer',
              'focus:outline-none focus:ring-offset-2'
            )}
            title="Filter to my cards"
            aria-label="Filter to my cards"
            aria-pressed={isSelected}
            data-testid="me-avatar"
          >
            {initials}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filter to my cards</p>
        </TooltipContent>
      </Tooltip>

      {/* Alias + Edit */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium" data-testid="me-alias">
          {alias}
        </span>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onEditAlias}
              aria-label="Edit alias"
              data-testid="edit-alias-button"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit alias</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default MeSection;
