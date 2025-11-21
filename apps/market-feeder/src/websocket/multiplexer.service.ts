import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import WebSocket from "ws";
import { RedisService } from "@repo/database";
import * as protobuf from "protobufjs";

/**
 * Priority levels for subscription management
 * Lower number = Higher priority (won't be evicted)
 */
export enum SubscriptionPriority {
  CRITICAL = 1, // Indices (Nifty 50, Bank Nifty)
  HIGH = 2, // ATM options (strike closest to spot)
  MEDIUM = 3, // Near OTM (±5 strikes from ATM)
  LOW = 4, // Deep OTM (>±5 strikes from ATM)
}

/**
 * Upstox V3 Feed Modes (determines capacity per socket)
 */
export enum FeedMode {
  LTPC = "ltpc", // 5000 keys (lightweight)
  FULL = "full", // 2000 keys (with market depth)
  OPTION_GREEKS = "option_greeks", // 3000 keys (with Greeks)
}

interface SocketState {
  id: string;
  url: string;
  load: number; // Current number of subscriptions
  capacity: number; // Max keys based on mode
  mode: FeedMode;
  keys: Set<string>; // Subscribed instrument keys
  connection: WebSocket;
  lastHeartbeat: Date;
}

interface SubscriptionRequest {
  instrumentKey: string;
  priority: SubscriptionPriority;
  mode?: FeedMode;
}

/**
 * WebSocket Multiplexer Service
 *
 * Manages multiple Upstox WebSocket connections with intelligent
 * subscription allocation and priority-based eviction.
 *
 * Upstox V3 Limits:
 * - Basic Plan: 2 sockets
 * - Plus Plan: 5 sockets
 * - Keys per socket: 3000-5000 (mode-dependent)
 */
@Injectable()
export class MultiplexerService implements OnModuleDestroy {
  private readonly logger = new Logger(MultiplexerService.name);

  // Active WebSocket connections
  private sockets: Map<string, SocketState> = new Map();

  // Priority queue for eviction decisions
  private priorityMap: Map<string, SubscriptionPriority> = new Map();

  // Protobuf decoder for Upstox V3 feed
  private feedResponse?: protobuf.Type;

  // Configuration
  private readonly MAX_SOCKETS: number;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 5000; // 5 seconds

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService
  ) {
    // Get max sockets from config (2 for Basic, 5 for Plus)
    this.MAX_SOCKETS = this.config.get<number>("UPSTOX_MAX_SOCKETS", 5);

    // Initialize Protobuf decoder
    this.initProtobuf();
  }

  async onModuleInit() {
    this.logger.log("🚀 WebSocket Multiplexer initialized");
    this.logger.log(`📊 Max sockets: ${this.MAX_SOCKETS}`);

    // Restore state from Redis (for crash recovery)
    await this.restoreState();

    // Start heartbeat monitor
    this.startHeartbeatMonitor();
  }

  /**
   * Subscribe to an instrument with priority-based allocation
   */
  async subscribe(request: SubscriptionRequest): Promise<void> {
    const { instrumentKey, priority, mode = FeedMode.OPTION_GREEKS } = request;

    // Check if already subscribed
    const existingSocket = await this.redis.hget(
      "upstox:instrument_map",
      instrumentKey
    );
    if (existingSocket) {
      this.logger.debug(
        `${instrumentKey} already subscribed on ${existingSocket}`
      );
      return;
    }

    // Try to allocate to existing socket (First-Fit)
    const allocated = await this.tryAllocateToExistingSocket(
      instrumentKey,
      mode
    );
    if (allocated) {
      await this.recordSubscription(instrumentKey, priority, allocated);
      return;
    }

    // Try to create new socket
    if (this.sockets.size < this.MAX_SOCKETS) {
      const newSocket = await this.createSocket(mode);
      await this.subscribeOnSocket(newSocket.id, [instrumentKey], mode);
      await this.recordSubscription(instrumentKey, priority, newSocket.id);
      this.logger.log(`✅ ${instrumentKey} → NEW ${newSocket.id}`);
      return;
    }

    // All sockets full - attempt eviction
    const evicted = await this.evictLowPriority(priority);
    if (evicted) {
      this.logger.warn(`⚠️ Evicted ${evicted} for ${instrumentKey}`);
      await this.subscribe(request); // Retry
    } else {
      this.logger.error(
        `❌ Cannot subscribe ${instrumentKey}: capacity reached, no eviction candidates`
      );
      throw new Error("Subscription capacity exceeded");
    }
  }

  /**
   * Bulk subscribe with optimized allocation
   */
  async subscribeBulk(requests: SubscriptionRequest[]): Promise<void> {
    // Sort by priority (CRITICAL first)
    requests.sort((a, b) => a.priority - b.priority);

    for (const request of requests) {
      try {
        await this.subscribe(request);
      } catch (error) {
        this.logger.error(
          `Failed to subscribe ${request.instrumentKey}`,
          error
        );
      }
    }
  }

  /**
   * Unsubscribe from an instrument
   */
  async unsubscribe(instrumentKey: string): Promise<void> {
    const socketId = await this.redis.hget(
      "upstox:instrument_map",
      instrumentKey
    );
    if (!socketId) return;

    const socket = this.sockets.get(socketId);
    if (!socket) return;

    // Send unsubscribe message
    const message = {
      guid: socketId,
      method: "unsub",
      data: {
        mode: socket.mode,
        instrumentKeys: [instrumentKey],
      },
    };

    socket.connection.send(JSON.stringify(message));
    socket.keys.delete(instrumentKey);
    socket.load--;

    // Update Redis
    await this.redis.hdel("upstox:instrument_map", instrumentKey);
    await this.redis.srem(`upstox:socket:${socketId}:keys`, instrumentKey);
    this.priorityMap.delete(instrumentKey);

    this.logger.log(`🔻 Unsubscribed ${instrumentKey} from ${socketId}`);
  }

  /**
   * Get current multiplexer statistics
   */
  getStats() {
    const stats = {
      totalSockets: this.sockets.size,
      maxSockets: this.MAX_SOCKETS,
      sockets: Array.from(this.sockets.values()).map((s) => ({
        id: s.id,
        load: s.load,
        capacity: s.capacity,
        utilization: ((s.load / s.capacity) * 100).toFixed(1) + "%",
        mode: s.mode,
      })),
      totalSubscriptions: Array.from(this.sockets.values()).reduce(
        (sum, s) => sum + s.load,
        0
      ),
      priorityDistribution: this.getPriorityDistribution(),
    };

    return stats;
  }

  /**
   * Initialize Protobuf decoder for Upstox V3 feed
   */
  private async initProtobuf() {
    try {
      const root = await protobuf.load("src/proto/MarketDataFeedV3.proto");
      this.feedResponse = root.lookupType(
        "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse"
      );
      this.logger.log("✅ Protobuf decoder initialized");
    } catch (error) {
      this.logger.error("Failed to load Protobuf", error);
      throw error;
    }
  }

  /**
   * Create a new WebSocket connection to Upstox
   */
  private async createSocket(mode: FeedMode): Promise<SocketState> {
    // Step 1: Get access token
    const token = await this.getAccessToken();

    // Step 2: Get authorized WebSocket URL (one-time use)
    const response = await fetch(
      "https://api.upstox.com/v3/feed/market-data-feed/authorize",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to authorize WebSocket: ${response.statusText}`);
    }

    const { data } = await response.json();
    const url = data.authorizedRedirectUri;

    // Step 3: Create WebSocket connection
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer"; // Required for Protobuf

    const socketId = `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const capacity = this.getModeCapacity(mode);

    const socket: SocketState = {
      id: socketId,
      url,
      load: 0,
      capacity,
      mode,
      keys: new Set(),
      connection: ws,
      lastHeartbeat: new Date(),
    };

    // Set up event handlers
    ws.on("open", () => this.handleOpen(socketId));
    ws.on("message", (data: Buffer) => this.handleMessage(socketId, data));
    ws.on("error", (err) => this.handleError(socketId, err));
    ws.on("close", () => this.handleClose(socketId));

    this.sockets.set(socketId, socket);

    // Persist to Redis
    await this.redis.sadd("upstox:sockets", socketId);

    this.logger.log(
      `🔗 Created socket ${socketId} (mode: ${mode}, capacity: ${capacity})`
    );

    return socket;
  }

  /**
   * Try to allocate instrument to existing socket
   */
  private async tryAllocateToExistingSocket(
    instrumentKey: string,
    mode: FeedMode
  ): Promise<string | null> {
    for (const [socketId, socket] of this.sockets) {
      // Check if socket has capacity and mode matches
      if (socket.load < socket.capacity && socket.mode === mode) {
        await this.subscribeOnSocket(socketId, [instrumentKey], mode);
        this.logger.log(
          `✅ ${instrumentKey} → ${socketId} (${socket.load}/${socket.capacity})`
        );
        return socketId;
      }
    }
    return null;
  }

  /**
   * Subscribe to instruments on a specific socket
   */
  private async subscribeOnSocket(
    socketId: string,
    instrumentKeys: string[],
    mode: FeedMode
  ): Promise<void> {
    const socket = this.sockets.get(socketId);
    if (!socket) throw new Error(`Socket ${socketId} not found`);

    // Build subscription message
    const message = {
      guid: socketId,
      method: "sub",
      data: {
        mode,
        instrumentKeys,
      },
    };

    // Send to WebSocket
    socket.connection.send(JSON.stringify(message));

    // Update state
    instrumentKeys.forEach((key) => socket.keys.add(key));
    socket.load += instrumentKeys.length;
  }

  /**
   * Evict lowest priority subscription
   */
  private async evictLowPriority(
    requiredPriority: SubscriptionPriority
  ): Promise<string | null> {
    let lowestPriority = SubscriptionPriority.CRITICAL;
    let candidateKey: string | null = null;

    // Find lowest priority subscription
    for (const [key, priority] of this.priorityMap) {
      if (priority > requiredPriority && priority >= lowestPriority) {
        lowestPriority = priority;
        candidateKey = key;
      }
    }

    if (candidateKey) {
      await this.unsubscribe(candidateKey);
      return candidateKey;
    }

    return null;
  }

  /**
   * Record subscription in Redis and priority map
   */
  private async recordSubscription(
    instrumentKey: string,
    priority: SubscriptionPriority,
    socketId: string
  ): Promise<void> {
    // Map instrument to socket
    await this.redis.hset("upstox:instrument_map", instrumentKey, socketId);

    // Add to socket's key set
    await this.redis.sadd(`upstox:socket:${socketId}:keys`, instrumentKey);

    // Store priority
    this.priorityMap.set(instrumentKey, priority);
  }

  /**
   * Get capacity based on feed mode
   */
  private getModeCapacity(mode: FeedMode): number {
    const capacities = {
      [FeedMode.LTPC]: 5000,
      [FeedMode.FULL]: 2000,
      [FeedMode.OPTION_GREEKS]: 3000,
    };
    return capacities[mode];
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(socketId: string): void {
    this.logger.log(`✅ Socket ${socketId} connected`);
    const socket = this.sockets.get(socketId);
    if (socket) {
      socket.lastHeartbeat = new Date();
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(socketId: string, data: Buffer): Promise<void> {
    const socket = this.sockets.get(socketId);
    if (!socket) return;

    // Update heartbeat
    socket.lastHeartbeat = new Date();

    // Decode Protobuf
    if (!this.feedResponse) return;

    try {
      const message = this.feedResponse.decode(data);
      const decoded = this.feedResponse.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
      });

      // Publish to Redis for distribution to consumers
      await this.redis.publish("market:feed", JSON.stringify(decoded));

      // Optional: Save to TimescaleDB (non-blocking)
      // this.saveToTimescale(decoded).catch(err => this.logger.error('DB save failed', err));
    } catch (error) {
      this.logger.error(`Protobuf decode error on ${socketId}`, error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(socketId: string, error: Error): void {
    this.logger.error(`Socket ${socketId} error: ${error.message}`);
    // Errors are typically followed by close event
  }

  /**
   * Handle WebSocket close event
   */
  private async handleClose(socketId: string): Promise<void> {
    this.logger.warn(`Socket ${socketId} closed`);

    const socket = this.sockets.get(socketId);
    if (!socket) return;

    // Clean up Redis
    await this.redis.srem("upstox:sockets", socketId);
    await this.redis.del(`upstox:socket:${socketId}:keys`);

    // Remove from local map
    this.sockets.delete(socketId);

    // Attempt reconnection with exponential backoff
    setTimeout(
      () => this.reconnectSocket(socketId, socket),
      this.RECONNECT_DELAY
    );
  }

  /**
   * Reconnect a dropped socket
   */
  private async reconnectSocket(
    oldSocketId: string,
    oldSocket: SocketState
  ): Promise<void> {
    try {
      this.logger.log(`🔄 Reconnecting ${oldSocketId}...`);

      // Create new socket with same mode
      const newSocket = await this.createSocket(oldSocket.mode);

      // Re-subscribe to all keys
      const keysToSubscribe = Array.from(oldSocket.keys);
      if (keysToSubscribe.length > 0) {
        await this.subscribeOnSocket(
          newSocket.id,
          keysToSubscribe,
          newSocket.mode
        );

        // Update Redis mappings
        for (const key of keysToSubscribe) {
          await this.redis.hset("upstox:instrument_map", key, newSocket.id);
        }

        this.logger.log(
          `✅ Reconnected ${keysToSubscribe.length} subscriptions`
        );
      }
    } catch (error) {
      this.logger.error(`Reconnection failed: ${error.message}`);
      // Retry with exponential backoff
      setTimeout(
        () => this.reconnectSocket(oldSocketId, oldSocket),
        this.RECONNECT_DELAY * 2
      );
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = new Date();

      for (const [socketId, socket] of this.sockets) {
        const timeSinceHeartbeat =
          now.getTime() - socket.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > this.HEARTBEAT_INTERVAL * 2) {
          this.logger.warn(
            `💔 Socket ${socketId} missed heartbeat (${timeSinceHeartbeat}ms)`
          );
          // Trigger reconnection
          socket.connection.close();
        } else {
          // Send ping
          socket.connection.ping();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Restore state from Redis after crash
   */
  private async restoreState(): Promise<void> {
    try {
      const sockets = await this.redis.smembers("upstox:sockets");
      if (sockets.length === 0) return;

      this.logger.log(`🔄 Restoring ${sockets.length} sockets from Redis...`);

      for (const socketId of sockets) {
        const keys = await this.redis.smembers(
          `upstox:socket:${socketId}:keys`
        );
        // Note: We can't restore the WebSocket connections, they need to be recreated
        // This is handled by the normal subscription flow
        this.logger.log(`Found ${keys.length} subscriptions for ${socketId}`);
      }
    } catch (error) {
      this.logger.error("Failed to restore state", error);
    }
  }

  /**
   * Get priority distribution stats
   */
  private getPriorityDistribution() {
    const distribution = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const priority of this.priorityMap.values()) {
      switch (priority) {
        case SubscriptionPriority.CRITICAL:
          distribution.CRITICAL++;
          break;
        case SubscriptionPriority.HIGH:
          distribution.HIGH++;
          break;
        case SubscriptionPriority.MEDIUM:
          distribution.MEDIUM++;
          break;
        case SubscriptionPriority.LOW:
          distribution.LOW++;
          break;
      }
    }

    return distribution;
  }

  /**
   * Get Upstox access token
   */
  private async getAccessToken(): Promise<string> {
    // This should call your auth service
    // For now, return from config
    return this.config.get<string>("UPSTOX_ACCESS_TOKEN")!;
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log("🛑 Shutting down WebSocket multiplexer...");

    // Close all sockets gracefully
    for (const [socketId, socket] of this.sockets) {
      socket.connection.close();
      this.logger.log(`Closed ${socketId}`);
    }

    this.sockets.clear();
  }
}
