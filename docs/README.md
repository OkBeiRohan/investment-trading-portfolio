# Documentation Structure

This folder contains **core architecture and system-wide documentation** for Quantum Investments and Trades.

**Last Updated**: March 17, 2026

---

## 📁 Documentation Organization

### Core Architecture

**System Design**:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level system architecture (canonical overview)
- [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) - Complete algo trading system design
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) - Hybrid local-cloud deployment strategy
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development workflow, setup, and best practices
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Implementation roadmap and gap analysis
- [SECURITY.md](./SECURITY.md) - Security policies and best practices
- [migration/README.md](./migration/README.md) - Migration guides for all components

**AI/ML Architecture** (2026 State-of-the-Art):

> 📁 See [ml/README.md](./ml/README.md) for comprehensive AI documentation.

| Document | Description |
|----------|-------------|
| [ml/AI_TRADING_ARCHITECTURE.md](./ml/AI_TRADING_ARCHITECTURE.md) | 5-tier data-bound hierarchy |
| [ml/TIER1_MODELS.md](./ml/TIER1_MODELS.md) | TFT, Mamba, PatchTST, LiT with code |
| [ml/META_LEARNER_EXECUTION.md](./ml/META_LEARNER_EXECUTION.md) | Signal fusion, PPO execution |
| [ml/TRAINING_PIPELINE.md](./ml/TRAINING_PIPELINE.md) | CPCV validation, Kedro, ONNX export |
| [ml/FEATURE_STORE.md](./ml/FEATURE_STORE.md) | Redis + QuestDB for consistency |
| [ml/INFERENCE_PIPELINE.md](./ml/INFERENCE_PIPELINE.md) | **ONNX Runtime in NestJS** |

**Service Documentation**:

- [WEB_API_SERVICES.md](./WEB_API_SERVICES.md) - Dashboard, API gateway, monitoring
- [WEALTH_MANAGEMENT_SERVICES.md](./WEALTH_MANAGEMENT_SERVICES.md) - Personal finance features

**Research & Advanced**:

- [AGENTIC_AI_RESEARCH.md](./AGENTIC_AI_RESEARCH.md) - Multi-agent systems (R&D only)

---

### App-Specific Documentation

**Apps**:

| App | Port | Description | Docs |
|-----|------|-------------|------|
| `algo-worker` | 50051 (gRPC) | Live trading engine with ONNX inference | [README](../apps/algo-worker/README.md) |
| `api` | 3004 (HTTP) / 50050 (gRPC) | NestJS API gateway with tRPC | [README](../apps/api/README.md) |
| `web` | 3000 | Next.js dashboard | [README](../apps/web/README.md) |

**Services**:

| Service | Port | Description | Docs |
|---------|------|-------------|------|
| `market-feeder` | 50052 (gRPC) | Upstox WebSocket data ingestion | [README](../services/market-feeder/README.md) |
| `data-processor` | 50053 (gRPC) | Deprecated (→ compute-engine + market-feeder) | [README](../services/data-processor/README.md) |
| `training-pipeline` | - | Kedro ML training + ONNX export | [README](../services/training-pipeline/README.md) |
| `notification-service` | 50054 (gRPC) | Email/SMS/Push alerts | [README](../services/notification-service/README.md) |
| `wealth-management` | 50056 (gRPC) | Double-entry ledger | [README](../services/wealth-management/README.md) |
| `wealth-analyzer` | 50055 (gRPC) | Python AI insights (Phi-3) | [README](../services/wealth-analyzer/README.md) |
| `document-processor` | 50057 (gRPC) | Python OCR (LayoutLMv3) | [README](../services/document-processor/README.md) |

**Packages**:

| Package | Description | Docs |
|---------|-------------|------|
| `compute-engine` | **Rust NAPI-RS** feature computation (<5ms) | [README](../packages/compute-engine/README.md) |
| `database` | MongoDB, QuestDB, Redis access | [README](../packages/database/README.md) |
| `schema` | Zod schemas, TypeScript types | [README](../packages/schema/README.md) |
| `market-sdk` | Upstox/Binance/Yahoo clients | [README](../packages/market-sdk/README.md) |
| `authentication` | Better Auth integration | [README](../packages/authentication/README.md) |
| `trpc` | tRPC router for API | [README](../packages/trpc/README.md) |
| `observability` | OpenTelemetry integration | [README](../packages/observability/README.md) |

**Infrastructure**:

- [infrastructure/README.md](../infrastructure/README.md) - Docker, Kubernetes, deployment

---

## 🗺️ Quick Navigation by Role

### Backend Developer

1. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Start here
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
3. [apps/api/docs/](../apps/api/docs/) - API patterns

### Quant/ML Researcher

1. [ml/README.md](./ml/README.md) - 📁 **Start here** - AI documentation
2. [ml/AI_TRADING_ARCHITECTURE.md](./ml/AI_TRADING_ARCHITECTURE.md) - 5-tier data-bound hierarchy
3. [ml/TIER1_MODELS.md](./ml/TIER1_MODELS.md) - Model specifications
4. [ml/TRAINING_PIPELINE.md](./ml/TRAINING_PIPELINE.md) - CPCV, Kedro
5. [ml/INFERENCE_PIPELINE.md](./ml/INFERENCE_PIPELINE.md) - ONNX Runtime

### Algo Trader

1. [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) - System design
2. [apps/algo-worker/README.md](../apps/algo-worker/README.md) - Trading engine
3. [packages/compute-engine/README.md](../packages/compute-engine/README.md) - Features

### Rust Developer

1. [packages/compute-engine/README.md](../packages/compute-engine/README.md) - Rust feature engine
2. [packages/compute-engine/docs/](../packages/compute-engine/docs/) - Implementation details

### DevOps/Infrastructure

1. [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) - Local-cloud hybrid
2. [infrastructure/README.md](../infrastructure/README.md) - Docker, K8s
3. [SECURITY.md](./SECURITY.md) - Security policies

---

## 🛠️ Technology Stack Summary

| Layer | Technology | Location |
|-------|------------|----------|
| **Feature Computation** | Rust (NAPI-RS) | `packages/compute-engine` |
| **Model Training** | Python (Kedro) | `services/training-pipeline` |
| **Model Export** | ONNX | Training → Inference |
| **Live Inference** | NestJS + onnxruntime-node | `apps/algo-worker` |
| **API Gateway** | NestJS + tRPC | `apps/api` |
| **Web Dashboard** | Next.js 16 | `apps/web` |
| **Time-Series DB** | QuestDB | `packages/database` |
| **State DB** | MongoDB | `packages/database` |
| **Cache/Pub-Sub** | Redis | `packages/database` |
| **Types** | Zod + TypeScript | `packages/schema` |

---

## 📊 Data Flow

```
TRAINING (Offline - Python/Kedro)
─────────────────────────────────
QuestDB → training-pipeline → ONNX Models → Storage

INFERENCE (Live - Rust + NestJS)
────────────────────────────────
Upstox WS → market-feeder → compute-engine (Rust, <5ms)
                                    ↓
                            algo-worker (ONNX, <50ms)
                                    ↓
                            Risk → Execution → Upstox
```

---

**Status**: Production-Ready Architecture  
**Last Updated**: March 17, 2026
