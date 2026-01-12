# Layer 6: Risk & Portfolio Manager

**Purpose**: Position sizing, risk limits enforcement, and portfolio-level Greeks monitoring

---

## Overview

The Risk Manager validates all trading decisions against risk limits and computes optimal position sizes. It's the final gatekeeper before order execution.

---

## Components

### RiskValidationService

- Pre-trade risk checks
- Real-time limit monitoring
- Circuit breaker triggers

### PositionSizingService

- Kelly criterion calculation
- Greeks-based sizing
- RL-based optimization (optional)

### PortfolioGreeksService

- Aggregate Greeks computation
- Hedging recommendations
- Delta-neutral adjustments

---

## Pre-Trade Risk Checks

```typescript
interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  adjustedQuantity?: number;
}

class RiskValidationService {
  async validateTrade(
    strategy: Strategy,
    portfolio: Portfolio,
    config: UserTradingConfig,
  ): Promise<RiskCheckResult> {
    // 1. Position size limits
    if (
      strategy.quantity * strategy.premium >
      config.limits.maxSingleTradeAmount
    ) {
      return {
        approved: false,
        reason: 'Exceeds max single trade amount',
      };
    }

    // 2. Total exposure
    const totalExposure = portfolio.totalExposure + strategy.notionalValue;
    if (totalExposure > config.limits.maxTotalExposure) {
      return {
        approved: false,
        reason: 'Exceeds max total exposure',
      };
    }

    // 3. Concurrent positions
    if (portfolio.openPositions >= config.limits.maxConcurrentPositions) {
      return {
        approved: false,
        reason: 'Max concurrent positions reached',
      };
    }

    // 4. Daily trade count
    if (portfolio.todayTrades >= config.limits.maxDailyTrades) {
      return {
        approved: false,
        reason: 'Daily trade limit reached',
      };
    }

    // 5. Greeks limits
    const newGreeks = this.computePortfolioGreeks(portfolio, strategy);
    if (Math.abs(newGreeks.delta) > config.risk.greeksLimits.maxDelta) {
      // Try reducing quantity
      const adjustedQty = this.reduceToGreeksLimit(strategy, portfolio, config);
      if (adjustedQty > 0) {
        return { approved: true, adjustedQuantity: adjustedQty };
      }
      return {
        approved: false,
        reason: 'Would exceed delta limit',
      };
    }

    // 6. Margin check
    const marginRequired = this.computeMargin(strategy, portfolio);
    if (marginRequired > portfolio.availableMargin) {
      return {
        approved: false,
        reason: 'Insufficient margin',
      };
    }

    // 7. Daily loss limit
    if (portfolio.dailyPnL < -config.risk.maxDailyDrawdown) {
      return {
        approved: false,
        reason: 'Daily loss limit exceeded (circuit breaker)',
      };
    }

    return { approved: true };
  }
}
```

---

## Position Sizing Strategies

### 1. Kelly Criterion

```typescript
/**
 * Optimal position size using Kelly Criterion
 * f* = (p * b - q) / b
 * where:
 *   p = win probability
 *   q = loss probability (1 - p)
 *   b = win/loss ratio
 */
class KellyPositionSizer {
  computeSize(
    signal: TradingSignal,
    portfolio: Portfolio,
    config: UserTradingConfig,
  ): number {
    const p = signal.confidence; // Win probability
    const q = 1 - p;

    // Estimate win/loss ratio from historical data
    const b = this.getWinLossRatio(signal.regime);

    // Kelly fraction
    const kellyFraction = (p * b - q) / b;

    // Apply half-kelly for safety
    const fractionalKelly = kellyFraction * 0.5;

    // Convert to position size
    const portfolioValue = portfolio.equity;
    const positionValue = portfolioValue * fractionalKelly;

    // Clamp to limits
    return Math.min(positionValue, config.limits.maxSingleTradeAmount);
  }
}
```

### 2. Greeks-Based Sizing

```typescript
/**
 * Size position to maintain portfolio Greeks within limits
 */
class GreeksPositionSizer {
  computeSize(
    strategy: Strategy,
    portfolio: Portfolio,
    config: UserTradingConfig,
  ): number {
    const currentDelta = portfolio.greeks.delta;
    const maxDelta = config.risk.greeksLimits.maxDelta;

    // Delta per unit of this strategy
    const strategyDelta = strategy.greeks.delta;

    // Max quantity that keeps delta in range
    const maxQty = Math.floor(
      (maxDelta - Math.abs(currentDelta)) / Math.abs(strategyDelta),
    );

    return Math.max(1, maxQty);
  }
}
```

### 3. RL-Based Sizing (Optional)

```typescript
/**
 * Reinforcement Learning agent for adaptive position sizing
 */
class RLPositionSizer {
  private policy: PPOPolicy;

  async computeSize(
    signal: TradingSignal,
    portfolio: Portfolio,
    config: UserTradingConfig,
  ): Promise<number> {
    const state = this.encodeState({
      confidence: signal.confidence,
      regime: signal.regime,
      portfolioGreeks: portfolio.greeks,
      recentPnL: portfolio.last24hPnL,
      volatility: portfolio.realizedVol,
    });

    const action = await this.policy.predict(state);

    // Action = position size as fraction of portfolio
    const fraction = this.decodeAction(action);

    return portfolio.equity * fraction;
  }
}
```

---

## Portfolio Greeks Computation

```typescript
interface PortfolioGreeks {
  delta: number; // Total delta exposure
  gamma: number; // Convexity
  vega: number; // Volatility sensitivity
  theta: number; // Time decay
  rho: number; // Interest rate sensitivity
}

class PortfolioGreeksService {
  computeGreeks(positions: Position[]): PortfolioGreeks {
    return positions.reduce(
      (acc, pos) => ({
        delta: acc.delta + pos.quantity * pos.greeks.delta,
        gamma: acc.gamma + pos.quantity * pos.greeks.gamma,
        vega: acc.vega + pos.quantity * pos.greeks.vega,
        theta: acc.theta + pos.quantity * pos.greeks.theta,
        rho: acc.rho + pos.quantity * pos.greeks.rho,
      }),
      { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 },
    );
  }

  suggestHedge(
    portfolio: Portfolio,
    limits: GreeksLimits,
  ): HedgeRecommendation | null {
    const greeks = this.computeGreeks(portfolio.positions);

    // Check if delta hedge needed
    if (Math.abs(greeks.delta) > limits.maxDelta * 0.8) {
      const hedgeQuantity = -greeks.delta; // Opposite direction

      return {
        type: 'DELTA_HEDGE',
        instrument: 'NIFTY_FUTURES',
        quantity: Math.round(hedgeQuantity / 50), // 1 lot = 50 delta
        reason: `Portfolio delta ${greeks.delta} exceeds 80% of limit`,
      };
    }

    // Check vega exposure in high-IV environment
    if (greeks.vega > limits.maxVega && portfolio.vix > 20) {
      return {
        type: 'VEGA_HEDGE',
        instrument: 'SHORT_STRADDLE',
        reason: 'Excessive vega exposure in high-IV regime',
      };
    }

    return null;
  }
}
```

---

## Stop Loss Management

### VIX-Scaled Stop Loss

```typescript
/**
 * Adaptive stop loss based on VIX
 * Higher VIX = wider stop loss (more room to breathe)
 */
class AdaptiveStopLoss {
  computeStopLoss(
    entry: Position,
    vix: number,
    baseStopPct: number, // From user config
  ): number {
    // Scale stop loss with VIX
    const vixMultiplier = vix / 15; // Normalize around VIX=15
    const adjustedStopPct = baseStopPct * vixMultiplier;

    // Clamp between 5% and 20%
    const clampedStopPct = Math.max(0.05, Math.min(0.2, adjustedStopPct));

    if (entry.side === 'BUY') {
      return entry.entryPrice * (1 - clampedStopPct);
    } else {
      return entry.entryPrice * (1 + clampedStopPct);
    }
  }
}
```

### Trailing Stop Loss

```typescript
/**
 * Trail stop loss as position moves in profit
 */
class TrailingStopLoss {
  updateStop(
    position: Position,
    currentPrice: number,
    config: UserTradingConfig,
  ): number | null {
    if (!config.risk.enableTrailingStop) {
      return null;
    }

    const trailingPct = config.risk.trailingStopLossPercent / 100;

    if (position.side === 'BUY') {
      // Trail upward for long positions
      const newStop = currentPrice * (1 - trailingPct);

      if (!position.trailingStopLoss || newStop > position.trailingStopLoss) {
        return newStop;
      }
    } else {
      // Trail downward for short positions
      const newStop = currentPrice * (1 + trailingPct);

      if (!position.trailingStopLoss || newStop < position.trailingStopLoss) {
        return newStop;
      }
    }

    return position.trailingStopLoss; // No update
  }
}
```

---

## Circuit Breaker

```typescript
class CircuitBreaker {
  async check(portfolio: Portfolio, config: UserTradingConfig): Promise<void> {
    // 1. Daily loss limit
    if (portfolio.dailyPnL < -config.risk.maxDailyDrawdown) {
      await this.trigger('DAILY_LOSS_LIMIT', portfolio.userId);
      throw new CircuitBreakerError('Daily loss limit reached');
    }

    // 2. Max drawdown from peak
    const drawdown =
      (portfolio.peakEquity - portfolio.equity) / portfolio.peakEquity;
    if (drawdown > 0.2) {
      // 20% drawdown
      await this.trigger('MAX_DRAWDOWN', portfolio.userId);
      throw new CircuitBreakerError('Max drawdown exceeded');
    }

    // 3. Consecutive losses
    if (portfolio.consecutiveLosses >= 5) {
      await this.trigger('CONSECUTIVE_LOSSES', portfolio.userId);
      throw new CircuitBreakerError('Too many consecutive losses');
    }

    // 4. Latency degradation
    if (portfolio.avgLatency > 200) {
      // 200ms
      await this.trigger('LATENCY_DEGRADATION', portfolio.userId);
      throw new CircuitBreakerError('System latency too high');
    }
  }

  private async trigger(reason: string, userId: string) {
    // 1. Stop all new trades
    await this.redis.set(`circuit-breaker:${userId}`, 'OPEN', 'EX', 3600);

    // 2. Liquidate all positions
    await this.executionEngine.liquidateAllPositions(userId);

    // 3. Alert user
    await this.notificationService.sendAlert(userId, {
      type: 'CIRCUIT_BREAKER',
      reason,
      timestamp: Date.now(),
    });

    this.logger.error('Circuit breaker triggered', { userId, reason });
  }
}
```

---

## Configuration

```typescript
export const riskManagerConfig = {
  positionSizing: {
    strategy: 'KELLY', // 'KELLY' | 'FIXED' | 'GREEKS' | 'RL'
    fractionalKelly: 0.5, // Half-kelly for safety
  },
  stopLoss: {
    basePercent: 10, // 10% base stop loss
    vixScaling: true,
    trailingEnabled: true,
    trailingPercent: 5,
  },
  circuitBreaker: {
    enabled: true,
    maxDailyLossPct: 5,
    maxDrawdownPct: 20,
    maxConsecutiveLosses: 5,
    maxLatencyMs: 200,
  },
};
```

---

## Monitoring Metrics

- `risk_manager.trades_approved_total`
- `risk_manager.trades_rejected_total` (by reason)
- `risk_manager.portfolio_greeks` (delta, gamma, vega, theta)
- `risk_manager.position_size` (histogram)
- `risk_manager.circuit_breaker_triggers_total`

---

## Testing

```typescript
describe('RiskManager', () => {
  it('should reject trade exceeding position limit', async () => {
    const strategy = { quantity: 1000, premium: 100 }; // ₹100,000
    const config = { limits: { maxSingleTradeAmount: 50000 } };

    const result = await riskManager.validateTrade(strategy, portfolio, config);

    expect(result.approved).toBe(false);
    expect(result.reason).toContain('max single trade amount');
  });

  it('should compute Kelly position size correctly', () => {
    const signal = { confidence: 0.7 }; // 70% win prob
    const size = kellySizer.computeSize(signal, portfolio, config);

    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(portfolio.equity * 0.25); // Max 25% of portfolio
  });

  it('should trigger circuit breaker on daily loss limit', async () => {
    portfolio.dailyPnL = -6000; // Exceeds ₹5,000 limit

    await expect(circuitBreaker.check(portfolio, config)).rejects.toThrow(
      'Daily loss limit reached',
    );
  });
});
```

---

**See Also**:

- [05-STRATEGY-MANAGER.md](./05-STRATEGY-MANAGER.md) - Previous layer
- [07-ORDER-MANAGEMENT.md](./07-ORDER-MANAGEMENT.md) - Next layer
- [algo-worker.instructions.md](../../../../../.github/instructions/algo-worker.instructions.md) - Risk management patterns
