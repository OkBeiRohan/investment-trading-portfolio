# Module 6: Option Strategies

> **Build multi-leg option strategies for every market condition - spreads, straddles, strangles, and advanced combinations**

**Source:** [Zerodha Varsity - Option Strategies](https://zerodha.com/varsity/module/option-strategies/)  
**Chapters:** 14  
**Difficulty:** Advanced  
**Prerequisites:** Module 5 (Options Theory for Professional Trading)

---

## 📖 Overview

While Module 5 taught you the building blocks (call/put options and Greeks), this module combines them into sophisticated multi-leg strategies designed for specific market scenarios. You'll learn directional strategies (bull/bear spreads), volatility strategies (straddles/strangles), and advanced constructions (iron condors, ratio spreads).

Each strategy is analyzed through its payoff diagram, breakeven points, maximum profit/loss, and Greek behavior. You'll understand when to deploy each strategy based on your market outlook (bullish, bearish, neutral, volatile, range-bound) and how to adjust positions as market conditions change.

The module also covers practical considerations like bid-ask spreads in multi-leg orders, margin requirements, and the crucial concepts of Max Pain and Put-Call Ratio (PCR) for sentiment analysis. By the end, you'll have a complete toolkit to construct, execute, and manage complex option strategies.

---

## 📚 Chapters

| #   | Chapter                                                        | Topics Covered                                           | Link                                                                     |
| --- | -------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 01  | [Orientation](./01-orientation.md)                             | Strategy classification, market outlook framework        | [Varsity](https://zerodha.com/varsity/chapter/orientation/)              |
| 02  | [Bull Call Spread](./02-bull-call-spread.md)                   | Limited risk bullish strategy, debit spread              | [Varsity](https://zerodha.com/varsity/chapter/bull-call-spread/)         |
| 03  | [Bull Put Spread](./03-bull-put-spread.md)                     | Credit spread for bullish outlook, theta positive        | [Varsity](https://zerodha.com/varsity/chapter/bull-put-spread/)          |
| 04  | [Call Ratio Back Spread](./04-call-ratio-back-spread.md)       | Bullish + high volatility, unlimited upside              | [Varsity](https://zerodha.com/varsity/chapter/call-ratio-back-spread/)   |
| 05  | [Bear Call Ladder](./05-bear-call-ladder.md)                   | Bearish strategy with limited risk, complex payoff       | [Varsity](https://zerodha.com/varsity/chapter/bear-call-ladder/)         |
| 06  | [Synthetic Long & Arbitrage](./06-synthetic-long-arbitrage.md) | Replicating stocks with options, arbitrage opportunities | [Varsity](https://zerodha.com/varsity/chapter/synthetic-long-arbitrage/) |
| 07  | [Bear Put Spread](./07-bear-put-spread.md)                     | Limited risk bearish strategy, debit spread              | [Varsity](https://zerodha.com/varsity/chapter/bear-put-spread/)          |
| 08  | [Bear Call Spread](./08-bear-call-spread.md)                   | Credit spread for bearish outlook, defined risk          | [Varsity](https://zerodha.com/varsity/chapter/bear-call-spread/)         |
| 09  | [Put Ratio Back Spread](./09-put-ratio-back-spread.md)         | Bearish + high volatility, unlimited downside profit     | [Varsity](https://zerodha.com/varsity/chapter/put-ratio-back-spread/)    |
| 10  | [The Long Straddle](./10-the-long-straddle.md)                 | Big move expected (any direction), long volatility       | [Varsity](https://zerodha.com/varsity/chapter/the-long-straddle/)        |
| 11  | [The Short Straddle](./11-the-short-straddle.md)               | Range-bound market, short volatility, high margin        | [Varsity](https://zerodha.com/varsity/chapter/the-short-straddle/)       |
| 12  | [The Long & Short Strangle](./12-the-long-short-strangle.md)   | Wider breakevens than straddle, cheaper premium          | [Varsity](https://zerodha.com/varsity/chapter/the-long-short-strangle/)  |
| 13  | [Max Pain & PCR Ratio](./13-max-pain-pcr-ratio.md)             | OI-based sentiment indicators, expiry predictions        | [Varsity](https://zerodha.com/varsity/chapter/max-pain-pcr-ratio/)       |
| 14  | [Iron Condor](./14-iron-condor.md)                             | Defined risk range-bound strategy, premium collection    | [Varsity](https://zerodha.com/varsity/chapter/iron-condor/)              |

---

## 🎯 Learning Outcomes

After completing this module, you will:

- ✅ **Construct 10+ option strategies** for every market condition
- ✅ **Calculate payoff diagrams** and identify breakeven points
- ✅ **Choose strategies** based on volatility expectations (IV rank/percentile)
- ✅ **Manage multi-leg positions:** Adjustments, rollovers, exit strategies
- ✅ **Optimize margin usage:** Understand SPAN benefits of spreads
- ✅ **Use Max Pain & PCR:** Gauge sentiment before major events
- ✅ **Execute spread orders:** Combo orders to minimize slippage
- ✅ **Hedge naked positions:** Convert unlimited risk to defined risk

---

## 🔑 Key Concepts

### Strategy Selection Framework

| Market Outlook               | Volatility | Recommended Strategies                      |
| ---------------------------- | ---------- | ------------------------------------------- |
| **Bullish (Moderate)**       | Low/Medium | Bull Call Spread, Bull Put Spread           |
| **Bullish (Strong)**         | High       | Call Ratio Back Spread, Long Call           |
| **Bearish (Moderate)**       | Low/Medium | Bear Put Spread, Bear Call Spread           |
| **Bearish (Strong)**         | High       | Put Ratio Back Spread, Long Put             |
| **Neutral (Range-bound)**    | Low        | Short Straddle, Short Strangle, Iron Condor |
| **Neutral (Volatile)**       | High       | Long Straddle, Long Strangle                |
| **Any Direction (Big Move)** | Low → High | Long Straddle (before earnings/events)      |

### Spread Types Classification

**Vertical Spreads (Same expiry, different strikes):**

- Bull Call Spread (Buy lower call, sell higher call)
- Bear Put Spread (Buy higher put, sell lower put)
- Bull Put Spread (Sell higher put, buy lower put - credit)
- Bear Call Spread (Sell lower call, buy higher call - credit)

**Horizontal Spreads (Same strike, different expiries):**

- Calendar Spread (Sell near month, buy far month - Module 10)

**Diagonal Spreads (Different strikes + different expiries):**

- Combines vertical + horizontal characteristics

**Ratio Spreads (Unequal legs):**

- Call/Put Ratio Back Spreads (1:2 or 1:3 ratios)

### Key Strategy Comparisons

| Strategy             | Max Profit                                            | Max Loss                              | When to Use                            |
| -------------------- | ----------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| **Bull Call Spread** | (Higher Strike - Lower Strike - Net Debit) × Lot Size | Net Debit                             | Moderately bullish, low IV             |
| **Short Straddle**   | Net Credit                                            | Unlimited                             | Range-bound, high IV → low IV expected |
| **Iron Condor**      | Net Credit                                            | (Wing Spread - Net Credit) × Lot Size | Range-bound, want defined risk         |
| **Long Straddle**    | Unlimited                                             | Net Debit                             | Big move expected, low IV → high IV    |

### Greeks of Common Strategies

| Strategy             | Delta        | Gamma                | Theta              | Vega                    |
| -------------------- | ------------ | -------------------- | ------------------ | ----------------------- |
| **Bull Call Spread** | +0.3 to +0.5 | ±0 (offsetting)      | Slightly -ve       | ±0 (offsetting)         |
| **Short Straddle**   | ~0           | -ve (short gamma)    | +ve (decay earner) | -ve (IV crush benefits) |
| **Long Straddle**    | ~0           | +ve (gamma scalping) | -ve (decay hurts)  | +ve (IV rise benefits)  |
| **Iron Condor**      | ~0           | -ve at wings         | +ve (time decay)   | -ve (IV crush helps)    |

---

## 💡 Practical Applications

### For Traders

**Pre-Earnings Strategy (Nifty @ 18,000):**

1. **Long Straddle:** Buy 18,000 CE + 18,000 PE (2 days before results)
2. **Cost:** ₹200 + ₹180 = ₹380 (₹19,000 per lot)
3. **Breakevens:** 17,620 & 18,380 (±380 points)
4. **Target:** 500+ point move in either direction
5. **Exit:** Before expiry to avoid theta decay

**Range-Bound Income Strategy (Bank Nifty @ 44,000):**

1. **Iron Condor:**
   - Sell 44,500 CE & 43,500 PE (inner wings)
   - Buy 45,000 CE & 43,000 PE (outer wings)
2. **Net Credit:** ₹150 (₹3,750 per lot, 25 lot size)
3. **Max Profit:** ₹3,750 (if BNF closes 43,500-44,500)
4. **Max Loss:** (500 - 150) × 25 = ₹8,750
5. **Probability of Profit:** ~70% (within 1 SD)

### For Investors

**Protective Collar (Own 100 shares of Reliance @ ₹2,500):**

1. **Sell 2,600 Call** → Collect ₹50 premium (caps upside @ ₹2,600)
2. **Buy 2,400 Put** → Pay ₹45 premium (protects downside @ ₹2,400)
3. **Net Cost:** ₹5 per share (₹500 for 100 shares)
4. **Result:** Range-locked to ₹2,400-₹2,600 for minimal cost

### For Platform Implementation

**See [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md#module-06-option-strategies)**

**Strategy Builder Features:**

- Visual payoff diagram generator (P&L vs underlying price)
- Greek aggregation for multi-leg positions
- Margin calculator for spreads (SPAN + Exposure)
- Max Pain calculator (aggregate OI data across strikes)
- PCR ratio tracker (put OI / call OI)
- Auto-rollover alerts (5 days before expiry)
- Position adjustment suggestions (delta hedging, rolling strikes)

**Data Requirements:**

- Option chain (all strikes, both CE/PE)
- OI data (real-time or 5-minute delayed)
- IV percentile/rank (historical volatility data)
- Greeks from Black-Scholes model (delta, gamma, theta, vega)

---

## 📊 Quick Reference

### Max Pain Theory

**Concept:** Options tend to expire where option writers (sellers) incur least payout.

**Calculation:**

```
For each strike:
  Call Payout = Σ (Max(Spot - Strike, 0) × Call OI)
  Put Payout = Σ (Max(Strike - Spot, 0) × Put OI)

Total Pain = Call Payout + Put Payout

Max Pain Strike = Strike with minimum Total Pain
```

**Example (Nifty OI data):**

```
Strike  Call OI  Put OI   Spot=18,100 Pain
17,800   5,000    8,000    17,800: 3,00,000 + 0 = 3,00,000
18,000  10,000    6,000    18,000: 1,00,000 + 0 = 1,00,000 ← MAX PAIN
18,200   3,000    2,000    18,200: 0 + 2,00,000 = 2,00,000
```

**Implication:** Expect Nifty to drift toward 18,000 by expiry (self-fulfilling prophecy debated).

### Put-Call Ratio (PCR)

```
PCR = Total Put OI / Total Call OI

PCR > 1.2 → Bullish (more puts = hedging/fear)
PCR < 0.7 → Bearish (more calls = greed)
PCR = 1.0 → Neutral
```

### Breakeven Formulas

| Strategy             | Breakeven Point(s)                              |
| -------------------- | ----------------------------------------------- |
| **Bull Call Spread** | Lower Strike + Net Debit                        |
| **Bear Put Spread**  | Higher Strike - Net Debit                       |
| **Long Straddle**    | Strike ± Net Debit                              |
| **Long Strangle**    | Call Strike + Net Debit, Put Strike - Net Debit |
| **Iron Condor**      | Short Call - Net Credit, Short Put + Net Credit |

---

## 🛠️ Tools & Resources

- **Opstra:** Advanced strategy builder, Greeks aggregator, payoff charts
- **Sensibull:** Strategy screener, position analyzer, auto-adjustment alerts
- **NSE Option Chain:** Real-time OI data, PCR, IV
- **Zerodha Streak:** Backtest option strategies (limited to single-leg)
- **QuantInsti:** Research papers on strategy optimization
- **CBOE:** VIX methodology (adapt for India VIX)

---

## ⚠️ Common Mistakes

1. **Ignoring bid-ask spreads:** Multi-leg orders suffer 2-4 legs of slippage (use combo orders)
2. **Not using limit orders:** Market orders on illiquid options = disaster
3. **Overleveraging short straddles:** Unlimited risk with high margin (Black Swan events)
4. **Holding till expiry:** Weekly decay accelerates in last 5 days (exit early)
5. **Not adjusting losing positions:** Delta-hedge or roll strikes when breached
6. **Confusing debit vs credit spreads:** Bull call spread ≠ bull put spread in margin/Greeks
7. **Ignoring IV rank:** Selling straddles at low IV = minimal premium, capped profit
8. **Not scaling into positions:** Entire strategy fails if entry timing is wrong (average in)
9. **Forgetting pin risk:** Options expiring near strike = assignment uncertainty
10. **Chasing Max Pain blindly:** Not a guaranteed predictor, just one data point

---

## 🔗 External Resources

- **Zerodha Varsity:** [Option Strategies Module](https://zerodha.com/varsity/module/option-strategies/)
- **TastyTrade:** [Free education on premium selling](https://www.tastytrade.com/definitions)
- **CBOE Strategy Papers:** [Iron Condor, Covered Call studies](https://www.cboe.com/education/)
- **OptionAlpha:** [Podcasts on position management](https://optionalpha.com/)

---

## ✅ Module Completion Checklist

Before moving to next module, ensure you can:

- [ ] Draw payoff diagrams for all 10+ strategies manually
- [ ] Calculate breakeven points for bull call spread, iron condor, straddle
- [ ] Explain when to use credit spread vs debit spread
- [ ] Choose strategy based on IV percentile (high IV → sell, low IV → buy)
- [ ] Calculate Max Pain for a given option chain
- [ ] Interpret PCR ratio and correlate with market sentiment
- [ ] Execute a combo order (4-leg iron condor in single order)
- [ ] Adjust a losing short straddle (roll strikes, add wings, delta hedge)
- [ ] Estimate margin requirement for short straddle vs iron condor
- [ ] Backtest a simple strategy (e.g., monthly short strangle)

---

**Next Module:** [Module 7: Markets and Taxation](../07-markets-taxation/)  
**Previous Module:** [Module 5: Options Theory](../05-options-theory/)

---

**Last Updated:** February 4, 2026
