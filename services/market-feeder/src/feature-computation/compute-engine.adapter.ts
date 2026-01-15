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
 *
 * NAPI-RS 3.0 Integration:
 * - Auto-generated bindings in @repo/compute-engine package
 * - Functions are automatically registered via #[napi] macro
 * - No manual module initialization required
 */

import { Logger } from '@nestjs/common';
import {
  type FeatureInput,
  type ComputeResult,
  validateFeatureInput,
  validateComputeResult,
} from '@repo/schema';

// Import NAPI-RS auto-generated module
// This is the .node binary compiled from Rust
import { computeFeatures } from '@repo/compute-engine';

/**
 * TypeScript adapter for Rust compute-engine NAPI module
 *
 * NAPI-RS 3.0 Pattern:
 * - Functions exported via #[napi] are automatically available
 * - No need for manual initialization (Rust uses Lazy static)
 * - Cache is managed internally in Rust global state
 */
export class ComputeEngineAdapter {
  private readonly logger = new Logger(ComputeEngineAdapter.name);

  /**
   * Compute all 33 features from market data input
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
  computeFeatures(input: FeatureInput): ComputeResult {
    try {
      // Validate input (throws ZodError if invalid)
      const validatedInput = validateFeatureInput(input);

      // Serialize to JSON string
      // Why JSON? NAPI has 32-field limit on objects, FeatureOutput has 34 fields
      const inputJson = JSON.stringify(validatedInput);

      // Call Rust NAPI function: #[napi] pub fn compute_features(input_json: String) -> String
      // This updates internal cache and computes all features in parallel
      const resultJson: string = computeFeatures(inputJson);

      // Deserialize and validate result
      const result = JSON.parse(resultJson) as unknown;
      const validatedResult = validateComputeResult(result);

      // Performance monitoring
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
