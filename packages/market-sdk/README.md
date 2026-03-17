# @repo/market-sdk

Intelligent multi-provider market data and trading SDK. Manages a **pool of Upstox access tokens** across multiple admin and trader accounts — selecting the right token for each operation, tracking rate limits, and gracefully degrading when quota runs low.

## Features

✅ **Multi-Token Pool:** Manages access tokens for multiple admins + traders simultaneously  
✅ **Admin-First Token Selection:** Prioritises admin accounts (with `isDataCollectionEnabled`) for WebSocket & market data  
✅ **Daily Re-Auth Support:** Handles the 7am daily Upstox token refresh flow  
✅ **User Type Tracking:** Fetches Upstox profile (`user_type`) after auth — `UPT001` (Plus) gets 5x rate limits  
✅ **Rate Limit Management:** Tracks per-token API usage; degrades gracefully with priority eviction  
✅ **Provider-Agnostic:** Upstox, Yahoo Finance, Alpha Vantage, Finnhub, Binance support  
✅ **Encrypted Storage:** AES-256-GCM encryption for all stored tokens  
✅ **NestJS Native:** Global Module — import once, use everywhere

## Supported Providers

| Provider      | Market Data | Orders | Portfolio | WebSocket | Rate Limit (per day)        |
|---------------|-------------|--------|-----------|-----------|-----------------------------|
| Upstox Plus   | ✅          | ✅     | ✅        | ✅        | 25,000 (tracked per token)  |
| Upstox Free   | ✅          | ✅     | ✅        | ✅        | 1,000 (tracked per token)  |
| Yahoo Finance | ✅          | ❌     | ❌        | ❌        | Soft limit (public API)     |
| Alpha Vantage | ✅          | ❌     | ❌        | ❌        | 500/day (free tier)         |
| Finnhub       | ✅          | ❌     | ❌        | ❌        | 60/min (free tier)          |
| Binance       | ✅          | ✅     | ✅        | ✅        | Per endpoint                |

---

## Architecture: Multi-Token Pool

The most critical responsibility of `market-sdk` is **intelligent access token orchestration**.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TOKEN POOL (AuthManagerService)                    │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ADMIN ACCOUNTS (isDataCollectionEnabled = true)                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │  │
│  │  │ Admin 1  │  │ Admin 2  │  │ Admin 3  │  ← Upstox Plus tokens │  │
│  │  │ token A  │  │ token B  │  │ 🔴expired│  ← refreshed at 7am  │  │
│  │  └──────────┘  └──────────┘  └──────────┘                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  TRADER ACCOUNTS (hasTradingEnabled = true)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │  │
│  │  │ Trader 1 │  │ Trader 2 │  │ 🔴not yet│  ← authenticated     │  │
│  │  │ token C  │  │ token D  │  │ authed   │  ← at 7am each day    │  │
│  │  └──────────┘  └──────────┘  └──────────┘                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Combined pool rate limit = sum of all valid token limits              │
│  e.g.: 2 Plus admin tokens + 3 Plus trader tokens = 125,000/day       │
└──────────────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼──────────────────┐
         ▼                ▼                  ▼
    WebSocket        REST API calls      Order APIs
  (admin-first)    (round-robin pool)  (trader token)
```

### Token Selection Rules

| Operation            | Token Priority                                                  |
|----------------------|-----------------------------------------------------------------|
| **WebSocket**        | Admin tokens first (`isDataCollectionEnabled`), then traders   |
| **Market Data REST** | Round-robin across all valid tokens (maximise throughput)       |
| **Order Placement**  | Trader's own token ONLY (cannot use another user's token)       |
| **Historical Data**  | Any available token (admin preferred)                           |
| **Option Chain**     | Admin tokens preferred (high usage)                             |

### Rate Limit Priority Under Pressure

When approaching the daily API limit across all tokens combined:

```
Priority 1 (NEVER drop):  Order APIs (BUY/SELL execution)
Priority 2 (NEVER drop):  WebSocket subscriptions (live data)
Priority 3 (Drop below 10% limit): Deep OTM option chain subscriptions
Priority 4 (Drop at 5% limit):  Breadth constituent data (NIFTY 50 stocks)
Priority 5 (Drop at 2% limit):  Historical REST API calls
```

When a token's limit is exhausted, market-sdk automatically switches to the next available token in the pool.

---

## Daily Re-Auth Flow (7am)

Upstox access tokens expire daily. Every morning users must re-authenticate. market-sdk does NOT handle the OAuth redirect — that is done by the `authentication` package. But after the user completes re-auth, market-sdk:

1. Receives the new `access_token` from MongoDB (written by `authentication` package)
2. Fetches the user profile from Upstox: `GET /v2/user/profile`
3. Extracts `user_type` (e.g., `UPT001` = Plus, `UPT002` = Standard)
4. Stores `user_type` in MongoDB alongside the token
5. Updates Redis cache with new token + TTL aligned to market close (6h)
6. Recalculates the combined rate limit for the pool

```typescript
// After user completes daily re-auth:
const profile = await authManager.fetchAndStoreUserProfile(userId, 'upstox');
// profile.userType → 'UPT001' (Plus) or 'UPT002' (Standard)
// Rate limit updated: Plus = 25000/day, Standard = 1000/day
```

---

## Installation

This package is part of the monorepo. Import in your NestJS app:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UpstoxModule, UpstoxWebSocketModule, AuthModule } from '@repo/market-sdk';

@Module({
  imports: [
    AuthModule,               // Token pool management (global)
    UpstoxModule,             // Upstox REST API clients
    UpstoxWebSocketModule,    // Upstox WebSocket with multi-token auth
  ],
})
export class AppModule {}
```

## Quick Start

### Getting a Token from the Pool

```typescript
import { AuthManagerService } from '@repo/market-sdk';

@Injectable()
export class MyService {
  constructor(private readonly authManager: AuthManagerService) {}

  async getMarketData() {
    // market-sdk selects the best available admin token automatically
    const token = await this.authManager.getBestAvailableToken('upstox', 'WEBSOCKET');
    // → Returns admin token if isDataCollectionEnabled, else best trader token

    // Or get a specific user's token (for order placement):
    const userToken = await this.authManager.getAccessToken(userId, 'upstox', 'LIVE');
  }
}
```

### 1. Token Lifecycle — Initial Auth vs Daily Re-Auth

**Initial Account Link (Once per user):**
Handled by `@repo/authentication` via better-auth OAuth2. User clicks "Connect Upstox", completes OAuth, and the access token is stored in MongoDB. market-sdk reads from there.

**Daily Re-Auth (Every morning, ~7am):**
```typescript
// Called after user completes daily re-auth via web UI:
await authManager.onTokenRefreshed(userId, newAccessToken);
// → Fetches user profile from Upstox API
// → Stores user_type (Plus/Standard) — affects rate limit pool
// → Updates Redis cache (6h TTL)
// → Recalculates pool capacity
```

### 2. Market Data

```typescript
import { UpstoxHistoricalAPIService } from '@repo/market-sdk';

@Injectable()
export class MarketService {
  constructor(private historical: UpstoxHistoricalAPIService) {}

  async getCandles() {
    // Token selected automatically from pool (admin-first)
    const candles = await this.historical.getHistoricalData({
      instrumentKey: 'NSE_INDEX|Nifty 50',
      interval: '1minute',
      fromDate: '2026-03-15',
      toDate: '2026-03-16',
    });
    return candles;
  }
}
```

### 3. Place Orders (Always uses the trader's own token)

```typescript
import { UpstoxOrdersService } from '@repo/market-sdk';

async placeOrder(traderId: string) {
  // market-sdk uses traderId's own token — NEVER another user's token for orders
  const order = await this.ordersService.placeOrder(traderId, {
    instrumentKey: 'NSE_EQ|INE669E01016', // TCS
    quantity: 10,
    price: 0,
    transactionType: 'BUY',
    orderType: 'MARKET',
    product: 'DELIVERY',
    validity: 'DAY',
  });
  console.log('Order ID:', order.orderId);
}
```

### 4. WebSocket Subscriptions

```typescript
import { UpstoxWebSocketService, SubscriptionPriority } from '@repo/market-sdk';

@Injectable()
export class MarketStreamService {
  constructor(private wsService: UpstoxWebSocketService) {}

  async subscribeToInstruments() {
    // Auth token selected by market-sdk (admin account preferred)
    await this.wsService.subscribe(
      'system',                           // system user → picks admin token
      ['NSE_INDEX|Nifty 50', 'MCX_FO|CRUDEOIL25APRFUT'],
      'full',
      SubscriptionPriority.CRITICAL,
      (data) => console.log('Tick:', data)
    );
  }
}
```

## Upstox User Type & Rate Limits

After each daily re-auth, market-sdk calls `GET /v2/user/profile` and stores the `user_type`:

| user_type | Account Type | Daily API Limit | WebSocket Connections | Instruments/Socket |
|-----------|--------------|-----------------|------------------------|--------------------|
| `UPT001`  | Upstox Plus  | 25,000          | 5                      | 5,000              |
| `UPT002`  | Upstox Free  | 1,000           | 2                      | 3,000              |

The pool's **effective daily limit** is the sum of all authenticated valid tokens:  
`total_limit = Σ user_type_limit for each valid token`

### Example Pool Calculation
```
2 Admin accounts (Plus)   = 2 × 25,000 = 50,000
3 Trader accounts (Plus)  = 3 × 25,000 = 75,000
1 Trader account  (Free)  = 1 × 1,000  =  1,000
─────────────────────────────────────────────────
Total pool capacity                     = 126,000/day
```

## WebSocket Multiplexer Details

**Problem:** Upstox limits WebSocket connections per access token (2-5 sockets, 3000-5000 instruments per socket)

**Solution:** Pool multiple admin/trader access tokens across connections, with bin-packing and priority-based eviction

**Priority Levels:**

- `CRITICAL (1)`: Indices, Futures, MCX Commodities
- `HIGH (2)`: ATM options (±2 strikes)
- `MEDIUM (3)`: Near OTM (±5 strikes)
- `LOW (4)`: Deep OTM (>5 strikes away)

**Algorithm:**

1. Assign connection to admin token pool first
2. First-Fit allocation to existing sockets
3. Create new socket if under limit
4. Evict LOW priority if all sockets full
5. State persisted in Redis for crash recovery

## Module Structure

```
packages/market-sdk/src/
├── auth/                    # Multi-token pool management
│   ├── auth-manager.service.ts    # Token selection, pool tracking
│   ├── token-refresh.service.ts   # Daily token lifecycle
│   ├── token-storage.service.ts   # Encrypted MongoDB storage
│   └── auth.module.ts
├── core/                    # Provider interfaces & factory
├── multiplexer/             # WebSocket subscription multiplexer
├── rate-limiter/            # Per-token + pool usage tracking
├── providers/
│   ├── upstox/
│   │   ├── api/             # REST API (historical, orders, portfolio)
│   │   ├── websocket/       # WebSocket service + module
│   │   └── users/           # Profile fetch + user_type storage
│   ├── yahoo/               # Yahoo Finance (overnight global data)
│   ├── alpha-vantage/       # Alpha Vantage
│   ├── finnhub/             # Finnhub news & sentiment
│   └── binance/             # Crypto market data
├── utils/                   # CircuitBreaker, retry utilities
└── websocket/               # Base WebSocket pool (provider-agnostic)
```

## Environment Variables

```bash
# Platform-level Upstox App Credentials (NOT per-user)
UPSTOX_API_KEY=your_platform_api_key
UPSTOX_API_SECRET=your_platform_secret
UPSTOX_REDIRECT_URI=http://localhost:3000/api/auth/upstox/callback

# Token Encryption (32 characters, AES-256-GCM)
ENCRYPTION_KEY=your_32_char_encryption_key

# Databases
MONGODB_URI=mongodb://localhost:27017/trading  # Token storage
REDIS_URL=redis://localhost:6379               # Token cache (6h TTL)
```

## Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode  
pnpm test:cov      # Coverage report
```

## Documentation

- [Upstox OAuth Guide](./docs/UPSTOX_OAUTH_INTEGRATION.md) — Initial OAuth + daily re-auth flows
- [WebSocket Implementation](./docs/WEBSOCKET_IMPLEMENTATION.md) — Multi-token WebSocket architecture
- [Quickstart](./docs/QUICKSTART.md) — Getting started guide

---

## License

Part of the investment-trading-portfolio monorepo. MIT License.

---

**Status**: ✅ Active | Production Ready  
**Last Updated**: March 17, 2026  
**Token Management**: Multi-pool (Admin-first) with daily 7am refresh lifecycle  
**Rate Limiting**: Pool-aware with priority degradation (Orders > WebSocket > Deep OTM)
