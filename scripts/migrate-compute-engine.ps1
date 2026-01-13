# Compute Engine Migration Script
# Renames compute-engine-napi to compute-engine and updates all references

Write-Host "🔄 Starting compute-engine migration..." -ForegroundColor Cyan

# 1. Check if old compute-engine exists
if (Test-Path "services\compute-engine") {
    Write-Host "⚠️  Found old services/compute-engine" -ForegroundColor Yellow
    Write-Host "   Backing up to services/compute-engine.backup..." -ForegroundColor Yellow
    if (Test-Path "services\compute-engine.backup") {
        Remove-Item -Recurse -Force "services\compute-engine.backup"
    }
    Move-Item "services\compute-engine" "services\compute-engine.backup"
    Write-Host "   ✅ Backup created" -ForegroundColor Green
}

# 2. Rename compute-engine-napi to compute-engine
Write-Host "`n📦 Renaming compute-engine-napi to compute-engine..." -ForegroundColor Cyan
Move-Item "services\compute-engine-napi" "services\compute-engine"
Write-Host "   ✅ Renamed" -ForegroundColor Green

# 3. Update package.json name
Write-Host "`n📝 Updating package.json..." -ForegroundColor Cyan
$packageJson = Get-Content "services\compute-engine\package.json" -Raw | ConvertFrom-Json
$packageJson.name = "@repo/compute-engine"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "services\compute-engine\package.json"
Write-Host "   ✅ Updated package name" -ForegroundColor Green

# 4. Update Cargo.toml name
Write-Host "`n🦀 Updating Cargo.toml..." -ForegroundColor Cyan
(Get-Content "services\compute-engine\Cargo.toml") -replace 'name = "compute_engine_napi"', 'name = "compute_engine"' | Set-Content "services\compute-engine\Cargo.toml"
Write-Host "   ✅ Updated crate name" -ForegroundColor Green

# 5. Update workspace references
Write-Host "`n🔧 Updating workspace references..." -ForegroundColor Cyan

# Update root package.json workspaces
$rootPkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$rootPkg.workspaces = $rootPkg.workspaces | Where-Object { $_ -ne "services/compute-engine-napi" }
if ($rootPkg.workspaces -notcontains "services/compute-engine") {
    $rootPkg.workspaces += "services/compute-engine"
}
$rootPkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
Write-Host "   ✅ Updated root package.json" -ForegroundColor Green

# Update market-feeder dependencies
if (Test-Path "services\market-feeder\package.json") {
    $mfPkg = Get-Content "services\market-feeder\package.json" -Raw | ConvertFrom-Json
    if ($mfPkg.dependencies.'@repo/compute-engine-napi') {
        $version = $mfPkg.dependencies.'@repo/compute-engine-napi'
        $mfPkg.dependencies.PSObject.Properties.Remove('@repo/compute-engine-napi')
        $mfPkg.dependencies | Add-Member -MemberType NoteProperty -Name '@repo/compute-engine' -Value $version
        $mfPkg | ConvertTo-Json -Depth 10 | Set-Content "services\market-feeder\package.json"
        Write-Host "   ✅ Updated market-feeder dependencies" -ForegroundColor Green
    }
}

# 6. Generate TypeScript types
Write-Host "`n🎯 Generating TypeScript types from Rust..." -ForegroundColor Cyan
Set-Location "packages\schema"
pnpm run generate:rust-types
Set-Location "..\..\"
Write-Host "   ✅ Types generated" -ForegroundColor Green

# 7. Reinstall dependencies
Write-Host "`n📦 Reinstalling dependencies..." -ForegroundColor Cyan
pnpm install
Write-Host "   ✅ Dependencies updated" -ForegroundColor Green

Write-Host "`n✨ Migration complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Update imports in market-feeder:" -ForegroundColor White
Write-Host "     Old: import { ... } from '@repo/compute-engine-napi';" -ForegroundColor Gray
Write-Host "     New: import { ... } from '@repo/compute-engine';" -ForegroundColor Gray
Write-Host "`n  2. Verify types are generated:" -ForegroundColor White
Write-Host "     ls packages/schema/src/market-data/generated/*.ts" -ForegroundColor Gray
Write-Host "`n  3. Build compute-engine:" -ForegroundColor White
Write-Host "     cd services/compute-engine && pnpm build" -ForegroundColor Gray
