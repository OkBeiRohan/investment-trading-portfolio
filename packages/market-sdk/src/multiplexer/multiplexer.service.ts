import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@repo/database";
import { SocketPool } from "./socket-pool";
import { BinPacker } from "./bin-packer";
import { SubscriptionManager } from "./subscription-manager";
import { PriorityLevel, SubscriptionRequest } from "./types";

@Injectable()
export class MultiplexerService {
  private readonly logger = new Logger(MultiplexerService.name);
  private readonly MAX_SOCKETS = 5; // Upstox Plus limit

  constructor(
    private socketPool: SocketPool,
    private binPacker: BinPacker,
    private subscriptionManager: SubscriptionManager,
    private redis: RedisService
  ) {}

  /**
   * Subscribe to instruments with priority-based allocation
   */
  async subscribe(
    userId: string,
    instrumentKeys: string[],
    priority: PriorityLevel = PriorityLevel.MEDIUM
  ): Promise<void> {
    const requests: SubscriptionRequest[] = instrumentKeys.map((key) => ({
      instrumentKey: key,
      priority,
      userId,
    }));

    // Check which are already subscribed
    const newRequests: SubscriptionRequest[] = [];
    for (const req of requests) {
      const existing = await this.redis.getSocketForInstrument(
        req.instrumentKey
      );
      if (!existing) {
        newRequests.push(req);
      }
    }

    if (newRequests.length === 0) {
      this.logger.debug("All instruments already subscribed");
      return;
    }

    // Get current socket states
    const sockets = this.socketPool.getSockets();

    // Run bin packing algorithm
    const { assignments, evictions, unfulfilled } = this.binPacker.allocate(
      newRequests,
      sockets.map((s) => ({
        id: s.id,
        load: s.getLoad(),
        capacity: s.getCapacity(),
        keys: s.getSubscribedKeys(),
      }))
    );

    // Execute evictions
    for (const key of evictions) {
      await this.unsubscribe(key);
    }

    // Execute assignments
    for (const [socketId, keys] of assignments) {
      const socket = this.socketPool.getSocket(socketId);
      if (socket) {
        await socket.subscribe(keys);
        for (const key of keys) {
          await this.redis.setSocketForInstrument(key, socketId);
          await this.subscriptionManager.track(userId, key, priority);
        }
      }
    }

    // Create new sockets if needed
    if (unfulfilled.length > 0 && this.socketPool.size() < this.MAX_SOCKETS) {
      const newSocket = await this.socketPool.createSocket(userId);
      const keysToSubscribe = unfulfilled.slice(0, newSocket.getCapacity());
      await newSocket.subscribe(keysToSubscribe);

      for (const key of keysToSubscribe) {
        await this.redis.setSocketForInstrument(key, newSocket.id);
        await this.subscriptionManager.track(userId, key, priority);
      }
    }

    this.logger.log(
      `Subscribed ${newRequests.length - unfulfilled.length}/${newRequests.length} instruments for user ${userId}`
    );
  }

  /**
   * Unsubscribe from instruments
   */
  async unsubscribe(instrumentKey: string): Promise<void> {
    const socketId = await this.redis.getSocketForInstrument(instrumentKey);
    if (!socketId) return;

    const socket = this.socketPool.getSocket(socketId);
    if (socket) {
      await socket.unsubscribe([instrumentKey]);
      await this.redis.removeInstrumentMapping(instrumentKey);
      await this.subscriptionManager.remove(instrumentKey);
    }
  }

  /**
   * Listen to market data events
   */
  on(event: "data", callback: (data: any) => void): void {
    // Subscribe to Redis pub/sub channel
    this.redis.subscribeToMarketData(callback);
  }
}
