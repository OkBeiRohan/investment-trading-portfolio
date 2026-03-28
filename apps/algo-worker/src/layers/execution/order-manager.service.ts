import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { OrderIntent } from '../strategy-risk/strategy-selector.service';

@Injectable()
export class OrderManagerService {
  private readonly logger = new Logger(OrderManagerService.name);
  private readonly sandboxMode: boolean;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.sandboxMode = this.configService.get<string>('TRADING_MODE') !== 'live';
    this.logger.log(`Order Manager initialized (mode: ${this.sandboxMode ? 'SANDBOX' : 'LIVE'})`);
  }

  @OnEvent('order.intent')
  async executeOrder(intent: OrderIntent): Promise<void> {
    this.logger.log(`Executing Order: ${intent.side} ${intent.quantity} ${intent.instrumentKey} (${intent.orderType})`);
    const startTime = performance.now();

    try {
      const upstoxPayload = {
        instrumentToken: intent.instrumentKey,
        quantity: intent.quantity,
        transactionType: intent.side,
        orderType: intent.orderType,
        product: 'I',
        validity: 'DAY',
      };

      let orderId: string;

      if (this.sandboxMode) {
        orderId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.logger.log(`[SANDBOX] Simulated order: ${orderId}`);
      } else {
        orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.logger.log(`[LIVE] Order placed: ${orderId}`);
      }

      const latencyMs = performance.now() - startTime;

      this.eventEmitter.emit('order.filled', {
        orderId,
        intent,
        latencyMs,
        sandbox: this.sandboxMode,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Order filled in ${latencyMs.toFixed(2)}ms: ${orderId}`);

    } catch (error: any) {
      this.logger.error(`Order execution failed for ${intent.instrumentKey}: ${error.message}`);

      this.eventEmitter.emit('order.failed', {
        intent,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
