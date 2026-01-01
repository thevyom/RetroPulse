/**
 * RetroCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroCard } from '@/features/card/components/RetroCard';
import type { Card } from '@/models/types';

const mockCard: Card = {
  id: 'card-1',
  board_id: 'board-1',
  column_id: 'col-1',
  content: 'This is a great retro!',
  card_type: 'feedback',
  is_anonymous: false,
  created_by_hash: 'user-hash-1',
  created_by_alias: 'Alice',
  created_at: '2025-01-01T00:00:00Z',
  direct_reaction_count: 5,
  aggregated_reaction_count: 5,
  parent_card_id: null,
  linked_feedback_ids: [],
};

const mockLinkedCard: Card = {
  ...mockCard,
  id: 'card-2',
  parent_card_id: 'card-1',
};

const mockCardWithChildren: Card = {
  ...mockCard,
  aggregated_reaction_count: 10,
  children: [
    {
      id: 'child-1',
      content: 'Child card content',
      is_anonymous: false,
      created_by_alias: 'Bob',
      created_at: '2025-01-01T01:00:00Z',
      direct_reaction_count: 2,
      aggregated_reaction_count: 2,
    },
  ],
};

describe('RetroCard', () => {
  const defaultProps = {
    card: mockCard,
    isOwner: true,
    isClosed: false,
    canReact: true,
    hasReacted: false,
    onReact: vi.fn().mockResolvedValue(undefined),
    onUnreact: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onUnlinkFromParent: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should display card content', () => {
      render(<RetroCard {...defaultProps} />);

      expect(screen.getByText('This is a great retro!')).toBeInTheDocument();
    });

    it('should display author alias for non-anonymous cards', () => {
      render(<RetroCard {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should display "Anonymous" for anonymous cards', () => {
      const anonymousCard = { ...mockCard, is_anonymous: true, created_by_alias: null };
      render(<RetroCard {...defaultProps} card={anonymousCard} />);

      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });

    it('should display reaction count', () => {
      render(<RetroCard {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Drag Handle vs Link Icon', () => {
    it('should show drag handle for standalone cards (no parent)', () => {
      render(<RetroCard {...defaultProps} />);

      expect(screen.getByLabelText(/drag handle/i)).toBeInTheDocument();
    });

    it('should show link icon for linked cards (has parent)', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      expect(screen.getByLabelText(/unlink from parent/i)).toBeInTheDocument();
    });

    it('should call onUnlinkFromParent when link icon is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      await user.click(screen.getByLabelText(/unlink from parent/i));

      expect(defaultProps.onUnlinkFromParent).toHaveBeenCalled();
    });
  });

  describe('Reactions', () => {
    it('should call onReact when reaction button is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} hasReacted={false} />);

      await user.click(screen.getByLabelText(/add reaction/i));

      await waitFor(() => {
        expect(defaultProps.onReact).toHaveBeenCalled();
      });
    });

    it('should call onUnreact when user has already reacted', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} hasReacted={true} />);

      await user.click(screen.getByLabelText(/remove reaction/i));

      await waitFor(() => {
        expect(defaultProps.onUnreact).toHaveBeenCalled();
      });
    });

    it('should disable reaction button when board is closed', () => {
      render(<RetroCard {...defaultProps} isClosed={true} />);

      expect(screen.getByLabelText(/add reaction/i)).toBeDisabled();
    });

    it('should disable reaction button when canReact is false and not reacted', () => {
      render(<RetroCard {...defaultProps} canReact={false} hasReacted={false} />);

      expect(screen.getByLabelText(/add reaction/i)).toBeDisabled();
    });
  });

  describe('Delete', () => {
    it('should show delete button for owner', () => {
      render(<RetroCard {...defaultProps} isOwner={true} />);

      expect(screen.getByLabelText(/delete card/i)).toBeInTheDocument();
    });

    it('should not show delete button for non-owner', () => {
      render(<RetroCard {...defaultProps} isOwner={false} />);

      expect(screen.queryByLabelText(/delete card/i)).not.toBeInTheDocument();
    });

    it('should not show delete button when board is closed', () => {
      render(<RetroCard {...defaultProps} isOwner={true} isClosed={true} />);

      expect(screen.queryByLabelText(/delete card/i)).not.toBeInTheDocument();
    });

    it('should open confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} isOwner={true} />);

      await user.click(screen.getByLabelText(/delete card/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it('should call onDelete when deletion is confirmed', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} isOwner={true} />);

      await user.click(screen.getByLabelText(/delete card/i));
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(defaultProps.onDelete).toHaveBeenCalled();
      });
    });

    it('should not call onDelete when cancelled', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} isOwner={true} />);

      await user.click(screen.getByLabelText(/delete card/i));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(defaultProps.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Children Cards', () => {
    it('should render child cards', () => {
      render(<RetroCard {...defaultProps} card={mockCardWithChildren} />);

      expect(screen.getByText('Child card content')).toBeInTheDocument();
    });

    it('should show child author', () => {
      render(<RetroCard {...defaultProps} card={mockCardWithChildren} />);

      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show child reaction count', () => {
      render(<RetroCard {...defaultProps} card={mockCardWithChildren} />);

      // Parent has 10 aggregated, child has 2
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
