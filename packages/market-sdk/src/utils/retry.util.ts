import { Logger } from "@nestjs/common";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger("RetryUtil");

  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      // Call onRetry callback
      opts.onRetry(attempt, error);

      // Log retry attempt
      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Decorator for retrying methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Check if error is retryable (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND"
  ) {
    return true;
  }

  // HTTP 5xx errors
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Rate limit errors (429)
  if (error.response?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Retry with jitter to avoid thundering herd
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger("RetryUtil");

  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      // Add jitter (0-50% of delay)
      const jitter = Math.random() * 0.5 * delay;
      const delayWithJitter = delay + jitter;

      opts.onRetry(attempt, error);
      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${Math.round(delayWithJitter)}ms...`
      );

      await sleep(delayWithJitter);

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker<T> {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly logger = new Logger("CircuitBreaker");

  constructor(
    private fn: () => Promise<T>,
    private options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 120000,
    }
  ) {}

  async execute(): Promise<T> {
    if (this.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.resetTimeout) {
        this.logger.log("Circuit breaker entering HALF_OPEN state");
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await this.fn();

      if (this.state === "HALF_OPEN") {
        this.logger.log("Circuit breaker closing after successful call");
        this.state = "CLOSED";
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.options.failureThreshold) {
        this.logger.error("Circuit breaker opening due to failure threshold");
        this.state = "OPEN";
      }

      throw error;
    }
  }

  getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
