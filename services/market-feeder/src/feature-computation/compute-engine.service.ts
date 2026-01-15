import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ComputeEngineAdapter } from './compute-engine.adapter';
import type { FeatureInput, ComputeResult } from '@repo/schema/compute-engine';

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
export class ComputeEngineService implements OnModuleInit {
  private readonly logger = new Logger(ComputeEngineService.name);
  private readonly adapter: ComputeEngineAdapter;

  constructor() {
    this.adapter = new ComputeEngineAdapter();
  }

  /**
   * Initialize compute engine on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.adapter.initialize();
      this.logger.log('Compute engine service ready');
    } catch (error) {
      this.logger.error('Failed to initialize compute engine', error);
      throw error;
    }
  }

  /**
   * Compute all 33 features from market data input
   *
   * @param input - Market data with NIFTY Future, constituents, and options
   * @returns Computed features with per-feature timing logs
   */
  async computeFeatures(input: FeatureInput): Promise<ComputeResult> {
    try {
      // Update cache with new tick data
      this.adapter.updateCache(input);

      // Compute features
      const result = await this.adapter.computeFeatures(input);

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
  // async healthCheck(): Promise<boolean> {
  //   return this.isInitialized && computeEngine !== null;
  // }
}
