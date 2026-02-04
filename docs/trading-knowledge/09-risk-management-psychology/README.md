# Module 09: Risk Management & Trading Psychology

> **Quantitative risk analysis, portfolio optimization, position sizing, and behavioral finance**

**Source:** https://zerodha.com/varsity/module/risk-management/  
**Chapters:** 16  
**Difficulty:** Advanced  
**Prerequisites:** Modules 2, 4, 5 (Technical Analysis, Futures, Options)

---

## 📖 Overview

This module combines **quantitative risk management** (variance, VaR, portfolio optimization) with **trading psychology** (biases, emotional discipline). Essential for professional traders managing capital and emotions.

---

## 📚 Chapters

### Quantitative Risk

| #   | Chapter                                                                | Topics Covered                 | Link                                                                                              |
| --- | ---------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| 01  | [Orientation](./01-orientation.md)                                     | Why risk management matters    | [Varsity](https://zerodha.com/varsity/chapter/orientation-note/)                                  |
| 02  | [Risk (Part 1)](./02-risk-part1.md)                                    | Expected returns, variance, SD | [Varsity](https://zerodha.com/varsity/chapter/risk-part-1/)                                       |
| 03  | [Risk (Part 2) - Variance & Covariance](./03-risk-part2.md)            | Covariance, correlation        | [Varsity](https://zerodha.com/varsity/chapter/risk-part-2-variance-covariance/)                   |
| 04  | [Risk (Part 3) - Covariance Matrix](./04-risk-part3.md)                | Portfolio variance calculation | [Varsity](https://zerodha.com/varsity/chapter/risk-part-3-_variance-covariance-matrix/)           |
| 05  | [Risk (Part 4) - Correlation & Portfolio Variance](./05-risk-part4.md) | Portfolio risk aggregation     | [Varsity](https://zerodha.com/varsity/chapter/risk-part-4-correlation-matrix-portfolio-variance/) |
| 06  | [Equity Curve](./06-equity-curve.md)                                   | Cumulative P&L, drawdowns      | [Varsity](https://zerodha.com/varsity/chapter/equity-curve/)                                      |
| 07  | [Expected Returns](./07-expected-returns.md)                           | Monte Carlo, probability       | [Varsity](https://zerodha.com/varsity/chapter/expected-returns/)                                  |

### Portfolio Optimization

| #   | Chapter                                                                 | Topics Covered                   | Link                                                     |
| --- | ----------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| 08  | [Portfolio Optimization (Part 1)](./08-portfolio-optimization-part1.md) | Efficient frontier, Sharpe ratio | [Varsity](https://zerodha.com/varsity/chapter/port-opt/) |
| 09  | [Portfolio Optimization (Part 2)](./09-portfolio-optimization-part2.md) | Markowitz model, solver          | [Varsity](https://zerodha.com/varsity/chapter/po2/)      |

### Risk Metrics

| #   | Chapter                                      | Topics Covered                  | Link                                                |
| --- | -------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| 10  | [Value at Risk (VaR)](./10-value-at-risk.md) | 95%, 99% VaR, historical method | [Varsity](https://zerodha.com/varsity/chapter/var/) |

### Position Sizing

| #   | Chapter                                                   | Topics Covered                     | Link                                                                                  |
| --- | --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| 11  | [Position Sizing (Part 1)](./11-position-sizing-part1.md) | Fixed % method, volatility-based   | [Varsity](https://zerodha.com/varsity/chapter/position-sizing/)                       |
| 12  | [Position Sizing (Part 2)](./12-position-sizing-part2.md) | ATR-based, risk parity             | [Varsity](https://zerodha.com/varsity/chapter/position-sizing-active-traders-part-2/) |
| 13  | [Position Sizing (Part 3)](./13-position-sizing-part3.md) | Advanced techniques                | [Varsity](https://zerodha.com/varsity/chapter/position-sizing-active-traders-part-3/) |
| 14  | [Kelly's Criterion](./14-kelly-criterion.md)              | Optimal bet sizing (Kelly formula) | [Varsity](https://zerodha.com/varsity/chapter/kellys-criterion/)                      |

### Trading Psychology

| #   | Chapter                                                 | Topics Covered                   | Link                                                             |
| --- | ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| 15  | [Trading Biases](./15-trading-biases.md)                | Loss aversion, confirmation bias | [Varsity](https://zerodha.com/varsity/chapter/trading-biases/)   |
| 16  | [Trading Biases (Part 2)](./16-trading-biases-part2.md) | Recency, anchoring, FOMO         | [Varsity](https://zerodha.com/varsity/chapter/tradingbiases-p2/) |

---

## 🎯 Learning Outcomes

After completing this module, you will:

- ✅ Calculate portfolio variance and correlation
- ✅ Build efficient portfolios (Markowitz optimization)
- ✅ Compute Value at Risk (VaR) for risk estimation
- ✅ Apply position sizing techniques (fixed %, ATR, Kelly)
- ✅ Use Kelly Criterion for optimal leverage
- ✅ Identify and mitigate trading biases
- ✅ Analyze equity curve and drawdowns
- ✅ Understand risk-adjusted returns (Sharpe, Sortino)

---

## 🔑 Key Concepts

### Risk Metrics

**Variance (σ²)**

```
Variance = Σ[(Return - Avg Return)²] / (n - 1)

High variance = High volatility (risky asset)
Low variance = Low volatility (stable asset)
```

**Standard Deviation (σ)**

```
SD = √Variance

Example:
Stock A: SD = 15% (volatile)
Stock B: SD = 8% (stable)
```

**Covariance (Cov)**

```
Cov(A, B) = Σ[(ReturnA - AvgA) × (ReturnB - AvgB)] / (n - 1)

Positive Cov = Stocks move together
Negative Cov = Stocks move opposite (hedging)
```

**Correlation (ρ)**

```
ρ = Cov(A, B) / (SD_A × SD_B)

Range: -1 to +1
+1 = Perfect positive correlation
-1 = Perfect negative correlation
0 = No correlation
```

### Portfolio Variance

**2-Asset Portfolio**

```
Var(P) = w₁²σ₁² + w₂²σ₂² + 2w₁w₂Cov(1,2)

Where:
w₁, w₂ = Weights (e.g., 0.6, 0.4)
σ₁, σ₂ = Standard deviations
Cov(1,2) = Covariance
```

**N-Asset Portfolio**
Use covariance matrix:

```
Var(P) = W^T × Σ × W

Where:
W = Weight vector [w₁, w₂, ..., wₙ]
Σ = Covariance matrix
```

---

### Value at Risk (VaR)

**Definition:** Maximum expected loss at a given confidence level.

**95% VaR = ₹50,000**  
→ 95% of days, loss will not exceed ₹50K  
→ 5% of days (1 in 20), loss may exceed ₹50K

**Calculation (Historical Method)**

```
1. Collect 100 days of portfolio returns
2. Sort returns from worst to best
3. 95% VaR = 5th percentile (95th from worst)

Example:
Day 5 loss = ₹48,000
Day 6 loss = ₹52,000
95% VaR = ₹52,000
```

---

### Position Sizing Methods

#### 1. Fixed Percentage (Simple)

```
Position Size = Capital × Risk %

Example:
Capital: ₹10L
Risk per trade: 2%
Position Size: 10L × 0.02 = ₹20,000 max risk
```

#### 2. Volatility-Based (ATR)

```
Position Size = Risk Amount / (ATR × Multiplier)

Example:
Risk Amount: ₹20,000
ATR (14-day): 150
Multiplier (stop-loss): 2
Position Size = 20,000 / (150 × 2) = 67 shares
```

#### 3. Kelly Criterion (Optimal)

```
Kelly % = (Win% × Avg Win) - (Loss% × Avg Loss) / Avg Win

Example:
Win Rate: 60%
Avg Win: ₹10,000
Avg Loss: ₹6,000
Kelly % = (0.6 × 10K - 0.4 × 6K) / 10K = 36%

Position Size = Capital × 36% (RISKY!)
Half-Kelly = 18% (safer)
```

---

## 💡 Practical Applications

### Risk Management in Algo Trading

**Already Implemented in `algo-worker`:**

```typescript
// apps/algo-worker/src/layers/control/RiskManagerService.ts

export class RiskManagerService {
  // 1. Kelly Criterion Position Sizing
  calculatePositionSize(
    capital: number,
    winRate: number,
    avgWin: number,
    avgLoss: number,
  ) {
    const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const halfKelly = kelly / 2; // Conservative
    return capital * halfKelly;
  }

  // 2. Portfolio VaR (99% confidence)
  calculateVaR(returns: number[], confidence = 0.99) {
    const sorted = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return sorted[index]; // e.g., -₹50,000
  }

  // 3. Max Position Size (5% of capital)
  enforceMaxPosition(orderValue: number, capital: number) {
    const maxAllowed = capital * 0.05;
    if (orderValue > maxAllowed) {
      throw new RiskLimitExceededError("Position >5% of capital");
    }
  }

  // 4. Circuit Breaker (max daily loss)
  checkDailyLoss(currentLoss: number, maxLoss: number) {
    if (currentLoss > maxLoss) {
      this.disableTrading();
      this.logger.alert("Circuit breaker triggered");
    }
  }
}
```

---

### Equity Curve Analysis

**Metrics to Track:**

| Metric            | Formula                                | Target   |
| ----------------- | -------------------------------------- | -------- |
| **Sharpe Ratio**  | (Avg Return - Risk-Free) / SD          | >1.5     |
| **Sortino Ratio** | (Avg Return - Risk-Free) / Downside SD | >2.0     |
| **Max Drawdown**  | Max peak-to-trough decline             | <15%     |
| **Recovery Time** | Days to recover from drawdown          | <30 days |
| **Win Rate**      | Winning trades / Total trades          | >50%     |
| **Profit Factor** | Gross Profit / Gross Loss              | >1.5     |

**Dashboard Implementation:**

```typescript
// apps/web/src/app/analytics/equity-curve

<EquityCurveChart data={tradingHistory} />
<RiskMetrics>
  - Sharpe Ratio: 1.8 ✅
  - Max Drawdown: 12% ✅
  - Current Drawdown: 3%
  - Recovery Days: 5
</RiskMetrics>
```

---

## 🧠 Trading Psychology

### Common Biases

| Bias                           | Description                       | Impact                       | Solution               |
| ------------------------------ | --------------------------------- | ---------------------------- | ---------------------- |
| **Loss Aversion**              | Fear of losses > desire for gains | Hold losers, sell winners    | Use stop-loss always   |
| **Confirmation Bias**          | Seek info that confirms view      | Ignore contradicting signals | Devil's advocate       |
| **Recency Bias**               | Recent events weigh more          | Overreact to latest trade    | Track long-term stats  |
| **Anchoring**                  | Fixate on entry price             | Can't accept loss            | Focus on current price |
| **FOMO (Fear of Missing Out)** | Chase rallies, buy tops           | Late entries, losses         | Stick to plan          |
| **Revenge Trading**            | Trade to recover losses           | Overleverage, blow up        | Take break after loss  |

---

### Bias Mitigation Strategies

**1. Pre-Trade Checklist**

```
[ ] Clear setup (not FOMO)
[ ] Risk defined (stop-loss set)
[ ] Size appropriate (2% risk max)
[ ] No revenge (not after big loss)
[ ] Logical reason (not gut feel)
```

**2. Trading Journal (Emotion Tracking)**

```typescript
// apps/web/src/app/journal

Trade Entry:
- Emotion: Calm / Anxious / Excited / Fear
- Reason: Setup / News / FOMO / Revenge
- Confidence: 1-10

AI Analysis:
"You took 5 trades marked 'FOMO' this month.
Win rate on FOMO trades: 20% vs 65% on setup-based.
Recommendation: Avoid impulsive entries."
```

**3. Circuit Breakers**

```
After 3 consecutive losses:
- Stop trading for the day
- Review what went wrong
- Resume next day with reduced size
```

---

## 📊 Real-World Example

**Portfolio Optimization (2-Stock)**

| Stock        | Weight | Exp Return | SD  | Allocation |
| ------------ | ------ | ---------- | --- | ---------- |
| **TCS**      | 60%    | 15%        | 20% | ₹6L        |
| **Reliance** | 40%    | 18%        | 25% | ₹4L        |

**Correlation (TCS, Reliance) = 0.4**

**Portfolio Variance:**

```
Var(P) = (0.6)²(0.2)² + (0.4)²(0.25)² + 2(0.6)(0.4)(0.4)(0.2)(0.25)
       = 0.0144 + 0.01 + 0.0096
       = 0.034

Portfolio SD = √0.034 = 18.4%
```

**Portfolio Expected Return:**

```
Exp Return = 0.6 × 15% + 0.4 × 18% = 16.2%
```

**Sharpe Ratio (assuming risk-free = 7%):**

```
Sharpe = (16.2% - 7%) / 18.4% = 0.5 (Not great)
```

**Optimization:** Add low-correlation asset (gold, bonds) to reduce SD.

---

## 🛠️ Tools & Resources

### Risk Calculators

- **Python (NumPy, Pandas):** Covariance, VaR calculation
- **Excel Solver:** Portfolio optimization
- **R (quantmod):** Financial time-series analysis

### Position Sizing Tools

- **ATR Calculator:** TradingView built-in
- **Kelly Calculator:** https://www.investopedia.com/articles/trading/04/091504.asp
- **Position Size Calculator:** Custom web tool (to be built)

### Psychology Resources

- **"Trading in the Zone"** by Mark Douglas
- **"Thinking, Fast and Slow"** by Daniel Kahneman
- **Module 12: Innerworth** (603 psychology articles)

---

## ⚠️ Common Mistakes

1. **Overleveraging:** Using max margin (Kelly 100%) → one bad trade = blown account
2. **No Diversification:** All capital in one stock/sector
3. **Ignoring Correlation:** Holding 5 bank stocks (looks diversified, actually correlated)
4. **No Stop-Loss:** "It will come back" → drawdown spirals
5. **Emotional Trading:** Revenge trades after losses
6. **Ignoring VaR:** Unaware of portfolio risk

---

## 🔗 External Resources

- **Zerodha Varsity:** https://zerodha.com/varsity/module/risk-management/
- **Investopedia Risk Management:** https://www.investopedia.com/risk-management-4689809
- **Kahneman's Prospect Theory:** https://en.wikipedia.org/wiki/Prospect_theory
- **Python for Finance:** https://www.python-forfinance.com/

---

## ✅ Module Completion Checklist

Before moving to Module 10, ensure you can:

- [ ] Calculate variance, SD, covariance
- [ ] Build covariance matrix for 3+ assets
- [ ] Compute portfolio variance
- [ ] Calculate 95% VaR (historical method)
- [ ] Apply Kelly Criterion position sizing
- [ ] Identify 5+ trading biases in yourself
- [ ] Analyze equity curve (Sharpe, drawdown)
- [ ] Build risk-adjusted portfolios

---

**Next Module:** [Module 10 - Trading Systems](../10-trading-systems/)  
**Previous Module:** [Module 08 - Currency, Commodity & G-Sec](../08-currency-commodity-gsec/)

---

**Last Updated:** February 4, 2026
