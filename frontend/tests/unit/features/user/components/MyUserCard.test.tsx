/**
 * MyUserCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyUserCard } from '@/features/user/components/MyUserCard';

describe('MyUserCard', () => {
  const defaultProps = {
    uuid: 'abc123def456ghi789',
    alias: 'TestUser',
    onUpdateAlias: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display alias prominently', () => {
      render(<MyUserCard {...defaultProps} />);

      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('should NOT display UUID in main view (Phase 8.7: moved to dialog)', () => {
      render(<MyUserCard {...defaultProps} />);

      // UUID was moved to Edit Alias dialog per Task 1.5
      // Main view should NOT show any UUID
      expect(screen.queryByText(/abc123/i)).not.toBeInTheDocument();
    });

    it('should show UUID only in the Edit Alias dialog', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      // UUID not visible before opening dialog
      expect(screen.queryByText(/abc123def456/i)).not.toBeInTheDocument();

      // Open edit dialog
      await user.click(screen.getByLabelText(/edit alias/i));

      // UUID now visible in dialog (truncated to 12 chars + ...)
      expect(screen.getByText('abc123def456...')).toBeInTheDocument();
      expect(screen.getByText('Your ID:')).toBeInTheDocument();
    });
  });

  describe('Edit Alias', () => {
    it('should show edit button on hover', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      // Hover over the card container
      const container = screen.getByText('TestUser').closest('div');
      if (container) {
        await user.hover(container);
      }

      // Edit button should be visible (opacity-100 on hover)
      expect(screen.getByLabelText(/edit alias/i)).toBeInTheDocument();
    });

    it('should open edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit alias/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit your alias/i)).toBeInTheDocument();
    });

    it('should call onUpdateAlias with new value when submitted', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit alias/i));

      // Use getByRole to find the input in the dialog
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'NewAlias');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(defaultProps.onUpdateAlias).toHaveBeenCalledWith('NewAlias');
      });
    });

    it('should not call onUpdateAlias if alias is unchanged', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit alias/i));
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(defaultProps.onUpdateAlias).not.toHaveBeenCalled();
    });

    it('should show validation error for empty alias', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit alias/i));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup();
      render(<MyUserCard {...defaultProps} />);

      await user.click(screen.getByLabelText(/edit alias/i));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
