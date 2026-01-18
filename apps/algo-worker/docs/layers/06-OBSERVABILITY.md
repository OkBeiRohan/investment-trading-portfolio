# Layer 6: Observability & Persistence

**Purpose**: Metrics collection, logging, circuit breakers, and multi-tier state storage

---

## Overview

The Observability layer provides real-time monitoring, SEBI-compliant audit trail, and multi-tier storage (hot/warm/cold).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 6: OBSERVABILITY & PERSISTENCE                    │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ METRICS         │  │ LOGGING         │  │ ALERTING        │             │
│  │ Prometheus      │  │ Winston/Pino    │  │ PagerDuty       │             │
│  │ Grafana         │  │ Structured JSON │  │ Slack           │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        STORAGE TIERS                                 │   │
│  │ HOT (Redis)     │ WARM (QuestDB)      │ COLD (MongoDB)              │   │
│  │ <5min data      │ 180 days features   │ 5 years audit               │   │
│  │ Positions       │ Tick data           │ Orders/Signals              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Metrics Service (Prometheus)

```typescript
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  
  // Latency histograms
  readonly inferenceLatency = new Histogram({
    name: 'algo_inference_duration_ms',
    help: 'ML inference latency in milliseconds',
    labelNames: ['model'],
    buckets: [5, 10, 20, 50, 100, 200],
  });
  
  // Signal counters
  readonly signalsGenerated = new Counter({
    name: 'algo_signals_total',
    help: 'Trading signals generated',
    labelNames: ['direction', 'regime'],
  });
  
  // Position gauges
  readonly openPositions = new Gauge({
    name: 'algo_positions_open',
    help: 'Current open positions count',
    labelNames: ['instrument'],
  });
  
  // Daily PnL gauge
  readonly dailyPnL = new Gauge({
    name: 'algo_daily_pnl',
    help: 'Daily PnL in rupees',
  });
  
  // Circuit breaker state
  readonly circuitBreakerState = new Gauge({
    name: 'algo_circuit_breaker_state',
    help: '1=OPEN (halted), 0=CLOSED (trading)',
    labelNames: ['reason'],
  });
}
```

### Key Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `algo_e2e_latency_ms` | Histogram | layer | End-to-end latency |
| `algo_inference_duration_ms` | Histogram | model | Per-model inference |
| `algo_signals_total` | Counter | direction, regime | Signal generation |
| `algo_orders_total` | Counter | side, status | Order tracking |
| `algo_positions_open` | Gauge | instrument | Position count |
| `algo_daily_pnl` | Gauge | - | PnL tracking |
| `algo_circuit_breaker_state` | Gauge | reason | System health |

### Logging Service

```typescript
@Injectable()
export class LoggingService {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  
  logTrade(event: TradeEvent) {
    this.logger.info({
      type: 'TRADE',
      orderId: event.orderId,
      symbol: event.symbol,
      side: event.side,
      quantity: event.quantity,
      price: event.price,
      algoId: event.algoId,
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }
  
  logSignal(signal: TradingSignal) {
    this.logger.info({
      type: 'SIGNAL',
      direction: signal.direction,
      confidence: signal.confidence,
      regime: signal.regime,
      modelWeights: signal.fusionWeights,
      timestamp: signal.timestamp,
    });
  }
  
  logCircuitBreaker(state: CircuitState, reason: string) {
    this.logger[state === 'OPEN' ? 'error' : 'info']({
      type: 'CIRCUIT_BREAKER',
      state,
      reason,
      timestamp: Date.now(),
    });
  }
}
```

### Health Check Service

```typescript
@Injectable()
export class HealthCheckService {
  async check(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkRedis(),
      this.checkQuestDB(),
      this.checkMongoDB(),
      this.checkModels(),
      this.checkMarketData(),
    ]);
    
    const allHealthy = checks.every(c => c.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: Date.now(),
    };
  }
  
  private async checkMarketData(): Promise<HealthCheck> {
    const lastTick = await this.redis.get('market:last_tick');
    const age = Date.now() - parseInt(lastTick || '0');
    
    return {
      name: 'market_data',
      status: age < 5000 ? 'healthy' : 'unhealthy',
      message: age < 5000 ? 'Data fresh' : `Stale data (${age}ms old)`,
    };
  }
}
```

---

## Multi-Tier Storage

### Storage Architecture

| Tier | Technology | Data | Retention | Access |
|------|------------|------|-----------|--------|
| **HOT** | Redis | Positions, prices, state | <5 min | <1ms |
| **WARM** | QuestDB | Features, ticks | 180 days | <10ms |
| **COLD** | MongoDB | Orders, signals, audit | 5 years | <100ms |

### Redis (Hot Tier)

```typescript
@Injectable()
export class RedisStateService {
  // Current positions
  async updatePosition(position: Position): Promise<void> {
    await this.redis.hset('positions:hot', position.id, JSON.stringify(position));
    await this.redis.expire('positions:hot', 300); // 5 min TTL
  }
  
  // Latest prices
  async updatePrice(symbol: string, price: number): Promise<void> {
    await this.redis.hset('prices:latest', symbol, price.toString());
  }
  
  // Trading state
  async setTradingState(state: TradingState): Promise<void> {
    await this.redis.set('trading:state', JSON.stringify(state));
  }
}
```

### QuestDB (Warm Tier)

```typescript
@Injectable()
export class QuestDBWriterService {
  // Insert computed features
  async insertFeatures(features: FeatureOutput): Promise<void> {
    await this.sender
      .table('training_features_54')
      .symbol('instrument', 'NIFTY')
      .float64Column('pct_stocks_above_vwap', features.pct_stocks_above_vwap)
      .float64Column('fut_rsi_14', features.fut_rsi_14)
      // ... 52 more features
      .at(features.timestamp, 'ms');
  }
  
  // Insert tick data
  async insertTick(tick: MarketTick): Promise<void> {
    await this.sender
      .table('tick_data')
      .symbol('instrument', tick.symbol)
      .float64Column('ltp', tick.ltp)
      .int64Column('volume', tick.volume)
      .at(tick.timestamp, 'ms');
  }
}
```

### MongoDB (Cold Tier)

```typescript
@Injectable()
export class MongoDBSyncService {
  // Audit trail for SEBI compliance
  async logOrder(order: OrderEvent): Promise<void> {
    await this.orderCollection.insertOne({
      ...order,
      algoId: order.algoId,
      createdAt: new Date(),
      // 5-year TTL index
    });
  }
  
  // Signal archive
  async archiveSignal(signal: TradingSignal): Promise<void> {
    await this.signalCollection.insertOne({
      ...signal,
      archivedAt: new Date(),
    });
  }
}
```

---

## Alerting

```typescript
@Injectable()
export class AlertingService {
  async sendCritical(message: string): Promise<void> {
    await Promise.all([
      this.slack.send({ channel: '#algo-alerts', text: `🚨 CRITICAL: ${message}` }),
      this.pagerDuty.trigger({ severity: 'critical', description: message }),
    ]);
  }
  
  async sendWarning(message: string): Promise<void> {
    await this.slack.send({ channel: '#algo-alerts', text: `⚠️ WARNING: ${message}` });
  }
}
```

### Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| Circuit breaker trip | Critical | PagerDuty + Slack |
| Latency >150ms (p95) | Warning | Slack |
| Model accuracy <50% | Warning | Slack |
| Daily loss limit 80% | Warning | Slack |
| Daily loss limit 100% | Critical | PagerDuty + halt |

---

## SEBI Compliance: 5-Year Audit Trail

```typescript
// MongoDB TTL index for 5-year retention
db.orders.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 5 * 365 * 24 * 60 * 60 } // 5 years
);

// Audit log schema
interface AuditLog {
  timestamp: Date;
  eventType: 'ORDER' | 'SIGNAL' | 'RISK_CHECK' | 'CIRCUIT_BREAKER';
  algoId: string;
  userId: string;
  details: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    version: string;
  };
}
```

---

## Grafana Dashboards

### Dashboard Panels

1. **Latency Overview**
   - E2E latency (p50, p95, p99)
   - Per-layer latency breakdown
   - Latency heatmap

2. **Trading Activity**
   - Signals/minute by direction
   - Orders/minute by side
   - Fill rate

3. **Position & PnL**
   - Open positions count
   - Daily PnL curve
   - Greeks exposure

4. **System Health**
   - Circuit breaker state
   - Connection status
   - Model accuracy (rolling)

---

## Monitoring Metrics

```typescript
// All observability metrics
const METRICS = [
  'algo_e2e_latency_ms',
  'algo_inference_duration_ms',
  'algo_feature_computation_ms',
  'algo_signals_total',
  'algo_orders_total',
  'algo_fills_total',
  'algo_positions_open',
  'algo_daily_pnl',
  'algo_circuit_breaker_state',
  'algo_health_check_status',
  'algo_redis_latency_ms',
  'algo_questdb_write_latency_ms',
  'algo_mongodb_write_latency_ms',
];
```

---

## Testing

```typescript
describe('ObservabilityLayer', () => {
  it('should record latency metrics', () => {
    metricsService.inferenceLatency.observe({ model: 'lightgbm' }, 25);
    const metrics = registry.getSingleMetric('algo_inference_duration_ms');
    expect(metrics).toBeDefined();
  });
  
  it('should detect stale market data', async () => {
    await redis.set('market:last_tick', (Date.now() - 10000).toString());
    const health = await healthCheck.checkMarketData();
    expect(health.status).toBe('unhealthy');
  });
});
```

---

**See Also**:
- [05-EXECUTION.md](./05-EXECUTION.md) - Previous layer
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System overview
