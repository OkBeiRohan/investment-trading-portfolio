import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosRequestConfig } from "axios";
import { RateLimiterService } from "../rate-limiter/rate-limiter.service";
import { CircuitBreakerService } from "../utils/circuit-breaker";
import { RequestConfig } from "../core/types";
import {
  ProviderError,
  RateLimitExceededError,
  UnauthorizedError,
  ServiceUnavailableError,
} from "../core/error";

/**
 * Provider-Agnostic HTTP Client with Advanced Features
 *
 * Features:
 * - Rate limiting (token bucket algorithm)
 * - Circuit breaker (prevents cascading failures)
 * - Automatic retry with exponential backoff
 * - Request/response logging
 * - Error normalization
 *
 * @example
 * ```typescript
 * const data = await httpClient.request<QuoteResponse>({
 *   provider: 'upstox',
 *   endpoint: 'https://api.upstox.com/v2/market-quote/quotes',
 *   method: 'GET',
 *   headers: { Authorization: `Bearer ${token}` },
 *   params: { instrument_key: 'NSE_INDEX|Nifty 50' },
 * });
 * ```
 */
@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly rateLimiter: RateLimiterService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  /**
   * Execute HTTP request with rate limiting, circuit breaker, and retry logic
   */
  async request<T>(config: RequestConfig): Promise<T> {
    const {
      provider,
      endpoint,
      method,
      headers,
      body,
      params,
      retries = 3,
      timeout = 10000,
    } = config;

    // Check circuit breaker
    if (this.circuitBreaker.isOpen(provider)) {
      throw new ServiceUnavailableError(provider);
    }

    // Acquire rate limit slot
    await this.rateLimiter.acquire(provider);

    // Build axios config
    const axiosConfig: AxiosRequestConfig = {
      url: endpoint,
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      data: body,
      params,
      timeout,
    };

    // Execute with retry logic
    return this.executeWithRetry<T>(provider, axiosConfig, retries);
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    provider: string,
    config: AxiosRequestConfig,
    maxAttempts: number
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const startTime = Date.now();

        const response = await firstValueFrom(
          this.httpService.request<T>(config)
        );

        const duration = Date.now() - startTime;

        // Log successful request
        this.logger.debug(
          `${provider} ${config.method} ${config.url} - ${response.status} (${duration}ms)`
        );

        // Record success for circuit breaker
        this.circuitBreaker.recordSuccess(provider);

        return response.data;
      } catch (error: any) {
        lastError = error;

        // Record failure for circuit breaker
        this.circuitBreaker.recordFailure(provider);

        // Log error
        this.logger.error(
          `${provider} ${config.method} ${config.url} - Attempt ${attempt}/${maxAttempts} failed:`,
          error.message
        );

        // Check if we should retry
        if (attempt < maxAttempts && this.shouldRetry(error)) {
          const delay = this.calculateBackoff(attempt);
          this.logger.debug(`Retrying after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Normalize and throw error
        throw this.normalizeError(error, provider);
      }
    }

    throw this.normalizeError(lastError, provider);
  }

  /**
   * Check if error is retryable
   */
  private shouldRetry(error: any): boolean {
    // Don't retry on 4xx errors (except 429)
    if (error.response?.status) {
      const status = error.response.status;

      if (status === 429) return true; // Rate limit - always retry
      if (status >= 400 && status < 500) return false; // Client errors - don't retry
      if (status >= 500) return true; // Server errors - retry
    }

    // Retry on network errors
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const factor = 2;
    const jitter = Math.random() * 500; // 0-500ms jitter

    return Math.min(baseDelay * Math.pow(factor, attempt - 1) + jitter, 30000); // Max 30s
  }

  /**
   * Normalize error into SDK error types
   */
  private normalizeError(error: any, provider: string): Error {
    if (error.response?.status) {
      const status = error.response.status;

      if (status === 429) {
        return new RateLimitExceededError(provider);
      }

      if (status === 401 || status === 403) {
        return new UnauthorizedError(provider);
      }

      if (status >= 500) {
        return new ServiceUnavailableError(provider);
      }
    }

    return new ProviderError(provider, error.message || "Unknown error");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
