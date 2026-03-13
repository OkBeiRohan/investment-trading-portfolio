# Model Pipeline Workflow: Session-by-Session Timing

> **Minute-by-minute specification of what the system does from midnight to market close, including every data collection event, model inference, and trading action.**

**Last Updated**: March 13, 2026
**Trading Hours**: NSE — 09:15 to 15:30 IST (Pre-open: 09:00–09:15)

---

## Executive Summary

The system operates across four distinct phases each trading day:

| Phase       | Time (IST)    | Duration | Primary Activity                        |
| ----------- | ------------- | -------- | --------------------------------------- |
| **Phase A** | 00:00 – 09:00 | 9 hours  | Overnight global data collection        |
| **Phase B** | 09:00 – 09:15 | 15 min   | Pre-open intelligence + Tier 0/1        |
| **Phase C** | 09:15 – 15:30 | 6h 15min | Live trading (Tiers 2/3/4 + Execution)  |
| **Phase D** | 15:30 – 23:59 | 8h 30min | EOD reconciliation + overnight training |

---

## Phase A: Overnight Global Data Collection (00:00 – 09:00 IST)

### Purpose

Continuously collect global market data while the Indian market is closed. This data feeds Tier 0's gap predictor and provides context for all downstream tiers.

### Data Sources Active

| Source            | Poll Interval | Data Collected                                       | Storage                      |
| ----------------- | ------------- | ---------------------------------------------------- | ---------------------------- |
| Yahoo Finance API | Every 5 min   | S&P 500 E-mini, Nasdaq E-mini, Nikkei 225, Hang Seng | QuestDB `global_market_data` |
| Yahoo Finance API | Every 5 min   | Brent crude, WTI, Gold, Silver                       | QuestDB `global_market_data` |
| Yahoo Finance API | Every 5 min   | USD/INR, EUR/INR, DXY (Dollar Index)                 | QuestDB `global_market_data` |
| Finnhub News API  | Every 15 min  | India-relevant headlines                             | MongoDB `news_raw`           |
| FinBERT Pipeline  | Every 15 min  | Sentiment scores for collected headlines             | Redis `sentiment:overnight`  |

### Timeline

```
00:00 ─────────────────────────────────────────────────── 09:00
  │                                                          │
  │  US Session Active (until ~01:30 IST)                   │
  │  ├── S&P 500, Nasdaq, VIX updating every 5 min          │
  │  ├── US Treasury yields captured at close                │
  │  └── US sector rotation data (XLF, XLK, XLE)            │
  │                                                          │
  │  01:30 IST: US markets close                             │
  │  ├── Final S&P 500 close captured                        │
  │  ├── Final VIX close captured                            │
  │  └── After-hours movers logged                           │
  │                                                          │
  │  05:30 IST: Asian markets open                           │
  │  ├── Nikkei 225 opens → track return vs prev close       │
  │  ├── Hang Seng opens → track return                      │
  │  └── SGX Nifty feed begins                               │
  │                                                          │
  │  08:00 IST: GIFT Nifty active session begins             │
  │  ├── 1-second tick data collection starts                │
  │  ├── Premium = GIFT Nifty LTP - prev NIFTY close        │
  │  └── Track: GIFT Nifty high, low, volume                 │
  │                                                          │
  │  08:45 IST: FinBERT final overnight sentiment            │
  │  ├── Aggregate all overnight headlines                   │
  │  └── Compute final sentiment score [-1, +1]              │
  │                                                          │
  09:00: Phase A ends → Phase B begins
```

### Data Volume Estimates

| Data Type              | Records/Night                      | Storage/Night |
| ---------------------- | ---------------------------------- | ------------- |
| Global price snapshots | ~1,000 (5-min intervals × sources) | ~200 KB       |
| GIFT Nifty ticks       | ~3,600 (1s × 1 hour)               | ~150 KB       |
| News headlines         | ~50-200                            | ~50 KB        |
| Sentiment scores       | ~10-15 aggregations                | ~5 KB         |

---

## Phase B: Pre-Open Intelligence (09:00 – 09:15 IST)

This is the most critical 15-minute window. Three sub-phases execute sequentially:

### Sub-Phase B1: Pre-Open Session (09:00 – 09:07:59)

**What Happens on NSE**: Participants place, modify, and cancel orders in the pre-open book. The indicative price fluctuates.

**What Our System Does**:

- Continue collecting global data (GIFT Nifty, Asia markets)
- **DO NOT** use pre-open order data (too unstable, manipulable)
- Monitor GIFT Nifty premium trend for directional clues
- FinBERT processes any breaking news from 09:00-09:07

```
09:00 ──────────────────────────────── 09:08
  │                                      │
  │  Global data collection continues    │
  │  ├── GIFT Nifty tick-by-tick         │
  │  ├── Asia market returns updating    │
  │  └── Currency/commodity updates      │
  │                                      │
  │  System is in STANDBY mode           │
  │  ├── All models pre-warmed           │
  │  ├── ONNX sessions loaded            │
  │  └── Redis connections verified      │
  │                                      │
  09:08: PRE-OPEN FREEZE
```

### Sub-Phase B2: Tier 0 Fires (09:08:00 – 09:08:30)

**Trigger**: NSE pre-open freeze at 09:08:00 — no more order modifications.

```
09:08:00 ── NSE FREEZE (exact)
09:08:05 ── TIER 0 INFERENCE
             │
             ├── Collect final features:
             │   ├── GIFT Nifty premium (from tick stream)
             │   ├── Latest global returns (S&P, Nasdaq, Nikkei, etc.)
             │   ├── Overnight sentiment score
             │   ├── 09:08 freeze indicative price
             │   ├── actual_gap_points = freeze_price - prev_close
             │   ├── prev_day_range, prev_day_close_vs_vwap
             │   └── [12 features total]
             │
             ├── XGBoost ONNX inference (~2ms)
             │   └── Output: expected_gap_pct, volatility, bias, confidence
             │
             ├── Publish to Redis: tier0:gap:{date}
             │   └── TTL: End of trading day
             │
             └── Emit event: Tier0PredictionEvent
                  └── Consumed by Tier 1 at 09:09

09:08:30 ── Tier 0 complete
```

### Sub-Phase B3: Tier 1 + Greeks Estimation (09:08:30 – 09:14:59)

Once we have the frozen indicative price, we can do significant work before the market opens:

```
09:08:30 ── BEGIN PRE-TRADE CALCULATIONS
             │
             ├── Synthetic Option Greeks:
             │   ├── Use frozen indicative price as underlying
             │   ├── Use previous day's ATM IV as vol estimate
             │   ├── Black-Scholes for all ATM ± 10 strikes
             │   └── Compute: delta, gamma, vega, theta, option prices
             │
             ├── IV Surface Estimation:
             │   ├── Interpolate from previous day's IV surface
             │   ├── Shift by gap magnitude (parallel shift + skew adjust)
             │   └── Store preliminary IV surface in Redis
             │
             └── Portfolio Risk Check:
                  ├── Mark-to-market existing positions with new IVs
                  ├── Recalculate portfolio Greeks
                  └── Pre-validate risk limits for opening trades

09:09:00 ── TIER 1 INFERENCE
             │
             ├── Collect features (32 total):
             │   ├── 26-year daily data (returns, SMAs, volatility, breadth)
             │   ├── Tier 0 output (3 features: gap_pct, volatility, bias)
             │   ├── Global macro (4 features from overnight)
             │   └── Seasonality (3 features: month, day_of_week, DTE)
             │
             ├── HMM regime classification (~3ms)
             │   └── Output: BULL_TRENDING | BEAR_TRENDING | VOLATILE | RANGING
             │
             ├── PatchTST daily trend prediction (~5ms)
             │   └── Output: daily_direction, daily_magnitude
             │
             ├── Publish to Redis: tier1:regime:{date}
             │   └── TTL: End of trading day
             │
             └── Emit event: Tier1RegimeEvent
                  └── Consumed by Tier 2 and Tier 4 throughout the day

09:14:55 ── BUILD OVERNIGHT CANDLE
             │
             ├── Consolidate all Phase A + B data:
             │   ├── GIFT Nifty OHLCV (synthetic overnight candle)
             │   ├── Global context (US, Asia, commodities, currency)
             │   ├── Tier 0 predictions
             │   └── Synthetic Greeks
             │
             ├── Publish to Redis: tier0:overnight_candle:{date}
             │
             └── This provides Tier 2 with a "warm start" at 09:15
                  (first minute has immediate context, not cold start)

09:15:00 ── MARKET OPENS → Phase C begins
```

### Why 09:14:55 for the Overnight Candle?

The overnight candle must be ready **before** the first live tick arrives at 09:15:00. Publishing at 09:14:55 gives:

- 5 seconds buffer for Redis propagation
- Tier 2's first inference at 09:16:00 (first full 1-min candle) will have the overnight context
- Without this, the first ~2 minutes of trading would be "blind" to overnight information

---

## Phase C: Live Trading (09:15 – 15:30 IST)

### First 5 Minutes (09:15 – 09:20): Opening Volatility

The first 5 minutes see the highest volatility and widest spreads. The system operates conservatively:

```
09:15:00 ── MARKET OPENS
             │
             ├── market-feeder receives first ticks
             │   ├── Subscribe: NIFTY futures, 50 constituents, option chain, VIX
             │   └── Data starts flowing to QuestDB + Redis
             │
             ├── Tier 3 activates (every 100ms)
             │   ├── Order book depth starts populating
             │   └── OFI features begin computing
             │
             ├── CAUTION MODE ACTIVE (first 5 min):
             │   ├── Wider stop losses (2x normal)
             │   ├── Reduced position size (50% max)
             │   ├── Skip trades below 0.85 confidence (vs 0.70 normal)
             │   └── Rationale: Spreads are wide, LOB is thin, price discovery in progress
             │
09:16:00 ── FIRST FULL 1-MIN CANDLE COMPLETE
             │
             ├── compute-engine fires (~3ms):
             │   ├── Computes 117 features from first candle
             │   ├── Uses overnight candle as historical context
             │   └── Publishes to Redis: features:live
             │
             ├── Tier 2 first inference (~45ms):
             │   ├── LightGBM + TFT + Mamba (parallel)
             │   ├── Features augmented with Tier 0/1 context
             │   └── First P(up), P(down), P(flat) for 5m/15m/30m
             │
             └── Tier 4 Meta-Learner first run:
                  ├── Fuses Tier 0 + 1 + 2 + 3 outputs
                  ├── Heavily weights Tier 0/1 (limited live data)
                  └── Publishes: final signal + confidence

09:20:00 ── NORMAL MODE ACTIVATED
             ├── Full position sizing enabled
             ├── Standard confidence threshold (0.70)
             └── All strategies unlocked
```

### Steady State (09:20 – 15:00): Continuous Trading Loop

Every 60 seconds, the following pipeline executes:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     60-SECOND TRADING LOOP                               │
│                                                                          │
│  T+0ms:    market-feeder emits CandleComplete event                     │
│  T+1ms:    compute-engine receives candle + option chain + depth         │
│  T+3ms:    117 features computed (parallel via Rayon)                    │
│  T+5ms:    Features published to Redis features:live                     │
│  T+6ms:    algo-worker receives features                                │
│                                                                          │
│  T+8ms:    ┌── Tier 2 (parallel, ~40ms) ─────────────────────┐         │
│            │  LightGBM: 80+ features → P(up/down/flat)   20ms│         │
│            │  TFT: 80×120 sequence → quantile forecasts  35ms│         │
│            │  Mamba: 80×120 sequence → direction probs    25ms│         │
│            └──────────────────────────────────────────────────┘         │
│                                                                          │
│  T+10ms:   Tier 3 reads latest (updates every 100ms independently)      │
│            └── LiT: 14 features → buy/sell pressure                     │
│                                                                          │
│  T+48ms:   Tier 4 Meta-Learner fires (~2ms)                             │
│            ├── Input: Tier 0 (cached) + Tier 1 (cached) +               │
│            │         Tier 2 (fresh) + Tier 3 (latest)                   │
│            ├── Regime-adaptive weighting                                │
│            └── Output: final_signal, confidence, position_action        │
│                                                                          │
│  T+50ms:   Strategy & Risk Layer (~8ms)                                  │
│            ├── Map signal to strategy (LONG_CALL, STRADDLE, etc.)       │
│            ├── Select optimal strike (delta-based)                       │
│            ├── Position sizing (Kelly / fixed / RL-based)               │
│            └── Risk validation (Greeks, max loss, leverage)              │
│                                                                          │
│  T+58ms:   Execution Layer (~15ms)                                       │
│            ├── If valid signal: place order via Upstox API              │
│            ├── If PPO agent enabled: optimize limit price               │
│            └── Log + audit trail (MongoDB + QuestDB)                    │
│                                                                          │
│  T+73ms:   CYCLE COMPLETE (within <80ms target)                          │
│                                                                          │
│  Meanwhile (continuous, async):                                          │
│  ├── Position tracker updates PnL every tick                            │
│  ├── Exit engine monitors stop-loss, trailing stop, take-profit         │
│  ├── Circuit breaker monitors drawdown, latency, data staleness         │
│  └── Prometheus exports latency metrics                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tier 3 Independent Loop (Every 100ms)

Tier 3 runs on its own high-frequency loop, independent of the 60-second cycle:

```
Every 100ms:
  ├── Read latest Depth-30 LOB snapshot from Redis
  ├── Compute 14 order-flow features:
  │   ├── OFI (1s, 5s, 30s) — Order Flow Imbalance
  │   ├── Depth imbalance (5-level, 10-level)
  │   ├── Trade imbalance, volume at bid %
  │   ├── Bid/ask slope, spread normalized
  │   └── Sweep detection, cancellation rate
  ├── LiT Transformer inference (~8ms)
  │   └── Output: buy_pressure [0,1], sell_pressure [0,1], slippage_estimate
  └── Publish to Redis: tier3:microstructure:{timestamp}
      └── Latest value consumed by Meta-Learner in next 60-second cycle
```

### Exit Monitoring (Continuous, Tick-Level)

```
On every tick (for instruments with open positions):
  │
  ├── Priority 1 (CRITICAL):
  │   ├── Stop loss check → immediate market exit
  │   └── Risk breach check → liquidate position
  │
  ├── Priority 2 (HIGH):
  │   ├── Trailing stop update + check
  │   └── Daily drawdown circuit breaker
  │
  ├── Priority 3 (MEDIUM):
  │   ├── Take profit check
  │   └── Greeks limit monitoring (delta, gamma, theta, vega)
  │
  └── Priority 4 (LOW, every 60s):
      ├── ML-based exit signal (Tier 2 reversal prediction)
      └── Time-based exit check (3:20 PM auto-close for intraday)
```

### Special Time Events During Phase C

| Time (IST)        | Event                    | System Action                                     |
| ----------------- | ------------------------ | ------------------------------------------------- |
| 09:15:00          | Market opens             | Caution mode (5 min)                              |
| 09:20:00          | First 5 min complete     | Normal mode activated                             |
| 11:30:00          | Mid-morning lull typical | Reduce signal sensitivity (less noise)            |
| 13:00:00-13:30:00 | Lunch hour (low volume)  | Tighten stops, reduce position sizing             |
| 14:30:00          | Last hour begins         | Re-enable full sensitivity                        |
| 15:00:00          | Final 30 minutes         | No new positions; exit-only mode activated        |
| 15:10:00          | 20 minutes to close      | Aggressive trailing stops on all positions        |
| 15:20:00          | **Hard close deadline**  | Begin market-order exit of all intraday positions |
| 15:30:00          | Market closes            | All intraday positions must be flat               |

---

## Phase D: Post-Market & Overnight (15:30 – 23:59 IST)

### Immediate Post-Market (15:30 – 16:00)

```
15:30:00 ── MARKET CLOSES
             │
             ├── Verify all intraday positions are closed
             │   └── If any remain: ALERT + force-close in after-hours
             │
             ├── EOD Reconciliation:
             │   ├── Match all orders vs broker fills
             │   ├── Calculate realized PnL per trade
             │   ├── Update portfolio state in MongoDB
             │   └── Log daily performance to QuestDB
             │
             ├── Daily Metrics:
             │   ├── Total PnL, Sharpe (rolling), win rate
             │   ├── Model accuracy vs realized (per tier)
             │   ├── Latency percentiles (p50/p95/p99)
             │   └── Circuit breaker trigger count
             │
             └── Publish: daily_summary to Redis + Slack notification
```

### Nightly Training Pipeline (18:00 – 06:00 IST)

```
18:00:00 ── TRAINING PIPELINE TRIGGERS
             │
             ├── Data Pipeline:
             │   ├── Fetch missing candles from Upstox HTTP API
             │   ├── Compute historical features for new data (compute-engine batch mode)
             │   └── Store in QuestDB instrument_features_1m
             │
             ├── Model Retraining (if scheduled):
             │   ├── Tier 0: Weekly (small dataset, fast training)
             │   ├── Tier 1: Weekly (daily data, moderate training)
             │   ├── Tier 2 LightGBM: Weekly (incremental, ~30min)
             │   ├── Tier 2 TFT: Monthly (full retrain, ~4hr on RTX 3050)
             │   ├── Tier 2 Mamba: Monthly (full retrain, ~3hr)
             │   ├── Tier 3 LiT: Monthly (needs sufficient LOB history)
             │   └── Tier 4 Meta-Learner: Weekly (fast, uses OOF predictions)
             │
             ├── Validation (every retrain):
             │   ├── CPCV with purge_gap=60, embargo_gap=30
             │   ├── Quality gate: reject if sharpe_p5 < 1.0
             │   └── Compare new vs current model on held-out data
             │
             ├── ONNX Export (if model promoted):
             │   ├── PyTorch → ONNX with FP16 quantization
             │   ├── Validate ONNX output matches original (atol=1e-4)
             │   └── Deploy to apps/algo-worker/models/
             │
             └── Drift Detection:
                  ├── ADWIN for feature distribution shifts
                  ├── Model accuracy vs 7-day rolling baseline
                  └── Alert if drift detected (Slack + PagerDuty)
```

---

## Complete Daily Timeline (Visual)

```
IST   PHASE     TIERS          DATA EVENTS              TRADING
──────────────────────────────────────────────────────────────────
00:00  A        —              Global polling (5min)     No trading
01:30  A        —              US close captured          │
05:30  A        —              Asia open captured         │
08:00  A        —              GIFT Nifty tick stream     │
                                                          │
09:00  B1       —              Pre-open session starts    │ STANDBY
09:08  B2       TIER 0 ═══╗   NSE FREEZE → gap predict  │
09:09  B3       TIER 1 ═══╣   HMM + PatchTST regime     │
09:08-          Greeks ═══╝   Synthetic Greeks compute   │
09:14                          Overnight candle built     │
09:15  C        TIER 3 ─╮─╮   MARKET OPENS              │ CAUTION MODE
09:16  C        TIER 2 ─┤ │   First candle → 117 feat   │
09:16  C        TIER 4 ─┘ │   Meta-learner first run    ├─First signals
09:20  C        ALL ·······│   Normal mode activated     ├─Full trading
              100ms loop──┘                              │
              60s  loop────── Continuous 60s cycle        ├─Steady state
              tick loop────── Exit monitoring             │
                                                          │
11:30  C        ALL            Mid-morning (lower vol)   ├─Reduced sens.
13:00  C        ALL            Lunch hour (low volume)   ├─Tight stops
14:30  C        ALL            Final hour begins         ├─Re-enabled
15:00  C        ALL            Exit-only mode            ├─No new pos.
15:20  C        —              Hard close deadline        ├─Force exits
15:30  D        —              MARKET CLOSES              │ RECONCILE
                                                          │
16:00  D        —              EOD reconciliation done    │
18:00  D        —              Training pipeline starts   │ OFFLINE
06:00  D→A      —              Training complete          │
```

---

## Key Design Decisions

### Why One Overnight Candle at 09:14:55?

**Problem**: Tiers 1-4 need historical context. At 09:15:00 (market open), there's a 17-hour gap in NIFTY data. Without bridging this gap, the first few minutes of trading are effectively "blind."

**Solution**: At 09:14:55, we synthesize a single OHLCV candle from the overnight GIFT Nifty activity plus all global market data. This candle:

1. Provides continuity for the rolling window (EMA, RSI, ATR computations don't "reset")
2. Encodes the overnight information shock (gap magnitude, global sentiment)
3. Gives Tier 2's first inference a warm start instead of cold-starting from zero context

**Why not earlier?** We wait until 09:14:55 to capture the maximum possible information (including Tier 0 predictions and synthetic Greeks). Publishing earlier would miss late-breaking data.

### Why Tier 3 Runs Independently at 100ms?

**Problem**: Microstructure signals (order flow, depth imbalance) change 10x faster than macro signals. Running them at 60-second intervals would miss actionable edges.

**Solution**: Tier 3 has its own 100ms loop. The Meta-Learner (Tier 4) simply reads the "latest available" Tier 3 output from Redis at each 60-second cycle.

**Trade off**: More compute (100ms loop = 10 inferences/second), but LiT inference is only ~8ms so this is feasible.

### Why Caution Mode for First 5 Minutes?

NSE opening auction creates artificial volatility:

- Bid-ask spreads are 3-5x wider than steady state
- Order book depth is thin (market makers haven't fully deployed)
- The gap between equilibrium price and first trades creates noise
- Historical data shows models have 15-20% lower accuracy in first 5 minutes

---

## Related Documentation

- [TIER0_MODELS.md](./TIER0_MODELS.md) — Pre-Market Gap Predictor detail
- [TIER1_MODELS.md](./TIER1_MODELS.md) — Macro Director detail
- [TIER2_MODELS.md](./TIER2_MODELS.md) — Intraday Navigator detail
- [TIER3_MODELS.md](./TIER3_MODELS.md) — Microstructure Scalper detail
- [TIER4_MODELS.md](./TIER4_MODELS.md) — Meta-Learner & Strategy detail
- [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) — 5-Tier overview
- [AI_TRADING_ARCHITECTURE.md](./AI_TRADING_ARCHITECTURE.md) — Full AI architecture
