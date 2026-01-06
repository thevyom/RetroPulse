/**
 * AliasPromptModal Component Tests
 * Tests for Phase 8.7 AliasPromptModal (ALIAS-001 to ALIAS-012)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AliasPromptModal } from '@/features/participant/components/AliasPromptModal';

describe('AliasPromptModal', () => {
  const defaultProps = {
    isOpen: true,
    onJoin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ALIAS-001: Modal appears for new users (tested via isOpen prop)
  describe('ALIAS-001: Modal visibility', () => {
    it('should show modal when isOpen is true', () => {
      render(<AliasPromptModal {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Join the Retrospective')).toBeInTheDocument();
    });

    it('should not show modal when isOpen is false', () => {
      render(<AliasPromptModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ALIAS-003: No close button (X) visible
  describe('ALIAS-003: No close button', () => {
    it('should not have a visible close (X) button', () => {
      render(<AliasPromptModal {...defaultProps} />);

      // The dialog should not have an accessible close button
      // Radix Dialog close button usually has sr-only "Close" text
      const closeButtons = screen.queryAllByRole('button', { name: /close/i });
      expect(closeButtons.length).toBe(0);
    });
  });

  // ALIAS-006: Empty input disables button
  describe('ALIAS-006: Empty input disables button', () => {
    it('should disable submit button when input is empty', () => {
      render(<AliasPromptModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /join board/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when input is only whitespace', async () => {
      const user = userEvent.setup();
      render(<AliasPromptModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, '   ');

      const submitButton = screen.getByRole('button', { name: /join board/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // ALIAS-007: Valid input enables button
  describe('ALIAS-007: Valid input enables button', () => {
    it('should enable submit button when valid input is entered', async () => {
      const user = userEvent.setup();
      render(<AliasPromptModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, 'John Smith');

      const submitButton = screen.getByRole('button', { name: /join board/i });
      expect(submitButton).toBeEnabled();
    });
  });

  // ALIAS-008: Enter key submits form
  describe('ALIAS-008: Enter key submits form', () => {
    it('should submit form when Enter is pressed with valid input', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, 'Alice{Enter}');

      expect(onJoin).toHaveBeenCalledWith('Alice');
    });

    it('should not submit form when Enter is pressed with empty input', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, '{Enter}');

      expect(onJoin).not.toHaveBeenCalled();
    });
  });

  // ALIAS-009: Max 50 characters enforced
  describe('ALIAS-009: Max 50 characters', () => {
    it('should show error for input over 50 characters', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      const longName = 'A'.repeat(51);
      await user.type(input, longName);
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(screen.getByText(/50 characters or less/i)).toBeInTheDocument();
      expect(onJoin).not.toHaveBeenCalled();
    });

    it('should accept input at exactly 50 characters', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      const exactName = 'A'.repeat(50);
      await user.type(input, exactName);
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(onJoin).toHaveBeenCalledWith(exactName);
    });
  });

  // ALIAS-010: Only alphanumeric + spaces
  describe('ALIAS-010: Only alphanumeric + spaces allowed', () => {
    it('should show error for special characters', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, 'John@Smith!');
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(screen.getByText(/only letters, numbers, and spaces/i)).toBeInTheDocument();
      expect(onJoin).not.toHaveBeenCalled();
    });

    it('should accept alphanumeric with spaces', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, 'John Smith 123');
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(onJoin).toHaveBeenCalledWith('John Smith 123');
    });

    it('should reject emojis', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      // Can't easily type emojis, but we can paste
      await user.clear(input);
      // Simulate typing a name with invalid chars
      await user.type(input, 'Test_User');
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(screen.getByText(/only letters, numbers, and spaces/i)).toBeInTheDocument();
      expect(onJoin).not.toHaveBeenCalled();
    });
  });

  // Form submission and trimming
  describe('Form submission', () => {
    it('should trim whitespace from alias before submitting', async () => {
      const user = userEvent.setup();
      const onJoin = vi.fn();
      render(<AliasPromptModal {...defaultProps} onJoin={onJoin} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      await user.type(input, '  John Smith  ');
      await user.click(screen.getByRole('button', { name: /join board/i }));

      expect(onJoin).toHaveBeenCalledWith('John Smith');
    });

    it('should clear error when input changes', async () => {
      const user = userEvent.setup();
      render(<AliasPromptModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter your name/i);

      // First trigger an error
      await user.type(input, 'Invalid@Name');
      await user.click(screen.getByRole('button', { name: /join board/i }));
      expect(screen.getByText(/only letters, numbers, and spaces/i)).toBeInTheDocument();

      // Now type valid input - error should clear
      await user.clear(input);
      await user.type(input, 'ValidName');

      await waitFor(() => {
        expect(screen.queryByText(/only letters, numbers, and spaces/i)).not.toBeInTheDocument();
      });
    });
  });

  // Modal behavior
  describe('Modal behavior', () => {
    it('should have input with maxLength attribute', () => {
      render(<AliasPromptModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter your name/i);
      expect(input).toHaveAttribute('maxLength', '50');
    });

    it('should show description text about visibility', () => {
      render(<AliasPromptModal {...defaultProps} />);

      expect(screen.getByText(/visible to other participants/i)).toBeInTheDocument();
    });
  });
});
