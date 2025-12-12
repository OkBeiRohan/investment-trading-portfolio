# QuestDB Backup Script for Windows
# Creates compressed backups of QuestDB tables

param(
    [string]$BackupDir = "C:\data\backups\questdb",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

Write-Host "💾 Starting QuestDB backup..." -ForegroundColor Cyan

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupDir $timestamp

# Create backup subdirectory
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Connect to QuestDB and export tables
$questdbHost = $env:QUESTDB_HOST ?? "localhost"
$questdbPort = $env:QUESTDB_PORT ?? "8812"

Write-Host "📊 Connecting to QuestDB at ${questdbHost}:${questdbPort}..." -ForegroundColor Yellow

# Use pg client to export data
$tables = @("ticks", "candles_1m", "candles_5m", "candles_15m", "candles_1h")

foreach ($table in $tables) {
    Write-Host "  Backing up table: $table" -ForegroundColor Gray
    
    $exportPath = Join-Path $backupPath "$table.csv"
    $sqlQuery = "COPY (SELECT * FROM $table) TO '$exportPath' WITH (FORMAT CSV, HEADER true)"
    
    try {
        # Using psql (PostgreSQL client) since QuestDB supports PostgreSQL wire protocol
        $env:PGPASSWORD = ""
        psql -h $questdbHost -p $questdbPort -U admin -d qdb -c $sqlQuery 2>&1 | Out-Null
        
        if (Test-Path $exportPath) {
            $size = (Get-Item $exportPath).Length / 1MB
            Write-Host "    ✅ Exported: $table ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
            
            # Compress with 7-Zip (or .NET if 7-Zip not available)
            if (Get-Command 7z -ErrorAction SilentlyContinue) {
                7z a -t7z "$exportPath.7z" $exportPath -mx=9 | Out-Null
                Remove-Item $exportPath
                Write-Host "    📦 Compressed to 7z" -ForegroundColor Gray
            } else {
                Compress-Archive -Path $exportPath -DestinationPath "$exportPath.zip" -Force
                Remove-Item $exportPath
                Write-Host "    📦 Compressed to zip" -ForegroundColor Gray
            }
        } else {
            Write-Host "    ⚠️  Export failed for $table" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    ❌ Error backing up $table`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Create metadata file
$metadata = @{
    timestamp = $timestamp
    host = $questdbHost
    port = $questdbPort
    tables = $tables
    completedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json

$metadata | Out-File -FilePath (Join-Path $backupPath "metadata.json") -Encoding UTF8

# Remove old backups
Write-Host "🧹 Cleaning up old backups (older than $RetentionDays days)..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
    Write-Host "  Removing old backup: $($_.Name)" -ForegroundColor Gray
    Remove-Item $_.FullName -Recurse -Force
}

Write-Host "✅ QuestDB backup completed: $backupPath" -ForegroundColor Green

# Calculate total backup size
$totalSize = (Get-ChildItem -Path $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "📁 Total backup size: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Cyan
