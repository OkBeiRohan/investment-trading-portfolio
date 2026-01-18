# Layer 4: Strategy & Risk Management

**Purpose**: Regime-based strategy selection, strike selection, and pre-trade risk validation

---

## Overview

The Strategy & Risk layer decides WHICH strategy to execute and validates against risk limits. It receives trading signals from Layer 3 and outputs validated order requests to Layer 5.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 4: STRATEGY & RISK                                │
│                                                                              │
│  [Trading Signal] → [Strategy Selector] → [Strike Selector] → [Validated]  │
│        ↓                   ↓                    ↓               Order       │
│   Confidence          Regime-based         Greeks-based                     │
│   Direction           Strategy Map         Strike Selection                 │
│                            ↓                                                │
│                    [Risk Validator]                                         │
│                    Greeks | Limits | Circuit Breakers                       │
│                                                                              │
│  Latency Target: <10ms                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Strategy Selector

Maps regime + signal to optimal strategy:

```typescript
@Injectable()
export class StrategySelector {
  selectStrategy(signal: TradingSignal, regime: MarketRegime): Strategy {
    const { direction, confidence } = signal;
    
    // Trending regime
    if (regime === 'TRENDING') {
      if (direction === 'VOL_UP') return 'LONG_CALL';
      if (direction === 'VOL_DOWN') return 'LONG_PUT';
    }
    
    // Volatile regime
    if (regime === 'VOLATILE') {
      if (confidence > 0.75) {
        return direction === 'VOL_UP' ? 'BULL_CALL_SPREAD' : 'BEAR_PUT_SPREAD';
      }
      return 'LONG_STRADDLE'; // Direction uncertain
    }
    
    // Ranging regime
    if (regime === 'RANGING') {
      return 'IRON_CONDOR'; // Profit from theta decay
    }
    
    // Low volatility
    if (regime === 'LOW_VOLATILITY') {
      return 'SHORT_STRANGLE'; // Sell premium
    }
    
    return 'SKIP'; // No trade
  }
}
```

### Strategy Matrix

| Regime | VOL_UP | VOL_DOWN | NEUTRAL |
|--------|--------|----------|---------|
| **TRENDING** | LONG_CALL | LONG_PUT | Skip |
| **VOLATILE** | BULL_CALL_SPREAD | BEAR_PUT_SPREAD | LONG_STRADDLE |
| **RANGING** | Skip | Skip | IRON_CONDOR |
| **LOW_VOL** | Skip | Skip | SHORT_STRANGLE |

### Strike Selector

Delta-based strike selection:

```typescript
@Injectable()
export class StrikeSelector {
  selectStrikes(
    strategy: Strategy,
    spotPrice: number,
    optionChain: OptionTick[],
    targetDelta: number = 0.35
  ): StrikeSelection {
    const atmStrike = this.findATM(spotPrice, optionChain);
    
    switch (strategy) {
      case 'LONG_CALL':
        return {
          legs: [{ strike: atmStrike, type: 'CE', action: 'BUY' }],
          targetDelta,
        };
        
      case 'LONG_PUT':
        return {
          legs: [{ strike: atmStrike, type: 'PE', action: 'BUY' }],
          targetDelta: -targetDelta,
        };
        
      case 'LONG_STRADDLE':
        return {
          legs: [
            { strike: atmStrike, type: 'CE', action: 'BUY' },
            { strike: atmStrike, type: 'PE', action: 'BUY' },
          ],
          targetDelta: 0,
        };
        
      case 'IRON_CONDOR':
        const width = 100; // Strike width
        return {
          legs: [
            { strike: atmStrike - width * 2, type: 'PE', action: 'BUY' },
            { strike: atmStrike - width, type: 'PE', action: 'SELL' },
            { strike: atmStrike + width, type: 'CE', action: 'SELL' },
            { strike: atmStrike + width * 2, type: 'CE', action: 'BUY' },
          ],
          targetDelta: 0,
        };
    }
  }
}
```

### Risk Validator

Pre-trade risk checks:

```typescript
@Injectable()
export class RiskValidatorService {
  private readonly limits: RiskLimits;
  
  validateOrder(order: OrderRequest, portfolio: Portfolio, config: UserConfig): ValidationResult {
    const errors: string[] = [];
    
    // --- Position Limits ---
    if (portfolio.openPositions.length >= config.limits.maxConcurrentPositions) {
      errors.push('MAX_POSITIONS_REACHED');
    }
    
    // --- Greeks Limits ---
    const projectedDelta = portfolio.delta + order.greeks.delta;
    if (Math.abs(projectedDelta) > config.risk.greeksLimits.maxDelta) {
      errors.push('DELTA_LIMIT_EXCEEDED');
    }
    
    // --- Daily Loss Limit ---
    if (portfolio.dailyPnL <= config.risk.maxDailyDrawdown * -1) {
      errors.push('DAILY_LOSS_LIMIT_REACHED');
    }
    
    // --- Single Trade Limit ---
    if (order.notionalValue > config.limits.maxSingleTradeAmount) {
      errors.push('SINGLE_TRADE_LIMIT_EXCEEDED');
    }
    
    // --- Leverage Limit ---
    const projectedLeverage = (portfolio.totalExposure + order.notionalValue) / portfolio.equity;
    if (projectedLeverage > config.risk.maxLeverage) {
      errors.push('LEVERAGE_LIMIT_EXCEEDED');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedAt: Date.now(),
    };
  }
}
```

### Position Sizer

Kelly criterion and fixed-size options:

```typescript
@Injectable()
export class PositionSizerService {
  calculateSize(
    signal: TradingSignal,
    portfolio: Portfolio,
    config: UserConfig
  ): number {
    const { positionSizingStrategy, maxSingleTradeAmount } = config.risk;
    
    switch (positionSizingStrategy) {
      case 'FIXED':
        return maxSingleTradeAmount;
        
      case 'KELLY':
        // Kelly formula: f* = (p * b - q) / b
        // p = win probability, q = 1-p, b = win/loss ratio
        const p = signal.confidence;
        const q = 1 - p;
        const b = 1.5; // Average win/loss ratio
        const kellyFraction = Math.max(0, (p * b - q) / b);
        const maxRisk = portfolio.equity * 0.02; // Max 2% per trade
        return Math.min(kellyFraction * portfolio.equity, maxRisk, maxSingleTradeAmount);
        
      case 'RL_BASED':
        // RL agent determines position size based on state
        return this.rlAgent.getPositionSize(signal, portfolio);
    }
  }
}
```

---

## Circuit Breakers

Automatic trading halt conditions:

```typescript
@Injectable()
export class CircuitBreakerService {
  private state: CircuitState = 'CLOSED';
  
  checkCircuitBreakers(metrics: SystemMetrics): CircuitState {
    // Data Staleness
    if (metrics.lastTickMs > 5000) {
      return this.trip('STALE_DATA', '5s without market data');
    }
    
    // Latency Degradation
    if (metrics.p95LatencyMs > 150) {
      return this.trip('HIGH_LATENCY', 'P95 latency >150ms');
    }
    
    // Risk Breach
    if (metrics.dailyDrawdownPct > 5) {
      return this.trip('RISK_BREACH', 'Daily drawdown >5%');
    }
    
    // Model Drift
    if (metrics.modelAccuracyRolling < 0.45) {
      return this.trip('MODEL_DRIFT', 'Accuracy <45%');
    }
    
    return 'CLOSED'; // All clear
  }
  
  private trip(reason: string, message: string): CircuitState {
    this.state = 'OPEN';
    this.alertService.sendCritical(`Circuit breaker tripped: ${reason} - ${message}`);
    return 'OPEN';
  }
}
```

---

## Event Output

```typescript
interface StrategySelectedEvent {
  timestamp: number;
  strategy: Strategy;
  strikes: StrikeSelection;
  positionSize: number;
  riskValidation: ValidationResult;
  metadata: {
    signal: TradingSignal;
    regime: MarketRegime;
  };
}
```

---

## Configuration

```typescript
// User-configurable risk limits
interface RiskLimits {
  maxDailyDrawdown: number;      // e.g., 5000 (₹)
  maxSingleTradeAmount: number;  // e.g., 10000 (₹)
  maxConcurrentPositions: number; // e.g., 5
  maxLeverage: number;           // e.g., 2.0
  greeksLimits: {
    maxDelta: number;    // e.g., 100
    maxGamma: number;    // e.g., 50
    maxTheta: number;    // e.g., -500
    maxVega: number;     // e.g., 200
  };
}
```

---

## Monitoring Metrics

- `strategy.selected_total` (counter by strategy)
- `strategy.selection_duration_ms` (histogram)
- `risk.validation_passed_total` (counter)
- `risk.validation_failed_total` (counter by reason)
- `risk.circuit_breaker_trips_total` (counter by reason)
- `risk.daily_pnl` (gauge)

---

## Testing

```typescript
describe('StrategyRiskLayer', () => {
  it('should select LONG_CALL for trending UP regime', () => {
    const signal = { direction: 'VOL_UP', confidence: 0.75 };
    const regime = 'TRENDING';
    const strategy = strategySelector.selectStrategy(signal, regime);
    expect(strategy).toBe('LONG_CALL');
  });
  
  it('should reject order exceeding delta limits', () => {
    const order = { greeks: { delta: 150 } };
    const config = { risk: { greeksLimits: { maxDelta: 100 } } };
    const result = riskValidator.validateOrder(order, portfolio, config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('DELTA_LIMIT_EXCEEDED');
  });
});
```

---

**See Also**:
- [03-PREDICTION.md](./03-PREDICTION.md) - Previous layer
- [05-EXECUTION.md](./05-EXECUTION.md) - Next layer
