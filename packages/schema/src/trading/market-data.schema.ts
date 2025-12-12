/**
 * Market Data Schemas
 * Comprehensive schemas for instruments, quotes, option chains, and market depth
 */

import { z } from "zod";
import { ExchangeEnum, InstrumentTypeEnum, OptionTypeEnum } from "./index";

// ============================================
// Instrument Schemas
// ============================================

export const instrumentKeySchema = z.object({
  exchange: ExchangeEnum,
  token: z.string(),
  instrumentKey: z.string(), // Format: "NSE_EQ|INE669E01016"
});

export type InstrumentKey = z.infer<typeof instrumentKeySchema>;

export const instrumentSchema = z.object({
  instrumentKey: z.string(),
  exchange: ExchangeEnum,
  tradingSymbol: z.string(),
  name: z.string(),
  lastPrice: z.number(),
  expiry: z.string().optional(), // For derivatives
  strike: z.number().optional(), // For options
  tickSize: z.number(),
  lotSize: z.number(),
  instrumentType: InstrumentTypeEnum,
  optionType: OptionTypeEnum.optional(), // CE or PE
  isin: z.string().optional(),
  underlyingSymbol: z.string().optional(),
});

export type Instrument = z.infer<typeof instrumentSchema>;

// ============================================
// OHLC and Candle Schemas
// ============================================

export const ohlcSchema = z.object({
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export type OHLC = z.infer<typeof ohlcSchema>;

export const candleSchema = z.object({
  timestamp: z.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export type Candle = z.infer<typeof candleSchema>;

// ============================================
// Quote Schemas
// ============================================

export const quoteSchema = z.object({
  instrumentKey: z.string(),
  exchange: ExchangeEnum,
  lastPrice: z.number(),
  lastQuantity: z.number().optional(),
  lastTradeTime: z.date().optional(),
  averagePrice: z.number().optional(),
  totalBuyQuantity: z.number().optional(),
  totalSellQuantity: z.number().optional(),
  ohlc: ohlcSchema.optional(),
  netChange: z.number().optional(),
  percentChange: z.number().optional(),
  openInterest: z.number().optional(), // For derivatives
  bidPrice: z.number().optional(),
  bidQuantity: z.number().optional(),
  askPrice: z.number().optional(),
  askQuantity: z.number().optional(),
  volume: z.number().optional(),
});

export type Quote = z.infer<typeof quoteSchema>;

// ============================================
// Option Greeks Schemas
// ============================================

export const optionGreeksSchema = z.object({
  delta: z.number(),
  gamma: z.number(),
  theta: z.number(),
  vega: z.number(),
  rho: z.number().optional(),
  iv: z.number(), // Implied Volatility
});

export type OptionGreeks = z.infer<typeof optionGreeksSchema>;

// ============================================
// Option Chain Schemas
// ============================================

export const optionChainDataSchema = z.object({
  instrumentKey: z.string(),
  strike: z.number(),
  expiryDate: z.string().or(z.date()),
  optionType: OptionTypeEnum,
  lastPrice: z.number(),
  openInterest: z.number(),
  volume: z.number(),
  bidPrice: z.number(),
  bidQty: z.number(),
  askPrice: z.number(),
  askQty: z.number(),
  greeks: optionGreeksSchema.optional(),
  iv: z.number().optional(),
});

export type OptionChainData = z.infer<typeof optionChainDataSchema>;

export const optionChainStrikeSchema = z.object({
  strike: z.number(),
  expiryDate: z.date(),
  call: z.object({
    instrument: z.string(),
    instrumentKey: z.string(),
    lastPrice: z.number(),
    bidPrice: z.number().optional(),
    askPrice: z.number().optional(),
    volume: z.number(),
    openInterest: z.number(),
    iv: z.number(),
    greeks: optionGreeksSchema.optional(),
  }),
  put: z.object({
    instrument: z.string(),
    instrumentKey: z.string(),
    lastPrice: z.number(),
    bidPrice: z.number().optional(),
    askPrice: z.number().optional(),
    volume: z.number(),
    openInterest: z.number(),
    iv: z.number(),
    greeks: optionGreeksSchema.optional(),
  }),
});

export type OptionChainStrike = z.infer<typeof optionChainStrikeSchema>;

// ============================================
// Market Depth Schemas
// ============================================

export const depthItemSchema = z.object({
  price: z.number(),
  quantity: z.number(),
  orders: z.number(),
});

export type DepthItem = z.infer<typeof depthItemSchema>;

export const marketDepthSchema = z.object({
  buy: z.array(depthItemSchema),
  sell: z.array(depthItemSchema),
});

export type MarketDepth = z.infer<typeof marketDepthSchema>;

export const marketQuoteSchema = quoteSchema.extend({
  depth: marketDepthSchema.optional(),
});

export type MarketQuote = z.infer<typeof marketQuoteSchema>;
