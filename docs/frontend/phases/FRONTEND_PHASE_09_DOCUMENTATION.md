# Phase 9: Documentation & Handoff

**Status**: 🔲 NOT STARTED
**Priority**: Low
**Tasks**: 0/4 complete
**Dependencies**: Phase 8 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Create comprehensive documentation for future developers. This includes code documentation, optional Storybook setup for component visualization, and developer onboarding guides.

---

## 📋 Task Breakdown

### 27. Code Documentation

#### 27.1 Document All ViewModels with JSDoc

- [ ] Document hook parameters and return types
- [ ] Explain business logic in complex functions
- [ ] Add usage examples in comments

**JSDoc Example:**
```typescript
/**
 * ViewModel hook for managing board state and actions.
 *
 * Handles board data loading, admin actions (rename, close),
 * and real-time event subscriptions.
 *
 * @param boardId - The ID of the board to manage
 * @returns Board state and action handlers
 *
 * @example
 * ```tsx
 * function BoardPage() {
 *   const { board, isAdmin, handleRenameBoard } = useBoardViewModel(boardId);
 *
 *   return (
 *     <Header
 *       title={board?.name}
 *       canEdit={isAdmin}
 *       onEdit={handleRenameBoard}
 *     />
 *   );
 * }
 * ```
 */
export function useBoardViewModel(boardId: string): UseBoardViewModelResult {
  // Implementation
}

/**
 * Checks if a card can be dropped on a target.
 *
 * Validates drop based on:
 * - Card types (feedback→feedback OK, feedback→action NOT OK)
 * - Circular relationship prevention
 * - Column drop zones
 *
 * @param sourceId - ID of the dragged card
 * @param targetId - ID of the drop target (card or column)
 * @param targetType - Whether target is a 'card' or 'column'
 * @returns true if drop is valid
 */
function canDropOn(sourceId: string, targetId: string, targetType: 'card' | 'column'): boolean {
  // Implementation
}
```

**Reference**: Code maintainability

---

#### 27.2 Create Component Storybook (Optional)

- [ ] Set up Storybook
- [ ] Create stories for all View components
- [ ] Document props and variations

**Storybook Setup:**
```bash
npx storybook@latest init
```

**Story Example:**
```typescript
// RetroCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { RetroCard } from './RetroCard';

const meta: Meta<typeof RetroCard> = {
  title: 'Features/Card/RetroCard',
  component: RetroCard,
  tags: ['autodocs'],
  argTypes: {
    onReact: { action: 'reacted' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof RetroCard>;

export const Default: Story = {
  args: {
    card: {
      id: 'card-1',
      content: 'Great team collaboration this sprint!',
      column_type: 'went_well',
      aggregated_reaction_count: 5,
      children: [],
    },
    isOwner: true,
    canReact: true,
    hasReacted: false,
  },
};

export const WithChildren: Story = {
  args: {
    ...Default.args,
    card: {
      ...Default.args.card,
      children: [
        { id: 'child-1', content: 'Specifically the design reviews', parent_card_id: 'card-1' },
        { id: 'child-2', content: 'Also the async standups', parent_card_id: 'card-1' },
      ],
    },
  },
};

export const LinkedCard: Story = {
  args: {
    ...Default.args,
    card: {
      ...Default.args.card,
      parent_card_id: 'parent-1',
    },
  },
};

export const Anonymous: Story = {
  args: {
    ...Default.args,
    card: {
      ...Default.args.card,
      is_anonymous: true,
    },
    isOwner: false,
  },
};
```

**Reference**: Component documentation

---

### 28. Developer Onboarding

#### 28.1 Create README with Setup Instructions

- [ ] Document npm commands
- [ ] Explain project structure
- [ ] Add environment variable configuration
- [ ] Include troubleshooting guide

**README Template:**
```markdown
# RetroPulse Frontend

A real-time retrospective board application built with React, TypeScript, and Zustand.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
src/
├── features/              # Feature-based modules
│   ├── board/             # Board feature
│   │   ├── components/    # View layer (React components)
│   │   ├── viewmodels/    # ViewModel layer (hooks)
│   │   └── models/        # Model layer (API, stores)
│   ├── card/
│   ├── participant/
│   └── user/
├── shared/                # Shared utilities
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Shared hooks
│   └── utils/             # Utility functions
└── tests/                 # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

## Architecture

This project follows the MVVM (Model-View-ViewModel) pattern:

- **Model**: API services, WebSocket client, Zustand stores
- **ViewModel**: React hooks that coordinate state and business logic
- **View**: React components that render UI

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000` |
| `VITE_WS_URL` | WebSocket URL | `http://localhost:4000` |

## Troubleshooting

### WebSocket connection fails
- Ensure backend is running on the configured port
- Check CORS settings in backend

### Tests fail with "store not found"
- Ensure store providers are wrapped in test setup
```

**Reference**: Developer experience

---

#### 28.2 Create CONTRIBUTING Guide

- [ ] Explain MVVM architecture
- [ ] Document testing requirements
- [ ] Provide PR checklist

**CONTRIBUTING.md Template:**
```markdown
# Contributing to RetroPulse Frontend

## Architecture Guidelines

### MVVM Pattern

Every feature follows the Model-View-ViewModel pattern:

1. **Model Layer** (`models/`)
   - API services for HTTP requests
   - Zustand stores for state management
   - Types and interfaces

2. **ViewModel Layer** (`viewmodels/`)
   - Custom hooks that coordinate state and actions
   - Business logic lives here
   - Should be the only layer calling APIs

3. **View Layer** (`components/`)
   - Pure React components
   - Receive data via props from ViewModels
   - Minimal logic - just rendering

### Adding a New Feature

1. Create feature directory: `src/features/<feature>/`
2. Add types in `models/types.ts`
3. Create API service in `models/<feature>API.ts`
4. Create Zustand store in `models/<feature>Store.ts`
5. Create ViewModel hook in `viewmodels/use<Feature>ViewModel.ts`
6. Create View components in `components/`
7. Write tests for each layer

## Testing Requirements

### Before Submitting a PR

- [ ] Unit tests for ViewModel hooks
- [ ] Unit tests for View components
- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Test coverage >= 80%

### PR Checklist

- [ ] Descriptive PR title
- [ ] Linked to related issue
- [ ] Screenshots for UI changes
- [ ] Updated documentation if needed
- [ ] Self-reviewed code
```

**Reference**: Team collaboration

---

## 📁 Files to Create

```
frontend/
├── README.md
├── CONTRIBUTING.md
├── .storybook/           (optional)
│   ├── main.ts
│   └── preview.ts
└── src/features/*/
    ├── components/*.stories.tsx
    └── viewmodels/*.ts   (with JSDoc)
```

---

## 🧪 Test Requirements

| Test Suite | Tests | Focus |
|------------|-------|-------|
| Documentation | - | Manual review |
| **Total** | **0** | |

---

## ✅ Acceptance Criteria

- [ ] All ViewModels have JSDoc documentation
- [ ] README enables new developer setup in < 10 minutes
- [ ] CONTRIBUTING explains architecture clearly
- [ ] (Optional) Storybook showcases all components

---

## 📝 Notes

- JSDoc is preferred over separate docs for code proximity
- Storybook is optional but valuable for design handoff
- Keep README focused on "getting started" quickly
- CONTRIBUTING should be referenced in PR templates

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Previous: Phase 8](./FRONTEND_PHASE_08_POLISH_PRODUCTION.md)
