/**
 * Yahoo Finance Provider
 * Fetches global market data using the yahoo-finance2 npm package (no API key required)
 *
 * Provides data for:
 * - Global indices (S&P 500, Dow Jones, NASDAQ, FTSE, DAX, Nikkei, etc.)
 * - Commodities (Crude Oil, Gold, Silver, Copper, Natural Gas)
 * - Forex pairs (USD/INR, EUR/USD, GBP/USD, USD/JPY)
 * - Bond yields (US 10Y)
 */

import { Injectable, Logger } from "@nestjs/common";
import YahooFinance from "yahoo-finance2";
import { GLOBAL_SYMBOL_MAPPINGS } from "../upstox/constants";

export interface YahooCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface YahooQuote {
  symbol: string;
  instrumentKey: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

@Injectable()
export class YahooProvider {
  private readonly logger = new Logger(YahooProvider.name);
  private readonly yahooService = new YahooFinance()
  readonly name = "yahoo-finance";


  /**
   * Fetch historical daily candles for a Yahoo symbol
   */
  async getHistoricalData(
    yahooSymbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<YahooCandle[]> {
    try {
      const result = await this.yahooService.chart(yahooSymbol, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
      });

      if (!result.quotes || result.quotes.length === 0) {
        this.logger.debug(`No data for ${yahooSymbol}`);
        return [];
      }

      return result.quotes
        .filter((q: any) => q.open != null && q.close != null)
        .map((q: any) => ({
          timestamp: new Date(q.date),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume || 0,
        }));
    } catch (error: any) {
      this.logger.error(`Failed to fetch ${yahooSymbol}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch quote for a single symbol
   */
  async getQuote(yahooSymbol: string, instrumentKey: string): Promise<YahooQuote | null> {
    try {
      const result = await this.yahooService.quote(yahooSymbol);

      if (!result) return null;

      return {
        symbol: yahooSymbol,
        instrumentKey,
        price: result.regularMarketPrice || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        marketCap: result.marketCap,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get quote for ${yahooSymbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch all global market data for a date range
   * Returns a Map of instrumentKey → candles
   */
  async getAllGlobalData(
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, YahooCandle[]>> {
    const results = new Map<string, YahooCandle[]>();

    for (const [instrumentKey, yahooSymbol] of Object.entries(GLOBAL_SYMBOL_MAPPINGS)) {
      try {
        const candles = await this.getHistoricalData(yahooSymbol, startDate, endDate);
        if (candles.length > 0) {
          results.set(instrumentKey, candles);
          this.logger.debug(`✓ ${instrumentKey} (${yahooSymbol}): ${candles.length} candles`);
        }
        // Small delay to be nice to Yahoo's servers
        await this.sleep(200);
      } catch (error: any) {
        this.logger.warn(`Skipping ${instrumentKey}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Fetch all global quotes
   */
  async getAllGlobalQuotes(): Promise<YahooQuote[]> {
    const quotes: YahooQuote[] = [];

    for (const [instrumentKey, yahooSymbol] of Object.entries(GLOBAL_SYMBOL_MAPPINGS)) {
      const quote = await this.getQuote(yahooSymbol, instrumentKey);
      if (quote) quotes.push(quote);
      await this.sleep(100);
    }

    return quotes;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
