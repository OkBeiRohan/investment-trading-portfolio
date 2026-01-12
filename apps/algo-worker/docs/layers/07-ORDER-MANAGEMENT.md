# Layer 7: Order Management & Execution

**Purpose**: Smart order routing, execution algorithms, and position tracking

---

## Overview

The Order Management & Execution layer interfaces with broker APIs (Upstox) to place orders, track positions, and manage exits. Uses intelligent order routing and execution algorithms to minimize slippage.

---

## Components

### OrderManagerService

- Order lifecycle management
- SEBI-compliant order tracking
- Unique algo ID generation

### ExecutionEngineService

- Smart order routing (NSE/BSE)
- Execution algorithms (TWAP, VWAP, MARKET)
- Slippage monitoring

### PositionManagerService

- Real-time position tracking
- Exit signal generation
- Multi-criteria exit monitoring

### RL-Based Execution Agent (Optional)

- Learn optimal order placement timing
- Minimize market impact
- Trained with PPO

---

## Order Lifecycle

```typescript
interface Order {
  orderId: string;
  algoId: string; // SEBI 2024-2025 requirement
  userId: string;
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  limitPrice?: number;
  validity: 'IOC' | 'DAY';
  status:
    | 'PENDING'
    | 'PLACED'
    | 'FILLED'
    | 'PARTIALLY_FILLED'
    | 'REJECTED'
    | 'CANCELLED';
  filledQuantity: number;
  avgFillPrice?: number;
  timestamp: number;
  riskChecks: RiskCheckResult; // From Layer 6
}

class OrderManagerService {
  async placeOrder(order: Order): Promise<Order> {
    // 1. Generate unique algo ID (SEBI requirement)
    order.algoId = this.generateAlgoId(order);

    // 2. Place via broker API
    const response = await this.upstoxApi.placeOrder({
      instrument_key: order.instrumentKey,
      transaction_type: order.side,
      quantity: order.quantity,
      order_type: order.orderType,
      price: order.limitPrice,
      validity: order.validity,
    });

    // 3. Store order in MongoDB
    await this.orderModel.create({
      ...order,
      brokerOrderId: response.order_id,
      status: 'PLACED',
      placedAt: Date.now(),
    });

    // 4. Publish event
    this.eventBus.publish(new OrderPlacedEvent(order));

    return order;
  }

  private generateAlgoId(order: Order): string {
    // Format: ENTITY_CODE-YYYYMMDD-VERSION-STRATEGY
    const date = format(new Date(), 'yyyyMMdd');
    const version = process.env.APP_VERSION;
    const strategy = order.strategy.toUpperCase();

    return `${process.env.SEBI_ENTITY_CODE}-${date}-${version}-${strategy}`;
  }
}
```

---

## Execution Algorithms

### 1. Market Orders (Immediate)

```typescript
/**
 * Best for urgent execution in liquid markets
 * Risk: Slippage in low liquidity
 */
class MarketExecution {
  async execute(order: Order): Promise<ExecutionResult> {
    const start = performance.now();

    const result = await this.broker.placeMarketOrder(order);

    const latency = performance.now() - start;
    const slippage = this.computeSlippage(
      order.expectedPrice,
      result.avgFillPrice,
    );

    this.metrics.recordLatency(latency);
    this.metrics.recordSlippage(slippage);

    return result;
  }
}
```

### 2. TWAP (Time-Weighted Average Price)

```typescript
/**
 * Split order across time to reduce market impact
 * Best for large orders in illiquid markets
 */
class TWAPExecution {
  async execute(
    order: Order,
    duration: number, // ms
    numSlices: number,
  ): Promise<ExecutionResult> {
    const sliceSize = Math.floor(order.quantity / numSlices);
    const interval = duration / numSlices;

    const fills: Fill[] = [];

    for (let i = 0; i < numSlices; i++) {
      const sliceOrder = {
        ...order,
        quantity:
          i === numSlices - 1
            ? order.quantity - fills.reduce((sum, f) => sum + f.quantity, 0)
            : sliceSize,
      };

      const fill = await this.broker.placeOrder(sliceOrder);
      fills.push(fill);

      if (i < numSlices - 1) {
        await sleep(interval);
      }
    }

    return this.aggregateFills(fills);
  }
}
```

### 3. VWAP (Volume-Weighted Average Price)

```typescript
/**
 * Execute in proportion to market volume
 * Minimizes price impact
 */
class VWAPExecution {
  async execute(
    order: Order,
    historicalVolume: number[],
  ): Promise<ExecutionResult> {
    // Compute target volume distribution
    const totalVolume = historicalVolume.reduce((a, b) => a + b, 0);
    const volumeProfile = historicalVolume.map((v) => v / totalVolume);

    const fills: Fill[] = [];

    for (let i = 0; i < volumeProfile.length; i++) {
      const sliceQuantity = Math.floor(order.quantity * volumeProfile[i]);

      if (sliceQuantity > 0) {
        const fill = await this.broker.placeOrder({
          ...order,
          quantity: sliceQuantity,
        });
        fills.push(fill);
      }

      await sleep(60000); // Wait 1 minute between slices
    }

    return this.aggregateFills(fills);
  }
}
```

### 4. RL-Based Execution (Advanced)

```typescript
/**
 * Learn optimal execution timing via reinforcement learning
 */
class RLExecution {
  private policy: PPOPolicy;

  async execute(order: Order): Promise<ExecutionResult> {
    const fills: Fill[] = [];
    let remaining = order.quantity;

    while (remaining > 0) {
      // Get market state
      const state = await this.getMarketState(order.instrumentKey);

      // Decide: execute now or wait?
      const action = await this.policy.predict(state);

      if (action.execute) {
        const sliceSize = Math.min(remaining, action.quantity);

        const fill = await this.broker.placeOrder({
          ...order,
          quantity: sliceSize,
        });

        fills.push(fill);
        remaining -= fill.quantity;

        // Record reward (negative slippage)
        const reward = -this.computeSlippage(order.expectedPrice, fill.price);
        this.policy.recordReward(reward);
      } else {
        // Wait for better price
        await sleep(1000);
      }
    }

    return this.aggregateFills(fills);
  }
}
```

---

## Smart Order Routing

```typescript
/**
 * Route orders to exchange with best liquidity/price
 */
class SmartOrderRouter {
  selectExchange(
    instrument: string,
    orderBook: { nse: OrderBook; bse: OrderBook },
  ): 'NSE' | 'BSE' {
    const nseSpread = orderBook.nse.ask - orderBook.nse.bid;
    const bseSpread = orderBook.bse.ask - orderBook.bse.bid;

    // Choose tighter spread
    if (nseSpread < bseSpread) {
      return 'NSE';
    } else if (bseSpread < nseSpread) {
      return 'BSE';
    }

    // Tie-breaker: higher volume
    return orderBook.nse.volume > orderBook.bse.volume ? 'NSE' : 'BSE';
  }
}
```

---

## Position Tracking

```typescript
interface Position {
  positionId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  entryTime: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  stopLoss: number;
  trailingStopLoss: number | null;
  takeProfit: number | null;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  greeks: GreeksData;
}

class PositionManagerService {
  @Cron('*/1 * * * * *') // Every second
  async updatePositions() {
    const positions = await this.getOpenPositions();

    for (const position of positions) {
      // Update current price
      const currentPrice = await this.getLatestPrice(position.symbol);
      position.currentPrice = currentPrice;

      // Update P&L
      position.unrealizedPnL = this.computePnL(position, currentPrice);

      // Check exit conditions
      await this.checkExitConditions(position);

      // Update in Redis (hot state)
      await this.updatePosition(position);
    }
  }

  private async checkExitConditions(position: Position) {
    // 1. Stop loss
    if (this.isStopLossHit(position)) {
      await this.exitPosition(position, 'STOP_LOSS_HIT');
      return;
    }

    // 2. Trailing stop
    if (this.isTrailingStopHit(position)) {
      await this.exitPosition(position, 'TRAILING_STOP_HIT');
      return;
    }

    // 3. Take profit
    if (this.isTakeProfitHit(position)) {
      await this.exitPosition(position, 'TAKE_PROFIT_HIT');
      return;
    }

    // 4. Time-based exit (EOD)
    if (this.isEndOfDay() && position.type === 'INTRADAY') {
      await this.exitPosition(position, 'EOD_EXIT');
      return;
    }

    // 5. ML exit signal
    const exitSignal = await this.predictionService.predictExit(position);
    if (exitSignal.shouldExit && exitSignal.confidence > 0.75) {
      await this.exitPosition(position, 'ML_REVERSAL_SIGNAL');
      return;
    }
  }
}
```

---

## Exit Signal Generation

```typescript
class ExitSignalGenerator {
  async generateExitSignal(position: Position): Promise<ExitSignal | null> {
    // Use same ML ensemble as entry
    const features = await this.featureEngine.compute(position.symbol);
    const prediction = await this.predictionEngine.predict(features);

    // Check for trend reversal
    if (position.side === 'BUY' && prediction.prediction === 'VOL_DOWN') {
      return {
        positionId: position.positionId,
        reason: 'ML_REVERSAL',
        confidence: prediction.confidence,
        recommendedAction: 'EXIT_NOW',
      };
    }

    if (position.side === 'SELL' && prediction.prediction === 'VOL_UP') {
      return {
        positionId: position.positionId,
        reason: 'ML_REVERSAL',
        confidence: prediction.confidence,
        recommendedAction: 'EXIT_NOW',
      };
    }

    return null;
  }
}
```

---

## Configuration

```typescript
export const executionEngineConfig = {
  execution: {
    algorithm: 'MARKET', // 'MARKET' | 'TWAP' | 'VWAP' | 'RL'
    slippageTolerance: 0.001, // 0.1%
    orderValidity: 'IOC', // 'IOC' | 'DAY'
    maxRetryAttempts: 3,
  },
  routing: {
    preferredExchange: 'NSE',
    enableSmartRouting: true,
  },
  positions: {
    updateInterval: 1000, // 1 second
    exitCheckInterval: 1000,
  },
  rl: {
    enabled: false,
    modelPath: 'models/rl_execution.onnx',
  },
};
```

---

## Monitoring Metrics

- `execution_engine.orders_placed_total`
- `execution_engine.orders_filled_total`
- `execution_engine.order_placement_latency_ms`
- `execution_engine.slippage_bps` (basis points)
- `execution_engine.positions_open_total`
- `execution_engine.exits_triggered_total` (by reason)

---

## Testing

```typescript
describe('ExecutionEngine', () => {
  it('should place order with SEBI-compliant algo ID', async () => {
    const order = { ...mockOrder };
    const result = await orderManager.placeOrder(order);

    expect(result.algoId).toMatch(/^[A-Z0-9]+-\d{8}-v\d+\.\d+\.\d+-[A-Z_]+$/);
  });

  it('should exit position when stop loss hit', async () => {
    const position = {
      ...mockPosition,
      stopLoss: 100,
      currentPrice: 95, // Below stop loss
    };

    await positionManager.checkExitConditions(position);

    expect(position.status).toBe('CLOSING');
  });

  it('should compute slippage correctly', () => {
    const order = { expectedPrice: 100 };
    const fill = { avgFillPrice: 101 };

    const slippage = executionEngine.computeSlippage(order, fill);

    expect(slippage).toBe(0.01); // 1% slippage
  });
});
```

---

**See Also**:

- [06-RISK-MANAGER.md](./06-RISK-MANAGER.md) - Previous layer
- [08-LOGGING-MONITORING.md](./08-LOGGING-MONITORING.md) - Next layer
- [algo-worker.instructions.md](../../../../../.github/instructions/algo-worker.instructions.md) - Position management patterns
