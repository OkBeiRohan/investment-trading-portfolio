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
OUTPUT_DIR="src/providers/upstox/websocket/proto"
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
# Proxy detection (check common env var names, prefer direct connection if none set)
# Support explicit override via FETCH_PROTO_PROXY for CI / Windows->WSL scenarios
CURL_PROXY=""
echo "[debug] env HTTPS_PROXY=$HTTPS_PROXY https_proxy=$https_proxy HTTP_PROXY=$HTTP_PROXY http_proxy=$http_proxy FETCH_PROTO_PROXY=$FETCH_PROTO_PROXY"

# Priority: FETCH_PROTO_PROXY > HTTPS_PROXY > https_proxy > HTTP_PROXY > http_proxy
if [ -n "$FETCH_PROTO_PROXY" ]; then
  SELECTED_PROXY="$FETCH_PROTO_PROXY"
elif [ -n "$HTTPS_PROXY" ]; then
  SELECTED_PROXY="$HTTPS_PROXY"
elif [ -n "$https_proxy" ]; then
  SELECTED_PROXY="$https_proxy"
elif [ -n "$HTTP_PROXY" ]; then
  SELECTED_PROXY="$HTTP_PROXY"
elif [ -n "$http_proxy" ]; then
  SELECTED_PROXY="$http_proxy"
else
  SELECTED_PROXY=""
fi

if [ -n "$SELECTED_PROXY" ]; then
  echo "Using proxy: $SELECTED_PROXY"
  CURL_PROXY="--proxy $SELECTED_PROXY"
else
  echo "No proxy detected; attempting direct connection"
fi

# If nothing found in the *nix env, try to read Windows env vars (useful when running from PowerShell)
if [ -z "$SELECTED_PROXY" ]; then
  # Try cmd.exe expansion (Git Bash / MSYS / WSL may have cmd.exe)
  if command -v cmd.exe >/dev/null 2>&1; then
    win_fetch=$(cmd.exe /C "echo %FETCH_PROTO_PROXY%" 2>/dev/null | tr -d '\r')
    win_https=$(cmd.exe /C "echo %HTTPS_PROXY%" 2>/dev/null | tr -d '\r')
    win_http=$(cmd.exe /C "echo %HTTP_PROXY%" 2>/dev/null | tr -d '\r')
    if [ -n "$win_fetch" ] && [ "$win_fetch" != "%FETCH_PROTO_PROXY%" ]; then
      SELECTED_PROXY="$win_fetch"
      echo "Detected Windows FETCH_PROTO_PROXY via cmd.exe: $SELECTED_PROXY"
    elif [ -n "$win_https" ] && [ "$win_https" != "%HTTPS_PROXY%" ]; then
      SELECTED_PROXY="$win_https"
      echo "Detected Windows HTTPS_PROXY via cmd.exe: $SELECTED_PROXY"
    elif [ -n "$win_http" ] && [ "$win_http" != "%HTTP_PROXY%" ]; then
      SELECTED_PROXY="$win_http"
      echo "Detected Windows HTTP_PROXY via cmd.exe: $SELECTED_PROXY"
    fi
  fi

  # Try powershell.exe (another approach on Windows)
  if [ -z "$SELECTED_PROXY" ] && command -v powershell.exe >/dev/null 2>&1; then
    ps_fetch=$(powershell.exe -NoProfile -Command "Write-Output $env:FETCH_PROTO_PROXY" 2>/dev/null | tr -d '\r')
    ps_https=$(powershell.exe -NoProfile -Command "Write-Output $env:HTTPS_PROXY" 2>/dev/null | tr -d '\r')
    ps_http=$(powershell.exe -NoProfile -Command "Write-Output $env:HTTP_PROXY" 2>/dev/null | tr -d '\r')
    if [ -n "$ps_fetch" ]; then
      SELECTED_PROXY="$ps_fetch"
      echo "Detected Windows FETCH_PROTO_PROXY via powershell.exe: $SELECTED_PROXY"
    elif [ -n "$ps_https" ]; then
      SELECTED_PROXY="$ps_https"
      echo "Detected Windows HTTPS_PROXY via powershell.exe: $SELECTED_PROXY"
    elif [ -n "$ps_http" ]; then
      SELECTED_PROXY="$ps_http"
      echo "Detected Windows HTTP_PROXY via powershell.exe: $SELECTED_PROXY"
    fi
  fi

  if [ -n "$SELECTED_PROXY" ]; then
    CURL_PROXY="--proxy $SELECTED_PROXY"
  fi
fi

echo "Downloading from: $PROTO_URL"
echo "curl -v $CURL_PROXY -L -o $OUTPUT_FILE $PROTO_URL" # Debug: show command
echo "Current working directory: $(pwd)"
echo "Output file will be: $OUTPUT_FILE"
curl -v $CURL_PROXY -L -o "$OUTPUT_FILE" "$PROTO_URL"
curl_exit_code=$?

# 3. Verify Download
if [ $curl_exit_code -eq 0 ]; then
    if [ -s "$OUTPUT_FILE" ]; then
        # Check if file actually contains Protobuf content (simple validation)
        if grep -q "package com.upstox" "$OUTPUT_FILE"; then
            echo -e "${GREEN}✅ Success: Proto file updated at $OUTPUT_FILE${NC}"
            echo "Package Verified: $(grep "package com.upstox" "$OUTPUT_FILE")"
        else
            echo -e "${RED}❌ Error: Downloaded file appears invalid (Not a proto file).${NC}"
            head -20 "$OUTPUT_FILE" # Show first lines for debugging
            exit 1
        fi
    else
        echo -e "${RED}❌ Error: Downloaded file is empty.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error: Failed to download proto file. curl exit code: $curl_exit_code${NC}"
    exit 1
fi

echo "--------------------------------------------------"