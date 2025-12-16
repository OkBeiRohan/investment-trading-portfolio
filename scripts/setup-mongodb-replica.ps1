# Setup MongoDB Replica Set for Transaction Support
# This enables better-auth experimental features (joins: true)

Write-Host "Setting up MongoDB Replica Set for Transaction Support..." -ForegroundColor Cyan

# Check if MongoDB container is running
$mongoContainer = docker ps --filter "name=mongodb" --format "{{.Names}}"
if (-not $mongoContainer) {
    Write-Host "ERROR: MongoDB container not running. Start it first with:" -ForegroundColor Red
    Write-Host "  docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found MongoDB container: $mongoContainer" -ForegroundColor Green

# Stop MongoDB container
Write-Host "`nStopping MongoDB container..." -ForegroundColor Yellow
docker-compose -f infrastructure/docker/docker-compose.yml stop mongodb

# Update docker-compose.yml to enable replica set
Write-Host "`nUpdating docker-compose.yml for replica set mode..." -ForegroundColor Yellow
$composeFile = "infrastructure/docker/docker-compose.yml"
$content = Get-Content $composeFile -Raw

# Uncomment replica set configuration
$content = $content -replace '#\s*MONGO_REPLICA_SET_NAME:', '      MONGO_REPLICA_SET_NAME:'
$content = $content -replace '#\s*command:', '    command:'

Set-Content $composeFile $content

Write-Host "✓ Updated docker-compose.yml" -ForegroundColor Green

# Start MongoDB with replica set
Write-Host "`nStarting MongoDB with replica set..." -ForegroundColor Yellow
docker-compose -f infrastructure/docker/docker-compose.yml up -d mongodb

# Wait for MongoDB to be ready
Write-Host "Waiting for MongoDB to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Initialize replica set
Write-Host "`nInitializing replica set..." -ForegroundColor Yellow
docker exec mongodb mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'localhost:27017' }
  ]
})"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ MongoDB Replica Set initialized successfully!" -ForegroundColor Green
    Write-Host "`nNow you can enable transactions in auth.service.ts:" -ForegroundColor Cyan
    Write-Host "  adapter: mongodbAdapter(db, {" -ForegroundColor Gray
    Write-Host "    client: client," -ForegroundColor Gray
    Write-Host "    experimental: { joins: true },  // <-- Uncomment this" -ForegroundColor Yellow
    Write-Host "  })" -ForegroundColor Gray
} else {
    Write-Host "`n✗ Failed to initialize replica set" -ForegroundColor Red
    exit 1
}

# Verify replica set status
Write-Host "`nVerifying replica set status..." -ForegroundColor Yellow
docker exec mongodb mongosh --eval "rs.status()"
