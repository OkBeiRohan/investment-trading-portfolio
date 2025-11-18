/* tslint:disable */
/* eslint-disable */
/**
 * @repo/upstox-sdk
 *
 * Merged Upstox SDK with type safety:
 * - Original OpenAPI-generated types and APIs (from ./api and ./models)
 * - upstox-js-sdk wrapper with type-safe client (UpstoxClient)
 * - Type-safe WebSocket streamers (TypedMarketDataStreamer, TypedPortfolioDataStreamer)
 */

// ==================== Original OpenAPI exports (Backward Compatible) ====================
export * from "./api";
export * from "./configuration";
export * from "./models";

// ==================== Type-Safe Client Wrapper ====================
export { UpstoxClient, type UpstoxClientConfig } from "./typed-client";

// ==================== Type-Safe WebSocket Streamers ====================
export {
  TypedMarketDataStreamer,
  TypedPortfolioDataStreamer,
  extractLTP,
  extractGreeks,
  extractLatestOHLC,
  extractDepth,
  isOrderComplete,
  isOrderPending,
  isOrderTerminal,
  type MarketDataMode,
  type MarketDataLTPC,
  type MarketDataOHLC,
  type MarketDataBidAsk,
  type MarketDataOptionGreeks,
  type MarketDataFeedDetails,
  type MarketDataFeed,
  type ParsedMarketData,
  type PortfolioUpdateType,
  type OrderUpdate,
  type PositionUpdate,
  type HoldingUpdate,
  type GttUpdate,
  type ParsedPortfolioData,
  type TypedMarketDataStreamerEvents,
  type TypedPortfolioDataStreamerEvents,
} from "./typed-streamers";

// ==================== upstox-js-sdk types (selective exports to avoid conflicts) ====================
// Only export classes and enums that don't conflict with ./models
export type {
  ApiClient,
  MarketDataStreamerV3,
  PortfolioDataStreamer,
} from "upstox-js-sdk";

// Note: Response/Request types (PlaceOrderV3Response, etc.) are already exported from ./models
// We don't re-export them from upstox-js-sdk to avoid duplicate identifier errors
