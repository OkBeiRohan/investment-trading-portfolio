# Web App — Architecture & User Flows

> **Next.js frontend for the Investment Trading Portfolio platform. Handles user authentication (via better-auth), Upstox account linking, daily re-authentication, trading permission management, and admin configuration.**

**Last Updated**: March 16, 2026  
**Framework**: Next.js 15 (App Router)  
**Auth Client**: `@repo/auth-client` (better-auth React client)  
**API**: `@repo/trpc` (type-safe RPC to `apps/api`)  
**Port**: 3000

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WEB APP (Next.js)                            │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Auth Pages      │  │  Dashboard       │  │  Admin Panel     │   │
│  │  - Login         │  │  - Portfolio     │  │  - Instruments   │   │
│  │  - Register      │  │  - Trading       │  │  - Users         │   │
│  │  - Link Upstox   │  │  - Re-Auth Prompt│  │  - Data Settings │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            ▼                      ▼                      ▼
     @repo/auth-client        @repo/trpc             @repo/trpc
      (better-auth)         apps/api → market-sdk  apps/api → admin
```

---

## User Roles

| Role       | Can Log In | Can Link Upstox | Can Enable Trading | Admin Access |
|------------|------------|-----------------|-------------------|--------------|
| `Investor` | ✅         | ✅              | ❌                | ❌           |
| `Trader`   | ✅         | ✅              | ✅                | ❌           |
| `Admin`    | ✅         | ✅              | ✅                | ✅           |

---

## User Flows

### Flow 1: Registration & First Login

```
Landing Page
  → Sign Up (email + password, or social OAuth)
  → Email verification (better-auth magic link)
  → Dashboard (Investor role by default)
  → Prompted to upgrade role via admin if trading is needed
```

**What happens server-side:**
- better-auth creates session in MongoDB
- User document created with `role: 'Investor'`, `hasTradingEnabled: false`
- Session cookie set (httpOnly, secure)

---

### Flow 2: Initial Upstox Account Link

Required before any live market data or trading is available. This is a one-time setup.

```
Dashboard → "Connect Upstox Account" button
  │
  ▼
1. Click "Connect Upstox"
   → Web app calls: GET /api/auth/upstox/link/start
   → Redirected to Upstox OAuth2 login page

2. User logs in on Upstox, authorises our platform app

3. Upstox redirects back:
   GET /api/auth/upstox/callback?code=ABC123&state=<csrf>

4. API exchanges code for access_token
   → Token stored in MongoDB (accounts collection)
   → Upstox profile fetched: user_type, upstox_user_id

5. User redirected to Dashboard
   → upstoxLinked = true
   → Badge shown: "Upstox Connected ✓"
```

**Notes:**
- Only needs to be done ONCE per device/account
- If user revokes on Upstox side, they must re-link
- Admins must also link Upstox (even if not trading) to enable `isDataCollectionEnabled`

---

### Flow 3: Daily Re-Authentication (~7am IST)

Upstox tokens expire at end of each trading day. Users must re-authenticate every morning.

```
7:00 AM IST — User opens web app
  │
  ├─ upstoxDailyAuthAt = today? → Dashboard loads normally
  │
  └─ upstoxDailyAuthAt ≠ today? → Re-Auth Modal shown
       │
       ▼
     "Re-Authenticate with Upstox" button
       │
       ▼
  1. GET /api/auth/upstox/reauth/start
     → Redirected to Upstox login (same OAuth2 page)

  2. User logs in on Upstox (usually pre-filled credentials)

  3. Upstox redirects: GET /api/auth/upstox/reauth/callback?code=XYZ

  4. New access_token stored in MongoDB
     → upstoxDailyAuthAt = today

  5. market-sdk picks up new token automatically
     → Redis cache updated
     → Rate limits recalculated

  6. User redirected: Dashboard loads normally
     → Green indicator: "Upstox Active Today ✓"
```

**UX Rules:**
- Re-auth modal is NON-DISMISSIBLE if user has `hasTradingEnabled = true` or is an admin with `isDataCollectionEnabled = true`
- Investors can dismiss and continue (they don't need live data)
- The re-auth flow opens Upstox in the same window (not a popup) to avoid popup blockers
- After successful re-auth, the return URL is `/dashboard?reauth=success`

**Admin Note:** Even admins who do not personally trade MUST complete daily re-auth if `isDataCollectionEnabled = true`, because the platform uses their access token for WebSocket data feeds.

---

### Flow 4: Enable Trading (Trader / Admin only)

```
Dashboard → Settings → Trading
  │
  ├─ Role check: only Trader or Admin can see this
  ├─ Upstox linked check: must have completed Flow 2
  └─ Daily re-auth check: must have completed Flow 3 today
       │
       ▼
  Toggle: "Enable Live Trading"
  
  When enabled:
    → tradingEnabled = true in DB
    → System marks this user's token as a "trading token" in market-sdk pool
    → User can now place orders via the trading UI
  
  When disabled:
    → tradingEnabled = false
    → Existing open positions are NOT closed (user must close manually)
    → Algorithm stops opening new positions for this account
```

---

### Flow 5: Configure Trading Segments

Once trading is enabled, the user can configure which market segments they are approved for on Upstox:

```
Settings → Trading → Segments
  │
  ▼
Checkboxes (must match user's actual Upstox account permissions):
  ☑ Equity (NSE/BSE)
  ☑ Futures & Options (F&O)
  ☐ Currency Derivatives (CDS)
  ☑ Commodity (MCX)
  ☐ Securities Lending & Borrowing (SLB)

Save → Stored in user.tradingSegments[]
     → market-sdk uses this to validate order segment before placement
     → Orders to non-enabled segments are blocked with a clear error
```

---

## Admin Flows

### Admin Flow 1: Enable Data Collection Flag

Admins can opt their Upstox account into system-wide data collection:

```
Admin Panel → My Account → Data Collection
  │
  ▼
Toggle: "Use my Upstox account for platform data collection"

When enabled (isDataCollectionEnabled = true):
  → Admin's Upstox token is added to market-sdk's admin token pool
  → Used for: WebSocket connections, historical data, option chains
  → Admin still needs to complete Phase 2 re-auth every morning
  
When disabled:
  → Admin's token is removed from the data collection pool immediately
  → Only their direct trading orders still use their token
```

### Admin Flow 2: Instrument Management

Admins control which instruments the Market Feeder tracks:

```
Admin Panel → Instruments
  │
  ├── Instrument Registry (synced daily from Upstox)
  │   List of all available: NSE Equities, F&O, Indices, MCX, etc.
  │
  ├── Enabled Instruments (what Market Feeder actually streams)
  │   ├── Add: Search + Enable → stored in enabled_trading_instruments collection
  │   └── Remove: Toggle → Market Feeder stops subscribing at next refresh
  │
  └── Categories always enabled (system defaults, cannot disable):
      ├── MCX: Crude Oil, Natural Gas, Gold, Silver
      ├── NSE: India VIX
      └── NSE: NIFTY 50, NIFTY BANK indices
```

**Instrument Types:**
| Type        | Has Options | Has Volume | Has Constituents |
|-------------|-------------|------------|-----------------|
| Index       | ✅          | ❌         | ❌ (via API)    |
| Equity      | ✅ (F&O stocks) | ✅    | ❌              |
| MCX Future  | ✅          | ✅         | ❌              |
| Currency    | ✅          | ✅         | ❌              |

### Admin Flow 3: User Management

```
Admin Panel → Users
  ├── View all users, their roles, Upstox link status
  ├── Change user roles (Investor ↔ Trader ↔ Admin)
  ├── Enable/disable trading for a specific user
  ├── View today's re-auth status per user
  └── Revoke access (blocks login, marks isBlocked = true)
```

---

## Component Architecture

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Email/password + social sign-in
│   │   ├── register/page.tsx        # Registration form
│   │   └── verify-email/page.tsx    # Email verification
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── trading/page.tsx          # Live trading UI
│   │   ├── portfolio/page.tsx        # Portfolio overview
│   │   └── settings/
│   │       ├── trading/page.tsx      # Trading enable + segments
│   │       └── upstox/page.tsx       # Upstox link + daily re-auth status
│   ├── (admin)/
│   │   ├── instruments/page.tsx      # Enable/disable trading instruments
│   │   ├── users/page.tsx            # User management
│   │   └── data-collection/page.tsx  # Admin data collection toggle
│   └── api/
│       └── auth/
│           ├── upstox/callback/      # Phase 1 OAuth callback
│           └── upstox/reauth/        # Phase 2 daily re-auth callback
├── components/
│   ├── auth/
│   │   ├── ReAuthModal.tsx           # Daily re-auth prompt (non-dismissible for traders)
│   │   └── UpstoxLinkButton.tsx      # Phase 1 link flow
│   ├── trading/
│   │   ├── TradingToggle.tsx         # Enable/disable trading
│   │   ├── SegmentSelector.tsx       # Trading segment config
│   │   └── DailyAuthStatus.tsx       # Shows today's re-auth status
│   └── admin/
│       ├── InstrumentGrid.tsx        # Instrument enable/disable grid
│       └── UserTable.tsx             # User management table
└── lib/
    ├── auth-client.ts                # better-auth React client instance
    └── trpc-client.ts                # tRPC client setup
```

---

## Re-Auth State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│ Per user, per day:                                               │
│                                                                  │
│  DAY_START → needs_reauth → reauth_in_progress → authed_today  │
│                  │                                    │          │
│                  │ (dismiss, Investor only)            │          │
│                  └────────────→ skipped_today ────────┘          │
│                                                                  │
│ State stored in:                                                 │
│   MongoDB: user.upstoxDailyAuthAt (date of last successful auth)│
│   Redis: auth:daily:{userId}:status (fast check, 24h TTL)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```bash
# API connection
NEXT_PUBLIC_API_URL=http://localhost:3004

# better-auth
NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3000

# Upstox OAuth (used for display purposes only, actual secrets are in apps/api)
NEXT_PUBLIC_UPSTOX_AUTH_ENABLED=true
```

---

## Related Documentation

- [authentication package](../../packages/authentication/README.md) — better-auth + Upstox two-phase auth
- [auth-client package](../../packages/auth-client/README.md) — React client helpers
- [market-sdk package](../../packages/market-sdk/README.md) — Token pool management
- [market-feeder service](../../services/market-feeder/README.md) — Data ingestion
- [apps/api](../api/README.md) — Backend API gateway

---

**Last Updated**: March 16, 2026  
**Auth**: better-auth (platform) + custom Upstox two-phase flow  
**Trading Access**: Trader + Admin roles only  
**Admin Keys**: data collection toggle, instrument management, user management
