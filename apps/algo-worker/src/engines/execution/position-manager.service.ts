/**
 * PositionManagerService
 * Manages open positions, P&L tracking, and portfolio Greeks
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Position,
  PositionCreateInput,
  Order,
  Greeks,
} from '@repo/schema';

@Injectable()
export class PositionManagerService {
  private readonly logger = new Logger(PositionManagerService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create position from filled order
   */
  async createPosition(order: Order): Promise<PositionCreateInput> {
    this.logger.log(`Creating position from order: ${order.orderId}`);

    // Calculate position Greeks (sum of leg Greeks)
    const positionGreeks = await this.calculatePositionGreeks(order);

    // Calculate entry cost
    const entryCost = Math.abs(order.totalCost);

    const position: PositionCreateInput = {
      userId: order.userId,
      strategy: order.strategy,
      instrument: 'NIFTY', // Primary underlying
      legs: order.legs.map((leg) => ({
        instrumentKey: leg.instrumentKey,
        exchange: leg.exchange,
        side: leg.transactionType,
        quantity: leg.quantity,
        entryPrice: leg.averagePrice ?? leg.price ?? 0,
        currentPrice: leg.averagePrice ?? leg.price ?? 0,
        pnl: 0, // Initial P&L is zero
      })),
      greeks: positionGreeks,
      entryDate: new Date(),
      status: 'OPEN' as const,
      unrealizedPnL: 0,
      costs: this.calculateCosts(entryCost),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Persist to MongoDB
    // await collections.positions.insertOne(position);

    return position;
  }

  /**
   * Update position with current market prices
   */
  async updatePosition(
    positionId: string,
    currentPrices: Record<string, number>,
  ): Promise<void> {
    // TODO: Query position from MongoDB
    // const position = await collections.positions.findOne({ _id: positionId });

    // if (position) {
    //   // Update leg prices and P&L
    //   const updatedLegs = position.legs.map(leg => ({
    //     ...leg,
    //     currentPrice: currentPrices[leg.instrumentKey] ?? leg.currentPrice,
    //     pnl: this.calculateLegPnL(leg, currentPrices[leg.instrumentKey]),
    //   }));

    //   const unrealizedPnL = this.calculateUnrealizedPnL(updatedLegs);

    //   await collections.positions.updateOne(
    //     { _id: positionId },
    //     {
    //       $set: {
    //         legs: updatedLegs,
    //         unrealizedPnL,
    //         greeks: await this.calculatePositionGreeks({ legs: updatedLegs }),
    //         updatedAt: new Date(),
    //       },
    //     }
    //   );
    // }

    this.logger.debug(`Updated position: ${positionId}`);
  }

  /**
   * Close position
   */
  async closePosition(
    positionId: string,
    exitPrices: Record<string, number>,
  ): Promise<void> {
    // TODO: Query position from MongoDB
    // const position = await collections.positions.findOne({ _id: positionId });

    // if (position) {
    //   const realizedPnL = this.calculateRealizedPnL(position, exitPrices);

    //   await collections.positions.updateOne(
    //     { _id: positionId },
    //     {
    //       $set: {
    //         status: 'CLOSED',
    //         exitDate: new Date(),
    //         realizedPnL,
    //         updatedAt: new Date(),
    //       },
    //     }
    //   );

    //   this.logger.log(`Position ${positionId} closed with P&L: ${realizedPnL}`);
    // }

    this.logger.debug(`Closed position: ${positionId}`);
  }

  /**
   * Get all open positions
   */
  async getOpenPositions(userId: string): Promise<Position[]> {
    // TODO: Query from MongoDB
    // return collections.positions.find({
    //   userId,
    //   status: 'OPEN'
    // }).toArray();

    this.logger.debug(`Getting open positions for user: ${userId}`);
    return []; // Placeholder
  }

  /**
   * Calculate position Greeks
   */
  private async calculatePositionGreeks(order: Order): Promise<Greeks> {
    // TODO: Fetch real-time Greeks from market data
    // For now, using placeholders

    let netDelta = 0;
    let netGamma = 0;
    let netVega = 0;
    let netTheta = 0;

    for (const leg of order.legs) {
      // TODO: Fetch Greeks for each instrument
      // const greeks = await marketData.getGreeks(leg.instrumentKey);

      // Adjust sign based on BUY/SELL
      const multiplier = leg.transactionType === 'BUY' ? 1 : -1;

      // Mock Greeks (TODO: Replace with actual)
      netDelta += 0.5 * leg.quantity * multiplier;
      netGamma += 0.05 * leg.quantity * multiplier;
      netVega += 10 * leg.quantity * multiplier;
      netTheta += -5 * leg.quantity * multiplier;
    }

    return {
      delta: netDelta,
      gamma: netGamma,
      vega: netVega,
      theta: netTheta,
      iv: 20, // Placeholder
    };
  }

  /**
   * Calculate transaction costs
   */
  private calculateCosts(notionalValue: number): {
    brokerage: number;
    stt: number;
    slippage: number;
    total: number;
  } {
    // Upstox pricing: ₹20 per order or 0.05% (whichever is lower)
    const brokerage = Math.min(20, notionalValue * 0.0005);

    // STT on sell side: 0.0625% of premium
    const stt = notionalValue * 0.000625;

    // Estimated slippage: 0.05%
    const slippage = notionalValue * 0.0005;

    // Exchange fees, GST, SEBI charges (simplified)
    const otherFees = notionalValue * 0.0008;

    const total = brokerage + stt + slippage + otherFees;

    return {
      brokerage,
      stt,
      slippage,
      total,
    };
  }

  /**
   * Calculate unrealized P&L
   */
  private calculateUnrealizedPnL(
    legs: Array<{
      side: string;
      quantity: number;
      entryPrice: number;
      currentPrice: number;
    }>,
  ): number {
    return legs.reduce((pnl, leg) => {
      const priceDiff = leg.currentPrice - leg.entryPrice;
      const legPnL =
        leg.side === 'BUY'
          ? priceDiff * leg.quantity
          : -priceDiff * leg.quantity;
      return pnl + legPnL;
    }, 0);
  }

  /**
   * Calculate realized P&L
   */
  private calculateRealizedPnL(
    position: Position,
    exitPrices: Record<string, number>,
  ): number {
    let pnl = 0;

    for (const leg of position.legs) {
      const exitPrice = exitPrices[leg.instrumentKey] ?? leg.currentPrice;
      const priceDiff = exitPrice - leg.entryPrice;

      const legPnL =
        leg.side === 'BUY'
          ? priceDiff * leg.quantity
          : -priceDiff * leg.quantity;

      pnl += legPnL;
    }

    // Subtract costs
    pnl -= position.costs?.total ?? 0;

    return pnl;
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(userId: string): Promise<{
    openPositions: number;
    totalPnL: number;
    netGreeks: Greeks;
  }> {
    const positions = await this.getOpenPositions(userId);

    const totalPnL = positions.reduce(
      (sum, pos) => sum + (pos.unrealizedPnL ?? 0),
      0,
    );

    const netGreeks = positions.reduce(
      (acc, pos) => ({
        delta: acc.delta + (pos.greeks?.delta ?? 0),
        gamma: acc.gamma + (pos.greeks?.gamma ?? 0),
        vega: acc.vega + (pos.greeks?.vega ?? 0),
        theta: acc.theta + (pos.greeks?.theta ?? 0),
        iv: 0, // IV is not additive
      }),
      { delta: 0, gamma: 0, vega: 0, theta: 0, iv: 0 },
    );

    return {
      openPositions: positions.length,
      totalPnL,
      netGreeks,
    };
  }
}
