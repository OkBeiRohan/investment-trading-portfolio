import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@repo/database";
import { PriorityLevel, SubscriptionMetadata } from "./types";

@Injectable()
export class SubscriptionManager {
  private readonly logger = new Logger(SubscriptionManager.name);
  private readonly SUBSCRIPTION_PREFIX = "subscription:";

  constructor(private redis: RedisService) {}

  async track(
    userId: string,
    instrumentKey: string,
    priority: PriorityLevel
  ): Promise<void> {
    const metadata: SubscriptionMetadata = {
      instrumentKey,
      userId,
      priority,
      subscribedAt: new Date(),
      socketId: (await this.redis.getSocketForInstrument(instrumentKey)) || "",
    };

    const key = this.getKey(instrumentKey);
    await this.redis.set(key, JSON.stringify(metadata), 86400); // 24h TTL

    // Track user subscriptions
    await this.redis.sAdd(`user:${userId}:subscriptions`, instrumentKey);
  }

  async remove(instrumentKey: string): Promise<void> {
    const key = this.getKey(instrumentKey);
    const metadata = await this.get(instrumentKey);

    if (metadata) {
      await this.redis.sRem(
        `user:${metadata.userId}:subscriptions`,
        instrumentKey
      );
    }

    await this.redis.del(key);
  }

  async get(instrumentKey: string): Promise<SubscriptionMetadata | null> {
    const key = this.getKey(instrumentKey);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getUserSubscriptions(userId: string): Promise<string[]> {
    return this.redis.sMembers(`user:${userId}:subscriptions`);
  }

  async getSubscriptionsByPriority(
    priority: PriorityLevel
  ): Promise<SubscriptionMetadata[]> {
    const allKeys = await this.redis.keys(`${this.SUBSCRIPTION_PREFIX}*`);
    const results: SubscriptionMetadata[] = [];

    for (const key of allKeys) {
      const data = await this.redis.get(key);
      if (data) {
        const metadata: SubscriptionMetadata = JSON.parse(data);
        if (metadata.priority === priority) {
          results.push(metadata);
        }
      }
    }

    return results;
  }

  async getTotalSubscriptions(): Promise<number> {
    const keys = await this.redis.keys(`${this.SUBSCRIPTION_PREFIX}*`);
    return keys.length;
  }

  private getKey(instrumentKey: string): string {
    return `${this.SUBSCRIPTION_PREFIX}${instrumentKey}`;
  }
}
