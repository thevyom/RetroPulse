import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorFallback } from '@/shared/components/ErrorBoundary';

// ============================================================================
// Test Helpers
// ============================================================================

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content</div>;
}

// Suppress console.error during tests since we expect errors
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// ============================================================================
// ErrorFallback Tests
// ============================================================================

describe('ErrorFallback', () => {
  it('renders error message', () => {
    const error = new Error('Something broke');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-123" onReset={onReset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('displays error ID for support reference', () => {
    const error = new Error('Test error');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-ABC123" onReset={onReset} />);

    expect(screen.getByText(/Error ID: ERR-ABC123/)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    const error = new Error('Test error');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-123" onReset={onReset} />);

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('renders Go Home button', () => {
    const error = new Error('Test error');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-123" onReset={onReset} />);

    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('calls onReset when Try Again is clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Test error');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-123" onReset={onReset} />);

    await user.click(screen.getByRole('button', { name: /Try Again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('has accessible role="alert"', () => {
    const error = new Error('Test error');
    const onReset = vi.fn();

    render(<ErrorFallback error={error} errorId="ERR-123" onReset={onReset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ============================================================================
// ErrorBoundary Tests
// ============================================================================

describe('ErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('does not render fallback UI', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('catches error and displays fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not render children when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Child content')).not.toBeInTheDocument();
    });

    it('displays a unique error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorIdElement = screen.getByText(/Error ID: ERR-/);
      expect(errorIdElement).toBeInTheDocument();
    });
  });

  describe('onError callback', () => {
    it('calls onError callback with error details', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('passes the actual error to onError callback', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe('Test error message');
    });
  });

  describe('reset functionality', () => {
    it('resets error state when Try Again is clicked', async () => {
      const user = userEvent.setup();

      // Need to import React for the test component
      const React = await import('react');

      function TestComponent() {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <ErrorBoundary onReset={() => setShouldThrow(false)}>
            <ThrowError shouldThrow={shouldThrow} />
          </ErrorBoundary>
        );
      }

      render(<TestComponent />);

      // Initially shows error
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click Try Again
      await user.click(screen.getByRole('button', { name: /Try Again/i }));

      // Should now show child content
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('calls onReset callback when reset', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /Try Again/i }));

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('multiple errors', () => {
    it('handles errors in sibling components independently', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <ErrorBoundary>
            <div>Safe sibling</div>
          </ErrorBoundary>
        </div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Safe sibling')).toBeInTheDocument();
    });
  });
});
