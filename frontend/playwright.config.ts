import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Tests run against the frontend dev server (port 5173) and require
 * the backend to be running on port 3001.
 *
 * Usage:
 *   npm run test:e2e         - Run all E2E tests
 *   npm run test:e2e:ui      - Run with UI mode
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox tests can be slow, only run on CI for broader coverage
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Backend server should already be running
    // If you want Playwright to start it, uncomment below:
    // {
    //   command: 'cd ../backend && npm run dev',
    //   url: 'http://localhost:3001/health',
    //   reuseExistingServer: true,
    //   timeout: 120 * 1000,
    // },
  ],
  // Global setup verifies backend health and sets E2E_BACKEND_READY
  globalSetup: './tests/e2e/global-setup.ts',
});
