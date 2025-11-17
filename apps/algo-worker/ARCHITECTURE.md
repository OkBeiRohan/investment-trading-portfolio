# Algo Worker - 4-Engine Architecture Implementation

## Overview

The algo-worker application has been structured following a modular 4-engine architecture as defined in the copilot instructions. Each engine is decoupled and focused on specific responsibilities in the algorithmic trading pipeline.

## Architecture

```
apps/algo-worker/src/engines/
├── data/              # DataEngine - Market data & features
├── signal/            # SignalEngine - ML inference & signals
├── policy/            # PolicyEngine - Strategy & risk management
└── execution/         # ExecutionEngine - Order execution & positions
```

## Engine 1: DataEngine

**Location**: `src/engines/data/`

**Responsibilities**:

- Real-time market data ingestion via @repo/market-sdk
- Feature engineering in TypeScript
- MongoDB time-series feature storage
- CSV export for Python model training

**Services**:

- `DataCollectionService`: Fetches market data (historical, option chain, VIX, PCR)
- `FeatureEngineeringService`: Calculates technical indicators (RSI, MACD, realized vol)
- `FeatureStoreService`: Manages MongoDB time-series collections
- `TrainingDataService`: Exports labeled CSV data for Python training

**Key Features**:

- Realized Volatility (5d, 10d, 20d rolling windows)
- RSI (14-period)
- MACD (12, 26, 9)
- Moving Average Crossovers (EMA, SMA)
- Market Sentiment (India VIX, PCR, Max Pain)
- Option Metrics (ATM IV, Vol Skew, Term Structure)

---

## Engine 2: SignalEngine

**Location**: `src/engines/signal/`

**Responsibilities**:

- Load ONNX models (onnxruntime-node)
- Run ML inference with GPU acceleration (CUDA)
- Generate trading signals via ensemble stacking
- Persist signals to MongoDB

**Services**:

- `ModelLoaderService`: Loads and manages ONNX models (XGBoost, CNN-LSTM, GINN, SVM, Stacking)
- `SignalEngineService`: Orchestrates ensemble inference and signal generation

**ML Pipeline**:

1. **L0 Models** (Base Learners):
   - XGBoost Classifier
   - CNN-LSTM Hybrid
   - GARCH-Informed Neural Network (GINN)
   - Support Vector Machine (SVM)

2. **L1 Model** (Meta-Learner):
   - Logistic Regression Stacker
   - Combines L0 predictions → final signal

**Signal Output**:

```typescript
{
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL',
  confidence: 0.0-1.0,
  probability: 0.0-1.0,
  modelContributions: {
    xgboost: 0.72,
    cnnLstm: 0.68,
    ginn: 0.65,
    svm: 0.75
  }
}
```

---

## Engine 3: PolicyEngine

**Location**: `src/engines/policy/`

**Responsibilities**:

- Select appropriate options strategy based on signal
- Validate risk limits before opening positions
- Calculate position sizing using Kelly Criterion
- Portfolio risk management (Greeks, drawdown, leverage)

**Services**:

- `StrategySelectionService`: Maps signals to strategies (LONG_STRADDLE, IRON_CONDOR, etc.)
- `RiskManagementService`: Validates risk limits (daily loss, drawdown, Greeks)
- `PositionSizingService`: Calculates optimal lot sizes using Kelly Criterion

**Strategy Matrix**:

```
VOL_UP:
  - High Confidence (>0.7): LONG_STRADDLE
  - Medium Confidence (0.55-0.7): LONG_STRANGLE

VOL_DOWN:
  - High Confidence (>0.7): IRON_CONDOR
  - Medium Confidence (0.55-0.7): SHORT_STRANGLE

NEUTRAL:
  - Bullish Bias: BULL_PUT_SPREAD
  - Bearish Bias: BEAR_CALL_SPREAD
```

**Risk Limits**:

- Max Daily Loss: -₹50,000
- Max Drawdown: -₹100,000
- Max Positions: 5
- Max Portfolio Delta: ±500
- Max Portfolio Vega: ±100
- Max Leverage: 1.5x

---

## Engine 4: ExecutionEngine

**Location**: `src/engines/execution/`

**Responsibilities**:

- Place multi-leg orders via Upstox API (@repo/market-sdk)
- Monitor order fills and execution quality
- Track open positions and P&L
- Calculate portfolio Greeks in real-time

**Services**:

- `OrderPlacementService`: Places/modifies/cancels orders via Upstox
- `ExecutionMonitorService`: Monitors fills, slippage, execution metrics
- `PositionManagerService`: Tracks positions, calculates P&L and Greeks

**Order Types**:

- Market Orders (immediate execution)
- Limit Orders (price guarantee)
- Multi-Leg Orders (simultaneous execution)
- Stop-Loss Orders (risk management)

**Position Tracking**:

- Real-time P&L (unrealized + realized)
- Greeks aggregation (delta, gamma, vega, theta)
- Transaction costs (brokerage, STT, slippage)
- Entry/exit prices and timestamps

---

## Data Flow

```
1. DataEngine
   ├─> Fetch market data (Upstox/Yahoo/Binance)
   ├─> Calculate features (TypeScript)
   ├─> Store in MongoDB (time-series)
   └─> Export CSV (Python training)

2. SignalEngine
   ├─> Load ONNX models (GPU/CPU)
   ├─> Run inference on features
   ├─> Ensemble predictions (L0 → L1)
   └─> Generate TradingSignal

3. PolicyEngine
   ├─> Select strategy (based on signal)
   ├─> Calculate position size (Kelly)
   ├─> Validate risk limits
   └─> Generate Strategy object

4. ExecutionEngine
   ├─> Build multi-leg order
   ├─> Place order (Upstox API)
   ├─> Monitor fills (WebSocket)
   └─> Create/update Position
```

---

## MongoDB Collections

All trading activity is persisted to MongoDB for dashboard integration:

- `features`: Time-series feature snapshots
- `tradingSignals`: ML predictions and confidence scores
- `orders`: Order history with fills and execution metrics
- `positions`: Open/closed positions with P&L and Greeks
- `performanceMetrics`: Daily/weekly/monthly performance stats

---

## Integration Points

### Shared Packages

All services use shared packages:

- `@repo/schema`: Zod schemas and TypeScript types
- `@repo/database`: MongoDB client and collections
- `@repo/market-sdk`: Upstox API wrapper

### TODO: Implementation Steps

1. **Update @repo/database**:
   - Add MongoDB collection helpers for trading collections
   - Implement repository pattern for each collection

2. **Implement @repo/market-sdk**:
   - Upstox OAuth2 authentication
   - Market data WebSocket (MarketDataStreamerV3)
   - Portfolio WebSocket (PortfolioDataStreamer)
   - Order API (place/modify/cancel)

3. **Wire up services**:
   - Replace TODO comments with actual @repo/database calls
   - Connect DataCollectionService to @repo/market-sdk
   - Implement real-time WebSocket streaming

4. **ML Model Training**:
   - Export features using TrainingDataService
   - Train Python models (XGBoost, CNN-LSTM, GINN, SVM, Stacking)
   - Export to ONNX format
   - Load models using ModelLoaderService

5. **Testing**:
   - Unit tests for each service
   - Integration tests for engine interactions
   - Backtest with historical data

---

## File Structure

```
apps/algo-worker/src/engines/
├── data/
│   ├── data-engine.module.ts               # NestJS module
│   ├── data-collection.service.ts          # Market data ingestion
│   ├── feature-engineering.service.ts      # Feature calculations
│   ├── feature-store.service.ts            # MongoDB time-series
│   └── training-data.service.ts            # CSV export
├── signal/
│   ├── signal-engine.module.ts             # NestJS module
│   ├── model-loader.service.ts             # ONNX model management
│   └── signal-engine.service.ts            # Ensemble inference
├── policy/
│   ├── policy-engine.module.ts             # NestJS module
│   ├── strategy-selection.service.ts       # Strategy mapping
│   ├── risk-management.service.ts          # Risk validation
│   └── position-sizing.service.ts          # Kelly Criterion
└── execution/
    ├── execution-engine.module.ts          # NestJS module
    ├── order-placement.service.ts          # Order execution
    ├── execution-monitor.service.ts        # Fill monitoring
    └── position-manager.service.ts         # Position tracking
```

---

## Next Steps

1. **Wire up engines in app.module.ts**: Import all 4 engine modules
2. **Implement @repo/database**: Add MongoDB collections and repositories
3. **Implement @repo/market-sdk**: Complete Upstox API integration
4. **Train ML models**: Use exported features to train Python models
5. **Export to ONNX**: Convert trained models to ONNX format
6. **Test inference**: Verify GPU-accelerated inference works
7. **Backtest**: Run historical backtests with walk-forward validation
8. **Deploy**: Docker containerization with GPU support

---

## Notes

- All type errors are expected (workspace packages not yet wired up)
- TODO comments mark integration points for @repo/database and @repo/market-sdk
- Services use pessimistic assumptions (slippage, costs) as per instructions
- Async methods without await are TODOs (will be implemented with actual DB/API calls)
- Schema types imported from @repo/schema ensure consistency across all apps
