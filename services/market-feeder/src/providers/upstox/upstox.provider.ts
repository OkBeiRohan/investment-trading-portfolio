/**
 * Upstox Provider — Clean V3 API client
 * HTTP-only: No database writes. Uses BaseProvider for retry + rate limiting.
 *
 * Endpoints covered:
 * - Historical candles (active + expired)
 * - Expired instruments (futures + options)
 * - Active option contracts
 * - Option chain with Greeks
 * - Market quotes with depth
 * - Expiry dates
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { BaseProvider, ProviderCandle } from '../base-provider';
import { RateLimiterService } from '../rate-limiter.service';
import { UPSTOX_DATA_AVAILABILITY } from './upstox.constants';
import {
  UpstoxCandleData,
  UpstoxCandleUnit,
  UpstoxHistoricalResponse,
  UpstoxMarketQuoteResponse,
  ExpiredCandleInterval,
  ExpiriesResponse,
  ExpiredFutureContract,
  ExpiredFutureContractsResponse,
  ExpiredOptionContract,
  ExpiredOptionContractsResponse,
  ActiveOptionContract,
  OptionContractsResponse,
  OptionChainItem,
  OptionChainResponse,
  OptionGreeksResponse,
  OptionGreekQuote,
} from './upstox.types';

@Injectable()
export class UpstoxProvider extends BaseProvider {
  protected readonly providerName = 'upstox';
  protected readonly logger = new Logger(UpstoxProvider.name);

  constructor(
    private readonly http: HttpService,
    rateLimiter: RateLimiterService,
  ) {
    super(rateLimiter);
  }

  // ═══════════════════════════════════════════════════════
  // Historical Candles — Active Instruments
  // ═══════════════════════════════════════════════════════

  /**
   * Fetch historical candles for a single date range
   */
  async getCandles(
    instrumentKey: string,
    unit: UpstoxCandleUnit,
    interval: number,
    fromDate: string,
    toDate: string,
  ): Promise<UpstoxCandleData[]> {
    return this.fetchWithRetry('getCandles', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<UpstoxHistoricalResponse>(
          `/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}/${fromDate}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.candles) {
        throw new Error(`API returned non-success for ${instrumentKey}`);
      }

      this.logger.debug(
        `Fetched ${response.data.data.candles.length} candles for ${instrumentKey} (${unit}/${interval}) ${fromDate}→${toDate}`,
      );

      return response.data.data.candles.map((c) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
        openInterest: c[6],
      }));
    });
  }

  /**
   * Fetch historical candles in batches respecting API date range limits
   * Automatically chunks by month/quarter/decade based on interval
   */
  async getCandlesBatched(
    instrumentKey: string,
    unit: UpstoxCandleUnit,
    interval: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UpstoxCandleData[]> {
    // Enforce data availability constraints
    const minDate =
      unit === 'minutes' || unit === 'hours'
        ? UPSTOX_DATA_AVAILABILITY.MINUTE_START
        : UPSTOX_DATA_AVAILABILITY.DAILY_START;

    if (startDate < minDate) {
      this.logger.warn(
        `Clamping start date from ${this.fmtDate(startDate)} to ${this.fmtDate(minDate)} for ${unit}`,
      );
      startDate = new Date(minDate);
    }

    // Clamp to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (endDate > today) endDate = today;

    const allCandles: UpstoxCandleData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const batchEnd = this.calculateBatchEnd(current, unit, interval);
      const actualEnd = batchEnd > endDate ? endDate : batchEnd;

      // Also clamp to today
      const clampedEnd = actualEnd > today ? today : actualEnd;

      const fromStr = this.fmtDate(current);
      const toStr = this.fmtDate(clampedEnd);

      const candles = await this.getCandles(instrumentKey, unit, interval, fromStr, toStr);
      allCandles.push(...candles);

      // Move to next batch
      current.setTime(clampedEnd.getTime());
      current.setDate(current.getDate() + 1);
    }

    return allCandles;
  }

  // ═══════════════════════════════════════════════════════
  // Historical Candles — Expired Instruments
  // ═══════════════════════════════════════════════════════

  /**
   * Fetch candles for expired instruments (futures/options)
   * Uses different API endpoint: /v2/expired-instruments/historical-candle
   */
  async getExpiredCandles(
    expiredInstrumentKey: string,
    interval: ExpiredCandleInterval,
    fromDate: string,
    toDate: string,
  ): Promise<UpstoxCandleData[]> {
    return this.fetchWithRetry('getExpiredCandles', async () => {
      const encodedKey = encodeURIComponent(expiredInstrumentKey);
      const response = await firstValueFrom(
        this.http.get<UpstoxHistoricalResponse>(
          `/v2/expired-instruments/historical-candle/${encodedKey}/${interval}/${toDate}/${fromDate}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.candles) {
        throw new Error(`Expired candle API non-success for ${expiredInstrumentKey}`);
      }

      return response.data.data.candles.map((c) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
        openInterest: c[6],
      }));
    });
  }

  /**
   * Fetch expired candles in monthly batches
   */
  async getExpiredCandlesBatched(
    expiredInstrumentKey: string,
    interval: ExpiredCandleInterval,
    startDate: Date,
    endDate: Date,
  ): Promise<UpstoxCandleData[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (endDate > today) endDate = today;

    const allCandles: UpstoxCandleData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const batchEnd = new Date(current);
      batchEnd.setMonth(batchEnd.getMonth() + 1);
      batchEnd.setDate(batchEnd.getDate() - 1);

      const actualEnd = batchEnd > endDate ? endDate : batchEnd;
      const clampedEnd = actualEnd > today ? today : actualEnd;

      const candles = await this.getExpiredCandles(
        expiredInstrumentKey,
        interval,
        this.fmtDate(current),
        this.fmtDate(clampedEnd),
      );
      allCandles.push(...candles);

      current.setTime(clampedEnd.getTime());
      current.setDate(current.getDate() + 1);
    }

    return allCandles;
  }

  // ═══════════════════════════════════════════════════════
  // Expired Instruments Discovery
  // ═══════════════════════════════════════════════════════

  /**
   * Get all expiry dates for an underlying instrument
   */
  async getExpiries(instrumentKey: string): Promise<string[]> {
    return this.fetchWithRetry('getExpiries', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<ExpiriesResponse>(
          `/v2/expired-instruments/expiries?instrument_key=${encodedKey}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get expiries for ${instrumentKey}`);
      }
      return response.data.data;
    });
  }

  /**
   * Get expired futures for a given expiry date
   */
  async getExpiredFutures(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredFutureContract[]> {
    return this.fetchWithRetry('getExpiredFutures', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<ExpiredFutureContractsResponse>(
          `/v2/expired-instruments/futures?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get expired futures for ${instrumentKey} ${expiryDate}`);
      }
      return response.data.data;
    });
  }

  /**
   * Get expired options for a given expiry date
   */
  async getExpiredOptions(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredOptionContract[]> {
    return this.fetchWithRetry('getExpiredOptions', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<ExpiredOptionContractsResponse>(
          `/v2/expired-instruments/options?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get expired options for ${instrumentKey} ${expiryDate}`);
      }
      return response.data.data;
    });
  }

  // ═══════════════════════════════════════════════════════
  // Active Option Contracts
  // ═══════════════════════════════════════════════════════

  /**
   * Get all active option contracts for an underlying
   */
  async getActiveOptionContracts(instrumentKey: string): Promise<ActiveOptionContract[]> {
    return this.fetchWithRetry('getActiveOptionContracts', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<OptionContractsResponse>(
          `/v2/option/contract?instrument_key=${encodedKey}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get active options for ${instrumentKey}`);
      }
      return response.data.data;
    });
  }

  /**
   * Get active expiry dates for an underlying
   */
  async getActiveExpiries(instrumentKey: string): Promise<string[]> {
    return this.fetchWithRetry('getActiveExpiries', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<ExpiriesResponse>(
          `/v2/option/expiry?instrument_key=${encodedKey}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get active expiries for ${instrumentKey}`);
      }
      return response.data.data;
    });
  }

  // ═══════════════════════════════════════════════════════
  // Option Chain & Greeks
  // ═══════════════════════════════════════════════════════

  /**
   * Get option chain with Greeks for a specific expiry
   */
  async getOptionChain(instrumentKey: string, expiryDate: string): Promise<OptionChainItem[]> {
    return this.fetchWithRetry('getOptionChain', async () => {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.http.get<OptionChainResponse>(
          `/v2/option/chain?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to get option chain for ${instrumentKey} ${expiryDate}`);
      }
      return response.data.data;
    });
  }

  /**
   * Get option greeks for multiple instruments
   */
  async getOptionGreeks(instrumentKeys: string[]): Promise<Record<string, OptionGreekQuote>> {
    return this.fetchWithRetry('getOptionGreeks', async () => {
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append('instrument_key', key));

      const response = await firstValueFrom(
        this.http.get<OptionGreeksResponse>(
          `/v3/market-quote/option-greek?${params.toString()}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error('Failed to get option greeks');
      }
      return response.data.data;
    });
  }

  // ═══════════════════════════════════════════════════════
  // Market Quotes
  // ═══════════════════════════════════════════════════════

  /**
   * Get full market quotes with depth for multiple instruments
   */
  async getMarketQuotes(instrumentKeys: string[]): Promise<UpstoxMarketQuoteResponse['data']> {
    return this.fetchWithRetry('getMarketQuotes', async () => {
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append('instrument_key', key));

      const response = await firstValueFrom(
        this.http.get<UpstoxMarketQuoteResponse>(
          `/v2/market-quote/quotes?${params.toString()}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch market quotes');
      }
      return response.data.data;
    });
  }

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  /**
   * Normalize Upstox candles to provider-agnostic format
   */
  toProviderCandles(candles: UpstoxCandleData[]): ProviderCandle[] {
    return candles.map((c) => ({
      timestamp: new Date(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      openInterest: c.openInterest,
    }));
  }

  /**
   * Check if an instrument key is an expired contract (NSE_FO|TOKEN|DD-MM-YYYY)
   */
  isExpiredInstrument(instrumentKey: string): boolean {
    return instrumentKey.split('|').length === 3;
  }

  /**
   * Calculate the batch end date based on API constraints
   */
  private calculateBatchEnd(current: Date, unit: UpstoxCandleUnit, interval: number): Date {
    const batchEnd = new Date(current);

    if (unit === 'minutes' && interval <= 15) {
      // 1 calendar month
      batchEnd.setMonth(batchEnd.getMonth() + 1);
      batchEnd.setDate(batchEnd.getDate() - 1);
    } else if ((unit === 'minutes' && interval > 15) || unit === 'hours') {
      // 1 quarter
      batchEnd.setMonth(batchEnd.getMonth() + 3);
      batchEnd.setDate(batchEnd.getDate() - 1);
    } else if (unit === 'days') {
      // 10 years
      batchEnd.setFullYear(batchEnd.getFullYear() + 10);
      batchEnd.setDate(batchEnd.getDate() - 1);
    } else {
      // weeks/months: no limit
      batchEnd.setFullYear(batchEnd.getFullYear() + 100);
    }

    return batchEnd;
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
