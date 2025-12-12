import { Injectable, Logger } from "@nestjs/common";
import { RateLimitError } from "../core/error";

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private buckets = new Map<string, RateLimitBucket>();

  /**
   * Token bucket algorithm
   * @param key - Unique identifier for the rate limit (e.g., 'market-data', 'orders')
   * @param maxTokens - Maximum tokens in the bucket
   * @param refillRate - Tokens added per second
   */
  async checkLimit(
    key: string,
    maxTokens: number,
    refillRate: number
  ): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens < 1) {
      const waitTime = Math.ceil(((1 - bucket.tokens) / refillRate) * 1000);
      this.logger.warn(`Rate limit exceeded for ${key}. Wait ${waitTime}ms`);
      throw new RateLimitError(`Rate limit exceeded for ${key}`, waitTime);
    }

    // Consume one token
    bucket.tokens -= 1;
  }

  /**
   * Check if limit would be exceeded without consuming a token
   */
  wouldExceedLimit(
    key: string,
    maxTokens: number,
    refillRate: number
  ): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) return false;

    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    const currentTokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);

    return currentTokens < 1;
  }

  /**
   * Reset a specific rate limit
   */
  reset(key: string): void {
    this.buckets.delete(key);
    this.logger.debug(`Rate limit reset for ${key}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
    this.logger.log("All rate limits reset");
  }

  /**
   * Get current token count for a key
   */
  getTokenCount(key: string, maxTokens: number, refillRate: number): number {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) return maxTokens;

    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    return Math.min(maxTokens, bucket.tokens + tokensToAdd);
  }
}

/**
 * Decorator for rate limiting methods
 */
export function RateLimit(maxTokens: number, refillRate: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const rateLimiter = new RateLimiter();

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      await rateLimiter.checkLimit(key, maxTokens, refillRate);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
