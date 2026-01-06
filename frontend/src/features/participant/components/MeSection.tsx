/**
 * MeSection Component
 * Shows the current user's avatar in the ParticipantBar.
 * Part of the filter group on the right side of ParticipantBar.
 *
 * Design: Avatar only - no label, no pencil icon (per UTB-033)
 * Edit alias functionality moved to context menu (Task 2.1)
 */

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface MeSectionProps {
  alias: string;
  isAdmin: boolean;
  isSelected: boolean;
  onFilter: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MeSection({ alias, isAdmin, isSelected, onFilter }: MeSectionProps) {
  const initials = alias
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onFilter}
      className={cn(
        'h-9 w-9 rounded-full flex items-center justify-center',
        'text-sm font-semibold transition-all',
        // Always online (it's the current user)
        isAdmin ? 'bg-amber-400 text-gray-800' : 'bg-blue-500 text-white',
        'ring-2 ring-green-500',
        // Selection state
        isSelected && 'ring-[3px] ring-primary scale-110',
        'hover:scale-105'
      )}
      title={`${alias} (You) - Click to filter`}
      data-testid="me-section"
    >
      {initials}
    </button>
  );
}

export default MeSection;
