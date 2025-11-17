# Unified ML Architecture - NestJS as Central Orchestrator

## 🎯 Core Principle

**NestJS is the single source of truth for ALL data operations.**

Python ML scripts are **PURE COMPUTE** - they receive data, train models, export ONNX. Nothing else.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS (algo-worker)                      │
│                  Central Data Orchestrator                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Data Collection & Management             │    │
│  │  - Uses @repo/market-sdk for all market data      │    │
│  │  - Uses @repo/database for all MongoDB ops        │    │
│  │  - Provides REST/tRPC endpoints for data access   │    │
│  └────────────────────────────────────────────────────┘    │
│                           ⬇️                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Training Data Preparation Service          │    │
│  │  - Fetch from MongoDB (via @repo/database)        │    │
│  │  - Feature engineering (TypeScript)                │    │
│  │  - Export to CSV/JSON for Python                   │    │
│  └────────────────────────────────────────────────────┘    │
│                           ⬇️                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Model Training Orchestrator             │    │
│  │  - Spawn Python training process                   │    │
│  │  - Pass data file paths as arguments               │    │
│  │  - Monitor training progress                        │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                           ⬇️ CSV/JSON
┌─────────────────────────────────────────────────────────────┐
│              Python (Pure Training Scripts)                  │
│                                                              │
│  Input: CSV/JSON files from NestJS                          │
│  Process: Train models (XGBoost, TensorFlow, etc.)          │
│  Output: .onnx model files                                  │
│  Dependencies: ONLY ML libraries (no DB, no API clients)    │
└─────────────────────────────────────────────────────────────┘
                           ⬇️ .onnx files
┌─────────────────────────────────────────────────────────────┐
│              NestJS (Inference / SignalEngine)               │
│                                                              │
│  - Load .onnx models via onnxruntime-node                   │
│  - Run inference in TypeScript                               │
│  - Persist signals to MongoDB via @repo/database            │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions

### ✅ What NestJS Does (Central Orchestrator)

1. **Data Collection**
   - Use `@repo/market-sdk` to fetch historical data from Upstox/Yahoo/Binance
   - Store raw data in MongoDB via `@repo/database`
   - Create REST/tRPC endpoints for data access

2. **Feature Engineering**
   - Implement feature calculation in TypeScript (can reuse in training & inference)
   - Store computed features in MongoDB time-series collections
   - Provide data export endpoints for Python training

3. **Training Orchestration**
   - Export training data to CSV/JSON
   - Spawn Python child process with file paths
   - Monitor training progress and logs
   - Store model metadata in MongoDB

4. **Inference (Production)**
   - Load ONNX models at startup
   - Run predictions in TypeScript
   - Persist results to MongoDB

### ❌ What Python Does NOT Do

- ❌ NO direct MongoDB access
- ❌ NO API calls to external services
- ❌ NO data fetching
- ❌ ONLY receives prepared data files
- ❌ ONLY trains and exports models

### ✅ What Python DOES Do (Pure Compute)

- ✅ Read CSV/JSON training data
- ✅ Train ML models (XGBoost, TensorFlow, SVM)
- ✅ Export to ONNX format
- ✅ Write training logs/metrics to stdout (captured by NestJS)

---

## Data Flow

### Training Flow

```typescript
// Step 1: NestJS collects and prepares data
@Injectable()
export class TrainingDataService {
  async prepareTrainingData(startDate: Date, endDate: Date) {
    // Fetch from MongoDB (already collected by DataEngine)
    const features = await collections.featureSnapshots
      .find({ timestamp: { $gte: startDate, $lte: endDate } })
      .toArray();

    // Export to CSV for Python
    const csvPath = await this.exportToCSV(features);

    return csvPath; // e.g., "data/training_2024-01-01_2024-11-17.csv"
  }
}

// Step 2: NestJS spawns Python training
@Injectable()
export class ModelTrainingService {
  async trainModels(dataPath: string) {
    const pythonProcess = spawn('python', [
      'ml/training/train_models.py',
      '--data',
      dataPath,
      '--output',
      'trained_models',
    ]);

    // Stream logs in real-time
    pythonProcess.stdout.on('data', (data) => {
      this.logger.log(`Training: ${data}`);
    });

    await this.waitForCompletion(pythonProcess);

    // Models are now in trained_models/*.onnx
    return this.loadNewModels();
  }
}
```

### Inference Flow

```typescript
// Pure TypeScript - No Python involved
@Injectable()
export class SignalEngineService {
  async generateSignal(instrumentKey: string) {
    // 1. Get latest features from MongoDB
    const features = await this.getLatestFeatures(instrumentKey);

    // 2. Run inference via ONNX Runtime (TypeScript)
    const predictions = await this.modelLoader.predict(features);

    // 3. Save to MongoDB
    await collections.tradingSignals.create({
      timestamp: new Date(),
      prediction: predictions.signal,
      confidence: predictions.confidence,
      // ... using @repo/schema types
    });
  }
}
```

---

## Directory Structure

```
apps/algo-worker/
├── src/                          # TypeScript (NestJS) - MAIN CODEBASE
│   ├── engines/
│   │   ├── data/
│   │   │   ├── data-collection.service.ts    # Uses @repo/market-sdk
│   │   │   ├── feature-engineering.service.ts # Calculate features
│   │   │   └── training-data.service.ts      # Export data for Python
│   │   ├── signal/
│   │   │   ├── model-loader.service.ts       # ONNX Runtime
│   │   │   └── signal-engine.service.ts      # Inference
│   │   └── training/
│   │       └── model-training.service.ts     # Orchestrate Python training
│   └── controllers/
│       ├── data.controller.ts                # REST endpoints for data
│       └── training.controller.ts            # Trigger training jobs
├── ml/                           # Python - TRAINING ONLY
│   ├── venv/                     # Python virtual environment
│   ├── requirements.txt          # MINIMAL: only ML libraries
│   ├── training/
│   │   ├── train_models.py       # Main training script
│   │   ├── export_to_onnx.py     # ONNX export utilities
│   │   └── config.yaml           # Training hyperparameters
│   └── models/
│       ├── xgboost_trainer.py
│       ├── cnn_lstm_trainer.py
│       ├── ginn_trainer.py
│       ├── svm_trainer.py
│       └── stacking_trainer.py
├── data/                         # Training data exports (gitignored)
│   └── training_*.csv            # Exported by NestJS
└── trained_models/               # ONNX models (gitignored)
    ├── xgboost.onnx
    ├── cnn_lstm.onnx
    ├── ginn.onnx
    ├── svm.onnx
    └── stacking.onnx
```

---

## Updated requirements.txt (Minimal)

```txt
# ONLY ML and ONNX export libraries
# NO database clients, NO API clients, NO data fetching

# Core ML
numpy==1.26.4
pandas==2.2.3
scikit-learn==1.5.2
xgboost==2.1.3

# Deep Learning
tensorflow==2.18.0
keras==3.7.0

# Statistical Models
arch==7.2.0
statsmodels==0.14.4

# ONNX Export
onnx==1.17.0
onnxruntime==1.20.1
onnxmltools==1.12.0
tf2onnx==1.16.1
skl2onnx==1.18.0
onnxconverter-common==1.14.0

# Technical Indicators (pure computation)
ta==0.11.0

# Model Persistence
joblib==1.4.2
h5py==3.12.1

# Utilities
tqdm==4.67.1
pyyaml==6.0.2

# REMOVED:
# - yfinance (use @repo/market-sdk instead)
# - pymongo (use @repo/database instead)
# - jupyter (optional, can add back if needed)
```

---

## Example: Python Training Script

```python
#!/usr/bin/env python3
"""
Pure training script - receives CSV, trains models, exports ONNX
NO database access, NO API calls
"""

import argparse
import pandas as pd
from models.xgboost_trainer import XGBoostTrainer
# ... other imports

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True, help='Path to training CSV')
    parser.add_argument('--output', required=True, help='Output directory')
    args = parser.parse_args()

    # Load data (prepared by NestJS)
    print(f"Loading data from {args.data}")
    df = pd.read_csv(args.data)

    # Train models
    print("Training XGBoost...")
    xgb_trainer = XGBoostTrainer()
    xgb_model = xgb_trainer.train(df)
    xgb_trainer.export_onnx(xgb_model, f"{args.output}/xgboost.onnx")

    # ... train other models

    print("✅ Training complete! Models exported to", args.output)

if __name__ == '__main__':
    main()
```

---

## Example: NestJS Feature Engineering (Shared)

```typescript
// apps/algo-worker/src/engines/data/feature-engineering.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureEngineeringService {
  /**
   * Calculate features - REUSABLE for both training and inference
   * This logic is the SINGLE SOURCE OF TRUTH for feature calculation
   */
  calculateFeatures(candles: Candle[]): Features {
    return {
      // Realized Volatility
      realizedVol5d: this.rollingStd(candles, 5),
      realizedVol10d: this.rollingStd(candles, 10),
      realizedVol20d: this.rollingStd(candles, 20),

      // RSI
      rsi14: this.calculateRSI(candles, 14),

      // MACD
      macd: this.calculateMACD(candles),

      // ... other features
    };
  }

  private rollingStd(candles: Candle[], window: number): number {
    // Implementation in TypeScript
  }

  private calculateRSI(candles: Candle[], period: number): number {
    // Implementation in TypeScript
  }

  private calculateMACD(candles: Candle[]): MACDResult {
    // Implementation in TypeScript
  }
}
```

---

## Benefits of This Architecture

### ✅ Single Source of Truth

- All data flows through NestJS
- Feature engineering logic is TypeScript (reusable)
- No duplicate code between training and inference

### ✅ Type Safety

- Data contracts enforced via `@repo/schema`
- TypeScript catches errors at compile time
- Python receives well-structured CSV/JSON

### ✅ Monorepo Integration

- Uses `@repo/market-sdk` for all market data
- Uses `@repo/database` for all persistence
- Uses `@repo/schema` for all types

### ✅ Separation of Concerns

- NestJS: Data orchestration, APIs, infrastructure
- Python: Pure ML training and export
- Clear boundaries, minimal coupling

### ✅ Scalability

- Can move Python training to separate worker nodes
- Can cache training data
- Can version models via MongoDB metadata

---

## Implementation Plan

### Phase 1: NestJS Data Infrastructure ✅

1. DataCollectionService (uses @repo/market-sdk)
2. FeatureEngineeringService (TypeScript implementation)
3. TrainingDataService (export to CSV)

### Phase 2: Python Training Scripts 🔄

1. Minimal requirements.txt (NO db, NO api)
2. CLI-based training scripts
3. ONNX export utilities

### Phase 3: NestJS Training Orchestration 🔄

1. ModelTrainingService (spawn Python process)
2. Training REST endpoints
3. Model versioning in MongoDB

### Phase 4: Production Inference ⏳

1. ModelLoaderService (ONNX Runtime)
2. SignalEngineService (pure TypeScript)
3. Integration with PolicyEngine

---

## Key Takeaway

**NestJS is the brain. Python is just a specialized worker for training.**

All intelligence, all data, all orchestration happens in TypeScript. Python is a black box that receives CSV and returns ONNX files.

This is cleaner, more maintainable, and fully aligned with the monorepo philosophy.
