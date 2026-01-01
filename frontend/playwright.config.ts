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
  retries: process.env.CI ? 2 : 1, // 1 retry locally for flaky tests
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  timeout: 60 * 1000, // Increased from 30s to 60s
  expect: {
    timeout: 15 * 1000, // Increased from 10s to 15s
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000, // Increased from 10s to 15s
    navigationTimeout: 30 * 1000, // Increased from 15s to 30s
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
  // Global teardown cleans up test data created during tests
  globalTeardown: './tests/e2e/global-teardown.ts',
});
