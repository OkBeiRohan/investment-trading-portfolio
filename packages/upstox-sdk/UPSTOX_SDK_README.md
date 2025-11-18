# @repo/upstox-sdk

Type-safe Upstox SDK that merges [upstox-js-sdk](https://www.npmjs.com/package/upstox-js-sdk) with OpenAPI-generated types for complete type safety and developer experience.

## Features

✅ **Full Type Safety** - Complete TypeScript support with auto-completion  
✅ **Backward Compatible** - Original OpenAPI-generated APIs still work  
✅ **Unified Client** - Single `UpstoxClient` class for all operations  
✅ **Typed WebSockets** - Strongly-typed market data and portfolio streams  
✅ **Helper Functions** - Utility functions for common operations  
✅ **All Upstox APIs** - Complete coverage of Upstox API v2 & v3

## Installation

```bash
pnpm install @repo/upstox-sdk
```

## Quick Start

### Basic Setup

```typescript
import { UpstoxClient } from "@repo/upstox-sdk";

// Initialize client
const client = new UpstoxClient({
  accessToken: "your_access_token",
  sandbox: false, // Set to true for sandbox environment
});

// Get user profile
const profile = await client.getProfile();
console.log(`User: ${profile.data?.user_name}`);

// Get positions
const positions = await client.getPositions();
console.log(`Positions:`, positions.data);
```

### Place an Order

```typescript
import { PlaceOrderV3Request } from "@repo/upstox-sdk";

const orderRequest = new PlaceOrderV3Request(
  1, // quantity
  PlaceOrderV3Request.ProductEnum.D, // Delivery
  PlaceOrderV3Request.ValidityEnum.DAY,
  0, // price (0 for market order)
  "NSE_EQ|INE528G01035", // instrument key (Reliance)
  PlaceOrderV3Request.OrderTypeEnum.MARKET,
  PlaceOrderV3Request.TransactionTypeEnum.BUY,
  0, // disclosed quantity
  0, // trigger price
  false // is AMO
);

const response = await client.placeOrder(orderRequest);
console.log(`Order ID: ${response.data?.order_id}`);
```

### Market Data (WebSocket)

```typescript
import { TypedMarketDataStreamer } from "@repo/upstox-sdk";

const streamer = client.createMarketDataStreamer(
  ["NSE_EQ|INE528G01035"], // Reliance
  "full" // Mode: 'ltpc', 'full', 'full_d30', 'option_greeks'
);

// Strongly-typed events
streamer.on("open", () => {
  console.log("Connected to market data");
});

streamer.on("message", (updates) => {
  updates.forEach((update) => {
    console.log(`${update.instrumentKey}: LTP = ${update.feed.ltpc?.ltp}`);
    console.log(`Greeks:`, update.feed.optionGreek);
  });
});

streamer.on("error", (error) => {
  console.error("Stream error:", error);
});

streamer.connect();
```

### Portfolio Updates (WebSocket)

```typescript
import { TypedPortfolioDataStreamer } from "@repo/upstox-sdk";

const portfolio = client.createPortfolioDataStreamer(
  true, // Order updates
  true, // Position updates
  false, // Holding updates
  false // GTT updates
);

portfolio.on("message", (update) => {
  if (update.type === "order") {
    const order = update.data as OrderUpdate;
    console.log(`Order ${order.order_id}: ${order.status}`);
  }
});

portfolio.connect();
```

## API Reference

### UpstoxClient Methods

#### Orders

```typescript
// Place order
await client.placeOrder(orderRequest, { slice: true }, "algo-name");

// Modify order
await client.modifyOrder(modifyRequest, "algo-name");

// Cancel order
await client.cancelOrder("order_id", "algo-name");

// Get order book
await client.getOrderBook();

// Get trades
await client.getTrades();
```

#### GTT Orders

```typescript
// Place GTT order
await client.placeGTTOrder(gttRequest);

// Modify GTT order
await client.modifyGTTOrder(modifyRequest);

// Cancel GTT order
await client.cancelGTTOrder({ id: "gtt_id" });

// Get all GTT orders
await client.getGTTOrders();
```

#### Portfolio

```typescript
// Get positions
await client.getPositions();

// Get holdings
await client.getHoldings();

// Convert position
await client.convertPosition(convertRequest);

// Get funds and margin
await client.getFundsAndMargin();
```

#### Market Data

```typescript
// Get LTP (Last Traded Price)
await client.getLTP(["NSE_EQ|INE528G01035", "NSE_EQ|INE467B01029"]);

// Get OHLC
await client.getOHLC(["NSE_EQ|INE528G01035"], "1d");

// Get option Greeks
await client.getOptionGreeks(["NFO_OPT|46335"]);

// Get full market quote with depth
await client.getFullMarketQuote(["NSE_EQ|INE528G01035"]);
```

#### Historical Data

```typescript
// Get historical candles
await client.getHistoricalCandles(
  "NSE_EQ|INE528G01035",
  "day",
  "1",
  "2024-01-01",
  "2023-01-01"
);

// Get intraday candles
await client.getIntradayCandles("NSE_EQ|INE528G01035", "minute", "5");
```

#### Options

```typescript
// Get option chain
await client.getOptionChain("NSE_INDEX|Nifty 50", "2024-12-26");

// Get option contracts
await client.getOptionContracts("NSE_INDEX|Nifty 50", "2024-12-26");
```

#### Charges & Margin

```typescript
// Get brokerage charges
await client.getBrokerage("NSE_EQ|INE528G01035", 100, "D", "BUY", 2500);

// Calculate margin
await client.calculateMargin([
  {
    instrument_token: "NSE_EQ|INE528G01035",
    quantity: 100,
    transaction_type: "BUY",
    product: "D",
  },
]);
```

#### Market Status & Holidays

```typescript
// Get market status
await client.getMarketStatus("NSE");

// Get holidays
await client.getHolidays();

// Get exchange timings
await client.getExchangeTimings("2024-12-01");
```

### TypedMarketDataStreamer

```typescript
const streamer = new TypedMarketDataStreamer(
  ["NSE_EQ|INE528G01035"], // Optional: initial instruments
  "full" // Optional: initial mode
);

// Connect
streamer.connect();

// Subscribe to instruments
streamer.subscribe(["NSE_EQ|INE467B01029"], "ltpc");

// Change mode
streamer.changeMode(["NSE_EQ|INE528G01035"], "option_greeks");

// Unsubscribe
streamer.unsubscribe(["NSE_EQ|INE467B01029"]);

// Configure auto-reconnect
streamer.autoReconnect(true, 5, 3); // enable, interval(s), retryCount

// Disconnect
streamer.disconnect();
```

#### Events

- `open` - Connection established
- `close` - Connection closed
- `message` - Parsed market data received
- `rawMessage` - Raw buffer data received
- `error` - Error occurred
- `reconnecting` - Reconnection attempt started
- `autoReconnectStopped` - Auto-reconnect stopped after retries

### TypedPortfolioDataStreamer

```typescript
const portfolio = new TypedPortfolioDataStreamer(
  true, // Order updates
  true, // Position updates
  false, // Holding updates
  false // GTT updates
);

// Connect
portfolio.connect();

// Configure auto-reconnect
portfolio.autoReconnect(true, 5, 3);

// Disconnect
portfolio.disconnect();
```

## Helper Functions

### Market Data Helpers

```typescript
import {
  extractLTP,
  extractGreeks,
  extractLatestOHLC,
  extractDepth,
} from "@repo/upstox-sdk";

// Extract LTP from feed
const ltp = extractLTP(feed);

// Extract option Greeks
const greeks = extractGreeks(feed);

// Extract latest OHLC candle
const ohlc = extractLatestOHLC(feed);

// Extract bid-ask depth
const depth = extractDepth(feed);
```

### Order Status Helpers

```typescript
import {
  isOrderComplete,
  isOrderPending,
  isOrderTerminal,
} from "@repo/upstox-sdk";

if (isOrderComplete(order)) {
  console.log("Order filled completely");
}

if (isOrderPending(order)) {
  console.log("Order is pending");
}

if (isOrderTerminal(order)) {
  console.log("Order in terminal state (completed/cancelled/rejected)");
}
```

## Enums

### Order Enums

```typescript
import { PlaceOrderV3Request } from "@repo/upstox-sdk";

// Product types
PlaceOrderV3Request.ProductEnum.D; // Delivery/CNC
PlaceOrderV3Request.ProductEnum.I; // Intraday/MIS
PlaceOrderV3Request.ProductEnum.M; // MTF
PlaceOrderV3Request.ProductEnum.B; // Bracket Order

// Validity types
PlaceOrderV3Request.ValidityEnum.DAY; // Day order
PlaceOrderV3Request.ValidityEnum.IOC; // Immediate or Cancel

// Order types
PlaceOrderV3Request.OrderTypeEnum.MARKET; // Market order
PlaceOrderV3Request.OrderTypeEnum.LIMIT; // Limit order
PlaceOrderV3Request.OrderTypeEnum.SL; // Stop Loss
PlaceOrderV3Request.OrderTypeEnum.SL_M; // Stop Loss Market

// Transaction types
PlaceOrderV3Request.TransactionTypeEnum.BUY;
PlaceOrderV3Request.TransactionTypeEnum.SELL;
```

## Advanced Usage

### Access Raw SDK

If you need access to the underlying upstox-js-sdk:

```typescript
// Get raw API client
const rawClient = client.getRawClient();

// Get raw streamer
const rawStreamer = streamer.getRawStreamer();

// Access specific API classes directly
import { OrderApiV3, MarketQuoteV3Api } from "@repo/upstox-sdk";

const orderApi = new OrderApiV3(rawClient);
const marketApi = new MarketQuoteV3Api(rawClient);
```

### Sandbox Mode

```typescript
const client = new UpstoxClient({
  accessToken: "sandbox_access_token",
  sandbox: true, // Enable sandbox mode
});
```

### Algo Name Support

Track orders with algorithm IDs:

```typescript
await client.placeOrder(orderRequest, { slice: true }, "my-algo-v1");
await client.modifyOrder(modifyRequest, "my-algo-v1");
await client.cancelOrder("order_id", "my-algo-v1");
```

## Migration Guide

### From Original OpenAPI SDK

The original APIs still work:

```typescript
// Old way (still works)
import { OrderApi } from "@repo/upstox-sdk";
const orderApi = new OrderApi();

// New way (recommended)
import { UpstoxClient } from "@repo/upstox-sdk";
const client = new UpstoxClient({ accessToken: "token" });
```

### From upstox-js-sdk

```typescript
// Old way
let UpstoxClient = require("upstox-js-sdk");
let defaultClient = UpstoxClient.ApiClient.instance;
defaultClient.authentications["OAUTH2"].accessToken = token;

// New way (TypeScript)
import { UpstoxClient } from "@repo/upstox-sdk";
const client = new UpstoxClient({ accessToken: token });
```

## Type Exports

All types are exported for use in your application:

```typescript
import type {
  GetOrderBookResponse,
  GetPositionResponse,
  GetHoldingsResponse,
  PlaceOrderV3Response,
  MarketDataFeed,
  OrderUpdate,
  // ... and many more
} from "@repo/upstox-sdk";
```

## Examples

See the `/examples` directory in the upstox-js-sdk package for more examples:

- [Market Data WebSocket](https://github.com/upstox/upstox-nodejs/tree/main/examples/websocket/market_data)
- [Order Updates WebSocket](https://github.com/upstox/upstox-nodejs/tree/main/examples/websocket/order_updates)

## Documentation

- [Upstox API Documentation](https://upstox.com/developer/api-documentation)
- [upstox-js-sdk GitHub](https://github.com/upstox/upstox-nodejs)
- [Upstox Developer Portal](https://upstox.com/developer/)

## License

MIT
