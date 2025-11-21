# Verify Windows Development Environment
# Checks all dependencies and services are properly installed

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$checks = 0
$passed = 0

function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Node.js
Write-Host "🟢 Node.js:" -NoNewline
$checks++
if (Test-Command "node") {
    $version = node --version
    Write-Host " ✅ $version" -ForegroundColor Green
    $passed++
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Node.js not installed"
}

# pnpm
Write-Host "📦 pnpm:" -NoNewline
$checks++
if (Test-Command "pnpm") {
    $version = pnpm --version
    Write-Host " ✅ $version" -ForegroundColor Green
    $passed++
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "pnpm not installed (run: npm install -g pnpm)"
}

# PM2
Write-Host "⚙️  PM2:" -NoNewline
$checks++
if (Test-Command "pm2") {
    $version = pm2 --version
    Write-Host " ✅ $version" -ForegroundColor Green
    $passed++
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "PM2 not installed (run: npm install -g pm2)"
}

# Python
Write-Host "🐍 Python:" -NoNewline
$checks++
if (Test-Command "python") {
    $version = python --version
    Write-Host " ✅ $version" -ForegroundColor Green
    $passed++
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Python not installed"
}

# QuestDB
Write-Host "🗄️  QuestDB:" -NoNewline
$checks++
$questdbPath = "C:\QuestDB\bin\questdb.exe"
if (Test-Path $questdbPath) {
    Write-Host " ✅ Installed at C:\QuestDB" -ForegroundColor Green
    $passed++
    
    # Test connection
    try {
        $null = Test-NetConnection -ComputerName localhost -Port 8812 -WarningAction SilentlyContinue -ErrorAction Stop
        Write-Host "   └─ Port 8812: ✅ Accessible" -ForegroundColor Green
    } catch {
        Write-Host "   └─ Port 8812: ⚠️  Not running (start with: .\scripts\start-databases.ps1)" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "QuestDB not installed at $questdbPath"
}

# MongoDB
Write-Host "🗄️  MongoDB:" -NoNewline
$checks++
if (Test-Command "mongod") {
    Write-Host " ✅ Installed" -ForegroundColor Green
    $passed++
    
    # Test connection
    try {
        $null = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction Stop
        Write-Host "   └─ Port 27017: ✅ Accessible" -ForegroundColor Green
    } catch {
        Write-Host "   └─ Port 27017: ⚠️  Not running" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "MongoDB not installed"
}

# Redis
Write-Host "🗄️  Redis:" -NoNewline
$checks++
if (Test-Command "redis-server" -or Test-Command "memurai") {
    Write-Host " ✅ Installed" -ForegroundColor Green
    $passed++
    
    # Test connection
    try {
        $null = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue -ErrorAction Stop
        Write-Host "   └─ Port 6379: ✅ Accessible" -ForegroundColor Green
    } catch {
        Write-Host "   └─ Port 6379: ⚠️  Not running" -ForegroundColor Yellow
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Redis/Memurai not installed"
}

# Check directories
Write-Host "`n📁 Data Directories:" -ForegroundColor Cyan
$requiredDirs = @("C:\data\db", "C:\data\questdb", "C:\data\redis", "C:\data\backups")
foreach ($dir in $requiredDirs) {
    $checks++
    if (Test-Path $dir) {
        Write-Host "   ✅ $dir" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "   ❌ $dir (missing)" -ForegroundColor Red
        $issues += "Directory not found: $dir"
    }
}

# Check .env.local
Write-Host "`n⚙️  Configuration:" -ForegroundColor Cyan
$checks++
if (Test-Path ".env.local") {
    Write-Host "   ✅ .env.local exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "   ⚠️  .env.local not found (copy from .env.template)" -ForegroundColor Yellow
    $issues += ".env.local missing"
}

# Check disk space
Write-Host "`n💾 Disk Space:" -ForegroundColor Cyan
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "   C:\ Free: $freeGB GB" -ForegroundColor $(if ($freeGB -gt 10) { "Green" } else { "Yellow" })

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary: $passed/$checks checks passed" -ForegroundColor $(if ($passed -eq $checks) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan

if ($issues.Count -gt 0) {
    Write-Host "`n⚠️  Issues found:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "   • $issue" -ForegroundColor Yellow
    }
    Write-Host "`nRun setup script to fix: .\scripts\setup-windows-dev.ps1" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "`n✅ All checks passed! Environment is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "Start development:" -ForegroundColor Cyan
    Write-Host "  pnpm dev:win" -ForegroundColor White
    exit 0
}
