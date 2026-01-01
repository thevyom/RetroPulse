/**
 * SortBar Component
 * Controls for sorting cards by recency or popularity.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SortMode, SortDirection } from '../../card/viewmodels/useCardViewModel';

// ============================================================================
// Types
// ============================================================================

export interface SortBarProps {
  sortMode: SortMode;
  sortDirection: SortDirection;
  onSortModeChange: (mode: SortMode) => void;
  onToggleDirection: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const sortModeLabels: Record<SortMode, string> = {
  recency: 'Newest',
  popularity: 'Popular',
};

// ============================================================================
// Component
// ============================================================================

export function SortBar({
  sortMode,
  sortDirection,
  onSortModeChange,
  onToggleDirection,
}: SortBarProps) {
  const DirectionIcon = sortDirection === 'desc' ? ArrowDown : ArrowUp;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort by:</span>

      {/* Sort Mode Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[100px]">
            {sortModeLabels[sortMode]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onSortModeChange('recency')}
            className={sortMode === 'recency' ? 'bg-accent' : ''}
          >
            Newest
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSortModeChange('popularity')}
            className={sortMode === 'popularity' ? 'bg-accent' : ''}
          >
            Popular
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Direction Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onToggleDirection}
        aria-label={`Sort ${sortDirection === 'desc' ? 'descending' : 'ascending'}`}
        title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
      >
        <DirectionIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default SortBar;
