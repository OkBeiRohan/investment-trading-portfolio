# Layer 2: Feature & Technical Engine

**Purpose**: Transform raw market data into ML-ready feature vectors

---

## Overview

The Feature Engine consumes market data events from Layer 1 and computes technical indicators, microstructure features, and option-specific metrics required by prediction models.

---

## Components

### FeatureComputationService

- Sliding window feature computation
- Efficient state management (avoid recomputation)
- Vectorized operations using TypedArrays

### TechnicalIndicatorService

- RSI, MACD, Bollinger Bands
- Moving averages (SMA, EMA, WMA)
- ATR, ADX, Stochastic
- Support/resistance levels

### MicrostructureService

- Order book imbalance (OBI)
- Bid-ask spread
- Volume-weighted metrics (VWAP, TWAP)
- Trade intensity patterns

### OptionFeatureService

- Implied volatility surface
- Greeks (Delta, Gamma, Vega, Theta)
- Put-Call Ratio (PCR)
- Skew and term structure

---

## Feature Categories

### 1. Statistical Features

```typescript
interface StatisticalFeatures {
  sma_20: number;
  ema_50: number;
  rsi_14: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  atr_14: number;
}
```

### 2. Microstructure Features

```typescript
interface MicrostructureFeatures {
  bidAskSpread: number;
  orderBookImbalance: number; // (bid_volume - ask_volume) / total
  tradeIntensity: number; // trades per minute
  vwap: number;
  volumeRatio: number; // current vs average
}
```

### 3. Option-Specific Features

```typescript
interface OptionFeatures {
  atmIV: number;
  ivSkew: number; // OTM put IV - OTM call IV
  pcrVolume: number; // put volume / call volume
  pcrOI: number; // put OI / call OI
  atmDelta: number;
  atmGamma: number;
  atmVega: number;
  atmTheta: number;
}
```

### 4. Cross-Asset Signals

```typescript
interface CrossAssetFeatures {
  niftyBankNiftyCorr: number;
  spotFuturesBasis: number;
  vixLevel: number;
  sectorRotation: number;
}
```

---

## Advanced Pattern Extraction

### CNN-Based Features

- Process order book as 2D image (20 levels × [price, volume])
- Extract shape-invariant patterns
- Detect support/resistance zones

### Transformer Encodings

- Attend to relevant historical context
- Capture long-range dependencies
- Produce contextual embeddings

---

## Performance Optimization

**Hot Path (<10ms target)**:

```typescript
// ✅ GOOD: Pre-allocated buffers
const featureBuffer = new Float32Array(50); // Reuse
featureBuffer[0] = tick.close;
featureBuffer[1] = this.computeRSI(tick); // Incremental update

// ❌ BAD: Object creation in loop
features.push({ rsi: this.computeRSI(tick) }); // Allocates memory
```

**Incremental Updates**:

- RSI: Update with new price, drop old price
- MACD: Exponential moving average needs only last EMA value
- Bollinger Bands: Rolling window standard deviation

---

## Event Flow

```
MarketDataEvent (Layer 1)
    ↓
FeatureComputationService
    ↓
TechnicalIndicatorService → Statistical features
MicrostructureService → Order flow features
OptionFeatureService → Greeks & IV
    ↓
FeaturesComputedEvent → Redis Stream
    ↓
Layer 3 (Regime Detector)
```

---

## Configuration

```typescript
// config/feature-engine.config.ts
export const featureEngineConfig = {
  indicators: {
    rsi: { period: 14 },
    macd: { fast: 12, slow: 26, signal: 9 },
    bollinger: { period: 20, stdDev: 2 },
    atr: { period: 14 },
  },
  windows: {
    shortTerm: 60, // 1 minute
    mediumTerm: 300, // 5 minutes
    longTerm: 900, // 15 minutes
  },
  redis: {
    stream: 'stream:features',
  },
};
```

---

## Monitoring Metrics

- `feature_engine.computation_duration_ms`
- `feature_engine.features_computed_total`
- `feature_engine.cache_hits_total`
- `feature_engine.nan_values_total` (data quality)

---

## Testing

```typescript
describe('FeatureEngine', () => {
  it('should compute features in <10ms', async () => {
    const ticks = generateMockTicks(100);
    const start = performance.now();
    const features = await featureEngine.compute(ticks);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });

  it('should produce valid feature vectors', () => {
    const features = featureEngine.compute(mockTicks);
    expect(features.every(isFinite)).toBe(true); // No NaN/Infinity
  });
});
```

---

**See Also**:

- [01-DATA-INGESTION.md](./01-DATA-INGESTION.md) - Previous layer
- [03-REGIME-DETECTOR.md](./03-REGIME-DETECTOR.md) - Next layer
