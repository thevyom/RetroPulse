# **To run E2E tests from the command line:**

# From the frontend directory
cd frontend

# Run all E2E tests
npm run test:e2e

# Or directly with Playwright
npx playwright test

# Run a specific test file
npx playwright test 01-board-creation.spec.ts

# Run with headed browser (see the browser)
npx playwright test --headed

# Run with debug mode (step through)
npx playwright test --debug

# Run and stop on first failure
npx playwright test -x

# Run with specific timeout
npx playwright test --timeout=30000

# View the HTML report after tests
npx playwright show-report
Prerequisites: Make sure backend and frontend are running:

# Terminal 1: Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Terminal 2: Start frontend dev server
cd frontend && npm run dev

# Terminal 3: Run tests
cd frontend && npm run test:e2e


# Or use the PowerShell script that handles everything:
.\scripts\run-e2e-tests.ps1