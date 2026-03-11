/**
 * Alpha Vantage Provider
 * Free tier: 500 requests/day (requires API key)
 *
 * Used for data Yahoo Finance doesn't cover well:
 * - US Treasury yields
 * - Forex daily (backup)
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BaseProvider, ProviderCandle } from '../base-provider';
import { RateLimiterService } from '../rate-limiter.service';

export interface AlphaVantageConfig {
  apiKey: string;
  enabled: boolean;
}

interface AVTimeSeriesDaily {
  'Meta Data': Record<string, string>;
  'Time Series (Daily)': Record<
    string,
    {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    }
  >;
}

interface AVTreasuryYield {
  name: string;
  interval: string;
  unit: string;
  data: Array<{ date: string; value: string }>;
}

@Injectable()
export class AlphaVantageProvider extends BaseProvider {
  protected readonly providerName = 'alpha-vantage';
  protected readonly logger = new Logger(AlphaVantageProvider.name);

  constructor(
    private readonly http: HttpService,
    rateLimiter: RateLimiterService,
  ) {
    super(rateLimiter);
  }

  /**
   * Get daily time series for a symbol
   */
  async getDailyTimeSeries(
    symbol: string,
    apiKey: string,
    outputSize: 'compact' | 'full' = 'compact',
  ): Promise<ProviderCandle[]> {
    return this.fetchWithRetry(`getDailyTimeSeries(${symbol})`, async () => {
      const response = await firstValueFrom(
        this.http.get<AVTimeSeriesDaily>(
          `https://www.alphavantage.co/query`,
          {
            params: {
              function: 'TIME_SERIES_DAILY',
              symbol,
              outputsize: outputSize,
              apikey: apiKey,
            },
          },
        ),
      );

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error(`No time series data for ${symbol}`);
      }

      return Object.entries(timeSeries)
        .map(([date, values]) => ({
          timestamp: new Date(date),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
  }

  /**
   * Get US Treasury yield (10-year)
   * Returns daily yield percentages
   */
  async getTreasuryYield(
    apiKey: string,
    maturity: '3month' | '2year' | '5year' | '10year' | '30year' = '10year',
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<Array<{ date: Date; yield: number }>> {
    return this.fetchWithRetry(`getTreasuryYield(${maturity})`, async () => {
      const response = await firstValueFrom(
        this.http.get<AVTreasuryYield>(
          `https://www.alphavantage.co/query`,
          {
            params: {
              function: 'TREASURY_YIELD',
              maturity,
              interval,
              apikey: apiKey,
            },
          },
        ),
      );

      if (!response.data.data) {
        throw new Error(`No Treasury yield data for ${maturity}`);
      }

      return response.data.data
        .filter((d) => d.value !== '.')
        .map((d) => ({
          date: new Date(d.date),
          yield: parseFloat(d.value),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    });
  }

  /**
   * Get daily forex rate
   */
  async getForexDaily(
    fromCurrency: string,
    toCurrency: string,
    apiKey: string,
    outputSize: 'compact' | 'full' = 'compact',
  ): Promise<ProviderCandle[]> {
    return this.fetchWithRetry(`getForexDaily(${fromCurrency}/${toCurrency})`, async () => {
      const response = await firstValueFrom(
        this.http.get(
          `https://www.alphavantage.co/query`,
          {
            params: {
              function: 'FX_DAILY',
              from_symbol: fromCurrency,
              to_symbol: toCurrency,
              outputsize: outputSize,
              apikey: apiKey,
            },
          },
        ),
      );

      const timeSeries = response.data['Time Series FX (Daily)'];
      if (!timeSeries) {
        throw new Error(`No forex data for ${fromCurrency}/${toCurrency}`);
      }

      return Object.entries(timeSeries)
        .map(([date, values]: [string, any]) => ({
          timestamp: new Date(date),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: 0, // Forex doesn't have volume in AV
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
  }
}
