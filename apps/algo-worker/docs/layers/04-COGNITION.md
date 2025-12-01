# Layer 4: Cognition

> **Strategy selection, risk management, and SEBI compliance checks**

**Latency Target**: <30ms per decision

---

## Purpose

The Cognition layer receives ML predictions and makes trading decisions. It selects strategies based on market regime, applies risk management rules, performs SEBI compliance checks, and emits orders for the Execution layer.

---

## Components

### **1. UserConfigService**

**File**: `src/cognition/user-config.service.ts`

**Responsibilities**:

- Load active user trading configurations on startup
- Cache configurations in Redis for fast access
- Compute union of enabled instruments/strategies
- Provide user-specific validation methods

**Example**:

```typescript
@Injectable()
export class UserConfigService {
  private activeConfigs: Map<string, UserTradingConfig> = new Map();
  private unionConfig: UnionConfig;

  async loadActiveConfigs() {
    const configs = await this.mongo
      .collection('user_trading_configs')
      .find({ enabled: true })
      .toArray();

    this.activeConfigs = new Map(configs.map((c) => [c.userId, c]));
    this.unionConfig = this.computeUnion(configs);
  }

  computeUnion(configs: UserTradingConfig[]): UnionConfig {
    return {
      instruments: new Set(
        configs.flatMap((c) => this.getEnabledInstruments(c)),
      ),
      strategies: new Set(configs.flatMap((c) => c.strategies.allowed)),
      permissions: {
        anyBuyCalls: configs.some((c) => c.permissions.allowBuyCalls),
        anySellCalls: configs.some((c) => c.permissions.allowSellCalls),
        anyBuyPuts: configs.some((c) => c.permissions.allowBuyPuts),
        anySellPuts: configs.some((c) => c.permissions.allowSellPuts),
      },
    };
  }

  shouldAnalyzeInstrument(symbol: string): boolean {
    return this.unionConfig.instruments.has(symbol);
  }

  getUsersInterestedIn(signal: TradingSignal): string[] {
    return Array.from(this.activeConfigs.entries())
      .filter(([_, config]) => this.matchesConfig(signal, config))
      .map(([userId]) => userId);
  }

  validateSignalForUser(
    signal: TradingSignal,
    userId: string,
  ): ValidationResult {
    const config = this.activeConfigs.get(userId);
    if (!config) return { valid: false, reason: 'User not active' };

    // Check permissions
    if (signal.direction === 'BUY' && signal.instrumentType === 'CALL') {
      if (!config.permissions.allowBuyCalls) {
        return { valid: false, reason: 'Buy calls disabled' };
      }
    }

    // Check strategy allowed
    if (!config.strategies.allowed.includes(signal.strategy)) {
      return { valid: false, reason: 'Strategy not allowed' };
    }

    // Check confidence threshold
    if (signal.confidence < config.strategies.minSignalConfidence) {
      return { valid: false, reason: 'Signal confidence too low' };
    }

    return { valid: true };
  }
}
```

---

### **2. StrategySelectionService**

**File**: `src/cognition/strategy-selection.service.ts`

**Responsibilities**:

- Map predictions to trading strategies (Long Straddle, Iron Condor, etc.)
- Detect market regime (trending, ranging, volatile)
- Select optimal strategy based on regime + prediction confidence

**Strategies**:

- **Long Straddle**: High vol prediction + low current IV (buy ATM call + put)
- **Iron Condor**: Low vol prediction + ranging market (sell OTM spreads)
- **Bull Call Spread**: Bullish prediction + trending market
- **Bear Put Spread**: Bearish prediction + trending market

### **3. RiskManagerService**

**File**: `src/cognition/risk-manager.service.ts`

**Responsibilities**:

- Validate position sizing (max 5% capital per trade)
- Check portfolio-level risk (max 20% total exposure)
- Verify margin availability
- Apply stop-loss/take-profit rules
- Enforce daily loss limit (max 3% portfolio)

**SEBI Compliance Checks**:

- ✅ Unique Algo ID (set in order metadata)
- ✅ Pre-trade checks (risk limits, margin)
- ✅ Order quantity limits (<10% ADV)
- ✅ Price reasonability check (within ±5% of LTP)
- ✅ Audit trail logging (5-year retention)

---

## Events Consumed

### **`PredictionCompletedEvent`**

**Source**: Prediction layer

---

## Events Published

### **`OrderDecisionEvent`**

```typescript
export class OrderDecisionEvent {
  constructor(
    public readonly algoId: string, // SEBI Unique Algo ID
    public readonly strategy: string, // "LongStraddle"
    public readonly symbol: string,
    public readonly side: 'BUY' | 'SELL',
    public readonly quantity: number,
    public readonly orderType: 'LIMIT' | 'MARKET',
    public readonly price?: number,
    public readonly riskChecks: {
      positionSize: boolean;
      portfolioExposure: boolean;
      marginAvailable: boolean;
      priceReasonability: boolean;
      quantityLimit: boolean;
    },
  ) {}
}
```

**Consumed By**: Execution layer (OrderPlacementService)

---

## Risk Management Rules

### **Position Sizing**

```typescript
const maxPositionSize = portfolioValue * 0.05; // 5% per trade
const quantity = Math.floor(maxPositionSize / (strikePrice * lotSize));
```

### **Portfolio Exposure**

```typescript
const totalExposure = positions.reduce((sum, p) => sum + p.notional, 0);
if (totalExposure > portfolioValue * 0.2) {
  throw new RiskLimitExceededError('Portfolio exposure >20%');
}
```

### **Daily Loss Limit**

```typescript
const dailyPnL = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
if (dailyPnL < -portfolioValue * 0.03) {
  throw new DailyLossLimitExceededError('Daily loss >3%');
}
```

---

## SEBI Compliance

### **Unique Algo ID Format**

```
{ENTITY_CODE}-{DATE}-{VERSION}-{STRATEGY}

Example: ABC123-20241215-V1.2.3-STRADDLE
```

**Implementation**:

```typescript
const algoId = `${process.env.SEBI_ENTITY_CODE}-${format(new Date(), 'yyyyMMdd')}-${process.env.APP_VERSION}-${strategy.toUpperCase()}`;
```

### **Pre-Trade Checks**

```typescript
async validateOrder(order: Order): Promise<boolean> {
  // 1. Position size check
  if (order.quantity * order.price > this.maxPositionSize) return false;

  // 2. Price reasonability check (±5% of LTP)
  const ltp = await this.marketData.getLTP(order.symbol);
  if (Math.abs(order.price - ltp) / ltp > 0.05) return false;

  // 3. Quantity limit check (<10% ADV)
  const adv = await this.marketData.getADV(order.symbol);
  if (order.quantity > adv * 0.10) return false;

  // 4. Margin check
  const marginRequired = await this.broker.calculateMargin(order);
  if (marginRequired > this.availableMargin) return false;

  return true;
}
```

### **Audit Trail**

All orders logged to MongoDB with 5-year retention:

```typescript
await this.mongo.collection('audit_trail').insertOne({
  algoId,
  timestamp: Date.now(),
  symbol: order.symbol,
  side: order.side,
  quantity: order.quantity,
  price: order.price,
  riskChecks: order.riskChecks,
  accountId: process.env.ACCOUNT_ID,
});
```

---

## Performance Targets

| Metric                | Target    |
| --------------------- | --------- |
| Decision latency      | <30ms p95 |
| Risk check time       | <10ms     |
| Compliance check time | <5ms      |

---

## Monitoring

### **Metrics** (Prometheus)

```typescript
cognition.decisions_total{strategy="LongStraddle"}        // Counter
cognition.decision_duration_ms                            // Histogram
cognition.risk_violations_total{type="position_size"}     // Counter
cognition.sebi_compliance_checks_total{result="pass"}     // Counter
```

---

## Testing

**File**: `test/cognition.e2e-spec.ts`

```typescript
describe('Cognition Layer (e2e)', () => {
  it('should enforce position size limit', async () => {
    const order = { quantity: 1000, price: 100 }; // Exceeds 5% limit
    await expect(riskManager.validateOrder(order)).rejects.toThrow(
      RiskLimitExceededError,
    );
  });

  it('should generate valid SEBI Algo ID', () => {
    const algoId = strategySelection.generateAlgoId('LongStraddle');
    expect(algoId).toMatch(/^[A-Z0-9]+-\d{8}-V\d+\.\d+\.\d+-[A-Z]+$/);
  });
});
```

---

## Dependencies

- **Upstream**: Prediction layer (`PredictionCompletedEvent`)
- **Downstream**: Execution layer (`OrderDecisionEvent`)
- **External**: MongoDB (audit trail), Redis (position cache)

---

## See Also

- [Layer 3: Prediction](./03-PREDICTION.md)
- [Layer 5: Execution](./05-EXECUTION.md)
- [SEBI 2024-2025 Guidelines](../SEBI_COMPLIANCE.md)
