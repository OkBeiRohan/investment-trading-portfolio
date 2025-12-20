/**
 * Market Depth (Order Book) Data Types
 * Level-wise bid/ask depth data
 */

export type DepthSide = "BUY" | "SELL";

export interface IMarketDepthLevel {
  /** Price level */
  price: number;

  /** Quantity at this level */
  quantity: number;

  /** Number of orders at this level */
  orders: number;
}

export interface IMarketDepth {
  /** Depth snapshot timestamp */
  timestamp: Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Side (BUY or SELL) */
  side: DepthSide;

  /** Level (0-4 for 5 levels) */
  level: number;

  /** Price at this level */
  price: number;

  /** Quantity at this level */
  quantity: number;

  /** Number of orders */
  orders: number;
}

export interface IDepthInsert {
  /** Depth snapshot timestamp (Unix ms or Date) */
  timestamp: number | Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Side (BUY or SELL) */
  side: DepthSide;

  /** Level (0-4) */
  level: number;

  /** Price */
  price: number;

  /** Quantity */
  quantity: number;

  /** Orders count */
  orders: number;
}

export interface IDepthQuery {
  /** Instrument identifier */
  instrument_key: string;

  /** Side filter (optional) */
  side?: DepthSide;

  /** Start time (inclusive) */
  start_time: Date;

  /** End time (inclusive) */
  end_time: Date;

  /** Limit results */
  limit?: number;
}

export interface IDepthSnapshot {
  /** Snapshot timestamp */
  timestamp: Date;

  /** Instrument identifier */
  instrument_key: string;

  /** Buy levels (5 levels) */
  buy: IMarketDepthLevel[];

  /** Sell levels (5 levels) */
  sell: IMarketDepthLevel[];
}
