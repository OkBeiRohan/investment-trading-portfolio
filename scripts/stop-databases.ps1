# PowerShell script to gracefully stop all databases

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "Stopping Databases (Windows)"
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Stop QuestDB
Write-Host "🛑 Stopping QuestDB..." -ForegroundColor Yellow

$questDbProcess = Get-Process | Where-Object { $_.Path -like "*questdb*" }
if ($questDbProcess) {
    Stop-Process -Id $questDbProcess.Id -Force
    Write-Host "  ✅ QuestDB stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  QuestDB not running" -ForegroundColor Gray
}

# Stop MongoDB
Write-Host ""
Write-Host "🛑 Stopping MongoDB..." -ForegroundColor Yellow

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Stop-Service -Name "MongoDB"
    Write-Host "  ✅ MongoDB stopped" -ForegroundColor Green
} else {
    # Try to stop mongod.exe directly
    $mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
    if ($mongoProcess) {
        Stop-Process -Name "mongod" -Force
        Write-Host "  ✅ MongoDB stopped (direct)" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  MongoDB not running" -ForegroundColor Gray
    }
}

# Stop Redis (Memurai)
Write-Host ""
Write-Host "🛑 Stopping Redis..." -ForegroundColor Yellow

$redisService = Get-Service -Name "Memurai" -ErrorAction SilentlyContinue
if ($redisService -and $redisService.Status -eq "Running") {
    Stop-Service -Name "Memurai"
    Write-Host "  ✅ Redis (Memurai) stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Redis (Memurai) not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "✅ All databases stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
