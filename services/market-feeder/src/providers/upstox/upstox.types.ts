/**
 * Upstox API Types
 * All interfaces for Upstox V3 REST API responses
 * Extracted from the prototype upstox-client.ts for clean separation
 */

// ═══════════════════════════════════════════════════════
// Historical Candle Data
// ═══════════════════════════════════════════════════════

export interface UpstoxCandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  openInterest: number | null;
}

export interface UpstoxHistoricalResponse {
  status: string;
  data: {
    candles: [
      timestamp: string,
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number | null,
      openInterest: number | null,
    ][];
  };
}

export type UpstoxCandleUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
export type ExpiredCandleInterval = '1minute' | '3minute' | '5minute' | '15minute' | '30minute' | 'day';

// ═══════════════════════════════════════════════════════
// Market Quotes
// ═══════════════════════════════════════════════════════

export type UpstoxSegment =
  | 'NSE_EQ' | 'NSE_INDEX' | 'NSE_FO' | 'NCD_FO'
  | 'BSE_EQ' | 'BSE_INDEX' | 'BSE_FO' | 'BCD_FO'
  | 'MCX_FO' | 'MCX_COM';

export interface UpstoxMarketQuote {
  ohlc: { open: number; high: number; low: number; close: number };
  depth: {
    buy: Array<{ quantity: number; price: number; orders: number }>;
    sell: Array<{ quantity: number; price: number; orders: number }>;
  };
  timestamp: string;
  instrument_token: string;
  symbol: string;
  last_price: number;
  volume?: number;
  average_price?: number;
  oi?: number;
  net_change: number;
  total_buy_quantity?: number;
  total_sell_quantity?: number;
  lower_circuit_limit?: number;
  upper_circuit_limit?: number;
  last_trade_time?: string;
  oi_day_high?: number;
  oi_day_low?: number;
}

export interface UpstoxMarketQuoteResponse {
  status: string;
  data: Record<string, UpstoxMarketQuote>;
}

// ═══════════════════════════════════════════════════════
// Expired Instruments
// ═══════════════════════════════════════════════════════

export interface ExpiriesResponse {
  status: string;
  data: string[]; // YYYY-MM-DD
}

export interface ExpiredFutureContract {
  name: string;
  segment: UpstoxSegment;
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: string;
  instrument_key: string;
  exchange_token: string;
  trading_symbol: string;
  tick_size: number;
  lot_size: number;
  instrument_type: 'FUT';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type: 'INDEX' | 'EQUITY' | 'COMMODITY' | 'CUR' | 'IRD' | 'COM' | null;
  underlying_symbol: string;
  minimum_lot: number;
}

export interface ExpiredOptionContract {
  name: string;
  segment: UpstoxSegment;
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: string;
  instrument_key: string;
  exchange_token: string;
  trading_symbol: string;
  tick_size: number;
  lot_size: number;
  instrument_type: 'CE' | 'PE';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type: 'INDEX' | 'EQUITY' | 'COMMODITY' | 'CUR' | 'IRD' | 'COM' | null;
  underlying_symbol: string;
  strike_price: number;
  minimum_lot: number;
  weekly: boolean;
}

export interface ExpiredFutureContractsResponse {
  status: string;
  data: ExpiredFutureContract[];
}

export interface ExpiredOptionContractsResponse {
  status: string;
  data: ExpiredOptionContract[];
}

// ═══════════════════════════════════════════════════════
// Active Option Contracts
// ═══════════════════════════════════════════════════════

export interface ActiveOptionContract {
  name: string;
  segment: 'NSE_FO' | 'BSE_FO' | 'MCX_FO' | 'NCD_FO' | 'BCD_FO';
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: string;
  instrument_key: string;
  exchange_token: string;
  trading_symbol: string;
  tick_size: number;
  lot_size: number;
  instrument_type: 'CE' | 'PE';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type: 'INDEX' | 'EQUITY' | 'COM' | 'CUR' | 'IRD';
  underlying_symbol: string;
  strike_price: number;
  minimum_lot: number;
  weekly: boolean;
}

export interface OptionContractsResponse {
  status: string;
  data: ActiveOptionContract[];
}

// ═══════════════════════════════════════════════════════
// Option Chain
// ═══════════════════════════════════════════════════════

export interface OptionChainMarketData {
  ltp: number;
  volume: number;
  oi: number;
  close_price: number;
  bid_price: number;
  bid_qty: number;
  ask_price: number;
  ask_qty: number;
  prev_oi: number;
}

export interface OptionChainGreeks {
  vega: number;
  theta: number;
  gamma: number;
  delta: number;
  iv: number;
  pop: number;
}

export interface OptionChainItem {
  expiry: string;
  pcr: number;
  strike_price: number;
  underlying_key: string;
  underlying_spot_price: number;
  call_options: {
    instrument_key: string;
    market_data: OptionChainMarketData;
    option_greeks: OptionChainGreeks;
  };
  put_options: {
    instrument_key: string;
    market_data: OptionChainMarketData;
    option_greeks: OptionChainGreeks;
  };
}

export interface OptionChainResponse {
  status: string;
  data: OptionChainItem[];
}

// ═══════════════════════════════════════════════════════
// Option Greeks (Market Quote)
// ═══════════════════════════════════════════════════════

export interface OptionGreekQuote {
  last_price: number;
  instrument_token: string;
  ltq: number;
  volume: number;
  cp: number;
  iv: number;
  vega: number;
  gamma: number;
  theta: number;
  delta: number;
  oi: number;
}

export interface OptionGreeksResponse {
  status: string;
  data: Record<string, OptionGreekQuote>;
}

// ═══════════════════════════════════════════════════════
// Funds & Margin
// ═══════════════════════════════════════════════════════

export interface FundMarginSegment {
  used_margin: number;
  payin_amount: number;
  span_margin: number;
  adhoc_margin: number;
  notional_cash: number;
  available_margin: number;
  exposure_margin: number;
}

export interface FundsAndMarginResponse {
  status: string;
  data: {
    equity: FundMarginSegment;
    commodity: FundMarginSegment;
  };
}
