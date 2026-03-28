# Machine Learning Documentation

**Last Updated**: March 24, 2026
**Architecture**: 5-Tier Data-Bound Hierarchical System

---

## Overview

This directory contains documentation for the **AI trading system** that powers the algo-worker. The system uses a **5-tier data-bound hierarchical architecture** where models are strictly segregated by the intersection of their **target horizon** and the **historical depth** of their required data.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              5-TIER DATA-BOUND HIERARCHICAL ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA UNIVERSE                                                              │
│  ├── Daily OHLCV: 2000-2026 (6,500 trading days) ─── Tier 1                 │
│  ├── 1-Min OHLCV: 2022-2026 (~378K candles/instrument) ─── Tier 2           │
│  ├── India VIX: Feb 2014-2026 ─── Tier 1                                    │
│  ├── Global Markets: US Futures, Commodities, Forex ─── Tier 0, 1, 2        │
│  ├── Expired F&O: Full chain with strikes, OI ─── Tier 2                    │
│  ├── Live Tick: Depth-30, Greeks, IV ─── Tier 3                             │
│  └── News/Sentiment: FinBERT processed RSS ─── Tier 0, 1                    │
│                                                                             │
│  MODEL TIERS                                                                │
│  ├── Tier 0: Pre-Market Gap Predictor (XGBoost) @ 9:08 AM                   │
│  ├── Tier 1: Macro Director (HMM + PatchTST, 26yr daily) @ 9:09 AM          │
│  ├── Tier 2: Intraday Navigator (LightGBM + TFT + Mamba, 4yr 1-min)         │
│  ├── Tier 3: Microstructure Scalper (LiT, live tick) @ 100ms                │
│  └── Tier 4: Meta-Learner (Regime-Conditioned Fusion) @ 60s                 │
│                                                                             │
│  INFERENCE (<80ms E2E)                                                      │
│  ├── 100+ features via Rust compute-engine (<5ms)                           │
│  ├── MLflow Model Serving ensemble inference (<50ms)                        │
│  └── Meta-learner signal fusion with regime conditioning                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

### Core Architecture

| Document                                             | Description                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [**DATA_ARCHITECTURE.md**](./DATA_ARCHITECTURE.md)   | Data sources (Indian + Global), QuestDB schemas, Upstox + Yahoo Finance integration |
| [**MODEL_ARCHITECTURE.md**](./MODEL_ARCHITECTURE.md) | 5-tier model design: Gap → Regime → Direction → Microstructure → Fusion             |
| [**TRAINING_STRATEGY.md**](./TRAINING_STRATEGY.md)   | CPCV validation, walk-forward, drift detection                                       |

### Features & Inference

| Document                                                   | Description                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| [**FEATURE_SPECIFICATION.md**](./FEATURE_SPECIFICATION.md) | 100+ feature definitions (local + global macro + cyclical time) |
| [**INFERENCE_PIPELINE.md**](./INFERENCE_PIPELINE.md)       | MLflow Model Serving inference architecture                     |
| [**FEATURE_STORE.md**](./FEATURE_STORE.md)                 | Redis feature store (direct write, no Feast)                    |

### Models & Training

| Document                                                     | Description                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| [**TIER0_MODELS.md**](./TIER0_MODELS.md)                     | Pre-Market Gap Predictor (XGBoost, 9:08 AM)                      |
| [**TIER1_MODELS.md**](./TIER1_MODELS.md)                     | Regime HMM, PatchTST, Mamba model specifications                 |
| [**TIER2_MODELS.md**](./TIER2_MODELS.md)                     | Intraday Navigator (LightGBM + TFT + Mamba, 5m-30m)             |
| [**TIER3_MODELS.md**](./TIER3_MODELS.md)                     | Microstructure Scalper (LiT Transformer, 100ms ticks)            |
| [**TIER4_MODELS.md**](./TIER4_MODELS.md)                     | Meta-Learner signal fusion and strategy selection                |
| [**META_LEARNER_EXECUTION.md**](./META_LEARNER_EXECUTION.md) | Regime-Conditioned Temporal Loss, adaptive weighting             |
| [**TRAINING_PIPELINE.md**](./TRAINING_PIPELINE.md)           | Python training pipeline details                                 |
| [**MLFLOW_PLATFORM.md**](./MLFLOW_PLATFORM.md)                   | MLflow 3.x experiment tracking, HPO, evaluation, model comparison |

### Data Storage & Ingestion

| Document                                                       | Description                              |
| -------------------------------------------------------------- | ---------------------------------------- |
| [**QUESTDB_TRAINING_DATA.md**](./QUESTDB_TRAINING_DATA.md)     | QuestDB 8-table schema for training data |
| [**UPSTOX_DATA_INGESTION.md**](./UPSTOX_DATA_INGESTION.md)     | Upstox API v2/v3 data ingestion guide    |
| [**AI_TRADING_ARCHITECTURE.md**](./AI_TRADING_ARCHITECTURE.md) | High-level architecture overview         |

### Operations

| Document                                                             | Description                                        |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| [**MODEL_PIPELINE_WORKFLOW.md**](./MODEL_PIPELINE_WORKFLOW.md)       | Session-by-session timing from midnight to close   |
| [**THEORY_AND_EVIDENCE.md**](./THEORY_AND_EVIDENCE.md)                   | CPCV theory, triple-barrier method, literature references  |

### MLOps & Experiment Management

| Document                                               | Description                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| [**MLFLOW_PLATFORM.md**](./MLFLOW_PLATFORM.md)         | MLflow 3.x platform: tracking, HPO, evaluation, comparison, registry |
| [**TRAINING_PIPELINE.md**](./TRAINING_PIPELINE.md)     | Python training pipeline (runner, tiers, MLflow native logging)      |
| [**TRAINING_STRATEGY.md**](./TRAINING_STRATEGY.md)     | CPCV validation, walk-forward, drift detection                       |

---

## Quick Reference

### Available Data

| Data Type                 | Coverage             | Volume        | Source            |
| ------------------------- | -------------------- | ------------- | ----------------- |
| Daily OHLCV (Indian)      | 26 years (2000-2026) | ~6,500 days   | Upstox            |
| 1-Min OHLCV (Indian)      | 4 years (2022-2026)  | ~378K candles | Upstox            |
| India VIX                 | 12 years (2014-2026) | ~3,000 days   | Upstox            |
| Expired F&O               | Full chain           | All strikes   | Upstox            |
| Live Tick (Depth-30)      | Today onwards        | Continuous    | Upstox WS         |
| Global Equity Futures     | 4+ years             | ~500K candles | Yahoo Finance     |
| Commodities (Brent, Gold) | 4+ years             | ~500K candles | Yahoo Finance     |
| Currency (USD/INR)        | 4+ years             | ~500K candles | Yahoo Finance     |
| News Sentiment            | Rolling              | ~100-500/day  | Finnhub + FinBERT |

### Model Stack

| Tier | Model                  | Data Depth       | Horizon        | Frequency      |
| ---- | ---------------------- | ---------------- | -------------- | -------------- |
| 0    | XGBoost (Gap)          | Global overnight | 9:15 AM open   | Once @ 9:08 AM |
| 1    | HMM + PatchTST         | 26yr daily       | 1 Day - 1 Week | Once @ 9:09 AM |
| 2    | LightGBM + TFT + Mamba | 4yr 1-min        | 5m - 30m       | Every 60s      |
| 3    | LiT Transformer        | Live ticks       | 10s - 1m       | Every 100ms    |
| 4    | Meta-Learner           | All tier outputs | Trade signal   | Every 60s      |

### Feature Categories (100+ Features)

| Category                | Count | Examples                                |
| ----------------------- | ----- | --------------------------------------- |
| Index Breadth           | 8     | pct_above_vwap, breadth_thrust          |
| NIFTY Future            | 12    | RSI, MACD, ATR, Bollinger               |
| Options                 | 14    | ATM IV, PCR, GEX, skew                  |
| Volatility              | 10    | India VIX, IV/RV ratio, vol percentiles |
| Order Flow              | 8     | OFI, depth imbalance                    |
| Price Structure         | 8     | daily returns, gap open                 |
| Momentum                | 8     | RSI, MACD, ADX                          |
| Moving Averages         | 10    | SMA/EMA, golden cross                   |
| Bollinger & Volume      | 6     | bandwidth, OBV                          |
| Regime                  | 4     | trend strength, momentum regime         |
| Time Context + Cyclical | 13    | sin/cos encoding, session phase         |
| Global Macro            | 12    | GIFT Nifty, S&P 500, Brent crude        |
| Pre-Market              | 4     | actual gap %, overnight sentiment       |

---

## Performance Targets

| Metric              | Target              |
| ------------------- | ------------------- |
| Feature Computation | <5ms (Rust)         |
| ML Inference        | <50ms (MLflow Serving) |
| E2E Latency         | <80ms               |
| LightGBM AUC        | >0.68               |
| Ensemble Sharpe     | >1.5                |

---

## Data Provider Stack (Free Tier)

| Provider      | Purpose                         | Rate Limit           |
| ------------- | ------------------------------- | -------------------- |
| Upstox        | Indian markets (primary)        | Paid subscription    |
| Yahoo Finance | Global markets, commodities     | ~2000 calls/hr       |
| Alpha Vantage | Backup global + Treasury yields | 500 calls/day        |
| Finnhub       | News/RSS feeds                  | 60 calls/min         |
| Twelve Data   | WebSocket streaming (upgrade)   | 800 calls/day (free) |

---

## Related Documentation

- [algo-worker docs](../../apps/algo-worker/docs/) - Live inference
- [training-pipeline](../../services/training-pipeline/) - Python training
- [compute-engine](../../packages/compute-engine/) - Rust features
- [market-sdk](../../packages/market-sdk/) - Data providers
