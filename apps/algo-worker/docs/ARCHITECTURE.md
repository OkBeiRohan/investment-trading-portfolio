# Algo Worker — 6-Layer Architecture with 5-Tier AI Hierarchy

**Version**: 2026 Institutional-Grade
**Target Latency**: <80ms End-to-End (p95)
**Features**: 117 (Rust compute-engine, <5ms)
**Models**: 8 models across 5 tiers via MLflow Model Serving
**Last Updated**: March 13, 2026

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                     ALGO-WORKER 6-LAYER ARCHITECTURE                            │
│                         Target: <80ms E2E (p95)                                 │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 1: DATA INGESTION (<2ms)                                          │  │
│  │ Redis Streams subscriber: features:live, candles:1m, premarket:*        │  │
│  │ + Redis cache reader: tier0, tier1, tier3 cached outputs                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 2: FEATURE ENGINE (<5ms)                                          │  │
│  │ Rust compute-engine (NAPI-RS) — 117 features via Rayon parallel         │  │
│  │ Phase 1: Dependencies (VWAP, EMA, ATR, Greeks) ~2ms                     │  │
│  │ Phase 2: 117 features parallel ~1ms                                     │  │
│  │ Categories: Breadth(8) Futures(12) Options(14) Vol(10) OFlow(8)         │  │
│  │             Price(8) Momentum(8) Time(13) Global(12) Regime(4) + more   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 3: PREDICTION ENGINE (<25ms with GPU)                             │  │
│  │                                                                          │  │
│  │ ┌─── TIER 0: XGBoost (CPU, once/day @ 09:08) ───── gap, bias       ─┐ │  │
│  │ ├─── TIER 1: HMM+PatchTST (CPU, once/day @ 09:09) → regime, trend  ─┤ │  │
│  │ ├─── TIER 2: LightGBM(CPU) + TFT(GPU) + Mamba(GPU) → direction     ─┤ │  │
│  │ │    [3 Worker Threads, parallel, every 60s]                          │ │  │
│  │ ├─── TIER 3: LiT Transformer (GPU, every 100ms, own Worker Thread)  ─┤ │  │
│  │ └─── TIER 4: Meta-Learner (CPU, every 60s) → final signal           ─┘ │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 4: STRATEGY & RISK (<10ms)                                        │  │
│  │ Regime-conditioned strategy selection (7 strategies × 4 regimes)        │  │
│  │ Neural strike selector + Kelly position sizer + pre-trade validation    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 5: EXECUTION (<20ms)                                              │  │
│  │ Smart order routing (MARKET/TWAP/VWAP) + position tracking + exits     │  │
│  │ Multi-criteria exit engine + trailing stops + 3:20 PM auto-close       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       ↓                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 6: OBSERVABILITY (Async, non-blocking)                            │  │
│  │ Prometheus metrics + Pino logging + Grafana dashboards                  │  │
│  │ Storage: Redis (hot, <5min) → QuestDB (warm, 180d) → MongoDB (cold, 5yr)│  │
│  │ SEBI 2024-2026 audit trail: 5-year retention with Unique Algo ID       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5-Tier AI Hierarchy (Data-Bound)

Each tier operates at a different **data resolution**, on a different **schedule**, with dedicated **compute resources**.

| Tier  | Name                   | Model(s)                  | Data Resolution  | Schedule     | Compute             | Latency |
| ----- | ---------------------- | ------------------------- | ---------------- | ------------ | ------------------- | ------- |
| **0** | Pre-Market Gap         | XGBoost                   | Daily (1d)       | Once @ 09:08 | CPU (main)          | ~2ms    |
| **1** | Macro Director         | HMM + PatchTST            | Daily (1d, 26yr) | Once @ 09:09 | CPU (main)          | ~8ms    |
| **2** | Intraday Navigator     | LightGBM + TFT + Mamba    | Minute (1m)      | Every 60s    | CPU + GPU (Workers) | ~12ms   |
| **3** | Microstructure Scalper | LiT Transformer           | Tick/LOB (100ms) | Every 100ms  | GPU (Worker)        | ~8ms    |
| **4** | Meta-Learner           | Contextual Gating Network | Cached outputs   | Every 60s    | CPU (main)          | ~2ms    |

### Data Resolution Hierarchy

```
Daily candle (1d)  →  Tier 0, Tier 1  →  computed once, cached all day
Minute candle (1m) →  Tier 2          →  computed every 60s, cached 2hr rolling
LOB snapshot (100ms)→ Tier 3          →  computed every 100ms, cached 10s
Cached outputs     →  Tier 4          →  reads Redis, fuses in ~2ms
```

See [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) for full session timing.

---

## Layer Summary

| Layer                  | Purpose                                | Key Components                                  | Target |
| ---------------------- | -------------------------------------- | ----------------------------------------------- | ------ |
| **1. Data Ingestion**  | Subscribe to market data + tier caches | RedisConsumer, CacheReader                      | <2ms   |
| **2. Feature Engine**  | 117 features via Rust compute-engine   | compute-engine (NAPI-RS), FeatureCache          | <5ms   |
| **3. Prediction**      | 5-tier hierarchical inference          | ModelPool, MLflow HTTP clients, TierServices    | <25ms  |
| **4. Strategy & Risk** | Regime-conditioned strategy + risk     | StrategySelector, StrikeSelector, RiskValidator | <10ms  |
| **5. Execution**       | Order routing + position management    | OrderManager, PositionTracker, ExitEngine       | <20ms  |
| **6. Observability**   | Metrics + persistence + audit          | Prometheus, QuestDB, MongoDB, PinoLogger        | Async  |

**Total E2E**: <80ms (p95)

---

## MLflow Model Serving Architecture

All ML inference is handled by MLflow Model Serving containers. The algo-worker calls REST endpoints via HTTP POST `/invocations`. Models are loaded from the MLflow Registry using `@champion` aliases.

| Endpoint               | Model(s)               | Details                                           |
| ---------------------- | ---------------------- | ------------------------------------------------- |
| `/tier0/invocations`   | XGBoost                | Fires once/day, @champion alias, ~2ms             |
| `/tier1/invocations`   | HMM + PatchTST         | Fires once/day, @champion aliases, ~8ms           |
| `/tier2/invocations`   | LightGBM + TFT + Mamba | Parallel calls every 60s, @champion aliases       |
| `/tier3/invocations`   | LiT Transformer        | High-frequency 100ms loop, @champion alias        |
| `/tier4/invocations`   | Meta-Learner           | Fuses all tier outputs every 60s, @champion alias |

See [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md) for full endpoint configuration and health checks.

---

## Layer Details

### Layer 1: Data Ingestion

Subscribe to `features:live` (from market-feeder) + read cached tier outputs from Redis.

See [01-DATA-INGESTION.md](./layers/01-DATA-INGESTION.md)

### Layer 2: Feature Engine

117 features computed by Rust compute-engine in <5ms (Rayon parallel, two-phase).

| Category           | Count | Examples                                         |
| ------------------ | ----- | ------------------------------------------------ |
| Index Breadth      | 8     | `pct_above_vwap`, `breadth_thrust`               |
| NIFTY Future       | 12    | `fut_rsi_14`, `fut_macd`, `fut_atr_pct`          |
| Options            | 14    | `atm_iv`, `pcr_oi`, `total_gex`, `iv_skew`       |
| Volatility         | 10    | `india_vix`, `realized_vol_5m`, `iv_rv_ratio`    |
| Order Flow         | 8     | `ofi_1s`, `depth_imbalance_5`, `trade_imbalance` |
| Price Structure    | 8     | `return_1m`, `return_5m`, `gap_open`             |
| Momentum           | 8     | `rsi_5`, `rsi_14`, `macd_histogram`, `adx_14`    |
| Time Context       | 13    | `minutes_from_open`, sin/cos encodings           |
| Global Macro       | 12    | `es_return`, `nq_return`, `dxy_change`           |
| Regime Context     | 4     | `regime_state` (one-hot from Tier 1 cache)       |
| Volume Profile     | 6     | `volume_ratio_5m`, `oi_change_pct_calls`         |
| Cross-Asset        | 4     | `nifty_banknifty_corr_20`, `futures_spot_basis`  |
| LOB Microstructure | 6     | `depth_imbalance_10`, `sweep_detection`          |
| Sentiment          | 4     | `finbert_sentiment`, `fii_flow_signal`           |

See [02-FEATURE-ENGINE.md](./layers/02-FEATURE-ENGINE.md)

### Layer 3: Prediction

5-tier hierarchical inference with Worker Threads and GPU acceleration.

See [03-PREDICTION.md](./layers/03-PREDICTION.md)

### Layer 4: Strategy & Risk

Regime-conditioned strategy selection from 7-strategy menu:

| Regime            | VOL_UP           | VOL_DOWN        | NEUTRAL                      |
| ----------------- | ---------------- | --------------- | ---------------------------- |
| **BULL_TRENDING** | LONG_CALL        | Skip            | BULL_CALL_SPREAD             |
| **BEAR_TRENDING** | Skip             | LONG_PUT        | BEAR_PUT_SPREAD              |
| **VOLATILE**      | BULL_CALL_SPREAD | BEAR_PUT_SPREAD | LONG_STRADDLE                |
| **RANGING**       | Skip             | Skip            | IRON_CONDOR / SHORT_STRANGLE |

See [04-STRATEGY-RISK.md](./layers/04-STRATEGY-RISK.md)

### Layer 5: Execution

Smart order routing (MARKET/TWAP/VWAP) + multi-criteria exit engine.

Exit priority: Stop Loss > Risk Breach > Trailing Stop > Take Profit > ML Signal > Time-Based

See [05-EXECUTION.md](./layers/05-EXECUTION.md)

### Layer 6: Observability

| Tier | Technology | Data                           | Retention      | Access |
| ---- | ---------- | ------------------------------ | -------------- | ------ |
| HOT  | Redis      | Positions, prices, tier caches | <5 min         | <1ms   |
| WARM | QuestDB    | Features, ticks, PnL           | 180 days       | <10ms  |
| COLD | MongoDB    | Orders, signals, audit trail   | 5 years (SEBI) | <100ms |

See [06-OBSERVABILITY.md](./layers/06-OBSERVABILITY.md)

---

## Design Principles

1. **Data-Bound Hierarchy**: Each tier's historical depth and data resolution determines its model architecture
2. **Compute Once, Cache, Reuse**: Daily models fire once and are cached. Minute models fire every 60s. Tier 4 only reads caches.
3. **HTTP-Based Inference**: MLflow serving endpoints handle compute; algo-worker stays non-blocking
4. **Event-Driven**: Redis Streams for inter-layer communication
5. **Rust Performance**: 117 features in <5ms via Rayon (compute-engine in market-feeder process)
6. **MLflow Registry**: Models versioned and promoted via @champion aliases; serving containers own GPU/CPU allocation
7. **SEBI Compliant**: Unique Algo ID, pre-trade risk checks, 5-year audit trail
8. **Fail-Safe**: Multi-layer circuit breakers, MLflow endpoint health checks, serving container restart on failure

---

## Performance Targets

| Metric                  | Target    | With GPU  | CPU-Only               |
| ----------------------- | --------- | --------- | ---------------------- |
| Data Ingestion          | <2ms      | 1ms       | 1ms                    |
| Feature Computation     | <5ms      | 3ms       | 3ms                    |
| ML Inference (Tier 2+4) | <25ms     | **16ms**  | 39ms                   |
| Strategy + Risk         | <10ms     | 8ms       | 8ms                    |
| Execution               | <20ms     | 15ms      | 15ms                   |
| **Total E2E**           | **<80ms** | **~43ms** | ~66ms                  |
| Tier 3 loop rate        | 10 Hz     | **10 Hz** | 5.5 Hz (misses target) |

---

## Related Documentation

- [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md) — MLflow Model Serving endpoints, health checks, @champion loading
- [VISUAL_FLOW.md](./VISUAL_FLOW.md) — ASCII flow diagrams
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — Directory layout
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) — Zero-allocation patterns
- [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Session timing
