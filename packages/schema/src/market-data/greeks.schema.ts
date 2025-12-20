/**
 * Option Greeks Data Types
 * Greeks snapshots for options contracts
 */

export interface IOptionGreeks {
  /** Greeks snapshot timestamp */
  timestamp: Date;

  /** Option instrument identifier */
  instrument_key: string;

  /** Delta: Rate of change of option price w.r.t. underlying */
  delta: number;

  /** Gamma: Rate of change of delta w.r.t. underlying */
  gamma: number;

  /** Theta: Time decay of option value */
  theta: number;

  /** Vega: Sensitivity to volatility changes */
  vega: number;

  /** Implied Volatility (IV) */
  iv: number;

  /** Underlying asset price */
  underlying_price: number;
}

export interface IGreeksInsert {
  /** Greeks snapshot timestamp (Unix ms or Date) */
  timestamp: number | Date;

  /** Option instrument identifier */
  instrument_key: string;

  /** Delta */
  delta: number;

  /** Gamma */
  gamma: number;

  /** Theta */
  theta: number;

  /** Vega */
  vega: number;

  /** Implied Volatility */
  iv: number;

  /** Underlying price */
  underlying_price: number;
}

export interface IGreeksQuery {
  /** Instrument identifier */
  instrument_key: string;

  /** Start time (inclusive) */
  start_time: Date;

  /** End time (inclusive) */
  end_time: Date;

  /** Limit results */
  limit?: number;
}
