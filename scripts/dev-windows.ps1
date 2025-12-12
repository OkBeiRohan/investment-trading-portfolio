# Development Mode - Windows
# Starts all services in development mode with hot-reload

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Development Mode (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check ports
Write-Host "🔍 Checking port availability..." -ForegroundColor Yellow
& "$PSScriptRoot\check-ports.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Port conflicts detected. Resolve conflicts and try again." -ForegroundColor Red
    exit 1
}

# Check databases are running
Write-Host "`n🗄️  Checking databases..." -ForegroundColor Yellow

$databasesRunning = $true

# Check QuestDB
try {
    $null = Test-NetConnection -ComputerName localhost -Port 8812 -WarningAction SilentlyContinue -ErrorAction Stop
    Write-Host "  ✅ QuestDB (Port 8812)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ QuestDB not running on port 8812" -ForegroundColor Red
    $databasesRunning = $false
}

# Check MongoDB
try {
    $null = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction Stop
    Write-Host "  ✅ MongoDB (Port 27017)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ MongoDB not running on port 27017" -ForegroundColor Red
    $databasesRunning = $false
}

# Check Redis
try {
    $null = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction Stop
    Write-Host "  ✅ Redis (Port 6379)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Redis not running on port 6379" -ForegroundColor Red
    $databasesRunning = $false
}

if (-not $databasesRunning) {
    Write-Host "`n⚠️  Some databases are not running." -ForegroundColor Yellow
    Write-Host "Start databases with: .\scripts\start-databases.ps1" -ForegroundColor Cyan
    $continue = Read-Host "`nContinue anyway? (y/N)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# Start development servers
Write-Host "`n🚀 Starting development servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Applications:" -ForegroundColor Cyan
Write-Host "  • Web Dashboard:  http://localhost:3000" -ForegroundColor White
Write-Host "  • Algo Worker:    http://localhost:3001" -ForegroundColor White
Write-Host "  • Market Feeder:  http://localhost:3002" -ForegroundColor White
Write-Host "  • Data Processor: http://localhost:3003" -ForegroundColor White
Write-Host "  • API Server:     http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "Databases:" -ForegroundColor Cyan
Write-Host "  • QuestDB UI:     http://localhost:9000" -ForegroundColor White
Write-Host "  • MongoDB:        mongodb://localhost:27017" -ForegroundColor White
Write-Host "  • Redis:          redis://localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Change to project root
Set-Location "$PSScriptRoot\.."

# Start Turborepo in dev mode (parallel execution with hot-reload)
pnpm turbo dev --filter=algo-worker --filter=market-feeder --filter=data-processor --filter=api --filter=web --parallel

Write-Host "`n✅ Development servers stopped" -ForegroundColor Green
