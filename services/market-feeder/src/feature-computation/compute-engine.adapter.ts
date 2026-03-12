import { Injectable, Logger } from '@nestjs/common';
import { computeFeatures, type FeatureInput } from '@repo/compute-engine';

/**
 * TypeScript adapter for Rust compute-engine NAPI module
 *
 * NAPI-RS 3.0 Pattern:
 * - Functions exported via #[napi] are automatically available
 * - No need for manual initialization (Rust uses Lazy static)
 * - Cache is managed internally in Rust global state
 */

@Injectable()
export class ComputeEngineAdapter {
  private readonly logger = new Logger(ComputeEngineAdapter.name);

  /**
   * Compute all 117 features from market data input
   *
   * Pattern: JSON serialization (avoids NAPI 32-field object limit)
   * - Input: Zod-validated FeatureInput → JSON string
   * - Rust: Deserialize → Compute → Serialize
   * - Output: JSON string → Zod-validated ComputeResult
   *
   * @param input - Market data with NIFTY Future, constituents, and options
   * @returns Computed features with per-feature timing logs
   *
   * @throws Error if validation fails or computation errors
   */
  computeFeatures(input: FeatureInput) {
    try {
      // Call Rust NAPI function: #[napi] pub fn compute_features(input_json: String) -> String
      // This updates internal cache and computes all features in parallel
      const result = computeFeatures(input);

      // Performance monitoring
      if (result.totalDurationMicros > 5000) {
        this.logger.warn(
          `Feature computation exceeded 5ms target: ${result.totalDurationMicros}µs`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Feature computation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if compute engine module is loaded
   *
   * NAPI-RS 3.0: Module is loaded on first require, no explicit init needed
   */
  isReady(): boolean {
    try {
      // Test if the function exists
      return typeof computeFeatures === 'function';
    } catch {
      return false;
    }
  }
}
