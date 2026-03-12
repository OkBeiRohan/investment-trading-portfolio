# Algo Worker - 6-Layer Architecture

**Version**: 2026 Institutional-Grade  
**Target Latency**: <80ms End-to-End  
**Features**: 54 (Rust compute-engine)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ALGO-WORKER 6-LAYER ARCHITECTURE                        │
│                           Target: <80ms E2E                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: DATA INGESTION (<5ms)                                         │ │
│  │ market-feeder → Redis Pub/Sub → algo-worker                           │ │
│  │ Components: MarketDataConsumer, NewsConsumer, EventNormalizer          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: FEATURE ENGINE (<5ms)                                         │ │
│  │ Rust compute-engine (NAPI-RS) with Rayon parallelism                  │ │
│  │ 117 features: Breadth(8) + Futures(12) + Options(14) + Vol(6) +        │ │
│  │              OrderFlow(8) + Time(6)                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 3: PREDICTION (<50ms)                                            │ │
│  │ ONNX Runtime ensemble inference + regime detection                     │ │
│  │ Models: LightGBM (46f) + LiT (14f) + TFT (seq) + Meta-Learner         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 4: STRATEGY & RISK (<10ms)                                       │ │
│  │ Regime-based strategy selection + pre-trade risk validation           │ │
│  │ Components: StrategySelector, StrikeSelector, RiskValidator            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 5: EXECUTION (<20ms)                                             │ │
│  │ Smart order routing + position management + exit logic                 │ │
│  │ Components: OrderManager, PositionTracker, ExitEngine                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      ↓                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 6: OBSERVABILITY (Async)                                         │ │
│  │ Metrics, logging, storage, SEBI audit trail                           │ │
│  │ Storage: Redis (hot) → QuestDB (warm) → MongoDB (cold, 5yr)           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Summary

| Layer | Purpose | Components | Target |
|-------|---------|------------|--------|
| **1. Data Ingestion** | Market data subscription | MarketDataConsumer, NewsConsumer | <5ms |
| **2. Feature Engine** | 117 features via Rust | compute-engine (NAPI-RS), FeatureCache | <5ms |
| **3. Prediction** | ONNX ensemble inference | ModelPool, InferenceWorkers, RegimeDetector | <50ms |
| **4. Strategy & Risk** | Strategy selection + risk | StrategySelector, RiskValidator | <10ms |
| **5. Execution** | Order routing + positions | OrderManager, PositionTracker, ExitEngine | <20ms |
| **6. Observability** | Metrics + persistence | Prometheus, QuestDB, MongoDB | Async |

**Total E2E**: <80ms (p95)

---

## Layer 1: Data Ingestion

**Purpose**: Subscribe to market data from Redis Streams

**Data Sources**:
- NIFTY/BANKNIFTY futures (OHLCV + LOB 20-level)
- 50 constituents (OHLCV + basic depth)
- Option chain (Greeks, OI, prices)
- India VIX

**Event Output**: `MarketDataReceivedEvent`

See [01-DATA-INGESTION.md](./layers/01-DATA-INGESTION.md)

---

## Layer 2: Feature Engine

**Purpose**: Compute 117 features in parallel using Rust

**Technology**: 
- Rust + NAPI-RS for Node.js integration
- Rayon for parallel computation
- Two-phase architecture (dependencies → features)

**Feature Categories** (54 total):

| Category | Count | Examples |
|----------|-------|----------|
| Index Breadth | 8 | `pct_stocks_above_vwap`, `breadth_thrust` |
| NIFTY Future | 12 | `fut_rsi_14`, `fut_macd_signal` |
| Options | 14 | `atm_iv`, `pcr_oi`, `total_gamma_exposure` |
| Volatility | 6 | `india_vix`, `iv_rv_ratio` |
| Order Flow | 8 | `ofi_1s`, `depth_imbalance_5` |
| Time Context | 6 | `minutes_from_open`, `is_expiry_day` |

**Event Output**: `FeaturesComputedEvent`

See [02-FEATURE-ENGINE.md](./layers/02-FEATURE-ENGINE.md)

---

## Layer 3: Prediction

**Purpose**: Multi-model ONNX inference + regime detection

**Models**:

| Model | Features | Purpose | Latency |
|-------|----------|---------|---------|
| LightGBM | 46 | Macro direction (5-15min) | ~20ms |
| LiT | 14 (Order Flow) | Microstructure (10s-1min) | ~8ms |
| TFT | 46 × 120 | Regime + volatility | ~35ms |
| Meta-Learner | 3 | Adaptive fusion | ~2ms |

**Regime Types**:
- `TRENDING` → Trust LightGBM
- `VOLATILE` → Trust LiT
- `RANGING` → Balanced weights
- `LOW_VOLATILITY` → Trust TFT

**Event Output**: `TradingSignalEvent`

See [03-PREDICTION.md](./layers/03-PREDICTION.md)

---

## Layer 4: Strategy & Risk

**Purpose**: Strategy selection + pre-trade risk validation

**Strategy Matrix**:

| Regime | VOL_UP | VOL_DOWN | NEUTRAL |
|--------|--------|----------|---------|
| TRENDING | LONG_CALL | LONG_PUT | Skip |
| VOLATILE | BULL_CALL_SPREAD | BEAR_PUT_SPREAD | LONG_STRADDLE |
| RANGING | Skip | Skip | IRON_CONDOR |

**Risk Checks**:
- Position limits
- Greeks limits (delta, gamma, theta, vega)
- Daily loss limit
- Leverage limit

**Circuit Breakers**:
- Data staleness >5s
- Latency >150ms
- Daily drawdown >5%

**Event Output**: `ValidatedOrderEvent`

See [04-STRATEGY-RISK.md](./layers/04-STRATEGY-RISK.md)

---

## Layer 5: Execution

**Purpose**: Order routing + position management + exits

**Order Types**:
- `MARKET` - Immediate fill
- `TWAP` - Time-weighted average
- `VWAP` - Volume-weighted average

**Exit Criteria** (priority order):
1. Stop loss (HIGH)
2. Risk breach (HIGH)
3. Trailing stop (MEDIUM)
4. Take profit (MEDIUM)
5. ML signal (LOW)
6. Time-based (LOW)

**Event Output**: `OrderFilledEvent`, `PositionClosedEvent`

See [05-EXECUTION.md](./layers/05-EXECUTION.md)

---

## Layer 6: Observability

**Purpose**: Metrics, logging, persistence

**Storage Tiers**:

| Tier | Technology | Data | Retention |
|------|------------|------|-----------|
| HOT | Redis | Positions, prices | <5 min |
| WARM | QuestDB | Features, ticks | 180 days |
| COLD | MongoDB | Orders, signals, audit | 5 years |

**Metrics** (Prometheus):
- `algo_e2e_latency_ms` - End-to-end latency
- `algo_inference_duration_ms` - Per-model inference
- `algo_signals_total` - Signal counts
- `algo_daily_pnl` - PnL tracking

See [06-OBSERVABILITY.md](./layers/06-OBSERVABILITY.md)

---

## Design Principles

1. **Event-Driven**: Redis Streams for all inter-layer communication
2. **Rust Performance**: 117 features in <5ms via Rayon
3. **Multi-Model**: Ensemble with adaptive regime-based weighting
4. **User-Configurable**: Per-user permissions, limits, strategies
5. **SEBI Compliant**: Unique Algo ID, 5-year audit trail
6. **Fail-Safe**: Multi-layer circuit breakers

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Data Ingestion | <5ms | ✅ |
| Feature Computation | <5ms | ✅ |
| ML Inference | <50ms | ✅ |
| Strategy + Risk | <10ms | 🔄 |
| Execution | <20ms | 🔄 |
| **Total E2E** | **<80ms** | 🎯 |

---

## Related Documentation

- [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md) - Detailed inference pipeline
- [VISUAL_FLOW.md](./VISUAL_FLOW.md) - ASCII flow diagrams
- [FEATURE_SPECIFICATION.md](../../docs/ml/FEATURE_SPECIFICATION.md) - 117 features

---

**Last Updated**: January 18, 2026
