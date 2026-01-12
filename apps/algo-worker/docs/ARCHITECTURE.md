# Algo Worker - Event-Driven Trading Architecture

## Overview

The `algo-worker` implements an **event-driven, microservices-based architecture** designed for institutional-grade algorithmic trading with sub-150ms end-to-end latency. This design aligns with the comprehensive [Algo Trading Architecture](../../../docs/ALGO_TRADING_ARCHITECTURE.md) while providing implementation-specific details for the NestJS-based system.

**Key Architectural Principle**: This implementation uses an event-driven message bus (Redis Streams) with modular microservices for each processing stage—enabling adaptive regime detection, continuous learning, and ultra-low latency execution.

## The 9-Layer Architecture

This implementation follows the comprehensive [Algo Trading Architecture](../../../docs/ALGO_TRADING_ARCHITECTURE.md) with all 9 layers:

### 1. Data Ingestion Layer

- **Service**: `MarketDataConsumer`, `NewsConsumer`
- **Tech**: Redis Streams (event-driven), Upstox WebSocket
- **Data**: 1s OHLCV, L20 order book, Greeks, spot/futures
- **Output**: Timestamped market events
- **See**: [layers/01-DATA-INGESTION.md](./layers/01-DATA-INGESTION.md)

### 2. Cortex (Feature Engineering + Market State Encoder)

- **Service**: `MarketStateEncoder`, `FeatureEngineService`, `FeatureCacheService`, `IndexAggregator`, `BreadthComputer`, `AlignmentScorer`, `LOBTensorBuilder`, `RegimeFeatureBuilder`, `ExecutionStateBuilder`
- **Tech**: TypeScript + TypedArrays, vectorized operations, SharedArrayBuffer for zero-copy
- **Architecture**: Multi-instrument aggregation → model-specific compressed views
- **Key Principle**: Models NEVER see raw 50+ instruments, they see aggregated state
- **Inputs**: NIFTY FUTURE (OHLCV + LOB depth-20) + 50 constituents (OHLCV + depth) + Option chain (Greeks + OI + LOB)
- **Outputs**:
  - LightGBM: Float32Array(33) - index aggregation + futures + options + time context
  - TFT: Float32Array(120×15) - temporal aggregates for regime classification
  - LiT: Float32Array(60×80) - NIFTY FUTURE LOB tensors only
  - DRL PPO: Execution state (option LOB + underlying + order state)
- **Data Quality**: Staleness checks, spread validation, depth completeness
- **See**: [layers/02-CORTEX.md](./layers/02-CORTEX.md), [../../../docs/MARKET_STATE_ENCODER.md](../../../docs/MARKET_STATE_ENCODER.md)

### 3. Market Structure & Regime Detector

- **Service**: `RegimeDetectorService`, `SwingZoneDetector`
- **Tech**: HMMs, Kalman filters, technical heuristics
- **Regimes**: Trending, ranging, volatile, low-volatility
- **Output**: Regime classification + swing zones
- **See**: [layers/03-REGIME-DETECTOR.md](./layers/03-REGIME-DETECTOR.md)

### 4. Signal/Prediction Engine (Multi-Scale Intelligence)

- **Service**: `ModelLoaderService`, `EnsembleInferenceService`, `PredictionWorkerPool`
- **Architecture**: 3-tier hierarchical prediction system
- **Models**:
  - **Level-0A: Micro-Alpha** - LiT (Limit Order Book Transformer) for 10s-1min microstructure signals
  - **Level-0B: Macro Direction** - LightGBM (CORE model), XGBoost for 5-15min directional forecasting
  - **Level-0C: Regime & Volatility** - TFT (Temporal Fusion Transformer) for multi-horizon forecasting
  - **Optional**: PatchTST, KAN, ViT for research/advanced use cases
  - **Level-1 Meta-Learner**: Contextual gating network for adaptive model fusion
- **Tech**: ONNX Runtime (TensorRT/OpenVINO), Worker Threads
- **Output**: Trading signals (VOL_UP/VOL_DOWN/NEUTRAL) + confidence + model weights + reasoning
- **See**: [layers/04-PREDICTION-ENGINE.md](./layers/04-PREDICTION-ENGINE.md)

**Key Innovation**: Hierarchical intelligence where:

- LiT detects microstructure pressure (LOB depth-20)
- LightGBM provides core directional forecast (50+ features)
- TFT classifies regime and forecasts volatility
- Meta-learner adaptively weights based on market state

### 5. Strategy Manager

- **Service**: `StrategySelectionService`, `StrikeSelector`
- **Strategies**: LONG_CALL, LONG_PUT, LONG_STRADDLE, IRON_CONDOR, spreads
- **Logic**: Regime-based strategy routing, RL-based selection (optional)
- **Output**: Selected strategy with strike/expiry
- **See**: [layers/05-STRATEGY-MANAGER.md](./layers/05-STRATEGY-MANAGER.md)

### 6. Risk & Portfolio Manager

- **Service**: `RiskValidationService`, `PositionSizingService`, `CircuitBreaker`
- **Logic**: Kelly criterion, Greeks limits, VIX-scaled stop loss
- **Output**: Validated orders with position sizes
- **See**: [layers/06-RISK-MANAGER.md](./layers/06-RISK-MANAGER.md)

### 7. Order Management & Execution

- **Service**: `OrderManagerService`, `ExecutionEngineService`, `PositionManagerService`, `DRLExecutionAgent` (optional)
- **Logic**: Smart order routing (NSE/BSE), Traditional execution (TWAP/VWAP) + DRL PPO optimization
- **API**: Upstox REST API
- **Output**: Order fills, position tracking, exit signals, execution analytics
- **See**: [layers/07-ORDER-MANAGEMENT.md](./layers/07-ORDER-MANAGEMENT.md)

**DRL PPO Execution Agent** (Advanced):

- **Purpose**: Minimize slippage through learned optimal execution
- **Scope**: ONLY execution optimization (never decides direction/strategy)
- **State**: LOB snapshot, remaining qty, spread, volatility
- **Actions**: Limit price offset, slice size, wait time
- **Reward**: -slippage - delay_penalty - adverse_selection
- **Fallback**: Traditional execution if agent underperforms

### 8. Logging & Monitoring

- **Service**: `LoggingService`, `MetricsCollector`, `HealthCheckService`, `AlertingService`
- **Tech**: Prometheus, Grafana, Winston/Pino, MongoDB audit trail
- **Output**: Real-time metrics, alerts, 5-year audit trail
- **See**: [layers/08-LOGGING-MONITORING.md](./layers/08-LOGGING-MONITORING.md)

### 9. Offline Training & Deployment

- **Service**: External `training-pipeline` (Kedro + Python)
- **Logic**: CPCV, ensemble training, backtesting, ONNX export
- **Output**: Production-ready ONNX models, MLflow registry
- **See**: [layers/09-OFFLINE-TRAINING.md](./layers/09-OFFLINE-TRAINING.md), [training-pipeline docs](../../../services/training-pipeline/)

## Data Flow

```
[Upstox WebSocket] → Redis Streams (market-data)
         ↓
[Layer 1: Data Ingestion] - MarketDataGateway
         ↓ (MarketDataEvent)
[Layer 2: Feature Engine] - Feature Computation
         ↓ (FeaturesComputedEvent)
[Layer 3: Regime Detector] - HMM/Kalman Classification
         ↓ (RegimeDetectedEvent)
[Layer 4: Prediction Engine] - ONNX Ensemble (Worker Threads)
         ↓ (TradingSignal)
[Layer 5: Strategy Manager] - Strategy Selection
         ↓ (Strategy)
[Layer 6: Risk Manager] - Pre-trade Validation
         ↓ (ValidatedOrder)
[Layer 7: Order Management] - Smart Routing & Execution
         ↓ (OrderFilledEvent)
[Layer 7: Position Manager] - Track & Monitor Exits
         ↓ (PositionOpenedEvent, ExitSignalEvent, PositionClosedEvent)
[Layer 8: Logging & Monitoring] - Metrics + Audit Trail
         ↓
[Layer 9: Offline Training] - Model Updates (Weekly)
```

## Key Design Principles

1. **Event-Driven Microservices**: Message bus (Redis Streams) with microsecond delivery, eliminates HTTP latency
2. **Adaptive Learning**: Real-time regime detection with online model updates and drift detection
3. **User-Configurable Trading**: Each user has custom trading preferences stored in MongoDB (permissions, limits, strategies)
4. **Resource-Efficient**: Only analyze instruments and strategies enabled by at least one active user (95% cost reduction)
5. **Sub-150ms Latency**: GPU-accelerated inference, pre-allocated buffers, no blocking I/O
6. **Fail-Safe**: Circuit breakers halt trading on anomalies (stale data, risk breach, latency spike)
7. **SEBI 2024-2026 Compliant**: Unique Algo IDs, pre-trade checks, SHAP explainability, 5-year audit trail
8. **Ensemble Approach**: 6-10 diverse ML models for robust predictions (AUC >0.75-0.77)
9. **Smart Order Routing**: Strike selection with Greeks, IOC orders for large sizes, NSE/BSE optimization

---

## Architecture Design Principles

1. **9-Layer Separation**: Each layer has single responsibility with clear boundaries
2. **Event-Driven Core**: All inter-layer communication via Redis Streams (microsecond latency)
3. **Adaptive Learning**: Real-time regime detection with HMMs/Kalman filters
4. **User-Configurable**: Only analyze instruments/strategies enabled by active users
5. **Sub-100ms Latency**: GPU inference in Worker Threads, zero-copy buffers
6. **Fail-Safe**: Circuit breakers at every layer (data, prediction, risk, execution)
7. **SEBI Compliant**: Unique algo IDs, pre-trade checks, 5-year audit trail
8. **Production-Grade**: Prometheus metrics, health checks, comprehensive testing

---

## User Trading Configuration

### **Configuration-Driven Architecture**

Algo-worker analyzes **only what users need** to optimize computational resources:

```typescript
// Example: Two users with different configs
User A: { allowBuyCalls: true, allowSellCalls: false, strategies: ['LONG_STRADDLE'] }
User B: { allowBuyCalls: false, allowSellCalls: true, strategies: ['IRON_CONDOR'] }

// System analyzes: Buy Calls + Sell Calls (union of both users)
// Signals generated: LONG_STRADDLE (User A), IRON_CONDOR (User B)
// Orders executed: Based on individual user permissions
```

### **Configuration Schema** (MongoDB `user_trading_configs` collection)

```typescript
interface UserTradingConfig {
  userId: string;
  enabled: boolean; // Master switch

  // Trading Permissions
  permissions: {
    allowBuyCalls: boolean;
    allowSellCalls: boolean; // Naked call writing
    allowBuyPuts: boolean;
    allowSellPuts: boolean; // Naked put writing
    allowSpreads: boolean; // Multi-leg strategies
    allowNakedPositions: boolean;
    allowCoveredPositions: boolean;
    allowIntraday: boolean;
    allowOvernightPositions: boolean;
  };

  // Financial Limits
  limits: {
    maxDailyTradeAmount: number; // ₹50,000
    maxSingleTradeAmount: number; // ₹10,000
    maxTotalExposure: number; // ₹100,000
    maxPositionSizePerSymbol: number; // ₹25,000
    maxConcurrentPositions: number; // 5
    minCashReservePercent: number; // 20%
  };

  // Risk Management
  risk: {
    stopLossPercent: number; // User adjustment: -10% to +10% of algo default
    takeProfitPercent: number; // Optional, null = let algo decide
    maxDailyDrawdown: number; // ₹5,000
    maxWeeklyDrawdown: number; // ₹15,000
    maxLeverage: number; // 1.0 - 3.0
    positionSizingStrategy: 'FIXED' | 'KELLY' | 'RL_BASED';
    greeksLimits: {
      maxDelta: number; // Portfolio delta exposure
      maxGamma: number;
      maxTheta: number;
      maxVega: number;
    };
  };

  // Strategy Preferences
  strategies: {
    allowed: string[]; // ['LONG_STRADDLE', 'IRON_CONDOR', ...]
    minSignalConfidence: number; // 0.5 - 0.9
    preferredVolatilityRegime: 'HIGH' | 'LOW' | 'ALL';
    timeHorizons: string[]; // ['5m', '15m', '1h', 'EOD']
  };

  // Model Preferences
  models: {
    enabledModels: string[]; // ['xgboost', 'lightgbm', 'cnn_lstm', ...]
    minEnsembleAgreement: number; // 0.6 = 60% models must agree
  };

  // Execution Preferences
  execution: {
    algorithm: 'MARKET' | 'TWAP' | 'VWAP';
    slippageTolerance: number; // 0.1%
    orderValidity: 'IOC' | 'DAY' | 'GTC';
    maxRetryAttempts: number; // 3
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### **Configuration Loading Strategy**

1. **On Market Open**: Load all active user configs (where `enabled: true`)
2. **Compute Union**:
   ```typescript
   const activeInstruments = getUnionOfEnabledInstruments(allConfigs);
   const activeStrategies = getUnionOfEnabledStrategies(allConfigs);
   ```
3. **Filter Before Prediction**: Only pass relevant features to ML models
4. **Filter Before Execution**: Validate each order against user-specific config

### **Resource Optimization Example**

**Scenario**: 100 users, only 2 active today

- User A: Enabled CALL buying on NIFTY
- User B: Enabled PUT buying on BANKNIFTY

**Traditional Approach** (Wasteful):

- Analyze: NIFTY + BANKNIFTY + 48 other symbols (all) ❌
- Strategies: All 8 strategies for all symbols ❌
- Models: Run full ensemble for everything ❌

**Config-Driven Approach** (Efficient):

- Analyze: NIFTY (calls) + BANKNIFTY (puts) ✅
- Strategies: Only relevant strategies per symbol ✅
- Models: Filter predictions for enabled permissions ✅
- **Result**: ~95% resource reduction
