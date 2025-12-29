# Phase 1: Project Setup & Infrastructure

**Status**: 🔲 NOT STARTED
**Priority**: High
**Tasks**: 0/4 complete

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md)

---

## 🎯 Phase Goal

Initialize the React + TypeScript project with Vite, configure all core dependencies, set up the testing framework, and establish the MVVM folder structure with path aliases.

---

## 📋 Task Breakdown

### 1.1 Initialize Vite + React + TypeScript Project

- [ ] Create project with `npm create vite@latest`
- [ ] Configure TypeScript with strict mode
- [ ] Set up ESLint + Prettier
- [ ] Verify development server runs

**Commands:**
```bash
npm create vite@latest retropulse-frontend -- --template react-ts
cd retropulse-frontend
npm install
```

**TSConfig Settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Reference**: Tech stack decision from design doc

---

### 1.2 Install and Configure Core Dependencies

- [ ] Install React 18+, TypeScript 5+
- [ ] Install Zustand for state management
- [ ] Install Material-UI v5 for UI components
- [ ] Install @dnd-kit for drag-and-drop
- [ ] Install Socket.io-client for real-time
- [ ] Install axios for HTTP requests
- [ ] Verify all imports work

**Commands:**
```bash
# State management
npm install zustand

# UI components
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Real-time & HTTP
npm install socket.io-client axios
```

**Reference**: Technology stack (Section 1.2 of design doc)

---

### 1.3 Configure Testing Framework

- [ ] Install Vitest + React Testing Library
- [ ] Install Playwright for E2E testing
- [ ] Install MSW (Mock Service Worker) for API mocking
- [ ] Configure coverage reporting (c8/v8)
- [ ] Create test utilities and setup files
- [ ] Verify test runner works

**Commands:**
```bash
# Unit testing
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# E2E testing
npm install -D @playwright/test
npx playwright install

# API mocking
npm install -D msw
```

**Vitest Config** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, functions: 80, branches: 80 }
    }
  }
});
```

**Reference**: Test plan Section 1.2

---

### 1.4 Set Up Project Structure Following MVVM

- [ ] Create folder structure: `features/`, `shared/`, `models/`
- [ ] Create subfolders: `components/`, `viewmodels/`, `models/`, `types/`
- [ ] Set up path aliases in tsconfig.json (@/, @shared/, @features/)
- [ ] Verify path aliases resolve correctly

**Folder Structure:**
```
src/
├── features/
│   ├── board/
│   │   ├── components/
│   │   └── viewmodels/
│   ├── card/
│   │   ├── components/
│   │   └── viewmodels/
│   ├── participant/
│   │   ├── components/
│   │   └── viewmodels/
│   └── user/
│       ├── components/
│       └── viewmodels/
├── shared/
│   ├── components/
│   ├── validation/
│   └── types/
├── models/
│   ├── api/
│   ├── socket/
│   └── stores/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**TSConfig Path Aliases:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"],
      "@models/*": ["src/models/*"]
    }
  }
}
```

**Vite Config** (for path aliases):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@models': path.resolve(__dirname, './src/models'),
    }
  }
});
```

**Reference**: MVVM architecture pattern

---

## 📁 Files to Create

```
frontend/
├── src/
│   ├── features/
│   │   ├── board/
│   │   │   ├── components/.gitkeep
│   │   │   └── viewmodels/.gitkeep
│   │   ├── card/
│   │   │   ├── components/.gitkeep
│   │   │   └── viewmodels/.gitkeep
│   │   ├── participant/
│   │   │   ├── components/.gitkeep
│   │   │   └── viewmodels/.gitkeep
│   │   └── user/
│   │       ├── components/.gitkeep
│   │       └── viewmodels/.gitkeep
│   ├── shared/
│   │   ├── components/.gitkeep
│   │   ├── validation/.gitkeep
│   │   └── types/.gitkeep
│   ├── models/
│   │   ├── api/.gitkeep
│   │   ├── socket/.gitkeep
│   │   └── stores/.gitkeep
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── setup.ts
│   ├── unit/.gitkeep
│   ├── integration/.gitkeep
│   └── e2e/.gitkeep
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .eslintrc.cjs
├── .prettierrc
└── .gitignore
```

---

## ✅ Acceptance Criteria

- [ ] `npm run dev` starts development server without errors
- [ ] `npm run build` creates production build
- [ ] `npm run test` runs Vitest successfully
- [ ] `npm run test:e2e` runs Playwright successfully
- [ ] Path aliases resolve in IDE and at runtime
- [ ] ESLint and Prettier configured and working

---

## 📝 Notes

- Use Node.js 20+ for best compatibility
- Ensure `.env.example` is created with required environment variables
- Consider adding `husky` for pre-commit hooks (covered in Phase 8)

---

[← Back to Master Task List](../FRONTEND_MASTER_TASK_LIST.md) | [Next: Phase 2 - Shared Utilities →](./FRONTEND_PHASE_02_SHARED_UTILITIES.md)
