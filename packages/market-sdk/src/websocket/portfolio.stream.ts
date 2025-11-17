/**
 * Portfolio Stream (Order & Position Updates)
 * Real-time portfolio updates via WebSocket
 */

import UpstoxClient from "upstox-js-sdk";
import type {
  PortfolioStreamFeed,
  WebSocketConfig,
  PortfolioStreamCallback,
  ErrorCallback,
  ConnectionCallback,
} from "@repo/schema";

export class PortfolioStream {
  private feeder: any; // UpstoxClient.PortfolioDataStreamer
  private config: WebSocketConfig;
  private onDataCallback?: PortfolioStreamCallback;
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
   * Connect to the portfolio stream
   */
  async connect(): Promise<void> {
    try {
      // Initialize the PortfolioDataStreamer
      this.feeder = new UpstoxClient.PortfolioDataStreamer();

      // Setup auto-reconnect
      if (this.config.reconnect) {
        this.feeder.autoReconnect(
          true,
          this.config.reconnectInterval / 1000,
          this.config.maxReconnectAttempts
        );
      }

      // Setup event handlers
      this.feeder.on("open", () => {
        console.log("Portfolio stream connected");
        this.onConnectCallback?.();
      });

      this.feeder.on("message", (data: any) => {
        const feedData = this.parsePortfolioFeed(data);
        this.onDataCallback?.(feedData);
      });

      this.feeder.on("error", (error: Error) => {
        console.error("Portfolio stream error:", error);
        this.onErrorCallback?.(error);
      });

      this.feeder.on("close", () => {
        console.log("Portfolio stream disconnected");
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
   * Disconnect from the stream
   */
  disconnect(): void {
    if (this.feeder) {
      this.feeder.disconnect();
      this.feeder = null;
    }
  }

  /**
   * Register callback for portfolio updates
   */
  onData(callback: PortfolioStreamCallback): void {
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
   * Parse raw portfolio feed data
   */
  private parsePortfolioFeed(rawData: any): PortfolioStreamFeed {
    // Determine feed type based on data structure
    let type: "order" | "position" | "holding" = "order";

    if (rawData.order_id) {
      type = "order";
    } else if (rawData.instrument_token && rawData.quantity) {
      type = "position";
    } else if (rawData.isin) {
      type = "holding";
    }

    return {
      type,
      data: rawData,
      timestamp: new Date(),
    };
  }
}
