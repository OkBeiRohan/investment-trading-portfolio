/**
 * Fallback Data Module
 *
 * When Upstox API is blocked (e.g., by enterprise proxy/Cloudflare),
 * you can manually paste API responses here.
 *
 * Usage:
 * 1. Set `USE_FALLBACK_DATA = true` below
 * 2. Paste API responses in the respective files:
 *    - option-chain.fallback.ts (required)
 *    - market-quote.fallback.ts (required - for Nifty spot & VIX)
 *    - funds-margin.fallback.ts (optional - for available balance)
 * 3. Run the strike selector
 */

// ============================================
// 🚨 FALLBACK TOGGLE - Set to true to use manual data
// ============================================
export const USE_FALLBACK_DATA = true;

// ============================================
// Fallback Data Exports
// ============================================
export { OPTION_CHAIN_FALLBACK } from './option-chain.fallback';
export { MARKET_QUOTE_FALLBACK } from './market-quote.fallback';
export { FUNDS_MARGIN_FALLBACK } from './funds-margin.fallback';
