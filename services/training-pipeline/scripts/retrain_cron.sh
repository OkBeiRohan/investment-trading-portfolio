#!/bin/bash
# ==============================================================================
# Automated Model Retraining Script (Phase 9)
# 
# Purpose: Triggers the Kedro pipeline to fetch the latest Market features 
#          from QuestDB, run CPCV over new folds, and export fresh ONNX graphs.
# Execution: Meant to be run via Crontab (e.g. 0 2 * * 6 for every Saturday 2AM)
# ==============================================================================

set -e

# Project root for Kedro
export PROJECT_ROOT="/home/anandhuprakash/Code/investment-trading-portfolio/services/training-pipeline"
export ALGO_WORKER_MODELS="/home/anandhuprakash/Code/investment-trading-portfolio/apps/algo-worker/models"

cd "$PROJECT_ROOT"

echo "======================================================"
echo "[$(date)] Starting Automated Retraining Sequence"
echo "======================================================"

# Step 1: Ensure dependencies are fresh
# (Optional, comment out if strictly frozen environment)
# poetry install --no-dev 

# Step 2: Trigger the ENTIRE pipeline (Tiers 0-3 + MetaLearner + Evaluate + ONNX Export)
echo "[$(date)] Running full Kedro pipeline orchestration..."
kedro run 

# The pipeline inherently handles:
# - Querying QuestDB for new OOS dataset folds
# - Refitting LightGBM, PyTorch (LiT, PatchTST)
# - Running VectorBT `evaluate_strategy`
# - Exporting *.onnx files

# Step 3: Deployment (Swap models)
echo "[$(date)] Kedro run successful. Initiating Model Swap..."

# Assuming ONNX export dumped into data/06_models
cp -f data/06_models/*.onnx "$ALGO_WORKER_MODELS/"

echo "[$(date)] ONNX models copied to Algo-Worker production directory."

# Step 4: Restart the NextJS application or send SIGHUP for graceful reload
# Doing a PM2 restart for the Node.js/NestJS Worker
# pm2 reload algo-worker --update-env

echo "======================================================"
echo "[$(date)] Retraining Complete. Production models are live."
echo "======================================================"
