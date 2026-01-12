# Algo Worker - Event-Driven Trading Architecture

## Overview

The `algo-worker` implements an **event-driven, microservices-based architecture** designed for institutional-grade algorithmic trading with sub-150ms end-to-end latency. This design aligns with the comprehensive [Algo Trading Architecture](../../../docs/ALGO_TRADING_ARCHITECTURE.md) while providing implementation-specific details for the NestJS-based system.

**Key Architectural Principle**: This implementation uses an event-driven message bus (Redis Streams) with modular microservices for each processing stage—enabling adaptive regime detection, continuous learning, and ultra-low latency execution.

## The 7-Layer Implementation

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
  - **Level-0 Core** (6): XGBoost, LightGBM, Mamba (SSM), GINN, SVM, PatchTST
  - **Level-0 Optional** (4): TimesNet-MLP, WFTNet-MLP, KAN, VisionTransformer
  - **Level-1 Meta-Learner**: Logistic Regression stacker
- **Tech**: ONNX Runtime with TensorRT/OpenVINO
- **Architecture Note**: Supports Transformers (Autoformer, Informer) for time-series, CNNs for pattern recognition, and KANs for interpretability
- **Output**: Trading signal probability (0-1) with confidence

### 4. Cognition Layer (Strategy & Risk Management)

- **Service**: `StrategySelectionService`, `RiskManagerService`, `RegimeDetectorService`, `RLAgentService` (optional)
- **Logic**:
  - **Regime Detection**: HMMs/Kalman filters classify market state (trending/ranging/volatile)
  - **Regime-Based Strategy Selection**: Momentum models for trends, mean-reversion for ranges
  - Receives prediction signal
  - Validates portfolio state (Greeks, margin, position limits)
  - Selects option strategy (LONG_STRADDLE, IRON_CONDOR, BULL_PUT_SPREAD, etc.)
  - Determines position size (Kelly criterion, volatility scaling, or RL-based)
- **Adaptive Learning**: Continuous monitoring with drift detection (ADDM algorithm)
- **Output**: Validated target allocation with strategy type

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
[Layer 3: Prediction] - ONNX Ensemble Inference (8-10 L0 + 1 L1)
         ↓ (PredictionCompletedEvent)
[Layer 4: Cognition] - Strategy Selection + Risk Management
         ↓ (OrderValidatedEvent)
[Layer 5: Execution] - Smart Order Routing
         ↓ (OrderFilledEvent)
[Layer 5: Execution] - Position Manager (track open positions)
         ↓ (PositionOpenedEvent, PositionUpdatedEvent)
[Layer 5: Execution] - Exit Signal Generator (monitor exit conditions)
         ↓ (ExitSignalEvent)
[Layer 5: Execution] - Close Position (execute exit order)
         ↓ (PositionClosedEvent)
[Layer 6: Memory] - Hot/Warm/Cold Storage
         ↓
[Layer 7: Control] - Metrics + Circuit Breakers
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

## Integration with Modern Architecture

This 7-layer implementation aligns with the 9-layer Modern Algo Trading Architecture:

| Modern Architecture Layer             | Algo-Worker Implementation                    |
| ------------------------------------- | --------------------------------------------- |
| 1. Data Ingestion                     | Layer 1: Perception                           |
| 2. Feature & Technical Engine         | Layer 2: Cortex                               |
| 3. Market Structure & Regime Detector | Layer 4: Cognition (RegimeDetectorService)    |
| 4. Signal/Prediction Engine           | Layer 3: Prediction                           |
| 5. Strategy Manager                   | Layer 4: Cognition (StrategySelectionService) |
| 6. Risk & Portfolio Manager           | Layer 4: Cognition (RiskManagerService)       |
| 7. Order Management & Execution       | Layer 5: Execution                            |
| 8. Logging/Monitoring                 | Layer 7: Control                              |
| 9. Offline Training & Deployment      | External: `training-pipeline` service         |

**Key Insight**: The 7-layer structure is an implementation choice that groups related modern architecture components into cohesive NestJS modules.

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
