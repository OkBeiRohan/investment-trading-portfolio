import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuthManagerService } from "@repo/authentication";
import { SocketPoolService } from "../../../websocket/socket-pool.service";
import {
  SubscriptionManagerService,
  SubscriptionPriority,
} from "../../../websocket/subscription-manager.service";
import { HeartbeatService } from "../../../websocket/heartbeat.service";
import { UPSTOX_CONSTANTS } from "../constants";
import * as protobuf from "protobufjs";
import * as WS from "ws";

export interface UpstoxMarketData {
  mode: "ltpc" | "full";
  instrumentKey: string;
  ltp?: number;
  lastTradeTime?: Date;
  volume?: number;
  oi?: number;
  bid?: { price: number; quantity: number; orders: number }[];
  ask?: { price: number; quantity: number; orders: number }[];
}

/**
 * Upstox WebSocket Service
 *
 * Handles Upstox-specific WebSocket connections with:
 * - Protobuf message decoding
 * - Connection pooling (5 sockets, 5000 instruments each)
 * - Auto-reconnect with exponential backoff
 * - Heartbeat monitoring
 */
@Injectable()
export class UpstoxWebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UpstoxWebSocketService.name);

  private protobufRoot: protobuf.Root | null = null;
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly authManager: AuthManagerService,
    private readonly socketPool: SocketPoolService,
    private readonly subscriptionManager: SubscriptionManagerService,
    private readonly heartbeat: HeartbeatService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    // Initialize socket pool for Upstox
    this.socketPool.initializePool("upstox", {
      maxConnections: UPSTOX_CONSTANTS.WEBSOCKET_LIMITS.MAX_CONNECTIONS_PLUS,
      maxInstrumentsPerSocket:
        UPSTOX_CONSTANTS.WEBSOCKET_LIMITS.MAX_SUBSCRIPTIONS_PLUS,
      reconnectDelay: 5000,
      heartbeatInterval: 30000,
    });

    // Load Protobuf schema for Upstox
    await this.loadProtobufSchema();

    // Listen for socket events
    this.eventEmitter.on("socket.created", this.handleSocketCreated.bind(this));
    this.eventEmitter.on("socket.dead", this.handleSocketDead.bind(this));

    this.logger.log("Upstox WebSocket service initialized");
  }

  /**
   * Subscribe to instruments
   */
  async subscribe(
    userId: string,
    instruments: string[],
    mode: "ltpc" | "full" = "ltpc",
    priority: SubscriptionPriority = SubscriptionPriority.NORMAL,
    callback: (data: UpstoxMarketData) => void
  ): Promise<string> {
    this.logger.log(
      `Subscribing user ${userId} to ${instruments.length} instruments`
    );

    return this.subscriptionManager.subscribe(
      "upstox",
      userId,
      instruments,
      priority,
      callback
    );
  }

  /**
   * Unsubscribe from instruments
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await this.subscriptionManager.unsubscribe("upstox", subscriptionId);
  }

  /**
   * Handle socket creation
   */
  private async handleSocketCreated(event: any) {
    if (event.provider !== "upstox") return;

    const { socketId } = event;

    try {
      // Get access token
      const token = await this.authManager.getAccessToken(
        "system", // Use system user for WebSocket auth
        "upstox",
        "LIVE"
      );

      // Create WebSocket connection
      const wsUrl = `${UPSTOX_CONSTANTS.WEBSOCKET.MARKET_DATA_URL}?access_token=${token}`;
      const ws = new WS.WebSocket(wsUrl) as any;

      // Attach to pooled socket
      const pool = this.socketPool["pools"].get("upstox");
      const pooledSocket = pool?.get(socketId);
      if (pooledSocket) {
        pooledSocket.socket = ws;
      }

      // Setup event handlers
      ws.on("open", () => this.handleOpen(socketId, ws));
      ws.on("message", (data: any) => this.handleMessage(socketId, data));
      ws.on("error", (error: any) => this.handleError(socketId, error));
      ws.on("close", () => this.handleClose(socketId));
      ws.on("pong", () => this.heartbeat.recordPong(socketId));

      this.logger.log(`WebSocket connected for ${socketId}`);
    } catch (error) {
      this.logger.error(`Failed to create WebSocket for ${socketId}`, error);
    }
  }

  /**
   * Handle socket open
   */
  private handleOpen(socketId: string, ws: any): void {
    this.logger.log(`Socket ${socketId} opened`);

    // Start heartbeat
    this.heartbeat.startHeartbeat(
      socketId,
      {
        interval: 30000, // 30 seconds
        timeout: 35000, // 35 seconds
        maxMissed: 3,
      },
      () => {
        if (ws.readyState === 1 /* OPEN */) {
          ws.ping();
        }
      }
    );

    // Reset reconnect attempts
    this.reconnectAttempts.set(socketId, 0);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(socketId: string, data: any): void {
    try {
      // Decode Protobuf message
      const decoded = this.decodeProtobuf(data);

      if (!decoded) return;

      // Route to subscriptions
      const { instrumentKey, ...marketData } = decoded;
      this.subscriptionManager.routeData("upstox", instrumentKey, decoded);
    } catch (error) {
      this.logger.error(`Failed to decode message from ${socketId}`, error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(socketId: string, error: any): void {
    this.logger.error(`WebSocket error for ${socketId}`, error);
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(socketId: string): void {
    this.logger.warn(`Socket ${socketId} closed`);

    // Stop heartbeat
    this.heartbeat.stopHeartbeat(socketId);

    // Trigger reconnect
    this.scheduleReconnect(socketId);
  }

  /**
   * Handle dead socket
   */
  private handleSocketDead(event: any): void {
    const { socketId } = event;
    this.logger.error(`Socket ${socketId} declared dead, reconnecting...`);

    this.scheduleReconnect(socketId);
  }

  /**
   * Schedule reconnect with exponential backoff
   */
  private scheduleReconnect(socketId: string): void {
    const attempts = this.reconnectAttempts.get(socketId) || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30s

    this.reconnectAttempts.set(socketId, attempts + 1);

    this.logger.log(
      `Scheduling reconnect for ${socketId} in ${delay}ms (attempt ${attempts + 1})`
    );

    const timer = setTimeout(() => {
      this.reconnect(socketId);
    }, delay);

    this.reconnectTimers.set(socketId, timer);
  }

  /**
   * Reconnect socket
   */
  private async reconnect(socketId: string): Promise<void> {
    this.logger.log(`Reconnecting ${socketId}...`);

    // Trigger socket recreation
    this.eventEmitter.emit("socket.created", {
      provider: "upstox",
      socketId,
      priority: 5,
    });
  }

  /**
   * Load Protobuf schema for Upstox
   */
  private async loadProtobufSchema(): Promise<void> {
    try {
      // Upstox Protobuf schema (simplified)
      const schema = `
        syntax = "proto3";
        
        message FeedResponse {
          string type = 1;
          
          message LTPC {
            double ltp = 1;
            int64 ltt = 2;
            double cp = 3;
            int64 volume = 4;
            int64 oi = 5;
          }
          
          message MarketLevel {
            double price = 1;
            int32 quantity = 2;
            int32 orders = 3;
          }
          
          message DepthData {
            repeated MarketLevel buy = 1;
            repeated MarketLevel sell = 2;
          }
          
          LTPC ltpc = 2;
          DepthData depth = 3;
        }
      `;

      this.protobufRoot = protobuf.parse(schema).root;
      this.logger.log("Protobuf schema loaded");
    } catch (error) {
      this.logger.error("Failed to load Protobuf schema", error);
    }
  }

  /**
   * Decode Protobuf message
   */
  private decodeProtobuf(data: Buffer): UpstoxMarketData | null {
    if (!this.protobufRoot) return null;

    try {
      const FeedResponse = this.protobufRoot.lookupType("FeedResponse");
      const message = FeedResponse.decode(data);
      const object = FeedResponse.toObject(message);

      // Transform to UpstoxMarketData
      return {
        mode: object.ltpc ? "ltpc" : "full",
        instrumentKey: "", // Extract from message
        ltp: object.ltpc?.ltp,
        lastTradeTime: object.ltpc?.ltt
          ? new Date(object.ltpc.ltt * 1000)
          : undefined,
        volume: object.ltpc?.volume,
        oi: object.ltpc?.oi,
        bid: object.depth?.buy,
        ask: object.depth?.sell,
      };
    } catch (error) {
      this.logger.error("Protobuf decode failed", error);
      return null;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      pool: this.socketPool.getPoolStats("upstox"),
      subscriptions: this.subscriptionManager.getSubscriptionStats("upstox"),
    };
  }

  /**
   * Cleanup
   */
  async onModuleDestroy() {
    this.logger.log("Cleaning up Upstox WebSocket service...");

    // Clear reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
  }
}
