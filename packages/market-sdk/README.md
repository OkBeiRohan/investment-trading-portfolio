# @repo/market-sdk

Comprehensive TypeScript wrapper for the Upstox API, optimized for algorithmic trading with Indian markets (NSE/BSE).

## Features

- ✅ **Type-Safe API**: Full TypeScript support with strict typing
- ✅ **V3 API Support**: Latest Upstox API v3 for orders and market data
- ✅ **Real-Time Streaming**: WebSocket support for market data and portfolio updates
- ✅ **Option Trading**: Option chain, Greeks (Delta, Gamma, Vega, Theta), and IV
- ✅ **Multi-Leg Orders**: Support for complex strategies (Straddles, Iron Condors, etc.)
- ✅ **Historical Data**: Intraday and historical candles with multiple timeframes
- ✅ **Portfolio Management**: Positions, holdings, and fund management
- ✅ **Auto-Reconnect**: Configurable WebSocket reconnection logic

## Installation

This package is part of the monorepo and already installed. To use it in your app:

```typescript
import { UpstoxSDK, TransactionType, OrderType } from '@repo/market-sdk';
```

## Quick Start

root
├── apps
│ ├── algo-engine # Primary consumer of market data
│ ├── dashboard # UI consumer via GraphQL/WebSockets
│ └── market-feeder # Dedicated microservice for data ingestion
├── packages
│ ├── types # Pure TypeScript definitions (Shared Contract)
│ │ ├── src
│ │ │ ├── upstox
│ │ │ │ ├── enums.ts
│ │ │ │ ├── interfaces.ts
│ │ │ │ ├── events.ts
│ │ │ │ └── protobuf.types.ts
│ │ │ └── index.ts
│ │ └── package.json
│ ├── database # Persistence Layer (MongoDB + Redis)
│ │ ├── src
│ │ │ ├── schemas
│ │ │ │ ├── token.schema.ts
│ │ │ │ └── order-log.schema.ts
│ │ │ ├── redis
│ │ │ │ ├── redis.service.ts
│ │ │ │ └── keys.factory.ts
│ │ │ └── index.ts
│ │ └── package.json
│ ├── upstox # The Core Integration Package
│ │ ├── src
│ │ │ ├── auth
│ │ │ │ ├── auth.service.ts
│ │ │ │ ├── strategies
│ │ │ │ │ ├── auth.strategy.ts
│ │ │ │ │ ├── sandbox.strategy.ts
│ │ │ │ │ └── live.strategy.ts
│ │ │ │ └── encryption.util.ts
│ │ │ ├── market-data
│ │ │ │ ├── multiplexer.service.ts
│ │ │ │ ├── allocator
│ │ │ │ │ ├── bin-packer.ts
│ │ │ │ │ └── priority-queue.ts
│ │ │ │ ├── socket
│ │ │ │ │ ├── socket-pool.ts
│ │ │ │ │ ├── connection.ts
│ │ │ │ │ └── proto-decoder.ts
│ │ │ │ ├── proto
│ │ │ │ │ └── MarketDataFeedV3.proto
│ │ │ │ └── constants.ts
│ │ │ ├── orders
│ │ │ │ └── orders.service.ts
│ │ │ ├── upstox.module.ts
│ │ │ └── index.ts
│ │ ├── package.json
│ │ ├── tsconfig.json
│ │ └── scripts
│ │ └── fetch-proto.sh
│ └── eslint-config
├── turbo.json
└── package.json

### 1. Initialize SDK

```typescript
import { UpstoxSDK } from '@repo/market-sdk';

const upstox = new UpstoxSDK({
  apiKey: process.env.UPSTOX_API_KEY!,
  apiSecret: process.env.UPSTOX_API_SECRET!,
  redirectUri: process.env.UPSTOX_REDIRECT_URI!,
});
```

### 2. Authentication (OAuth2 Flow)

```typescript
// Step 1: Get authorization URL
const authUrl = upstox.getAuthorizationUrl();
console.log('Visit:', authUrl);

// Step 2: After user authorizes, exchange code for token
const { accessToken } = await upstox.getAccessToken(authorizationCode);
console.log('Access Token:', accessToken);

// The token is automatically set in the SDK
```

### 3. Place Orders

```typescript
import {
  TransactionType,
  OrderType,
  ProductType,
  Validity,
} from '@repo/market-sdk';

// Market Order
const order = await upstox.order.placeOrder({
  instrumentKey: 'NSE_EQ|INE669E01016', // TCS
  quantity: 1,
  price: 0,
  transactionType: TransactionType.BUY,
  orderType: OrderType.MARKET,
  product: ProductType.INTRADAY,
  validity: Validity.DAY,
});

console.log('Order ID:', order.orderId);

// Limit Order
const limitOrder = await upstox.order.placeOrder({
  instrumentKey: 'NSE_EQ|INE669E01016',
  quantity: 10,
  price: 3500.5,
  transactionType: TransactionType.BUY,
  orderType: OrderType.LIMIT,
  product: ProductType.DELIVERY,
  validity: Validity.DAY,
});
```

### 4. Multi-Leg Orders (Option Strategies)

```typescript
// Long Straddle Example
const straddle = await upstox.order.placeMultiLegOrder({
  legs: [
    {
      // Buy ATM Call
      instrumentKey: 'NSE_FO|NIFTY24DEC19000CE',
      quantity: 50,
      price: 0,
      transactionType: TransactionType.BUY,
      orderType: OrderType.MARKET,
      product: ProductType.INTRADAY,
      validity: Validity.DAY,
    },
    {
      // Buy ATM Put
      instrumentKey: 'NSE_FO|NIFTY24DEC19000PE',
      quantity: 50,
      price: 0,
      transactionType: TransactionType.BUY,
      orderType: OrderType.MARKET,
      product: ProductType.INTRADAY,
      validity: Validity.DAY,
    },
  ],
});
```

### 5. Get Market Data

```typescript
// Get Last Traded Price
const ltpMap = await upstox.marketData.getLTP([
  'NSE_INDEX|Nifty 50',
  'NSE_INDEX|Nifty Bank',
]);

console.log('Nifty 50 LTP:', ltpMap.get('NSE_INDEX|Nifty 50'));

// Get Full Market Quote with Depth
const quotes = await upstox.marketData.getFullMarketQuote([
  'NSE_EQ|INE669E01016',
]);

const quote = quotes[0];
console.log('Bid:', quote.bidPrice, 'Ask:', quote.askPrice);
console.log('Market Depth:', quote.depth);
```

### 6. Get Option Greeks

```typescript
const greeksMap = await upstox.marketData.getOptionGreeks([
  'NSE_FO|NIFTY24DEC19000CE',
  'NSE_FO|NIFTY24DEC19000PE',
]);

const callGreeks = greeksMap.get('NSE_FO|NIFTY24DEC19000CE');
console.log('Call Delta:', callGreeks?.delta);
console.log('Call Vega:', callGreeks?.vega);
console.log('Call IV:', callGreeks?.iv);
```

### 7. Get Option Chain & PCR

```typescript
// Get full option chain
const optionChain = await upstox.marketData.getOptionChain(
  'NSE_INDEX|Nifty 50',
  '2024-12-26',
);

console.log('Available strikes:', optionChain.length);

// Calculate Put-Call Ratio
const pcr = await upstox.marketData.getPutCallRatio(
  'NSE_INDEX|Nifty 50',
  '2024-12-26',
);

console.log('PCR (Volume):', pcr.pcrVolume);
console.log('PCR (OI):', pcr.pcrOI);
```

### 8. Get Historical Data

```typescript
import { CandleInterval } from '@repo/market-sdk';

// Intraday candles
const candles = await upstox.marketData.getIntradayCandles(
  'NSE_INDEX|Nifty 50',
  CandleInterval.FIVE_MINUTE,
  new Date('2024-11-17'),
  new Date('2024-11-17'),
);

candles.forEach((candle) => {
  console.log(
    candle.timestamp,
    candle.open,
    candle.high,
    candle.low,
    candle.close,
  );
});

// Historical daily candles
const dailyCandles = await upstox.marketData.getHistoricalData(
  'NSE_INDEX|Nifty 50',
  CandleInterval.ONE_DAY,
  new Date('2024-01-01'),
  new Date('2024-11-17'),
);
```

### 9. WebSocket Streaming - Market Data

```typescript
import { MarketDataMode } from '@repo/market-sdk';

const stream = upstox.createMarketDataStream({
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

// Register event handlers
stream.onConnect(() => {
  console.log('Market data stream connected');
});

stream.onData((data) => {
  console.log('Instrument:', data.instrumentKey);
  console.log('LTP:', data.lastPrice);
  console.log('Greeks:', data.greeks);
});

stream.onError((error) => {
  console.error('Stream error:', error);
});

// Connect and subscribe
await stream.connect(
  ['NSE_INDEX|Nifty 50', 'NSE_FO|NIFTY24DEC19000CE'],
  MarketDataMode.OPTION_GREEKS,
);

// Subscribe to more instruments
stream.subscribe(['NSE_FO|NIFTY24DEC19000PE'], MarketDataMode.OPTION_GREEKS);

// Change mode for existing subscriptions
stream.changeMode(['NSE_INDEX|Nifty 50'], MarketDataMode.FULL);

// Unsubscribe
stream.unsubscribe(['NSE_INDEX|Nifty 50']);

// Disconnect when done
stream.disconnect();
```

### 10. WebSocket Streaming - Portfolio Updates

```typescript
const portfolioStream = upstox.createPortfolioStream();

portfolioStream.onData((update) => {
  if (update.type === 'order') {
    console.log('Order update:', update.data);
  } else if (update.type === 'position') {
    console.log('Position update:', update.data);
  }
});

await portfolioStream.connect();
```

### 11. Portfolio Management

```typescript
// Get all positions
const positions = await upstox.portfolio.getPositions();
positions.forEach((pos) => {
  console.log(`${pos.tradingSymbol}: PnL = ${pos.pnl}`);
});

// Get holdings
const holdings = await upstox.portfolio.getHoldings();

// Get funds
const funds = await upstox.portfolio.getFunds();
console.log('Available Margin:', funds.availableMargin);

// Get complete portfolio summary
const summary = await upstox.portfolio.getPortfolioSummary();
console.log('Total PnL:', summary.totalPnl);
console.log('Day PnL:', summary.dayPnl);
```

### 12. Order Management

```typescript
// Get order book
const orders = await upstox.order.getOrderBook();

// Get specific order details
const orderDetails = await upstox.order.getOrderDetails('240123000001');

// Get trade book
const trades = await upstox.order.getTradeBook();

// Modify order
await upstox.order.modifyOrder({
  orderId: '240123000001',
  quantity: 20,
  price: 3550.0,
  orderType: OrderType.LIMIT,
});

// Cancel order
await upstox.order.cancelOrder({
  orderId: '240123000001',
});
```

## Instrument Keys

Upstox uses `instrumentKey` in the format: `EXCHANGE|SYMBOL`

Examples:

- Nifty 50 Index: `NSE_INDEX|Nifty 50`
- Nifty Bank Index: `NSE_INDEX|Nifty Bank`
- TCS Stock: `NSE_EQ|INE669E01016`
- Nifty Call Option: `NSE_FO|NIFTY24DEC19000CE`
- Nifty Put Option: `NSE_FO|NIFTY24DEC19000PE`

You can get the complete list from the [Upstox Instruments API](https://api.upstox.com/v2/market-quote/instruments).

## Error Handling

```typescript
try {
  const order = await upstox.order.placeOrder({...});
} catch (error) {
  if (error instanceof Error) {
    console.error('Order failed:', error.message);
    // Error message contains human-readable text from Upstox API
  }
}
```

## Environment Variables

```bash
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
UPSTOX_REDIRECT_URI=http://localhost:3000/callback
UPSTOX_ACCESS_TOKEN=your_access_token # Optional if using saved token
```

## Usage in algo-worker

```typescript
import { UpstoxSDK, MarketDataMode } from '@repo/market-sdk';

@Injectable()
export class MarketConnectorService {
  private upstox: UpstoxSDK;
  private stream: MarketDataStream;

  constructor() {
    this.upstox = new UpstoxSDK({
      apiKey: process.env.UPSTOX_API_KEY!,
      apiSecret: process.env.UPSTOX_API_SECRET!,
      redirectUri: process.env.UPSTOX_REDIRECT_URI!,
      accessToken: process.env.UPSTOX_ACCESS_TOKEN,
    });

    this.stream = this.upstox.createMarketDataStream();
  }

  async startStreaming() {
    this.stream.onData((data) => {
      // Process market data for feature engineering
      this.processMarketData(data);
    });

    await this.stream.connect(
      ['NSE_INDEX|Nifty 50'],
      MarketDataMode.OPTION_GREEKS,
    );
  }

  async placeStrategyOrder(strategy: string, legs: OrderLeg[]) {
    return this.upstox.order.placeMultiLegOrder({ legs });
  }
}
```

## API Reference

See TypeScript types in `src/types/` for complete API reference.

## License

Part of the investment-trading-portfolio monorepo.
