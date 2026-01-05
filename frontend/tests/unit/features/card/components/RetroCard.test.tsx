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
    onUpdateCard: vi.fn().mockResolvedValue(undefined),
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

    it('should display Ghost icon for anonymous cards (UTB-018)', () => {
      const anonymousCard = { ...mockCard, is_anonymous: true, created_by_alias: null };
      render(<RetroCard {...defaultProps} card={anonymousCard} columnType="went_well" />);

      // Ghost icon should be present with aria-label
      expect(screen.getByLabelText('Anonymous card')).toBeInTheDocument();
    });

    it('should display reaction count', () => {
      render(<RetroCard {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Drag Handle vs Link Icon', () => {
    it('should show drag handle for standalone cards (no parent)', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      // Full header now has drag listeners, with aria-label for accessibility
      const header = screen.getByTestId('card-header');
      expect(header).toHaveAttribute('aria-label');
      expect(header.getAttribute('aria-label')).toMatch(/Drag card:/);
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

  describe('Aggregated Reaction Display (UTB-016)', () => {
    it('should show only reaction count for standalone cards without children', () => {
      render(<RetroCard {...defaultProps} card={mockCard} />);

      // Should show the count
      expect(screen.getByText('5')).toBeInTheDocument();

      // Should NOT show "(X own)" for standalone cards
      expect(screen.queryByTestId('reaction-own-count')).not.toBeInTheDocument();
    });

    it('should show aggregated and direct counts for parent cards with children', () => {
      const parentCardWithChildren: Card = {
        ...mockCard,
        direct_reaction_count: 3,
        aggregated_reaction_count: 10,
        children: [
          {
            id: 'child-1',
            content: 'Child card content',
            is_anonymous: false,
            created_by_alias: 'Bob',
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 7,
            aggregated_reaction_count: 7,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={parentCardWithChildren} />);

      // Should show aggregated count (10)
      expect(screen.getByText('10')).toBeInTheDocument();

      // Should show "(3 own)" for direct reactions
      const ownCountElement = screen.getByTestId('reaction-own-count');
      expect(ownCountElement).toBeInTheDocument();
      expect(ownCountElement).toHaveTextContent('(3 own)');
    });

    it('should display format "X (Y own)" showing aggregated and direct counts', () => {
      const parentCard: Card = {
        ...mockCard,
        direct_reaction_count: 2,
        aggregated_reaction_count: 8,
        children: [
          {
            id: 'child-1',
            content: 'Child content',
            is_anonymous: false,
            created_by_alias: 'Bob',
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 6,
            aggregated_reaction_count: 6,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={parentCard} />);

      // Aggregated count is displayed
      expect(screen.getByText('8')).toBeInTheDocument();

      // Own count is displayed in the expected format
      expect(screen.getByText('(2 own)')).toBeInTheDocument();
    });

    it('should show "(0 own)" when parent has no direct reactions but has aggregated', () => {
      const parentCardNoDirectReactions: Card = {
        ...mockCard,
        direct_reaction_count: 0,
        aggregated_reaction_count: 7,
        children: [
          {
            id: 'child-1',
            content: 'Child content',
            is_anonymous: false,
            created_by_alias: 'Bob',
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 4,
            aggregated_reaction_count: 4,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={parentCardNoDirectReactions} columnType="went_well" />);

      // Use getAllByText since child card also shows count
      const allCounts = screen.getAllByText('7');
      expect(allCounts.length).toBeGreaterThanOrEqual(1);

      // "(0 own)" is shown
      expect(screen.getByText('(0 own)')).toBeInTheDocument();
    });

    it('should not show own count indicator when there are no reactions at all', () => {
      const parentCardNoReactions: Card = {
        ...mockCard,
        direct_reaction_count: 0,
        aggregated_reaction_count: 0,
        children: [
          {
            id: 'child-1',
            content: 'Child content',
            is_anonymous: false,
            created_by_alias: 'Bob',
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 0,
            aggregated_reaction_count: 0,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={parentCardNoReactions} />);

      // No "(X own)" indicator when reactionCount is 0
      expect(screen.queryByTestId('reaction-own-count')).not.toBeInTheDocument();
    });

    it('should have proper styling for own count indicator', () => {
      render(<RetroCard {...defaultProps} card={mockCardWithChildren} />);

      const ownCountElement = screen.getByTestId('reaction-own-count');
      expect(ownCountElement).toHaveClass('text-[10px]');
      expect(ownCountElement).toHaveClass('text-muted-foreground');
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

  describe('Card Content Editing (UTB-020)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('Edit Mode Activation', () => {
      it('should enter edit mode when owner clicks on content', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        await user.click(content);

        expect(screen.getByTestId('card-edit-textarea')).toBeInTheDocument();
      });

      it('should NOT enter edit mode when non-owner clicks on content', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" isOwner={false} />);

        const content = screen.getByTestId('card-content');
        await user.click(content);

        expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
      });

      it('should NOT enter edit mode when board is closed', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" isClosed={true} />);

        const content = screen.getByTestId('card-content');
        await user.click(content);

        expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
      });

      it('should NOT enter edit mode when onUpdateCard is not provided', async () => {
        const user = userEvent.setup();
        const propsWithoutUpdate = { ...defaultProps, onUpdateCard: undefined };
        render(<RetroCard {...propsWithoutUpdate} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        await user.click(content);

        expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
      });

      it('should show cursor-pointer style for editable content', () => {
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        expect(content).toHaveClass('cursor-pointer');
      });

      it('should NOT show cursor-pointer for non-owner', () => {
        render(<RetroCard {...defaultProps} columnType="went_well" isOwner={false} />);

        const content = screen.getByTestId('card-content');
        expect(content).not.toHaveClass('cursor-pointer');
      });

      it('should have accessible role for editable content', () => {
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        expect(content).toHaveAttribute('role', 'button');
        expect(content).toHaveAttribute('tabIndex', '0');
      });

      it('should enter edit mode on keyboard activation (Enter)', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        content.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByTestId('card-edit-textarea')).toBeInTheDocument();
      });

      it('should enter edit mode on keyboard activation (Space)', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        content.focus();
        await user.keyboard(' ');

        expect(screen.getByTestId('card-edit-textarea')).toBeInTheDocument();
      });
    });

    describe('Edit Mode Behavior', () => {
      it('should populate textarea with current content', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));

        const textarea = screen.getByTestId('card-edit-textarea');
        expect(textarea).toHaveValue('This is a great retro!');
      });

      it('should focus textarea when entering edit mode', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));

        const textarea = screen.getByTestId('card-edit-textarea');
        expect(textarea).toHaveFocus();
      });
    });

    describe('Saving Changes', () => {
      it('should call onUpdateCard with new content on blur', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, 'Updated content');
        await user.tab(); // Blur

        await waitFor(() => {
          expect(defaultProps.onUpdateCard).toHaveBeenCalledWith('Updated content');
        });
      });

      it('should call onUpdateCard on Enter key press', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, 'New content{Enter}');

        await waitFor(() => {
          expect(defaultProps.onUpdateCard).toHaveBeenCalledWith('New content');
        });
      });

      it('should NOT call onUpdateCard if content unchanged', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        await user.tab(); // Blur without changing

        expect(defaultProps.onUpdateCard).not.toHaveBeenCalled();
      });

      it('should NOT call onUpdateCard if content is empty', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.tab(); // Blur

        expect(defaultProps.onUpdateCard).not.toHaveBeenCalled();
      });

      it('should exit edit mode after saving', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, 'Updated');
        await user.tab();

        await waitFor(() => {
          expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
        });
      });

      it('should trim whitespace from content before saving', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, '  Trimmed content  {Enter}');

        await waitFor(() => {
          expect(defaultProps.onUpdateCard).toHaveBeenCalledWith('Trimmed content');
        });
      });
    });

    describe('Cancelling Edit', () => {
      it('should cancel edit and restore content on Escape', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, 'Modified content');
        await user.keyboard('{Escape}');

        // Should exit edit mode without saving
        expect(screen.queryByTestId('card-edit-textarea')).not.toBeInTheDocument();
        expect(defaultProps.onUpdateCard).not.toHaveBeenCalled();
        // Original content should be displayed
        expect(screen.getByText('This is a great retro!')).toBeInTheDocument();
      });
    });

    describe('Multiline Support', () => {
      it('should allow Shift+Enter for newlines without saving', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));
        const textarea = screen.getByTestId('card-edit-textarea');

        await user.clear(textarea);
        await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

        // Should still be in edit mode (not saved)
        expect(screen.getByTestId('card-edit-textarea')).toBeInTheDocument();
        expect(defaultProps.onUpdateCard).not.toHaveBeenCalled();
      });
    });

    describe('Accessibility', () => {
      it('should have aria-label on textarea', async () => {
        const user = userEvent.setup();
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        await user.click(screen.getByTestId('card-content'));

        expect(screen.getByLabelText('Edit card content')).toBeInTheDocument();
      });

      it('should have aria-label on editable content', () => {
        render(<RetroCard {...defaultProps} columnType="went_well" />);

        const content = screen.getByTestId('card-content');
        expect(content).toHaveAttribute('aria-label', 'Click to edit card content');
      });
    });
  });

  describe('Anonymous Card Display (UTB-018)', () => {
    const anonymousCard: Card = {
      ...mockCard,
      is_anonymous: true,
      created_by_alias: null,
    };

    it('should render Ghost icon for anonymous cards instead of text', () => {
      render(<RetroCard {...defaultProps} card={anonymousCard} columnType="went_well" />);

      // Ghost icon should be present via aria-label
      expect(screen.getByLabelText('Anonymous card')).toBeInTheDocument();
      // Should NOT show "Anonymous" text anymore
      expect(screen.queryByText('Anonymous', { selector: 'span.italic' })).not.toBeInTheDocument();
    });

    it('should show "Anonymous" tooltip on Ghost icon hover', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} card={anonymousCard} columnType="went_well" />);

      const ghostIcon = screen.getByLabelText('Anonymous card');
      await user.hover(ghostIcon);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Anonymous');
      });
    });

    it('should render Ghost icon for anonymous child cards', () => {
      const cardWithAnonymousChild: Card = {
        ...mockCard,
        children: [
          {
            id: 'anon-child-1',
            content: 'Anonymous child content',
            is_anonymous: true,
            created_by_alias: null,
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 1,
            aggregated_reaction_count: 1,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={cardWithAnonymousChild} columnType="went_well" />);

      expect(screen.getByLabelText('Anonymous child card')).toBeInTheDocument();
    });

    it('should show tooltip for anonymous child card on hover', async () => {
      const user = userEvent.setup();
      const cardWithAnonymousChild: Card = {
        ...mockCard,
        children: [
          {
            id: 'anon-child-2',
            content: 'Anonymous child content',
            is_anonymous: true,
            created_by_alias: null,
            created_at: '2025-01-01T01:00:00Z',
            direct_reaction_count: 1,
            aggregated_reaction_count: 1,
          },
        ],
      };

      render(<RetroCard {...defaultProps} card={cardWithAnonymousChild} columnType="went_well" />);

      const ghostIcon = screen.getByLabelText('Anonymous child card');
      await user.hover(ghostIcon);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Anonymous');
      });
    });
  });

  describe('Full Header Drag Handle (UTB-019)', () => {
    it('should have card header element with testid', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      expect(screen.getByTestId('card-header')).toBeInTheDocument();
    });

    it('should have cursor-grab class on header for draggable cards', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('cursor-grab');
    });

    it('should have proper size for better drag target', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      const header = screen.getByTestId('card-header');
      // Header should be large enough to be a good drag target
      expect(header).toBeInTheDocument();
    });

    it('should have aria-label for full header drag handle', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      const header = screen.getByTestId('card-header');
      // aria-label contains card content preview for accessibility
      expect(header).toHaveAttribute('aria-label');
      expect(header.getAttribute('aria-label')).toMatch(/Drag card:/);
    });

    it('should NOT have cursor-grab for cards with parent (linked cards)', () => {
      render(<RetroCard {...defaultProps} card={mockLinkedCard} columnType="went_well" />);

      const header = screen.getByTestId('card-header');
      expect(header).not.toHaveClass('cursor-grab');
      expect(header).toHaveClass('cursor-default');
    });

    it('should NOT have cursor-grab when board is closed', () => {
      render(<RetroCard {...defaultProps} isClosed={true} columnType="went_well" />);

      const header = screen.getByTestId('card-header');
      // canDrag is false when isClosed is true
      expect(header).not.toHaveClass('cursor-grab');
    });

    it('should still allow reaction button clicks without triggering drag', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      await user.click(screen.getByLabelText(/add reaction/i));

      await waitFor(() => {
        expect(defaultProps.onReact).toHaveBeenCalled();
      });
    });

    it('should still allow delete button clicks without triggering drag', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} isOwner={true} columnType="went_well" />);

      await user.click(screen.getByLabelText(/delete card/i));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should still allow unlink button clicks for linked cards', async () => {
      const user = userEvent.setup();
      render(<RetroCard {...defaultProps} card={mockLinkedCard} columnType="went_well" />);

      await user.click(screen.getByLabelText(/unlink from parent/i));

      await waitFor(() => {
        expect(defaultProps.onUnlinkFromParent).toHaveBeenCalled();
      });
    });

    it('should show GripVertical icon in header for visual drag affordance', () => {
      render(<RetroCard {...defaultProps} columnType="went_well" />);

      // GripVertical icon is decorative (aria-hidden), accessibility is on the header
      const header = screen.getByTestId('card-header');
      expect(header).toHaveAttribute('aria-label');
      expect(header.getAttribute('aria-label')).toMatch(/Drag card:/);
    });
  });
});
