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
import * as path from "path";
import * as WS from "ws";

export interface UpstoxMarketData {
  mode: "ltpc" | "full";
  instrumentKey: string;
  ltp?: number;
  lastTradeTime?: Date;
  ltq?: number;
  cp?: number;
  volume?: number;
  oi?: number;
  iv?: number;
  atp?: number;
  tbq?: number;
  tsq?: number;
  bid?: { price: number; quantity: number }[];
  ask?: { price: number; quantity: number }[];
  optionGreeks?: {
    delta?: number;
    theta?: number;
    gamma?: number;
    vega?: number;
    rho?: number;
  };
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

    let token: string | undefined;
    const wsUrl = UPSTOX_CONSTANTS.WEBSOCKET.MARKET_DATA_URL_V3;
    try {
      token = await this.authManager.getAccessToken(
        "system",
        "upstox",
        "LIVE"
      );

      const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';

      this.logger.log(`WebSocket V3 connecting for ${socketId} (token: ${maskedToken})`);
      const ws = new WS.WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "*/*",
        },
        followRedirects: true,
      }) as any;

      const pool = this.socketPool["pools"].get("upstox");
      const pooledSocket = pool?.get(socketId);
      if (pooledSocket) {
        pooledSocket.socket = ws;
      }

      ws.on("open", () => this.handleOpen(socketId, ws));
      ws.on("message", (data: any) => this.handleMessage(socketId, data));
      ws.on("error", (error: any) => {
        const maskedTok = token && token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';
        this.logger.error(
          `WebSocket error for ${socketId} | Token: ${maskedTok} | ` +
          `URL: ${wsUrl} | Error: ${error?.message ?? error}`,
        );
      });
      ws.on("close", (code: number, reason: string) => {
        const maskedTok = token && token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****';
        this.logger.warn(
          `Socket ${socketId} closed | Code: ${code} | Reason: ${reason || 'N/A'} | Token: ${maskedTok}`,
        );
        this.heartbeat.stopHeartbeat(socketId);
        this.scheduleReconnect(socketId);
      });
      ws.on("pong", () => this.heartbeat.recordPong(socketId));

      this.logger.log(`WebSocket V3 connected for ${socketId}`);
    } catch (error: any) {
      const maskedToken = token && token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '(no token)';
      this.logger.error(
        `Failed to create WebSocket for ${socketId} | Token: ${maskedToken} | ` +
        `URL: ${wsUrl} | Error: ${error?.message ?? error}`,
      );
    }
  }

  /**
   * Handle socket open -- send V3 subscription message
   */
  private handleOpen(socketId: string, ws: any): void {
    this.logger.log(`Socket ${socketId} opened`);

    this.heartbeat.startHeartbeat(
      socketId,
      {
        interval: 30000,
        timeout: 35000,
        maxMissed: 3,
      },
      () => {
        if (ws.readyState === 1 /* OPEN */) {
          ws.ping();
        }
      }
    );

    this.reconnectAttempts.set(socketId, 0);

    const pool = this.socketPool["pools"].get("upstox");
    const pooledSocket = pool?.get(socketId);
    if (!pooledSocket || pooledSocket.instruments.size === 0) {
      this.logger.warn(`Socket ${socketId} has no instruments to subscribe to`);
      return;
    }

    const instrumentKeys = Array.from(pooledSocket.instruments);
    const mode = pooledSocket.feedMode || "full_d30";

    const subMessage = {
      guid: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      method: "sub",
      data: {
        mode,
        instrumentKeys,
      },
    };

    const binaryMsg = Buffer.from(JSON.stringify(subMessage));
    ws.send(binaryMsg);

    this.logger.log(
      `Sent V3 subscription for ${instrumentKeys.length} instruments (mode: ${mode}) on ${socketId}`,
    );
  }

  /**
   * Handle incoming V3 message -- one FeedResponse contains data for multiple instruments
   */
  private handleMessage(socketId: string, data: any): void {
    try {
      const feedItems = this.decodeV3FeedResponse(data);
      if (!feedItems) return;

      for (const item of feedItems) {
        this.subscriptionManager.routeData("upstox", item.instrumentKey, item);
      }
    } catch (error) {
      this.logger.error(`Failed to decode message from ${socketId}`, error);
    }
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
   * Load Protobuf V3 schema from the actual .proto file
   */
  private async loadProtobufSchema(): Promise<void> {
    const candidates = [
      path.resolve(__dirname, "proto", "MarketDataFeedV3.proto"),
      path.resolve(__dirname, "..", "websocket", "proto", "MarketDataFeedV3.proto"),
      path.resolve(__dirname, "..", "..", "..", "..", "src", "providers", "upstox", "websocket", "proto", "MarketDataFeedV3.proto"),
    ];

    for (const protoPath of candidates) {
      try {
        this.protobufRoot = await protobuf.load(protoPath);
        this.logger.log(`Protobuf V3 schema loaded from ${protoPath}`);
        return;
      } catch {
        // try next candidate
      }
    }
    this.logger.error(
      `Failed to load Protobuf V3 schema. Tried paths: ${candidates.join(", ")}`,
    );
  }

  /**
   * Decode V3 FeedResponse -- returns an array of market data items (one per instrument)
   */
  private decodeV3FeedResponse(data: Buffer): UpstoxMarketData[] | null {
    if (!this.protobufRoot) return null;

    try {
      const FeedResponse = this.protobufRoot.lookupType(
        "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
      );
      const message = FeedResponse.decode(
        data instanceof Buffer ? new Uint8Array(data) : data,
      );
      const obj = FeedResponse.toObject(message, {
        longs: Number,
        enums: String,
        defaults: true,
      });

      const typeVal = obj.type;
      if (typeVal === "market_info" || typeVal === 2) {
        this.logger.debug(
          `Market info received: ${JSON.stringify(obj.marketInfo?.segmentStatus ?? {})}`,
        );
        return null;
      }

      if (!obj.feeds) return null;

      const results: UpstoxMarketData[] = [];

      for (const [instrumentKey, feed] of Object.entries(obj.feeds) as [string, any][]) {
        const item = this.transformFeedToMarketData(instrumentKey, feed);
        if (item) results.push(item);
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      this.logger.error("Protobuf V3 decode failed", error);
      return null;
    }
  }

  private transformFeedToMarketData(
    instrumentKey: string,
    feed: any,
  ): UpstoxMarketData | null {
    if (!feed) return null;

    const fullFeed = feed.fullFeed?.marketFF || feed.fullFeed?.indexFF;
    const ltpcData = feed.ltpc || fullFeed?.ltpc;
    const greeksFeed = feed.firstLevelWithGreeks;

    if (!ltpcData && !fullFeed && !greeksFeed) return null;

    const ltpc = ltpcData || greeksFeed?.ltpc;

    const result: UpstoxMarketData = {
      mode: fullFeed ? "full" : "ltpc",
      instrumentKey,
      ltp: ltpc?.ltp,
      lastTradeTime: ltpc?.ltt ? new Date(Number(ltpc.ltt)) : undefined,
      ltq: ltpc?.ltq ? Number(ltpc.ltq) : undefined,
      cp: ltpc?.cp,
    };

    if (feed.fullFeed?.marketFF) {
      const mff = feed.fullFeed.marketFF;
      result.volume = mff.vtt ? Number(mff.vtt) : undefined;
      result.oi = mff.oi;
      result.iv = mff.iv;
      result.atp = mff.atp;
      result.tbq = mff.tbq;
      result.tsq = mff.tsq;

      if (mff.marketLevel?.bidAskQuote) {
        const quotes = mff.marketLevel.bidAskQuote;
        result.bid = quotes.map((q: any) => ({
          price: q.bidP || 0,
          quantity: q.bidQ ? Number(q.bidQ) : 0,
        }));
        result.ask = quotes.map((q: any) => ({
          price: q.askP || 0,
          quantity: q.askQ ? Number(q.askQ) : 0,
        }));
      }

      if (mff.optionGreeks) {
        result.optionGreeks = {
          delta: mff.optionGreeks.delta,
          theta: mff.optionGreeks.theta,
          gamma: mff.optionGreeks.gamma,
          vega: mff.optionGreeks.vega,
          rho: mff.optionGreeks.rho,
        };
      }
    } else if (greeksFeed) {
      result.volume = greeksFeed.vtt ? Number(greeksFeed.vtt) : undefined;
      result.oi = greeksFeed.oi;
      result.iv = greeksFeed.iv;

      if (greeksFeed.optionGreeks) {
        result.optionGreeks = {
          delta: greeksFeed.optionGreeks.delta,
          theta: greeksFeed.optionGreeks.theta,
          gamma: greeksFeed.optionGreeks.gamma,
          vega: greeksFeed.optionGreeks.vega,
          rho: greeksFeed.optionGreeks.rho,
        };
      }

      if (greeksFeed.firstDepth) {
        result.bid = [{ price: greeksFeed.firstDepth.bidP || 0, quantity: Number(greeksFeed.firstDepth.bidQ || 0) }];
        result.ask = [{ price: greeksFeed.firstDepth.askP || 0, quantity: Number(greeksFeed.firstDepth.askQ || 0) }];
      }
    } else if (feed.fullFeed?.indexFF) {
      // Index feeds have no depth/OI, just LTPC + OHLC
    }

    return result;
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
