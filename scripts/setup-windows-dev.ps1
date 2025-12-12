# Windows Development Environment Setup Script
# Installs and configures all required dependencies

param(
    [switch]$SkipDatabases,
    [switch]$SkipNode,
    [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Investment Trading Portfolio - Windows Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host "   Consider running: powershell -ExecutionPolicy Bypass -Command 'Start-Process powershell -Verb RunAs'" -ForegroundColor Yellow
    Write-Host ""
}

# Create required directories
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
$directories = @(
    "C:\data\db",           # MongoDB data
    "C:\data\questdb",      # QuestDB data
    "C:\data\redis",        # Redis data
    "C:\data\backups",      # Local backups
    "C:\QuestDB",           # QuestDB installation
    "$PSScriptRoot\..\logs\pm2"  # PM2 logs
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Exists: $dir" -ForegroundColor Gray
    }
}

# Check Node.js
if (-not $SkipNode) {
    Write-Host "`n🟢 Checking Node.js..." -ForegroundColor Yellow
    try {
        $nodeVersion = node --version
        if ($nodeVersion -match "v(\d+)\.") {
            $major = [int]$matches[1]
            if ($major -ge 20) {
                Write-Host "  ✅ Node.js $nodeVersion (OK)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Node.js $nodeVersion (Upgrade to 20.x recommended)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
        Write-Host "     Required: Node.js 20.x or higher" -ForegroundColor Red
        exit 1
    }

    # Check/Install pnpm
    Write-Host "`n📦 Checking pnpm..." -ForegroundColor Yellow
    try {
        $pnpmVersion = pnpm --version
        Write-Host "  ✅ pnpm $pnpmVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  pnpm not found. Installing..." -ForegroundColor Yellow
        npm install -g pnpm
        Write-Host "  ✅ pnpm installed" -ForegroundColor Green
    }

    # Check/Install PM2
    Write-Host "`n⚙️  Checking PM2..." -ForegroundColor Yellow
    try {
        $pm2Version = pm2 --version
        Write-Host "  ✅ PM2 $pm2Version" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  PM2 not found. Installing..." -ForegroundColor Yellow
        npm install -g pm2
        Write-Host "  ✅ PM2 installed" -ForegroundColor Green
    }
}

# Check Python
if (-not $SkipPython) {
    Write-Host "`n🐍 Checking Python..." -ForegroundColor Yellow
    try {
        $pythonVersion = python --version
        if ($pythonVersion -match "Python 3\.(\d+)\.") {
            $minor = [int]$matches[1]
            if ($minor -ge 11) {
                Write-Host "  ✅ $pythonVersion (OK)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $pythonVersion (Python 3.11+ recommended)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ❌ Python not found. Please install from https://www.python.org/" -ForegroundColor Red
        Write-Host "     Required: Python 3.11 or higher" -ForegroundColor Red
        exit 1
    }
}

# QuestDB Installation
if (-not $SkipDatabases) {
    Write-Host "`n🗄️  Setting up QuestDB..." -ForegroundColor Yellow
    
    $questdbPath = "C:\QuestDB"
    $questdbExe = "$questdbPath\bin\questdb.exe"
    
    if (Test-Path $questdbExe) {
        Write-Host "  ⏭️  QuestDB already installed at $questdbPath" -ForegroundColor Gray
    } else {
        Write-Host "  📥 Downloading QuestDB..." -ForegroundColor Yellow
        $questdbZip = "$env:TEMP\questdb.zip"
        $questdbUrl = "https://github.com/questdb/questdb/releases/download/8.2.1/questdb-8.2.1-rt-windows-amd64.zip"
        
        try {
            Invoke-WebRequest -Uri $questdbUrl -OutFile $questdbZip -UseBasicParsing
            Write-Host "  ✅ Downloaded QuestDB" -ForegroundColor Green
            
            Write-Host "  📦 Extracting to $questdbPath..." -ForegroundColor Yellow
            Expand-Archive -Path $questdbZip -DestinationPath $questdbPath -Force
            Remove-Item $questdbZip
            Write-Host "  ✅ QuestDB installed" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Failed to download QuestDB. Please install manually from:" -ForegroundColor Yellow
            Write-Host "     https://questdb.io/download/" -ForegroundColor Yellow
        }
    }

    # MongoDB Installation Check
    Write-Host "`n🗄️  Checking MongoDB..." -ForegroundColor Yellow
    try {
        $mongoVersion = mongod --version | Select-String "db version"
        Write-Host "  ✅ MongoDB installed: $mongoVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  MongoDB not found. Please install from:" -ForegroundColor Yellow
        Write-Host "     https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
        Write-Host "     Or use: winget install MongoDB.Server" -ForegroundColor Yellow
    }

    # Redis Installation Check
    Write-Host "`n🗄️  Checking Redis..." -ForegroundColor Yellow
    try {
        $redisVersion = redis-server --version
        Write-Host "  ✅ Redis installed: $redisVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Redis not found. Install Memurai (Redis for Windows):" -ForegroundColor Yellow
        Write-Host "     https://www.memurai.com/get-memurai" -ForegroundColor Yellow
        Write-Host "     Or use: winget install Memurai.Memurai" -ForegroundColor Yellow
    }
}

# Install project dependencies
Write-Host "`n📚 Installing project dependencies..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\..
pnpm install
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Create .env.local if not exists
if (-not (Test-Path ".env.local")) {
    Write-Host "`n⚙️  Creating .env.local..." -ForegroundColor Yellow
    if (Test-Path ".env.template") {
        Copy-Item ".env.template" ".env.local"
        Write-Host "  ✅ Created .env.local (please update with your credentials)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  .env.template not found, skipping" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Windows setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update .env.local with your API keys" -ForegroundColor White
Write-Host "  2. Start databases: .\scripts\start-databases.ps1" -ForegroundColor White
Write-Host "  3. Verify setup: .\scripts\verify-windows-env.ps1" -ForegroundColor White
Write-Host "  4. Start development: pnpm dev:win" -ForegroundColor White
Write-Host ""
