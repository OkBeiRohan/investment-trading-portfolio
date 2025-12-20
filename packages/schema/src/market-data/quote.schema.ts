/**
 * Market Quote Data Types
 * Real-time bid/ask quotes and last traded price
 */

export interface IMarketQuote {
  /** Quote timestamp */
  timestamp: Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Last traded price */
  ltp: number;

  /** Best bid price */
  bid?: number;

  /** Best ask price */
  ask?: number;

  /** Bid quantity */
  bid_qty?: number;

  /** Ask quantity */
  ask_qty?: number;

  /** Total volume traded */
  volume?: number;

  /** Open interest (derivatives) */
  open_interest?: number;

  /** Upper circuit limit */
  upper_circuit?: number;

  /** Lower circuit limit */
  lower_circuit?: number;
}

export interface IQuoteInsert {
  /** Quote timestamp (Unix ms or Date) */
  timestamp: number | Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Last traded price */
  ltp: number;

  /** Best bid price */
  bid?: number;

  /** Best ask price */
  ask?: number;

  /** Bid quantity */
  bid_qty?: number;

  /** Ask quantity */
  ask_qty?: number;

  /** Total volume */
  volume?: number;

  /** Open interest */
  open_interest?: number;

  /** Upper circuit limit */
  upper_circuit?: number;

  /** Lower circuit limit */
  lower_circuit?: number;
}

export interface IQuoteQuery {
  /** Instrument identifier */
  instrument_key: string;

  /** Start time (inclusive) */
  start_time: Date;

  /** End time (inclusive) */
  end_time: Date;

  /** Limit results */
  limit?: number;
}
