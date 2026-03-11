/**
 * Yahoo Finance Provider
 * Using yahoo-finance2 npm package — no API key required
 *
 * Provides global market data:
 * - Global indices (S&P 500, Nasdaq, Nikkei, FTSE)
 * - Commodities (Brent, WTI, Gold, Silver)
 * - Forex (USD/INR)
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseProvider, ProviderCandle } from '../base-provider';
import { RateLimiterService } from '../rate-limiter.service';
import { GLOBAL_SYMBOLS, GLOBAL_INSTRUMENT_KEY_MAP } from '../upstox/upstox.constants';

// yahoo-finance2 is dynamically imported (ESM module)
let yahooFinance: typeof import('yahoo-finance2').default | null = null;

async function getYahooFinance() {
  if (!yahooFinance) {
    const mod = await import('yahoo-finance2');
    yahooFinance = mod.default;
  }
  return yahooFinance;
}

export interface YahooCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

@Injectable()
export class YahooFinanceProvider extends BaseProvider {
  protected readonly providerName = 'yahoo-finance';
  protected readonly logger = new Logger(YahooFinanceProvider.name);

  constructor(rateLimiter: RateLimiterService) {
    super(rateLimiter);
  }

  /**
   * Fetch historical daily candles for a single symbol
   */
  async getHistoricalDaily(
    symbol: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ProviderCandle[]> {
    return this.fetchWithRetry(`getHistoricalDaily(${symbol})`, async () => {
      const yf = await getYahooFinance();

      const result = await yf.historical(symbol, {
        period1: fromDate,
        period2: toDate,
        interval: '1d',
      });

      this.logger.debug(
        `Fetched ${result.length} daily candles for ${symbol} (${this.fmtDate(fromDate)}→${this.fmtDate(toDate)})`,
      );

      return result.map((row) => ({
        timestamp: new Date(row.date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume ?? 0,
      }));
    });
  }

  /**
   * Fetch all global indices daily data
   */
  async getGlobalIndices(fromDate: Date, toDate: Date): Promise<Map<string, ProviderCandle[]>> {
    const symbols = [
      GLOBAL_SYMBOLS.SP500,
      GLOBAL_SYMBOLS.NASDAQ,
      GLOBAL_SYMBOLS.NIKKEI,
      GLOBAL_SYMBOLS.FTSE,
    ];
    return this.fetchMultipleSymbols(symbols, fromDate, toDate);
  }

  /**
   * Fetch commodity futures daily data
   */
  async getCommodities(fromDate: Date, toDate: Date): Promise<Map<string, ProviderCandle[]>> {
    const symbols = [
      GLOBAL_SYMBOLS.BRENT_CRUDE,
      GLOBAL_SYMBOLS.WTI_CRUDE,
      GLOBAL_SYMBOLS.GOLD,
      GLOBAL_SYMBOLS.SILVER,
    ];
    return this.fetchMultipleSymbols(symbols, fromDate, toDate);
  }

  /**
   * Fetch forex daily data
   */
  async getForex(fromDate: Date, toDate: Date): Promise<Map<string, ProviderCandle[]>> {
    const symbols = [GLOBAL_SYMBOLS.USD_INR];
    return this.fetchMultipleSymbols(symbols, fromDate, toDate);
  }

  /**
   * Fetch US index futures (E-minis)
   */
  async getUSFutures(fromDate: Date, toDate: Date): Promise<Map<string, ProviderCandle[]>> {
    const symbols = [
      GLOBAL_SYMBOLS.SP500_FUTURES,
      GLOBAL_SYMBOLS.NASDAQ_FUTURES,
    ];
    return this.fetchMultipleSymbols(symbols, fromDate, toDate);
  }

  /**
   * Fetch ALL global data (indices + commodities + forex + futures)
   */
  async getAllGlobalData(
    fromDate: Date,
    toDate: Date,
  ): Promise<Map<string, ProviderCandle[]>> {
    const allSymbols = Object.values(GLOBAL_SYMBOLS);
    return this.fetchMultipleSymbols(allSymbols, fromDate, toDate);
  }

  /**
   * Get latest quote for a symbol
   */
  async getQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    return this.fetchWithRetry(`getQuote(${symbol})`, async () => {
      const yf = await getYahooFinance();
      const quote = await yf.quote(symbol);

      if (!quote || !quote.regularMarketPrice) return null;

      return {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
      };
    });
  }

  /**
   * Map Yahoo symbol to our internal instrument key
   */
  toInstrumentKey(yahooSymbol: string): string {
    return GLOBAL_INSTRUMENT_KEY_MAP[yahooSymbol] || `GLOBAL|${yahooSymbol}`;
  }

  // ═══════════════════════════════════════════════════════
  // Internal helpers
  // ═══════════════════════════════════════════════════════

  private async fetchMultipleSymbols(
    symbols: string[],
    fromDate: Date,
    toDate: Date,
  ): Promise<Map<string, ProviderCandle[]>> {
    const results = new Map<string, ProviderCandle[]>();

    for (const symbol of symbols) {
      try {
        const candles = await this.getHistoricalDaily(symbol, fromDate, toDate);
        const instrumentKey = this.toInstrumentKey(symbol);
        results.set(instrumentKey, candles);
      } catch (error) {
        this.logger.error(
          `Failed to fetch ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with other symbols — don't fail everything
      }
    }

    return results;
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
