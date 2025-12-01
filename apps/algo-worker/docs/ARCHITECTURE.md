# Algo Worker - 7-Layer Cognitive Architecture

## Overview

The `algo-worker` implements a **7-Layer Cognitive Architecture** designed for institutional-grade algorithmic trading with sub-150ms end-to-end latency.

## The 7 Layers

### 1. Perception Layer (Event Consumption)

- **Service**: `MarketDataConsumer`, `NewsConsumer`
- **Tech**: Redis Streams (event-driven)
- **Data**: Market ticks, quotes, option chain, order book
- **Output**: Raw market events published to event bus

### 2. Cortex Layer (Feature Engineering)

- **Service**: `FeatureEngineService`, `FeatureCacheService`
- **Tech**: TypeScript + Sliding window caching
- **Features**: 50 technical indicators (RSI, MACD, Realized Vol, Greeks, etc.)
- **Output**: Feature vectors (Float32Array)

### 3. Prediction Layer (ML Inference)

- **Service**: `ModelLoaderService`, `EnsembleInferenceService`
- **Models**:
  - **Level-0 Core**: XGBoost, LightGBM, CNN-LSTM, GINN, SVM, Transformer (6 models)
  - **Level-0 Optional**: TimesNet-MLP, WFTNet-MLP (feature-enhanced)
  - **Level-1 Meta-Learner**: Logistic Regression stacker
- **Tech**: ONNX Runtime with TensorRT/OpenVINO
- **Output**: Trading signal probability (0-1) with confidence

### 4. Cognition Layer (Strategy & Risk Management)

- **Service**: `StrategySelectionService`, `RiskManagerService`, `RLAgentService` (optional)
- **Logic**:
  - Receives prediction signal
  - Validates portfolio state (Greeks, margin, position limits)
  - Selects option strategy (LONG_STRADDLE, IRON_CONDOR, BULL_PUT_SPREAD, etc.)
  - Determines position size (fixed or RL-based)
- **Output**: Validated target allocation

### 5. Execution Layer (Order Placement)

- **Service**: `OrderPlacementService`, `ExecutionMonitorService`
- **Logic**: Smart Order Routing with TWAP/VWAP execution
- **API**: Upstox REST API
- **Output**: Order confirmations, position updates

### 6. Memory Layer (Multi-Tier Storage)

- **Hot Storage**: Redis (sub-second access for active positions, signals)
- **Warm Storage**: QuestDB (time-series data - ticks, features, PnL)
- **Cold Storage**: MongoDB (5-year audit trail - orders, signals, positions)

### 7. Control Layer (Observability)

- **Monitoring**: Prometheus metrics at `/metrics`
- **Health Checks**: Circuit breakers for data staleness, latency, risk breaches
- **Tracing**: Structured JSON logging with trace IDs

## Data Flow

```
[market-feeder] → Redis Streams (market-data)
         ↓
[Layer 1: Perception] - MarketDataConsumer
         ↓ (MarketDataReceivedEvent)
[Layer 2: Cortex] - Feature Engineering
         ↓ (FeaturesComputedEvent)
[Layer 3: Prediction] - ONNX Ensemble Inference (6-8 L0 + 1 L1)
         ↓ (PredictionCompletedEvent)
[Layer 4: Cognition] - Strategy Selection + Risk Management
         ↓ (OrderValidatedEvent)
[Layer 5: Execution] - Smart Order Routing
         ↓ (OrderExecutedEvent)
[Layer 6: Memory] - Hot/Warm/Cold Storage
         ↓
[Layer 7: Control] - Metrics + Circuit Breakers
```

## Key Design Principles

1. **Event-Driven**: All layer communication via internal event bus (NestJS EventEmitter2)
2. **Sub-150ms Latency**: GPU-accelerated inference, pre-allocated buffers, no blocking I/O
3. **Fail-Safe**: Circuit breakers halt trading on anomalies (stale data, risk breach, latency spike)
4. **SEBI Compliant**: Unique Algo IDs, mandatory pre-trade checks, 5-year audit trail
5. **Ensemble Approach**: 6-8 diverse ML models for robust predictions (AUC >0.75-0.77)
