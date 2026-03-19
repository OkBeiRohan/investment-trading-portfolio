# AI Trading Architecture - 2026 State-of-the-Art

> **Production-grade 5-tier hierarchical ML system for NIFTY options trading using data-bound multi-horizon predictions.**

**Last Updated**: March 13, 2026
**Architecture**: 5-Tier Data-Bound Hierarchical

---

## Overview

This document describes the **5-Tier Data-Bound Hierarchical AI Architecture** for algorithmic trading on NSE NIFTY 50 and Bank NIFTY options. The system leverages 2026 state-of-the-art models including Transformers, State Space Models, and Reinforcement Learning.

### Key Innovations

1. **Data-bound model segregation**: Models are separated by the intersection of their target horizon and historical data depth
2. **Pre-market opening calibration**: Tier 0 calibrates the freeze-to-open residual using global overnight data + the 09:08 auction freeze price
3. **Regime-Conditioned Temporal Loss**: Meta-Learner prevents whipsawing during strong macro trends

```
Tier 0 (Pre-Market) → Tier 1 (Macro) → Tier 2 (Intraday) → Tier 3 (Microstructure) → Tier 4 (Meta-Learner) → Execution Layer
```

---

## Data Assets

| Data Type          | Source            | Timeframe | Resolution  |
| ------------------ | ----------------- | --------- | ----------- |
| NIFTY 50 Index     | Upstox            | 2000-2026 | Daily, 1min |
| 50 Constituents    | Upstox            | 2000-2026 | Daily, 1min |
| NIFTY Futures      | Upstox            | 2000-2026 | Daily, 1min |
| NIFTY Options      | Upstox            | 2001-2026 | Daily, 1min |
| India VIX          | Upstox            | 2014-2026 | Daily, 1min |
| Live LOB           | Upstox WS         | Real-time | Depth-30    |
| **Global Markets** | Yahoo Finance     | Varies    | 1min        |
| **News/Sentiment** | Finnhub + FinBERT | Real-time | Continuous  |

---

## Architecture Diagram

```
                        EXECUTION LAYER
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ Smart TWAP   │  │ Exit Manager │  │ Calibrated Kelly   │     │
│  │ (Slippage)   │  │              │  │ (Frac. Kelly+VIX)  │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│          TIER 4: META-LEARNER + STRATEGY & DECISION             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Contextual Meta-Learner (Attention-Based Gating)          │  │
│  │ • Regime-aware model weighting → Strike/Strategy Select   │  │
│  │ • Multi-horizon signal fusion  → Risk Manager (VaR)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│          TIER 3: MICROSTRUCTURE (Phased: Rules → MLP → LiT)     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Phase 1: OFI rules │ Phase 2: MLP │ Phase 3: LiT Trans. │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Input: Depth-30 LOB snapshots + 14-18 OFI features             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│          TIER 2: INTRADAY NAVIGATOR (5min-1hr Direction)        │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ LightGBM     │  │ Mamba (SSM)  │                             │
│  │ (117 feats)  │  │ (long-range) │                             │
│  └──────────────┘  └──────────────┘                             │
│  Input: 117 features from instrument_features table             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│          TIER 1: MACRO DIRECTOR (Regime + Volatility)           │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ HMM (4-state)│  │ PatchTST     │                             │
│  │ (regime det.)│  │ (daily trend)│                             │
│  └──────────────┘  └──────────────┘                             │
│  Input: Daily + macro features, regime labels                   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────┐
│          TIER 0: PRE-MARKET OPENING CALIBRATOR                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Calibrates freeze-to-open residual using overnight data    │  │
│  │ (S&P500, GIFT Nifty, MCX, sentiment) + 09:08 freeze price │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Input: 24 features (12 global + 8 MCX + 4 pre-market)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Horizon Prediction Strategy

### Prediction Horizons

| Horizon   | Target                | Use Case            | Primary Models           | Tier |
| --------- | --------------------- | ------------------- | ------------------------ | ---- |
| H1: 10s   | Price direction       | Execution timing    | LiT Transformer          | 3    |
| H2: 5min  | Direction + magnitude | Entry signals       | LightGBM, Mamba          | 2    |
| H3: 15min | Trend continuation    | Position management | LightGBM, Mamba          | 2    |
| H4: 30min | Trend reversal        | Strategy confirm    | LightGBM, Mamba          | 2    |
| H5: Daily | Regime + trend        | Strategy selection  | HMM (regime), PatchTST   | 1    |
| H6: Gap   | Opening calibration   | Pre-market context  | XGBoost                  | 0    |

### Label Generation

```python
import pandas as pd
import numpy as np

def generate_multi_horizon_labels(
    df: pd.DataFrame,
    horizons_minutes: list[int] = [5, 15, 30]
) -> pd.DataFrame:
    """
    Generate Triple-Barrier labels for multiple prediction horizons.
    Uses dynamic volatility-adjusted barriers (Lopez de Prado, 2018).

    Args:
        df: OHLCV DataFrame with 'close' column (1-min bars)
        horizons_minutes: Forward periods in minutes (must be >= 1 for 1-min data)

    Returns:
        DataFrame with 3-class labels per horizon
    """
    result = df.copy()
    rolling_vol = df['close'].pct_change().rolling(20).std()

    for horizon in horizons_minutes:
        k = 1.5  # Barrier width multiplier (tunable)
        barrier_width = rolling_vol * np.sqrt(horizon) * k

        fwd_return = df['close'].shift(-horizon) / df['close'] - 1
        result[f'label_{horizon}m'] = np.where(
            fwd_return < -barrier_width, 0,    # DOWN
            np.where(fwd_return > barrier_width, 2, 1)  # UP or NEUTRAL
        )

    return result

# Example usage (1-min bars, horizons in minutes)
df = pd.read_parquet('nifty_1min.parquet')
df_labeled = generate_multi_horizon_labels(df, horizons_minutes=[5, 15, 30])
print(df_labeled[['close', 'label_5m', 'label_15m', 'label_30m']].tail())
```

---

## Model Implementations

### Tier 3: LiT (Limit Order Book Transformer) — Microstructure Scalper

**Purpose**: Extract microstructure signals from Depth-30 order book data.

**Input Format**:

```python
# LOB snapshot shape: [30 levels × 4 features]
# Features: [bid_price, bid_qty, ask_price, ask_qty]
lob_snapshot = np.array([
    [19500.00, 1200, 19500.05, 800],   # Level 1
    [19499.95, 2500, 19500.10, 1500],  # Level 2
    # ... 28 more levels
])
```

**Architecture**:

```python
import torch
import torch.nn as nn

class LiTTransformer(nn.Module):
    """
    Limit Order Book Transformer for microstructure prediction.
    """
    def __init__(
        self,
        n_levels: int = 30,
        n_features: int = 4,
        patch_size: int = 3,
        d_model: int = 128,
        n_heads: int = 8,
        n_layers: int = 6,
        n_classes: int = 3
    ):
        super().__init__()

        # Patch embedding: group 3 levels into one patch
        self.n_patches = n_levels // patch_size
        self.patch_embed = nn.Linear(patch_size * n_features, d_model)

        # Positional encoding
        self.pos_embed = nn.Parameter(
            torch.randn(1, self.n_patches + 1, d_model)
        )

        # CLS token for classification
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_model))

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=0.1,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, n_layers)

        # Classification head
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(d_model // 2, n_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: LOB tensor [B, 30, 4]
        Returns:
            logits: [B, 3] for UP/NEUTRAL/DOWN
        """
        B = x.shape[0]

        # Create patches: [B, 30, 4] -> [B, 10, 12]
        x = x.reshape(B, self.n_patches, -1)

        # Embed patches
        x = self.patch_embed(x)  # [B, 10, d_model]

        # Add CLS token
        cls = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls, x], dim=1)  # [B, 11, d_model]

        # Add positional encoding
        x = x + self.pos_embed

        # Transformer
        x = self.transformer(x)

        # Classify using CLS token
        return self.classifier(x[:, 0])

# Training example
model = LiTTransformer()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
criterion = nn.CrossEntropyLoss()

for epoch in range(100):
    for lob_batch, labels in dataloader:
        logits = model(lob_batch)
        loss = criterion(logits, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

---

### Tier 2: LightGBM Intraday Navigator

**Purpose**: Primary direction predictor using 117 engineered features from `instrument_features`.

**Feature Engineering**:

```python
import pandas as pd
import numpy as np
from ta import add_all_ta_features

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute 117 trading features for LightGBM.
    See FEATURE_SPECIFICATION.md for full list.
    """
    result = df.copy()

    # === PRICE ACTION (12 features) ===
    result['return_1m'] = df['close'].pct_change(1)
    result['return_5m'] = df['close'].pct_change(5)
    result['return_15m'] = df['close'].pct_change(15)
    result['return_1h'] = df['close'].pct_change(60)
    result['high_low_range'] = (df['high'] - df['low']) / df['close']
    result['close_open_ratio'] = df['close'] / df['open']
    result['upper_shadow'] = (df['high'] - df[['open', 'close']].max(axis=1)) / df['close']
    result['lower_shadow'] = (df[['open', 'close']].min(axis=1) - df['low']) / df['close']
    result['body_size'] = abs(df['close'] - df['open']) / df['close']
    result['is_green'] = (df['close'] > df['open']).astype(int)

    # === TECHNICAL INDICATORS (15 features) ===
    result['rsi_14'] = compute_rsi(df['close'], 14)
    result['rsi_7'] = compute_rsi(df['close'], 7)
    result['macd'] = compute_macd(df['close'])['macd']
    result['macd_signal'] = compute_macd(df['close'])['signal']
    result['macd_hist'] = compute_macd(df['close'])['histogram']

    # Bollinger Bands
    bb = compute_bollinger(df['close'], 20)
    result['bb_upper'] = bb['upper']
    result['bb_lower'] = bb['lower']
    result['bb_width'] = (bb['upper'] - bb['lower']) / bb['middle']
    result['bb_pctb'] = (df['close'] - bb['lower']) / (bb['upper'] - bb['lower'])

    # ATR
    result['atr_14'] = compute_atr(df, 14)
    result['atr_percent'] = result['atr_14'] / df['close']

    # EMAs
    result['ema_12'] = df['close'].ewm(span=12).mean()
    result['ema_26'] = df['close'].ewm(span=26).mean()
    result['ema_ratio'] = result['ema_12'] / result['ema_26']

    # === VOLUME & OI (8 features) ===
    result['volume_ratio'] = df['volume'] / df['volume'].rolling(20).mean()
    result['volume_ma_ratio'] = df['volume'].rolling(5).mean() / df['volume'].rolling(20).mean()
    result['vwap'] = compute_vwap(df)
    result['vwap_distance'] = (df['close'] - result['vwap']) / df['close']

    if 'oi' in df.columns:
        result['oi_change'] = df['oi'].diff()
        result['oi_change_pct'] = df['oi'].pct_change()
        result['volume_oi_ratio'] = df['volume'] / df['oi']

    # === OPTIONS GREEKS (10 features) ===
    # These come from options chain data
    # result['atm_iv'], result['pcr_oi'], etc.

    # === TIME CONTEXT (4 features) ===
    result['hour'] = df.index.hour
    result['minute'] = df.index.minute
    result['minutes_from_open'] = (df.index.hour - 9) * 60 + df.index.minute - 15
    result['day_of_week'] = df.index.dayofweek

    return result

def compute_rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def compute_macd(series: pd.Series) -> dict:
    ema12 = series.ewm(span=12).mean()
    ema26 = series.ewm(span=26).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9).mean()
    return {'macd': macd, 'signal': signal, 'histogram': macd - signal}

def compute_bollinger(series: pd.Series, period: int) -> dict:
    middle = series.rolling(period).mean()
    std = series.rolling(period).std()
    return {'upper': middle + 2*std, 'middle': middle, 'lower': middle - 2*std}

def compute_atr(df: pd.DataFrame, period: int) -> pd.Series:
    high_low = df['high'] - df['low']
    high_close = abs(df['high'] - df['close'].shift())
    low_close = abs(df['low'] - df['close'].shift())
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.rolling(period).mean()

def compute_vwap(df: pd.DataFrame) -> pd.Series:
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    return (typical_price * df['volume']).cumsum() / df['volume'].cumsum()
```

**Training Configuration**:

```python
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit

# LightGBM parameters optimized for financial data
lgb_params = {
    'objective': 'multiclass',
    'num_class': 3,
    'metric': 'multi_logloss',
    'boosting_type': 'gbdt',
    'num_leaves': 64,
    'learning_rate': 0.05,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'min_child_samples': 50,
    'lambda_l1': 0.1,
    'lambda_l2': 0.1,
    'max_depth': 8,
    'n_estimators': 1000,
    'early_stopping_rounds': 50,
    'verbose': -1
}

# Train with CPCV
def train_lgb_cpcv(X, y, timestamps, n_splits=5):
    """Train LightGBM with Combinatorial Purged CV."""
    from cpcv import CombinatorialPurgedKFold

    cv = CombinatorialPurgedKFold(
        n_splits=n_splits,
        n_test_splits=2,
        purge_gap=60,   # 1 hour purge
        embargo_gap=30  # 30 min embargo
    )

    models = []
    metrics = []

    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y, timestamps)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        train_data = lgb.Dataset(X_train, y_train)
        valid_data = lgb.Dataset(X_test, y_test, reference=train_data)

        model = lgb.train(
            lgb_params,
            train_data,
            valid_sets=[valid_data],
            callbacks=[lgb.early_stopping(50)]
        )

        models.append(model)

        # Compute metrics
        preds = model.predict(X_test).argmax(axis=1)
        acc = (preds == y_test).mean()
        metrics.append({'fold': fold, 'accuracy': acc})

    return models, pd.DataFrame(metrics)
```

---

See [TIER1_MODELS.md](./TIER1_MODELS.md) for complete documentation of all Tier 1 models.

See [TRAINING_PIPELINE.md](./TRAINING_PIPELINE.md) for CPCV validation and training infrastructure.

See [FEATURE_STORE.md](./FEATURE_STORE.md) for Redis + QuestDB feature serving.

See [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) for all 117 feature definitions.
