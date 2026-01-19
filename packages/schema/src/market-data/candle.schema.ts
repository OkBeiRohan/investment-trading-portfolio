/**
 * Market Candle (OHLCV) Data Types
 * Used for historical and intraday candlestick data
 */

import { MarketInstrumentSegment } from "./instrument.schema";

export type MarketCandleIntervalUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month";

export interface IMarketCandle<
  Segment extends MarketInstrumentSegment = MarketInstrumentSegment,
> {
  /** Candle timestamp (start of interval) */
  timestamp: Date;

  /** Instrument identifier (e.g., NSE_EQ|INE848E01016) */
  instrumentKey: string;

  /** Candle interval */
  intervalValue: number;

  /** Candle interval unit */
  intervalUnit: MarketCandleIntervalUnit;

  /** Opening price */
  open: number;

  /** Highest price */
  high: number;

  /** Lowest price */
  low: number;

  /** Closing price */
  close: number;

  /** Trading volume */
  volume: Segment extends "INDEX" ? undefined : number;

  /** Open interest (for derivatives and commodity) */
  openInterest: Segment extends "INDEX" | "EQUITY" ? undefined : number;
}

export interface ICandleInsert {
  /** Candle timestamp (Unix ms or Date) */
  timestamp: number | Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Candle interval */
  interval: string;

  /** Opening price */
  open: number;

  /** Highest price */
  high: number;

  /** Lowest price */
  low: number;

  /** Closing price */
  close: number;

  /** Trading volume */
  volume: number;

  /** Open interest (optional) */
  open_interest?: number;
}

export interface ICandleQuery {
  /** Instrument identifier */
  instrument_key: string;

  /** Candle interval */
  interval: string;

  /** Start time (inclusive) */
  start_time: Date;

  /** End time (inclusive) */
  end_time: Date;

  /** Limit results */
  limit?: number;
}
