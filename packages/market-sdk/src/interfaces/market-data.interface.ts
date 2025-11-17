/**
 * Market Data Provider Interface
 * Common interface for all market data providers (Upstox, Yahoo Finance, Binance)
 */

import type {
  ExchangeEnum,
  InstrumentTypeEnum,
  TransactionTypeEnum,
} from "@repo/schema";
import type { z } from "zod";

// Type aliases for convenience
export type Exchange = z.infer<typeof ExchangeEnum>;
export type InstrumentType = z.infer<typeof InstrumentTypeEnum>;
export type OrderSide = z.infer<typeof TransactionTypeEnum>;

// ============================================
// Common Types
// ============================================

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  instrument: string;
  exchange: Exchange;
  lastPrice: number;
  lastQuantity?: number;
  lastTradeTime: Date;
  bidPrice?: number;
  bidQuantity?: number;
  askPrice?: number;
  askQuantity?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho?: number;
  iv: number; // Implied Volatility
}

export interface OptionChainData {
  strike: number;
  expiryDate: Date;
  call: {
    instrument: string;
    lastPrice: number;
    bidPrice?: number;
    askPrice?: number;
    volume: number;
    openInterest: number;
    iv: number;
    greeks?: OptionGreeks;
  };
  put: {
    instrument: string;
    lastPrice: number;
    bidPrice?: number;
    askPrice?: number;
    volume: number;
    openInterest: number;
    iv: number;
    greeks?: OptionGreeks;
  };
}

export interface MarketDepth {
  bids: Array<{ price: number; quantity: number; orders: number }>;
  asks: Array<{ price: number; quantity: number; orders: number }>;
}

export interface InstrumentInfo {
  instrumentKey: string;
  name: string;
  exchange: Exchange;
  type: InstrumentType;
  lotSize?: number;
  tickSize?: number;
  expiryDate?: Date;
  strikePrice?: number;
  optionType?: "CE" | "PE";
  underlyingSymbol?: string;
}

// ============================================
// Market Data Stream Events
// ============================================

export interface MarketDataStreamEvent {
  type: "quote" | "trade" | "depth" | "greeks";
  instrument: string;
  timestamp: Date;
  data: Quote | Trade | MarketDepth | OptionGreeks;
}

export interface Trade {
  instrument: string;
  price: number;
  quantity: number;
  timestamp: Date;
  side?: OrderSide;
}

// ============================================
// Market Data Provider Interface
// ============================================

export interface IMarketDataProvider {
  /**
   * Provider identification
   */
  readonly providerId: string;
  readonly providerName: string;
  readonly supportedExchanges: Exchange[];

  /**
   * Initialize the provider with credentials
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Get current quote for an instrument
   */
  getQuote(instrumentKey: string): Promise<Quote>;

  /**
   * Get multiple quotes in a single request
   */
  getQuotes(instrumentKeys: string[]): Promise<Quote[]>;

  /**
   * Get historical candles
   */
  getHistoricalData(
    instrumentKey: string,
    interval: "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1w" | "1M",
    fromDate: Date,
    toDate: Date
  ): Promise<Candle[]>;

  /**
   * Get option chain for an underlying
   */
  getOptionChain?(
    underlying: string,
    expiryDate?: Date
  ): Promise<OptionChainData[]>;

  /**
   * Get market depth / order book
   */
  getMarketDepth?(instrumentKey: string): Promise<MarketDepth>;

  /**
   * Get option greeks
   */
  getOptionGreeks?(instrumentKey: string): Promise<OptionGreeks>;

  /**
   * Search for instruments
   */
  searchInstruments(
    query: string,
    exchange?: Exchange
  ): Promise<InstrumentInfo[]>;

  /**
   * Get instrument details
   */
  getInstrument(instrumentKey: string): Promise<InstrumentInfo>;

  /**
   * Subscribe to real-time market data
   * Returns an event emitter for streaming data
   */
  subscribeMarketData?(
    instrumentKeys: string[],
    dataTypes: ("quote" | "trade" | "depth" | "greeks")[]
  ): Promise<MarketDataStream>;

  /**
   * Unsubscribe from real-time market data
   */
  unsubscribeMarketData?(instrumentKeys: string[]): Promise<void>;

  /**
   * Check if provider is initialized and ready
   */
  isReady(): boolean;

  /**
   * Clean up resources
   */
  disconnect(): Promise<void>;
}

// ============================================
// Market Data Stream Interface
// ============================================

export interface MarketDataStream {
  on(event: "data", listener: (data: MarketDataStreamEvent) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "close", listener: () => void): void;
  off(
    event: "data" | "error" | "close",
    listener: (...args: any[]) => void
  ): void;
  close(): Promise<void>;
}
