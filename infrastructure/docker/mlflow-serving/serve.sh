#!/usr/bin/env bash
set -euo pipefail

# MLflow Model Serving — serves all tier models from the MLflow Registry.
# Each model is loaded via its @champion alias so a new training run
# that promotes a challenger will be picked up on container restart.

MLFLOW_TRACKING_URI="${MLFLOW_TRACKING_URI:-http://mlflow-server:5000}"
export MLFLOW_TRACKING_URI

echo "[mlflow-serving] Tracking URI: ${MLFLOW_TRACKING_URI}"
echo "[mlflow-serving] Starting model servers..."

mlflow models serve \
  -m "models:/trading-tier0-xgboost-gap@champion" \
  -p 5001 --no-conda --host 0.0.0.0 &

mlflow models serve \
  -m "models:/trading-tier1-patchtst@champion" \
  -p 5002 --no-conda --host 0.0.0.0 &

mlflow models serve \
  -m "models:/trading-tier2-lightgbm-cpcv@champion" \
  -p 5003 --no-conda --host 0.0.0.0 &

mlflow models serve \
  -m "models:/trading-tier3-lit-microstructure@champion" \
  -p 5004 --no-conda --host 0.0.0.0 &

mlflow models serve \
  -m "models:/trading-meta-learner@champion" \
  -p 5005 --no-conda --host 0.0.0.0 &

mlflow models serve \
  -m "models:/trading-tier1-hmm-regime@champion" \
  -p 5006 --no-conda --host 0.0.0.0 &

echo "[mlflow-serving] All model servers launched."

wait
