/**
 * HomePage Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '@/features/home/components/HomePage';

// Mock the CreateBoardDialog
vi.mock('@/features/home/components/CreateBoardDialog', () => ({
  CreateBoardDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-board-dialog">Mock Dialog</div> : null,
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the home page with correct test id', () => {
      renderWithRouter(<HomePage />);
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should display logo and title', () => {
      renderWithRouter(<HomePage />);
      expect(screen.getByTestId('home-logo')).toBeInTheDocument();
      expect(screen.getByTestId('home-title')).toHaveTextContent('RetroPulse');
    });

    it('should display tagline', () => {
      renderWithRouter(<HomePage />);
      expect(screen.getByTestId('home-tagline')).toHaveTextContent(
        'Collaborative Retrospective Boards'
      );
    });

    it('should display description', () => {
      renderWithRouter(<HomePage />);
      expect(screen.getByTestId('home-description')).toBeInTheDocument();
      expect(screen.getByText(/run effective retrospectives/i)).toBeInTheDocument();
    });

    it('should display Create New Board button', () => {
      renderWithRouter(<HomePage />);
      const button = screen.getByTestId('create-board-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Create New Board');
    });

    it('should display feature list with 4 items', () => {
      renderWithRouter(<HomePage />);
      const featureList = screen.getByTestId('feature-list');
      expect(featureList).toBeInTheDocument();

      const listItems = featureList.querySelectorAll('li');
      expect(listItems).toHaveLength(4);
    });

    it('should display all feature items', () => {
      renderWithRouter(<HomePage />);

      expect(screen.getByText('Real-time collaboration with your team')).toBeInTheDocument();
      expect(screen.getByText('Organize feedback into categories')).toBeInTheDocument();
      expect(screen.getByText('Vote on the most important items')).toBeInTheDocument();
      expect(screen.getByText('Create action items from discussions')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open CreateBoardDialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<HomePage />);

      // Dialog should not be visible initially
      expect(screen.queryByTestId('create-board-dialog')).not.toBeInTheDocument();

      // Click the button
      await user.click(screen.getByTestId('create-board-button'));

      // Dialog should now be visible
      expect(screen.getByTestId('create-board-dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithRouter(<HomePage />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('RetroPulse');
    });

    it('should have main landmark', () => {
      renderWithRouter(<HomePage />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have accessible button', () => {
      renderWithRouter(<HomePage />);
      const button = screen.getByRole('button', { name: /create new board/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should have centered content container', () => {
      renderWithRouter(<HomePage />);
      const container = screen.getByTestId('home-page').querySelector('div');
      expect(container).toHaveClass('max-w-[600px]');
      expect(container).toHaveClass('text-center');
    });

    it('should have proper button dimensions', () => {
      renderWithRouter(<HomePage />);
      const button = screen.getByTestId('create-board-button');
      expect(button).toHaveClass('w-[280px]');
      expect(button).toHaveClass('h-12');
    });
  });
});
