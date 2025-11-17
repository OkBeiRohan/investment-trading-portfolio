#!/bin/bash
# Train all ML models in sequence
# Run from apps/algo-worker directory

set -e  # Exit on error

echo "========================================"
echo "ML Model Training Pipeline"
echo "========================================"

# Activate virtual environment
source ml/venv/bin/activate

# Step 1: Generate sample training data
echo ""
echo "Step 1: Generating sample training data..."
python ml/utils/generate_sample_data.py

# Check if data was generated
if [ ! -f "data/exports/features_labeled.csv" ]; then
    echo "Error: Training data not generated!"
    exit 1
fi

echo "✓ Training data ready"

# Step 2: Train XGBoost
echo ""
echo "========================================"
echo "Step 2: Training XGBoost model..."
echo "========================================"
python ml/training/train_xgboost.py

# Step 3: Train CNN-LSTM
echo ""
echo "========================================"
echo "Step 3: Training CNN-LSTM model..."
echo "========================================"
python ml/training/train_cnn_lstm.py

# Step 4: Train GINN
echo ""
echo "========================================"
echo "Step 4: Training GINN model..."
echo "========================================"
python ml/training/train_ginn.py

# Step 5: Train SVM
echo ""
echo "========================================"
echo "Step 5: Training SVM model..."
echo "========================================"
python ml/training/train_svm.py

# Step 6: Train Stacking Ensemble
echo ""
echo "========================================"
echo "Step 6: Training Stacking Ensemble..."
echo "========================================"
python ml/training/train_stacking.py

echo ""
echo "========================================"
echo "All models trained successfully!"
echo "========================================"
echo ""
echo "Models saved in:"
ls -lah models/

echo ""
echo "Next steps:"
echo "1. Start NestJS app: pnpm run dev"
echo "2. Models will be loaded automatically"
echo "3. Check logs for model loading confirmation"
