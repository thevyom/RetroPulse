# Phase 2: Shared Utilities & Infrastructure Components

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/6 complete
**Dependencies**: Phase 1 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Implement shared utilities for form validation, error boundaries, and loading indicators that will be used across all features. These foundational components ensure consistent behavior and user experience.

---

## 📋 Task Breakdown

### 2.1 Implement Form Validation Module

- [ ] Create `shared/validation/index.ts`
- [ ] Implement `validateAlias()` function with ALIAS_PATTERN regex
- [ ] Implement `validateCardContent()` with length checks
- [ ] Implement `validateBoardName()` with length validation
- [ ] Implement `validateColumnName()` with constraints
- [ ] Export constants (MAX_ALIAS_LENGTH, MAX_CARD_CONTENT_LENGTH, etc.)

**Validation Rules:**

| Field | Min | Max | Pattern | Notes |
|-------|-----|-----|---------|-------|
| Alias | 1 | 50 | `/^[a-zA-Z0-9 _-]+$/` | Alphanumeric, spaces, hyphens, underscores |
| Card Content | 1 | 5000 | - | Trimmed, non-empty |
| Board Name | 1 | 200 | - | Trimmed, non-empty |
| Column Name | 1 | 100 | - | Trimmed, non-empty |

**Implementation:**
```typescript
// shared/validation/index.ts
export const ALIAS_PATTERN = /^[a-zA-Z0-9 _-]+$/;
export const MAX_ALIAS_LENGTH = 50;
export const MAX_CARD_CONTENT_LENGTH = 5000;
export const MAX_BOARD_NAME_LENGTH = 200;
export const MAX_COLUMN_NAME_LENGTH = 100;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateAlias(alias: string): ValidationResult { ... }
export function validateCardContent(content: string): ValidationResult { ... }
export function validateBoardName(name: string): ValidationResult { ... }
export function validateColumnName(name: string): ValidationResult { ... }
```

**Reference**: Section 4.12 of design doc

---

### 2.2 Write Unit Tests for Validation Utilities

- [ ] Test valid inputs pass validation
- [ ] Test empty/null inputs fail with correct error
- [ ] Test length boundaries (min/max)
- [ ] Test special character validation for alias
- [ ] Test trimming behavior

**Test Cases:**
```typescript
describe('validateAlias', () => {
  it('accepts valid alias', () => { ... });
  it('rejects empty alias', () => { ... });
  it('rejects alias exceeding max length', () => { ... });
  it('rejects alias with invalid characters', () => { ... });
  it('trims whitespace before validation', () => { ... });
});
```

**Reference**: Test plan Section 5

---

### 3.1 Implement ErrorBoundary Component

- [ ] Create `shared/components/ErrorBoundary.tsx`
- [ ] Implement React error boundary lifecycle methods
- [ ] Create ErrorFallback UI component
- [ ] Add reset functionality
- [ ] Implement onError callback for logging

**Implementation:**
```typescript
// shared/components/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { ... }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void { ... }
  handleReset = (): void => { ... }
  render(): React.ReactNode { ... }
}
```

**ErrorFallback UI:**
- Display error message (user-friendly)
- Show "Try Again" button
- Optionally show error details in development

**Reference**: Section 4.10 of design doc

---

### 3.2 Write Tests for ErrorBoundary

- [ ] Test catches component errors
- [ ] Test displays fallback UI
- [ ] Test onError callback invoked
- [ ] Test reset functionality

**Test Cases:**
```typescript
describe('ErrorBoundary', () => {
  it('catches error and displays fallback', () => { ... });
  it('calls onError callback with error details', () => { ... });
  it('resets error state when reset clicked', () => { ... });
  it('renders children when no error', () => { ... });
});
```

**Reference**: Test plan Section 11.1.1

---

### 4.1 Implement LoadingIndicator Variants

- [ ] Create `shared/components/LoadingIndicator.tsx`
- [ ] Implement Skeleton variant (BoardSkeleton, HeaderSkeleton, ColumnSkeleton)
- [ ] Implement Spinner variant (CircularProgress wrapper)
- [ ] Implement LinearProgress variant
- [ ] Add aria-busy and aria-live attributes

**Implementation:**
```typescript
// shared/components/LoadingIndicator.tsx
type LoadingVariant = 'skeleton' | 'spinner' | 'linear';
type SkeletonType = 'board' | 'header' | 'column' | 'card';

interface LoadingIndicatorProps {
  variant?: LoadingVariant;
  skeletonType?: SkeletonType;
  size?: 'small' | 'medium' | 'large';
  'aria-label'?: string;
}

export function LoadingIndicator({
  variant = 'spinner',
  skeletonType,
  size = 'medium',
  ...props
}: LoadingIndicatorProps): JSX.Element { ... }
```

**Skeleton Variants:**
- `BoardSkeleton`: Full page skeleton with header, columns, cards
- `HeaderSkeleton`: Just the header area
- `ColumnSkeleton`: Single column with card placeholders
- `CardSkeleton`: Single card placeholder

**Reference**: Section 4.11 of design doc

---

### 4.2 Write Tests for LoadingIndicator

- [ ] Test all three variants render correctly
- [ ] Test size prop variations
- [ ] Test accessibility attributes (aria-busy, aria-live)

**Test Cases:**
```typescript
describe('LoadingIndicator', () => {
  it('renders spinner variant by default', () => { ... });
  it('renders skeleton variant', () => { ... });
  it('renders linear progress variant', () => { ... });
  it('applies correct size', () => { ... });
  it('has aria-busy attribute', () => { ... });
});
```

**Reference**: Test plan Section 11.1.2

---

## 📁 Files to Create

```
src/shared/
├── validation/
│   └── index.ts                 # Validation functions and constants
├── components/
│   ├── ErrorBoundary.tsx        # Error boundary component
│   ├── ErrorFallback.tsx        # Fallback UI for errors
│   ├── LoadingIndicator.tsx     # Loading indicator variants
│   └── index.ts                 # Exports
└── types/
    └── validation.ts            # ValidationResult type

tests/unit/shared/
├── validation/
│   └── validation.test.ts       # Validation tests
└── components/
    ├── ErrorBoundary.test.tsx   # ErrorBoundary tests
    └── LoadingIndicator.test.tsx # LoadingIndicator tests
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Validation (unit) | ~15 | All validation functions |
| ErrorBoundary (unit) | ~5 | Error catching, reset |
| LoadingIndicator (unit) | ~8 | Variants, sizes, a11y |
| **Total** | **~28** | |

---

## ✅ Acceptance Criteria

- [ ] All validation functions return `{ isValid, error }` format
- [ ] ErrorBoundary catches errors without crashing app
- [ ] LoadingIndicator renders all variants correctly
- [ ] All components have proper TypeScript types
- [ ] Unit tests pass with 100% coverage for this phase
- [ ] Accessibility attributes present on loading states

---

## 📝 Notes

- Use shadcn/ui's `<Skeleton>` component and Lucide's `<Loader2>` icon for loading states
- ErrorBoundary should log errors to console in development
- Consider adding error tracking service integration point in ErrorBoundary

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 1](./FRONTEND_PHASE_01_PROJECT_SETUP.md) | [Next: Phase 3 →](./FRONTEND_PHASE_03_MODEL_LAYER.md)
