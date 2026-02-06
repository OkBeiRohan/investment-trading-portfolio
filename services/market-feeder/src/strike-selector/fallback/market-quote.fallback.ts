/**
 * Market Quote Fallback Data
 *
 * Paste the Upstox API response from:
 * GET https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX|Nifty%2050,NSE_INDEX|India%20VIX
 *
 * Instructions:
 * 1. Copy the API response JSON
 * 2. Replace the undefined below with the `data` object from the response
 * 3. Set USE_FALLBACK_DATA = true in index.ts
 */

import type { UpstoxMarketQuoteResponse } from '../../historical-data/upstox-client';

// ============================================
// 🔧 PASTE YOUR MARKET QUOTE DATA HERE
// ============================================

/**
 * Market Quote Response Structure (for reference):
 *
 * {
 *   "status": "success",
 *   "data": {
 *     "NSE_INDEX:Nifty 50": {
 *       "ohlc": { "open": 24100, "high": 24200, "low": 24050, "close": 24080 },
 *       "depth": { "buy": [...], "sell": [...] },
 *       "timestamp": "2026-02-06T15:30:00+05:30",
 *       "instrument_token": "NSE_INDEX|Nifty 50",
 *       "symbol": "Nifty 50",
 *       "last_price": 24150.50,
 *       "volume": 0,
 *       "average_price": 0,
 *       "net_change": 70.50,
 *       "total_buy_quantity": 0,
 *       "total_sell_quantity": 0,
 *       "lower_circuit_limit": 0,
 *       "upper_circuit_limit": 0,
 *       "last_trade_time": "2026-02-06T15:29:59+05:30"
 *     },
 *     "NSE_INDEX:India VIX": {
 *       ...
 *       "instrument_token": "NSE_INDEX|India VIX",
 *       "symbol": "India VIX",
 *       "last_price": 13.25,
 *       ...
 *     }
 *   }
 * }
 */

export const MARKET_QUOTE_FALLBACK:
  | UpstoxMarketQuoteResponse['data']
  | undefined = {
  'NSE_INDEX:Nifty 50': {
    ohlc: { open: 25605.8, high: 25644.5, low: 25491.9, close: 25627.4 },
    depth: { buy: [], sell: [] },
    timestamp: '2026-02-06T11:56:07.658+05:30',
    instrument_token: 'NSE_INDEX|Nifty 50',
    symbol: 'NA',
    last_price: 25627.4,
    volume: undefined,
    average_price: undefined,
    oi: undefined,
    net_change: -15.4,
    total_buy_quantity: undefined,
    total_sell_quantity: undefined,
    lower_circuit_limit: undefined,
    upper_circuit_limit: undefined,
    last_trade_time: '1770359167000',
    oi_day_high: undefined,
    oi_day_low: undefined,
  },
  'NSE_INDEX:India VIX': {
    ohlc: { open: 12.17, high: 12.35, low: 11.16, close: 11.97 },
    depth: { buy: [], sell: [] },
    timestamp: '2026-02-06T11:56:07.658+05:30',
    instrument_token: 'NSE_INDEX|India VIX',
    symbol: 'NA',
    last_price: 11.97,
    volume: undefined,
    average_price: undefined,
    oi: undefined,
    net_change: -0.2,
    total_buy_quantity: undefined,
    total_sell_quantity: undefined,
    lower_circuit_limit: undefined,
    upper_circuit_limit: undefined,
    last_trade_time: '1770359167000',
    oi_day_high: undefined,
    oi_day_low: undefined,
  },
};

// ============================================
// 🔧 UNCOMMENT AND EDIT THE EXAMPLE BELOW:
// ============================================
// export const MARKET_QUOTE_FALLBACK: UpstoxMarketQuoteResponse['data'] = {
//   'NSE_INDEX:Nifty 50': {
//     ohlc: { open: 24100, high: 24200, low: 24050, close: 24080 },
//     depth: { buy: [], sell: [] },
//     timestamp: '2026-02-06T15:30:00+05:30',
//     instrument_token: 'NSE_INDEX|Nifty 50',
//     symbol: 'Nifty 50',
//     last_price: 24150.50,  // <-- Nifty spot price
//     volume: 0,
//     average_price: 0,
//     net_change: 70.50,
//     total_buy_quantity: 0,
//     total_sell_quantity: 0,
//     lower_circuit_limit: 0,
//     upper_circuit_limit: 0,
//     last_trade_time: '2026-02-06T15:29:59+05:30',
//   },
//   'NSE_INDEX:India VIX': {
//     ohlc: { open: 13.0, high: 13.5, low: 12.8, close: 13.1 },
//     depth: { buy: [], sell: [] },
//     timestamp: '2026-02-06T15:30:00+05:30',
//     instrument_token: 'NSE_INDEX|India VIX',
//     symbol: 'India VIX',
//     last_price: 13.25,  // <-- India VIX value
//     volume: 0,
//     average_price: 0,
//     net_change: 0.15,
//     total_buy_quantity: 0,
//     total_sell_quantity: 0,
//     lower_circuit_limit: 0,
//     upper_circuit_limit: 0,
//     last_trade_time: '2026-02-06T15:29:59+05:30',
//   },
// };
