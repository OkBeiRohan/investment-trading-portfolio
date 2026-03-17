# Quantum Investments & Trades — System Architecture

> **Institutional-grade algorithmic trading platform for NSE Nifty 50 & Bank Nifty index options, with integrated wealth management.**

**Last Updated**: March 17, 2026
**Status**: Production Architecture

---

## Mission

Build a low-latency, AI-driven trading system that combines deterministic event processing with a 5-tier hierarchical ML stack, while maintaining strict SEBI 2025-2026 compliance and delivering a modern investor dashboard.

---

## Monorepo Structure

```
investment-trading-portfolio/
├── apps/
│   ├── algo-worker/        # Live trading engine (NestJS, ONNX inference)
│   ├── api/                # API gateway (NestJS, tRPC v11)
│   └── web/                # Investor dashboard (Next.js 16)
├── services/
│   ├── market-feeder/      # Upstox WebSocket data ingestion
│   ├── training-pipeline/  # Python ML training (CPCV, ONNX export)
│   ├── notification-service/
│   ├── wealth-management/  # Double-entry ledger
│   ├── wealth-analyzer/    # Python AI insights (Phi-3)
│   └── document-processor/ # OCR pipeline (LayoutLMv3)
├── packages/
│   ├── compute-engine/     # Rust NAPI-RS feature computation (<5ms)
│   ├── database/           # MongoDB, QuestDB, Redis clients
│   ├── schema/             # Zod schemas + TypeScript types
│   ├── market-sdk/         # Upstox / Yahoo / Binance adapters
│   ├── authentication/     # Better Auth integration
│   ├── trpc/               # tRPC router definitions
│   └── observability/      # OpenTelemetry instrumentation
└── infrastructure/         # Docker, Kubernetes, deployment configs
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 16 (App Router) | React Server Components, Tailwind |
| **API** | NestJS 11 + tRPC v11 | End-to-end type-safe RPC |
| **Trading Engine** | NestJS 11, ONNX Runtime | Event-driven, sub-100ms tick-to-order |
| **Feature Engine** | Rust (NAPI-RS) | SIMD-accelerated indicators, <5ms |
| **ML Training** | Python, PyTorch 2.5 | CPCV validation, ONNX export |
| **ML Inference** | ONNX Runtime (TensorRT / OpenVINO / CPU) | FP16 quantized, <50ms GPU |
| **Time-Series DB** | QuestDB | Tick data, OHLCV, features |
| **Document DB** | MongoDB 8 | Orders, positions, audit trail |
| **Cache / Event Bus** | Redis 7 (Streams + Pub/Sub) | Hot state, feature store, circuit breakers |
| **Auth** | Better Auth | Session-based, OAuth providers |
| **Types** | Zod → TypeScript | Single source of truth in `@repo/schema` |
| **Monorepo** | Turborepo + pnpm | Parallel builds, shared packages |

---

## Data Flow

```
LIVE INFERENCE
──────────────
Upstox WebSocket ──► market-feeder ──► Redis Streams
                                            │
                         ┌──────────────────┘
                         ▼
                  compute-engine (Rust, <5ms)
                    feature vectors
                         │
                         ▼
                  algo-worker (ONNX Runtime)
                    5-tier prediction
                         │
                         ▼
                  Strategy + Risk Manager
                         │
                         ▼
                  Execution ──► Upstox Order API
                         │
                    ┌─────┴─────┐
                    ▼           ▼
                 QuestDB     MongoDB
               (time-series) (audit)

OFFLINE TRAINING
────────────────
QuestDB ──► training-pipeline (Python)
               │
               ├── CPCV split + label generation
               ├── Train Tier 0-3 models
               ├── Train Tier 4 meta-learner
               ├── ONNX export (FP16)
               └── MLflow registry ──► algo-worker hot-swap
```

---

## 5-Tier AI Model Hierarchy

The prediction layer implements a **data-bound hierarchical architecture** where each tier operates on a distinct time-scale and information source.

| Tier | Name | Horizon | Key Models | Input |
|------|------|---------|------------|-------|
| **0** | Gap Predictor | Overnight | LightGBM | Global cues, ADRs, futures |
| **1** | Macro Director | 5-15 min | LightGBM, XGBoost | 50+ features (Greeks, momentum, structure) |
| **2** | Intraday Navigator | 5 min – EOD | TFT, PatchTST, Mamba | Time-series tensors, regime signals |
| **3** | Microstructure Scalper | 10s – 1 min | LiT (LOB Transformer) | Depth-20 order book tensors |
| **4** | Meta-Learner | Adaptive | Gating network | All tier outputs + market context |

Tier 4 dynamically weights lower-tier predictions based on regime, volatility, and spread conditions. Models are independently disable-able; Tier 1 (LightGBM) failure halts trading.

> **Detailed documentation**: [docs/ml/MODEL_ARCHITECTURE.md](./ml/MODEL_ARCHITECTURE.md) · [docs/ml/TIER1_MODELS.md](./ml/TIER1_MODELS.md) · [docs/ml/META_LEARNER_EXECUTION.md](./ml/META_LEARNER_EXECUTION.md)

---

## Database Strategy

```
┌─────────────────────────────────────────────┐
│  Redis 7  (HOT — sub-millisecond)           │
│  • Active positions, order book snapshots   │
│  • Feature store (online serving)           │
│  • Pub/Sub event bus (Streams)              │
│  • Circuit breaker state, rate limiting     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  QuestDB  (WARM — time-series)              │
│  • Tick data (nanosecond timestamps)        │
│  • OHLCV candles (1m → 1d)                  │
│  • Computed features & Greeks snapshots     │
│  • 22× faster than ClickHouse for OHLCV    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  MongoDB 8  (COLD — documents)              │
│  • Orders, positions, trading signals       │
│  • User profiles & auth sessions            │
│  • Audit trail (5-year SEBI retention)      │
│  • RL agent states, performance metrics     │
└─────────────────────────────────────────────┘
```

> **Feature store design**: [docs/ml/FEATURE_STORE.md](./ml/FEATURE_STORE.md)

---

## Observability Stack

**OpenTelemetry → Grafana LGTM**

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Logs** | Loki | Structured JSON logs from all services |
| **Metrics** | Mimir (Prometheus-compatible) | Latency histograms, P&L, fill rates |
| **Traces** | Tempo | Distributed traces across tick-to-order path |
| **Dashboards** | Grafana | Real-time trading dashboards |

Key metrics monitored: tick-to-trade latency (p50/p95/p99), model confidence distribution, strategy win rate, daily Sharpe, order fill rate, slippage.

> **Instrumentation package**: [packages/observability/](../packages/observability/)

---

## SEBI 2025-2026 Compliance

**Deadline**: April 1, 2026 — full retail algorithmic trading compliance.

| Requirement | Implementation |
|-------------|---------------|
| **Unique Algo ID** | Every order tagged: `QUANTUM_{date}_{version}_{strategy}` |
| **Pre-trade risk checks** | Position limits, margin, Greeks exposure validated before API call |
| **Broker monitoring** | Real-time anomaly detection via Upstox API |
| **Audit trail** | Full context (signals, features, model outputs) in MongoDB, 5-year retention |
| **Model explainability** | Weekly SHAP computation, feature importance drift alerts (>30% change) |
| **Exchange registration** | Required if order frequency >10 orders/sec |

---

## Disaster Recovery

Automatic shutdown triggers:

- Daily loss > ₹50,000 or drawdown > 20%
- Tick-to-trade latency > 500ms
- Data feed stale > 5 seconds
- Risk limit breach (Greeks, margin)

Recovery: automatic position liquidation → Slack/email alerts → manual override required to resume.

---

## Cross-References

| Document | Scope |
|----------|-------|
| [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) | Deep-dive: 9-layer system design, DRL execution, latency techniques |
| [docs/ml/README.md](./ml/README.md) | ML documentation hub |
| [docs/ml/MODEL_ARCHITECTURE.md](./ml/MODEL_ARCHITECTURE.md) | 5-tier model hierarchy with code |
| [docs/ml/TRAINING_PIPELINE.md](./ml/TRAINING_PIPELINE.md) | CPCV validation, ONNX export pipeline |
| [docs/ml/FEATURE_STORE.md](./ml/FEATURE_STORE.md) | Redis + QuestDB feature store |
| [docs/ml/INFERENCE_PIPELINE.md](./ml/INFERENCE_PIPELINE.md) | ONNX Runtime in NestJS |
| [WEB_API_SERVICES.md](./WEB_API_SERVICES.md) | Dashboard, API gateway, monitoring |
| [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) | Hybrid local-cloud deployment |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Setup, workflow, debugging |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | Roadmap and gap analysis |
| [AGENTIC_AI_RESEARCH.md](./AGENTIC_AI_RESEARCH.md) | Multi-agent systems (R&D only, not production) |
