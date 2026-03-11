# Training Pipeline Architecture

> **Comprehensive training infrastructure for 5-tier hierarchical prediction models with CPCV validation.**

---

## Overview

The training pipeline uses a **standard Python pipeline** (no Kedro required) and implements:
- **CPCV (Combinatorial Purged Cross-Validation)** for robust model evaluation
- **Multi-horizon label generation** for hierarchical predictions
- **Direct Redis writes** for the online feature store (no Feast)
- **MLflow model registry** with versioning and rollback
- **ONNX export** for production inference (PyTorch models only; LightGBM uses native inference)

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING PIPELINE                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. DATA EXTRACTION                                        │  │
│  │    QuestDB → Raw OHLCV + OI → Pandas DataFrame           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. FEATURE ENGINEERING                                    │  │
│  │    Raw Data → 100+ Features → Redis Feature Store        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. LABEL GENERATION                                       │  │
│  │    Multi-horizon labels (H1-H6) + Purging                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. CPCV SPLITTING                                         │  │
│  │    Train/Val/Test with purge + embargo                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. MODEL TRAINING                                         │  │
│  │    Tier 0-3 models + Meta-Learner (Tier 4)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. VALIDATION & METRICS                                   │  │
│  │    AUC, Sharpe, Accuracy per horizon                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 7. ONNX EXPORT & REGISTRY                                 │  │
│  │    Export → Validate → Register → Deploy                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. CPCV Implementation

### What is CPCV?

**Combinatorial Purged Cross-Validation** addresses two critical issues in financial ML:

1. **Information Leakage**: Labels depend on future prices, so we must remove ("purge") training samples whose label periods overlap with test periods.

2. **Serial Correlation**: Adjacent samples are correlated, so we add an "embargo" buffer after test periods.

### Implementation

```python
import numpy as np
import pandas as pd
from typing import Generator, Tuple
from itertools import combinations

class CombinatorialPurgedKFold:
    """
    Combinatorial Purged K-Fold Cross-Validation.
    
    Based on Marcos López de Prado's "Advances in Financial ML".
    """
    
    def __init__(
        self,
        n_splits: int = 5,
        n_test_splits: int = 2,
        purge_gap: int = 60,    # Bars to purge (1 hour for 1-min data)
        embargo_gap: int = 30   # Bars to embargo (30 min)
    ):
        self.n_splits = n_splits
        self.n_test_splits = n_test_splits
        self.purge_gap = purge_gap
        self.embargo_gap = embargo_gap
    
    def split(
        self,
        X: pd.DataFrame,
        y: pd.Series = None,
        timestamps: pd.Series = None
    ) -> Generator[Tuple[np.ndarray, np.ndarray], None, None]:
        """
        Generate train/test indices with purging and embargo.
        
        Yields:
            train_indices, test_indices for each fold
        """
        n_samples = len(X)
        indices = np.arange(n_samples)
        
        # Split into n_splits sequential groups
        group_size = n_samples // self.n_splits
        groups = [
            indices[i * group_size:(i + 1) * group_size]
            for i in range(self.n_splits)
        ]
        
        # Handle remainder
        if n_samples % self.n_splits:
            groups[-1] = np.concatenate([
                groups[-1], 
                indices[self.n_splits * group_size:]
            ])
        
        # Generate all combinations of test groups
        for test_group_indices in combinations(
            range(self.n_splits), self.n_test_splits
        ):
            test_indices = np.concatenate([
                groups[i] for i in test_group_indices
            ])
            
            train_indices = []
            for i in range(self.n_splits):
                if i not in test_group_indices:
                    group = groups[i]
                    
                    # Apply purging: remove samples near test boundaries
                    for test_i in test_group_indices:
                        test_start = groups[test_i][0]
                        test_end = groups[test_i][-1]
                        
                        # Purge before test
                        purge_start = max(0, test_start - self.purge_gap)
                        # Embargo after test
                        embargo_end = min(n_samples, test_end + self.embargo_gap)
                        
                        # Remove purged and embargoed samples
                        group = group[
                            (group < purge_start) | (group > embargo_end)
                        ]
                    
                    train_indices.append(group)
            
            train_indices = np.concatenate(train_indices) if train_indices else np.array([])
            
            yield np.sort(train_indices), np.sort(test_indices)
    
    def get_n_splits(self) -> int:
        """Number of splits generated."""
        from math import comb
        return comb(self.n_splits, self.n_test_splits)


# Usage example
def train_with_cpcv(X, y, timestamps, model_class, model_params):
    """
    Train model using CPCV and return performance distribution.
    """
    cv = CombinatorialPurgedKFold(
        n_splits=5,
        n_test_splits=2,
        purge_gap=60,
        embargo_gap=30
    )
    
    results = []
    models = []
    
    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y, timestamps)):
        print(f"Fold {fold + 1}/{cv.get_n_splits()}")
        print(f"  Train: {len(train_idx)} samples")
        print(f"  Test:  {len(test_idx)} samples")
        
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        # Train model
        model = model_class(**model_params)
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)
        
        from sklearn.metrics import accuracy_score, roc_auc_score
        
        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
        
        results.append({
            'fold': fold,
            'accuracy': acc,
            'auc': auc,
            'train_size': len(train_idx),
            'test_size': len(test_idx)
        })
        
        models.append(model)
    
    return pd.DataFrame(results), models
```

---

## 2. Multi-Horizon Label Generation

```python
import pandas as pd
import numpy as np
from typing import List, Dict

class MultiHorizonLabeler:
    """
    Generate labels for multiple prediction horizons.
    
    Each horizon uses dynamic thresholds based on typical move sizes.
    """
    
    HORIZONS = {
        'H1': {'seconds': 10, 'name': '10s'},
        'H2': {'seconds': 60, 'name': '1min'},
        'H3': {'seconds': 300, 'name': '5min'},
        'H4': {'seconds': 900, 'name': '15min'},
        'H5': {'seconds': 3600, 'name': '1hr'},
        'H6': {'seconds': 21600, 'name': 'EOD'}  # 6 hours ≈ trading session
    }
    
    def __init__(
        self,
        horizons: List[str] = None,
        base_threshold: float = 0.001,
        n_classes: int = 3
    ):
        self.horizons = horizons or list(self.HORIZONS.keys())
        self.base_threshold = base_threshold
        self.n_classes = n_classes
    
    def generate_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate multi-horizon labels.
        
        Args:
            df: DataFrame with 'close' column and datetime index
        
        Returns:
            DataFrame with added label columns
        """
        result = df.copy()
        
        # Determine data frequency
        freq_seconds = (df.index[1] - df.index[0]).total_seconds()
        
        for horizon in self.horizons:
            config = self.HORIZONS[horizon]
            periods = int(config['seconds'] / freq_seconds)
            
            if periods < 1:
                periods = 1
            
            # Forward returns
            result[f'return_{horizon}'] = (
                df['close'].shift(-periods) / df['close'] - 1
            )
            
            # Dynamic threshold (scales with sqrt of time)
            threshold = self.base_threshold * np.sqrt(periods)
            
            # Classification labels
            if self.n_classes == 3:
                result[f'label_{horizon}'] = np.select(
                    [
                        result[f'return_{horizon}'] < -threshold,
                        result[f'return_{horizon}'] > threshold
                    ],
                    [0, 2],  # DOWN, UP
                    default=1  # NEUTRAL
                )
            elif self.n_classes == 2:
                result[f'label_{horizon}'] = (
                    result[f'return_{horizon}'] > 0
                ).astype(int)
            
            # Also store threshold for reference
            result[f'threshold_{horizon}'] = threshold
        
        return result
    
    def compute_statistics(self, df: pd.DataFrame) -> Dict:
        """Compute label distribution statistics."""
        stats = {}
        
        for horizon in self.horizons:
            label_col = f'label_{horizon}'
            if label_col in df.columns:
                counts = df[label_col].value_counts(normalize=True)
                stats[horizon] = {
                    'down_pct': counts.get(0, 0) * 100,
                    'neutral_pct': counts.get(1, 0) * 100,
                    'up_pct': counts.get(2, 0) * 100,
                    'return_mean': df[f'return_{horizon}'].mean() * 100,
                    'return_std': df[f'return_{horizon}'].std() * 100
                }
        
        return stats


# Usage
labeler = MultiHorizonLabeler()
df_labeled = labeler.generate_labels(df)
stats = labeler.compute_statistics(df_labeled)

print("Label Distribution:")
for horizon, s in stats.items():
    print(f"  {horizon}: DOWN={s['down_pct']:.1f}% | NEUTRAL={s['neutral_pct']:.1f}% | UP={s['up_pct']:.1f}%")
```

---

## 3. Feature Store Integration

### Feast Configuration

```python
# feature_repo/feature_store.yaml
project: quantum_trading
registry: registry.db
provider: local
online_store:
  type: redis
  connection_string: redis://localhost:6379
offline_store:
  type: file
entity_key_serialization_version: 2
```

### Feature Definitions

```python
# feature_repo/features.py
from datetime import timedelta
from feast import Entity, Feature, FeatureView, FileSource, ValueType
from feast.types import Float32, Int64

# Entity
nifty = Entity(
    name="nifty_timestamp",
    join_keys=["timestamp"],
    value_type=ValueType.INT64
)

# Source
nifty_source = FileSource(
    path="data/nifty_features.parquet",
    timestamp_field="timestamp"
)

# Feature View
nifty_features = FeatureView(
    name="nifty_trading_features",
    entities=[nifty],
    ttl=timedelta(hours=24),
    schema=[
        # Price Action
        Feature(name="return_1m", dtype=Float32),
        Feature(name="return_5m", dtype=Float32),
        Feature(name="return_15m", dtype=Float32),
        Feature(name="high_low_range", dtype=Float32),
        
        # Technical Indicators
        Feature(name="rsi_14", dtype=Float32),
        Feature(name="macd", dtype=Float32),
        Feature(name="macd_signal", dtype=Float32),
        Feature(name="bb_width", dtype=Float32),
        Feature(name="atr_percent", dtype=Float32),
        
        # Volume
        Feature(name="volume_ratio", dtype=Float32),
        Feature(name="vwap_distance", dtype=Float32),
        
        # Options
        Feature(name="atm_iv", dtype=Float32),
        Feature(name="pcr_oi", dtype=Float32),
        Feature(name="iv_skew", dtype=Float32),
    ],
    online=True,
    source=nifty_source
)
```

### Feature Retrieval

```python
from feast import FeatureStore
from datetime import datetime
import pandas as pd

# Initialize store
store = FeatureStore(repo_path="feature_repo/")

# Training: Get historical features (point-in-time correct)
entity_df = pd.DataFrame({
    "timestamp": training_timestamps,
})

training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "nifty_trading_features:rsi_14",
        "nifty_trading_features:macd",
        "nifty_trading_features:atm_iv",
        # ... all features
    ]
).to_df()

# Inference: Get online features (latest values)
online_features = store.get_online_features(
    entity_rows=[{"timestamp": int(datetime.now().timestamp())}],
    features=[
        "nifty_trading_features:rsi_14",
        "nifty_trading_features:macd",
        "nifty_trading_features:atm_iv",
    ]
).to_dict()
```

---

## 4. Kedro Pipeline Definition

```python
# src/training_pipeline/pipelines/training/pipeline.py
from kedro.pipeline import Pipeline, node
from .nodes import (
    extract_data,
    compute_features,
    generate_labels,
    split_data_cpcv,
    train_lightgbm,
    train_tft,
    train_mamba,
    train_meta_learner,
    validate_models,
    export_to_onnx,
    register_models
)

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline([
        # 1. Data Extraction
        node(
            func=extract_data,
            inputs=["params:data_config"],
            outputs="raw_data",
            name="extract_data"
        ),
        
        # 2. Feature Engineering
        node(
            func=compute_features,
            inputs=["raw_data", "params:feature_config"],
            outputs="feature_data",
            name="compute_features"
        ),
        
        # 3. Label Generation
        node(
            func=generate_labels,
            inputs=["feature_data", "params:label_config"],
            outputs="labeled_data",
            name="generate_labels"
        ),
        
        # 4. CPCV Split
        node(
            func=split_data_cpcv,
            inputs=["labeled_data", "params:cpcv_config"],
            outputs="data_splits",
            name="split_data_cpcv"
        ),
        
        # 5. Train Models (parallel)
        node(
            func=train_lightgbm,
            inputs=["data_splits", "params:lgb_config"],
            outputs="lgb_models",
            name="train_lightgbm"
        ),
        node(
            func=train_tft,
            inputs=["data_splits", "params:tft_config"],
            outputs="tft_models",
            name="train_tft"
        ),
        node(
            func=train_mamba,
            inputs=["data_splits", "params:mamba_config"],
            outputs="mamba_models",
            name="train_mamba"
        ),
        
        # 6. Train Meta-Learner
        node(
            func=train_meta_learner,
            inputs=["lgb_models", "tft_models", "mamba_models", "data_splits"],
            outputs="meta_learner",
            name="train_meta_learner"
        ),
        
        # 7. Validation
        node(
            func=validate_models,
            inputs=["lgb_models", "tft_models", "mamba_models", "meta_learner", "data_splits"],
            outputs="validation_report",
            name="validate_models"
        ),
        
        # 8. Export to ONNX
        node(
            func=export_to_onnx,
            inputs=["lgb_models", "tft_models", "mamba_models", "meta_learner"],
            outputs="onnx_models",
            name="export_to_onnx"
        ),
        
        # 9. Register Models
        node(
            func=register_models,
            inputs=["onnx_models", "validation_report"],
            outputs="model_registry_entries",
            name="register_models"
        )
    ])
```

### Parameters Configuration

```yaml
# conf/base/parameters.yml
data_config:
  questdb_host: localhost
  questdb_port: 9000
  start_date: "2022-01-01"
  end_date: "2026-01-17"
  symbols:
    - NIFTY
    - BANKNIFTY

feature_config:
  technical_indicators:
    - rsi_14
    - macd
    - bb_width
    - atr_percent
  lookback_periods:
    short: 14
    medium: 50
    long: 200

label_config:
  horizons: [10, 60, 300, 900, 3600]
  base_threshold: 0.001
  n_classes: 3

cpcv_config:
  n_splits: 5
  n_test_splits: 2
  purge_gap: 60
  embargo_gap: 30

lgb_config:
  objective: multiclass
  num_class: 3
  num_leaves: 64
  learning_rate: 0.05
  n_estimators: 1000
  early_stopping_rounds: 50

tft_config:
  hidden_size: 128
  lstm_layers: 2
  attention_heads: 4
  lookback: 120
  horizons: [1, 5, 15, 60]
  batch_size: 64
  epochs: 100

mamba_config:
  d_model: 256
  d_state: 16
  n_layers: 6
  batch_size: 32
  epochs: 100
```

---

## 5. Model Registry

```python
import mlflow
from datetime import datetime
import json

class ModelRegistry:
    """
    Model registry with versioning, metrics, and deployment tracking.
    """
    
    def __init__(self, tracking_uri: str = "mlruns"):
        mlflow.set_tracking_uri(tracking_uri)
    
    def register_model(
        self,
        model_name: str,
        model_path: str,
        metrics: dict,
        params: dict,
        tags: dict = None
    ) -> str:
        """
        Register a model with metrics and metadata.
        
        Returns:
            run_id: MLflow run ID
        """
        with mlflow.start_run() as run:
            # Log parameters
            mlflow.log_params(params)
            
            # Log metrics
            for horizon, horizon_metrics in metrics.items():
                for metric_name, value in horizon_metrics.items():
                    mlflow.log_metric(f"{horizon}_{metric_name}", value)
            
            # Log model
            mlflow.log_artifact(model_path)
            
            # Register model
            mlflow.register_model(
                f"runs:/{run.info.run_id}/{model_path}",
                model_name
            )
            
            # Tags
            if tags:
                for key, value in tags.items():
                    mlflow.set_tag(key, value)
            
            return run.info.run_id
    
    def get_latest_model(self, model_name: str, stage: str = "Production"):
        """Get the latest production model."""
        client = mlflow.tracking.MlflowClient()
        
        latest = client.get_latest_versions(model_name, stages=[stage])
        if latest:
            return latest[0]
        return None
    
    def promote_model(
        self, 
        model_name: str, 
        version: int, 
        stage: str = "Production"
    ):
        """Promote a model version to a stage."""
        client = mlflow.tracking.MlflowClient()
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage
        )


# Usage
registry = ModelRegistry()

# Register after training
run_id = registry.register_model(
    model_name="lightgbm_macro",
    model_path="models/lightgbm_macro.onnx",
    metrics={
        'H1': {'auc': 0.69, 'accuracy': 0.62},
        'H3': {'auc': 0.71, 'accuracy': 0.64}
    },
    params={'num_leaves': 64, 'learning_rate': 0.05},
    tags={'horizon': 'multi', 'version': '2.0.0'}
)

# Promote to production
registry.promote_model("lightgbm_macro", version=5, stage="Production")
```

---

## 6. Running the Pipeline

```bash
# Install dependencies
pip install kedro mlflow feast lightgbm torch onnx

# Run full pipeline
kedro run

# Run specific nodes
kedro run --node=train_lightgbm
kedro run --node=train_tft

# Run with parameters override
kedro run --params="lgb_config.learning_rate=0.03"

# Visualize pipeline
kedro viz
```

---

## Scheduling

```python
# ecosystem.config.js (PM2)
module.exports = {
  apps: [
    {
      name: 'training-pipeline',
      script: 'kedro',
      args: 'run',
      cwd: '/path/to/training-pipeline',
      cron_restart: '0 2 * * *',  # Run at 2 AM daily
      autorestart: false,
      env: {
        PYTHONPATH: '/path/to/training-pipeline/src'
      }
    }
  ]
};
```

---

## 7. ONNX Export Pipeline

### PyTorch to ONNX

```python
import torch
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_pytorch_to_onnx(
    model: torch.nn.Module,
    model_name: str,
    input_shape: tuple,
    output_path: str,
    quantize: bool = True
) -> str:
    """Export PyTorch model to ONNX with optional quantization."""
    
    model.eval()
    dummy_input = torch.randn(*input_shape)
    
    onnx_path = f"{output_path}/{model_name}.onnx"
    
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        opset_version=17,
        do_constant_folding=True,
    )
    
    # Validate
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    
    # Quantize for faster inference
    if quantize:
        quantized_path = f"{output_path}/{model_name}_quantized.onnx"
        quantize_dynamic(onnx_path, quantized_path, weight_type=QuantType.QUInt8)
        return quantized_path
    
    return onnx_path
```

### LightGBM to ONNX

```python
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def export_lightgbm_to_onnx(
    model,
    model_name: str,
    num_features: int,
    output_path: str
) -> str:
    """Export LightGBM model to ONNX."""
    
    initial_type = [('input', FloatTensorType([None, num_features]))]
    
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=17
    )
    
    onnx_path = f"{output_path}/{model_name}.onnx"
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    
    return onnx_path
```

---

## Related Documentation

- [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) - Complete system overview
- [TIER1_MODELS.md](./TIER1_MODELS.md) - Model specifications
- [INFERENCE_PIPELINE.md](./INFERENCE_PIPELINE.md) - **ONNX Runtime in NestJS** (algo-worker)
- [FEATURE_STORE.md](./FEATURE_STORE.md) - Feast + Redis integration
