# Layer 5: Execution

> **Smart order routing with TWAP/VWAP execution algorithms**

**Latency Target**: <50ms order placement + ack

---

## Purpose

The Execution layer receives order decisions from the Cognition layer and places orders via broker APIs (Upstox). It implements smart order routing algorithms (TWAP, VWAP) to minimize market impact and monitors order fills in real-time.

---

## Components

### **1. OrderPlacementService**

**File**: `src/execution/order-placement.service.ts`

**Responsibilities**:

- Listen to `OrderDecisionEvent`
- Place orders via Upstox API
- Generate unique order IDs
- Emit `OrderPlacedEvent`

### **2. ExecutionMonitorService**

**File**: `src/execution/execution-monitor.service.ts`

**Responsibilities**:

- Poll order status from broker
- Handle partial fills
- Emit `OrderFilledEvent`, `OrderRejectedEvent`

### **3. TWAPExecutor**

**File**: `src/execution/twap-executor.service.ts`

**Responsibilities**:

- Split large orders into time-weighted slices
- Example: 1000 lots over 10 minutes = 100 lots every 1 minute

### **4. VWAPExecutor**

**File**: `src/execution/vwap-executor.service.ts`

**Responsibilities**:

- Split orders based on historical volume profile
- Place more during high-volume periods

---

### **5. PositionManagerService**

**File**: `src/execution/position-manager.service.ts`

**Responsibilities**:

- Track all open positions in real-time
- Monitor position PnL (realized + unrealized)
- Calculate position Greeks (delta, gamma, theta, vega)
- Emit `PositionOpenedEvent`, `PositionClosedEvent`, `PositionUpdatedEvent`
- Maintain position ledger in Redis (hot) and MongoDB (cold)

**Example**:

```typescript
@Injectable()
export class PositionManagerService {
  private openPositions: Map<string, Position> = new Map();

  @OnEvent('OrderFilledEvent')
  async handleOrderFill(event: OrderFilledEvent) {
    const position = this.openPositions.get(event.symbol);

    if (!position) {
      // New position opened
      const newPosition = {
        positionId: uuid(),
        userId: event.userId,
        symbol: event.symbol,
        side: event.side,
        quantity: event.quantity,
        entryPrice: event.fillPrice,
        entryTime: event.timestamp,
        currentPrice: event.fillPrice,
        unrealizedPnL: 0,
        realizedPnL: 0,
        stopLoss: this.calculateInitialStopLoss(event),
        trailingStopLoss: null,
        status: 'OPEN',
      };

      this.openPositions.set(event.symbol, newPosition);
      await this.redis.hset(
        'positions:open',
        event.symbol,
        JSON.stringify(newPosition),
      );
      this.eventBus.publish(new PositionOpenedEvent(newPosition));
    } else {
      // Position size increased/decreased
      this.updatePosition(position, event);
    }
  }

  async updatePositionPrices() {
    // Called every tick from market data
    for (const [symbol, position] of this.openPositions) {
      const currentPrice = await this.getLatestPrice(symbol);
      const unrealizedPnL = this.calculateUnrealizedPnL(position, currentPrice);

      position.currentPrice = currentPrice;
      position.unrealizedPnL = unrealizedPnL;

      // Update trailing stop loss
      if (position.trailingStopLoss) {
        position.trailingStopLoss = this.updateTrailingStop(
          position,
          currentPrice,
        );
      }

      await this.redis.hset('positions:open', symbol, JSON.stringify(position));
      this.eventBus.publish(new PositionUpdatedEvent(position));

      // Check exit conditions
      await this.checkExitConditions(position);
    }
  }

  private calculateInitialStopLoss(event: OrderFilledEvent): number {
    const config = this.userConfigService.getConfig(event.userId);
    const baseStopLoss =
      event.fillPrice * (1 - config.risk.stopLossPercent / 100);
    return baseStopLoss;
  }

  private updateTrailingStop(position: Position, currentPrice: number): number {
    const config = this.userConfigService.getConfig(position.userId);
    const trailingPercent = config.risk.trailingStopLossPercent || 5; // 5% default

    if (position.side === 'BUY') {
      // For long positions, trail upward
      const newStop = currentPrice * (1 - trailingPercent / 100);
      return Math.max(position.trailingStopLoss || 0, newStop);
    } else {
      // For short positions, trail downward
      const newStop = currentPrice * (1 + trailingPercent / 100);
      return Math.min(position.trailingStopLoss || Infinity, newStop);
    }
  }
}
```

---

### **6. ExitSignalGeneratorService**

**File**: `src/execution/exit-signal-generator.service.ts`

**Responsibilities**:

- Monitor open positions for exit conditions
- Generate exit signals based on multiple criteria:
  - **Stop Loss Hit**: Price breaches fixed or trailing stop
  - **Take Profit Hit**: Target price reached
  - **Time-Based Exit**: End of day (EOD) for intraday positions
  - **ML-Based Exit**: Model predicts trend reversal
  - **Risk Limit Breach**: Portfolio Greeks exceed limits
  - **User Request**: Manual close via UI
- Emit `ExitSignalEvent` to trigger position closure

**Example**:

```typescript
@Injectable()
export class ExitSignalGeneratorService {
  @Cron('*/5 * * * * *') // Every 5 seconds
  async checkExitConditions() {
    const positions = await this.positionManager.getOpenPositions();

    for (const position of positions) {
      const exitReasons = [];

      // 1. Stop loss check (highest priority)
      if (this.isStopLossHit(position)) {
        exitReasons.push('STOP_LOSS_HIT');
      }

      // 2. Trailing stop loss check
      if (this.isTrailingStopHit(position)) {
        exitReasons.push('TRAILING_STOP_HIT');
      }

      // 3. Take profit check
      if (this.isTakeProfitHit(position)) {
        exitReasons.push('TAKE_PROFIT_HIT');
      }

      // 4. Time-based exit (EOD for intraday)
      if (this.isEndOfDay() && position.type === 'INTRADAY') {
        exitReasons.push('EOD_EXIT');
      }

      // 5. ML-based exit signal
      const mlExitSignal = await this.checkMLExitSignal(position);
      if (mlExitSignal) {
        exitReasons.push('ML_REVERSAL_SIGNAL');
      }

      // 6. Risk limit breach
      if (this.isRiskLimitBreached(position)) {
        exitReasons.push('RISK_LIMIT_BREACH');
      }

      if (exitReasons.length > 0) {
        this.logger.log(
          `Exit signal for ${position.symbol}: ${exitReasons.join(', ')}`,
        );
        this.eventBus.publish(new ExitSignalEvent(position, exitReasons));
      }
    }
  }

  private isStopLossHit(position: Position): boolean {
    if (position.side === 'BUY') {
      return position.currentPrice <= position.stopLoss;
    } else {
      return position.currentPrice >= position.stopLoss;
    }
  }

  private isTrailingStopHit(position: Position): boolean {
    if (!position.trailingStopLoss) return false;

    if (position.side === 'BUY') {
      return position.currentPrice <= position.trailingStopLoss;
    } else {
      return position.currentPrice >= position.trailingStopLoss;
    }
  }

  private isTakeProfitHit(position: Position): boolean {
    if (!position.takeProfit) return false;

    if (position.side === 'BUY') {
      return position.currentPrice >= position.takeProfit;
    } else {
      return position.currentPrice <= position.takeProfit;
    }
  }

  private async checkMLExitSignal(position: Position): Promise<boolean> {
    // Use same ML models to predict trend reversal
    const features = await this.cortexService.getLatestFeatures(
      position.symbol,
    );
    const prediction = await this.predictionService.predict(features);

    // If we're LONG and model predicts VOL_DOWN with high confidence, exit
    if (
      position.side === 'BUY' &&
      prediction.direction === 'VOL_DOWN' &&
      prediction.confidence > 0.75
    ) {
      return true;
    }

    // If we're SHORT and model predicts VOL_UP with high confidence, exit
    if (
      position.side === 'SELL' &&
      prediction.direction === 'VOL_UP' &&
      prediction.confidence > 0.75
    ) {
      return true;
    }

    return false;
  }
}
```

---

## Events Consumed

### **`OrderDecisionEvent`**

**Source**: Cognition layer

---

## Events Published

### **`OrderPlacedEvent`**

```typescript
export class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly brokerOrderId: string,
    public readonly symbol: string,
    public readonly side: 'BUY' | 'SELL',
    public readonly quantity: number,
    public readonly price: number,
  ) {}
}
```

---

### **`PositionOpenedEvent`**

```typescript
export class PositionOpenedEvent {
  constructor(
    public readonly position: {
      positionId: string;
      userId: string;
      symbol: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      entryPrice: number;
      entryTime: number;
      stopLoss: number;
      trailingStopLoss: number | null;
      takeProfit: number | null;
    },
  ) {}
}
```

---

### **`PositionUpdatedEvent`**

```typescript
export class PositionUpdatedEvent {
  constructor(
    public readonly position: {
      positionId: string;
      currentPrice: number;
      unrealizedPnL: number;
      realizedPnL: number;
      trailingStopLoss: number | null;
      lastUpdated: number;
    },
  ) {}
}
```

---

### **`ExitSignalEvent`**

```typescript
export class ExitSignalEvent {
  constructor(
    public readonly position: Position,
    public readonly reasons: string[], // ['STOP_LOSS_HIT', 'ML_REVERSAL_SIGNAL']
    public readonly priority: 'HIGH' | 'MEDIUM' | 'LOW', // Stop loss = HIGH, Take profit = MEDIUM
  ) {}
}
```

### **`OrderFilledEvent`**

```typescript
export class OrderFilledEvent {
  constructor(
    public readonly orderId: string,
    public readonly filledQuantity: number,
    public readonly avgPrice: number,
    public readonly fillTime: number,
  ) {}
}
```

---

## Smart Order Routing

### **TWAP (Time-Weighted Average Price)**

```typescript
async executeTWAP(order: Order, durationMs: number, slices: number): Promise<void> {
  const qtyPerSlice = Math.floor(order.quantity / slices);
  const intervalMs = durationMs / slices;

  for (let i = 0; i < slices; i++) {
    await this.placeOrder({ ...order, quantity: qtyPerSlice });
    await this.sleep(intervalMs);
  }
}
```

### **VWAP (Volume-Weighted Average Price)**

```typescript
async executeVWAP(order: Order, volumeProfile: number[]): Promise<void> {
  const totalVolume = volumeProfile.reduce((a, b) => a + b);

  for (let i = 0; i < volumeProfile.length; i++) {
    const weight = volumeProfile[i] / totalVolume;
    const qty = Math.floor(order.quantity * weight);
    await this.placeOrder({ ...order, quantity: qty });
    await this.sleep(60000); // 1 minute intervals
  }
}
```

---

## Broker Integration (Upstox)

### **Place Order**

```typescript
async placeOrder(order: Order): Promise<string> {
  const response = await this.upstoxClient.placeOrder({
    instrument_token: order.symbol,
    transaction_type: order.side,
    quantity: order.quantity,
    order_type: order.orderType,
    price: order.price,
    product: 'I', // Intraday
    validity: 'DAY',
    tag: order.algoId, // SEBI Unique Algo ID
  });

  return response.data.order_id;
}
```

### **Get Order Status**

```typescript
async getOrderStatus(orderId: string): Promise<OrderStatus> {
  const response = await this.upstoxClient.getOrderDetails(orderId);
  return {
    status: response.data.status, // 'COMPLETE', 'OPEN', 'REJECTED'
    filledQuantity: response.data.filled_quantity,
    avgPrice: response.data.average_price,
  };
}
```

---

## Performance Targets

| Metric                     | Target     |
| -------------------------- | ---------- |
| Order placement latency    | <50ms p95  |
| Order ack latency (broker) | <100ms p95 |
| Fill monitoring interval   | 1 second   |

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
execution.orders_placed_total{side="BUY"}             // Counter
execution.orders_filled_total                         // Counter
execution.orders_rejected_total{reason="..."}         // Counter
execution.order_placement_duration_ms                 // Histogram
execution.fill_rate{symbol="..."}                     // Gauge (0-1)
execution.slippage_bps{symbol="..."}                  // Histogram
```

---

## Error Handling

### **Order Rejection**

```typescript
if (orderStatus === 'REJECTED') {
  this.logger.error(`Order rejected: ${orderId}`, {
    reason: response.data.rejection_reason,
  });
  this.eventBus.publish(
    new OrderRejectedEvent(orderId, response.data.rejection_reason),
  );
  this.metrics.increment('execution.orders_rejected_total', {
    reason: response.data.rejection_reason,
  });
}
```

### **Broker API Errors**

- **Retry Logic**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Circuit Breaker**: Open after 10 consecutive failures
- **Alerting**: Emit `BrokerAPIDownEvent` → PagerDuty

---

## Testing

**File**: `test/execution.e2e-spec.ts`

```typescript
describe('Execution Layer (e2e)', () => {
  it('should place order via Upstox', async () => {
    const order = {
      symbol: 'NIFTY24DEC21000CE',
      side: 'BUY',
      quantity: 50,
      price: 100,
    };
    const orderId = await executionService.placeOrder(order);
    expect(orderId).toBeDefined();
  });

  it('should execute TWAP', async () => {
    const order = {
      symbol: 'NIFTY24DEC21000CE',
      side: 'BUY',
      quantity: 1000,
      price: 100,
    };
    await twapExecutor.executeTWAP(order, 600000, 10); // 10 slices over 10 minutes
    // Verify 10 orders placed
  });
});
```

---

## Dependencies

- **Upstream**: Cognition layer (`OrderDecisionEvent`)
- **Downstream**: Memory layer (`OrderFilledEvent`)
- **External**: Upstox API

---

## See Also

- [Layer 4: Cognition](./04-COGNITION.md)
- [Layer 6: Memory](./06-MEMORY.md)
- [Upstox API Documentation](https://upstox.com/developer/api-documentation)
