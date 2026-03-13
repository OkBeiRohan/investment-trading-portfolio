# Pre-Market Session Handling (09:00 - 09:15 IST)

> **Specification for how market-feeder orchestrates the NSE pre-open session: from standby data collection through freeze capture, synthetic Greeks estimation, overnight candle synthesis, and handoff to continuous trading at 09:15.**

**Last Updated**: March 13, 2026
**Service**: market-feeder (NestJS + TypeScript)
**Port**: 3002
**Consumers**: algo-worker (Tier 0/1 inference), risk-manager (pre-trade checks)

---

## NSE Pre-Open Session (09:00 - 09:15 IST)

The National Stock Exchange of India conducts a **pre-open session** every trading day from 09:00 to 09:15 IST. This session determines the opening price for all securities through a call auction mechanism. Understanding its phases is critical because our system must align its data capture, model inference, and pre-trade calculations to the exact NSE timeline.

### Exchange Phase Timeline

```
09:00:00 ─────────── 09:08:00 ─── 09:08:00 ─────────── 09:15:00
    │                     │            │                     │
    │   ORDER ENTRY       │   FREEZE   │   ORDER MATCHING    │
    │                     │            │                     │
    │  Participants may   │  No new    │  NSE match engine   │
    │  place, modify, or  │  orders,   │  determines the     │
    │  cancel orders in   │  mods, or  │  equilibrium price  │
    │  the pre-open book. │  cancels   │  that maximizes     │
    │  Indicative price   │  accepted. │  tradeable volume.  │
    │  fluctuates with    │  Book is   │  Unmatched orders   │
    │  each order update. │  frozen.   │  carry forward to   │
    │                     │            │  continuous session. │
    │                     │            │                     │
    09:00               09:08         09:08               09:15
```

| Phase              | Time                | Duration | Exchange Behavior                                                            | Order Allowed        |
| ------------------ | ------------------- | -------- | ---------------------------------------------------------------------------- | -------------------- |
| **Order Entry**    | 09:00:00 - 09:07:59 | 8 min    | Orders placed, modified, cancelled. Indicative price computed continuously.  | Yes (all operations) |
| **Order Freeze**   | 09:08:00            | Instant  | Book frozen. No further modifications permitted.                             | No                   |
| **Order Matching** | 09:08:00 - 09:14:59 | ~7 min   | Match engine calculates equilibrium opening price via multilateral matching. | No                   |
| **Market Open**    | 09:15:00            | Instant  | Continuous trading begins at the determined opening price.                   | Yes (continuous)     |

### Why This Matters for Our System

The pre-open session creates a **7-minute window** (09:08 to 09:15) during which we know the indicative opening price but the market has not yet opened. This window is exploited for:

1. **Tier 0 inference** -- XGBoost gap predictor fires at 09:08:05 using the frozen indicative price
2. **Tier 1 inference** -- HMM + PatchTST regime classifier fires at 09:09:00
3. **Synthetic Greeks** -- Black-Scholes option Greeks estimated from the indicative price
4. **IV surface adjustment** -- Implied volatility surface shifted based on gap magnitude
5. **Portfolio risk pre-check** -- Mark-to-market existing positions before market opens
6. **Overnight candle synthesis** -- Consolidate 17+ hours of global data at 09:14:55

Without this pre-market intelligence, the system would be "blind" at market open, unable to differentiate a +2% gap-up day from a -2% gap-down day until live ticks arrive.

---

## System Phase Map

Our system divides the 15-minute pre-open window into four sub-phases, each with distinct responsibilities:

```
09:00              09:08       09:08:30           09:14:55  09:15
  │                  │            │                  │         │
  │   PHASE B1       │  PHASE B2  │    PHASE B3      │  B4     │
  │   STANDBY        │  FREEZE    │    PRE-TRADE     │  CANDLE │
  │                  │  CAPTURE   │    INTELLIGENCE   │  SYNTH  │
  │                  │            │                  │         │
  │  Global data     │  Capture   │  Synthetic       │ Build   │
  │  collection      │  frozen    │  Greeks, IV      │ context │
  │  continues.      │  indicative│  surface, risk   │ vector  │
  │  ONNX models     │  price.    │  checks, Tier 1  │ from    │
  │  pre-warmed.     │  Tier 0    │  inference.      │ 17+ hrs │
  │  DO NOT use      │  fires at  │                  │ of data │
  │  pre-open data.  │  09:08:05. │                  │         │
  │                  │            │                  │         │
  └──────────────────┴────────────┴──────────────────┴─────────┘
```

---

## Phase B1: Standby (09:00:00 - 09:07:59)

### Purpose

Continue global data collection while the pre-open order book builds. The system enters a "ready but idle" state -- all infrastructure is verified, models are warmed, but **no pre-open order data is consumed**.

### What Our System Does

```
09:00:00 ──────────────────────────────────── 09:07:59
  │
  ├── CONTINUE GLOBAL DATA COLLECTION
  │   ├── GIFT Nifty: tick-by-tick from Upstox WebSocket
  │   │   └── Track: LTP, high, low, volume, premium vs prev close
  │   ├── Asia markets: Nikkei 225, Hang Seng (Yahoo Finance, 1-min polls)
  │   ├── Commodities: Brent crude, Gold (Yahoo Finance, 1-min polls)
  │   ├── Currencies: USD/INR, EUR/INR, DXY (Yahoo Finance, 1-min polls)
  │   └── News: FinBERT sentiment on any breaking headlines (Finnhub)
  │
  ├── DO NOT CONSUME PRE-OPEN ORDER DATA
  │   ├── Indicative prices during 09:00-09:08 are UNSTABLE
  │   ├── Orders may be placed to manipulate indicative price
  │   ├── High cancellation rate (~60-80% of pre-open orders)
  │   └── Using this data introduces noise, not signal
  │
  ├── SYSTEM PRE-WARM
  │   ├── ONNX inference sessions loaded and warmed:
  │   │   ├── Tier 0: XGBoost gap predictor (12 features, ~2ms)
  │   │   ├── Tier 1 HMM: regime classifier (32 features, ~3ms)
  │   │   └── Tier 1 PatchTST: daily trend (512x15 sequence, ~5ms)
  │   ├── Redis connection pool verified (all pub/sub channels tested)
  │   ├── QuestDB connection pool verified (read + write tested)
  │   ├── Previous day's close price loaded from QuestDB
  │   └── Previous day's ATM IV loaded for Greeks estimation
  │
  └── MONITORING
      ├── GIFT Nifty premium trend (directional clue for Tier 0)
      ├── Global data staleness check (alert if any source >10 min stale)
      └── System health: CPU, memory, network latency to exchanges
```

### Why We Ignore Pre-Open Orders

The pre-open order book between 09:00 and 09:08 is dominated by:

- **Algorithmic probing orders** placed to gauge demand, then cancelled
- **Institutional orders** that are modified multiple times before freeze
- **Retail orders** placed at extreme prices (market orders that skew the indicative)

Empirical analysis of 4+ years of pre-open data shows the indicative price at 09:04 has less than 40% directional correlation with the actual opening price. At 09:08 (freeze), this correlation jumps to above 95%. Using unstable pre-open data would degrade Tier 0 accuracy by an estimated 8-12 percentage points.

### Pre-Warm Sequence

```typescript
// Executed during Phase B1 by PreMarketSessionService

async preWarmModels(): Promise<void> {
  // 1. Load ONNX sessions (if not already loaded)
  await this.tier0Session.warmUp();    // XGBoost gap predictor
  await this.tier1HmmSession.warmUp(); // HMM regime classifier
  await this.tier1TstSession.warmUp(); // PatchTST daily trend

  // 2. Verify data dependencies
  const prevClose = await this.questdb.query(
    `SELECT close FROM market_candles
     WHERE instrument_key = 'NSE_INDEX|Nifty 50'
     ORDER BY timestamp DESC LIMIT 1`
  );
  this.prevNiftyClose = prevClose.rows[0].close;

  // 3. Load previous day's ATM IV for Greeks estimation
  const prevIv = await this.redis.get('options:atm_iv:latest');
  this.prevAtmIv = parseFloat(prevIv);

  // 4. Verify Redis pub/sub channels
  await this.redis.ping();
  await this.redis.publish('system:heartbeat', JSON.stringify({
    service: 'market-feeder',
    phase: 'B1_STANDBY',
    timestamp: new Date().toISOString(),
  }));

  this.logger.log('Phase B1: All models pre-warmed, connections verified');
}
```

---

## Phase B2: Freeze Capture (09:08:00 - 09:08:30)

### Purpose

Capture the NSE frozen indicative opening price the moment the pre-open book is locked, publish it to Redis, and trigger Tier 0 XGBoost gap prediction.

### What Happens at the Exchange

At exactly **09:08:00 IST**, the NSE freezes the pre-open order book:

- No new orders accepted
- No modifications or cancellations permitted
- The indicative price computed from the frozen book becomes the **best estimate** of the opening price
- The match engine begins calculating the equilibrium price (which may differ slightly from the indicative, but is strongly correlated)

### What Our System Does

```
09:08:00 ── NSE PRE-OPEN FREEZE (exact)
             │
             ├── market-feeder captures frozen indicative price
             │   ├── Source: Upstox WebSocket pre-open feed
             │   ├── Instrument: NSE_INDEX|Nifty 50 (indicative)
             │   └── Also capture: indicative NIFTY Future, India VIX indicative
             │
             ├── Compute gap metrics:
             │   ├── gap_points = indicative_price - prev_day_close
             │   ├── gap_pct = gap_points / prev_day_close * 100
             │   └── gap_direction = 'UP' | 'DOWN' | 'FLAT' (±0.05% threshold)
             │
             ├── PUBLISH to Redis:
             │   ├── Key:   premarket:indicative
             │   ├── Value: { price, gap_points, gap_pct, direction, timestamp }
             │   └── TTL:   End of trading day (15:30 IST)
             │
09:08:05 ── TIER 0 FIRES (algo-worker)
             │
             ├── algo-worker reads premarket:indicative from Redis
             ├── Collects remaining 11 features from Redis/QuestDB:
             │   ├── gift_nifty_premium (GIFT Nifty LTP - prev close)
             │   ├── sp500_overnight_return
             │   ├── nasdaq_overnight_return
             │   ├── nikkei_return
             │   ├── brent_crude_change
             │   ├── brent_wti_spread
             │   ├── gold_change
             │   ├── usd_inr_change
             │   ├── overnight_news_sentiment (FinBERT aggregate)
             │   ├── prev_day_range (from QuestDB)
             │   └── prev_day_close_vs_vwap (from QuestDB)
             │
             ├── XGBoost ONNX inference (~2ms):
             │   └── Input: Float32Array[12] → Output: expected_gap_pct,
             │       expected_volatility, opening_bias, confidence
             │
             ├── Cache prediction:
             │   ├── Key:   tier0:gap:{date}     (e.g., tier0:gap:2026-03-13)
             │   ├── TTL:   28800 seconds (end of day)
             │   └── Value: full Tier 0 output JSON
             │
             └── Emit: Tier0PredictionEvent (consumed by Tier 1 at 09:09)

09:08:30 ── TIER 0 COMPLETE, PHASE B2 ENDS
```

### Redis Key: `premarket:indicative`

```json
{
  "instrument": "NSE_INDEX|Nifty 50",
  "indicative_price": 22847.5,
  "prev_close": 22795.2,
  "gap_points": 52.3,
  "gap_pct": 0.2294,
  "gap_direction": "UP",
  "freeze_timestamp": "2026-03-13T09:08:00.000+05:30",
  "capture_timestamp": "2026-03-13T09:08:00.127+05:30",
  "capture_latency_ms": 127,
  "source": "upstox_websocket",
  "indicative_future": 22862.15,
  "indicative_vix": 14.82
}
```

### Freeze Capture Implementation

```typescript
@Injectable()
export class PreMarketSessionService {
  private readonly logger = new Logger(PreMarketSessionService.name);

  private prevNiftyClose: number;
  private prevAtmIv: number;
  private frozenIndicativePrice: number | null = null;
  private phaseState:
    | 'IDLE'
    | 'B1_STANDBY'
    | 'B2_FREEZE'
    | 'B3_PRETRADE'
    | 'B4_CANDLE'
    | 'LIVE' = 'IDLE';

  constructor(
    private readonly redis: RedisService,
    private readonly questdb: QuestDbService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly globalData: GlobalDataService,
  ) {}

  /**
   * Cron trigger: 09:08:00 IST (03:38:00 UTC), weekdays only.
   * Captures the frozen indicative price from the Upstox pre-open feed.
   */
  @Cron('0 38 3 * * 1-5', { name: 'freeze-capture', timeZone: 'UTC' })
  async onPreOpenFreeze(): Promise<void> {
    this.phaseState = 'B2_FREEZE';
    const captureStart = Date.now();

    this.logger.log('='.repeat(60));
    this.logger.log(
      'PHASE B2: NSE PRE-OPEN FREEZE — Capturing indicative price',
    );
    this.logger.log('='.repeat(60));

    try {
      // 1. Read the frozen indicative price from Upstox WebSocket cache
      const indicativeRaw = await this.redis.get('upstox:preopen:indicative');
      if (!indicativeRaw) {
        throw new Error('Frozen indicative price not available in Redis');
      }

      const indicative = JSON.parse(indicativeRaw);
      this.frozenIndicativePrice = indicative.ltp;

      // 2. Compute gap metrics
      const gapPoints = this.frozenIndicativePrice - this.prevNiftyClose;
      const gapPct = (gapPoints / this.prevNiftyClose) * 100;
      const gapDirection =
        Math.abs(gapPct) < 0.05 ? 'FLAT' : gapPct > 0 ? 'UP' : 'DOWN';

      // 3. Publish frozen indicative to Redis
      const indicativePayload = {
        instrument: 'NSE_INDEX|Nifty 50',
        indicative_price: this.frozenIndicativePrice,
        prev_close: this.prevNiftyClose,
        gap_points: gapPoints,
        gap_pct: gapPct,
        gap_direction: gapDirection,
        freeze_timestamp: new Date().toISOString(),
        capture_timestamp: new Date().toISOString(),
        capture_latency_ms: Date.now() - captureStart,
        source: 'upstox_websocket',
        indicative_future: indicative.future_ltp ?? null,
        indicative_vix: indicative.vix_ltp ?? null,
      };

      const today = new Date().toISOString().split('T')[0];
      await this.redis.set(
        'premarket:indicative',
        JSON.stringify(indicativePayload),
        'EX',
        28800, // TTL: 8 hours (covers full trading day)
      );

      this.logger.log(
        `Indicative: ${this.frozenIndicativePrice} | Gap: ${gapPoints.toFixed(1)} pts (${gapPct.toFixed(2)}%) ${gapDirection}`,
      );

      // 4. Emit event for algo-worker Tier 0 (fires at 09:08:05)
      this.eventEmitter.emit('premarket.freeze', indicativePayload);
    } catch (error) {
      this.logger.error(
        `PHASE B2 FAILED: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback: use GIFT Nifty LTP as proxy
      await this.fallbackToGiftNifty();
    }
  }

  /**
   * Fallback: If Upstox pre-open feed is unavailable, derive
   * indicative price from GIFT Nifty LTP (strongly correlated).
   */
  private async fallbackToGiftNifty(): Promise<void> {
    const giftNiftyRaw = await this.redis.get('global:gift_nifty:latest');
    if (giftNiftyRaw) {
      const giftNifty = JSON.parse(giftNiftyRaw);
      // GIFT Nifty typically trades at a slight premium/discount to NIFTY
      // Use historical average basis adjustment
      this.frozenIndicativePrice = giftNifty.ltp - 15; // ~15pt avg premium
      this.logger.warn(
        `Using GIFT Nifty fallback: ${this.frozenIndicativePrice}`,
      );
    }
  }
}
```

### Timing Criticality

The 5-second delay between freeze (09:08:00) and Tier 0 firing (09:08:05) is deliberate:

| Concern                     | Resolution                                                                  |
| --------------------------- | --------------------------------------------------------------------------- |
| WebSocket propagation delay | Upstox feed typically delivers freeze data within 50-200ms of NSE timestamp |
| Redis write latency         | market-feeder writes to Redis in <5ms (local instance)                      |
| algo-worker read latency    | Redis read + deserialization in <2ms                                        |
| Buffer for retries          | If first capture fails, 5 seconds allows 2-3 retry attempts                 |
| ONNX warm-up jitter         | First inference after idle may have +1-2ms cold-start overhead              |

---

## Phase B3: Pre-Trade Intelligence (09:08:30 - 09:14:55)

### Purpose

With the frozen indicative price in hand, perform all possible pre-trade calculations before the market opens. This phase transforms a single price point into a rich intelligence surface that gives the system a significant edge in the first minutes of trading.

### Sub-Phase B3.1: Synthetic Option Greeks Estimation (09:08:30)

Once the NIFTY frozen indicative price is known, we can estimate option Greeks for the entire near-term chain using Black-Scholes. These are **synthetic estimates** -- actual Greeks will shift when continuous trading begins and real option prices are available. However, they provide critical early intelligence for:

- Position sizing (delta-based)
- Risk limit pre-validation (portfolio gamma/vega exposure)
- Strategy selection (if ATM IV is elevated, prefer selling premium)

#### Calculation Parameters

| Parameter              | Source                                      | Value Example                      |
| ---------------------- | ------------------------------------------- | ---------------------------------- |
| **Underlying (S)**     | Frozen indicative price                     | 22,847.50                          |
| **Strike range**       | ATM +/- 10 strikes (50-pt spacing)          | 22,350 to 23,350                   |
| **Time to expiry (T)** | Calendar days to next weekly/monthly expiry | 4 days (weekly), 18 days (monthly) |
| **Risk-free rate (r)** | MIBOR overnight rate (from RBI)             | 6.50% annualized                   |
| **Volatility (sigma)** | Previous day's ATM IV as initial estimate   | 16.5% annualized                   |

#### Black-Scholes Implementation

```typescript
interface SyntheticGreeks {
  strike: number;
  optionType: 'CE' | 'PE';
  delta: number;
  gamma: number;
  vega: number; // per 1% IV move
  theta: number; // per calendar day
  estimatedPrice: number;
  moneyness: number; // S/K ratio
}

/**
 * Compute synthetic Greeks for ATM +/- 10 strikes using Black-Scholes.
 *
 * Uses the frozen indicative price as underlying and previous day's
 * ATM IV as the volatility estimate. These are pre-market approximations
 * that will be replaced by live Greeks once continuous trading begins.
 */
function computeSyntheticGreeks(
  indicativePrice: number, // Frozen indicative NIFTY price
  strikes: number[], // ATM +/- 10 strikes
  daysToExpiry: number, // Calendar days to expiry
  riskFreeRate: number, // Annualized (e.g., 0.065 for 6.5%)
  estimatedIv: number, // Previous day's ATM IV (annualized)
): SyntheticGreeks[] {
  const results: SyntheticGreeks[] = [];
  const T = daysToExpiry / 365.0;
  const sqrtT = Math.sqrt(T);

  for (const K of strikes) {
    const S = indicativePrice;
    const sigma = estimatedIv;
    const moneyness = S / K;

    // Black-Scholes d1, d2
    const d1 =
      (Math.log(S / K) + (riskFreeRate + (sigma * sigma) / 2) * T) /
      (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;

    const Nd1 = normalCdf(d1);
    const Nd2 = normalCdf(d2);
    const nd1 = normalPdf(d1); // Standard normal PDF at d1

    // --- Call (CE) Greeks ---
    const ceDelta = Nd1;
    const ceGamma = nd1 / (S * sigma * sqrtT);
    const ceVega = (S * nd1 * sqrtT) / 100; // per 1% IV move
    const ceTheta =
      (-(S * nd1 * sigma) / (2 * sqrtT) -
        riskFreeRate * K * Math.exp(-riskFreeRate * T) * Nd2) /
      365;
    const cePrice = S * Nd1 - K * Math.exp(-riskFreeRate * T) * Nd2;

    results.push({
      strike: K,
      optionType: 'CE',
      delta: round4(ceDelta),
      gamma: round6(ceGamma),
      vega: round4(ceVega),
      theta: round4(ceTheta),
      estimatedPrice: round2(Math.max(cePrice, 0)),
      moneyness: round4(moneyness),
    });

    // --- Put (PE) Greeks ---
    const peDelta = Nd1 - 1; // Put delta = Call delta - 1
    const peGamma = ceGamma; // Gamma is same for CE and PE at same strike
    const peVega = ceVega; // Vega is same for CE and PE at same strike
    const peTheta =
      (-(S * nd1 * sigma) / (2 * sqrtT) +
        riskFreeRate * K * Math.exp(-riskFreeRate * T) * (1 - Nd2)) /
      365;
    const pePrice = K * Math.exp(-riskFreeRate * T) * (1 - Nd2) - S * (1 - Nd1);

    results.push({
      strike: K,
      optionType: 'PE',
      delta: round4(peDelta),
      gamma: round6(peGamma),
      vega: round4(peVega),
      theta: round4(peTheta),
      estimatedPrice: round2(Math.max(pePrice, 0)),
      moneyness: round4(moneyness),
    });
  }

  return results;
}
```

#### Redis Key: `premarket:greeks`

```json
{
  "underlying": 22847.5,
  "estimated_iv": 0.165,
  "risk_free_rate": 0.065,
  "expiry": "2026-03-19",
  "days_to_expiry": 4,
  "computed_at": "2026-03-13T09:08:32.000+05:30",
  "chain": [
    {
      "strike": 22800,
      "ce": {
        "delta": 0.5412,
        "gamma": 0.000142,
        "vega": 14.82,
        "theta": -18.45,
        "price": 185.3
      },
      "pe": {
        "delta": -0.4588,
        "gamma": 0.000142,
        "vega": 14.82,
        "theta": -16.12,
        "price": 137.8
      }
    },
    {
      "strike": 22850,
      "ce": {
        "delta": 0.4987,
        "gamma": 0.000145,
        "vega": 14.95,
        "theta": -18.62,
        "price": 162.1
      },
      "pe": {
        "delta": -0.5013,
        "gamma": 0.000145,
        "vega": 14.95,
        "theta": -16.29,
        "price": 164.6
      }
    }
  ],
  "summary": {
    "atm_strike": 22850,
    "atm_ce_delta": 0.4987,
    "atm_pe_delta": -0.5013,
    "atm_gamma": 0.000145,
    "atm_straddle_price": 326.7,
    "max_gamma_strike": 22850,
    "put_call_parity_error": 0.02
  }
}
```

### Sub-Phase B3.2: IV Surface Adjustment (09:08:35)

The previous day's IV surface cannot be used directly because the overnight gap shifts the moneyness of every strike. A +1% gap-up means yesterday's ATM calls are now ITM, and the entire surface needs adjustment.

#### Adjustment Methodology

```
Step 1: Parallel Shift
  - Shift the entire IV surface horizontally by the gap magnitude
  - If gap = +52.3 pts, shift all strikes left by 52.3 pts
  - This re-centers the smile around the new ATM

Step 2: Skew Adjustment
  - Gap-up days historically show PUT skew steepening (demand for downside protection)
  - Gap-down days show CALL skew steepening (panic covering)
  - Apply empirical skew multiplier based on gap magnitude:
    - |gap| < 0.3%:  No skew adjustment (normal day)
    - |gap| 0.3-1.0%: Skew adjust = 0.5% per strike away from ATM
    - |gap| > 1.0%:   Skew adjust = 1.0% per strike away from ATM

Step 3: Term Structure Adjustment
  - Near-term expiries (< 7 DTE): amplify IV by 1 + |gap_pct| * 0.5
  - Far-term expiries (> 7 DTE): minimal adjustment (0.1x multiplier)
  - Rationale: gap events disproportionately affect near-term vol
```

```typescript
interface IvSurfacePoint {
  strike: number;
  expiry: string;
  iv: number;
  adjustedIv: number;
  adjustmentReason: string;
}

function adjustIvSurface(
  prevSurface: IvSurfacePoint[],
  gapPct: number,
  gapDirection: 'UP' | 'DOWN' | 'FLAT',
): IvSurfacePoint[] {
  const absGap = Math.abs(gapPct);

  // Skew multiplier based on gap magnitude
  const skewMultiplier = absGap < 0.3 ? 0 : absGap < 1.0 ? 0.005 : 0.01;

  return prevSurface.map((point) => {
    // Step 1: Parallel shift (re-center moneyness)
    let adjustedIv = point.iv;

    // Step 2: Skew adjustment based on distance from new ATM
    const strikesFromAtm = Math.abs(point.strike - indicativeAtmStrike) / 50;
    if (gapDirection === 'UP') {
      // Gap-up: OTM puts get more expensive (fear of pullback)
      if (point.strike < indicativeAtmStrike) {
        adjustedIv += skewMultiplier * strikesFromAtm;
      }
    } else if (gapDirection === 'DOWN') {
      // Gap-down: OTM calls get more expensive (short covering)
      if (point.strike > indicativeAtmStrike) {
        adjustedIv += skewMultiplier * strikesFromAtm;
      }
    }

    // Step 3: Term structure adjustment
    const dte = daysBetween(new Date(), new Date(point.expiry));
    if (dte <= 7) {
      adjustedIv *= 1 + absGap * 0.5;
    } else {
      adjustedIv *= 1 + absGap * 0.1;
    }

    return {
      ...point,
      adjustedIv: Math.max(adjustedIv, 0.05), // Floor at 5% IV
      adjustmentReason: `gap=${gapPct.toFixed(2)}%, skew=${skewMultiplier}, dte=${dte}`,
    };
  });
}
```

#### Redis Key: `premarket:iv_surface`

```json
{
  "base_date": "2026-03-12",
  "adjusted_for_gap_pct": 0.2294,
  "computed_at": "2026-03-13T09:08:35.000+05:30",
  "surface": [
    {
      "strike": 22650,
      "expiry": "2026-03-19",
      "prev_iv": 0.178,
      "adjusted_iv": 0.184,
      "delta_iv": 0.006
    },
    {
      "strike": 22700,
      "expiry": "2026-03-19",
      "prev_iv": 0.172,
      "adjusted_iv": 0.177,
      "delta_iv": 0.005
    },
    {
      "strike": 22800,
      "expiry": "2026-03-19",
      "prev_iv": 0.166,
      "adjusted_iv": 0.169,
      "delta_iv": 0.003
    },
    {
      "strike": 22850,
      "expiry": "2026-03-19",
      "prev_iv": 0.165,
      "adjusted_iv": 0.167,
      "delta_iv": 0.002
    },
    {
      "strike": 22900,
      "expiry": "2026-03-19",
      "prev_iv": 0.166,
      "adjusted_iv": 0.167,
      "delta_iv": 0.001
    },
    {
      "strike": 23000,
      "expiry": "2026-03-19",
      "prev_iv": 0.17,
      "adjusted_iv": 0.171,
      "delta_iv": 0.001
    }
  ]
}
```

### Sub-Phase B3.3: Portfolio Risk Pre-Check (09:08:40)

Before the market opens, mark-to-market all existing positions using the new indicative price and adjusted IV surface. This ensures no risk limits are breached at the opening tick.

```
Pre-Market Risk Check:
  │
  ├── Load all open positions from MongoDB
  │   ├── Intraday carry-forwards (rare, only if previous session had errors)
  │   └── Overnight positional trades (if any)
  │
  ├── Mark-to-market using:
  │   ├── Underlying: frozen indicative price (22,847.50)
  │   ├── Option prices: synthetic Greeks estimates
  │   └── IV: adjusted IV surface
  │
  ├── Compute portfolio-level Greeks:
  │   ├── Net delta exposure
  │   ├── Net gamma exposure
  │   ├── Net vega exposure
  │   └── Net theta (daily time decay)
  │
  ├── Validate risk limits:
  │   ├── Max delta: ±500 NIFTY pts equivalent
  │   ├── Max gamma: ±50 per 1% move
  │   ├── Max vega: ±100,000 per 1% IV move
  │   └── Max loss at open: within daily drawdown limit
  │
  └── If limits breached:
      ├── Queue immediate close orders for market open
      ├── Alert via Redis: risk:premarket_breach
      └── Reduce available capital for new positions
```

#### Redis Key: `premarket:risk_check`

```json
{
  "computed_at": "2026-03-13T09:08:42.000+05:30",
  "positions_checked": 3,
  "portfolio_greeks": {
    "net_delta": 125.4,
    "net_gamma": 12.8,
    "net_vega": 45200,
    "net_theta": -3150
  },
  "mark_to_market": {
    "unrealized_pnl": 12450,
    "margin_utilized": 485000,
    "margin_available": 515000
  },
  "risk_status": "WITHIN_LIMITS",
  "breaches": [],
  "queued_close_orders": []
}
```

### Sub-Phase B3.4: Tier 1 Inference (09:09:00)

Tier 1 (HMM + PatchTST) fires exactly at 09:09:00 IST, consuming Tier 0 output as 3 of its 32 input features.

```
09:09:00 ── TIER 1 INFERENCE (algo-worker)
             │
             ├── Collect 32 features:
             │   ├── Returns [5]: return_1d through return_60d (from QuestDB daily_ohlcv)
             │   ├── Moving averages [6]: SMA 20/50/200, EMA 20, price vs SMA200, golden cross
             │   ├── Volatility [5]: realized vol 10d/20d/60d, India VIX, VIX percentile
             │   ├── Trend strength [4]: ADX 14, trend strength, higher high/lower low counts
             │   ├── Breadth [2]: % above 200 SMA, advance/decline ratio
             │   ├── Tier 0 output [3]: expected_gap_pct, expected_volatility, opening_bias
             │   ├── Global macro [4]: S&P return, Brent change, USD/INR change, sentiment
             │   └── Seasonality [3]: month, day_of_week, days_to_expiry
             │
             ├── HMM regime classification (~3ms):
             │   └── Output: BULL_TRENDING | BEAR_TRENDING | VOLATILE | RANGING
             │       + state_probabilities, confidence, transition_matrix
             │
             ├── PatchTST daily trend prediction (~5ms):
             │   └── Input: 512 days x 15 features (from QuestDB rolling window)
             │       Output: daily_direction [-1, +1], daily_magnitude, trend_confidence
             │
             ├── Publish combined output to Redis:
             │   ├── Key:   tier1:regime:{date}   (e.g., tier1:regime:2026-03-13)
             │   ├── TTL:   28800 seconds (end of trading day)
             │   └── Value: full Tier 1 output JSON
             │
             └── Emit: Tier1RegimeEvent
                  └── Consumed by Tier 2, 4, Risk Manager, Strategy Selector
```

---

## Phase B4: Overnight Candle Synthesis (09:14:55)

### Purpose

Consolidate 17+ hours of global market data, pre-market intelligence, and model predictions into a single **context vector** (the "overnight candle") that provides Tier 2 with a warm start at market open.

### Why 09:14:55?

The overnight candle must be ready in Redis **before** the first live tick arrives at 09:15:00. Publishing at 09:14:55 provides:

| Concern                            | Buffer                  |
| ---------------------------------- | ----------------------- |
| Redis write + propagation          | ~2ms (local instance)   |
| algo-worker cache refresh          | ~5ms                    |
| Tier 2 first inference preparation | ~10ms                   |
| Safety margin for clock drift      | ~4,983ms                |
| **Total buffer**                   | **5,000ms (5 seconds)** |

Publishing earlier (e.g., 09:14:00) would miss late-breaking data. Publishing later (e.g., 09:14:59) would risk the first candle (09:15-09:16) not having the overnight context.

### Data Sources Consolidated

The overnight candle synthesizes data from **eight distinct categories** collected over 17+ hours:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 OVERNIGHT CANDLE SYNTHESIS (09:14:55)                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 1. GIFT NIFTY SYNTHETIC OVERNIGHT CANDLE                        │   │
│  │    Source: Upstox WebSocket (08:00-09:08 IST tick data)         │   │
│  │    + Yahoo Finance (SGX Nifty overnight snapshots)              │   │
│  │    Fields: open, high, low, close, volume                       │   │
│  │    open  = prev NIFTY close (15:30 yesterday)                   │   │
│  │    high  = max(GIFT Nifty LTP) from 08:00 to 09:08             │   │
│  │    low   = min(GIFT Nifty LTP) from 08:00 to 09:08             │   │
│  │    close = frozen indicative price (09:08)                      │   │
│  │    vol   = sum(GIFT Nifty volume) over session                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 2. US SESSION DATA                                               │   │
│  │    Source: Yahoo Finance (polled every 5 min until 01:30 IST)   │   │
│  │    Fields:                                                       │   │
│  │      sp500_close, sp500_return, sp500_high, sp500_low           │   │
│  │      nasdaq_close, nasdaq_return                                 │   │
│  │      vix_close (CBOE VIX)                                       │   │
│  │      us_10y_yield                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 3. ASIA SESSION DATA                                             │   │
│  │    Source: Yahoo Finance (polled every 5 min from 05:30 IST)    │   │
│  │    Fields:                                                       │   │
│  │      nikkei_return (morning session to 09:08 IST)               │   │
│  │      hang_seng_return (morning session to 09:08 IST)            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 4. COMMODITIES                                                   │   │
│  │    Source: Yahoo Finance                                         │   │
│  │    Fields:                                                       │   │
│  │      brent_crude_change (overnight %)                           │   │
│  │      brent_wti_spread (contango/backwardation signal)           │   │
│  │      gold_change (overnight %)                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 5. CURRENCIES                                                    │   │
│  │    Source: Yahoo Finance                                         │   │
│  │    Fields:                                                       │   │
│  │      dxy_change (Dollar Index overnight %)                      │   │
│  │      usd_inr_change (overnight %)                               │   │
│  │      eur_inr_change (overnight %)                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 6. FINBERT SENTIMENT SCORE                                       │   │
│  │    Source: Finnhub headlines → FinBERT inference pipeline        │   │
│  │    Fields:                                                       │   │
│  │      aggregate_sentiment [-1.0, +1.0]                           │   │
│  │      headline_count (number of articles processed)              │   │
│  │      sentiment_std (disagreement among headlines)               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 7. TIER 0 PREDICTIONS (from Redis cache)                        │   │
│  │    Source: tier0:gap:{date} (cached at 09:08:05)                │   │
│  │    Fields:                                                       │   │
│  │      expected_gap_pct, expected_volatility                      │   │
│  │      opening_bias, confidence                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 8. SYNTHETIC GREEKS (from Redis cache)                          │   │
│  │    Source: premarket:greeks (cached at 09:08:32)                │   │
│  │    Fields:                                                       │   │
│  │      atm_ce_delta, atm_pe_delta, atm_gamma                     │   │
│  │      estimated_atm_iv, atm_straddle_price                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│                           ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ CONSOLIDATED OVERNIGHT CANDLE                                    │   │
│  │                                                                  │   │
│  │ Published to Redis: premarket:overnight_candle                  │   │
│  │ TTL: 28800 seconds (end of trading day)                         │   │
│  │ Consumed by: Tier 2 (warm start), Tier 4 (context features)    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Overnight Candle Implementation

```typescript
interface OvernightCandle {
  timestamp: string;
  overnight_ohlcv: {
    open: number;   // prev NIFTY close
    high: number;   // max GIFT Nifty LTP
    low: number;    // min GIFT Nifty LTP
    close: number;  // frozen indicative price
    volume: number; // GIFT Nifty session volume
  };
  us_session: {
    sp500_close: number;
    sp500_return: number;
    nasdaq_return: number;
    vix_close: number;
    us_10y_yield: number;
  };
  asia_session: {
    nikkei_return: number;
    hang_seng_return: number;
  };
  commodities: {
    brent_crude_change: number;
    brent_wti_spread: number;
    gold_change: number;
  };
  currencies: {
    dxy_change: number;
    usd_inr_change: number;
    eur_inr_change: number;
  };
  sentiment: {
    aggregate_score: number;  // [-1, +1]
    headline_count: number;
    sentiment_std: number;
  };
  tier0_predictions: {
    expected_gap_pct: number;
    expected_volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    opening_bias: number;
    confidence: number;
  };
  synthetic_greeks: {
    atm_ce_delta: number;
    atm_pe_delta: number;
    atm_gamma: number;
    estimated_atm_iv: number;
    atm_straddle_price: number;
  };
}

/**
 * Cron trigger: 09:14:55 IST (03:44:55 UTC), weekdays only.
 * Build and publish the overnight candle 5 seconds before market open.
 */
@Cron('55 44 3 * * 1-5', { name: 'overnight-candle-synthesis', timeZone: 'UTC' })
async buildOvernightCandle(): Promise<void> {
  this.phaseState = 'B4_CANDLE';
  const buildStart = Date.now();

  this.logger.log('='.repeat(60));
  this.logger.log('PHASE B4: OVERNIGHT CANDLE SYNTHESIS');
  this.logger.log('='.repeat(60));

  try {
    // 1. GIFT Nifty synthetic OHLCV
    const giftNiftySnapshots = await this.questdb.query(`
      SELECT min(ltp) as low, max(ltp) as high, last(ltp) as close,
             sum(volume) as volume
      FROM global_market_data
      WHERE instrument_key = 'GLOBAL|GIFT Nifty'
        AND timestamp >= dateadd('h', -17, now())
    `);

    // 2. US session data
    const usData = await this.redis.get('global:us_session:latest');

    // 3. Asia session data
    const asiaData = await this.redis.get('global:asia_session:latest');

    // 4. Commodities
    const commodityData = await this.redis.get('global:commodities:latest');

    // 5. Currencies
    const currencyData = await this.redis.get('global:currencies:latest');

    // 6. FinBERT sentiment
    const sentiment = await this.redis.get('sentiment:overnight');

    // 7. Tier 0 predictions (cached at 09:08:05)
    const today = new Date().toISOString().split('T')[0];
    const tier0 = await this.redis.get(`tier0:gap:${today}`);

    // 8. Synthetic Greeks (cached at 09:08:32)
    const greeks = await this.redis.get('premarket:greeks');

    // Build consolidated candle
    const overnightCandle: OvernightCandle = {
      timestamp: new Date().toISOString(),
      overnight_ohlcv: {
        open: this.prevNiftyClose,
        high: giftNiftySnapshots.rows[0]?.high ?? this.prevNiftyClose,
        low: giftNiftySnapshots.rows[0]?.low ?? this.prevNiftyClose,
        close: this.frozenIndicativePrice ?? this.prevNiftyClose,
        volume: giftNiftySnapshots.rows[0]?.volume ?? 0,
      },
      us_session: JSON.parse(usData || '{}'),
      asia_session: JSON.parse(asiaData || '{}'),
      commodities: JSON.parse(commodityData || '{}'),
      currencies: JSON.parse(currencyData || '{}'),
      sentiment: JSON.parse(sentiment || '{"aggregate_score":0,"headline_count":0,"sentiment_std":0}'),
      tier0_predictions: JSON.parse(tier0 || '{}'),
      synthetic_greeks: this.extractGreeksSummary(JSON.parse(greeks || '{}')),
    };

    // Publish to Redis
    await this.redis.set(
      `premarket:overnight_candle`,
      JSON.stringify(overnightCandle),
      'EX',
      28800,
    );

    // Also publish with date key for historical reference
    await this.redis.set(
      `tier0:overnight_candle:${today}`,
      JSON.stringify(overnightCandle),
      'EX',
      86400,
    );

    const buildDuration = Date.now() - buildStart;
    this.logger.log(`Overnight candle published in ${buildDuration}ms`);
    this.logger.log(`  OHLCV: O=${overnightCandle.overnight_ohlcv.open} H=${overnightCandle.overnight_ohlcv.high} L=${overnightCandle.overnight_ohlcv.low} C=${overnightCandle.overnight_ohlcv.close}`);
    this.logger.log(`  Gap: ${((this.frozenIndicativePrice! - this.prevNiftyClose) / this.prevNiftyClose * 100).toFixed(2)}%`);
    this.logger.log(`  Sentiment: ${overnightCandle.sentiment.aggregate_score.toFixed(3)}`);

    // Emit event for algo-worker pre-positioning
    this.eventEmitter.emit('premarket.overnight_candle', overnightCandle);

    // Transition to LIVE mode at 09:15:00
    this.phaseState = 'LIVE';

  } catch (error) {
    this.logger.error(
      `PHASE B4 FAILED: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Publish a minimal candle so Tier 2 does not cold-start
    await this.publishFallbackCandle();
  }
}
```

---

## Complete Redis Key Schema

All pre-market data is published to Redis with consistent key naming and TTL policies.

### Key Naming Convention

```
premarket:{data_type}              -- ephemeral pre-market data (TTL: end of day)
tier{N}:{output_type}:{date}       -- model predictions (TTL: end of day)
global:{region}:{data_type}:latest -- global market data (TTL: 1 hour, refreshed continuously)
```

### Full Key Reference

| Redis Key                       | Writer        | Written At | TTL | Consumer                   | Purpose                                      |
| ------------------------------- | ------------- | ---------- | --- | -------------------------- | -------------------------------------------- |
| `premarket:indicative`          | market-feeder | 09:08:00   | 8h  | algo-worker                | Frozen indicative price + gap metrics        |
| `premarket:greeks`              | market-feeder | 09:08:32   | 8h  | algo-worker, risk-mgr      | Synthetic option Greeks (ATM +/- 10 strikes) |
| `premarket:iv_surface`          | market-feeder | 09:08:35   | 8h  | algo-worker                | Adjusted IV surface for option pricing       |
| `premarket:risk_check`          | market-feeder | 09:08:42   | 8h  | risk-manager               | Portfolio mark-to-market + risk validation   |
| `premarket:overnight_candle`    | market-feeder | 09:14:55   | 8h  | algo-worker (Tier 2/4)     | Consolidated overnight context vector        |
| `tier0:gap:{date}`              | algo-worker   | 09:08:05   | 8h  | algo-worker (Tier 1/2/4)   | XGBoost gap prediction                       |
| `tier0:overnight_candle:{date}` | market-feeder | 09:14:55   | 24h | training-pipeline          | Historical overnight candle (for retraining) |
| `tier1:regime:{date}`           | algo-worker   | 09:09:00   | 8h  | algo-worker (Tier 2/4)     | HMM regime + PatchTST trend                  |
| `global:gift_nifty:latest`      | market-feeder | Continuous | 1h  | market-feeder, algo-worker | Latest GIFT Nifty tick                       |
| `global:us_session:latest`      | market-feeder | 01:30 IST  | 12h | market-feeder              | US session close data                        |
| `global:asia_session:latest`    | market-feeder | Continuous | 1h  | market-feeder              | Asia session returns                         |
| `global:commodities:latest`     | market-feeder | Continuous | 1h  | market-feeder              | Brent, Gold latest                           |
| `global:currencies:latest`      | market-feeder | Continuous | 1h  | market-feeder              | DXY, USD/INR, EUR/INR                        |
| `sentiment:overnight`           | market-feeder | 08:45 IST  | 12h | algo-worker                | FinBERT aggregate sentiment                  |
| `system:heartbeat`              | market-feeder | Continuous | 60s | monitoring                 | Service health pulse                         |
| `risk:premarket_breach`         | market-feeder | 09:08:42   | 8h  | risk-manager, alerts       | Pre-market risk limit breaches               |

---

## Data Flow Diagram

### End-to-End Pre-Market Data Flow

```
                     PHASE A (00:00-09:00)              PHASE B (09:00-09:15)
                     ════════════════════              ══════════════════════

                                                       B1         B2        B3           B4
                                                    09:00      09:08     09:08:30     09:14:55
                                                      │          │         │             │
  ┌─────────────┐                                     │          │         │             │
  │ Yahoo       │ ──5-min polls──────────────────────►│──────────┼────────►│             │
  │ Finance     │   S&P, Nasdaq, Nikkei, Brent, Gold  │          │         │             │
  │             │   DXY, USD/INR, EUR/INR             │          │         │             │
  └─────────────┘                                     │          │         │             │
                                                      │          │         │             │
  ┌─────────────┐                                     │          │         │             │
  │ GIFT Nifty  │ ──tick stream──────────────────────►│────►     │         │             │
  │ (Upstox)    │   1-second from 08:00 IST           │   capture│         │             │
  └─────────────┘                                     │    premium│        │             │
                                                      │          │         │             │
  ┌─────────────┐                                     │          │         │             │
  │ Finnhub     │ ──headlines─────────────────────────►│──────────┼────────►│             │
  │ + FinBERT   │   15-min sentiment pipeline          │          │         │             │
  └─────────────┘                                     │          │         │             │
                                                      │          │         │             │
  ┌─────────────┐                                     │          ▼         │             │
  │ NSE Pre-Open│ ─────────────────────────────────────│───► FREEZE ──────►│             │
  │ (Upstox)    │   09:08 frozen indicative price      │   indicative      │             │
  └─────────────┘                                     │   published        │             │
                                                      │          │         │             │
                                                      │          ▼         │             │
                               ┌──────────────────────┼── Redis: premarket:indicative    │
                               │                      │          │         │             │
                               │     ┌────────────────┼──────────┘         │             │
                               │     │                │                    │             │
                               │     ▼                │                    │             │
                               │  ┌──────────────┐    │                    │             │
                               │  │ TIER 0       │    │                    │             │
                               │  │ XGBoost      │    │                    │             │
                               │  │ (algo-worker)│    │                    │             │
                               │  │ 09:08:05     │    │                    │             │
                               │  └──────┬───────┘    │                    │             │
                               │         │            │                    │             │
                               │         ▼            │                    │             │
                               │  Redis: tier0:gap:   │                    │             │
                               │  {date}              │                    │             │
                               │         │            │                    ▼             │
                               │         │            │        ┌──────────────────┐      │
                               │         └────────────┼───────►│ Synthetic Greeks │      │
                               │                      │        │ IV Surface Adj.  │      │
                               │                      │        │ Risk Pre-Check   │      │
                               │                      │        │ (market-feeder)  │      │
                               │                      │        └────────┬─────────┘      │
                               │                      │                 │                │
                               │                      │        ┌───────►│                │
                               │         ┌────────────┼────────┘        │                │
                               │         │            │                 ▼                │
                               │         ▼            │     ┌──────────────────┐         │
                               │  ┌──────────────┐    │     │ TIER 1           │         │
                               │  │ 32 features  │    │     │ HMM + PatchTST   │         │
                               │  │ collected    │────┼────►│ (algo-worker)    │         │
                               │  └──────────────┘    │     │ 09:09:00         │         │
                               │                      │     └────────┬─────────┘         │
                               │                      │              │                   │
                               │                      │              ▼                   │
                               │                      │     Redis: tier1:regime:{date}   │
                               │                      │              │                   │
                               │                      │              │                   ▼
                               │                      │              │      ┌────────────────────┐
                               │                      │              │      │ OVERNIGHT CANDLE    │
                               │                      │              └─────►│ SYNTHESIS           │
                               │                      │                     │ (market-feeder)     │
                               │                      │                     │ 09:14:55            │
                               └──────────────────────┼────────────────────►│                    │
                                                      │                     └─────────┬──────────┘
                                                      │                               │
                                                      │                               ▼
                                                      │              Redis: premarket:overnight_candle
                                                      │                               │
                                                      │                               │
                                                      │          09:15:00  MARKET OPENS
                                                      │              ▼                 ▼
                                                      │     ┌─────────────────────────────────────┐
                                                      │     │ Tier 2/3/4 CONTINUOUS TRADING LOOP  │
                                                      │     │ (consumes all cached pre-market     │
                                                      │     │  intelligence as context features)  │
                                                      └────►│                                     │
                                                            └─────────────────────────────────────┘
```

### Phase Transition State Machine

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     PRE-MARKET SESSION STATE MACHINE                          │
│                                                                              │
│                                                                              │
│   IDLE ──[09:00]──► B1_STANDBY ──[09:08]──► B2_FREEZE                      │
│                       │                        │                             │
│                       │ Pre-warm models        │ Capture indicative          │
│                       │ Verify connections     │ Trigger Tier 0              │
│                       │ Continue global data   │ Publish to Redis            │
│                       │                        │                             │
│                       │                        ▼                             │
│                       │              B3_PRETRADE ──[09:14:55]──► B4_CANDLE  │
│                       │                │                            │        │
│                       │                │ Synthetic Greeks            │ Build  │
│                       │                │ IV surface adjust           │ context│
│                       │                │ Risk pre-check              │ vector │
│                       │                │ Tier 1 inference            │ Publish│
│                       │                │                            │        │
│                       │                │                            ▼        │
│                       │                │                     LIVE ───────►   │
│                       │                │                       │             │
│                       │                │                       │ 09:15:00    │
│                       │                │                       │ Continuous  │
│                       │                │                       │ trading     │
│                       │                │                       │ begins      │
│                       │                │                       │             │
│   ERROR HANDLING:     │                │                       │             │
│   Any phase failure ──┼──► Log error ──┼──► Attempt fallback ──┘             │
│   falls through to    │   to QuestDB   │   (GIFT Nifty proxy,               │
│   next phase with     │   + Slack      │    minimal candle)                  │
│   degraded data       │   alert        │                                     │
│                       │                │                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling and Fallbacks

### Failure Scenarios

| Failure                   | Impact                                  | Fallback                                                              |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Upstox pre-open feed down | No indicative price at 09:08            | Use GIFT Nifty LTP minus historical average basis (~15 pts)           |
| Yahoo Finance API timeout | Missing global data sources             | Use last available snapshot; flag staleness in overnight candle       |
| Finnhub API down          | No sentiment score                      | Default sentiment = 0.0 (neutral); flag in candle metadata            |
| Redis connection lost     | Cannot publish pre-market data          | Reconnect with exponential backoff; hold data in local buffer         |
| QuestDB read failure      | Cannot query historical data for Tier 1 | Use cached previous-day features; alert for manual intervention       |
| Tier 0 inference fails    | No gap prediction                       | Tier 1 runs without Tier 0 features (uses zeros); confidence degraded |
| Tier 1 inference fails    | No regime classification                | Default to previous day's regime; reduce position sizing by 50%       |
| Clock sync drift > 500ms  | Phase timing misalignment               | NTP sync check at 08:55; alert if drift exceeds threshold             |

### Degraded Mode

If critical failures occur, the system enters **degraded mode** where:

1. Position sizing is automatically reduced to 25% of normal
2. Confidence thresholds are raised from 0.70 to 0.90
3. Only high-conviction signals are traded
4. Alert is sent via Slack and PagerDuty
5. System self-heals on next trading day (full re-initialization)

---

## Monitoring and Observability

### Pre-Market Health Check Endpoint

```
GET /health/premarket
```

```json
{
  "phase": "B3_PRETRADE",
  "phase_started_at": "2026-03-13T09:08:30.000+05:30",
  "phase_elapsed_ms": 45200,
  "data_sources": {
    "gift_nifty": {
      "status": "OK",
      "last_tick": "2026-03-13T09:08:29.850+05:30",
      "staleness_ms": 350
    },
    "yahoo_finance": {
      "status": "OK",
      "last_poll": "2026-03-13T09:07:00.000+05:30",
      "symbols_active": 12
    },
    "finnhub": {
      "status": "OK",
      "last_fetch": "2026-03-13T09:00:00.000+05:30",
      "articles": 47
    },
    "upstox_preopen": {
      "status": "OK",
      "freeze_captured": true,
      "indicative_price": 22847.5
    }
  },
  "models": {
    "tier0": {
      "status": "COMPLETED",
      "fired_at": "2026-03-13T09:08:05.000+05:30",
      "latency_ms": 2.3
    },
    "tier1": {
      "status": "PENDING",
      "scheduled_at": "2026-03-13T09:09:00.000+05:30"
    }
  },
  "redis_keys_published": [
    "premarket:indicative",
    "premarket:greeks",
    "premarket:iv_surface",
    "premarket:risk_check"
  ],
  "redis_keys_pending": ["premarket:overnight_candle"],
  "errors": []
}
```

### Prometheus Metrics

| Metric                                | Type      | Description                             |
| ------------------------------------- | --------- | --------------------------------------- |
| `premarket_phase_duration_seconds`    | Histogram | Duration of each sub-phase              |
| `premarket_freeze_capture_latency_ms` | Gauge     | Time from NSE freeze to Redis publish   |
| `premarket_indicative_gap_pct`        | Gauge     | Today's gap percentage (for dashboards) |
| `premarket_greeks_computation_ms`     | Histogram | Time to compute synthetic Greeks        |
| `premarket_overnight_candle_build_ms` | Histogram | Time to build overnight candle          |
| `premarket_data_staleness_seconds`    | Gauge     | Per-source data staleness               |
| `premarket_fallback_triggered_total`  | Counter   | Number of fallback activations          |
| `premarket_errors_total`              | Counter   | Error count per phase                   |

---

## Related Documentation

- [MODEL_PIPELINE_WORKFLOW.md](../../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) -- Full session-by-session timing (Phase A through D)
- [TIER0_MODELS.md](../../../docs/ml/TIER0_MODELS.md) -- XGBoost gap predictor (fires at 09:08:05)
- [TIER1_MODELS.md](../../../docs/ml/TIER1_MODELS.md) -- HMM + PatchTST regime classifier (fires at 09:09:00)
- [FEATURE_SPECIFICATION.md](../../../docs/ml/FEATURE_SPECIFICATION.md) -- All 117 feature definitions
- [GRPC_IMPLEMENTATION.md](./GRPC_IMPLEMENTATION.md) -- gRPC service implementation
- [MULTI_TIMEFRAME_STRATEGY.md](./MULTI_TIMEFRAME_STRATEGY.md) -- Multi-timeframe strategy documentation
- [Market Feeder README](../README.md) -- Service overview and architecture

---

**Service**: market-feeder (NestJS + TypeScript)
**Pre-Market Window**: 09:00 - 09:15 IST (4 sub-phases)
**Critical Event**: NSE freeze at 09:08:00 (Tier 0 trigger)
**Final Deadline**: 09:14:55 (overnight candle must be in Redis)
**Last Updated**: March 13, 2026
