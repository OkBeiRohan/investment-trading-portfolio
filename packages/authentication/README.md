# @repo/authentication

Provider-agnostic authentication system for the investment trading portfolio monorepo.

## Overview

**Purpose**: Centralized authentication logic supporting multiple authentication strategies, session management, and role-based access control.

**Key Features**:

- ✅ Multiple authentication methods (credentials, OAuth, passkeys, magic links)
- ✅ JWT + refresh token management
- ✅ Two-factor authentication (TOTP)
- ✅ Email verification workflow
- ✅ Password reset flow
- ✅ Passkey (WebAuthn) support
- ✅ Organization-based access control
- ✅ Role-based permissions (RBAC)
- ✅ Session management with Redis caching
- ✅ Database-agnostic (adapter pattern)

## Installation

This package is part of the monorepo. Import in your NestJS app:

```typescript
// Server-side (NestJS)
import { AuthModule } from "@repo/authentication";

@Module({
  imports: [AuthModule.forRoot({ adapter: "mongodb" })],
})
export class AppModule {}

// Client-side (Next.js)
import { useAuth } from "@repo/authentication/client";
```

## Quick Start

### Server-Side (NestJS)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@repo/authentication';

@Module({
  imports: [
    AuthModule.forRoot({
      adapter: 'mongodb',
      jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
      },
    }),
  ],
})
export class AppModule {}

// Protected route
import { AuthGuard } from '@repo/authentication';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

### Client-Side (Next.js)

```typescript
// app/providers.tsx
import { AuthProvider } from '@repo/authentication/client';

export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// app/dashboard/page.tsx
'use client';
import { useAuth } from '@repo/authentication/client';

export default function Dashboard() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <LoginPage />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Architecture

### Adapter Pattern

This package uses the **adapter pattern** to support multiple database backends:

```
┌──────────────────────────────────────┐
│      Auth Service (Business Logic)   │
├──────────────────────────────────────┤
│              ↓ uses                  │
│      IAuthRepositories Interface     │
├──────────────────────────────────────┤
│              ↓ implements            │
│     MongoDB Adapter (Current)        │
│     PostgreSQL Adapter (Future)      │
│     Supabase Adapter (Future)        │
└──────────────────────────────────────┘
```

**Benefits**:

- Database independence
- Easy to switch databases
- Testability (mock adapters)
- Single source of authentication logic

## Authentication Flows

### 1. Credentials Login

```
User → POST /auth/login
     → Validate email/password
     → Check 2FA (if enabled)
     → Generate JWT tokens
     → Create session (Redis + MongoDB)
     → Return tokens
```

### 2. Email Verification

```
User → POST /auth/register
     → Create user (emailVerified: false)
     → Generate verification token
     → Send verification email
     → User clicks link
     → GET /auth/verify-email?token=xxx
     → Mark email as verified
```

### 3. Two-Factor Authentication

```
User → POST /auth/2fa/enable
     → Generate TOTP secret
     → Return QR code
     → User scans with authenticator app
     → POST /auth/2fa/verify with code
     → Enable 2FA

Login Flow with 2FA:
     → POST /auth/login (credentials)
     → Return { requiresTwoFactor: true }
     → POST /auth/2fa/verify with TOTP code
     → Return tokens
```

### 4. Passkey (WebAuthn)

```
Registration:
     → POST /auth/passkey/register-start
     → Return WebAuthn options
     → User interacts with authenticator
     → POST /auth/passkey/register-finish
     → Store credential

Login:
     → POST /auth/passkey/login-start
     → Return WebAuthn challenge
     → User authenticates with passkey
     → POST /auth/passkey/login-finish
     → Return tokens
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (invalidate session)
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/verify-email?token=xxx` - Verify email address

### Two-Factor Authentication

- `POST /auth/2fa/enable` - Enable 2FA
- `POST /auth/2fa/verify` - Verify 2FA code
- `POST /auth/2fa/disable` - Disable 2FA
- `POST /auth/2fa/backup-codes` - Generate backup codes

### Passkey (WebAuthn)

- `POST /auth/passkey/register-start` - Start passkey registration
- `POST /auth/passkey/register-finish` - Complete passkey registration
- `POST /auth/passkey/login-start` - Start passkey authentication
- `POST /auth/passkey/login-finish` - Complete passkey authentication

## Guards & Decorators

### Guards

```typescript
import { AuthGuard, RolesGuard, OrganizationGuard } from '@repo/authentication';

// Apply globally
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

// Or use per-route
@UseGuards(AuthGuard)
@Get('protected')
getProtected() {}
```

### Decorators

```typescript
import {
  CurrentUser,
  CurrentSession,
  Roles,
  Public,
} from '@repo/authentication';

// Public route (skip auth)
@Public()
@Get('health')
getHealth() {}

// Get current user
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Role-based access
@Roles('admin', 'manager')
@Delete('users/:id')
deleteUser(@Param('id') id: string) {}

// Organization guard
@UseGuards(OrganizationGuard)
@Get('org/settings')
getOrgSettings(@CurrentUser() user: User) {}
```

## Client Hooks (Next.js)

### useAuth Hook

```typescript
const {
  user, // Current user or null
  isLoading, // Loading state
  isAuthenticated, // Boolean
  login, // (email, password) => Promise<void>
  logout, // () => Promise<void>
  register, // (data) => Promise<void>
  refresh, // () => Promise<void>
} = useAuth();
```

### useOrganization Hook

```typescript
const {
  organization, // Current organization
  role, // User's role in org
  isAdmin, // Boolean
  isOwner, // Boolean
  switchOrganization, // (orgId) => Promise<void>
} = useOrganization();
```

## Security Features

### 1. Password Security

- bcrypt with 12 salt rounds
- Minimum password strength requirements
- Password history (prevent reuse)

### 2. Token Management

- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Automatic token rotation
- Refresh token reuse detection

### 3. Session Security

- Redis caching for fast lookups
- Session invalidation on logout
- Concurrent session limits
- Suspicious activity detection

### 4. Rate Limiting

- Login attempts: 5 per minute
- Password reset: 3 per hour
- Email verification: 3 per hour

### 5. CSRF Protection

- CSRF tokens for state-changing operations
- SameSite cookie attribute
- Origin validation

## Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-strong-secret-key
JWT_REFRESH_SECRET=another-strong-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@example.com

# WebAuthn (Passkeys)
RP_ID=yourdomain.com
RP_NAME="Your App Name"
ORIGIN=https://yourdomain.com

# Redis
REDIS_URL=redis://localhost:6379

# Database
MONGODB_URI=mongodb://localhost:27017/auth
```

## Testing

```typescript
import { Test } from "@nestjs/testing";
import { AuthService } from "@repo/authentication";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: "AUTH_ADAPTER",
          useValue: createMockAdapter(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should login user with valid credentials", async () => {
    const result = await service.login("test@example.com", "password");
    expect(result.accessToken).toBeDefined();
  });
});
```

## Future Enhancements

### Planned Features

1. **Magic Link Authentication**
   - Passwordless login via email
   - One-time use tokens
   - Configurable expiry

2. **OAuth Providers**
   - Google OAuth 2.0
   - GitHub OAuth
   - Microsoft Azure AD
   - Apple Sign In

3. **SMS Two-Factor**
   - Twilio integration
   - SMS verification codes
   - Phone number verification

4. **Biometric Authentication**
   - Face ID / Touch ID
   - Platform authenticators
   - Device-based auth

5. **Advanced Session Management**
   - Device tracking
   - IP-based geolocation
   - Force logout from all devices
   - Session activity logs

6. **Audit Logging**
   - Login/logout events
   - Failed authentication attempts
   - Permission changes
   - Security events

7. **Account Recovery**
   - Security questions
   - Backup codes
   - Account recovery flow
   - Emergency contacts

8. **Enterprise Features**
   - SAML SSO
   - LDAP/Active Directory
   - Multi-tenancy
   - Custom authentication flows

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [Authentication Flows](docs/FLOWS.md) (TODO)
- [Security Best Practices](docs/SECURITY.md) (TODO)
- [API Reference](docs/API.md) (TODO)

## Stack

- NestJS
- JWT (jsonwebtoken)
- bcrypt
- Redis
- MongoDB (via @repo/database)
- WebAuthn (@simplewebauthn)
- speakeasy (TOTP)

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
