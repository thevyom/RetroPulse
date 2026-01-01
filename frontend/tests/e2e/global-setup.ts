/**
 * Playwright Global Setup
 * Verifies backend health before running E2E tests
 */

import { FullConfig } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function checkHealth(url: string, name: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      console.log(`✅ ${name} is healthy at ${url}`);
      return true;
    }
    console.warn(`⚠️ ${name} returned status ${response.status}`);
    return false;
  } catch (error) {
    console.warn(`❌ ${name} not reachable at ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n🔍 Checking E2E test prerequisites...\n');

  // Check backend health
  const backendReady = await checkHealth(BACKEND_URL, 'Backend');

  // Check frontend (dev server should be started by Playwright webServer config)
  const frontendReady = await checkHealth(FRONTEND_URL, 'Frontend').catch(() => {
    // Frontend might not have /health, just check if it responds
    return fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.ok || r.status === 200)
      .catch(() => false);
  });

  // Set environment variable for tests to check
  if (backendReady) {
    process.env.E2E_BACKEND_READY = 'true';
    console.log('\n✅ E2E_BACKEND_READY=true - Tests will execute\n');
  } else {
    process.env.E2E_BACKEND_READY = '';
    console.log('\n⚠️ Backend not available - E2E tests will be skipped');
    console.log('   To run E2E tests:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Start the frontend: cd frontend && npm run dev');
    console.log('   3. Run tests: npm run test:e2e\n');
  }

  // Log frontend status
  if (!frontendReady) {
    console.log('⚠️ Frontend not responding - Playwright will start it via webServer config\n');
  }
}

export default globalSetup;
