# Chapter 03: Buying a Call Option

> **Understanding call option buyer's perspective, P&L calculation, and risk/reward profile**

**Module:** Options Theory for Professional Trading  
**Chapter:** 03 of 25  
**Source:** https://zerodha.com/varsity/chapter/buying-a-call-option/  
**Difficulty:** Beginner  
**Reading Time:** 15 minutes

---

## 📖 Overview

A call option buyer has the **right (but not obligation)** to buy the underlying asset at the strike price before expiry. This chapter explains the mechanics, P&L calculation, breakeven point, and when to use this strategy.

---

## 🎯 Learning Objectives

After this chapter, you will:

- ✅ Understand call buyer's rights and obligations
- ✅ Calculate call option P&L at different spot prices
- ✅ Determine breakeven point
- ✅ Identify when buying calls is profitable
- ✅ Grasp the risk/reward profile

---

## 📊 Call Option Buyer Profile

### Position Characteristics

| Attribute       | Value                                   |
| --------------- | --------------------------------------- |
| **Market View** | Bullish (expecting price to rise)       |
| **Premium**     | Paid upfront (debit)                    |
| **Max Profit**  | Unlimited (as spot rises)               |
| **Max Loss**    | Limited to premium paid                 |
| **Breakeven**   | Strike + Premium                        |
| **Time Decay**  | Works against buyer (loses value daily) |

---

## 💰 Profit & Loss Calculation

### Formula

```
P&L at Expiry = Max(0, Spot - Strike) - Premium Paid

Where:
- Spot = Underlying price at expiry
- Strike = Strike price of call option
- Premium Paid = Cost of buying the option
```

### Scenarios

#### Scenario 1: Spot > Strike + Premium (IN-THE-MONEY, Profitable)

**Example:**

- Strike: 17500
- Premium Paid: 150
- Spot at Expiry: 18000

```
Intrinsic Value = 18000 - 17500 = 500
P&L = 500 - 150 = +350 per share
```

✅ **Profit:** ₹350 per share (233% return on premium)

---

#### Scenario 2: Spot = Strike + Premium (AT BREAKEVEN)

**Example:**

- Strike: 17500
- Premium Paid: 150
- Spot at Expiry: 17650

```
Intrinsic Value = 17650 - 17500 = 150
P&L = 150 - 150 = 0
```

⚖️ **No Profit, No Loss**

---

#### Scenario 3: Strike < Spot < Strike + Premium (IN-THE-MONEY, Loss)

**Example:**

- Strike: 17500
- Premium Paid: 150
- Spot at Expiry: 17600

```
Intrinsic Value = 17600 - 17500 = 100
P&L = 100 - 150 = -50 per share
```

❌ **Loss:** ₹50 per share (33% loss, but limited)

---

#### Scenario 4: Spot ≤ Strike (OUT-OF-THE-MONEY, Max Loss)

**Example:**

- Strike: 17500
- Premium Paid: 150
- Spot at Expiry: 17400

```
Intrinsic Value = Max(0, 17400 - 17500) = 0
P&L = 0 - 150 = -150 per share
```

❌ **Max Loss:** ₹150 per share (100% loss of premium)

---

## 📉 Payoff Diagram

```
P&L
 |
 |         /
 |        /
 |       /
 |      /  ← Unlimited Profit
 |     /
 |    /
 |   /
 |  /
 | /_______________________ Spot Price
 |/  ↑
-150 (Max Loss)
     Strike (17500)
```

**Key Points:**

- **Below Strike:** Flat loss of ₹150 (premium)
- **At Strike:** Loss starts reducing
- **Above Strike + Premium:** Starts making profit
- **Slope:** 1:1 (every ₹1 rise in spot = ₹1 profit)

---

## 🧮 Worked Example

**Real Trade (Nifty 50):**

| Parameter            | Value                   |
| -------------------- | ----------------------- |
| **Date of Purchase** | 20-Jan-2026             |
| **Nifty Spot**       | 17500                   |
| **Strike Selected**  | 17500 CE (At-The-Money) |
| **Premium Paid**     | ₹150 per share          |
| **Lot Size**         | 50                      |
| **Total Investment** | 150 × 50 = ₹7,500       |
| **Expiry Date**      | 30-Jan-2026 (10 days)   |

### Outcome Analysis

#### Case A: Nifty at 18000 on Expiry

```
Intrinsic Value = 18000 - 17500 = 500
Profit per share = 500 - 150 = 350
Total Profit = 350 × 50 = ₹17,500
Return = 17500 / 7500 = 233%
```

**Result:** 🚀 **₹17,500 profit (233% return in 10 days)**

---

#### Case B: Nifty at 17650 on Expiry (Breakeven)

```
Intrinsic Value = 17650 - 17500 = 150
Profit per share = 150 - 150 = 0
Total Profit = 0
```

**Result:** ⚖️ **No profit, no loss**

---

#### Case C: Nifty at 17400 on Expiry (Below Strike)

```
Intrinsic Value = 0 (option expires worthless)
Loss per share = 0 - 150 = -150
Total Loss = -150 × 50 = -₹7,500
Return = -100%
```

**Result:** ❌ **₹7,500 loss (100% capital gone, but limited to premium)**

---

## ⏰ Time Decay Impact (Theta)

**Important:** Call buyers are fighting against **time decay (theta)**.

| Days to Expiry | Premium Value (Approx) | Theta Impact              |
| -------------- | ---------------------- | ------------------------- |
| 10 days        | ₹150                   | Baseline                  |
| 5 days         | ₹120                   | -₹30 (20% decay)          |
| 2 days         | ₹80                    | -₹70 (47% decay)          |
| 1 day          | ₹40                    | -₹110 (73% decay)         |
| Expiry         | ₹0 or Intrinsic        | -₹150 (100% decay if OTM) |

**Key Insight:** Even if Nifty stays flat at 17500, your option loses value daily due to theta.

---

## ✅ When to Buy Call Options

### Ideal Conditions

1. **Strong Bullish View**
   - Expecting sharp upward move (>2-3%)
   - Event-driven (Budget, RBI policy, election results)

2. **Short Time Horizon**
   - Trade to be completed within days/weeks
   - Don't hold options till expiry (theta decay accelerates)

3. **Low Implied Volatility (IV)**
   - Buy when IV is low (options cheaper)
   - Benefit from IV expansion (volatility increases → premium rises)

4. **Defined Risk**
   - Max loss = premium paid (no margin calls)
   - Suitable for risk-averse traders

5. **Limited Capital**
   - Can control large position with small capital
   - Leverage: ₹7,500 premium controls ₹8.75L worth of Nifty

---

## ❌ When NOT to Buy Call Options

1. **Sideways Market**
   - If expecting consolidation, sell options instead (collect theta)

2. **High IV Environment**
   - Expensive premiums (post-event, high VIX)
   - Better to sell premium

3. **Long-Term View**
   - Options expire, stocks don't
   - For 6-month+ view, buy futures or stocks

4. **Near Expiry (Last 3-5 Days)**
   - Theta decay extremely fast
   - Gamma risk (sharp delta changes)

---

## 🎯 Strike Selection Guide

| Strike Type             | When to Use                    | Risk/Reward                      | Example (Nifty at 17500)  |
| ----------------------- | ------------------------------ | -------------------------------- | ------------------------- |
| **Deep ITM** (17300 CE) | Conservative, high delta       | Low risk, low reward             | Delta: 0.8, Premium: ₹300 |
| **ATM** (17500 CE)      | Balanced, 50% probability      | Medium risk, medium reward       | Delta: 0.5, Premium: ₹150 |
| **OTM** (17700 CE)      | Aggressive, low delta          | High risk, high reward           | Delta: 0.3, Premium: ₹50  |
| **Deep OTM** (18000 CE) | Lottery ticket, very low delta | Very high risk, very high reward | Delta: 0.1, Premium: ₹10  |

**Rule of Thumb:**

- **Directional Trade:** ATM or slightly OTM (17500-17600 CE)
- **Safe Trade:** ITM (17300-17400 CE)
- **Speculation:** Deep OTM (17800+ CE)

---

## 💡 Pro Tips

### 1. Calculate Breakeven Before Entry

```
Breakeven = Strike + Premium
If Nifty must reach 17650 for profit, is that realistic in 10 days?
Historical avg move = 1.5% (263 points) → Realistic ✅
```

### 2. Exit Before Expiry (Don't Hold Till Last Day)

```
Exit when:
- Target achieved (e.g., 50% profit)
- Stop-loss hit (e.g., 30% loss)
- 2-3 days before expiry (avoid gamma risk)
```

### 3. Use Stop-Loss

```
Buy call at ₹150
Set stop-loss at ₹100 (33% loss acceptable)
If spot drops, exit at ₹100 (don't wait for ₹0)
```

### 4. Monitor Implied Volatility

```
Buy call when India VIX is low (<15)
Exit when VIX spikes (>25) → IV crush risk
```

---

## 🧩 Comparison: Call Buyer vs Call Seller

| Aspect          | Call Buyer             | Call Seller                  |
| --------------- | ---------------------- | ---------------------------- |
| **View**        | Bullish                | Bearish/Neutral              |
| **Premium**     | Pays (debit)           | Receives (credit)            |
| **Max Profit**  | Unlimited              | Premium received             |
| **Max Loss**    | Premium paid           | Unlimited                    |
| **Theta**       | Negative (hurts)       | Positive (helps)             |
| **Volatility**  | Wants increase         | Wants decrease               |
| **Probability** | Lower (needs big move) | Higher (benefits from decay) |

---

## 📚 Key Takeaways

1. ✅ **Call buyer benefits from:** Sharp upward moves, low time to expiry initially, IV expansion
2. ❌ **Call buyer loses from:** Sideways markets, time decay (theta), IV crush
3. 🎯 **Max profit:** Unlimited (as spot rises above strike)
4. 🛡️ **Max loss:** Limited to premium paid (no margin calls)
5. ⚖️ **Breakeven:** Strike + Premium
6. ⏰ **Urgency:** Close position before expiry (last 3-5 days risky)
7. 📊 **Strike selection:** ATM for balanced trade, OTM for aggressive
8. 💰 **Capital efficiency:** Small premium controls large notional

---

## ❓ Quiz (Self-Assessment)

1. You buy Nifty 17500 CE at ₹150. Nifty closes at 17800 on expiry. What is your P&L?
   <details>
   <summary>Answer</summary>
   Intrinsic Value = 17800 - 17500 = 300  
   P&L = 300 - 150 = +150 per share (100% profit)
   </details>

2. What is the breakeven point if you buy 18000 CE at ₹50?
   <details>
   <summary>Answer</summary>
   Breakeven = Strike + Premium = 18000 + 50 = 18050
   </details>

3. Nifty is at 17500. You expect it to rally to 18000 in 1 month. Should you buy 17500 CE or 18000 CE?
   <details>
   <summary>Answer</summary>
   **17500 CE (ATM)** is better:  
   - Higher delta (0.5 vs 0.1) → More sensitive to spot move  
   - More likely to be ITM  
   18000 CE is too far OTM (500 points away) → Low probability
   </details>

---

## 🔗 Related Chapters

- **Previous:** [Chapter 02 - Basic Option Jargons](./02-basic-option-jargons.md)
- **Next:** [Chapter 04 - Selling/Writing a Call Option](./04-selling-call-option.md)
- **Related:** [Chapter 05 - Buying a Put Option](./05-put-option-buying.md)
- **Module:** [Options Theory for Professional Trading](./README.md)

---

## 📖 Further Reading

- **Zerodha Varsity (Original):** https://zerodha.com/varsity/chapter/buying-a-call-option/
- **NSE Options Guide:** https://www.nseindia.com/products-services/equity-derivatives-options
- **Sensibull Academy:** https://sensibull.com/academy/call-option-buying

---

**Last Updated:** February 4, 2026  
**Next:** [Selling/Writing a Call Option →](./04-selling-call-option.md)
