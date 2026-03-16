/**
 * MCX Commodity Exchange Schemas
 *
 * Schemas for Multi Commodity Exchange (MCX) real-time and historical data.
 * MCX instruments are subscribed via Upstox WebSocket in `ltpc` mode.
 * Used primarily as:
 *  - Tier 0 gap predictor features (overnight % change at 09:08 IST)
 *  - Tier 1 macro director features (intraday commodity regime)
 *  - Tier 2 intraday contextual features
 */

import { z } from "zod";

// ============================================
// MCX Commodity Enum
// ============================================

export const mcxCommodityEnum = z.enum([
  "CRUDEOIL",
  "NATURALGAS",
  "GOLD",
  "SILVER",
  "COPPER",
]);

export type McxCommodity = z.infer<typeof mcxCommodityEnum>;

/** All MCX commodities tracked by the system */
export const MCX_COMMODITIES: McxCommodity[] = [
  "CRUDEOIL",
  "NATURALGAS",
  "GOLD",
  "SILVER",
  "COPPER",
];

// ============================================
// MCX Instrument Key Helpers
// ============================================

/**
 * Upstox instrument key prefix for MCX futures.
 * Full key format: `MCX_FO|{COMMODITY}{EXPIRY}FUT`
 * e.g. `MCX_FO|CRUDEOIL24APRFUT`
 */
export const MCX_INSTRUMENT_PREFIX = "MCX_FO|";

/** Feed mode for MCX instruments in Upstox WebSocket — LTPC is sufficient */
export const MCX_FEED_MODE = "ltpc" as const;

// ============================================
// MCX Real-Time Snapshot Schema
// ============================================

/**
 * Live/intraday snapshot of a single MCX instrument.
 * Populated by market-feeder on each tick from Upstox WebSocket.
 */
export const mcxCommoditySnapshotSchema = z.object({
  /** Upstox instrument key e.g. MCX_FO|CRUDEOIL24APRFUT */
  instrumentKey: z.string(),

  /** Commodity type */
  commodity: mcxCommodityEnum,

  /** Last traded price (INR) */
  ltp: z.number(),

  /** Previous session close price (INR) */
  prevClose: z.number(),

  /** Intraday % change from previous close */
  intradayChangePct: z.number(),

  /** Traded volume in this session */
  volume: z.number().default(0),

  /** Timestamp of this snapshot */
  timestamp: z.date(),

  /** Whether MCX is in active trading session */
  isMarketOpen: z.boolean().default(false),
});

export type McxCommoditySnapshot = z.infer<typeof mcxCommoditySnapshotSchema>;

// ============================================
// MCX Overnight / Pre-Market Feature Schema
// ============================================

/**
 * Aggregated MCX data for overnight feature computation.
 * Built by market-feeder at ~09:08 IST for Tier 0 input.
 */
export const mcxOvernightDataSchema = z.object({
  /** Session date (IST) */
  date: z.date(),

  /** Per-commodity overnight data */
  snapshots: z.array(mcxCommoditySnapshotSchema),

  /** Composite: count of commodities up / total commodities [0–1] */
  commodityBreadth: z.number().min(0).max(1),

  /** Brent (USD, Yahoo) minus MCX Crude Oil (INR-adjusted) spread */
  brentMcxCrudeoilSpread: z.number().optional(),

  /** Rolling z-score of all MCX overnight moves */
  mcxIntradayRegime: z.number().optional(),

  /** Composite energy pressure: (crudeoil% + naturalgas%) / 2 */
  energyPressure: z.number().optional(),

  /** Timestamp of data collection */
  collectedAt: z.date(),
});

export type McxOvernightData = z.infer<typeof mcxOvernightDataSchema>;

// ============================================
// MCX Instrument Registration Schema
// ============================================

/**
 * Resolved MCX front-month contract mapping.
 * Stored in Redis at startup by market-feeder instrument sync.
 */
export const mcxFrontMonthContractSchema = z.object({
  commodity: mcxCommodityEnum,
  instrumentKey: z.string(),
  expiryDate: z.date(),
  lotSize: z.number(),
  tickSize: z.number(),
  resolvedAt: z.date(),
});

export type McxFrontMonthContract = z.infer<typeof mcxFrontMonthContractSchema>;
