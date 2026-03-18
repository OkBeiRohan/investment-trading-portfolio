import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export type FeedMode = 'ltpc' | 'full' | 'full_d30' | 'option_greeks';

export interface PooledSocket {
  id: string;
  socket: WebSocket;
  capacity: number;
  used: number;
  priority: number;
  feedMode: FeedMode;
  instruments: Set<string>;
  createdAt: Date;
  lastActivity: Date;
}

export interface SocketPoolConfig {
  maxConnections: number;
  maxInstrumentsPerSocket: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  feedMode?: FeedMode;
  modeLimits?: Record<string, number>;
}

/**
 * Socket Pool Service
 *
 * Manages WebSocket connection pooling with:
 * - Maximum connection limits (5 for Upstox Plus)
 * - Bin packing optimization
 * - Connection health monitoring
 * - Graceful shutdown
 */
@Injectable()
export class SocketPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(SocketPoolService.name);
  private pools = new Map<string, Map<string, PooledSocket>>();
  private configs = new Map<string, SocketPoolConfig>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Initialize pool for a provider
   */
  initializePool(provider: string, config: SocketPoolConfig): void {
    if (this.pools.has(provider)) {
      this.logger.warn(`Pool already exists for provider: ${provider}`);
      return;
    }

    this.pools.set(provider, new Map());
    this.configs.set(provider, config);
    this.logger.log(`Initialized socket pool for ${provider}`, config);
  }

  /**
   * Get or create socket for instruments using bin packing
   */
  async getSocket(
    provider: string,
    instruments: string[],
    priority: number = 1,
    feedMode?: FeedMode,
  ): Promise<PooledSocket> {
    const pool = this.pools.get(provider);
    const config = this.configs.get(provider);

    if (!pool || !config) {
      throw new Error(`Pool not initialized for provider: ${provider}`);
    }

    const resolvedFeedMode = feedMode ?? config.feedMode ?? 'full';

    // Try to find existing socket with capacity AND matching feed mode
    const existingSocket = this.findBestFitSocket(
      pool,
      instruments.length,
      priority,
      resolvedFeedMode
    );

    if (existingSocket) {
      this.logger.debug(
        `Reusing socket ${existingSocket.id} (${existingSocket.used}/${existingSocket.capacity}) [${existingSocket.feedMode}]`
      );
      return existingSocket;
    }

    // Create new socket if under limit
    if (pool.size < config.maxConnections) {
      const newSocket = await this.createSocket(provider, config, priority, resolvedFeedMode);
      pool.set(newSocket.id, newSocket);
      this.logger.log(
        `Created new socket ${newSocket.id} [${resolvedFeedMode}] (total: ${pool.size}/${config.maxConnections})`
      );
      return newSocket;
    }

    // Pool is full - find least important socket to evict
    const evictableSocket = this.findEvictableSocket(pool, priority);
    if (evictableSocket) {
      this.logger.warn(
        `Evicting socket ${evictableSocket.id} for higher priority`
      );
      await this.closeSocket(provider, evictableSocket.id);

      const newSocket = await this.createSocket(provider, config, priority, resolvedFeedMode);
      pool.set(newSocket.id, newSocket);
      return newSocket;
    }

    throw new Error(
      `Socket pool exhausted for ${provider} (${pool.size}/${config.maxConnections})`
    );
  }

  /**
   * Add instruments to socket
   */
  addInstruments(
    provider: string,
    socketId: string,
    instruments: string[]
  ): void {
    const pool = this.pools.get(provider);
    const socket = pool?.get(socketId);

    if (!socket) {
      throw new Error(`Socket ${socketId} not found in ${provider} pool`);
    }

    instruments.forEach((instrument) => {
      if (!socket.instruments.has(instrument)) {
        socket.instruments.add(instrument);
        socket.used++;
      }
    });

    socket.lastActivity = new Date();
    this.logger.debug(
      `Added ${instruments.length} instruments to ${socketId} (${socket.used}/${socket.capacity})`
    );
  }

  /**
   * Remove instruments from socket
   */
  removeInstruments(
    provider: string,
    socketId: string,
    instruments: string[]
  ): void {
    const pool = this.pools.get(provider);
    const socket = pool?.get(socketId);

    if (!socket) {
      this.logger.warn(`Socket ${socketId} not found in ${provider} pool`);
      return;
    }

    instruments.forEach((instrument) => {
      if (socket.instruments.has(instrument)) {
        socket.instruments.delete(instrument);
        socket.used--;
      }
    });

    socket.lastActivity = new Date();

    // Close socket if empty
    if (socket.used === 0) {
      this.logger.log(`Socket ${socketId} is empty, closing`);
      this.closeSocket(provider, socketId);
    }
  }

  /**
   * Find best-fit socket using First Fit Decreasing bin packing.
   * Matches on both capacity AND feed mode.
   */
  private findBestFitSocket(
    pool: Map<string, PooledSocket>,
    requiredCapacity: number,
    priority: number,
    feedMode: FeedMode = 'full',
  ): PooledSocket | null {
    let bestFit: PooledSocket | null = null;
    let minWaste = Infinity;

    for (const socket of pool.values()) {
      const availableSpace = socket.capacity - socket.used;

      if (
        availableSpace >= requiredCapacity &&
        socket.priority >= priority &&
        socket.feedMode === feedMode  // must match feed mode
      ) {
        const waste = availableSpace - requiredCapacity;

        if (waste < minWaste) {
          minWaste = waste;
          bestFit = socket;
        }
      }
    }

    return bestFit;
  }

  /**
   * Find socket to evict (lowest priority)
   */
  private findEvictableSocket(
    pool: Map<string, PooledSocket>,
    newPriority: number
  ): PooledSocket | null {
    let lowestPriority = newPriority;
    let evictable: PooledSocket | null = null;

    for (const socket of pool.values()) {
      if (socket.priority < lowestPriority) {
        lowestPriority = socket.priority;
        evictable = socket;
      }
    }

    return evictable;
  }

  /**
   * Create new socket
   */
  private async createSocket(
    provider: string,
    config: SocketPoolConfig,
    priority: number,
    feedMode: FeedMode = 'full',
  ): Promise<PooledSocket> {
    const id = `${provider}-${feedMode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const capacity = config.modeLimits?.[feedMode] ?? config.maxInstrumentsPerSocket;

    const pooledSocket: PooledSocket = {
      id,
      socket: null as any,
      capacity,
      used: 0,
      priority,
      feedMode,
      instruments: new Set(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.eventEmitter.emit("socket.created", {
      provider,
      socketId: id,
      priority,
      feedMode,
    });

    return pooledSocket;
  }

  /**
   * Close socket
   */
  async closeSocket(provider: string, socketId: string): Promise<void> {
    const pool = this.pools.get(provider);
    const socket = pool?.get(socketId);

    if (!socket) {
      this.logger.warn(`Socket ${socketId} not found`);
      return;
    }

    // Close WebSocket connection
    if (socket.socket && socket.socket.readyState === WebSocket.OPEN) {
      socket.socket.close();
    }

    // Remove from pool
    pool!.delete(socketId);

    this.eventEmitter.emit("socket.closed", {
      provider,
      socketId,
      instrumentsCount: socket.instruments.size,
    });

    this.logger.log(`Closed socket ${socketId}`);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(provider: string) {
    const pool = this.pools.get(provider);
    const config = this.configs.get(provider);

    if (!pool || !config) {
      return null;
    }

    const sockets = Array.from(pool.values());
    const totalUsed = sockets.reduce((sum, s) => sum + s.used, 0);
    const totalCapacity = sockets.length * config.maxInstrumentsPerSocket;

    return {
      provider,
      connections: sockets.length,
      maxConnections: config.maxConnections,
      instruments: totalUsed,
      capacity: totalCapacity,
      utilization: (totalUsed / totalCapacity) * 100,
      sockets: sockets.map((s) => ({
        id: s.id,
        used: s.used,
        capacity: s.capacity,
        priority: s.priority,
        uptime: Date.now() - s.createdAt.getTime(),
      })),
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log("Closing all socket pools...");

    for (const [provider, pool] of this.pools.entries()) {
      for (const socketId of pool.keys()) {
        await this.closeSocket(provider, socketId);
      }
    }

    this.pools.clear();
    this.configs.clear();
  }
}
