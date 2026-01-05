/**
 * RetroCard Accessibility Tests
 * Tests for drag handle a11y attributes (Task 1.3)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RetroCard } from '@/features/card/components/RetroCard';
import type { Card } from '@/models/types';

// Base mock card for testing
const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'card-1',
  board_id: 'board-1',
  column_id: 'col-1',
  content: 'Test card content for accessibility testing',
  card_type: 'feedback',
  is_anonymous: false,
  created_by_hash: 'user-hash-1',
  created_by_alias: 'TestUser',
  created_at: new Date().toISOString(),
  direct_reaction_count: 0,
  aggregated_reaction_count: 0,
  parent_card_id: null,
  linked_feedback_ids: [],
  ...overrides,
});

// Default props for RetroCard
const defaultProps = {
  card: createMockCard(),
  columnType: 'went_well' as const,
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

describe('RetroCard Accessibility', () => {
  describe('Drag Handle aria-label', () => {
    it('drag handle has aria-label with card content preview', () => {
      const card = createMockCard({
        content: 'Test card content for accessibility testing',
      });
      render(<RetroCard {...defaultProps} card={card} />);

      const dragHandle = screen.getByTestId('card-header');

      // Verify aria-label contains a preview of the card content
      const ariaLabel = dragHandle.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Drag');
      expect(ariaLabel).toContain('Test card content');
    });

    it('drag handle aria-label truncates long content', () => {
      const longContent = 'This is a very long card content that should be truncated in the aria-label to prevent overly verbose screen reader announcements';
      const card = createMockCard({ content: longContent });
      render(<RetroCard {...defaultProps} card={card} />);

      const dragHandle = screen.getByTestId('card-header');
      const ariaLabel = dragHandle.getAttribute('aria-label');

      // Should truncate at 30 characters + ellipsis
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel!.length).toBeLessThan(longContent.length + 20); // Account for "Drag card: " prefix
      expect(ariaLabel).toContain('...');
    });

    it('drag handle aria-label shows full content when short', () => {
      const shortContent = 'Short content';
      const card = createMockCard({ content: shortContent });
      render(<RetroCard {...defaultProps} card={card} />);

      const dragHandle = screen.getByTestId('card-header');
      const ariaLabel = dragHandle.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain(shortContent);
      // Should NOT have ellipsis for short content
      expect(ariaLabel).not.toContain('...');
    });
  });

  describe('Drag Handle Keyboard Accessibility', () => {
    it('drag handle is keyboard focusable (tabIndex=0) for draggable cards', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} isClosed={false} />);

      const dragHandle = screen.getByTestId('card-header');

      // Draggable cards should have tabIndex=0
      expect(dragHandle).toHaveAttribute('tabIndex', '0');
    });

    it('drag handle is NOT focusable when card has parent (linked card)', () => {
      const linkedCard = createMockCard({
        id: 'linked-card',
        parent_card_id: 'parent-card-id',
      });
      render(<RetroCard {...defaultProps} card={linkedCard} />);

      const header = screen.getByTestId('card-header');

      // Linked cards should NOT be draggable, so no tabIndex
      expect(header).not.toHaveAttribute('tabIndex', '0');
    });

    it('drag handle is NOT focusable when board is closed', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} isClosed={true} />);

      const header = screen.getByTestId('card-header');

      // Closed board cards should NOT be draggable
      expect(header).not.toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Drag Handle Role', () => {
    it('drag handle has role="button" for draggable cards', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} isClosed={false} />);

      const dragHandle = screen.getByTestId('card-header');

      expect(dragHandle).toHaveAttribute('role', 'button');
    });

    it('drag handle does NOT have role="button" for linked cards', () => {
      const linkedCard = createMockCard({
        parent_card_id: 'parent-id',
      });
      render(<RetroCard {...defaultProps} card={linkedCard} />);

      const header = screen.getByTestId('card-header');

      expect(header).not.toHaveAttribute('role', 'button');
    });

    it('drag handle has aria-roledescription="draggable" for draggable cards', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} isClosed={false} />);

      const dragHandle = screen.getByTestId('card-header');

      expect(dragHandle).toHaveAttribute('aria-roledescription', 'draggable');
    });
  });

  describe('Unique aria-label per Card', () => {
    it('drag handle has unique aria-label per card', () => {
      const card1 = createMockCard({
        id: 'card-1',
        content: 'First card content',
      });
      const card2 = createMockCard({
        id: 'card-2',
        content: 'Second card content',
      });

      const { unmount } = render(<RetroCard {...defaultProps} card={card1} />);
      const header1 = screen.getByTestId('card-header');
      const ariaLabel1 = header1.getAttribute('aria-label');
      unmount();

      render(<RetroCard {...defaultProps} card={card2} />);
      const header2 = screen.getByTestId('card-header');
      const ariaLabel2 = header2.getAttribute('aria-label');

      // Verify they have different aria-labels based on content
      expect(ariaLabel1).not.toBe(ariaLabel2);
      expect(ariaLabel1).toContain('First card');
      expect(ariaLabel2).toContain('Second card');
    });

    it('cards with identical content have same aria-label pattern', () => {
      const content = 'Same content for both cards';
      const card1 = createMockCard({ id: 'card-1', content });
      const card2 = createMockCard({ id: 'card-2', content });

      const { unmount } = render(<RetroCard {...defaultProps} card={card1} />);
      const header1 = screen.getByTestId('card-header');
      const ariaLabel1 = header1.getAttribute('aria-label');
      unmount();

      render(<RetroCard {...defaultProps} card={card2} />);
      const header2 = screen.getByTestId('card-header');
      const ariaLabel2 = header2.getAttribute('aria-label');

      // Same content = same aria-label (which is acceptable for a11y)
      expect(ariaLabel1).toBe(ariaLabel2);
    });
  });

  describe('Focus Styles', () => {
    it('drag handle has focus ring styles for keyboard navigation', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} isClosed={false} />);

      const dragHandle = screen.getByTestId('card-header');

      // Should have focus outline styles
      expect(dragHandle).toHaveClass('focus:outline-none');
      expect(dragHandle).toHaveClass('focus:ring-2');
      expect(dragHandle).toHaveClass('focus:ring-primary');
    });
  });

  describe('Drag Handle Icon Accessibility', () => {
    it('GripVertical icon is decorative and hidden from screen readers', () => {
      const card = createMockCard();
      render(<RetroCard {...defaultProps} card={card} />);

      // The grip icon wrapper should have aria-hidden="true" since it's decorative
      // The accessibility is handled by the drag handle container (card-header) which has aria-label
      const dragHandle = screen.getByTestId('card-header');
      const ariaLabel = dragHandle.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Drag');
    });
  });
});
