/**
 * Gap Detector Service
 * Queries QuestDB to find missing date ranges in candle data
 * Used by backfill to fetch only what's missing
 */

import { Injectable, Logger } from '@nestjs/common';
import { CandlesRepository } from '@repo/database';

export interface DateGap {
  from: Date;
  to: Date;
}

@Injectable()
export class GapDetectorService {
  private readonly logger = new Logger(GapDetectorService.name);

  constructor(private readonly candlesRepository: CandlesRepository) {}

  /**
   * Find missing daily data ranges for an instrument
   * Checks which trading days have no candle data
   */
  async findMissingDailyRanges(
    instrumentKey: string,
    from: Date,
    to: Date,
  ): Promise<DateGap[]> {
    return this.findMissingRanges(instrumentKey, 1, 'day', from, to);
  }

  /**
   * Find missing minute data ranges for an instrument
   */
  async findMissingMinuteRanges(
    instrumentKey: string,
    from: Date,
    to: Date,
  ): Promise<DateGap[]> {
    return this.findMissingRanges(instrumentKey, 1, 'minute', from, to);
  }

  /**
   * Generic gap finder: scans the date range week-by-week and checks for data presence.
   * Returns coalesced gaps (consecutive missing weeks merged into one range).
   */
  private async findMissingRanges(
    instrumentKey: string,
    intervalValue: number,
    intervalUnit: 'minute' | 'day',
    from: Date,
    to: Date,
  ): Promise<DateGap[]> {
    const gaps: DateGap[] = [];
    const chunkDays = intervalUnit === 'minute' ? 7 : 30; // week for minute, month for daily
    const current = new Date(from);
    let gapStart: Date | null = null;

    while (current <= to) {
      const chunkEnd = new Date(current);
      chunkEnd.setDate(chunkEnd.getDate() + chunkDays);
      const actualEnd = chunkEnd > to ? to : chunkEnd;

      const hasData = await this.candlesRepository.existsForRange(
        instrumentKey,
        intervalValue,
        intervalUnit,
        current,
        actualEnd,
      );

      if (!hasData) {
        // This chunk is missing — extend or start a gap
        if (!gapStart) {
          gapStart = new Date(current);
        }
      } else {
        // Data exists — close any open gap
        if (gapStart) {
          gaps.push({ from: gapStart, to: new Date(current) });
          gapStart = null;
        }
      }

      // Move to next chunk
      current.setTime(actualEnd.getTime());
      current.setDate(current.getDate() + 1);
    }

    // Close trailing gap
    if (gapStart) {
      gaps.push({ from: gapStart, to: new Date(to) });
    }

    if (gaps.length > 0) {
      this.logger.log(
        `Found ${gaps.length} gaps for ${instrumentKey} (${intervalUnit}): ` +
          gaps.map((g) => `${this.fmtDate(g.from)}→${this.fmtDate(g.to)}`).join(', '),
      );
    }

    return gaps;
  }

  /**
   * Get the latest candle timestamp for an instrument
   * Useful for incremental backfill (fetch from last known date)
   */
  async getLatestTimestamp(
    instrumentKey: string,
    intervalUnit: 'minute' | 'day',
  ): Promise<Date | null> {
    const latest = await this.candlesRepository.findLatest(
      instrumentKey,
      1,
      intervalUnit,
    );
    return latest?.timestamp ?? null;
  }

  /**
   * Check if any data exists for an instrument
   */
  async hasAnyData(
    instrumentKey: string,
    intervalUnit: 'minute' | 'day',
  ): Promise<boolean> {
    const earliest = new Date('2000-01-01');
    const now = new Date();
    return this.candlesRepository.existsForRange(
      instrumentKey,
      1,
      intervalUnit,
      earliest,
      now,
    );
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
