import { Injectable, Logger } from '@nestjs/common';
import type { JsMarketDataPoint, JsFeatureVector } from '@repo/compute-engine';

// Dynamic import of native module
let computeEngine: typeof import('@repo/compute-engine') | null = null;

/**
 * Compute Engine Service
 *
 * Type-safe TypeScript wrapper for Rust compute-engine (NAPI-RS).
 * Handles feature calculation using high-performance Rust code.
 *
 * Features computed (33 total):
 * - Market Structure (8): price vs VWAP, highs/lows, range position
 * - Momentum & Trend (8): RSI, MACD, EMA slopes, ADX, ROC
 * - Volatility (5): ATR, realized vol, vol expansion, India VIX
 * - Options (9): ATM IV, Greeks, PCR, max pain distance
 * - Time Context (3): minutes from open, to close, day of week
 */
@Injectable()
export class ComputeEngineService {
  private readonly logger = new Logger(ComputeEngineService.name);
  private isInitialized = false;

  constructor() {
    void this.initialize();
  }

  /**
   * Initialize compute-engine native module
   */
  private async initialize(): Promise<void> {
    try {
      // Dynamically import native module
      computeEngine = await import('@repo/compute-engine');
      this.isInitialized = true;
      this.logger.log('Compute engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to load compute-engine native module', error);
      throw error;
    }
  }

  /**
   * Compute features for a batch of market data
   *
   * @param inputData - Array of market tick/candle data
   * @returns Array of feature vectors (33 features each)
   *
   * Type-safe end-to-end: TypeScript types auto-generated from Rust
   */
  async computeFeatures(
    inputData: JsMarketDataPoint[],
  ): Promise<JsFeatureVector[]> {
    if (!this.isInitialized || !computeEngine) {
      await this.initialize();
    }

    if (!computeEngine) {
      throw new Error('Compute engine not available');
    }

    try {
      this.logger.debug(
        `Computing features for ${inputData.length} data points`,
      );

      // Call Rust function (zero-copy via NAPI-RS)
      const features = computeEngine.computeFeaturesNapi(inputData);

      this.logger.debug(
        `Features computed: ${features.length} rows × 33 features`,
      );

      return features;
    } catch (error) {
      this.logger.error('Feature computation failed', error);
      throw error;
    }
  }

  /**
   * Health check: Verify compute-engine module is loaded
   */
  async healthCheck(): Promise<boolean> {
    return this.isInitialized && computeEngine !== null;
  }
}
