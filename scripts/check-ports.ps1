# Check Port Availability
# Tests all required ports for conflicts before starting services

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Port Availability Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ports = @{
    "QuestDB PostgreSQL" = 8812
    "QuestDB Web UI" = 9000
    "QuestDB ILP" = 9000
    "MongoDB" = 27017
    "Redis" = 6379
    "Web Dashboard" = 3000
    "Algo Worker" = 3001
    "Market Feeder" = 3002
    "Data Processor" = 3003
    "API Server" = 3004
    "Grafana" = 3005
    "PM2 Monitor" = 9615
    "Prometheus" = 9090
}

$conflicts = @()
$available = 0
$inUse = 0

foreach ($service in $ports.Keys | Sort-Object) {
    $port = $ports[$service]
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connection) {
        $inUse++
        $process = Get-Process -Id $connection[0].OwningProcess -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { "Unknown" }
        $processId = if ($process) { $process.Id } else { "N/A" }
        
        Write-Host "❌ $service" -ForegroundColor Red -NoNewline
        Write-Host " (Port $port)" -ForegroundColor Gray
        Write-Host "   └─ In use by: $processName (PID: $processId)" -ForegroundColor Yellow
        
        $conflicts += @{
            Service = $service
            Port = $port
            ProcessName = $processName
            ProcessId = $processId
        }
    } else {
        $available++
        Write-Host "✅ $service" -ForegroundColor Green -NoNewline
        Write-Host " (Port $port)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary: $available available, $inUse in use" -ForegroundColor $(if ($inUse -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan

if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Port conflicts detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To resolve conflicts:" -ForegroundColor Cyan
    Write-Host "  1. Stop the conflicting process" -ForegroundColor White
    Write-Host "  2. Use: .\scripts\kill-port.ps1 -Port <PORT>" -ForegroundColor White
    Write-Host ""
    Write-Host "Conflicting processes:" -ForegroundColor Cyan
    foreach ($conflict in $conflicts) {
        Write-Host "  • Port $($conflict.Port): $($conflict.ProcessName) (PID: $($conflict.ProcessId))" -ForegroundColor Yellow
        Write-Host "    Kill: .\scripts\kill-port.ps1 -Port $($conflict.Port)" -ForegroundColor Gray
    }
    
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ All ports are available!" -ForegroundColor Green
    Write-Host ""
    exit 0
}
