# Algo Worker -- Visual Flow Diagrams

> **ASCII diagrams for the 6-layer, 5-tier hierarchical architecture**

**Last Updated**: March 13, 2026

---

## 1. The Big Picture: 6-Layer Pipeline with 5-Tier Prediction

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         ALGO-WORKER 6-LAYER PIPELINE                           │
│                          Target: <80ms E2E (p95)                               │
│                          117 Features | 8 ONNX Models | 5 Tiers               │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: DATA INGESTION (<2ms)                                          │ │
│  │ Redis Streams: features:live, candles:1m, premarket:*                   │ │
│  │ + Redis cache: tier0:gap, tier1:regime, tier3:microstructure            │ │
│  └───────────────────────────────┬──────────────────────────────────────────┘ │
│                                  ↓                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: FEATURE ENGINE (<5ms)                                          │ │
│  │ Rust compute-engine (NAPI-RS) -- 117 features via Rayon parallel        │ │
│  │ Phase 1: Shared deps (VWAP, EMA, ATR, RSI, Greeks) ~2ms                │ │
│  │ Phase 2: 117 features parallel ~1ms                                     │ │
│  └───────────────────────────────┬──────────────────────────────────────────┘ │
│                                  ↓                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 3: 5-TIER PREDICTION ENGINE (<25ms GPU)                           │ │
│  │                                                                          │ │
│  │  Tier 0: XGBoost ─────────── gap, bias (CPU, once/day)          ─┐     │ │
│  │  Tier 1: HMM + PatchTST ─── regime, trend (CPU, once/day)       ├──┐  │ │
│  │  Tier 2: LightGBM+TFT+Mamba  direction (CPU+GPU, every 60s)     ├──┤  │ │
│  │  Tier 3: LiT Transformer ─── microstructure (GPU, every 100ms)   ├──┤  │ │
│  │  Tier 4: Meta-Learner ─────── final signal (CPU, every 60s)     ─┘  │  │ │
│  │                                          reads cached outputs ───────┘  │ │
│  └───────────────────────────────┬──────────────────────────────────────────┘ │
│                                  ↓                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 4: STRATEGY & RISK (<10ms)                                        │ │
│  │ 7 strategies x 4 regimes | Kelly position sizer | 7 risk checks        │ │
│  └───────────────────────────────┬──────────────────────────────────────────┘ │
│                                  ↓                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 5: EXECUTION (<20ms)                                              │ │
│  │ MARKET/TWAP/VWAP routing | Position tracking | Multi-criteria exits    │ │
│  └───────────────────────────────┬──────────────────────────────────────────┘ │
│                                  ↓                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 6: OBSERVABILITY (Async, non-blocking)                            │ │
│  │ Prometheus | QuestDB (180d) | MongoDB (5yr, SEBI) | Pino logging       │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Resolution Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│             DATA RESOLUTION HIERARCHY: Compute Once, Cache, Reuse              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  RESOLUTION           TIERS              SCHEDULE           CACHE              │
│  ─────────────────────────────────────────────────────────────────────────     │
│                                                                                 │
│  ┌──────────────┐                                                              │
│  │ DAILY (1d)   │──→ Tier 0: XGBoost    Once @ 09:08 ──→ tier0:gap:{date}   │
│  │ 26yr history │──→ Tier 1: HMM+PatchTST Once @ 09:09 → tier1:regime:{date}│
│  └──────────────┘    Compute ONCE, cache ALL DAY (TTL: 8hr)                   │
│         │                                                                       │
│         ↓                                                                       │
│  ┌──────────────┐                                                              │
│  │ MINUTE (1m)  │──→ Tier 2: LightGBM+TFT+Mamba                              │
│  │ 120-bar seq  │    Every 60s ──→ tier2:predictions:{ts}                     │
│  └──────────────┘    Reads Tier 0/1 cache as regime context (4 extra features)│
│         │            Cache TTL: 2hr rolling                                    │
│         ↓                                                                       │
│  ┌──────────────┐                                                              │
│  │ TICK (100ms) │──→ Tier 3: LiT Transformer                                 │
│  │ LOB depth-20 │    Self-driving loop every 100ms                            │
│  └──────────────┘    tier3:microstructure:latest (TTL: 10s)                   │
│         │                                                                       │
│         ↓                                                                       │
│  ┌──────────────┐                                                              │
│  │ CACHED ONLY  │──→ Tier 4: Meta-Learner (Contextual Gating Network)        │
│  │ No raw data  │    Reads Redis: tier0 + tier1 + tier2 + tier3               │
│  └──────────────┘    Every 60s ──→ Final signal (~2ms)                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 5-Tier Prediction Engine Detail

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     5-TIER HIERARCHICAL PREDICTION ENGINE                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─── TIER 0: Pre-Market Gap Predictor ───────────────────────────────────┐   │
│  │ Model:  XGBoost (500 trees, depth 6)                                    │   │
│  │ Input:  [1, 12] — 12 overnight features (ES, NQ, DXY, gold, ...)      │   │
│  │ Output: gap_pct, expected_volatility, directional_bias, confidence     │   │
│  │ EP:     CPUExecutionProvider | Thread: Main | Core: 0                  │   │
│  │ Fire:   Once @ 09:08:05 IST | Latency: ~2ms                           │   │
│  │ Cache:  tier0:gap:{date} — TTL 8hr                                     │   │
│  └────────────────────────────────────────────────────┬────────────────────┘   │
│                                                        ↓                       │
│  ┌─── TIER 1: Macro Director ─────────────────────────────────────────────┐   │
│  │ Models: HMM (regime) + PatchTST (daily trend)                          │   │
│  │ Input:  [1, 32] and [1, 252, 32] — 32 daily features, 26yr lookback  │   │
│  │ Output: regime_state (4-class), direction, magnitude, confidence      │   │
│  │ EP:     CPUExecutionProvider | Thread: Main | Core: 0                  │   │
│  │ Fire:   Once @ 09:09:00 IST | Latency: ~8ms                           │   │
│  │ Cache:  tier1:regime:{date} — TTL 8hr                                  │   │
│  └────────────────────────────────────────────────────┬────────────────────┘   │
│                                                        ↓                       │
│  ┌─── TIER 2: Intraday Navigator (3 parallel Workers) ────────────────────┐   │
│  │                                                                         │   │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐       │   │
│  │  │ LightGBM         │ │ TFT              │ │ Mamba            │       │   │
│  │  │ CPU Worker       │ │ GPU Worker       │ │ GPU Worker       │       │   │
│  │  │ Core 1           │ │ Core 2           │ │ Core 3           │       │   │
│  │  │ [1, 84] features │ │ [1, 120, 80] seq │ │ [1, 120, 80] seq│       │   │
│  │  │ EP: CPU          │ │ EP: TensorRT/CUDA│ │ EP: CUDA         │       │   │
│  │  │ ~5ms             │ │ ~12ms            │ │ ~10ms            │       │   │
│  │  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘       │   │
│  │           └────────────────────┼────────────────────┘                   │   │
│  │                                ↓                                        │   │
│  │                     Ensemble: P(up, down, flat)                         │   │
│  │  Fire: Every 60s on CandleComplete | Effective: ~12ms (parallel max)   │   │
│  │  Cache: tier2:predictions:{ts} — TTL 2hr                               │   │
│  └────────────────────────────────────────────────────┬────────────────────┘   │
│                                                        ↓                       │
│  ┌─── TIER 3: Microstructure Scalper (independent loop) ──────────────────┐   │
│  │ Model:  LiT Transformer (phased activation)                             │   │
│  │ Input:  [1, 14] — 14 order flow / LOB features                        │   │
│  │ Output: buy_pressure, sell_pressure, slippage_est, confidence          │   │
│  │ EP:     CUDAExecutionProvider | Thread: Dedicated Worker | Core: 4     │   │
│  │ Fire:   Every 100ms (self-driving, own Redis connection)               │   │
│  │ Cache:  tier3:microstructure:latest — TTL 10s                          │   │
│  │ Note:   Main thread NEVER calls Tier 3 — only reads cached output     │   │
│  └────────────────────────────────────────────────────┬────────────────────┘   │
│                                                        ↓                       │
│  ┌─── TIER 4: Meta-Learner ───────────────────────────────────────────────┐   │
│  │ Model:  Contextual Gating Network                                       │   │
│  │ Input:  [1, 24] — fused from Tier 0(4) + Tier 1(6) + Tier 2(9) +     │   │
│  │                    Tier 3(5) = 24 values (all from Redis cache)        │   │
│  │ Output: final_signal (-1 to +1), confidence, action, tier_weights     │   │
│  │ EP:     CPUExecutionProvider | Thread: Main | Core: 0                  │   │
│  │ Fire:   Every 60s (after Tier 2 completes) | Latency: ~2ms            │   │
│  │                                                                         │   │
│  │  Regime-Adaptive Weights:                                               │   │
│  │  ┌────────────────┬────────┬────────┬────────┬────────┐               │   │
│  │  │ Regime         │ Tier 0 │ Tier 1 │ Tier 2 │ Tier 3 │               │   │
│  │  ├────────────────┼────────┼────────┼────────┼────────┤               │   │
│  │  │ BULL_TRENDING  │  0.05  │  0.25  │  0.55  │  0.15  │               │   │
│  │  │ BEAR_TRENDING  │  0.05  │  0.25  │  0.50  │  0.20  │               │   │
│  │  │ VOLATILE       │  0.10  │  0.15  │  0.35  │  0.40  │               │   │
│  │  │ RANGING        │  0.05  │  0.20  │  0.45  │  0.30  │               │   │
│  │  └────────────────┴────────┴────────┴────────┴────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 60-Second Trading Cycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              60-SECOND TRADING CYCLE (e.g., 10:30:00 → 10:31:00)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TIME     EVENT                                                                │
│  ──────── ──────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  10:30:00 ┌─ CandleComplete event fires ─────────────────────────────────┐    │
│           │                                                               │    │
│  +0ms     │ [Layer 1] Redis receives features:live + candles:1m          │    │
│           │           Read cached: tier0, tier1, tier3 from Redis        │    │
│           │                                                    <2ms      │    │
│  +2ms     │ [Layer 2] Rust compute-engine: 117 features (Rayon)          │    │
│           │           Phase 1: Shared deps               ~2ms           │    │
│           │           Phase 2: 117 features parallel     ~1ms           │    │
│           │                                                    <5ms      │    │
│  +7ms     │ [Layer 3] Tier 2 fires (3 Workers in parallel)              │    │
│           │           ├─ LightGBM (CPU, Core 1)          ~5ms           │    │
│           │           ├─ TFT (TensorRT, Core 2)          ~12ms          │    │
│           │           └─ Mamba (CUDA, Core 3)            ~10ms          │    │
│           │           Effective: max(5, 12, 10) =        ~12ms          │    │
│           │                                                               │    │
│  +19ms    │ [Layer 3] Tier 3 cache read (latest output)  <1ms           │    │
│           │           Tier 0/1 cache read                 <1ms           │    │
│           │                                                               │    │
│  +21ms    │ [Layer 3] Tier 4 Meta-Learner fuses all      ~2ms           │    │
│           │           Final signal: direction + confidence               │    │
│           │                                                    <25ms     │    │
│  +25ms    │ [Layer 4] Strategy selection (regime x dir)  ~3ms           │    │
│           │           Strike selection (IV + delta)       ~2ms           │    │
│           │           Position sizing (Kelly + VIX)       ~1ms           │    │
│           │           Risk validation (7 checks)          ~2ms           │    │
│           │                                                    <10ms     │    │
│  +35ms    │ [Layer 5] Order routing (MARKET/TWAP/VWAP)   ~10ms          │    │
│           │           Position tracking update            ~5ms           │    │
│           │           Exit engine evaluation              ~3ms           │    │
│           │                                                    <20ms     │    │
│  +55ms    │ [Layer 6] Async: Prometheus, QuestDB, MongoDB                │    │
│           └──────────────────────────────────────────── TOTAL: <55ms ────┘    │
│                                                                                 │
│  MEANWHILE (independent of 60s cycle):                                         │
│  ──────────────────────────────────────────────────────────────────────────     │
│  Every    │ Tier 3 LiT Worker (Core 4, GPU, self-driving)                     │
│  100ms    │ 14 LOB features → tier3:microstructure:latest                     │
│           │ Latency: ~8ms per inference | Loop rate: 10 Hz                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. GPU/CPU Thread Allocation Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       GPU/CPU THREAD ALLOCATION MAP                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  CPU CORES                                                                     │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                 │
│  Core 0 ─── Node.js Event Loop (Main Thread)                                  │
│             ├── Redis Streams subscriber                                       │
│             ├── Event routing + orchestration                                  │
│             ├── Tier 0 XGBoost inference (~2ms, once/day)                     │
│             ├── Tier 1 HMM + PatchTST inference (~8ms, once/day)             │
│             └── Tier 4 Meta-Learner inference (~2ms, every 60s)              │
│                                                                                 │
│  Core 1 ─── Tier 2 LightGBM Worker Thread                                    │
│             EP: CPUExecutionProvider                                           │
│             Input: [1, 84] | Trigger: Every 60s | Latency: ~5ms              │
│                                                                                 │
│  Core 2 ─── Tier 2 TFT Worker Thread ─────── GPU CUDA Stream 0              │
│             EP: TensorrtExecutionProvider (FP16) > CUDAExecutionProvider      │
│             Input: [1, 120, 80] | Trigger: Every 60s | Latency: ~12ms        │
│             VRAM: ~120 MB (+ ~120 MB TensorRT cache)                          │
│                                                                                 │
│  Core 3 ─── Tier 2 Mamba Worker Thread ────── GPU CUDA Stream 0              │
│             EP: CUDAExecutionProvider                                          │
│             Input: [1, 120, 80] | Trigger: Every 60s | Latency: ~10ms        │
│             VRAM: ~80 MB                                                       │
│                                                                                 │
│  Core 4 ─── Tier 3 LiT Worker Thread ─────── GPU CUDA Stream 1              │
│             EP: CUDAExecutionProvider (separate stream, no contention)        │
│             Input: [1, 14] | Self-driving: Every 100ms | Latency: ~8ms       │
│             VRAM: ~60 MB                                                       │
│             Own Redis connection (reads LOB, writes tier3:latest)             │
│                                                                                 │
│  Core 5 ─── Rust compute-engine (Rayon thread pool)                           │
│             Runs in market-feeder process                                      │
│             117 features in <5ms (2-phase parallel)                            │
│                                                                                 │
│  Core 6-7 ─ OS / Redis Server / QuestDB / System services                     │
│                                                                                 │
│                                                                                 │
│  GPU VRAM ALLOCATION                                                           │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────┐                  │
│  │ CUDA Stream 0 (Tier 2, shared)                           │                  │
│  │ ┌──────────────────┐ ┌──────────────────┐               │                  │
│  │ │ TFT FP16         │ │ Mamba            │               │                  │
│  │ │ ~120 MB model    │ │ ~80 MB model     │               │                  │
│  │ │ ~120 MB TRT cache│ │                  │               │                  │
│  │ └──────────────────┘ └──────────────────┘               │                  │
│  └──────────────────────────────────────────────────────────┘                  │
│  ┌──────────────────────────────────────────────────────────┐                  │
│  │ CUDA Stream 1 (Tier 3, independent)                      │                  │
│  │ ┌──────────────────┐                                     │                  │
│  │ │ LiT Transformer  │  No head-of-line blocking with     │                  │
│  │ │ ~60 MB model     │  Tier 2 models. Independent loop.  │                  │
│  │ └──────────────────┘                                     │                  │
│  └──────────────────────────────────────────────────────────┘                  │
│  ┌──────────────────────────────────────────────────────────┐                  │
│  │ Workspace memory: ~80 MB                                  │                  │
│  └──────────────────────────────────────────────────────────┘                  │
│                                                                                 │
│  Total VRAM: ~460 MB (fits RTX 3050 4GB with headroom)                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Feature Construction: 117 Features in 2 Phases

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│       RUST COMPUTE-ENGINE: 117 FEATURES IN <5ms (Rayon Parallel)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  INPUT: Market tick data (NIFTY Future + 50 Constituents + Option Chain)       │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 1: Shared Dependencies (~2ms, sequential within phase)             │  │
│  │                                                                          │  │
│  │  ├─ VWAP (future + 50 constituents)                                     │  │
│  │  ├─ EMA (12, 20, 26 periods)                                            │  │
│  │  ├─ ATR (14 periods)                                                     │  │
│  │  ├─ RSI (5, 14 periods)                                                  │  │
│  │  ├─ MACD (12/26/9)                                                       │  │
│  │  ├─ Bollinger Bands (20, 2sigma)                                         │  │
│  │  ├─ ADX (14 periods)                                                     │  │
│  │  ├─ Stochastic (14/3)                                                    │  │
│  │  ├─ Realized Volatility (5m, 15m, 30m windows)                          │  │
│  │  ├─ Option Greeks (BSM: delta, gamma, vega, theta, charm, vanna)        │  │
│  │  ├─ Rolling Correlations (20-period)                                     │  │
│  │  └─ Historical Caches (120-bar lookback)                                 │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│                                     ↓                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 2: 117 Features in Parallel (~1ms via Rayon)                       │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │  │
│  │  │ Index Breadth (8)  │  │ NIFTY Future (12)  │  │ Options (14)     │  │  │
│  │  │ pct_above_vwap     │  │ fut_rsi_14         │  │ atm_iv           │  │  │
│  │  │ breadth_thrust     │  │ fut_macd           │  │ pcr_oi           │  │  │
│  │  │ advance_decline    │  │ fut_atr_pct        │  │ total_gex        │  │  │
│  │  │ ...                │  │ ...                │  │ ...              │  │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │  │
│  │  │ Volatility (10)    │  │ Order Flow (8)     │  │ Price Struct (8) │  │  │
│  │  │ india_vix          │  │ ofi_1s             │  │ return_1m        │  │  │
│  │  │ iv_rv_ratio        │  │ depth_imbalance    │  │ gap_open         │  │  │
│  │  │ vol_of_vol         │  │ trade_imbalance    │  │ intraday_range   │  │  │
│  │  │ ...                │  │ ...                │  │ ...              │  │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │  │
│  │  │ Momentum (8)       │  │ Time Context (13)  │  │ Global Macro (12)│  │  │
│  │  │ rsi_5, rsi_14      │  │ minutes_from_open  │  │ es_return        │  │  │
│  │  │ macd_histogram     │  │ sin/cos encodings  │  │ nq_return        │  │  │
│  │  │ adx_14, cci_20     │  │ is_expiry_day      │  │ dxy_change       │  │  │
│  │  │ ...                │  │ ...                │  │ ...              │  │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │  │
│  │  │ Regime Context (4) │  │ Volume Profile (6) │  │ Cross-Asset (4)  │  │  │
│  │  │ regime_bull (1-hot)│  │ volume_ratio_5m    │  │ nifty_bnf_corr   │  │  │
│  │  │ regime_bear        │  │ oi_change_pct_*    │  │ futures_basis     │  │  │
│  │  │ regime_volatile    │  │ cumulative_delta   │  │ ...              │  │  │
│  │  │ regime_ranging     │  │ ...                │  │                  │  │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐                        │  │
│  │  │ LOB Microstr. (6)  │  │ Sentiment (4)      │                        │  │
│  │  │ depth_imbal_10     │  │ finbert_sentiment  │                        │  │
│  │  │ sweep_detection    │  │ fii_flow_signal    │                        │  │
│  │  │ large_order_flow   │  │ dii_flow_signal    │                        │  │
│  │  │ ...                │  │ news_event_flag    │                        │  │
│  │  └────────────────────┘  └────────────────────┘                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  OUTPUT: Float32Array(117) → Redis Stream features:live                        │
│  Total: Phase 1 (~2ms) + Phase 2 (~1ms) = <5ms (p95)                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Feature → Tier Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE → TIER CONSUMPTION MAP                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  117 Features ──┬── Tier 0 consumes: 12 overnight features (Global Macro)     │
│  (compute-     │   Input: [1, 12] — ES, NQ, DXY, US10Y, Gold, Brent,        │
│   engine)      │   Nikkei, GIFT Nifty, VIX, FinBERT, prev_day_range         │
│                │                                                               │
│                ├── Tier 1 consumes: 32 daily features (aggregated)            │
│                │   Input: [1, 32] point + [1, 252, 32] sequence              │
│                │   Selected from Breadth, Future, Volatility, Momentum       │
│                │                                                               │
│                ├── Tier 2 LightGBM consumes: 84 point-in-time features       │
│                │   Input: [1, 84] — features #1-81 + regime context #94-97   │
│                │                                                               │
│                ├── Tier 2 TFT/Mamba consumes: 120-bar sequence               │
│                │   Input: [1, 120, 80] — 120 minutes x 80 features           │
│                │                                                               │
│                ├── Tier 3 LiT consumes: 14 LOB/order flow features           │
│                │   Input: [1, 14] — Order Flow(8) + LOB Microstructure(6)    │
│                │                                                               │
│                └── Tier 4 consumes: 24 cached tier outputs (NO raw features) │
│                    Input: [1, 24] — Tier0(4) + Tier1(6) + Tier2(9) +        │
│                                     Tier3(5) = 24 values from Redis          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   3-TIER STORAGE ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ HOT: Redis (In-Memory)                                                    │ │
│  │ Retention: <5 minutes  |  Access: <1ms  |  Purpose: Real-time state      │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ tier0:gap:{date}              │ Tier 0 output (4 values)     │ TTL 8hr  │ │
│  │ tier1:regime:{date}           │ Tier 1 output (6 values)     │ TTL 8hr  │ │
│  │ tier2:predictions:{ts}        │ Tier 2 output (ensemble)     │ TTL 2hr  │ │
│  │ tier3:microstructure:latest   │ Tier 3 output (5 values)     │ TTL 10s  │ │
│  │ positions:open                │ Open position state           │ TTL 1hr  │ │
│  │ portfolio:greeks              │ Portfolio-level Greeks        │ TTL 1hr  │ │
│  │ features:latest               │ Latest 117 features           │ TTL 5min │ │
│  └───────────────────────────────┴─────────────────────────────┴──────────┘ │
│                                     ↓ (async batch write)                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ WARM: QuestDB (Time-Series Columnar)                                      │ │
│  │ Retention: 180 days  |  Access: <10ms  |  Purpose: Training data         │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ instrument_features_1m        │ 117 features per minute     │ Partitioned│ │
│  │ market_ticks                  │ Raw OHLCV ticks             │ by day     │ │
│  │ model_predictions             │ Per-tier outputs + latency  │            │ │
│  │ portfolio_snapshots           │ PnL, Greeks, exposure       │            │ │
│  └───────────────────────────────┴─────────────────────────────┴──────────┘ │
│                                     ↓ (daily batch sync)                       │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ COLD: MongoDB (Document Store)                                            │ │
│  │ Retention: 5 years  |  Access: <100ms  |  Purpose: SEBI audit trail     │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ orders                        │ Every order placed           │ SEBI 2024 │ │
│  │ signals                       │ Every trading signal         │ compliant │ │
│  │ risk_events                   │ Circuit breakers, risk logs  │ 5-year    │ │
│  │ model_versions                │ ONNX model metadata          │ retention │ │
│  │ audit_trail                   │ Unique Algo ID per order     │           │ │
│  └───────────────────────────────┴─────────────────────────────┴──────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Complete Event Flow (Production, 60s Cycle)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  PRODUCTION EVENT FLOW: ONE 60-SECOND CYCLE                     │
│                          TIME: 10:30:00 (Market Active)                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                              [CandleComplete event]
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DATA INGESTION                                               <2ms    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Redis Streams: features:live (117 features) + candles:1m (OHLCV)              │
│ Redis Cache:   tier0:gap:2026-03-13 (if available)                            │
│                tier1:regime:2026-03-13 (if available)                          │
│                tier3:microstructure:latest (from 100ms loop)                   │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: FEATURE ENGINE (Rust, Rayon)                                 <5ms    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Shared deps (VWAP, EMA, ATR, RSI, Greeks)                   ~2ms    │
│ Phase 2: 117 features parallel across 14 categories                  ~1ms    │
│ Output: Float32Array(117) + feature timings                                   │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: PREDICTION (5-Tier Hierarchical)                             <25ms   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ [Tier 2] 3 Workers in parallel:                                                │
│   Core 1: LightGBM [1,84] → probs [P(up), P(down), P(flat)]         ~5ms    │
│   Core 2: TFT [1,120,80] → quantiles [3x3]                          ~12ms   │
│   Core 3: Mamba [1,120,80] → probs [P(up), P(down), P(flat)]        ~10ms   │
│   Effective: max(5, 12, 10) = ~12ms (parallel)                                │
│                                                                                 │
│ [Tier 3] Cache read: tier3:microstructure:latest                     <1ms    │
│ [Tier 0/1] Cache read: tier0:gap, tier1:regime                       <1ms    │
│                                                                                 │
│ [Tier 4] Meta-Learner fuses Tier 0(4)+1(6)+2(9)+3(5) = [1,24]      ~2ms    │
│   Output: signal=-0.65, confidence=0.78, action=ENTER_SHORT                   │
│   Tier weights: {t0: 0.05, t1: 0.25, t2: 0.50, t3: 0.20}                   │
│                                                                                 │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: STRATEGY & RISK                                              <10ms   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ StrategySelector: BEAR_TRENDING + SHORT → LONG_PUT                            │
│ StrikeSelector:   Delta -0.35 → 24400 PE                                     │
│ PositionSizer:    Kelly * VIX_scale * regime_scale → 3 lots                   │
│ RiskValidator:    7 checks passed (positions, capital, Greeks, leverage, time) │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: EXECUTION                                                    <20ms   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ OrderManager: MARKET order for 3 lots of 24400 PE via Upstox API              │
│ PositionTracker: Update open positions, Greeks, exposure                       │
│ ExitEngine: Set stop-loss at 1.5x ATR, trailing stop at 40%                  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 6: OBSERVABILITY                                               Async    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Prometheus: prediction.tier2_parallel_ms=12, risk.kelly_fraction=0.034        │
│ QuestDB:    Insert features + predictions for training pipeline               │
│ MongoDB:    Persist order + signal for SEBI audit trail (Unique Algo ID)      │
│ Pino:       Structured JSON log with full tier outputs and latency            │
└─────────────────────────────────────────────────────────────────────────────────┘

                    TOTAL LATENCY: ~55ms (p95 target: <80ms)
```

---

## 10. Pre-Market Session Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     PRE-MARKET SESSION FLOW (08:30 → 09:16 IST)                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  08:30  market-feeder: Overnight collector                                     │
│         ├─ Fetch: ES, NQ, DXY, US10Y, Gold, Brent, Nikkei, GIFT Nifty       │
│         ├─ Compute: 12 overnight features                                      │
│         └─ Publish: premarket:overnight → Redis                                │
│                                          ↓                                     │
│  09:00  market-feeder: Connect to Upstox WebSocket (pre-open instruments)     │
│         Monitor pre-open order flow (informational only)                       │
│                                          ↓                                     │
│  09:08  NSE Pre-Open Freeze (equilibrium price discovered)                    │
│  09:08:05  market-feeder: Capture freeze → premarket:freeze → Redis           │
│            algo-worker:   Tier 0 XGBoost fires (~2ms)                         │
│                           Output → tier0:gap:{date} (cached all day)          │
│                                          ↓                                     │
│  09:09  algo-worker: Tier 1 HMM + PatchTST fires (~8ms)                      │
│         Input: 252 daily candles × 32 features from QuestDB                   │
│         Output → tier1:regime:{date} (cached all day)                          │
│         Regime: BULL_TRENDING | BEAR_TRENDING | VOLATILE | RANGING            │
│                                          ↓                                     │
│  09:15  NSE Normal Market Opens                                                │
│         market-feeder: Full tick streaming mode (~150 instruments)             │
│         algo-worker: All tiers operational                                      │
│                                          ↓                                     │
│  09:16  First 1-minute candle completes                                        │
│         First complete 60s cycle: Tier 2 + Tier 4 fire                        │
│         Tier 3 LOB monitoring active (100ms loop)                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Latency Summary

| Layer     | Component                     | GPU (ms)  | CPU-Only (ms) |
| --------- | ----------------------------- | --------- | ------------- |
| 1         | Data Ingestion                | 1         | 1             |
| 2         | Feature Engine (117 features) | 3         | 3             |
| 3         | Tier 2 Inference (parallel)   | **12**    | 35            |
| 3         | Tier 3 Cache Read             | 0.5       | 0.5           |
| 3         | Tier 4 Meta-Learner           | 2         | 2             |
| 4         | Strategy + Risk               | 8         | 8             |
| 5         | Execution                     | 15        | 15            |
| **Total** | **E2E**                       | **~43ms** | **~66ms**     |
| Target    | p95                           | **<80ms** | —             |

---

**Last Updated**: March 13, 2026
**See Also**: [ARCHITECTURE.md](./ARCHITECTURE.md) | [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md) | [03-PREDICTION.md](./layers/03-PREDICTION.md)
