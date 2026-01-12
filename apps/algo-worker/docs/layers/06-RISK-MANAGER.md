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

## Automated Regulatory Reporting (HIGH ROI Enhancement)

### Overview

**Status**: ⏳ Design Complete, Not Implemented

Automated generation of compliance reports for SEBI 2024-2026 algorithmic trading regulations, risk analytics dashboards, and stress testing frameworks.

**Why**: Current manual log extraction takes 10-15 hours/month. Automation reduces regulatory overhead to <1 hour/month.

**ROI**: 10-15 hours/month saved + proactive compliance monitoring

---

### 1. Real-Time Compliance Dashboard

#### Requirements (SEBI 2024-2026)

1. **Algo Identification Tracking**
   - Unique Algo ID for every order
   - Format: `{ENTITY_CODE}-{DATE}-{VERSION}-{STRATEGY}`
   - Example: `ABC123-20260113-V1.2.3-STRADDLE`

2. **Risk Limits Monitoring**
   - Max position size (% of daily volume)
   - Max order value (₹ per order)
   - Max Greeks exposure (delta, gamma, vega)
   - Max intraday loss (₹)
   - Max daily loss (₹)

3. **Pre-Trade Validation Audit**
   - All pre-trade checks logged
   - Rejections logged with reasons
   - Approved trades with validation timestamps

#### Implementation

```typescript
@Injectable()
export class RegulatoryReportingService {
  constructor(
    private readonly mongo: MongoService,
    private readonly questdb: QuestDBService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Generate real-time compliance metrics for dashboard
   */
  async getComplianceMetrics(userId: string): Promise<ComplianceMetrics> {
    const today = new Date().toISOString().split('T')[0];

    // Query audit trail
    const auditRecords = await this.mongo
      .collection('audit_trail')
      .find({
        userId,
        timestamp: { $gte: new Date(today) },
      })
      .toArray();

    // Query risk limits usage
    const portfolio = await this.getPortfolio(userId);
    const config = await this.getUserConfig(userId);

    return {
      // Algo ID tracking
      uniqueAlgoIds: new Set(auditRecords.map((r) => r.algoId)).size,
      totalOrders: auditRecords.length,

      // Risk limits utilization
      limits: {
        maxPositionSize: {
          current: portfolio.maxPositionSize,
          limit: config.limits.maxSingleTradeAmount,
          utilizationPct:
            (portfolio.maxPositionSize / config.limits.maxSingleTradeAmount) *
            100,
        },
        dailyLoss: {
          current: portfolio.dailyPnL,
          limit: config.risk.maxDailyDrawdown,
          utilizationPct:
            (Math.abs(portfolio.dailyPnL) / config.risk.maxDailyDrawdown) * 100,
        },
        greeks: {
          delta: {
            current: Math.abs(portfolio.greeks.delta),
            limit: config.risk.greeksLimits.maxDelta,
            utilizationPct:
              (Math.abs(portfolio.greeks.delta) /
                config.risk.greeksLimits.maxDelta) *
              100,
          },
          // ... gamma, vega, theta
        },
      },

      // Pre-trade validation stats
      validation: {
        totalChecks: auditRecords.length,
        approved: auditRecords.filter((r) => r.preTradeChecksPassed).length,
        rejected: auditRecords.filter((r) => !r.preTradeChecksPassed).length,
        rejectionReasons: this.aggregateRejectionReasons(auditRecords),
      },

      // Circuit breaker status
      circuitBreakers: {
        status: portfolio.circuitBreakerStatus || 'CLOSED',
        triggers: portfolio.circuitBreakerTriggers || [],
      },
    };
  }

  /**
   * Generate daily regulatory report (automated)
   */
  @Cron('0 18 * * *') // 6 PM IST daily
  async generateDailyReport() {
    const users = await this.mongo
      .collection('user_trading_configs')
      .find({ enabled: true })
      .toArray();

    for (const userConfig of users) {
      const report = await this.createDailyReport(userConfig.userId);

      // Save to MongoDB
      await this.mongo.collection('regulatory_reports').insertOne({
        userId: userConfig.userId,
        reportType: 'DAILY',
        date: new Date().toISOString().split('T')[0],
        generatedAt: new Date(),
        data: report,
      });

      // Send email notification
      await this.notificationService.sendEmail(userConfig.email, {
        subject: `Daily Trading Report - ${new Date().toLocaleDateString()}`,
        template: 'daily-report',
        data: report,
      });

      this.logger.log(`Daily report generated for user ${userConfig.userId}`);
    }
  }

  /**
   * Create daily report with all regulatory data
   */
  private async createDailyReport(userId: string): Promise<DailyReport> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Trading activity summary
    const trades = await this.mongo
      .collection('audit_trail')
      .find({
        userId,
        timestamp: { $gte: new Date(today) },
      })
      .toArray();

    // 2. P&L summary
    const pnl = await this.questdb.query(`
      SELECT 
        SUM(realized_pnl) as total_realized_pnl,
        SUM(unrealized_pnl) as total_unrealized_pnl,
        COUNT(*) as total_positions
      FROM positions
      WHERE user_id = '${userId}'
        AND timestamp >= '${today}'
    `);

    // 3. Risk metrics
    const riskMetrics = await this.computeRiskMetrics(userId, today);

    // 4. Compliance checks
    const complianceStatus = await this.getComplianceMetrics(userId);

    return {
      userId,
      date: today,
      summary: {
        totalTrades: trades.length,
        realizedPnL: pnl[0].total_realized_pnl,
        unrealizedPnL: pnl[0].total_unrealized_pnl,
        netPnL: pnl[0].total_realized_pnl + pnl[0].total_unrealized_pnl,
      },
      riskMetrics,
      complianceStatus,
      trades: trades.map((t) => ({
        timestamp: t.timestamp,
        algoId: t.algoId,
        symbol: t.symbol,
        strategy: t.strategy,
        quantity: t.quantity,
        premium: t.premium,
        pnl: t.pnl,
        preTradeChecksPassed: t.preTradeChecksPassed,
      })),
    };
  }
}
```

#### Dashboard Panels (Grafana)

```json
{
  "dashboard": {
    "title": "Regulatory Compliance Dashboard",
    "panels": [
      {
        "title": "Risk Limits Utilization",
        "type": "gauge",
        "targets": [
          {
            "expr": "risk_manager_position_size_current / risk_manager_position_size_limit * 100"
          }
        ]
      },
      {
        "title": "Daily Loss vs Limit",
        "type": "timeseries",
        "targets": [
          {
            "expr": "risk_manager_daily_pnl"
          },
          {
            "expr": "risk_manager_daily_loss_limit"
          }
        ]
      },
      {
        "title": "Pre-Trade Rejections",
        "type": "pie",
        "targets": [
          {
            "expr": "sum by (reason) (risk_manager_trades_rejected_total)"
          }
        ]
      },
      {
        "title": "Circuit Breaker Status",
        "type": "stat",
        "targets": [
          {
            "expr": "risk_manager_circuit_breaker_status"
          }
        ]
      }
    ]
  }
}
```

---

### 2. Advanced Risk Analytics

#### Value at Risk (VaR)

**Monte Carlo VaR Calculation**:

```typescript
@Injectable()
export class VaRCalculationService {
  /**
   * Calculate 1-day VaR using Monte Carlo simulation
   * @param portfolio - Current portfolio
   * @param confidenceLevel - 95% or 99%
   * @param simulations - Number of MC simulations (10,000 default)
   */
  async calculateVaR(
    portfolio: Portfolio,
    confidenceLevel: number = 0.95,
    simulations: number = 10000,
  ): Promise<VaRResult> {
    const positions = portfolio.openPositions;

    // Historical volatility (last 30 days)
    const volatilities = await this.getHistoricalVolatility(positions);

    // Correlations between instruments
    const correlations = await this.getCorrelationMatrix(positions);

    // Monte Carlo simulation
    const simulatedReturns = [];

    for (let i = 0; i < simulations; i++) {
      const randomReturns = this.generateCorrelatedReturns(
        volatilities,
        correlations,
      );

      // Calculate portfolio P&L for this scenario
      let portfolioPnL = 0;
      positions.forEach((pos, idx) => {
        const priceChange = pos.currentPrice * randomReturns[idx];
        portfolioPnL += priceChange * pos.quantity;
      });

      simulatedReturns.push(portfolioPnL);
    }

    // Sort returns
    simulatedReturns.sort((a, b) => a - b);

    // VaR = loss at (1 - confidence level) percentile
    const varIndex = Math.floor((1 - confidenceLevel) * simulations);
    const var95 = -simulatedReturns[varIndex];

    // CVaR (Conditional VaR) = average loss beyond VaR
    const cvar95 =
      -simulatedReturns.slice(0, varIndex).reduce((a, b) => a + b, 0) /
      varIndex;

    return {
      var95,
      cvar95,
      confidenceLevel,
      simulations,
      distribution: simulatedReturns,
    };
  }

  /**
   * Generate correlated random returns using Cholesky decomposition
   */
  private generateCorrelatedReturns(
    volatilities: number[],
    correlations: number[][],
  ): number[] {
    // 1. Cholesky decomposition of correlation matrix
    const L = this.choleskyDecomposition(correlations);

    // 2. Generate independent normal random variables
    const Z = volatilities.map(() => this.randomNormal(0, 1));

    // 3. Correlate them: X = L * Z
    const X = [];
    for (let i = 0; i < volatilities.length; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += L[i][j] * Z[j];
      }
      X.push(sum * volatilities[i]);
    }

    return X;
  }

  /**
   * Box-Muller transform for normal random variable
   */
  private randomNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Cholesky decomposition (lower triangular matrix L such that A = L * L^T)
   */
  private choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const L = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }

        if (i === j) {
          L[i][j] = Math.sqrt(matrix[i][i] - sum);
        } else {
          L[i][j] = (matrix[i][j] - sum) / L[j][j];
        }
      }
    }

    return L;
  }
}
```

#### Stress Testing

```typescript
@Injectable()
export class StressTestingService {
  /**
   * Scenario-based stress testing
   */
  async runStressTests(portfolio: Portfolio): Promise<StressTestResult[]> {
    const scenarios = [
      {
        name: 'Market Crash (-10% Nifty)',
        niftyChange: -0.1,
        volChange: 2.0, // VIX doubles
      },
      {
        name: 'Volatility Spike (+50% IV)',
        niftyChange: 0,
        volChange: 1.5,
      },
      {
        name: 'RBI Rate Hike (+0.5%)',
        niftyChange: -0.03,
        volChange: 1.2,
      },
      {
        name: 'Black Swan (-20% Nifty)',
        niftyChange: -0.2,
        volChange: 3.0,
      },
    ];

    const results = [];

    for (const scenario of scenarios) {
      const pnl = await this.simulateScenario(portfolio, scenario);
      results.push({
        scenario: scenario.name,
        pnl,
        pnlPercent: (pnl / portfolio.equity) * 100,
        breaksLimit: pnl < -portfolio.config.risk.maxDailyDrawdown,
      });
    }

    return results;
  }

  /**
   * Simulate portfolio P&L under scenario
   */
  private async simulateScenario(
    portfolio: Portfolio,
    scenario: Scenario,
  ): Promise<number> {
    let totalPnL = 0;

    for (const position of portfolio.openPositions) {
      // Price impact
      const newPrice =
        position.currentPrice * (1 + scenario.niftyChange * position.delta);

      // IV impact (recompute option price with new IV)
      const newIV = position.impliedVol * scenario.volChange;
      const newOptionPrice = this.blackScholes(
        position.underlyingPrice * (1 + scenario.niftyChange),
        position.strike,
        position.timeToExpiry,
        newIV,
        position.optionType,
      );

      const priceDelta = newOptionPrice - position.currentPrice;
      totalPnL += priceDelta * position.quantity;
    }

    return totalPnL;
  }

  /**
   * Black-Scholes option pricing
   */
  private blackScholes(
    S: number,
    K: number,
    T: number,
    sigma: number,
    type: 'CALL' | 'PUT',
  ): number {
    const r = 0.065; // Risk-free rate (RBI repo rate)
    const d1 =
      (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) /
      (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    if (type === 'CALL') {
      return S * this.normalCDF(d1) - K * Math.exp(-r * T) * this.normalCDF(d2);
    } else {
      return (
        K * Math.exp(-r * T) * this.normalCDF(-d2) - S * this.normalCDF(-d1)
      );
    }
  }

  private normalCDF(x: number): number {
    return (1 + erf(x / Math.sqrt(2))) / 2;
  }
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}
```

---

### 3. Risk-Parity Portfolio Optimization

**Equal Risk Contribution (ERC) Allocation**:

```typescript
@Injectable()
export class RiskParityService {
  /**
   * Optimize position sizes for equal risk contribution
   */
  async optimizeRiskParity(
    positions: Position[],
    targetVolatility: number = 0.15, // 15% annual volatility
  ): Promise<OptimizedAllocation[]> {
    // 1. Covariance matrix
    const covMatrix = await this.computeCovarianceMatrix(positions);

    // 2. Risk parity optimization (iterative)
    const n = positions.length;
    let weights = Array(n).fill(1 / n); // Start with equal weights

    for (let iter = 0; iter < 100; iter++) {
      const riskContributions = this.computeRiskContributions(
        weights,
        covMatrix,
      );

      // Adjust weights to equalize risk contributions
      const avgRisk =
        riskContributions.reduce((a, b) => a + b, 0) / riskContributions.length;

      for (let i = 0; i < n; i++) {
        weights[i] *= avgRisk / riskContributions[i];
      }

      // Normalize weights
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      weights = weights.map((w) => w / sumWeights);
    }

    // 3. Scale to target volatility
    const portfolioVol = Math.sqrt(this.portfolioVariance(weights, covMatrix));
    const scaleFactor = targetVolatility / portfolioVol;

    return positions.map((pos, i) => ({
      symbol: pos.symbol,
      currentQuantity: pos.quantity,
      optimalQuantity: Math.round(pos.quantity * weights[i] * scaleFactor),
      weight: weights[i],
      riskContribution: riskContributions[i],
    }));
  }

  private computeRiskContributions(
    weights: number[],
    covMatrix: number[][],
  ): number[] {
    const n = weights.length;
    const contributions = [];

    const portfolioVar = this.portfolioVariance(weights, covMatrix);
    const portfolioVol = Math.sqrt(portfolioVar);

    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * covMatrix[i][j];
      }

      contributions.push((weights[i] * marginalContribution) / portfolioVol);
    }

    return contributions;
  }

  private portfolioVariance(weights: number[], covMatrix: number[][]): number {
    let variance = 0;
    const n = weights.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covMatrix[i][j];
      }
    }

    return variance;
  }
}
```

---

### 4. Integration with Existing Risk Manager

```typescript
// Add to RiskValidationService

@Injectable()
export class RiskValidationService {
  constructor(
    // ... existing dependencies
    private readonly regulatoryReporting: RegulatoryReportingService,
    private readonly varCalculation: VaRCalculationService,
    private readonly stressTesting: StressTestingService,
    private readonly riskParity: RiskParityService,
  ) {}

  async validateTrade(
    strategy: Strategy,
    portfolio: Portfolio,
    config: UserTradingConfig,
  ): Promise<RiskCheckResult> {
    // ... existing pre-trade checks

    // NEW: Check VaR limit
    const var95 = await this.varCalculation.calculateVaR(portfolio);
    if (var95 > config.risk.maxVaR) {
      return {
        approved: false,
        reason: `VaR (${var95.toFixed(0)}) exceeds limit (${config.risk.maxVaR})`,
      };
    }

    // NEW: Run stress tests
    const stressTests = await this.stressTesting.runStressTests(portfolio);
    const failedScenarios = stressTests.filter((t) => t.breaksLimit);
    if (failedScenarios.length > 0) {
      this.logger.warn('Stress test failures', { failedScenarios });
      // Optional: reject or just warn
    }

    // ... existing logic

    return { approved: true };
  }

  /**
   * Periodic portfolio rebalancing (daily)
   */
  @Cron('0 9 * * *') // 9 AM IST daily
  async rebalancePortfolio() {
    const users = await this.getUsersWithOpenPositions();

    for (const userId of users) {
      const portfolio = await this.getPortfolio(userId);

      // Risk parity optimization
      const optimized = await this.riskParity.optimizeRiskParity(
        portfolio.openPositions,
      );

      // Log rebalancing recommendations
      await this.mongo.collection('rebalancing_recommendations').insertOne({
        userId,
        timestamp: new Date(),
        recommendations: optimized,
      });

      this.logger.log(`Rebalancing recommendations for user ${userId}`, {
        optimized,
      });
    }
  }
}
```

---

### 5. Deployment & Monitoring

#### Grafana Dashboard Setup

```bash
# Import pre-built dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @infrastructure/observability/grafana/dashboards/regulatory-compliance.json
```

#### Email Report Template

```html
<!-- templates/daily-report.html -->
<h1>Daily Trading Report - {{ date }}</h1>

<h2>Summary</h2>
<table>
  <tr>
    <td>Total Trades:</td>
    <td>{{ summary.totalTrades }}</td>
  </tr>
  <tr>
    <td>Realized P&L:</td>
    <td>₹{{ summary.realizedPnL }}</td>
  </tr>
  <tr>
    <td>Net P&L:</td>
    <td>₹{{ summary.netPnL }}</td>
  </tr>
</table>

<h2>Risk Metrics</h2>
<ul>
  <li>Daily Loss Limit Utilization: {{ riskMetrics.dailyLossUtilization }}%</li>
  <li>Greeks Delta Utilization: {{ riskMetrics.deltaUtilization }}%</li>
  <li>VaR (95%): ₹{{ riskMetrics.var95 }}</li>
</ul>

<h2>Compliance Status</h2>
<p>
  All pre-trade checks: {{ complianceStatus.validation.approved }} approved, {{
  complianceStatus.validation.rejected }} rejected
</p>

<h2>Trades</h2>
<table>
  <thead>
    <tr>
      <th>Time</th>
      <th>Algo ID</th>
      <th>Symbol</th>
      <th>Strategy</th>
      <th>P&L</th>
    </tr>
  </thead>
  <tbody>
    {% for trade in trades %}
    <tr>
      <td>{{ trade.timestamp }}</td>
      <td>{{ trade.algoId }}</td>
      <td>{{ trade.symbol }}</td>
      <td>{{ trade.strategy }}</td>
      <td>₹{{ trade.pnl }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
```

---

### Implementation Timeline

**Phase 1** (Week 1): Compliance dashboard + automated daily reports

- [ ] Implement `RegulatoryReportingService`
- [ ] Create Grafana dashboard panels
- [ ] Set up automated email delivery

**Phase 2** (Week 2): Advanced risk analytics

- [ ] Implement VaR calculation (Monte Carlo)
- [ ] Implement stress testing scenarios
- [ ] Add risk-parity optimization

**Phase 3** (Week 3): Integration & testing

- [ ] Integrate with existing `RiskValidationService`
- [ ] Unit tests for VaR, stress testing
- [ ] Backtest with historical portfolio data

**Total Estimated Time**: 2-3 weeks

---

### Benefits

1. **Time Savings**: 10-15 hours/month (manual reporting → automated)
2. **Proactive Compliance**: Real-time monitoring prevents violations
3. **Better Risk Management**: VaR + stress tests provide early warnings
4. **Regulatory Readiness**: SEBI 2026+ compliant from day one
5. **Portfolio Optimization**: Risk-parity allocation improves risk-adjusted returns

**ROI**: HIGH (compliance + efficiency)

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
