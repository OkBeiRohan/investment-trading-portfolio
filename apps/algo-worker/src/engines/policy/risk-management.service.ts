/**
 * RiskManagementService
 * Implements portfolio risk controls and validation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Position } from '@repo/schema';

interface RiskLimits {
  maxDailyLoss: number; // INR
  maxDrawdown: number; // INR
  maxPositionCount: number;
  minCashReserve: number; // INR
  maxLeverage: number;
  maxPortfolioDelta: number; // Absolute
  maxPortfolioVega: number; // Absolute
  maxPortfolioGamma: number; // Absolute
}

interface PortfolioRisk {
  currentDailyPnL: number;
  currentDrawdown: number;
  openPositions: number;
  cashReserve: number;
  leverage: number;
  netDelta: number;
  netVega: number;
  netGamma: number;
}

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);
  private readonly riskLimits: RiskLimits;

  constructor(private readonly configService: ConfigService) {
    this.riskLimits = {
      maxDailyLoss: this.configService.get<number>(
        'trading.risk.maxDailyLoss',
        -50000,
      ),
      maxDrawdown: this.configService.get<number>(
        'trading.risk.maxDrawdown',
        -100000,
      ),
      maxPositionCount: this.configService.get<number>(
        'trading.risk.maxPositions',
        5,
      ),
      minCashReserve: this.configService.get<number>(
        'trading.risk.minCashReserve',
        100000,
      ),
      maxLeverage: this.configService.get<number>(
        'trading.risk.maxLeverage',
        1.5,
      ),
      maxPortfolioDelta: this.configService.get<number>(
        'trading.risk.maxDelta',
        500,
      ),
      maxPortfolioVega: this.configService.get<number>(
        'trading.risk.maxVega',
        100,
      ),
      maxPortfolioGamma: this.configService.get<number>(
        'trading.risk.maxGamma',
        50,
      ),
    };
  }

  /**
   * Validate if new position can be opened
   */
  async canOpenPosition(
    positionCost: number,
    positionGreeks: { delta: number; vega: number; gamma: number },
    currentRisk: PortfolioRisk,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check daily loss limit
    if (currentRisk.currentDailyPnL <= this.riskLimits.maxDailyLoss) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${currentRisk.currentDailyPnL} INR`,
      };
    }

    // Check drawdown limit
    if (currentRisk.currentDrawdown <= this.riskLimits.maxDrawdown) {
      return {
        allowed: false,
        reason: `Drawdown limit reached: ${currentRisk.currentDrawdown} INR`,
      };
    }

    // Check position count
    if (currentRisk.openPositions >= this.riskLimits.maxPositionCount) {
      return {
        allowed: false,
        reason: `Max positions reached: ${currentRisk.openPositions}`,
      };
    }

    // Check cash reserve
    const newCashReserve = currentRisk.cashReserve - positionCost;
    if (newCashReserve < this.riskLimits.minCashReserve) {
      return {
        allowed: false,
        reason: `Insufficient cash reserve: ${newCashReserve} INR`,
      };
    }

    // Check leverage
    const newLeverage = this.calculateLeverage(
      currentRisk.cashReserve,
      positionCost,
    );
    if (newLeverage > this.riskLimits.maxLeverage) {
      return {
        allowed: false,
        reason: `Leverage limit exceeded: ${newLeverage.toFixed(2)}x`,
      };
    }

    // Check portfolio delta
    const newDelta = Math.abs(currentRisk.netDelta + positionGreeks.delta);
    if (newDelta > this.riskLimits.maxPortfolioDelta) {
      return {
        allowed: false,
        reason: `Portfolio delta limit exceeded: ${newDelta}`,
      };
    }

    // Check portfolio vega
    const newVega = Math.abs(currentRisk.netVega + positionGreeks.vega);
    if (newVega > this.riskLimits.maxPortfolioVega) {
      return {
        allowed: false,
        reason: `Portfolio vega limit exceeded: ${newVega}`,
      };
    }

    // Check portfolio gamma
    const newGamma = Math.abs(currentRisk.netGamma + positionGreeks.gamma);
    if (newGamma > this.riskLimits.maxPortfolioGamma) {
      return {
        allowed: false,
        reason: `Portfolio gamma limit exceeded: ${newGamma}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Calculate portfolio Greeks from positions
   */
  calculatePortfolioGreeks(positions: Position[]): {
    netDelta: number;
    netVega: number;
    netGamma: number;
    netTheta: number;
  } {
    return positions.reduce(
      (acc, position) => ({
        netDelta: acc.netDelta + (position.greeks?.delta ?? 0),
        netVega: acc.netVega + (position.greeks?.vega ?? 0),
        netGamma: acc.netGamma + (position.greeks?.gamma ?? 0),
        netTheta: acc.netTheta + (position.greeks?.theta ?? 0),
      }),
      { netDelta: 0, netVega: 0, netGamma: 0, netTheta: 0 },
    );
  }

  /**
   * Calculate current risk metrics
   */
  async calculateCurrentRisk(
    positions: Position[],
    cashReserve: number,
  ): Promise<PortfolioRisk> {
    const greeks = this.calculatePortfolioGreeks(positions);

    // Calculate daily P&L
    const currentDailyPnL = positions.reduce((sum, pos) => {
      return sum + (pos.unrealizedPnL ?? 0);
    }, 0);

    // Calculate drawdown (TODO: Need historical equity curve)
    const currentDrawdown = 0; // Placeholder

    // Calculate total position value
    const totalPositionValue = positions.reduce((sum, pos) => {
      const legValues = pos.legs.reduce((legSum, leg) => {
        return legSum + leg.currentPrice * leg.quantity;
      }, 0);
      return sum + legValues;
    }, 0);

    const leverage = totalPositionValue / cashReserve;

    return {
      currentDailyPnL,
      currentDrawdown,
      openPositions: positions.filter((p) => p.status === 'OPEN').length,
      cashReserve,
      leverage,
      netDelta: greeks.netDelta,
      netVega: greeks.netVega,
      netGamma: greeks.netGamma,
    };
  }

  /**
   * Calculate leverage
   */
  private calculateLeverage(cashReserve: number, positionCost: number): number {
    return positionCost / cashReserve;
  }

  /**
   * Get risk limits
   */
  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  /**
   * Check if portfolio needs rebalancing
   */
  needsRebalancing(greeks: {
    netDelta: number;
    netVega: number;
    netGamma: number;
  }): boolean {
    // Rebalance if Greeks exceed 80% of limits
    const deltaThreshold = this.riskLimits.maxPortfolioDelta * 0.8;
    const vegaThreshold = this.riskLimits.maxPortfolioVega * 0.8;
    const gammaThreshold = this.riskLimits.maxPortfolioGamma * 0.8;

    return (
      Math.abs(greeks.netDelta) > deltaThreshold ||
      Math.abs(greeks.netVega) > vegaThreshold ||
      Math.abs(greeks.netGamma) > gammaThreshold
    );
  }
}
