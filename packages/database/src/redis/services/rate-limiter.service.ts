import { Injectable, Inject } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis.module";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

@Injectable()
export class RateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async checkLimit(
    key: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`;

    const requests = await this.redis.incr(windowKey);

    if (requests === 1) {
      // Set expiry on first request in window
      await this.redis.pexpire(windowKey, config.windowMs);
    }

    const allowed = requests <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - requests);
    const resetAt = new Date(
      Math.ceil(now / config.windowMs) * config.windowMs
    );

    return { allowed, remaining, resetAt };
  }

  async reset(key: string): Promise<void> {
    const pattern = `ratelimit:${key}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
