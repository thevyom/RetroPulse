/**
 * RetroCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroCard, scrollToCard } from '@/features/card/components/RetroCard';
import type { Card } from '@/models/types';
import type { LinkedActionCard } from '@/features/card/components/RetroCard';

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

    it('should have proper button attributes for unlink button', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      const unlinkButton = screen.getByLabelText(/unlink from parent/i);
      expect(unlinkButton).toHaveAttribute('type', 'button');
    });

    it('should have hover styles for unlink button', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      const unlinkButton = screen.getByLabelText(/unlink from parent/i);
      expect(unlinkButton).toHaveClass('hover:text-primary');
      expect(unlinkButton).toHaveClass('hover:scale-110');
    });

    it('should have transition styles for unlink button', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      const unlinkButton = screen.getByLabelText(/unlink from parent/i);
      expect(unlinkButton).toHaveClass('transition-all');
      expect(unlinkButton).toHaveClass('duration-150');
    });

    it('should have focus styles for unlink button (keyboard accessibility)', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} />);

      const unlinkButton = screen.getByLabelText(/unlink from parent/i);
      expect(unlinkButton).toHaveClass('focus:outline-none');
      expect(unlinkButton).toHaveClass('focus:ring-2');
      expect(unlinkButton).toHaveClass('focus:ring-primary');
    });

    it('should disable unlink button when board is closed', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} isClosed={true} />);

      const unlinkButton = screen.getByLabelText(/unlink from parent/i);
      expect(unlinkButton).toBeDisabled();
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

  describe('Child Card Reactions (UTB-007)', () => {
    const childReactionProps = {
      onReactToChild: vi.fn().mockResolvedValue(undefined),
      onUnreactFromChild: vi.fn().mockResolvedValue(undefined),
      hasUserReactedToChild: vi.fn().mockReturnValue(false),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should render reaction button for child cards', () => {
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
        />
      );

      expect(screen.getByLabelText(/add reaction to child card/i)).toBeInTheDocument();
    });

    it('should show filled icon when user has reacted to child card', () => {
      const hasReactedMock = vi.fn().mockReturnValue(true);
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
          hasUserReactedToChild={hasReactedMock}
        />
      );

      expect(screen.getByLabelText(/remove reaction from child card/i)).toBeInTheDocument();
    });

    it('should call onReactToChild when child reaction button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
        />
      );

      await user.click(screen.getByLabelText(/add reaction to child card/i));

      await waitFor(() => {
        expect(childReactionProps.onReactToChild).toHaveBeenCalledWith('child-1');
      });
    });

    it('should call onUnreactFromChild when user has already reacted', async () => {
      const user = userEvent.setup();
      const hasReactedMock = vi.fn().mockReturnValue(true);
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
          hasUserReactedToChild={hasReactedMock}
        />
      );

      await user.click(screen.getByLabelText(/remove reaction from child card/i));

      await waitFor(() => {
        expect(childReactionProps.onUnreactFromChild).toHaveBeenCalledWith('child-1');
      });
    });

    it('should disable child reaction button when board is closed', () => {
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          isClosed={true}
          {...childReactionProps}
        />
      );

      expect(screen.getByLabelText(/add reaction to child card/i)).toBeDisabled();
    });

    it('should disable child reaction button when canReact is false and not reacted', () => {
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          canReact={false}
          {...childReactionProps}
        />
      );

      expect(screen.getByLabelText(/add reaction to child card/i)).toBeDisabled();
    });

    it('should enable child reaction button to remove reaction even when canReact is false', () => {
      const hasReactedMock = vi.fn().mockReturnValue(true);
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          canReact={false}
          {...childReactionProps}
          hasUserReactedToChild={hasReactedMock}
        />
      );

      expect(screen.getByLabelText(/remove reaction from child card/i)).not.toBeDisabled();
    });

    it('should show reaction count on child card button', () => {
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
        />
      );

      // Child has direct_reaction_count: 2
      const childReactionButton = screen.getByLabelText(/add reaction to child card/i);
      expect(childReactionButton).toHaveTextContent('2');
    });

    it('should have primary color when user has reacted to child', () => {
      const hasReactedMock = vi.fn().mockReturnValue(true);
      render(
        <RetroCard
          {...defaultProps}
          card={mockCardWithChildren}
          {...childReactionProps}
          hasUserReactedToChild={hasReactedMock}
        />
      );

      const button = screen.getByLabelText(/remove reaction from child card/i);
      expect(button).toHaveClass('text-primary');
    });

    it('should render reaction button even when child has zero reactions', () => {
      const cardWithZeroReactionChild: Card = {
        ...mockCard,
        aggregated_reaction_count: 5,
        children: [
          {
            id: 'child-zero',
            content: 'Child with no reactions',
            is_anonymous: false,
            created_by_alias: 'Charlie',
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 0,
            aggregated_reaction_count: 0,
          },
        ],
      };

      render(
        <RetroCard
          {...defaultProps}
          card={cardWithZeroReactionChild}
          {...childReactionProps}
        />
      );

      expect(screen.getByLabelText(/add reaction to child card/i)).toBeInTheDocument();
    });
  });

  describe('Link Indicators (UTB-004)', () => {
    const mockLinkedActionCards: LinkedActionCard[] = [
      { id: 'action-1', content: 'Fix the deployment pipeline' },
      { id: 'action-2', content: 'Update documentation for new features' },
    ];

    const mockLinkedFeedbackCards = [
      { id: 'feedback-1', content: 'Great team collaboration this sprint' },
      { id: 'feedback-2', content: 'Need better communication channels' },
    ];

    describe('Linked Actions Section', () => {
      it('should not render linked actions section when no linked actions', () => {
        render(<RetroCard {...defaultProps} linkedActionCards={[]} />);

        expect(screen.queryByTestId('linked-actions-section')).not.toBeInTheDocument();
      });

      it('should render linked actions section when linkedActionCards is provided', () => {
        render(<RetroCard {...defaultProps} linkedActionCards={mockLinkedActionCards} />);

        expect(screen.getByTestId('linked-actions-section')).toBeInTheDocument();
        expect(screen.getByText('Linked Actions')).toBeInTheDocument();
      });

      it('should render all linked action cards with truncated content', () => {
        render(<RetroCard {...defaultProps} linkedActionCards={mockLinkedActionCards} />);

        expect(screen.getByText('Fix the deployment pipeline')).toBeInTheDocument();
        expect(screen.getByText('Update documentation for new features')).toBeInTheDocument();
      });

      it('should truncate long action card content', () => {
        const longContent = 'This is a very long action item that should be truncated because it exceeds the maximum length allowed for display';
        const longActionCard: LinkedActionCard[] = [
          { id: 'action-long', content: longContent },
        ];
        render(<RetroCard {...defaultProps} linkedActionCards={longActionCard} />);

        // truncateText truncates at 50 characters by default
        // Full content should NOT be present
        expect(screen.queryByText(longContent)).not.toBeInTheDocument();

        // Truncated version with ellipsis should be present (using function matcher for split text)
        const truncatedText = screen.getByText((content, element) => {
          return element?.tagName === 'SPAN' && content.includes('This is a very long action item') && content.includes('...');
        });
        expect(truncatedText).toBeInTheDocument();
      });

      it('should call scrollToCard when linked action is clicked', async () => {
        const user = userEvent.setup();

        // Mock scrollIntoView
        const mockScrollIntoView = vi.fn();
        const mockElement = document.createElement('div');
        mockElement.scrollIntoView = mockScrollIntoView;
        mockElement.classList.add = vi.fn();
        mockElement.classList.remove = vi.fn();
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        render(<RetroCard {...defaultProps} linkedActionCards={mockLinkedActionCards} />);

        const actionButton = screen.getByLabelText(/Navigate to linked action: Fix the deployment/);
        await user.click(actionButton);

        expect(document.getElementById).toHaveBeenCalledWith('card-action-1');
      });

      it('should have proper accessibility attributes on action buttons', () => {
        render(<RetroCard {...defaultProps} linkedActionCards={mockLinkedActionCards} />);

        const actionButtons = screen.getAllByRole('button', { name: /Navigate to linked action/ });
        expect(actionButtons).toHaveLength(2);
        actionButtons.forEach((button) => {
          expect(button).toHaveAttribute('type', 'button');
        });
      });

      it('should have blue background styling for actions section', () => {
        render(<RetroCard {...defaultProps} linkedActionCards={mockLinkedActionCards} />);

        const section = screen.getByTestId('linked-actions-section');
        expect(section).toHaveClass('bg-blue-100');
      });
    });

    describe('Linked Feedback Section', () => {
      it('should not render linked feedback section when no linked feedback', () => {
        render(<RetroCard {...defaultProps} linkedFeedbackCards={[]} />);

        expect(screen.queryByTestId('linked-feedback-section')).not.toBeInTheDocument();
      });

      it('should render linked feedback section when linkedFeedbackCards is provided', () => {
        render(<RetroCard {...defaultProps} linkedFeedbackCards={mockLinkedFeedbackCards} />);

        expect(screen.getByTestId('linked-feedback-section')).toBeInTheDocument();
        expect(screen.getByText('Links to')).toBeInTheDocument();
      });

      it('should render all linked feedback cards', () => {
        render(<RetroCard {...defaultProps} linkedFeedbackCards={mockLinkedFeedbackCards} />);

        expect(screen.getByText('Great team collaboration this sprint')).toBeInTheDocument();
        expect(screen.getByText('Need better communication channels')).toBeInTheDocument();
      });

      it('should prefer card.linked_feedback_cards over linkedFeedbackCards prop', () => {
        const cardWithEmbeddedLinks: Card = {
          ...mockCard,
          linked_feedback_cards: [
            { id: 'embedded-1', content: 'Embedded feedback content' },
          ],
        };

        render(
          <RetroCard
            {...defaultProps}
            card={cardWithEmbeddedLinks}
            linkedFeedbackCards={mockLinkedFeedbackCards}
          />
        );

        // Should show embedded, not prop-passed
        expect(screen.getByText('Embedded feedback content')).toBeInTheDocument();
        expect(screen.queryByText('Great team collaboration this sprint')).not.toBeInTheDocument();
      });

      it('should call scrollToCard when linked feedback is clicked', async () => {
        const user = userEvent.setup();

        // Mock scrollIntoView
        const mockScrollIntoView = vi.fn();
        const mockElement = document.createElement('div');
        mockElement.scrollIntoView = mockScrollIntoView;
        mockElement.classList.add = vi.fn();
        mockElement.classList.remove = vi.fn();
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        render(<RetroCard {...defaultProps} linkedFeedbackCards={mockLinkedFeedbackCards} />);

        const feedbackButton = screen.getByLabelText(/Navigate to linked feedback: Great team/);
        await user.click(feedbackButton);

        expect(document.getElementById).toHaveBeenCalledWith('card-feedback-1');
      });

      it('should have proper accessibility attributes on feedback buttons', () => {
        render(<RetroCard {...defaultProps} linkedFeedbackCards={mockLinkedFeedbackCards} />);

        const feedbackButtons = screen.getAllByRole('button', { name: /Navigate to linked feedback/ });
        expect(feedbackButtons).toHaveLength(2);
        feedbackButtons.forEach((button) => {
          expect(button).toHaveAttribute('type', 'button');
        });
      });

      it('should have green background styling for feedback section', () => {
        render(<RetroCard {...defaultProps} linkedFeedbackCards={mockLinkedFeedbackCards} />);

        const section = screen.getByTestId('linked-feedback-section');
        expect(section).toHaveClass('bg-green-100');
      });
    });

    describe('Both Links Present', () => {
      it('should render both sections when card has both linked actions and feedback', () => {
        render(
          <RetroCard
            {...defaultProps}
            linkedActionCards={mockLinkedActionCards}
            linkedFeedbackCards={mockLinkedFeedbackCards}
          />
        );

        expect(screen.getByTestId('linked-actions-section')).toBeInTheDocument();
        expect(screen.getByTestId('linked-feedback-section')).toBeInTheDocument();
        expect(screen.getByText('Linked Actions')).toBeInTheDocument();
        expect(screen.getByText('Links to')).toBeInTheDocument();
      });
    });

    describe('scrollToCard utility function', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
      });

      it('should scroll element into view and add highlight classes', () => {
        const mockElement = document.createElement('div');
        const mockScrollIntoView = vi.fn();
        const mockClassListAdd = vi.fn();
        const mockClassListRemove = vi.fn();

        mockElement.scrollIntoView = mockScrollIntoView;
        mockElement.classList.add = mockClassListAdd;
        mockElement.classList.remove = mockClassListRemove;

        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        scrollToCard('test-card-id');

        expect(document.getElementById).toHaveBeenCalledWith('card-test-card-id');
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        expect(mockClassListAdd).toHaveBeenCalledWith('ring-2', 'ring-primary', 'ring-offset-2');
      });

      it('should remove highlight classes after 2 seconds', () => {
        const mockElement = document.createElement('div');
        const mockClassListRemove = vi.fn();

        mockElement.scrollIntoView = vi.fn();
        mockElement.classList.add = vi.fn();
        mockElement.classList.remove = mockClassListRemove;

        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        scrollToCard('test-card-id');

        expect(mockClassListRemove).not.toHaveBeenCalled();

        vi.advanceTimersByTime(2000);

        expect(mockClassListRemove).toHaveBeenCalledWith('ring-2', 'ring-primary', 'ring-offset-2');
      });

      it('should do nothing if element is not found', () => {
        vi.spyOn(document, 'getElementById').mockReturnValue(null);

        // Should not throw
        expect(() => scrollToCard('non-existent')).not.toThrow();
      });
    });
  });
});
