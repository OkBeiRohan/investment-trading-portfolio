# Kill Process on Port
# Finds and terminates the process using a specific port

param(
    [Parameter(Mandatory=$true)]
    [int]$Port,
    
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Checking port $Port..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if (-not $connection) {
    Write-Host "✅ Port $Port is not in use" -ForegroundColor Green
    exit 0
}

$processId = $connection[0].OwningProcess
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue

if (-not $process) {
    Write-Host "❌ Could not find process with PID $processId" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Found process:" -ForegroundColor Yellow
Write-Host "   Name: $($process.ProcessName)" -ForegroundColor White
Write-Host "   PID:  $($process.Id)" -ForegroundColor White
Write-Host "   Path: $($process.Path)" -ForegroundColor Gray

if (-not $Force) {
    $confirmation = Read-Host "`n⚠️  Kill this process? (y/N)"
    if ($confirmation -ne 'y') {
        Write-Host "❌ Cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`n🔨 Attempting graceful shutdown..." -ForegroundColor Yellow
try {
    $process.CloseMainWindow() | Out-Null
    Start-Sleep -Seconds 2
    
    if (-not $process.HasExited) {
        Write-Host "⚠️  Graceful shutdown failed, forcing kill..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force
    }
    
    Write-Host "✅ Process terminated successfully" -ForegroundColor Green
    Write-Host "   Port $Port is now available" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to kill process: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running as Administrator:" -ForegroundColor Yellow
    Write-Host "  powershell -Command 'Start-Process powershell -Verb RunAs'" -ForegroundColor White
    exit 1
}
