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

1. **User-Configurable Trading**: Each user has custom trading preferences stored in MongoDB (permissions, limits, strategies)
2. **Resource-Efficient**: Only analyze instruments and strategies enabled by at least one active user
3. **Event-Driven**: All layer communication via internal event bus (NestJS EventEmitter2)
4. **Sub-150ms Latency**: GPU-accelerated inference, pre-allocated buffers, no blocking I/O
5. **Fail-Safe**: Circuit breakers halt trading on anomalies (stale data, risk breach, latency spike)
6. **SEBI Compliant**: Unique Algo IDs, mandatory pre-trade checks, 5-year audit trail
7. **Ensemble Approach**: 6-8 diverse ML models for robust predictions (AUC >0.75-0.77)

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
