# Market SDK - Complete Architecture

## Directory Structure

```
packages/market-sdk/
├── package.json
├── tsconfig.json
├── README.md
├── .env.sample
│
├── src/
│   ├── index.ts                          # Main exports
│   │
│   ├── core/
│   │   ├── provider.interface.ts         # Base provider interface
│   │   ├── provider.factory.ts           # Factory for creating providers
│   │   ├── provider.registry.ts          # Provider discovery & management
│   │   └── errors.ts                     # Custom error classes
│   │
│   ├── auth/
│   │   ├── auth-manager.service.ts       # Multi-user auth orchestrator
│   │   ├── token-storage.service.ts      # MongoDB token persistence
│   │   └── encryption.util.ts            # AES-256-GCM encryption
│   │
│   ├── multiplexer/                      # ⭐ WebSocket Multiplexer (INSIDE SDK)
│   │   ├── multiplexer.service.ts        # Main multiplexer logic
│   │   ├── socket-pool.ts                # Connection pool management
│   │   ├── subscription-manager.ts       # Track subscriptions per user
│   │   ├── bin-packer.ts                 # Bin packing algorithm
│   │   ├── priority-queue.ts             # Priority-based eviction
│   │   └── types.ts                      # Multiplexer types
│   │
│   ├── providers/
│   │   ├── upstox/
│   │   │   ├── upstox.provider.ts        # Main Upstox provider
│   │   │   ├── upstox.module.ts          # NestJS module
│   │   │   ├── auth/
│   │   │   │   ├── live.strategy.ts      # OAuth2 flow
│   │   │   │   └── sandbox.strategy.ts   # Manual token entry
│   │   │   ├── api/
│   │   │   │   ├── market-data.api.ts    # Market data endpoints
│   │   │   │   ├── orders.api.ts         # Order management
│   │   │   │   └── portfolio.api.ts      # Portfolio/positions
│   │   │   ├── websocket/
│   │   │   │   ├── market-stream.ts      # Market data WebSocket
│   │   │   │   ├── proto-decoder.ts      # Protobuf decoder
│   │   │   │   └── proto/
│   │   │   │       └── MarketDataFeedV3.proto
│   │   │   ├── constants.ts              # API URLs, limits
│   │   │   └── index.ts
│   │   │
│   │   ├── yahoo/
│   │   │   ├── yahoo.provider.ts         # Yahoo Finance provider
│   │   │   ├── api/
│   │   │   │   └── market-data.api.ts    # Historical data only
│   │   │   └── index.ts
│   │   │
│   │   └── binance/
│   │       ├── binance.provider.ts       # Binance provider
│   │       ├── api/
│   │       │   ├── market-data.api.ts
│   │       │   ├── orders.api.ts
│   │       │   └── portfolio.api.ts
│   │       ├── websocket/
│   │       │   └── binance-stream.ts
│   │       └── index.ts
│   │
│   ├── interfaces/                       # Shared provider interfaces
│   │   ├── market-data.interface.ts
│   │   ├── orders.interface.ts
│   │   └── portfolio.interface.ts
│   │
│   └── utils/
│       ├── instrument-parser.ts          # Parse instrument keys
│       ├── retry.util.ts                 # Retry logic with backoff
│       └── rate-limiter.ts               # Rate limiting
│
└── scripts/
    └── fetch-proto.sh                    # Download Upstox proto file
```

---

## Key Design Decisions

### 1. Multi-User Authentication Strategy

**Problem:** Each user needs their own Upstox account with separate credentials.

**Solution:**
- **Sandbox Mode:** Users manually paste their access token (no OAuth needed)
- **Live Mode:** Full OAuth2 flow with encrypted token storage in MongoDB
- **Shared API Key/Secret:** Platform-level credentials stored in `.env` (not per-user)

**Flow:**
```
User Registration (Platform)
    ↓
User Links Upstox Account
    ├─→ Sandbox: Paste token → Encrypt & Store in MongoDB
    └─→ Live: OAuth2 → Exchange code → Encrypt & Store token

When algo-worker needs to trade for User X:
    ↓
AuthManager.getToken(userId, env) → Decrypt from MongoDB → Use in API calls
```

### 2. WebSocket Multiplexer (Inside SDK)

**Why inside SDK?**
- Reduces latency (in-process vs network call)
- Shared across all apps using market-sdk
- Encapsulates complexity
- Apps just call: `multiplexer.subscribe(userId, ['NIFTY50'], priority)`

**Features:**
- **Bin Packing:** First-Fit allocation to sockets
- **Priority System:**
  - Priority 1 (CRITICAL): Indices, Futures
  - Priority 2 (HIGH): ATM options
  - Priority 3 (MEDIUM): Near OTM (±5 strikes)
  - Priority 4 (LOW): Deep OTM
- **Eviction:** When full, drop Priority 4 subscriptions
- **Multi-User:** Each user's subscriptions tracked separately
- **State Persistence:** Redis stores socket→instrument mappings

### 3. Provider Pattern

**Interface-Based Design:**
```typescript
interface IMarketDataProvider {
  getLTP(instruments: string[]): Promise<Map<string, number>>;
  getHistoricalData(params: HistoricalDataParams): Promise<Candle[]>;
  // ...
}

interface IOrderProvider {
  placeOrder(userId: string, order: OrderParams): Promise<OrderResponse>;
  // ...
}
```

**Factory Pattern:**
```typescript
ProviderFactory.create('upstox', config) // Returns UpstoxProvider
ProviderFactory.create('yahoo', config)  // Returns YahooProvider
ProviderFactory.create('binance', config) // Returns BinanceProvider
```

---

## Authentication Deep Dive

### Scenario 1: Sandbox Mode (No OAuth)

**User Flow:**
1. User goes to Upstox Developer Dashboard
2. Generates a sandbox access token manually
3. Pastes token into our platform UI
4. Platform encrypts & stores in MongoDB

**Implementation:**
```typescript
// User submits sandbox token via API
POST /api/user/link-upstox/sandbox
Body: { accessToken: "eyJh..." }

// auth-manager.service.ts
async saveSandboxToken(userId: string, rawToken: string) {
  const { encrypted, iv, tag } = this.encryption.encrypt(rawToken);
  
  await this.tokenModel.findOneAndUpdate(
    { userId, environment: 'SANDBOX' },
    {
      userId,
      upstoxUserId: 'SANDBOX_USER',
      encryptedAccessToken: encrypted,
      iv,
      authTag: tag,
      environment: 'SANDBOX',
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    { upsert: true }
  );
}
```

### Scenario 2: Live Mode (OAuth2)

**User Flow:**
1. User clicks "Link Upstox Live Account"
2. Redirected to Upstox authorization URL
3. User authorizes our app
4. Upstox redirects back with `code`
5. Platform exchanges code for access token
6. Token encrypted & stored

**Implementation:**
```typescript
// Step 1: Generate authorization URL
GET /api/user/link-upstox/live
Response: { authUrl: "https://api.upstox.com/v2/login/authorization/dialog?client_id=..." }

// Step 2: Handle callback
GET /api/user/upstox/callback?code=ABC123

// auth-manager.service.ts
async handleLiveCallback(userId: string, authCode: string) {
  // Exchange code for token using platform API key/secret
  const params = new URLSearchParams({
    code: authCode,
    client_id: process.env.UPSTOX_API_KEY,      // Platform credentials
    client_secret: process.env.UPSTOX_API_SECRET, // Platform credentials
    redirect_uri: process.env.UPSTOX_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await axios.post(
    'https://api.upstox.com/v2/login/authorization/token',
    params
  );

  const { access_token, user_id, expires_in } = response.data;

  // Encrypt and store
  const { encrypted, iv, tag } = this.encryption.encrypt(access_token);
  
  await this.tokenModel.create({
    userId,
    upstoxUserId: user_id,
    encryptedAccessToken: encrypted,
    iv,
    authTag: tag,
    environment: 'LIVE',
    expiry: new Date(Date.now() + expires_in * 1000),
  });
}
```

### API Key/Secret Handling

**Answer:** Platform-level credentials only (not per-user)

**Reasoning:**
- Upstox OAuth requires a registered app with API key/secret
- These are **platform credentials**, not user credentials
- Stored in `.env` on server
- For sandbox, users don't need API key/secret (just paste token)

**.env Configuration:**
```bash
# Platform-level Upstox App Credentials
UPSTOX_API_KEY=your_platform_api_key
UPSTOX_API_SECRET=your_platform_api_secret
UPSTOX_REDIRECT_URI=https://yourapp.com/api/upstox/callback

# Encryption Key (32 characters)
ENCRYPTION_KEY=your_32_character_encryption_key

# Database
MONGODB_URI=mongodb://localhost:27017/trading
REDIS_URL=redis://localhost:6379
```

---

## WebSocket Multiplexer Algorithm

### Bin Packing with Priority Queue

```typescript
// multiplexer.service.ts
async subscribe(
  userId: string, 
  instruments: string[], 
  priority: PriorityLevel = PriorityLevel.MEDIUM
) {
  for (const instrument of instruments) {
    // Check if already subscribed
    const existingSocket = await this.redis.getSocketForInstrument(instrument);
    if (existingSocket) continue;

    // Try First-Fit allocation
    let allocated = false;
    for (const socket of this.socketPool.getSockets()) {
      if (socket.hasCapacity(1)) {
        socket.subscribe([instrument]);
        await this.redis.setSocketForInstrument(instrument, socket.id);
        await this.subscriptionManager.track(userId, instrument, priority);
        allocated = true;
        break;
      }
    }

    // Create new socket if under limit
    if (!allocated && this.socketPool.size() < this.MAX_SOCKETS) {
      const newSocket = await this.socketPool.createSocket(userId);
      newSocket.subscribe([instrument]);
      await this.redis.setSocketForInstrument(instrument, newSocket.id);
      await this.subscriptionManager.track(userId, instrument, priority);
      allocated = true;
    }

    // Eviction: Drop lowest priority
    if (!allocated) {
      const candidate = await this.priorityQueue.peekEvictionCandidate();
      if (candidate && candidate.priority > priority) {
        await this.evict(candidate.instrumentKey);
        // Retry subscription
        await this.subscribe(userId, [instrument], priority);
      } else {
        this.logger.warn(`Cannot subscribe ${instrument}: capacity reached`);
      }
    }
  }
}
```

### Priority Assignment

```typescript
// Example: Option chain subscription
const strikes = optionChain.map(o => o.instrumentKey);

// Assign priorities based on strike distance from ATM
strikes.forEach(strike => {
  const distance = Math.abs(strike.strikePrice - atmPrice);
  
  let priority;
  if (distance === 0) priority = PriorityLevel.HIGH; // ATM
  else if (distance <= 5 * 50) priority = PriorityLevel.MEDIUM; // ±5 strikes
  else priority = PriorityLevel.LOW; // Deep OTM
  
  multiplexer.subscribe(userId, [strike.instrumentKey], priority);
});
```

---

## Usage Examples

### Example 1: Algo-Worker Using Market-SDK

```typescript
// apps/algo-worker/src/engines/data/market-connector.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactory, MultiplexerService, PriorityLevel } from '@repo/market-sdk';

@Injectable()
export class MarketConnectorService {
  private upstox: UpstoxProvider;

  constructor(
    private multiplexer: MultiplexerService,
    private logger: Logger,
  ) {
    this.upstox = ProviderFactory.create('upstox', {
      apiKey: process.env.UPSTOX_API_KEY,
      apiSecret: process.env.UPSTOX_API_SECRET,
    });
  }

  async subscribeToNiftyOptions(userId: string) {
    // Get option chain
    const chain = await this.upstox.getOptionChain('NSE_INDEX|Nifty 50', '2024-12-26');
    
    // Assign priorities
    const atmStrike = 19000;
    const subscriptions = chain.map(opt => ({
      key: opt.instrumentKey,
      priority: this.calculatePriority(opt.strikePrice, atmStrike),
    }));

    // Subscribe via multiplexer (intelligent allocation)
    for (const sub of subscriptions) {
      await this.multiplexer.subscribe(userId, [sub.key], sub.priority);
    }

    // Listen to market data
    this.multiplexer.on('data', (data) => {
      this.processMarketData(data);
    });
  }

  private calculatePriority(strike: number, atm: number): PriorityLevel {
    const distance = Math.abs(strike - atm);
    if (distance === 0) return PriorityLevel.HIGH;
    if (distance <= 250) return PriorityLevel.MEDIUM; // ±5 strikes (50 points each)
    return PriorityLevel.LOW;
  }
}
```

### Example 2: Multi-Provider Support

```typescript
// Use Yahoo for historical data, Upstox for live trading
const yahoo = ProviderFactory.create('yahoo');
const historicalData = await yahoo.getHistoricalData({
  symbol: '^NSEI',
  interval: '1d',
  startDate: new Date('2020-01-01'),
  endDate: new Date('2024-11-21'),
});

const upstox = ProviderFactory.create('upstox');
await upstox.placeOrder(userId, {
  instrumentKey: 'NSE_EQ|INE669E01016',
  quantity: 10,
  transactionType: 'BUY',
  orderType: 'MARKET',
  product: 'DELIVERY',
});
```

---

## Redis State Management

**Keys Used:**
```
upstox:socket:{socketId}:instruments     SET<instrumentKey>
upstox:instrument:{instrumentKey}:socket STRING<socketId>
upstox:user:{userId}:subscriptions       HASH<instrumentKey, priority>
upstox:sockets:active                    SET<socketId>
```

**Why Redis?**
- Fast lookups (O(1) for instrument→socket mapping)
- Pub/Sub for distributing market data to multiple apps
- Persistence (AOF) for crash recovery
- Shared state across multiple algo-worker instances

---

## Testing Strategy

### Unit Tests
```typescript
// multiplexer.service.spec.ts
describe('MultiplexerService', () => {
  it('should allocate instruments using First-Fit', async () => {
    // Mock socket pool with capacities
    const result = await multiplexer.subscribe(userId, ['NIFTY50'], PriorityLevel.CRITICAL);
    expect(result.socketId).toBe('ws-1');
  });

  it('should evict LOW priority when full', async () => {
    // Fill all sockets
    // Subscribe HIGH priority instrument
    // Expect LOW priority to be evicted
  });
});
```

### Integration Tests
```typescript
// upstox.provider.spec.ts
describe('UpstoxProvider (Integration)', () => {
  it('should place order successfully', async () => {
    const order = await upstox.placeOrder(userId, { /* params */ });
    expect(order.orderId).toBeDefined();
  });
});
```

---

## Future Extensions

1. **Provider Health Checks:** Monitor API rate limits, connection status
2. **Fallback Providers:** If Upstox fails, fallback to Yahoo for data
3. **Historical Data Caching:** Cache historical data in DuckDB for faster backtests
4. **Multi-Account Support:** User can link multiple broker accounts
5. **WebSocket Reconnection:** Automatic reconnection with exponential backoff

---

## Summary

✅ **Modular:** Provider pattern supports Upstox, Yahoo, Binance, etc.
✅ **Multi-User:** Each user has separate auth, tracked subscriptions
✅ **Efficient:** Multiplexer optimizes WebSocket usage with bin packing
✅ **Type-Safe:** Full TypeScript support, types from @repo/schema
✅ **Persistent:** MongoDB for tokens, Redis for state
✅ **Scalable:** Can handle 1000s of instruments across multiple users
