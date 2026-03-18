# TIER 1: Macro Director — Regime & Daily Trend Classification

> **Classifies the market into one of four regime states using 26 years of daily data. Runs ONCE at 09:09 AM. Output consumed by ALL downstream tiers for the entire trading day.**

**Last Updated**: March 13, 2026
**Tier**: 1 — Macro Director
**Runs**: Once at 09:09:00 IST
**Data Depth**: 26 years of daily NIFTY data + 12 years of India VIX

---

## Purpose

Tier 1 answers the most fundamental question before any intraday trading begins: **"What regime is the market in today?"**

This single classification governs:

- Which strategies Tier 4 selects (momentum in BULL, mean-reversion in RANGING, straddles in VOLATILE)
- Position sizing multipliers (reduce in VOLATILE, increase in TRENDING)
- Stop loss widths (wider in VOLATILE, tighter in RANGING)
- How much weight the Meta-Learner gives to each model

Without Tier 1, the system would apply the same strategy in a calm range-bound market and a volatile crash — a guaranteed path to drawdown.

---

## Architecture

### Two-Model Ensemble

| Model        | Architecture                  | Purpose                                                           | Latency |
| ------------ | ----------------------------- | ----------------------------------------------------------------- | ------- |
| **HMM**      | Hidden Markov Model (4-state) | Regime state classification via emission/transition probabilities | ~3ms    |
| **PatchTST** | Patch Time-Series Transformer | Daily trend direction + magnitude                                 | ~5ms    |

**Why Two Models?**

- **HMM** excels at identifying discrete regime switches (it models the hidden state sequence explicitly)
- **PatchTST** captures longer-term trend patterns using self-attention over time patches
- Together, they provide both regime classification (HMM) and trend directionality (PatchTST)

### Execution Flow

```
Tier 0 Output (cached)
      │
┌─────────────────────────────────────────────────────────────┐
│ TIER 1 FEATURE COLLECTOR (43 features)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 26yr Daily   │  │ India VIX    │  │ Tier 0 Output    │   │
│  │ OHLCV from   │  │ (12yr)       │  │ (3 features)     │   │
│  │ QuestDB      │  │ from QuestDB │  │ from Redis       │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                 │               │
│  ┌──────┴───────────────────────────────────┘               │
│  │ + MCX Commodities (8 features, Upstox WS snapshot)       │
│  └──────────────────────────────────────────────────────┐   │
│                            ▼                            │   │
│                   43-feature vector                     │   │
└─────────────────────────────────────────────────────────┘───┘
              │                              │
              ▼                              ▼
┌──────────────────────┐     ┌──────────────────────────┐
│ HMM (4-state)        │     │ PatchTST                 │
│                      │     │                          │
│ Input: 8 features    │     │ Input: 512 days × 15 feat│
│ Output:              │     │ Output:                  │
│  • regime_state      │     │  • daily_direction       │
│  • state_probability │     │  • daily_magnitude       │
│  • transition_prob   │     │  • trend_confidence      │
└──────────┬───────────┘     └──────────┬───────────────┘
           │                            │
           └──────────┬─────────────────┘
                      ▼
          ┌───────────────────────┐
          │ TIER 1 OUTPUT         │
          │                       │
          │ regime_state: enum    │
          │ regime_confidence:    │
          │ daily_trend: [-1,+1]  │
          │ trend_confidence:     │
          └───────────────────────┘
                      │
                      ▼
          Redis: tier1:regime:{date}
          └── Consumed by Tier 2, 3, 4, Risk Manager
```

---

## Input Features (43)

### Returns (5 features)

| Feature      | Formula                    | Rationale            |
| ------------ | -------------------------- | -------------------- |
| `return_1d`  | close[t] / close[t-1] - 1  | Yesterday's momentum |
| `return_5d`  | close[t] / close[t-5] - 1  | Weekly trend         |
| `return_10d` | close[t] / close[t-10] - 1 | Biweekly trend       |
| `return_20d` | close[t] / close[t-20] - 1 | Monthly trend        |
| `return_60d` | close[t] / close[t-60] - 1 | Quarterly trend      |

### Moving Averages (6 features)

| Feature           | Formula                     | Rationale                      |
| ----------------- | --------------------------- | ------------------------------ |
| `sma_20`          | Mean(close, 20)             | Short-term trend line          |
| `sma_50`          | Mean(close, 50)             | Medium-term support/resistance |
| `sma_200`         | Mean(close, 200)            | Long-term secular trend        |
| `ema_20`          | EWM(close, span=20)         | Responsive short-term trend    |
| `price_vs_sma200` | (close - SMA200) / SMA200   | Distance from key level        |
| `golden_cross`    | 1 if SMA50 > SMA200, else 0 | Classic bull/bear indicator    |

### Volatility (5 features)

| Feature              | Formula                              | Rationale                       |
| -------------------- | ------------------------------------ | ------------------------------- |
| `realized_vol_10d`   | Std(returns, 10) × √252              | Short-term realized volatility  |
| `realized_vol_20d`   | Std(returns, 20) × √252              | Standard realized volatility    |
| `realized_vol_60d`   | Std(returns, 60) × √252              | Long-term volatility baseline   |
| `india_vix`          | India VIX close                      | Implied volatility (fear gauge) |
| `vix_percentile_1yr` | Percentile rank of VIX over 252 days | Relative fear level             |

### Trend Strength (4 features)

| Feature                 | Formula                                   | Rationale                                                    |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `adx_14`                | ADX(14)                                   | Average Directional Index — trend strength without direction |
| `trend_strength`        | ADX normalized to [0,1]                   | Simplified trend strength signal                             |
| `higher_high_count_20d` | Count of higher highs in last 20 sessions | Bullish pattern                                              |
| `lower_low_count_20d`   | Count of lower lows in last 20 sessions   | Bearish pattern                                              |

### Breadth (2 features)

| Feature               | Formula                                      | Rationale             |
| --------------------- | -------------------------------------------- | --------------------- |
| `pct_above_200sma`    | % of NIFTY 50 stocks above their 200-day SMA | Market health         |
| `advance_decline_20d` | Rolling 20-day advance/decline ratio         | Participation breadth |

### Tier 0 Output (3 features)

| Feature               | Source                | Rationale                      |
| --------------------- | --------------------- | ------------------------------ |
| `expected_gap_pct`    | Tier 0 prediction     | Today's opening gap context    |
| `expected_volatility` | Tier 0 classification | Opening volatility expectation |
| `opening_bias`        | Tier 0 bias score     | Directional lean for the day   |

### Global Macro (12 features) — **EXPANDED**

Expanded from 4 to 12 features to include MCX Upstox real-time data alongside Yahoo Finance overnight data.

| Feature                    | Source            | Rationale                      |
| -------------------------- | ----------------- | ------------------------------ |
| `sp500_overnight_return`   | Yahoo Finance     | US market sentiment            |
| `nasdaq_overnight_return`  | Yahoo Finance     | Tech sector sentiment          |
| `brent_crude_change`       | Yahoo Finance     | Energy/inflation pressure      |
| `wti_crude_change`         | Yahoo Finance     | US oil benchmark               |
| `gold_change`              | Yahoo Finance     | Global safe haven              |
| `usd_inr_change`           | Yahoo Finance     | Currency pressure on equities  |
| `overnight_news_sentiment` | Finnhub + FinBERT | News-driven fear/greed         |
| `mcx_crudeoil_change`      | Upstox MCX WS     | Crude Oil INR (domestic proxy) |
| `mcx_naturalgas_change`    | Upstox MCX WS     | Energy cost (INR)              |
| `mcx_gold_change`          | Upstox MCX WS     | Gold INR (safe haven INR)      |
| `mcx_silver_change`        | Upstox MCX WS     | Industrial metals              |
| `mcx_copper_change`        | Upstox MCX WS     | Global growth proxy (INR)      |

### Seasonality (3 features)

| Feature          | Formula                                    | Rationale                              |
| ---------------- | ------------------------------------------ | -------------------------------------- |
| `month`          | Calendar month [1-12]                      | Monthly seasonality (budget, earnings) |
| `day_of_week`    | Day [0-4] (Mon-Fri)                        | Day-of-week effects                    |
| `days_to_expiry` | Trading days to next monthly/weekly expiry | Expiry effects on options              |

---

## Regime States (HMM Output)

| State             | ID  | Characteristics                             | VIX Range | Strategy Bias           | Position Sizing |
| ----------------- | --- | ------------------------------------------- | --------- | ----------------------- | --------------- |
| **BULL_TRENDING** | 0   | SMA50 > SMA200, breadth > 60%, higher highs | < 18      | Momentum longs, sell PE | 1.0x (full)     |
| **BEAR_TRENDING** | 1   | SMA50 < SMA200, breadth < 40%, lower lows   | 18-25     | Hedged shorts, buy PE   | 0.7x            |
| **VOLATILE**      | 2   | ATR spike > 2x, sector rotation, VIX spike  | > 25      | Straddles, reduced size | 0.4x            |
| **RANGING**       | 3   | ATR normal, breadth 40-60%, mean-reverting  | 15-20     | Spreads, mean reversion | 0.8x            |

### Why 4 States?

- **2 states** (bull/bear) miss the crucial distinction between trending and volatile markets
- **3 states** (bull/bear/neutral) can't distinguish low-volatility ranging from high-volatility chaos
- **4 states** capture the full landscape: directional (bull/bear) × volatility (calm/volatile)
- **5+ states** cause overfitting with daily data (~6,500 samples in 26 years)

### State Transition Matrix (Typical)

```
              BULL    BEAR    VOL     RANGE
FROM BULL  [ 0.85    0.03    0.05    0.07  ]
FROM BEAR  [ 0.04    0.82    0.08    0.06  ]
FROM VOL   [ 0.10    0.12    0.58    0.20  ]
FROM RANGE [ 0.15    0.10    0.12    0.63  ]
```

Key observations:

- BULL and BEAR are "sticky" (high self-transition probability)
- VOLATILE is the least persistent (markets don't stay panicked long)
- RANGING often transitions to BULL or VOLATILE (breakout from range)

---

## Model 1: Hidden Markov Model (HMM)

### Architecture

```python
from hmmlearn import hmm
import numpy as np

class RegimeHMM:
    """
    4-state Gaussian HMM for market regime detection.
    Trained on 26 years of daily data with emission = 8-feature vectors.
    """

    def __init__(self, n_states: int = 4, n_features: int = 8):
        """
        Using diagonal covariance (not full) to prevent overfitting.
        Full covariance on 43 features requires ~3,784 parameters for 4 states,
        but we only have ~6,500 daily samples (26yr).
        Diagonal reduces this to 4×8=32 parameters.
        """
        self.model = hmm.GaussianHMM(
            n_components=n_states,
            covariance_type='diag',    # Diagonal covariance to prevent overfitting
            n_iter=200,
            random_state=42,
            tol=1e-4,
            init_params='stmc',        # Initialize all params
            params='stmc'              # Update all params during training
        )
        self.n_states = n_states
        self.n_features = n_features
        self.state_labels = ['BULL_TRENDING', 'BEAR_TRENDING', 'VOLATILE', 'RANGING']

    def fit(self, features: np.ndarray, lengths: list[int] = None):
        """
        Train HMM on daily feature matrix.

        Args:
            features: [N_days, 8] feature matrix (all trading days)  # 8 selected features
            lengths: Sequence lengths if training on multiple contiguous blocks
        """
        # Standardize features
        self.scaler_mean = features.mean(axis=0)
        self.scaler_std = features.std(axis=0)
        features_scaled = (features - self.scaler_mean) / (self.scaler_std + 1e-8)

        self.model.fit(features_scaled, lengths=lengths)

        # Label states by mean return (highest return = BULL, etc.)
        self._label_states(features)

    def _label_states(self, features: np.ndarray):
        """
        Assign semantic labels to HMM states based on characteristics.
        States are sorted by: mean daily return (desc) → volatility (asc).
        """
        features_scaled = (features - self.scaler_mean) / (self.scaler_std + 1e-8)
        states = self.model.predict(features_scaled)

        # Compute per-state statistics
        return_idx = 0  # return_1d is first feature
        vol_idx = 7     # realized_vol_10d index
        vix_idx = 10    # india_vix index

        state_stats = {}
        for s in range(self.n_states):
            mask = states == s
            state_stats[s] = {
                'mean_return': features[mask, return_idx].mean(),
                'mean_vol': features[mask, vol_idx].mean(),
                'mean_vix': features[mask, vix_idx].mean(),
                'count': mask.sum()
            }

        # Sort: BULL (high return, low vol), BEAR (low return), VOLATILE (high vol), RANGING (middle)
        sorted_states = sorted(state_stats.items(), key=lambda x: -x[1]['mean_return'])
        self.state_map = {}
        self.state_map[sorted_states[0][0]] = 'BULL_TRENDING'
        self.state_map[sorted_states[-1][0]] = 'BEAR_TRENDING'

        # Between bull and bear: higher vol = VOLATILE, lower = RANGING
        mid_states = sorted_states[1:-1]
        mid_sorted = sorted(mid_states, key=lambda x: -x[1]['mean_vol'])
        self.state_map[mid_sorted[0][0]] = 'VOLATILE'
        self.state_map[mid_sorted[1][0]] = 'RANGING'

    def predict(self, features: np.ndarray) -> dict:
        """
        Predict current regime from latest feature vector [1, 8].
        Returns semantic state label + probabilities.
        """
        features_scaled = (features - self.scaler_mean) / (self.scaler_std + 1e-8)

        state = self.model.predict(features_scaled)[-1]
        proba = self.model.predict_proba(features_scaled)[-1]

        return {
            'regime_state': self.state_map[state],
            'state_probabilities': {
                self.state_map[i]: float(proba[i])
                for i in range(self.n_states)
            },
            'confidence': float(proba[state]),
            'transition_matrix': self.model.transmat_.tolist()
        }
```

### HMM Training Configuration

```python
HMM_CONFIG = {
    'n_states': 4,
    'covariance_type': 'diag',
    'feature_selection': 'HMM uses 8 core features; PatchTST uses full 15',
    'n_iter': 200,
    'data_depth_years': 26,
    'validation': 'walk_forward',
    'train_window_years': 20,
    'test_window_months': 6,
    'min_state_persistence': 5,  # days — reject models with unstable states
    'retraining_frequency': 'weekly',
}
```

---

## Model 2: PatchTST (Daily Trend Forecaster)

### Architecture

```python
import torch
import torch.nn as nn

class DailyPatchTST(nn.Module):
    """
    PatchTST for daily trend prediction.
    Input: 512 days × 15 features (last ~2 years of daily data)
    Output: trend direction [-1, +1] and magnitude
    """

    def __init__(
        self,
        n_features: int = 15,
        seq_len: int = 512,
        patch_len: int = 16,
        stride: int = 8,
        d_model: int = 256,
        n_heads: int = 8,
        n_layers: int = 4,
        dropout: float = 0.2
    ):
        super().__init__()

        self.n_features = n_features
        self.n_patches = (seq_len - patch_len) // stride + 1

        # Patch embedding
        self.patch_embed = nn.Linear(patch_len, d_model)
        self.pos_embed = nn.Parameter(torch.randn(1, self.n_patches, d_model))

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, n_layers)

        # Dual output heads
        self.direction_head = nn.Sequential(
            nn.Linear(self.n_patches * d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1),
            nn.Tanh()  # [-1, +1]
        )
        self.magnitude_head = nn.Sequential(
            nn.Linear(self.n_patches * d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1),
            nn.Softplus()  # [0, ∞)
        )

    def forward(self, x: torch.Tensor) -> dict:
        """
        Args:
            x: [B, 512, 15] — 512 days of 15 features.
                Each feature channel is processed independently (channel-independent)
                then aggregated via mean-pooling across channels.
        Returns:
            dict with 'direction' [-1,+1] and 'magnitude' [0, ∞)
        """
        B, S, C = x.shape  # [B, 512, 15]

        # Channel-independent processing (original PatchTST design)
        # Each feature is processed as a separate univariate sequence
        # with shared patch embedding weights across channels.
        # This avoids averaging features which destroys multivariate information
        # (Nie et al., 2023; Luxembourg study 2025 found averaging adds noise).
        x_flat = x.permute(0, 2, 1).reshape(B * C, S)  # [B*C, 512]

        # Unfold into patches: [B*C, n_patches, patch_len]
        patches = x_flat.unfold(dimension=-1, size=16, step=8)

        # Embed patches
        embedded = self.patch_embed(patches)  # [B, n_patches, d_model]
        embedded = embedded + self.pos_embed

        # Transformer
        encoded = self.encoder(embedded)  # [B, n_patches, d_model]

        # Aggregate across channels (mean-pool over C independent channels)
        encoded = encoded.reshape(B, C, self.n_patches, -1)  # [B, C, n_patches, d_model]
        encoded = encoded.mean(dim=1)  # [B, n_patches, d_model]
        flat = encoded.flatten(1)  # [B, n_patches * d_model]

        return {
            'direction': self.direction_head(flat).squeeze(-1),  # [B]
            'magnitude': self.magnitude_head(flat).squeeze(-1),  # [B]
        }
```

### PatchTST Features (15 from 43, daily-only)

```python
PATCHTST_FEATURES = [
    'return_1d', 'return_5d', 'return_20d',
    'sma_50', 'sma_200', 'price_vs_sma200',
    'realized_vol_20d', 'india_vix', 'vix_percentile_1yr',
    'adx_14', 'trend_strength',
    'pct_above_200sma', 'advance_decline_20d',
    'golden_cross', 'days_to_expiry'
]
```

---

## Output Schema

```json
{
  "tier": 1,
  "timestamp": "2026-03-13T09:09:00.000+05:30",
  "models": {
    "hmm": {
      "regime_state": "BULL_TRENDING",
      "state_probabilities": {
        "BULL_TRENDING": 0.72,
        "BEAR_TRENDING": 0.05,
        "VOLATILE": 0.08,
        "RANGING": 0.15
      },
      "confidence": 0.72,
      "state_persistence_days": 12
    },
    "patchtst": {
      "daily_direction": 0.35,
      "daily_magnitude": 0.45,
      "trend_confidence": 0.68
    }
  },
  "combined": {
    "regime_state": "BULL_TRENDING",
    "regime_confidence": 0.72,
    "daily_trend": 0.35,
    "trend_confidence": 0.68
  }
}
```

### Downstream Consumption

| Consumer                  | What It Reads                       | How It Uses It                              |
| ------------------------- | ----------------------------------- | ------------------------------------------- |
| **Tier 2** (LightGBM)     | `regime_state`                      | As a categorical feature (one-hot encoded)  |
| **Tier 2** (TFT)          | `regime_state`, `regime_confidence` | As static covariates                        |
| **Tier 4** (Meta-Learner) | Full output                         | Regime-adaptive model weighting             |
| **Risk Manager**          | `regime_state`                      | Position sizing multiplier, stop-loss width |
| **Strategy Selector**     | `regime_state`                      | Strategy menu filtering                     |

---

## Training Specification

### Data Preparation

```python
def prepare_tier1_data(
    nifty_daily: pd.DataFrame,    # 26 years of OHLCV + VIX
    constituents: pd.DataFrame,   # 50 stocks daily for breadth
) -> pd.DataFrame:
    """Build 43-feature matrix, one row per trading day."""
    df = nifty_daily.copy()

    # Returns
    for period in [1, 5, 10, 20, 60]:
        df[f'return_{period}d'] = df['close'].pct_change(period)

    # Moving averages
    for window in [20, 50, 200]:
        df[f'sma_{window}'] = df['close'].rolling(window).mean()
    df['ema_20'] = df['close'].ewm(span=20).mean()
    df['price_vs_sma200'] = (df['close'] - df['sma_200']) / df['sma_200']
    df['golden_cross'] = (df['sma_50'] > df['sma_200']).astype(int)

    # Volatility
    for window in [10, 20, 60]:
        df[f'realized_vol_{window}d'] = df['return_1d'].rolling(window).std() * np.sqrt(252)
    df['vix_percentile_1yr'] = df['india_vix'].rolling(252).rank(pct=True)

    # Trend
    df['adx_14'] = compute_adx(df, 14)
    df['trend_strength'] = df['adx_14'] / 100.0
    df['higher_high_count_20d'] = (df['high'] > df['high'].shift(1)).rolling(20).sum()
    df['lower_low_count_20d'] = (df['low'] < df['low'].shift(1)).rolling(20).sum()

    # CRITICAL: Survivorship bias prevention
    # The `constituents` DataFrame MUST contain point-in-time NIFTY 50 membership.
    # Using today's 50 stocks on historical dates creates look-ahead bias:
    # excluded stocks averaged -3% annually vs survivors at +18%.
    # Use the nifty50_constituents table (date, symbol, free_float_weight)
    # or the HuggingFace dataset AMP4010/Historical_Nifty_50_Constituent_Weights_20Y.
    # See NIFTY50_CONSTITUENT_CHANGES.md for the full change history.

    # Breadth
    df['pct_above_200sma'] = compute_breadth(constituents)
    df['advance_decline_20d'] = compute_advance_decline(constituents, 20)

    # Seasonality
    df['month'] = df.index.month
    df['day_of_week'] = df.index.dayofweek
    df['days_to_expiry'] = compute_dte(df.index)

    return df.dropna()
```

### ONNX Export

```python
# HMM export: serialize model parameters (not ONNX — HMM is not a neural net)
import pickle

def export_hmm(model: RegimeHMM, path='models/tier1_hmm.pkl'):
    with open(path, 'wb') as f:
        pickle.dump(model, f)

# PatchTST export: ONNX
def export_patchtst(model: DailyPatchTST, path='models/tier1_patchtst.onnx'):
    dummy = torch.randn(1, 512, 15)
    torch.onnx.export(
        model, dummy, path,
        input_names=['daily_features'],
        output_names=['direction', 'magnitude'],
        dynamic_axes={'daily_features': {0: 'batch'}},
        opset_version=17
    )
```

---

## Performance Targets

| Metric                        | Target                              | Validation   |
| ----------------------------- | ----------------------------------- | ------------ |
| HMM state persistence         | >5 days average                     | Walk-forward |
| PatchTST directional accuracy | >58%                                | Walk-forward |
| Combined regime accuracy      | >65% on held-out months             | Walk-forward |
| Inference latency             | <8ms total (3ms HMM + 5ms PatchTST) | Benchmark    |
| Memory footprint              | <50MB                               | Profiled     |

---

## Related Documentation

- [TIER0_MODELS.md](./TIER0_MODELS.md) — Produces input features for Tier 1
- [TIER2_MODELS.md](./TIER2_MODELS.md) — Consumes regime state
- [TIER4_MODELS.md](./TIER4_MODELS.md) — Fuses Tier 1 output with others
- [MODEL_PIPELINE_WORKFLOW.md](./MODEL_PIPELINE_WORKFLOW.md) — Session timing
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) — 5-Tier overview
