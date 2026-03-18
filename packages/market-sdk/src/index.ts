// ============================================================================
// @repo/market-sdk - Public API Exports
// ============================================================================

// Interfaces
export * from "./interfaces/market-data.interface";
export * from "./interfaces/orders.interface";
// export * from "./interfaces/portfolio.interface";

// Core Types & Abstractions
export * from "./core/types";
export type {
  IProvider,
  ProviderFeatures,
  IMarketDataProvider,
  IOrderProvider,
  IPortfolioProvider,
  IWebSocketProvider,
  MultiLegOrderParams,
  FundDetails,
  SegmentFunds,
} from "./core/provider.interface";
export { BaseProvider } from "./core/base-provider.abstract";
export { ProviderFactory } from "./core/provider.factory";
export { ProviderRegistry } from "./core/provider.registry";
export { HttpClientService } from "./core/http-client.service";
export * from "./core/error";

// Rate Limiter
export {
  RateLimiterService,
  PROVIDER_LIMITS,
} from "./rate-limiter/rate-limiter.service";
export { RateLimiterModule } from "./rate-limiter/rate-limiter.module";

// Utils
export { CircuitBreakerService } from "./utils/circuit-breaker";
export * from "./utils/retry.util";

// Multiplexer
export * from "./multiplexer/multiplexer.service";
export * from "./multiplexer/types";

// WebSocket
export { WebSocketModule } from "./websocket/websocket.module";
export { SocketPoolService } from "./websocket/socket-pool.service";
export type {
  FeedMode,
  PooledSocket,
  SocketPoolConfig,
} from "./websocket/socket-pool.service";
export {
  SubscriptionManagerService,
  SubscriptionPriority,
} from "./websocket/subscription-manager.service";
export type { Subscription } from "./websocket/subscription-manager.service";
export { HeartbeatService } from "./websocket/heartbeat.service";
export type { HeartbeatConfig } from "./websocket/heartbeat.service";

// Providers — Upstox
export { UpstoxProvider } from "./providers/upstox/upstox.provider";
export { UpstoxModule } from "./providers/upstox/upstox.module";
export { UpstoxWebSocketService } from "./providers/upstox/websocket/upstox-websocket.service";
export { UpstoxWebSocketModule } from "./providers/upstox/websocket/upstox-websocket.module";
export type { UpstoxMarketData } from "./providers/upstox/websocket/upstox-websocket.service";
export { UpstoxHistoricalService } from "./providers/upstox/historical.service";
export { UpstoxHistoricalAPIService } from "./providers/upstox/api/historical/historical.service";
export { HistoricalApiRepository } from "./providers/upstox/api/historical/historical.repository";
export { HistoricalModule as UpstoxHistoricalModule } from "./providers/upstox/api/historical/historical.module";
export {
  UPSTOX_CONSTANTS,
  UPSTOX_API_URLS,
  UPSTOX_ENDPOINTS,
  UPSTOX_V3_ENDPOINTS,
  UPSTOX_DATA_AVAILABILITY,
  UPSTOX_PLUS_LIMITS,
  GLOBAL_SYMBOL_MAPPINGS,
} from "./providers/upstox/constants";
export type {
  HistoricalCandleRequest,
  CandleResponse,
  IntradayCandleRequest,
  ExpiredInstrument,
  ActiveOptionContract,
  OptionChainStrike,
  UpstoxCandleData as UpstoxCandleDataTyped,
} from "./providers/upstox/api/historical/dto/historical.request.dto";
export { parseCandleArray } from "./providers/upstox/api/historical/dto/historical.request.dto";

// Upstox API types (complete)
export type {
  UpstoxApiResponse,
  UpstoxErrorResponse,
  TokenResponse as UpstoxTokenResponse,
  TokenRequestResponse,
  TokenWebhookPayload,
  UserProfile,
  FundsAndMargin,
  FundMarginData,
  BrokerageRequest,
  BrokerageDetails,
  MarginRequest,
  MarginDetails,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PlaceMultiOrderRequest,
  PlaceMultiOrderResponse,
  ModifyOrderRequest,
  Order as UpstoxOrder,
  Trade as UpstoxTrade,
  OrderStatus,
  TransactionType,
  OrderType as UpstoxOrderType,
  ProductType,
  Validity,
  Variety,
  PlaceGttOrderRequest,
  GttOrder,
  GttRule,
  GttType,
  Position as UpstoxPosition,
  Holding as UpstoxHolding,
  ConvertPositionRequest,
  PnlReportMetadata,
  PnlReportEntry,
  TradeCharges,
  MarketQuoteFull,
  OhlcQuote,
  LtpQuote,
  OptionGreek,
  MarketHolidayEntry,
  MarketTiming,
  ExchangeStatus,
  WebSocketAuthResponse,
  PortfolioStreamUpdate,
  OrderWebhookPayload,
  GttWebhookPayload,
} from "./providers/upstox/api/types";

// Upstox API Modules
export { UpstoxApiModule } from "./providers/upstox/api/api.module";
export { GttModule } from "./providers/upstox/api/gtt/gtt.module";
export { GttService } from "./providers/upstox/api/gtt/gtt.service";
export { TradePnlModule } from "./providers/upstox/api/trade-pnl/trade-pnl.module";
export { TradePnlService } from "./providers/upstox/api/trade-pnl/trade-pnl.service";
export { ChargesModule } from "./providers/upstox/api/charges/charges.module";
export { ChargesService } from "./providers/upstox/api/charges/charges.service";

// Providers — Yahoo Finance
export {
  YahooProvider,
  type YahooCandle,
  type YahooQuote,
} from "./providers/yahoo/yahoo.provider";

// Providers — Alpha Vantage
export {
  AlphaVantageProvider,
  type AlphaVantageTreasuryYield,
  type AlphaVantageForexDaily,
} from "./providers/alpha-vantage/alpha-vantage.provider";

// Providers — Finnhub
export {
  FinnhubProvider,
  type FinnhubNewsArticle,
  type FinnhubMarketStatus,
} from "./providers/finnhub/finnhub.provider";

// Providers — Binance
export { BinanceProvider } from "./providers/binance/binance.provider";

// Providers — Market Calendar (Upstox holidays API)
export {
  MarketCalendarService,
  MarketCalendarModule,
  type MarketHoliday,
} from "./providers/upstox/market-calendar";

// Providers — MCX Commodities (Upstox WebSocket, ltpc mode)
export {
  MCX_INSTRUMENT_PREFIXES,
  MCX_FEED_MODE,
  MCX_SOCKET_PRIORITY,
  MCX_REDIS_KEY_PREFIX,
  MCX_SESSION,
} from "./providers/mcx/mcx-instruments.constants";
