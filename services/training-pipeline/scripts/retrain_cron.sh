#!/bin/bash
# ==============================================================================
# Automated Model Retraining — MongoDB-Driven Pipeline with MLflow
#
# Reads experiment config from MongoDB, trains requested tiers, runs quality
# gates, logs models to MLflow Registry with native flavors, and triggers
# model serving reload via @champion alias promotion.
#
# Models are served by the mlflow-model-server container which loads
# @champion aliases from the MLflow Registry on startup.
#
# Execution: Crontab (e.g. 0 2 * * 6 for every Saturday 2AM)
#   EXPERIMENT_ID must be set in the environment or passed as $1.
# ==============================================================================

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
EXPERIMENT_ID="${1:-${EXPERIMENT_ID:-}}"

if [ -z "$EXPERIMENT_ID" ]; then
    echo "[ERROR] EXPERIMENT_ID required. Pass as argument or env var."
    exit 1
fi

cd "$PROJECT_ROOT"

echo "======================================================"
echo "[$(date)] Starting Automated Retraining (MLflow-native)"
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

echo "[$(date)] Training complete."
echo "[$(date)] Models registered in MLflow Registry with @champion alias."
echo "[$(date)] MLflow Model Serving will pick up new champion on next health check."

echo "======================================================"
echo "[$(date)] Retraining complete."
echo "======================================================"
