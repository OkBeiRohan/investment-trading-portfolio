import { Injectable, Logger } from '@nestjs/common';
import { CandlesRepository, InstrumentMasterRepository } from '@repo/database';
import { MarketCandle, InstrumentMaster } from '@repo/schema';

/**
 * Continuous Contract Builder
 *
 * Creates synthetic continuous futures contracts (1! notation) by stitching together
 * individual futures contracts based on expiry and volume.
 *
 * Strategy:
 * 1. Sort futures by expiry date
 * 2. Use front-month contract (earliest non-expired)
 * 3. On rollover, switch to next contract
 * 4. If data missing, backfill from next available contract
 */
@Injectable()
export class ContinuousContractBuilder {
  private readonly logger = new Logger(ContinuousContractBuilder.name);

  constructor(
    private readonly instrumentMasterRepository: InstrumentMasterRepository,
    private readonly candlesRepository: CandlesRepository,
  ) {}

  /**
   * Build continuous contract data for a given underlying
   *
   * @param underlyingSymbol - e.g., "NIFTY", "BANKNIFTY"
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @param intervalValue - Candle interval value (e.g., 1, 5, 15)
   * @param intervalUnit - Candle interval unit (e.g., 'minute', 'day')
   * @returns Array of continuous contract candles
   */
  async buildContinuousContract(
    underlyingSymbol: string,
    startTime: Date,
    endTime: Date,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
  ): Promise<MarketCandle[]> {
    this.logger.log(
      `Building continuous contract for ${underlyingSymbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    // 1. Get all futures for this underlying (including historical)
    const futures = await this.getFuturesForUnderlying(
      underlyingSymbol,
      startTime,
    );

    if (futures.length === 0) {
      this.logger.warn(`No futures found for ${underlyingSymbol}`);
      return [];
    }

    // 2. Sort by expiry (ascending)
    const sortedFutures = futures.sort((a, b) => {
      if (!a.expiry || !b.expiry) return 0;
      return a.expiry.getTime() - b.expiry.getTime();
    });

    this.logger.debug(
      `Found ${sortedFutures.length} futures contracts for ${underlyingSymbol}`,
    );

    // 3. Build continuous series by stitching contracts
    const continuousData = await this.stitchContracts(
      sortedFutures,
      startTime,
      endTime,
      intervalValue,
      intervalUnit,
    );

    this.logger.log(
      `Built continuous contract with ${continuousData.length} candles`,
    );

    return continuousData;
  }

  /**
   * Get all futures for underlying symbol (including historical contracts)
   * Uses underlying_key to match, and filters by expiry >= startTime to include relevant contracts
   */
  private async getFuturesForUnderlying(
    underlyingSymbol: string,
    startTime: Date,
  ): Promise<InstrumentMaster[]> {
    // Map symbol to underlying_key
    const underlyingKeyMap: Record<string, string> = {
      NIFTY: 'NSE_INDEX|Nifty 50',
      BANKNIFTY: 'NSE_INDEX|Nifty Bank',
      FINNIFTY: 'NSE_INDEX|Nifty Fin Service',
      MIDCPNIFTY: 'NSE_INDEX|NIFTY MID SELECT',
    };

    const underlyingKey = underlyingKeyMap[underlyingSymbol];

    if (!underlyingKey) {
      this.logger.warn(
        `No underlying_key mapping for ${underlyingSymbol}. Available: ${Object.keys(underlyingKeyMap).join(', ')}`,
      );
      return [];
    }

    // Get ALL instruments (not just currently active)
    const allInstruments =
      await this.instrumentMasterRepository.getAllInstruments();

    // Filter for futures with matching underlying_key
    // Include contracts that expired AFTER startTime (so they have data in our range)
    const futures = allInstruments.filter(
      (inst) =>
        inst.instrumentType === 'FUTURE' &&
        inst.segment === 'FO' &&
        inst.underlyingKey === underlyingKey &&
        inst.expiry !== null &&
        inst.expiry >= startTime, // Include contracts that were active during our time range
    );

    this.logger.debug(
      `Found ${futures.length} futures contracts for ${underlyingSymbol} (underlying_key: ${underlyingKey}) with expiry >= ${startTime.toISOString()}`,
    );

    return futures;
  }

  /**
   * Stitch futures contracts into continuous series (OPTIMIZED)
   * Fetches entire time ranges per contract instead of per-timestamp
   */
  private async stitchContracts(
    sortedFutures: InstrumentMaster[],
    startTime: Date,
    endTime: Date,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
  ): Promise<MarketCandle[]> {
    const allCandles: MarketCandle[] = [];

    // Calculate time ranges for each contract
    const contractRanges = this.calculateContractRanges(
      sortedFutures,
      startTime,
      endTime,
    );

    this.logger.debug(
      `Fetching data for ${contractRanges.length} contract periods`,
    );

    // Fetch candles for each contract range
    for (const range of contractRanges) {
      const candles = await this.candlesRepository.findByTimeRange(
        range.instrumentKey,
        intervalValue,
        intervalUnit,
        range.startTime,
        range.endTime,
        10000, // Large limit to get all candles
      );

      if (candles.length > 0) {
        // Mark as continuous contract and add to result
        const markedCandles = candles.map((candle) => ({
          ...candle,
          instrumentKey: `${range.underlyingKey}_1!`,
        }));
        allCandles.push(...markedCandles);

        this.logger.debug(
          `Fetched ${candles.length} candles for ${range.instrumentKey} (${range.startTime.toISOString()} to ${range.endTime.toISOString()})`,
        );
      } else {
        this.logger.warn(
          `No data for ${range.instrumentKey} in range ${range.startTime.toISOString()} to ${range.endTime.toISOString()}`,
        );

        // Try backfilling from next available contract
        await this.backfillContractRange(
          sortedFutures,
          range,
          intervalValue,
          intervalUnit,
          allCandles,
        );
      }
    }

    // Sort by timestamp (should already be sorted, but ensure it)
    allCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return allCandles;
  }

  /**
   * Calculate time ranges for each futures contract
   * Each contract is active until its expiry (3:30 PM IST on expiry day)
   */
  private calculateContractRanges(
    sortedFutures: InstrumentMaster[],
    startTime: Date,
    endTime: Date,
  ): Array<{
    instrumentKey: string;
    underlyingKey: string;
    startTime: Date;
    endTime: Date;
  }> {
    const ranges: Array<{
      instrumentKey: string;
      underlyingKey: string;
      startTime: Date;
      endTime: Date;
    }> = [];

    let currentStart = new Date(startTime);

    for (let i = 0; i < sortedFutures.length; i++) {
      const future = sortedFutures[i];

      if (!future.expiry) continue;

      // Contract expires at 3:30 PM IST on expiry day
      const expiryEnd = new Date(future.expiry);
      expiryEnd.setHours(15, 30, 0, 0); // 3:30 PM

      // This contract is active from currentStart until min(expiryEnd, endTime)
      const rangeEnd = new Date(
        Math.min(expiryEnd.getTime(), endTime.getTime()),
      );

      if (currentStart <= rangeEnd) {
        ranges.push({
          instrumentKey: future.instrumentKey,
          underlyingKey: future.underlyingKey || 'NIFTY',
          startTime: new Date(currentStart),
          endTime: rangeEnd,
        });

        // Next contract starts after this one expires
        currentStart = new Date(expiryEnd.getTime() + 1);
      }

      // If we've covered the entire requested range, stop
      if (rangeEnd >= endTime) break;
    }

    return ranges;
  }

  /**
   * Backfill missing contract range from next available contracts
   */
  private async backfillContractRange(
    sortedFutures: InstrumentMaster[],
    missingRange: {
      instrumentKey: string;
      underlyingKey: string;
      startTime: Date;
      endTime: Date;
    },
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
    resultArray: MarketCandle[],
  ): Promise<void> {
    // Try each subsequent contract
    for (const future of sortedFutures) {
      if (future.instrumentKey === missingRange.instrumentKey) continue;

      const candles = await this.candlesRepository.findByTimeRange(
        future.instrumentKey,
        intervalValue,
        intervalUnit,
        missingRange.startTime,
        missingRange.endTime,
        10000,
      );

      if (candles.length > 0) {
        this.logger.debug(
          `Backfilled ${candles.length} candles from ${future.instrumentKey}`,
        );

        const markedCandles = candles.map((candle) => ({
          ...candle,
          instrumentKey: `${missingRange.underlyingKey}_1!`,
        }));
        resultArray.push(...markedCandles);
        return; // Found data, stop searching
      }
    }

    this.logger.warn(
      `Could not backfill data for range ${missingRange.startTime.toISOString()} to ${missingRange.endTime.toISOString()}`,
    );
  }
}
