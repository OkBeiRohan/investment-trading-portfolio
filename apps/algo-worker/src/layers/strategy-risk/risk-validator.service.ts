import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderIntent } from './strategy-selector.service';

@Injectable()
export class RiskValidatorService {
  private readonly logger = new Logger(RiskValidatorService.name);
  
  private readonly MAX_DAILY_LOSS: number;
  private readonly MAX_POSITIONS: number;
  
  // Simulated tracking (Should be persisted to Redis in prod)
  private currentDailyPnL = 0;
  private currentOpenPositions = 0;

  constructor(private readonly configService: ConfigService) {
    this.MAX_DAILY_LOSS = this.configService.get<number>('MAX_DAILY_LOSS') || -50000;
    this.MAX_POSITIONS = this.configService.get<number>('MAX_POSITIONS') || 5;
  }

  /**
   * SEBI 2024-2026 Compliant Pre-Trade Risk Validation Pipeline
   */
  async validatePreTrade(intent: OrderIntent): Promise<boolean> {
    this.logger.debug(`Validating pre-trade risk for ${intent.side} ${intent.quantity} ${intent.instrumentKey}`);
    
    // Check 1: Max Daily Loss Hit (Global Circuit Breaker)
    if (this.currentDailyPnL <= this.MAX_DAILY_LOSS) {
      this.logger.warn(`RISK REJECT: Max daily loss breached (${this.currentDailyPnL} <= ${this.MAX_DAILY_LOSS}). Trading Halted.`);
      return false;
    }

    // Check 2: Max Open Positions
    // Exclude 'SELL' if it's closing out a position, but for simplicity assume all are opening
    if (this.currentOpenPositions >= this.MAX_POSITIONS) {
       this.logger.warn(`RISK REJECT: Max open positions reached (${this.currentOpenPositions}). Cannot open new trade.`);
       return false;
    }

    // Check 3: Fat Finger Checks (Max Quantities)
    if (intent.quantity > (50 * 36)) { // 36 lots of Nifty max per freeze limit
       this.logger.warn(`RISK REJECT: Fat finger check. Quantity ${intent.quantity} exceeds 1800 freeze limit.`);
       return false;
    }

    return true; // Approved
  }

  // Hook to update live risk state from Layer 5 Event Stream
  updateRiskState(pnl: number, positionsCount: number) {
    this.currentDailyPnL = pnl;
    this.currentOpenPositions = positionsCount;
  }
}
