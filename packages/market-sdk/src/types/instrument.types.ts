/**
 * Instrument and Market Data Types
 */

export interface InstrumentKey {
  exchange: string;
  token: string;
  instrumentKey: string; // Format: "NSE_EQ|INE669E01016"
}

export interface Instrument {
  instrumentKey: string;
  exchange: string;
  tradingSymbol: string;
  name: string;
  lastPrice: number;
  expiry?: string; // For derivatives
  strike?: number; // For options
  tickSize: number;
  lotSize: number;
  instrumentType: InstrumentType;
  optionType?: OptionType; // CE or PE
  isin?: string;
}

export enum InstrumentType {
  EQUITY = "EQ",
  FUTURES = "FUT",
  OPTIONS = "OPT",
  CURRENCY = "CUR",
  COMMODITY = "COM",
  INDEX = "INDEX",
}

export enum OptionType {
  CALL = "CE",
  PUT = "PE",
}

export interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  instrumentKey: string;
  lastPrice: number;
  lastQuantity?: number;
  lastTradeTime?: Date;
  averagePrice?: number;
  totalBuyQuantity?: number;
  totalSellQuantity?: number;
  ohlc?: OHLC;
  netChange?: number;
  percentChange?: number;
  openInterest?: number; // For derivatives
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  iv: number; // Implied Volatility
}

export interface OptionChainData {
  instrumentKey: string;
  strike: number;
  expiryDate: string;
  optionType: OptionType;
  lastPrice: number;
  openInterest: number;
  volume: number;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  greeks?: OptionGreeks;
}

export interface MarketQuote extends Quote {
  depth?: MarketDepth;
}

export interface MarketDepth {
  buy: DepthItem[];
  sell: DepthItem[];
}

export interface DepthItem {
  price: number;
  quantity: number;
  orders: number;
}

export interface HistoricalCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
}

export enum CandleInterval {
  ONE_MINUTE = "1minute",
  FIVE_MINUTE = "5minute",
  FIFTEEN_MINUTE = "15minute",
  THIRTY_MINUTE = "30minute",
  ONE_HOUR = "1hour",
  ONE_DAY = "day",
  ONE_WEEK = "week",
  ONE_MONTH = "month",
}
