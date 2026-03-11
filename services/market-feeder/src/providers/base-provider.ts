/**
 * Base Provider — Abstract class for all market data providers
 * Provides retry logic, error normalization, and rate limiting integration
 */

import { Logger } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';

export interface ProviderCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  openInterest?: number | null;
}

export interface ProviderError {
  provider: string;
  operation: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  raw?: unknown;
}

export abstract class BaseProvider {
  protected abstract readonly providerName: string;
  protected abstract readonly logger: Logger;

  constructor(protected readonly rateLimiter: RateLimiterService) {}

  /**
   * Execute a function with retry + exponential backoff + rate limiting
   */
  protected async fetchWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    maxRetries = 3,
    baseBackoffMs = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Acquire rate limit token before making request
        await this.rateLimiter.acquire(this.providerName);
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) break;

        // Check if error is retryable
        const statusCode = this.extractStatusCode(error);
        if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          // Client error (except rate limit) — don't retry
          break;
        }

        const backoffMs = baseBackoffMs * Math.pow(2, attempt);
        this.logger.warn(
          `[${this.providerName}] ${operation} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
            `retrying in ${backoffMs}ms: ${lastError.message}`,
        );
        await this.sleep(backoffMs);
      }
    }

    throw this.normalizeError(operation, lastError!);
  }

  /**
   * Normalize any error into a ProviderError
   */
  protected normalizeError(operation: string, error: Error): ProviderError {
    return {
      provider: this.providerName,
      operation,
      message: error.message,
      statusCode: this.extractStatusCode(error),
      retryable: this.isRetryable(error),
      raw: error,
    };
  }

  private extractStatusCode(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      // Axios-style
      if ('response' in error && error.response && typeof error.response === 'object' && 'status' in error.response) {
        return (error.response as { status: number }).status;
      }
      // Generic
      if ('statusCode' in error) {
        return (error as { statusCode: number }).statusCode;
      }
    }
    return undefined;
  }

  private isRetryable(error: unknown): boolean {
    const statusCode = this.extractStatusCode(error);
    if (!statusCode) return true; // Network errors are retryable
    if (statusCode === 429) return true; // Rate limited
    if (statusCode >= 500) return true; // Server errors
    return false;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
