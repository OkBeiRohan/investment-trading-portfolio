/**
 * PositionSizingService
 * Calculates optimal position sizes based on Kelly Criterion and risk parameters
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TradingSignal } from '@repo/schema';

interface PositionSizeParams {
  accountSize: number; // Total capital in INR
  confidence: number; // Signal confidence (0-1)
  winRate: number; // Historical win rate
  avgWin: number; // Average win amount
  avgLoss: number; // Average loss amount
  maxRiskPerTrade: number; // Max % of capital to risk per trade
}

interface PositionSizeResult {
  lotSize: number; // Number of lots to trade
  notionalValue: number; // Position value in INR
  riskAmount: number; // Max risk in INR
  kellyFraction: number; // Kelly criterion fraction
  adjustedFraction: number; // Conservative adjusted fraction
}

@Injectable()
export class PositionSizingService {
  private readonly logger = new Logger(PositionSizingService.name);
  private readonly kellyMultiplier: number;
  private readonly maxRiskPerTrade: number;

  constructor(private readonly configService: ConfigService) {
    // Use fractional Kelly (e.g., 0.25 or 0.5) to reduce volatility
    this.kellyMultiplier = this.configService.get<number>(
      'trading.sizing.kellyMultiplier',
      0.25,
    );
    this.maxRiskPerTrade = this.configService.get<number>(
      'trading.sizing.maxRiskPerTrade',
      0.02, // 2% of capital
    );
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculatePositionSize(
    signal: TradingSignal,
    params: PositionSizeParams,
  ): PositionSizeResult {
    // Calculate Kelly fraction
    const kellyFraction = this.calculateKellyFraction(
      params.winRate,
      params.avgWin,
      params.avgLoss,
    );

    // Apply confidence adjustment
    const confidenceAdjusted = kellyFraction * signal.confidence;

    // Apply Kelly multiplier (fractional Kelly)
    const adjustedFraction = confidenceAdjusted * this.kellyMultiplier;

    // Cap at max risk per trade
    const finalFraction = Math.min(adjustedFraction, params.maxRiskPerTrade);

    // Calculate risk amount
    const riskAmount = params.accountSize * finalFraction;

    // Calculate notional value (simplified - actual would use strategy payoff)
    const notionalValue = riskAmount / 0.2; // Assuming 20% max loss on position

    // Calculate lot size (Nifty options: 50 units per lot)
    const lotSize = Math.floor(notionalValue / (20000 * 50)); // Rough estimate

    this.logger.debug(
      `Position sizing: Kelly=${kellyFraction.toFixed(4)}, ` +
        `Adjusted=${adjustedFraction.toFixed(4)}, ` +
        `Lots=${lotSize}, Risk=${riskAmount} INR`,
    );

    return {
      lotSize: Math.max(1, lotSize), // Minimum 1 lot
      notionalValue,
      riskAmount,
      kellyFraction,
      adjustedFraction: finalFraction,
    };
  }

  /**
   * Kelly Criterion formula:
   * f* = (p * b - q) / b
   * where:
   *   p = win probability
   *   q = loss probability (1 - p)
   *   b = win/loss ratio (avgWin / avgLoss)
   */
  private calculateKellyFraction(
    winRate: number,
    avgWin: number,
    avgLoss: number,
  ): number {
    const p = winRate;
    const q = 1 - winRate;
    const b = Math.abs(avgWin / avgLoss);

    const kelly = (p * b - q) / b;

    // Kelly can be negative (don't bet) or >1 (over-leverage)
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, kelly));
  }

  /**
   * Calculate position size for specific strategy
   */
  calculateStrategySize(
    strategyName: string,
    signal: TradingSignal,
    accountSize: number,
    historicalStats: {
      winRate: number;
      avgWin: number;
      avgLoss: number;
    },
  ): PositionSizeResult {
    // Strategy-specific adjustments
    const strategyMultipliers: Record<string, number> = {
      LONG_STRADDLE: 0.8, // Higher risk, reduce size
      LONG_STRANGLE: 0.9,
      IRON_CONDOR: 1.0, // Defined risk
      SHORT_STRANGLE: 0.7, // Unlimited risk, reduce size
      BULL_PUT_SPREAD: 1.0,
      BEAR_CALL_SPREAD: 1.0,
    };

    const multiplier = strategyMultipliers[strategyName] ?? 1.0;

    const params: PositionSizeParams = {
      accountSize,
      confidence: signal.confidence,
      winRate: historicalStats.winRate,
      avgWin: historicalStats.avgWin,
      avgLoss: historicalStats.avgLoss,
      maxRiskPerTrade: this.maxRiskPerTrade * multiplier,
    };

    return this.calculatePositionSize(signal, params);
  }

  /**
   * Validate position size against risk limits
   */
  validatePositionSize(
    positionSize: PositionSizeResult,
    availableCash: number,
  ): { valid: boolean; reason?: string } {
    // Check if sufficient cash
    if (positionSize.notionalValue > availableCash) {
      return {
        valid: false,
        reason: `Insufficient cash: need ${positionSize.notionalValue}, have ${availableCash}`,
      };
    }

    // Check if lot size is reasonable
    if (positionSize.lotSize === 0) {
      return {
        valid: false,
        reason: 'Position size too small (0 lots)',
      };
    }

    // Check if risk amount is within limits
    const maxRiskAmount = availableCash * this.maxRiskPerTrade;
    if (positionSize.riskAmount > maxRiskAmount) {
      return {
        valid: false,
        reason: `Risk amount ${positionSize.riskAmount} exceeds max ${maxRiskAmount}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate diversification adjustment
   * Reduce position size if too many correlated positions
   */
  calculateDiversificationAdjustment(
    correlatedPositions: number,
    maxCorrelated: number = 3,
  ): number {
    if (correlatedPositions >= maxCorrelated) {
      return 0; // No new position
    }

    // Reduce size linearly as correlation increases
    return 1 - correlatedPositions / maxCorrelated;
  }
}
