/**
 * MCX Instrument Constants
 *
 * Upstox instrument key prefixes and feed mode configuration for
 * Multi Commodity Exchange (MCX) futures contracts.
 *
 * MCX instruments are bundled within the existing Upstox WebSocket
 * subscription pool and require `ltpc` mode only (no L2 depth needed).
 *
 * Trading hours: 09:00 – 23:30 IST (Mon–Fri)
 * Historical data: Available via Upstox historical API (up to ~20 years)
 */

import { McxCommodity, MCX_FEED_MODE } from "@repo/schema";

/**
 * Upstox instrument key PREFIX for each MCX commodity.
 * Full key = `MCX_FO|{COMMODITY}{DDMMMYY}FUT`
 * e.g. `MCX_FO|CRUDEOIL25APRFUT`
 *
 * Use InstrumentSyncService.resolveMcxFrontMonth() at runtime to get the
 * actual expiry-qualified key for the nearest active contract.
 */
export const MCX_INSTRUMENT_PREFIXES: Record<McxCommodity, string> = {
  CRUDEOIL: "MCX_FO|CRUDEOIL",
  NATURALGAS: "MCX_FO|NATURALGAS",
  GOLD: "MCX_FO|GOLD",
  SILVER: "MCX_FO|SILVER",
  COPPER: "MCX_FO|COPPER",
} as const;

/**
 * Re-export feed mode for convenience.
 * MCX instruments only need LTPC (Last Traded Price + Cumulative).
 * No L2 depth is required for commodity features.
 */
export { MCX_FEED_MODE };

/**
 * Priority level for MCX instruments in the socket pool.
 * MCX is MEDIUM priority — lower than NSE order flow (HIGH/CRITICAL)
 * but higher than global macro data (LOW).
 */
export const MCX_SOCKET_PRIORITY = 3;

/**
 * Redis key prefix for MCX real-time state cache.
 * Format: mcx:snapshot:{commodity}
 * e.g. mcx:snapshot:CRUDEOIL
 */
export const MCX_REDIS_KEY_PREFIX = "mcx:snapshot:";

/**
 * MCX session timing (IST)
 */
export const MCX_SESSION = {
  /** MCX opens at 09:00 IST — 15 min before NSE */
  OPEN_HOUR: 9,
  OPEN_MINUTE: 0,
  /** MCX closes at 23:30 IST */
  CLOSE_HOUR: 23,
  CLOSE_MINUTE: 30,
} as const;
