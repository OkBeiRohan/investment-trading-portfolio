/**
 * Providers barrel export
 */

// Core
export { RateLimiterService, type RateLimitConfig } from './rate-limiter.service';
export { BaseProvider, type ProviderCandle, type ProviderError } from './base-provider';
export { ProvidersModule } from './providers.module';

// Upstox
export { UpstoxProvider } from './upstox/upstox.provider';
export * from './upstox/upstox.types';
export * from './upstox/upstox.constants';

// Yahoo Finance
export { YahooFinanceProvider } from './yahoo-finance/yahoo-finance.provider';
export * from './yahoo-finance/yahoo-finance.types';

// Alpha Vantage
export { AlphaVantageProvider, type AlphaVantageConfig } from './alpha-vantage/alpha-vantage.provider';

// Finnhub
export { FinnhubProvider, type FinnhubNewsArticle, type FinnhubConfig } from './finnhub/finnhub.provider';
