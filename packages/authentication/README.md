# @repo/authentication

Better Auth integration for the investment trading portfolio monorepo.

## Overview

**Purpose**: Production-ready authentication system using [better-auth](https://better-auth.com) - a comprehensive, framework-agnostic authentication library for TypeScript.

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

We've extended the default User model with additional fields:

```typescript
// Defined in src/config/auth.config.ts
user: {
  additionalFields: {
    dateOfBirth: {
      type: "date",
      required: false,
    },
    isActive: {
      type: "boolean",
      defaultValue: true,
      required: true,
    },
    isBlocked: {
      type: "boolean",
      defaultValue: false,
      required: true,
    },
    role: {
      type: ["Investor", "Trader", "Admin"],
      required: true,
      defaultValue: "Investor",
    },
    lastLoginAt: {
      type: "date",
      required: false,
    },
    passwordChangedAt: {
      type: "date",
      required: false,
    },
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
