# Layer 3: Market Structure & Regime Detector

**Purpose**: Continuously classify market regime and identify trading zones

---

## Overview

The Regime Detector analyzes feature streams to classify the current market state (trending, ranging, volatile) and identifies key price zones for strategy selection.

---

## Components

### RegimeDetectorService

- Core regime classification logic
- Probabilistic state estimation
- Regime transition detection

### RegimeClassifiers

- **HMM (Hidden Markov Model)**: Infer latent states from price dynamics
- **Kalman Filter**: Bayesian state-space estimation
- **Technical Heuristics**: Rule-based regime identification
- **Unsupervised Clustering**: Adaptive regime discovery

### SwingZoneDetector

- Support/resistance level identification
- Pivot point calculation
- Breakout zone detection

---

## Regime Types

### 1. Trending Regime

**Characteristics**:

- Directional movement (uptrend/downtrend)
- ADX > 25
- Price consistently above/below moving averages

**Suitable Strategies**:

- Directional options (buy calls in uptrend, buy puts in downtrend)
- Momentum following

### 2. Ranging Regime

**Characteristics**:

- Oscillating between support/resistance
- ADX < 20
- Low realized volatility

**Suitable Strategies**:

- Iron Condor (profit from range-bound movement)
- Short Straddle (profit from theta decay)

### 3. Volatile Regime

**Characteristics**:

- High volatility breakout
- VIX spike (>20)
- Wide Bollinger Bands

**Suitable Strategies**:

- Long Straddle (profit from large moves)
- Volatility arbitrage

### 4. Low Volatility Regime

**Characteristics**:

- Compression phase
- Tight Bollinger Bands
- VIX < 12

**Suitable Strategies**:

- Volatility selling (short premium)
- Anticipate breakout

---

## Implementation Approaches

### 1. Hidden Markov Model (HMM)

```typescript
interface HMMRegimeDetector {
  states: ['trending', 'ranging', 'volatile'];
  observations: ['up', 'down', 'neutral'];
  transitionProb: Matrix; // P(state_t | state_t-1)
  emissionProb: Matrix; // P(obs | state)

  viterbi(observations: Observation[]): RegimeSequence;
  forward(observations: Observation[]): StateProbabilities;
}
```

**Advantages**:

- Probabilistic regime classification
- Handles regime transitions smoothly
- Can be trained on historical data

**Implementation**:

```typescript
const hmm = new HMMRegimeDetector({
  states: 3,
  observations: 3,
  transitionMatrix: trainedTransitions,
  emissionMatrix: trainedEmissions,
});

const currentRegime = hmm.predict(recentPriceChanges);
```

### 2. Kalman Filter

```typescript
interface KalmanRegimeFilter {
  stateEstimate: Vector; // [trend, volatility]
  errorCovariance: Matrix;

  predict(): void;
  update(measurement: number): void;
  getRegime(): RegimeType;
}
```

**Advantages**:

- Continuous state estimation
- Adapts to parameter changes
- Low computational cost

### 3. Technical Heuristics

```typescript
function detectRegimeTechnical(features: Features): RegimeType {
  const { adx, rsi, bbWidth, vix } = features;

  // Trending
  if (adx > 25 && (rsi > 60 || rsi < 40)) {
    return rsi > 60 ? 'uptrend' : 'downtrend';
  }

  // Volatile
  if (vix > 20 || bbWidth > percentile(bbWidth, 0.9)) {
    return 'volatile';
  }

  // Ranging
  if (adx < 20 && rsi > 40 && rsi < 60) {
    return 'ranging';
  }

  return 'neutral';
}
```

### 4. Unsupervised Clustering

```typescript
// K-means on feature space
const clusters = kmeans(featureVectors, {
  k: 4, // 4 regime types
  distanceMetric: 'euclidean',
});

const regimeLabels = clusters.labels;
```

---

## Swing Zone Detection

```typescript
interface SwingZone {
  type: 'support' | 'resistance';
  price: number;
  strength: number; // 0-1 (touch count)
  lastTouch: number; // timestamp
}

class SwingZoneDetector {
  detectPivots(candles: OHLCV[]): SwingZone[] {
    const pivots: SwingZone[] = [];

    for (let i = 2; i < candles.length - 2; i++) {
      // Pivot high (resistance)
      if (
        candles[i].high > candles[i - 1].high &&
        candles[i].high > candles[i - 2].high &&
        candles[i].high > candles[i + 1].high &&
        candles[i].high > candles[i + 2].high
      ) {
        pivots.push({
          type: 'resistance',
          price: candles[i].high,
          strength: this.calculateStrength(candles, i),
          lastTouch: candles[i].timestamp,
        });
      }

      // Pivot low (support)
      if (
        candles[i].low < candles[i - 1].low &&
        candles[i].low < candles[i - 2].low &&
        candles[i].low < candles[i + 1].low &&
        candles[i].low < candles[i + 2].low
      ) {
        pivots.push({
          type: 'support',
          price: candles[i].low,
          strength: this.calculateStrength(candles, i),
          lastTouch: candles[i].timestamp,
        });
      }
    }

    return this.clusterZones(pivots);
  }
}
```

---

## Event Output

```typescript
interface RegimeDetectedEvent {
  timestamp: number;
  regime: 'trending' | 'ranging' | 'volatile' | 'low_volatility';
  direction?: 'up' | 'down'; // For trending regime
  confidence: number; // 0-1
  swingZones: SwingZone[];
  metadata: {
    adx: number;
    vix: number;
    bbWidth: number;
  };
}
```

---

## Adaptive Learning

- Retrain HMM weekly on recent data (rolling 3-month window)
- Update Kalman filter parameters using online learning
- Adjust technical thresholds based on market conditions

---

## Configuration

```typescript
export const regimeDetectorConfig = {
  hmm: {
    numStates: 4,
    trainWindow: 90 * 375, // 90 days of 1s candles
    retrainInterval: 7 * 24 * 3600 * 1000, // Weekly
  },
  technical: {
    adxThreshold: 25,
    vixVolatileThreshold: 20,
    vixLowVolThreshold: 12,
  },
  swingZones: {
    minStrength: 0.5,
    maxZones: 5,
    clusterDistance: 0.5, // % price distance
  },
};
```

---

## Monitoring Metrics

- `regime_detector.regime_changes_total`
- `regime_detector.confidence_score` (histogram)
- `regime_detector.time_in_regime_seconds`
- `regime_detector.swing_zones_detected_total`

---

## Testing

```typescript
describe('RegimeDetector', () => {
  it('should detect trending regime when ADX > 25', () => {
    const features = { adx: 30, rsi: 65, vix: 15 };
    const regime = detector.detect(features);
    expect(regime.regime).toBe('trending');
    expect(regime.direction).toBe('up');
  });

  it('should transition smoothly between regimes', () => {
    const regimes = featuresStream.map((f) => detector.detect(f));
    const transitions = countTransitions(regimes);
    expect(transitions).toBeLessThan(10); // No rapid flip-flopping
  });
});
```

---

**See Also**:

- [02-FEATURE-ENGINE.md](./02-FEATURE-ENGINE.md) - Previous layer
- [04-PREDICTION-ENGINE.md](./04-PREDICTION-ENGINE.md) - Next layer
- [ALGO_TRADING_ARCHITECTURE.md](../../../../docs/ALGO_TRADING_ARCHITECTURE.md#regime-detection--strategy-selection)
