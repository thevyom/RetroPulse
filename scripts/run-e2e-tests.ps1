# =============================================================================
# RetroPulse E2E Test Runner (Windows PowerShell)
# =============================================================================
# Usage: .\scripts\run-e2e-tests.ps1
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

param(
    [switch]$SkipBackendTests,
    [switch]$SkipFrontendTests,
    [switch]$CleanStart
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Colors for output
function Write-Header { param($msg) Write-Host "`n$("=" * 70)" -ForegroundColor Cyan; Write-Host " $msg" -ForegroundColor Cyan; Write-Host "$("=" * 70)`n" -ForegroundColor Cyan }
function Write-Step { param($msg) Write-Host "[STEP] $msg" -ForegroundColor Yellow }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Gray }

# Initialize report data
$ReportData = @{
    StartTime = Get-Date
    DockerVersion = ""
    NodeVersion = ""
    BackendTests = @{ Status = "SKIPPED"; Passed = 0; Failed = 0; Duration = "0s"; Output = "" }
    FrontendE2E = @{ Status = "SKIPPED"; Passed = 0; Failed = 0; Duration = "0s"; Output = "" }
}

Write-Header "RetroPulse E2E Test Runner"
Write-Info "Project Root: $ProjectRoot"
Write-Info "Start Time: $($ReportData.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
Write-Step "Checking prerequisites..."

# Check Docker
try {
    $ReportData.DockerVersion = (docker --version) -replace "Docker version ", "" -replace ",.*", ""
    Write-Success "Docker: $($ReportData.DockerVersion)"
} catch {
    Write-Error "Docker is not installed or not running"
    exit 1
}

# Check Node.js
try {
    $ReportData.NodeVersion = (node --version) -replace "v", ""
    Write-Success "Node.js: $($ReportData.NodeVersion)"
} catch {
    Write-Error "Node.js is not installed"
    exit 1
}

# Check if docker-compose.test.yml exists
$ComposeFile = Join-Path $ProjectRoot "docker-compose.test.yml"
if (-not (Test-Path $ComposeFile)) {
    Write-Error "docker-compose.test.yml not found at $ComposeFile"
    exit 1
}
Write-Success "Found docker-compose.test.yml"

# =============================================================================
# Step 2: Clean Start (optional)
# =============================================================================
if ($CleanStart) {
    Write-Step "Cleaning up existing containers and volumes..."
    Push-Location $ProjectRoot
    docker-compose -f docker-compose.test.yml down -v 2>$null
    Pop-Location
    Write-Success "Cleanup complete"
}

# =============================================================================
# Step 3: Start Docker Containers
# =============================================================================
Write-Step "Starting Docker containers..."
Push-Location $ProjectRoot

# Build and start containers
docker-compose -f docker-compose.test.yml up -d --build 2>&1 | ForEach-Object { Write-Info $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker containers"
    Pop-Location
    exit 1
}
Pop-Location
Write-Success "Containers started"

# =============================================================================
# Step 4: Wait for Backend Health
# =============================================================================
Write-Step "Waiting for backend to be healthy..."
$MaxRetries = 30
$RetryCount = 0
$BackendUrl = "http://localhost:3001/health"

while ($RetryCount -lt $MaxRetries) {
    try {
        $response = Invoke-WebRequest -Uri $BackendUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is healthy at $BackendUrl"
            break
        }
    } catch {
        $RetryCount++
        Write-Info "Waiting for backend... ($RetryCount/$MaxRetries)"
        Start-Sleep -Seconds 2
    }
}

if ($RetryCount -ge $MaxRetries) {
    Write-Error "Backend failed to start within timeout"
    Write-Info "Check logs with: docker-compose -f docker-compose.test.yml logs backend"
    exit 1
}

# =============================================================================
# Step 5: Start Frontend Dev Server (background)
# =============================================================================
Write-Step "Starting frontend dev server..."
$FrontendDir = Join-Path $ProjectRoot "frontend"
Push-Location $FrontendDir

# Check if frontend is already running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Info "Frontend already running on port 5173"
} catch {
    # Start frontend in background
    Write-Info "Starting Vite dev server..."
    $env:VITE_API_URL = "http://localhost:3001/v1"
    $env:VITE_SOCKET_URL = "http://localhost:3001"

    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -WindowStyle Minimized

    # Wait for frontend to be ready
    $MaxRetries = 30
    $RetryCount = 0
    while ($RetryCount -lt $MaxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            Write-Success "Frontend is ready at http://localhost:5173"
            break
        } catch {
            $RetryCount++
            Write-Info "Waiting for frontend... ($RetryCount/$MaxRetries)"
            Start-Sleep -Seconds 2
        }
    }

    if ($RetryCount -ge $MaxRetries) {
        Write-Error "Frontend failed to start"
        Pop-Location
        exit 1
    }
}
Pop-Location

# =============================================================================
# Step 6: Run Backend Tests
# =============================================================================
if (-not $SkipBackendTests) {
    Write-Header "Running Backend Tests"
    $BackendDir = Join-Path $ProjectRoot "backend"
    Push-Location $BackendDir

    $BackendTestStart = Get-Date

    # Run backend tests and capture output
    $TestOutput = & pnpm test 2>&1 | Out-String
    $BackendTestExit = $LASTEXITCODE

    $BackendTestEnd = Get-Date
    $BackendDuration = ($BackendTestEnd - $BackendTestStart).TotalSeconds

    # Parse test results
    if ($TestOutput -match "(\d+) passed") {
        $ReportData.BackendTests.Passed = [int]$Matches[1]
    }
    if ($TestOutput -match "(\d+) failed") {
        $ReportData.BackendTests.Failed = [int]$Matches[1]
    }

    $ReportData.BackendTests.Duration = "{0:N1}s" -f $BackendDuration
    $ReportData.BackendTests.Output = $TestOutput

    if ($BackendTestExit -eq 0) {
        $ReportData.BackendTests.Status = "PASS"
        Write-Success "Backend tests passed ($($ReportData.BackendTests.Passed) tests)"
    } else {
        $ReportData.BackendTests.Status = "FAIL"
        Write-Error "Backend tests failed ($($ReportData.BackendTests.Failed) failures)"
    }

    Pop-Location
} else {
    Write-Info "Skipping backend tests (--SkipBackendTests)"
}

# =============================================================================
# Step 7: Run Frontend E2E Tests
# =============================================================================
if (-not $SkipFrontendTests) {
    Write-Header "Running Frontend E2E Tests (Playwright)"
    $FrontendDir = Join-Path $ProjectRoot "frontend"
    Push-Location $FrontendDir

    $E2ETestStart = Get-Date

    # Set environment variables for Playwright
    $env:BACKEND_URL = "http://localhost:3001"
    $env:ADMIN_SECRET = "dev-admin-secret-16chars"

    # Run Playwright tests
    $TestOutput = & npm run test:e2e 2>&1 | Out-String
    $E2ETestExit = $LASTEXITCODE

    $E2ETestEnd = Get-Date
    $E2EDuration = ($E2ETestEnd - $E2ETestStart).TotalSeconds

    # Parse Playwright results
    if ($TestOutput -match "(\d+) passed") {
        $ReportData.FrontendE2E.Passed = [int]$Matches[1]
    }
    if ($TestOutput -match "(\d+) failed") {
        $ReportData.FrontendE2E.Failed = [int]$Matches[1]
    }

    $ReportData.FrontendE2E.Duration = "{0:N1}s" -f $E2EDuration
    $ReportData.FrontendE2E.Output = $TestOutput

    if ($E2ETestExit -eq 0) {
        $ReportData.FrontendE2E.Status = "PASS"
        Write-Success "Frontend E2E tests passed ($($ReportData.FrontendE2E.Passed) tests)"
    } else {
        $ReportData.FrontendE2E.Status = "FAIL"
        Write-Error "Frontend E2E tests failed ($($ReportData.FrontendE2E.Failed) failures)"
    }

    Pop-Location
} else {
    Write-Info "Skipping frontend E2E tests (--SkipFrontendTests)"
}

# =============================================================================
# Step 8: Generate DEV-TEST-REPORT.md
# =============================================================================
Write-Step "Generating test report..."

$EndTime = Get-Date
$TotalDuration = ($EndTime - $ReportData.StartTime).TotalMinutes

$BackendStatus = if ($ReportData.BackendTests.Status -eq "PASS") { "✅ PASS" } elseif ($ReportData.BackendTests.Status -eq "FAIL") { "❌ FAIL" } else { "⏭️ SKIPPED" }
$FrontendStatus = if ($ReportData.FrontendE2E.Status -eq "PASS") { "✅ PASS" } elseif ($ReportData.FrontendE2E.Status -eq "FAIL") { "❌ FAIL" } else { "⏭️ SKIPPED" }

$ReportContent = @"
# Development Test Report

## Run Information

| Property | Value |
|----------|-------|
| Date | $($ReportData.StartTime.ToString('yyyy-MM-dd HH:mm:ss')) |
| Duration | $("{0:N1}" -f $TotalDuration) minutes |
| Docker Version | $($ReportData.DockerVersion) |
| Node Version | $($ReportData.NodeVersion) |
| Platform | Windows (PowerShell) |

## Test Summary

| Test Suite | Status | Passed | Failed | Duration |
|------------|--------|--------|--------|----------|
| Backend (Vitest) | $BackendStatus | $($ReportData.BackendTests.Passed) | $($ReportData.BackendTests.Failed) | $($ReportData.BackendTests.Duration) |
| Frontend E2E (Playwright) | $FrontendStatus | $($ReportData.FrontendE2E.Passed) | $($ReportData.FrontendE2E.Failed) | $($ReportData.FrontendE2E.Duration) |

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

### Board Operations
- [ ] Create a new retro board
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
``````powershell
docker-compose -f docker-compose.test.yml ps
``````

To view logs:
``````powershell
docker-compose -f docker-compose.test.yml logs -f backend
docker-compose -f docker-compose.test.yml logs -f mongodb
``````

## Cleanup

When finished testing, run:
``````powershell
docker-compose -f docker-compose.test.yml down
``````

To also remove test data volumes:
``````powershell
docker-compose -f docker-compose.test.yml down -v
``````

---

*Report generated by run-e2e-tests.ps1 on $($EndTime.ToString('yyyy-MM-dd HH:mm:ss'))*
"@

$ReportPath = Join-Path $ProjectRoot "docs\DEV-TEST-REPORT.md"
$ReportContent | Out-File -FilePath $ReportPath -Encoding UTF8
Write-Success "Report saved to $ReportPath"

# =============================================================================
# Step 9: Summary
# =============================================================================
Write-Header "Test Run Complete"

Write-Host "`nTest Results:" -ForegroundColor White
Write-Host "  Backend:     $BackendStatus ($($ReportData.BackendTests.Passed) passed, $($ReportData.BackendTests.Failed) failed)" -ForegroundColor $(if ($ReportData.BackendTests.Status -eq "PASS") { "Green" } elseif ($ReportData.BackendTests.Status -eq "FAIL") { "Red" } else { "Gray" })
Write-Host "  Frontend E2E: $FrontendStatus ($($ReportData.FrontendE2E.Passed) passed, $($ReportData.FrontendE2E.Failed) failed)" -ForegroundColor $(if ($ReportData.FrontendE2E.Status -eq "PASS") { "Green" } elseif ($ReportData.FrontendE2E.Status -eq "FAIL") { "Red" } else { "Gray" })

Write-Host "`nServices Running (for manual testing):" -ForegroundColor White
Write-Host "  Frontend:      http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Mongo Express: http://localhost:8081" -ForegroundColor Cyan

Write-Host "`nTo stop all services:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.test.yml down" -ForegroundColor Gray

Write-Host "`nTest report: $ReportPath" -ForegroundColor Green
