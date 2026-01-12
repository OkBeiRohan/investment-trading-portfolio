# Layer 8: Logging & Monitoring

**Purpose**: Real-time observability, alerting, and audit trail

---

## Overview

The Logging & Monitoring layer provides comprehensive visibility into system health, trading activity, and performance metrics. Essential for debugging, compliance, and performance optimization.

---

## Components

### LoggingService

- Structured JSON logging
- Trace ID propagation
- Audit trail (5-year retention)

### MetricsCollector

- Prometheus metrics export
- Custom metrics registration
- Histogram/counter/gauge management

### HealthCheckService

- Service health monitoring
- Dependency checks (Redis, QuestDB, MongoDB, Upstox API)
- Liveness/readiness probes

### AlertingService

- Threshold-based alerts
- Circuit breaker notifications
- Performance degradation warnings

---

## Structured Logging

```typescript
/**
 * Structured JSON logging with trace IDs
 */
class LoggingService {
  log(
    level: 'info' | 'warn' | 'error',
    event: string,
    context: Record<string, any>,
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      traceId: context.traceId || this.generateTraceId(),
      userId: context.userId,
      ...context,
    };

    // Write to console (captured by Winston/Pino)
    console.log(JSON.stringify(logEntry));

    // Write to MongoDB for audit trail
    if (this.isAuditEvent(event)) {
      this.auditCollection.insertOne({
        ...logEntry,
        retentionYears: 5, // SEBI requirement
      });
    }
  }

  private isAuditEvent(event: string): boolean {
    return [
      'ORDER_PLACED',
      'ORDER_FILLED',
      'ORDER_REJECTED',
      'POSITION_OPENED',
      'POSITION_CLOSED',
      'RISK_CHECK_FAILED',
      'CIRCUIT_BREAKER_TRIGGERED',
    ].includes(event);
  }
}
```

### Example Log Entries

```json
// Market data received
{
  "timestamp": "2026-01-12T10:30:45.123Z",
  "level": "info",
  "event": "MARKET_DATA_RECEIVED",
  "traceId": "abc123",
  "symbol": "NIFTY50",
  "price": 22500,
  "latencyMs": 3
}

// Order placed
{
  "timestamp": "2026-01-12T10:30:46.456Z",
  "level": "info",
  "event": "ORDER_PLACED",
  "traceId": "abc123",
  "userId": "user123",
  "orderId": "order456",
  "algoId": "ABC-20260112-v1.0.0-LONG_CALL",
  "symbol": "NIFTY50CE22500",
  "side": "BUY",
  "quantity": 50,
  "orderType": "LIMIT",
  "limitPrice": 150
}

// Risk check failed
{
  "timestamp": "2026-01-12T10:30:47.789Z",
  "level": "warn",
  "event": "RISK_CHECK_FAILED",
  "traceId": "abc124",
  "userId": "user123",
  "reason": "Exceeds max single trade amount",
  "attemptedAmount": 100000,
  "maxAllowed": 50000
}
```

---

## Prometheus Metrics

### Counter Metrics

```typescript
// Total events processed
this.metrics.increment('data_ingestion.events_received_total', {
  stream: 'market-data',
  symbol: 'NIFTY50',
});

// Total orders placed
this.metrics.increment('execution_engine.orders_placed_total', {
  side: 'BUY',
  orderType: 'LIMIT',
});

// Total errors
this.metrics.increment('prediction_engine.inference_errors_total', {
  model: 'xgboost',
  errorType: 'TIMEOUT',
});
```

### Histogram Metrics

```typescript
// Latency distribution
this.metrics.recordDuration(
  'feature_engine.computation_duration_ms',
  duration,
  {
    featureType: 'technical',
  },
);

// Slippage distribution
this.metrics.recordValue('execution_engine.slippage_bps', slippageBps, {
  exchange: 'NSE',
  orderType: 'MARKET',
});

// Position size distribution
this.metrics.recordValue('risk_manager.position_size', positionSize, {
  strategy: 'LONG_CALL',
});
```

### Gauge Metrics

```typescript
// Current open positions
this.metrics.setGauge(
  'execution_engine.positions_open_total',
  positions.length,
  {
    userId: 'user123',
  },
);

// Portfolio Greeks
this.metrics.setGauge('risk_manager.portfolio_delta', portfolio.greeks.delta, {
  userId: 'user123',
});

// Queue depth
this.metrics.setGauge('perception.redis_stream_length', streamLength, {
  stream: 'market-data',
});
```

---

## Health Checks

```typescript
@Controller('health')
export class HealthCheckController {
  @Get()
  async check(): Promise<HealthCheckResult> {
    const checks = await Promise.all([
      this.checkRedis(),
      this.checkQuestDB(),
      this.checkMongoDB(),
      this.checkUpstoxAPI(),
      this.checkGPU(),
    ]);

    const allHealthy = checks.every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      checks,
    };
  }

  private async checkRedis(): Promise<Check> {
    try {
      await this.redis.ping();
      return { service: 'Redis', status: 'healthy' };
    } catch (error) {
      return { service: 'Redis', status: 'unhealthy', error: error.message };
    }
  }

  private async checkQuestDB(): Promise<Check> {
    try {
      const result = await this.questdb.query('SELECT 1');
      return { service: 'QuestDB', status: 'healthy' };
    } catch (error) {
      return { service: 'QuestDB', status: 'unhealthy', error: error.message };
    }
  }

  private async checkGPU(): Promise<Check> {
    try {
      // Check if CUDA available
      const gpuInfo = await this.getGPUInfo();
      return {
        service: 'GPU',
        status: gpuInfo.available ? 'healthy' : 'degraded',
        metadata: gpuInfo,
      };
    } catch (error) {
      return { service: 'GPU', status: 'unhealthy', error: error.message };
    }
  }
}
```

---

## Alerting Rules

```typescript
interface AlertRule {
  name: string;
  condition: () => boolean;
  severity: 'info' | 'warning' | 'critical';
  cooldown: number; // ms
}

class AlertingService {
  private rules: AlertRule[] = [
    // Latency alert
    {
      name: 'HIGH_LATENCY',
      condition: () => this.getP95Latency() > 100, // >100ms p95
      severity: 'warning',
      cooldown: 60000, // 1 minute
    },

    // Error rate alert
    {
      name: 'HIGH_ERROR_RATE',
      condition: () => this.getErrorRate() > 0.05, // >5% errors
      severity: 'critical',
      cooldown: 300000, // 5 minutes
    },

    // Circuit breaker triggered
    {
      name: 'CIRCUIT_BREAKER_TRIGGERED',
      condition: () => this.isCircuitBreakerOpen(),
      severity: 'critical',
      cooldown: 3600000, // 1 hour
    },

    // GPU unavailable
    {
      name: 'GPU_UNAVAILABLE',
      condition: () => !this.isGPUAvailable(),
      severity: 'warning',
      cooldown: 60000,
    },

    // Daily loss exceeds threshold
    {
      name: 'DAILY_LOSS_THRESHOLD',
      condition: () => this.getDailyPnL() < -4000, // ₹4,000 loss
      severity: 'warning',
      cooldown: 3600000,
    },
  ];

  @Cron('*/10 * * * * *') // Every 10 seconds
  async checkAlerts() {
    for (const rule of this.rules) {
      if (this.shouldCheck(rule) && rule.condition()) {
        await this.sendAlert(rule);
        this.updateCooldown(rule);
      }
    }
  }

  private async sendAlert(rule: AlertRule) {
    this.logger.error(`Alert: ${rule.name}`, { severity: rule.severity });

    // Send to notification service
    await this.notificationService.send({
      type: 'ALERT',
      severity: rule.severity,
      message: rule.name,
      timestamp: Date.now(),
    });

    // Increment alert counter
    this.metrics.increment('alerting.alerts_triggered_total', {
      alertName: rule.name,
      severity: rule.severity,
    });
  }
}
```

---

## Dashboard Metrics

### Real-Time Performance Dashboard

```typescript
interface DashboardMetrics {
  // System health
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number; // seconds

  // Latency
  p50Latency: number; // ms
  p95Latency: number;
  p99Latency: number;

  // Throughput
  eventsPerSecond: number;
  predictionsPerSecond: number;
  ordersPerSecond: number;

  // Trading metrics
  openPositions: number;
  dailyPnL: number;
  totalPnL: number;
  winRate: number; // 0-1

  // Portfolio Greeks
  portfolioGreeks: PortfolioGreeks;

  // Current regime
  currentRegime: RegimeType;
  regimeConfidence: number;
}
```

### Grafana Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│ System Health   │ Latency     │ Throughput      │
├─────────────────┼─────────────┼─────────────────┤
│ ● Healthy       │ P50: 12ms   │ 150 events/s    │
│ Redis: ✓        │ P95: 45ms   │ 25 predictions/s│
│ QuestDB: ✓      │ P99: 87ms   │ 5 orders/s      │
│ MongoDB: ✓      │             │                 │
│ Upstox: ✓       │             │                 │
│ GPU: ✓          │             │                 │
└─────────────────┴─────────────┴─────────────────┘

┌─────────────────────────────────────────────────┐
│ Trading Performance                             │
├─────────────────────────────────────────────────┤
│ Daily P&L: +₹2,350                              │
│ Open Positions: 3                               │
│ Win Rate: 68%                                   │
│                                                 │
│ Portfolio Greeks:                               │
│   Delta: +125   Gamma: +15                      │
│   Vega: +450    Theta: -35                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Current Regime: TRENDING (↑)                    │
│ Confidence: 82%                                 │
├─────────────────────────────────────────────────┤
│ Active Strategy: LONG_CALL                      │
│ Ensemble Confidence: 0.76                       │
└─────────────────────────────────────────────────┘
```

---

## Audit Trail

```typescript
/**
 * SEBI 2024-2025 requires 5-year audit trail
 */
class AuditTrailService {
  async logTrade(trade: Trade) {
    await this.mongo.collection('audit_trail').insertOne({
      timestamp: Date.now(),
      type: 'TRADE',
      userId: trade.userId,
      algoId: trade.algoId,
      orderId: trade.orderId,
      instrumentKey: trade.instrumentKey,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      riskChecks: trade.riskChecks,
      strategyRationale: trade.rationale,
      retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000), // 5 years
    });
  }

  async queryAuditTrail(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AuditEntry[]> {
    return this.mongo
      .collection('audit_trail')
      .find({
        userId,
        timestamp: { $gte: startDate.getTime(), $lte: endDate.getTime() },
      })
      .toArray();
  }
}
```

---

## Configuration

```typescript
export const loggingMonitoringConfig = {
  logging: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    prettyPrint: false, // Set true for dev
    auditRetentionYears: 5,
  },
  metrics: {
    enabled: true,
    port: 9090, // Prometheus scrape endpoint
    prefix: 'algo_worker_',
  },
  healthChecks: {
    enabled: true,
    interval: 10000, // 10 seconds
  },
  alerting: {
    enabled: true,
    checkInterval: 10000, // 10 seconds
    channels: ['email', 'telegram'],
  },
  dashboard: {
    refreshInterval: 1000, // 1 second
    historyWindow: 3600000, // 1 hour
  },
};
```

---

## Monitoring Metrics

- `logging.log_entries_total` (by level)
- `logging.audit_entries_total`
- `metrics.metrics_exported_total`
- `health_checks.status` (by service)
- `alerting.alerts_triggered_total` (by rule)

---

## Testing

```typescript
describe('LoggingMonitoring', () => {
  it('should log with trace ID propagation', () => {
    const traceId = 'test-trace-123';
    logger.log('info', 'TEST_EVENT', { traceId, userId: 'user123' });

    const logs = captureConsoleLogs();
    const logEntry = JSON.parse(logs[0]);

    expect(logEntry.traceId).toBe(traceId);
  });

  it('should trigger alert when latency exceeds threshold', async () => {
    mockP95Latency = 150; // >100ms

    await alerting.checkAlerts();

    expect(alerting.alerts).toContainEqual(
      expect.objectContaining({ name: 'HIGH_LATENCY' }),
    );
  });

  it('should store audit trail with 5-year retention', async () => {
    const trade = { ...mockTrade };

    await auditTrail.logTrade(trade);

    const stored = await mongo
      .collection('audit_trail')
      .findOne({ orderId: trade.orderId });
    expect(stored.retentionUntil).toBeGreaterThan(
      Date.now() + 4 * 365 * 24 * 3600 * 1000,
    );
  });
});
```

---

**See Also**:

- [07-ORDER-MANAGEMENT.md](./07-ORDER-MANAGEMENT.md) - Previous layer
- [09-OFFLINE-TRAINING.md](./09-OFFLINE-TRAINING.md) - Next layer
- [CONTROL.md](../CONTROL.md) - Observability patterns (if exists)
