/**
 * Historical Data Bootstrap Service
 * Checks for missing data and fetches from Upstox V3 API
 * Fetches 1-minute candles for past 1 year for NIFTY50 ecosystem
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandlesRepository } from '@repo/database';
import { SimpleUpstoxClient } from '@repo/market-sdk';
import {
  NIFTY50_CONSTITUENTS,
  NIFTY50_INDEX,
  INDIA_VIX,
} from './nifty50-instruments';

interface CandleInsert {
  timestamp: Date;
  instrumentKey: string;
  intervalValue: number;
  intervalUnit: 'minute' | 'second' | 'day';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number | null;
}

@Injectable()
export class HistoricalDataBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(HistoricalDataBootstrapService.name);

  constructor(
    private readonly candlesRepository: CandlesRepository,
    private readonly configService: ConfigService,
    private readonly upstoxClient: SimpleUpstoxClient,
  ) {}

  async onModuleInit() {
    // Auto-bootstrap on startup (can be disabled via env var)
    const autoBootstrap = this.configService.get<string>(
      'AUTO_BOOTSTRAP_HISTORICAL_DATA',
      'false',
    );
    if (autoBootstrap === 'true') {
      this.logger.log('Auto-bootstrap enabled, checking for missing data...');
      await this.bootstrapHistoricalData();
    }
  }

  /**
   * Bootstrap historical data for NIFTY50 ecosystem
   * Checks for missing data and fetches from Upstox
   */
  async bootstrapHistoricalData(): Promise<void> {
    const twoYearsAgo = new Date();
    twoYearsAg

    const today = new Date();

    // Instruments to fetch
    const instruments = [NIFTY50_INDEX, INDIA_VIX, ...NIFTY50_CONSTITUENTS];

    this.logger.log(
      `Bootstrapping historical data for ${instruments.length} instruments`,
    );
    this.logger.log(
      `Date range: ${threeMonthsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
    );

    // Step 1: Populate instrument_master table
    await this.populateInstrumentMaster(instruments);

    let totalFetched = 0;
    let skipped = 0;

    for (const instrumentKey of instruments) {
      try {
        // Check if data exists for this instrument
        const hasData = await this.checkDataExists(
          instrumentKey,
          threeMonthsAgo,
          today,
        );

        if (hasData) {
          this.logger.debug(
            `Data already exists for ${instrumentKey}, skipping`,
          );
          skipped++;
          continue;
        }

        this.logger.log(`Fetching 1-minute candles for ${instrumentKey}...`);

        // Fetch candles from Upstox V3 API
        const upstoxCandles =
          await this.upstoxClient.getHistoricalCandlesBatched(
            instrumentKey,
            'minutes',
            1,
            threeMonthsAgo,
            today,
          );

        if (!upstoxCandles || upstoxCandles.length === 0) {
          this.logger.warn(`No data returned for ${instrumentKey}`);
          continue;
        }

        // Transform to MarketCandle format
        const candles: CandleInsert[] = upstoxCandles.map((c) => ({
          timestamp: new Date(c.timestamp),
          instrumentKey,
          intervalValue: 1,
          intervalUnit: 'minute' as const,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          openInterest: c.open_interest || null,
        }));

        // Insert into QuestDB in chunks to avoid connection timeout
        const CHUNK_SIZE = 5000;
        for (let i = 0; i < candles.length; i += CHUNK_SIZE) {
          const chunk = candles.slice(i, i + CHUNK_SIZE);
          await this.candlesRepository.insertBatch(chunk);
          this.logger.debug(
            `Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} candles)`,
          );
        }
        totalFetched += candles.length;

        this.logger.log(
          `✓ Inserted ${candles.length} candles for ${instrumentKey}`,
        );

        // Rate limiting: wait 500ms between instruments
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to fetch data for ${instrumentKey}: ${errorMessage}`,
        );
      }
    }

    this.logger.log('='.repeat(60));
    this.logger.log(`Bootstrap complete:`);
    this.logger.log(`  - Total instruments: ${instruments.length}`);
    this.logger.log(`  - Skipped (existing): ${skipped}`);
    this.logger.log(`  - Fetched: ${instruments.length - skipped}`);
    this.logger.log(`  - Total candles inserted: ${totalFetched}`);
    this.logger.log('='.repeat(60));
  }

  /**
   * Check if data exists for instrument in QuestDB
   */
  private async checkDataExists(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    return this.candlesRepository.existsForRange(
      instrumentKey,
      1, // interval_value
      'minute', // interval_unit
      startDate,
      endDate,
    );
  }

  /**
   * Populate instrument_master table with instrument metadata
   */
  private async populateInstrumentMaster(
    instrumentKeys: string[],
  ): Promise<void> {
    try {
      this.logger.log(
        `Populating instrument_master for ${instrumentKeys.length} instruments...`,
      );

      // Fetch market quotes in batches
      const instrumentData =
        await this.upstoxClient.getFullMarketQuoteBatched(instrumentKeys);

      // Insert into instrument_master using raw SQL
      for (const instrument of instrumentData) {
        const query = `
          INSERT INTO instrument_master (
            instrument_key,
            exchange,
            segment,
            instrument_type,
            tradingsymbol,
            name,
            last_updated
          ) VALUES (
            '${instrument.instrumentKey.replace(/'/g, "''")}',
            '${instrument.exchange}',
            '${instrument.segment}',
            'EQ',
            '${instrument.tradingSymbol.replace(/'/g, "''")}',
            '${instrument.name.replace(/'/g, "''")}',
            to_timestamp('${instrument.lastUpdated.toISOString()}', 'yyyy-MM-ddTHH:mm:ss.SSSZ')
          )
        `;

        await this.candlesRepository['questdb'].query(query);
      }

      this.logger.log(
        `✓ Populated ${instrumentData.length} instruments in instrument_master`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to populate instrument_master: ${errorMessage}`,
      );
      // Don't throw - continue with historical data fetch even if this fails
    }
  }

  /**
   * Manually trigger bootstrap (for HTTP endpoint)
   */
  triggerBootstrap(): { message: string } {
    // Run async without blocking response
    void this.bootstrapHistoricalData().catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Bootstrap failed: ${errorMessage}`);
    });

    return {
      message: 'Historical data bootstrap started. Check logs for progress.',
    };
  }
}
