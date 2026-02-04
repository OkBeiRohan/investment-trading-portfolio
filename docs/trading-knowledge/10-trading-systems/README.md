# Module 10: Trading Systems

> **Build systematic trading strategies - pair trading, statistical arbitrage, calendar spreads, and momentum portfolios**

**Source:** [Zerodha Varsity - Trading Systems](https://zerodha.com/varsity/module/trading-systems/)  
**Chapters:** 16  
**Difficulty:** Advanced  
**Prerequisites:** Module 2 (Technical Analysis), Module 9 (Risk Management)

---

## 📖 Overview

This module transitions from discretionary trading to systematic, rule-based strategies. You'll learn quantitative techniques like pair trading (statistical arbitrage), calendar spreads, and momentum portfolios - strategies that remove emotional biases and can be backtested rigorously.

Pair trading exploits mean-reversion between correlated stocks (e.g., HDFC Bank vs ICICI Bank). You'll learn two methods: density curve approach and linear regression with ADF (Augmented Dickey-Fuller) test for cointegration. Calendar spreads capitalize on time decay differentials between near-month and far-month options.

The module emphasizes statistical rigor - tracking ratios, z-scores, error ratios, and stationarity tests. You'll build live trading examples with entry/exit rules, position sizing, and stop-losses. This is essential preparation for algorithmic trading and automated execution.

---

## 📚 Chapters

### Pair Trading Fundamentals (2 chapters)

| #   | Chapter                                           | Topics Covered                                     | Link                                                                |
| --- | ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 01  | [What to expect?](./01-what-to-expect.md)         | Systematic trading mindset, backtesting importance | [Varsity](https://zerodha.com/varsity/chapter/what-to-expect/)      |
| 02  | [Pair Trading logic](./02-pair-trading-basics.md) | Mean reversion, correlation vs cointegration       | [Varsity](https://zerodha.com/varsity/chapter/pair-trading-basics/) |

### Pair Trading Method 1: Density Curve (5 chapters)

| #   | Chapter                                                   | Topics Covered                                 | Link                                                              |
| --- | --------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| 03  | [PTM1, C1 - Tracking Pairs](./03-tracking-pairs.md)       | Stock screening, correlation calculation       | [Varsity](https://zerodha.com/varsity/chapter/tracking-pairs/)    |
| 04  | [PTM1, C2 – Pair stats](./04-pair-stats.md)               | Ratio calculation, mean, standard deviation    | [Varsity](https://zerodha.com/varsity/chapter/pair-stats/)        |
| 05  | [PTM1, C3 – Pre trade setup](./05-pre-trade-setup.md)     | Z-score thresholds, entry/exit rules           | [Varsity](https://zerodha.com/varsity/chapter/pre-trade-setup/)   |
| 06  | [PTM1, C4 – The Density Curve](./06-the-density-curve.md) | Probability distribution, normal curve fitting | [Varsity](https://zerodha.com/varsity/chapter/the-density-curve/) |
| 07  | [PTM1, C5 – The Pair Trade](./07-the-pair-trade.md)       | Live trade execution, position sizing, P&L     | [Varsity](https://zerodha.com/varsity/chapter/the-pair-trade/)    |

### Pair Trading Method 2: Linear Regression (6 chapters)

| #   | Chapter                                                             | Topics Covered                             | Link                                                                   |
| --- | ------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| 08  | [PTM2, C1 – Straight line Equation](./08-straight-line-equation.md) | y = mx + c, intercept, slope               | [Varsity](https://zerodha.com/varsity/chapter/straight-line-equation/) |
| 09  | [PTM2, C2 – Linear Regression](./09-linear-regression.md)           | Least squares method, R², residuals        | [Varsity](https://zerodha.com/varsity/chapter/linear-regression/)      |
| 10  | [PTM2, C3 – The Error Ratio](./10-the-error-ratio.md)               | Spread construction, residual trading      | [Varsity](https://zerodha.com/varsity/chapter/the-error-ratio/)        |
| 11  | [PTM2, C4 – The ADF test](./11-the-adf-test.md)                     | Stationarity, cointegration, p-value       | [Varsity](https://zerodha.com/varsity/chapter/the-adf-test/)           |
| 12  | [Trade Identification](./12-trade-identification.md)                | Combining ADF + z-score for signals        | [Varsity](https://zerodha.com/varsity/chapter/trade-identification/)   |
| 13  | [Live Example -1](./13-live-example.md)                             | Full walkthrough (stock selection to exit) | [Varsity](https://zerodha.com/varsity/chapter/live-example/)           |
| 14  | [Live Example – 2](./14-live-example-2.md)                          | Alternative pair, different sector         | [Varsity](https://zerodha.com/varsity/chapter/live-example-2/)         |

### Advanced Strategies (2 chapters)

| #   | Chapter                                            | Topics Covered                                  | Link                                                                |
| --- | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| 15  | [Calendar Spreads](./15-calendar-spreads.md)       | Time decay arbitrage, theta harvesting          | [Varsity](https://zerodha.com/varsity/chapter/calendar-spreads/)    |
| 16  | [Momentum Portfolios](./16-momentum-portfolios.md) | Relative strength, rebalancing, sector rotation | [Varsity](https://zerodha.com/varsity/chapter/momentum-portfolios/) |

---

## 🎯 Learning Outcomes

After completing this module, you will:

- ✅ **Build pair trading systems:** Identify cointegrated stock pairs, calculate z-scores
- ✅ **Apply statistical tests:** ADF test for stationarity, correlation vs cointegration
- ✅ **Execute market-neutral trades:** Hedge market risk, profit from relative performance
- ✅ **Backtest strategies:** Use historical data to validate entry/exit rules
- ✅ **Construct calendar spreads:** Capitalize on theta decay differentials
- ✅ **Build momentum portfolios:** Systematic rebalancing based on relative strength
- ✅ **Automate trading logic:** Translate rules into algo-tradable signals

---

## 🔑 Key Concepts

### Correlation vs Cointegration

| Concept           | Meaning                            | Trading Implication                                   |
| ----------------- | ---------------------------------- | ----------------------------------------------------- |
| **Correlation**   | Stocks move together (0 to +1)     | High correlation ≠ tradable (may diverge permanently) |
| **Cointegration** | Long-term equilibrium relationship | Mean-reverting spread → tradable                      |

**Example:**

- HDFC Bank & ICICI Bank: Correlation = 0.85 (high but may trend apart)
- After ADF test: p-value < 0.05 → Cointegrated (spread mean-reverts)

### Pair Trading Workflow (Method 1: Density Curve)

```
1. Screen stocks (same sector, high correlation >0.7)
2. Calculate price ratio: Ratio = Stock A / Stock B
3. Compute statistics:
   - Mean(Ratio) = μ
   - Std Dev(Ratio) = σ
4. Calculate z-score: z = (Current Ratio - μ) / σ
5. Trading rules:
   - BUY Stock A, SELL Stock B when z < -2 (ratio oversold)
   - SELL Stock A, BUY Stock B when z > +2 (ratio overbought)
   - EXIT when z → 0 (mean reversion)
6. Position sizing: Equal notional (₹1L each leg)
```

### Pair Trading Workflow (Method 2: Linear Regression)

```
1. Run regression: Stock A = β × Stock B + α + ε
2. Extract residuals (ε): Error = Actual - Predicted
3. Test stationarity: ADF test on residuals (p-value <0.05)
4. Calculate z-score of residuals: z = (ε - mean(ε)) / std(ε)
5. Trading rules:
   - BUY Stock A, SELL Stock B when z < -2
   - SELL Stock A, BUY Stock B when z > +2
   - EXIT when z → 0
6. Hedge ratio: Use β from regression (e.g., β=1.2 → buy 1.2 units of B per unit of A)
```

### ADF Test Interpretation

```
ADF Test Output:
- ADF Statistic: -4.25
- p-value: 0.0003
- Critical Values: {1%: -3.43, 5%: -2.86, 10%: -2.57}

Interpretation:
- p-value <0.05 → Reject null hypothesis (series is stationary)
- ADF Statistic <Critical Value → Series is cointegrated
- Conclusion: Spread is mean-reverting (tradable pair)
```

### Calendar Spread Mechanics

**Example (Nifty @ 18,000):**

1. **Setup:** High IV expected to fall (post-event)
2. **Strategy:** Sell near-month 18,000 CE (30 DTE), Buy far-month 18,000 CE (60 DTE)
3. **Cost:** -₹200 (sell) + ₹280 (buy) = ₹80 debit
4. **Profit:** Near-month decays faster (theta=-5 vs theta=-3)
5. **Breakeven:** If near-month decays to ₹100, far-month to ₹250 → Net = ₹150 (profit = ₹70)

---

## 💡 Practical Applications

### For Traders

**Intraday Pair Trade (Banking Stocks):**

1. **Pair:** HDFC Bank vs Kotak Bank (correlation 0.82, cointegrated)
2. **Current Ratio:** 1.35 (historical mean = 1.40, σ = 0.05)
3. **Z-score:** (1.35 - 1.40) / 0.05 = -1.0 (mildly oversold)
4. **Signal:** Wait for z < -2 (ratio = 1.30) → BUY HDFC, SELL Kotak
5. **Position:** ₹1L HDFC long, ₹1L Kotak short (market neutral)
6. **Exit:** When z → 0 (ratio returns to 1.40)

**Momentum Portfolio (Monthly Rebalance):**

1. **Universe:** Nifty 50 stocks
2. **Ranking:** 3-month return (descending)
3. **Portfolio:** Top 10 stocks (equal weight)
4. **Rebalance:** Every month (sell losers, buy new entrants)
5. **Backtest:** 5-year CAGR = 18% (vs Nifty 12%)

### For Investors

**Long-term Statistical Arbitrage:**

- Identify sector pairs (PSU banks vs private banks)
- Hold mean-reverting positions for weeks/months
- Lower transaction costs, less monitoring

### For Platform Implementation

**See [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md#module-10-trading-systems)**

**Algo-Worker Integration:**

- **Pair Screener:** Auto-calculate correlation matrix (500+ stocks daily)
- **ADF Test Module:** Python `statsmodels.tsa.stattools.adfuller` integration
- **Z-Score Alerts:** Real-time monitoring, SMS/email when z <-2 or >+2
- **Backtesting Engine:** Historical simulation with slippage, transaction costs
- **Calendar Spread Scanner:** Identify mispriced near vs far month options
- **Momentum Ranker:** Auto-rebalance signals based on relative strength

**Required Data:**

- Historical prices (5 years daily data for cointegration tests)
- Real-time quotes for live z-score calculation
- Option chain (all expiries for calendar spreads)
- Sector classification (for sector-neutral pairs)

---

## 📊 Quick Reference

### Pair Trading Entry/Exit Thresholds

| Z-Score         | Action                    | Interpretation                        |
| --------------- | ------------------------- | ------------------------------------- |
| **z > +2**      | SELL Stock A, BUY Stock B | Ratio overextended (mean revert down) |
| **+1 < z < +2** | HOLD                      | Trend but not extreme                 |
| **-1 < z < +1** | NEUTRAL / EXIT            | Near mean (take profit)               |
| **-2 < z < -1** | HOLD                      | Trend but not extreme                 |
| **z < -2**      | BUY Stock A, SELL Stock B | Ratio oversold (mean revert up)       |

### Common Stock Pairs (Indian Market)

| Sector      | Pair                                      | Typical Correlation |
| ----------- | ----------------------------------------- | ------------------- |
| **Banking** | HDFC Bank - ICICI Bank                    | 0.85                |
| **IT**      | TCS - Infosys                             | 0.78                |
| **Auto**    | Maruti - Tata Motors                      | 0.72                |
| **FMCG**    | HUL - ITC                                 | 0.65                |
| **Telecom** | Bharti Airtel - Reliance Jio (not listed) | N/A                 |

**Note:** Always verify cointegration (ADF test) before trading - correlation alone is insufficient.

### Momentum Portfolio Metrics

```
Sharpe Ratio = (Portfolio Return - Risk-free Rate) / Portfolio Volatility

Example:
- 3M Momentum Portfolio: 18% return, 22% volatility
- Risk-free rate: 6%
- Sharpe = (18% - 6%) / 22% = 0.54

Benchmark (Nifty): 12% return, 18% volatility
- Sharpe = (12% - 6%) / 18% = 0.33

Momentum outperforms on risk-adjusted basis!
```

---

## 🛠️ Tools & Resources

- **Python Libraries:** `pandas`, `numpy`, `statsmodels` (ADF test), `scipy` (linear regression)
- **Pair Trading Software:** [Pairs Trading Lab](https://pairstradinglab.com/)
- **Backtesting Platforms:** QuantConnect, Backtrader, Zipline
- **Statistical Tools:** R (PerformanceAnalytics package)
- **NSE Data:** Historical bhavcopy (equity, F&O)
- **Research Papers:** [SSRN - Pair Trading Strategies](https://papers.ssrn.com/)

---

## ⚠️ Common Mistakes

1. **Using correlation without ADF test:** Pairs diverge permanently (Citibank-HSBC in 2008)
2. **Overfitting on historical data:** Backtest shows 90% win rate, live trading fails
3. **Ignoring transaction costs:** High-frequency pair trading eaten by brokerage
4. **Not monitoring cointegration:** Relationship breaks down (sector rotation, mergers)
5. **Equal position sizing without hedge ratio:** Should use β from regression
6. **Entering trades on z=-1.5:** Not extreme enough, whipsaws common
7. **No stop-loss:** Cointegration breaks, spread continues to diverge (z=-5, -10...)
8. **Not accounting for dividends:** Ex-div adjustments distort price ratios
9. **Trading illiquid stocks:** Wide bid-ask spreads destroy edge
10. **Calendar spreads without IV analysis:** Selling low IV, buying high IV (negative edge)

---

## 🔗 External Resources

- **Zerodha Varsity:** [Trading Systems Module](https://zerodha.com/varsity/module/trading-systems/)
- **QuantInsti:** [Pair Trading Course](https://www.quantinsti.com/)
- **Andreas Clenow:** "Stocks on the Move" (Momentum strategies)
- **Ernest Chan:** "Algorithmic Trading" (Pair trading, mean reversion)
- **ADF Test Documentation:** [Statsmodels Python](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html)

---

## ✅ Module Completion Checklist

Before moving to next module, ensure you can:

- [ ] Calculate correlation between two stocks (Python/Excel)
- [ ] Perform ADF test to check cointegration (p-value interpretation)
- [ ] Compute z-score of a price ratio (manual + code)
- [ ] Identify entry/exit points for pair trade (z-score thresholds)
- [ ] Run linear regression to find hedge ratio (β coefficient)
- [ ] Backtest a simple pair trading strategy (1-year data)
- [ ] Build a momentum portfolio (rank stocks, rebalance monthly)
- [ ] Construct a calendar spread (calculate net theta)
- [ ] Understand when cointegration breaks (stop trading the pair)
- [ ] Calculate position sizing for equal notional exposure

---

**Next Module:** [Module 11: Personal Finance - Mutual Funds](../11-mutual-funds/)  
**Previous Module:** [Module 9: Risk Management and Trading Psychology](../09-risk-management-psychology/)

---

**Last Updated:** February 4, 2026
