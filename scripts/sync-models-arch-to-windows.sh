#!/bin/bash
# Model Sync Script - ArchLinux to Windows
# Syncs trained ONNX models from ArchLinux to Windows machine

set -e

# Configuration
WINDOWS_HOST="${WINDOWS_HOST:-192.168.1.100}"
WINDOWS_USER="${WINDOWS_USER:-trader}"
WINDOWS_MODELS_DIR="${WINDOWS_MODELS_DIR:-C:/Code/investment-trading-portfolio/apps/algo-worker/models}"
LOCAL_MODELS_DIR="$(dirname "$0")/../apps/algo-worker/models"
BACKUP_DIR="$(dirname "$0")/../backups/models/$(date +%Y%m%d_%H%M%S)"

echo "🔄 Syncing models from ArchLinux to Windows..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Find all ONNX and joblib files
MODEL_FILES=$(find "$LOCAL_MODELS_DIR" -type f \( -name "*.onnx" -o -name "*.joblib" \) 2>/dev/null || echo "")

if [ -z "$MODEL_FILES" ]; then
    echo "⚠️  No model files found in $LOCAL_MODELS_DIR"
    exit 0
fi

echo "📦 Found models to sync:"
echo "$MODEL_FILES" | while read -r file; do
    if [ -f "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        echo "  - $(basename "$file") ($SIZE)"
    fi
done

# Backup models locally
echo ""
echo "💾 Creating local backup..."
echo "$MODEL_FILES" | while read -r file; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "  ✅ Backed up: $(basename "$file")"
    fi
done

# Calculate checksums
echo ""
echo "🔐 Calculating checksums..."
cd "$LOCAL_MODELS_DIR"
find . -type f \( -name "*.onnx" -o -name "*.joblib" \) -exec sha256sum {} \; > checksums.txt
echo "  ✅ Checksums saved to checksums.txt"

# Create metadata JSON
METADATA_FILE="$LOCAL_MODELS_DIR/metadata.json"
cat > "$METADATA_FILE" << EOF
{
  "syncedAt": "$(date -Iseconds)",
  "sourceHost": "$(hostname)",
  "targetHost": "$WINDOWS_HOST",
  "models": [
EOF

FIRST=true
echo "$MODEL_FILES" | while read -r file; do
    if [ -f "$file" ]; then
        BASENAME=$(basename "$file")
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        CHECKSUM=$(sha256sum "$file" | cut -d' ' -f1)
        
        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo "," >> "$METADATA_FILE"
        fi
        
        cat >> "$METADATA_FILE" << EOF
    {
      "name": "$BASENAME",
      "size": $SIZE,
      "checksum": "$CHECKSUM",
      "type": "${BASENAME##*.}"
    }
EOF
    fi
done

cat >> "$METADATA_FILE" << EOF

  ]
}
EOF

echo "  ✅ Metadata saved to metadata.json"

# Rsync to Windows
echo ""
echo "🚀 Syncing to Windows ($WINDOWS_HOST)..."

# Convert Windows path to rsync format
WINDOWS_PATH_RSYNC=$(echo "$WINDOWS_MODELS_DIR" | sed 's|C:|/c|' | sed 's|\\|/|g')

# Use rsync over SSH (requires SSH server on Windows or WSL)
rsync -avz --progress \
    --include='*.onnx' \
    --include='*.joblib' \
    --include='metadata.json' \
    --include='checksums.txt' \
    --exclude='*' \
    "$LOCAL_MODELS_DIR/" \
    "${WINDOWS_USER}@${WINDOWS_HOST}:${WINDOWS_PATH_RSYNC}/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Model sync completed successfully!"
    echo "   Backup location: $BACKUP_DIR"
    echo "   Metadata: $METADATA_FILE"
    echo ""
    echo "🔔 Triggering hot-reload on Windows..."
    
    # Trigger hot-reload via HTTP endpoint (if algo-worker is running)
    RELOAD_URL="http://${WINDOWS_HOST}:3001/api/models/reload"
    if curl -s -f -X POST "$RELOAD_URL" -H "Content-Type: application/json" -d "{\"reason\": \"model-sync\"}" &>/dev/null; then
        echo "  ✅ Hot-reload triggered successfully"
    else
        echo "  ⚠️  Could not trigger hot-reload (algo-worker may not be running)"
        echo "     Manually restart algo-worker on Windows"
    fi
else
    echo "❌ Model sync failed!"
    echo "   Check SSH connectivity: ssh ${WINDOWS_USER}@${WINDOWS_HOST}"
    exit 1
fi

echo ""
echo "📊 Sync Summary:"
echo "   Source: $(hostname):$LOCAL_MODELS_DIR"
echo "   Target: $WINDOWS_HOST:$WINDOWS_MODELS_DIR"
echo "   Backup: $BACKUP_DIR"
