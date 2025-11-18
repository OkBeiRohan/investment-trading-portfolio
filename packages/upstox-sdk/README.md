# @repo/upstox-sdk

Type-safe Upstox SDK wrapper with WebSocket support for algorithmic trading.

## Features

✅ **Full TypeScript Support** - Complete type definitions for upstox-js-sdk  
✅ **Convenient Wrapper** - Easy-to-use `UpstoxClient` class  
✅ **WebSocket Streaming** - Type-safe market data and portfolio streams  
✅ **Helper Functions** - Extract LTP, Greeks, OHLC, and more  
✅ **pnpm Compatible** - Works with pnpm's symlink structure  

## Installation

```bash
pnpm add @repo/upstox-sdk
```

## Quick Start

```typescript
import { UpstoxClient } from '@repo/upstox-sdk';

// Initialize client
const client = new UpstoxClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  accessToken: 'your-access-token'
});

// Place order
const order = await client.placeOrder({
  instrument_key: 'NSE_EQ|INE528G01035',
  quantity: 1,
  transaction_type: 'BUY',
  order_type: 'MARKET',
  product: 'D',
  validity: 'DAY'
});

// Get positions
const positions = await client.getPositions();

// Stream market data
import { TypedMarketDataStreamer, extractLTP } from '@repo/upstox-sdk';

const stream = new TypedMarketDataStreamer(
  ['NSE_INDEX|Nifty 50'],
  'ltpc'
);

stream.on('message', (data) => {
  const ltp = extractLTP(data, 'NSE_INDEX|Nifty 50');
  console.log('LTP:', ltp);
});

await stream.connect();
```

## Documentation

See [UPSTOX_SDK_README.md](./UPSTOX_SDK_README.md) for complete API documentation and examples.

## Structure

- `index.ts` - Main exports
- `typed-client.ts` - UpstoxClient wrapper class
- `typed-streamers.ts` - Type-safe WebSocket streamers
- `types/upstox-js-sdk/` - TypeScript declarations for upstox-js-sdk

## License

MIT
