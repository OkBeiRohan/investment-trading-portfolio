#!/bin/bash
# PM2 Deployment Script for ArchLinux
# Deploys ML training and model serving apps

set -e

ENVIRONMENT="${1:-production}"
SKIP_BUILD="${2:-false}"

echo "🚀 Deploying PM2 apps on ArchLinux ($ENVIRONMENT mode)..."

# Check prerequisites
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Install with: sudo npm install -g pm2"
    exit 1
fi

# Check GPU availability
if ! command -v nvidia-smi &> /dev/null; then
    echo "⚠️  nvidia-smi not found. GPU may not be available."
else
    echo "🎮 GPU Status:"
    nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader
fi

# Build apps if needed
if [ "$SKIP_BUILD" != "true" ]; then
    echo "📦 Building training pipeline..."
    cd "$(dirname "$0")/.."
    pnpm turbo run build --filter=training-pipeline --filter=algo-worker
    if [ $? -ne 0 ]; then
        echo "❌ Build failed!"
        exit 1
    fi
fi

# Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop algo-worker-training 2>/dev/null || true

# Start ArchLinux apps from ecosystem config
echo "▶️  Starting ArchLinux apps..."
pm2 start ecosystem.config.js --only algo-worker-training --env "$ENVIRONMENT"

# Save PM2 process list
pm2 save --force

# Wait for apps to initialize
echo "⏳ Waiting for apps to initialize..."
sleep 5

# Health checks
echo "🔍 Running health checks..."

HEALTHY=true

# Check algo-worker-training
if pm2 describe algo-worker-training &> /dev/null; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="algo-worker-training") | .pm2_env.status')
    if [ "$STATUS" = "online" ]; then
        echo "  ✅ algo-worker-training is online"
    else
        echo "  ❌ algo-worker-training status: $STATUS"
        HEALTHY=false
    fi
else
    echo "  ❌ algo-worker-training not found"
    HEALTHY=false
fi

# Check GPU access
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi &> /dev/null; then
        echo "  ✅ GPU is accessible"
    else
        echo "  ⚠️  GPU check failed"
        HEALTHY=false
    fi
fi

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 list

if [ "$HEALTHY" = true ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "   Monitor logs: pm2 logs"
    echo "   Monitor GPU: watch -n 1 nvidia-smi"
    echo "   Stop all: pm2 stop all"
    echo "   Restart: pm2 restart all"
else
    echo ""
    echo "⚠️  Deployment completed with warnings. Check logs: pm2 logs"
fi
