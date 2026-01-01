/**
 * RetroColumn Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroColumn } from '@/features/card/components/RetroColumn';
import type { Card } from '@/models/types';

const mockCards: Card[] = [
  {
    id: 'card-1',
    board_id: 'board-1',
    column_id: 'col-1',
    content: 'Great teamwork!',
    card_type: 'feedback',
    is_anonymous: false,
    created_by_hash: 'user-hash-1',
    created_by_alias: 'Alice',
    created_at: '2025-01-01T00:00:00Z',
    direct_reaction_count: 5,
    aggregated_reaction_count: 5,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
  {
    id: 'card-2',
    board_id: 'board-1',
    column_id: 'col-1',
    content: 'Good communication',
    card_type: 'feedback',
    is_anonymous: true,
    created_by_hash: 'user-hash-2',
    created_by_alias: null,
    created_at: '2025-01-01T01:00:00Z',
    direct_reaction_count: 3,
    aggregated_reaction_count: 3,
    parent_card_id: null,
    linked_feedback_ids: [],
  },
];

describe('RetroColumn', () => {
  const defaultProps = {
    columnId: 'col-1',
    columnType: 'went_well' as const,
    title: 'Went Well',
    color: '#22c55e',
    cards: mockCards,
    isAdmin: false,
    isClosed: false,
    canCreateCard: true,
    currentUserHash: 'user-hash-1',
    canReact: true,
    hasUserReacted: vi.fn().mockReturnValue(false),
    onCreateCard: vi.fn().mockResolvedValue({ id: 'new-card' }),
    onDeleteCard: vi.fn().mockResolvedValue(undefined),
    onAddReaction: vi.fn().mockResolvedValue(undefined),
    onRemoveReaction: vi.fn().mockResolvedValue(undefined),
    onUnlinkChild: vi.fn().mockResolvedValue(undefined),
    onEditColumnTitle: undefined as ((name: string) => Promise<void>) | undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display column title', () => {
      render(<RetroColumn {...defaultProps} />);

      expect(screen.getByText('Went Well')).toBeInTheDocument();
    });

    it('should render all cards', () => {
      render(<RetroColumn {...defaultProps} />);

      expect(screen.getByText('Great teamwork!')).toBeInTheDocument();
      expect(screen.getByText('Good communication')).toBeInTheDocument();
    });

    it('should show "No cards yet" when column is empty', () => {
      render(<RetroColumn {...defaultProps} cards={[]} />);

      expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
    });
  });

  describe('Add Card', () => {
    it('should show add button when canCreateCard is true', () => {
      render(<RetroColumn {...defaultProps} canCreateCard={true} />);

      expect(screen.getByLabelText(/add card/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add card/i)).not.toBeDisabled();
    });

    it('should disable add button when canCreateCard is false', () => {
      render(<RetroColumn {...defaultProps} canCreateCard={false} />);

      expect(screen.getByLabelText(/add card/i)).toBeDisabled();
    });

    it('should disable add button when board is closed', () => {
      render(<RetroColumn {...defaultProps} isClosed={true} />);

      expect(screen.getByLabelText(/add card/i)).toBeDisabled();
    });

    it('should open add card dialog when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/add card/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add card to went well/i)).toBeInTheDocument();
    });

    it('should call onCreateCard when card is submitted', async () => {
      const user = userEvent.setup();
      render(<RetroColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/add card/i));

      const textarea = screen.getByLabelText(/card content/i);
      await user.type(textarea, 'New card content');
      await user.click(screen.getByRole('button', { name: /add card/i }));

      await waitFor(() => {
        expect(defaultProps.onCreateCard).toHaveBeenCalledWith({
          column_id: 'col-1',
          content: 'New card content',
          card_type: 'feedback',
          is_anonymous: false,
        });
      });
    });

    it('should allow posting anonymously', async () => {
      const user = userEvent.setup();
      render(<RetroColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/add card/i));

      const textarea = screen.getByLabelText(/card content/i);
      await user.type(textarea, 'Anonymous content');
      await user.click(screen.getByLabelText(/post anonymously/i));
      await user.click(screen.getByRole('button', { name: /add card/i }));

      await waitFor(() => {
        expect(defaultProps.onCreateCard).toHaveBeenCalledWith({
          column_id: 'col-1',
          content: 'Anonymous content',
          card_type: 'feedback',
          is_anonymous: true,
        });
      });
    });

    it('should show validation error for empty content', async () => {
      const user = userEvent.setup();
      render(<RetroColumn {...defaultProps} />);

      await user.click(screen.getByLabelText(/add card/i));
      await user.click(screen.getByRole('button', { name: /add card/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Edit Column Title (Admin)', () => {
    it('should show edit button for admin', () => {
      render(
        <RetroColumn
          {...defaultProps}
          isAdmin={true}
          onEditColumnTitle={vi.fn().mockResolvedValue(undefined)}
        />
      );

      expect(screen.getByLabelText(/edit column name/i)).toBeInTheDocument();
    });

    it('should not show edit button for non-admin', () => {
      render(<RetroColumn {...defaultProps} isAdmin={false} />);

      expect(screen.queryByLabelText(/edit column name/i)).not.toBeInTheDocument();
    });

    it('should not show edit button when board is closed', () => {
      render(
        <RetroColumn
          {...defaultProps}
          isAdmin={true}
          isClosed={true}
          onEditColumnTitle={vi.fn().mockResolvedValue(undefined)}
        />
      );

      expect(screen.queryByLabelText(/edit column name/i)).not.toBeInTheDocument();
    });

    it('should open edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RetroColumn
          {...defaultProps}
          isAdmin={true}
          onEditColumnTitle={vi.fn().mockResolvedValue(undefined)}
        />
      );

      await user.click(screen.getByLabelText(/edit column name/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit column name/i)).toBeInTheDocument();
    });

    it('should call onEditColumnTitle when new name is submitted', async () => {
      const user = userEvent.setup();
      const mockEditColumnTitle = vi.fn().mockResolvedValue(undefined);
      render(
        <RetroColumn {...defaultProps} isAdmin={true} onEditColumnTitle={mockEditColumnTitle} />
      );

      await user.click(screen.getByLabelText(/edit column name/i));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'New Column Name');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockEditColumnTitle).toHaveBeenCalledWith('New Column Name');
      });
    });

    it('should show validation error for empty column name', async () => {
      const user = userEvent.setup();
      render(
        <RetroColumn
          {...defaultProps}
          isAdmin={true}
          onEditColumnTitle={vi.fn().mockResolvedValue(undefined)}
        />
      );

      await user.click(screen.getByLabelText(/edit column name/i));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should close edit dialog on cancel', async () => {
      const user = userEvent.setup();
      render(
        <RetroColumn
          {...defaultProps}
          isAdmin={true}
          onEditColumnTitle={vi.fn().mockResolvedValue(undefined)}
        />
      );

      await user.click(screen.getByLabelText(/edit column name/i));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle edit submission failure', async () => {
      const user = userEvent.setup();
      const mockEditColumnTitle = vi.fn().mockRejectedValue(new Error('Failed to rename'));
      render(
        <RetroColumn {...defaultProps} isAdmin={true} onEditColumnTitle={mockEditColumnTitle} />
      );

      await user.click(screen.getByLabelText(/edit column name/i));

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'New Name');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to rename');
      });
    });
  });

  describe('Action Column', () => {
    it('should create action card type for action_item column', async () => {
      const user = userEvent.setup();
      render(<RetroColumn {...defaultProps} columnType="action_item" title="Action Items" />);

      await user.click(screen.getByLabelText(/add card/i));

      const textarea = screen.getByLabelText(/card content/i);
      await user.type(textarea, 'New action item');
      await user.click(screen.getByRole('button', { name: /add card/i }));

      await waitFor(() => {
        expect(defaultProps.onCreateCard).toHaveBeenCalledWith(
          expect.objectContaining({
            card_type: 'action',
          })
        );
      });
    });
  });
});
