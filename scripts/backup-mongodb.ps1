# MongoDB Backup Script for Windows
# Creates compressed backups using mongodump

param(
    [string]$BackupDir = "C:\data\backups\mongodb",
    [int]$RetentionDays = 90
)

$ErrorActionPreference = "Stop"

Write-Host "💾 Starting MongoDB backup..." -ForegroundColor Cyan

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackupDir $timestamp

# MongoDB connection details
$mongoUri = $env:MONGODB_URI ?? "mongodb://localhost:27017"
$mongoDatabase = $env:MONGODB_DATABASE ?? "trading"

Write-Host "📊 Backing up MongoDB database: $mongoDatabase..." -ForegroundColor Yellow

try {
    # Run mongodump with gzip compression
    mongodump --uri="$mongoUri" --db="$mongoDatabase" --out="$backupPath" --gzip
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB dump completed" -ForegroundColor Green
        
        # Verify dump integrity
        $collections = Get-ChildItem -Path (Join-Path $backupPath $mongoDatabase) -Filter "*.bson.gz"
        Write-Host "📁 Backed up $($collections.Count) collections:" -ForegroundColor Cyan
        foreach ($collection in $collections) {
            $size = $collection.Length / 1KB
            Write-Host "  - $($collection.BaseName): $([math]::Round($size, 2)) KB" -ForegroundColor Gray
        }
        
        # Create metadata file
        $metadata = @{
            timestamp = $timestamp
            database = $mongoDatabase
            uri = $mongoUri -replace "mongodb://[^@]+@", "mongodb://***:***@"  # Hide credentials
            collections = $collections.Count
            completedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            totalSize = ($collections | Measure-Object -Property Length -Sum).Sum
        } | ConvertTo-Json
        
        $metadata | Out-File -FilePath (Join-Path $backupPath "metadata.json") -Encoding UTF8
        
    } else {
        Write-Host "❌ MongoDB dump failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ MongoDB backup error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Remove old backups
Write-Host "🧹 Cleaning up old backups (older than $RetentionDays days)..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.CreationTime -lt $cutoffDate } | ForEach-Object {
    Write-Host "  Removing old backup: $($_.Name)" -ForegroundColor Gray
    Remove-Item $_.FullName -Recurse -Force
}

Write-Host "✅ MongoDB backup completed: $backupPath" -ForegroundColor Green

# Calculate total backup size
$totalSize = (Get-ChildItem -Path $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "📁 Total backup size: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Cyan
