/**
 * Playwright Global Setup
 * Verifies backend health before running E2E tests
 * Generates unique session ID for test isolation
 * Creates demo boards for testing and writes IDs to a file
 */

import { FullConfig } from '@playwright/test';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Path to store board IDs for tests to read
const BOARD_IDS_FILE = path.join(__dirname, '.test-boards.json');

// Demo board types to create
const DEMO_BOARD_TYPES = ['default', 'quota', 'lifecycle', 'a11y', 'anon'];

export interface TestBoardIds {
  default?: string;
  quota?: string;
  lifecycle?: string;
  a11y?: string;
  anon?: string;
  sessionId: string;
  backendReady: boolean;
}

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
    console.warn(
      `❌ ${name} not reachable at ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

/**
 * Create a demo board for testing
 * Returns the board ID if created, or null if it already exists/fails
 */
async function createDemoBoard(name: string, sessionId: string): Promise<string | null> {
  try {
    // Default columns for retrospective boards (id is required by API)
    const defaultColumns = [
      { id: 'col-1', name: 'What Went Well', type: 'feedback' },
      { id: 'col-2', name: 'To Improve', type: 'feedback' },
      { id: 'col-3', name: 'Action Items', type: 'action' },
    ];

    const response = await fetch(`${BACKEND_URL}/v1/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Demo Board - ${name}`,
        columns: defaultColumns,
        cardLimit: name === 'quota' ? 2 : 10, // Quota board has limit of 2
        reactionLimit: name === 'quota' ? 2 : 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      const boardId = data.data?.id || data.id;
      console.log(`  ✅ Created board: ${name} (${boardId})`);
      return boardId;
    } else {
      console.warn(`  ⚠️ Failed to create board ${name}: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.warn(`  ❌ Error creating board ${name}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return null;
  }
}

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n🔍 Checking E2E test prerequisites...\n');

  // Generate unique session ID for this test run
  const sessionId = randomUUID();
  process.env.E2E_TEST_SESSION_ID = sessionId;
  console.log(`📝 Test Session ID: ${sessionId}`);

  // Initialize board IDs object
  const boardIds: TestBoardIds = {
    sessionId,
    backendReady: false,
  };

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
    boardIds.backendReady = true;
    console.log('\n✅ E2E_BACKEND_READY=true - Tests will execute\n');

    // Create demo boards for testing
    console.log('📋 Creating demo boards...');

    for (const boardType of DEMO_BOARD_TYPES) {
      const boardId = await createDemoBoard(boardType, sessionId);
      if (boardId) {
        boardIds[boardType as keyof Omit<TestBoardIds, 'sessionId' | 'backendReady'>] = boardId;
      }
    }

    console.log(`\n📋 Demo boards ready for testing\n`);
  } else {
    process.env.E2E_BACKEND_READY = '';
    console.log('\n⚠️ Backend not available - E2E tests will be skipped');
    console.log('   To run E2E tests:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Start the frontend: cd frontend && npm run dev');
    console.log('   3. Run tests: npm run test:e2e\n');
  }

  // Write board IDs to file for tests to read
  fs.writeFileSync(BOARD_IDS_FILE, JSON.stringify(boardIds, null, 2));
  console.log(`📁 Board IDs written to ${BOARD_IDS_FILE}\n`);

  // Log frontend status
  if (!frontendReady) {
    console.log('⚠️ Frontend not responding - Playwright will start it via webServer config\n');
  }
}

export default globalSetup;
