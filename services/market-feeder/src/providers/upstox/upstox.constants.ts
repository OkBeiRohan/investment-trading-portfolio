/**
 * Upstox Constants
 * Instrument keys, API limits, and static configuration
 */

// ═══════════════════════════════════════════════════════
// Rate Limits (Upstox Plus Account)
// ═══════════════════════════════════════════════════════

export const UPSTOX_RATE_LIMITS = {
  /** Requests per second for REST APIs */
  REQUESTS_PER_SECOND: 25,
  /** Requests per minute for REST APIs */
  REQUESTS_PER_MINUTE: 250,
  /** WebSocket connections (Plus) */
  WS_CONNECTIONS: 5,
  /** D30 instruments per WS connection (Plus) */
  D30_PER_CONNECTION: 50,
  /** LTPC instruments per WS connection */
  LTPC_PER_CONNECTION: 5000,
  /** Option Greeks instruments per WS connection */
  GREEKS_PER_CONNECTION: 2000,
} as const;

// ═══════════════════════════════════════════════════════
// Data Availability Constraints
// ═══════════════════════════════════════════════════════

export const UPSTOX_DATA_AVAILABILITY = {
  /** Earliest date for minute/hour candles */
  MINUTE_START: new Date('2022-01-01'),
  /** Earliest date for daily/weekly/monthly candles */
  DAILY_START: new Date('2000-01-01'),
  /** Max date range per request: minutes (1-15 min interval) = 1 month */
  MINUTE_SMALL_RANGE_DAYS: 31,
  /** Max date range per request: minutes (>15 min) or hours = 1 quarter */
  MINUTE_LARGE_RANGE_DAYS: 92,
  /** Max date range per request: daily = 10 years */
  DAILY_RANGE_DAYS: 3653,
  /** Expired instruments: last 6 months */
  EXPIRED_LOOKBACK_MONTHS: 6,
} as const;

// ═══════════════════════════════════════════════════════
// Index Instrument Keys
// ═══════════════════════════════════════════════════════

export const NIFTY50_INDEX = 'NSE_INDEX|Nifty 50';
export const NIFTY_BANK_INDEX = 'NSE_INDEX|Nifty Bank';
export const INDIA_VIX = 'NSE_INDEX|India VIX';

// ═══════════════════════════════════════════════════════
// Global Market Symbols (for Yahoo Finance)
// ═══════════════════════════════════════════════════════

export const GLOBAL_SYMBOLS = {
  // Global Indices
  SP500: '^GSPC',
  NASDAQ: '^IXIC',
  NASDAQ_FUTURES: 'NQ=F',
  SP500_FUTURES: 'ES=F',
  NIKKEI: '^N225',
  FTSE: '^FTSE',
  GIFT_NIFTY: 'NIFTY_GS.NS', // SGX Nifty proxy

  // Commodities
  BRENT_CRUDE: 'BZ=F',
  WTI_CRUDE: 'CL=F',
  GOLD: 'GC=F',
  SILVER: 'SI=F',

  // Forex
  USD_INR: 'USDINR=X',
} as const;

/**
 * Mapping from Yahoo Finance symbols to our internal instrument keys
 * Used when storing global data in market_candles table
 */
export const GLOBAL_INSTRUMENT_KEY_MAP: Record<string, string> = {
  [GLOBAL_SYMBOLS.SP500]: 'GLOBAL|S&P 500',
  [GLOBAL_SYMBOLS.NASDAQ]: 'GLOBAL|Nasdaq Composite',
  [GLOBAL_SYMBOLS.NASDAQ_FUTURES]: 'GLOBAL|Nasdaq 100 E-Mini',
  [GLOBAL_SYMBOLS.SP500_FUTURES]: 'GLOBAL|S&P 500 E-Mini',
  [GLOBAL_SYMBOLS.NIKKEI]: 'GLOBAL|Nikkei 225',
  [GLOBAL_SYMBOLS.FTSE]: 'GLOBAL|FTSE 100',
  [GLOBAL_SYMBOLS.BRENT_CRUDE]: 'GLOBAL|Brent Crude',
  [GLOBAL_SYMBOLS.WTI_CRUDE]: 'GLOBAL|WTI Crude',
  [GLOBAL_SYMBOLS.GOLD]: 'GLOBAL|Gold',
  [GLOBAL_SYMBOLS.SILVER]: 'GLOBAL|Silver',
  [GLOBAL_SYMBOLS.USD_INR]: 'GLOBAL|USD/INR',
};
