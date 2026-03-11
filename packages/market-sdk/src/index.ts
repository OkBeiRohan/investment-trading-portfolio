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

// Auth
export * from "./auth/auth-manager.service";
export * from "./auth/token-refresh.service";
export * from "./auth/encryption.util";

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
export { UpstoxHistoricalService } from "./providers/upstox/historical.service";
export { UpstoxHistoricalAPIService } from "./providers/upstox/api/historical/historical.service";
export { HistoricalApiRepository } from "./providers/upstox/api/historical/historical.repository";
export { HistoricalModule as UpstoxHistoricalModule } from "./providers/upstox/api/historical/historical.module";
export {
  UPSTOX_CONSTANTS,
  UPSTOX_API_URLS,
  UPSTOX_ENDPOINTS,
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
