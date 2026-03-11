/**
 * Yahoo Finance Provider Types
 */

export interface YahooHistoricalResult {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface YahooQuoteResult {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  shortName?: string;
  longName?: string;
  symbol: string;
  exchange: string;
  currency: string;
  marketState: string;
}
