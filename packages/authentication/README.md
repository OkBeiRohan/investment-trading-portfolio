# @repo/authentication

Better Auth integration for the investment trading portfolio monorepo.

**Last Updated**: March 16, 2026

## Overview

**Purpose**: Production-ready authentication system using [better-auth](https://better-auth.com). Handles platform authentication (email/password, social OAuth) AND the Upstox broker account linking lifecycle — including an initial OAuth2 link flow and a **daily re-authentication** pattern required by Upstox's token expiry policy.

**Key Features** (provided by better-auth):

- ✅ Email & password authentication
- ✅ Social sign-on (Google, GitHub, Discord)
- ✅ Magic link authentication
- ✅ Email OTP authentication
- ✅ Passkey (WebAuthn) support
- ✅ Two-factor authentication (TOTP + SMS)
- ✅ Phone number verification
- ✅ Organization & access control (multi-tenancy)
- ✅ Session management with automatic refresh
- ✅ Built-in rate limiting
- ✅ Automatic database management
- ✅ Device authorization
- ✅ Multi-session support

## Architecture

This package wraps **better-auth** with NestJS integration:

```
┌────────────────────────────────────────────┐
│   NestJS App (@repo/api)                   │
│   ├─ AuthModule (this package)             │
│   │  ├─ BetterAuthModule (NestJS wrapper)  │
│   │  │  └─ better-auth instance            │
│   │  ├─ AuthService (creates instance)     │
│   │  └─ EmailService (email provider)      │
│   └─ ConfigModule (environment config)     │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│   better-auth Core                         │
│   ├─ Authentication handlers               │
│   ├─ Session management                    │
│   ├─ Rate limiting                         │
│   └─ Plugins:                              │
│      ├─ organization (multi-tenancy)       │
│      ├─ twoFactor (TOTP + SMS)             │
│      ├─ phoneNumber (phone verification)   │
│      └─ passkey (WebAuthn)                 │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│   MongoDB (via @repo/database)             │
│   Collections:                             │
│   ├─ users                                 │
│   ├─ sessions                              │
│   ├─ accounts (OAuth)                      │
│   ├─ verifications                         │
│   ├─ organizations                         │
│   ├─ members                               │
│   ├─ invitations                           │
│   ├─ twoFactors                            │
│   └─ passkeys                              │
└────────────────────────────────────────────┘
```

---

## Upstox Authentication: Two-Phase Lifecycle

Upstox uses a **two-phase authentication model** that is fundamentally different from standard OAuth:

### Phase 1: Initial Account Link (One-time, via better-auth OAuth2)

Used when a user first connects their Upstox account. This uses the standard PKCE OAuth2 flow.

```
User clicks "Connect Upstox"
  │
  ▼
1. better-auth generates OAuth2 authorization URL
   GET https://api.upstox.com/v2/login/authorization
       ?client_id={UPSTOX_API_KEY}
       &redirect_uri={PLATFORM_REDIRECT_URI}
       &response_type=code
       &state={csrf_token}

2. User logs in on Upstox and authorises the platform app

3. Upstox redirects to callback:
   GET /api/auth/upstox/callback?code=ABC123&state={csrf_token}

4. better-auth exchanges code for access_token
   POST https://api.upstox.com/v2/login/authorization/token
        { code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code' }

5. Access token stored in MongoDB (accounts collection)
   → @repo/market-sdk AuthManagerService reads from here

6. Upstox user profile fetched (GET /v2/user/profile)
   → user_type (Plus/Standard), upstox_user_id stored in DB
```

> 📎 See: [Upstox Authentication Docs](https://upstox.com/developer/api-documentation/authentication)

### Phase 2: Daily Re-Authentication (~7am each trading day)

Upstox access tokens expire at end of day. Users MUST re-authenticate each morning before trading.

This is NOT an OAuth2 refresh_token flow — Upstox requires a full re-auth each day.

```
Each morning (~7am IST):
  │
  ▼
1. User opens the web app and sees "Daily Re-Auth Required" prompt

2. User clicks "Re-Authenticate with Upstox"
   → Redirected to Upstox login page (same OAuth2 flow as Phase 1)
   → BUT this uses a SEPARATE redirect endpoint: /api/auth/upstox/reauth/callback

3. New access_token received and stored in MongoDB
   → Overwrites previous day's token in accounts collection

4. @repo/market-sdk is notified (Redis event: auth:token_refreshed)
   → AuthManagerService updates Redis cache (6h TTL)
   → Fetches/updates user_type from Upstox profile
   → Recalculates pool rate limits

5. User gains access to live trading and websocket data
```

> 📎 See: [Upstox Login Docs](https://upstox.com/developer/api-documentation/login)  
> 📌 **Admin Exception**: Admins must also re-auth daily even if they are not trading personally, because their tokens are used for system-wide data collection (`isDataCollectionEnabled = true`).

### Phase 2 Endpoint Design

```typescript
// apps/api/src/auth/upstox-reauth.controller.ts

@Controller('api/auth/upstox/reauth')
export class UpstoxReAuthController {

  // Step 1: Initiate daily re-auth
  @Get('start')
  @UseGuards(AuthGuard)
  async startReAuth(@Session() session: any, @Res() res: Response) {
    const authUrl = this.upstoxAuth.generateAuthorizationUrl(
      process.env.UPSTOX_API_KEY,
      process.env.UPSTOX_REAUTH_REDIRECT_URI, // separate callback URL
      session.user.id
    );
    return res.redirect(authUrl);
  }

  // Step 2: Handle callback, store new token
  @Get('callback')
  async handleReAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    const userId = await this.upstoxAuth.validateState(state);
    await this.upstoxAuth.exchangeCodeAndStoreToken(userId, code, 'reauth');
    // market-sdk auto-picks up the new token from MongoDB
    return res.redirect('/dashboard?reauth=success');
  }
}
```

---

## User Roles & Permissions

| Role        | Can Trade | Can Enable Trading | Must Re-Auth Daily | Data Collection     |
|-------------|-----------|-------------------|-------------------|---------------------|
| `Investor`  | ❌        | ❌                | Optional           | No                  |
| `Trader`    | ✅        | ✅ (self only)    | ✅ (if trading)   | No                  |
| `Admin`     | ✅        | ✅ (all users)    | ✅ **Always**     | Yes (if flag set)   |

### Role Field

The `role` field is part of the better-auth user model (extended via `additionalFields`):
- `Investor` (default) — can view portfolio, no trading
- `Trader` — can enable trading on their own account
- `Admin` — full access including: managing instruments, other users, system config

Only `Admin` and `Trader` roles can call the trading enable/disable endpoints.

### Admin `isDataCollectionEnabled` Flag

Admins have a special flag that determines whether the platform can use their Upstox account for **system data collection** (WebSocket feeds, market data, historical backfill):

```typescript
// User document extension (stored in MongoDB users collection)
interface TraderUser {
  // better-auth standard fields
  id: string;
  email: string;
  name: string;
  role: 'Investor' | 'Trader' | 'Admin';

  // Trading fields
  hasTradingEnabled: boolean;       // TRADER/ADMIN: has user enabled live trading?
  tradingSegments: string[];         // e.g., ['EQUITY', 'F_O', 'CURRENCY', 'COMMODITY']
  upstoxLinked: boolean;             // Has user completed Phase 1 OAuth?
  upstoxDailyAuthAt: Date | null;   // Timestamp of today's Phase 2 re-auth

  // Admin-only fields
  isDataCollectionEnabled: boolean;  // ADMIN ONLY: platform can use this account for market data
}
```

**Why admins need this flag:**
- market-sdk prioritises admin tokens for WebSocket connections and market data
- An admin who hasn't set `isDataCollectionEnabled = true` is treated the same as a trader for data purposes
- Admins can opt into data collection independently of enabling their own trading

---

## Token Lifecycle

```
Day 0 (initial setup):
  Phase 1 OAuth → token stored in MongoDB, never expires unless revoked manually

Every trading day morning (~7am IST):
  Phase 2 Re-auth → new token overwrites MongoDB, market-sdk cache refreshed

At end of trading day (~23:59 IST):
  Upstox silently expires the token
  Next API call returns 401 → market-sdk marks token as expired in Redis

If user doesn't re-auth by 9:15am:
  Their token is unavailable for that day's market data/trading
  market-sdk gracefully skips this user's token from the pool
```

---

**Why better-auth?**

- Battle-tested, production-ready library
- Automatic security best practices (bcrypt, CSRF, rate limiting)
- Built-in plugin ecosystem (2FA, passkeys, organizations)
- Framework-agnostic (works with NestJS, Next.js, Express, etc.)
- Automatic database migrations
- Zero custom authentication logic needed

## Configuration

**This package uses NestJS ConfigModule pattern - it does NOT read .env files directly.**

### Environment Variables

All configuration is managed by the root app (`apps/api`). Add these variables to `apps/api/.env`:

```bash
# Authentication (REQUIRED)
APP_NAME=Investment Trading Portfolio
APP_URL=http://localhost:3004
AUTH_SECRET=your-secret-key-minimum-32-characters-long
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3004
FRONTEND_URL=http://localhost:3000

# Social Providers (OPTIONAL)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Rate Limiting (OPTIONAL - better-auth has built-in defaults)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### How Configuration Works

1. **Root app** (`apps/api`) loads `.env` file via `ConfigModule.forRoot({ isGlobal: true })`
2. **Zod validation** (in `@repo/schema`) ensures all required fields are present and valid
3. **ConfigService** is injected globally to all modules
4. **AuthService** receives config via `ConfigService` and creates better-auth instance
5. **better-auth** handles all authentication logic automatically

**See**: [Configuration Pattern](../../docs/NESTJS_CONFIG_PATTERN.md) for detailed explanation.

## Installation

This package is part of the monorepo. Import in your NestJS app:

```typescript
// Server-side (NestJS)
import { AuthModule } from "@repo/authentication";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Required
    AuthModule, // better-auth integration
  ],
})
export class AppModule {}

// Client-side (Next.js)
import { createAuthClient } from "better-auth/react";
```

## Quick Start

### Server-Side (NestJS)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@repo/authentication';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, // Automatically configured via ConfigService
  ],
})
export class AppModule {}

// Protected route using better-auth guards
import { AuthGuard, Session } from '@repo/authentication';

@UseGuards(AuthGuard)
@Get('profile')
async getProfile(@Session() session: any) {
  return session.user; // Provided by better-auth
}

// Allow anonymous access
import { AllowAnonymous } from '@repo/authentication';

@AllowAnonymous()
@Get('public')
getPublic() {
  return { message: 'This endpoint is public' };
}

// Role-based access control
import { Roles } from '@repo/authentication';

@Roles(['Admin', 'Trader'])
@Delete('sensitive-operation')
async sensitiveOp(@Session() session: any) {
  // Only Admin or Trader roles can access
}
```

### Client-Side (Next.js)

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!, // http://localhost:3004
  plugins: [
    organizationClient(),
    twoFactorClient(),
    passkeyClient(),
  ],
});

// app/providers.tsx
"use client";

export function Providers({ children }: { children: React.ReactNode }) {
  return children; // better-auth React hooks work automatically
}

// app/dashboard/page.tsx
'use client';
import { authClient } from '@/lib/auth-client';

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <LoginPage />;

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <button onClick={() => authClient.signOut()}>Logout</button>
    </div>
  );
}

// Login component example
function LoginPage() {
  const { signIn } = authClient;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await signIn.email({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });
  };

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Authentication Flows

All authentication flows are handled automatically by better-auth. See [FLOWS.md](./docs/FLOWS.md) for detailed diagrams.

## API Endpoints

All endpoints are automatically created by better-auth at the `/api/auth` prefix. See [API.md](./docs/API.md) for complete documentation.

**Core endpoints**:

- `POST /api/auth/sign-up/email` - Register with email/password
- `POST /api/auth/sign-in/email` - Login with email/password
- `GET /api/auth/sign-in/social/{provider}` - Social sign-in
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/get-session` - Get current session
- And 40+ more endpoints...

## Guards & Decorators (NestJS)

better-auth integration provides several decorators for NestJS:

```typescript
import {
  AuthGuard,      // Require authentication
  AllowAnonymous, // Skip authentication
  OptionalAuth,   // Optional authentication
  Roles,          // Role-based access control
  Session,        // Get session data
} from '@repo/authentication';

// Require authentication (applies globally if set as APP_GUARD)
@UseGuards(AuthGuard)
@Get('protected')
getProtected(@Session() session: any) {
  return session.user;
}

// Public route (skip auth guard)
@AllowAnonymous()
@Get('public')
getPublic() {
  return { message: 'Public endpoint' };
}

// Optional authentication (session injected if authenticated)
@OptionalAuth()
@Get('optional')
getOptional(@Session() session: any) {
  if (session) {
    return { message: `Hello ${session.user.name}` };
  }
  return { message: 'Hello anonymous' };
}

// Role-based access
@Roles(['Admin', 'Trader'])
@Delete('sensitive')
deleteSensitive() {
  // Only Admin or Trader can access
}
```

## Custom User Fields

We've extended the default User model with trading-specific fields:

```typescript
// Defined in src/config/auth.config.ts
user: {
  additionalFields: {
    dateOfBirth: { type: 'date', required: false },
    isActive:    { type: 'boolean', defaultValue: true,  required: true },
    isBlocked:   { type: 'boolean', defaultValue: false, required: true },

    // Role-based access (Investor | Trader | Admin)
    role: {
      type: ['Investor', 'Trader', 'Admin'],
      required: true,
      defaultValue: 'Investor',
    },

    // Trading control (Trader + Admin only)
    hasTradingEnabled: {
      type: 'boolean',
      defaultValue: false,
      required: true,
    },
    tradingSegments: {
      // ['EQUITY', 'F_O', 'CURRENCY', 'COMMODITY', 'SLB']
      type: 'string[]',
      defaultValue: [],
      required: false,
    },

    // Upstox account linking
    upstoxLinked:     { type: 'boolean', defaultValue: false, required: true },
    upstoxDailyAuthAt: { type: 'date', required: false },

    // Admin-only: allow platform to use this Upstox account for data collection
    isDataCollectionEnabled: {
      type: 'boolean',
      defaultValue: false,
      required: true,
    },

    lastLoginAt:       { type: 'date', required: false },
    passwordChangedAt: { type: 'date', required: false },
  },
}
```

## Security Features (Built-in)

better-auth provides enterprise-grade security out of the box. See [SECURITY.md](./docs/SECURITY.md) for details.

**Key security features**:

- bcrypt password hashing (12 rounds)
- Automatic CSRF protection
- Built-in rate limiting
- Secure httpOnly cookies
- XSS protection
- Session management
- And more...

## Email Service

Custom email provider implementation:

```typescript
// src/services/email.service.ts
@Injectable()
export class EmailService {
  async sendVerificationEmail(data: {
    user: User;
    url: string;
    token: string;
  }) {
    // Send email using your SMTP provider
  }

  async sendResetPasswordEmail(data: {
    user: User;
    url: string;
    token: string;
  }) {
    // Send password reset email
  }

  async sendInvitationEmail(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
  }) {
    // Send organization invitation
  }

  async sendOTP(data: { user: User; otp: string }) {
    // Send 2FA OTP code via email
  }
}
```

## Testing

```typescript
import { Test } from "@nestjs/testing";
import { AuthModule } from "@repo/authentication";
import { ConfigModule } from "@nestjs/config";

describe("Authentication", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it("should register user", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({
        email: "test@example.com",
        password: "SecurePass123!",
        name: "Test User",
      })
      .expect(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.session).toBeDefined();
  });
});
```

## Plugins Enabled

This package enables the following better-auth plugins:

1. **organization** - Multi-tenancy, teams, role-based access
2. **twoFactor** - TOTP and SMS-based 2FA
3. **phoneNumber** - Phone verification with OTP
4. **passkey** - WebAuthn (biometric authentication)

Additional plugins available on client: 5. **magicLink** - Passwordless authentication via email 6. **emailOTP** - One-time password via email 7. **deviceAuthorization** - OAuth device flow 8. **oneTimeToken** - Single-use tokens 9. **multiSession** - Multiple concurrent sessions per user

## Documentation

- [Authentication Flows](./docs/FLOWS.md) - Detailed flow diagrams
- [Security Best Practices](./docs/SECURITY.md) - Security guidelines
- [API Reference](./docs/API.md) - Complete API documentation
- [Architecture](./docs/ARCHITECTURE.md) - System architecture
- [better-auth Official Docs](https://better-auth.com/docs) - Upstream documentation

## Stack

- **better-auth** - Authentication library
- **@thallesp/nestjs-better-auth** - NestJS integration
- **@better-auth/passkey** - WebAuthn plugin
- **MongoDB** - Database (via @repo/database)
- **Mongoose** - ODM
- **NestJS** - Server framework
- **Next.js** - Client framework (React)

## Migration from Custom Auth

If you previously had custom authentication logic, it has been replaced with better-auth. Key changes:

| Old (Custom)                | New (better-auth)              |
| --------------------------- | ------------------------------ |
| Custom AuthService methods  | better-auth automatic handlers |
| Manual bcrypt hashing       | Automatic (12 rounds)          |
| Custom JWT token generation | Automatic session management   |
| Manual 2FA implementation   | twoFactor plugin               |
| Custom passkey logic        | passkey plugin                 |
| Custom OAuth flow           | Automatic OAuth handling       |
| Manual session storage      | Automatic (MongoDB + cookies)  |
| Custom rate limiting        | Built-in rate limiter          |
| Manual CSRF protection      | Automatic CSRF tokens          |
| Custom adapter pattern      | better-auth adapter factory    |

## Contributing

Follow the coding standards and ensure all tests pass before submitting changes.

## Resources

- [better-auth Documentation](https://better-auth.com/docs)
- [better-auth GitHub](https://github.com/better-auth/better-auth)
- [NestJS better-auth Integration](https://github.com/thallesp/nestjs-better-auth)
- [Copilot Instructions](../../.github/instructions/authentication.instructions.md)
