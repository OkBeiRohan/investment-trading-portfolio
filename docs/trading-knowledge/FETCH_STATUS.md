# Zerodha Varsity Fetch Status - Derivatives Modules

**Date**: 2026-02-04  
**Status**: IN PROGRESS - Rate Limited (Partial Success)

## Current Session Summary

**Fetched**: 2 chapters (Chapter 2, Chapter 4)  
**Status**: ✅ Saved but needs cleaning (CSS/HTML debris)  
**Rate Limit**: Hit after 2 requests - requires 60+ minute wait

## Target Modules

### Module 4: Futures Trading (13 chapters)

- **URL**: https://zerodha.com/varsity/module/futures-trading/
- **Target Location**: `04-futures-trading/`
- **PDF Available**: https://zerodha-common.s3.ap-south-1.amazonaws.com/Varsity/Modules/Module%204_Futures%20Trading.pdf

#### Chapter List:

1. Background – Forwards Market ⏳ (Pending - rate limited)
2. Introducing Futures Contract ✅ (Fetched - needs cleaning)
3. The Futures Trade ⏳ (Pending)
4. Leverage & Payoff ✅ (Fetched - needs cleaning)
5. Margin & M2M ⏳ (Pending)
6. Margin Calculator (Part 1) ⏳ (Pending)
7. Margin Calculator (Part 2) ⏳ (Pending)
8. All about Shorting ⏳ (Pending)
9. The Nifty Futures ⏳ (Pending)
10. The Futures Pricing ⏳ (Pending)
11. Hedging with Futures ⏳ (Pending)
12. Open Interest ⏳ (Pending)
13. Quick Note on Physical Settlement ⏳ (Pending)

### Module 5: Options Theory (25 chapters)

- **URL**: https://zerodha.com/varsity/module/option-theory/
- **Target Location**: `05-options-theory/`
- **Note**: Chapter 3 (Buying a Call Option) already exists - will compare and update if needed

#### Chapter List:

1. Call Option Basics
2. Basic Option Jargons
3. Buying a Call Option (EXISTS - needs comparison)
4. Selling/Writing a Call Option
5. The Put Option Buying
6. The Put Option selling
7. Summarizing Call & Put Options
8. Moneyness of an Option Contract
9. The Option Greeks (Delta) Part 1
10. Delta (Part 2)
11. Delta (Part 3)
12. Gamma (Part 1)
13. Gamma (Part 2)
14. Theta
15. Volatility Basics
16. Volatility Calculation (Historical)
17. Volatility & Normal Distribution
18. Volatility Applications
19. Vega
20. Greek Interactions
21. Greek Calculator
22. Re-introducing Call & Put Options
23. Case studies – wrapping it all up!
24. Quick note on Physical Settlement
25. Options M2M and P&L calculation

### Module 6: Option Strategies (14 chapters)

- **URL**: https://zerodha.com/varsity/module/option-strategies/
- **Target Location**: `06-option-strategies/`

#### Chapter List:

1. Orientation
2. Bull Call Spread
3. Bull Put Spread
4. Call Ratio Back Spread
5. Bear Call Ladder
6. Synthetic Long & Arbitrage
7. Bear Put Spread
8. Bear Call Spread
9. Put Ratio Back spread
10. The Long Straddle
11. The Short Straddle
12. The Long & Short Strangle
13. Max Pain & PCR Ratio
14. Iron Condor

## Rate Limit Issues

**Problem**: Zerodha's website is returning HTTP 429 (Too Many Requests) errors after initial fetches.

**Response Strategy**:

1. Wait 60+ seconds between fetch attempts
2. Fetch one chapter at a time
3. May need to spread fetches over multiple sessions
4. Consider fetching in early morning hours IST (lower traffic)

## Successfully Retrieved Content

From initial batch, successfully fetched:

- Module 4, Chapter 3: The Futures Trade (full content)
- Module 4, Chapter 4: Leverage & Payoff (full content with comments)
- Module 5 index (all 25 chapter links)
- Module 6 index (all 14 chapter links)

## Next Steps

1. Wait for rate limit cooldown (recommend 5-10 minutes)
2. Resume with Module 4, Chapters 1-2
3. Continue through all chapters with 3-5 second delays
4. Create markdown files immediately after successful fetch
5. Retry failed fetches after longer delays

## Estimated Completion

- **Total Chapters**: 52
- **Fetched**: 2 (3.8%)
- **Remaining**: 50
- **Est. Time** (with delays): 4-6 hours minimum
