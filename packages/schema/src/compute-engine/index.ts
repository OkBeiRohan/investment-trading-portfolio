/**
 * Compute Engine Type Definitions
 * Auto-generated from Rust types via JSON serialization
 */

import { z } from "zod";

// ============================================
// INPUT TYPES
// ============================================

export const FutureTickSchema = z.object({
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  open_interest: z.number(),
  // NOTE: VWAP is COMPUTED from historical cache, not provided as input
});
export type FutureTick = z.infer<typeof FutureTickSchema>;

export const ConstituentTickSchema = z.object({
  symbol: z.string(),
  ltp: z.number(),
  open: z.number(),
  volume: z.number(),
  // NOTE: VWAP is COMPUTED from historical cache, not provided as input
});
export type ConstituentTick = z.infer<typeof ConstituentTickSchema>;

export const OptionTickSchema = z.object({
  strike: z.number(),
  option_type: z.enum(["CE", "PE"]),
  ltp: z.number(),
  iv: z.number(),
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  open_interest: z.number(),
  volume: z.number(),
});
export type OptionTick = z.infer<typeof OptionTickSchema>;

export const FeatureInputSchema = z.object({
  timestamp: z.number(), // Unix timestamp in milliseconds
  nifty_future: FutureTickSchema,
  constituents: z.array(ConstituentTickSchema), // 50 stocks
  options: z.array(OptionTickSchema),
  india_vix: z.number().optional(),
});
export type FeatureInput = z.infer<typeof FeatureInputSchema>;

// ============================================
// OUTPUT TYPES
// ============================================

export const FeatureOutputSchema = z.object({
  timestamp: z.number(),

  // ========== INDEX BREADTH (6) ==========
  pct_stocks_above_vwap: z.number(),
  pct_stocks_above_ema20: z.number(),
  weighted_return_top10: z.number(),
  advance_decline_ratio: z.number(),
  breadth_momentum_5m: z.number(),
  breadth_volatility: z.number(),

  // ========== NIFTY FUTURE (9) ==========
  fut_price_vs_vwap: z.number(),
  fut_range_position: z.number(),
  fut_return_1m: z.number(),
  fut_return_5m: z.number(),
  fut_atr_percent: z.number(),
  fut_volume_zscore: z.number(),
  fut_oi_change: z.number(),
  fut_rsi_14: z.number(),
  fut_macd: z.number(),

  // ========== OPTIONS (11) ==========
  atm_iv: z.number(),
  atm_iv_change: z.number(),
  iv_skew: z.number(),
  gamma_atm: z.number(),
  vega_atm: z.number(),
  theta_atm: z.number(),
  pcr_oi: z.number(),
  pcr_volume: z.number(),
  max_pain_distance: z.number(),
  charm_atm: z.number(),
  vanna_atm: z.number(),

  // ========== VOLATILITY (4) ==========
  india_vix: z.number(),
  realized_vol_5m: z.number(),
  realized_vol_15m: z.number(),
  vol_expansion_ratio: z.number(),

  // ========== TIME CONTEXT (3) ==========
  minutes_from_open: z.number(),
  minutes_to_close: z.number(),
  day_of_week: z.number(),
});
export type FeatureOutput = z.infer<typeof FeatureOutputSchema>;

export const FeatureTimingLogSchema = z.object({
  feature_name: z.string(),
  duration_micros: z.number(),
});
export type FeatureTimingLog = z.infer<typeof FeatureTimingLogSchema>;

export const ComputeResultSchema = z.object({
  features: FeatureOutputSchema,
  timings: z.array(FeatureTimingLogSchema),
  total_duration_micros: z.number(),
});
export type ComputeResult = z.infer<typeof ComputeResultSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate feature input before passing to compute engine
 */
export function validateFeatureInput(input: FeatureInput): FeatureInput {
  return FeatureInputSchema.parse(input);
}

/**
 * Validate compute result after receiving from compute engine
 */
export function validateComputeResult(result: ComputeResult): ComputeResult {
  return ComputeResultSchema.parse(result);
}
