#!/bin/bash

# ==============================================================================
# Upstox V3 Proto Fetcher
# 
# Description: Downloads the latest Market Data Feed V3 Protobuf definition.
# Source: https://assets.upstox.com/feed/market-data-feed/v3/MarketDataFeed.proto
# Usage: Run via npm script 'npm run proto:update'
# ==============================================================================

# Configuration
PROTO_URL="https://assets.upstox.com/feed/market-data-feed/v3/MarketDataFeed.proto"
OUTPUT_DIR="src/api/upstox/market-data/proto"
OUTPUT_FILE="$OUTPUT_DIR/MarketDataFeedV3.proto"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Ensure output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Creating directory: $OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR"
fi

# 2. Download the file
echo "Downloading from: $PROTO_URL"
curl -s -L -o "$OUTPUT_FILE" "$PROTO_URL"
curl_exit_code=$?

# 3. Verify Download
if [ $curl_exit_code -eq 0 ]; then
    # Check if file actually contains Protobuf content (simple validation)
    if grep -q "package com.upstox" "$OUTPUT_FILE"; then
        echo -e "${GREEN}✅ Success: Proto file updated at $OUTPUT_FILE${NC}"
        echo "Package Verified: $(grep "package com.upstox" "$OUTPUT_FILE")"
    else
        echo -e "${RED}❌ Error: Downloaded file appears invalid (Not a proto file).${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error: Failed to download proto file.${NC}"
    exit 1
fi

echo "--------------------------------------------------"