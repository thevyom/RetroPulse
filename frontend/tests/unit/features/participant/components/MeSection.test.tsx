/**
 * MeSection Component Tests
 * Tests for Phase 8.7 MeSection (ME-001 to ME-009)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeSection } from '@/features/participant/components/MeSection';

describe('MeSection', () => {
  const defaultProps = {
    alias: 'John Smith',
    isAdmin: false,
    isSelected: false,
    onFilter: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ME-001: MeSection shows avatar only (no text label)
  describe('ME-001: Avatar only display', () => {
    it('should show initials, not full alias text', () => {
      render(<MeSection {...defaultProps} />);

      // Should show initials
      expect(screen.getByText('JS')).toBeInTheDocument();
      // Should NOT show full alias as visible text (only in title)
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });
  });

  // ME-002: No pencil/edit icon visible
  describe('ME-002: No pencil icon', () => {
    it('should not have any edit/pencil icon', () => {
      render(<MeSection {...defaultProps} />);

      // No pencil icon should be present
      expect(screen.queryByLabelText(/edit/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  // ME-005: Avatar shows current user initials
  describe('ME-005: Initials display', () => {
    it('should show first and last initials for two-word name', () => {
      render(<MeSection {...defaultProps} alias="John Smith" />);
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should show first two letters for single-word name', () => {
      render(<MeSection {...defaultProps} alias="Alice" />);
      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('should show first and last initials for multi-word name', () => {
      render(<MeSection {...defaultProps} alias="Mary Jane Watson" />);
      expect(screen.getByText('MW')).toBeInTheDocument();
    });

    it('should handle single character name', () => {
      render(<MeSection {...defaultProps} alias="X" />);
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  // ME-006: Gold fill if current user is admin
  describe('ME-006: Admin color (gold fill)', () => {
    it('should have gold/amber background for admin', () => {
      render(<MeSection {...defaultProps} isAdmin={true} />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveClass('bg-amber-400');
    });

    it('should have blue background for non-admin', () => {
      render(<MeSection {...defaultProps} isAdmin={false} />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveClass('bg-blue-500');
    });
  });

  // ME-007: Green ring always present (user is always online to themselves)
  describe('ME-007: Green ring always present', () => {
    it('should always have green ring for online indicator', () => {
      render(<MeSection {...defaultProps} />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveClass('ring-2');
      expect(button).toHaveClass('ring-green-500');
    });

    it('should have green ring even for admin', () => {
      render(<MeSection {...defaultProps} isAdmin={true} />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveClass('ring-green-500');
    });
  });

  // ME-008: Click avatar filters to own cards
  describe('ME-008: Click filters to own cards', () => {
    it('should call onFilter when clicked', async () => {
      const user = userEvent.setup();
      const onFilter = vi.fn();
      render(<MeSection {...defaultProps} onFilter={onFilter} />);

      await user.click(screen.getByTestId('me-section'));

      expect(onFilter).toHaveBeenCalledTimes(1);
    });
  });

  // ME-009: Tooltip shows full alias
  describe('ME-009: Tooltip shows full alias', () => {
    it('should have title attribute with full alias and (You) indicator', () => {
      render(<MeSection {...defaultProps} alias="John Smith" />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveAttribute('title', 'John Smith (You) - Click to filter');
    });
  });

  // Selection state (related to ME-007/ME-010)
  describe('Selection state', () => {
    it('should have thicker ring and scale when selected', () => {
      render(<MeSection {...defaultProps} isSelected={true} />);

      const button = screen.getByTestId('me-section');
      expect(button).toHaveClass('ring-[3px]');
      expect(button).toHaveClass('scale-110');
    });

    it('should not have selection classes when not selected', () => {
      render(<MeSection {...defaultProps} isSelected={false} />);

      const button = screen.getByTestId('me-section');
      expect(button).not.toHaveClass('scale-110');
    });
  });
});
