# PM2 Deployment Script for Windows
# Deploys all Windows-specific apps with health checks

param(
    [string]$Environment = "production",
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying PM2 apps on Windows ($Environment mode)..." -ForegroundColor Cyan

# Check prerequisites
if (!(Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PM2 not found. Install with: npm install -g pm2" -ForegroundColor Red
    exit 1
}

# Build apps if needed
if (!$SkipBuild) {
    Write-Host "📦 Building applications..." -ForegroundColor Yellow
    pnpm turbo run build --filter=algo-worker --filter=market-feeder --filter=data-processor --filter=api --filter=web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}

# Stop existing PM2 processes
Write-Host "🛑 Stopping existing PM2 processes..." -ForegroundColor Yellow
pm2 stop algo-worker market-feeder data-processor api web 2>$null

# Start Windows apps from ecosystem config
Write-Host "▶️  Starting Windows apps..." -ForegroundColor Green
pm2 start ecosystem.config.js --only algo-worker,market-feeder,data-processor,api,web --env $Environment

# Save PM2 process list
pm2 save --force

# Wait for apps to initialize
Write-Host "⏳ Waiting for apps to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Health checks
Write-Host "🔍 Running health checks..." -ForegroundColor Yellow

$healthEndpoints = @{
    "algo-worker" = "http://localhost:3001/health"
    "market-feeder" = "http://localhost:3002/health"
    "data-processor" = "http://localhost:3003/health"
    "api" = "http://localhost:3004/health"
    "web" = "http://localhost:3000"
}

$allHealthy = $true
foreach ($app in $healthEndpoints.Keys) {
    $url = $healthEndpoints[$app]
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $app is healthy" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $app returned status $($response.StatusCode)" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host "  ❌ $app health check failed: $($_.Exception.Message)" -ForegroundColor Red
        $allHealthy = $false
    }
}

# Show PM2 status
Write-Host "`n📊 PM2 Status:" -ForegroundColor Cyan
pm2 list

if ($allHealthy) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "   Monitor logs: pm2 logs" -ForegroundColor Gray
    Write-Host "   Stop all: pm2 stop all" -ForegroundColor Gray
    Write-Host "   Restart: pm2 restart all" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️  Deployment completed with warnings. Check logs: pm2 logs" -ForegroundColor Yellow
}
