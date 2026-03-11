/**
 * Providers Module
 * Aggregates all market data providers and rate limiter
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Core
import { RateLimiterService } from './rate-limiter.service';

// Providers
import { UpstoxProvider } from './upstox/upstox.provider';
import { YahooFinanceProvider } from './yahoo-finance/yahoo-finance.provider';
import { AlphaVantageProvider } from './alpha-vantage/alpha-vantage.provider';
import { FinnhubProvider } from './finnhub/finnhub.provider';

// Constants
import { UPSTOX_RATE_LIMITS } from './upstox/upstox.constants';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        baseURL: 'https://api.upstox.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${configService.get<string>('UPSTOX_ACCESS_TOKEN', '')}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    RateLimiterService,
    UpstoxProvider,
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
  ],
  exports: [
    RateLimiterService,
    UpstoxProvider,
    YahooFinanceProvider,
    AlphaVantageProvider,
    FinnhubProvider,
  ],
})
export class ProvidersModule implements OnModuleInit {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  onModuleInit() {
    // Register rate limiters for each provider
    this.rateLimiter.register({
      name: 'upstox',
      maxTokens: UPSTOX_RATE_LIMITS.REQUESTS_PER_SECOND,
      refillRate: UPSTOX_RATE_LIMITS.REQUESTS_PER_SECOND,
    });

    this.rateLimiter.register({
      name: 'yahoo-finance',
      maxTokens: 5,
      refillRate: 5, // 5 req/sec (conservative)
    });

    this.rateLimiter.register({
      name: 'alpha-vantage',
      maxTokens: 5,
      refillRate: 500 / 86400, // 500 requests per day = ~0.006/sec
    });

    this.rateLimiter.register({
      name: 'finnhub',
      maxTokens: 10,
      refillRate: 1, // 60/min = 1/sec
    });
  }
}
