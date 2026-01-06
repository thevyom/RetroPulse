/**
 * Playwright Global Teardown
 * Cleans up test data created during E2E tests
 */

import type { FullConfig } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Get admin secret from env - fail fast in CI if not provided
const envAdminSecret = process.env.ADMIN_SECRET;
if (!envAdminSecret && process.env.CI) {
  throw new Error('ADMIN_SECRET environment variable required in CI environment');
}
// Use fallback only for local development
const ADMIN_SECRET = envAdminSecret || 'dev-admin-secret-16chars';

async function globalTeardown(_config: FullConfig): Promise<void> {
  const sessionId = process.env.E2E_TEST_SESSION_ID;
  const backendReady = process.env.E2E_BACKEND_READY === 'true';

  console.log('\n🧹 Running E2E test cleanup...\n');

  if (!backendReady) {
    console.log('⏭️  Skipping cleanup - backend was not available during tests\n');
    return;
  }

  if (!sessionId) {
    console.log('⏭️  Skipping cleanup - no test session ID found\n');
    return;
  }

  try {
    // Try to clean up test boards created with the e2e- prefix
    // This relies on the backend having a test cleanup endpoint
    console.log(`📝 Test Session ID: ${sessionId}`);

    // Attempt to call cleanup endpoint
    const cleanupUrl = `${BACKEND_URL}/v1/test/cleanup`;
    const response = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': ADMIN_SECRET,
      },
      body: JSON.stringify({
        sessionId,
        prefix: 'e2e-',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Cleanup completed: ${JSON.stringify(result)}`);
    } else if (response.status === 404) {
      // Cleanup endpoint doesn't exist - that's OK
      console.log('ℹ️  Cleanup endpoint not available (404) - test data may persist');
      console.log('   Consider implementing POST /v1/test/cleanup on the backend');
    } else {
      console.warn(`⚠️  Cleanup returned status ${response.status}`);
    }
  } catch (error) {
    // Don't fail the test run if cleanup fails
    console.warn(`⚠️  Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   Test data may persist in the database');
  }

  console.log('\n✅ Teardown complete\n');
}

export default globalTeardown;
