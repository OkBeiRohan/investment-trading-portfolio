# Redis Backup Script for Windows
# Copies RDB and AOF files to backup directory

param(
    [string]$BackupDir = "C:\data\backups\redis",
    [int]$RetentionDays = 7,
    [string]$RedisDataDir = "C:\ProgramData\Memurai"  # Memurai default path
)

$ErrorActionPreference = "Stop"

Write-Host "💾 Starting Redis backup..." -ForegroundColor Cyan

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupDir $timestamp
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Check if Redis data directory exists
if (!(Test-Path $RedisDataDir)) {
    Write-Host "⚠️  Redis data directory not found: $RedisDataDir" -ForegroundColor Yellow
    Write-Host "   Attempting to locate Redis/Memurai installation..." -ForegroundColor Gray
    
    # Try alternative paths
    $alternativePaths = @(
        "C:\Redis",
        "C:\Program Files\Redis",
        "C:\Program Files\Memurai",
        "$env:USERPROFILE\AppData\Local\Redis"
    )
    
    foreach ($path in $alternativePaths) {
        if (Test-Path $path) {
            $RedisDataDir = $path
            Write-Host "   Found Redis at: $path" -ForegroundColor Green
            break
        }
    }
    
    if (!(Test-Path $RedisDataDir)) {
        Write-Host "❌ Could not locate Redis data directory" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📊 Backing up Redis from: $RedisDataDir..." -ForegroundColor Yellow

# Trigger Redis BGSAVE (background save) via redis-cli
try {
    $redisHost = $env:REDIS_HOST ?? "localhost"
    $redisPort = $env:REDIS_PORT ?? "6379"
    
    Write-Host "  Triggering Redis BGSAVE..." -ForegroundColor Gray
    redis-cli -h $redisHost -p $redisPort BGSAVE | Out-Null
    
    # Wait for BGSAVE to complete
    Start-Sleep -Seconds 2
    
} catch {
    Write-Host "  ⚠️  Could not trigger BGSAVE: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Continuing with existing files..." -ForegroundColor Gray
}

# Copy RDB file (snapshot)
$rdbFile = Get-ChildItem -Path $RedisDataDir -Filter "dump.rdb" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($rdbFile) {
    Copy-Item $rdbFile.FullName -Destination (Join-Path $backupPath "dump.rdb")
    $size = $rdbFile.Length / 1MB
    Write-Host "  ✅ Backed up RDB file: $([math]::Round($size, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  RDB file not found" -ForegroundColor Yellow
}

# Copy AOF file (append-only file)
$aofFile = Get-ChildItem -Path $RedisDataDir -Filter "appendonly.aof" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($aofFile) {
    Copy-Item $aofFile.FullName -Destination (Join-Path $backupPath "appendonly.aof")
    $size = $aofFile.Length / 1MB
    Write-Host "  ✅ Backed up AOF file: $([math]::Round($size, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  AOF file not found (may not be enabled)" -ForegroundColor Yellow
}

# Create metadata file
$metadata = @{
    timestamp = $timestamp
    dataDir = $RedisDataDir
    host = $redisHost
    port = $redisPort
    completedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    files = @{
        rdb = if ($rdbFile) { $rdbFile.Name } else { $null }
        aof = if ($aofFile) { $aofFile.Name } else { $null }
    }
} | ConvertTo-Json

$metadata | Out-File -FilePath (Join-Path $backupPath "metadata.json") -Encoding UTF8

# Remove old backups
Write-Host "🧹 Cleaning up old backups (older than $RetentionDays days)..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
    Write-Host "  Removing old backup: $($_.Name)" -ForegroundColor Gray
    Remove-Item $_.FullName -Recurse -Force
}

Write-Host "✅ Redis backup completed: $backupPath" -ForegroundColor Green

# Calculate total backup size
$totalSize = (Get-ChildItem -Path $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📁 Total backup size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Cyan
