/**
 * Market Data Schema Exports
 * Time-series data for QuestDB storage
 */

// Production v2.0 schemas (Upstox V3 aligned)
export * from "./questdb-tables.schema";
export * from "./macro-sentiment.schema";

// Legacy schemas (kept for backward compatibility)
export * from "./candle.schema";
// export * from "./quote.schema";
// export * from "./greeks.schema";
// export * from "./depth.schema";
// export * from "./training.schema";
// export * from "./features.schema";

// New type-only schemas (NO ZOD - internal use)
// export * from "./raw-market-data.types";
export * from "./market-state.types";
export * from "./model-contracts.schema";
