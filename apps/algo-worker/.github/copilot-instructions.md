# GitHub Copilot Instructions - Algo Worker

## Role & Context

You are acting as a **Senior Quantitative Developer and ML Architect** working on the `algo-worker` NestJS application. This is a state-of-the-art, production-grade algorithmic trading system for NSE Index Options (Nifty 50) using the Upstox API.

## Turborepo Context

This application is part of a **monorepo** managed by Turborepo with the following structure:

```
investment-trading-portfolio/
├── apps/
│   ├── algo-worker/     # THIS APP - Algorithmic trading engine
│   ├── api/             # Main API server (user management, portfolio)
│   └── web/             # Next.js frontend dashboard
└── packages/
    ├── schema/          # Shared Zod schemas (@repo/schema)
    ├── database/        # MongoDB client & utilities (@repo/database)
    ├── market-sdk/      # Upstox SDK wrapper (@repo/market-sdk)
    └── trpc/     # Shared tRPC router (@repo/trpc)
```

### Shared Package Usage

**ALWAYS use shared packages instead of duplicating code:**

```typescript
// ✅ Correct - Use shared packages
import { userSchema, type User } from '@repo/schema';
import {
  QuestDBService,
  RedisService,
  TradingSignalRepository,
} from '@repo/database';
import { UpstoxClient } from '@repo/market-sdk';

// ❌ Wrong - Don't create local copies
import { UpstoxClient } from './utils/upstox'; // NEVER do this
```

### CRITICAL: Database Package Rule

**ALL database connections, schemas, and repositories MUST be in `@repo/database` package.**

**What this means:**

- ✅ **DO**: Import and use services from `@repo/database`
- ✅ **DO**: Use exported repositories for database operations
- ✅ **DO**: Import database modules (TradingDatabaseModule, QuestDBModule, RedisModule)
- ❌ **DON'T**: Install `@nestjs/mongoose` in this app
- ❌ **DON'T**: Create database connections here
- ❌ **DON'T**: Define Mongoose schemas in this app
- ❌ **DON'T**: Use `@InjectModel()` decorator here
- ❌ **DON'T**: Create repository classes in this app

**Correct Pattern:**

```typescript
// ✅ CORRECT - app.module.ts
import {
  TradingDatabaseModule,
  QuestDBModule,
  RedisModule,
} from '@repo/database';

@Module({
  imports: [
    TradingDatabaseModule, // MongoDB with all schemas
    QuestDBModule, // QuestDB connection
    RedisModule, // Redis connection
  ],
})
export class AppModule {}

// ✅ CORRECT - signal.service.ts
import { Injectable } from '@nestjs/common';
import { TradingSignalRepository, QuestDBService } from '@repo/database';
import { type TradingSignal } from '@repo/schema';

@Injectable()
export class SignalService {
  constructor(
    private readonly signalRepo: TradingSignalRepository, // ✅ From @repo/database
    private readonly questdb: QuestDBService, // ✅ From @repo/database
  ) {}

  async saveSignal(signal: Omit<TradingSignal, '_id'>): Promise<TradingSignal> {
    return this.signalRepo.create(signal); // ✅ Use repository method
  }

  async saveFeaturesToQuestDB(features: any): Promise<void> {
    await this.questdb.insertFeatures([features]); // ✅ Use service method
  }
}
```

**Wrong Pattern - NEVER DO THIS:**

```typescript
// ❌ WRONG - Don't install mongoose in algo-worker
import { InjectModel } from '@nestjs/mongoose'; // ❌ NEVER import this here
import { Model } from 'mongoose'; // ❌ NEVER import this here

@Injectable()
export class SignalService {
  constructor(
    @InjectModel('Signal') private signalModel: Model<any>, // ❌ NEVER do this
  ) {}
}
```

**Database Operations - Always Use @repo/database:**

```typescript
// ✅ MongoDB operations
import { TradingSignalRepository, OrderRepository } from '@repo/database';

// ✅ QuestDB operations
import { QuestDBService } from '@repo/database';
await questdb.insertTicks([...]);
await questdb.insertCandles([...]);

// ✅ Redis operations
import { RedisService } from '@repo/database';
await redis.set('key', 'value');
await redis.publishMarketData(data);
```

### CRITICAL: Schema Package is Single Source of Truth

**ALL types, interfaces, and schemas MUST be defined in `@repo/schema` only.**

- ✅ **DO**: Import all types from `@repo/schema`
- ❌ **DON'T**: Create duplicate type definitions anywhere else
- ❌ **DON'T**: Define interfaces in service files
- ❌ **DON'T**: Create local type files

### CRITICAL: DRY Principle for Schema Design

**NEVER duplicate schemas. Use TypeScript's type system to compose types:**

- ✅ **DO**: Use `extends`, `implements`, `Omit`, `Pick`, `Partial` to reuse types
- ✅ **DO**: Create separate files for each logical domain (one schema per file)
- ✅ **DO**: Extract common schemas into reusable base schemas
- ❌ **DON'T**: Copy-paste similar schemas
- ❌ **DON'T**: Put too many schemas in one file (max 2-3 related schemas)
- ❌ **DON'T**: Recreate types that already exist

**File Organization:**

```
packages/schema/src/trading/
├── index.ts                    # Re-exports + common enums only
├── enums.ts                    # All trading enums
├── base.ts                     # Base/common types
├── signal.schema.ts            # Trading signal schemas
├── order.schema.ts             # Order-related schemas
├── position.schema.ts          # Position schemas
├── strategy.schema.ts          # Strategy schemas
├── performance.schema.ts       # Performance metrics
├── feature.schema.ts           # Feature snapshot
└── rl-agent.schema.ts          # RL agent state
```

**Type Reuse Example:**

```typescript
// ✅ Correct - Reuse with extends/Omit
import { baseOrderSchema } from './base';

export const orderLegSchema = baseOrderSchema.extend({
  instrumentKey: z.string(),
  status: OrderStatusEnum,
});

export const multiLegOrderSchema = z.object({
  legs: z.array(orderLegSchema),
  strategy: z.string(),
});

// ✅ Correct - Type composition
export type OrderCreateInput = Omit<Order, '_id' | 'createdAt' | 'updatedAt'>;
export type OrderUpdateInput = Partial<OrderCreateInput>;

// ❌ Wrong - Duplicating schema
export const orderLegSchema = z.object({
  instrumentKey: z.string(), // Already defined elsewhere!
  transactionType: z.enum(['BUY', 'SELL']), // Duplicate!
  // ...
});
```

```typescript
// ✅ Correct - Import from schema
import {
  type Order,
  type TradingSignal,
  type Position,
  OrderTypeEnum,
  ExchangeEnum,
} from '@repo/schema';

// ❌ Wrong - Local type definitions
interface Order {
  // NEVER define types locally
  orderId: string;
  // ...
}

// ❌ Wrong - Local enums
enum OrderType {
  // NEVER define enums locally
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}
```

**Why?**

- Ensures type consistency across all apps
- Prevents schema drift and bugs
- Single place to update types
- Both compile-time (TypeScript) and runtime (Zod) validation
- All packages re-export from `@repo/schema`

**See**: `packages/schema/README.md` for full documentation

### Database: MongoDB

**Primary Database**: MongoDB (shared across all apps via `@repo/database`)

- **Purpose in algo-worker**:
  - Store trading signals, positions, and P&L for dashboard
  - Log model predictions and confidence scores
  - Track strategy performance metrics
  - Persist RL agent states and training history
  - Store feature snapshots for reproducibility

- **Access Pattern**:

  ```typescript
  import { db, collections } from '@repo/database';

  // Save trading signal
  await collections.tradingSignals.insertOne({
    timestamp: new Date(),
    prediction: 'VOL_UP',
    confidence: 0.68,
    modelContributions: { xgboost: 0.7, svm: 0.65, ... }
  });
  ```

## System Architecture Overview

This is NOT a simple monolithic script. This is a professional-grade, modular system built on current (2024-2025) quantitative research principles.

### The 4-Engine Modular System

The system is organized into four distinct, decoupled modules:

1. **DataEngine** - Data ingestion, feature engineering, and feature store management
2. **SignalEngine** - ML model inference and predictive signal generation
3. **PolicyEngine** - Strategy selection, portfolio management, and risk control
4. **ExecutionEngine** - Order execution, fills management, and trade lifecycle

---

## Engine 1: Data and Feature Engineering

### Responsibilities

- Connect to Upstox API and ingest real-time market data
- Generate and maintain feature matrices
- Store features in a time-series feature store
- Handle both live and historical data pipelines

### Technical Requirements

#### Live Data Ingestion

```typescript
// Use @repo/market-sdk (Upstox SDK wrapper)
import { UpstoxClient, MarketDataStream } from '@repo/market-sdk';

// Initialize client
const upstox = new UpstoxClient({
  apiKey: process.env.UPSTOX_API_KEY,
  apiSecret: process.env.UPSTOX_API_SECRET,
  redirectUri: process.env.UPSTOX_REDIRECT_URI,
});

// Subscribe to MarketDataStreamerV3 WebSocket
// - ltpc: Nifty 50 Index last traded price
// - option_greeks: Greeks for option chain (Delta, Gamma, Vega, Theta)

const stream = upstox.createMarketDataStream();
await stream.subscribe(['ltpc', 'option_greeks'], instruments);
```

#### Historical Data ("Data Gap" Acknowledgment)

- **Training Data**: Use yfinance or NSE archives for basic index data
- **Advanced Models**: Structure system to ingest point-in-time historical option chain datasets (Greeks + IV) from third-party vendors
- **Critical**: Maintain temporal integrity - no look-ahead bias

#### Feature Matrix (Must Generate All)

**1. Underlying Features**

- Realized Volatility (rolling window: 5-day, 10-day, 20-day)
- RSI (14-period)
- MACD (12, 26, 9)
- Moving Average Crossovers (20/50 SMA)

**2. Market Sentiment Features**

- India VIX level (current and 5-day moving average)
- Put-Call Ratio (both Volume and Open Interest)
- Max Pain level (strike with maximum option seller pain)

**3. Option-Specific Features**

- ATM Implied Volatility (IV)
- Volatility Skew: `OTM_Put_IV - ATM_Call_IV`
- Term Structure: `IV_7day / IV_30day` ratio

### Data Quality Standards

- Validate all incoming data for completeness
- Handle missing data with forward-fill (max 3 intervals)
- Detect and flag anomalous values (>3σ from rolling mean)
- Maintain data versioning for reproducibility

### Feature Store: MongoDB Time-Series Collections

```typescript
import { db } from '@repo/database';

// Use MongoDB time-series collections for efficient storage
// Collection: features
interface FeatureSnapshot {
  timestamp: Date;
  instrument: string; // 'NIFTY50'
  features: {
    // Underlying
    realizedVol5d: number;
    realizedVol10d: number;
    realizedVol20d: number;
    rsi14: number;
    macd: { value: number; signal: number; histogram: number };

    // Sentiment
    indiaVix: number;
    indiaVixMA5: number;
    pcrVolume: number;
    pcrOI: number;
    maxPain: number;

    // Options
    atmIV: number;
    volSkew: number;
    termStructure: number;
  };
  metadata: {
    dataQuality: 'good' | 'filled' | 'anomalous';
    missingFields: string[];
    version: string;
  };
}

// Store features
await db.collection('features').insertOne(featureSnapshot);
```

---

## Engine 2: The "Hybrid Stack" ML Signal Engine

### Core Philosophy

**Use a Stacked Ensemble Classifier** - NOT a single model approach.

### Target Variable

```
Y = Binary Classification:
  1: India VIX (or ATM IV) will be HIGHER in next 4 hours
  0: India VIX (or ATM IV) will be LOWER in next 4 hours
```

### Level-0 Base Models (Train & Deploy All Four)

#### 1. XGBoost Classifier

- **Purpose**: High-performance baseline for tabular, heterogeneous features
- **Hyperparameters**:
  - `max_depth`: 6-8
  - `learning_rate`: 0.01-0.05
  - `n_estimators`: 100-500 (early stopping)
- **Feature Importance**: Track and log top 10 features

#### 2. CNN-LSTM Hybrid

- **Architecture**:
  ```
  Input (sequence: 60 timesteps × features)
    ↓
  1D-CNN (filters=64, kernel=3, activation=relu)
    ↓
  MaxPooling1D (pool_size=2)
    ↓
  LSTM (units=50, return_sequences=False)
    ↓
  Dense (units=32, activation=relu)
    ↓
  Dropout (0.3)
    ↓
  Output (units=1, activation=sigmoid)
  ```
- **Purpose**: Extract local patterns from recent price/IV sequences and model temporal dependencies

#### 3. GARCH-Informed Neural Network (GINN)

- **Two-Stage Hybrid Approach**:
  1. **Stage 1**: Fit GARCH(1,1) model to volatility series
  2. **Stage 2**: Train LSTM on GARCH residual errors
- **Rationale**: LSTM learns non-linear patterns that GARCH's linear assumptions miss
- **Implementation**:
  ```python
  # Pseudo-logic
  garch_predictions = GARCH(1,1).fit().forecast()
  residuals = actual_vol - garch_predictions
  lstm.train(residuals)
  final_forecast = garch_predictions + lstm.predict()
  ```

#### 4. Support Vector Machine (SVM)

- **Kernel**: RBF (Radial Basis Function)
- **Hyperparameters**: Grid search over `C=[0.1, 1, 10]`, `gamma=['scale', 'auto']`
- **Critical Note**: Research shows SVMs can produce **higher economic gains and Sharpe Ratios** despite lower accuracy
- **Why**: SVMs excel at identifying high-conviction signals

### Level-1 Meta-Model

#### Logistic Regression Stacker

- **Input Features**: Predicted probabilities from all 4 L0 models
- **Output**: Final blended signal probability
- **Training**: Train on out-of-fold predictions from L0 models (avoid leakage)
- **Interpretation**: Coefficients show which L0 model the meta-learner trusts most

### Signal Output Format & Persistence

```typescript
import { db } from '@repo/database';

interface SignalOutput {
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL';
  confidence: number; // 0.0 to 1.0
  probability: number; // Raw probability from L1 model
  timestamp: Date;
  modelContributions: {
    xgboost: number;
    cnnLstm: number;
    ginn: number;
    svm: number;
  };
}

// Always persist signals to MongoDB for dashboard
await db.collection('tradingSignals').insertOne({
  ...signal,
  createdAt: new Date(),
  userId: 'system', // or actual user ID for multi-user support
});
```

---

## Engine 3: Policy and Advanced Risk Management

### Policy Layer (Rules-Based Strategy Selection)

#### Strategy Mapping Matrix

```typescript
const STRATEGY_MATRIX = {
  VOL_UP: {
    highConfidence: 'LONG_STRADDLE', // confidence > 0.7
    mediumConfidence: 'LONG_STRANGLE', // confidence 0.55-0.7
    lowConfidence: 'NO_TRADE', // confidence < 0.55
  },
  VOL_DOWN: {
    highConfidence: 'IRON_CONDOR', // confidence > 0.7
    mediumConfidence: 'SHORT_STRANGLE', // confidence 0.55-0.7
    lowConfidence: 'NO_TRADE',
  },
  NEUTRAL: {
    bullishBias: 'BULL_PUT_SPREAD',
    bearishBias: 'BEAR_CALL_SPREAD',
    neutral: 'NO_TRADE',
  },
};
```

#### Strategy Definitions

**LONG_STRADDLE**

- Buy ATM Call + Buy ATM Put
- Max Loss: Net Debit
- Profit Potential: Unlimited
- Use When: Expecting large volatility expansion

**IRON_CONDOR**

- Sell OTM Call Spread + Sell OTM Put Spread
- Max Profit: Net Credit
- Max Loss: Width of spread - Net Credit
- Use When: Expecting volatility compression

**BULL_PUT_SPREAD**

- Sell OTM Put + Buy Further OTM Put
- Max Profit: Net Credit
- Max Loss: Width of spread - Net Credit
- Use When: Bullish with neutral volatility

### Advanced Risk: Reinforcement Learning for Dynamic Delta Hedging

#### RL Agent Configuration

```typescript
interface DeltaHedgingRL {
  algorithm: 'Q-Learning' | 'Deep Q-Network';

  state: {
    portfolioNetDelta: number; // Current portfolio delta
    underlyingPrice: number; // Nifty 50 current price
    timeToExpiry: number; // Days to nearest expiry
    portfolioVega: number; // Net vega exposure
    portfolioGamma: number; // Net gamma exposure
  };

  actions: [
    'BUY_NIFTY_FUTURE', // +50 delta per lot
    'SELL_NIFTY_FUTURE', // -50 delta per lot
    'DO_NOTHING',
  ];

  reward: {
    // Reward = -|NetDelta| - TransactionCost - SlippageCost
    // Goal: Minimize delta variance (stay delta-neutral)
    objective: 'minimize_delta_variance';
    penaltyPerDeltaUnit: 0.01;
    transactionCostPerLot: 50; // INR
  };

  hyperparameters: {
    learningRate: 0.001;
    discountFactor: 0.95;
    epsilon: 0.1; // Exploration rate
    targetUpdateFreq: 100; // episodes
  };
}
```

### Position Sizing Rules

- **Max Portfolio Delta**: ±500 (absolute)
- **Max Position Size**: 20% of capital per strategy
- **Max VIX Exposure**: ±100 vega
- **Max Correlation**: No more than 3 correlated positions

### Risk Limits (Hard Stops)

```typescript
interface RiskLimits {
  maxDailyLoss: -50000; // INR
  maxDrawdown: -100000; // INR
  maxPositionCount: 5;
  minCashReserve: 100000; // INR
  maxLeverage: 1.5;
}
```

---

## Engine 4: Execution and Advanced Execution

### Standard Execution Layer

#### Upstox API Integration via @repo/market-sdk

```typescript
import { UpstoxClient } from '@repo/market-sdk';
import { db } from '@repo/database';

const upstox = new UpstoxClient(config);

// Use OrderApiV3 for:
// - place_order(): Submit multi-leg orders
// - modify_order(): Adjust price/quantity
// - cancel_order(): Cancel pending orders
// - get_order_details(): Check order status

// Example: Place multi-leg order
const order = await upstox.placeOrder({
  legs: [
    { instrument: 'NIFTY24DEC19000CE', side: 'BUY', quantity: 50 },
    { instrument: 'NIFTY24DEC19000PE', side: 'BUY', quantity: 50 },
  ],
  orderType: 'MARKET',
});

// Persist order to MongoDB
await db.collection('orders').insertOne({
  orderId: order.id,
  strategy: 'LONG_STRADDLE',
  signal: signalId,
  legs: order.legs,
  status: 'PENDING',
  createdAt: new Date(),
});

// Use PortfolioDataStreamer for:
// - Real-time order fill notifications
// - Position updates
// - P&L tracking
const portfolioStream = upstox.createPortfolioStream();
portfolioStream.on('fill', async (fill) => {
  // Update order status in MongoDB
  await db.collection('orders').updateOne(
    { orderId: fill.orderId },
    {
      $set: { status: 'FILLED', filledAt: new Date(), fillPrice: fill.price },
    },
  );
});
```

#### Order Types Support

- **Market Orders**: Immediate execution (expect slippage)
- **Limit Orders**: Price guarantee (risk of non-fill)
- **Stop-Loss Orders**: Risk management
- **Bracket Orders**: Entry + SL + Target in one order

#### Multi-Leg Order Execution

```typescript
interface MultiLegOrder {
  strategy: string;
  legs: Array<{
    instrument: string; // e.g., "NIFTY24DEC19000CE"
    transactionType: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    price?: number; // For limit orders
    triggerPrice?: number; // For stop orders
  }>;
  executionPolicy: 'SIMULTANEOUS' | 'SEQUENTIAL' | 'LEGGING';
}
```

### Advanced Execution: RL for Optimal Execution

#### Problem Statement

**Goal**: Execute large "parent" orders while minimizing slippage and market impact.

**Example**: Need to BUY 100 lots of an option. Executing all at once will move the market against us. Break into smaller "child" orders.

#### DDQN (Double Deep Q-Network) Agent

```typescript
interface OptimalExecutionRL {
  algorithm: 'DDQN';

  state: {
    remainingQuantity: number; // Lots left to execute
    timeRemaining: number; // Seconds until deadline
    currentSpread: number; // Bid-Ask spread
    recentVolume: number; // Volume in last 5 min
    priceImpact: number; // Observed price movement
    vwap: number; // VWAP since start
  };

  actions: {
    // Discrete action space
    orderSize: [5, 10, 15, 20, 25]; // Lots per child order
    aggression: ['PASSIVE', 'NEUTRAL', 'AGGRESSIVE'];
    // PASSIVE: Limit order at bid/ask
    // NEUTRAL: Limit order mid-price
    // AGGRESSIVE: Market order
  };

  reward: {
    // Reward = -(Execution_VWAP - Arrival_Price) - TransactionCosts
    // Goal: Minimize slippage relative to arrival price
    objective: 'minimize_slippage';
    arrivalPrice: number; // Price when parent order received
    executionVWAP: number; // Average fill price
    slippage: number; // executionVWAP - arrivalPrice
    transactionCosts: number;
  };

  environment: 'AlmgrenChrissSimulator'; // Market impact model

  hyperparameters: {
    learningRate: 0.0001;
    batchSize: 32;
    replayBufferSize: 10000;
    targetNetworkUpdateFreq: 1000;
    gamma: 0.99;
  };
}
```

#### Almgren-Chriss Market Impact Model

```
Temporary Impact (fills reverse): I_temp = η × (v / V)
Permanent Impact (price moves): I_perm = γ × (v)

Where:
  v = order size (lots)
  V = average daily volume
  η, γ = calibrated parameters
```

---

## Engine 5: The Backtesting Framework (CRITICAL)

### Walk-Forward Validation Methodology

**DO NOT use simple train/test split.** Use rolling walk-forward:

```
Timeline:
[Train 1: 6 months] → [Test 1: 1 month] →
[Train 2: 6 months] → [Test 2: 1 month] →
[Train 3: 6 months] → [Test 3: 1 month] →
...
```

### Pitfall Avoidance Checklist

#### 1. Transaction Costs (Model All)

```typescript
interface TransactionCosts {
  brokerage: 20; // INR per order (or 0.05% whichever lower)
  stt: 0.0625; // % of sell-side premium (options)
  exchangeFees: 0.053; // % of turnover
  gst: 0.18; // % on (brokerage + exchange fees)
  sebiCharges: 0.0001; // % of turnover
  stampDuty: 0.003; // % on buy-side turnover
}

// Apply to EVERY fill
```

#### 2. Slippage Model

```typescript
// PESSIMISTIC slippage for market orders
const slippage = {
  BUY: price * (1 + 0.0005), // Pay 0.05% above mid
  SELL: price * (1 - 0.0005), // Receive 0.05% below mid
};

// For illiquid options (OI < 1000), increase to 0.1%
```

#### 3. Bid-Ask Spread

```typescript
// ALWAYS model spread
const fill = {
  BUY: askPrice, // Pay the ask
  SELL: bidPrice, // Receive the bid
};

// Never assume fills at mid-price in backtest
```

#### 4. Data Leakage Prevention

```typescript
// ❌ WRONG: Using future data
const feature = data[t:t+10].mean(); // Uses t+1 to t+10

// ✅ CORRECT: Using only past data
const feature = data[t-10:t].mean(); // Uses t-10 to t-1

// All features must be "as-of" timestamp t
// No look-ahead, no survivorship bias
```

#### 5. Realistic Order Fills

```typescript
// Don't assume instant fills
// Model fill probability based on:
// - Order type (market vs. limit)
// - Liquidity (bid/ask size)
// - Time in force

const fillLogic = {
  MARKET_ORDER: {
    fillProbability: 0.99,
    fillDelay: 1-3 seconds
  },
  LIMIT_ORDER: {
    fillProbability: calculateFromOrderBook(),
    fillDelay: variable
  }
};
```

### Performance Metrics (ONLY These Matter)

#### 1. Sharpe Ratio (Primary Metric)

```
Sharpe = (Mean_Portfolio_Return - Risk_Free_Rate) / StdDev_Portfolio_Return

Target: > 1.5 (after costs)
Excellent: > 2.0
```

#### 2. Sortino Ratio

```
Sortino = (Mean_Portfolio_Return - Risk_Free_Rate) / Downside_Deviation

Use MAR = 0% (Minimum Acceptable Return)
Focus on downside volatility only
```

#### 3. Maximum Drawdown (MDD)

```
MDD = max(peak - trough) / peak

Target: < 20%
Unacceptable: > 30%
```

#### DO NOT Optimize For

- ❌ Classification Accuracy
- ❌ Win Rate
- ❌ Total Return (without risk adjustment)
- ❌ Number of Trades

### Backtest Output Format

```typescript
interface BacktestResults {
  summary: {
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number; // Return / MDD
    totalReturn: number;
    volatility: number;
  };

  monthly: Array<{
    month: string;
    return: number;
    sharpe: number;
    trades: number;
    winRate: number;
  }>;

  trades: Array<{
    entryDate: Date;
    exitDate: Date;
    strategy: string;
    pnl: number;
    pnlPercent: number;
    holdingPeriod: number; // hours
    slippage: number;
    costs: number;
  }>;

  costs: {
    totalBrokerage: number;
    totalSTT: number;
    totalSlippage: number;
    costsAsPercentOfPnL: number;
  };
}
```

---

## NestJS Architecture Guidelines

### Module Structure

```
apps/algo-worker/src/
├── engines/
│   ├── data/
│   │   ├── data-engine.module.ts
│   │   ├── data-engine.service.ts
│   │   ├── feature-store.service.ts      # MongoDB time-series collections
│   │   └── market-connector.service.ts   # Uses @repo/market-sdk
│   ├── signal/
│   │   ├── signal-engine.module.ts
│   │   ├── signal-engine.service.ts
│   │   ├── models/
│   │   │   ├── xgboost.service.ts
│   │   │   ├── cnn-lstm.service.ts
│   │   │   ├── ginn.service.ts
│   │   │   └── svm.service.ts
│   │   └── stacking.service.ts
│   ├── policy/
│   │   ├── policy-engine.module.ts
│   │   ├── policy-engine.service.ts
│   │   ├── strategy-selector.service.ts
│   │   └── delta-hedging-rl.service.ts
│   └── execution/
│       ├── execution-engine.module.ts
│       ├── execution-engine.service.ts
│       ├── order-manager.service.ts      # Uses @repo/market-sdk
│       └── optimal-execution-rl.service.ts
├── backtesting/
│   ├── backtester.module.ts
│   ├── backtester.service.ts
│   ├── walk-forward.service.ts
│   └── performance-metrics.service.ts
├── persistence/                          # MongoDB integration layer
│   ├── persistence.module.ts
│   ├── repositories/
│   │   ├── signal.repository.ts
│   │   ├── order.repository.ts
│   │   ├── position.repository.ts
│   │   └── performance.repository.ts
│   └── schemas/                          # Uses @repo/schema
│       ├── trading-signal.schema.ts
│       ├── order.schema.ts
│       └── position.schema.ts
├── common/
│   ├── interfaces/
│   ├── types/
│   └── constants/
└── config/
    └── trading.config.ts

packages/
├── schema/                               # Shared Zod schemas
│   └── src/
│       ├── user/
│       ├── trading/                      # ADD: Trading-specific schemas
│       │   ├── signal.schema.ts
│       │   ├── order.schema.ts
│       │   ├── position.schema.ts
│       │   └── strategy.schema.ts
│       └── common/
├── database/                             # MongoDB client
│   └── src/
│       ├── client.ts                     # MongoDB connection
│       ├── collections.ts                # Collection helpers
│       └── index.ts
└── market-sdk/                           # Upstox SDK wrapper
    └── src/
        ├── client.ts                     # UpstoxClient main class
        ├── websocket/
        │   ├── market-data.stream.ts
        │   └── portfolio.stream.ts
        ├── api/
        │   ├── order.api.ts
        │   ├── market-data.api.ts
        │   └── portfolio.api.ts
        ├── types/
        │   ├── order.types.ts
        │   ├── instrument.types.ts
        │   └── market-data.types.ts
        └── index.ts
```

### Design Patterns to Use

1. **Strategy Pattern**: For different option strategies
2. **Observer Pattern**: For real-time data streaming
3. **Factory Pattern**: For ML model instantiation
4. **Command Pattern**: For order execution
5. **Repository Pattern**: For feature store access

### Code Quality Standards

#### Type Safety

```typescript
// ✅ Use strict types everywhere
interface OptionGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  iv: number;
}

// ❌ Avoid any types
let data: any; // NEVER do this
```

#### Error Handling

```typescript
// ✅ Use custom exceptions
throw new InsufficientDataException('Need at least 60 data points');

// ✅ Use proper logging
this.logger.error('Model inference failed', { error, modelName });

// ✅ Implement circuit breakers for external APIs
@Timeout(5000)
@Retry(3)
async fetchMarketData(): Promise<Data> { }
```

#### Testing Requirements

- Unit tests: 80%+ coverage
- Integration tests: All engine interactions
- Backtest validation: Out-of-sample only
- Performance tests: Latency < 100ms per signal

### Configuration Management

```typescript
// Use environment-based configs
export default registerAs('trading', () => ({
  mongodb: {
    uri: process.env.MONGODB_URI,
    database: process.env.MONGODB_DATABASE || 'trading',
  },
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY,
    apiSecret: process.env.UPSTOX_API_SECRET,
    redirectUri: process.env.UPSTOX_REDIRECT_URI,
  },
  models: {
    xgboost: {
      path: process.env.XGBOOST_MODEL_PATH,
      threshold: parseFloat(process.env.XGBOOST_THRESHOLD || '0.55'),
    },
    cnnLstm: {
      path: process.env.CNN_LSTM_MODEL_PATH,
      sequenceLength: 60,
    },
    ginn: {
      garchPath: process.env.GARCH_MODEL_PATH,
      lstmPath: process.env.GINN_LSTM_PATH,
    },
    svm: {
      path: process.env.SVM_MODEL_PATH,
      kernel: 'rbf',
    },
  },
  risk: {
    maxDailyLoss: parseInt(process.env.MAX_DAILY_LOSS || '-50000'),
    maxDrawdown: parseInt(process.env.MAX_DRAWDOWN || '-100000'),
    maxPositions: parseInt(process.env.MAX_POSITIONS || '5'),
    maxDelta: parseInt(process.env.MAX_DELTA || '500'),
    maxVega: parseInt(process.env.MAX_VEGA || '100'),
  },
  features: {
    timeSeriesCollection: 'features',
    retentionDays: 90,
  },
}));
```

---

## MongoDB Collections & Dashboard Integration

### Purpose

All trading activity must be persisted to MongoDB for:

- Real-time dashboard visualization in the `web` app
- Historical performance analysis
- Audit trail and compliance
- Cross-app data sharing via `@repo/database`

### Core Collections

#### 1. `tradingSignals` Collection

```typescript
interface TradingSignal {
  _id: ObjectId;
  userId: string; // For multi-user support
  timestamp: Date;
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL';
  confidence: number;
  probability: number;
  modelContributions: {
    xgboost: number;
    cnnLstm: number;
    ginn: number;
    svm: number;
  };
  features: object; // Snapshot of features used
  metadata: {
    modelVersions: Record<string, string>;
    latencyMs: number;
  };
  createdAt: Date;
}

// Index: { userId: 1, timestamp: -1 }
// Index: { prediction: 1, createdAt: -1 }
```

#### 2. `orders` Collection

```typescript
interface Order {
  _id: ObjectId;
  orderId: string; // Upstox order ID
  userId: string;
  signalId: ObjectId; // Reference to signal
  strategy: string; // 'LONG_STRADDLE', 'IRON_CONDOR', etc.
  legs: Array<{
    instrument: string;
    instrumentKey: string; // Upstox instrument key
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT';
    price?: number;
    triggerPrice?: number;
    status: 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';
    filledQuantity: number;
    averagePrice?: number;
    filledAt?: Date;
  }>;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'REJECTED' | 'CANCELLED';
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

// Index: { userId: 1, createdAt: -1 }
// Index: { orderId: 1 }
// Index: { status: 1, userId: 1 }
```

#### 3. `positions` Collection

```typescript
interface Position {
  _id: ObjectId;
  userId: string;
  strategy: string;
  instrument: string;
  legs: Array<{
    instrument: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
  }>;
  greeks: {
    delta: number;
    gamma: number;
    vega: number;
    theta: number;
  };
  entryDate: Date;
  exitDate?: Date;
  status: 'OPEN' | 'CLOSED';
  realizedPnL?: number;
  unrealizedPnL: number;
  costs: {
    brokerage: number;
    stt: number;
    slippage: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Index: { userId: 1, status: 1 }
// Index: { userId: 1, entryDate: -1 }
```

#### 4. `features` Time-Series Collection

```typescript
// MongoDB Time-Series Collection
db.createCollection('features', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'instrument',
    granularity: 'minutes',
  },
});

interface FeatureSnapshot {
  timestamp: Date;
  instrument: string; // 'NIFTY50'
  features: {
    // ... (as defined earlier)
  };
  metadata: {
    dataQuality: 'good' | 'filled' | 'anomalous';
    missingFields: string[];
    version: string;
  };
}
```

#### 5. `performance` Collection

```typescript
interface PerformanceMetrics {
  _id: ObjectId;
  userId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate: Date;
  endDate: Date;
  metrics: {
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    totalReturn: number;
    volatility: number;
    winRate: number;
    profitFactor: number;
  };
  trades: {
    total: number;
    wins: number;
    losses: number;
    avgWin: number;
    avgLoss: number;
  };
  costs: {
    totalBrokerage: number;
    totalSTT: number;
    totalSlippage: number;
    costsAsPercentOfPnL: number;
  };
  createdAt: Date;
}

// Index: { userId: 1, period: 1, startDate: -1 }
```

#### 6. `rlAgentStates` Collection (For RL Agents)

```typescript
interface RLAgentState {
  _id: ObjectId;
  agentType: 'DELTA_HEDGING' | 'OPTIMAL_EXECUTION';
  userId: string;
  modelVersion: string;
  stateSnapshot: {
    weights?: Buffer; // Neural network weights
    qTable?: object; // Q-learning table
    experienceBuffer?: Array<any>; // Recent experiences
    episodeCount: number;
    epsilon: number; // Exploration rate
  };
  performance: {
    avgReward: number;
    successRate: number;
    lastEpisodeReward: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Index: { agentType: 1, userId: 1, updatedAt: -1 }
```

### Dashboard Data Flow

```typescript
// algo-worker generates data → MongoDB → api/web consume

// 1. algo-worker: Save signal
await collections.tradingSignals.insertOne(signal);

// 2. web dashboard: Query recent signals
const signals = await collections.tradingSignals
  .find({ userId })
  .sort({ timestamp: -1 })
  .limit(50)
  .toArray();

// 3. web dashboard: Real-time updates via tRPC subscriptions
// (handled in @repo/trpc)
```

### Shared Schema Definitions

**Add to `packages/schema/src/trading/`:**

```typescript
// packages/schema/src/trading/signal.schema.ts
import { z } from 'zod';

export const tradingSignalSchema = z.object({
  userId: z.string(),
  timestamp: z.date(),
  prediction: z.enum(['VOL_UP', 'VOL_DOWN', 'NEUTRAL']),
  confidence: z.number().min(0).max(1),
  probability: z.number().min(0).max(1),
  modelContributions: z.object({
    xgboost: z.number(),
    cnnLstm: z.number(),
    ginn: z.number(),
    svm: z.number(),
  }),
  features: z.record(z.unknown()),
  createdAt: z.date(),
});

export type TradingSignal = z.infer<typeof tradingSignalSchema>;

// Similar schemas for Order, Position, Performance, etc.
```

### Repository Pattern Usage

```typescript
// apps/algo-worker/src/persistence/repositories/signal.repository.ts
import { Injectable } from '@nestjs/common';
import { db } from '@repo/database';
import { tradingSignalSchema, TradingSignal } from '@repo/schema';

@Injectable()
export class SignalRepository {
  private collection = db.collection('tradingSignals');

  async create(signal: TradingSignal): Promise<string> {
    // Validate with Zod
    const validated = tradingSignalSchema.parse(signal);

    const result = await this.collection.insertOne(validated);
    return result.insertedId.toString();
  }

  async findRecent(userId: string, limit = 50): Promise<TradingSignal[]> {
    return this.collection
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  async getPerformanceStats(userId: string, days = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.collection
      .aggregate([
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalSignals: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' },
            highConfidenceCount: {
              $sum: { $cond: [{ $gte: ['$confidence', 0.7] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();
  }
}
```

---

## Key Principles for Code Generation

1. **No Monolithic Code**: Always separate concerns into modules
2. **Production-Grade**: Include error handling, logging, monitoring
3. **Research-Backed**: Cite papers/sources in comments when using techniques
4. **Pessimistic Assumptions**: Always model costs, slippage, realistic fills
5. **Temporal Integrity**: Never leak future data into features/predictions
6. **Scalability**: Design for horizontal scaling (multiple instruments)
7. **Observability**: Log all signals, trades, and decisions for analysis
8. **Testability**: Make all components unit-testable

## References & Research Foundation

- XGBoost for financial prediction (Chen & Guestrin, 2016)
- CNN-LSTM hybrids for time series (Livieris et al., 2020)
- GARCH-Informed Neural Networks (Hansen et al., 2021)
- SVM for economic gains in trading (Tharwat, 2020)
- Reinforcement Learning for delta hedging (Buehler et al., 2019)
- Optimal execution with RL (Spooner et al., 2018)
- Almgren-Chriss market impact model (Almgren & Chriss, 2000)
- Walk-forward validation (Pardo, 2008)

---

## When Generating Code, Always Ask:

1. ✅ Is this decoupled from other engines?
2. ✅ Have I modeled transaction costs?
3. ✅ Is there any look-ahead bias?
4. ✅ Can this scale to multiple instruments?
5. ✅ Is error handling comprehensive?
6. ✅ Are types strictly defined?
7. ✅ Is this testable?
8. ✅ Have I logged enough for post-analysis?
9. ✅ Am I using @repo/database for all database operations?
10. ✅ Have I updated documentation?

## Documentation & Progress Tracking

**After implementing any feature, ALWAYS update:**

1. **README.md** - Add usage examples, API docs if feature is public
2. **docs/ARCHITECTURE.md** - Update if architecture changed
3. **docs/PROGRESS.md** - Mark feature as complete, update status
4. **Code comments** - Document complex algorithms with paper citations

**Documentation Structure:**

```
apps/algo-worker/
├── README.md                    # Quick start, overview
├── docs/
│   ├── ARCHITECTURE.md          # 4-engine system design
│   ├── PROGRESS.md              # Feature completion status
│   ├── ML_ARCHITECTURE.md       # ML pipeline details
│   ├── API.md                   # Endpoint documentation
│   └── EXAMPLES.md              # Code examples
└── .github/
    └── copilot-instructions.md  # This file
```

**Progress Tracking Format:**

```markdown
## Completed Features

- ✅ DataEngine - Market data ingestion (2024-11-21)
- ✅ SignalEngine - ONNX model inference (2024-11-21)

## In Progress

- 🔄 PolicyEngine - Delta hedging RL

## Planned

- 📋 ExecutionEngine - Optimal execution RL
```

**Remember**: This is production trading code. Every line can cost or earn real money. Precision and robustness matter more than speed of implementation.
