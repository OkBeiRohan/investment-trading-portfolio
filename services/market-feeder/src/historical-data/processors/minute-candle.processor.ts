/**
 * Minute Candle Processor
 * Transforms raw Upstox candles to QuestDB format for minute timeframes
 */

import { Injectable, Logger } from '@nestjs/common';
import { UpstoxCandleData } from '../simple-client';

export interface ProcessedMinuteCandle {
  timestamp: Date;
  instrumentKey: string;
  intervalValue: number;
  intervalUnit: 'minute';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  openInterest: number | null;
}

@Injectable()
export class MinuteCandleProcessor {
  private readonly logger = new Logger(MinuteCandleProcessor.name);

  /**
   * Process raw Upstox candles to QuestDB format
   */
  process(
    candles: UpstoxCandleData[],
    instrumentKey: string,
    intervalValue = 1,
  ): ProcessedMinuteCandle[] {
    return candles.map((candle) => ({
      timestamp: new Date(candle.timestamp),
      instrumentKey,
      intervalValue,
      intervalUnit: 'minute' as const,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      openInterest: candle.open_interest || null,
    }));
  }

  /**
   * Filter candles to market hours (9:15 AM - 3:30 PM IST)
   */
  filterMarketHours(candles: ProcessedMinuteCandle[]): ProcessedMinuteCandle[] {
    return candles.filter((candle) => {
      const hour = candle.timestamp.getHours();
      const minute = candle.timestamp.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      // Market hours: 9:15 AM (555) to 3:30 PM (930) IST
      return timeInMinutes >= 555 && timeInMinutes <= 930;
    });
  }

  /**
   * Validate candle data quality
   */
  validate(candle: ProcessedMinuteCandle): { valid: boolean; reason?: string } {
    if (candle.close <= 0) {
      return { valid: false, reason: 'Invalid close price' };
    }
    if (candle.high < candle.low) {
      return { valid: false, reason: 'High < Low' };
    }
    if (candle.volume !== null && candle.volume < 0) {
      return { valid: false, reason: 'Negative volume' };
    }
    return { valid: true };
  }
}
