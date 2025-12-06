- **Logging**: Structured JSON logging with trace IDs is mandatory for all transactions.

## Deployment Model (CRITICAL)

**Target Environment**: Small personal team (2 users max), local execution with RTX GPU

**Architecture**:

- ✅ **Cloud-Hosted**: Web dashboard + API backend + config sync (Cloud Redis)
- ✅ **Local Execution**: algo-worker (Windows/ArchLinux with RTX GPU)
- ✅ **Local Databases**: QuestDB, MongoDB, Local Redis (event bus)
- ✅ **Training**: Nightly on local GPU (training-pipeline)

**Why Local Algo Execution**:

- <100ms latency required (cloud adds 50-200ms network hop)
- Direct RTX GPU access for TensorRT/CUDA inference
- No static IP compliance burden (not cloud-based)
- Cost savings: ₹1,500/month vs ₹57,000/month cloud deployment

**Key Design Constraint**: algo-worker runs locally, subscribes to cloud Redis for config changes from dashboard UI.

**See**: [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md) for full details.

---

## Architecture Philosophy

### **algo-worker: 7-Layer Event-Driven Architecture**

All code must follow the **7-layer cognitive architecture** with strict layer separation:

1. **Perception** → Event consumption (Redis Streams)
2. **Cortex** → Feature engineering (real-time indicators + Order Flow Imbalance)
3. **Prediction** → ONNX model inference (ensemble) - runs in Worker Thread
4. **Cognition** → Strategy selection + risk management
5. **Execution** → Smart order routing + position tracking + RL-based execution
6. **Memory** → Multi-tier storage (Redis/QuestDB/MongoDB)
7. **Control** → Observability (Prometheus metrics, health checks)

**Rules**:

- ✅ Layers communicate via **internal events** (`EventBus`)
- ✅ Each layer has **single responsibility**
- ✅ **Prediction** layer runs in dedicated Worker Thread (never block event loop)
- ✅ Use **SharedArrayBuffer** for zero-copy data transfer
- ❌ **Never** skip layers (e.g., Perception → Execution)
- ❌ **Never** mix layer concerns (e.g., feature engineering in Prediction)
- ❌ **Never** run GPU inference on main thread (blocks event loop)

**Performance Optimizations**:

- Worker Threads for GPU inference (eliminate 20-50ms blocking)
- SharedArrayBuffer for market data (zero serialization overhead)
- Object pooling for orders (eliminate GC pauses)
- TypedArrays for numerical data (4x faster feature computation)

**Documentation**:

- See `apps/algo-worker/docs/layers/*.md` for layer-specific guidelines
- See `apps/algo-worker/docs/PERFORMANCE_OPTIMIZATION.md` for zero-allocation patterns

---

### **training-pipeline: Kedro Walk-Forward Validation**

All ML training must use **Combinatorial Purged Cross-Validation (CPCV)** to prevent lookahead bias:

```python
# ✅ CORRECT: Purged + Embargoing
Train: [----6 months----] [PURGE] Test: [-1 month-] [EMBARGO]
       [------7 months-------] [PURGE] Test: [-1 month-] [EMBARGO]

# ❌ WRONG: Standard k-fold (temporal leakage)
Fold 1: [--train--][--test--]
Fold 2: [--test--][--train--]  # Future data leaks into past!
```

**Rules**:

- ✅ Use **Combinatorial Purged Cross-Validation** (not standard TimeSeriesSplit)
- ✅ Apply **purging** (drop data between train/test) and **embargoing** (drop data after test)
- ✅ Save **out-of-fold predictions** for meta-learner
- ✅ Export to **ONNX with FP16 quantization** for 2x faster inference
- ✅ Track experiments in **MLflow**
- ✅ Include **Order Flow Imbalance (OFI)** features for microstructure signals
- ✅ Train **RL execution agent** (PPO) for optimal order placement
- ❌ **Never** use shuffled train/test split
- ❌ **Never** use future data for feature engineering
- ❌ **Never** deploy model with `sharpe_p5 < 1.0` (quality gate)

**Documentation**:

- See `apps/training-pipeline/docs/pipelines/*.md` for pipeline-specific guidelines
- See `apps/training-pipeline/docs/ADVANCED_VALIDATION.md` for CPCV, OFI, RL patterns

---

## Development Workflow

1.  **Plan**: Check `implementation_plan.md` and app-specific `docs/ARCHITECTURE.md` (if exists).
2.  **Define**: Create Zod schemas in `@repo/schema` for all data structures.
3.  **Implement**:
    - **algo-worker**: Place code in correct layer (`src/{layer-name}/`)
    - **training-pipeline**: Place code in Kedro pipeline (`src/training_pipeline/pipelines/{pipeline-name}/`)
4.  **Verify**: Run unit tests and (if applicable) backtests.
5.  **Document**: Update `docs/PROGRESS.md` and `README.md`.

---

## Specific Package Rules

### @repo/schema

- Use **Zod** for all schemas (runtime validation)
- Export TypeScript types: `export type MarketData = z.infer<typeof MarketDataSchema>;`
- Validate external data (API responses, Redis messages) immediately upon entry
- **tRPC AppRouter Type**: Auto-exported from `apps/api` to `src/api/app-router.ts`

### @repo/database

- **Redis**: Use for hot state (<1 hour TTL)
- **QuestDB**: Use for time-series (tick data, PnL, metrics)
- **MongoDB**: Use for cold storage (audit trail, 5-year retention)

### @repo/market-sdk

- Handle rate limits gracefully with exponential backoff
- Normalize data from different providers (Upstox, Binance) into common `MarketData` format
- Use circuit breakers for external API calls

### @repo/ai-models

- Load ONNX models with TensorRT/OpenVINO execution providers
- Pre-warm models on startup (run dummy inference)
- Monitor inference latency (<50ms p95 target)

### tRPC Architecture

- **No separate @repo/trpc package**
- tRPC routers defined in `apps/api/src/*/*.router.ts` using `@mguay/nestjs-trpc`
- AppRouter type auto-exported to `@repo/schema/src/api/app-router.ts`
- Web app creates tRPC client locally: `import type { AppRouter } from '@repo/schema/api'`

---

## algo-worker Specific Rules

### **Event-Driven Patterns**

```typescript
// ✅ CORRECT: Publish event from Perception
@Injectable()
export class MarketDataConsumer {
  @OnModuleInit()
  async consumeStream() {
    const messages = await this.redis.xread("stream:market-data");
    this.eventBus.publish(new MarketDataReceivedEvent(data));
  }
}

// ✅ CORRECT: Handle event in Cortex
@Injectable()
export class FeatureEngineService {
  @OnEvent("MarketDataReceivedEvent")
  async handleMarketData(event: MarketDataReceivedEvent) {
    const features = this.compute(event.data);
    this.eventBus.publish(new FeaturesComputedEvent(features));
  }
}
```

### **Redis Streams Best Practices**

```typescript
// ✅ CORRECT: Consumer group for load balancing
await this.redis.xgroup(
  "CREATE",
  "stream:market-data",
  "algo-worker",
  "$",
  "MKSTREAM"
);
const messages = await this.redis.xreadgroup(
  "GROUP",
  "algo-worker",
  "worker-1",
  "BLOCK",
  5000,
  "STREAMS",
  "stream:market-data",
  ">"
);

// ✅ CORRECT: Acknowledge message after processing
await this.redis.xack("stream:market-data", "algo-worker", messageId);
```

### **SEBI Compliance (2024-2025)**

```typescript
// ✅ CORRECT: Generate Unique Algo ID
const algoId = `${process.env.SEBI_ENTITY_CODE}-${format(new Date(), 'yyyyMMdd')}-${process.env.APP_VERSION}-${strategy.toUpperCase()}`;
// Example: ABC123-20241215-V1.2.3-STRADDLE

// ✅ CORRECT: Pre-trade risk checks
if (order.quantity * order.price > this.maxPositionSize) {
  throw new RiskLimitExceededError('Position size >5%');
}

// ✅ CORRECT: Audit trail (5-year retention)
await this.mongo.collection('audit_trail').insertOne({
  algoId,
  timestamp: Date.now(),
  symbol: order.symbol,
  riskChecks: { ... },
});
```

### **Performance Monitoring**

```typescript
// ✅ CORRECT: Record latency for each layer
const start = performance.now();
const features = await this.cortex.compute(data);
const duration = performance.now() - start;
this.metrics.recordDuration("cortex.feature_computation_duration_ms", duration);

// ✅ CORRECT: Increment counters
this.metrics.increment("perception.events_consumed_total", {
  stream: "market-data",
});
```

---

## training-pipeline Specific Rules

### **Kedro Best Practices**

```python
# ✅ CORRECT: Use data catalog for all I/O
def fetch_ticks(catalog):
    return catalog.load('raw_ticks')

# ❌ WRONG: Direct file access
def fetch_ticks():
    return pd.read_parquet('data/raw/ticks.parquet')
```

### **Walk-Forward Validation**

```python
# ✅ CORRECT: TimeSeriesSplit with expanding window
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=12, test_size=30*375)
oof_predictions = np.zeros(len(features))

for train_idx, test_idx in tscv.split(features):
    model.fit(X_train, y_train)
    oof_predictions[test_idx] = model.predict_proba(X_test)[:, 1]

# ❌ WRONG: Shuffled train_test_split
X_train, X_test = train_test_split(features, shuffle=True)  # Temporal leakage!
```

### **ONNX Export**

```python
# ✅ CORRECT: Export with FP16 quantization
import tf2onnx

onnx_model, _ = tf2onnx.convert.from_keras(model, opset=13)
quantize_dynamic(onnx_model, weight_type=QuantType.QFloat16)

# ✅ CORRECT: Validate ONNX vs. original
original_preds = model.predict(X_test)
onnx_preds = ort_session.run(None, {input_name: X_test})[0]
assert np.mean(np.abs(original_preds - onnx_preds)) < 1e-4
```

### **MLflow Tracking**

```python
# ✅ CORRECT: Log everything
import mlflow

with mlflow.start_run(run_name='xgboost_fold_1'):
    mlflow.log_params(hyperparameters)
    mlflow.log_metric('train_auc', train_auc)
    mlflow.log_metric('test_auc', test_auc)
    mlflow.sklearn.log_model(model, 'xgboost')
```

---

## Common Anti-Patterns

### **algo-worker**

❌ Hardcoding Redis keys (use config)
❌ Blocking event loop with CPU-intensive tasks (use ONNX Runtime async)
❌ Skipping SEBI compliance checks
❌ Missing Prometheus metrics for layers

### **training-pipeline**

❌ Using future data in feature engineering
❌ Training meta-learner on training set predictions (use OOF)
❌ Exporting models without validation
❌ Ignoring transaction costs in backtesting

---

## Testing Standards

### **Unit Tests**

- Test each layer/node in isolation
- Mock external dependencies (Redis, QuestDB, broker API)
- Use fixtures for sample data

### **Integration Tests**

- Test end-to-end data flow (Perception → Control)
- Use real Redis/QuestDB in Docker
- Verify event propagation

### **E2E Tests**

- Run full pipeline (training-pipeline)
- Run full trading cycle (algo-worker)
- Verify ONNX model deployment

---

## Getting Help

- **algo-worker Architecture**: `apps/algo-worker/README.md`, `apps/algo-worker/docs/layers/*.md`
- **training-pipeline Architecture**: `apps/training-pipeline/README.md`, `apps/training-pipeline/docs/pipelines/*.md`
- **AI Research**: Root README "Research & References" section
- **Agents**: `.github/agents/` for role-specific guidelines
