/**
 * RetroBoardHeader Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroBoardHeader } from '@/features/board/components/RetroBoardHeader';

// Mock user session
const mockCurrentUser = {
  cookie_hash: 'user-hash-123',
  alias: 'TestUser',
  is_admin: true,
  last_active_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
};

describe('RetroBoardHeader', () => {
  const defaultProps = {
    boardName: 'Sprint 42 Retro',
    isAdmin: true,
    isClosed: false,
    currentUser: mockCurrentUser,
    onEditTitle: vi.fn().mockResolvedValue(undefined),
    onCloseBoard: vi.fn().mockResolvedValue(undefined),
    onUpdateAlias: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display board name', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      expect(screen.getByText('Sprint 42 Retro')).toBeInTheDocument();
    });

    it('should display current user card when user is logged in', () => {
      render(<RetroBoardHeader {...defaultProps} />);

      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('should show lock icon when board is closed', () => {
      render(<RetroBoardHeader {...defaultProps} isClosed={true} />);

      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('Admin Controls', () => {
    it('should show edit button for admin', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={true} />);

      expect(screen.getByLabelText(/edit board name/i)).toBeInTheDocument();
    });

    it('should not show edit button for non-admin', () => {
      render(<RetroBoardHeader {...defaultProps} isAdmin={false} />);

      expect(screen.queryByLabelText(/edit board name/i)).not.toBeInTheDocument();
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

      expect(screen.queryByLabelText(/edit board name/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /close board/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit Title Dialog', () => {
    it('should open edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit board name/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit board name/i)).toBeInTheDocument();
    });

    it('should call onEditTitle with new value when submitted', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit board name/i));

      // Use role to get the input in the dialog
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'New Board Name');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(defaultProps.onEditTitle).toHaveBeenCalledWith('New Board Name');
      });
    });

    it('should show validation error for empty board name', async () => {
      const user = userEvent.setup();
      render(<RetroBoardHeader {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit board name/i));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
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
  });
});
