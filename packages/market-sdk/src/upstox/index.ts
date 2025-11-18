/**
 * Upstox SDK Integration for @repo/market-sdk
 *
 * Type-safe Upstox SDK wrapper using upstox-js-sdk
 *
 * This module provides:
 * - UpstoxClient: Convenient wrapper around upstox-js-sdk with full TypeScript support
 * - TypedMarketDataStreamer: Type-safe WebSocket market data streaming
 * - TypedPortfolioDataStreamer: Type-safe WebSocket portfolio updates
 * - All upstox-js-sdk types and classes
 */

// ==================== Main Client Wrapper ====================
export { UpstoxClient, type UpstoxClientConfig } from "./typed-client";

// ==================== Type-Safe WebSocket Streamers ====================
export {
  TypedMarketDataStreamer,
  TypedPortfolioDataStreamer,
  // Helper functions
  extractLTP,
  extractGreeks,
  extractLatestOHLC,
  extractDepth,
  isOrderComplete,
  isOrderPending,
  isOrderTerminal,
  // Types
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

// ==================== Re-export upstox-js-sdk types ====================
export type {
  // Core classes
  ApiClient,
  MarketDataStreamerV3,
  PortfolioDataStreamer,
  // Request types
  PlaceOrderV3Request,
  ModifyOrderRequest,
  ConvertPositionRequest,
  GttPlaceOrderRequest,
  GttModifyOrderRequest,
  GttCancelOrderRequest,
  MarginRequest,
  // Response types
  PlaceOrderV3Response,
  ModifyOrderV3Response,
  CancelOrderV3Response,
  GetOrderBookResponse,
  GetPositionResponse,
  GetHoldingsResponse,
  GetProfileResponse,
  GetUserFundMarginResponse,
  GetFullMarketQuoteResponse,
  GetMarketQuoteOHLCResponseV3,
  GetMarketQuoteLastTradedPriceResponseV3,
  GetMarketQuoteOptionGreekResponseV3,
  GetHistoricalCandleResponse,
  GetOptionChainResponse,
  GetGttOrderResponse,
  GttTriggerOrderResponse,
  GetBrokerageResponse,
  PostMarginResponse,
  GetMarketStatusResponse,
  GetHolidayResponse,
  GetExchangeTimingResponse,
  GetTradeResponse,
  WebsocketAuthRedirectResponse,
  LogoutResponse,
  TokenResponse,
} from "upstox-js-sdk";
