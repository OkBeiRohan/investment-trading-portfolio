/**
 * Core types for Market SDK
 */

export enum ProviderType {
  UPSTOX = "upstox",
  BINANCE = "binance",
  YAHOO = "yahoo",
}

export enum Environment {
  SANDBOX = "SANDBOX",
  LIVE = "LIVE",
}

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  environment?: Environment;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface RequestConfig {
  provider: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number>;
  retries?: number;
  timeout?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  factor: number;
  jitter: boolean;
}

export interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  refillInterval: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}
