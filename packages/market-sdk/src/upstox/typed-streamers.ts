/**
 * Type-Safe WebSocket Streamers for Upstox
 * Provides strongly-typed wrappers around MarketDataStreamerV3 and PortfolioDataStreamer
 */

import { EventEmitter } from "events";
import * as UpstoxJS from "upstox-js-sdk";

// ==================== Market Data Types ====================
export type MarketDataMode = "ltpc" | "full" | "full_d30" | "option_greeks";

export interface MarketDataLTPC {
  ltp?: number; // Last traded price
  ltt?: number; // Last traded time
  ltq?: number; // Last traded quantity
  cp?: number; // Close price
}

export interface MarketDataOHLC {
  interval: string; // '1minute', '30minute', 'day', etc.
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ts: number; // Timestamp
}

export interface MarketDataBidAsk {
  bq: number; // Bid quantity
  bp: number; // Bid price
  bno: number; // Bid orders
  aq: number; // Ask quantity
  ap: number; // Ask price
  ano: number; // Ask orders
}

export interface MarketDataOptionGreeks {
  vega?: number;
  theta?: number;
  gamma?: number;
  delta?: number;
  iv?: number; // Implied volatility
}

export interface MarketDataFeedDetails {
  cp?: number; // Close price
  mp?: number; // Market price
  lf?: number; // Lower freeze
  pp?: number; // Previous price
  fh?: number; // Freeze high
  fl?: number; // Freeze low
}

export interface MarketDataFeed {
  ff?: {
    indexFF?: number; // Index feed flag
    marketFF?: number; // Market feed flag
  };
  ltpc?: MarketDataLTPC;
  marketOHLC?: {
    ohlc?: MarketDataOHLC[];
  };
  marketLevel?: {
    bidAskQuote?: MarketDataBidAsk[];
  };
  optionGreek?: MarketDataOptionGreeks;
  eFeedDetails?: MarketDataFeedDetails;
}

export interface ParsedMarketData {
  instrumentKey: string;
  feed: MarketDataFeed;
}

// ==================== Portfolio Data Types ====================
export type PortfolioUpdateType = "order" | "position" | "holding" | "gtt";

export interface OrderUpdate {
  exchange: string;
  price: number;
  product: string;
  quantity: number;
  status: string;
  instrument_token: string;
  trading_symbol: string;
  order_type: string;
  validity: string;
  trigger_price: number;
  transaction_type: string;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  order_id: string;
  order_timestamp: string;
  exchange_order_id: string;
  is_amo: boolean;
  variety: string;
  guid: string;
}

export interface PositionUpdate {
  exchange: string;
  multiplier: number;
  pnl: number;
  buy_value: number;
  sell_value: number;
  close_price: number;
  quantity: number;
  last_price: number;
  instrument_token: string;
  trading_symbol: string;
  product: string;
  buy_quantity: number;
  sell_quantity: number;
}

export interface HoldingUpdate {
  isin: string;
  quantity: number;
  instrument_token: string;
  average_price: number;
  trading_symbol: string;
  close_price: number;
  pnl: number;
}

export interface GttUpdate {
  id: string;
  status: string;
  trigger_type: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ParsedPortfolioData {
  type: PortfolioUpdateType;
  data: OrderUpdate | PositionUpdate | HoldingUpdate | GttUpdate;
}

// ==================== Typed Market Data Streamer ====================
export interface TypedMarketDataStreamerEvents {
  open: () => void;
  close: () => void;
  message: (data: ParsedMarketData[]) => void;
  rawMessage: (data: Buffer) => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  autoReconnectStopped: (message: string) => void;
}

export declare interface TypedMarketDataStreamer {
  on<E extends keyof TypedMarketDataStreamerEvents>(
    event: E,
    listener: TypedMarketDataStreamerEvents[E]
  ): this;
  once<E extends keyof TypedMarketDataStreamerEvents>(
    event: E,
    listener: TypedMarketDataStreamerEvents[E]
  ): this;
  off<E extends keyof TypedMarketDataStreamerEvents>(
    event: E,
    listener: TypedMarketDataStreamerEvents[E]
  ): this;
  emit<E extends keyof TypedMarketDataStreamerEvents>(
    event: E,
    ...args: Parameters<TypedMarketDataStreamerEvents[E]>
  ): boolean;
}

/**
 * Type-safe wrapper around MarketDataStreamerV3
 * Provides parsed message data instead of raw buffers
 */
export class TypedMarketDataStreamer extends EventEmitter {
  private streamer: UpstoxJS.MarketDataStreamerV3;

  constructor(instrumentKeys?: string[], mode?: MarketDataMode) {
    super();
    this.streamer = new UpstoxJS.MarketDataStreamerV3(instrumentKeys, mode);
    this.setupListeners();
  }

  private setupListeners(): void {
    this.streamer.on("open", () => {
      this.emit("open");
    });

    this.streamer.on("close", () => {
      this.emit("close");
    });

    this.streamer.on("message", (data: Buffer) => {
      // Emit raw message first
      this.emit("rawMessage", data);

      // Parse and emit typed message
      try {
        const parsed = this.parseMarketData(data);
        this.emit("message", parsed);
      } catch (error) {
        this.emit("error", error as Error);
      }
    });

    this.streamer.on("error", (error: Error) => {
      this.emit("error", error);
    });

    this.streamer.on("reconnecting", (attempt: number) => {
      this.emit("reconnecting", attempt);
    });

    this.streamer.on("autoReconnectStopped", (message: string) => {
      this.emit("autoReconnectStopped", message);
    });
  }

  private parseMarketData(data: Buffer): ParsedMarketData[] {
    const jsonString = data.toString("utf-8");
    const parsed = JSON.parse(jsonString);

    if (parsed.feeds) {
      return Object.entries(parsed.feeds).map(([key, value]) => ({
        instrumentKey: key,
        feed: value as MarketDataFeed,
      }));
    }

    return [];
  }

  /**
   * Establish WebSocket connection
   */
  connect(): void {
    this.streamer.connect();
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.streamer.disconnect();
  }

  /**
   * Subscribe to market data for instruments
   */
  subscribe(instrumentKeys: string[], mode: MarketDataMode): void {
    this.streamer.subscribe(instrumentKeys, mode);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribe(instrumentKeys: string[]): void {
    this.streamer.unsubscribe(instrumentKeys);
  }

  /**
   * Change subscription mode for instruments
   */
  changeMode(instrumentKeys: string[], mode: MarketDataMode): void {
    this.streamer.changeMode(instrumentKeys, mode);
  }

  /**
   * Configure auto-reconnect behavior
   */
  autoReconnect(enable: boolean, interval = 5, retryCount = 3): void {
    this.streamer.autoReconnect(enable, interval, retryCount);
  }

  /**
   * Get raw streamer instance (for advanced usage)
   */
  getRawStreamer(): UpstoxJS.MarketDataStreamerV3 {
    return this.streamer;
  }
}

// ==================== Typed Portfolio Data Streamer ====================
export interface TypedPortfolioDataStreamerEvents {
  open: () => void;
  close: () => void;
  message: (data: ParsedPortfolioData) => void;
  rawMessage: (data: Buffer) => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  autoReconnectStopped: (message: string) => void;
}

export declare interface TypedPortfolioDataStreamer {
  on<E extends keyof TypedPortfolioDataStreamerEvents>(
    event: E,
    listener: TypedPortfolioDataStreamerEvents[E]
  ): this;
  once<E extends keyof TypedPortfolioDataStreamerEvents>(
    event: E,
    listener: TypedPortfolioDataStreamerEvents[E]
  ): this;
  off<E extends keyof TypedPortfolioDataStreamerEvents>(
    event: E,
    listener: TypedPortfolioDataStreamerEvents[E]
  ): this;
  emit<E extends keyof TypedPortfolioDataStreamerEvents>(
    event: E,
    ...args: Parameters<TypedPortfolioDataStreamerEvents[E]>
  ): boolean;
}

/**
 * Type-safe wrapper around PortfolioDataStreamer
 * Provides parsed portfolio update data
 */
export class TypedPortfolioDataStreamer extends EventEmitter {
  private streamer: UpstoxJS.PortfolioDataStreamer;

  constructor(
    orderUpdate = true,
    positionUpdate = false,
    holdingUpdate = false,
    gttUpdate = false
  ) {
    super();
    this.streamer = new UpstoxJS.PortfolioDataStreamer(
      orderUpdate,
      positionUpdate,
      holdingUpdate,
      gttUpdate
    );
    this.setupListeners();
  }

  private setupListeners(): void {
    this.streamer.on("open", () => {
      this.emit("open");
    });

    this.streamer.on("close", () => {
      this.emit("close");
    });

    this.streamer.on("message", (data: Buffer) => {
      // Emit raw message first
      this.emit("rawMessage", data);

      // Parse and emit typed message
      try {
        const parsed = this.parsePortfolioData(data);
        this.emit("message", parsed);
      } catch (error) {
        this.emit("error", error as Error);
      }
    });

    this.streamer.on("error", (error: Error) => {
      this.emit("error", error);
    });

    this.streamer.on("reconnecting", (attempt: number) => {
      this.emit("reconnecting", attempt);
    });

    this.streamer.on("autoReconnectStopped", (message: string) => {
      this.emit("autoReconnectStopped", message);
    });
  }

  private parsePortfolioData(data: Buffer): ParsedPortfolioData {
    const jsonString = data.toString("utf-8");
    const parsed = JSON.parse(jsonString);

    // Upstox sends different message types
    // Type is determined by the presence of certain fields
    let type: PortfolioUpdateType = "order";

    if (parsed.order_id) {
      type = "order";
    } else if (parsed.id && parsed.trigger_type) {
      type = "gtt";
    } else if (parsed.isin) {
      type = "holding";
    } else if (parsed.pnl !== undefined) {
      type = "position";
    }

    return {
      type,
      data: parsed,
    };
  }

  /**
   * Establish WebSocket connection
   */
  connect(): void {
    this.streamer.connect();
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    this.streamer.disconnect();
  }

  /**
   * Configure auto-reconnect behavior
   */
  autoReconnect(enable: boolean, interval = 5, retryCount = 3): void {
    this.streamer.autoReconnect(enable, interval, retryCount);
  }

  /**
   * Get raw streamer instance (for advanced usage)
   */
  getRawStreamer(): UpstoxJS.PortfolioDataStreamer {
    return this.streamer;
  }
}

// ==================== Helper Functions ====================

/**
 * Extract LTP from market data feed
 */
export function extractLTP(feed: MarketDataFeed): number | undefined {
  return feed.ltpc?.ltp;
}

/**
 * Extract option Greeks from market data feed
 */
export function extractGreeks(
  feed: MarketDataFeed
): MarketDataOptionGreeks | undefined {
  return feed.optionGreek;
}

/**
 * Extract latest OHLC candle from market data feed
 */
export function extractLatestOHLC(
  feed: MarketDataFeed
): MarketDataOHLC | undefined {
  const candles = feed.marketOHLC?.ohlc;
  return candles && candles.length > 0
    ? candles[candles.length - 1]
    : undefined;
}

/**
 * Extract bid-ask depth from market data feed
 */
export function extractDepth(
  feed: MarketDataFeed
): MarketDataBidAsk[] | undefined {
  return feed.marketLevel?.bidAskQuote;
}

/**
 * Check if order is complete
 */
export function isOrderComplete(order: OrderUpdate): boolean {
  return (
    order.status === "COMPLETE" || order.filled_quantity === order.quantity
  );
}

/**
 * Check if order is pending
 */
export function isOrderPending(order: OrderUpdate): boolean {
  return order.status === "OPEN" || order.status === "PENDING";
}

/**
 * Check if order is cancelled or rejected
 */
export function isOrderTerminal(order: OrderUpdate): boolean {
  return (
    order.status === "CANCELLED" ||
    order.status === "REJECTED" ||
    order.status === "COMPLETE"
  );
}
