# Layer 5: Execution

**Purpose**: Smart order routing, position tracking, and exit management

---

## Overview

The Execution layer handles order placement, position lifecycle management, and exit logic (stop loss, trailing stop, take profit, ML signals).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LAYER 5: EXECUTION                                 │
│                                                                              │
│  [Validated Order] → [Order Manager] → [Upstox API] → [Order Filled]       │
│                            ↓                               ↓                │
│                    [Position Tracker]  ←───────────────────┘                │
│                            ↓                                                │
│                    [Exit Engine]                                            │
│                    • Stop Loss    • ML Signal                               │
│                    • Trailing SL  • Time-based                              │
│                    • Take Profit  • Risk breach                             │
│                                                                              │
│  Latency Target: <20ms                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Order Manager

Smart order routing with TWAP/VWAP support:

```typescript
@Injectable()
export class OrderManagerService {
  async placeOrder(order: ValidatedOrder): Promise<OrderResult> {
    const { algorithm, slippageTolerance } = order.execution;
    
    switch (algorithm) {
      case 'MARKET':
        return await this.placeMarketOrder(order);
        
      case 'TWAP':
        return await this.placeTWAP(order, { slices: 5, intervalMs: 2000 });
        
      case 'VWAP':
        return await this.placeVWAP(order, { participationRate: 0.1 });
    }
  }
  
  private async placeMarketOrder(order: ValidatedOrder): Promise<OrderResult> {
    const request: UpstoxOrderRequest = {
      instrument_token: order.instrumentKey,
      quantity: order.quantity,
      order_type: 'MARKET',
      transaction_type: order.side,
      product: 'INTRADAY',
      validity: 'DAY',
      // SEBI Compliance
      tag: `PROJ_QUANTUM_v1_USER_${order.userId}`,
    };
    
    const response = await this.upstoxClient.placeOrder(request);
    
    await this.eventEmitter.emit('order.placed', {
      orderId: response.order_id,
      status: response.status,
      timestamp: Date.now(),
    });
    
    return response;
  }
}
```

### Position Tracker

Real-time position monitoring:

```typescript
@Injectable()
export class PositionTrackerService {
  private positions: Map<string, Position> = new Map();
  
  async updatePosition(event: OrderFilledEvent): Promise<void> {
    const positionKey = `${event.userId}_${event.instrumentKey}`;
    
    if (event.side === 'BUY') {
      // Open new position
      const position: Position = {
        id: uuidv4(),
        userId: event.userId,
        instrumentKey: event.instrumentKey,
        entryPrice: event.fillPrice,
        quantity: event.fillQuantity,
        entryTime: event.timestamp,
        currentPrice: event.fillPrice,
        pnl: 0,
        greeks: await this.fetchGreeks(event.instrumentKey),
        stopLoss: this.calculateStopLoss(event),
        trailingStop: null,
        takeProfit: event.takeProfit,
      };
      
      this.positions.set(positionKey, position);
      await this.redis.hset('positions:hot', positionKey, JSON.stringify(position));
    }
  }
  
  async updatePrices(marketData: MarketDataEvent): Promise<void> {
    for (const [key, position] of this.positions) {
      if (position.instrumentKey === marketData.instrumentKey) {
        position.currentPrice = marketData.ltp;
        position.pnl = (marketData.ltp - position.entryPrice) * position.quantity;
        
        // Check trailing stop
        if (position.trailingStop && this.trailingStopService.shouldUpdate(position)) {
          position.trailingStop = this.trailingStopService.update(position);
        }
      }
    }
  }
}
```

### Exit Engine

Multi-criteria exit signal generation:

```typescript
@Injectable()
export class ExitEngineService {
  async checkExitConditions(position: Position, marketData: MarketData): Promise<ExitSignal | null> {
    // Priority order for exits
    const checks = [
      this.checkStopLoss,      // HIGH priority
      this.checkRiskBreach,    // HIGH priority
      this.checkTrailingStop,  // MEDIUM priority
      this.checkTakeProfit,    // MEDIUM priority
      this.checkMLSignal,      // LOW priority
      this.checkTimeBasedExit, // LOW priority
    ];
    
    for (const check of checks) {
      const signal = await check.call(this, position, marketData);
      if (signal) return signal;
    }
    
    return null;
  }
  
  private checkStopLoss(position: Position, marketData: MarketData): ExitSignal | null {
    if (position.currentPrice <= position.stopLoss) {
      return {
        type: 'STOP_LOSS',
        priority: 'HIGH',
        reason: `Price ${position.currentPrice} hit stop loss ${position.stopLoss}`,
        exitPrice: position.stopLoss,
      };
    }
    return null;
  }
  
  private checkTrailingStop(position: Position, marketData: MarketData): ExitSignal | null {
    if (!position.trailingStop) return null;
    
    if (position.currentPrice <= position.trailingStop.stopPrice) {
      return {
        type: 'TRAILING_STOP',
        priority: 'MEDIUM',
        reason: `Trailing stop triggered at ${position.trailingStop.stopPrice}`,
        exitPrice: position.trailingStop.stopPrice,
      };
    }
    return null;
  }
  
  private checkTimeBasedExit(position: Position): ExitSignal | null {
    const now = new Date();
    const marketClose = new Date();
    marketClose.setHours(15, 20, 0); // 3:20 PM IST
    
    if (position.product === 'INTRADAY' && now >= marketClose) {
      return {
        type: 'TIME_BASED',
        priority: 'LOW',
        reason: 'Intraday position auto-exit before close',
        exitPrice: position.currentPrice,
      };
    }
    return null;
  }
}
```

### Trailing Stop Service

Dynamic trailing stop logic:

```typescript
@Injectable()
export class TrailingStopService {
  update(position: Position): TrailingStop {
    const { currentPrice, entryPrice, trailingStop } = position;
    const trailPct = position.config.trailingStopPct || 0.05; // 5% default
    
    // Only trail if in profit
    if (currentPrice > entryPrice) {
      const newStopPrice = currentPrice * (1 - trailPct);
      
      // Only update if new stop is higher than current
      if (!trailingStop || newStopPrice > trailingStop.stopPrice) {
        return {
          stopPrice: newStopPrice,
          peakPrice: currentPrice,
          trailPct,
          updatedAt: Date.now(),
        };
      }
    }
    
    return trailingStop;
  }
}
```

---

## Order Lifecycle

```
[ValidatedOrder]
      ↓
[OrderManager.placeOrder()]
      ↓
[Upstox API] ─────→ [order.placed event]
      ↓
[Fill Confirmation] ─→ [order.filled event]
      ↓
[PositionTracker.updatePosition()]
      ↓
[ExitEngine.checkExitConditions()] ←───┐
      ↓                                 │
[Exit Signal?] ─Yes─→ [Close Position] ─┘
      │
      No
      ↓
[Continue Monitoring]
```

---

## SEBI Compliance

Every order tagged with unique Algo ID:

```typescript
const algoId = `PROJ_QUANTUM_v${version}_USER_${userId}`;

const order = {
  instrument_token: 'NSE_FO|NIFTY25JAN24500CE',
  quantity: 50,
  order_type: 'MARKET',
  transaction_type: 'BUY',
  tag: algoId, // SEBI-compliant unique identifier
};
```

---

## Event Output

```typescript
interface OrderPlacedEvent {
  orderId: string;
  userId: string;
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  algoId: string;
  timestamp: number;
}

interface PositionOpenedEvent {
  positionId: string;
  userId: string;
  instrumentKey: string;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit?: number;
  timestamp: number;
}

interface ExitSignalEvent {
  positionId: string;
  type: 'STOP_LOSS' | 'TRAILING_STOP' | 'TAKE_PROFIT' | 'ML_SIGNAL' | 'TIME_BASED';
  reason: string;
  exitPrice: number;
  timestamp: number;
}
```

---

## Monitoring Metrics

- `execution.orders_placed_total` (counter by side)
- `execution.order_latency_ms` (histogram)
- `execution.fills_total` (counter)
- `execution.slippage_bps` (histogram)
- `execution.positions_open` (gauge)
- `execution.exits_total` (counter by type)

---

## Testing

```typescript
describe('ExecutionLayer', () => {
  it('should place market order in <20ms', async () => {
    const order = createMockOrder();
    const start = performance.now();
    await orderManager.placeOrder(order);
    expect(performance.now() - start).toBeLessThan(20);
  });
  
  it('should trigger trailing stop when price drops', () => {
    const position = {
      entryPrice: 100,
      currentPrice: 90,
      trailingStop: { stopPrice: 95, peakPrice: 110 },
    };
    const signal = exitEngine.checkTrailingStop(position);
    expect(signal.type).toBe('TRAILING_STOP');
  });
});
```

---

**See Also**:
- [04-STRATEGY-RISK.md](./04-STRATEGY-RISK.md) - Previous layer
- [06-OBSERVABILITY.md](./06-OBSERVABILITY.md) - Next layer
