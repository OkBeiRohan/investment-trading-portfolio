import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { OrderIntent } from '../strategy-risk/strategy-selector.service';

@Injectable()
export class OrderManagerService {
  private readonly logger = new Logger(OrderManagerService.name);
  private readonly sandboxMode: boolean;
  private readonly upstoxApiUrl: string;
  private accessToken: string | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.sandboxMode = this.configService.get<string>('TRADING_MODE') !== 'live';
    this.upstoxApiUrl = 'https://api.upstox.com/v2';
    this.accessToken = this.configService.get<string>('UPSTOX_ACCESS_TOKEN') ?? null;
    this.logger.log(`Order Manager initialized (mode: ${this.sandboxMode ? 'SANDBOX' : 'LIVE'})`);
  }

  @OnEvent('order.intent')
  async executeOrder(intent: OrderIntent): Promise<void> {
    this.logger.log(`Executing Order: ${intent.side} ${intent.quantity} ${intent.instrumentKey} (${intent.orderType})`);
    const startTime = performance.now();

    try {
      let orderId: string;

      if (this.sandboxMode || !this.accessToken) {
        orderId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.logger.log(`[SANDBOX] Simulated order: ${orderId}`);
      } else {
        orderId = await this.placeUpstoxOrder(intent);
      }

      const latencyMs = performance.now() - startTime;

      this.eventEmitter.emit('order.filled', {
        orderId,
        intent,
        latencyMs,
        sandbox: this.sandboxMode || !this.accessToken,
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

  private async placeUpstoxOrder(intent: OrderIntent): Promise<string> {
    const response = await fetch(`${this.upstoxApiUrl}/order/place`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        quantity: intent.quantity,
        product: 'I',
        validity: 'DAY',
        price: 0,
        instrument_token: intent.instrumentKey,
        order_type: intent.orderType,
        transaction_type: intent.side,
        disclosed_quantity: 0,
        trigger_price: 0,
        is_amo: false,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upstox order API error (${response.status}): ${text}`);
    }

    const data = await response.json() as { data?: { order_id?: string } };
    const orderId = data.data?.order_id;
    if (!orderId) {
      throw new Error('No order_id in Upstox response');
    }

    this.logger.log(`[LIVE] Upstox order placed: ${orderId}`);
    return orderId;
  }

  updateAccessToken(token: string) {
    this.accessToken = token;
    this.logger.log('Upstox access token updated');
  }
}
