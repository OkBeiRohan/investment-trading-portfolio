/**
 * Raw Market Data Types (NO ZOD - Internal use only)
 * Represents live data feeds from broker (Upstox/Binance)
 *
 * Note: No runtime validation overhead - these are trusted internal data structures.
 * Use Zod schemas only at API boundaries (frontend validation).
 */

// ============================================
// Core Market Data Structure (UNIFIED)
// ============================================

export interface BidAskLevel {
  price: number;
  quantity: number;
  orders?: number;
}

/**
 * Unified Market Tick (works for Futures, Stocks, Options)
 * Instrument type is determined by instrumentType field
 */
export interface MarketTick {
  timestamp: number; // Unix timestamp (ms)
  symbol: string;
  instrumentType: "FUTURE" | "EQUITY" | "OPTION" | "INDEX";

  // Price data (OHLCV)
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  // Market Depth (20 levels)
  bids: BidAskLevel[];
  asks: BidAskLevel[];

  // Derivatives specific (for FUTURE and OPTION)
  openInterest?: number;
  oiChange?: number;

  // Options specific
  strikePrice?: number;
  optionType?: "CE" | "PE";
  expiryDate?: string; // ISO date

  // Greeks (for OPTIONS - can be broker-provided or computed)
  iv?: number;
  delta?: number;
  gamma?: number;
  vega?: number;
  theta?: number;

  // Broker-calculated (mainly for EQUITY)
  vwap?: number;
  totalBuyQty?: number;
  totalSellQty?: number;

  // Trade data (optional)
  lastTradePrice?: number;
  lastTradeQty?: number;
  lastTradeTime?: number;
  volumeChange?: number;
}

/**
 * Market Snapshot at time t
 * Contains all subscribed instruments
 */
export interface MarketSnapshot {
  timestamp: number;

  // Primary instruments
  niftyFuture: MarketTick; // instrumentType: "FUTURE"
  niftySpot?: MarketTick; // instrumentType: "INDEX" (optional, not used for trading)

  // Breadth (50 constituents)
  constituents: MarketTick[]; // instrumentType: "EQUITY", length: 50

  // Options (ATM ± N strikes)
  options: MarketTick[]; // instrumentType: "OPTION"

  // Context
  indiaVix: number;
}

/**
 * Option Chain Snapshot (convenience view)
 */
export interface OptionChainSnapshot {
  timestamp: number;
  atmStrike: number;
  spotPrice: number; // NIFTY Future LTP (proxy for spot)
  options: MarketTick[]; // Only OPTIONS
}

/**
 * Constituents Batch (convenience view)
 */
export interface ConstituentsBatch {
  timestamp: number;
  constituents: MarketTick[]; // Only EQUITY, length: 50
}
