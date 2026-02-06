/**
 * Strike Selector Service
 * Institutional-grade option strike selection using RAROC-based utility function
 *
 * The utility equation:
 * U(S) = [(Δ × M_view + 0.5 × Γ × M_view²) - (θ × H)] / [P × √(IV/100)] × [1 - (P × L × 65) / B_total]
 *
 * Where:
 * - Δ (Delta): Directional sensitivity
 * - Γ (Gamma): Acceleration of delta
 * - θ (Theta): Time decay per day
 * - M_view: Expected market move in points
 * - H: Holding period in days
 * - P: Premium (LTP)
 * - IV: Implied Volatility
 * - L: Number of lots
 * - B_total: Total available balance
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  UpstoxClient,
  OptionChainItem,
} from '../historical-data/upstox-client';
import {
  StrikeSelectorConfig,
  MarketContext,
  StrikeAnalysis,
  StrikeSelectorResult,
  DualDirectionAnalysis,
  NIFTY50_LOT_SIZE,
  DEFAULT_CONFIG,
  NIFTY50_INDEX_KEY,
  INDIA_VIX_KEY,
} from './strike-selector.types';
import {
  USE_FALLBACK_DATA,
  OPTION_CHAIN_FALLBACK,
  MARKET_QUOTE_FALLBACK,
  FUNDS_MARGIN_FALLBACK,
} from './fallback';

@Injectable()
export class StrikeSelectorService {
  private readonly logger = new Logger(StrikeSelectorService.name);

  constructor(private readonly upstoxClient: UpstoxClient) {}

  /**
   * Main entry point: Analyze option chain and return ranked strikes
   */
  async selectOptimalStrike(
    config: Partial<StrikeSelectorConfig>,
    expiryDate?: string,
  ): Promise<StrikeSelectorResult> {
    const startTime = Date.now();

    // Merge with defaults
    const fullConfig: StrikeSelectorConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    } as StrikeSelectorConfig;

    this.logger.log(
      `Starting strike analysis - Expected move: ${fullConfig.expectedMove > 0 ? '+' : ''}${fullConfig.expectedMove} pts, ` +
        `Type: ${fullConfig.optionType}, Holding: ${fullConfig.holdingPeriodDays}d`,
    );

    // Fetch all required market data in parallel
    const marketContext = await this.fetchMarketContext(expiryDate);

    this.logger.log(
      `Market context - Spot: ₹${marketContext.spotPrice.toFixed(2)}, VIX: ${marketContext.vix.toFixed(2)}, ` +
        `Balance: ₹${marketContext.availableBalance.toLocaleString()}, Strikes: ${marketContext.optionChain.length}`,
    );

    // Analyze all strikes
    const allAnalyses = this.analyzeStrikes(marketContext, fullConfig);

    // Separate passed and filtered strikes
    const passedStrikes = allAnalyses.filter((s) => !s.filterReason);
    const filteredStrikes = allAnalyses.filter((s) => s.filterReason);

    // Sort by utility score descending
    passedStrikes.sort((a, b) => b.utilityScore - a.utilityScore);

    // Assign ranks
    passedStrikes.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    // Take top N
    const topStrikes = passedStrikes.slice(0, fullConfig.topN || 10);

    // Calculate stats
    const stats = {
      totalStrikesAnalyzed: allAnalyses.length,
      strikesPassedFilter: passedStrikes.length,
      avgUtilityScore:
        passedStrikes.length > 0
          ? passedStrikes.reduce((sum, s) => sum + s.utilityScore, 0) /
            passedStrikes.length
          : 0,
      maxUtilityScore:
        passedStrikes.length > 0 ? passedStrikes[0].utilityScore : 0,
      avgIV:
        passedStrikes.length > 0
          ? passedStrikes.reduce((sum, s) => sum + s.iv, 0) /
            passedStrikes.length
          : 0,
      maxLotsPossible:
        passedStrikes.length > 0
          ? Math.max(...passedStrikes.map((s) => s.maxLots))
          : 0,
    };

    const daysToExpiry = this.calculateDaysToExpiry(marketContext.expiryDate);

    const result: StrikeSelectorResult = {
      timestamp: new Date(),
      context: {
        spotPrice: marketContext.spotPrice,
        vix: marketContext.vix,
        availableBalance: marketContext.availableBalance,
        expiryDate: marketContext.expiryDate,
        daysToExpiry,
      },
      config: fullConfig,
      recommended: topStrikes.length > 0 ? topStrikes[0] : null,
      allStrikes: topStrikes,
      filteredStrikes: filteredStrikes.slice(0, 20), // Limit filtered for output
      stats,
    };

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Analysis complete in ${elapsed}ms - Best strike: ${result.recommended?.strikePrice || 'None'} ${result.recommended?.optionType || ''}`,
    );

    return result;
  }

  /**
   * Analyze both bullish and bearish scenarios
   * Shows top 3 CE and PE strikes for each direction
   */
  async analyzeDualDirection(
    expectedMove: number,
    holdingPeriodDays: number = 1,
    expiryDate?: string,
  ): Promise<DualDirectionAnalysis> {
    const startTime = Date.now();

    this.logger.log(
      `Starting dual-direction analysis - Move: ±${expectedMove} pts, Holding: ${holdingPeriodDays}d`,
    );

    // Fetch market context
    const marketContext = await this.fetchMarketContext(expiryDate);
    const daysToExpiry = this.calculateDaysToExpiry(marketContext.expiryDate);

    // Base config for analysis
    const baseConfig: StrikeSelectorConfig = {
      ...DEFAULT_CONFIG,
      holdingPeriodDays,
      optionType: 'BOTH',
      maxRiskPercent: 1, // Allow all strikes for comparison
    } as StrikeSelectorConfig;

    // Analyze for BULLISH scenario (+expectedMove)
    const bullishConfig = {
      ...baseConfig,
      expectedMove: Math.abs(expectedMove),
    };
    const bullishAnalyses = this.analyzeStrikes(marketContext, bullishConfig);

    // Analyze for BEARISH scenario (-expectedMove)
    const bearishConfig = {
      ...baseConfig,
      expectedMove: -Math.abs(expectedMove),
    };
    const bearishAnalyses = this.analyzeStrikes(marketContext, bearishConfig);

    // Filter valid strikes
    const validBullishCalls = bullishAnalyses.filter(
      (s) => s.optionType === 'CE' && !s.filterReason && s.maxLots > 0,
    );
    const validBullishPuts = bullishAnalyses.filter(
      (s) => s.optionType === 'PE' && !s.filterReason && s.maxLots > 0,
    );
    const validBearishPuts = bearishAnalyses.filter(
      (s) => s.optionType === 'PE' && !s.filterReason && s.maxLots > 0,
    );
    const validBearishCalls = bearishAnalyses.filter(
      (s) => s.optionType === 'CE' && !s.filterReason && s.maxLots > 0,
    );

    // ═══════════════════════════════════════════════════════════════
    // RANKING 1: By RAROC Utility Score (risk-adjusted, OTM-friendly)
    // ═══════════════════════════════════════════════════════════════
    const bullishCalls = [...validBullishCalls]
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .slice(0, 3);

    const bullishPuts = [...validBullishPuts]
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .slice(0, 3);

    const bearishPuts = [...validBearishPuts]
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .slice(0, 3);

    const bearishCalls = [...validBearishCalls]
      .sort((a, b) => b.utilityScore - a.utilityScore)
      .slice(0, 3);

    // ═══════════════════════════════════════════════════════════════
    // RANKING 2: By TOTAL Profit (considering max lots you can afford)
    // A cheaper OTM with 3 lots may beat expensive ATM with 1 lot
    // ═══════════════════════════════════════════════════════════════
    const highestProfitBullishCalls = [...validBullishCalls]
      .sort(
        (a, b) => (b.predictedTotalProfit || 0) - (a.predictedTotalProfit || 0),
      )
      .slice(0, 3);

    const highestProfitBearishPuts = [...validBearishPuts]
      .sort(
        (a, b) => (b.predictedTotalProfit || 0) - (a.predictedTotalProfit || 0),
      )
      .slice(0, 3);

    // Assign ranks for utility-ranked
    bullishCalls.forEach((s, i) => (s.rank = i + 1));
    bullishPuts.forEach((s, i) => (s.rank = i + 1));
    bearishPuts.forEach((s, i) => (s.rank = i + 1));
    bearishCalls.forEach((s, i) => (s.rank = i + 1));

    // Assign ranks for profit-ranked
    highestProfitBullishCalls.forEach((s, i) => (s.rank = i + 1));
    highestProfitBearishPuts.forEach((s, i) => (s.rank = i + 1));

    // Calculate stats
    const allCalls = bullishAnalyses.filter((s) => s.optionType === 'CE');
    const allPuts = bullishAnalyses.filter((s) => s.optionType === 'PE');

    const result: DualDirectionAnalysis = {
      timestamp: new Date(),
      context: {
        spotPrice: marketContext.spotPrice,
        vix: marketContext.vix,
        availableBalance: marketContext.availableBalance,
        expiryDate: marketContext.expiryDate,
        daysToExpiry,
      },
      expectedMove: Math.abs(expectedMove),
      holdingPeriodDays,
      bullishScenario: {
        direction: 'BULLISH',
        expectedSpot: marketContext.spotPrice + Math.abs(expectedMove),
        topCalls: bullishCalls,
        highestProfitCalls: highestProfitBullishCalls,
        topPuts: bullishPuts,
      },
      bearishScenario: {
        direction: 'BEARISH',
        expectedSpot: marketContext.spotPrice - Math.abs(expectedMove),
        topPuts: bearishPuts,
        highestProfitPuts: highestProfitBearishPuts,
        topCalls: bearishCalls,
      },
      stats: {
        totalStrikesAnalyzed: bullishAnalyses.length,
        callsAnalyzed: allCalls.length,
        putsAnalyzed: allPuts.length,
        avgCallIV:
          allCalls.length > 0
            ? allCalls.reduce((sum, s) => sum + s.iv, 0) / allCalls.length
            : 0,
        avgPutIV:
          allPuts.length > 0
            ? allPuts.reduce((sum, s) => sum + s.iv, 0) / allPuts.length
            : 0,
      },
    };

    const elapsed = Date.now() - startTime;
    this.logger.log(`Dual-direction analysis complete in ${elapsed}ms`);

    return result;
  }

  /**
   * Format dual-direction analysis as human-readable output
   */
  formatDualDirectionAnalysis(analysis: DualDirectionAnalysis): string {
    const { context, bullishScenario, bearishScenario, stats } = analysis;

    const formatStrike = (
      s: StrikeAnalysis,
      scenario: 'bullish' | 'bearish',
    ): string[] => {
      const profitEmoji = (s.predictedTotalProfit || 0) > 0 ? '📈' : '📉';
      const pctChange = s.predictedPriceChangePct?.toFixed(1) || '0';
      const arrow = (s.predictedPriceChange || 0) > 0 ? '↑' : '↓';

      return [
        `   ┌─────────────────────────────────────────────────────────`,
        `   │ ${s.rank}. ${s.strikePrice} ${s.optionType}  ${profitEmoji}`,
        `   ├─────────────────────────────────────────────────────────`,
        `   │ Premium:     ₹${s.premium.toFixed(2)} → ₹${(s.predictedPremium || 0).toFixed(2)} (${arrow}${Math.abs(parseFloat(pctChange))}%)`,
        `   │ Greeks:      Δ=${s.delta.toFixed(3)} | Γ=${s.gamma.toFixed(5)} | θ=₹${s.theta.toFixed(2)}/day | IV=${s.iv.toFixed(1)}%`,
        `   │`,
        `   │ 💰 PROFIT PROJECTIONS:`,
        `   │   • Price Change:     ₹${(s.predictedPriceChange || 0).toFixed(2)} per unit`,
        `   │   • Profit/Lot:       ₹${(s.predictedProfitPerLot || 0).toFixed(2)} (${NIFTY50_LOT_SIZE} qty)`,
        `   │   • Max Lots:         ${s.maxLots} (Capital: ₹${s.capitalRequired.toLocaleString()})`,
        `   │   • TOTAL PROFIT:     ₹${(s.predictedTotalProfit || 0).toFixed(2)}`,
        `   │`,
        `   │ 📊 RISK METRICS:`,
        `   │   • Breakeven Spot:   ₹${(s.breakevenSpot || 0).toFixed(2)}`,
        `   │   • Risk:Reward:      1:${(s.riskRewardRatio || 0).toFixed(2)}`,
        `   │   • Theta Decay:      ₹${s.thetaCost.toFixed(2)} over ${analysis.holdingPeriodDays}d`,
        `   │   • Utility Score:    ${s.utilityScore.toFixed(4)}`,
        `   │   • OI:               ${s.openInterest.toLocaleString()} | Vol: ${s.volume.toLocaleString()}`,
        `   └─────────────────────────────────────────────────────────`,
      ];
    };

    const lines: string[] = [
      '',
      '╔═══════════════════════════════════════════════════════════════════════════╗',
      '║           🎯 DUAL-DIRECTION STRIKE ANALYSIS (INSTITUTIONAL GRADE)          ║',
      '╚═══════════════════════════════════════════════════════════════════════════╝',
      '',
      '┌─────────────────────────────────────────────────────────────────────────────',
      '│ 📊 MARKET CONTEXT',
      '├─────────────────────────────────────────────────────────────────────────────',
      `│ Nifty Spot:       ₹${context.spotPrice.toFixed(2)}`,
      `│ India VIX:        ${context.vix.toFixed(2)}%`,
      `│ Available Capital: ₹${context.availableBalance.toLocaleString()}`,
      `│ Expiry:           ${context.expiryDate} (${context.daysToExpiry.toFixed(1)} days)`,
      `│ Expected Move:    ±${analysis.expectedMove} points`,
      `│ Holding Period:   ${analysis.holdingPeriodDays} day(s)`,
      '├─────────────────────────────────────────────────────────────────────────────',
      `│ Strikes Analyzed: ${stats.totalStrikesAnalyzed} (${stats.callsAnalyzed} CE, ${stats.putsAnalyzed} PE)`,
      `│ Avg CE IV:        ${stats.avgCallIV.toFixed(2)}%  |  Avg PE IV: ${stats.avgPutIV.toFixed(2)}%`,
      '└─────────────────────────────────────────────────────────────────────────────',
      '',
      '',
      '╔═══════════════════════════════════════════════════════════════════════════╗',
      `║  📈 BULLISH SCENARIO: Nifty moves UP to ₹${bullishScenario.expectedSpot.toFixed(2)} (+${analysis.expectedMove} pts)  ║`,
      '╚═══════════════════════════════════════════════════════════════════════════╝',
      '',
      '┌─ 🎯 BEST RISK-ADJUSTED (RAROC Utility) ─────────────────────────────────────',
      '',
    ];

    // Add bullish calls (utility-ranked)
    if (bullishScenario.topCalls.length > 0) {
      bullishScenario.topCalls.forEach((s) => {
        lines.push(...formatStrike(s, 'bullish'));
        lines.push('');
      });
    } else {
      lines.push(
        '   ❌ No suitable CE strikes found within capital constraints',
      );
      lines.push('');
    }

    // Add HIGHEST TOTAL PROFIT section for bullish
    lines.push(
      '┌─ 💰 HIGHEST TOTAL PROFIT (max lots × profit/lot) ─────────────────────────',
    );
    lines.push('');

    if (bullishScenario.highestProfitCalls.length > 0) {
      bullishScenario.highestProfitCalls.forEach((s) => {
        lines.push(...formatStrike(s, 'bullish'));
        lines.push('');
      });
    } else {
      lines.push(
        '   ❌ No suitable CE strikes found within capital constraints',
      );
      lines.push('');
    }

    lines.push('');
    lines.push(
      '╔═══════════════════════════════════════════════════════════════════════════╗',
    );
    lines.push(
      `║  📉 BEARISH SCENARIO: Nifty moves DOWN to ₹${bearishScenario.expectedSpot.toFixed(2)} (-${analysis.expectedMove} pts) ║`,
    );
    lines.push(
      '╚═══════════════════════════════════════════════════════════════════════════╝',
    );
    lines.push('');
    lines.push(
      '┌─ 🎯 BEST RISK-ADJUSTED (RAROC Utility) ─────────────────────────────────────',
    );
    lines.push('');

    // Add bearish puts (utility-ranked)
    if (bearishScenario.topPuts.length > 0) {
      bearishScenario.topPuts.forEach((s) => {
        lines.push(...formatStrike(s, 'bearish'));
        lines.push('');
      });
    } else {
      lines.push(
        '   ❌ No suitable PE strikes found within capital constraints',
      );
      lines.push('');
    }

    // Add HIGHEST TOTAL PROFIT section for bearish
    lines.push(
      '┌─ 💰 HIGHEST TOTAL PROFIT (max lots × profit/lot) ─────────────────────────',
    );
    lines.push('');

    if (bearishScenario.highestProfitPuts.length > 0) {
      bearishScenario.highestProfitPuts.forEach((s) => {
        lines.push(...formatStrike(s, 'bearish'));
        lines.push('');
      });
    } else {
      lines.push(
        '   ❌ No suitable PE strikes found within capital constraints',
      );
      lines.push('');
    }

    lines.push('');
    lines.push(
      '┌─────────────────────────────────────────────────────────────────────────────',
    );
    lines.push('│ 📋 QUICK COMPARISON');
    lines.push(
      '├─────────────────────────────────────────────────────────────────────────────',
    );

    const bestUtilityBullish = bullishScenario.topCalls[0];
    const bestProfitBullish = bullishScenario.highestProfitCalls[0];
    const bestUtilityBearish = bearishScenario.topPuts[0];
    const bestProfitBearish = bearishScenario.highestProfitPuts[0];

    lines.push('│');
    lines.push('│ 📈 BULLISH (CE):');
    if (bestUtilityBullish) {
      lines.push(
        `│   🎯 Risk-Adj:    ${bestUtilityBullish.strikePrice} CE @ ₹${bestUtilityBullish.premium.toFixed(2)} → ₹${(bestUtilityBullish.predictedTotalProfit || 0).toFixed(0)} total (${bestUtilityBullish.maxLots} lots)`,
      );
    }
    if (bestProfitBullish) {
      lines.push(
        `│   💰 Max Profit:  ${bestProfitBullish.strikePrice} CE @ ₹${bestProfitBullish.premium.toFixed(2)} → ₹${(bestProfitBullish.predictedTotalProfit || 0).toFixed(0)} total (${bestProfitBullish.maxLots} lots)`,
      );
    }

    lines.push('│');
    lines.push('│ 📉 BEARISH (PE):');
    if (bestUtilityBearish) {
      lines.push(
        `│   🎯 Risk-Adj:    ${bestUtilityBearish.strikePrice} PE @ ₹${bestUtilityBearish.premium.toFixed(2)} → ₹${(bestUtilityBearish.predictedTotalProfit || 0).toFixed(0)} total (${bestUtilityBearish.maxLots} lots)`,
      );
    }
    if (bestProfitBearish) {
      lines.push(
        `│   💰 Max Profit:  ${bestProfitBearish.strikePrice} PE @ ₹${bestProfitBearish.premium.toFixed(2)} → ₹${(bestProfitBearish.predictedTotalProfit || 0).toFixed(0)} total (${bestProfitBearish.maxLots} lots)`,
      );
    }

    lines.push('│');

    lines.push(
      '└─────────────────────────────────────────────────────────────────────────────',
    );
    lines.push('');
    lines.push(
      '═══════════════════════════════════════════════════════════════════════════════',
    );
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Fetch all required market context from Upstox APIs
   * Supports typed fallback when APIs are blocked (e.g., by enterprise proxy)
   *
   * To use fallback:
   * 1. Set USE_FALLBACK_DATA = true in ./fallback/index.ts
   * 2. Paste API responses in ./fallback/option-chain.fallback.ts
   * 3. Update ./fallback/config.fallback.ts with spot price, VIX, etc.
   */
  private async fetchMarketContext(
    expiryDate?: string,
  ): Promise<MarketContext> {
    // Check if typed fallback is enabled
    if (USE_FALLBACK_DATA) {
      this.logger.log(
        '📦 Using typed fallback data (USE_FALLBACK_DATA = true)',
      );
      return this.loadTypedFallback(expiryDate);
    }

    // Otherwise, fetch from APIs
    return this.fetchFromApis(expiryDate);
  }

  /**
   * Load typed fallback data from ./fallback/ files
   */
  private loadTypedFallback(expiryDate?: string): MarketContext {
    // Validate option chain fallback
    if (!OPTION_CHAIN_FALLBACK || OPTION_CHAIN_FALLBACK.length === 0) {
      throw new Error(
        'Fallback enabled but OPTION_CHAIN_FALLBACK is empty. ' +
          'Paste option chain data in ./fallback/option-chain.fallback.ts',
      );
    }

    // Validate market quote fallback
    if (!MARKET_QUOTE_FALLBACK) {
      throw new Error(
        'Fallback enabled but MARKET_QUOTE_FALLBACK is null. ' +
          'Paste market quote data in ./fallback/market-quote.fallback.ts',
      );
    }

    // Get spot price from market quote (Nifty 50)
    const niftyQuote = Object.values(MARKET_QUOTE_FALLBACK).find(
      (q) =>
        q.instrument_token === NIFTY50_INDEX_KEY ||
        q.symbol === 'Nifty 50' ||
        q.symbol === 'NIFTY 50',
    );

    if (!niftyQuote) {
      throw new Error(
        'Nifty 50 quote not found in MARKET_QUOTE_FALLBACK. ' +
          'Ensure NSE_INDEX:Nifty 50 is included in market-quote.fallback.ts',
      );
    }

    const spotPrice = niftyQuote.last_price;

    // Get VIX from market quote (India VIX)
    const vixQuote = Object.values(MARKET_QUOTE_FALLBACK).find(
      (q) =>
        q.instrument_token === INDIA_VIX_KEY ||
        q.symbol === 'India VIX' ||
        q.symbol === 'INDIA VIX',
    );

    const vix = vixQuote?.last_price || 15; // Default VIX if not provided

    // Get expiry from option chain
    const targetExpiry = expiryDate || OPTION_CHAIN_FALLBACK[0]?.expiry;

    if (!targetExpiry) {
      throw new Error(
        'Expiry date not found in option chain fallback. ' +
          'Ensure option chain data includes expiry field.',
      );
    }

    // Get available balance from funds fallback or default
    let availableBalance = 50000; // Default
    if (FUNDS_MARGIN_FALLBACK) {
      availableBalance = FUNDS_MARGIN_FALLBACK.equity.available_margin;
    } else {
      this.logger.warn(
        '⚠️ FUNDS_MARGIN_FALLBACK is null, using default balance: ₹50,000',
      );
    }

    this.logger.log(
      `📦 Loaded typed fallback - Spot: ₹${spotPrice}, VIX: ${vix}, ` +
        `Balance: ₹${availableBalance.toLocaleString()}, ` +
        `Strikes: ${OPTION_CHAIN_FALLBACK.length}, Expiry: ${targetExpiry}`,
    );

    return {
      spotPrice,
      vix,
      optionChain: OPTION_CHAIN_FALLBACK,
      availableBalance,
      expiryDate: targetExpiry,
    };
  }

  /**
   * Fetch market context from Upstox APIs
   */
  private async fetchFromApis(expiryDate?: string): Promise<MarketContext> {
    // Fetch market quotes for Nifty 50 and India VIX
    const marketQuotes = await this.upstoxClient.getMarketQuoteWithDepth([
      NIFTY50_INDEX_KEY,
      INDIA_VIX_KEY,
    ]);

    // Parse Nifty 50 spot price
    const niftyQuote = Object.values(marketQuotes).find(
      (q) => q.instrument_token === NIFTY50_INDEX_KEY,
    );
    const vixQuote = Object.values(marketQuotes).find(
      (q) => q.instrument_token === INDIA_VIX_KEY,
    );

    if (!niftyQuote) {
      throw new Error('Failed to fetch Nifty 50 spot price');
    }

    const spotPrice = niftyQuote.last_price;
    const vix = vixQuote?.last_price || 15; // Default VIX if not available

    // Get nearest expiry if not specified
    let targetExpiry = expiryDate;
    if (!targetExpiry) {
      const expiries =
        await this.upstoxClient.getActiveExpiries(NIFTY50_INDEX_KEY);
      if (expiries.length === 0) {
        throw new Error('No active expiries found for Nifty 50');
      }
      // Get nearest expiry
      targetExpiry = expiries[0];
    }

    // Fetch option chain
    const optionChain = await this.upstoxClient.getOptionChain(
      NIFTY50_INDEX_KEY,
      targetExpiry,
    );

    // Fetch available balance
    let availableBalance = 0;
    try {
      const funds = await this.upstoxClient.getFundsAndMargin('SEC');
      availableBalance = funds.equity.available_margin;
    } catch (error) {
      this.logger.warn(
        'Failed to fetch funds, using default balance. Error: ' +
          (error instanceof Error ? error.message : String(error)),
      );
      // Use a configurable default for testing
      availableBalance = parseFloat(
        process.env.STRIKE_SELECTOR_DEFAULT_BALANCE || '50000',
      );
    }

    return {
      spotPrice,
      vix,
      optionChain,
      availableBalance,
      expiryDate: targetExpiry,
    };
  }

  /**
   * Analyze all strikes and calculate utility scores
   */
  private analyzeStrikes(
    context: MarketContext,
    config: StrikeSelectorConfig,
  ): StrikeAnalysis[] {
    const results: StrikeAnalysis[] = [];

    for (const strike of context.optionChain) {
      // Analyze both CE and PE based on config
      if (config.optionType === 'BOTH' || config.optionType === 'CE') {
        const ceAnalysis = this.analyzeOption(strike, 'CE', context, config);
        results.push(ceAnalysis);
      }

      if (config.optionType === 'BOTH' || config.optionType === 'PE') {
        const peAnalysis = this.analyzeOption(strike, 'PE', context, config);
        results.push(peAnalysis);
      }
    }

    return results;
  }

  /**
   * Analyze a single option strike
   */
  private analyzeOption(
    strikeData: OptionChainItem,
    optionType: 'CE' | 'PE',
    context: MarketContext,
    config: StrikeSelectorConfig,
  ): StrikeAnalysis {
    const option =
      optionType === 'CE' ? strikeData.call_options : strikeData.put_options;
    const { market_data, option_greeks, instrument_key } = option;

    // Extract values
    const premium = market_data.ltp;
    const { delta, gamma, theta, vega, iv } = option_greeks;
    const adjustedDelta = optionType === 'PE' ? Math.abs(delta) : delta;

    // Calculate lots possible
    const capitalPerLot = premium * NIFTY50_LOT_SIZE;
    const maxLots =
      capitalPerLot > 0
        ? Math.floor(context.availableBalance / capitalPerLot)
        : 0;
    const capitalRequired = maxLots * capitalPerLot;
    const capitalUtilizationPercent =
      context.availableBalance > 0
        ? (capitalRequired / context.availableBalance) * 100
        : 0;

    // Calculate bid-ask spread
    const bidPrice = market_data.bid_price;
    const askPrice = market_data.ask_price;
    const bidAskSpread = askPrice - bidPrice;
    const bidAskSpreadPercent =
      premium > 0 ? (bidAskSpread / premium) * 100 : 100;

    // Calculate utility score components
    const expectedMove = config.expectedMove;

    // For PE options, expected move interpretation is opposite
    const effectiveMove = optionType === 'PE' ? -expectedMove : expectedMove;

    // Delta-adjusted expected move: Δ × M_view
    const deltaAdjustedMove = adjustedDelta * Math.abs(effectiveMove);

    // Gamma bonus: 0.5 × Γ × M_view²
    const gammaBonus = 0.5 * gamma * Math.pow(effectiveMove, 2);

    // Theta cost: θ × H (theta is typically negative, so we use absolute)
    const thetaCost = Math.abs(theta) * config.holdingPeriodDays;

    // Numerator: Directional Gain + Convexity Boost - Time Decay
    // (|Δ| × M_view) + (0.5 × Γ × M_view²) - (|θ| × T_hold)
    const numerator = deltaAdjustedMove + gammaBonus - thetaCost;

    // Denominator: Volatility Risk = P_K × L × σ_imp
    // Using IV as σ_imp (implied volatility as decimal)
    const volatilityRisk = premium * NIFTY50_LOT_SIZE * (iv / 100);

    // Capital Preservation Factor (Liquidity Penalty): 1 - (P_K × L) / B_avail
    // This uses SINGLE lot cost, not max lots
    const singleLotCost = premium * NIFTY50_LOT_SIZE;
    const capitalPreservationFactor =
      context.availableBalance > 0
        ? 1 - singleLotCost / context.availableBalance
        : 0;

    // Projected P&L for display purposes (using max lots)
    const projectedPnL = numerator * NIFTY50_LOT_SIZE * maxLots;

    // Final Utility Score: U(K)
    // U_K = [Numerator / Volatility Risk] × Capital Preservation Factor
    let utilityScore = 0;
    if (volatilityRisk > 0 && capitalPreservationFactor > 0) {
      utilityScore = (numerator / volatilityRisk) * capitalPreservationFactor;
    }

    // Apply directional bonus/penalty based on expected move direction
    // If bullish (positive move) and buying CE, or bearish (negative move) and buying PE
    const isDirectionallyAligned =
      (expectedMove > 0 && optionType === 'CE') ||
      (expectedMove < 0 && optionType === 'PE');

    if (!isDirectionallyAligned) {
      utilityScore *= 0.1; // Heavy penalty for wrong direction
    }

    // ============================================
    // Enhanced Predictions
    // ============================================

    // Predicted premium after move = current premium + (delta × move) + (0.5 × gamma × move²) - (theta × days)
    const predictedPriceChange = deltaAdjustedMove + gammaBonus - thetaCost;
    const predictedPremium = Math.max(0, premium + predictedPriceChange);
    const predictedPriceChangePct =
      premium > 0 ? (predictedPriceChange / premium) * 100 : 0;

    // Predicted profit per lot
    const predictedProfitPerLot = predictedPriceChange * NIFTY50_LOT_SIZE;

    // Predicted total profit (using max lots)
    const predictedTotalProfit = predictedProfitPerLot * maxLots;

    // Risk-Reward ratio (potential gain vs premium paid)
    const riskRewardRatio =
      premium > 0 ? Math.abs(predictedPriceChange) / premium : 0;

    // Breakeven point calculation
    let breakevenSpot: number;
    if (optionType === 'CE') {
      // CE breakeven = strike + premium
      breakevenSpot = strikeData.strike_price + premium;
    } else {
      // PE breakeven = strike - premium
      breakevenSpot = strikeData.strike_price - premium;
    }

    // Simplified probability of profit (based on delta and moneyness)
    // Delta roughly approximates probability of expiring ITM
    const probabilityOfProfit = Math.min(100, Math.max(0, adjustedDelta * 100));

    // Create analysis object
    const analysis: StrikeAnalysis = {
      strikePrice: strikeData.strike_price,
      optionType,
      instrumentKey: instrument_key,
      premium,
      maxLots,
      capitalRequired,
      capitalUtilizationPercent,
      delta: adjustedDelta,
      gamma,
      theta,
      vega,
      iv,
      volume: market_data.volume,
      openInterest: market_data.oi,
      bidPrice,
      askPrice,
      bidAskSpread,
      bidAskSpreadPercent,
      projectedPnL,
      thetaCost,
      deltaAdjustedMove,
      gammaBonus,
      volatilityRisk,
      capitalPreservationFactor,
      utilityScore,
      rank: 0, // Will be assigned after sorting
      // Enhanced predictions
      predictedPremium,
      predictedPriceChange,
      predictedPriceChangePct,
      predictedProfitPerLot,
      predictedTotalProfit,
      riskRewardRatio,
      breakevenSpot,
      probabilityOfProfit,
    };

    // Apply filters
    analysis.filterReason = this.applyFilters(analysis, context, config);

    // Set utility to 0 if filtered
    if (analysis.filterReason) {
      analysis.utilityScore = 0;
    }

    return analysis;
  }

  /**
   * Apply risk management and liquidity filters
   */
  private applyFilters(
    analysis: StrikeAnalysis,
    context: MarketContext,
    config: StrikeSelectorConfig,
  ): string | undefined {
    // Capital constraint: P × L × LotSize ≤ B_total × MaxRisk%
    const maxAllowedCapital = context.availableBalance * config.maxRiskPercent;
    if (analysis.capitalRequired > maxAllowedCapital) {
      return `Capital exceeds max risk (${analysis.capitalUtilizationPercent.toFixed(1)}% > ${config.maxRiskPercent * 100}%)`;
    }

    // Cannot buy any lots
    if (analysis.maxLots <= 0) {
      return 'Insufficient capital for 1 lot';
    }

    // Zero premium
    if (analysis.premium <= 0) {
      return 'Zero premium';
    }

    // Delta filter
    if (config.minDelta !== undefined && analysis.delta < config.minDelta) {
      return `Delta too low (${analysis.delta.toFixed(3)} < ${config.minDelta})`;
    }
    if (config.maxDelta !== undefined && analysis.delta > config.maxDelta) {
      return `Delta too high (${analysis.delta.toFixed(3)} > ${config.maxDelta})`;
    }

    // Open Interest filter
    if (
      config.minOpenInterest !== undefined &&
      analysis.openInterest < config.minOpenInterest
    ) {
      return `Low OI (${analysis.openInterest} < ${config.minOpenInterest})`;
    }

    // Volume filter
    if (config.minVolume !== undefined && analysis.volume < config.minVolume) {
      return `Low volume (${analysis.volume} < ${config.minVolume})`;
    }

    // IV filter
    if (config.maxIV !== undefined && analysis.iv > config.maxIV) {
      return `IV too high (${analysis.iv.toFixed(1)}% > ${config.maxIV}%)`;
    }

    // Bid-Ask spread filter
    if (
      config.maxBidAskSpreadPercent !== undefined &&
      analysis.bidAskSpreadPercent > config.maxBidAskSpreadPercent
    ) {
      return `Wide spread (${analysis.bidAskSpreadPercent.toFixed(2)}% > ${config.maxBidAskSpreadPercent}%)`;
    }

    // Zero delta (likely illiquid)
    if (analysis.delta === 0) {
      return 'Zero delta';
    }

    return undefined;
  }

  /**
   * Calculate days to expiry
   */
  private calculateDaysToExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate human-readable recommendation
   */
  formatRecommendation(result: StrikeSelectorResult): string {
    if (!result.recommended) {
      return '❌ No suitable strike found based on current filters.';
    }

    const r = result.recommended;
    const lines = [
      '',
      '═══════════════════════════════════════════════════════════════',
      '                    🎯 STRIKE RECOMMENDATION',
      '═══════════════════════════════════════════════════════════════',
      '',
      `📊 Market Context:`,
      `   • Nifty Spot: ₹${result.context.spotPrice.toFixed(2)}`,
      `   • India VIX: ${result.context.vix.toFixed(2)}`,
      `   • Available Balance: ₹${result.context.availableBalance.toLocaleString()}`,
      `   • Expiry: ${result.context.expiryDate} (${result.context.daysToExpiry.toFixed(1)} days)`,
      '',
      `💡 Your View:`,
      `   • Expected Move: ${result.config.expectedMove > 0 ? '+' : ''}${result.config.expectedMove} points`,
      `   • Holding Period: ${result.config.holdingPeriodDays} day(s)`,
      '',
      '───────────────────────────────────────────────────────────────',
      '',
      `🏆 RECOMMENDED STRIKE: ${r.strikePrice} ${r.optionType}`,
      '',
      `   Premium (LTP): ₹${r.premium.toFixed(2)}`,
      `   Max Lots: ${r.maxLots} (${r.maxLots * NIFTY50_LOT_SIZE} qty)`,
      `   Capital Required: ₹${r.capitalRequired.toLocaleString()}`,
      `   Utilization: ${r.capitalUtilizationPercent.toFixed(1)}%`,
      '',
      `   Greeks:`,
      `   • Delta: ${r.delta.toFixed(4)}`,
      `   • Gamma: ${r.gamma.toFixed(6)}`,
      `   • Theta: ₹${r.theta.toFixed(2)}/day`,
      `   • Vega: ${r.vega.toFixed(4)}`,
      `   • IV: ${r.iv.toFixed(2)}%`,
      '',
      `   Projections:`,
      `   • Delta-Adjusted Move: ₹${r.deltaAdjustedMove.toFixed(2)}`,
      `   • Gamma Bonus: ₹${r.gammaBonus.toFixed(2)}`,
      `   • Theta Cost: ₹${r.thetaCost.toFixed(2)}`,
      `   • Projected P&L: ₹${r.projectedPnL.toFixed(2)}`,
      '',
      `   📈 Utility Score: ${r.utilityScore.toFixed(4)}`,
      '',
      '───────────────────────────────────────────────────────────────',
      '',
      `📋 Top ${Math.min(5, result.allStrikes.length)} Alternatives:`,
    ];

    result.allStrikes.slice(1, 6).forEach((s, idx) => {
      lines.push(
        `   ${idx + 2}. ${s.strikePrice} ${s.optionType} - ₹${s.premium.toFixed(2)} (Score: ${s.utilityScore.toFixed(4)}, ${s.maxLots} lots)`,
      );
    });

    lines.push('');
    lines.push(
      '═══════════════════════════════════════════════════════════════',
    );
    lines.push('');

    return lines.join('\n');
  }
}
