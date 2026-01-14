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

// Providers
export { UpstoxProvider } from "./providers/upstox/upstox.provider";
export { UpstoxModule } from "./providers/upstox/upstox.module";
export {
  SimpleUpstoxClient,
  type UpstoxCandleData,
  type UpstoxHistoricalResponse,
} from "./providers/upstox/simple-client";
export { UpstoxHistoricalService } from "./providers/upstox/historical.service";
export { YahooProvider } from "./providers/yahoo/yahoo.provider";
export { BinanceProvider } from "./providers/binance/binance.provider";
