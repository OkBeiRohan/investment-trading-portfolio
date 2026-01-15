import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export interface HeartbeatConfig {
  interval: number; // ms
  timeout: number; // ms
  maxMissed: number;
}

/**
 * Heartbeat Service
 *
 * Monitors WebSocket connection health with:
 * - Periodic ping/pong
 * - Missed heartbeat detection
 * - Auto-reconnect triggering
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);

  private intervals = new Map<string, NodeJS.Timeout>();
  private lastPong = new Map<string, number>();
  private missedCount = new Map<string, number>();
  private configs = new Map<string, HeartbeatConfig>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.logger.log("Heartbeat service initialized");
  }

  /**
   * Start heartbeat monitoring for a socket
   */
  startHeartbeat(
    socketId: string,
    config: HeartbeatConfig,
    pingFn: () => void
  ): void {
    if (this.intervals.has(socketId)) {
      this.logger.warn(`Heartbeat already running for ${socketId}`);
      return;
    }

    this.configs.set(socketId, config);
    this.lastPong.set(socketId, Date.now());
    this.missedCount.set(socketId, 0);

    const interval = setInterval(() => {
      this.checkHeartbeat(socketId, pingFn);
    }, config.interval);

    this.intervals.set(socketId, interval);
    this.logger.debug(`Started heartbeat for ${socketId}`);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat(socketId: string): void {
    const interval = this.intervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(socketId);
    }

    this.lastPong.delete(socketId);
    this.missedCount.delete(socketId);
    this.configs.delete(socketId);

    this.logger.debug(`Stopped heartbeat for ${socketId}`);
  }

  /**
   * Record pong received
   */
  recordPong(socketId: string): void {
    this.lastPong.set(socketId, Date.now());
    this.missedCount.set(socketId, 0);
  }

  /**
   * Check heartbeat health
   */
  private checkHeartbeat(socketId: string, pingFn: () => void): void {
    const config = this.configs.get(socketId);
    const lastPongTime = this.lastPong.get(socketId);
    const missed = this.missedCount.get(socketId) || 0;

    if (!config || !lastPongTime) return;

    const elapsed = Date.now() - lastPongTime;

    // Check if pong is late
    if (elapsed > config.timeout) {
      const newMissed = missed + 1;
      this.missedCount.set(socketId, newMissed);

      this.logger.warn(
        `Missed heartbeat for ${socketId} (${newMissed}/${config.maxMissed})`
      );

      // Trigger reconnect if max missed exceeded
      if (newMissed >= config.maxMissed) {
        this.logger.error(
          `Socket ${socketId} unresponsive, triggering reconnect`
        );

        this.eventEmitter.emit("socket.dead", { socketId });
        this.stopHeartbeat(socketId);
        return;
      }
    }

    // Send ping
    try {
      pingFn();
    } catch (error) {
      this.logger.error(`Failed to send ping for ${socketId}`, error);
    }
  }

  /**
   * Get heartbeat statistics
   */
  getHeartbeatStats(socketId: string) {
    const config = this.configs.get(socketId);
    const lastPongTime = this.lastPong.get(socketId);
    const missed = this.missedCount.get(socketId) || 0;

    if (!config || !lastPongTime) {
      return null;
    }

    return {
      socketId,
      lastPong: new Date(lastPongTime),
      timeSinceLastPong: Date.now() - lastPongTime,
      missedCount: missed,
      maxMissed: config.maxMissed,
      isHealthy: missed < config.maxMissed,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    this.logger.log("Stopping all heartbeats...");

    for (const socketId of this.intervals.keys()) {
      this.stopHeartbeat(socketId);
    }
  }
}
