# Algo Worker - Coding Instructions

> Core trading engine implementing the Event-Driven 7-Layer Cognitive Architecture.

---

## Architecture Principles

### 1. Event-Driven Core (CRITICAL)

**ALL** inter-engine communication MUST use Redis Streams, NOT direct function calls.

```typescript
// ❌ BAD: Direct coupling
const signal = await this.signalEngine.generate(features);

// ✅ GOOD: Event-driven
await this.redis.xadd('trading-signals', '*', 
  'type', 'PRICE_FORECAST',
  'data', JSON.stringify(features)
);
```

**Why**: Research shows event-driven architectures achieve <10μs event processing vs. 10-50ms for HTTP calls.

### 2. SEBI 2024-2025 Compliance (MANDATORY)

Every order MUST include:
```typescript
const order = {
  algoId: `PROJ_QUANTUM_v${this.version}_USER_${userId}`,
  timestamp: new Date(),
  preTradeChecksPassed: true,  // From RiskManager validation
  riskLimitsValidated: true,
  // ... other fields
};
```

**Pre-Trade Checks** (RiskManager):
- Position limits not exceeded
- Margin sufficient
- Max leverage within bounds
- Greeks exposure acceptable

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
- **Input**: Features from Redis Stream
- **Output**: Trading signals (VOL_UP/VOL_DOWN) + confidence
- **Services**: `ModelLoaderService`, `SignalEngineService`
- **Models**: XGBoost, CNN-LSTM, GINN, SVM, Stacking (5 models)

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
await this.redis.hset('positions:active', instrumentKey, JSON.stringify(position));

// ✅ Circuit Breaker (String)
await this.redis.set('circuit-breaker:status', 'OPEN', 'EX', 300);
```

---

## ML Model Guidelines

### ONNX Runtime Configuration

```typescript
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: [
    'TensorrtExecutionProvider',   // NVIDIA GPU (primary)
    'OpenVINOExecutionProvider',    // Intel CPU (fallback)
    'CPUExecutionProvider'          // Universal fallback
  ],
  graphOptimizationLevel: 'all',
  enableProfiling: false,           // Disable in production
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
    super(`Insufficient margin: required ₹${required}, available ₹${available}`);
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
