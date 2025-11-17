/**
 * Market Data WebSocket Stream (V3)
 * Real-time market data feed using WebSocket and Protobuf
 */

import UpstoxClient from "upstox-js-sdk";
import type {
  MarketDataFeed,
  WebSocketConfig,
  MarketDataCallback,
  ErrorCallback,
  ConnectionCallback,
} from "../types";
import { MarketDataMode } from "../types";

export class MarketDataStream {
  private feeder: any; // UpstoxClient.MarketDataFeederV3
  private config: WebSocketConfig;
  private onDataCallback?: MarketDataCallback;
  private onErrorCallback?: ErrorCallback;
  private onConnectCallback?: ConnectionCallback;
  private onDisconnectCallback?: ConnectionCallback;

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      reconnect: config?.reconnect ?? true,
      reconnectInterval: config?.reconnectInterval ?? 5000,
      maxReconnectAttempts: config?.maxReconnectAttempts ?? 10,
    };
  }

  /**
   * Connect to the WebSocket stream
   */
  async connect(
    instrumentKeys: string[] = [],
    mode: MarketDataMode = MarketDataMode.FULL
  ): Promise<void> {
    try {
      // Initialize the MarketDataFeederV3
      this.feeder = new UpstoxClient.MarketDataFeederV3(instrumentKeys, mode);

      // Setup auto-reconnect
      if (this.config.reconnect) {
        this.feeder.autoReconnect(
          true,
          this.config.reconnectInterval / 1000, // Convert to seconds
          this.config.maxReconnectAttempts
        );
      }

      // Setup event handlers
      this.feeder.on("open", () => {
        console.log("Market data stream connected");
        this.onConnectCallback?.();
      });

      this.feeder.on("message", (data: any) => {
        const feedData = this.parseMarketDataFeed(data);
        this.onDataCallback?.(feedData);
      });

      this.feeder.on("error", (error: Error) => {
        console.error("Market data stream error:", error);
        this.onErrorCallback?.(error);
      });

      this.feeder.on("close", () => {
        console.log("Market data stream disconnected");
        this.onDisconnectCallback?.();
      });

      // Connect to WebSocket
      await this.feeder.connect();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onErrorCallback?.(err);
      throw err;
    }
  }

  /**
   * Subscribe to instrument keys
   */
  subscribe(
    instrumentKeys: string[],
    mode: MarketDataMode = MarketDataMode.FULL
  ): void {
    if (!this.feeder) {
      throw new Error("Stream not connected. Call connect() first.");
    }
    this.feeder.subscribe(instrumentKeys, mode);
  }

  /**
   * Unsubscribe from instrument keys
   */
  unsubscribe(instrumentKeys: string[]): void {
    if (!this.feeder) {
      throw new Error("Stream not connected. Call connect() first.");
    }
    this.feeder.unsubscribe(instrumentKeys);
  }

  /**
   * Change subscription mode for existing instruments
   */
  changeMode(instrumentKeys: string[], newMode: MarketDataMode): void {
    if (!this.feeder) {
      throw new Error("Stream not connected. Call connect() first.");
    }
    this.feeder.changeMode(instrumentKeys, newMode);
  }

  /**
   * Disconnect from the stream
   */
  disconnect(): void {
    if (this.feeder) {
      this.feeder.disconnect();
      this.feeder = null;
    }
  }

  /**
   * Register callback for market data updates
   */
  onData(callback: MarketDataCallback): void {
    this.onDataCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }

  /**
   * Register callback for connection events
   */
  onConnect(callback: ConnectionCallback): void {
    this.onConnectCallback = callback;
  }

  /**
   * Register callback for disconnection events
   */
  onDisconnect(callback: ConnectionCallback): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Parse raw feed data into structured format
   */
  private parseMarketDataFeed(rawData: any): MarketDataFeed {
    const feeds = rawData.feeds || {};
    const feedData: MarketDataFeed = {
      instrumentKey: Object.keys(feeds)[0] || "",
      mode: MarketDataMode.FULL,
    };

    const feed = feeds[feedData.instrumentKey];
    if (!feed) {
      return feedData;
    }

    // LTPC mode data
    if (feed.ltpc) {
      feedData.lastPrice = feed.ltpc.ltp;
      feedData.lastQuantity = feed.ltpc.ltt;
      feedData.lastTradeTime = feed.ltpc.lt
        ? new Date(feed.ltpc.lt)
        : undefined;
    }

    // FULL mode data
    if (feed.ff) {
      const marketFF = feed.ff.marketFF;
      if (marketFF) {
        feedData.ohlc = {
          open: marketFF.ltpc?.op,
          high: marketFF.ltpc?.h,
          low: marketFF.ltpc?.l,
          close: marketFF.ltpc?.cp,
        };
        feedData.bidPrice = marketFF.marketLevel?.bidAskQuote?.bidPrice;
        feedData.bidQuantity = marketFF.marketLevel?.bidAskQuote?.bidQty;
        feedData.askPrice = marketFF.marketLevel?.bidAskQuote?.askPrice;
        feedData.askQuantity = marketFF.marketLevel?.bidAskQuote?.askQty;
        feedData.volume = marketFF.marketOHLC?.volume;
        feedData.totalBuyQuantity = marketFF.eFeedDetails?.tbq;
        feedData.totalSellQuantity = marketFF.eFeedDetails?.tsq;
        feedData.averagePrice = marketFF.ltpc?.atp;
        feedData.openInterest = marketFF.optionGreeks?.oi;
        feedData.netChange = marketFF.ltpc?.ycp
          ? feed.ff.indexFF?.ltpc?.ltp - marketFF.ltpc.ycp
          : undefined;
      }

      // Market depth
      if (marketFF?.marketLevel?.depth) {
        feedData.depth = {
          buy:
            marketFF.marketLevel.depth.buy?.map((item: any) => ({
              price: item.price,
              quantity: item.quantity,
              orders: item.orders,
            })) || [],
          sell:
            marketFF.marketLevel.depth.sell?.map((item: any) => ({
              price: item.price,
              quantity: item.quantity,
              orders: item.orders,
            })) || [],
        };
      }
    }

    // Option Greeks
    if (feed.ff?.marketFF?.optionGreeks) {
      const greeks = feed.ff.marketFF.optionGreeks;
      feedData.greeks = {
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        iv: greeks.iv,
      };
    }

    return feedData;
  }
}
