---
applyTo: "packages/market-sdk/**"
---

# @repo/market-sdk - Coding Instructions

> Multi-provider SDK for market data and trading (Upstox, Yahoo Finance, Binance).

---

## Design Principles

### 1. Provider Abstraction

**RULE**: Apps should NEVER import `axios` or call broker APIs directly. Always use the SDK.

```typescript
// ❌ BAD: Direct API call
const response = await axios.get('https://api.upstox.com/v2/market-quote/quotes', {
  headers: { Authorization: `Bearer ${token}` }
});

// ✅ GOOD: Use SDK
import { UpstoxProvider } from '@repo/market-sdk';

const upstox = new UpstoxProvider(apiKey, accessToken);
const quote = await upstox.getQuote('NSE_INDEX|Nifty 50');
```

**Why**: Centralized error handling, rate limiting, retries, data normalization, SEBI compliance.

### 2. Provider-Agnostic Data Format

All providers MUST return data in a common format:

```typescript
interface MarketQuote {
  instrumentKey: string;
  ltp: number;           // Last Traded Price
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: Date;
}
```

---

## Upstox Provider

### Authentication

```typescript
class UpstoxProvider {
  private apiKey: string;
  private accessToken: string;
  private baseUrl = 'https://api.upstox.com';

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'Api-Version': '2.0',
    };
  }
}
```

### Rate Limiting (Upstox: 250 req/sec)

```typescript
import Bottleneck from 'bottleneck';

private limiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 100, // 10 requests/sec per connection
});

async getQuote(instrumentKey: string): Promise<MarketQuote> {
  return this.limiter.schedule(async () => {
    const response = await axios.get(`${this.baseUrl}/v2/market-quote/quotes`, {
      params: { instrument_key: instrumentKey },
      headers: this.getHeaders(),
    });
    
    return this.normalizeQuote(response.data.data[instrumentKey]);
  });
}
```

### WebSocket (Real-Time Data)

```typescript
class UpstoxWebSocketClient {
  private ws: WebSocket;
  private subscriptions = new Set<string>();

  async connect(authorizedUrl: string): Promise<void> {
    this.ws = new WebSocket(authorizedUrl);
    this.ws.binaryType = 'arraybuffer'; // Upstox uses Protobuf
    
    this.ws.on('open', () => this.logger.log('WebSocket connected'));
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('error', (err) => this.handleError(err));
  }

  private handleMessage(data: ArrayBuffer): void {
    // Decode Upstox Protobuf format
    const decoded = UpstoxProto.FeedResponse.decode(new Uint8Array(data));
    
    for (const feed of decoded.feeds) {
      const quote = this.normalizeProtobufQuote(feed);
      this.emit('quote', quote);
    }
  }

  subscribe(instrumentKeys: string[]): void {
    const payload = {
      guid: 'subscription_guid',
      method: 'sub',
      data: {
        mode: 'option_greeks', // 'ltpc' | 'full' | 'option_greeks'
        instrumentKeys,
      },
    };
    
    this.ws.send(JSON.stringify(payload));
    instrumentKeys.forEach(key => this.subscriptions.add(key));
  }
}
```

---

## SEBI 2024-2025 Compliance

### Algo ID Tagging

Every order MUST include `algoId`:

```typescript
interface OrderRequest {
  quantity: number;
  price?: number;
  product: 'I' | 'D'; // Intraday or Delivery
  validity: 'DAY' | 'IOC';
  disclosedQuantity?: number;
  transactionType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  instrumentKey: string;
  
  // SEBI 2024-2025
  algoId: string;  // Format: PROJ_QUANTUM_v{version}_USER_{userId}
  strategyType: string; // e.g., 'IRON_CONDOR', 'LONG_STRADDLE'
}

async placeOrder(order: OrderRequest): Promise<OrderResponse> {
  // Validate algoId format
  if (!order.algoId.startsWith('PROJ_QUANTUM_v')) {
    throw new Error('Invalid algoId format for SEBI compliance');
  }
  
  // Audit log BEFORE API call
  await this.auditLogger.logOrderAttempt(order);
  
  const response = await axios.post(
    `${this.baseUrl}/v2/order/place`,
    order,
    { headers: this.getHeaders() }
  );
  
  // Audit log AFTER API call
  await this.auditLogger.logOrderResponse(order, response.data);
  
  return response.data;
}
```

---

## Yahoo Finance Provider (Historical Data)

```typescript
class YahooFinanceProvider {
  private baseUrl = 'https://query1.finance.yahoo.com';

  async getHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: '1d' | '1wk' | '1mo'
  ): Promise<Candle[]> {
    const response = await axios.get(`${this.baseUrl}/v8/finance/chart/${symbol}`, {
      params: {
        period1: Math.floor(startDate.getTime() / 1000),
        period2: Math.floor(endDate.getTime() / 1000),
        interval,
      },
    });
    
    return this.normalizeYahooCandles(response.data);
  }
}
```

---

## Binance Provider (Crypto - Future)

```typescript
class BinanceProvider {
  async getKlines(
    symbol: string,
    interval: '1m' | '5m' | '15m' | '1h',
    limit = 500
  ): Promise<Candle[]> {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol, interval, limit },
    });
    
    return this.normalizeBinanceKlines(response.data);
  }
}
```

---

## Error Handling

### Retry with Exponential Backoff

```typescript
import { retry } from '@lifeomic/attempt';

async getQuoteWithRetry(instrumentKey: string): Promise<MarketQuote> {
  return retry(
    async () => {
      const quote = await this.getQuote(instrumentKey);
      return quote;
    },
    {
      maxAttempts: 3,
      delay: 1000, // 1s initial delay
      factor: 2,   // Exponential backoff
      jitter: true,
      handleError: (err, context) => {
        if (err.response?.status === 429) {
          // Rate limit - retry
          this.logger.warn(`Rate limited, attempt ${context.attemptNum}`);
          return;
        }
        throw err; // Don't retry on other errors
      },
    }
  );
}
```

---

## Testing Guidelines

### Mock Providers

```typescript
const mockUpstoxProvider = {
  getQuote: jest.fn(),
  placeOrder: jest.fn(),
};

it('should fetch quote from Upstox', async () => {
  mockUpstoxProvider.getQuote.mockResolvedValue(mockQuote);
  
  const quote = await service.getQuote('NSE_INDEX|Nifty 50');
  
  expect(mockUpstoxProvider.getQuote).toHaveBeenCalledWith('NSE_INDEX|Nifty 50');
  expect(quote.ltp).toBe(23450.5);
});
```

### Integration Tests (Sandbox)

```typescript
describe('UpstoxProvider (Sandbox)', () => {
  const provider = new UpstoxProvider(
    process.env.UPSTOX_SANDBOX_API_KEY,
    process.env.UPSTOX_SANDBOX_ACCESS_TOKEN
  );

  it('should place test order', async () => {
    const order: OrderRequest = {
      quantity: 1,
      product: 'I',
      validity: 'DAY',
      transactionType: 'BUY',
      orderType: 'MARKET',
      instrumentKey: 'NSE_INDEX|Nifty 50',
      algoId: 'PROJ_QUANTUM_v1.0.0_USER_test',
      strategyType: 'BACKTEST',
    };
    
    const response = await provider.placeOrder(order);
    
    expect(response.status).toBe('success');
    expect(response.orderId).toBeDefined();
  });
});
```

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready (Upstox), Yahoo Finance Implemented

