# Layer 2: Cortex (Feature Engine + Market State Encoder)

> **Rust-powered 54-feature computation layer with market state encoding.**

**Last Updated**: January 18, 2026

---

## Overview

The Cortex layer receives raw market data and transforms it into 54 ML-ready features. This layer uses the `compute-engine` (Rust NAPI module) for high-performance parallel computation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORTEX LAYER                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         RAW MARKET DATA                                  │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │ │
│  │  │ NIFTY     │  │ 50        │  │ Option    │  │ Market    │            │ │
│  │  │ Future    │  │ Stocks    │  │ Chain     │  │ Depth     │            │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    COMPUTE-ENGINE (Rust, <5ms)                           │ │
│  │                                                                          │ │
│  │   Phase 1: Dependencies (VWAP, EMA, ATR, Greeks) = ~2ms                 │ │
│  │   Phase 2: 54 Features (Parallel via Rayon) = ~1ms                      │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         OUTPUT: 54 FEATURES                              │ │
│  │                                                                          │ │
│  │   Index Breadth (8) | NIFTY Future (12) | Options (14)                  │ │
│  │   Volatility (6)    | Order Flow (8)     | Time Context (6)             │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 54 Features Computed

### Index Breadth (8)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `pctStocksAboveVwap` | count(ltp > vwap) / 50 | Bullish breadth |
| `pctStocksAboveEma20` | count(ltp > ema20) / 50 | Trend breadth |
| `weightedReturnTop10` | Σ(return × weight) top 10 | Large-cap momentum |
| `advanceDeclineRatio` | advances / declines | Direction |
| `breadthMomentum5m` | mean(intraday_returns) | Short-term breadth |
| `breadthVolatility` | std(intraday_returns) | Dispersion |
| `breadthThrust` | advances / (adv + dec) | Thrust indicator |
| `newHighsLowsRatio` | (highs - lows) / 50 | Extremes |

### NIFTY Future (12)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `futPriceVsVwap` | (ltp - vwap) / vwap | Short-term bias |
| `futRangePosition` | (ltp - low) / (high - low) | Intraday position |
| `futReturn1m` | (price - price_1m) / price_1m | 1-min momentum |
| `futReturn5m` | (price - price_5m) / price_5m | 5-min momentum |
| `futReturn15m` | (price - price_15m) / price_15m | 15-min momentum |
| `futAtrPercent` | ATR(14) / ltp | Volatility |
| `futVolumeZscore` | (vol - mean) / std | Volume anomaly |
| `futOiChange` | oi_now - oi_prev | OI delta |
| `futOiChangePct` | oi_change / oi_prev | OI % change |
| `futRsi14` | RSI(14) | Momentum oscillator |
| `futMacd` | EMA(12) - EMA(26) | Trend |
| `futMacdSignal` | EMA(9) of MACD | Signal line |

### Options (14)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `atmIv` | avg(call_iv, put_iv) at ATM | Market fear |
| `atmIvChange` | atm_iv - atm_iv_5min_ago | IV momentum |
| `ivSkew` | put_iv - call_iv | Put premium |
| `ivTermStructure` | near_iv - next_iv | Event pricing |
| `gammaAtm` | avg(gamma) at ATM | Gamma exposure |
| `vegaAtm` | avg(vega) at ATM | Vega exposure |
| `thetaAtm` | avg(theta) at ATM | Time decay |
| `pcrOi` | put_oi / call_oi | OI sentiment |
| `pcrVolume` | put_vol / call_vol | Volume sentiment |
| `maxPainDistance` | abs(spot - max_pain) | Magnetic target |
| `totalGammaExposure` | Σ(gamma × oi × S²) | GEX |
| `charmAtm` | d(delta)/d(time) | 2nd order Greek |
| `vannaAtm` | d(delta)/d(iv) | 2nd order Greek |
| `ivPercentile30d` | IV rank | IV context |

### Volatility (6)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `indiaVix` | India VIX | Fear index |
| `realizedVol5m` | annualized std (5 periods) | Short-term RV |
| `realizedVol15m` | annualized std (15 periods) | Medium-term RV |
| `volExpansionRatio` | rv_5m / rv_15m | Vol regime |
| `ivRvRatio` | atm_iv / realized_vol | VRP signal |
| `vixPercentile30d` | VIX rank | VIX context |

### Order Flow (8)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `bidAskSpreadBps` | (ask - bid) / mid × 10000 | Liquidity |
| `depthImbalance5` | (bid_qty - ask_qty) / total | Supply/demand |
| `ofi1s` | Order Flow Imbalance (1s) | Short-term flow |
| `ofi5s` | OFI (5s) | Medium flow |
| `ofi30s` | OFI (30s) | Trend flow |
| `tradeImbalance` | (buy_vol - sell_vol) / total | Aggressor |
| `bidSlope` | Price impact slope (bid) | Resilience |
| `askSlope` | Price impact slope (ask) | Resilience |

### Time Context (6)

| Feature | Formula | Purpose |
|---------|---------|---------|
| `minutesFromOpen` | Minutes since 9:15 IST | Session progress |
| `minutesToClose` | Minutes until 3:30 IST | Session remaining |
| `dayOfWeek` | 1=Mon to 5=Fri | Weekly pattern |
| `isExpiryDay` | Boolean flag | Event day |
| `daysToExpiry` | Trading days to expiry | Theta context |
| `sessionPhase` | 1=open, 2=mid, 3=close | Intraday phase |

---

## Integration with compute-engine

```typescript
// services/feature-computation.service.ts
import { Injectable } from '@nestjs/common';
import { computeFeatures, type FeatureInput, type ComputeResult } from '@repo/compute-engine';
import { RedisService } from './redis.service';

@Injectable()
export class FeatureComputationService {
  constructor(private redis: RedisService) {}

  async computeAndPublish(marketData: MarketDataEvent): Promise<ComputeResult> {
    // Transform market data to compute-engine input
    const input: FeatureInput = this.transformToFeatureInput(marketData);
    
    // Compute 54 features (Rust, <5ms)
    const result = computeFeatures(input);
    
    // Publish to Redis for inference
    await this.redis.publish('features:live', {
      timestamp: result.features.timestamp,
      features: result.features,
      latencyMicros: result.totalDurationMicros,
    });
    
    // Also store to QuestDB for training
    if (this.shouldStore(result)) {
      await this.storeToQuestDB(result.features);
    }
    
    return result;
  }

  private transformToFeatureInput(data: MarketDataEvent): FeatureInput {
    return {
      timestamp: data.timestamp,
      niftyFuture: {
        ltp: data.future.ltp,
        open: data.future.open,
        high: data.future.high,
        low: data.future.low,
        close: data.future.close,
        volume: data.future.volume,
        openInterest: data.future.oi,
      },
      constituents: data.stocks.map(s => ({
        symbol: s.symbol,
        ltp: s.ltp,
        open: s.open,
        volume: s.volume,
      })),
      options: data.options.map(o => ({
        strike: o.strike,
        optionType: o.type,
        ltp: o.ltp,
        iv: o.iv,
        delta: o.delta,
        gamma: o.gamma,
        vega: o.vega,
        theta: o.theta,
        openInterest: o.oi,
        volume: o.volume,
      })),
      indiaVix: data.vix,
      marketDepth: data.depth,
    };
  }

  private shouldStore(result: ComputeResult): boolean {
    // Data quality checks for training storage
    return (
      result.features.pctStocksAboveVwap > 0 &&
      result.features.atmIv > 0.05 &&
      result.features.minutesFromOpen > 0 &&
      result.features.minutesToClose > 0
    );
  }
}
```

---

## Data Quality Validation

Before passing to models, features are validated:

```typescript
interface DataQualityCheck {
  isValid: boolean;
  invalidReason?: string;
}

function validateFeatures(features: FeatureOutput): DataQualityCheck {
  // Check for NaN/Infinity
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'number' && (!isFinite(value) || isNaN(value))) {
      return { isValid: false, invalidReason: `INVALID_${key.toUpperCase()}` };
    }
  }
  
  // Check market hours
  if (features.minutesFromOpen <= 0 && features.minutesToClose <= 0) {
    return { isValid: false, invalidReason: 'MARKET_CLOSED' };
  }
  
  // Check breadth completeness
  if (features.pctStocksAboveVwap === 0 && features.pctStocksAboveEma20 === 0) {
    return { isValid: false, invalidReason: 'INCOMPLETE_BREADTH' };
  }
  
  // Check options data
  if (features.atmIv <= 0.05) {
    return { isValid: false, invalidReason: 'INCOMPLETE_OPTIONS' };
  }
  
  return { isValid: true };
}
```

---

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| compute-engine call | <5ms | 2-4ms |
| Redis publish | <1ms | 0.5ms |
| QuestDB store | <5ms | 2-3ms |
| **Total Cortex** | **<10ms** | **4-7ms** |

---

## Related Documentation

- [FEATURE_SPECIFICATION.md](../../../docs/ml/FEATURE_SPECIFICATION.md) - Feature formulas
- [compute-engine README](../../../packages/compute-engine/README.md) - Rust implementation
- [INFERENCE_ENGINE.md](./INFERENCE_ENGINE.md) - Feature consumption
- [QUESTDB_TRAINING_DATA.md](../../../docs/ml/QUESTDB_TRAINING_DATA.md) - Storage schema
