/**
 * Token-Bucket Rate Limiter
 * Per-provider rate limiting with configurable limits
 */

import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitConfig {
  /** Max tokens (burst capacity) */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Provider name for logging */
  name: string;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
  config: RateLimitConfig;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, Bucket>();

  /**
   * Register a rate limit bucket for a provider
   */
  register(config: RateLimitConfig): void {
    this.buckets.set(config.name, {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
      config,
    });
    this.logger.log(
      `Registered rate limiter: ${config.name} (${config.maxTokens} burst, ${config.refillRate}/sec)`,
    );
  }

  /**
   * Acquire a token. Resolves when a token is available.
   * Will wait (backpressure) if no tokens available.
   */
  async acquire(providerName: string): Promise<void> {
    const bucket = this.buckets.get(providerName);
    if (!bucket) {
      // No limiter registered — allow through
      return;
    }

    this.refill(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return;
    }

    // Wait until a token is available
    const waitMs = Math.ceil((1 / bucket.config.refillRate) * 1000);
    this.logger.debug(
      `Rate limited [${providerName}]: waiting ${waitMs}ms for token`,
    );
    await this.sleep(waitMs);
    this.refill(bucket);
    bucket.tokens = Math.max(0, bucket.tokens - 1);
  }

  /**
   * Get remaining tokens for a provider
   */
  getRemaining(providerName: string): number {
    const bucket = this.buckets.get(providerName);
    if (!bucket) return Infinity;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * bucket.config.refillRate;
    bucket.tokens = Math.min(
      bucket.config.maxTokens,
      bucket.tokens + tokensToAdd,
    );
    bucket.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
