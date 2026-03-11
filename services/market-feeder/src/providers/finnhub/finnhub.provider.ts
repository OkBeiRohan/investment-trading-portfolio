/**
 * Finnhub Provider
 * Free tier: 60 requests/min (requires API key)
 *
 * Used for news/sentiment data:
 * - General market news
 * - Company-specific news
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BaseProvider } from '../base-provider';
import { RateLimiterService } from '../rate-limiter.service';

export interface FinnhubNewsArticle {
  category: string;
  datetime: number; // Unix timestamp
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubConfig {
  apiKey: string;
  enabled: boolean;
}

@Injectable()
export class FinnhubProvider extends BaseProvider {
  protected readonly providerName = 'finnhub';
  protected readonly logger = new Logger(FinnhubProvider.name);

  constructor(
    private readonly http: HttpService,
    rateLimiter: RateLimiterService,
  ) {
    super(rateLimiter);
  }

  /**
   * Get general market news
   * @param category - 'general', 'forex', 'crypto', 'merger'
   */
  async getMarketNews(
    apiKey: string,
    category: 'general' | 'forex' | 'crypto' | 'merger' = 'general',
    minId = 0,
  ): Promise<FinnhubNewsArticle[]> {
    return this.fetchWithRetry(`getMarketNews(${category})`, async () => {
      const response = await firstValueFrom(
        this.http.get<FinnhubNewsArticle[]>(
          `https://finnhub.io/api/v1/news`,
          {
            params: { category, minId, token: apiKey },
          },
        ),
      );

      if (!Array.isArray(response.data)) {
        throw new Error(`Unexpected market news response`);
      }

      this.logger.debug(`Fetched ${response.data.length} ${category} news articles`);
      return response.data;
    });
  }

  /**
   * Get company-specific news
   */
  async getCompanyNews(
    apiKey: string,
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<FinnhubNewsArticle[]> {
    return this.fetchWithRetry(`getCompanyNews(${symbol})`, async () => {
      const response = await firstValueFrom(
        this.http.get<FinnhubNewsArticle[]>(
          `https://finnhub.io/api/v1/company-news`,
          {
            params: {
              symbol,
              from: fromDate,
              to: toDate,
              token: apiKey,
            },
          },
        ),
      );

      if (!Array.isArray(response.data)) {
        throw new Error(`Unexpected company news response for ${symbol}`);
      }

      return response.data;
    });
  }

  /**
   * Get market status (whether exchanges are open)
   */
  async getMarketStatus(
    apiKey: string,
    exchange: string,
  ): Promise<{ exchange: string; isOpen: boolean; session: string; t: number }> {
    return this.fetchWithRetry(`getMarketStatus(${exchange})`, async () => {
      const response = await firstValueFrom(
        this.http.get(
          `https://finnhub.io/api/v1/stock/market-status`,
          {
            params: { exchange, token: apiKey },
          },
        ),
      );
      return response.data;
    });
  }
}
