import type { JSX } from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type LoadingVariant = 'skeleton' | 'spinner' | 'linear';
export type SkeletonType = 'board' | 'header' | 'column' | 'card';
export type LoadingSize = 'small' | 'medium' | 'large';

export interface LoadingIndicatorProps {
  variant?: LoadingVariant;
  skeletonType?: SkeletonType;
  size?: LoadingSize;
  message?: string;
  'aria-label'?: string;
  className?: string;
}

// ============================================================================
// Size Mappings
// ============================================================================

const spinnerSizes: Record<LoadingSize, string> = {
  small: 'h-4 w-4',
  medium: 'h-8 w-8',
  large: 'h-12 w-12',
};

const linearHeights: Record<LoadingSize, string> = {
  small: 'h-1',
  medium: 'h-2',
  large: 'h-3',
};

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size: LoadingSize;
  message?: string;
  'aria-label'?: string;
  className?: string;
}

function Spinner({ size, message, 'aria-label': ariaLabel, className }: SpinnerProps): JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel || 'Loading'}
      className={cn('flex flex-col items-center justify-center gap-2', className)}
    >
      <Loader2 className={cn('animate-spin text-primary', spinnerSizes[size])} aria-hidden="true" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
      <span className="sr-only">{ariaLabel || message || 'Loading'}</span>
    </div>
  );
}

// ============================================================================
// Linear Progress Component
// ============================================================================

interface LinearProgressProps {
  size: LoadingSize;
  message?: string;
  'aria-label'?: string;
  className?: string;
}

function LinearProgress({
  size,
  message,
  'aria-label': ariaLabel,
  className,
}: LinearProgressProps): JSX.Element {
  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel || 'Loading'}
      className={cn('w-full', className)}
    >
      <div className={cn('w-full overflow-hidden rounded-full bg-muted', linearHeights[size])}>
        <div className="h-full w-2/5 animate-pulse bg-primary" />
      </div>
      {message && (
        <span className="mt-2 block text-center text-sm text-muted-foreground">{message}</span>
      )}
      <span className="sr-only">{ariaLabel || message || 'Loading'}</span>
    </div>
  );
}

// ============================================================================
// Skeleton Components
// ============================================================================

function CardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-6 w-12" />
      </div>
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function ColumnSkeleton(): JSX.Element {
  return (
    <div className="flex w-80 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <Skeleton className="h-6 w-32" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

function HeaderSkeleton(): JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

function BoardSkeleton(): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <HeaderSkeleton />
      <div className="flex gap-2 overflow-x-auto p-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        <ColumnSkeleton />
        <ColumnSkeleton />
        <ColumnSkeleton />
      </div>
    </div>
  );
}

interface SkeletonLoaderProps {
  type: SkeletonType;
  'aria-label'?: string;
  className?: string;
}

function SkeletonLoader({
  type,
  'aria-label': ariaLabel,
  className,
}: SkeletonLoaderProps): JSX.Element {
  const skeletonComponents: Record<SkeletonType, JSX.Element> = {
    board: <BoardSkeleton />,
    header: <HeaderSkeleton />,
    column: <ColumnSkeleton />,
    card: <CardSkeleton />,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel || `Loading ${type}`}
      className={className}
    >
      {skeletonComponents[type]}
      <span className="sr-only">{ariaLabel || `Loading ${type}`}</span>
    </div>
  );
}

// ============================================================================
// Main LoadingIndicator Component
// ============================================================================

export function LoadingIndicator({
  variant = 'spinner',
  skeletonType = 'board',
  size = 'medium',
  message,
  'aria-label': ariaLabel,
  className,
}: LoadingIndicatorProps): JSX.Element {
  switch (variant) {
    case 'skeleton':
      return <SkeletonLoader type={skeletonType} aria-label={ariaLabel} className={className} />;

    case 'linear':
      return (
        <LinearProgress
          size={size}
          message={message}
          aria-label={ariaLabel}
          className={className}
        />
      );

    case 'spinner':
    default:
      return <Spinner size={size} message={message} aria-label={ariaLabel} className={className} />;
  }
}

// Export individual skeleton components for direct use
export { CardSkeleton, ColumnSkeleton, HeaderSkeleton, BoardSkeleton };

export default LoadingIndicator;
