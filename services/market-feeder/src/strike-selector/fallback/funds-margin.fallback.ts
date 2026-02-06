/**
 * Funds & Margin Fallback Data
 *
 * Paste the Upstox API response from:
 * GET https://api.upstox.com/v2/user/get-funds-and-margin?segment=SEC
 *
 * Instructions:
 * 1. Copy the API response JSON
 * 2. Replace the null below with the `data` object from the response
 * 3. Set USE_FALLBACK_DATA = true in index.ts
 */

import type { FundsAndMarginResponse } from '../../historical-data/upstox-client';

// ============================================
// 🔧 PASTE YOUR FUNDS & MARGIN DATA HERE
// ============================================

/**
 * Funds & Margin Response Structure (for reference):
 *
 * {
 *   "status": "success",
 *   "data": {
 *     "equity": {
 *       "used_margin": 0,
 *       "payin_amount": 50000,
 *       "span_margin": 0,
 *       "adhoc_margin": 0,
 *       "notional_cash": 0,
 *       "available_margin": 50000,
 *       "exposure_margin": 0
 *     },
 *     "commodity": {
 *       "used_margin": 0,
 *       "payin_amount": 0,
 *       "span_margin": 0,
 *       "adhoc_margin": 0,
 *       "notional_cash": 0,
 *       "available_margin": 0,
 *       "exposure_margin": 0
 *     }
 *   }
 * }
 */

export const FUNDS_MARGIN_FALLBACK: FundsAndMarginResponse['data'] | null = {
  commodity: {
    used_margin: 0.0,
    payin_amount: 0.0,
    span_margin: 0.0,
    adhoc_margin: 0.0,
    notional_cash: 0.0,
    available_margin: 0.0,
    exposure_margin: 0.0,
  },
  equity: {
    used_margin: 156.0,
    payin_amount: 0.0,
    span_margin: 0.0,
    adhoc_margin: 0.0,
    notional_cash: 0.0,
    available_margin: 6403.07,
    exposure_margin: 0.0,
  },
};

// ============================================
// 🔧 UNCOMMENT AND EDIT THE EXAMPLE BELOW:
// ============================================
// export const FUNDS_MARGIN_FALLBACK: FundsAndMarginResponse['data'] = {
//   equity: {
//     used_margin: 0,
//     payin_amount: 50000,
//     span_margin: 0,
//     adhoc_margin: 0,
//     notional_cash: 0,
//     available_margin: 50000,  // <-- This is what we use
//     exposure_margin: 0,
//   },
//   commodity: {
//     used_margin: 0,
//     payin_amount: 0,
//     span_margin: 0,
//     adhoc_margin: 0,
//     notional_cash: 0,
//     available_margin: 0,
//     exposure_margin: 0,
//   },
// };
