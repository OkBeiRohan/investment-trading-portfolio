/**
 * Market Candle (OHLCV) Data Types
 * Used for historical and intraday candlestick data
 */

export type MarketCandleIntervalUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month";

export interface IMarketCandleBase {
  /** Candle timestamp (start of interval) */
  timestamp: string;

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
}

export interface IMarketCandleDerivative {
  /** Trading volume */
  volume: number;

  /** Open interest (for derivatives and commodity) */
  openInterest: number;
}

export interface IMarketCandleEquity {
  /** Trading volume */
  volume: number;

  openInterest: never;
}

type MarketCandle = IMarketCandleBase &
  (IMarketCandleDerivative | IMarketCandleEquity);
export default MarketCandle;

export interface ICandleQuery {
  /** Instrument identifier */
  instrumentKey: string;

  /** Candle interval */
  interval: string;

  /** Start time (inclusive) */
  startTime: string;

  /** End time (inclusive) */
  endTime: string;

  /** Limit results */
  limit?: number;
}
