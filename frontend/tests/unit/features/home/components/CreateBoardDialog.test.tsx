/**
 * CreateBoardDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreateBoardDialog } from '@/features/home/components/CreateBoardDialog';

// Mock the useCreateBoardViewModel hook
const mockCreateBoard = vi.fn();
vi.mock('@/features/home/viewmodels/useCreateBoardViewModel', () => ({
  useCreateBoardViewModel: () => ({
    isCreating: false,
    error: null,
    createBoard: mockCreateBoard,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderDialog = (props = {}) => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <BrowserRouter>
        <CreateBoardDialog {...defaultProps} />
      </BrowserRouter>
    ),
    props: defaultProps,
  };
};

describe('CreateBoardDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBoard.mockResolvedValue({ id: 'new-board-id', name: 'Test Board' });
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      renderDialog();
      expect(screen.getByTestId('create-board-dialog')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      renderDialog({ open: false });
      expect(screen.queryByTestId('create-board-dialog')).not.toBeInTheDocument();
    });

    it('should display dialog title', () => {
      renderDialog();
      expect(screen.getByText('Create New Board')).toBeInTheDocument();
    });

    it('should display dialog description', () => {
      renderDialog();
      expect(
        screen.getByText(/give your retrospective board a name/i)
      ).toBeInTheDocument();
    });

    it('should display board name input', () => {
      renderDialog();
      expect(screen.getByTestId('board-name-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/sprint 42 retrospective/i)).toBeInTheDocument();
    });

    it('should display default column previews', () => {
      renderDialog();
      expect(screen.getByText('Default columns:')).toBeInTheDocument();
      expect(screen.getByText('What Went Well')).toBeInTheDocument();
      expect(screen.getByText('To Improve')).toBeInTheDocument();
      expect(screen.getByText('Action Items')).toBeInTheDocument();
    });

    it('should display Cancel and Create Board buttons', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByTestId('submit-create-board')).toBeInTheDocument();
      expect(screen.getByTestId('submit-create-board')).toHaveTextContent('Create Board');
    });

    it('should disable Create Board button when input is empty', () => {
      renderDialog();
      const submitButton = screen.getByTestId('submit-create-board');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should enable submit button when board name is entered', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');

      expect(screen.getByTestId('submit-create-board')).not.toBeDisabled();
    });

    it('should show validation error for board name exceeding max length', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      const longName = 'a'.repeat(100); // Exceeds 75 char limit
      // Use fireEvent or direct value setting for long strings to avoid timeout
      await user.clear(input);
      // Simulate paste-like behavior for long input
      input.focus();
      await user.paste(longName);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toBeInTheDocument();
      });
    });

    it('should clear error when user types', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      const longName = 'a'.repeat(100);
      // Use paste for long input
      input.focus();
      await user.paste(longName);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, 'Valid Name');

      expect(screen.queryByTestId('board-name-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call createBoard with correct data on submit', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith({
          name: 'My Retro Board',
          columns: [
            { name: 'What Went Well', color: '#22c55e' },
            { name: 'To Improve', color: '#f97316' },
            { name: 'Action Items', color: '#3b82f6' },
          ],
          card_limit_per_user: null,
          reaction_limit_per_user: null,
        });
      });
    });

    it('should navigate to new board on success', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/boards/new-board-id');
      });
    });

    it('should close dialog on success', async () => {
      const user = userEvent.setup();
      const { props } = renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(props.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show error when API fails', async () => {
      mockCreateBoard.mockRejectedValue(new Error('API Error'));
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toHaveTextContent('API Error');
      });
    });

    it('should not navigate on API error', async () => {
      mockCreateBoard.mockRejectedValue(new Error('API Error'));
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'My Retro Board');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Controls', () => {
    it('should close dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const { props } = renderDialog();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should reset form when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { props, rerender } = renderDialog();

      const input = screen.getByTestId('board-name-input');
      await user.type(input, 'Some board name');

      // Close dialog
      rerender(
        <BrowserRouter>
          <CreateBoardDialog open={false} onOpenChange={props.onOpenChange} />
        </BrowserRouter>
      );

      // Reopen dialog
      rerender(
        <BrowserRouter>
          <CreateBoardDialog open={true} onOpenChange={props.onOpenChange} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('board-name-input')).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderDialog();
      expect(screen.getByLabelText(/board name/i)).toBeInTheDocument();
    });

    it('should mark input as invalid when error exists', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      const longName = 'a'.repeat(100);
      input.focus();
      await user.paste(longName);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have error message linked to input', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      const longName = 'a'.repeat(100);
      input.focus();
      await user.paste(longName);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-describedby', 'board-name-error');
      });
    });

    it('should have role alert on error message', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByTestId('board-name-input');
      const longName = 'a'.repeat(100);
      input.focus();
      await user.paste(longName);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
