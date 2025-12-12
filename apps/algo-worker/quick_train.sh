#!/bin/bash
# Quick training script - trains only fast models (XGBoost, SVM)
# Skip deep learning models for now

set -e

echo "========================================"
echo "Quick ML Model Training"
echo "========================================"

cd /home/anandhu/Code/investment-trading-portfolio/apps/algo-worker
source ml/venv/bin/activate

# Check if training data exists
if [ ! -f "data/exports/features_labeled.csv" ]; then
    echo "Generating training data..."
    python ml/utils/generate_sample_data.py
fi

# Train XGBoost (if not already trained)
if [ ! -f "models/xgboost.pkl" ]; then
    echo ""
    echo "Training XGBoost..."
    python ml/training/train_xgboost.py
else
    echo "✓ XGBoost already trained"
fi

# Train SVM
echo ""
echo "Training SVM..."
python ml/training/train_svm.py

echo ""
echo "========================================"
echo "Quick training completed!"
echo "========================================"
echo ""
echo "Trained models:"
ls -1 models/*.pkl models/*.json 2>/dev/null | grep -E '\.(pkl|json)$'
echo ""
echo "Next: Start NestJS app with 'pnpm run dev'"
