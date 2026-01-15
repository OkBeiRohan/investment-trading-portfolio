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

    // 1. Get all futures for this underlying
    const futures = await this.getFuturesForUnderlying(underlyingSymbol);

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
   * Get all futures for underlying symbol
   */
  private async getFuturesForUnderlying(
    underlyingSymbol: string,
  ): Promise<InstrumentMaster[]> {
    const allInstruments =
      await this.instrumentMasterRepository.getActiveInstruments();

    return allInstruments.filter(
      (inst) =>
        inst.instrumentType === 'FUTURE' &&
        inst.segment === 'FO' &&
        inst.tradingsymbol.includes(underlyingSymbol) &&
        inst.expiry !== null,
    );
  }

  /**
   * Stitch futures contracts into continuous series
   */
  private async stitchContracts(
    sortedFutures: InstrumentMaster[],
    startTime: Date,
    endTime: Date,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
  ): Promise<MarketCandle[]> {
    const result: MarketCandle[] = [];
    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      // Find active contract for current time
      const activeContract = this.findActiveContract(
        sortedFutures,
        currentTime,
      );

      if (!activeContract) {
        this.logger.warn(
          `No active contract found for ${currentTime.toISOString()}`,
        );
        currentTime = this.incrementTime(
          currentTime,
          intervalValue,
          intervalUnit,
        );
        continue;
      }

      // Fetch candle for this timestamp
      const candles = await this.candlesRepository.findByTimeRange(
        activeContract.instrumentKey,
        intervalValue,
        intervalUnit,
        currentTime,
        currentTime,
        1,
      );

      if (candles.length > 0) {
        // Use actual candle data
        result.push({
          ...candles[0],
          instrumentKey: `${activeContract.underlyingKey}_1!`, // Mark as continuous contract
        });
      } else {
        // Try next available contract (backfill)
        const backfillCandle = await this.backfillFromNextContract(
          sortedFutures,
          currentTime,
          intervalValue,
          intervalUnit,
        );

        if (backfillCandle) {
          result.push({
            ...backfillCandle,
            instrumentKey: `${activeContract.underlyingKey}_1!`,
          });
        } else {
          this.logger.debug(
            `No data available for ${currentTime.toISOString()}, skipping`,
          );
        }
      }

      currentTime = this.incrementTime(
        currentTime,
        intervalValue,
        intervalUnit,
      );
    }

    return result;
  }

  /**
   * Find active contract for given timestamp
   * (Front-month: earliest non-expired contract)
   */
  private findActiveContract(
    sortedFutures: InstrumentMaster[],
    timestamp: Date,
  ): InstrumentMaster | null {
    for (const future of sortedFutures) {
      if (future.expiry && future.expiry >= timestamp) {
        return future;
      }
    }

    // If all expired, use last one
    return sortedFutures[sortedFutures.length - 1] || null;
  }

  /**
   * Backfill missing data from next available contract
   */
  private async backfillFromNextContract(
    sortedFutures: InstrumentMaster[],
    timestamp: Date,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
  ): Promise<MarketCandle | null> {
    for (const future of sortedFutures) {
      if (!future.expiry || future.expiry < timestamp) continue;

      const candles = await this.candlesRepository.findByTimeRange(
        future.instrumentKey,
        intervalValue,
        intervalUnit,
        timestamp,
        timestamp,
        1,
      );

      if (candles.length > 0) {
        return candles[0];
      }
    }

    return null;
  }

  /**
   * Increment timestamp by interval
   */
  private incrementTime(
    time: Date,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
  ): Date {
    const increment =
      intervalUnit === 'minute'
        ? intervalValue * 60 * 1000
        : intervalValue * 24 * 60 * 60 * 1000;
    return new Date(time.getTime() + increment);
  }
}
