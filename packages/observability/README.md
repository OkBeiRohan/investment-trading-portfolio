# @repo/observability

> **OpenTelemetry-based observability stack for distributed tracing, metrics, and logging.**

**Last Updated**: January 18, 2026

---

## Purpose

The observability package provides centralized instrumentation:

1. **Distributed Tracing**: Track requests across services
2. **Metrics**: Prometheus-compatible metrics export
3. **Logging**: Structured JSON logging with correlation IDs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY STACK                                  │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │ OpenTelemetry   │ →  │ OTLP Collector  │ →  │ Backends        │         │
│   │ SDK             │    │                 │    │                 │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                          ↓                   │
│              ┌──────────────────────────────────────────────────────────┐   │
│              │ Jaeger (Traces) | Prometheus (Metrics) | Loki (Logs)     │   │
│              └──────────────────────────────────────────────────────────┘   │
│                                        ↓                                     │
│                              ┌─────────────────┐                            │
│                              │ Grafana         │                            │
│                              │ (Visualization) │                            │
│                              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

- ✅ Auto-instrumentation for NestJS
- ✅ HTTP request tracing
- ✅ MongoDB query tracing
- ✅ Redis operation tracing
- ✅ Custom span creation
- ✅ Prometheus metrics export
- ✅ Structured JSON logging

---

## Installation

```bash
# From service (e.g., algo-worker)
pnpm add @repo/observability
```

---

## Usage

### NestJS Integration

```typescript
// app.module.ts
import { ObservabilityModule } from '@repo/observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: 'algo-worker',
      environment: process.env.NODE_ENV,
      otlpEndpoint: process.env.OTLP_ENDPOINT,
    }),
  ],
})
export class AppModule {}
```

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('algo-worker');

async function runInference(features: Float32Array) {
  const span = tracer.startSpan('onnx.inference');
  try {
    const result = await this.onnxService.predict(features);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Metrics

```typescript
import { metrics } from '@repo/observability';

// Counter
const ordersPlaced = metrics.createCounter('orders_placed_total', {
  description: 'Total orders placed',
});
ordersPlaced.add(1, { strategy: 'LONG_STRADDLE' });

// Histogram
const inferenceLatency = metrics.createHistogram('inference_latency_ms', {
  description: 'ML inference latency',
  boundaries: [10, 25, 50, 100, 250, 500],
});
inferenceLatency.record(45, { model: 'lightgbm' });

// Gauge
const openPositions = metrics.createGauge('open_positions', {
  description: 'Current open positions',
});
openPositions.record(3);
```

### Logging

```typescript
import { Logger } from '@repo/observability';

const logger = new Logger('TradingOrchestrator');

logger.info('Order placed', {
  orderId: 'ORD123',
  symbol: 'NIFTY24JAN18000CE',
  quantity: 50,
});

logger.error('Order failed', {
  orderId: 'ORD124',
  error: error.message,
});
```

---

## Configuration

### Environment Variables

```bash
# OpenTelemetry
OTEL_SERVICE_NAME=algo-worker
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Prometheus
PROMETHEUS_PORT=9090

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Key Metrics

### Trading Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `orders_placed_total` | Counter | Total orders placed |
| `orders_filled_total` | Counter | Total orders filled |
| `order_latency_ms` | Histogram | Order placement latency |
| `position_pnl` | Gauge | Current position PnL |

### ML Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `inference_latency_ms` | Histogram | Model inference time |
| `feature_computation_ms` | Histogram | Feature computation time |
| `model_prediction_confidence` | Histogram | Prediction confidence |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `websocket_reconnects` | Counter | WebSocket reconnections |
| `redis_latency_ms` | Histogram | Redis operation latency |
| `questdb_write_latency_ms` | Histogram | QuestDB write latency |

---

## Dashboards

Pre-built Grafana dashboards are in `infrastructure/grafana/`:

1. **Trading Performance**: Orders, fills, latency
2. **ML Pipeline**: Inference latency, confidence
3. **System Health**: Memory, CPU, connections

---

## Language Support

| Language | Support |
|----------|---------|
| TypeScript | `src/` - Full OpenTelemetry SDK |
| Python | `python/` - For training-pipeline |
| Rust | `rust/` - For compute-engine |

---

## Related Documentation

- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - System architecture
- [infrastructure/README.md](../../infrastructure/README.md) - Monitoring stack

---

**Status**: Active  
**Technology**: OpenTelemetry, Prometheus, Jaeger, Grafana
