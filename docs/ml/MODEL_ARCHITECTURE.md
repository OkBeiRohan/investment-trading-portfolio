# Model Architecture: 5-Tier Data-Bound Hierarchical System

**Last Updated**: March 11, 2026  
**Architecture Version**: 2026 Data-Bound Hierarchical

---

## Architecture Overview

The fundamental principle: **models are segregated by the intersection of their target horizon and historical data depth.** A model trained on 26 years of daily data must never consume features that only exist for 7 days.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  5-TIER DATA-BOUND HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 0: PRE-MARKET GAP PREDICTOR                                     │  │
│  │ Data: Global overnight + GIFT Nifty + Sentiment | Runs: 9:08 AM     │  │
│  │ Model: XGBoost | Output: expected_gap, opening_volatility, bias     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          ↓ Gap Context                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 1: MACRO DIRECTOR (26-Year Data Depth)                          │  │
│  │ Data: 26yr Daily + VIX + Tier 0 output | Runs: 9:09 AM              │  │
│  │ Models: HMM (4-state) + PatchTST | Output: regime_state, trend      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          ↓ Regime Context                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 2: INTRADAY NAVIGATOR (4-Year Data Depth)                       │  │
│  │ Data: 4yr 1-Min + OI + Global 1-min | Runs: Every 60 seconds        │  │
│  │ Models: LightGBM + TFT + Mamba                                      │  │
│  │ Output: P(up), P(down), P(flat) for 5m, 15m, 30m horizons           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          ↓ Direction Signal                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 3: MICROSTRUCTURE SCALPER (Live Data Only)                      │  │
│  │ Data: Live Depth-30, Greeks, OFI | Runs: Every 100ms                │  │
│  │ Model: LiT Transformer (phased activation)                          │  │
│  │ Output: buy_pressure, sell_pressure, slippage_estimate               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          ↓                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 4: META-LEARNER (Fusion Core)                                   │  │
│  │ Combines all tiers with Regime-Conditioned Temporal Loss             │  │
│  │ Model: Contextual Gating Network | Runs: Every 60 seconds           │  │
│  │ Output: final_direction, confidence, position_action                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  EXECUTION LAYER (separate from prediction)                                │
│  ├── PPO Agent: Strike selection, limit pricing                            │
│  ├── Risk Manager: Greeks limits, VaR, position sizing                    │
│  └── Order Router: Upstox API execution                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 0: Pre-Market Gap Predictor

### Purpose
Predict the 9:15 AM gap direction, magnitude, and expected opening volatility using the 9:08 AM pre-open freeze and overnight global market data.

### Why This Exists
The Indian market is closed while the US operates and global news breaks. The gap between yesterday's 3:30 PM close and today's 9:15 AM open is a massive discontinuity that other tiers can't handle.

| Property | Value |
|----------|-------|
| **Model** | XGBoost |
| **Runs** | Once at 9:08:05 AM |
| **Data Depth** | Global overnight snapshots |
| **Target** | Opening gap %, expected volatility |

### Input Features (at 9:08 AM)

**Group A: Global Overnight (12)**

| Feature | Source |
|---------|--------|
| `gift_nifty_premium` | GIFT Nifty LTP - prev NIFTY close |
| `sp500_overnight_return` | S&P 500 E-mini overnight % |
| `nasdaq_overnight_return` | Nasdaq 100 E-mini overnight % |
| `nikkei_return` | Nikkei 225 morning session |
| `brent_crude_change` | Brent crude overnight % |
| `brent_wti_spread` | Brent - WTI price spread |
| `gold_change` | Gold (XAU/USD) overnight % |
| `usd_inr_change` | USD/INR overnight % |
| `overnight_news_sentiment` | FinBERT rolling sentiment [-1, 1] |
| `actual_gap_points` | 9:08 AM freeze price - prev close |
| `prev_day_range` | Previous day's high-low range |
| `prev_day_close_vs_vwap` | Previous close relative to VWAP |

**Group B: MCX Commodities (8) — NEW**

| Feature | Source |
|---------|--------|
| `mcx_crudeoil_change` | Upstox MCX WS (`MCX_FO\|CRUDEOIL*`) |
| `mcx_naturalgas_change` | Upstox MCX WS (`MCX_FO\|NATURALGAS*`) |
| `mcx_gold_change` | Upstox MCX WS (`MCX_FO\|GOLD*`) |
| `mcx_silver_change` | Upstox MCX WS (`MCX_FO\|SILVER*`) |
| `mcx_copper_change` | Upstox MCX WS (`MCX_FO\|COPPER*`) |
| `brent_mcx_crudeoil_spread` | derived (Brent USD vs MCX INR-adj) |
| `mcx_commodity_breadth` | derived (count MCX up / 5) |
| `mcx_intraday_regime` | derived (rolling z-score) |

**Group C: Pre-Market Context (4)**

| Feature | Source |
|---------|--------|
| `actual_gap_pct` | derived (freeze_price vs prev_close %) |
| `expected_opening_volatility` | derived (rolling volatility proxy) |
| `pre_market_bias` | derived (GIFT Nifty directional bias) |
| `overnight_mcx_energy_pressure` | derived (crude + natgas composite) |

### Output

```json
{
  "expected_gap_pct": 0.45,
  "expected_volatility": "HIGH",
  "opening_bias": 0.65,
  "confidence": 0.78
}
```

---

## Tier 1: Macro Director

### Purpose
Determine the dominant daily market regime using 26 years of robust daily data. This tier is **immune to intraday noise**.

| Property | Value |
|----------|-------|
| **Models** | HMM (4-state) + PatchTST |
| **Runs** | Once at 9:09 AM |
| **Data Depth** | 26yr daily + 12yr VIX |
| **Target** | Regime state, daily trend direction |

### Regime States

| State | Characteristics | Typical VIX | Strategy Bias |
|-------|----------------|-------------|---------------|
| **BULL_TRENDING** | 50 DMA > 200 DMA, higher highs, breadth > 60% | < 18 | Long CE, momentum |
| **BEAR_TRENDING** | 50 DMA < 200 DMA, lower lows, breadth < 40% | 18-25 | Long PE, hedged |
| **VOLATILE** | ATR spike > 2x, sector rotation high | > 25 | Reduced size, straddles |
| **RANGING** | ATR normal, breadth 40-60% | 15-20 | Mean reversion, spreads |

### Features

```python
REGIME_FEATURES = [
    # Returns (5)
    'return_1d', 'return_5d', 'return_10d', 'return_20d', 'return_60d',
    # Moving Averages (6)
    'sma_20', 'sma_50', 'sma_200', 'ema_20', 'price_vs_sma200', 'golden_cross',
    # Volatility (5)
    'realized_vol_10d', 'realized_vol_20d', 'realized_vol_60d',
    'india_vix', 'vix_percentile_1yr',
    # Trend (4)
    'adx_14', 'trend_strength', 'higher_high_count_20d', 'lower_low_count_20d',
    # Breadth (2)
    'pct_above_200sma', 'advance_decline_20d',
    # Tier 0 Output (3)
    'expected_gap_pct', 'expected_volatility', 'opening_bias',
    # Global Macro - Yahoo Finance (7)
    'sp500_overnight_return', 'nasdaq_overnight_return', 'brent_crude_change',
    'wti_crude_change', 'gold_change', 'usd_inr_change', 'overnight_news_sentiment',
    # MCX Commodities - Upstox (8) -- NEW
    'mcx_crudeoil_change', 'mcx_naturalgas_change', 'mcx_gold_change',
    'mcx_silver_change', 'mcx_copper_change', 'brent_mcx_crudeoil_spread',
    'mcx_commodity_breadth', 'mcx_intraday_regime',
    # Seasonality (3)
    'month', 'day_of_week', 'days_to_expiry'
]
# Total: 43 features (was 32)
```

---

## Tier 2: Intraday Navigator

### Purpose
Predict 5m, 15m, and 30m directional magnitude using 4 years of 1-minute historical data. **Core operational tier.**

| Model | Architecture | Input | Output | Latency |
|-------|-------------|-------|--------|---------|
| **LightGBM** | Gradient Boosting | 80+ features | 3-class probs | ~20ms |
| **TFT** | Temporal Fusion | 80×120 sequence | Multi-horizon quantiles | ~35ms |
| **Mamba** | State Space Model | 80×120 sequence | Direction probabilities | ~25ms |

### Feature Set (~116 Features)

| Category | Count | Key Features |
|----------|-------|-------------|
| Index Breadth | 8 | pct_above_vwap, breadth_thrust, advance_decline |
| NIFTY Future | 12 | RSI, MACD, ATR, Bollinger, volume ratio, OI change |
| Options | 14 | ATM IV, PCR, skew, GEX, charm, vanna |
| Volatility | 10 | VIX, realized vol, IV/RV ratio, vol percentiles |
| Order Flow | 8 | OFI, depth imbalance (from available live data) |
| Price Structure | 8 | returns (1m-20d), gap open, range position |
| Momentum | 8 | RSI (5/14), MACD, ADX, directional indicators |
| Moving Averages | 10 | SMA/EMA, golden cross, price vs MA |
| Bollinger & Volume | 6 | bandwidth, OBV, accumulation/dist |
| Regime | 4 | trend strength, momentum regime |
| Time Context (Cyclical) | 13 | sin/cos encoding, session phase, expiry flags |
| Global Macro (live 1-min) | 12 | ES/NQ returns, Brent, Gold, USD/INR during session |
| MCX Commodities | 8 | Crude Oil MCX, Nat Gas, Gold MCX, Silver, Copper (live intraday %) |
| **Total** | **~125** | |

### Label Generation

```python
def generate_multi_horizon_labels(
    df: pd.DataFrame,
    horizons: list[int] = [5, 15, 30]  # minutes
) -> pd.DataFrame:
    result = df.copy()
    for h in horizons:
        # Forward returns
        result[f'return_{h}m'] = df['close'].shift(-h) / df['close'] - 1
        # Dynamic threshold: larger moves needed for longer horizons
        threshold = 0.001 * np.sqrt(h)
        # 3-class: DOWN=0, NEUTRAL=1, UP=2
        result[f'label_{h}m'] = np.where(
            result[f'return_{h}m'] < -threshold, 0,
            np.where(result[f'return_{h}m'] > threshold, 2, 1)
        )
    return result
```

---

## Tier 3: Microstructure Scalper

### Purpose
Read live Order Flow Imbalance (OFI) and bid/ask pressure for immediate execution edges. **Defers to higher tiers for directional bias.**

| Property | Value |
|----------|-------|
| **Model** | LiT Transformer (phased activation) |
| **Runs** | Every 100ms |
| **Data Depth** | Live WebSocket only |
| **Target** | 10s to 1min price pressure |

### Progressive Activation

| Phase | Timeline | Model | Rationale |
|-------|----------|-------|-----------|
| Phase 1 | Months 1-3 | Analytical rules (OFI thresholds, Black-Scholes) | Too little data for ML |
| Phase 2 | Month 4-6 | Shallow MLP | Enough for basic pattern matching |
| Phase 3 | Month 6+ | Full LiT Transformer | Sufficient Depth-30 history |

### LiT Input (14 Order Flow Features)

```python
LOB_FEATURES = [
    'ofi_1s', 'ofi_5s', 'ofi_30s',
    'trade_imbalance', 'depth_imbalance_5', 'depth_imbalance_10',
    'volume_at_bid_pct', 'large_trade_indicator',
    'bid_ask_slope', 'spread_normalized',
    'mid_price_change', 'order_arrival_rate',
    'cancellation_rate', 'sweep_detector'
]
```

---

## Tier 4: Meta-Learner (Fusion Core)

### Purpose
Fuse all tier outputs using **Regime-Conditioned Temporal Loss** to prevent the system from whipsawing on intraday noise during strong macro trends.

### Regime-Conditioned Temporal Loss

$$
L_{meta} = L_{CE}(Y, \hat{Y}) + \gamma \sum_{t} (||\Delta \hat{Y}_t||^2 \cdot C_{T1}(t)) + \alpha R(W_{T3})
$$

| Component | Purpose |
|-----------|---------|
| $L_{CE}$ | Standard cross-entropy on multi-horizon labels |
| $\gamma$ term | Penalizes rapid prediction flipping, scaled by Tier 1 confidence |
| $\alpha$ term | Regularizes over-reliance on data-poor Tier 3 (decays over time) |

### Regime-Adaptive Weights

| Regime | LightGBM | TFT | LiT | Behavior |
|--------|----------|-----|-----|----------|
| BULL_TRENDING | 0.5 | 0.3 | 0.2 | Trust direction models |
| BEAR_TRENDING | 0.5 | 0.3 | 0.2 | Trust direction models |
| VOLATILE | 0.3 | 0.3 | 0.4 | Prioritize microstructure |
| RANGING | 0.4 | 0.4 | 0.2 | Trust regime boundaries |

### Live Feed: Asynchronous State Management

Tier outputs are cached in Redis. The Meta-Learner always pulls the **latest available** prediction from each tier:

| Tier | Update Frequency | Redis Key Pattern |
|------|-----------------|-------------------|
| Tier 0 | Once @ 9:08 AM | `tier0:gap:{date}` |
| Tier 1 | Once @ 9:09 AM | `tier1:regime:{date}` |
| Tier 2 | Every 60 seconds | `tier2:direction:{timestamp}` |
| Tier 3 | Every 100ms | `tier3:microstructure:{timestamp}` |

---

## Performance Targets

| Model | Metric | Target | Validation |
|-------|--------|--------|------------|
| **Tier 0 XGBoost** | Gap direction accuracy | >65% | Walk-forward |
| **Tier 1 HMM** | State persistence | >5 days avg | Walk-forward |
| **Tier 2 LightGBM** | AUC-ROC | >0.68 | CPCV |
| **Tier 2 TFT** | MAE (returns) | <0.3% | CPCV |
| **Tier 3 LiT** | AUC-ROC | >0.65 | Rolling window |
| **Tier 4 Meta** | AUC-ROC | >0.72 | CPCV |
| **Ensemble** | Sharpe Ratio | >1.5 | Backtest |

---

## Hardware Requirements

### Training (RTX 3050 - 4GB VRAM)

| Model | Memory | Training Time |
|-------|--------|---------------|
| XGBoost (Tier 0) | <0.5GB | ~5 min |
| LightGBM (Tier 2) | <1GB | ~30 min |
| TFT (Tier 2) | ~2GB | ~4 hours |
| Mamba (Tier 2) | ~2GB | ~3 hours |
| LiT (Tier 3) | ~2GB | ~2 hours |
| Meta-Learner | <0.5GB | ~5 min |

### Inference (Production)

| Model | Latency | Memory |
|-------|---------|--------|
| XGBoost | ~5ms | ~20MB |
| LightGBM | ~20ms | ~50MB |
| TFT | ~35ms | ~200MB |
| Mamba | ~25ms | ~150MB |
| LiT | ~10ms | ~100MB |
| **Total (parallel)** | **~50ms** | **~600MB** |

---

## Related Documentation

- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data sources (Indian + Global)
- [TRAINING_STRATEGY.md](./TRAINING_STRATEGY.md) - Validation methods
- [FEATURE_SPECIFICATION.md](./FEATURE_SPECIFICATION.md) - 100+ features
- [INFERENCE_ENGINE.md](../../apps/algo-worker/docs/INFERENCE_ENGINE.md) - Live inference
