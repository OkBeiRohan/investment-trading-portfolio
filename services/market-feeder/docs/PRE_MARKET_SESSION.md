# Pre-Market Session Handling

> Specification for how market-feeder orchestrates the NSE pre-open session: overnight data
> collection, pre-open capture, freeze processing, synthetic Greeks generation, daily candle
> preparation, and handoff to continuous trading at 09:15 IST.

**Last Updated**: March 17, 2026
**Service**: market-feeder
**Runtime**: NestJS + TypeScript
**Port**: 3002
**Consumers**: algo-worker (Tier 0/1 inference), risk-manager (pre-trade checks), compute-engine (feature pipeline)

---

## Table of Contents

1. [NSE Pre-Market Session Overview](#1-nse-pre-market-session-overview)
2. [Overnight Data Collection (08:30 IST)](#2-overnight-data-collection-0830-ist)
3. [Pre-Open Session Capture (09:00 - 09:08 IST)](#3-pre-open-session-capture-0900---0908-ist)
4. [Pre-Open Freeze (09:08 IST)](#4-pre-open-freeze-0908-ist)
5. [Synthetic Greeks Generation (09:08 - 09:09 IST)](#5-synthetic-greeks-generation-0908---0909-ist)
6. [Daily Candle Preparation (09:09 IST)](#6-daily-candle-preparation-0909-ist)
7. [Timeline](#7-timeline)
8. [Redis Cache Keys Set Pre-Market](#8-redis-cache-keys-set-pre-market)
9. [Error Handling](#9-error-handling)
10. [Configuration](#10-configuration)

---

## 1. NSE Pre-Market Session Overview

The National Stock Exchange of India conducts a pre-open session every trading day from 09:00 to
09:15 IST. This session determines the opening price for all securities through a call auction
mechanism. The market-feeder service aligns its data capture, model inference triggers, and
pre-trade calculations precisely to this timeline.

### Exchange Phase Breakdown

```
09:00:00 ────────────── 09:08:00 ────────────── 09:15:00
    |                       |                       |
    |   ORDER ENTRY         |   ORDER MATCHING      |
    |   PERIOD              |   PERIOD              |
    |                       |                       |
    |  Participants may     |  No new orders,       |
    |  place, modify, or    |  modifications, or    |
    |  cancel orders in     |  cancellations        |
    |  the pre-open book.   |  accepted.            |
    |  Indicative price     |  NSE match engine     |
    |  fluctuates with      |  determines the       |
    |  each order update.   |  equilibrium price    |
    |                       |  that maximizes       |
    |                       |  tradeable volume.    |
    |                       |                       |
   09:00                  09:08                   09:15
```

| Phase | Time (IST) | Duration | Exchange Behavior | Orders Allowed |
|---|---|---|---|---|
| **Order Entry** | 09:00:00 - 09:07:59 | 8 min | Orders placed, modified, cancelled. Indicative price computed continuously. | Yes (all operations) |
| **Pre-Open Freeze** | 09:08:00 | Instant | Book frozen. No further modifications permitted. Equilibrium price discovered. | No |
| **Order Matching** | 09:08:00 - 09:14:59 | ~7 min | Match engine calculates equilibrium opening price via multilateral matching. | No |
| **Market Open** | 09:15:00 | Instant | Continuous trading begins at the determined opening price. | Yes (continuous) |

### Why This Matters

The pre-open session creates a 7-minute window (09:08 to 09:15) during which the system knows
the indicative opening price but the market has not yet opened. This window is exploited for:

1. **Tier 0 inference** -- XGBoost gap predictor fires at 09:08:05 using the frozen equilibrium price.
2. **Tier 1 inference** -- HMM + PatchTST regime classifier fires at 09:09:00.
3. **Synthetic Greeks** -- Black-Scholes option Greeks estimated from the equilibrium price.
4. **IV surface adjustment** -- Implied volatility surface shifted based on gap magnitude.
5. **Portfolio risk pre-check** -- Mark-to-market existing positions before market opens.

Without this pre-market intelligence, the system would be unable to differentiate a +2% gap-up
day from a -2% gap-down day until live ticks arrive at 09:15.

---

## 2. Overnight Data Collection (08:30 IST)

### Purpose

The `overnight-collector.service.ts` gathers global macro data via external APIs at 08:30 IST,
well before the NSE pre-open session begins. This data forms the bulk of the Tier 0 feature
vector and provides global context for all downstream model tiers.

### Data Sources

| # | Feature | Source | Instrument / Symbol | Description |
|---|---------|--------|---------------------|-------------|
| 1 | S&P 500 futures return | External API | ES (E-mini S&P 500) | Overnight return of US equity futures, primary global risk indicator |
| 2 | NASDAQ futures return | External API | NQ (E-mini NASDAQ 100) | Overnight return of US tech futures, growth/risk appetite proxy |
| 3 | US Dollar Index change | External API | DXY | Overnight change in the Dollar Index, inverse correlation with EM equities |
| 4 | US 10-Year yield change | External API | US10Y | Overnight change in US treasury yield, rate sensitivity indicator |
| 5 | Gold futures return | External API | GC (COMEX Gold) | Overnight gold return, safe-haven flow indicator |
| 6 | Brent crude return | External API | BZ (ICE Brent) | Overnight Brent crude return, inflation and current account proxy |
| 7 | Nikkei 225 return | External API | NI225 | Morning session return of Nikkei 225, Asia risk sentiment proxy |
| 8 | GIFT Nifty return (SGX) | External API | SGX Nifty | GIFT Nifty premium/discount vs previous NIFTY close, strongest gap predictor |
| 9 | CBOE VIX close | External API | VIX | Previous US session VIX close, global volatility regime indicator |
| 10 | FinBERT news sentiment | Pre-computed pipeline | Aggregate | Aggregated FinBERT sentiment score from overnight financial headlines |
| 11 | Previous day NIFTY range | QuestDB | NSE_INDEX Nifty 50 | (High - Low) / Close of previous NIFTY session, local volatility proxy |

### Publication

All 11 features (plus a derived 12th -- GIFT Nifty premium) are serialized as a JSON payload
and published to the Redis stream `premarket:overnight`.

```
08:30 IST
  |
  +-- overnight-collector.service.ts
  |     |
  |     +-- Fetch S&P 500 futures (ES) return
  |     +-- Fetch NASDAQ futures (NQ) return
  |     +-- Fetch US Dollar Index (DXY) change
  |     +-- Fetch US 10-Year yield change
  |     +-- Fetch Gold futures return
  |     +-- Fetch Brent crude return
  |     +-- Fetch Nikkei 225 return
  |     +-- Fetch GIFT Nifty return (SGX)
  |     +-- Fetch CBOE VIX close
  |     +-- Read FinBERT sentiment (pre-computed pipeline)
  |     +-- Query previous day NIFTY range (QuestDB)
  |     |
  |     +-- Publish ---> Redis stream: premarket:overnight
  |
  +-- Consumed by: algo-worker (Tier 0 XGBoost at 09:08:05)
```

### Data Freshness Requirements

All overnight data must be no older than 60 minutes at the time of publication. If any source
exceeds this staleness threshold, the collector logs a warning, flags the feature as stale in the
payload metadata, and proceeds with the most recent available value. See
[Section 9: Error Handling](#9-error-handling) for degradation behavior.

---

## 3. Pre-Open Session Capture (09:00 - 09:08 IST)

### Purpose

Establish a live connection to the Upstox WebSocket at exactly 09:00 IST and monitor the pre-open
order flow for NIFTY 50 index, NIFTY futures, and pre-open constituents. The data captured during
this phase is not used for inference (the indicative price is unstable), but the connection must be
active and healthy before the critical freeze event at 09:08.

### Connection Sequence

```
09:00:00 IST
  |
  +-- Connect to Upstox WebSocket
  |     +-- Authenticate with API credentials
  |     +-- Verify connection handshake
  |
  +-- Subscribe to instruments:
  |     +-- NSE_INDEX|Nifty 50          (index indicative price)
  |     +-- NSE_FO|NIFTY current month  (futures indicative price)
  |     +-- NIFTY 50 constituents       (pre-open individual stocks)
  |
  +-- Monitor order flow:
  |     +-- Track indicative equilibrium price (do NOT use for inference)
  |     +-- Track total pre-open volume
  |     +-- Track order count and cancellation rate
  |     +-- Buffer all ticks for post-freeze analysis
  |
  +-- Health monitoring:
        +-- WebSocket heartbeat every 5 seconds
        +-- If disconnected, reconnect with exponential backoff
        +-- Alert if connection cannot be established by 09:05
```

### Why Indicative Prices Before 09:08 Are Not Used

The pre-open order book between 09:00 and 09:08 is dominated by:

- **Algorithmic probing orders** placed to gauge demand, then cancelled before freeze.
- **Institutional orders** modified multiple times before freeze.
- **Retail market orders** placed at extreme prices that temporarily skew the indicative.

Empirical analysis of 4+ years of pre-open data shows the indicative price at 09:04 has less than
40% directional correlation with the actual opening price. At 09:08 (freeze), this correlation
jumps to above 95%. Consuming unstable pre-open data would degrade Tier 0 accuracy by an
estimated 8-12 percentage points. The connection is established early solely to ensure it is
healthy and subscribed before the freeze.

---

## 4. Pre-Open Freeze (09:08 IST)

### Purpose

At 09:08:00 IST, the NSE freezes the pre-open order book. No new orders, modifications, or
cancellations are accepted. The match engine begins computing the equilibrium price. The
market-feeder captures this frozen state and publishes it to Redis, which immediately triggers
Tier 0 inference.

### Capture Sequence

The market-feeder waits until 09:08:05 IST (a deliberate 5-second buffer after the nominal
freeze time) to ensure data has fully propagated through the Upstox WebSocket feed and settled
in the local buffer.

```
09:08:00 IST -- NSE pre-open freeze (exchange event)
  |
  |  [5-second buffer for WebSocket propagation and data settlement]
  |
09:08:05 IST -- market-feeder freeze capture begins
  |
  +-- Capture equilibrium price for NIFTY 50 index
  |     Source: Upstox WebSocket pre-open feed
  |     Instrument: NSE_INDEX|Nifty 50 (indicative/equilibrium)
  |
  +-- Capture NIFTY futures opening price
  |     Source: Upstox WebSocket pre-open feed
  |     Instrument: NSE_FO|NIFTY current month future
  |
  +-- Calculate gap:
  |     gap_pct = (equilibrium_price - prev_close) / prev_close
  |     gap_points = equilibrium_price - prev_close
  |     gap_direction = 'UP' | 'DOWN' | 'FLAT' (threshold: +/- 0.05%)
  |
  +-- Capture pre-open volume:
  |     Total volume matched during pre-open session
  |
  +-- Publish to Redis stream: premarket:freeze
  |     Key: premarket:freeze
  |     TTL: 8 hours (covers full trading day)
  |     Payload: equilibrium_price, gap_pct, gap_points, gap_direction,
  |              futures_price, preopen_volume, capture_timestamp
  |
  +-- Trigger Tier 0 XGBoost inference
        Consumer: algo-worker
        Latency: ~2ms (ONNX runtime)
        Input: 12 features (overnight macro + freeze data)
        Output: expected_gap_pct, expected_volatility, opening_bias, confidence
        Cache: tier0:gap:{date} (TTL: 8 hours)
```

### 5-Second Buffer Rationale

| Concern | Resolution |
|---|---|
| WebSocket propagation delay | Upstox feed typically delivers freeze data within 50-200ms of NSE timestamp |
| Redis write latency | market-feeder writes to Redis in <5ms (local instance) |
| algo-worker read latency | Redis read + deserialization in <2ms |
| Buffer for retries | If first capture fails, 5 seconds allows 2-3 retry attempts |
| ONNX warm-up jitter | First inference after idle may have +1-2ms cold-start overhead |

### Redis Payload: `premarket:freeze`

```json
{
  "instrument": "NSE_INDEX|Nifty 50",
  "equilibrium_price": 22847.50,
  "prev_close": 22795.20,
  "gap_points": 52.30,
  "gap_pct": 0.2294,
  "gap_direction": "UP",
  "futures_price": 22862.15,
  "preopen_volume": 4285000,
  "freeze_timestamp": "2026-03-13T09:08:00.000+05:30",
  "capture_timestamp": "2026-03-13T09:08:05.127+05:30",
  "capture_latency_ms": 127,
  "source": "upstox_websocket"
}
```

---

## 5. Synthetic Greeks Generation (09:08 - 09:09 IST)

### Purpose

Option chain data is not available during the pre-market session. Live option Greeks only become
available after 09:15 when continuous trading begins. To provide Tier 0 and downstream consumers
with approximate option Greeks during the critical pre-trade window, the market-feeder generates
synthetic Greeks using Black-Scholes with adjusted inputs.

### Methodology

```
09:08:05 IST -- Equilibrium price captured
  |
  +-- Load previous day's IV surface as baseline
  |     Source: QuestDB (end-of-day IV surface snapshot)
  |     Coverage: ATM +/- 10 strikes, 50-point spacing
  |     Expiries: current weekly + current monthly
  |
  +-- Adjust for overnight gap using empirical model:
  |     |
  |     +-- Parallel shift: re-center IV surface around new ATM
  |     |     Shift magnitude = gap in NIFTY points
  |     |
  |     +-- Skew adjustment:
  |     |     |gap| < 0.3%:  No skew adjustment
  |     |     |gap| 0.3-1.0%: Skew adjust = 0.5% per strike from ATM
  |     |     |gap| > 1.0%:   Skew adjust = 1.0% per strike from ATM
  |     |     Gap-up:   OTM put skew steepens (demand for downside protection)
  |     |     Gap-down: OTM call skew steepens (short covering pressure)
  |     |
  |     +-- Term structure adjustment:
  |           Near-term (< 7 DTE): amplify IV by (1 + |gap_pct| * 0.5)
  |           Far-term  (> 7 DTE): amplify IV by (1 + |gap_pct| * 0.1)
  |           Rationale: gap events disproportionately affect near-term vol
  |
  +-- Generate synthetic ATM IV and Greeks for Tier 0 features:
  |     For each strike in [ATM-500, ATM+500] at 50-point intervals:
  |       - CE and PE delta, gamma, vega, theta
  |       - Estimated option price (Black-Scholes)
  |       - Moneyness ratio (S/K)
  |
  +-- Publish to Redis:
        Key: premarket:greeks
        TTL: 8 hours
        Note: These are rough estimates, replaced by live Greeks after 09:15
```

### Black-Scholes Parameters

| Parameter | Source | Example Value |
|---|---|---|
| Underlying (S) | Equilibrium price from freeze capture | 22,847.50 |
| Strike range | ATM +/- 10 strikes, 50-point spacing | 22,350 to 23,350 |
| Time to expiry (T) | Calendar days to next weekly/monthly expiry | 4 days (weekly), 18 days (monthly) |
| Risk-free rate (r) | MIBOR overnight rate (RBI reference) | 6.50% annualized |
| Volatility (sigma) | Previous day ATM IV, adjusted for gap | 16.5% annualized (pre-adjustment) |

### Important Caveats

- Synthetic Greeks are approximations. They do not account for supply/demand dynamics that will
  emerge when continuous trading begins.
- The IV adjustment model is calibrated on historical gap events but may underestimate IV in
  tail scenarios (gaps exceeding +/- 2%).
- All synthetic Greeks are replaced by live Greeks computed from actual option prices after 09:15.
  The replacement is automatic and requires no manual intervention.

---

## 6. Daily Candle Preparation (09:09 IST)

### Purpose

Aggregate historical daily OHLCV candles and compute the feature vector required by Tier 1
(HMM regime classifier + PatchTST daily trend predictor). This step must complete before
09:09:00 IST so that Tier 1 can fire on schedule.

### Sequence

```
09:09:00 IST -- Daily candle preparation and Tier 1 trigger
  |
  +-- Query QuestDB for previous 252 trading days of daily OHLCV candles
  |     Instrument: NSE_INDEX|Nifty 50
  |     Fields: date, open, high, low, close, volume
  |     252 days = approximately 1 calendar year of trading data
  |
  +-- Compute 32 daily features for Tier 1:
  |     |
  |     +-- Returns [5]: return_1d, return_5d, return_10d, return_20d, return_60d
  |     +-- Moving averages [6]: SMA 20/50/200, EMA 20, price vs SMA200, golden cross flag
  |     +-- Volatility [5]: realized vol 10d/20d/60d, India VIX, VIX percentile
  |     +-- Trend strength [4]: ADX 14, trend strength score, higher-high count, lower-low count
  |     +-- Breadth [2]: % of NIFTY 50 above 200 SMA, advance/decline ratio
  |     +-- Tier 0 output [3]: expected_gap_pct, expected_volatility, opening_bias
  |     +-- Global macro [4]: S&P return, Brent change, USD/INR change, sentiment
  |     +-- Seasonality [3]: month, day_of_week, days_to_expiry
  |
  +-- Publish feature vector to Redis (Tier 1 input)
  |     Key: tier1:features:{date}
  |     TTL: 8 hours
  |
  +-- Tier 1 fires at 09:09:00 IST:
        |
        +-- HMM regime classification (~3ms ONNX inference):
        |     Output: BULL_TRENDING | BEAR_TRENDING | VOLATILE | RANGING
        |     + state probabilities, confidence, transition matrix
        |
        +-- PatchTST daily trend prediction (~5ms ONNX inference):
        |     Input: 512 days x 15 features (rolling window from QuestDB)
        |     Output: daily_direction [-1, +1], daily_magnitude, trend_confidence
        |
        +-- Cache combined output:
              Key: tier1:regime:{date}
              TTL: 8 hours
              Consumed by: Tier 2, Tier 4, risk-manager, strategy selector
```

### Total Tier 1 Latency

| Component | Latency |
|---|---|
| Feature vector assembly | ~2ms |
| HMM ONNX inference | ~3ms |
| PatchTST ONNX inference | ~5ms |
| Redis publish | ~1ms |
| **Total** | **~8ms** (from 09:09:00.000) |

---

## 7. Timeline

The following diagram shows the complete pre-market timeline from overnight collection through
normal market open.

```
08:30   | Overnight collector: Global macro data --> premarket:overnight
        |   S&P 500, NASDAQ, DXY, US 10Y, Gold, Brent, Nikkei, GIFT Nifty,
        |   VIX, FinBERT sentiment, previous day NIFTY range
        |
09:00   | WebSocket connects to Upstox, subscribes to pre-open instruments
        |   NSE_INDEX|Nifty 50, NIFTY futures, pre-open constituents
        |
09:00   | Pre-open session begins (order entry period)
-09:08  |   market-feeder monitors pre-open order flow
        |   Indicative prices are unstable -- not consumed for inference
        |   Models pre-warmed, connections verified
        |
09:08   | NSE pre-open freeze (equilibrium price discovered)
        |   Order book locked, no further modifications
        |
09:08:05| market-feeder captures freeze data --> premarket:freeze
        |   Equilibrium price, gap calculation, pre-open volume
        |   Tier 0 XGBoost runs (~2ms)
        |   Output cached: tier0:gap:{date}
        |
09:08   | Synthetic Greeks generation begins
-09:09  |   Previous day IV surface loaded, adjusted for overnight gap
        |   ATM +/- 10 strikes computed via Black-Scholes
        |   Published to Redis: premarket:greeks
        |
09:09   | Daily candle preparation complete
        |   252 trading days aggregated, 32 features computed
        |   Tier 1 runs (HMM + PatchTST, ~8ms)
        |   Output cached: tier1:regime:{date}
        |
09:15   | Normal market opens
        |   market-feeder switches to full tick streaming mode
        |   All ~150 instruments subscribed (NIFTY 50, options, futures)
        |   First 1-minute candle starts building
        |   Synthetic Greeks replaced by live Greeks from option chain
        |
09:16   | First 1-minute candle complete
        |   compute-engine processes candle --> 117 features
        |   First Tier 2 inference cycle begins
        |   Tier 3 LOB (limit order book) monitoring activates
```

---

## 8. Redis Cache Keys Set Pre-Market

All pre-market data is published to Redis with consistent key naming and TTL policies. Keys use
the convention `premarket:{data_type}` for ephemeral pre-market data and `tier{N}:{output}:{date}`
for model predictions.

| Key | Content | TTL | Set By | Set At (IST) |
|---|---|---|---|---|
| `premarket:overnight` | Global macro features (12 values: ES return, NQ return, DXY change, US10Y change, gold return, Brent return, Nikkei return, GIFT Nifty return, VIX close, FinBERT sentiment, NIFTY range, GIFT Nifty premium) | 8 hr | market-feeder (overnight-collector.service.ts) | 08:30 |
| `premarket:freeze` | Equilibrium price, gap percentage, gap points, gap direction, futures price, pre-open volume | 8 hr | market-feeder (pre-market-session.service.ts) | 09:08:05 |
| `premarket:greeks` | Synthetic option Greeks for ATM +/- 10 strikes (delta, gamma, vega, theta per strike per CE/PE) | 8 hr | market-feeder (pre-market-session.service.ts) | 09:08:30 |
| `tier0:gap:{date}` | Tier 0 XGBoost output (4 values: expected_gap_pct, expected_volatility, opening_bias, confidence) | 8 hr | algo-worker | 09:08:05 |
| `tier1:regime:{date}` | Tier 1 combined output (6 values: regime, state_probabilities, confidence, daily_direction, daily_magnitude, trend_confidence) | 8 hr | algo-worker | 09:09:00 |

### Key Lifecycle

1. Keys are written at their designated times during pre-market.
2. Keys are consumed by algo-worker and risk-manager throughout the trading day as context features.
3. Keys expire automatically after 8 hours (covers the full NSE trading session 09:15-15:30 with margin).
4. No manual cleanup required. Expired keys are garbage-collected by Redis.
5. Date-keyed entries (e.g., `tier0:gap:2026-03-13`) allow same-day lookups without ambiguity.

---

## 9. Error Handling

### Failure Scenarios and Fallback Behavior

Every external dependency in the pre-market pipeline has a defined fallback. The system is
designed to degrade gracefully rather than fail outright, ensuring that algo-worker always has
some form of pre-market context at 09:15.

| Failure | Impact | Fallback | Confidence Adjustment |
|---|---|---|---|
| Overnight data APIs fail (one or more sources timeout or return errors) | Missing macro features in Tier 0 input vector | Use previous trading day's values for the failed sources. Flag affected features as stale in payload metadata. | Tier 0 confidence reduced by 15% per stale feature |
| Pre-open WebSocket connection fails (cannot connect to Upstox by 09:05) | No live indicative price feed during pre-open | Use GIFT Nifty LTP (from SGX feed) as proxy for gap estimation. GIFT Nifty has >90% correlation with NIFTY opening price. | Tier 0 confidence reduced by 10% |
| Freeze capture misses (no data at 09:08:05 due to feed interruption) | No equilibrium price for gap calculation | Retry from WebSocket buffer up to 3 times (at 09:08:05, 09:08:07, 09:08:09). If all retries fail, degrade to GIFT Nifty gap as proxy. | Tier 0 confidence reduced by 20% if using proxy |
| Tier 0 XGBoost fails (ONNX runtime error or timeout) | No gap prediction available | algo-worker operates with default values: expected_gap_pct = 0, expected_volatility = MEDIUM, opening_bias = 0, confidence = 0. Tier 1 runs without Tier 0 features (uses zeros for those 3 inputs). | Tier 1 confidence reduced by 10% |
| Tier 1 HMM/PatchTST fails (ONNX runtime error or timeout) | No regime classification or daily trend | algo-worker defaults to neutral regime (RANGING) with no gap bias. Position sizing reduced to 50% of normal. | All downstream tiers operate conservatively |
| QuestDB read failure (cannot query historical daily candles) | Cannot compute 32 daily features for Tier 1 | Use cached previous-day feature vector from Redis. Alert for manual intervention. | Tier 1 confidence reduced by 15% |
| Redis connection lost | Cannot publish any pre-market data | Reconnect with exponential backoff (100ms, 200ms, 400ms, ..., max 5s). Hold data in local in-memory buffer. Flush buffer on reconnect. | No confidence adjustment if reconnect succeeds within 30s |
| Clock sync drift exceeds 500ms | Phase timing misalignment; freeze capture may fire too early or late | NTP sync check runs at 08:55. If drift exceeds 500ms, alert is raised and phase timings are adjusted by the measured offset. | No confidence adjustment if corrected before 09:08 |

### Degraded Mode

If two or more critical failures occur simultaneously (e.g., both Upstox feed down and GIFT Nifty
unavailable), the system enters degraded mode:

1. Position sizing is automatically reduced to 25% of normal maximum.
2. Confidence thresholds for trade entry are raised from 0.70 to 0.90.
3. Only high-conviction signals with multi-tier agreement are traded.
4. Alert is dispatched via configured alerting channels (Slack, PagerDuty).
5. System logs the degraded state to QuestDB for post-session analysis.
6. Full re-initialization occurs on the next trading day.

---

## 10. Configuration

The pre-market session is governed by a configuration interface that defines all critical
timestamps, fallback behavior, and retry policies. All times are in IST (UTC+05:30).

```typescript
interface PreMarketConfig {
  // --- Phase Timing (IST) ---
  overnightCollectionTime: '08:30';       // Overnight collector fires
  preOpenConnectTime: '09:00';            // WebSocket connection to Upstox
  freezeCaptureTime: '09:08:05';          // Freeze capture (5-second buffer after NSE freeze)
  tier0TriggerTime: '09:08:05';           // Tier 0 XGBoost inference trigger
  syntheticGreeksTime: '09:08:30';        // Synthetic Greeks generation
  tier1TriggerTime: '09:09:00';           // Tier 1 HMM + PatchTST inference trigger
  overnightCandleTime: '09:14:55';        // Overnight candle synthesis deadline
  marketOpenTime: '09:15';                // NSE continuous trading begins

  // --- Fallback Behavior ---
  giftNiftyFallback: true;                // Use GIFT Nifty if pre-open feed fails
  giftNiftyBasisAdjustment: 15;           // Historical average GIFT Nifty premium (points)
  usePreviousDayOnStaleData: true;        // Fall back to previous day values for stale sources
  maxDataStalenessMinutes: 60;            // Maximum acceptable data age before flagging stale

  // --- Retry Policies ---
  maxFreezeRetries: 3;                    // Maximum retry attempts for freeze capture
  freezeRetryIntervalMs: 2000;            // Interval between freeze capture retries
  websocketReconnectMaxMs: 5000;          // Maximum backoff for WebSocket reconnection
  redisReconnectMaxMs: 5000;              // Maximum backoff for Redis reconnection

  // --- Degraded Mode Thresholds ---
  degradedModePositionSizePct: 25;        // Position sizing in degraded mode (% of normal)
  degradedModeConfidenceThreshold: 0.90;  // Minimum confidence for trade entry in degraded mode
  normalConfidenceThreshold: 0.70;        // Minimum confidence for trade entry in normal mode

  // --- Synthetic Greeks ---
  greeksStrikeRange: 10;                  // Number of strikes above and below ATM
  greeksStrikeSpacing: 50;               // NIFTY strike spacing in points
  riskFreeRateSource: 'MIBOR';           // Source for risk-free rate
  ivFloor: 0.05;                          // Minimum IV floor (5%) to prevent degenerate Greeks
}
```

### Environment-Specific Overrides

Configuration values can be overridden per environment via the NestJS `ConfigService`:

| Environment | Override | Rationale |
|---|---|---|
| **Production** | Default values as above | Full pre-market pipeline active |
| **Staging** | `freezeCaptureTime: '09:08:10'` | Additional buffer for staging WebSocket latency |
| **Development** | `giftNiftyFallback: true`, `maxFreezeRetries: 1` | Faster iteration, single retry |
| **Backtesting** | All times ignored; data replayed from QuestDB | Historical replay mode, no live connections |

---

## Related Documentation

- **Model Pipeline Workflow** -- Full session-by-session timing covering Phase A (overnight) through Phase D (post-market).
- **Tier 0 Models** -- XGBoost gap predictor specification, feature definitions, and performance metrics.
- **Tier 1 Models** -- HMM regime classifier and PatchTST daily trend predictor specification.
- **Feature Specification** -- Complete definitions for all 117 features computed by the compute-engine.
- **Market Feeder README** -- Service overview, architecture, and deployment instructions.

---

**Service**: market-feeder (NestJS + TypeScript)
**Pre-Market Window**: 08:30 - 09:15 IST
**Critical Event**: NSE freeze at 09:08:00 IST (Tier 0 trigger at 09:08:05)
**Final Deadline**: 09:14:55 IST (overnight candle must be in Redis before market open)
**Last Updated**: March 17, 2026
