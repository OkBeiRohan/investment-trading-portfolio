# Layer 2: Cortex (Feature Engineering + Market State Encoder)

> **The data-model interface that compresses 50,000 signals/second into actionable intelligence**

**Last Updated**: January 13, 2026  
**Status**: Core Layer Implementation  
**Related**: [MARKET_STATE_ENCODER.md](../../../docs/MARKET_STATE_ENCODER.md)

---

## Overview

### Responsibility

The Cortex layer sits between **raw perception** (Layer 1) and **intelligent prediction** (Layer 4):

```
Layer 1: Perception
   ├─ NIFTY FUTURE (OHLCV + LOB depth-20)
   ├─ 50 Constituents (OHLCV + volume + depth)
   └─ Option Chain (Greeks + OI + LOB)
          ↓
Layer 2: Cortex (THIS LAYER)
   ├─ Market State Encoder
   ├─ Index Aggregator
   ├─ Breadth Computer
   ├─ LOB Tensor Builder
   └─ Regime Feature Builder
          ↓
Layer 4: Prediction Models
   ├─ LightGBM (33 features)
   ├─ TFT (120×15 time-series)
   ├─ LiT (60×80 LOB tensor)
   └─ Meta-Learner
```

### Key Principle

> **Models NEVER see "many instruments". They see a SINGLE, AGGREGATED, CONTEXTUALIZED STATE.**

This layer transforms:

- **Input**: 50,000+ raw signals/second (50 stocks + futures + options + LOB)
- **Output**: 200-500 compressed numbers (model-specific views)

**Compression ratio**: ~250:1

---

## Architecture Components

### 1. MarketStateEncoder (Orchestrator)

**Purpose**: Coordinate all sub-components and emit model-specific events

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
    private readonly featureCache: FeatureCacheService,
    private readonly eventBus: EventBus,
  ) {}

  @OnEvent('MarketDataReceivedEvent')
  async handleMarketData(event: MarketDataReceivedEvent) {
    // 1. Update caches (sliding windows, indicators)
    await this.updateCaches(event.data);

    // 2. Build model-specific views (parallel)
    const [lightgbmFeatures, tftFeatures, litTensor, executionState] =
      await Promise.all([
        this.buildLightGBMFeatures(),
        this.buildTFTFeatures(),
        this.buildLiTTensor(),
        this.buildExecutionState(),
      ]);

    // 3. Emit events for downstream consumption
    this.eventBus.publish(
      new LightGBMStateReadyEvent({
        timestamp: Date.now(),
        features: lightgbmFeatures,
      }),
    );

    this.eventBus.publish(
      new TFTStateReadyEvent({
        timestamp: Date.now(),
        features: tftFeatures,
      }),
    );

    this.eventBus.publish(
      new LiTStateReadyEvent({
        timestamp: Date.now(),
        tensor: litTensor,
      }),
    );

    // 4. Store encoded states to QuestDB (for training)
    await this.persistEncodedStates({
      lightgbm: lightgbmFeatures,
      tft: tftFeatures,
      lit: litTensor,
    });
  }

  private async updateCaches(data: MarketData) {
    // Update sliding windows for all instruments
    await this.featureCache.update(data);
  }

  private async buildLightGBMFeatures(): Promise<Float32Array> {
    const features = new Float32Array(33);
    let idx = 0;

    // Group 1: Index aggregation (10)
    const breadth = await this.breadthComputer.compute();
    features[idx++] = breadth.pct_stocks_above_vwap;
    features[idx++] = breadth.pct_stocks_trending_up;
    features[idx++] = breadth.advance_decline_ratio;
    features[idx++] = breadth.weighted_return_top_10;
    features[idx++] = breadth.sector_alignment_score;

    const alignment = await this.alignmentScorer.compute();
    features[idx++] = alignment.correlation_to_leader;
    features[idx++] = alignment.divergence_score;
    features[idx++] = alignment.participation_index;

    const structure = await this.indexAggregator.compute();
    features[idx++] = structure.intraday_range_position;
    features[idx++] = structure.overnight_gap;

    // Group 2: Futures features (8)
    const fut = this.featureCache.get('NIFTY_FUT');
    features[idx++] = fut.price_vs_vwap;
    features[idx++] = fut.range_position;
    features[idx++] = fut.atr_normalized;
    features[idx++] = fut.momentum_5min;
    features[idx++] = fut.momentum_15min;
    features[idx++] = fut.rsi_14;
    features[idx++] = fut.volume_vs_avg;
    features[idx++] = fut.basis;

    // Group 3: Options features (10)
    const opts = await this.optionFeatureService.compute();
    features[idx++] = opts.atm_iv;
    features[idx++] = opts.iv_change_5min;
    features[idx++] = opts.iv_rank;
    features[idx++] = opts.put_call_ratio_oi;
    features[idx++] = opts.put_call_ratio_volume;
    features[idx++] = opts.max_pain_distance;
    features[idx++] = opts.gamma_atm;
    features[idx++] = opts.delta_weighted_oi;
    features[idx++] = opts.skew;
    features[idx++] = opts.term_structure;

    // Group 4: Time context (5)
    const time = this.timeContext.compute();
    features[idx++] = time.minutes_from_open;
    features[idx++] = time.minutes_to_close;
    features[idx++] = time.is_first_hour ? 1 : 0;
    features[idx++] = time.is_last_hour ? 1 : 0;
    features[idx++] = time.days_to_expiry;

    return features;
  }

  private async buildTFTFeatures(): Promise<Float32Array> {
    return this.regimeFeatureBuilder.build(120); // 120 timesteps
  }

  private async buildLiTTensor(): Promise<Float32Array> {
    return this.lobTensorBuilder.build('NIFTY_FUT', 60); // 60 seconds
  }

  private async buildExecutionState(): Promise<ExecutionState> {
    return this.executionStateBuilder.build();
  }
}
```

---

### 2. IndexAggregator

**Purpose**: Compute index-level structural metrics

```typescript
@Injectable()
export class IndexAggregator {
  async compute(): Promise<IndexStructure> {
    const futuresPrice = this.featureCache.get('NIFTY_FUT').ltp;
    const futuresOpen = this.featureCache.get('NIFTY_FUT').open;
    const previousClose = this.featureCache.get('NIFTY_FUT').prev_close;

    // Intraday range position (0.0 = at low, 1.0 = at high)
    const high = this.featureCache.get('NIFTY_FUT').high;
    const low = this.featureCache.get('NIFTY_FUT').low;
    const range_position = (futuresPrice - low) / (high - low || 1);

    // Overnight gap (normalized)
    const overnight_gap = (futuresOpen - previousClose) / previousClose;

    return {
      intraday_range_position: range_position,
      overnight_gap,
    };
  }
}
```

---

### 3. BreadthComputer

**Purpose**: Collapse 50 constituents into participation metrics

**Critical Role**: Detect false moves (futures spike but constituents don't follow)

```typescript
@Injectable()
export class BreadthComputer {
  async compute(): Promise<BreadthMetrics> {
    const constituents = this.featureCache.getConstituents(); // 50 stocks

    // 1. Percent above VWAP
    const aboveVWAP = constituents.filter((s) => s.ltp > s.vwap).length;
    const pct_stocks_above_vwap = aboveVWAP / constituents.length;

    // 2. Percent trending up (5-min momentum > 0)
    const trendingUp = constituents.filter((s) => s.momentum_5min > 0).length;
    const pct_stocks_trending_up = trendingUp / constituents.length;

    // 3. Advance-decline ratio
    const advancing = constituents.filter((s) => s.change_pct > 0).length;
    const declining = constituents.filter((s) => s.change_pct < 0).length;
    const advance_decline_ratio = advancing / (declining || 1);

    // 4. Weighted return of top 10 (by index weight)
    const top10 = constituents
      .sort((a, b) => b.index_weight - a.index_weight)
      .slice(0, 10);
    const weighted_return_top_10 =
      top10.reduce((sum, s) => sum + s.change_pct * s.index_weight, 0) /
      top10.reduce((sum, s) => sum + s.index_weight, 0);

    // 5. Sector alignment (how cohesive are sectors?)
    const sector_alignment_score = await this.computeSectorAlignment();

    return {
      pct_stocks_above_vwap,
      pct_stocks_trending_up,
      advance_decline_ratio,
      weighted_return_top_10,
      sector_alignment_score,
    };
  }

  private async computeSectorAlignment(): Promise<number> {
    // Group constituents by sector
    const sectors = this.groupBySector();

    // For each sector, compute intra-sector correlation
    const alignments = Object.values(sectors).map((stocks) => {
      const returns = stocks.map((s) => s.returns_1min); // Last 1min returns
      return this.pearsonCorrelation(returns);
    });

    // Average sector alignment
    return alignments.reduce((a, b) => a + b, 0) / alignments.length;
  }
}
```

**Example Output**:

```json
{
  "pct_stocks_above_vwap": 0.72, // 36/50 stocks bullish
  "pct_stocks_trending_up": 0.68, // 34/50 trending up
  "advance_decline_ratio": 1.8, // 36 up, 14 down
  "weighted_return_top_10": 0.8, // Top 10 constituents +0.8%
  "sector_alignment_score": 0.65 // Moderate sector cohesion
}
```

**Usage in Signal Validation**:

```typescript
// Futures spike +50 points
if (futures.momentum_5min > 0.5) {
  const breadth = await this.breadthComputer.compute();

  if (breadth.pct_stocks_above_vwap < 0.4) {
    // LOW PARTICIPATION → False breakout
    this.logger.warn('Futures spike but breadth weak, ignoring signal');
    return 'NEUTRAL';
  }

  // HIGH PARTICIPATION → Real move
  return 'VOL_UP';
}
```

---

### 4. AlignmentScorer

**Purpose**: Measure correlation and divergence between constituents and index

```typescript
@Injectable()
export class AlignmentScorer {
  async compute(): Promise<AlignmentMetrics> {
    const constituents = this.featureCache.getConstituents();
    const leader = constituents.find((s) => s.symbol === 'RELIANCE'); // Highest weight
    const indexFuture = this.featureCache.get('NIFTY_FUT');

    // 1. Correlation to market leader
    const correlation_to_leader = this.computeCorrelation(
      constituents.map((s) => s.returns_5min),
      Array(constituents.length).fill(leader.returns_5min),
    );

    // 2. Divergence score (index vs constituents)
    const avgConstituentReturn =
      constituents.reduce((sum, s) => sum + s.change_pct, 0) /
      constituents.length;
    const indexReturn = indexFuture.change_pct;
    const divergence_score = Math.abs(indexReturn - avgConstituentReturn);

    // 3. Participation index (volume-weighted)
    const totalVolume = constituents.reduce((sum, s) => sum + s.volume, 0);
    const avgVolume = constituents.reduce((sum, s) => sum + s.avg_volume, 0);
    const participation_index = totalVolume / avgVolume;

    return {
      correlation_to_leader,
      divergence_score,
      participation_index,
    };
  }
}
```

---

### 5. LOBTensorBuilder

**Purpose**: Build normalized LOB tensors for LiT model

**CRITICAL**: Uses NIFTY FUTURE LOB, NOT spot (spot has no order book)

```typescript
@Injectable()
export class LOBTensorBuilder {
  async build(
    symbol: string,
    lookback: number = 60,
  ): Promise<Float32Array | null> {
    // Validate data quality FIRST
    const latestLOB = this.lobCache.getLatest(symbol);
    if (!(await this.validateLOB(latestLOB))) {
      this.logger.warn(`LOB validation failed for ${symbol}, returning null`);
      return null; // Circuit breaker: LiT will be disabled
    }

    // Shape: (60 timesteps, 80 features) = 4800 numbers
    const tensor = new Float32Array(lookback * 80);

    for (let t = 0; t < lookback; t++) {
      const timestamp = Date.now() - (lookback - t) * 1000; // 1-second intervals
      const lob = await this.lobCache.getSnapshot(symbol, timestamp);

      if (!lob) {
        this.logger.warn(`Missing LOB snapshot at t=${t}, using last known`);
        continue;
      }

      const offset = t * 80;
      const mid = (lob.best_bid + lob.best_ask) / 2;

      // Bid side (20 levels × 2 = 40 numbers)
      for (let i = 0; i < 20; i++) {
        tensor[offset + i] = (lob.bids[i].price - mid) / mid; // Normalized price
        tensor[offset + 20 + i] = lob.bids[i].size / 1000; // Normalized size
      }

      // Ask side (20 levels × 2 = 40 numbers)
      for (let i = 0; i < 20; i++) {
        tensor[offset + 40 + i] = (lob.asks[i].price - mid) / mid;
        tensor[offset + 60 + i] = lob.asks[i].size / 1000;
      }
    }

    return tensor;
  }

  /**
   * Data quality gates (CRITICAL for production)
   */
  private async validateLOB(lob: OrderBookSnapshot): Promise<boolean> {
    // Gate 1: Freshness (<2 seconds)
    const staleness = Date.now() - lob.timestamp;
    if (staleness > 2000) {
      this.metrics.increment('lob_validation_failed', { reason: 'stale' });
      return false;
    }

    // Gate 2: Spread sanity (<0.5%)
    const spread = (lob.best_ask - lob.best_bid) / lob.best_bid;
    if (spread > 0.005) {
      this.metrics.increment('lob_validation_failed', {
        reason: 'wide_spread',
      });
      return false;
    }

    // Gate 3: Depth completeness (at least 10 levels)
    if (lob.bids.length < 10 || lob.asks.length < 10) {
      this.metrics.increment('lob_validation_failed', {
        reason: 'incomplete_depth',
      });
      return false;
    }

    // Gate 4: No crossed book
    if (lob.best_bid >= lob.best_ask) {
      this.metrics.increment('lob_validation_failed', {
        reason: 'crossed_book',
      });
      return false;
    }

    return true;
  }
}
```

---

### 6. RegimeFeatureBuilder

**Purpose**: Stack temporal features for TFT model

```typescript
@Injectable()
export class RegimeFeatureBuilder {
  async build(lookback: number = 120): Promise<Float32Array> {
    // Shape: (120 timesteps, 15 features) = 1800 numbers
    const features = new Float32Array(lookback * 15);

    for (let t = 0; t < lookback; t++) {
      const timestamp = Date.now() - (lookback - t) * 60_000; // 1-min bars
      const snapshot = await this.featureCache.getSnapshot(timestamp);

      const offset = t * 15;
      features[offset + 0] = snapshot.index_return;
      features[offset + 1] = snapshot.index_realized_vol;
      features[offset + 2] = snapshot.breadth_score;
      features[offset + 3] = snapshot.futures_momentum;
      features[offset + 4] = snapshot.atm_iv;
      features[offset + 5] = snapshot.iv_change;
      features[offset + 6] = snapshot.pcr_oi;
      features[offset + 7] = snapshot.volume_surge;
      features[offset + 8] = snapshot.range_position;
      features[offset + 9] = snapshot.atr;
      features[offset + 10] = snapshot.rsi;
      features[offset + 11] = snapshot.bollinger_position;
      features[offset + 12] = snapshot.spread;
      features[offset + 13] = snapshot.time_of_day;
      features[offset + 14] = snapshot.days_to_expiry;
    }

    return features;
  }
}
```

---

### 7. ExecutionStateBuilder

**Purpose**: Build execution-specific state for DRL PPO agent

```typescript
@Injectable()
export class ExecutionStateBuilder {
  async build(): Promise<ExecutionState> {
    // Get option LOB for currently traded strike
    const activeStrike = this.positionManager.getActiveStrike();
    if (!activeStrike) return null;

    const optionLOB = await this.lobCache.getLatest(activeStrike.symbol);
    const futuresData = this.featureCache.get('NIFTY_FUT');
    const orderState = this.orderManager.getCurrentOrderState();

    return {
      // Option LOB
      option_bid: optionLOB.best_bid,
      option_ask: optionLOB.best_ask,
      option_spread: optionLOB.best_ask - optionLOB.best_bid,
      option_bid_size: optionLOB.best_bid_size,
      option_ask_size: optionLOB.best_ask_size,
      option_ltp: optionLOB.ltp,
      option_ltp_time: Date.now() - optionLOB.last_traded_time,

      // Underlying context
      futures_mid: (futuresData.bid + futuresData.ask) / 2,
      futures_volatility: futuresData.atr_normalized,
      futures_momentum: futuresData.momentum_5min,

      // Order state
      remaining_quantity: orderState.remaining_qty,
      time_remaining_seconds: orderState.time_limit_seconds,
      slippage_so_far: orderState.slippage_bps,
      fills_so_far: orderState.fills_count,

      // Microstructure
      spread_percentile: this.computeSpreadPercentile(optionLOB.spread),
      liquidity_score: this.computeLiquidityScore(optionLOB),
      adverse_selection_risk: this.computeAdverseSelectionRisk(orderState),
    };
  }
}
```

---

## Data Flow (Complete Lifecycle)

### 1. Raw Data Ingestion (Layer 1 → Layer 2)

```typescript
// Perception layer publishes event
this.eventBus.publish(
  new MarketDataReceivedEvent({
    timestamp: Date.now(),
    futures: {
      symbol: 'NIFTY_FUT',
      ltp: 24450,
      bid: 24449,
      ask: 24451,
      volume: 12500,
      lob: [...], // depth-20
    },
    constituents: [
      { symbol: 'RELIANCE', ltp: 2450.30, volume: 1000, ... },
      // ... 49 more
    ],
    options: {
      strikes: [...],
      greeks: [...],
    },
  }),
);
```

---

### 2. Cortex Processing (Layer 2)

```typescript
// MarketStateEncoder receives event
@OnEvent('MarketDataReceivedEvent')
async handleMarketData(event: MarketDataReceivedEvent) {
  // Update caches
  await this.featureCache.update(event.data);

  // Build encoded states (parallel)
  const start = performance.now();
  const states = await Promise.all([
    this.buildLightGBMFeatures(),  // ~5ms
    this.buildTFTFeatures(),       // ~8ms
    this.buildLiTTensor(),         // ~3ms
  ]);
  const duration = performance.now() - start;

  // Record latency
  this.metrics.recordDuration('cortex.encoding_duration_ms', duration);

  // Emit downstream events
  this.eventBus.publish(new LightGBMStateReadyEvent({...}));
  this.eventBus.publish(new TFTStateReadyEvent({...}));
  this.eventBus.publish(new LiTStateReadyEvent({...}));

  // Persist to QuestDB (async, non-blocking)
  this.persistEncodedStates(states).catch(err => {
    this.logger.error('Failed to persist encoded states', err);
  });
}
```

---

### 3. Model Consumption (Layer 4)

```typescript
// Prediction layer receives encoded states
@OnEvent('LightGBMStateReadyEvent')
async handleLightGBMState(event: LightGBMStateReadyEvent) {
  const prediction = await this.lightgbmService.predict(event.features);
  // → { probs: [0.1, 0.7, 0.2], direction: 'VOL_UP', confidence: 0.7 }

  this.eventBus.publish(new LightGBMPredictionEvent(prediction));
}

@OnEvent('TFTStateReadyEvent')
async handleTFTState(event: TFTStateReadyEvent) {
  const prediction = await this.tftService.predict(event.features);
  // → { regime: 'TREND', confidence: 0.8, vol_forecast: 22.5 }

  this.eventBus.publish(new TFTPredictionEvent(prediction));
}

@OnEvent('LiTStateReadyEvent')
async handleLiTState(event: LiTStateReadyEvent) {
  if (!event.tensor) {
    // LOB validation failed, LiT disabled
    this.logger.warn('LiT tensor null, skipping inference');
    return;
  }

  const prediction = await this.litService.predict(event.tensor);
  // → { micro_direction: 'BUY_PRESSURE', confidence: 0.65 }

  this.eventBus.publish(new LiTPredictionEvent(prediction));
}
```

---

## Performance Optimization

### 1. Object Pooling

```typescript
// Reuse Float32Arrays to eliminate GC pauses
class FeaturePool {
  private readonly pool: Float32Array[] = [];

  acquire(size: number): Float32Array {
    return this.pool.pop() || new Float32Array(size);
  }

  release(array: Float32Array): void {
    array.fill(0); // Clear data
    this.pool.push(array);
  }
}

// Usage
const features = this.pool.acquire(33);
// ... populate features
this.eventBus.publish(new LightGBMStateReadyEvent({ features }));
// After model inference, release back to pool
this.pool.release(features);
```

---

### 2. SharedArrayBuffer (Zero-Copy)

```typescript
// For LOB tensors (large data), use SharedArrayBuffer
class LOBTensorCache {
  private readonly sharedBuffer: SharedArrayBuffer;
  private readonly tensorView: Float32Array;

  constructor() {
    // 60 timesteps × 80 features × 4 bytes = 19.2KB
    this.sharedBuffer = new SharedArrayBuffer(60 * 80 * 4);
    this.tensorView = new Float32Array(this.sharedBuffer);
  }

  updateTensor(newData: Float32Array): void {
    this.tensorView.set(newData); // Zero-copy write
  }

  getTensor(): Float32Array {
    return this.tensorView; // Zero-copy read
  }
}
```

---

### 3. Sliding Window Cache

```typescript
// Maintain rolling windows for temporal features
class SlidingWindowCache {
  private readonly windows = new Map<string, CircularBuffer>();

  update(symbol: string, value: number): void {
    if (!this.windows.has(symbol)) {
      this.windows.set(symbol, new CircularBuffer(120)); // 120-period buffer
    }
    this.windows.get(symbol).push(value);
  }

  getWindow(symbol: string, length: number): Float32Array {
    return this.windows.get(symbol)?.getLast(length) || new Float32Array(0);
  }
}
```

---

## Monitoring & Observability

### Key Metrics

```typescript
// Latency tracking
this.metrics.recordDuration('cortex.encoding_duration_ms', duration);
this.metrics.recordDuration('cortex.lightgbm_features_ms', lightgbmTime);
this.metrics.recordDuration('cortex.tft_features_ms', tftTime);
this.metrics.recordDuration('cortex.lit_tensor_ms', litTime);

// Data quality
this.metrics.increment('cortex.lob_validation_failed', { reason: 'stale' });
this.metrics.increment('cortex.breadth_computation_success');
this.metrics.gauge('cortex.constituent_data_completeness', 0.98); // 49/50

// Circuit breakers
this.metrics.increment('cortex.lit_disabled', { reason: 'stale_lob' });
this.metrics.increment('cortex.breadth_degraded', {
  reason: 'missing_constituents',
});
```

---

### Alerts

```yaml
# Grafana alerts
- alert: CortexEncodingLatencyHigh
  expr: cortex_encoding_duration_ms_p95 > 20
  for: 5m
  annotations:
    summary: Cortex encoding latency exceeding 20ms (p95)

- alert: LOBDataStale
  expr: rate(cortex_lob_validation_failed_total{reason="stale"}[1m]) > 0.1
  annotations:
    summary: LOB data staleness >10% (LiT will be disabled)

- alert: ConstituentDataIncomplete
  expr: cortex_constituent_data_completeness < 0.9
  annotations:
    summary: <90% constituent data available (breadth degraded)
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('BreadthComputer', () => {
  it('should compute breadth correctly', async () => {
    // Mock 50 constituents
    const constituents = Array(50)
      .fill(null)
      .map((_, i) => ({
        symbol: `STOCK${i}`,
        ltp: 100 + i,
        vwap: 100,
        momentum_5min: i % 2 === 0 ? 0.5 : -0.5,
        change_pct: i % 3 === 0 ? 1.0 : -1.0,
      }));

    featureCacheMock.getConstituents.mockReturnValue(constituents);

    const breadth = await breadthComputer.compute();

    expect(breadth.pct_stocks_above_vwap).toBeCloseTo(0.5); // 25/50
    expect(breadth.advance_decline_ratio).toBeCloseTo(0.5); // 17/33
  });
});
```

---

### Integration Tests

```typescript
describe('MarketStateEncoder E2E', () => {
  it('should encode multi-instrument data correctly', async () => {
    // Publish market data event
    eventBus.publish(
      new MarketDataReceivedEvent({
        futures: mockFuturesData,
        constituents: mock50Constituents,
        options: mockOptionChain,
      }),
    );

    // Wait for encoded state events
    const lightgbmEvent = await waitForEvent('LightGBMStateReadyEvent');
    const tftEvent = await waitForEvent('TFTStateReadyEvent');
    const litEvent = await waitForEvent('LiTStateReadyEvent');

    // Validate shapes
    expect(lightgbmEvent.features.length).toBe(33);
    expect(tftEvent.features.length).toBe(120 * 15);
    expect(litEvent.tensor.length).toBe(60 * 80);

    // Validate ranges
    expect(lightgbmEvent.features[0]).toBeGreaterThanOrEqual(0); // pct_stocks_above_vwap
    expect(lightgbmEvent.features[0]).toBeLessThanOrEqual(1);
  });
});
```

---

## Implementation Checklist

### Phase 1: Core Components (Week 1)

- [ ] Implement `MarketStateEncoder` orchestrator
- [ ] Implement `IndexAggregator`
- [ ] Implement `BreadthComputer`
- [ ] Implement `AlignmentScorer`
- [ ] Add unit tests for each component

### Phase 2: LOB & Temporal (Week 2)

- [ ] Implement `LOBTensorBuilder` with data quality gates
- [ ] Implement `RegimeFeatureBuilder`
- [ ] Implement `ExecutionStateBuilder`
- [ ] Add integration tests

### Phase 3: Storage (Week 2-3)

- [ ] Create QuestDB schema (lightgbm_states, tft_states, lit_tensors)
- [ ] Implement batch persistence logic
- [ ] Add compression for LOB tensors
- [ ] Test query performance

### Phase 4: Optimization (Week 3-4)

- [ ] Implement object pooling for Float32Arrays
- [ ] Implement SharedArrayBuffer for LOB tensors
- [ ] Add sliding window caches
- [ ] Profile and optimize hot paths

### Phase 5: Monitoring (Week 4)

- [ ] Add Prometheus metrics
- [ ] Create Grafana dashboards
- [ ] Configure alerts
- [ ] Test circuit breakers

---

## Summary

The Cortex layer is the **critical data-model interface** that:

1. **Aggregates** 50+ instruments into coherent market state
2. **Compresses** 50,000 signals → 200-500 numbers (250:1 ratio)
3. **Validates** data quality (staleness, spread, completeness)
4. **Isolates** failures (bad LOB → disable LiT, continue with core models)
5. **Persists** encoded states for reproducible training

**Key Principle**: Models never see chaos, they see compressed intelligence.

---

**Last Updated**: January 13, 2026  
**Status**: Implementation Ready  
**Next Steps**: Begin Phase 1 (Core Components)
