/**
 * Global Data Service
 * Fetches and stores global market data (indices, commodities, forex, news)
 * Uses YahooProvider, AlphaVantageProvider, FinnhubProvider from @repo/market-sdk
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { CandlesRepository, ProcessingLogRepository, DbConfigService } from '@repo/database';
import {
  YahooProvider,
  AlphaVantageProvider,
  FinnhubProvider,
  type YahooCandle,
} from '@repo/market-sdk';
import { GapDetectorService } from './gap-detector.service';

export interface GlobalDataResult {
  source: string;
  symbolsFetched: number;
  totalCandles: number;
  newsArticles: number;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class GlobalDataService {
  private readonly logger = new Logger(GlobalDataService.name);

  constructor(
    private readonly yahooFinance: YahooProvider,
    @Optional() private readonly alphaVantage: AlphaVantageProvider,
    @Optional() private readonly finnhub: FinnhubProvider,
    private readonly gapDetector: GapDetectorService,
    private readonly dbConfig: DbConfigService,
    private readonly candlesRepo: CandlesRepository,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  /**
   * Fetch all global market data for a date range
   * Called by scheduler before market open (9:08 AM IST)
   */
  async fetchAllGlobalData(fromDate: Date, toDate: Date): Promise<GlobalDataResult> {
    const start = Date.now();
    let symbolsFetched = 0;
    let totalCandles = 0;
    let newsArticles = 0;
    const errors: string[] = [];

    this.logger.log('═'.repeat(60));
    this.logger.log('GLOBAL DATA SYNC — Starting');
    this.logger.log(`Range: ${this.fmtDate(fromDate)} → ${this.fmtDate(toDate)}`);
    this.logger.log('═'.repeat(60));

    // 1. Yahoo Finance — Global indices, commodities, forex
    try {
      this.logger.log('\n--- Yahoo Finance: Global Data ---');
      const globalData = await this.yahooFinance.getAllGlobalData(fromDate, toDate);

      for (const [instrumentKey, candles] of globalData) {
        if (candles.length > 0) {
          await this.storeYahooCandles(instrumentKey, candles);
          totalCandles += candles.length;
          symbolsFetched++;
          this.logger.log(`✓ ${instrumentKey}: ${candles.length} candles`);
        }
      }
    } catch (error) {
      const msg = `Yahoo Finance: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(msg);
      this.logger.error(msg);
    }

    const globalConfig = await this.dbConfig.getGlobalDataConfig();

    // 2. Alpha Vantage — US Treasury yield (if enabled + API key present)
    const avApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (avApiKey && globalConfig.alphaVantageEnabled && this.alphaVantage) {
      try {
        this.logger.log('\n--- Alpha Vantage: Treasury Yield ---');
        const yields = await this.alphaVantage.getTreasuryYield(avApiKey, '10year', 'daily');

        // Filter to requested range
        const filteredYields = yields.filter(
          (y) => y.date >= fromDate && y.date <= toDate,
        );

        if (filteredYields.length > 0) {
          // Store as pseudo-candles (close = yield, others = 0)
          const yieldCandles: YahooCandle[] = filteredYields.map((y) => ({
            timestamp: y.date,
            open: y.yield,
            high: y.yield,
            low: y.yield,
            close: y.yield,
            volume: 0,
          }));
          await this.storeYahooCandles('GLOBAL|US 10Y Yield', yieldCandles);
          totalCandles += yieldCandles.length;
          symbolsFetched++;
          this.logger.log(`✓ US 10Y Yield: ${yieldCandles.length} data points`);
        }
      } catch (error) {
        const msg = `Alpha Vantage: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        this.logger.error(msg);
      }
    } else {
      this.logger.log('Alpha Vantage: Skipped (no API key)');
    }

    // 3. Finnhub — Market news (if enabled + API key present)
    const finnhubApiKey = process.env.FINNHUB_API_KEY || '';
    if (finnhubApiKey && globalConfig.finnhubEnabled && this.finnhub) {
      try {
        this.logger.log('\n--- Finnhub: Market News ---');
        const news = await this.finnhub.getMarketNews(finnhubApiKey, 'general');
        newsArticles = news.length;
        this.logger.log(`✓ Fetched ${news.length} news articles`);

        // TODO: Store to macro_sentiment table when repository is ready
        await this.processingLogRepo.logInfo('FETCH', 'GLOBAL_NEWS', `Fetched ${news.length} articles`, {
          service: 'GlobalDataService',
          recordsProcessed: news.length,
        });
      } catch (error) {
        const msg = `Finnhub: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        this.logger.error(msg);
      }
    } else {
      this.logger.log('Finnhub: Skipped (no API key)');
    }

    const durationMs = Date.now() - start;

    this.logger.log('═'.repeat(60));
    this.logger.log(
      `GLOBAL DATA SYNC — Complete: ${symbolsFetched} symbols, ${totalCandles} candles, ${newsArticles} articles (${durationMs}ms)`,
    );
    this.logger.log('═'.repeat(60));

    return { source: 'global', symbolsFetched, totalCandles, newsArticles, errors, durationMs };
  }

  /**
   * Quick overnight sync — fetch just yesterday's close for all global symbols
   */
  async fetchOvernightData(): Promise<GlobalDataResult> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 3);

    return this.fetchAllGlobalData(yesterday, today);
  }

  /**
   * Historical backfill for global data
   */
  async backfillGlobalData(fromDate: Date, toDate: Date): Promise<GlobalDataResult> {
    return this.fetchAllGlobalData(fromDate, toDate);
  }

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  private async storeYahooCandles(
    instrumentKey: string,
    candles: YahooCandle[],
  ): Promise<void> {
    const marketCandles = candles.map((c) => ({
      timestamp: c.timestamp,
      instrumentKey,
      intervalValue: 1,
      intervalUnit: 'day' as const,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
      openInterest: 0,
    }));

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < marketCandles.length; i += CHUNK_SIZE) {
      const chunk = marketCandles.slice(i, i + CHUNK_SIZE);
      await this.candlesRepo.insertBatch(chunk);
    }
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
