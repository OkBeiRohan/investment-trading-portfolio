export class MarketSDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "MarketSDKError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends MarketSDKError {
  constructor(message: string, details?: any) {
    super(message, "AUTH_ERROR", details);
    this.name = "AuthenticationError";
  }
}

export class ProviderError extends MarketSDKError {
  constructor(message: string, details?: any) {
    super(message, "PROVIDER_ERROR", details);
    this.name = "ProviderError";
  }
}

export class WebSocketError extends MarketSDKError {
  constructor(message: string, details?: any) {
    super(message, "WEBSOCKET_ERROR", details);
    this.name = "WebSocketError";
  }
}

export class RateLimitError extends MarketSDKError {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", { retryAfter });
    this.name = "RateLimitError";
  }
}

export class ValidationError extends MarketSDKError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class CapacityError extends MarketSDKError {
  constructor(message: string, details?: any) {
    super(message, "CAPACITY_ERROR", details);
    this.name = "CapacityError";
  }
}
