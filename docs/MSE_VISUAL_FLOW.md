# Market State Encoder - Visual Flow Diagram

> **ASCII diagrams showing the complete data flow from 50+ instruments to model predictions**

---

## 1. The Big Picture: Multi-Instrument → Single State

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RAW MARKET REALITY (Layer 1)                     │
│                      ~50,000 signals/second                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ NIFTY FUTURE     │  │ 50 Constituents  │  │ Option Chain     │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  │
│  │ • OHLCV (1s)     │  │ • RELIANCE       │  │ • 50 strikes     │  │
│  │ • LOB depth-20   │  │ • HDFC           │  │ • Greeks         │  │
│  │ • Trades         │  │ • ICICI          │  │ • OI + Volume    │  │
│  │ • Volume         │  │ • ... (47 more)  │  │ • LOB (ATM)      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│       80 numbers           ~40,000 numbers          300 numbers     │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│              MARKET STATE ENCODER (Layer 2 - Cortex)                │
│                   Compression Ratio: 250:1                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Sub-Component Pipeline (Parallel Execution)                  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                               │  │
│  │  [IndexAggregator]  [BreadthComputer]  [AlignmentScorer]    │  │
│  │         ↓                   ↓                   ↓             │  │
│  │    Structural           Participation      Correlation       │  │
│  │    Metrics              Metrics            Metrics            │  │
│  │                                                               │  │
│  │  [LOBTensorBuilder]  [RegimeFeatureBuilder]                  │  │
│  │         ↓                     ↓                               │  │
│  │   Microstructure          Temporal                           │  │
│  │   Tensors                 Features                           │  │
│  │                                                               │  │
│  │  [ExecutionStateBuilder]                                     │  │
│  │         ↓                                                     │  │
│  │   Execution State                                            │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  MODEL-SPECIFIC ENCODED STATES                      │
│                      ~200-500 numbers                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ LightGBM View   │  │ TFT View        │  │ LiT View        │    │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤    │
│  │ Float32Array(33)│  │ (120×15) matrix │  │ (60×80) tensor  │    │
│  │                 │  │                 │  │                 │    │
│  │ • Index (10)    │  │ • Returns       │  │ • Bid prices    │    │
│  │ • Futures (8)   │  │ • Volatility    │  │ • Ask prices    │    │
│  │ • Options (10)  │  │ • Breadth       │  │ • Bid sizes     │    │
│  │ • Time (5)      │  │ • Momentum      │  │ • Ask sizes     │    │
│  │                 │  │ • IV changes    │  │ (normalized)    │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  PREDICTION MODELS (Layer 4)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ LightGBM        │  │ TFT             │  │ LiT             │    │
│  │ (Macro)         │  │ (Regime)        │  │ (Micro)         │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                ↓                                     │
│                     ┌────────────────────┐                          │
│                     │  Meta-Learner      │                          │
│                     │  (Contextual Gate) │                          │
│                     └──────────┬─────────┘                          │
│                                ↓                                     │
│                    ┌──────────────────────┐                         │
│                    │ FINAL PREDICTION     │                         │
│                    │ VOL_UP (75% conf.)   │                         │
│                    └──────────────────────┘                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed: How Breadth Computer Works

```
┌─────────────────────────────────────────────────────────────────────┐
│               INPUT: 50 NIFTY Constituents (Raw Data)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Stock  │ LTP     │ VWAP    │ Change% │ Mom_5min │ Volume │ Weight │
│  ───────┼─────────┼─────────┼─────────┼──────────┼────────┼────────│
│  RELI   │ 2450.30 │ 2445.00 │ +0.8%   │ +0.5%    │ 1.2M   │ 10.5%  │
│  HDFC   │ 1620.50 │ 1625.00 │ -0.3%   │ -0.2%    │ 0.8M   │ 8.2%   │
│  ICICI  │ 1050.20 │ 1048.00 │ +0.2%   │ +0.3%    │ 1.5M   │ 7.8%   │
│  ...    │ ...     │ ...     │ ...     │ ...      │ ...    │ ...    │
│  TCS    │ 3800.00 │ 3795.00 │ +0.1%   │ +0.1%    │ 0.9M   │ 6.5%   │
│                                                                       │
│  Total: 50 stocks × 7 features = 350 numbers                        │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  BreadthComputer      │
                        │  (Aggregation Logic)  │
                        └───────────┬───────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│              OUTPUT: 5 Aggregated Breadth Metrics                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. pct_stocks_above_vwap = 36 / 50 = 0.72                          │
│     → 72% of stocks trading above VWAP (bullish)                    │
│                                                                       │
│  2. pct_stocks_trending_up = 34 / 50 = 0.68                         │
│     → 68% of stocks with positive 5-min momentum                    │
│                                                                       │
│  3. advance_decline_ratio = 36 / 14 = 1.8                           │
│     → 36 stocks advancing, 14 declining (strong buying)             │
│                                                                       │
│  4. weighted_return_top_10 = 0.8%                                   │
│     → Top 10 weighted stocks average +0.8% (leadership)             │
│                                                                       │
│  5. sector_alignment_score = 0.65                                   │
│     → Moderate intra-sector correlation (cohesive move)             │
│                                                                       │
│  Compression: 350 numbers → 5 numbers (70:1 ratio)                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Usage Example**:

```
IF futures_spike > 50_points:
    IF breadth.pct_stocks_above_vwap > 0.6:
        SIGNAL = "REAL_MOVE" (high participation)
    ELSE:
        SIGNAL = "FALSE_BREAKOUT" (low participation)
```

---

## 3. Detailed: LightGBM Feature Construction

```
┌─────────────────────────────────────────────────────────────────────┐
│         INPUT SOURCES (Multi-Instrument Data)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │ 50 Constituents │   │ NIFTY FUTURE    │   │ Option Chain    │  │
│  │ (via Breadth)   │   │ (direct)        │   │ (via Greeks)    │  │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘  │
│           │                     │                     │             │
│           ↓                     ↓                     ↓             │
│    ┌──────────────┐      ┌──────────────┐     ┌──────────────┐   │
│    │IndexAggregator│      │FuturesCache  │     │OptionFeatures│   │
│    │BreadthComputer│      │              │     │              │   │
│    │AlignmentScorer│      │              │     │              │   │
│    └──────┬───────┘      └──────┬───────┘     └──────┬───────┘   │
│           │                     │                     │             │
│           ↓                     ↓                     ↓             │
│      10 features            8 features           10 features        │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│             LightGBM Feature Vector (33 total)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  GROUP 1: Index Aggregation (10 features)                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [0] pct_stocks_above_vwap        = 0.72                     │   │
│  │ [1] pct_stocks_trending_up       = 0.68                     │   │
│  │ [2] advance_decline_ratio        = 1.8                      │   │
│  │ [3] weighted_return_top_10       = 0.008 (+0.8%)            │   │
│  │ [4] sector_alignment_score       = 0.65                     │   │
│  │ [5] correlation_to_leader        = 0.72                     │   │
│  │ [6] divergence_score             = 0.15                     │   │
│  │ [7] participation_index          = 1.3 (30% above avg vol)  │   │
│  │ [8] intraday_range_position      = 0.75 (high in range)     │   │
│  │ [9] overnight_gap                = 0.005 (+0.5% gap)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  GROUP 2: Futures Features (8 features)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [10] price_vs_vwap               = 0.002 (+0.2% above)      │   │
│  │ [11] range_position              = 0.80 (near high)         │   │
│  │ [12] atr_normalized              = 1.2 (20% above avg)      │   │
│  │ [13] momentum_5min               = 0.004 (+0.4%)            │   │
│  │ [14] momentum_15min              = 0.006 (+0.6%)            │   │
│  │ [15] rsi_14                      = 58 (mild bullish)        │   │
│  │ [16] volume_vs_avg               = 1.3 (30% above)          │   │
│  │ [17] basis                       = 5.2 (future premium)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  GROUP 3: Options Features (10 features)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [18] atm_iv                      = 18.5 (current IV)        │   │
│  │ [19] iv_change_5min              = 1.2 (IV rising)          │   │
│  │ [20] iv_rank                     = 0.45 (45th percentile)   │   │
│  │ [21] pcr_oi                      = 1.2 (more puts)          │   │
│  │ [22] pcr_volume                  = 0.9 (balanced)           │   │
│  │ [23] max_pain_distance           = 50 (50 points from MP)   │   │
│  │ [24] gamma_atm                   = 0.008                    │   │
│  │ [25] delta_weighted_oi           = 0.15 (net long delta)    │   │
│  │ [26] skew                        = -2.5 (negative skew)     │   │
│  │ [27] term_structure              = -0.5 (inverted)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  GROUP 4: Time Context (5 features)                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [28] minutes_from_open           = 75 (10:30 AM)            │   │
│  │ [29] minutes_to_close            = 300 (5 hours left)       │   │
│  │ [30] is_first_hour               = 0 (no)                   │   │
│  │ [31] is_last_hour                = 0 (no)                   │   │
│  │ [32] days_to_expiry              = 2 (near expiry)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
                          ┌──────────────────┐
                          │  LightGBM Model  │
                          │  (ONNX Runtime)  │
                          └────────┬─────────┘
                                   ↓
                    ┌──────────────────────────┐
                    │ OUTPUT:                  │
                    │ probs: [0.1, 0.7, 0.2]   │
                    │ direction: VOL_UP        │
                    │ confidence: 0.7          │
                    └──────────────────────────┘
```

---

## 4. Detailed: LiT LOB Tensor Construction

```
┌─────────────────────────────────────────────────────────────────────┐
│          INPUT: NIFTY FUTURE LOB (depth-20, 60 seconds)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Timestamp: 10:30:00 (t=0)                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ BID SIDE (20 levels)      │  ASK SIDE (20 levels)            │  │
│  ├───────────┬───────────────┼───────────┬──────────────────────┤  │
│  │ Price     │ Size          │ Price     │ Size                 │  │
│  ├───────────┼───────────────┼───────────┼──────────────────────┤  │
│  │ 24449.00  │ 50 lots       │ 24451.00  │ 30 lots              │  │
│  │ 24448.50  │ 75 lots       │ 24451.50  │ 45 lots              │  │
│  │ 24448.00  │ 100 lots      │ 24452.00  │ 60 lots              │  │
│  │ ...       │ ...           │ ...       │ ...                  │  │
│  │ 24430.00  │ 500 lots      │ 24470.00  │ 400 lots             │  │
│  └───────────┴───────────────┴───────────┴──────────────────────┘  │
│                                                                       │
│  Mid-price = (24449 + 24451) / 2 = 24450                            │
│                                                                       │
│  ... (59 more timesteps, 1-second intervals)                        │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  LOBTensorBuilder     │
                        │  (Normalization)      │
                        └───────────┬───────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│            OUTPUT: Normalized LOB Tensor (60×80)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Shape: (60 timesteps, 80 features)                                 │
│                                                                       │
│  For each timestep t:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Features [0-19]:   Bid prices (normalized)                  │   │
│  │   = (bid_price - mid) / mid                                 │   │
│  │   Example: (24449 - 24450) / 24450 = -0.00004               │   │
│  │                                                              │   │
│  │ Features [20-39]:  Bid sizes (normalized)                   │   │
│  │   = bid_size / 1000                                         │   │
│  │   Example: 50 / 1000 = 0.05                                 │   │
│  │                                                              │   │
│  │ Features [40-59]:  Ask prices (normalized)                  │   │
│  │   = (ask_price - mid) / mid                                 │   │
│  │   Example: (24451 - 24450) / 24450 = +0.00004               │   │
│  │                                                              │   │
│  │ Features [60-79]:  Ask sizes (normalized)                   │   │
│  │   = ask_size / 1000                                         │   │
│  │   Example: 30 / 1000 = 0.03                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Total: 60 timesteps × 80 features = 4,800 numbers                  │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
                          ┌──────────────────┐
                          │  LiT Model       │
                          │  (Transformer)   │
                          └────────┬─────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │ OUTPUT:                      │
                    │ micro_direction: BUY_PRESSURE│
                    │ confidence: 0.65             │
                    │ imminent_move_prob: 0.7      │
                    │ expected_move_bps: 8         │
                    └──────────────────────────────┘
```

**Key Points**:

- ONLY uses NIFTY FUTURE LOB (NOT spot - spot has no order book)
- Normalized relative to mid-price (price-invariant)
- 60 seconds of history (captures microstructure dynamics)
- Data quality gates: staleness <2s, spread <0.5%, depth ≥10 levels

---

## 5. Complete Event Flow (Production)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  TIME: 10:30:00 (Market Active)                     │
└─────────────────────────────────────────────────────────────────────┘

                              ↓ [1s tick]

┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 1: PERCEPTION                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  • WebSocket receives: Futures tick, 50 stock ticks, option quotes  │
│  • Validates, normalizes, timestamps                                │
│  • Publishes: MarketDataReceivedEvent                               │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<5ms]
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: CORTEX (Market State Encoder)                             │
├─────────────────────────────────────────────────────────────────────┤
│  • FeatureCache.update() - Update sliding windows                   │
│  • Parallel execution:                                               │
│    ├─ buildLightGBMFeatures() → Float32Array(33)      [5ms]        │
│    ├─ buildTFTFeatures() → Float32Array(120×15)       [8ms]        │
│    └─ buildLiTTensor() → Float32Array(60×80) or null  [3ms]        │
│  • Data quality validation (LOB staleness, spread)                  │
│  • Publishes:                                                        │
│    ├─ LightGBMStateReadyEvent                                       │
│    ├─ TFTStateReadyEvent                                            │
│    └─ LiTStateReadyEvent                                            │
│  • Async persist to QuestDB (non-blocking)                          │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<15ms total]
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 4: PREDICTION (Parallel Inference)                           │
├─────────────────────────────────────────────────────────────────────┤
│  • LightGBM Worker Thread receives encoded state                    │
│    └─ Inference: Float32Array(33) → probs [0.1, 0.7, 0.2]  [45ms] │
│  • TFT Worker Thread receives encoded state                         │
│    └─ Inference: (120×15) → regime: TREND, vol: 22.5       [75ms] │
│  • LiT Worker Thread receives encoded state (if not null)           │
│    └─ Inference: (60×80) → micro: BUY_PRESSURE             [8ms]  │
│  • Meta-Learner fuses signals                              [20ms]  │
│  • Publishes: FinalPredictionEvent                                  │
│    ├─ direction: VOL_UP                                             │
│    ├─ confidence: 0.75                                              │
│    ├─ reasoning: "Breadth + momentum + LOB aligned"                 │
│    └─ model_weights: {lgbm: 0.55, lit: 0.30, tft: 0.15}            │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<145ms total]
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 5: COGNITION (Strategy Selection)                            │
├─────────────────────────────────────────────────────────────────────┤
│  • StrategySelector: VOL_UP + TREND → LONG_CALL                     │
│  • StrikeSelector: Delta 0.35-0.50 → 24500 CE                       │
│  • PositionSizer: Kelly criterion → 2 lots                          │
│  • Publishes: StrategySelectedEvent                                 │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<10ms]
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 6: RISK VALIDATION                                            │
├─────────────────────────────────────────────────────────────────────┤
│  • Check position limits: ✓ OK                                      │
│  • Check Greeks limits: ✓ OK                                        │
│  • Check max loss per trade: ✓ OK (5% of capital)                  │
│  • Check circuit breakers: ✓ All clear                              │
│  • Publishes: OrderValidatedEvent                                   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<5ms]
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 7: EXECUTION (Order Management)                              │
├─────────────────────────────────────────────────────────────────────┤
│  • DRL PPO Agent (optional):                                        │
│    ├─ State: Option LOB, spread, remaining qty                      │
│    ├─ Action: Limit @ 75 (mid-price), wait 30s                     │
│    └─ If not filled → Hit ask @ 77                                 │
│  • OrderManager places order via Upstox API                         │
│  • Publishes: OrderPlacedEvent                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓ [<10ms]

                         TOTAL LATENCY: ~145ms ✓
                         TARGET: <150ms ✓✓
```

---

## 6. Storage Architecture (Training Pipeline)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION (algo-worker)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Every 1 second:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ MarketStateEncoder.encode()                                 │   │
│  │   ├─ lightgbm_features: Float32Array(33)                    │   │
│  │   ├─ tft_features: Float32Array(120×15)                     │   │
│  │   └─ lit_tensor: Float32Array(60×80)                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│                   [Batch every 60s]                                 │
│                           ↓                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ QuestDB.insert()                                            │   │
│  │   ├─ lightgbm_states (33 columns + labels)                  │   │
│  │   ├─ tft_states (15 columns)                                │   │
│  │   └─ lit_tensors (BLOB + metadata)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    QUESTDB (Time-Series Storage)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Table: lightgbm_states                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ timestamp | pct_stocks_above_vwap | ... | label_5min | ...  │   │
│  │ 10:30:00  | 0.72                  | ... | +1         | ...  │   │
│  │ 10:30:01  | 0.73                  | ... | +1         | ...  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Retention: 180 days (partitioned by day)                           │
│                                                                       │
│  Table: tft_states (similar)                                        │
│  Table: lit_tensors (compressed BLOBs)                              │
│                                                                       │
└───────────────────────────────────┬─────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                TRAINING PIPELINE (Python/Kedro)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  def fetch_training_data(start, end):                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ query = "SELECT * FROM lightgbm_states                      │   │
│  │          WHERE timestamp BETWEEN $1 AND $2"                 │   │
│  │ df = questdb.execute(query, start, end)                     │   │
│  │                                                              │   │
│  │ X = df[FEATURE_COLUMNS].values  # (N, 33) ✓                │   │
│  │ y = df['label_15min'].values    # (N,) ✓                   │   │
│  │                                                              │   │
│  │ # NO feature engineering needed!                            │   │
│  │ # Features already computed in production                   │   │
│  │                                                              │   │
│  │ return X, y                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ lgb.train(params, X_train, y_train)                         │   │
│  │ # Training features = Production features (guaranteed!)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Benefit**: Training = Production (exact same features, no drift)

---

**Last Updated**: January 13, 2026  
**Purpose**: Visual reference for Market State Encoder architecture  
**See Also**: [MARKET_STATE_ENCODER.md](./MARKET_STATE_ENCODER.md)
