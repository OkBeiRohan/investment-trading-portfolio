# Layer 2: Cortex

> **Real-time feature engineering with sliding window caching**

**Latency Target**: <10ms per feature vector

---

## Purpose

The Cortex layer transforms raw market data from the Perception layer into engineered features for ML models. It maintains sliding windows of historical data and computes technical indicators, volatility metrics, and options-specific features in real-time.

---

## Components

### **1. FeatureEngineService**

**File**: `src/cortex/feature-engine.service.ts`

**Responsibilities**:

- Listen to `MarketDataReceivedEvent`
- Compute 50+ features from current + historical data
- Emit `FeaturesComputedEvent` for Prediction layer

**Features Computed**:

- **Technical Indicators**: RSI, MACD, Bollinger Bands, SMA, EMA, ATR, OBV, ADX
- **Volatility**: Realized volatility (5d, 10d, 20d), Parkinson estimator
- **Options**: ATM IV, IV skew, term structure, PCR (volume/OI), Max Pain
- **Microstructure**: Bid-ask spread, order book imbalance, trade intensity

**Example**:

```typescript
@Injectable()
export class FeatureEngineService {
  constructor(
    private cache: FeatureCacheService,
    private eventBus: EventBus,
  ) {}

  @OnEvent('MarketDataReceivedEvent')
  async handleMarketData(event: MarketDataReceivedEvent) {
    // Update cache with new tick
    await this.cache.append(event.symbol, event.data);

    // Fetch sliding window (e.g., last 100 ticks)
    const window = await this.cache.getWindow(event.symbol, 100);

    // Compute features
    const features = {
      rsi_14: this.computeRSI(window, 14),
      macd: this.computeMACD(window),
      bb_upper: this.computeBollingerBands(window).upper,
      realized_vol_5d: this.computeRealizedVol(window, 5 * 375), // 5 days * 375 ticks/day
      atm_iv: this.getATMImpliedVol(event.symbol),
      // ... 45 more features
    };

    // Emit for Prediction layer
    this.eventBus.publish(new FeaturesComputedEvent(event.symbol, features));
  }

  private computeRSI(window: MarketData[], period: number): number {
    const gains = [];
    const losses = [];
    for (let i = 1; i < window.length; i++) {
      const change = window[i].ltp - window[i - 1].ltp;
      gains.push(Math.max(change, 0));
      losses.push(Math.abs(Math.min(change, 0)));
    }
    const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
}
```

---

### **2. FeatureCacheService**

**File**: `src/cortex/feature-cache.service.ts`

**Responsibilities**:

- Maintain sliding windows in Redis (sorted sets)
- Expire old data automatically (TTL)
- Provide O(log N) window retrieval

**Example**:

```typescript
@Injectable()
export class FeatureCacheService {
  constructor(private redis: RedisService) {}

  async append(symbol: string, data: MarketData): Promise<void> {
    const key = `window:${symbol}`;
    await this.redis.zadd(key, data.timestamp, JSON.stringify(data));
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  async getWindow(symbol: string, count: number): Promise<MarketData[]> {
    const key = `window:${symbol}`;
    const results = await this.redis.zrange(key, -count, -1);
    return results.map((r) => JSON.parse(r));
  }
}
```

---

### **3. OptionsFeatureService**

**File**: `src/cortex/options-feature.service.ts`

**Responsibilities**:

- Compute options-specific features (IV, skew, Max Pain, PCR)
- Fetch option chain from Redis (published by market-feeder)

**Example**:

```typescript
@Injectable()
export class OptionsFeatureService {
  async getATMImpliedVol(underlying: string): Promise<number> {
    const optionChain = await this.redis.get(`chain:${underlying}`);
    const atmStrike = this.findATMStrike(optionChain);
    return optionChain[atmStrike].iv;
  }

  async getMaxPain(underlying: string): Promise<number> {
    const optionChain = await this.redis.get(`chain:${underlying}`);
    let maxPain = 0;
    let minLoss = Infinity;

    for (const strike of Object.keys(optionChain)) {
      const callLoss = this.computeCallLoss(optionChain, strike);
      const putLoss = this.computePutLoss(optionChain, strike);
      const totalLoss = callLoss + putLoss;
      if (totalLoss < minLoss) {
        minLoss = totalLoss;
        maxPain = parseFloat(strike);
      }
    }
    return maxPain;
  }
}
```

---

## Events Consumed

### **`MarketDataReceivedEvent`**

**Source**: Perception layer

```typescript
export class MarketDataReceivedEvent {
  symbol: string;
  timestamp: number;
  data: MarketData;
}
```

---

## Events Published

### **`FeaturesComputedEvent`**

```typescript
export class FeaturesComputedEvent {
  constructor(
    public readonly symbol: string,
    public readonly timestamp: number,
    public readonly features: Float32Array, // 50-element vector
  ) {}
}
```

**Consumed By**: Prediction layer (EnsembleInferenceService)

---

## Feature Vector Schema

**Size**: 50 elements (Float32Array)

**Order** (matches training-pipeline output):

```typescript
[
  // Technical (20)
  rsi_14,
  macd,
  macd_signal,
  bb_upper,
  bb_middle,
  bb_lower,
  sma_20,
  sma_50,
  ema_12,
  ema_26,
  atr_14,
  obv,
  adx,
  cci,
  mfi,
  stoch_k,
  stoch_d,
  williams_r,
  roc,
  trix,

  // Volatility (10)
  realized_vol_5d,
  realized_vol_10d,
  realized_vol_20d,
  parkinson_vol,
  garman_klass_vol,
  yang_zhang_vol,
  india_vix,
  vix_future_1m,
  vix_future_2m,
  vix_future_3m,

  // Options (15)
  atm_iv,
  atm_iv_call,
  atm_iv_put,
  iv_skew_25delta,
  iv_skew_10delta,
  iv_term_1w,
  iv_term_1m,
  iv_term_3m,
  pcr_volume,
  pcr_oi,
  max_pain,
  oi_buildup,
  greek_delta,
  greek_gamma,
  greek_vega,

  // Microstructure (5)
  bid_ask_spread,
  order_imbalance,
  trade_intensity,
  volume_profile,
  tick_direction,
];
```

---

## Caching Strategy

### **Redis Keys**

```
window:{symbol}              # Sorted set (timestamp → tick data)
chain:{symbol}               # Hash (strike → IV, OI, volume)
indicator:{symbol}:{name}    # String (cached indicator value)
```

### **TTL Policy**

- `window:*` → 1 hour (sliding window for indicators)
- `chain:*` → 5 minutes (option chain updates)
- `indicator:*` → 1 minute (cached RSI, MACD, etc.)

---

## Performance Optimization

### **1. Incremental Computation**

Instead of recomputing RSI from scratch, use rolling calculation:

```typescript
private updateRSI(prevRSI: number, newPrice: number, oldPrice: number, period: number): number {
  const newGain = Math.max(newPrice - oldPrice, 0);
  const newLoss = Math.abs(Math.min(newPrice - oldPrice, 0));

  const avgGain = ((prevRSI.avgGain * (period - 1)) + newGain) / period;
  const avgLoss = ((prevRSI.avgLoss * (period - 1)) + newLoss) / period;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
```

### **2. Parallel Computation**

Compute independent features in parallel:

```typescript
const [rsi, macd, bb, vol] = await Promise.all([
  this.computeRSI(window, 14),
  this.computeMACD(window),
  this.computeBollingerBands(window),
  this.computeRealizedVol(window, 5 * 375),
]);
```

### **3. Pre-warming Cache**

On startup, fetch historical data from QuestDB:

```typescript
async onModuleInit() {
  for (const symbol of this.watchlist) {
    const ticks = await this.questDB.query(`
      SELECT * FROM ticks WHERE symbol = '${symbol}'
      ORDER BY timestamp DESC LIMIT 1000
    `);
    for (const tick of ticks) {
      await this.cache.append(symbol, tick);
    }
  }
}
```

---

## Error Handling

### **Missing Historical Data**

- **Fallback**: Use default values (e.g., RSI = 50)
- **Metric**: `cortex.missing_data_total` (counter)

```typescript
const window = await this.cache.getWindow(symbol, 100);
if (window.length < 20) {
  this.logger.warn(`Insufficient data for ${symbol}: ${window.length} ticks`);
  return { rsi_14: 50, ...defaultFeatures };
}
```

---

### **Computation Errors**

- **Action**: Log error, emit `FeatureComputationErrorEvent`, skip symbol
- **Metric**: `cortex.computation_errors_total` (counter)

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
cortex.features_computed_total{symbol="..."}              // Counter
cortex.feature_computation_duration_ms{symbol="..."}      // Histogram
cortex.cache_hit_rate{key_type="window"}                  // Gauge
cortex.missing_data_total{symbol="..."}                   // Counter
cortex.computation_errors_total{feature="rsi"}            // Counter
```

### **Health Check**

```typescript
@Injectable()
export class CortexHealthIndicator extends HealthIndicator {
  check() {
    const isHealthy = this.computationRate > 10 && this.cacheHitRate > 0.8;
    return this.getStatus('cortex', isHealthy, {
      computationRate: this.computationRate,
      cacheHitRate: this.cacheHitRate,
    });
  }
}
```

---

## Testing

### **Unit Tests**

**File**: `src/cortex/__tests__/feature-engine.spec.ts`

```typescript
describe('FeatureEngineService', () => {
  it('should compute RSI correctly', () => {
    const service = new FeatureEngineService(mockCache, mockEventBus);
    const rsi = service.computeRSI(mockWindow, 14);
    expect(rsi).toBeCloseTo(65.43, 2);
  });

  it('should handle missing data', () => {
    const service = new FeatureEngineService(mockCache, mockEventBus);
    const features = service.handleMarketData(mockEvent);
    expect(features.rsi_14).toBe(50); // Default value
  });
});
```

---

### **Integration Tests**

**File**: `test/cortex.e2e-spec.ts`

```typescript
describe('Cortex Layer (e2e)', () => {
  it('should compute features end-to-end', async () => {
    // Publish MarketDataReceivedEvent
    eventBus.publish(new MarketDataReceivedEvent('NIFTY', Date.now(), tick));

    // Wait for FeaturesComputedEvent
    const event = await waitForEvent(FeaturesComputedEvent, 1000);
    expect(event.features.length).toBe(50);
    expect(event.features[0]).toBeGreaterThan(0); // RSI
  });
});
```

---

## Configuration

**File**: `src/config/cortex.config.ts`

```typescript
export const cortexConfig = {
  cache: {
    windowSize: 1000, // Max ticks per symbol
    ttlSeconds: 3600, // 1 hour
  },
  features: {
    technical: {
      rsiPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
    },
    volatility: {
      realizedVolPeriods: [5, 10, 20], // days
    },
    options: {
      ivSkewDeltas: [0.25, 0.1], // 25-delta, 10-delta
      ivTermPeriods: ['1w', '1m', '3m'],
    },
  },
};
```

---

## Performance Targets

| Metric                   | Target            | Current |
| ------------------------ | ----------------- | ------- |
| Feature computation time | <10ms p95         | TBD     |
| Cache hit rate           | >80%              | TBD     |
| Missing data rate        | <1%               | TBD     |
| Throughput               | >1000 vectors/sec | TBD     |

---

## Dependencies

- **Upstream**: Perception layer (`MarketDataReceivedEvent`)
- **Downstream**: Prediction layer (`FeaturesComputedEvent`)
- **External**: Redis (sliding window cache)

---

## See Also

- [Layer 1: Perception](./01-PERCEPTION.md) - Event consumption
- [Layer 3: Prediction](./03-PREDICTION.md) - Model inference
- [Feature Engineering (Training)](../../training-pipeline/docs/pipelines/FEATURE_ENGINEERING.md)
