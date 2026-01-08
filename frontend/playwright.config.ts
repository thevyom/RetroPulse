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
  fullyParallel: false, // Run sequentially to exit on first failure
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for faster debugging
  workers: 1, // Single worker to ensure sequential execution
  reporter: [
    // Console output - shows pass/fail for each test as it runs
    ['list'],
    // JUnit XML - structured report with separate sections per test file
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    // JSON report - machine-readable, organized by test file
    ['json', { outputFile: 'playwright-report/results.json' }],
    // HTML report - only generated, not auto-opened (smaller without embedded traces)
    ['html', { open: 'never', attachmentsBaseURL: './attachments/' }],
  ],
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for expect assertions
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 15 * 1000, // 15 seconds for navigation
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
