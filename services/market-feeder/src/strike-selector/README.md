# Strike Selector - Institutional-Grade Option Strike Selection

An institutional-grade option strike selection tool for Nifty 50 options using a **Risk-Adjusted Return on Capital (RAROC)** based utility function.

## Overview

This tool analyzes the Nifty 50 option chain and recommends the optimal strike based on:

- **Your market view** (expected price movement)
- **Available capital** (from Upstox funds API)
- **Greeks** (Delta, Gamma, Theta, Vega, IV)
- **Liquidity** (Open Interest, Volume, Bid-Ask spread)
- **Risk management** (max capital per trade constraint)

## The Utility Equation

The strike selection uses the following **Utility Function** to score each strike:

```
U(S) = [(Δ × M) + (0.5 × Γ × M²) - (θ × H)] / [P × √(IV/100)] × [1 - (Cap/Balance)]
```

Where:

| Symbol      | Description                     |
| ----------- | ------------------------------- |
| **Δ**       | Delta - directional sensitivity |
| **Γ**       | Gamma - acceleration of delta   |
| **θ**       | Theta - time decay per day      |
| **M**       | Expected market move in points  |
| **H**       | Holding period in days          |
| **P**       | Premium (LTP)                   |
| **IV**      | Implied Volatility              |
| **Cap**     | Capital required for position   |
| **Balance** | Available trading balance       |

### Why This Equation Works

1. **Numerator (Projected P&L)**: Calculates profit based on direction (Δ) and acceleration (Γ), while subtracting time decay cost (θ × H).

2. **Denominator (Volatility Risk)**: Penalizes expensive options with high IV (crush risk).

3. **Capital Preservation Factor**: Forces selection of strikes that leave free cash, preventing over-leveraging.

## Quick Start

### 1. Set Environment Variables

```bash
# Required
export STRIKE_SELECTOR_ENABLED=true
export EXPECTED_MOVE=50  # Your expected Nifty move (+ve = bullish, -ve = bearish)

# Optional
export OPTION_TYPE=CE  # CE, PE, or BOTH
export HOLDING_PERIOD_DAYS=1  # 0.25 = 6 hours, 0.5 = 12 hours
export MAX_RISK_PERCENT=0.05  # 5% max capital per trade
```

### 2. Run the Selector

```bash
# Using npm script
pnpm run strike-selector

# Or directly
npx ts-node src/strike-selector/select-strike.ts

# Convenience scripts for common scenarios
pnpm run strike-selector:bullish  # +50 pts, CE only
pnpm run strike-selector:bearish  # -50 pts, PE only
```

## Environment Variables

| Variable                          | Required | Default | Description                       |
| --------------------------------- | -------- | ------- | --------------------------------- |
| `STRIKE_SELECTOR_ENABLED`         | Yes      | `false` | Enable the strike selector        |
| `EXPECTED_MOVE`                   | Yes      | -       | Expected Nifty move in points     |
| `OPTION_TYPE`                     | No       | `BOTH`  | `CE`, `PE`, or `BOTH`             |
| `HOLDING_PERIOD_DAYS`             | No       | `1`     | Days to hold (fractional allowed) |
| `MAX_RISK_PERCENT`                | No       | `0.05`  | Max capital per trade (5%)        |
| `EXPIRY_DATE`                     | No       | nearest | Specific expiry (YYYY-MM-DD)      |
| `MIN_DELTA`                       | No       | `0.05`  | Filter very far OTM               |
| `MAX_DELTA`                       | No       | `0.95`  | Filter very deep ITM              |
| `MIN_OI`                          | No       | `1000`  | Minimum open interest             |
| `TOP_N`                           | No       | `10`    | Number of top strikes to show     |
| `OUTPUT_JSON`                     | No       | `false` | Also output JSON for parsing      |
| `STRIKE_SELECTOR_DEFAULT_BALANCE` | No       | `50000` | Default if funds API fails        |

## Example Output

```
═══════════════════════════════════════════════════════════════
                    🎯 STRIKE RECOMMENDATION
═══════════════════════════════════════════════════════════════

📊 Market Context:
   • Nifty Spot: ₹24,150.50
   • India VIX: 13.25
   • Available Balance: ₹65,000
   • Expiry: 2024-01-25 (3.5 days)

💡 Your View:
   • Expected Move: +50 points
   • Holding Period: 1 day(s)

───────────────────────────────────────────────────────────────

🏆 RECOMMENDED STRIKE: 24200 CE

   Premium (LTP): ₹85.50
   Max Lots: 10 (750 qty)
   Capital Required: ₹64,125
   Utilization: 98.7%

   Greeks:
   • Delta: 0.4521
   • Gamma: 0.000892
   • Theta: ₹-12.35/day
   • Vega: 0.0234
   • IV: 12.45%

   Projections:
   • Delta-Adjusted Move: ₹22.61
   • Gamma Bonus: ₹1.12
   • Theta Cost: ₹12.35
   • Projected P&L: ₹8,535.00

   📈 Utility Score: 0.4521

───────────────────────────────────────────────────────────────

📋 Top 5 Alternatives:
   2. 24250 CE - ₹62.00 (Score: 0.3892, 13 lots)
   3. 24150 CE - ₹115.00 (Score: 0.3654, 7 lots)
   4. 24300 CE - ₹45.50 (Score: 0.3201, 18 lots)
   5. 24100 CE - ₹148.00 (Score: 0.2987, 5 lots)

═══════════════════════════════════════════════════════════════
```

## Use Cases

### 1. Intraday Bullish Trade

```bash
STRIKE_SELECTOR_ENABLED=true \
EXPECTED_MOVE=30 \
HOLDING_PERIOD_DAYS=0.25 \
OPTION_TYPE=CE \
pnpm run strike-selector
```

### 2. Swing Bearish Trade

```bash
STRIKE_SELECTOR_ENABLED=true \
EXPECTED_MOVE=-100 \
HOLDING_PERIOD_DAYS=3 \
OPTION_TYPE=PE \
pnpm run strike-selector
```

### 3. Conservative Trade (Lower Capital Risk)

```bash
STRIKE_SELECTOR_ENABLED=true \
EXPECTED_MOVE=50 \
MAX_RISK_PERCENT=0.02 \
pnpm run strike-selector
```

### 4. Specific Expiry

```bash
STRIKE_SELECTOR_ENABLED=true \
EXPECTED_MOVE=50 \
EXPIRY_DATE=2024-02-29 \
pnpm run strike-selector
```

## API Usage

You can also use the `StrikeSelectorService` programmatically:

```typescript
import { StrikeSelectorService } from './strike-selector';

const service = app.get(StrikeSelectorService);

const result = await service.selectOptimalStrike({
  expectedMove: 50, // +50 points bullish
  holdingPeriodDays: 1, // 1 day
  optionType: 'CE', // Calls only
  maxRiskPercent: 0.05, // 5% max capital
});

console.log(result.recommended); // Best strike
console.log(result.allStrikes); // Top N ranked strikes
```

## Filters Applied

The tool applies the following institutional-grade filters:

1. **Capital Constraint**: `Capital Required ≤ Balance × Max Risk %`
2. **Delta Range**: Filters very far OTM and deep ITM options
3. **Liquidity**: Minimum OI and volume thresholds
4. **Bid-Ask Spread**: Filters illiquid options with wide spreads
5. **Directional Alignment**: Penalizes wrong-direction trades (buying CE for bearish view)

## Architecture

```
select-strike.ts (CLI)
    ↓
StrikeSelectorService
    ↓
┌────────────────────────────────────────┐
│  Fetch Market Context (parallel)       │
│  ├─ getMarketQuoteWithDepth (Nifty/VIX)│
│  ├─ getOptionChain (strikes + greeks)  │
│  └─ getFundsAndMargin (balance)        │
└────────────────────────────────────────┘
    ↓
Analyze Strikes (apply utility function)
    ↓
Apply Filters (risk management)
    ↓
Rank & Return Top N
```

## Constants

- **Nifty 50 Lot Size**: 75 (updated from 50)
- **Nifty 50 Index Key**: `NSE_INDEX|Nifty 50`
- **India VIX Key**: `NSE_INDEX|India VIX`

## Notes

- The funds API is unavailable between 12:00 AM to 5:30 AM IST
- Greeks are provided by Upstox API (not calculated)
- IV is per-strike (not ATM IV)
- Theta is per-day (absolute value used in calculations)
