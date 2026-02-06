# Module 4: Futures Trading

> **Master leveraged trading with futures contracts - understand margin, M2M, hedging, and index futures**

**Source:** [Zerodha Varsity - Futures Trading](https://zerodha.com/varsity/module/futures-trading/)  
**Chapters:** 13  
**Difficulty:** Intermediate  
**Prerequisites:** Module 1 (Introduction to Stock Markets), Module 2 (Technical Analysis)

---

## 📖 Overview

Futures contracts are derivative instruments that allow traders to take leveraged positions on stocks, indices, commodities, and currencies with a fraction of the capital required for cash market trading. This module demystifies futures trading by explaining margin requirements, mark-to-market (M2M) settlement, pricing theory, and practical hedging strategies.

You'll learn how futures markets evolved from forward contracts, understand the mechanics of daily settlement, calculate leverage and payoff, and use futures for both speculation and risk management. The module covers stock futures, index futures (Nifty/Bank Nifty), and introduces the concept of open interest as a sentiment indicator.

Critical topics include shorting (selling first, buying later), margin calculations (SPAN + Exposure), basis risk, and physical settlement. By the end, you'll be equipped to trade futures responsibly with proper position sizing and risk controls.

---

## 📚 Chapters

| #   | Chapter                                                                        | Topics Covered                                        | Link                                                                              |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 01  | [Background – Forwards Market](./01-background-forwards-market.md)             | Evolution from forwards to futures, standardization   | [Varsity](https://zerodha.com/varsity/chapter/background-forwards-market/)        |
| 02  | [Introducing Futures Contract](./02-introducing-futures-contract.md)           | Contract specs, expiry, lot size, tick size           | [Varsity](https://zerodha.com/varsity/chapter/introducing-futures-contract/)      |
| 03  | [The Futures Trade](./03-futures-trade.md)                                     | Long vs short, order placement, settlement            | [Varsity](https://zerodha.com/varsity/chapter/futures-trade/)                     |
| 04  | [Leverage & Payoff](./04-leverage-payoff.md)                                   | Margin advantage, P&L calculation, leverage risks     | [Varsity](https://zerodha.com/varsity/chapter/leverage-payoff/)                   |
| 05  | [Margin & M2M](./05-margin-m2m.md)                                             | SPAN margin, exposure margin, daily settlement        | [Varsity](https://zerodha.com/varsity/chapter/margin-m2m/)                        |
| 06  | [Margin Calculator (Part 1)](./06-margin-calculator-part-1.md)                 | Understanding SPAN calculation, VaR                   | [Varsity](https://zerodha.com/varsity/chapter/margin-calculator-part-1/)          |
| 07  | [Margin Calculator (Part 2)](./07-margin-calculator-part-2.md)                 | Portfolio margin, cross-margining benefits            | [Varsity](https://zerodha.com/varsity/chapter/margin-calculator-part-2/)          |
| 08  | [All about Shorting](./08-shorting.md)                                         | Mechanics of short selling, borrowing stocks, risks   | [Varsity](https://zerodha.com/varsity/chapter/shorting/)                          |
| 09  | [The Nifty Futures](./09-nifty-futures.md)                                     | Index futures, market exposure, beta-weighted hedging | [Varsity](https://zerodha.com/varsity/chapter/nifty-futures/)                     |
| 10  | [The Futures Pricing](./10-futures-pricing.md)                                 | Spot-futures relationship, cost of carry, arbitrage   | [Varsity](https://zerodha.com/varsity/chapter/futures-pricing/)                   |
| 11  | [Hedging with Futures](./11-hedging-futures.md)                                | Portfolio protection, basis risk, calendar spreads    | [Varsity](https://zerodha.com/varsity/chapter/hedging-futures/)                   |
| 12  | [Open Interest](./12-open-interest.md)                                         | OI vs volume, sentiment analysis, buildup patterns    | [Varsity](https://zerodha.com/varsity/chapter/open-interest/)                     |
| 13  | [Quick Note on Physical Settlement](./13-quick-note-on-physical-settlement.md) | Compulsory delivery, auction process, penalties       | [Varsity](https://zerodha.com/varsity/chapter/quick-note-on-physical-settlement/) |

---

## 🎯 Learning Outcomes

After completing this module, you will:

- ✅ **Understand futures mechanics:** Contract specifications, margin, M2M, expiry
- ✅ **Calculate leverage:** Know exactly how much capital you control with margins
- ✅ **Execute both long and short trades** seamlessly
- ✅ **Price futures theoretically:** Use cost of carry model to identify arbitrage
- ✅ **Hedge portfolios:** Protect equity holdings using index futures
- ✅ **Interpret open interest:** Gauge market sentiment and build-up patterns
- ✅ **Avoid physical settlement:** Rollover strategies and compulsory delivery
- ✅ **Use margin calculators:** Estimate capital requirements before trading

---

## 🔑 Key Concepts

### Futures Contract Specifications (Nifty 50 Example)

| Parameter           | Value                                     |
| ------------------- | ----------------------------------------- |
| **Underlying**      | Nifty 50 Index                            |
| **Lot Size**        | 50 units                                  |
| **Tick Size**       | ₹0.05 (₹2.50 per lot)                     |
| **Expiry**          | Last Thursday of month                    |
| **Settlement**      | Cash-settled (index), Physical (stocks)   |
| **Trading Hours**   | 9:15 AM - 3:30 PM                         |
| **Contract Months** | Current + 2 next months + quarterly cycle |

### Margin Requirements

```
Total Margin = SPAN Margin + Exposure Margin

SPAN Margin: Risk-based (VaR model, ~10-15% for indices)
Exposure Margin: Additional buffer (~3-5%)

Example (Nifty @ 18,000):
Contract Value = 18,000 × 50 = ₹9,00,000
SPAN Margin ≈ ₹90,000 (10%)
Exposure Margin ≈ ₹27,000 (3%)
Total Required ≈ ₹1,17,000 (13%)

Leverage = 9,00,000 / 1,17,000 ≈ 7.7x
```

### Mark-to-Market (M2M) Settlement

**Daily Settlement Example:**

- Day 1: Buy 1 lot Nifty Futures @ 18,000 (Margin: ₹1,17,000)
- Day 1 Close: 18,100 → Profit = (18,100 - 18,000) × 50 = **₹5,000 credited**
- Day 2 Close: 17,950 → Loss = (17,950 - 18,100) × 50 = **₹7,500 debited**
- Day 3: Square off @ 18,050 → Profit = (18,050 - 17,950) × 50 = **₹5,000 credited**

**Net P&L = (18,050 - 18,000) × 50 = ₹2,500**

### Futures Pricing Formula

```
Futures Price = Spot Price × e^(r × t)

Where:
r = Risk-free rate (e.g., 6% per annum)
t = Time to expiry (in years)

Example (Nifty @ 18,000, 30 days to expiry):
Fair Value = 18,000 × e^(0.06 × 30/365)
           = 18,000 × 1.00493
           = 18,089

If trading @ 18,150 → **Overpriced (Premium = 61 points)**
If trading @ 18,000 → **Underpriced (Discount = 89 points)**
```

---

## 💡 Practical Applications

### For Traders

- **Intraday leverage:** Control ₹9L position with ₹1.17L margin (7.7x leverage)
- **Overnight shorting:** Hold short positions without borrowing stocks
- **Pair trading:** Long stock A futures, short stock B futures (sector neutral)
- **Arbitrage:** Buy spot, sell futures if premium >cost of carry

### For Investors

- **Portfolio hedging:** Short Nifty futures to protect equity portfolio during volatility
- **Synthetic long:** Replicate stock ownership without full capital (futures + FD)
- **Calendar spreads:** Sell near-month, buy far-month to profit from time decay

### For Platform Implementation

**See [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md#module-04-futures-trading)**

**Algo-Worker Integration:**

- Real-time futures pricing with fair value calculation
- Margin requirement estimator (SPAN + Exposure APIs)
- Open interest analysis for sentiment gauges
- Automatic rollover alerts 5 days before expiry
- Physical settlement warnings for stock futures

**Required Data Feeds:**

- Live futures prices (NSE FO segment)
- OI data (tick-by-tick or 1-minute aggregates)
- Margin files from NSE (daily SPAN parameters)
- Expiry calendar with rollover dates

---

## 📊 Quick Reference

### Open Interest (OI) Interpretation

| Price | OI  | Interpretation               |
| ----- | --- | ---------------------------- |
| ↑     | ↑   | **Long Build-up** (Bullish)  |
| ↓     | ↑   | **Short Build-up** (Bearish) |
| ↑     | ↓   | **Short Covering** (Bullish) |
| ↓     | ↓   | **Long Unwinding** (Bearish) |

### Leverage Comparison

| Instrument               | Typical Leverage | Risk Level |
| ------------------------ | ---------------- | ---------- |
| **Cash Equity**          | 1x (no leverage) | Low        |
| **Margin Trading (MIS)** | 3-5x             | Medium     |
| **Futures**              | 7-10x            | High       |
| **Options Selling**      | 10-15x+          | Very High  |

### Rollover Strategy (Avoiding Physical Settlement)

**T-5 Days:** Check open positions in stock futures
**T-2 Days:** Square off expiring contracts (exit penalty-free)
**T-2 Days:** Enter new month contract (rollover cost = spread)
**Expiry Day:** Only intraday trades (auto-square off @ 3:20 PM)

---

## 🛠️ Tools & Resources

- **NSE Margin Calculator:** [nseindia.com/margins](https://www.nseindia.com/margins)
- **Zerodha Margin Calculator:** Calculate SPAN + Exposure for any strategy
- **Opstra:** Futures chain analysis, historical OI data
- **NSE Bhavcopy:** Daily settlement prices, OI data
- **TradingView:** Futures charts with OI overlays
- **Sensibull:** Futures vs spot comparison charts

---

## ⚠️ Common Mistakes

1. **Overleveraging:** Using full margin power (7x) on every trade (one bad move = margin call)
2. **Ignoring M2M:** Thinking you only pay on exit (daily settlement drains cash)
3. **Holding till expiry:** Physical settlement risks for stock futures (penalty + auction)
4. **Not knowing lot size:** 1 lot Nifty = 50 units (₹5,000 move with 100-point change)
5. **Confusing OI with volume:** OI = outstanding contracts, Volume = daily trades
6. **Buying expensive futures:** Not checking if premium >cost of carry (arbitrage against you)
7. **No stop-loss:** Leverage amplifies both gains and losses (10% loss = 70% of margin)
8. **Trading illiquid contracts:** Wide bid-ask spreads in far-month/stock futures
9. **Forgetting expiry dates:** Missing rollover window (forced physical settlement)
10. **Not understanding basis risk:** Hedge (Nifty futures) may not perfectly correlate with portfolio

---

## 🔗 External Resources

- **Zerodha Varsity:** [Futures Trading Module](https://zerodha.com/varsity/module/futures-trading/)
- **NSE F&O Resources:** [Contract specifications, margin files](https://www.nseindia.com/products-services/equity-derivatives)
- **SEBI Guidelines:** [Physical settlement circular](https://www.sebi.gov.in/)
- **Investopedia:** [Futures vs Forwards](https://www.investopedia.com/articles/active-trading/090115/futures-vs-forwards.asp)

---

## ✅ Module Completion Checklist

Before moving to next module, ensure you can:

- [ ] Explain the difference between futures and forwards
- [ ] Calculate margin required for 1 lot Nifty futures
- [ ] Compute daily M2M P&L for a futures position
- [ ] Determine fair value of a futures contract using cost of carry
- [ ] Interpret OI data to gauge market sentiment (long/short build-up)
- [ ] Execute both long and short futures trades on a platform
- [ ] Plan a rollover strategy to avoid physical settlement
- [ ] Use futures to hedge a ₹10L equity portfolio
- [ ] Identify when futures are overpriced/underpriced vs spot
- [ ] Understand the impact of 10x leverage on risk

---

**Next Module:** [Module 5: Options Theory](../05-options-theory/)  
**Previous Module:** [Module 3: Fundamental Analysis](../03-fundamental-analysis/)

---

**Last Updated:** February 4, 2026
