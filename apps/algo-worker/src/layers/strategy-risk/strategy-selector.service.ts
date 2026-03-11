import { Injectable, Logger } from '@nestjs/common';
import type { InferenceResult } from '../prediction/inference-worker.service';
import { ConfigService } from '@nestjs/config';
import { RiskValidatorService } from './risk-validator.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface OrderIntent {
  instrumentKey: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  strategyContext: string;
}

@Injectable()
export class StrategySelectorService {
  private readonly logger = new Logger(StrategySelectorService.name);
  
  private readonly ENTRY_THRESHOLD: number;
  private readonly EXIT_THRESHOLD: number;
  private readonly DEFAULT_QTY = 50; // 1 Lot Nifty Default

  constructor(
    private readonly configService: ConfigService,
    private readonly riskValidator: RiskValidatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ENTRY_THRESHOLD = this.configService.get<number>('ENTRY_THRESHOLD') || 0.65;
    this.EXIT_THRESHOLD = this.configService.get<number>('EXIT_THRESHOLD') || 0.40;
  }

  /**
   * Translates an ML Inference Prediction into an Actionable Options Trade
   */
  @OnEvent('signal.generated')
  async processPrediction(result: InferenceResult): Promise<void> {
    const { instrumentKey, finalScore } = result;

    try {
      // Very basic directional strategy for illustration:
      // Prob > ENTRY_THRESHOLD -> Go Long
      // Prob < 1 - ENTRY_THRESHOLD -> Go Short
      
      let intent: OrderIntent | null = null;
      
      if (finalScore > this.ENTRY_THRESHOLD) {
         this.logger.log(`[BULL SIGNAL] Score: ${finalScore.toFixed(2)} on ${instrumentKey}`);
         intent = {
           instrumentKey,
           side: 'BUY',
           quantity: this.DEFAULT_QTY,
           orderType: 'MARKET',
           strategyContext: 'ML_MOMENTUM_LONG'
         };
      } else if (finalScore < (1 - this.ENTRY_THRESHOLD)) {
         this.logger.log(`[BEAR SIGNAL] Score: ${finalScore.toFixed(2)} on ${instrumentKey}`);
         intent = {
           instrumentKey,
           side: 'SELL',
           quantity: this.DEFAULT_QTY,
           orderType: 'MARKET',
           strategyContext: 'ML_MOMENTUM_SHORT' // Requires Margin for Options Writing
         };
      }

      if (intent) {
        // Run Pre-Trade Risk Checks (SEBI Requirement)
        const isApproved = await this.riskValidator.validatePreTrade(intent);
        
        if (isApproved) {
           this.logger.log(`Order Approved by Risk. Dispatching Intent for Execution.`);
           // Dispatch to Layer 5 (Execution)
           this.eventEmitter.emit('order.intent', intent);
        } else {
           this.logger.warn(`Order Rejected by Risk Engine: ${intent.instrumentKey} ${intent.side}`);
        }
      }

    } catch (e: any) {
      this.logger.error(`Error in Strategy Selector: ${e.message}`, e.stack);
    }
  }
}
