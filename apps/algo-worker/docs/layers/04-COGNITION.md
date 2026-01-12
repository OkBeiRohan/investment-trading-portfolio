# Layer 4: Cognition

> **Strategy selection, regime detection, risk management, and SEBI compliance checks**

**Latency Target**: <30ms per decision

---

## Purpose

The Cognition layer receives ML predictions and makes trading decisions. It **detects market regimes** (trending/ranging/volatile), selects strategies based on regime + predictions, applies risk management rules (Kelly criterion, VIX-scaled stop-loss), performs SEBI compliance checks, and emits orders for the Execution layer.

**Architecture Alignment**: This layer implements Market Structure & Regime Detector (Layer 3), Strategy Manager (Layer 5), and Risk & Portfolio Manager (Layer 6) from the [Algo Trading Architecture](../../../../docs/ALGO_TRADING_ARCHITECTURE.md).

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

### **2. RegimeDetectorService** 🆕

**File**: `src/cognition/regime-detector.service.ts`

**Responsibilities**:

- Continuously classify market regime from recent price/feature data
- Detect regime transitions in real-time
- Provide regime context for strategy selection

**Regime Types**:

1. **TRENDING_UP**: Strong bullish momentum (MA50 > MA200, RSI > 60)
2. **TRENDING_DOWN**: Strong bearish momentum (MA50 < MA200, RSI < 40)
3. **RANGING**: Sideways, mean-reverting (Bollinger Band compression, low ATR)
4. **HIGH_VOLATILITY**: Large price swings (VIX > 20, ATR increasing)
5. **LOW_VOLATILITY**: Quiet, compressed range (VIX < 15, tight Bollinger Bands)

**Implementation Approaches**:

**A. Hidden Markov Model (HMM)** - Recommended for production

```typescript
@Injectable()
export class RegimeDetectorService {
  private hmmModel: HiddenMarkovModel;

  async detectRegime(recentFeatures: Float32Array[]): Promise<RegimeState> {
    // Load pre-trained HMM (trained in Python, exported to JSON)
    const observations = this.prepareObservations(recentFeatures);
    const stateSequence = this.hmmModel.viterbi(observations);
    const currentState = stateSequence[stateSequence.length - 1];

    return this.mapStateToRegime(currentState);
  }

  private mapStateToRegime(state: number): RegimeState {
    // State 0: Low Vol, State 1: Trending, State 2: High Vol
    const map = { 0: 'RANGING', 1: 'TRENDING_UP', 2: 'HIGH_VOLATILITY' };
    return map[state] || 'RANGING';
  }
}
```

**B. Kalman Filter** - For continuous trend/volatility estimation

```typescript
async detectRegimeContinuous(prices: number[]): Promise<RegimeState> {
  const trendEstimate = this.kalmanFilter.update(prices);
  const volatility = this.calculateVolatility(prices);

  if (Math.abs(trendEstimate) > 0.5 && volatility < 0.15) {
    return trendEstimate > 0 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  } else if (volatility > 0.25) {
    return 'HIGH_VOLATILITY';
  } else {
    return 'RANGING';
  }
}
```

**C. Technical Heuristics** - Fast fallback

```typescript
async detectRegimeSimple(features: FeatureVector): Promise<RegimeState> {
  const { rsi, ma50, ma200, bollingerWidth, vix } = features;

  // Trending detection
  if (ma50 > ma200 * 1.02 && rsi > 55) return 'TRENDING_UP';
  if (ma50 < ma200 * 0.98 && rsi < 45) return 'TRENDING_DOWN';

  // Volatility detection
  if (vix > 20 || bollingerWidth > 0.05) return 'HIGH_VOLATILITY';
  if (vix < 15 && bollingerWidth < 0.02) return 'LOW_VOLATILITY';

  return 'RANGING';
}
```

**Drift Detection** (Monitor regime classifier performance):

```typescript
@Injectable()
export class RegimeDriftDetector {
  private recentAccuracy: number[] = [];

  async checkDrift(predictedRegime: RegimeState, actualRegime: RegimeState) {
    const correct = predictedRegime === actualRegime ? 1 : 0;
    this.recentAccuracy.push(correct);

    // Keep rolling window of last 100 predictions
    if (this.recentAccuracy.length > 100) {
      this.recentAccuracy.shift();
    }

    const accuracy =
      this.recentAccuracy.reduce((a, b) => a + b, 0) /
      this.recentAccuracy.length;

    // Alert if accuracy drops below 60%
    if (accuracy < 0.6) {
      this.logger.warn('Regime detection drift detected', { accuracy });
      this.eventBus.publish(new RegimeDriftDetectedEvent(accuracy));
    }
  }
}
```

---

### **3. StrategySelectionService**

**File**: `src/cognition/strategy-selection.service.ts`

**Responsibilities**:

- Map predictions + regime to trading strategies
- **Regime-based model selection** (momentum models for trends, mean-reversion for ranges)
- Select optimal strategy based on regime + prediction confidence

**Adaptive Strategy Selection** (Regime-Aware):

```typescript
@Injectable()
export class StrategySelectionService {
  async selectStrategy(
    prediction: PredictionResult,
    regime: RegimeState,
    userConfig: UserTradingConfig,
  ): Promise<StrategyDecision> {
    // Regime-based strategy routing
    if (regime === 'TRENDING_UP' && prediction.direction === 'BULLISH') {
      // Use momentum model prediction
      if (prediction.confidence > 0.7) {
        return this.selectCallStrategy(prediction, userConfig);
      }
    } else if (regime === 'RANGING' && prediction.meanReversionProb > 0.65) {
      // Use mean-reversion model prediction
      return this.selectRangingStrategy(prediction, userConfig);
    } else if (regime === 'HIGH_VOLATILITY') {
      // Avoid naked positions, prefer spreads
      if (userConfig.strategies.allowed.includes('IRON_CONDOR')) {
        return { strategy: 'IRON_CONDOR', confidence: prediction.confidence };
      }
    }

    return { strategy: 'STAY_FLAT', confidence: 1.0 };
  }
}
```

**Strategies** (Mapped to Regimes):

| Strategy             | Best Regime              | Prediction Signal    | Risk Profile           |
| -------------------- | ------------------------ | -------------------- | ---------------------- |
| **Long Straddle**    | High Volatility Expected | Vol spike coming     | High risk, high reward |
| **Iron Condor**      | Ranging/Low Vol          | Sideways movement    | Defined risk           |
| **Bull Call Spread** | Trending Up              | Bullish continuation | Defined risk           |
| **Bear Put Spread**  | Trending Down            | Bearish continuation | Defined risk           |

### **4. RiskManagerService**

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

**Fixed Position Sizing** (Default):

```typescript
const maxPositionSize = portfolioValue * 0.05; // 5% per trade
const quantity = Math.floor(maxPositionSize / (strikePrice * lotSize));
```

**Kelly Criterion** (Advanced - Research-Validated):

```typescript
/**
 * Kelly Criterion position sizing with risk constraints
 * Research: Optimal bet size maximizing log(wealth) growth rate
 * Reference: Sherasiya et al. (2025) - Applied to NIFTY options with Sharpe 1.78
 */
function calculateKellyPositionSize(
  portfolioValue: number,
  signalConfidence: number, // 0.5-1.0 from ML ensemble
  winRate: number, // Historical win rate from backtest
  avgWin: number, // Average profit when win
  avgLoss: number, // Average loss when loss
): number {
  // Kelly formula: f = (p * b - q) / b
  // where p = win probability, q = loss probability, b = win/loss ratio
  const p = winRate;
  const q = 1 - p;
  const b = avgWin / Math.abs(avgLoss);

  const kellyFraction = (p * b - q) / b;

  // Apply fractional Kelly (1/4 Kelly to reduce volatility)
  const fractionalKelly = kellyFraction * 0.25;

  // Confidence adjustment (scale by model certainty)
  const confidenceAdjusted = fractionalKelly * signalConfidence;

  // Risk constraints
  const positionSize =
    portfolioValue *
    Math.min(
      confidenceAdjusted,
      0.1, // Max 10% portfolio (hard cap)
    );

  return Math.max(positionSize, 0); // No negative sizing
}

// Example usage
const kellySize = calculateKellyPositionSize(
  100000, // ₹1L portfolio
  0.78, // 78% model confidence
  0.62, // 62% historical win rate
  5000, // Avg win: ₹5K
  -2500, // Avg loss: ₹2.5K
);
// Result: ~₹6,000 position size (6% of portfolio)
```

**VaR-Constrained Kelly** (Institutional):

```typescript
function varConstrainedKelly(
  portfolioValue: number,
  kellyFraction: number,
  historicalReturns: number[], // Last 100 trades
  varConfidence: number = 0.95,
): number {
  // Calculate VaR (Value at Risk) at 95% confidence
  const sortedReturns = historicalReturns.sort((a, b) => a - b);
  const varIndex = Math.floor((1 - varConfidence) * sortedReturns.length);
  const var95 = Math.abs(sortedReturns[varIndex]);

  // Limit position size such that VaR < 5% portfolio
  const maxVaR = portfolioValue * 0.05;
  const varConstrainedFraction = Math.min(
    kellyFraction,
    maxVaR / (var95 * portfolioValue),
  );

  return portfolioValue * varConstrainedFraction;
}
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

### **STT Trap Guard** (Production Safety)

Force close Buy positions that are In-The-Money (ITM) on expiry day to avoid Securities Transaction Tax (STT) on notional value.

```typescript
if (
  isExpiryDay &&
  currentTime > '15:15' &&
  position.side === 'BUY' &&
  isITM(position)
) {
  await this.forceClose(position, 'STT_TRAP_GUARD');
}
```

### **Dynamic VIX Scaling**

Adjust Stop Loss based on market volatility (India VIX).

```typescript
const vix = await this.marketData.getIndiaVIX();
const baseSL = 0.05; // 5%
const dynamicSL = baseSL * (vix / 15.0); // If VIX=30, SL=10%
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
