# Layer 4: Strategy & Risk Management

**Purpose**: Regime-conditioned strategy selection, neural strike selection, Kelly criterion position sizing, and pre-trade risk validation driven by Tier 4 Meta-Learner output.

---

## Overview

Layer 4 receives the final trading signal from Tier 4 Meta-Learner and decides: (1) which options strategy, (2) which strikes, (3) how many lots, and (4) whether the trade passes risk validation. All decisions are regime-aware.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     LAYER 4: STRATEGY & RISK                                  │
│                                                                               │
│  [Tier 4 Signal] ──→ [Strategy Selector] ──→ [Strike Selector] ──→          │
│  + regime state       (regime × direction)    (IV surface + delta)           │
│                                                        ↓                     │
│                                              [Position Sizer]                │
│                                              (Kelly + VIX + regime scaling)  │
│                                                        ↓                     │
│                                              [Risk Validator]                │
│                                              (Greeks │ limits │ breakers)    │
│                                                        ↓                     │
│                                              [Validated Order → Layer 5]     │
│                                                                               │
│  Latency Target: <10ms                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Strategy Selection (Regime-Conditioned)

### 7-Strategy Menu

| #   | Strategy             | Legs                        | Max Loss       | Max Profit | Best When                            |
| --- | -------------------- | --------------------------- | -------------- | ---------- | ------------------------------------ |
| 1   | **LONG_CALL**        | Buy 1 CE                    | Premium paid   | Unlimited  | Strong bull, high confidence         |
| 2   | **LONG_PUT**         | Buy 1 PE                    | Premium paid   | Unlimited  | Strong bear, high confidence         |
| 3   | **BULL_CALL_SPREAD** | Buy CE + Sell higher CE     | Width - credit | Width      | Moderate bull, capped risk           |
| 4   | **BEAR_PUT_SPREAD**  | Buy PE + Sell lower PE      | Width - credit | Width      | Moderate bear, capped risk           |
| 5   | **LONG_STRADDLE**    | Buy ATM CE + PE             | Premium paid   | Unlimited  | High vol expected, direction unclear |
| 6   | **IRON_CONDOR**      | Bull put + Bear call spread | Width - credit | Credit     | Range-bound, theta decay             |
| 7   | **SHORT_STRANGLE**   | Sell OTM CE + PE            | Unlimited      | Credit     | Low vol, premium selling             |

### Regime × Direction Matrix

```typescript
@Injectable()
export class StrategySelector {
  private readonly strategyMatrix: Record<Regime, Record<Direction, Strategy>> =
    {
      BULL_TRENDING: {
        LONG: 'LONG_CALL',
        SHORT: 'SKIP', // Don't fight the trend
        NEUTRAL: 'BULL_CALL_SPREAD',
      },
      BEAR_TRENDING: {
        LONG: 'SKIP', // Don't fight the trend
        SHORT: 'LONG_PUT',
        NEUTRAL: 'BEAR_PUT_SPREAD',
      },
      VOLATILE: {
        LONG: 'BULL_CALL_SPREAD', // Capped risk in high vol
        SHORT: 'BEAR_PUT_SPREAD',
        NEUTRAL: 'LONG_STRADDLE', // Profit from vol
      },
      RANGING: {
        LONG: 'SKIP',
        SHORT: 'SKIP',
        NEUTRAL: 'IRON_CONDOR', // Profit from theta
      },
    };

  selectStrategy(signal: Tier4Output): StrategySelection {
    const direction = this.signalToDirection(signal);
    const regime = signal.regime;
    const strategy = this.strategyMatrix[regime][direction];

    // Override: LOW_VOLATILITY sub-regime allows SHORT_STRANGLE
    if (
      regime === 'RANGING' &&
      signal.tierOutputs.tier1.regime_confidence > 0.8 &&
      signal.tierOutputs.tier2.ensemble_confidence < 0.55
    ) {
      return {
        strategy: 'SHORT_STRANGLE',
        reason: 'Low vol + high regime confidence + low directional confidence',
      };
    }

    return { strategy, reason: `${regime} regime + ${direction} signal` };
  }
}
```

---

## Strike Selection (IV Surface + Delta)

### Neural Strike Selector

The strike selector uses Tier 2's IV surface data to pick optimal strikes:

```typescript
@Injectable()
export class StrikeSelector {
  selectStrikes(
    strategy: Strategy,
    spotPrice: number,
    optionChain: OptionTick[],
    config: StrikeConfig,
  ): StrikeSelection {
    const atmStrike = this.findATM(spotPrice, optionChain);
    const targetDelta = config.targetDelta ?? 0.35;

    switch (strategy) {
      case 'LONG_CALL':
        return this.selectByDelta(optionChain, 'CE', targetDelta);

      case 'LONG_PUT':
        return this.selectByDelta(optionChain, 'PE', -targetDelta);

      case 'LONG_STRADDLE':
        return {
          legs: [
            { strike: atmStrike, type: 'CE', action: 'BUY' },
            { strike: atmStrike, type: 'PE', action: 'BUY' },
          ],
          netDelta: 0,
        };

      case 'BULL_CALL_SPREAD':
        return {
          legs: [
            { strike: atmStrike, type: 'CE', action: 'BUY' },
            {
              strike: atmStrike + config.spreadWidth,
              type: 'CE',
              action: 'SELL',
            },
          ],
          maxLoss:
            config.spreadWidth * config.lotSize -
            this.getCredit(
              optionChain,
              atmStrike,
              atmStrike + config.spreadWidth,
            ),
        };

      case 'IRON_CONDOR':
        const w = config.spreadWidth ?? 100;
        return {
          legs: [
            { strike: atmStrike - w * 2, type: 'PE', action: 'BUY' },
            { strike: atmStrike - w, type: 'PE', action: 'SELL' },
            { strike: atmStrike + w, type: 'CE', action: 'SELL' },
            { strike: atmStrike + w * 2, type: 'CE', action: 'BUY' },
          ],
          netDelta: 0,
          maxLoss: w * config.lotSize - this.netCredit(),
        };
    }
  }

  private selectByDelta(
    chain: OptionTick[],
    type: 'CE' | 'PE',
    targetDelta: number,
  ): StrikeLeg {
    // Find strike closest to target delta
    const candidates = chain.filter((o) => o.type === type && o.delta !== 0);
    return candidates.reduce((best, o) =>
      Math.abs(o.delta - targetDelta) < Math.abs(best.delta - targetDelta)
        ? o
        : best,
    );
  }
}
```

---

## Position Sizing (Kelly Criterion)

### Full Kelly with VIX + Regime Scaling

```typescript
@Injectable()
export class PositionSizerService {
  calculateSize(
    signal: Tier4Output,
    portfolio: Portfolio,
    config: UserConfig,
  ): PositionSize {
    const { confidence } = signal;
    const regime = signal.regime;

    // Base Kelly: f* = (p·b - q) / b
    const p = confidence;
    const q = 1 - p;
    const b = config.risk.avgWinLossRatio ?? 1.5;
    const rawKelly = Math.max(0, (p * b - q) / b);

    // Half-Kelly (industry standard for prudence)
    const halfKelly = rawKelly * 0.5;

    // VIX scaling: reduce size when VIX is high
    const vix = signal.tierOutputs.tier2?.lgbm_features?.india_vix ?? 15;
    const vixScale = vix < 15 ? 1.0 : vix < 20 ? 0.75 : vix < 25 ? 0.5 : 0.25;

    // Regime scaling
    const regimeScale: Record<string, number> = {
      BULL_TRENDING: 1.0,
      BEAR_TRENDING: 0.8,
      VOLATILE: 0.5,
      RANGING: 0.6,
    };

    const scaledFraction = halfKelly * vixScale * (regimeScale[regime] ?? 0.5);

    // Convert to lots (NIFTY lot = 25 units)
    const maxCapitalPerTrade = portfolio.equity * scaledFraction;
    const lotSize = 25;
    const premiumPerLot = this.estimatePremium(signal) * lotSize;
    const lots = Math.max(1, Math.floor(maxCapitalPerTrade / premiumPerLot));

    // Cap at user-configured maximum
    const finalLots = Math.min(lots, config.limits.maxLotsPerTrade);

    return {
      lots: finalLots,
      capitalAtRisk: finalLots * premiumPerLot,
      kellyFraction: scaledFraction,
      scalingFactors: {
        rawKelly: halfKelly,
        vixScale,
        regimeScale: regimeScale[regime]!,
      },
    };
  }
}
```

---

## Risk Validator

Pre-trade validation checks before every order:

```typescript
@Injectable()
export class RiskValidatorService {
  validate(
    order: OrderRequest,
    portfolio: Portfolio,
    config: UserConfig,
  ): ValidationResult {
    const errors: RiskError[] = [];

    // 1. Position count limit
    if (
      portfolio.openPositions.length >= config.limits.maxConcurrentPositions
    ) {
      errors.push({
        code: 'MAX_POSITIONS',
        message: `Open: ${portfolio.openPositions.length}, Limit: ${config.limits.maxConcurrentPositions}`,
      });
    }

    // 2. Single trade capital limit
    if (order.capitalAtRisk > config.limits.maxSingleTradeAmount) {
      errors.push({
        code: 'SINGLE_TRADE_LIMIT',
        message: `₹${order.capitalAtRisk} > ₹${config.limits.maxSingleTradeAmount}`,
      });
    }

    // 3. Daily loss limit
    if (portfolio.dailyPnL <= -config.risk.maxDailyDrawdown) {
      errors.push({
        code: 'DAILY_LOSS_LIMIT',
        message: `Daily PnL ₹${portfolio.dailyPnL}, limit ₹-${config.risk.maxDailyDrawdown}`,
      });
    }

    // 4. Portfolio Greeks limits
    const projectedGreeks = this.projectGreeks(portfolio, order);
    if (Math.abs(projectedGreeks.delta) > config.risk.greeksLimits.maxDelta) {
      errors.push({
        code: 'DELTA_LIMIT',
        message: `Delta ${projectedGreeks.delta}, limit ±${config.risk.greeksLimits.maxDelta}`,
      });
    }
    if (Math.abs(projectedGreeks.gamma) > config.risk.greeksLimits.maxGamma) {
      errors.push({
        code: 'GAMMA_LIMIT',
        message: `Gamma ${projectedGreeks.gamma}, limit ${config.risk.greeksLimits.maxGamma}`,
      });
    }
    if (projectedGreeks.theta < -config.risk.greeksLimits.maxTheta) {
      errors.push({
        code: 'THETA_LIMIT',
        message: `Theta ${projectedGreeks.theta}, limit -${config.risk.greeksLimits.maxTheta}`,
      });
    }
    if (Math.abs(projectedGreeks.vega) > config.risk.greeksLimits.maxVega) {
      errors.push({
        code: 'VEGA_LIMIT',
        message: `Vega ${projectedGreeks.vega}, limit ${config.risk.greeksLimits.maxVega}`,
      });
    }

    // 5. Leverage limit
    const projectedLeverage =
      (portfolio.totalExposure + order.notionalValue) / portfolio.equity;
    if (projectedLeverage > config.risk.maxLeverage) {
      errors.push({
        code: 'LEVERAGE_LIMIT',
        message: `${projectedLeverage.toFixed(1)}x > ${config.risk.maxLeverage}x`,
      });
    }

    // 6. Time-based restrictions
    const minutesToClose = this.getMinutesToClose();
    if (minutesToClose < 30) {
      errors.push({
        code: 'NO_NEW_POSITIONS',
        message: `${minutesToClose}min to close — exit-only mode`,
      });
    }

    // 7. Caution mode (first 5 minutes)
    const minutesFromOpen = this.getMinutesFromOpen();
    if (minutesFromOpen < 5 && order.signal.confidence < 0.85) {
      errors.push({
        code: 'CAUTION_MODE',
        message: `Confidence ${order.signal.confidence} < 0.85 required in first 5min`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedAt: Date.now(),
    };
  }
}
```

---

## Circuit Breakers

```typescript
@Injectable()
export class CircuitBreakerService {
  private state: 'CLOSED' | 'OPEN' = 'CLOSED';
  private consecutiveTimeouts = 0;

  check(metrics: SystemMetrics): CircuitState {
    // Data staleness (no tick in 5s)
    if (metrics.lastTickAgeMs > 5000) {
      return this.trip('STALE_DATA', `No tick for ${metrics.lastTickAgeMs}ms`);
    }

    // Latency degradation
    if (metrics.p95LatencyMs > 150) {
      return this.trip('HIGH_LATENCY', `P95=${metrics.p95LatencyMs}ms`);
    }

    // Daily drawdown breach
    if (metrics.dailyDrawdownPct > 5) {
      return this.trip('RISK_BREACH', `Drawdown ${metrics.dailyDrawdownPct}%`);
    }

    // Model accuracy degradation
    if (metrics.rollingAccuracy < 0.45) {
      return this.trip('MODEL_DRIFT', `Accuracy ${metrics.rollingAccuracy}`);
    }

    // Consecutive inference timeouts
    if (this.consecutiveTimeouts >= 3) {
      return this.trip(
        'INFERENCE_FAILURE',
        `${this.consecutiveTimeouts} timeouts`,
      );
    }

    // GPU memory pressure
    if (metrics.gpuMemoryUsedPct > 90) {
      return this.trip('GPU_OOM_RISK', `GPU ${metrics.gpuMemoryUsedPct}% used`);
    }

    this.state = 'CLOSED';
    return 'CLOSED';
  }

  private trip(reason: string, message: string): CircuitState {
    this.state = 'OPEN';
    this.alertService.sendCritical(`CIRCUIT BREAKER: ${reason} — ${message}`);
    return 'OPEN';
  }
}
```

| Trigger            | Threshold                          | Recovery                                     |
| ------------------ | ---------------------------------- | -------------------------------------------- |
| Stale data         | No tick for 5s                     | Auto-close when ticks resume                 |
| High latency       | P95 > 150ms                        | Auto-close when P95 drops below 100ms        |
| Daily drawdown     | > 5%                               | Manual reset only (hard halt for the day)    |
| Model drift        | Accuracy < 45% (rolling 50 trades) | Manual reset after investigation             |
| Inference failures | 3 consecutive timeouts             | Restart Worker Threads, auto-retry           |
| GPU memory         | > 90% VRAM                         | Restart GPU workers with reduced batch sizes |

---

## Event Output

```typescript
interface StrategySelectedEvent {
  timestamp: number;
  strategy: Strategy;
  strikes: StrikeSelection;
  positionSize: PositionSize;
  riskValidation: ValidationResult;
  metadata: {
    signal: Tier4Output;
    regime: Regime;
    kellyFraction: number;
    vixScale: number;
  };
}
```

---

## Monitoring Metrics

- `strategy.selected_total{strategy}` — Count by strategy type
- `strategy.selection_duration_ms` — Strategy selection latency
- `strategy.skipped_total{reason}` — Skipped trades with reason
- `risk.validation_passed_total` — Successful validations
- `risk.validation_failed_total{code}` — Failed validations by error code
- `risk.circuit_breaker_state{reason}` — Current state (0=closed, 1=open)
- `risk.daily_pnl` — Real-time daily PnL gauge
- `risk.portfolio_delta` — Current portfolio delta
- `risk.kelly_fraction` — Latest Kelly fraction used
- `risk.vix_scale` — Current VIX scaling factor

---

**See Also**:

- [03-PREDICTION.md](./03-PREDICTION.md) — Previous layer
- [05-EXECUTION.md](./05-EXECUTION.md) — Next layer
- [TIER4_MODELS.md](../../../docs/ml/TIER4_MODELS.md) — Meta-Learner architecture
