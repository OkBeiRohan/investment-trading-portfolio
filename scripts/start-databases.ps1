# PowerShell script to start databases on Windows
# Starts QuestDB, MongoDB (check if installed), and Redis (Memurai)

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Starting Databases (Windows)"
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Start QuestDB
Write-Host "🗄️  Starting QuestDB..." -ForegroundColor Yellow

$questDbPath = "C:\QuestDB\bin\questdb.exe"
if (Test-Path $questDbPath) {
    $questDbProcess = Get-Process | Where-Object { $_.Path -like "*questdb*" }
    if ($questDbProcess) {
        Write-Host "  ✅ QuestDB already running (PID: $($questDbProcess.Id))" -ForegroundColor Green
    } else {
        Start-Process -FilePath $questDbPath -ArgumentList "start", "-d", "C:\data\questdb" -NoNewWindow
        Start-Sleep -Seconds 3
        Write-Host "  ✅ QuestDB started" -ForegroundColor Green
        Write-Host "     Web UI: http://localhost:9000" -ForegroundColor Cyan
        Write-Host "     PostgreSQL: localhost:8812" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ❌ QuestDB not found at: $questDbPath" -ForegroundColor Red
    Write-Host "     Run: .\scripts\setup-windows-dev.ps1" -ForegroundColor Yellow
}

# Check MongoDB
Write-Host ""
Write-Host "🗄️  Checking MongoDB..." -ForegroundColor Yellow

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService) {
    if ($mongoService.Status -eq "Running") {
        Write-Host "  ✅ MongoDB already running" -ForegroundColor Green
    } else {
        Start-Service -Name "MongoDB"
        Write-Host "  ✅ MongoDB started" -ForegroundColor Green
    }
    Write-Host "     Connection: mongodb://localhost:27017" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  MongoDB service not found" -ForegroundColor Yellow
    Write-Host "     Install MongoDB Community Server" -ForegroundColor Yellow
    
    # Try to start mongod.exe directly if installed without service
    $mongoPath = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    if (Test-Path $mongoPath) {
        $mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
        if (-not $mongoProcess) {
            Start-Process -FilePath $mongoPath -ArgumentList "--dbpath", "C:\data\db" -NoNewWindow
            Start-Sleep -Seconds 3
            Write-Host "  ✅ MongoDB started (direct)" -ForegroundColor Green
        } else {
            Write-Host "  ✅ MongoDB already running (direct)" -ForegroundColor Green
        }
    }
}

# Check Redis (Memurai on Windows)
Write-Host ""
Write-Host "🗄️  Checking Redis..." -ForegroundColor Yellow

$redisService = Get-Service -Name "Memurai" -ErrorAction SilentlyContinue
if ($redisService) {
    if ($redisService.Status -eq "Running") {
        Write-Host "  ✅ Redis (Memurai) already running" -ForegroundColor Green
    } else {
        Start-Service -Name "Memurai"
        Write-Host "  ✅ Redis (Memurai) started" -ForegroundColor Green
    }
    Write-Host "     Connection: redis://localhost:6379" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  Redis (Memurai) service not found" -ForegroundColor Yellow
    Write-Host "     Install Memurai: https://www.memurai.com/get-memurai" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "✅ Database startup complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Next: Run .\scripts\check-databases.ps1 to verify connections" -ForegroundColor Cyan
Write-Host ""
