---
applyTo: "apps/algo-worker/**"
---

# Algo Worker - Coding Instructions

> Core trading engine implementing the 6-layer event-driven processing pipeline with 5-tier data-bound model hierarchy.

---

## Architecture Principles

### 1. User-Configurable Trading (CRITICAL)

**EVERY** trading decision MUST respect user-specific configuration stored in MongoDB.

```typescript
// ❌ BAD: Analyze everything, filter after
const signals = await this.predictAllStrategies(allInstruments);
const filtered = signals.filter((s) => user.allowsStrategy(s));

// ✅ GOOD: Filter before analysis
const activeInstruments = this.configService.getUnionInstruments();
const relevantFeatures = features.filter((f) =>
  activeInstruments.has(f.symbol),
);
const signals = await this.predict(relevantFeatures);
```

**Why**: Reduces compute by 95%. If 100 users exist but only 2 active, analyze only what those 2 need.

**Configuration Loading**:

```typescript
@Injectable()
export class UserConfigService {
  async loadActiveConfigs() {
    const configs = await this.mongo
      .collection('user_trading_configs')
      .find({ enabled: true })
      .toArray();

    this.unionConfig = this.computeUnion(configs);
  }

  computeUnion(configs: UserTradingConfig[]): UnionConfig {
    return {
      instruments: new Set(configs.flatMap((c) => c.enabledInstruments)),
      strategies: new Set(configs.flatMap((c) => c.strategies.allowed)),
      permissions: {
        anyBuyCalls: configs.some((c) => c.permissions.allowBuyCalls),
        anySellCalls: configs.some((c) => c.permissions.allowSellCalls),
        // ... other permissions
      },
    };
  }
}
```

**Validation Pattern**:

```typescript
// ALWAYS validate before execution
const validation = await this.configService.validateSignalForUser(signal, userId);
if (!validation.valid) {
  this.logger.warn(`Signal rejected for user ${userId}: ${validation.reason}`);
  return;
}

// Check financial limits
if (order.amount > config.limits.maxSingleTradeAmount) {
  throw new TradeLimitExceededError(...);
}

// Check risk limits
if (portfolio.dailyLoss < config.risk.maxDailyDrawdown) {
  await this.circuitBreaker.trigger(userId, 'DAILY_LOSS_LIMIT');
}
```

### 2. Event-Driven Core (CRITICAL)

**ALL** inter-engine communication MUST use Redis Streams, NOT direct function calls.

```typescript
// ❌ BAD: Direct coupling
const signal = await this.signalEngine.generate(features);

// ✅ GOOD: Event-driven
await this.redis.xadd(
  'trading-signals',
  '*',
  'type',
  'PRICE_FORECAST',
  'data',
  JSON.stringify(features),
);
```

**Why**: Research shows event-driven architectures achieve <10μs event processing vs. 10-50ms for HTTP calls.

### 3. SEBI 2024-2025 Compliance (MANDATORY)

Every order MUST include:

```typescript
const order = {
  algoId: `PROJ_QUANTUM_v${this.version}_USER_${userId}`,
  userId: userId, // User-specific tracking
  timestamp: new Date(),
  preTradeChecksPassed: true, // From RiskManager validation
  riskLimitsValidated: true,
  userConfigValidated: true, // NEW: User config validation
  // ... other fields
};
```

**Pre-Trade Checks** (RiskManager):

- User configuration validated (permissions, limits, strategies)
- Position limits not exceeded (user-specific + global)
- Margin sufficient (per user account)
- Max leverage within bounds (user.risk.maxLeverage)
- Greeks exposure acceptable (user.risk.greeksLimits)

### 3. Latency Optimization (Sub-100ms Target)

**Hot Path** (Tick → Signal → Order):

- Use `TypedArray` for numerical data (not plain objects)
- Avoid `JSON.parse/stringify` in loops
- Pre-allocate buffers for feature vectors
- Profile with `process.hrtime.bigint()`

```typescript
// ✅ GOOD: Pre-allocated buffer
const featureBuffer = new Float32Array(13); // Reuse across iterations

for (const tick of ticks) {
  featureBuffer[0] = tick.price;
  featureBuffer[1] = tick.volume;
  // ... populate features
  await this.signalEngine.infer(featureBuffer);
}
```

---

## 5-Tier Data-Bound Model Hierarchy

The algo-worker executes the **5-tier data-bound hierarchy** for ML inference:

| Tier | Name | Models | Features |
|------|------|--------|----------|
| Tier 0 | Pre-Market Gap Predictor | XGBoost | 24 features |
| Tier 1 | Macro Director | HMM + PatchTST | 43 features |
| Tier 2 | Intraday Navigator | LightGBM + TFT + Mamba | 80+ features |
| Tier 3 | Microstructure Scalper | Phased LiT | 14 features |
| Tier 4 | Meta-Learner | Contextual Gating Network + StrikeSelector + RiskManager | Tier 0–3 outputs |

### Engine Mapping

These tiers are orchestrated through the algo-worker's processing engines:

### DataEngine

- **Responsibility**: Market data ingestion + feature engineering
- **Input**: Upstox WebSocket (ticks, quotes, option chain)
- **Output**: Features to QuestDB + Redis Stream
- **Services**: `DataCollectionService`, `FeatureEngineeringService`, `FeatureStoreService`

### SignalEngine

- **Responsibility**: ML inference using ONNX models across Tier 0–3
- **Input**: Features from Redis Stream (pre-filtered by union config)
- **Output**: Trading signals (VOL_UP/VOL_DOWN) + confidence
- **Services**: `ModelLoaderService`, `SignalEngineService`
- **Models**: Tier 0 (XGBoost), Tier 1 (HMM, PatchTST), Tier 2 (LightGBM, TFT, Mamba), Tier 3 (LiT)
- **Config-Aware**: Only run models enabled in user configs

### PolicyEngine

- **Responsibility**: Tier 4 Meta-Learner fusion + strategy selection + risk management
- **Input**: Signals from Redis Stream (all tier outputs)
- **Output**: Validated orders (or rejection)
- **Services**: `PolicyEngineService`, `RiskManagementService`, `PositionSizingService`

### ExecutionEngine

- **Responsibility**: Order placement + position tracking + exit management
- **Input**: Validated orders from Redis Stream
- **Output**: API calls to Upstox + position updates + exit signals
- **Services**: `ExecutionEngineService`, `OrderManagerService`, `PositionManagerService`, `ExitSignalGeneratorService`
- **Critical**: Must track ALL open positions and monitor exit conditions continuously

---

## Position Management & Exit Strategy (CRITICAL)

### **Position Tracking Requirements**

Every open position MUST be tracked in real-time:

```typescript
interface Position {
  positionId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  entryTime: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss: number;
  trailingStopLoss: number | null;
  takeProfit: number | null;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}
```

### **Multi-Criteria Exit System**

Positions must be monitored for exit using **multiple criteria** (in priority order):

1. **Stop Loss Hit** (Priority: HIGH)

   ```typescript
   if (position.side === 'BUY' && currentPrice <= position.stopLoss) {
     exitPosition(position, 'STOP_LOSS_HIT');
   }
   ```

2. **Trailing Stop Hit** (Priority: HIGH)

   ```typescript
   // Update trailing stop on every tick
   if (position.trailingStopLoss) {
     const newStop =
       currentPrice * (1 - config.risk.trailingStopLossPercent / 100);
     position.trailingStopLoss = Math.max(position.trailingStopLoss, newStop);
   }

   if (currentPrice <= position.trailingStopLoss) {
     exitPosition(position, 'TRAILING_STOP_HIT');
   }
   ```

3. **Take Profit Hit** (Priority: MEDIUM)

   ```typescript
   if (position.takeProfit && currentPrice >= position.takeProfit) {
     exitPosition(position, 'TAKE_PROFIT_HIT');
   }
   ```

4. **Time-Based Exit** (Priority: MEDIUM)

   ```typescript
   // EOD exit for intraday positions
   if (isEndOfDay() && position.type === 'INTRADAY') {
     exitPosition(position, 'EOD_EXIT');
   }
   ```

5. **ML-Based Exit Signal** (Priority: LOW)

   ```typescript
   // Use same ensemble to predict trend reversal
   const exitSignal = await this.predictionService.predictExit(position);
   if (exitSignal.shouldExit && exitSignal.confidence > 0.75) {
     exitPosition(position, 'ML_REVERSAL_SIGNAL');
   }
   ```

6. **Risk Limit Breach** (Priority: HIGH)

   ```typescript
   if (portfolio.dailyLoss < config.risk.maxDailyDrawdown) {
     liquidateAllPositions('DAILY_LOSS_LIMIT');
   }

   if (portfolio.greeks.delta > config.risk.greeksLimits.maxDelta) {
     exitPosition(position, 'DELTA_LIMIT_BREACH');
   }
   ```

### **Trailing Stop Loss Implementation**

```typescript
@Cron('*/1 * * * * *') // Every second
async updateTrailingStops() {
  const positions = await this.positionManager.getOpenPositions();

  for (const position of positions) {
    const config = this.configService.getConfig(position.userId);

    if (!config.risk.enableTrailingStop) continue;

    const currentPrice = await this.getLatestPrice(position.symbol);
    const trailingPercent = config.risk.trailingStopLossPercent;

    if (position.side === 'BUY') {
      // Trail upward for long positions
      const newStop = currentPrice * (1 - trailingPercent / 100);

      if (!position.trailingStopLoss || newStop > position.trailingStopLoss) {
        position.trailingStopLoss = newStop;
        await this.updatePosition(position);

        this.logger.log(`Trailing stop updated for ${position.symbol}: ${newStop}`);
      }

      // Check if stop hit
      if (currentPrice <= position.trailingStopLoss) {
        await this.exitPosition(position, 'TRAILING_STOP_HIT');
      }
    } else {
      // Trail downward for short positions
      const newStop = currentPrice * (1 + trailingPercent / 100);

      if (!position.trailingStopLoss || newStop < position.trailingStopLoss) {
        position.trailingStopLoss = newStop;
        await this.updatePosition(position);
      }

      if (currentPrice >= position.trailingStopLoss) {
        await this.exitPosition(position, 'TRAILING_STOP_HIT');
      }
    }
  }
}
```

### **Position Storage**

- **Hot (Redis)**: Active positions for instant access

  ```typescript
  await redis.hset('positions:open', positionId, JSON.stringify(position));
  ```

- **Cold (MongoDB)**: Historical positions for audit trail
  ```typescript
  await mongo.collection('positions').insertOne({
    ...position,
    closedAt: Date.now(),
    closeReason: 'TRAILING_STOP_HIT',
    finalPnL: position.realizedPnL,
  });
  ```

### **Anti-Patterns**

❌ Not tracking positions after entry (blind trading)
❌ Using only fixed stop loss without trailing
❌ Ignoring ML exit signals
❌ Not having time-based exits for intraday
❌ Not monitoring portfolio-level Greeks

---

## Database Usage Rules

### QuestDB (Time-Series ONLY)

```typescript
import { QuestDBService } from '@repo/database';

// ✅ Correct: Time-series data
await this.questdb.insertTicks(ticks);
await this.questdb.insertCandles(candles);
await this.questdb.insertFeatures(features);

// ❌ WRONG: Non-time-series data
await this.questdb.insertOrder(order); // Use MongoDB!
```

### MongoDB (Documents ONLY)

```typescript
import { TradingDatabaseModule } from '@repo/database';

// ✅ Correct: Document data
await this.tradingSignalModel.create(signal);
await this.orderModel.create(order);
await this.positionModel.findOne({ userId });

// ❌ WRONG: Time-series data
await this.tickDataModel.insertMany(ticks); // Use QuestDB!
```

### Redis (Hot State + Event Bus)

```typescript
import { RedisService } from '@repo/database';

// ✅ Event Bus (Streams)
await this.redis.xadd('market-data', '*', 'tick', JSON.stringify(tick));

// ✅ Hot State (Hash)
await this.redis.hset(
  'positions:active',
  instrumentKey,
  JSON.stringify(position),
);

// ✅ Circuit Breaker (String)
await this.redis.set('circuit-breaker:status', 'OPEN', 'EX', 300);
```

---

## ML Model Guidelines

### ONNX Runtime Configuration

```typescript
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: [
    'TensorrtExecutionProvider', // NVIDIA GPU (primary)
    'OpenVINOExecutionProvider', // Intel CPU (fallback)
    'CPUExecutionProvider', // Universal fallback
  ],
  graphOptimizationLevel: 'all',
  enableProfiling: false, // Disable in production
});
```

### Tensor Shape Documentation (MANDATORY)

Every model inference MUST document input/output shapes:

```typescript
/**
 * Infer signal from features
 * @param features - Float32Array, Shape: [Batch=1, Seq=60, Feat=13]
 * @returns Prediction, Shape: [Batch=1, Classes=3] (VOL_UP, NEUTRAL, VOL_DOWN)
 */
async infer(features: Float32Array): Promise<Float32Array> {
  const inputTensor = new ort.Tensor('float32', features, [1, 60, 13]);
  const output = await this.session.run({ input: inputTensor });
  return output.output.data as Float32Array;
}
```

---

## Testing Standards

### Latency Tests (CRITICAL)

```typescript
describe('SignalEngine', () => {
  it('should generate signal in <50ms (GPU)', async () => {
    const features = new Float32Array(1 * 60 * 13);
    const start = process.hrtime.bigint();

    await signalEngine.generate(features);

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(durationMs).toBeLessThan(50);
  });
});
```

### Backtest Validation

Every new strategy MUST pass:

- 1-year walk-forward backtest
- Sharpe Ratio >1.2
- Max Drawdown <20%
- Slippage assumption: 0.05% per leg

---

## Error Handling

### Custom Error Classes

```typescript
export class InsufficientMarginError extends Error {
  constructor(required: number, available: number) {
    super(
      `Insufficient margin: required ₹${required}, available ₹${available}`,
    );
    this.name = 'InsufficientMarginError';
  }
}

export class RiskLimitExceededError extends Error {
  constructor(limit: string, value: number, max: number) {
    super(`${limit} exceeded: ${value} > ${max}`);
    this.name = 'RiskLimitExceededError';
  }
}
```

### Circuit Breaker

```typescript
if (await this.riskManager.isDailyLossExceeded()) {
  await this.redis.set('circuit-breaker:status', 'OPEN');
  await this.executionEngine.liquidateAllPositions();
  throw new CircuitBreakerTriggeredError('Daily loss limit reached');
}
```

---

## Logging Standards

```typescript
// ✅ GOOD: Structured logging with trace ID
this.logger.log({
  event: 'SIGNAL_GENERATED',
  traceId: context.traceId,
  userId: context.userId,
  prediction: 'VOL_UP',
  confidence: 0.78,
  latencyMs: 42,
  timestamp: new Date().toISOString(),
});

// ❌ BAD: Unstructured logging
this.logger.log('Signal generated: VOL_UP');
```

---

## User Configuration Usage Patterns

### **Configuration Schema** (MongoDB: `user_trading_configs`)

```typescript
interface UserTradingConfig {
  userId: string;
  enabled: boolean; // Master switch

  permissions: {
    allowBuyCalls: boolean;
    allowSellCalls: boolean; // Naked call writing
    allowBuyPuts: boolean;
    allowSellPuts: boolean; // Naked put writing
    allowSpreads: boolean; // Multi-leg strategies
    allowIntraday: boolean;
    allowOvernightPositions: boolean;
  };

  limits: {
    maxDailyTradeAmount: number; // ₹50,000
    maxSingleTradeAmount: number; // ₹10,000
    maxTotalExposure: number; // ₹100,000
    maxConcurrentPositions: number; // 5
    minCashReservePercent: number; // 20%
  };

  risk: {
    stopLossPercent: number; // ±10% of algo default
    trailingStopLossPercent: number; // 5% default trailing distance
    takeProfitPercent: number | null; // Optional take profit
    enableTrailingStop: boolean; // Enable/disable trailing stops
    exitStrategy: 'FIXED_STOP' | 'TRAILING_STOP' | 'ML_BASED' | 'HYBRID';
    maxDailyDrawdown: number; // ₹5,000
    maxLeverage: number; // 1.0 - 3.0
    positionSizingStrategy: 'FIXED' | 'KELLY' | 'RL_BASED';
    greeksLimits: {
      maxDelta: number;
      maxGamma: number;
      maxTheta: number;
      maxVega: number;
    };
  };

  strategies: {
    allowed: string[]; // ['LONG_STRADDLE', 'IRON_CONDOR', ...]
    minSignalConfidence: number; // 0.5 - 0.9
    preferredVolatilityRegime: 'HIGH' | 'LOW' | 'ALL';
    timeHorizons: string[]; // ['5m', '15m', '1h', 'EOD']
  };

  models: {
    enabledModels: string[]; // ['xgboost', 'lightgbm', ...]
    minEnsembleAgreement: number; // 0.6 = 60% models must agree
  };

  execution: {
    algorithm: 'MARKET' | 'TWAP' | 'VWAP';
    slippageTolerance: number; // 0.1%
    orderValidity: 'IOC' | 'DAY' | 'GTC';
    maxRetryAttempts: number; // 3
  };
}
```

### **Configuration Loading & Usage**

```typescript
// 1. Load configs on market open
await this.userConfigService.loadActiveConfigs();

// 2. Filter instruments before Perception layer
const activeInstruments = this.userConfigService.getUnionInstruments();
this.marketDataConsumer.subscribe(activeInstruments);

// 3. Filter features before Cortex layer
if (!this.userConfigService.shouldAnalyzeInstrument(tick.symbol)) {
  return; // Skip feature computation
}

// 4. Filter before Prediction layer
const enabledModels = this.userConfigService.getUnionEnabledModels();
const predictions = await this.runModels(features, enabledModels);

// 5. Validate per-user before Execution layer
const interestedUsers = this.userConfigService.getUsersInterestedIn(signal);
for (const userId of interestedUsers) {
  const validation = await this.validateForUser(signal, userId);
  if (validation.valid) {
    await this.executeOrder(signal, userId);
  }
}
```

### **Anti-Patterns to Avoid**

❌ Analyzing all instruments without checking config
❌ Running all models when user disabled some
❌ Generating signals for disabled strategies
❌ Executing orders without user-specific validation
❌ Hardcoding risk limits (must come from user config)

---

## Performance Profiling

```bash
# CPU profiling
node --prof dist/main.js

# Memory leak detection
clinic doctor -- node dist/main.js

# Flame graphs
0x dist/main.js
```

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready

