/**
 * SortBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortBar } from '@/features/board/components/SortBar';

describe('SortBar', () => {
  const defaultProps = {
    sortMode: 'recency' as const,
    sortDirection: 'desc' as const,
    onSortModeChange: vi.fn(),
    onToggleDirection: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display "Sort by:" label', () => {
      render(<SortBar {...defaultProps} />);

      expect(screen.getByText(/sort by:/i)).toBeInTheDocument();
    });

    it('should display current sort mode as "Newest" for recency', () => {
      render(<SortBar {...defaultProps} sortMode="recency" />);

      expect(screen.getByRole('button', { name: /newest/i })).toBeInTheDocument();
    });

    it('should display current sort mode as "Popular" for popularity', () => {
      render(<SortBar {...defaultProps} sortMode="popularity" />);

      expect(screen.getByRole('button', { name: /popular/i })).toBeInTheDocument();
    });

    it('should show direction toggle button', () => {
      render(<SortBar {...defaultProps} />);

      expect(screen.getByLabelText(/sort descending/i)).toBeInTheDocument();
    });

    it('should show ascending label when direction is asc', () => {
      render(<SortBar {...defaultProps} sortDirection="asc" />);

      expect(screen.getByLabelText(/sort ascending/i)).toBeInTheDocument();
    });
  });

  describe('Sort Mode Dropdown', () => {
    it('should open dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<SortBar {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /newest/i }));

      expect(screen.getByRole('menuitem', { name: /newest/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /popular/i })).toBeInTheDocument();
    });

    it('should call onSortModeChange with "popularity" when Popular is clicked', async () => {
      const user = userEvent.setup();
      render(<SortBar {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /newest/i }));
      await user.click(screen.getByRole('menuitem', { name: /popular/i }));

      expect(defaultProps.onSortModeChange).toHaveBeenCalledWith('popularity');
    });

    it('should call onSortModeChange with "recency" when Newest is clicked', async () => {
      const user = userEvent.setup();
      render(<SortBar {...defaultProps} sortMode="popularity" />);

      await user.click(screen.getByRole('button', { name: /popular/i }));
      await user.click(screen.getByRole('menuitem', { name: /newest/i }));

      expect(defaultProps.onSortModeChange).toHaveBeenCalledWith('recency');
    });
  });

  describe('Direction Toggle', () => {
    it('should call onToggleDirection when direction button is clicked', async () => {
      const user = userEvent.setup();
      render(<SortBar {...defaultProps} />);

      await user.click(screen.getByLabelText(/sort descending/i));

      expect(defaultProps.onToggleDirection).toHaveBeenCalled();
    });
  });
});
