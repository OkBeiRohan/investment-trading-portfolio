import { Injectable, Logger } from "@nestjs/common";
import { CircuitBreakerConfig } from "../core/types";

enum CircuitBreakerState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Blocking requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

interface CircuitState {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  nextAttempt: number;
  lastStateChange: number;
}

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily blocking requests
 * to failing services.
 *
 * States:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 *
 * @example
 * ```typescript
 * if (circuitBreaker.isOpen('upstox')) {
 *   throw new ServiceUnavailableError('Upstox');
 * }
 *
 * try {
 *   const result = await apiCall();
 *   circuitBreaker.recordSuccess('upstox');
 *   return result;
 * } catch (error) {
 *   circuitBreaker.recordFailure('upstox');
 *   throw error;
 * }
 * ```
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitState>();

  // Default configuration
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5, // Open after 5 failures
    successThreshold: 2, // Close after 2 successes in HALF_OPEN
    timeout: 60000, // Try again after 60s
  };

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(provider: string): boolean {
    const circuit = this.getCircuit(provider);

    if (circuit.state === CircuitBreakerState.OPEN) {
      // Check if timeout has elapsed
      if (Date.now() >= circuit.nextAttempt) {
        this.transitionToHalfOpen(provider);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record successful request
   */
  recordSuccess(provider: string): void {
    const circuit = this.getCircuit(provider);

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      circuit.successCount++;

      if (circuit.successCount >= this.defaultConfig.successThreshold) {
        this.transitionToClosed(provider);
      }
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success
      circuit.failureCount = 0;
    }
  }

  /**
   * Record failed request
   */
  recordFailure(provider: string): void {
    const circuit = this.getCircuit(provider);

    circuit.failureCount++;

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen(provider);
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      if (circuit.failureCount >= this.defaultConfig.failureThreshold) {
        this.transitionToOpen(provider);
      }
    }
  }

  /**
   * Get current state
   */
  getState(provider: string): CircuitBreakerState {
    return this.getCircuit(provider).state;
  }

  /**
   * Reset circuit to CLOSED
   */
  reset(provider: string): void {
    this.logger.log(`Manually resetting circuit breaker for ${provider}`);
    this.transitionToClosed(provider);
  }

  private getCircuit(provider: string): CircuitState {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        nextAttempt: 0,
        lastStateChange: Date.now(),
      });
    }
    return this.circuits.get(provider)!;
  }

  private transitionToClosed(provider: string): void {
    const circuit = this.getCircuit(provider);
    circuit.state = CircuitBreakerState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastStateChange = Date.now();

    this.logger.log(`Circuit breaker for ${provider}: OPEN → CLOSED`);
  }

  private transitionToOpen(provider: string): void {
    const circuit = this.getCircuit(provider);
    circuit.state = CircuitBreakerState.OPEN;
    circuit.nextAttempt = Date.now() + this.defaultConfig.timeout;
    circuit.lastStateChange = Date.now();

    this.logger.warn(
      `Circuit breaker for ${provider}: ${circuit.state} → OPEN (retry after ${this.defaultConfig.timeout}ms)`
    );
  }

  private transitionToHalfOpen(provider: string): void {
    const circuit = this.getCircuit(provider);
    circuit.state = CircuitBreakerState.HALF_OPEN;
    circuit.successCount = 0;
    circuit.failureCount = 0;
    circuit.lastStateChange = Date.now();

    this.logger.log(
      `Circuit breaker for ${provider}: OPEN → HALF_OPEN (testing recovery)`
    );
  }
}
