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
