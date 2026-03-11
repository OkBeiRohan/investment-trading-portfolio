import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  
  private consecutiveFailures = 0;
  private isCircuitOpen = false;
  
  private readonly FAILURE_THRESHOLD = 3; 

  /**
   * Listens for Order Failures. If Upstox / Network is down, 
   * trips the circuit to safely halt all live trading.
   */
  @OnEvent('order.failed')
  handleOrderFailure(payload: any) {
    this.consecutiveFailures++;
    this.logger.warn(`Failure ${this.consecutiveFailures}/${this.FAILURE_THRESHOLD} recorded: ${payload.reason}`);

    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD && !this.isCircuitOpen) {
      this.tripCircuit();
    }
  }

  @OnEvent('order.filled')
  handleOrderSuccess() {
    if (this.consecutiveFailures > 0) {
       this.consecutiveFailures = 0; // Reset
       this.logger.debug('Circuit Breaker consecutive failures reset to 0');
    }
  }

  private tripCircuit() {
    this.isCircuitOpen = true;
    this.logger.error('🚨 CIRCUIT BREAKER TRIPPED! 🚨 Halting all Execution logic until manual intervention.');
    
    // In a real scenario:
    // 1. Fire webhook to PagerDuty/Slack
    // 2. Shut down Redis consumer streams from Rust
    // 3. Cancel all pending limit orders
  }

  circuitStatus(): boolean {
    return this.isCircuitOpen;
  }
}
