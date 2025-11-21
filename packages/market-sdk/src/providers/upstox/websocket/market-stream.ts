import { Injectable, Logger } from "@nestjs/common";
import WebSocket from "ws";
import { EventEmitter } from "events";
import { ProtoDecoder, DecodedFeed } from "./proto-decoder";
import { WebSocketError } from "../../../core/error";
import { UPSTOX_CONSTANTS } from "../constants";

export type MarketStreamEvent = "connected" | "data" | "error" | "disconnected";

export interface MarketStreamConfig {
  accessToken: string;
  instrumentKeys: string[];
  mode?: "ltpc" | "full";
}

@Injectable()
export class MarketStream extends EventEmitter {
  private readonly logger = new Logger(MarketStream.name);
  private ws: WebSocket | null = null;
  private decoder: ProtoDecoder;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    super();
    this.decoder = new ProtoDecoder();
  }

  async connect(config: MarketStreamConfig): Promise<void> {
    if (this.isConnecting) {
      this.logger.warn("Connection already in progress");
      return;
    }

    this.isConnecting = true;

    try {
      // Initialize protobuf decoder
      if (!this.decoder.isInitialized()) {
        await this.decoder.initialize();
      }

      const url = `${UPSTOX_CONSTANTS.WEBSOCKET.MARKET_DATA_URL}?access_token=${config.accessToken}`;

      this.ws = new WebSocket(url, {
        handshakeTimeout: UPSTOX_CONSTANTS.TIMEOUT.WEBSOCKET_CONNECT,
      });

      this.setupEventHandlers(config.instrumentKeys, config.mode || "ltpc");

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new WebSocketError("Connection timeout"));
        }, UPSTOX_CONSTANTS.TIMEOUT.WEBSOCKET_CONNECT);

        this.ws!.once("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.ws!.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startPingInterval();

      this.logger.log("WebSocket connected successfully");
      this.emit("connected");
    } catch (error) {
      this.isConnecting = false;
      this.logger.error("Failed to connect:", error);
      throw new WebSocketError("Failed to connect to market stream", error);
    }
  }

  async subscribe(instrumentKeys: string[]): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketError("WebSocket not connected");
    }

    const subscribeMessage = {
      guid: "someguid",
      method: "sub",
      data: {
        mode: "full",
        instrumentKeys,
      },
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.logger.log(`Subscribed to ${instrumentKeys.length} instruments`);
  }

  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketError("WebSocket not connected");
    }

    const unsubscribeMessage = {
      guid: "someguid",
      method: "unsub",
      data: {
        mode: "full",
        instrumentKeys,
      },
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    this.logger.log(`Unsubscribed from ${instrumentKeys.length} instruments`);
  }

  disconnect(): void {
    this.stopPingInterval();
    this.stopReconnectTimer();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.logger.log("WebSocket disconnected");
    this.emit("disconnected");
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private setupEventHandlers(instrumentKeys: string[], mode: string): void {
    if (!this.ws) return;

    this.ws.on("open", () => {
      this.logger.log("WebSocket connection opened");

      // Send initial subscription
      const subscribeMessage = {
        guid: "someguid",
        method: "sub",
        data: {
          mode,
          instrumentKeys,
        },
      };
      this.ws!.send(JSON.stringify(subscribeMessage));
    });

    this.ws.on("message", (data: Buffer) => {
      try {
        const decoded = this.decoder.decode(data);
        this.emit("data", decoded);
      } catch (error) {
        this.logger.error("Failed to decode message:", error);
        this.emit("error", error);
      }
    });

    this.ws.on("error", (error) => {
      this.logger.error("WebSocket error:", error);
      this.emit("error", error);
    });

    this.ws.on("close", (code, reason) => {
      this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
      this.stopPingInterval();

      // Attempt reconnection
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleReconnect();
      } else {
        this.emit(
          "error",
          new WebSocketError("Max reconnection attempts reached")
        );
      }
    });
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, UPSTOX_CONSTANTS.TIMEOUT.WEBSOCKET_PING);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.logger.log(
        `Attempting reconnection (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
      );
      // Reconnection logic would go here
    }, delay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
