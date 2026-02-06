/**
 * Option Chain Fallback Data
 *
 * Paste the Upstox API response from:
 * GET https://api.upstox.com/v2/option/chain?instrument_key=NSE_INDEX|Nifty%2050&expiry_date=YYYY-MM-DD
 *
 * Instructions:
 * 1. Copy the API response JSON
 * 2. Replace the empty array below with the `data` array from the response
 * 3. Set USE_FALLBACK_DATA = true in index.ts
 */

import type { OptionChainItem } from '../../historical-data/upstox-client';

// ============================================
// 🔧 PASTE YOUR OPTION CHAIN DATA HERE
// ============================================

/**
 * Option Chain Response Structure (for reference):
 *
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "expiry": "2026-02-12",
 *       "pcr": 0.85,
 *       "strike_price": 24000,
 *       "underlying_key": "NSE_INDEX|Nifty 50",
 *       "underlying_spot_price": 24150.50,
 *       "call_options": {
 *         "instrument_key": "NSE_FO|NIFTY26FEB24000CE",
 *         "market_data": {
 *           "ltp": 185.50,
 *           "volume": 12500,
 *           "oi": 85000,
 *           "close_price": 180.00,
 *           "bid_price": 184.50,
 *           "bid_qty": 750,
 *           "ask_price": 186.50,
 *           "ask_qty": 600,
 *           "prev_oi": 82000
 *         },
 *         "option_greeks": {
 *           "vega": 0.025,
 *           "theta": -15.2,
 *           "gamma": 0.0008,
 *           "delta": 0.65,
 *           "iv": 12.5,
 *           "pop": 0.45
 *         }
 *       },
 *       "put_options": {
 *         "instrument_key": "NSE_FO|NIFTY26FEB24000PE",
 *         "market_data": { ... },
 *         "option_greeks": { ... }
 *       }
 *     },
 *     ...more strikes
 *   ]
 * }
 */

export const OPTION_CHAIN_FALLBACK: OptionChainItem[] = [
  // 🔧 PASTE YOUR OPTION CHAIN DATA ARRAY HERE
  // Example (delete and replace with actual data):
  // {
  //   expiry: '2026-02-12',
  //   pcr: 0.85,
  //   strike_price: 24000,
  //   underlying_key: 'NSE_INDEX|Nifty 50',
  //   underlying_spot_price: 24150.50,
  //   call_options: {
  //     instrument_key: 'NSE_FO|NIFTY26FEB24000CE',
  //     market_data: {
  //       ltp: 185.50,
  //       volume: 12500,
  //       oi: 85000,
  //       close_price: 180.00,
  //       bid_price: 184.50,
  //       bid_qty: 750,
  //       ask_price: 186.50,
  //       ask_qty: 600,
  //       prev_oi: 82000,
  //     },
  //     option_greeks: {
  //       vega: 0.025,
  //       theta: -15.2,
  //       gamma: 0.0008,
  //       delta: 0.65,
  //       iv: 12.5,
  //       pop: 0.45,
  //     },
  //   },
  //   put_options: {
  //     instrument_key: 'NSE_FO|NIFTY26FEB24000PE',
  //     market_data: {
  //       ltp: 35.00,
  //       volume: 8500,
  //       oi: 62000,
  //       close_price: 32.00,
  //       bid_price: 34.50,
  //       bid_qty: 450,
  //       ask_price: 35.50,
  //       ask_qty: 300,
  //       prev_oi: 60000,
  //     },
  //     option_greeks: {
  //       vega: 0.022,
  //       theta: -12.8,
  //       gamma: 0.0008,
  //       delta: -0.35,
  //       iv: 11.8,
  //       pop: 0.55,
  //     },
  //   },
  // },
];
