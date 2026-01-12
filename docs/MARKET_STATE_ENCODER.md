# Market State Encoder (MSE) - The Data-Model Interface

> **The missing piece that turns 1000s of signals into actionable intelligence**

**Last Updated**: January 13, 2026  
**Status**: Core Architecture Component  
**Related**: [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md), [HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md](./HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md)

---

## Executive Summary

### The Core Problem

**Raw Reality**:

- 50+ NIFTY constituents × OHLCV + depth-20 LOB = ~40,000 numbers/second
- NIFTY FUTURE LOB depth-20 × 2 sides = 80 numbers
- Option chain (50 strikes) × Greeks + OI = 300+ numbers
- **TOTAL**: ~50,000+ signals/second

**Model Reality**:

- LightGBM: needs 33 features
- TFT: needs (T×F) time-series
- LiT: needs (T×80) LOB tensor
- **TOTAL**: ~200-500 numbers

### The Fatal Mistake Most Systems Make

```typescript
// ❌ WRONG: Passing raw data to models
for (const stock of nifty50Constituents) {
  const prediction = model.predict(stock.ohlcv); // Chaos!
}
```

**Why this fails**:

- 🔴 Models see uncorrelated noise from individual stocks
- 🔴 No market-wide context (breadth, alignment, flow)
- 🔴 Impossible to backtest (which stock's signal was used?)
- 🔴 Conflicting signals average out edge

### The Correct Approach

```typescript
// ✅ CORRECT: Market State Encoder compresses reality
const marketState = encoder.encode({
  futures: futuresData,
  constituents: nifty50Data,
  options: optionChainData,
});

const prediction = lightgbm.predict(marketState.lightgbm_features); // Clean!
```

**Why this works**:

- ✅ Models see **aggregated, contextualized state**
- ✅ Clear separation: encoder handles complexity, models handle prediction
- ✅ Reproducible: same state → same prediction
- ✅ Testable: can replay exact states from production

---

## The Key Insight (Memorize This)

> **Models NEVER see "many instruments".  
> Models see a SINGLE, AGGREGATED, CONTEXTUALIZED STATE.**

> **Intelligence comes from compression, not ingestion.**

This is how professional quant firms (Citadel, Jump, Renaissance) handle multi-instrument data.

---

## Where MSE Lives in the Architecture

### Current Layer Structure

```
┌─────────────────────────────────────────────┐
│ Layer 1: Perception (Data Ingestion)       │
│   ├─ NIFTY FUTURE (OHLCV + LOB depth-20)   │
│   ├─ 50 Constituents (OHLCV + LOB)         │
│   ├─ Option Chain (Greeks + OI + LOB)      │
│   └─ News/Events                            │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Cortex (Feature Engineering)      │
│   ├─ FeatureCacheService (sliding windows) │
│   ├─ TechnicalIndicatorService             │
│   ├─ OptionFeatureService (Greeks)         │
│   └─ 🧠 MarketStateEncoder (NEW/FORMALIZED)│ ← THIS IS THE KEY
│        ├─ Index Aggregator                  │
│        ├─ Breadth Computer                  │
│        ├─ Alignment Scorer                  │
│        ├─ LOB Tensor Builder                │
│        ├─ Regime Feature Builder            │
│        └─ Execution State Builder           │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 4: Prediction (Multi-Scale Models)   │
│   ├─ LightGBM (macro features)             │
│   ├─ TFT (regime time-series)              │
│   ├─ LiT (futures LOB tensor)              │
│   └─ Meta-Learner (contextual gating)      │
└─────────────────────────────────────────────┘
```

### Key Responsibility Separation

| Component        | Responsibility                                 | Does NOT Do            |
| ---------------- | ---------------------------------------------- | ---------------------- |
| **Perception**   | Raw data ingestion, normalization              | ❌ Feature computation |
| **Cortex (MSE)** | Aggregation, compression, model-specific views | ❌ Prediction          |
| **Prediction**   | Forecasting from encoded states                | ❌ Data fetching       |

---

## The Correct Market Data Truth for NIFTY Options Trading

### Understanding Price Discovery

> **NIFTY SPOT is the scoreboard.  
> Futures are the battlefield.  
> Constituents are the soldiers.  
> Options are leveraged bets on the outcome.**

#### ❌ Wrong Mental Model

"NIFTY spot drives everything" → Subscribe to NIFTY spot index only

**Why this fails**:

- NIFTY spot has NO volume, NO order book, NO aggression
- It's a calculated number, not a traded instrument
- You can't see WHO is buying/selling or WHY

#### ✅ Correct Mental Model

"Price discovery happens across futures + constituents, options react"

**This means**:

1. **NIFTY FUTURE** = Primary price discovery engine (institutions trade here)
2. **50 Constituents** = Distributed confirmation (breadth, alignment)
3. **Option Chain** = Derivative feedback loop (hedging, positioning)

### Required Live Subscriptions

#### 🔹 Mandatory (Always On)

| Instrument             | Data Required                                  | Frequency | Why Critical                                    |
| ---------------------- | ---------------------------------------------- | --------- | ----------------------------------------------- |
| **NIFTY FUTURE**       | OHLCV + LOB depth-20 + trades                  | 1s ticks  | Primary price discovery, microstructure signals |
| **NIFTY Option Chain** | LTP, IV, Greeks, OI, volume, LOB (ATM strikes) | 1s        | Premium pricing, positioning, hedging flow      |

#### 🔹 Highly Recommended (Index Validation)

| Instrument                | Data Required               | Frequency | Why Important                                              |
| ------------------------- | --------------------------- | --------- | ---------------------------------------------------------- |
| **50 NIFTY Constituents** | OHLCV, volume, market depth | 1s        | Breadth analysis, false move detection, sectoral alignment |

**Total subscriptions**: 1 (future) + 50 (stocks) + ~10 (active option strikes) = **~60 instruments**

### Why 50 Constituents Are NOT Optional

**Scenario**: NIFTY FUTURE spikes +50 points in 30 seconds

Without constituents:

```
❌ You see: Futures spiking → Enter LONG CALL
❌ Reality: Reliance, HDFC, ICICI are FLAT or SELLING
❌ Outcome: False breakout, premium collapses, you lose
```

With constituents:

```
✅ You see: Futures spiking BUT breadth is 12/50 advancing
✅ Signal: Index Aggregator flags "LOW PARTICIPATION"
✅ Decision: LightGBM receives breadth=0.24 → outputs NEUTRAL
✅ Outcome: Avoid false entry, capital preserved
```

**Professional desks filter ~40% of false signals using breadth analysis.**

---

## Market State Encoder Architecture

### Component Overview

```typescript
@Injectable()
export class MarketStateEncoder {
  constructor(
    private readonly indexAggregator: IndexAggregator,
    private readonly breadthComputer: BreadthComputer,
    private readonly alignmentScorer: AlignmentScorer,
    private readonly lobTensorBuilder: LOBTensorBuilder,
    private readonly regimeFeatureBuilder: RegimeFeatureBuilder,
    private readonly executionStateBuilder: ExecutionStateBuilder,
    private readonly featureCache: FeatureCacheService
  ) {}

  /**
   * Encode current market reality into model-specific views
   * Called after every market data update (1s frequency)
   */
  async encode(rawData: RawMarketData): Promise<EncodedMarketState> {
    // 1. Update internal caches (sliding windows, indicators)
    await this.updateCaches(rawData);

    // 2. Build model-specific views in parallel
    const [lightgbmFeatures, tftFeatures, litTensor, executionState] =
      await Promise.all([
        this.buildLightGBMFeatures(),
        this.buildTFTFeatures(),
        this.buildLiTTensor(),
        this.buildExecutionState(),
      ]);

    // 3. Emit model-specific events
    this.eventBus.publish(
      new LightGBMStateReadyEvent({
        timestamp: Date.now(),
        features: lightgbmFeatures,
      })
    );

    this.eventBus.publish(
      new TFTStateReadyEvent({
        timestamp: Date.now(),
        features: tftFeatures,
      })
    );

    this.eventBus.publish(
      new LiTStateReadyEvent({
        timestamp: Date.now(),
        tensor: litTensor,
      })
    );

    return {
      timestamp: Date.now(),
      lightgbm: lightgbmFeatures,
      tft: tftFeatures,
      lit: litTensor,
      execution: executionState,
    };
  }
}
```

---

## Model-Specific Encoding Logic

### 1️⃣ LightGBM — "Macro + Options State Model"

**Purpose**: Aggregate 50,000+ signals → 33 numbers representing market-wide state

#### ❌ What LightGBM Does NOT See

- Individual stock LOBs (too noisy)
- Per-stock raw OHLC (uncorrelated)
- Tick-by-tick futures LOB (too high-frequency for 5-15min decisions)

#### ✅ What LightGBM DOES See

**A single feature vector representing**:

> "What is the **aggregate state of the index ecosystem** right now?"

---

#### Input Construction (33 Features)

```typescript
class LightGBMFeatureBuilder {
  async buildFeatures(): Promise<Float32Array> {
    const features = new Float32Array(33);
    let idx = 0;

    // ═══════════════════════════════════════════════
    // GROUP 1: Index-Level Aggregation (10 features)
    // ═══════════════════════════════════════════════
    // From 50 constituents → collapse to 10 numbers

    const breadth = await this.breadthComputer.compute();
    features[idx++] = breadth.pct_stocks_above_vwap; // 0.0-1.0
    features[idx++] = breadth.pct_stocks_trending_up; // 0.0-1.0
    features[idx++] = breadth.advance_decline_ratio; // e.g., 1.5 (30 up, 20 down)
    features[idx++] = breadth.weighted_return_top_10; // Top 10 weighted constituents
    features[idx++] = breadth.sector_alignment_score; // 0.0-1.0 (sectoral cohesion)

    const alignment = await this.alignmentScorer.compute();
    features[idx++] = alignment.correlation_to_leader; // Correlation to Reliance
    features[idx++] = alignment.divergence_score; // Index vs constituents
    features[idx++] = alignment.participation_index; // Volume participation

    const structure = await this.indexAggregator.compute();
    features[idx++] = structure.intraday_range_position; // 0.0-1.0 (where in range?)
    features[idx++] = structure.overnight_gap; // Gap from previous close

    // ═══════════════════════════════════════════════
    // GROUP 2: Futures-Derived Features (8 features)
    // ═══════════════════════════════════════════════
    // From NIFTY FUTURE only

    const fut = this.featureCache.get("NIFTY_FUT");
    features[idx++] = fut.price_vs_vwap; // Normalized (-1 to +1)
    features[idx++] = fut.range_position; // 0.0-1.0 (where in daily range?)
    features[idx++] = fut.atr_normalized; // Current ATR / 20-day avg ATR
    features[idx++] = fut.momentum_5min; // 5-min ROC
    features[idx++] = fut.momentum_15min; // 15-min ROC
    features[idx++] = fut.rsi_14; // RSI(14)
    features[idx++] = fut.volume_vs_avg; // Current vol / avg vol
    features[idx++] = fut.basis; // Future - Spot (carry)

    // ═══════════════════════════════════════════════
    // GROUP 3: Options-Derived Features (10 features)
    // ═══════════════════════════════════════════════
    // From option chain

    const opts = await this.optionFeatureService.compute();
    features[idx++] = opts.atm_iv; // ATM implied vol
    features[idx++] = opts.iv_change_5min; // ΔIV last 5min
    features[idx++] = opts.iv_rank; // IV percentile (0-1)
    features[idx++] = opts.put_call_ratio_oi; // PCR based on OI
    features[idx++] = opts.put_call_ratio_volume; // PCR based on volume
    features[idx++] = opts.max_pain_distance; // Current price vs max pain
    features[idx++] = opts.gamma_atm; // ATM gamma
    features[idx++] = opts.delta_weighted_oi; // Net delta exposure
    features[idx++] = opts.skew; // IV skew (OTM put - OTM call)
    features[idx++] = opts.term_structure; // Near IV - Far IV

    // ═══════════════════════════════════════════════
    // GROUP 4: Time Context (5 features)
    // ═══════════════════════════════════════════════

    const time = this.timeContext.compute();
    features[idx++] = time.minutes_from_open; // 0-375 (9:15 AM - 3:30 PM)
    features[idx++] = time.minutes_to_close; // 375-0
    features[idx++] = time.is_first_hour; // 1 or 0 (high volatility period)
    features[idx++] = time.is_last_hour; // 1 or 0 (expiry/settlement effects)
    features[idx++] = time.days_to_expiry; // 0-30 (theta decay acceleration)

    // Total: 10 + 8 + 10 + 5 = 33 features ✓
    return features;
  }
}
```

#### Key Design Principles

1. **Aggregation over raw data**: 50 stocks → 10 breadth metrics
2. **Normalization**: All features scaled to comparable ranges
3. **Orthogonality**: Each group captures different information
4. **Temporal stability**: Features don't flip rapidly (5min+ horizons)

---

### 2️⃣ TFT — "Regime & Volatility Model"

**Purpose**: Provide temporal context for regime classification and multi-horizon forecasting

#### ❌ What TFT Does NOT See

- Individual stock time-series (too high-dimensional)
- Raw LOBs (not relevant for 5min-EOD forecasts)

#### ✅ What TFT DOES See

**Aggregated time-series features stacked over time**:

```
Input shape: (T, F)  where T=120 (2 hours of 1-min bars), F=15
```

---

#### Input Construction

```typescript
class TFTFeatureBuilder {
  async buildFeatures(lookback: number = 120): Promise<Float32Array> {
    // Shape: (120 timesteps, 15 features) = 1800 numbers
    const features = new Float32Array(lookback * 15);

    for (let t = 0; t < lookback; t++) {
      const timestamp = Date.now() - (lookback - t) * 60_000; // 1-min bars
      const snapshot = await this.featureCache.getSnapshot(timestamp);

      const offset = t * 15;
      features[offset + 0] = snapshot.index_return; // % return
      features[offset + 1] = snapshot.index_realized_vol; // Rolling realized vol
      features[offset + 2] = snapshot.breadth_score; // 0.0-1.0
      features[offset + 3] = snapshot.futures_momentum; // ROC
      features[offset + 4] = snapshot.atm_iv; // IV level
      features[offset + 5] = snapshot.iv_change; // ΔIV
      features[offset + 6] = snapshot.pcr_oi; // Put-call ratio
      features[offset + 7] = snapshot.volume_surge; // Volume / avg
      features[offset + 8] = snapshot.range_position; // 0.0-1.0
      features[offset + 9] = snapshot.atr; // Volatility proxy
      features[offset + 10] = snapshot.rsi; // Momentum
      features[offset + 11] = snapshot.bollinger_position; // (Price - BB_lower) / width
      features[offset + 12] = snapshot.spread; // Bid-ask spread
      features[offset + 13] = snapshot.time_of_day; // Cyclical encoding
      features[offset + 14] = snapshot.days_to_expiry; // Theta urgency
    }

    return features;
  }
}
```

#### Output (from TFT model)

```typescript
interface TFTOutput {
  regime: "TREND" | "RANGE" | "VOLATILE" | "REGIME_SHIFT"; // Classification
  regime_confidence: number; // 0.0-1.0
  volatility_forecast_5min: number; // Expected vol
  volatility_forecast_15min: number;
  volatility_forecast_eod: number;
  trend_strength: number; // -1 to +1
  upper_bound: number; // Price forecast upper
  lower_bound: number; // Price forecast lower
  attention_weights: number[]; // Which timesteps matter
}
```

**Key Usage**:

- `regime` → Activates conditional TIER 2 models (PatchTST, Mamba, TimesNet)
- `volatility_forecast` → Position sizing, stop-loss adjustment
- `trend_strength` → Strategy selection (trending vs mean-reversion)

---

### 3️⃣ LiT — "Microstructure Model"

**Purpose**: Extract microstructure alpha from order book depth

#### ❌ What LiT Does NOT See

- 50 constituent stocks (not relevant for 10s-1min decisions)
- Options chain (too slow-moving)
- Technical indicators (macro noise)

#### ✅ What LiT DOES See

**ONLY NIFTY FUTURE LOB depth-20**:

```
Input shape: (T, 80)  where T=60 (60 seconds), 80 = 20 bid levels + 20 ask levels + 20 bid sizes + 20 ask sizes
```

---

#### Input Construction (LOB Tensor)

```typescript
class LOBTensorBuilder {
  async buildTensor(lookback: number = 60): Promise<Float32Array> {
    // Shape: (60 timesteps, 80 features) = 4800 numbers
    const tensor = new Float32Array(lookback * 80);

    for (let t = 0; t < lookback; t++) {
      const timestamp = Date.now() - (lookback - t) * 1000; // 1-second intervals
      const lob = await this.lobCache.getSnapshot("NIFTY_FUT", timestamp);

      const offset = t * 80;

      // Normalize prices relative to mid-price
      const mid = (lob.best_bid + lob.best_ask) / 2;

      // Bid side (20 levels × 2 = 40 numbers)
      for (let i = 0; i < 20; i++) {
        tensor[offset + i] = (lob.bids[i].price - mid) / mid; // Normalized price
        tensor[offset + 20 + i] = lob.bids[i].size / 1000; // Normalized size
      }

      // Ask side (20 levels × 2 = 40 numbers)
      for (let i = 0; i < 20; i++) {
        tensor[offset + 40 + i] = (lob.asks[i].price - mid) / mid; // Normalized price
        tensor[offset + 60 + i] = lob.asks[i].size / 1000; // Normalized size
      }
    }

    return tensor;
  }

  /**
   * CRITICAL: LOB data quality checks
   */
  async validateLOB(lob: OrderBookSnapshot): Promise<boolean> {
    // Check 1: Freshness (<2 seconds)
    if (Date.now() - lob.timestamp > 2000) {
      this.logger.warn("LOB data stale, disabling LiT");
      return false;
    }

    // Check 2: Spread sanity (< 0.5%)
    const spread = (lob.best_ask - lob.best_bid) / lob.best_bid;
    if (spread > 0.005) {
      this.logger.warn("LOB spread too wide, disabling LiT");
      return false;
    }

    // Check 3: Depth completeness (at least 10 levels)
    if (lob.bids.length < 10 || lob.asks.length < 10) {
      this.logger.warn("LOB depth incomplete, disabling LiT");
      return false;
    }

    return true;
  }
}
```

#### Output (from LiT model)

```typescript
interface LiTOutput {
  micro_direction: "BUY_PRESSURE" | "SELL_PRESSURE" | "NEUTRAL";
  confidence: number; // 0.0-1.0
  aggression_score: number; // How aggressive the flow is
  spoofing_detected: boolean; // Fake liquidity detection
  imminent_move_probability: number; // P(move in next 10-30s)
  expected_move_bps: number; // Expected move size (basis points)
  attention_levels: number[]; // Which LOB levels matter (explainability)
}
```

**Key Usage**:

- `micro_direction` → Entry timing (wait for pullback or enter aggressively?)
- `aggression_score` → Liquidity risk assessment
- `imminent_move_probability` → Should we enter NOW or wait?

---

### 4️⃣ DRL PPO Execution Agent

**Purpose**: Optimize execution to minimize slippage

#### Scope (CRITICAL)

> **DRL PPO is EXECUTION-ONLY. It NEVER decides direction or strategy.**

**Inputs come from**:

- ✅ Cognition layer: "BUY 2 lots of NIFTY 24500 CE"
- ✅ Execution layer: "How to slice this order optimally?"

#### ❌ What DRL PPO Does NOT See

- Market-wide context (breadth, regime)
- Directional signals
- Strategy selection logic

#### ✅ What DRL PPO DOES See

**Only execution-relevant state**:

```typescript
interface ExecutionState {
  // Option LOB (immediate context)
  option_bid: number;
  option_ask: number;
  option_spread: number;
  option_bid_size: number;
  option_ask_size: number;
  option_last_traded_price: number;
  option_last_traded_time: number;

  // Underlying (futures) context
  futures_mid: number;
  futures_volatility: number;
  futures_momentum: number;

  // Order state
  remaining_quantity: number;
  time_remaining_seconds: number;
  slippage_so_far: number;
  fills_so_far: number;

  // Market microstructure
  spread_percentile: number; // Is spread wide right now?
  liquidity_score: number; // Replenishment rate
  adverse_selection_risk: number; // Are we moving the market?
}
```

#### Actions (Execution Decisions)

```typescript
interface ExecutionActions {
  limit_price_offset: number; // -5 to +5 bps from mid
  slice_size: number; // 1-10 lots per order
  wait_time_ms: number; // 0-5000ms before next slice
}
```

#### Reward Function

```typescript
reward = -slippage - delay_penalty - adverse_selection_cost

where:
  slippage = (execution_price - decision_price) / decision_price
  delay_penalty = 0.01 * seconds_elapsed (opportunity cost)
  adverse_selection = if (moved_market) then 0.05 else 0
```

---

## Complete Data Flow (Trade Lifecycle)

Let's walk through the **5 trading steps** and map data → encoding → models → decisions:

---

### STEP 1: Understand Trend & Direction

**Goal**: Determine if NIFTY will move UP/DOWN/SIDEWAYS

#### Raw Data Consumed

```typescript
{
  nifty_future: {
    ohlcv: [...],
    lob_depth_20: [...],
    trades: [...]
  },
  nifty_constituents: [
    { symbol: 'RELIANCE', ohlcv: [...], volume: [...] },
    { symbol: 'HDFC', ohlcv: [...], volume: [...] },
    // ... 48 more
  ],
  option_chain: {
    atm_iv: 18.5,
    pcr_oi: 1.2,
    // ...
  }
}
```

#### Market State Encoding

```typescript
// MSE aggregates 50k signals → 33 numbers
const lightgbmFeatures = encoder.buildLightGBMFeatures({
  // Index aggregation
  breadth: {
    pct_above_vwap: 0.72,          // 36/50 stocks above VWAP
    advance_decline: 1.8,          // 36 up, 14 down
    weighted_return_top10: 0.8,    // Top 10 weighted stocks +0.8%
  },
  // Futures
  futures: {
    momentum_5min: 0.4,            // +0.4% in 5min
    rsi: 58,                       // Mild bullish
    volume_surge: 1.3,             // 30% above average
  },
  // Options
  options: {
    atm_iv: 18.5,                  // IV level
    pcr_oi: 1.2,                   // More puts than calls (bullish)
    skew: -2.5,                    // Negative skew (bullish)
  },
  // Time
  time: {
    minutes_from_open: 75,         // 10:30 AM
    days_to_expiry: 2,             // Near expiry (high gamma)
  }
});

// TFT sees temporal context
const tftFeatures = encoder.buildTFTFeatures({
  // Last 120 minutes of aggregated data
  timeseries: [...], // (120, 15) array
});

// LiT sees microstructure
const litTensor = encoder.buildLiTTensor({
  // Last 60 seconds of NIFTY FUTURE LOB
  lob_snapshots: [...], // (60, 80) array
});
```

#### Model Inference

```typescript
// Models receive encoded states
const lightgbmOutput = await lightgbm.predict(lightgbmFeatures);
// → { probs: [0.1, 0.7, 0.2], direction: 'VOL_UP', confidence: 0.7 }

const tftOutput = await tft.predict(tftFeatures);
// → { regime: 'TREND', confidence: 0.8, vol_forecast: 22.5 }

const litOutput = await lit.predict(litTensor);
// → { micro_direction: 'BUY_PRESSURE', confidence: 0.65 }

// Meta-learner fuses signals
const finalSignal = metaLearner.fuse({
  lightgbm: lightgbmOutput,
  tft: tftOutput,
  lit: litOutput,
  market_state: { spread: 0.05, volatility: 18.5 },
});
// → { direction: 'VOL_UP', confidence: 0.75, reasoning: "Breadth + momentum + LOB pressure aligned" }
```

#### Decision

```
✅ TREND DETECTED: UPWARD (75% confidence)
✅ Constituent participation: 72% (strong confirmation)
✅ Microstructure: Buy pressure detected
→ Proceed to Step 2 (Strike Selection)
```

---

### STEP 2: Select Strike & Position Size

**Goal**: Choose optimal strike and lot size

#### Data Used

```typescript
{
  signal: 'VOL_UP',
  confidence: 0.75,
  regime: 'TREND',
  volatility_forecast: 22.5,
  available_capital: 500000,
  option_chain: {
    strikes: [
      { strike: 24300, type: 'CE', ltp: 180, delta: 0.55, gamma: 0.008 },
      { strike: 24400, type: 'CE', ltp: 120, delta: 0.45, gamma: 0.010 },
      { strike: 24500, type: 'CE', ltp: 75, delta: 0.35, gamma: 0.012 },
    ]
  }
}
```

#### Cognition Layer Logic

```typescript
// Strike selection
const strategy = strategySelector.select({
  signal: "VOL_UP",
  regime: "TREND",
  confidence: 0.75,
});
// → Strategy: LONG_CALL (leveraged directional bet)

const strike = strikeSelector.select({
  strategy: "LONG_CALL",
  moneyness_pref: "SLIGHTLY_OTM", // Higher gamma, lower cost
  delta_range: [0.35, 0.5],
});
// → Selected: 24500 CE (delta 0.35, LTP 75)

// Position sizing (Kelly criterion)
const lots = positionSizer.compute({
  capital: 500000,
  confidence: 0.75,
  win_rate: 0.62, // From backtest
  avg_win: 0.15, // +15% avg
  avg_loss: 0.08, // -8% avg
  max_risk_per_trade: 0.05, // 5% max
});
// → Position: 2 lots (2 × 75 × 50 = ₹7,500 premium)
```

#### Decision

```
✅ STRATEGY: LONG CALL
✅ STRIKE: 24500 CE
✅ LOTS: 2
✅ PREMIUM: ₹150/lot (₹7,500 total)
→ Proceed to Step 3 (Entry Timing)
```

---

### STEP 3: Find Best Entry Price

**Goal**: Time entry to minimize premium paid

#### Data Used (Microstructure Focus)

```typescript
{
  option_lob: {
    bid: 73,
    ask: 77,
    spread: 4,
    bid_size: 50,
    ask_size: 30,
  },
  futures_lob: {
    // LiT tensor (60s × 80 features)
    pressure: 'BUY_PRESSURE',
    imminent_move: 0.7,  // 70% chance of move in 30s
  },
  current_premium: 75,
  avg_premium_5min: 72,
}
```

#### Execution Logic

```typescript
// Check if we should enter NOW or WAIT
const litSignal = await lit.predict(litTensor);

if (litSignal.imminent_move_probability > 0.6) {
  // High urgency: Enter aggressively at ASK
  decision = "ENTER_NOW_AT_ASK";
  price = 77; // Pay 2 extra points to guarantee fill
} else {
  // Low urgency: Place limit order between bid-ask
  decision = "LIMIT_ORDER_MID";
  price = 75; // Wait for mid-price fill
}

// Monitor for 30 seconds
if (filled) {
  log.info("Entry filled at 75");
} else if (premium_spiked_to_80) {
  // Missed entry, cancel
  log.warn("Premium spiked, canceling entry");
}
```

#### Decision

```
✅ LiT SIGNAL: Buy pressure moderate (50% confidence)
✅ ENTRY LOGIC: Place limit order at 75 (mid-price)
✅ TIMEOUT: 30 seconds (if not filled, reassess)
→ ORDER PLACED: BUY 2 lots 24500 CE @ 75 LIMIT
```

---

### STEP 4: Track Open Position

**Goal**: Monitor P&L and detect exit triggers

#### Data Monitored (Real-Time)

```typescript
{
  position: {
    strike: 24500,
    type: 'CE',
    lots: 2,
    entry_price: 75,
    current_ltp: 82,
    pnl: (82 - 75) * 2 * 50 = ₹700,
  },
  underlying: {
    futures_price: 24480,          // 20 points from strike
    futures_momentum: 0.3,         // Slowing down
    breadth: 0.68,                 // Declining from 0.72
  },
  greeks: {
    delta: 0.42,                   // Increased from 0.35
    gamma: 0.011,
    theta: -0.5,                   // Losing ₹25/day
    iv: 20.2,                      // IV expanded from 18.5
  },
  regime: 'TREND',                 // Still trending
  time_in_trade: 900,              // 15 minutes
}
```

#### Monitoring Logic

```typescript
// Check exit conditions every 1s
const exitSignal = exitManager.evaluate({
  pnl: 700,
  pnl_pct: 0.093, // +9.3%
  target_pnl: 0.15, // +15% target
  stop_loss: -0.08, // -8% stop
  time_in_trade: 900,
  underlying_structure: "INTACT", // Futures still bullish
  regime_change: false,
});

if (exitSignal.action === "HOLD") {
  log.info("Position profitable, holding for target");
} else if (exitSignal.action === "TRAIL_STOP") {
  // Move stop loss to breakeven
  stop_loss = entry_price;
  log.info("Trailing stop activated at breakeven");
}
```

#### Decision

```
✅ P&L: +₹700 (+9.3%)
✅ TREND: Still intact
✅ ACTION: Hold for target (₹1,125 = +15%)
✅ STOP: Trailing at breakeven (75)
→ Continue monitoring
```

---

### STEP 5: Execute Exit

**Goal**: Exit at optimal price (TP/SL/early exit)

#### Scenario 1: Target Hit

```typescript
{
  position: { pnl: ₹1,200 },      // Target reached
  option_lob: {
    bid: 90,
    ask: 92,
    spread: 2,
    bid_size: 100,                 // Good liquidity
  },
  exit_urgency: 'LOW',             // No rush
}

// DRL PPO execution agent
const executionPlan = drlAgent.plan({
  action: 'SELL',
  quantity: 2,
  urgency: 'LOW',
  lob: option_lob,
});
// → Place limit sell at 91 (above bid, below ask)
// → If not filled in 10s, hit bid at 90
```

#### Scenario 2: Stop Loss Hit

```typescript
{
  position: { pnl: -₹400 },        // -5.3%
  futures_price: 24420,            // Dropped 60 points
  breadth: 0.45,                   // Breadth collapsed
  regime: 'REGIME_SHIFT',          // TFT detected shift
  option_lob: {
    bid: 69,
    ask: 72,
    spread: 3,                     // Spread widened (liquidity dry)
  },
  exit_urgency: 'HIGH',            // Exit NOW
}

// Emergency exit
const executionPlan = drlAgent.plan({
  action: 'SELL',
  quantity: 2,
  urgency: 'HIGH',
  lob: option_lob,
});
// → HIT BID at 69 immediately (accept slippage)
// → Don't wait for better price (risk cascade)
```

#### Final Outcome

```
✅ EXIT EXECUTED: Sold 2 lots @ 91
✅ FINAL P&L: (91 - 75) × 2 × 50 = ₹1,600
✅ RETURN: +21.3%
✅ TIME IN TRADE: 28 minutes
→ Trade complete, capital released
```

---

## Storage Strategy for Training

### Critical Principle

> **Store encoded states, not raw feeds.**

### Why?

1. **Reproducibility**: Same state → same prediction (guaranteed)
2. **Efficiency**: 33 numbers vs 50k numbers (1500× compression)
3. **Consistency**: Features computed identically in training and production
4. **Speed**: Training loads 33-number vectors, not raw LOBs

### What to Store (QuestDB Schema)

```sql
-- lightgbm_states table
CREATE TABLE lightgbm_states (
  timestamp TIMESTAMP,
  -- Index aggregation (10 features)
  pct_stocks_above_vwap DOUBLE,
  pct_stocks_trending_up DOUBLE,
  advance_decline_ratio DOUBLE,
  weighted_return_top_10 DOUBLE,
  sector_alignment_score DOUBLE,
  correlation_to_leader DOUBLE,
  divergence_score DOUBLE,
  participation_index DOUBLE,
  intraday_range_position DOUBLE,
  overnight_gap DOUBLE,
  -- Futures (8 features)
  fut_price_vs_vwap DOUBLE,
  fut_range_position DOUBLE,
  fut_atr_normalized DOUBLE,
  fut_momentum_5min DOUBLE,
  fut_momentum_15min DOUBLE,
  fut_rsi_14 DOUBLE,
  fut_volume_vs_avg DOUBLE,
  fut_basis DOUBLE,
  -- Options (10 features)
  atm_iv DOUBLE,
  iv_change_5min DOUBLE,
  iv_rank DOUBLE,
  pcr_oi DOUBLE,
  pcr_volume DOUBLE,
  max_pain_distance DOUBLE,
  gamma_atm DOUBLE,
  delta_weighted_oi DOUBLE,
  iv_skew DOUBLE,
  iv_term_structure DOUBLE,
  -- Time context (5 features)
  minutes_from_open INT,
  minutes_to_close INT,
  is_first_hour BOOLEAN,
  is_last_hour BOOLEAN,
  days_to_expiry INT,
  -- Labels (for training)
  label_5min INT,        -- -1/0/+1 (down/neutral/up)
  label_15min INT,
  label_eod INT,
  forward_return_5min DOUBLE,
  forward_return_15min DOUBLE,
  forward_return_eod DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- tft_states table (time-series)
CREATE TABLE tft_states (
  timestamp TIMESTAMP,
  index_return DOUBLE,
  index_realized_vol DOUBLE,
  breadth_score DOUBLE,
  futures_momentum DOUBLE,
  atm_iv DOUBLE,
  iv_change DOUBLE,
  pcr_oi DOUBLE,
  volume_surge DOUBLE,
  range_position DOUBLE,
  atr DOUBLE,
  rsi DOUBLE,
  bollinger_position DOUBLE,
  spread DOUBLE,
  time_of_day DOUBLE,
  days_to_expiry INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- lit_tensors table (LOB snapshots)
CREATE TABLE lit_tensors (
  timestamp TIMESTAMP,
  tensor BLOB,           -- Compressed Float32Array (60×80 = 4800 floats)
  mid_price DOUBLE,      -- For denormalization
  spread DOUBLE,
  staleness_ms INT
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- execution_outcomes table (for DRL training)
CREATE TABLE execution_outcomes (
  timestamp TIMESTAMP,
  order_id STRING,
  action STRING,         -- 'BUY' or 'SELL'
  quantity INT,
  decision_price DOUBLE,
  execution_price DOUBLE,
  slippage_bps DOUBLE,
  time_to_fill_ms INT,
  initial_spread DOUBLE,
  final_spread DOUBLE,
  liquidity_score DOUBLE,
  adverse_selection BOOLEAN,
  reward DOUBLE          -- For DRL training
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### Training Pipeline Usage

```python
# training-pipeline: Fetch encoded states, not raw data
def fetch_training_data(start_date, end_date):
    """
    Load pre-encoded features from QuestDB
    NO feature engineering needed (already done in production)
    """
    query = """
        SELECT * FROM lightgbm_states
        WHERE timestamp BETWEEN $1 AND $2
        ORDER BY timestamp
    """
    df = questdb.execute(query, start_date, end_date)

    # Features already computed and stored
    X = df[FEATURE_COLUMNS].values  # (N, 33)
    y = df['label_15min'].values    # (N,)

    return X, y

# Training matches production EXACTLY
model = lgb.train(params, X_train, y_train)
```

---

## Implementation Checklist

### Phase 1: Formalize MSE (Week 1-2)

- [ ] Create `MarketStateEncoder` service
- [ ] Implement `IndexAggregator` (breadth, alignment)
- [ ] Implement `BreadthComputer` (50 constituents → 10 metrics)
- [ ] Implement `AlignmentScorer` (sectoral cohesion)
- [ ] Implement `LOBTensorBuilder` (futures LOB → tensor)
- [ ] Implement `RegimeFeatureBuilder` (time-series stacking)
- [ ] Implement `ExecutionStateBuilder` (execution-specific state)
- [ ] Add data quality validators (staleness, spread checks)

### Phase 2: Storage Schema (Week 2)

- [ ] Create QuestDB tables (lightgbm_states, tft_states, lit_tensors, execution_outcomes)
- [ ] Implement batch inserts (buffer 60s of states, write in batch)
- [ ] Add compression for LOB tensors
- [ ] Test query performance (should fetch 1M rows in <1s)

### Phase 3: Model Integration (Week 3-4)

- [ ] Update `LightGBMInferenceService` to consume encoded features
- [ ] Update `TFTInferenceService` to consume time-series features
- [ ] Update `LiTInferenceService` to consume LOB tensors
- [ ] Update `MetaLearnerService` to fuse model outputs
- [ ] Add circuit breakers for stale data
- [ ] Test end-to-end latency (<150ms target)

### Phase 4: Training Pipeline Integration (Week 5-6)

- [ ] Update `train_lightgbm.py` to load from `lightgbm_states` table
- [ ] Update `train_tft.py` to load from `tft_states` table
- [ ] Update `train_lit.py` to load from `lit_tensors` table (decompress)
- [ ] Update `train_drl.py` to load from `execution_outcomes` table
- [ ] Validate feature consistency (production vs training)
- [ ] Run walk-forward validation with encoded states

### Phase 5: Monitoring & Validation (Week 7-8)

- [ ] Add Prometheus metrics for encoding latency
- [ ] Add alerts for data quality failures (stale LOB, missing constituents)
- [ ] Create Grafana dashboard for MSE health
- [ ] Implement shadow mode (compare old features vs encoded states)
- [ ] Validate prediction consistency (old vs new encoding)
- [ ] Full production rollout

---

## Common Anti-Patterns (Avoid These!)

### ❌ Anti-Pattern 1: Passing Raw Data to Models

```typescript
// WRONG
const predictions = await lightgbm.predict({
  reliance: reliance_ohlcv,
  hdfc: hdfc_ohlcv,
  // ... 48 more stocks
});
```

**Why bad**: Model sees uncorrelated noise, no aggregation, impossible to backtest

**Fix**: Use Market State Encoder

---

### ❌ Anti-Pattern 2: Model-Specific Feature Engineering in Prediction Layer

```typescript
// WRONG: Feature computation in prediction layer
class LightGBMService {
  async predict(rawData: RawData) {
    const breadth = this.computeBreadth(rawData.stocks); // ❌ Wrong layer!
    return this.model.predict(breadth);
  }
}
```

**Why bad**: Violates layer separation, duplicate code, inconsistency

**Fix**: Feature engineering belongs in Cortex (MSE), prediction layer just predicts

---

### ❌ Anti-Pattern 3: Storing Raw Data Only

```typescript
// WRONG: Store raw ticks, compute features during training
await questdb.insert("raw_ticks", {
  timestamp,
  symbol: "RELIANCE",
  price: 2450.3,
  volume: 1000,
});

// Then during training:
features = compute_features(raw_ticks); // ❌ Inconsistent with production!
```

**Why bad**: Training features ≠ production features (subtle bugs), slow training

**Fix**: Store encoded states (features already computed consistently)

---

### ❌ Anti-Pattern 4: Using NIFTY Spot for Microstructure

```typescript
// WRONG
const litInput = buildLiTTensor(nifty_spot_lob); // ❌ Spot has no LOB!
```

**Why bad**: NIFTY spot is calculated, not traded (no order book)

**Fix**: Use NIFTY FUTURE LOB (where real price discovery happens)

---

## Feature Store Integration (HIGH ROI Enhancement)

### Overview

**Status**: ⏳ Design Complete ([FEATURE_STORE_ARCHITECTURE.md](./FEATURE_STORE_ARCHITECTURE.md)), Not Implemented

Integrate Market State Encoder with a centralized feature store to guarantee training/serving consistency, enable feature versioning, and provide point-in-time correctness for backtesting.

**Why**: Current MSE computes features on-the-fly in both algo-worker and training-pipeline, leading to:

- ❌ Feature definitions duplicated across codebases
- ❌ Training/serving skew risk (different implementations)
- ❌ No versioning (can't reproduce historical predictions)
- ❌ Hard to discover which features exist

**ROI**: **Eliminate training/serving skew, 50% faster model development**

---

### Architecture: MSE as Feature Producer

```
┌─────────────────────────────────────────────────────────────┐
│ Current State (Duplicated Logic)                            │
├─────────────────────────────────────────────────────────────┤
│ algo-worker (Production):                                   │
│   ├─ MarketStateEncoder.ts (compute features)               │
│   └─ FeatureCacheService.ts (sliding windows)               │
│                                                              │
│ training-pipeline (Training):                                │
│   ├─ feature_engineering.py (compute features)              │ ← ❌ DUPLICATE!
│   └─ Kedro pipelines (batch computation)                    │
│                                                              │
│ Risk: Features computed differently → predictions diverge   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Next-Gen State (Feature Store)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Feature Registry (YAML + Git)                            │
│    ├─ feature_definitions.yaml (single source of truth)     │
│    ├─ Versioned (git tags: v1.0, v1.1, v2.0)               │
│    └─ Code generation (TypeScript + Python from YAML)       │
│                                                              │
│ 2. Feature Computation (Unified Logic)                      │
│    ├─ MarketStateEncoder.ts (algo-worker)                   │
│    └─ Publishes features → Kafka topic                      │
│                                                              │
│ 3. Feature Serving (Faust Streaming + Redis)                │
│    ├─ Faust consumes Kafka → computes aggregations          │
│    ├─ Publishes to Redis (online serving, <5ms latency)     │
│    └─ Publishes to QuestDB (offline materialization)        │
│                                                              │
│ 4. Feature Retrieval (Unified API)                          │
│    ├─ algo-worker → gRPC getOnlineFeatures()                │
│    ├─ training-pipeline → getOfflineFeatures(date range)    │
│    └─ Guaranteed consistency (same code path)               │
└─────────────────────────────────────────────────────────────┘
```

---

### 1. Feature Registry (YAML Definition)

**File**: `feature-store/features/market_state.yaml`

```yaml
# Market State Encoder Features v2.0
# Compatible with: algo-worker 2.x, training-pipeline 3.x

featureGroup:
  name: market_state_features
  version: "2.0"
  description: |
    Market State Encoder outputs for LightGBM, TFT, and LiT models.
    Compresses 50,000+ signals/sec into 200-500 actionable features.

  entities:
    - name: timestamp
      type: TIMESTAMP
      description: Feature computation timestamp (nanosecond precision)

    - name: symbol
      type: STRING
      description: Primary instrument symbol (NIFTY_FUTURE, BANKNIFTY_FUTURE)

  # ==================================================================
  # Index Aggregation Features (8 features)
  # ==================================================================
  features:
    - name: index_weighted_return
      type: DOUBLE
      description: |
        Weighted average return of NIFTY constituents (last 5m).
        Weights = market cap. Aggregation across 50 stocks.
      valueType: POINT_IN_TIME
      sources:
        - nifty_constituents_ohlcv
      computation: |
        ts: sum(stock.returns * stock.weight for stock in constituents)
        py: np.sum(returns * weights)

    - name: index_breadth
      type: DOUBLE
      description: |
        Fraction of constituents with positive returns (last 5m).
        Range: 0.0 (all down) to 1.0 (all up).
      valueType: POINT_IN_TIME
      sources:
        - nifty_constituents_ohlcv
      computation: |
        ts: constituents.filter(s => s.return > 0).length / constituents.length
        py: (returns > 0).sum() / len(returns)

    - name: index_alignment
      type: DOUBLE
      description: |
        Correlation between constituent returns and NIFTY FUTURE return.
        High alignment (>0.7) = strong directional move.
      valueType: POINT_IN_TIME
      sources:
        - nifty_constituents_ohlcv
        - nifty_future_ohlcv
      computation: |
        ts: pearsonCorrelation(constituentReturns, futureReturn)
        py: np.corrcoef(constituent_returns, future_return)[0, 1]

    # ... (remaining 5 index features)

    # ==================================================================
    # LOB Tensor Features (80 features for LiT)
    # ==================================================================
    - name: lob_bid_prices
      type: ARRAY[DOUBLE]
      description: |
        LOB bid prices (depth-20), normalized to tick size.
        Shape: [20,]. Used by LiT model.
      valueType: POINT_IN_TIME
      sources:
        - nifty_future_lob
      computation: |
        ts: lob.bids.map((b, i) => (b.price - midPrice) / tickSize)
        py: (bid_prices - mid_price) / tick_size

    - name: lob_ask_prices
      type: ARRAY[DOUBLE]
      description: LOB ask prices (depth-20), normalized to tick size.
      valueType: POINT_IN_TIME
      sources:
        - nifty_future_lob
      computation: |
        ts: lob.asks.map((a, i) => (a.price - midPrice) / tickSize)
        py: (ask_prices - mid_price) / tick_size

    # ... (remaining 76 LOB features)

    # ==================================================================
    # Time-Series Features (TFT input, 13 × 60 timesteps)
    # ==================================================================
    - name: tft_realized_vol_5d
      type: DOUBLE
      description: |
        Realized volatility (5-day rolling). Used in TFT time-series.
      valueType: TIME_SERIES
      aggregations:
        - MEAN
        - STD
      sources:
        - nifty_future_ohlcv
      computation: |
        ts: rollingStd(returns, 5) * sqrt(252)
        py: returns.rolling(5).std() * np.sqrt(252)

    # ... (remaining 12 TFT time-series features)

# ==================================================================
# Feature Transformations (Derived Features)
# ==================================================================
transformations:
  - name: vol_regime
    inputFeatures:
      - tft_realized_vol_5d
      - india_vix
    outputFeature: vol_regime_class
    logic: |
      if realized_vol < 0.15 and india_vix < 15:
        return "LOW_VOL"
      elif realized_vol > 0.25 or india_vix > 25:
        return "HIGH_VOL"
      else:
        return "MODERATE_VOL"

  - name: breadth_momentum
    inputFeatures:
      - index_breadth
    outputFeature: breadth_momentum
    logic: |
      return index_breadth - index_breadth.shift(5)  # 5-min change

# ==================================================================
# Validation & Quality Gates
# ==================================================================
validations:
  - name: lob_depth_check
    description: Ensure LOB has all 20 levels populated
    assertion: |
      len(lob_bid_prices) == 20 and len(lob_ask_prices) == 20
    onFailure: DEGRADE # Disable LiT model if LOB incomplete

  - name: constituent_coverage_check
    description: Require at least 45/50 constituents for breadth
    assertion: |
      len(constituents_with_data) >= 45
    onFailure: DEGRADE # Fallback to futures-only features

  - name: timestamp_freshness
    description: Features must be <1s old
    assertion: |
      (current_time - feature_timestamp) < 1000  # milliseconds
    onFailure: REJECT # Don't serve stale features
```

---

### 2. Code Generation from Registry

**Generate TypeScript interfaces** (algo-worker):

```bash
# Generate TypeScript from YAML
pnpm run feature-store:codegen --lang typescript --output packages/schema/src/features/

# Output: packages/schema/src/features/market-state.ts
```

**Generated TypeScript**:

```typescript
// Auto-generated from market_state.yaml v2.0
// DO NOT EDIT MANUALLY

export interface MarketStateFeatures {
  timestamp: number;
  symbol: string;

  // Index Aggregation (8 features)
  index_weighted_return: number;
  index_breadth: number;
  index_alignment: number;
  // ... remaining 5

  // LOB Tensor (80 features)
  lob_bid_prices: Float32Array; // [20,]
  lob_ask_prices: Float32Array; // [20,]
  lob_bid_volumes: Float32Array; // [20,]
  // ... remaining 76

  // Time-Series (13 × 60 for TFT)
  tft_realized_vol_5d: number[];
  // ... remaining 12

  // Derived features
  vol_regime_class: "LOW_VOL" | "MODERATE_VOL" | "HIGH_VOL";
  breadth_momentum: number;
}

// Feature metadata for validation
export const MARKET_STATE_FEATURE_METADATA = {
  version: "2.0",
  totalFeatures: 200,
  requiredSources: [
    "nifty_constituents_ohlcv",
    "nifty_future_ohlcv",
    "nifty_future_lob",
  ],
  validations: [
    {
      name: "lob_depth_check",
      assertion: (features) => features.lob_bid_prices.length === 20,
      onFailure: "DEGRADE",
    },
    // ...
  ],
};
```

**Generate Python dataclasses** (training-pipeline):

```bash
python feature-store/codegen/generate_python.py \
  --input feature-store/features/market_state.yaml \
  --output services/training-pipeline/src/features/market_state.py
```

**Generated Python**:

```python
# Auto-generated from market_state.yaml v2.0
# DO NOT EDIT MANUALLY

from dataclasses import dataclass
from typing import List, Literal
import numpy as np

@dataclass
class MarketStateFeatures:
    timestamp: int
    symbol: str

    # Index Aggregation (8 features)
    index_weighted_return: float
    index_breadth: float
    index_alignment: float
    # ... remaining 5

    # LOB Tensor (80 features)
    lob_bid_prices: np.ndarray  # shape: (20,)
    lob_ask_prices: np.ndarray  # shape: (20,)
    # ... remaining 76

    # Time-Series (13 × 60 for TFT)
    tft_realized_vol_5d: List[float]  # length: 60
    # ... remaining 12

    # Derived features
    vol_regime_class: Literal["LOW_VOL", "MODERATE_VOL", "HIGH_VOL"]
    breadth_momentum: float

# Feature metadata
MARKET_STATE_FEATURE_METADATA = {
    "version": "2.0",
    "total_features": 200,
    "required_sources": [
        "nifty_constituents_ohlcv",
        "nifty_future_ohlcv",
        "nifty_future_lob",
    ],
}
```

**Key Benefit**: **Single source of truth** (YAML) → **guaranteed consistency** (TypeScript = Python)

---

### 3. MSE as Feature Producer

**Updated MarketStateEncoder** (algo-worker):

```typescript
@Injectable()
export class MarketStateEncoder {
  constructor(
    private readonly kafka: KafkaService,
    private readonly featureRegistry: FeatureRegistryService
  ) {}

  async encode(marketData: RawMarketData): Promise<MarketStateFeatures> {
    // 1. Compute features (same logic as before)
    const features = {
      timestamp: Date.now(),
      symbol: "NIFTY_FUTURE",

      // Index aggregation
      index_weighted_return: this.computeWeightedReturn(
        marketData.constituents
      ),
      index_breadth: this.computeBreadth(marketData.constituents),
      index_alignment: this.computeAlignment(
        marketData.constituents,
        marketData.future
      ),
      // ... all 200 features
    };

    // 2. Validate features against registry
    const validation = this.featureRegistry.validate(features);
    if (!validation.valid) {
      this.logger.warn("Feature validation failed", validation.errors);
      // Apply degradations (e.g., disable LiT if LOB incomplete)
    }

    // 3. Publish to Kafka topic (feature store ingestion)
    await this.kafka.publish("feature-store.market-state", {
      key: features.symbol,
      value: features,
      timestamp: features.timestamp,
    });

    // 4. Return for immediate use (online serving)
    return features;
  }
}
```

---

### 4. Feature Serving (Faust + Redis + QuestDB)

**Faust streaming app** (feature-store service):

```python
import faust
from typing import List
from features.market_state import MarketStateFeatures

app = faust.App(
    'feature-store-streaming',
    broker='kafka://localhost:9092',
    value_serializer='json',
)

# Kafka topic (produced by algo-worker)
market_state_topic = app.topic('feature-store.market-state', value_type=MarketStateFeatures)

@app.agent(market_state_topic)
async def materialize_features(stream):
    """
    Consume features from Kafka, materialize to:
    1. Redis (online serving, <5ms latency)
    2. QuestDB (offline serving, point-in-time correctness)
    """
    async for features in stream:
        # 1. Redis (online serving)
        await redis.hset(
            f'features:market_state:{features.symbol}',
            mapping={
                'timestamp': features.timestamp,
                'features_json': json.dumps(features.__dict__),
            },
            ex=300,  # Expire after 5 minutes
        )

        # 2. QuestDB (offline serving)
        await questdb.insert('feature_store_market_state', {
            'timestamp': features.timestamp,
            'symbol': features.symbol,
            **features.__dict__,  # All 200 features
        })

        logger.info(f'Materialized features for {features.symbol} at {features.timestamp}')
```

---

### 5. Feature Retrieval API (gRPC)

**Proto definition**:

```protobuf
// feature-store/proto/feature_serving.proto

syntax = "proto3";

package feature_store;

service FeatureServingService {
  // Online serving (real-time, <5ms)
  rpc GetOnlineFeatures(OnlineFeaturesRequest) returns (OnlineFeaturesResponse);

  // Offline serving (batch, point-in-time correctness)
  rpc GetOfflineFeatures(OfflineFeaturesRequest) returns (OfflineFeaturesResponse);
}

message OnlineFeaturesRequest {
  string feature_group = 1;  // "market_state_features"
  repeated string symbols = 2;  // ["NIFTY_FUTURE"]
  repeated string feature_names = 3;  // ["index_breadth", "index_alignment", ...]
}

message OnlineFeaturesResponse {
  map<string, FeatureVector> features = 1;  // symbol → features
}

message OfflineFeaturesRequest {
  string feature_group = 1;
  repeated string symbols = 2;
  int64 start_timestamp = 3;
  int64 end_timestamp = 4;
  repeated string feature_names = 5;
}

message OfflineFeaturesResponse {
  repeated FeatureSnapshot snapshots = 1;  // Time-series of features
}

message FeatureVector {
  int64 timestamp = 1;
  map<string, double> features = 2;  // feature_name → value
}

message FeatureSnapshot {
  int64 timestamp = 1;
  string symbol = 2;
  map<string, double> features = 3;
}
```

**Server implementation** (feature-store service):

```typescript
@GrpcMethod('FeatureServingService', 'GetOnlineFeatures')
async getOnlineFeatures(
  request: OnlineFeaturesRequest,
): Promise<OnlineFeaturesResponse> {
  const features = {};

  for (const symbol of request.symbols) {
    // Fetch from Redis (hot cache)
    const cached = await this.redis.hget(
      `features:market_state:${symbol}`,
      'features_json',
    );

    if (cached) {
      const parsed = JSON.parse(cached);

      // Filter requested features only
      const filteredFeatures = {};
      for (const featureName of request.featureNames) {
        filteredFeatures[featureName] = parsed[featureName];
      }

      features[symbol] = {
        timestamp: parsed.timestamp,
        features: filteredFeatures,
      };
    } else {
      this.logger.warn(`No cached features for ${symbol}`);
    }
  }

  return { features };
}

@GrpcMethod('FeatureServingService', 'GetOfflineFeatures')
async getOfflineFeatures(
  request: OfflineFeaturesRequest,
): Promise<OfflineFeaturesResponse> {
  // Query QuestDB with point-in-time correctness
  const query = `
    SELECT timestamp, symbol, ${request.featureNames.join(', ')}
    FROM feature_store_market_state
    WHERE symbol IN (${request.symbols.map((s) => `'${s}'`).join(', ')})
      AND timestamp >= ${request.startTimestamp}
      AND timestamp <= ${request.endTimestamp}
    ORDER BY timestamp ASC
  `;

  const rows = await this.questdb.query(query);

  const snapshots = rows.map((row) => ({
    timestamp: row.timestamp,
    symbol: row.symbol,
    features: request.featureNames.reduce((acc, name) => {
      acc[name] = row[name];
      return acc;
    }, {}),
  }));

  return { snapshots };
}
```

---

### 6. Usage in algo-worker (Online Serving)

**Before** (direct computation):

```typescript
// ❌ OLD: Compute features every tick
const features = await this.marketStateEncoder.encode(marketData);
const prediction = await this.lightgbm.predict(features);
```

**After** (feature store retrieval):

```typescript
// ✅ NEW: Retrieve pre-computed features from feature store
const response = await this.featureStoreClient.getOnlineFeatures({
  featureGroup: "market_state_features",
  symbols: ["NIFTY_FUTURE"],
  featureNames: [
    "index_breadth",
    "index_alignment",
    "index_weighted_return",
    // ... all 33 LightGBM features
  ],
});

const features = response.features["NIFTY_FUTURE"].features;
const prediction = await this.lightgbm.predict(features);
```

**Benefit**: Features computed once (MSE), served many times (LightGBM, TFT, risk manager)

---

### 7. Usage in training-pipeline (Offline Serving)

**Before** (re-compute features):

```python
# ❌ OLD: Re-compute features during training (inconsistency risk!)
def fetch_training_data(start_date, end_date):
    ticks = questdb.query(f"SELECT * FROM ticks WHERE timestamp >= '{start_date}'")

    # Re-compute features (might differ from production!)
    features = []
    for tick in ticks:
        feature_vector = compute_features(tick)  # ❌ NOT same as algo-worker!
        features.append(feature_vector)

    return features
```

**After** (feature store retrieval):

```python
# ✅ NEW: Retrieve pre-computed features (guaranteed consistency!)
def fetch_training_data(start_date, end_date):
    response = feature_store_client.get_offline_features(
        feature_group='market_state_features',
        symbols=['NIFTY_FUTURE'],
        start_timestamp=int(start_date.timestamp() * 1000),
        end_timestamp=int(end_date.timestamp() * 1000),
        feature_names=[
            'index_breadth',
            'index_alignment',
            # ... all 33 features
        ],
    )

    # Convert to pandas DataFrame
    df = pd.DataFrame([
        {**snapshot.features, 'timestamp': snapshot.timestamp}
        for snapshot in response.snapshots
    ])

    return df
```

**Benefit**: **Training features = Production features** (zero training/serving skew!)

---

### 8. Point-in-Time Correctness for Backtesting

**Problem**: Standard join creates lookahead bias

```python
# ❌ WRONG: This leaks future data!
df_features = pd.merge(
    df_ticks,
    df_labels,
    on='timestamp',
    how='left',  # ❌ Uses label from same timestamp (lookahead!)
)
```

**Solution**: Point-in-time join (as-of join)

```python
# ✅ CORRECT: Point-in-time join (no lookahead)
def get_features_at_timestamp(timestamp: int, symbol: str) -> dict:
    """
    Retrieve features as they existed at given timestamp
    (NOT including any data from future)
    """
    query = f"""
        SELECT *
        FROM feature_store_market_state
        WHERE symbol = '{symbol}'
          AND timestamp <= {timestamp}
        ORDER BY timestamp DESC
        LIMIT 1
    """

    row = questdb.query(query)[0]
    return row

# Usage in backtest
for timestamp in backtest_timestamps:
    # Get features as-of this timestamp (no lookahead)
    features = get_features_at_timestamp(timestamp, 'NIFTY_FUTURE')

    # Get label (target) from future (1 minute ahead)
    label = get_label_at_timestamp(timestamp + 60_000)  # 60s ahead

    training_examples.append((features, label))
```

**QuestDB ASOF JOIN** (native support):

```sql
-- Point-in-time correctness with ASOF JOIN
SELECT
  t.timestamp,
  t.symbol,
  f.*
FROM ticks t
ASOF JOIN feature_store_market_state f
  ON t.symbol = f.symbol
WHERE t.timestamp BETWEEN '2025-01-01' AND '2025-12-31'
```

---

### 9. Feature Versioning & Reproducibility

**Problem**: Can't reproduce historical predictions

```typescript
// Deployed model on Jan 1, 2026 with features v1.0
// Later (Mar 1, 2026), features updated to v2.0
// How do we reproduce Jan 15 prediction?
```

**Solution**: Version all features in registry

```yaml
# feature-store/features/market_state_v1.0.yaml
featureGroup:
  name: market_state_features
  version: "1.0"
  deprecatedAt: "2026-03-01"
  features:
    - name: index_breadth
      # ... v1.0 definition

# feature-store/features/market_state_v2.0.yaml
featureGroup:
  name: market_state_features
  version: "2.0"
  features:
    - name: index_breadth
      # ... v2.0 definition (improved computation)
```

**Retrieval with version pinning**:

```python
# Reproduce prediction from Jan 15, 2026 (used v1.0)
features = feature_store_client.get_offline_features(
    feature_group='market_state_features',
    version='1.0',  # ← Pin to historical version
    symbols=['NIFTY_FUTURE'],
    start_timestamp=datetime(2026, 1, 15).timestamp(),
    end_timestamp=datetime(2026, 1, 15, 23, 59).timestamp(),
)
```

---

### 10. Migration Path from Current MSE

**Phase 1** (Week 1): Feature registry + code generation

- [ ] Create `feature-store/features/market_state.yaml` (document current MSE features)
- [ ] Build code generator (YAML → TypeScript + Python)
- [ ] Validate generated code matches current MSE output

**Phase 2** (Week 2): Kafka + Faust streaming

- [ ] Deploy Kafka cluster (or use existing if available)
- [ ] Update MSE to publish to Kafka topic
- [ ] Implement Faust materialization service (Kafka → Redis + QuestDB)

**Phase 3** (Week 3): gRPC serving API

- [ ] Implement `GetOnlineFeatures` (algo-worker use case)
- [ ] Implement `GetOfflineFeatures` (training-pipeline use case)
- [ ] Add point-in-time join support (ASOF JOIN in QuestDB)

**Phase 4** (Week 4): Migrate clients

- [ ] Update algo-worker to use gRPC feature store client
- [ ] Update training-pipeline to use offline feature retrieval
- [ ] A/B test: old MSE vs feature store (validate consistency)

**Total Timeline**: 3-4 weeks

---

### Benefits Summary

| Benefit                      | Before (Current)                   | After (Feature Store)         | Impact                 |
| ---------------------------- | ---------------------------------- | ----------------------------- | ---------------------- |
| **Training/Serving Skew**    | ⚠️ Risk (duplicate code)           | ✅ Zero skew (same code path) | **Production Safety**  |
| **Feature Discovery**        | ❌ Hard (search codebase)          | ✅ Easy (registry UI/API)     | **Developer Velocity** |
| **Reproducibility**          | ❌ Can't reproduce old predictions | ✅ Version-pinned retrieval   | **Audit Compliance**   |
| **Model Development Speed**  | 🐢 Slow (re-implement features)    | 🚀 Fast (reuse existing)      | **50% faster**         |
| **Backtest Accuracy**        | ⚠️ Potential lookahead bias        | ✅ Point-in-time correctness  | **Trustworthy**        |
| **Feature Computation Cost** | 🔥 Compute every tick (2x work)    | 💰 Compute once, serve many   | **50% CPU savings**    |

**ROI**: **HIGH** (eliminates critical production risk + accelerates ML iteration)

---

**See Also**:

- [FEATURE_STORE_ARCHITECTURE.md](./FEATURE_STORE_ARCHITECTURE.md) - Detailed feature store design
- [HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md](./HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md) - Model deployment CI/CD
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Implementation roadmap & gap analysis

---

## Summary & Key Takeaways

### The Mental Model

```
50,000 signals/second  →  [Market State Encoder]  →  200-500 numbers  →  [Models]  →  Decisions
   (chaos)                     (intelligence)              (order)            (predictions)
```

### Critical Design Principles

1. **Models see compressed reality**: Never raw multi-instrument data
2. **Intelligence from aggregation**: Breadth, alignment, flow > individual stocks
3. **Layer separation**: Cortex encodes, Prediction predicts, Cognition decides
4. **Store encoded states**: Training = production (guaranteed consistency)
5. **Data quality gates**: Stale LOB? Disable LiT. Missing constituents? Degrade gracefully.

### Professional Truth

> **You subscribe to 50+ instruments NOT to pass all data to models,  
> but to AGGREGATE into a single, coherent market state.**

This is how Citadel, Jump, Renaissance, and IMC handle multi-instrument systems.

---

**Last Updated**: January 13, 2026  
**Status**: Core Architecture Component  
**Next Steps**: Begin Phase 1 implementation (MarketStateEncoder service)
