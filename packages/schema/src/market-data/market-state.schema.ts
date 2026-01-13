/**
 * Market State Encoder (MSE) Output Schemas
 * Compressed, model-ready state representation
 */

import { z } from "zod";

// ============================================
// MSE Component States
// ============================================

// A. Macro State (from 50 constituents → compressed)
export const macroStateSchema = z.object({
  // Breadth indicators (50 stocks → 6 numbers)
  pctStocksAboveVwap: z.number().min(0).max(1), // 0.0 to 1.0
  pctStocksAboveEma20: z.number().min(0).max(1),
  weightedReturnTop10: z.number(), // Weighted avg return of top 10 by weight
  advanceDeclineRatio: z.number(), // Advancing / Declining
  breadthMomentum5m: z.number(), // Rate of change in breadth
  breadthVolatility: z.number(), // Std dev of constituent returns
});

export type MacroState = z.infer<typeof macroStateSchema>;

// B. Micro State (NIFTY Future microstructure)
export const microStateSchema = z.object({
  // Price vs VWAP
  futPriceVsVwap: z.number(), // (price - vwap) / vwap

  // Range position
  futRangePosition: z.number().min(0).max(1), // (close - low) / (high - low)

  // Returns
  futReturn1m: z.number(),
  futReturn5m: z.number(),

  // Volatility
  futAtrPercent: z.number(), // ATR as % of price

  // Volume
  futVolumeZscore: z.number(), // Z-score vs 20-period MA

  // Open Interest
  futOiChange: z.number(),
});

export type MicroState = z.infer<typeof microStateSchema>;

// C. Volatility State (options + VIX)
export const volatilityStateSchema = z.object({
  // ATM IV
  atmIv: z.number(),
  atmIvChange: z.number(), // Change from 5min ago

  // IV Skew
  ivSkew: z.number(), // OTM_call_iv - OTM_put_iv

  // Greeks (ATM weighted average)
  gammaAtm: z.number(),
  vegaAtm: z.number(),
  thetaAtm: z.number(),

  // Put-Call Ratios
  pcrOi: z.number(), // Put OI / Call OI
  pcrVolume: z.number(), // Put Vol / Call Vol

  // Max Pain
  maxPainDistance: z.number(), // (spot - max_pain) / spot

  // Context
  indiaVix: z.number(),
  realizedVol5m: z.number(), // Realized vol from future returns
  volExpansionRatio: z.number(), // IV / realized_vol
});

export type VolatilityState = z.infer<typeof volatilityStateSchema>;

// D. Execution State (LOB quality for entry/exit)
export const executionStateSchema = z.object({
  // Future LOB
  futBidAskSpread: z.number(),
  futBidAskSpreadBps: z.number(), // Spread in basis points
  futLobImbalance: z.number(), // (bid_qty - ask_qty) / (bid_qty + ask_qty)
  futLobDepth: z.number(), // Total liquidity in top 5 levels

  // Option LOB (for selected strike, updated in real-time)
  optionBidAskSpread: z.number().optional(),
  optionBidAskSpreadPct: z.number().optional(),
  optionLobImbalance: z.number().optional(),
});

export type ExecutionState = z.infer<typeof executionStateSchema>;

// E. Portfolio State (current positions, if any)
export const portfolioStateSchema = z.object({
  hasPosition: z.boolean(),
  positionType: z.enum(["long", "short", "none"]),
  unrealizedPnl: z.number(),
  unrealizedPnlPct: z.number(),
  positionDuration: z.number(), // Seconds since entry

  // Greeks exposure (if holding options)
  netDelta: z.number().optional(),
  netGamma: z.number().optional(),
  netTheta: z.number().optional(),
});

export type PortfolioState = z.infer<typeof portfolioStateSchema>;

// ============================================
// Complete Market State (MSE Output)
// ============================================

export const marketStateSchema = z.object({
  timestamp: z.number(),

  // 5 state components
  macroState: macroStateSchema,
  microState: microStateSchema,
  volatilityState: volatilityStateSchema,
  executionState: executionStateSchema,
  portfolioState: portfolioStateSchema,

  // Time context
  minutesFromOpen: z.number(),
  minutesToClose: z.number(),
  dayOfWeek: z.number().min(0).max(6), // 0 = Monday
});

export type MarketState = z.infer<typeof marketStateSchema>;

// ============================================
// MSE Metadata (quality checks)
// ============================================

export const mseMetadataSchema = z.object({
  computationTimeMs: z.number(),
  missingDataFields: z.array(z.string()),
  dataQuality: z.enum(["high", "medium", "low"]),
  stallDetected: z.boolean(), // If data hasn't updated for >1s
});

export type MSEMetadata = z.infer<typeof mseMetadataSchema>;

export const marketStateWithMetadataSchema = z.object({
  state: marketStateSchema,
  metadata: mseMetadataSchema,
});

export type MarketStateWithMetadata = z.infer<
  typeof marketStateWithMetadataSchema
>;
