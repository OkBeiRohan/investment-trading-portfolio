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
  NIFTY50_LOT_SIZE,
  DEFAULT_CONFIG,
  NIFTY50_INDEX_KEY,
  INDIA_VIX_KEY,
} from './strike-selector.types';

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
   * Fetch all required market context from Upstox APIs
   */
  private async fetchMarketContext(
    expiryDate?: string,
  ): Promise<MarketContext> {
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

    // Projected P&L for single lot
    const projectedPnLPerLot =
      (deltaAdjustedMove + gammaBonus - thetaCost) * NIFTY50_LOT_SIZE;

    // Total projected P&L with max lots
    const projectedPnL = projectedPnLPerLot * maxLots;

    // Volatility risk factor: P × √(IV/100)
    const volatilityRisk = premium * Math.sqrt(iv / 100);

    // Capital preservation factor: 1 - (P × L × 65) / B_total
    const capitalPreservationFactor =
      context.availableBalance > 0
        ? 1 - capitalRequired / context.availableBalance
        : 0;

    // Final Utility Score: U(S)
    let utilityScore = 0;
    if (volatilityRisk > 0 && capitalPreservationFactor > 0) {
      utilityScore =
        (projectedPnLPerLot / volatilityRisk) * capitalPreservationFactor;
    }

    // Apply directional bonus/penalty based on expected move direction
    // If bullish (positive move) and buying CE, or bearish (negative move) and buying PE
    const isDirectionallyAligned =
      (expectedMove > 0 && optionType === 'CE') ||
      (expectedMove < 0 && optionType === 'PE');

    if (!isDirectionallyAligned) {
      utilityScore *= 0.1; // Heavy penalty for wrong direction
    }

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
