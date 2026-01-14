import { Injectable, Logger } from "@nestjs/common";
import { TokenBucketConfig } from "../core/types";

/**
 * Token Bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   */
  tryConsume(count = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async waitForTokens(count = 1): Promise<void> {
    while (!this.tryConsume(count)) {
      const tokensNeeded = count - this.tokens;
      const waitTime = (tokensNeeded / this.refillRate) * 1000;
      await this.sleep(Math.min(waitTime, 100)); // Max 100ms sleep
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = Math.floor(elapsed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Provider-specific rate limits
 */
export const PROVIDER_LIMITS: Record<string, TokenBucketConfig> = {
  upstox: {
    capacity: 25, // Burst capacity
    refillRate: 10, // 10 requests/second
    refillInterval: 100, // Refill every 100ms
  },
  binance: {
    capacity: 50,
    refillRate: 20,
    refillInterval: 50,
  },
  yahoo: {
    capacity: 5,
    refillRate: 2, // Conservative limit (unofficial)
    refillInterval: 500,
  },
};

/**
 * Rate Limiter Service
 *
 * Implements token bucket algorithm for rate limiting.
 * Prevents exceeding provider API rate limits.
 *
 * @example
 * ```typescript
 * await rateLimiter.acquire('upstox'); // Blocks until slot is available
 * const result = await apiCall();
 * ```
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, TokenBucket>();

  /**
   * Acquire a rate limit slot (blocks until available)
   */
  async acquire(provider: string, tokens = 1): Promise<void> {
    const bucket = this.getBucket(provider);

    const start = Date.now();
    await bucket.waitForTokens(tokens);
    const waitTime = Date.now() - start;

    if (waitTime > 100) {
      this.logger.debug(
        `Rate limiter for ${provider}: waited ${waitTime}ms for ${tokens} tokens`
      );
    }
  }

  /**
   * Try to acquire without blocking
   */
  tryAcquire(provider: string, tokens = 1): boolean {
    const bucket = this.getBucket(provider);
    return bucket.tryConsume(tokens);
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(provider: string): number {
    const bucket = this.getBucket(provider);
    return bucket.getAvailableTokens();
  }

  /**
   * Check if provider has rate limiting configured
   */
  hasProvider(provider: string): boolean {
    return provider in PROVIDER_LIMITS;
  }

  private getBucket(provider: string): TokenBucket {
    if (!this.buckets.has(provider)) {
      const config = PROVIDER_LIMITS[provider];

      if (!config) {
        throw new Error(`No rate limit config for provider: ${provider}`);
      }

      this.buckets.set(
        provider,
        new TokenBucket(config.capacity, config.refillRate)
      );

      this.logger.log(
        `Initialized rate limiter for ${provider}: ${config.refillRate} req/s (burst: ${config.capacity})`
      );
    }

    return this.buckets.get(provider)!;
  }
}
