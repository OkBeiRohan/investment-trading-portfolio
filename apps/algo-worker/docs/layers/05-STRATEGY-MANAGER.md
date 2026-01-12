# Layer 5: Strategy Manager

**Purpose**: Select optimal trading strategy based on regime and signals

---

## Overview

The Strategy Manager combines regime information (Layer 3) and prediction signals (Layer 4) to decide which option strategy to deploy. Uses rule-based logic with ML-enhanced decision making.

---

## Components

### StrategySelectionService

- Main strategy decision engine
- Regime-based strategy routing
- Position conflict resolution

### StrategyRules

- Rule-based strategy constraints
- Time-of-day filters
- Market condition checks

### MLStrategySelector (Optional)

- Reinforcement Learning agent for strategy selection
- Learns optimal strategy switching
- Trained with PPO (Proximal Policy Optimization)

---

## Supported Strategies

### 1. Long Call

**When**: Bullish prediction + trending upward regime

```typescript
interface LongCallStrategy {
  type: 'LONG_CALL';
  strike: number; // ATM or slightly OTM
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'trending';
    direction: 'up';
    confidence: number; // >0.7
  };
}
```

### 2. Long Put

**When**: Bearish prediction + trending downward regime

```typescript
interface LongPutStrategy {
  type: 'LONG_PUT';
  strike: number;
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'trending';
    direction: 'down';
    confidence: number; // >0.7
  };
}
```

### 3. Long Straddle

**When**: High volatility prediction + volatile regime

```typescript
interface LongStraddleStrategy {
  type: 'LONG_STRADDLE';
  atmStrike: number;
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'volatile';
    ivPercentile: number; // <50th percentile (cheap IV)
    vix: number; // Rising VIX
  };
}
```

### 4. Iron Condor

**When**: Ranging regime + low volatility

```typescript
interface IronCondorStrategy {
  type: 'IRON_CONDOR';
  callSpread: { shortStrike: number; longStrike: number };
  putSpread: { shortStrike: number; longStrike: number };
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'ranging';
    supportResistance: [number, number]; // Must be within range
    daysToExpiry: number; // 7-30 days (theta decay)
  };
}
```

### 5. Bull Call Spread

**When**: Moderately bullish + limited risk appetite

```typescript
interface BullCallSpreadStrategy {
  type: 'BULL_CALL_SPREAD';
  longStrike: number; // ATM
  shortStrike: number; // OTM
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'trending' | 'ranging';
    direction: 'up';
    confidence: number; // 0.5-0.7 (moderate)
  };
}
```

### 6. Bear Put Spread

**When**: Moderately bearish + limited risk appetite

```typescript
interface BearPutSpreadStrategy {
  type: 'BEAR_PUT_SPREAD';
  longStrike: number; // ATM
  shortStrike: number; // OTM
  expiry: string;
  quantity: number;
  entryConditions: {
    regime: 'trending' | 'ranging';
    direction: 'down';
    confidence: number; // 0.5-0.7
  };
}
```

---

## Strategy Selection Logic

```typescript
class StrategySelectionService {
  selectStrategy(
    signal: TradingSignal,
    regime: RegimeDetectedEvent,
    portfolio: Portfolio,
  ): Strategy | null {
    // 1. Regime-based filtering
    const eligibleStrategies = this.filterByRegime(regime);

    // 2. Signal-based scoring
    const scored = eligibleStrategies.map((s) => ({
      strategy: s,
      score: this.scoreStrategy(s, signal, regime),
    }));

    // 3. Portfolio constraints
    const feasible = scored.filter((s) =>
      this.checkPortfolioConstraints(s.strategy, portfolio),
    );

    // 4. Select highest scoring
    const best = feasible.sort((a, b) => b.score - a.score)[0];

    if (best && best.score > this.minScore) {
      return this.buildStrategy(best.strategy, signal, regime);
    }

    return null; // No suitable strategy
  }

  private scoreStrategy(
    strategy: StrategyType,
    signal: TradingSignal,
    regime: RegimeDetectedEvent,
  ): number {
    let score = 0;

    // Confidence alignment
    score += signal.confidence * 0.4;

    // Regime match
    if (this.matchesRegime(strategy, regime)) {
      score += 0.3;
    }

    // IV favorability
    const ivScore = this.computeIVScore(strategy, regime);
    score += ivScore * 0.2;

    // Time of day
    const timeScore = this.computeTimeScore();
    score += timeScore * 0.1;

    return score;
  }
}
```

---

## Regime-Strategy Mapping

```typescript
const REGIME_STRATEGY_MAP: Record<RegimeType, StrategyType[]> = {
  trending_up: ['LONG_CALL', 'BULL_CALL_SPREAD'],
  trending_down: ['LONG_PUT', 'BEAR_PUT_SPREAD'],
  ranging: ['IRON_CONDOR', 'SHORT_STRADDLE'],
  volatile: ['LONG_STRADDLE', 'LONG_STRANGLE'],
  low_volatility: ['SHORT_STRADDLE', 'IRON_CONDOR'],
};
```

---

## Strike Selection

```typescript
class StrikeSelector {
  selectStrike(
    strategy: StrategyType,
    spotPrice: number,
    greeks: GreeksData[],
  ): number {
    switch (strategy) {
      case 'LONG_CALL':
      case 'LONG_PUT':
        // ATM or slightly OTM (better delta)
        return this.findClosestStrike(spotPrice, greeks);

      case 'LONG_STRADDLE':
        // Exact ATM
        return this.findATMStrike(spotPrice, greeks);

      case 'IRON_CONDOR':
        // 1-2 standard deviations from spot
        const stdDev = this.computeStdDev(spotPrice, greeks);
        return {
          callShort: spotPrice + stdDev,
          callLong: spotPrice + 1.5 * stdDev,
          putShort: spotPrice - stdDev,
          putLong: spotPrice - 1.5 * stdDev,
        };

      default:
        return spotPrice;
    }
  }

  private findATMStrike(spot: number, greeks: GreeksData[]): number {
    return greeks.reduce((closest, g) =>
      Math.abs(g.strike - spot) < Math.abs(closest.strike - spot) ? g : closest,
    ).strike;
  }
}
```

---

## RL-Based Strategy Selection (Optional)

```typescript
interface RLState {
  regime: RegimeType;
  signalConfidence: number;
  portfolioGreeks: { delta: number; gamma: number; vega: number };
  pnlLast1h: number;
  currentPositions: number;
}

interface RLAction {
  strategy: StrategyType | 'HOLD';
  positionSize: number;
}

class RLStrategyAgent {
  private policy: PPOPolicy;

  async selectAction(state: RLState): Promise<RLAction> {
    const stateVector = this.encodeState(state);
    const actionProbs = await this.policy.predict(stateVector);

    // Sample action from distribution
    const action = this.sampleAction(actionProbs);

    return this.decodeAction(action);
  }

  updatePolicy(trajectory: Trajectory) {
    // PPO update with advantage estimation
    this.policy.update(trajectory);
  }
}
```

---

## Configuration

```typescript
export const strategyManagerConfig = {
  strategies: {
    enabled: [
      'LONG_CALL',
      'LONG_PUT',
      'LONG_STRADDLE',
      'IRON_CONDOR',
      'BULL_CALL_SPREAD',
      'BEAR_PUT_SPREAD',
    ],
    minConfidence: 0.6,
    maxConcurrentStrategies: 3,
  },
  strikes: {
    otmDistance: 0.02, // 2% from spot for OTM
    spreadWidth: 100, // Points for spreads
  },
  timing: {
    entryWindow: { start: '09:30', end: '15:00' },
    avoidLastHour: true, // Avoid 15:00-15:30
  },
  rl: {
    enabled: false, // Use rule-based by default
    modelPath: 'models/rl_strategy_selector.onnx',
  },
};
```

---

## Monitoring Metrics

- `strategy_manager.strategies_selected_total` (by type)
- `strategy_manager.selection_duration_ms`
- `strategy_manager.regime_strategy_match_rate`
- `strategy_manager.rejected_signals_total` (by reason)

---

## Testing

```typescript
describe('StrategyManager', () => {
  it('should select LONG_CALL in uptrend', () => {
    const signal = { prediction: 'VOL_UP', confidence: 0.8 };
    const regime = { regime: 'trending', direction: 'up' };

    const strategy = manager.selectStrategy(signal, regime, portfolio);

    expect(strategy?.type).toBe('LONG_CALL');
  });

  it('should select IRON_CONDOR in ranging regime', () => {
    const regime = { regime: 'ranging', swingZones: [...] };
    const signal = { prediction: 'NEUTRAL', confidence: 0.7 };

    const strategy = manager.selectStrategy(signal, regime, portfolio);

    expect(strategy?.type).toBe('IRON_CONDOR');
  });
});
```

---

**See Also**:

- [04-PREDICTION-ENGINE.md](./04-PREDICTION-ENGINE.md) - Previous layer
- [06-RISK-MANAGER.md](./06-RISK-MANAGER.md) - Next layer
- [ALGO_TRADING_ARCHITECTURE.md](../../../../docs/ALGO_TRADING_ARCHITECTURE.md#execution--order-logic)
