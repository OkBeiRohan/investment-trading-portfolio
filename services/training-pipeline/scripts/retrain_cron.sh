#!/bin/bash
# ==============================================================================
# Automated Model Retraining — MongoDB-Driven Pipeline
#
# Reads experiment config from MongoDB, trains requested tiers, runs quality
# gates, exports ONNX, and deploys to algo-worker if promoted.
#
# Execution: Crontab (e.g. 0 2 * * 6 for every Saturday 2AM)
#   EXPERIMENT_ID must be set in the environment or passed as $1.
# ==============================================================================

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
ALGO_WORKER_MODELS="${ALGO_WORKER_MODELS:-$PROJECT_ROOT/../../apps/algo-worker/models}"
EXPERIMENT_ID="${1:-${EXPERIMENT_ID:-}}"

if [ -z "$EXPERIMENT_ID" ]; then
    echo "[ERROR] EXPERIMENT_ID required. Pass as argument or env var."
    exit 1
fi

cd "$PROJECT_ROOT"

echo "======================================================"
echo "[$(date)] Starting Automated Retraining"
echo "  Experiment: $EXPERIMENT_ID"
echo "======================================================"

python -m training_pipeline.runner \
    --experiment-id "$EXPERIMENT_ID" \
    --log-level INFO

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "[$(date)] Training pipeline FAILED (exit $EXIT_CODE)"
    exit $EXIT_CODE
fi

echo "[$(date)] Training complete. Deploying ONNX models..."

if [ -d "data/06_models" ]; then
    mkdir -p "$ALGO_WORKER_MODELS"
    cp -f data/06_models/*.onnx "$ALGO_WORKER_MODELS/" 2>/dev/null || true
    echo "[$(date)] ONNX models copied to $ALGO_WORKER_MODELS"
else
    echo "[$(date)] No model directory found — skipping deploy"
fi

echo "======================================================"
echo "[$(date)] Retraining complete."
echo "======================================================"
