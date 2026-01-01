#!/bin/bash
# =============================================================================
# RetroPulse E2E Test Runner (Linux/Mac)
# =============================================================================
# Usage: ./scripts/run-e2e-tests.sh [options]
#
# Options:
#   --skip-backend    Skip backend tests
#   --skip-frontend   Skip frontend E2E tests
#   --clean           Remove existing containers and volumes first
#
# This script:
#   1. Starts Docker containers (MongoDB, Backend, Mongo Express)
#   2. Waits for services to be healthy
#   3. Starts the frontend dev server
#   4. Runs backend tests
#   5. Runs frontend E2E tests (Playwright)
#   6. Generates docs/DEV-TEST-REPORT.md with results
#   7. Leaves all services running for manual testing
# =============================================================================

set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
SKIP_BACKEND=false
SKIP_FRONTEND=false
CLEAN_START=false

for arg in "$@"; do
    case $arg in
        --skip-backend)
            SKIP_BACKEND=true
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            ;;
        --clean)
            CLEAN_START=true
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Output functions
header() { echo -e "\n${CYAN}======================================================================${NC}"; echo -e "${CYAN} $1${NC}"; echo -e "${CYAN}======================================================================${NC}\n"; }
step() { echo -e "${YELLOW}[STEP]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${GRAY}[INFO]${NC} $1"; }

# Initialize report data
START_TIME=$(date +"%Y-%m-%d %H:%M:%S")
START_EPOCH=$(date +%s)
DOCKER_VERSION=""
NODE_VERSION=""
BACKEND_STATUS="SKIPPED"
BACKEND_PASSED=0
BACKEND_FAILED=0
BACKEND_DURATION="0s"
FRONTEND_STATUS="SKIPPED"
FRONTEND_PASSED=0
FRONTEND_FAILED=0
FRONTEND_DURATION="0s"

header "RetroPulse E2E Test Runner"
info "Project Root: $PROJECT_ROOT"
info "Start Time: $START_TIME"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
step "Checking prerequisites..."

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | sed 's/Docker version //' | sed 's/,.*//')
    success "Docker: $DOCKER_VERSION"
else
    error "Docker is not installed or not running"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    success "Node.js: $NODE_VERSION"
else
    error "Node.js is not installed"
    exit 1
fi

# Check docker-compose.test.yml
if [ ! -f "$PROJECT_ROOT/docker-compose.test.yml" ]; then
    error "docker-compose.test.yml not found"
    exit 1
fi
success "Found docker-compose.test.yml"

# =============================================================================
# Step 2: Clean Start (optional)
# =============================================================================
if [ "$CLEAN_START" = true ]; then
    step "Cleaning up existing containers and volumes..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true
    success "Cleanup complete"
fi

# =============================================================================
# Step 3: Start Docker Containers
# =============================================================================
step "Starting Docker containers..."
cd "$PROJECT_ROOT"

docker-compose -f docker-compose.test.yml up -d --build

if [ $? -ne 0 ]; then
    error "Failed to start Docker containers"
    exit 1
fi
success "Containers started"

# =============================================================================
# Step 4: Wait for Backend Health
# =============================================================================
step "Waiting for backend to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0
BACKEND_URL="http://localhost:3001/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200"; then
        success "Backend is healthy at $BACKEND_URL"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    info "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    error "Backend failed to start within timeout"
    info "Check logs with: docker-compose -f docker-compose.test.yml logs backend"
    exit 1
fi

# =============================================================================
# Step 5: Start Frontend Dev Server (background)
# =============================================================================
step "Starting frontend dev server..."
cd "$PROJECT_ROOT/frontend"

# Check if frontend is already running
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" | grep -q "200"; then
    info "Frontend already running on port 5173"
else
    info "Starting Vite dev server..."
    export VITE_API_URL="http://localhost:3001/v1"
    export VITE_SOCKET_URL="http://localhost:3001"

    # Start in background
    npm run dev &
    FRONTEND_PID=$!

    # Wait for frontend
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" 2>/dev/null | grep -q "200"; then
            success "Frontend is ready at http://localhost:5173"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        info "Waiting for frontend... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        error "Frontend failed to start"
        exit 1
    fi
fi

# =============================================================================
# Step 6: Run Backend Tests
# =============================================================================
if [ "$SKIP_BACKEND" = false ]; then
    header "Running Backend Tests"
    cd "$PROJECT_ROOT/backend"

    BACKEND_START=$(date +%s)

    # Run tests and capture output
    set +e
    TEST_OUTPUT=$(pnpm test 2>&1)
    BACKEND_EXIT=$?
    set -e

    BACKEND_END=$(date +%s)
    BACKEND_DURATION="$((BACKEND_END - BACKEND_START))s"

    # Parse results
    BACKEND_PASSED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ passed' | head -1 | grep -oE '[0-9]+' || echo "0")
    BACKEND_FAILED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ failed' | head -1 | grep -oE '[0-9]+' || echo "0")

    if [ $BACKEND_EXIT -eq 0 ]; then
        BACKEND_STATUS="PASS"
        success "Backend tests passed ($BACKEND_PASSED tests)"
    else
        BACKEND_STATUS="FAIL"
        error "Backend tests failed ($BACKEND_FAILED failures)"
    fi
else
    info "Skipping backend tests (--skip-backend)"
fi

# =============================================================================
# Step 7: Run Frontend E2E Tests
# =============================================================================
if [ "$SKIP_FRONTEND" = false ]; then
    header "Running Frontend E2E Tests (Playwright)"
    cd "$PROJECT_ROOT/frontend"

    FRONTEND_START=$(date +%s)

    export BACKEND_URL="http://localhost:3001"
    export ADMIN_SECRET="dev-admin-secret-16chars"

    # Run tests and capture output
    set +e
    TEST_OUTPUT=$(npm run test:e2e 2>&1)
    FRONTEND_EXIT=$?
    set -e

    FRONTEND_END=$(date +%s)
    FRONTEND_DURATION="$((FRONTEND_END - FRONTEND_START))s"

    # Parse results
    FRONTEND_PASSED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ passed' | head -1 | grep -oE '[0-9]+' || echo "0")
    FRONTEND_FAILED=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ failed' | head -1 | grep -oE '[0-9]+' || echo "0")

    if [ $FRONTEND_EXIT -eq 0 ]; then
        FRONTEND_STATUS="PASS"
        success "Frontend E2E tests passed ($FRONTEND_PASSED tests)"
    else
        FRONTEND_STATUS="FAIL"
        error "Frontend E2E tests failed ($FRONTEND_FAILED failures)"
    fi
else
    info "Skipping frontend E2E tests (--skip-frontend)"
fi

# =============================================================================
# Step 8: Archive Playwright Test Results
# =============================================================================
step "Archiving Playwright test results..."

ARCHIVE_DIR="$PROJECT_ROOT/test-archives"
mkdir -p "$ARCHIVE_DIR"

TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
ARCHIVE_NAME="e2e-run-$TIMESTAMP.7z"
ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_NAME"

PLAYWRIGHT_REPORT="$PROJECT_ROOT/frontend/playwright-report"
TEST_RESULTS="$PROJECT_ROOT/frontend/test-results"

# Check if 7z is available
if command -v 7z &> /dev/null; then
    ITEMS_TO_ARCHIVE=""
    if [ -d "$PLAYWRIGHT_REPORT" ]; then ITEMS_TO_ARCHIVE="$PLAYWRIGHT_REPORT"; fi
    if [ -d "$TEST_RESULTS" ]; then ITEMS_TO_ARCHIVE="$ITEMS_TO_ARCHIVE $TEST_RESULTS"; fi

    if [ -n "$ITEMS_TO_ARCHIVE" ]; then
        if 7z a "$ARCHIVE_PATH" $ITEMS_TO_ARCHIVE > /dev/null 2>&1; then
            success "Archived to $ARCHIVE_PATH"
            ARCHIVE_RESULT="$ARCHIVE_PATH"
        else
            info "Archive creation failed, skipping"
            ARCHIVE_RESULT="N/A"
        fi
    else
        info "No test results to archive"
        ARCHIVE_RESULT="N/A"
    fi
else
    info "7z not found, skipping archive (install p7zip to enable)"
    ARCHIVE_RESULT="N/A"
fi

# =============================================================================
# Step 9: Generate DEV-TEST-REPORT.md
# =============================================================================
step "Generating test report..."

END_TIME=$(date +"%Y-%m-%d %H:%M:%S")
END_EPOCH=$(date +%s)
TOTAL_DURATION=$(( (END_EPOCH - START_EPOCH) / 60 ))

# Status emojis
if [ "$BACKEND_STATUS" = "PASS" ]; then
    BACKEND_EMOJI="✅ PASS"
elif [ "$BACKEND_STATUS" = "FAIL" ]; then
    BACKEND_EMOJI="❌ FAIL"
else
    BACKEND_EMOJI="⏭️ SKIPPED"
fi

if [ "$FRONTEND_STATUS" = "PASS" ]; then
    FRONTEND_EMOJI="✅ PASS"
elif [ "$FRONTEND_STATUS" = "FAIL" ]; then
    FRONTEND_EMOJI="❌ FAIL"
else
    FRONTEND_EMOJI="⏭️ SKIPPED"
fi

REPORT_PATH="$PROJECT_ROOT/docs/DEV-TEST-REPORT.md"

cat > "$REPORT_PATH" << EOF
# Development Test Report

## Run Information

| Property | Value |
|----------|-------|
| Date | $START_TIME |
| Duration | $TOTAL_DURATION minutes |
| Docker Version | $DOCKER_VERSION |
| Node Version | $NODE_VERSION |
| Platform | $(uname -s) (Bash) |

## Test Summary

| Test Suite | Status | Passed | Failed | Duration |
|------------|--------|--------|--------|----------|
| Backend (Vitest) | $BACKEND_EMOJI | $BACKEND_PASSED | $BACKEND_FAILED | $BACKEND_DURATION |
| Frontend E2E (Playwright) | $FRONTEND_EMOJI | $FRONTEND_PASSED | $FRONTEND_FAILED | $FRONTEND_DURATION |

## Test Archive

| Property | Value |
|----------|-------|
| Archive Path | $ARCHIVE_RESULT |
| Contents | playwright-report/, test-results/ |

## Access URLs

The following services are running and available for manual testing:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application (Vite dev server) |
| Backend API | http://localhost:3001 | Express.js REST API |
| Backend Health | http://localhost:3001/health | Health check endpoint |
| Mongo Express | http://localhost:8081 | MongoDB admin UI |
| MongoDB | localhost:27017 | Database connection |

## Manual Testing Checklist

### Home Page
- [ ] Home page displays at root URL
- [ ] Logo and title visible
- [ ] Create New Board button works
- [ ] Feature list displays correctly

### Board Creation
- [ ] Create board dialog opens
- [ ] Board name input works
- [ ] Default columns preview shown
- [ ] Cancel button closes dialog
- [ ] Create board and navigate to it
- [ ] User becomes admin of new board

### Board Operations
- [ ] Join an existing board via link
- [ ] Close a board
- [ ] Reopen a closed board

### Card Operations
- [ ] Add a feedback card (What went well)
- [ ] Add an action item card
- [ ] Edit a card
- [ ] Delete a card
- [ ] Add reactions to cards

### Real-time Features
- [ ] Multi-user sync (open in incognito)
- [ ] Participant list updates
- [ ] Real-time card updates
- [ ] Real-time reactions

### Drag and Drop
- [ ] Reorder cards within a column
- [ ] Move cards between columns
- [ ] Link cards as parent/child

### Responsive Design
- [ ] Desktop viewport
- [ ] Tablet viewport (resize browser)
- [ ] Mobile viewport (dev tools)

## Container Status

To check container status:
\`\`\`bash
docker-compose -f docker-compose.test.yml ps
\`\`\`

To view logs:
\`\`\`bash
docker-compose -f docker-compose.test.yml logs -f backend
docker-compose -f docker-compose.test.yml logs -f mongodb
\`\`\`

## Cleanup

When finished testing, run:
\`\`\`bash
docker-compose -f docker-compose.test.yml down
\`\`\`

To also remove test data volumes:
\`\`\`bash
docker-compose -f docker-compose.test.yml down -v
\`\`\`

---

*Report generated by run-e2e-tests.sh on $END_TIME*
EOF

success "Report saved to $REPORT_PATH"

# =============================================================================
# Step 9: Summary
# =============================================================================
header "Test Run Complete"

echo -e "\nTest Results:"
if [ "$BACKEND_STATUS" = "PASS" ]; then
    echo -e "  Backend:      ${GREEN}$BACKEND_EMOJI${NC} ($BACKEND_PASSED passed, $BACKEND_FAILED failed)"
elif [ "$BACKEND_STATUS" = "FAIL" ]; then
    echo -e "  Backend:      ${RED}$BACKEND_EMOJI${NC} ($BACKEND_PASSED passed, $BACKEND_FAILED failed)"
else
    echo -e "  Backend:      ${GRAY}$BACKEND_EMOJI${NC}"
fi

if [ "$FRONTEND_STATUS" = "PASS" ]; then
    echo -e "  Frontend E2E: ${GREEN}$FRONTEND_EMOJI${NC} ($FRONTEND_PASSED passed, $FRONTEND_FAILED failed)"
elif [ "$FRONTEND_STATUS" = "FAIL" ]; then
    echo -e "  Frontend E2E: ${RED}$FRONTEND_EMOJI${NC} ($FRONTEND_PASSED passed, $FRONTEND_FAILED failed)"
else
    echo -e "  Frontend E2E: ${GRAY}$FRONTEND_EMOJI${NC}"
fi

echo -e "\nServices Running (for manual testing):"
echo -e "  Frontend:      ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend API:   ${CYAN}http://localhost:3001${NC}"
echo -e "  Mongo Express: ${CYAN}http://localhost:8081${NC}"

echo -e "\n${YELLOW}To stop all services:${NC}"
echo -e "  ${GRAY}docker-compose -f docker-compose.test.yml down${NC}"

echo -e "\nTest report: ${GREEN}$REPORT_PATH${NC}"
