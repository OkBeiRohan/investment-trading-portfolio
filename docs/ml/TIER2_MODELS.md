# TIER 2: Intraday Navigator — Multi-Horizon Direction Prediction

> **Core operational tier. Predicts 5m/15m/30m directional probabilities every 60 seconds using 4 years of 1-minute data with 117 features and a two-model ensemble (LightGBM + Mamba).**

**Last Updated**: March 13, 2026
**Tier**: 2 — Intraday Navigator
**Runs**: Every 60 seconds during market hours (09:16 – 15:25 IST)
**Data Depth**: 4 years of 1-minute OHLCV + options + order flow

---

## Purpose

Tier 2 is the **workhorse** of the system. While Tier 0 and 1 run once at market open to set context, Tier 2 runs every 60 seconds to predict the near-term price direction across multiple horizons. Its outputs directly drive trade entry decisions.

### What Tier 2 Predicts

| Horizon        | Target                  | Use Case                | Resolution       |
| -------------- | ----------------------- | ----------------------- | ---------------- |
| **H1: 5 min**  | P(up), P(down), P(flat) | Entry timing for scalps | ±0.22% threshold |
| **H2: 15 min** | P(up), P(down), P(flat) | Position management     | ±0.39% threshold |
| **H3: 30 min** | P(up), P(down), P(flat) | Strategy confirmation   | ±0.55% threshold |

**Threshold formula**: Dynamic Triple-Barrier Method (Lopez de Prado, 2018). Upper/Lower barriers scaled by rolling realized intraday volatility, Vertical barrier = horizon. Replaces the previous static `0.001 × √(horizon)` which assumed GBM scaling and ignored U-shaped intraday volatility seasonality.

---

## Architecture: Two-Model Ensemble (LightGBM + Mamba)

```
┌──────────────────────────────────────────────────────────────────────┐
│ TIER 2: INTRADAY NAVIGATOR (runs every 60 seconds)                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ FEATURE INPUT: 117 features from compute-engine (Rust, <5ms)    │ │
│  │ + Tier 0 context (cached) + Tier 1 regime (cached)              │ │
│  └────────────────────┬────────────────────────────────────────────┘ │
│                       │                                              │
│            ┌──────────┴──────────┐                                   │
│            ▼                     ▼                                   │
│     ┌──────────────┐      ┌──────────────┐                           │
│     │ LightGBM     │      │ Mamba        │                           │
│     │              │      │ (State Space │                           │
│     │ 117          │      │  Model)      │                           │
│     │ features     │      │              │                           │
│     │              │      │ 117×120      │                           │
│     │ Point        │      │ sequence     │                           │
│     │ features     │      │              │                           │
│     │              │      │              │                           │
│     │ ~20ms        │      │ ~25ms        │                           │
│     └──────┬───────┘      └──────┬───────┘                           │
│            │                     │                                   │
│            └──────────┬──────────┘                                   │
│                       ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ PARALLEL OUTPUT (all run in Worker Threads simultaneously)      │ │
│  │                                                                 │ │
│  │ LightGBM:  P(up)=0.62, P(flat)=0.25, P(down)=0.13  [5m/15m/30m] │ │
│  │ Mamba:     P(up)=0.58, P(flat)=0.30, P(down)=0.12  [5m/15m/30m] │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                       │                                              │
│                       ▼                                              │
│               Tier 4 Meta-Learner                                    │
│               (fuses with Tier 0/1/3 for final signal)               │
└──────────────────────────────────────────────────────────────────────┘
```

### Why Not TFT?

The Temporal Fusion Transformer was evaluated but **deprecated in favor of Mamba** for these reasons:

- **Redundant input**: Both TFT and Mamba process the same `[120, 117]` sequence for the same 3-class × 3-horizon task
- **Higher latency**: TFT ~35ms vs Mamba ~25ms (40% slower)
- **Higher memory**: TFT ~200MB vs Mamba ~150MB
- **Research evidence**: CMDMamba (2025) achieved 10.4% better accuracy than transformer baselines; Mamba outperforms Reformer across all scenarios (2025)
- **Quadratic complexity**: TFT's attention is O(n²) vs Mamba's O(n), critical for 120-step sequences

If quantile forecasts are needed (TFT's unique advantage), add quantile output heads to Mamba rather than running a separate model.

---

## Feature Set (117 Features)

### Category Breakdown

| Category            | Count | Source                     | Key Features                                                                         |
| ------------------- | ----- | -------------------------- | ------------------------------------------------------------------------------------ |
| **Index Breadth**   | 8     | compute-engine             | `pct_above_vwap`, `breadth_thrust`, `advance_decline`, `new_highs_lows_ratio`        |
| **NIFTY Future**    | 12    | compute-engine             | `fut_rsi_14`, `fut_macd`, `fut_atr_pct`, `fut_return_1m/5m/15m`, `fut_oi_change_pct` |
| **Options**         | 14    | compute-engine             | `atm_iv`, `pcr_oi`, `pcr_volume`, `iv_skew`, `total_gex`, `charm`, `vanna`           |
| **Volatility**      | 10    | compute-engine + QuestDB   | `india_vix`, `realized_vol_5m/15m`, `iv_rv_ratio`, `vol_of_vol`, `vix_percentile`    |
| **Order Flow**      | 8     | compute-engine             | `ofi_1s/5s/30s`, `depth_imbalance_5/10`, `trade_imbalance`, `sweep_detector`         |
| **Price Structure** | 8     | compute-engine             | `return_1m/5m/15m/1h`, `gap_open`, `range_position`, `body_size`                     |
| **Momentum**        | 8     | compute-engine             | `rsi_5/14`, `macd_histogram`, `adx_14`, `cci_20`, `willr_14`                         |
| **Time Context**    | 13    | compute-engine             | `minutes_from_open`, `session_phase`, `is_expiry_day`, sin/cos encodings             |
| **Regime Context**  | 4     | Tier 1 (Redis)             | `regime_state` (one-hot: 4 features)                                                 |
| **Global Macro**    | 12    | Yahoo Finance (live 1-min) | `es_return_1m/5m`, `nq_return`, `brent_return`, `gold_return`, `dxy_change`          |

### Data-Bound Compliance Warning

> **Train/serve skew risk**: Not all 117 features have 4 years of history.

| Feature Group | History Available | Training Handling |
|---------------|-------------------|-------------------|
| **NIFTY Future, Price, Momentum, MA, Bollinger** (~50 features) | 4 years | Full historical training |
| **Options** (14 features: IV, PCR, GEX, skew) | ~3 years (F&O data from Upstox) | Train from 2023+ |
| **Order Flow** (8 features: OFI, depth imbalance, sweep) | **0 years** (live LOB only) | **Excluded from training until ≥6 months archived** |
| **Regime Context** (4 features from Tier 1) | System-live only | Inference-time enrichment only |
| **Global Macro** (12 features) | ~4 years (Yahoo Finance) | Full historical training |

**Protocol**:
- LightGBM trains on the ~95 features with ≥3 years of history. Order flow features are set to NaN and handled by LightGBM's native missing-value support.
- Mamba trains on the same ~95 features. Order flow features are zero-filled for historical data and only contribute once live LOB collection begins.
- Once ≥6 months of LOB data is archived, retrain with order flow features enabled. This is the same phased approach used in Tier 3.

### Label Generation

```python
def generate_triple_barrier_labels(df: pd.DataFrame, horizons: list = [5, 15, 30]) -> pd.DataFrame:
    """
    Generate labels using the Triple-Barrier Method (Lopez de Prado).
    Replaces static sqrt(t) thresholds with dynamic volatility-based barriers.
    
    Barriers:
    1. Upper Barrier (Take Profit): dynamic based on rolling realized volatility
    2. Lower Barrier (Stop Loss): dynamic based on rolling realized volatility
    3. Vertical Barrier (Time Stop): horizon limit
    """
    result = df.copy()
    
    # Calculate rolling 20-period realized volatility (intraday)
    # This accounts for the U-shaped intraday volatility profile
    result['rolling_vol'] = df['close'].pct_change().rolling(20).std()
    
    for horizon in horizons:
        # Dynamic barrier width based on recent volatility, scaled by sqrt(horizon)
        # Multiplier 'k' can be tuned (e.g., k=1.5)
        k = 1.5
        barrier_width = result['rolling_vol'] * np.sqrt(horizon) * k
        
        labels = pd.Series(1, index=df.index) # Default NEUTRAL=1
        
        for i in range(len(df) - horizon):
            current_price = df['close'].iloc[i]
            upper_barrier = current_price * (1 + barrier_width.iloc[i])
            lower_barrier = current_price * (1 - barrier_width.iloc[i])
            
            # Look ahead up to 'horizon' periods (Vertical Barrier)
            path = df['close'].iloc[i+1 : i+1+horizon]
            
            # Check which barrier is hit first
            hit_upper = path[path >= upper_barrier].index.min()
            hit_lower = path[path <= lower_barrier].index.min()
            
            if pd.isna(hit_upper) and pd.isna(hit_lower):
                labels.iloc[i] = 1  # NEUTRAL (Vertical barrier hit first)
            elif pd.isna(hit_lower) or (not pd.isna(hit_upper) and hit_upper < hit_lower):
                labels.iloc[i] = 2  # UP (Upper barrier hit first)
            else:
                labels.iloc[i] = 0  # DOWN (Lower barrier hit first)
                
        result[f'label_{horizon}m'] = labels

    return result
```

---

## Model 1: LightGBM (Gradient Boosting)

### Why LightGBM?

- **Fast inference**: ~20ms for 117 features — fastest of the two
- **Handles heterogeneous features**: Mix of continuous, categorical, ordinal natively
- **Feature importance**: Built-in gain/split importance + SHAP for SEBI compliance
- **Robust to outliers**: Tree-based, no need for feature scaling
- **Production-proven**: Used by top quant desks globally

### Architecture

```python
import lightgbm as lgb

LIGHTGBM_CONFIG = {
    # Model
    'objective': 'multiclass',
    'num_class': 3,
    'metric': 'multi_logloss',
    'boosting_type': 'gbdt',

    # Tree structure
    'num_leaves': 64,
    'max_depth': 8,
    'min_child_samples': 50,

    # Regularization
    'learning_rate': 0.05,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'lambda_l1': 0.1,
    'lambda_l2': 0.1,

    # Training
    'n_estimators': 1000,
    'early_stopping_rounds': 50,
    'verbose': -1,

    # Anti-overfit for financial data
    'min_gain_to_split': 0.01,
    'max_bin': 255,
    'is_unbalance': True,  # Handle class imbalance
}

def train_lightgbm_tier2(X, y, timestamps):
    """Train with CPCV validation."""
    from cpcv import CombinatorialPurgedKFold

    cv = CombinatorialPurgedKFold(
        n_splits=5, n_test_splits=2,
        purge_gap=60,   # 1 hour purge (60 × 1-min bars)
        embargo_gap=30  # 30 min embargo
    )

    models = []
    oof_predictions = np.zeros((len(X), 3))

    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y, timestamps)):
        train_data = lgb.Dataset(X.iloc[train_idx], y.iloc[train_idx])
        valid_data = lgb.Dataset(X.iloc[test_idx], y.iloc[test_idx])

        model = lgb.train(
            LIGHTGBM_CONFIG, train_data,
            valid_sets=[valid_data],
            callbacks=[lgb.early_stopping(50)]
        )

        oof_predictions[test_idx] = model.predict(X.iloc[test_idx])
        models.append(model)

    return models, oof_predictions
```

### Input / Output

|                 | Specification                                                           |
| --------------- | ----------------------------------------------------------------------- |
| **Input**       | `Float32Array[117]` — single feature vector (current minute)            |
| **Output**      | `Float32Array[9]` — P(down), P(flat), P(up) × 3 horizons (5m, 15m, 30m) |
| **Inference**   | ~20ms (CPU)                                                             |
| **MLflow Log**  | `mlflow.lightgbm.log_model()` with `registered_model_name`              |

---

## Model 2: Temporal Fusion Transformer (TFT)

### Why TFT?

- **Multi-horizon quantile forecasts**: Produces P10/P50/P90 for each horizon, not just point estimates
- **Interpretable attention**: Variable selection network shows which features drove the prediction (SHAP alternative)
- **Known vs unknown future**: Explicitly separates features we know in advance (time, DTE) from those we don't (price, volume)
- **Static covariates**: Can condition on Tier 1 regime as a static input

### Architecture

```python
class TFTIntraday(nn.Module):
    """
    TFT for multi-horizon intraday forecasting.
    Input: 120-step sequence of 117 features (2 hours of 1-min data)
    Output: Quantile forecasts for 5m/15m/30m horizons
    """

    def __init__(self):
        super().__init__()

        # Feature configuration
        self.static_features = 4     # regime_state (one-hot)
        self.known_features = 8      # time_sin, time_cos, session_phase, DTE, etc.
        self.unknown_features = 68   # price, volume, OI, Greeks, indicators, etc.

        self.hidden_size = 128
        self.horizons = [5, 15, 30]
        self.quantiles = [0.1, 0.5, 0.9]

        # Variable Selection Networks (one per feature group)
        self.static_vsn = VariableSelectionNetwork(self.static_features, self.hidden_size)
        self.encoder_vsn = VariableSelectionNetwork(
            self.known_features + self.unknown_features, self.hidden_size
        )
        self.decoder_vsn = VariableSelectionNetwork(self.known_features, self.hidden_size)

        # Encoder LSTM
        self.encoder = nn.LSTM(self.hidden_size, self.hidden_size, 2,
                               batch_first=True, dropout=0.1)

        # Decoder LSTM
        self.decoder = nn.LSTM(self.hidden_size, self.hidden_size, 2,
                               batch_first=True, dropout=0.1)

        # Interpretable multi-head attention
        self.attention = InterpretableMultiHeadAttention(self.hidden_size, 4)

        # Gated Residual Network
        self.grn = GatedResidualNetwork(self.hidden_size, dropout=0.1)

        # Quantile output heads
        self.output_heads = nn.ModuleList([
            nn.Linear(self.hidden_size, len(self.horizons))
            for _ in self.quantiles
        ])

    def forward(self, static, encoder_input, decoder_input):
        """
        Args:
            static: [B, 4] — regime one-hot
            encoder_input: [B, 120, 76] — 2 hours of known + unknown features
            decoder_input: [B, 30, 8] — future known features (time encoding)
        Returns:
            quantiles: [B, 3_horizons, 3_quantiles]
            attention_weights: for interpretability
        """
        # Static context
        ctx = self.static_vsn(static)

        # Encode historical
        enc = self.encoder_vsn(encoder_input)
        enc_out, (h, c) = self.encoder(enc)

        # Decode future
        dec = self.decoder_vsn(decoder_input)
        dec_out, _ = self.decoder(dec, (h, c))

        # Attention
        combined = torch.cat([enc_out, dec_out], dim=1)
        attn_out, weights = self.attention(combined, combined, combined)

        # GRN + output
        output = self.grn(attn_out[:, -len(self.horizons):, :])

        quantiles = torch.stack([head(output) for head in self.output_heads], dim=-1)
        return quantiles, {'attention': weights}
```

### Input / Output

|                 | Specification                                                     |
| --------------- | ----------------------------------------------------------------- |
| **Input**       | `static: [B, 4]`, `encoder: [B, 120, 76]`, `decoder: [B, 30, 8]`  |
| **Output**      | `[B, 3, 3]` — quantiles [P10, P50, P90] × horizons [5m, 15m, 30m] |
| **Inference**   | ~35ms (GPU)                                                       |
| **MLflow Log**  | `mlflow.pytorch.log_model()` with `registered_model_name`          |

---

## Model 3: Mamba (State Space Model)

### Why Mamba?

- **O(n) complexity**: Linear in sequence length (vs O(n²) for Transformers), critical for long 120-step sequences
- **Selective state transitions**: Input-dependent gating learns which historical states matter
- **Long-range dependencies**: SSM formulation naturally captures distant correlations
- **Efficient inference**: No KV cache needed (unlike Transformers), constant memory per step

### Architecture

```python
class MambaIntraday(nn.Module):
    """
    Mamba-based intraday direction predictor.
    Input: 120-step sequence of 117 features
    Output: P(up), P(down), P(flat) for 5m/15m/30m horizons
    """

    def __init__(
        self,
        input_dim: int = 117,
        d_model: int = 256,
        d_state: int = 16,
        n_layers: int = 6,
        n_horizons: int = 3,
        n_classes: int = 3
    ):
        super().__init__()

        self.embedding = nn.Linear(input_dim, d_model)

        self.layers = nn.ModuleList([
            MambaBlock(d_model, d_state, d_conv=4, expand=2)
            for _ in range(n_layers)
        ])

        self.norm = nn.LayerNorm(d_model)

        # Per-horizon classification head
        self.heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, d_model // 2),
                nn.GELU(),
                nn.Dropout(0.1),
                nn.Linear(d_model // 2, n_classes)
            )
            for _ in range(n_horizons)
        ])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, 120, 117] — 2-hour feature sequence
        Returns:
            logits: [B, 3_horizons, 3_classes]
        """
        x = self.embedding(x)

        for layer in self.layers:
            x = x + layer(x)

        x = self.norm(x)
        last = x[:, -1, :]  # Use last timestep

        # Each head predicts for one horizon
        logits = torch.stack([head(last) for head in self.heads], dim=1)
        return logits  # [B, 3, 3]
```

### Input / Output

|                 | Specification                                                   |
| --------------- | --------------------------------------------------------------- |
| **Input**       | `[B, 120, 117]` — 120 minutes × 117 features                    |
| **Output**      | `[B, 3, 3]` — P(down), P(flat), P(up) × horizons (5m, 15m, 30m) |
| **Inference**   | ~25ms (GPU)                                                     |
| **MLflow Log**  | `mlflow.pytorch.log_model()` with `registered_model_name`       |

### Mamba Model Serving

Mamba models are logged via `mlflow.pytorch.log_model()` and served through MLflow Model Serving. Since MLflow loads the native PyTorch model directly, custom CUDA kernels (selective scan) work without any conversion constraints. This eliminates the compatibility issues that previously existed with alternative export formats.

---

## Options-Specific Sub-Models

### Arbitrage-Free IV Surface Predictor (SSVI + MLP)

Predicts the implied volatility surface 5m/15m ahead while guaranteeing no static arbitrage (calendar spread or butterfly arbitrage).

| Property         | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Input**        | Current SSVI parameters [θ_t, ρ, φ] + 10 market conditions                                  |
| **Output**       | Predicted SSVI parameters for t+5m and t+15m                                               |
| **Architecture** | MLP predicting the parameter shifts. Output is constrained to SSVI arbitrage-free bounds. |
| **Latency**      | ~5ms                                                                                       |
| **Use Case**     | Price options ahead of time to identify mispriced strikes without arbitrage violations.    |

*Note: Predicting raw IV points via VAE/MLP often violates no-arbitrage conditions. By predicting SSVI (Surface Stochastic Volatility Inspired) parameters, the generated surface is arbitrage-free by construction.*

### Greeks Derivation (Analytical from SSVI)

Greeks are deterministic functions of the IV surface + spot price + time to expiry. Since we now predict SSVI parameters (which fully define the IV surface), Greeks are derived analytically:

- Delta, Gamma, Vega, Theta computed from SSVI-predicted IV at each (strike, expiry) pair
- No additional ML model needed — Greeks follow directly from the arbitrage-free SSVI surface
- Zero additional latency
- Mathematically consistent with the IV prediction (no conflicting forecasts)

This is an improvement over the previous separate LSTM Greeks forecaster, which could produce Greeks inconsistent with the predicted IV surface.

---

## Training Specification

### CPCV Validation

```python
TIER2_TRAINING_CONFIG = {
    'data_depth_years': 4,
    'resolution': '1min',
    'total_samples': '~378K rows (4yr × 252 days × 375 min/day)',

    'cpcv': {
        'n_splits': 5,
        'n_test_splits': 2,
        'purge_gap': 60,   # 1 hour between train and test
        'embargo_gap': 30, # 30 min after test
    },

    'quality_gates': {
        'min_auc_roc': 0.65,
        'min_sharpe_p5': 1.0,
        'max_overfit_ratio': 1.3,  # test_auc / train_auc > 0.77
    },

    'retraining': {
        'lightgbm': 'weekly (incremental)',
        'mamba': 'monthly (full retrain, ~3hr RTX 3050)',
    }
}
```

---

## Performance Targets

| Model              | AUC-ROC (5m) | AUC-ROC (15m) | AUC-ROC (30m) | Inference (ms) | Memory (MB) |
| ------------------ | ------------ | ------------- | ------------- | -------------- | ----------- |
| **LightGBM**       | >0.68        | >0.70         | >0.71         | ~20            | ~50         |
| **Mamba**          | >0.69        | >0.73         | >0.75         | ~25            | ~150        |
| **Ensemble (avg)** | >0.71        | >0.75         | >0.77         | ~25 (parallel) | ~200        |

---

## Related Documentation

- [TIER1_MODELS.md](./TIER1_MODELS.md) — Produces regime context for Tier 2
- [TIER3_MODELS.md](./TIER3_MODELS.md) — Microstructure (complementary to Tier 2)
- [TIER4_MODELS.md](./TIER4_MODELS.md) — Fuses Tier 2 output
- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — 60-second loop detail
- [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) — CPCV and training infrastructure
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) — All 117 feature definitions
