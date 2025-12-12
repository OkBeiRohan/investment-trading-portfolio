---
applyTo: "apps/data-processor/**"
---

# GitHub Copilot Instructions - Data Processor

## Role & Context

You are working on the **Data Processor** - a NestJS microservice responsible for consuming real-time market data, computing technical indicators and features, and storing them for ML model training and inference.

## Application Overview

**Purpose**: Feature engineering and technical indicator calculation
**Port**: 3003
**Stack**: NestJS, Redis (consumer), QuestDB + MongoDB (storage)

**Data Flow**:

```
Redis Pub/Sub (from market-feeder)
  ↓
Data Processor (this app)
  ↓
Compute Features (RSI, MACD, Volatility, Greeks, etc.)
  ↓
├─> QuestDB (time-series features for ML training)
└─> Redis Pub/Sub (real-time features for algo-worker)
```

## Architecture Rules

### 1. Database Package Usage

```typescript
// ✅ CORRECT
import { QuestDBService, RedisService } from "@repo/database";

@Injectable()
export class FeatureService {
  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService
  ) {}
}
```

### 2. Schema Package for Types

```typescript
import { type FeatureSnapshot, type FeatureData } from "@repo/schema";
```

## Core Responsibilities

### 1. Redis Subscription

```typescript
@Injectable()
export class MarketDataConsumer implements OnModuleInit {
  constructor(
    private readonly redis: RedisService,
    private readonly featureService: FeatureService,
    private readonly logger: Logger
  ) {}

  async onModuleInit() {
    // Subscribe to market data channel
    await this.redis.subscribeToMarketData(async (message) => {
      try {
        const { type, data } = JSON.parse(message);

        switch (type) {
          case "tick":
            await this.featureService.processTick(data);
            break;
          case "candle":
            await this.featureService.processCandle(data);
            break;
          case "greeks":
            await this.featureService.processGreeks(data);
            break;
        }
      } catch (error) {
        this.logger.error("Error processing market data", error);
      }
    });

    this.logger.log("Subscribed to market data stream");
  }
}
```

### 2. Feature Engineering Service

```typescript
@Injectable()
export class FeatureEngineeringService {
  private priceHistory: Map<string, number[]> = new Map();
  private readonly HISTORY_SIZE = 100;

  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService
  ) {}

  async processTick(tick: TickData) {
    // Update price history
    this.updatePriceHistory(tick.symbol, tick.ltp);

    // Compute features
    const features = await this.computeFeatures(tick.symbol);

    // Store in QuestDB
    await this.storeFeatures(features);

    // Publish to Redis for algo-worker
    await this.redis.publishFeatures(features);
  }

  private updatePriceHistory(symbol: string, price: number) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol)!;
    history.push(price);

    // Keep only last N prices
    if (history.length > this.HISTORY_SIZE) {
      history.shift();
    }
  }

  private async computeFeatures(symbol: string): Promise<FeatureSnapshot> {
    const prices = this.priceHistory.get(symbol) || [];

    if (prices.length < 20) {
      return null; // Not enough data yet
    }

    return {
      timestamp: new Date(),
      instrument: symbol,
      features: {
        // Underlying features
        realizedVol5d: this.calculateRealizedVolatility(prices, 5),
        realizedVol10d: this.calculateRealizedVolatility(prices, 10),
        realizedVol20d: this.calculateRealizedVolatility(prices, 20),
        rsi14: this.calculateRSI(prices, 14),
        macd: this.calculateMACD(prices),
        sma20: this.calculateSMA(prices, 20),
        sma50: this.calculateSMA(prices, 50),

        // Sentiment features (fetched from QuestDB)
        indiaVix: await this.getIndiaVIX(),
        indiaVixMA5: await this.getIndiaVIXMA(5),
        pcrVolume: await this.getPCRVolume(),
        pcrOI: await this.getPCROI(),
        maxPain: await this.getMaxPain(),

        // Option features (from Greeks)
        atmIV: await this.getATMIV(symbol),
        volSkew: await this.getVolatilitySkew(symbol),
        termStructure: await this.getTermStructure(symbol),
      },
      metadata: {
        dataQuality: this.assessDataQuality(prices),
        missingFields: this.findMissingFields(),
        version: "1.0.0",
      },
    };
  }
}
```

### 3. Technical Indicators

```typescript
@Injectable()
export class TechnicalIndicatorService {
  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50; // Default neutral

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   */
  calculateMACD(prices: number[]): {
    value: number;
    signal: number;
    histogram: number;
  } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdHistory = prices.map((_, i) => {
      const slice = prices.slice(0, i + 1);
      if (slice.length < 26) return 0;
      const e12 = this.calculateEMA(slice, 12);
      const e26 = this.calculateEMA(slice, 26);
      return e12 - e26;
    });

    const signalLine = this.calculateEMA(macdHistory.slice(-9), 9);
    const histogram = macdLine - signalLine;

    return { value: macdLine, signal: signalLine, histogram };
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b) / period;
  }

  /**
   * Calculate Realized Volatility
   */
  calculateRealizedVolatility(prices: number[], days: number): number {
    if (prices.length < days + 1) return 0;

    const returns = [];
    for (let i = 1; i <= days; i++) {
      const idx = prices.length - i;
      if (idx > 0) {
        returns.push(Math.log(prices[idx] / prices[idx - 1]));
      }
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize (252 trading days)
    return stdDev * Math.sqrt(252) * 100;
  }
}
```

### 4. Option Market Features

```typescript
@Injectable()
export class OptionFeatureService {
  constructor(private readonly questdb: QuestDBService) {}

  /**
   * Get India VIX (current value)
   */
  async getIndiaVIX(): Promise<number> {
    const result = await this.questdb.query(`
      SELECT ltp
      FROM ticks
      WHERE symbol = 'INDIA VIX'
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return result[0]?.ltp || 0;
  }

  /**
   * Get Put-Call Ratio by Volume
   */
  async getPCRVolume(): Promise<number> {
    const result = await this.questdb.query(`
      SELECT
        SUM(CASE WHEN option_type = 'PUT' THEN volume ELSE 0 END) as put_volume,
        SUM(CASE WHEN option_type = 'CALL' THEN volume ELSE 0 END) as call_volume
      FROM ticks
      WHERE symbol LIKE 'NIFTY%'
        AND timestamp >= dateadd('h', -1, now())
    `);

    const putVol = result[0]?.put_volume || 0;
    const callVol = result[0]?.call_volume || 1; // Avoid division by zero

    return putVol / callVol;
  }

  /**
   * Get Put-Call Ratio by Open Interest
   */
  async getPCROI(): Promise<number> {
    const result = await this.questdb.query(`
      SELECT
        SUM(CASE WHEN option_type = 'PUT' THEN oi ELSE 0 END) as put_oi,
        SUM(CASE WHEN option_type = 'CALL' THEN oi ELSE 0 END) as call_oi
      FROM ticks
      WHERE symbol LIKE 'NIFTY%'
        AND timestamp >= dateadd('h', -1, now())
    `);

    const putOI = result[0]?.put_oi || 0;
    const callOI = result[0]?.call_oi || 1;

    return putOI / callOI;
  }

  /**
   * Calculate Max Pain (strike with maximum option seller pain)
   */
  async getMaxPain(): Promise<number> {
    // Fetch all strikes with OI
    const options = await this.questdb.query(`
      SELECT strike, option_type, oi
      FROM ticks
      WHERE symbol LIKE 'NIFTY%'
        AND timestamp >= dateadd('h', -1, now())
      GROUP BY strike, option_type, oi
    `);

    // Calculate pain for each strike
    const strikes = [...new Set(options.map((o) => o.strike))];
    let maxPainStrike = 0;
    let minPain = Infinity;

    for (const strike of strikes) {
      let pain = 0;

      for (const option of options) {
        if (option.option_type === "CALL" && strike < option.strike) {
          pain += (option.strike - strike) * option.oi;
        } else if (option.option_type === "PUT" && strike > option.strike) {
          pain += (strike - option.strike) * option.oi;
        }
      }

      if (pain < minPain) {
        minPain = pain;
        maxPainStrike = strike;
      }
    }

    return maxPainStrike;
  }

  /**
   * Get ATM Implied Volatility
   */
  async getATMIV(symbol: string): Promise<number> {
    const result = await this.questdb.query(`
      SELECT iv
      FROM option_greeks
      WHERE symbol = '${symbol}'
        AND ABS(delta - 0.5) < 0.05
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return result[0]?.iv || 0;
  }

  /**
   * Calculate Volatility Skew: OTM_Put_IV - ATM_Call_IV
   */
  async getVolatilitySkew(symbol: string): Promise<number> {
    const otmPutIV = await this.questdb.query(`
      SELECT iv
      FROM option_greeks
      WHERE symbol = '${symbol}'
        AND option_type = 'PUT'
        AND delta < -0.3 AND delta > -0.4
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const atmCallIV = await this.questdb.query(`
      SELECT iv
      FROM option_greeks
      WHERE symbol = '${symbol}'
        AND option_type = 'CALL'
        AND delta > 0.45 AND delta < 0.55
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return (otmPutIV[0]?.iv || 0) - (atmCallIV[0]?.iv || 0);
  }

  /**
   * Calculate Term Structure: IV_7day / IV_30day
   */
  async getTermStructure(symbol: string): Promise<number> {
    // This would require expiry-specific queries
    // Simplified version:
    const nearTerm = await this.getATMIV(symbol); // Approximate
    const farTerm = nearTerm * 1.1; // Placeholder

    return nearTerm / farTerm;
  }
}
```

### 5. Feature Storage

```typescript
@Injectable()
export class FeatureStorageService {
  private featureBuffer: FeatureSnapshot[] = [];
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly questdb: QuestDBService,
    private readonly redis: RedisService
  ) {
    // Flush buffer every 10 seconds
    setInterval(() => this.flushBuffer(), 10000);
  }

  async storeFeature(feature: FeatureSnapshot) {
    this.featureBuffer.push(feature);

    if (this.featureBuffer.length >= this.BATCH_SIZE) {
      await this.flushBuffer();
    }
  }

  private async flushBuffer() {
    if (this.featureBuffer.length === 0) return;

    const features = [...this.featureBuffer];
    this.featureBuffer = [];

    // Transform to QuestDB format
    const featureData = features.map((f) => ({
      timestamp: f.timestamp,
      symbol: f.instrument,
      features: this.flattenFeatures(f.features),
      metadata: f.metadata,
    }));

    // Batch write to QuestDB
    await this.questdb.insertFeatures(featureData);

    // Publish latest to Redis
    const latest = features[features.length - 1];
    await this.redis.publish("features", JSON.stringify(latest));
  }

  private flattenFeatures(features: any): Record<string, number> {
    // Convert nested object to flat key-value pairs
    const flattened: Record<string, number> = {};

    for (const [key, value] of Object.entries(features)) {
      if (typeof value === "object" && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          flattened[`${key}_${subKey}`] = subValue as number;
        }
      } else {
        flattened[key] = value as number;
      }
    }

    return flattened;
  }
}
```

## Configuration

```typescript
export default registerAs("data-processor", () => ({
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    channels: {
      marketData: "market-data",
      features: "features",
    },
  },
  questdb: {
    host: process.env.QUESTDB_HOST || "localhost",
    port: parseInt(process.env.QUESTDB_PORT || "8812"),
  },
  features: {
    historySize: parseInt(process.env.FEATURE_HISTORY_SIZE || "100"),
    batchSize: parseInt(process.env.FEATURE_BATCH_SIZE || "100"),
    flushInterval: parseInt(process.env.FEATURE_FLUSH_INTERVAL || "10000"),
  },
  indicators: {
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    smaPeriods: [20, 50],
    volatilityPeriods: [5, 10, 20],
  },
}));
```

## Testing

```typescript
describe("FeatureEngineeringService", () => {
  it("should calculate RSI correctly", () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84];
    const rsi = service.calculateRSI(prices, 14);
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });

  it("should compute features when enough data", async () => {
    const tick = { symbol: "NIFTY50", ltp: 19500, timestamp: new Date() };

    // Build history
    for (let i = 0; i < 50; i++) {
      await service.processTick({ ...tick, ltp: 19500 + i });
    }

    const features = await service.computeFeatures("NIFTY50");
    expect(features).toBeDefined();
    expect(features.features.rsi14).toBeGreaterThan(0);
  });
});
```

## Code Quality Standards

- **Accuracy**: Verify indicator calculations against known formulas
- **Performance**: Batch operations, optimize memory
- **Testing**: Unit test all indicator calculations
- **Monitoring**: Log feature computation metrics

## When Making Changes

1. ✅ Use @repo/database for QuestDB and Redis
2. ✅ Batch feature writes for performance
3. ✅ Validate indicator calculations
4. ✅ Handle missing data gracefully
5. ✅ Monitor computation latency
6. ✅ Test edge cases (insufficient data, zero values)

## Anti-Patterns to Avoid

❌ Synchronous indicator calculations blocking pipeline  
❌ Unbounded in-memory price history  
❌ Missing data validation  
❌ Direct database writes (use batching)  
❌ Hardcoded indicator parameters

