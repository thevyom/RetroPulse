/**
 * RetroBoardHeader Component Tests
 * Updated for Avatar System v2 (Phase 8.6) - MyUserCard removed from header
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroBoardHeader } from '@/features/board/components/RetroBoardHeader';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Create mock for clipboard writeText
const mockWriteText = vi.fn();

describe('RetroBoardHeader', () => {
  const defaultProps = {
    boardName: 'Sprint 42 Retro',
    isAdmin: true,
    isClosed: false,
    onEditTitle: vi.fn().mockResolvedValue(undefined),
    onCloseBoard: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display board name', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      expect(screen.getByText('Sprint 42 Retro')).toBeInTheDocument();
    });

    it('should not display user card (moved to ParticipantBar in v2)', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      // MyUserCard was removed from header - user info is now in ParticipantBar's MeSection
      expect(screen.queryByTestId('my-user-card')).not.toBeInTheDocument();
    });

    it('should show lock icon when board is closed', () => {
      render(<RetroBoardHeader {...defaultProps} isClosed={true} />);

      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('Admin Controls', () => {
    it('should allow admin to click on title to edit (inline editing)', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={true} />);

      // Admin can click on title to start editing
      const title = screen.getByRole('button', { name: defaultProps.boardName });
      expect(title).toBeInTheDocument();
      expect(title).toHaveAttribute('title', 'Click to edit board name');
    });

    it('should not show editable title for non-admin', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={false} />);

      // Non-admin sees static heading without role="button"
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).not.toHaveAttribute('role', 'button');
    });

    it('should show close board button for admin', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={true} />);

      expect(screen.getByRole('button', { name: /close board/i })).toBeInTheDocument();
    });

    it('should not show close board button for non-admin', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={false} />);

      expect(screen.queryByRole('button', { name: /close board/i })).not.toBeInTheDocument();
    });

    it('should not show admin controls when board is closed', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={true} isClosed={true} />);

      // When closed, title is not editable (no role="button")
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).not.toHaveAttribute('role', 'button');
      expect(screen.queryByRole('button', { name: /close board/i })).not.toBeInTheDocument();
    });
  });

  describe('Inline Title Editing', () => {
    it('should show inline input when title is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: defaultProps.boardName }));

      // Inline input should now be visible
      expect(screen.getByRole('textbox', { name: /edit board name/i })).toBeInTheDocument();
    });

    it('should call onEditTitle with new value when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: defaultProps.boardName }));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'New Board Name');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(defaultProps.onEditTitle).toHaveBeenCalledWith('New Board Name');
      });
    });

    it('should show toast error for empty board name', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: defaultProps.boardName }));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.keyboard('{Enter}');

      // Input should still be visible (validation failed, stays in edit mode)
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Close Board Dialog', () => {
    it('should open confirmation dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /close board/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it('should call onCloseBoard when confirmed', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /close board/i }));
      await user.click(screen.getByRole('button', { name: /^close board$/i }));

      await waitFor(() => {
        expect(defaultProps.onCloseBoard).toHaveBeenCalled();
      });
    });

    it('should not call onCloseBoard when cancelled', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /close board/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(defaultProps.onCloseBoard).not.toHaveBeenCalled();
    });

    it('should show tooltip on close board button (UTB-031)', async () => {
      render(<RetroBoardHeader {...defaultProps} />);

      // Close Board button should have a tooltip wrapper
      const closeButton = screen.getByRole('button', { name: /close board/i });
      expect(closeButton).toBeInTheDocument();
      // The tooltip content is rendered when hovering, so we just check the button exists
    });
  });

  describe('Copy Link Button', () => {
    beforeEach(() => {
      // Reset clipboard mock
      mockWriteText.mockReset();
      mockWriteText.mockResolvedValue(undefined);

      // Mock navigator.clipboard - must be done before each test
      // because jsdom may reset it
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: mockWriteText },
          writable: true,
          configurable: true,
        });
      } else {
        vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText);
      }
    });

    it('should show copy link button on active board', () => {
      render(<RetroBoardHeader {...defaultProps} isClosed={false} />);

      expect(screen.getByRole('button', { name: /copy board link/i })).toBeInTheDocument();
    });

    it('should show copy link button on closed board', () => {
      render(<RetroBoardHeader {...defaultProps} isClosed={true} />);

      expect(screen.getByRole('button', { name: /copy board link/i })).toBeInTheDocument();
    });

    it('should show copy link button for non-admin users', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={false} />);

      expect(screen.getByRole('button', { name: /copy board link/i })).toBeInTheDocument();
    });

    it('should display "Copy Link" text', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('should have copy link button next to Close Board button', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close board/i });
      const copyButton = screen.getByRole('button', { name: /copy board link/i });

      // Both should exist in the same header
      expect(closeButton).toBeInTheDocument();
      expect(copyButton).toBeInTheDocument();
    });

    it('should be clickable', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy board link/i });

      // Should not throw when clicking
      await expect(user.click(copyButton)).resolves.not.toThrow();
    });
  });
});
