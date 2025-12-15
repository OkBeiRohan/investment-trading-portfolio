---
applyTo: "packages/authentication/**"
---

# GitHub Copilot Instructions - Authentication Package

## Role & Context

You are working on the `@repo/authentication` package - a **provider-agnostic authentication system** supporting multiple authentication strategies (credentials, OAuth, passkeys, magic links).

## Package Overview

**Purpose**: Centralized authentication logic for the entire monorepo, supporting both server-side (NestJS) and client-side (Next.js) authentication.

**Key Features**:

- ✅ Multi-provider support (credentials, OAuth, passkeys, magic links)
- ✅ JWT + refresh token management
- ✅ Two-factor authentication (TOTP, SMS)
- ✅ Session management with Redis caching
- ✅ Email verification workflow
- ✅ Password reset flow
- ✅ Passkey (WebAuthn) support
- ✅ Organization-based access control
- ✅ Role-based permissions (RBAC)

## Architecture

### Adapter Pattern

**CRITICAL**: This package uses the **adapter pattern** to support multiple database backends.

```typescript
// Define interface for authentication repositories
interface IAuthRepositories {
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  accountRepository: AccountRepository;
  verificationRepository: VerificationRepository;
  twoFactorRepository: TwoFactorRepository;
  passkeyRepository: PasskeyRepository;
}

// Implement adapters for different databases
class MongoDBAdapter implements IAuthRepositories {
  // MongoDB-specific implementations
}

class PostgreSQLAdapter implements IAuthRepositories {
  // PostgreSQL-specific implementations (future)
}

// Use factory to get the right adapter
const adapter = AdapterFactory.create("mongodb", config);
```

**Why?**

- Database independence
- Easy to switch or add new databases
- Testability (can mock adapters)
- Single auth logic for all databases

### Module Structure

```
packages/authentication/src/
├── index.ts                          # Main exports
├── auth.module.ts                    # NestJS module
├── adapters/                         # Database adapters
│   ├── adapter.factory.ts            # Factory for creating adapters
│   ├── mongodb.adapter.ts            # MongoDB implementation
│   └── index.ts
├── services/                         # Core authentication logic
│   ├── auth.service.ts               # Main auth service
│   └── email.service.ts              # Email notifications
├── guards/                           # NestJS guards
│   ├── auth.guard.ts                 # JWT authentication
│   ├── roles.guard.ts                # Role-based access control
│   └── organization.guard.ts         # Organization membership
├── decorators/                       # Custom decorators
│   ├── current-user.decorator.ts     # @CurrentUser()
│   ├── current-session.decorator.ts  # @CurrentSession()
│   ├── roles.decorator.ts            # @Roles('admin', 'user')
│   └── public.decorator.ts           # @Public() (skip auth)
├── config/                           # Configuration
│   └── auth.config.ts                # Auth settings
├── server/                           # Server-side utilities
│   ├── auth.types.ts                 # TypeScript types
│   └── auth.config.ts                # Server config
└── client/                           # Client-side utilities (Next.js)
    ├── auth-client.types.ts          # Client types
    ├── auth-client.config.ts         # Client config
    └── hooks/                        # React hooks
        ├── use-auth.ts               # useAuth() hook
        └── use-organization.ts       # useOrganization() hook
```

## Core Principles

### 1. Database Adapter Pattern

**ALWAYS use adapters, NEVER access database directly in services:**

```typescript
// ✅ CORRECT - Use adapter
@Injectable()
export class AuthService {
  constructor(@Inject("AUTH_ADAPTER") private adapter: IAuthRepositories) {}

  async login(email: string, password: string) {
    const user = await this.adapter.userRepository.findByEmail(email);
    // ... authentication logic
  }
}

// ❌ WRONG - Direct database access
@Injectable()
export class AuthService {
  constructor(
    @InjectModel("User") private userModel: Model<User> // NEVER do this
  ) {}
}
```

### 2. Schema Definitions

**ALL schemas MUST be defined in `@repo/schema`, NOT in this package:**

```typescript
// ✅ CORRECT - Import from @repo/schema
import { userSchema, type User } from '@repo/schema';

// ❌ WRONG - Define schemas locally
const userSchema = z.object({ ... }); // NEVER
```

### 3. Password Security

**ALWAYS use bcrypt with proper salt rounds:**

```typescript
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // Minimum 12 rounds

// Hash password
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### 4. JWT Token Management

**Use short-lived access tokens + long-lived refresh tokens:**

```typescript
// Access token: 15 minutes
const accessToken = this.jwtService.sign(payload, {
  expiresIn: "15m",
  secret: process.env.JWT_ACCESS_SECRET,
});

// Refresh token: 7 days
const refreshToken = this.jwtService.sign(payload, {
  expiresIn: "7d",
  secret: process.env.JWT_REFRESH_SECRET,
});
```

### 5. Session Management

**Store sessions in Redis for fast lookups:**

```typescript
// Create session
const session = await this.adapter.sessionRepository.create({
  userId,
  token: refreshToken,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

// Cache in Redis
await this.redisService.setSession(sessionId, session);

// Invalidate on logout
await this.adapter.sessionRepository.delete(sessionId);
await this.redisService.deleteSession(sessionId);
```

## Authentication Flows

### 1. Credentials Login

```typescript
// POST /auth/login
async login(email: string, password: string) {
  // 1. Find user
  const user = await this.adapter.userRepository.findByEmail(email);
  if (!user) throw new UnauthorizedException('Invalid credentials');

  // 2. Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new UnauthorizedException('Invalid credentials');

  // 3. Check if email verified
  if (!user.emailVerified) {
    throw new UnauthorizedException('Please verify your email');
  }

  // 4. Check 2FA
  if (user.twoFactorEnabled) {
    return { requiresTwoFactor: true, userId: user._id };
  }

  // 5. Generate tokens
  const { accessToken, refreshToken } = await this.generateTokens(user);

  // 6. Create session
  await this.createSession(user._id, refreshToken);

  return { accessToken, refreshToken, user };
}
```

### 2. Email Verification

```typescript
// POST /auth/register
async register(email: string, password: string, name: string) {
  // 1. Check if user exists
  const existing = await this.adapter.userRepository.findByEmail(email);
  if (existing) throw new ConflictException('User already exists');

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Create user
  const user = await this.adapter.userRepository.create({
    email,
    password: hashedPassword,
    name,
    emailVerified: false,
  });

  // 4. Generate verification token
  const token = this.generateVerificationToken();
  await this.adapter.verificationRepository.create({
    userId: user._id,
    token,
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // 5. Send verification email
  await this.emailService.sendVerificationEmail(email, token);

  return { success: true };
}

// GET /auth/verify-email?token=xxx
async verifyEmail(token: string) {
  const verification = await this.adapter.verificationRepository.findByToken(token);
  if (!verification || verification.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired token');
  }

  await this.adapter.userRepository.update(verification.userId, {
    emailVerified: true,
  });

  await this.adapter.verificationRepository.delete(verification._id);

  return { success: true };
}
```

### 3. Two-Factor Authentication

```typescript
// POST /auth/2fa/enable
async enableTwoFactor(userId: string) {
  const secret = speakeasy.generateSecret({ name: 'TradingApp' });

  await this.adapter.twoFactorRepository.create({
    userId,
    secret: secret.base32,
    enabled: false,
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return { secret: secret.base32, qrCode };
}

// POST /auth/2fa/verify
async verifyTwoFactor(userId: string, token: string) {
  const twoFactor = await this.adapter.twoFactorRepository.findByUserId(userId);
  if (!twoFactor) throw new NotFoundException('2FA not set up');

  const verified = speakeasy.totp.verify({
    secret: twoFactor.secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after
  });

  if (!verified) throw new UnauthorizedException('Invalid 2FA code');

  if (!twoFactor.enabled) {
    await this.adapter.twoFactorRepository.update(twoFactor._id, {
      enabled: true,
    });
  }

  return { success: true };
}
```

### 4. Passkey (WebAuthn) Support

```typescript
// POST /auth/passkey/register-start
async startPasskeyRegistration(userId: string) {
  const user = await this.adapter.userRepository.findById(userId);

  const options = await generateRegistrationOptions({
    rpName: 'Trading Platform',
    rpID: process.env.RP_ID,
    userID: user._id.toString(),
    userName: user.email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge temporarily
  await this.redisService.set(
    `passkey:challenge:${userId}`,
    options.challenge,
    300, // 5 minutes
  );

  return options;
}

// POST /auth/passkey/register-finish
async finishPasskeyRegistration(userId: string, credential: any) {
  const challenge = await this.redisService.get(`passkey:challenge:${userId}`);

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: process.env.ORIGIN,
    expectedRPID: process.env.RP_ID,
  });

  if (!verification.verified) {
    throw new BadRequestException('Passkey verification failed');
  }

  await this.adapter.passkeyRepository.create({
    userId,
    credentialID: verification.registrationInfo.credentialID,
    credentialPublicKey: verification.registrationInfo.credentialPublicKey,
    counter: verification.registrationInfo.counter,
  });

  return { success: true };
}
```

## Guards & Decorators

### Auth Guard

```typescript
// Apply to all routes by default
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Global auth guard
    },
  ],
})
export class AppModule {}

// Make specific routes public
@Public()
@Get('health')
getHealth() {
  return { status: 'ok' };
}
```

### Roles Guard

```typescript
// Protect routes by role
@Roles('admin', 'manager')
@UseGuards(RolesGuard)
@Delete('users/:id')
async deleteUser(@Param('id') id: string) {
  // Only admins and managers can access
}
```

### Current User Decorator

```typescript
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user; // Automatically injected from JWT
}

@Get('session')
async getSession(@CurrentSession() session: Session) {
  return session; // Automatically injected
}
```

## Client-Side (Next.js) Usage

### Auth Hook

```typescript
// app/providers.tsx
import { AuthProvider } from '@repo/auth-client';

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

// app/dashboard/page.tsx
'use client';
import { useAuth } from '@repo/auth-client';

export default function Dashboard() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Organization Hook

```typescript
'use client';
import { useOrganization } from '@repo/auth-client';

export default function OrgSettings() {
  const { organization, role, isAdmin, switchOrganization } = useOrganization();

  return (
    <div>
      <h1>{organization.name}</h1>
      <p>Your role: {role}</p>
      {isAdmin && <button>Admin Settings</button>}
    </div>
  );
}
```

## Security Best Practices

### 1. Rate Limiting

```typescript
// Apply rate limiting to auth endpoints
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
@Post('login')
async login(@Body() dto: LoginDto) {
  // ...
}
```

### 2. CSRF Protection

```typescript
// Enable CSRF for state-changing operations
app.use(csurf({ cookie: true }));
```

### 3. Secure Headers

```typescript
// Use Helmet for security headers
import helmet from "helmet";
app.use(helmet());
```

### 4. Input Validation

```typescript
// Always validate input with Zod
import { loginSchema } from '@repo/schema';

@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
  // dto is validated and type-safe
}
```

## Testing

### Unit Tests

```typescript
describe("AuthService", () => {
  let service: AuthService;
  let mockAdapter: jest.Mocked<IAuthRepositories>;

  beforeEach(() => {
    mockAdapter = {
      userRepository: createMockRepository(),
      sessionRepository: createMockRepository(),
      // ...
    };

    service = new AuthService(mockAdapter);
  });

  it("should login user with valid credentials", async () => {
    mockAdapter.userRepository.findByEmail.mockResolvedValue(mockUser);
    const result = await service.login("test@example.com", "password123");
    expect(result.accessToken).toBeDefined();
  });
});
```

## Future Enhancements

### Not Yet Implemented

1. **Magic Link Authentication**
   - Passwordless login via email
   - Token-based authentication
   - One-time use tokens

2. **OAuth Providers** (Google, GitHub, etc.)
   - OAuth 2.0 flow
   - Social login integration
   - Account linking

3. **SMS Two-Factor**
   - Twilio integration
   - SMS verification codes
   - Phone number verification

4. **Biometric Authentication**
   - Face ID / Touch ID
   - Device-based authentication
   - Platform authenticators

5. **Advanced Session Management**
   - Device tracking
   - Suspicious activity detection
   - Force logout from all devices

6. **Audit Logging**
   - Login/logout events
   - Failed authentication attempts
   - Permission changes

## Common Patterns

### Adding a New Authentication Method

1. Update `@repo/schema` with new schemas
2. Create repository interface in adapter
3. Implement in MongoDB adapter
4. Add service methods in `auth.service.ts`
5. Create controller endpoints
6. Add client-side hooks (if needed)
7. Write tests

### Adding a New Database Adapter

1. Implement `IAuthRepositories` interface
2. Create adapter class (e.g., `PostgreSQLAdapter`)
3. Register in `adapter.factory.ts`
4. Update configuration
5. Test with all auth flows

## Environment Variables

```bash
# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Token Expiry
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (SendGrid, etc.)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# WebAuthn (Passkeys)
RP_ID=yourdomain.com
RP_NAME="Trading Platform"
ORIGIN=https://yourdomain.com

# Redis
REDIS_URL=redis://localhost:6379

# Database
MONGODB_URI=mongodb://localhost:27017
```

## Documentation

- [Authentication Flow Diagrams](../../packages/authentication/docs/FLOWS.md)
- [Security Best Practices](../../packages/authentication/docs/SECURITY.md)
- [API Reference](../../packages/authentication/docs/API.md)

## Contributing

Follow the coding standards and ensure all tests pass before submitting changes.
