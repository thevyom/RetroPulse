import { Component } from 'react';
import type { ErrorInfo, ReactNode, JSX } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

// ============================================================================
// ErrorFallback Component
// ============================================================================

export interface ErrorFallbackProps {
  error: Error;
  errorId: string;
  onReset: () => void;
}

export function ErrorFallback({ error, errorId, onReset }: ErrorFallbackProps): JSX.Element {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div
      role="alert"
      className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center"
    >
      <div className="mb-6 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-foreground">Something went wrong</h2>

      <p className="mb-6 max-w-md text-muted-foreground">
        We encountered an unexpected error. Please try again or return to the home page.
      </p>

      {isDevelopment && (
        <details className="mb-6 w-full max-w-lg rounded-md border border-border bg-muted p-4 text-left">
          <summary className="cursor-pointer font-medium text-foreground">
            Error Details (Development Only)
          </summary>
          <pre className="mt-2 overflow-auto text-sm text-destructive">{error.message}</pre>
          {error.stack && (
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">{error.stack}</pre>
          )}
        </details>
      )}

      <div className="flex gap-4">
        <Button onClick={onReset} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>

        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          <Home className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">Error ID: {errorId}</p>
    </div>
  );
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a simple error ID for support reference
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }

    // Call the onError callback if provided (for error monitoring services)
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });

    // Call the onReset callback if provided
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorId) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use default ErrorFallback
      return <ErrorFallback error={error} errorId={errorId} onReset={this.handleReset} />;
    }

    return children;
  }
}

export default ErrorBoundary;
