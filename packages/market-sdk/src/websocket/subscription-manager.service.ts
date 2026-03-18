import { Injectable, Logger } from "@nestjs/common";
import { SocketPoolService } from "./socket-pool.service";

export interface Subscription {
  id: string;
  userId: string;
  instruments: string[];
  priority: number;
  socketId?: string;
  createdAt: Date;
  callback: (data: any) => void;
}

export enum SubscriptionPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

/**
 * Subscription Manager Service
 *
 * Manages instrument subscriptions with:
 * - Priority-based allocation
 * - Automatic rebalancing
 * - Subscription tracking
 * - Event routing
 */
@Injectable()
export class SubscriptionManagerService {
  private readonly logger = new Logger(SubscriptionManagerService.name);

  private subscriptions = new Map<string, Map<string, Subscription>>();
  private instrumentToSocket = new Map<string, Map<string, string>>();

  constructor(private readonly socketPool: SocketPoolService) {}

  /**
   * Subscribe to instruments with priority
   */
  async subscribe(
    provider: string,
    userId: string,
    instruments: string[],
    priority: SubscriptionPriority,
    callback: (data: any) => void,
    feedMode?: 'ltpc' | 'full' | 'full_d30' | 'option_greeks',
  ): Promise<string> {
    const subscriptionId = `${provider}-${userId}-${Date.now()}`;

    // Get socket from pool (pass feedMode so correct limits apply)
    const socket = await this.socketPool.getSocket(
      provider,
      instruments,
      priority,
      feedMode as any,
    );

    // Add instruments to socket
    this.socketPool.addInstruments(provider, socket.id, instruments);

    // Create subscription
    const subscription: Subscription = {
      id: subscriptionId,
      userId,
      instruments,
      priority,
      socketId: socket.id,
      createdAt: new Date(),
      callback,
    };

    // Store subscription
    if (!this.subscriptions.has(provider)) {
      this.subscriptions.set(provider, new Map());
    }
    this.subscriptions.get(provider)!.set(subscriptionId, subscription);

    // Track instrument-to-socket mapping
    if (!this.instrumentToSocket.has(provider)) {
      this.instrumentToSocket.set(provider, new Map());
    }

    const providerMapping = this.instrumentToSocket.get(provider)!;
    instruments.forEach((instrument) => {
      providerMapping.set(instrument, socket.id);
    });

    this.logger.log(
      `Subscribed ${userId} to ${instruments.length} instruments on socket ${socket.id} (priority: ${priority})`
    );

    return subscriptionId;
  }

  /**
   * Unsubscribe from instruments
   */
  async unsubscribe(provider: string, subscriptionId: string): Promise<void> {
    const providerSubs = this.subscriptions.get(provider);
    const subscription = providerSubs?.get(subscriptionId);

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    // Remove instruments from socket
    if (subscription.socketId) {
      this.socketPool.removeInstruments(
        provider,
        subscription.socketId,
        subscription.instruments
      );
    }

    // Remove instrument mappings
    const providerMapping = this.instrumentToSocket.get(provider);
    if (providerMapping) {
      subscription.instruments.forEach((instrument) => {
        providerMapping.delete(instrument);
      });
    }

    // Remove subscription
    providerSubs?.delete(subscriptionId);

    this.logger.log(`Unsubscribed ${subscriptionId}`);
  }

  /**
   * Route incoming data to subscription callbacks
   */
  routeData(provider: string, instrument: string, data: any): void {
    const providerSubs = this.subscriptions.get(provider);
    if (!providerSubs) return;

    // Find all subscriptions for this instrument
    for (const subscription of providerSubs.values()) {
      if (subscription.instruments.includes(instrument)) {
        try {
          subscription.callback(data);
        } catch (error) {
          this.logger.error(
            `Error in subscription callback for ${subscription.id}`,
            error
          );
        }
      }
    }
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(provider: string) {
    const providerSubs = this.subscriptions.get(provider);
    if (!providerSubs) {
      return {
        provider,
        subscriptions: 0,
        instruments: 0,
        byPriority: {},
      };
    }

    const byPriority: Record<number, number> = {};
    const allInstruments = new Set<string>();

    for (const sub of providerSubs.values()) {
      byPriority[sub.priority] = (byPriority[sub.priority] || 0) + 1;
      sub.instruments.forEach((i) => allInstruments.add(i));
    }

    return {
      provider,
      subscriptions: providerSubs.size,
      instruments: allInstruments.size,
      byPriority,
    };
  }

  /**
   * Rebalance subscriptions (move to different sockets if needed)
   */
  async rebalance(provider: string): Promise<void> {
    this.logger.log(`Rebalancing subscriptions for ${provider}...`);

    const providerSubs = this.subscriptions.get(provider);
    if (!providerSubs) return;

    // Sort subscriptions by priority (highest first)
    const sortedSubs = Array.from(providerSubs.values()).sort(
      (a, b) => b.priority - a.priority
    );

    // Resubscribe in priority order
    for (const sub of sortedSubs) {
      await this.unsubscribe(provider, sub.id);
      await this.subscribe(
        provider,
        sub.userId,
        sub.instruments,
        sub.priority,
        sub.callback
      );
    }

    this.logger.log(`Rebalanced ${sortedSubs.length} subscriptions`);
  }
}
