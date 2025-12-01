# Layer 7: Control

> **Observability, health checks, and fault tolerance**

**Latency Target**: <10ms metrics export

---

## Purpose

The Control layer provides cross-cutting concerns for all layers: Prometheus metrics, health checks, circuit breakers, and alerting. It ensures system reliability and observability.

---

## Components

### **1. MetricsService**

**File**: `src/control/metrics.service.ts`

**Responsibilities**:

- Export Prometheus metrics for all layers
- Track latency, throughput, error rates
- Provide `/metrics` endpoint for scraping

**Example**:

```typescript
@Injectable()
export class MetricsService {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();
  private gauges = new Map<string, Gauge>();

  increment(name: string, labels?: Record<string, string>): void {
    if (!this.counters.has(name)) {
      this.counters.set(
        name,
        new Counter({ name, labelNames: Object.keys(labels || {}) }),
      );
    }
    this.counters.get(name).inc(labels);
  }

  recordDuration(
    name: string,
    duration: number,
    labels?: Record<string, string>,
  ): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(
        name,
        new Histogram({ name, labelNames: Object.keys(labels || {}) }),
      );
    }
    this.histograms.get(name).observe(labels, duration);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(
        name,
        new Gauge({ name, labelNames: Object.keys(labels || {}) }),
      );
    }
    this.gauges.get(name).set(labels, value);
  }
}
```

---

### **2. HealthCheckService**

**File**: `src/control/health-check.service.ts`

**Responsibilities**:

- Check health of all layers
- Check external dependencies (Redis, QuestDB, MongoDB, Upstox API)
- Provide `/health` endpoint

**Example**:

```typescript
@Injectable()
export class HealthCheckService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    private readonly questdb: QuestDBHealthIndicator,
    private readonly mongo: MongoHealthIndicator,
    private readonly perception: PerceptionHealthIndicator,
  ) {}

  @Get('/health')
  async check() {
    return this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.questdb.isHealthy('questdb'),
      () => this.mongo.isHealthy('mongodb'),
      () => this.perception.check(),
    ]);
  }
}
```

**Response**:

```json
{
  "status": "ok",
  "info": {
    "redis": { "status": "up" },
    "questdb": { "status": "up" },
    "mongodb": { "status": "up" },
    "perception": { "status": "up", "streamLag": 45 }
  }
}
```

---

### **3. CircuitBreakerService**

**File**: `src/control/circuit-breaker.service.ts`

**Responsibilities**:

- Prevent cascading failures
- Open circuit after N consecutive failures
- Half-open after timeout, retry

**Example**:

```typescript
@Injectable()
export class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreaker>();

  async execute<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({
          threshold: 5, // Open after 5 failures
          timeout: 60000, // Half-open after 60s
          resetTimeout: 10000, // Close after 10s success
        }),
      );
    }

    const breaker = this.breakers.get(name);
    return breaker.fire(fn);
  }
}
```

**Usage**:

```typescript
const result = await this.circuitBreaker.execute('upstox_api', async () => {
  return this.upstoxClient.placeOrder(order);
});
```

---

## Explainability & SEBI Compliance Monitoring

### **SHAP (SHapley Additive exPlanations) for Model Transparency**

**Purpose**: Explain model predictions for SEBI compliance and debugging model drift.

**Research**: SHAP values provide unified measure of feature importance, required for regulatory transparency (SEBI 2025-2026 guidelines).

**Implementation**:

```typescript
@Injectable()
export class ExplainabilityService {
  constructor(
    private readonly onnxService: ONNXRuntimeService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Compute SHAP values for recent predictions (weekly batch)
   * Reference: Lundberg & Lee (2017) - NIPS best paper
   */
  @Cron('0 2 * * 0') // Every Sunday 2 AM
  async computeWeeklySHAP() {
    const lastWeekPredictions = await this.fetchPredictions(7); // 7 days

    for (const prediction of lastWeekPredictions) {
      const shapValues = await this.computeSHAP(
        prediction.features,
        prediction.modelName,
      );

      // Store SHAP values in MongoDB (audit trail)
      await this.mongo.collection('shap_values').insertOne({
        timestamp: Date.now(),
        predictionId: prediction.id,
        modelName: prediction.modelName,
        shapValues: shapValues,
        topFeatures: this.getTopFeatures(shapValues, 10),
      });

      // Detect drift in feature importance
      await this.detectSHAPDrift(prediction.modelName, shapValues);
    }
  }

  private async computeSHAP(
    features: Record<string, number>,
    modelName: string,
  ): Promise<Record<string, number>> {
    // Use SHAP.js or Python subprocess
    const shapExplainer = new TreeSHAPExplainer(modelName);

    // Background dataset (100 random samples from training)
    const background = await this.fetchBackgroundData(100);

    // Compute SHAP values
    const shapValues = await shapExplainer.explain(features, background);

    return shapValues;
  }

  private async detectSHAPDrift(
    modelName: string,
    currentSHAP: Record<string, number>,
  ): Promise<void> {
    // Compare with historical average SHAP values
    const historicalSHAP = await this.mongo
      .collection('shap_values')
      .aggregate([
        {
          $match: {
            modelName,
            timestamp: { $gte: Date.now() - 30 * 86400000 },
          },
        },
        { $group: { _id: null, avgSHAP: { $avg: '$shapValues' } } },
      ])
      .toArray();

    if (historicalSHAP.length === 0) return;

    // Calculate drift (KL divergence or cosine similarity)
    const drift = this.calculateDrift(currentSHAP, historicalSHAP[0].avgSHAP);

    if (drift > 0.3) {
      // >30% drift = alert
      await this.alertingService.send({
        severity: 'warning',
        message: `Model ${modelName} feature importance drift: ${drift.toFixed(2)}`,
      });

      this.logger.warn(`SHAP drift detected for ${modelName}: ${drift}`);
    }

    // Export to Prometheus
    this.metricsService.setGauge('shap_drift', drift, { model: modelName });
  }

  private getTopFeatures(
    shapValues: Record<string, number>,
    topN: number,
  ): Array<{ feature: string; importance: number }> {
    return Object.entries(shapValues)
      .map(([feature, importance]) => ({
        feature,
        importance: Math.abs(importance),
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topN);
  }
}
```

**Benefits**:

- ✅ **Regulatory Compliance**: Demonstrate model is not black box (SEBI requirement)
- ✅ **Model Debugging**: Identify when model relies on spurious features
- ✅ **Drift Detection**: Alert when feature importance changes (regime shift)
- ✅ **User Transparency**: Show users which features drove trading decision

**Example Output** (logged to MongoDB):

```json
{
  "timestamp": 1733068800000,
  "predictionId": "pred_20251201_123456",
  "modelName": "xgboost_v1.2.3",
  "topFeatures": [
    { "feature": "realized_vol_5d", "importance": 0.23 },
    { "feature": "atm_iv", "importance": 0.18 },
    { "feature": "pcr_volume", "importance": 0.14 },
    { "feature": "rsi_14", "importance": 0.11 },
    { "feature": "macd", "importance": 0.09 }
  ],
  "shapDrift": 0.12
}
```

---

### **4. AlertingService**

**File**: `src/control/alerting.service.ts`

**Responsibilities**:

- Send alerts to PagerDuty, Slack
- Triggered by critical events (broker API down, daily loss limit exceeded)

**Example**:

```typescript
@Injectable()
export class AlertingService {
  @OnEvent('BrokerAPIDownEvent')
  async handleBrokerDown(event: BrokerAPIDownEvent) {
    await this.pagerDuty.trigger({
      summary: 'Broker API Down',
      severity: 'critical',
      source: 'algo-worker',
    });
  }

  @OnEvent('DailyLossLimitExceededEvent')
  async handleDailyLossLimit(event: DailyLossLimitExceededEvent) {
    await this.slack.send({
      channel: '#trading-alerts',
      text: `🚨 Daily loss limit exceeded: ${event.loss}`,
    });
  }
}
```

---

## Metrics Exported

### **System Metrics**

```typescript
system.uptime_seconds; // Gauge
system.cpu_usage_percent; // Gauge
system.memory_usage_mb; // Gauge
system.event_loop_lag_ms; // Gauge
```

### **Layer Metrics** (see individual layer docs)

- **Perception**: `perception.events_consumed_total`, `perception.event_processing_duration_ms`
- **Cortex**: `cortex.features_computed_total`, `cortex.feature_computation_duration_ms`
- **Prediction**: `prediction.predictions_total`, `prediction.inference_duration_ms`
- **Cognition**: `cognition.decisions_total`, `cognition.risk_violations_total`
- **Execution**: `execution.orders_placed_total`, `execution.orders_filled_total`
- **Memory**: `memory.redis_writes_total`, `memory.questdb_writes_total`

### **Business Metrics**

```typescript
trading.pnl_total                               // Gauge (current PnL)
trading.daily_pnl                               // Gauge (daily PnL)
trading.trades_total{side="BUY"}                // Counter
trading.win_rate                                // Gauge (0-1)
trading.sharpe_ratio                            // Gauge
```

---

## Health Check Endpoints

### **GET /health**

**Purpose**: Overall system health

**Response**:

```json
{
  "status": "ok",
  "info": {
    "redis": { "status": "up" },
    "questdb": { "status": "up" },
    "mongodb": { "status": "up" },
    "perception": { "status": "up", "streamLag": 45 },
    "cortex": { "status": "up", "cacheHitRate": 0.85 },
    "prediction": { "status": "up", "modelsLoaded": 6 },
    "cognition": { "status": "up", "dailyPnL": 1500 },
    "execution": { "status": "up", "fillRate": 0.95 },
    "memory": { "status": "up", "redisConnected": true }
  }
}
```

---

### **GET /health/liveness**

**Purpose**: Kubernetes liveness probe

**Response**: `200 OK` if server is running

---

### **GET /health/readiness**

**Purpose**: Kubernetes readiness probe

**Response**: `200 OK` if ready to serve traffic (all dependencies healthy)

---

## Circuit Breaker States

| State         | Behavior                                     |
| ------------- | -------------------------------------------- |
| **Closed**    | Normal operation, allow all requests         |
| **Open**      | Block all requests, return error immediately |
| **Half-Open** | Allow 1 request to test if service recovered |

**State Transitions**:

```
Closed --[N failures]--> Open
Open --[timeout]--> Half-Open
Half-Open --[success]--> Closed
Half-Open --[failure]--> Open
```

---

## Alerting Rules

### **Critical Alerts** (PagerDuty)

- Broker API down (5 consecutive failures)
- Daily loss limit exceeded (>3% portfolio)
- Redis connection lost (>1 minute)
- QuestDB connection lost (>5 minutes)

### **Warning Alerts** (Slack)

- High prediction latency (p95 >100ms)
- Low cache hit rate (<80%)
- High risk violation rate (>5% orders)
- Order rejection rate >10%

---

## Performance Targets

| Metric                   | Target |
| ------------------------ | ------ |
| Metrics export latency   | <10ms  |
| Health check latency     | <50ms  |
| Circuit breaker overhead | <1ms   |

---

## Monitoring Dashboard

**Grafana Dashboard** (import JSON):

```json
{
  "title": "Algo Worker - 7 Layer Architecture",
  "panels": [
    {
      "title": "End-to-End Latency (p95)",
      "query": "histogram_quantile(0.95, rate(layer_duration_ms_bucket[5m]))"
    },
    {
      "title": "Events Per Second",
      "query": "rate(perception.events_consumed_total[1m])"
    },
    { "title": "Prediction Accuracy", "query": "prediction.accuracy" },
    { "title": "Daily PnL", "query": "trading.daily_pnl" },
    { "title": "Order Fill Rate", "query": "execution.fill_rate" }
  ]
}
```

---

## Testing

**File**: `test/control.e2e-spec.ts`

```typescript
describe('Control Layer (e2e)', () => {
  it('should export metrics', async () => {
    const response = await request(app.getHttpServer()).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('perception_events_consumed_total');
  });

  it('should check health', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should open circuit breaker after failures', async () => {
    for (let i = 0; i < 5; i++) {
      await circuitBreaker.execute('test', async () => {
        throw new Error('fail');
      });
    }
    const state = circuitBreaker.getState('test');
    expect(state).toBe('open');
  });
});
```

---

## Dependencies

- **Upstream**: All layers (emit metrics, events)
- **Downstream**: Prometheus, Grafana, PagerDuty, Slack
- **External**: Prometheus, Grafana

---

## See Also

- [Layer 6: Memory](./06-MEMORY.md)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [NestJS Health Checks](https://docs.nestjs.com/recipes/terminus)
