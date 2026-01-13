import { z } from "zod";

/**
 * Raw Market Data Types (NO ZOD - Internal use only)
 * Represents live data feeds from broker (Upstox/Binance)
 *
 * Note: No runtime validation overhead - these are trusted internal data structures.
 * Use Zod schemas only at API boundaries (frontend validation).
 */

// ============================================
// 1️⃣ NIFTY FUTURE - Primary Price Discovery
// ============================================

export const niftyFutureTickSchema = z.object({
  timestamp: z.number(), // Unix timestamp (ms)
  symbol: z.string(), // e.g., "NIFTY24JANFUT"

  // Price data
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),

  // Market Depth (20 levels)
  bids: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
        orders: z.number().optional(),
      })
    )
    .length(20),

  asks: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
        orders: z.number().optional(),
      })
    )
    .length(20),

  // Derivatives specific
  openInterest: z.number(),
  oiChange: z.number(),

  // Trade data (optional, for tick-by-tick)
  lastTradePrice: z.number().optional(),
  lastTradeQty: z.number().optional(),
  lastTradeTime: z.number().optional(),
});

export type NiftyFutureTick = z.infer<typeof niftyFutureTickSchema>;

// ============================================
// 2️⃣ NIFTY50 CONSTITUENT - Breadth & Confirmation
// ============================================

export const constituentTickSchema = z.object({
  timestamp: z.number(),
  symbol: z.string(), // e.g., "RELIANCE", "TCS"

  // OHLCV (1s or 5s aggregation)
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),

  // Market Depth (20 levels)
  bids: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    )
    .length(20),

  asks: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    )
    .length(20),

  // Computed by broker
  vwap: z.number(),
  totalBuyQty: z.number(),
  totalSellQty: z.number(),
});

export type ConstituentTick = z.infer<typeof constituentTickSchema>;

// Batch of all 50 constituents at timestamp t
export const constituentsBatchSchema = z.object({
  timestamp: z.number(),
  constituents: z.array(constituentTickSchema).length(50),
});

export type ConstituentsBatch = z.infer<typeof constituentsBatchSchema>;

// ============================================
// 3️⃣ NIFTY OPTION CHAIN - ATM ± N Strikes
// ============================================

export const optionTickSchema = z.object({
  timestamp: z.number(),
  symbol: z.string(), // e.g., "NIFTY24JAN21000CE"
  strikePrice: z.number(),
  optionType: z.enum(["CE", "PE"]),
  expiryDate: z.string(), // ISO date

  // Price data
  ltp: z.number(),
  bid: z.number(),
  ask: z.number(),
  bidQty: z.number(),
  askQty: z.number(),

  // Market Depth (simplified for options, usually less liquid)
  bids: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    )
    .max(20),

  asks: z
    .array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    )
    .max(20),

  // Greeks (calculated by broker or compute-engine)
  iv: z.number(), // Implied Volatility
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),

  // Open Interest
  openInterest: z.number(),
  oiChange: z.number(),

  // Volume
  volume: z.number(),
  volumeChange: z.number().optional(),
});

export type OptionTick = z.infer<typeof optionTickSchema>;

// Option chain snapshot (ATM ± 10 strikes = 21 strikes × 2 types = 42 options)
export const optionChainSnapshotSchema = z.object({
  timestamp: z.number(),
  atmStrike: z.number(),
  spotPrice: z.number(), // NIFTY Future LTP (proxy for spot)

  // All options (CE + PE for each strike)
  options: z.array(optionTickSchema),
});

export type OptionChainSnapshot = z.infer<typeof optionChainSnapshotSchema>;

// ============================================
// ❌ NIFTY SPOT (Store but don't use for microstructure)
// ============================================

export const niftySpotTickSchema = z.object({
  timestamp: z.number(),
  symbol: z.literal("NIFTY 50"),
  ltp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  // NO VOLUME, NO LOB
});

export type NiftySpotTick = z.infer<typeof niftySpotTickSchema>;

// ============================================
// Combined Market Snapshot (all feeds at time t)
// ============================================

export const marketSnapshotSchema = z.object({
  timestamp: z.number(),

  // Primary instruments
  niftyFuture: niftyFutureTickSchema,
  niftySpot: niftySpotTickSchema.optional(), // Store but don't rely on

  // Breadth
  constituents: z.array(constituentTickSchema).length(50),

  // Options
  optionChain: optionChainSnapshotSchema,

  // Context
  indiaVix: z.number(),
});

export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
