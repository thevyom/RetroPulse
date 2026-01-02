/**
 * ParticipantAvatar Component Tests
 * Tests for UTB-021 (getInitials) and UTB-022 (tooltip)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ParticipantAvatar,
  getInitials,
} from '@/features/participant/components/ParticipantAvatar';

// Helper to wrap component with TooltipProvider
function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// ============================================================================
// UTB-021: getInitials function tests
// ============================================================================

describe('getInitials', () => {
  describe('single word names', () => {
    it('should return first two letters uppercase for single word', () => {
      expect(getInitials('John')).toBe('JO');
    });

    it('should return first two letters uppercase for lowercase name', () => {
      expect(getInitials('alice')).toBe('AL');
    });

    it('should handle single character name', () => {
      expect(getInitials('A')).toBe('A');
    });

    it('should handle two character name', () => {
      expect(getInitials('Jo')).toBe('JO');
    });
  });

  describe('multiple word names', () => {
    it('should return first letter of first and last word for two words', () => {
      expect(getInitials('John Smith')).toBe('JS');
    });

    it('should return first letter of first and last word for three words', () => {
      expect(getInitials('John A. Smith')).toBe('JS');
    });

    it('should return first letter of first and last word for four words', () => {
      expect(getInitials('Mary Jane Watson Parker')).toBe('MP');
    });

    it('should handle lowercase multi-word names', () => {
      expect(getInitials('john smith')).toBe('JS');
    });

    it('should handle mixed case multi-word names', () => {
      expect(getInitials('john SMITH')).toBe('JS');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(getInitials('')).toBe('??');
    });

    it('should handle whitespace only', () => {
      expect(getInitials('   ')).toBe('??');
    });

    it('should handle extra whitespace between words', () => {
      expect(getInitials('John    Smith')).toBe('JS');
    });

    it('should handle leading/trailing whitespace', () => {
      expect(getInitials('  John Smith  ')).toBe('JS');
    });

    it('should handle tabs and newlines', () => {
      expect(getInitials('John\t\nSmith')).toBe('JS');
    });

    it('should handle names with middle initials and periods', () => {
      expect(getInitials('John Q. Public')).toBe('JP');
    });
  });
});

// ============================================================================
// UTB-022: Tooltip tests
// ============================================================================

describe('ParticipantAvatar', () => {
  describe('tooltip functionality', () => {
    it('should show full alias in tooltip for user type', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ParticipantAvatar type="user" alias="John Smith" />);

      const avatar = screen.getByRole('button', { name: /filter by john smith/i });
      await user.hover(avatar);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('John Smith');
      });
    });

    it('should show "All Users" in tooltip for all type', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ParticipantAvatar type="all" />);

      const avatar = screen.getByRole('button', { name: /filter by all users/i });
      await user.hover(avatar);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('All Users');
      });
    });

    it('should show "Anonymous Cards" in tooltip for anonymous type', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ParticipantAvatar type="anonymous" />);

      const avatar = screen.getByRole('button', { name: /filter by anonymous/i });
      await user.hover(avatar);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Anonymous Cards');
      });
    });

    it('should show "(Admin)" suffix for admin users', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" isAdmin={true} />);

      const avatar = screen.getByRole('button', { name: /filter by alice/i });
      await user.hover(avatar);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Alice (Admin)');
      });
    });

    it('should show "Unknown User" when alias is not provided', async () => {
      const user = userEvent.setup();
      renderWithProvider(<ParticipantAvatar type="user" />);

      const avatar = screen.getByRole('button', { name: /filter by unknown user/i });
      await user.hover(avatar);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Unknown User');
      });
    });
  });

  describe('initials display', () => {
    it('should display correct initials for single word name', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" />);

      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('should display correct initials for two word name', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="John Smith" />);

      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should display correct initials for three word name', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="John A. Smith" />);

      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should display ?? for missing alias', () => {
      renderWithProvider(<ParticipantAvatar type="user" />);

      expect(screen.getByText('??')).toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('selection state', () => {
    it('should have aria-pressed true when selected', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" isSelected={true} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed false when not selected', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" isSelected={false} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('admin indicator', () => {
    it('should show crown icon for admin users', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" isAdmin={true} />);

      expect(screen.getByLabelText('Admin')).toBeInTheDocument();
    });

    it('should not show crown icon for non-admin users', () => {
      renderWithProvider(<ParticipantAvatar type="user" alias="Alice" isAdmin={false} />);

      expect(screen.queryByLabelText('Admin')).not.toBeInTheDocument();
    });
  });
});
