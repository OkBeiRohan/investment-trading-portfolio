# Algo Worker - Coding Instructions

> Core trading engine implementing the Event-Driven 7-Layer Cognitive Architecture.

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

## 4-Engine Architecture (Current)

### DataEngine

- **Responsibility**: Market data ingestion + feature engineering
- **Input**: Upstox WebSocket (ticks, quotes, option chain)
- **Output**: Features to QuestDB + Redis Stream
- **Services**: `DataCollectionService`, `FeatureEngineeringService`, `FeatureStoreService`

### SignalEngine

- **Responsibility**: ML inference using ONNX models
- **Input**: Features from Redis Stream (pre-filtered by union config)
- **Output**: Trading signals (VOL_UP/VOL_DOWN) + confidence
- **Services**: `ModelLoaderService`, `SignalEngineService`
- **Models**: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer (6 core + 2 optional)
- **Config-Aware**: Only run models enabled in user configs

### PolicyEngine

- **Responsibility**: Strategy selection + risk management
- **Input**: Signals from Redis Stream
- **Output**: Validated orders (or rejection)
- **Services**: `PolicyEngineService`, `RiskManagementService`, `PositionSizingService`

### ExecutionEngine

- **Responsibility**: Order placement + tracking
- **Input**: Validated orders from Redux Stream
- **Output**: API calls to Upstox + position updates
- **Services**: `ExecutionEngineService`, `OrderManagerService`

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
    takeProfitPercent: number | null; // Optional
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
