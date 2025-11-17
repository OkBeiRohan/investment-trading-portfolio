/**
 * StrategySelectionService
 * Selects appropriate options strategy based on trading signal
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TradingSignal,
  Strategy,
  StrategyCreateInput,
  EntryConditions,
  ExitConditions,
  Prediction,
} from '@repo/schema';

interface StrategyConfig {
  name: string;
  minConfidence: number;
  maxConfidence: number;
  description: string;
}

@Injectable()
export class StrategySelectionService {
  private readonly logger = new Logger(StrategySelectionService.name);

  // Strategy mapping matrix
  private readonly STRATEGY_MATRIX: Record<
    Prediction,
    Record<string, StrategyConfig>
  > = {
    VOL_UP: {
      highConfidence: {
        name: 'LONG_STRADDLE',
        minConfidence: 0.7,
        maxConfidence: 1.0,
        description: 'Buy ATM Call + Buy ATM Put',
      },
      mediumConfidence: {
        name: 'LONG_STRANGLE',
        minConfidence: 0.55,
        maxConfidence: 0.7,
        description: 'Buy OTM Call + Buy OTM Put',
      },
    },
    VOL_DOWN: {
      highConfidence: {
        name: 'IRON_CONDOR',
        minConfidence: 0.7,
        maxConfidence: 1.0,
        description: 'Sell OTM Call Spread + Sell OTM Put Spread',
      },
      mediumConfidence: {
        name: 'SHORT_STRANGLE',
        minConfidence: 0.55,
        maxConfidence: 0.7,
        description: 'Sell OTM Call + Sell OTM Put',
      },
    },
    NEUTRAL: {
      bullishBias: {
        name: 'BULL_PUT_SPREAD',
        minConfidence: 0.5,
        maxConfidence: 0.65,
        description: 'Sell OTM Put + Buy Further OTM Put',
      },
      bearishBias: {
        name: 'BEAR_CALL_SPREAD',
        minConfidence: 0.35,
        maxConfidence: 0.5,
        description: 'Sell OTM Call + Buy Further OTM Call',
      },
    },
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Select strategy based on signal
   */
  selectStrategy(signal: TradingSignal): StrategyCreateInput | null {
    const { prediction, confidence } = signal;

    // Check if confidence meets minimum threshold
    const minThreshold = this.configService.get<number>(
      'trading.minConfidence',
      0.55,
    );

    if (confidence < minThreshold) {
      this.logger.debug(
        `Signal confidence ${confidence} below threshold ${minThreshold}`,
      );
      return null; // NO_TRADE
    }

    // Get strategy based on prediction and confidence
    const strategyConfig = this.getStrategyConfig(prediction, confidence);

    if (!strategyConfig) {
      this.logger.warn(
        `No strategy found for ${prediction} with confidence ${confidence}`,
      );
      return null;
    }

    // Build strategy object
    return this.buildStrategy(strategyConfig, signal);
  }

  /**
   * Get strategy config from matrix
   */
  private getStrategyConfig(
    prediction: Prediction,
    confidence: number,
  ): StrategyConfig | null {
    const strategies = this.STRATEGY_MATRIX[prediction];

    if (!strategies) return null;

    // Find matching confidence band
    for (const [key, config] of Object.entries(strategies)) {
      if (
        confidence >= config.minConfidence &&
        confidence <= config.maxConfidence
      ) {
        this.logger.log(
          `Selected strategy: ${config.name} (${key}, confidence: ${confidence})`,
        );
        return config;
      }
    }

    return null;
  }

  /**
   * Build strategy object
   */
  private buildStrategy(
    config: StrategyConfig,
    signal: TradingSignal,
  ): StrategyCreateInput {
    // TODO: Fill in actual entry/exit conditions based on strategy type
    return {
      name: config.name,
      description: config.description,
      type: this.mapStrategyType(config.name),
      legs: [], // TODO: Build legs from strategy config
      entryConditions: this.buildEntryConditions(config.name, signal),
      exitConditions: this.buildExitConditions(config.name),
      riskProfile: this.buildRiskProfile(config.name),
    };
  }

  /**
   * Map strategy name to type enum
   */
  private mapStrategyType(strategyName: string): Strategy['type'] {
    const mapping: Record<string, Strategy['type']> = {
      LONG_STRADDLE: 'LONG_STRADDLE',
      LONG_STRANGLE: 'LONG_STRANGLE',
      IRON_CONDOR: 'IRON_CONDOR',
      SHORT_STRANGLE: 'SHORT_STRANGLE',
      BULL_PUT_SPREAD: 'BULL_PUT_SPREAD',
      BEAR_CALL_SPREAD: 'BEAR_CALL_SPREAD',
    };

    return mapping[strategyName] ?? 'LONG_STRADDLE';
  }

  /**
   * Build entry conditions
   */
  private buildEntryConditions(
    strategyName: string,
    signal: TradingSignal,
  ): EntryConditions {
    return {
      minConfidence: signal.confidence,
      prediction: signal.prediction,
      minVIX: 15, // TODO: Calculate from signal features
      maxVIX: 40,
    };
  }

  /**
   * Build exit conditions
   */
  private buildExitConditions(strategyName: string): ExitConditions {
    // Default exit conditions
    return {
      profitTarget: 10000, // INR
      stopLoss: -5000, // INR
      timeBasedExit: 4, // 4 hours
    };
  }

  /**
   * Build risk profile
   */
  private buildRiskProfile(
    strategyName: string,
  ): StrategyCreateInput['riskProfile'] {
    const profiles: Record<
      string,
      { maxLoss: number; maxProfit: number; breakeven: number[] }
    > = {
      LONG_STRADDLE: {
        maxLoss: -10000, // Net debit
        maxProfit: 999999, // Unlimited
        breakeven: [19000, 21000], // ATM ± premium
      },
      IRON_CONDOR: {
        maxLoss: -5000, // Width - credit
        maxProfit: 2000, // Net credit
        breakeven: [18500, 21500],
      },
      BULL_PUT_SPREAD: {
        maxLoss: -3000,
        maxProfit: 1500,
        breakeven: [19500],
      },
    };

    const profile = profiles[strategyName] ?? {
      maxLoss: -5000,
      maxProfit: 5000,
      breakeven: [20000],
    };

    return {
      maxLoss: profile.maxLoss,
      maxProfit: profile.maxProfit,
      breakeven: profile.breakeven,
      probabilityOfProfit: 0.5, // TODO: Calculate based on Greeks
    };
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): string[] {
    const strategies = new Set<string>();

    for (const predictionStrategies of Object.values(this.STRATEGY_MATRIX)) {
      for (const config of Object.values(predictionStrategies)) {
        strategies.add(config.name);
      }
    }

    return Array.from(strategies);
  }
}
