/**
 * Compute Engine Adapter
 *
 * TypeScript adapter for the Rust-based compute-engine NAPI module.
 * Handles JSON serialization for feature computation with type safety.
 *
 * Architecture:
 * - Phase 1: Dependency computation (VWAP, EMA, ATR, etc.) - Sequential
 * - Phase 2: Feature computation (33 features) - Parallel via Rayon
 *
 * Performance Target: <5ms total (2ms deps + 150µs features + overhead)
 */

import { Logger } from '@nestjs/common';
import type {
  FeatureInput,
  ComputeResult,
  validateFeatureInput,
  validateComputeResult,
} from '@repo/schema';

import computeEngine from '@repo/compute-engine';

export class ComputeEngineAdapter {
  private readonly logger = new Logger(ComputeEngineAdapter.name);
  private isInitialized = false;

  /**
   * Initialize the native compute-engine NAPI module
   * Call this once at service startup
   */
  initialize(): void {
    if (this.isInitialized) {
      this.logger.warn('Compute engine already initialized');
      return;
    }

    try {
      // Pre-warm the global processor (initializes cache + feature registry)
      this.logger.log('Initializing global feature processor...');
      computeEngine.initializeProcessor(26); // 26-period max lookback for EMA26

      this.isInitialized = true;
      this.logger.log('Compute engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to load compute-engine native module', error);
      throw new Error(
        `Compute engine initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Compute all 33 features from market data input
   *
   * @param input - Market data with NIFTY Future, constituents, and options
   * @returns Computed features with per-feature timing logs
   *
   * @throws Error if compute engine is not initialized or computation fails
   */
  computeFeatures(input: FeatureInput): ComputeResult {
    if (!this.isInitialized || !computeEngine) {
      throw new Error(
        'Compute engine not initialized. Call initialize() first.',
      );
    }

    try {
      // Validate input (throws ZodError if invalid)
      const validatedInput = validateFeatureInput(input);

      // Serialize to JSON string (NAPI accepts string due to 32-field limit)
      const inputJson = JSON.stringify(validatedInput);

      // Call Rust function: compute_features(input_json: String) -> String
      const resultJson: string = computeEngine.computeFeatures(inputJson);

      // Deserialize and validate result
      const result = JSON.parse(resultJson);
      const validatedResult = validateComputeResult(result);

      // Log performance metrics
      if (validatedResult.total_duration_micros > 5000) {
        this.logger.warn(
          `Feature computation exceeded 5ms target: ${validatedResult.total_duration_micros}µs`,
        );
      }

      return validatedResult;
    } catch (error) {
      this.logger.error('Feature computation failed', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: input.timestamp,
      });
      throw error;
    }
  }

  /**
   * Update historical cache with new tick data
   *
   * This should be called BEFORE computeFeatures() for each new tick
   * to maintain rolling window cache for VWAP/EMA/ATR calculations.
   *
   * @param input - Market tick data to add to cache
   */
  updateCache(input: FeatureInput): void {
    if (!this.isInitialized || !computeEngine) {
      throw new Error(
        'Compute engine not initialized. Call initialize() first.',
      );
    }

    try {
      const inputJson = JSON.stringify(input);
      computeEngine.updateCache(inputJson);
    } catch (error) {
      this.logger.error('Cache update failed', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: input.timestamp,
      });
      throw error;
    }
  }

  /**
   * Clear historical cache (useful for testing or session reset)
   */
  clearCache(): void {
    if (!this.isInitialized || !computeEngine) {
      throw new Error(
        'Compute engine not initialized. Call initialize() first.',
      );
    }

    computeEngine.clearCache();
    this.logger.log('Historical cache cleared');
  }

  /**
   * Get initialization status
   */
  isReady(): boolean {
    return this.isInitialized && computeEngine !== null;
  }
}
