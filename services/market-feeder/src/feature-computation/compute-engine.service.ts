import { Injectable, Logger } from '@nestjs/common';
import { ComputeEngineAdapter } from './compute-engine.adapter';
import type { FeatureInput, ComputeResult } from '@repo/schema';

/**
 * Compute Engine Service
 *
 * Type-safe TypeScript wrapper for Rust compute-engine (NAPI-RS).
 * Handles feature calculation using high-performance Rust code.
 *
 * Features computed (33 total):
 * - Index Breadth (6): pct stocks above VWAP/EMA20, weighted returns, breadth metrics
 * - NIFTY Future (9): price vs VWAP, range position, returns, ATR, RSI, MACD
 * - Options (11): ATM IV, Greeks (gamma, vega, theta, charm, vanna), PCR ratios
 * - Volatility (4): India VIX, realized vol, vol expansion ratio
 * - Time Context (3): minutes from open, to close, day of week
 */
@Injectable()
export class ComputeEngineService {
  private readonly logger = new Logger(ComputeEngineService.name);
  private readonly adapter: ComputeEngineAdapter;

  constructor() {
    this.adapter = new ComputeEngineAdapter();

    // NAPI-RS 3.0: Module auto-loads on first require
    // No explicit initialization needed
    if (this.adapter.isReady()) {
      this.logger.log('Compute engine service ready');
    } else {
      this.logger.warn('Compute engine module not loaded');
    }
  }

  /**
   * Compute all 33 features from market data input
   *
   * NAPI-RS 3.0 Pattern:
   * - Cache is updated automatically inside Rust compute_features()
   * - No separate updateCache() call needed
   * - Rust manages global state via Lazy<Mutex<HistoricalCache>>
   *
   * @param input - Market data with NIFTY Future, constituents, and options
   * @returns Computed features with per-feature timing logs
   */
  computeFeatures(input: FeatureInput): ComputeResult {
    try {
      // Call adapter (synchronous call to Rust NAPI function)
      // Rust internally: updates cache → computes dependencies → parallel features
      const result = this.adapter.computeFeatures(input);

      this.logger.debug(
        `Features computed in ${result.total_duration_micros}µs`,
      );

      return result;
    } catch (error) {
      this.logger.error('Feature computation failed', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: input.timestamp,
      });
      throw error;
    }
  }

  /**
   * Health check: Verify compute-engine module is loaded
   */
  healthCheck(): boolean {
    return this.adapter.isReady();
  }
}
