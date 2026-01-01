import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'node_modules'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/index.ts',
          'src/main.tsx',
          // Exclude axios interceptor code - requires integration testing
          'src/models/api/client.ts',
          // Exclude shadcn/ui components - they are externally tested
          'src/components/ui/**',
          // Exclude type-only files (no runtime code)
          'src/models/types/board.ts',
          'src/models/types/card.ts',
          'src/models/types/reaction.ts',
          'src/models/types/user.ts',
          // Exclude view components - best tested via E2E (Playwright)
          'src/features/board/components/RetroBoardPage.tsx',
          'src/features/board/components/BoardHeader.tsx',
          'src/features/board/components/SortableCardHeader.tsx',
          'src/features/card/components/RetroColumn.tsx',
          'src/features/participant/components/ParticipantDropdown.tsx',
          'src/features/participant/components/ParticipantAvatar.tsx',
          'src/features/user/components/MyUserCard.tsx',
        ],
        thresholds: {
          lines: 85,
          functions: 80,
          branches: 82, // View components tested via E2E - improve in next iteration
          statements: 85,
        },
      },
    },
  })
);
