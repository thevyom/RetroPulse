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

    it('should display column customization section with default columns', () => {
      renderDialog();
      expect(screen.getByTestId('column-customization')).toBeInTheDocument();
      expect(screen.getByText('Columns:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('What Went Well')).toBeInTheDocument();
      expect(screen.getByDisplayValue('To Improve')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Action Items')).toBeInTheDocument();
    });

    it('should display Cancel and Create Board buttons', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByTestId('submit-create-board')).toBeInTheDocument();
      expect(screen.getByTestId('submit-create-board')).toHaveTextContent('Create Board');
    });

    it('should disable Create Board button when inputs are empty', () => {
      renderDialog();
      const submitButton = screen.getByTestId('submit-create-board');
      expect(submitButton).toBeDisabled();
    });

    it('should display creator alias input', () => {
      renderDialog();
      expect(screen.getByTestId('creator-alias-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/john/i)).toBeInTheDocument();
    });

    it('should display Your Name label', () => {
      renderDialog();
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should enable submit button when board name and alias are entered', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');

      expect(screen.getByTestId('submit-create-board')).not.toBeDisabled();
    });

    it('should keep submit disabled when only board name is entered', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      await user.type(boardNameInput, 'My Retro Board');

      expect(screen.getByTestId('submit-create-board')).toBeDisabled();
    });

    it('should keep submit disabled when only alias is entered', async () => {
      const user = userEvent.setup();
      renderDialog();

      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(aliasInput, 'John');

      expect(screen.getByTestId('submit-create-board')).toBeDisabled();
    });

    it('should show validation error for board name exceeding max length', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longName = 'a'.repeat(100); // Exceeds 75 char limit
      // Use fireEvent or direct value setting for long strings to avoid timeout
      await user.clear(boardNameInput);
      // Simulate paste-like behavior for long input
      boardNameInput.focus();
      await user.paste(longName);
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toBeInTheDocument();
      });
    });

    it('should show validation error for alias exceeding max length', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longAlias = 'a'.repeat(35); // Exceeds 30 char limit
      await user.type(boardNameInput, 'Valid Board');
      aliasInput.focus();
      await user.paste(longAlias);
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('creator-alias-error')).toBeInTheDocument();
      });
    });

    it('should show validation error for alias with invalid characters', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Valid Board');
      await user.type(aliasInput, 'User@#$%');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('creator-alias-error')).toBeInTheDocument();
      });
    });

    it('should clear board name error when user types', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longName = 'a'.repeat(100);
      // Use paste for long input
      boardNameInput.focus();
      await user.paste(longName);
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toBeInTheDocument();
      });

      await user.clear(boardNameInput);
      await user.type(boardNameInput, 'Valid Name');

      expect(screen.queryByTestId('board-name-error')).not.toBeInTheDocument();
    });

    it('should clear alias error when user types', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Valid Board');
      await user.type(aliasInput, 'User@#$%');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('creator-alias-error')).toBeInTheDocument();
      });

      await user.clear(aliasInput);
      await user.type(aliasInput, 'ValidAlias');

      expect(screen.queryByTestId('creator-alias-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call createBoard with correct data on submit', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith({
          name: 'My Retro Board',
          columns: [
            { id: 'col-1', name: 'What Went Well', type: 'feedback', color: '#22c55e' },
            { id: 'col-2', name: 'To Improve', type: 'feedback', color: '#f97316' },
            { id: 'col-3', name: 'Action Items', type: 'action', color: '#3b82f6' },
          ],
          card_limit_per_user: null,
          reaction_limit_per_user: null,
          creator_alias: 'John',
        });
      });
    });

    it('should navigate to new board on success', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/boards/new-board-id');
      });
    });

    it('should close dialog on success', async () => {
      const user = userEvent.setup();
      const { props } = renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(props.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show error when API fails', async () => {
      mockCreateBoard.mockRejectedValue(new Error('API Error'));
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByTestId('board-name-error')).toHaveTextContent('API Error');
      });
    });

    it('should not navigate on API error', async () => {
      mockCreateBoard.mockRejectedValue(new Error('API Error'));
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Retro Board');
      await user.type(aliasInput, 'John');
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

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Some board name');
      await user.type(aliasInput, 'John');

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
      expect(screen.getByTestId('creator-alias-input')).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderDialog();
      expect(screen.getByLabelText(/board name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    });

    it('should mark board name input as invalid when error exists', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longName = 'a'.repeat(100);
      boardNameInput.focus();
      await user.paste(longName);
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(boardNameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should mark alias input as invalid when error exists', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Valid Board');
      await user.type(aliasInput, 'User@#$%');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(aliasInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have error message linked to board name input', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longName = 'a'.repeat(100);
      boardNameInput.focus();
      await user.paste(longName);
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(boardNameInput).toHaveAttribute('aria-describedby', 'board-name-error');
      });
    });

    it('should have error message linked to alias input', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Valid Board');
      await user.type(aliasInput, 'User@#$%');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(aliasInput).toHaveAttribute('aria-describedby', 'creator-alias-error');
      });
    });

    it('should have role alert on error message', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      const longName = 'a'.repeat(100);
      boardNameInput.focus();
      await user.paste(longName);
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Column Customization (UTB-005)', () => {
    it('should allow editing column name inline', async () => {
      const user = userEvent.setup();
      renderDialog();

      const columnInput = screen.getByTestId('column-input-col-1');
      await user.clear(columnInput);
      await user.type(columnInput, 'Wins');

      expect(columnInput).toHaveValue('Wins');
    });

    it('should allow removing a column when more than one exists', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Should have 3 columns initially
      expect(screen.getByTestId('column-chip-col-1')).toBeInTheDocument();
      expect(screen.getByTestId('column-chip-col-2')).toBeInTheDocument();
      expect(screen.getByTestId('column-chip-col-3')).toBeInTheDocument();

      // Remove first column
      await user.click(screen.getByTestId('remove-column-col-1'));

      // Column 1 should be removed
      expect(screen.queryByTestId('column-chip-col-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('column-chip-col-2')).toBeInTheDocument();
      expect(screen.getByTestId('column-chip-col-3')).toBeInTheDocument();
    });

    it('should not show remove button when only one column remains', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Remove columns until only one remains
      await user.click(screen.getByTestId('remove-column-col-1'));
      await user.click(screen.getByTestId('remove-column-col-2'));

      // Only col-3 remains, remove button should not exist
      expect(screen.queryByTestId('remove-column-col-3')).not.toBeInTheDocument();
      expect(screen.getByTestId('column-chip-col-3')).toBeInTheDocument();
    });

    it('should allow adding a new column', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Start with 3 columns
      expect(screen.getAllByTestId(/^column-chip-/)).toHaveLength(3);

      // Add a column
      await user.click(screen.getByTestId('add-column-button'));

      // Should now have 4 columns
      expect(screen.getAllByTestId(/^column-chip-/)).toHaveLength(4);
      expect(screen.getByTestId('column-chip-col-4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Column 4')).toBeInTheDocument();
    });

    it('should disable add button when maximum 6 columns reached', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Add columns until we reach 6
      await user.click(screen.getByTestId('add-column-button')); // 4
      await user.click(screen.getByTestId('add-column-button')); // 5
      await user.click(screen.getByTestId('add-column-button')); // 6

      expect(screen.getAllByTestId(/^column-chip-/)).toHaveLength(6);
      expect(screen.getByTestId('add-column-button')).toBeDisabled();
    });

    it('should show validation error for duplicate column names', async () => {
      const user = userEvent.setup();
      renderDialog();

      const column2Input = screen.getByTestId('column-input-col-2');
      await user.clear(column2Input);
      await user.type(column2Input, 'What Went Well');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByTestId('column-error-col-2')).toHaveTextContent('Column names must be unique');
      });
    });

    it('should infer action type from column name keywords', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');

      // Change column 1 name to include 'action' keyword
      const column1Input = screen.getByTestId('column-input-col-1');
      await user.clear(column1Input);
      await user.type(column1Input, 'Next Actions');

      await user.type(boardNameInput, 'Test Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            columns: expect.arrayContaining([
              expect.objectContaining({ name: 'Next Actions', type: 'action' }),
            ]),
          })
        );
      });
    });

    it('should cycle colors for new columns', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Add 3 more columns (total 6)
      await user.click(screen.getByTestId('add-column-button')); // col-4, color index 3 (purple)
      await user.click(screen.getByTestId('add-column-button')); // col-5, color index 4 (pink)
      await user.click(screen.getByTestId('add-column-button')); // col-6, color index 5 (teal)

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Test Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            columns: expect.arrayContaining([
              expect.objectContaining({ id: 'col-4', color: '#a855f7' }), // purple
              expect.objectContaining({ id: 'col-5', color: '#ec4899' }), // pink
              expect.objectContaining({ id: 'col-6', color: '#14b8a6' }), // teal
            ]),
          })
        );
      });
    });

    it('should show column count indicator', () => {
      renderDialog();
      expect(screen.getByText('3 of 6 columns (minimum 1)')).toBeInTheDocument();
    });

    it('should update column count indicator when adding columns', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('add-column-button'));

      expect(screen.getByText('4 of 6 columns (minimum 1)')).toBeInTheDocument();
    });

    it('should update column count indicator when removing columns', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('remove-column-col-1'));

      expect(screen.getByText('2 of 6 columns (minimum 1)')).toBeInTheDocument();
    });

    it('should submit with customized columns', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Customize columns
      const column1Input = screen.getByTestId('column-input-col-1');
      await user.clear(column1Input);
      await user.type(column1Input, 'Successes');

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Sprint Retro');
      await user.type(aliasInput, 'Jane');
      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith({
          name: 'Sprint Retro',
          columns: [
            { id: 'col-1', name: 'Successes', type: 'feedback', color: '#22c55e' },
            { id: 'col-2', name: 'To Improve', type: 'feedback', color: '#f97316' },
            { id: 'col-3', name: 'Action Items', type: 'action', color: '#3b82f6' },
          ],
          card_limit_per_user: null,
          reaction_limit_per_user: null,
          creator_alias: 'Jane',
        });
      });
    });

    it('should reset columns when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { props, rerender } = renderDialog();

      // Modify columns
      const column1Input = screen.getByTestId('column-input-col-1');
      await user.clear(column1Input);
      await user.type(column1Input, 'Modified');
      await user.click(screen.getByTestId('remove-column-col-2'));

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

      // Columns should be reset to defaults
      expect(screen.getByDisplayValue('What Went Well')).toBeInTheDocument();
      expect(screen.getByDisplayValue('To Improve')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Action Items')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^column-chip-/)).toHaveLength(3);
    });

    it('should not submit when column name is empty', async () => {
      const user = userEvent.setup();
      renderDialog();

      const column1Input = screen.getByTestId('column-input-col-1');
      await user.clear(column1Input);
      await user.tab(); // Trigger blur

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'Test Board');
      await user.type(aliasInput, 'John');
      await user.click(screen.getByTestId('submit-create-board'));

      // Should show error and not submit
      await waitFor(() => {
        expect(screen.getByTestId('column-errors')).toBeInTheDocument();
      });
      expect(mockCreateBoard).not.toHaveBeenCalled();
    });

    it('should have proper accessibility labels for column inputs', () => {
      renderDialog();

      const column1Input = screen.getByTestId('column-input-col-1');
      expect(column1Input).toHaveAttribute('aria-label', 'Column name: What Went Well');
    });

    it('should have proper accessibility labels for remove buttons', () => {
      renderDialog();

      const removeButton = screen.getByTestId('remove-column-col-1');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove column What Went Well');
    });
  });

  describe('Advanced Settings (UTB-008)', () => {
    it('should have advanced settings section collapsed by default', () => {
      renderDialog();

      expect(screen.getByTestId('advanced-settings-toggle')).toBeInTheDocument();
      expect(screen.queryByTestId('advanced-settings-content')).not.toBeInTheDocument();
    });

    it('should expand advanced settings when toggle is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));

      expect(screen.getByTestId('advanced-settings-content')).toBeInTheDocument();
    });

    it('should collapse advanced settings when toggle is clicked again', async () => {
      const user = userEvent.setup();
      renderDialog();

      // Expand
      await user.click(screen.getByTestId('advanced-settings-toggle'));
      expect(screen.getByTestId('advanced-settings-content')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByTestId('advanced-settings-toggle'));
      expect(screen.queryByTestId('advanced-settings-content')).not.toBeInTheDocument();
    });

    it('should have aria-expanded attribute on toggle button', async () => {
      const user = userEvent.setup();
      renderDialog();

      const toggle = screen.getByTestId('advanced-settings-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('should default card limit to unlimited', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));

      expect(screen.getByTestId('card-limit-unlimited')).toBeChecked();
      expect(screen.getByTestId('card-limit-limited')).not.toBeChecked();
      expect(screen.queryByTestId('card-limit-input')).not.toBeInTheDocument();
    });

    it('should default reaction limit to unlimited', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));

      expect(screen.getByTestId('reaction-limit-unlimited')).toBeChecked();
      expect(screen.getByTestId('reaction-limit-limited')).not.toBeChecked();
      expect(screen.queryByTestId('reaction-limit-input')).not.toBeInTheDocument();
    });

    it('should show card limit input when Limit option is selected', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));

      expect(screen.getByTestId('card-limit-input')).toBeInTheDocument();
    });

    it('should show reaction limit input when Limit option is selected', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('reaction-limit-limited'));

      expect(screen.getByTestId('reaction-limit-input')).toBeInTheDocument();
    });

    it('should hide card limit input when switching back to Unlimited', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      expect(screen.getByTestId('card-limit-input')).toBeInTheDocument();

      await user.click(screen.getByTestId('card-limit-unlimited'));
      expect(screen.queryByTestId('card-limit-input')).not.toBeInTheDocument();
    });

    it('should allow setting a specific card limit value', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '5');

      expect(screen.getByTestId('card-limit-input')).toHaveValue(5);
    });

    it('should allow setting a specific reaction limit value', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('reaction-limit-limited'));
      await user.type(screen.getByTestId('reaction-limit-input'), '10');

      expect(screen.getByTestId('reaction-limit-input')).toHaveValue(10);
    });

    it('should show error for card limit value below 1', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '0');

      expect(screen.getByTestId('card-limit-error')).toBeInTheDocument();
      expect(screen.getByTestId('card-limit-error')).toHaveTextContent('Must be a number between 1 and 999');
    });

    it('should show error for card limit value above 999', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '1000');

      expect(screen.getByTestId('card-limit-error')).toBeInTheDocument();
      expect(screen.getByTestId('card-limit-error')).toHaveTextContent('Must be a number between 1 and 999');
    });

    it('should show error for reaction limit value below 1', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('reaction-limit-limited'));
      await user.type(screen.getByTestId('reaction-limit-input'), '0');

      expect(screen.getByTestId('reaction-limit-error')).toBeInTheDocument();
      expect(screen.getByTestId('reaction-limit-error')).toHaveTextContent('Must be a number between 1 and 999');
    });

    it('should show error for reaction limit value above 999', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('reaction-limit-limited'));
      await user.type(screen.getByTestId('reaction-limit-input'), '1000');

      expect(screen.getByTestId('reaction-limit-error')).toBeInTheDocument();
      expect(screen.getByTestId('reaction-limit-error')).toHaveTextContent('Must be a number between 1 and 999');
    });

    it('should submit with card limit when set', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Board');
      await user.type(aliasInput, 'John');

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '5');

      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            card_limit_per_user: 5,
            reaction_limit_per_user: null,
          })
        );
      });
    });

    it('should submit with reaction limit when set', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Board');
      await user.type(aliasInput, 'John');

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('reaction-limit-limited'));
      await user.type(screen.getByTestId('reaction-limit-input'), '10');

      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            card_limit_per_user: null,
            reaction_limit_per_user: 10,
          })
        );
      });
    });

    it('should submit with both limits when set', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Board');
      await user.type(aliasInput, 'John');

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '5');
      await user.click(screen.getByTestId('reaction-limit-limited'));
      await user.type(screen.getByTestId('reaction-limit-input'), '10');

      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            card_limit_per_user: 5,
            reaction_limit_per_user: 10,
          })
        );
      });
    });

    it('should submit with null limits when unlimited is selected', async () => {
      const user = userEvent.setup();
      renderDialog();

      const boardNameInput = screen.getByTestId('board-name-input');
      const aliasInput = screen.getByTestId('creator-alias-input');
      await user.type(boardNameInput, 'My Board');
      await user.type(aliasInput, 'John');

      // Open advanced settings but don't change anything
      await user.click(screen.getByTestId('advanced-settings-toggle'));

      await user.click(screen.getByTestId('submit-create-board'));

      await waitFor(() => {
        expect(mockCreateBoard).toHaveBeenCalledWith(
          expect.objectContaining({
            card_limit_per_user: null,
            reaction_limit_per_user: null,
          })
        );
      });
    });

    it('should reset advanced settings when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { props, rerender } = renderDialog();

      // Expand and set values
      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '5');

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

      // Advanced settings should be collapsed
      expect(screen.queryByTestId('advanced-settings-content')).not.toBeInTheDocument();

      // Open to verify values are reset
      await user.click(screen.getByTestId('advanced-settings-toggle'));
      expect(screen.getByTestId('card-limit-unlimited')).toBeChecked();
      expect(screen.queryByTestId('card-limit-input')).not.toBeInTheDocument();
    });

    it('should clear limit error when switching to unlimited', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '0');

      expect(screen.getByTestId('card-limit-error')).toBeInTheDocument();

      await user.click(screen.getByTestId('card-limit-unlimited'));

      expect(screen.queryByTestId('card-limit-error')).not.toBeInTheDocument();
    });

    it('should have proper accessibility labels for limit inputs', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.click(screen.getByTestId('reaction-limit-limited'));

      expect(screen.getByTestId('card-limit-input')).toHaveAttribute('aria-label', 'Card limit per user');
      expect(screen.getByTestId('reaction-limit-input')).toHaveAttribute('aria-label', 'Reaction limit per user');
    });

    it('should mark limit input as invalid when error exists', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByTestId('advanced-settings-toggle'));
      await user.click(screen.getByTestId('card-limit-limited'));
      await user.type(screen.getByTestId('card-limit-input'), '0');

      expect(screen.getByTestId('card-limit-input')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
