import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LoadingIndicator,
  CardSkeleton,
  ColumnSkeleton,
  HeaderSkeleton,
  BoardSkeleton,
} from '@/shared/components/LoadingIndicator';

// ============================================================================
// LoadingIndicator - Spinner Variant Tests
// ============================================================================

describe('LoadingIndicator - Spinner Variant', () => {
  it('renders spinner variant by default', () => {
    render(<LoadingIndicator />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders spinner with explicit variant prop', () => {
    render(<LoadingIndicator variant="spinner" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders spinner with message', () => {
    render(<LoadingIndicator variant="spinner" message="Loading data..." />);

    // Message appears in visible span (not sr-only)
    const visibleMessage = screen.getByText('Loading data...', {
      selector: '.text-muted-foreground:not(.sr-only)',
    });
    expect(visibleMessage).toBeInTheDocument();
  });

  it('applies small size correctly', () => {
    render(<LoadingIndicator variant="spinner" size="small" />);

    // The spinner icon should have h-4 w-4 class
    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4');
  });

  it('applies medium size correctly', () => {
    render(<LoadingIndicator variant="spinner" size="medium" />);

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('h-8', 'w-8');
  });

  it('applies large size correctly', () => {
    render(<LoadingIndicator variant="spinner" size="large" />);

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('h-12', 'w-12');
  });

  it('has aria-busy attribute', () => {
    render(<LoadingIndicator variant="spinner" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('has aria-live attribute', () => {
    render(<LoadingIndicator variant="spinner" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('uses custom aria-label when provided', () => {
    render(<LoadingIndicator variant="spinner" aria-label="Custom loading message" />);

    expect(screen.getByLabelText('Custom loading message')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingIndicator variant="spinner" className="custom-class" />);

    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
});

// ============================================================================
// LoadingIndicator - Linear Variant Tests
// ============================================================================

describe('LoadingIndicator - Linear Variant', () => {
  it('renders linear progress variant', () => {
    render(<LoadingIndicator variant="linear" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders linear progress with message', () => {
    render(<LoadingIndicator variant="linear" message="Saving changes..." />);

    // Message appears in visible span (not sr-only)
    const visibleMessage = screen.getByText('Saving changes...', {
      selector: '.text-muted-foreground:not(.sr-only)',
    });
    expect(visibleMessage).toBeInTheDocument();
  });

  it('has aria-busy attribute', () => {
    render(<LoadingIndicator variant="linear" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');
  });

  it('has aria-live attribute', () => {
    render(<LoadingIndicator variant="linear" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-live', 'polite');
  });

  it('uses custom aria-label when provided', () => {
    render(<LoadingIndicator variant="linear" aria-label="Uploading file" />);

    expect(screen.getByLabelText('Uploading file')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingIndicator variant="linear" className="progress-custom" />);

    expect(screen.getByRole('progressbar')).toHaveClass('progress-custom');
  });
});

// ============================================================================
// LoadingIndicator - Skeleton Variant Tests
// ============================================================================

describe('LoadingIndicator - Skeleton Variant', () => {
  it('renders skeleton variant with default board type', () => {
    render(<LoadingIndicator variant="skeleton" />);

    // Get the outermost status container
    const statusElements = screen.getAllByRole('status');
    expect(statusElements.length).toBeGreaterThan(0);
    // Multiple elements may have the same aria-label due to nesting
    const labeledElements = screen.getAllByLabelText('Loading board');
    expect(labeledElements.length).toBeGreaterThan(0);
  });

  it('renders header skeleton type', () => {
    render(<LoadingIndicator variant="skeleton" skeletonType="header" />);

    expect(screen.getByLabelText('Loading header')).toBeInTheDocument();
  });

  it('renders column skeleton type', () => {
    render(<LoadingIndicator variant="skeleton" skeletonType="column" />);

    expect(screen.getByLabelText('Loading column')).toBeInTheDocument();
  });

  it('renders card skeleton type', () => {
    render(<LoadingIndicator variant="skeleton" skeletonType="card" />);

    expect(screen.getByLabelText('Loading card')).toBeInTheDocument();
  });

  it('has aria-busy attribute on outermost container', () => {
    render(<LoadingIndicator variant="skeleton" />);

    const statusElements = screen.getAllByRole('status');
    // The outermost container should have aria-busy
    expect(statusElements[0]).toHaveAttribute('aria-busy', 'true');
  });

  it('uses custom aria-label when provided', () => {
    render(
      <LoadingIndicator
        variant="skeleton"
        skeletonType="board"
        aria-label="Fetching retrospective"
      />
    );

    expect(screen.getByLabelText('Fetching retrospective')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingIndicator variant="skeleton" className="skeleton-custom" />);

    // Get the outermost status element (the SkeletonLoader wrapper)
    const statusElements = screen.getAllByRole('status');
    expect(statusElements[0]).toHaveClass('skeleton-custom');
  });
});

// ============================================================================
// Individual Skeleton Component Tests
// ============================================================================

describe('CardSkeleton', () => {
  it('renders card skeleton structure', () => {
    render(<CardSkeleton />);

    // Card skeleton has a container with multiple skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has proper styling classes', () => {
    const { container } = render(<CardSkeleton />);

    const cardContainer = container.firstChild;
    expect(cardContainer).toHaveClass('rounded-lg', 'border', 'p-4');
  });
});

describe('ColumnSkeleton', () => {
  it('renders column skeleton with cards', () => {
    render(<ColumnSkeleton />);

    // Column contains multiple card skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it('has proper width styling', () => {
    const { container } = render(<ColumnSkeleton />);

    const columnContainer = container.firstChild;
    expect(columnContainer).toHaveClass('w-80');
  });
});

describe('HeaderSkeleton', () => {
  it('renders header skeleton structure', () => {
    const { container } = render(<HeaderSkeleton />);

    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-between');
  });

  it('has border styling', () => {
    const { container } = render(<HeaderSkeleton />);

    expect(container.firstChild).toHaveClass('border-b');
  });
});

describe('BoardSkeleton', () => {
  it('renders board skeleton with header and columns', () => {
    render(<BoardSkeleton />);

    // BoardSkeleton now relies on parent wrapper for role/aria attributes
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(10);
  });

  it('contains multiple column skeletons', () => {
    render(<BoardSkeleton />);

    // Board skeleton contains 3 columns, each with multiple skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(10);
  });

  it('renders header skeleton', () => {
    render(<BoardSkeleton />);

    // Check for header structure (border-b class is on HeaderSkeleton)
    const header = document.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('LoadingIndicator Accessibility', () => {
  it('spinner has screen reader only text', () => {
    render(<LoadingIndicator variant="spinner" message="Loading items" />);

    const srOnly = document.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent('Loading items');
  });

  it('linear progress has screen reader only text', () => {
    render(<LoadingIndicator variant="linear" aria-label="Uploading" />);

    const srOnly = document.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent('Uploading');
  });

  it('skeleton has screen reader only text', () => {
    render(<LoadingIndicator variant="skeleton" skeletonType="board" />);

    const srOnlyElements = document.querySelectorAll('.sr-only');
    expect(srOnlyElements.length).toBeGreaterThan(0);
    // At least one sr-only should contain the loading text
    const hasLoadingText = Array.from(srOnlyElements).some((el) =>
      el.textContent?.includes('Loading board')
    );
    expect(hasLoadingText).toBe(true);
  });

  it('spinner icon is hidden from screen readers', () => {
    render(<LoadingIndicator variant="spinner" />);

    const icon = document.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
