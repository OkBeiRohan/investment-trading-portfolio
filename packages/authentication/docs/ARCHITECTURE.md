# Architecture - Authentication Package

> **Last Updated**: March 17, 2026

System architecture and component interaction documentation.

---

## Overview

The authentication package provides a **thin wrapper** around **better-auth**, integrating it seamlessly with NestJS backend and Next.js frontend.

**Key Design Principles**:

- ✅ Leverage better-auth's built-in features (minimize custom code)
- ✅ NestJS integration via `@thallesp/nestjs-better-auth`
- ✅ Configuration through NestJS ConfigService
- ✅ MongoDB persistence via custom adapter
- ✅ Type-safe client with React hooks
- ✅ Automatic session management with httpOnly cookies

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Web UI (Next.js)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Components                                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │  │
│  │  │ LoginForm  │  │SignUpForm  │  │OrganizationPanel │  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └────────┬─────────┘  │  │
│  │        │                │                  │             │  │
│  │        └────────────────┼──────────────────┘             │  │
│  │                         ▼                                │  │
│  │         ┌───────────────────────────────────┐            │  │
│  │         │  useAuth() Hook                   │            │  │
│  │         │  - signIn, signUp, signOut       │            │  │
│  │         │  - user, session                  │            │  │
│  │         │  - organization management        │            │  │
│  │         └───────────────┬───────────────────┘            │  │
│  │                         │                                │  │
│  └─────────────────────────┼────────────────────────────────┘  │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             │ HTTP/HTTPS
                             │ /api/auth/*
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                      API Backend (NestJS)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Application Module                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │  │
│  │  │AuthGuard   │  │RolesGuard  │  │Custom Controllers│  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └────────┬─────────┘  │  │
│  │        │                │                  │             │  │
│  │        └────────────────┼──────────────────┘             │  │
│  │                         ▼                                │  │
│  │         ┌───────────────────────────────────┐            │  │
│  │         │  @repo/authentication/server      │            │  │
│  │         │  ┌─────────────────────────────┐ │            │  │
│  │         │  │ AuthModule (NestJS)         │ │            │  │
│  │         │  │  - Imports BetterAuthModule │ │            │  │
│  │         │  │  - Provides AuthService     │ │            │  │
│  │         │  │  - Middleware configuration │ │            │  │
│  │         │  └──────────┬──────────────────┘ │            │  │
│  │         │             │                     │            │  │
│  │         │  ┌──────────▼──────────────────┐ │            │  │
│  │         │  │ BetterAuthModule            │ │            │  │
│  │         │  │ (@thallesp/nestjs-...)      │ │            │  │
│  │         │  │  - Wraps better-auth        │ │            │  │
│  │         │  │  - Auto-creates endpoints   │ │            │  │
│  │         │  │  - Handles middleware       │ │            │  │
│  │         │  └──────────┬──────────────────┘ │            │  │
│  │         │             │                     │            │  │
│  │         │  ┌──────────▼──────────────────┐ │            │  │
│  │         │  │ AuthService                 │ │            │  │
│  │         │  │  - getAuthInstance()        │ │            │  │
│  │         │  │  - Creates better-auth      │ │            │  │
│  │         │  └──────────┬──────────────────┘ │            │  │
│  │         │             │                     │            │  │
│  │         └─────────────┼─────────────────────┘            │  │
│  │                       │                                  │  │
│  └───────────────────────┼──────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  better-auth Core                                        │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Authentication Logic (Automatic)                  │ │  │
│  │  │  - Password hashing (bcrypt)                       │ │  │
│  │  │  - Session management                              │ │  │
│  │  │  - CSRF protection                                 │ │  │
│  │  │  - Rate limiting                                   │ │  │
│  │  │  - OAuth flows                                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Plugins                                           │ │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐   │ │  │
│  │  │  │organization│ │twoFactor│ │passkey          │   │ │  │
│  │  │  └──────────┘ └──────────┘ └─────────────────┘   │ │  │
│  │  │  ┌──────────┐ ┌──────────┐                       │ │  │
│  │  │  │phoneNumber│ │magicLink│                        │ │  │
│  │  │  └──────────┘ └──────────┘                       │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Email Provider                                    │ │  │
│  │  │  - Custom EmailService                            │ │  │
│  │  │  - Sends verification, password reset, invites    │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                      │
└─────────────────────────┼──────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (MongoDB)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  mongoAdapter (custom)                                   │   │
│  │  - Maps better-auth tables to Mongoose models           │   │
│  │  - Handles CRUD operations                              │   │
│  │  - Type-safe with @repo/schema                          │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │  Collections                                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │users     │  │sessions  │  │accounts (OAuth)      │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │organizations│ │members  │  │invitations           │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │verifications│ │twoFactors│ │passkeys              │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Client Layer (Next.js)

**Location**: `packages/authentication/src/client/`

**Components**:

- **auth-client.config.ts**: Creates better-auth client instance
- **hooks/use-auth.ts**: React hook for authentication
- **hooks/use-organization.ts**: React hook for organization management

**Responsibilities**:

- Initiate authentication requests
- Manage local auth state
- Handle OAuth redirects
- Provide React hooks for components

**Data Flow**:

```
Component → useAuth() → better-auth client → fetch() → API Backend
```

---

### 2. NestJS Integration Layer

**Location**: `packages/authentication/src/auth.module.ts`

**Components**:

- **AuthModule**: Main NestJS module
- **BetterAuthModule**: Wrapper module from `@thallesp/nestjs-better-auth`
- **Middleware**: Express 5 trailing slash fix

**Responsibilities**:

- Import better-auth into NestJS
- Configure dependency injection
- Apply Express middleware
- Export AuthService for use in app

**Configuration Flow**:

```
AuthModule.forRootAsync()
  → ConfigService
  → AuthService.getAuthInstance()
  → createBetterAuthInstance()
  → better-auth instance
```

---

### 3. AuthService

**Location**: `packages/authentication/src/services/auth.service.ts`

**Interface**:

```typescript
@Injectable()
export class AuthService implements BetterAuthServiceAbstraction {
  getAuthInstance(): BetterAuthInstance;
}
```

**Responsibilities**:

- Create better-auth instance
- Pass configuration from ConfigService
- Provide adapter (mongoAdapter)
- Configure plugins (organization, twoFactor, passkey, phoneNumber)
- Inject EmailService for notifications

**Dependencies**:

- ConfigService (NestJS)
- EmailService (custom)
- mongoAdapter (custom)

---

### 4. Configuration Layer

**Location**: `packages/authentication/src/config/auth.config.ts`

**Function**: `createAuthConfig(options: AuthConfigOptions): BetterAuthOptions`

**Configuration Sections**:

1. **Base URL**: `baseURL` from ConfigService
2. **Trusted Origins**: CORS configuration
3. **Database**: mongoAdapter
4. **Email**: Custom provider (EmailService)
5. **Session**: 7-day expiry, cookie cache
6. **Plugins**: organization, twoFactor, phoneNumber, passkey
7. **Social Providers**: Google, GitHub, Discord
8. **Rate Limiting**: Endpoint-specific limits
9. **User Schema**: Custom fields (dateOfBirth, role, isActive, etc.)

---

### 5. Database Adapter

**Location**: `packages/authentication/src/adapters/mongodb.adapter.ts`

**Function**: `mongoAdapter(): BetterAuthAdapter`

**Implementation**:

```typescript
export function mongoAdapter(): BetterAuthAdapter {
  return createAdapterFactory({
    // Map better-auth tables to Mongoose models
    user: {
      model: UserModel,
      create: async (data) => {
        /* ... */
      },
      findOne: async (query) => {
        /* ... */
      },
      update: async (id, data) => {
        /* ... */
      },
      delete: async (id) => {
        /* ... */
      },
    },
    session: {
      /* ... */
    },
    account: {
      /* ... */
    },
    // ... other tables
  });
}
```

**Mapped Collections**:

1. **user** → UserModel (from @repo/schema)
2. **session** → SessionModel
3. **account** → AccountModel (OAuth)
4. **verification** → VerificationModel
5. **organization** → OrganizationModel
6. **member** → MemberModel
7. **invitation** → InvitationModel
8. **twoFactor** → TwoFactorModel
9. **passkey** → PasskeyModel

**Responsibilities**:

- Translate better-auth operations to Mongoose
- Handle type conversions (\_id ↔ string)
- Ensure data consistency

---

### 6. Plugin Architecture

**Location**: `packages/authentication/src/server/auth.config.ts`

**Enabled Plugins**:

#### organization Plugin

```typescript
organization({
  async sendInvitationEmail(data) {
    await emailService.sendInvitationEmail({
      email: data.email,
      organizationName: data.organization.name,
      inviterName: data.inviter.user.name,
      invitationLink: data.url,
      role: data.role,
    });
  },
});
```

**Features**:

- Multi-tenancy support
- Organization CRUD
- Member management
- Invitation system
- Role-based permissions (owner, admin, member)

---

#### twoFactor Plugin

```typescript
twoFactor({
  issuer: options.appName,
  totpOptions: {
    period: 30,
    digits: 6,
  },
});
```

**Features**:

- TOTP generation (Google Authenticator compatible)
- Backup codes (bcrypt hashed)
- QR code generation
- 2FA verification during login

---

#### phoneNumber Plugin

```typescript
phoneNumber({
  async sendOTP(phoneNumber, otp) {
    // SMS provider integration
    await emailService.sendPhoneVerificationCode(phoneNumber, otp);
  },
});
```

**Features**:

- Phone number verification
- SMS OTP delivery
- Phone number association with accounts

---

#### passkey Plugin

```typescript
passkey({
  rpID: options.rpId,
  rpName: options.appName,
  origin: options.baseURL,
});
```

**Features**:

- WebAuthn registration
- Biometric authentication
- Security key support
- Passkey management

---

### 7. Guards & Decorators

**Location**: `packages/authentication/src/guards/`, `src/decorators/`

**Guards** (from `@thallesp/nestjs-better-auth`):

```typescript
@UseGuards(AuthGuard)  // Require authentication
@UseGuards(RolesGuard) // Require specific role
```

**Decorators**:

```typescript
@CurrentUser()         // Inject authenticated user
@CurrentSession()      // Inject session
@Roles('admin', 'user') // Require roles
@AllowAnonymous()      // Skip AuthGuard
@OptionalAuth()        // Auth optional, user may be null
```

**Usage Example**:

```typescript
@Controller("profile")
@UseGuards(AuthGuard, RolesGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Delete()
  @Roles("admin")
  deleteProfile(@CurrentUser() user: User) {
    // Only admins can access
  }
}
```

---

## Data Flow Examples

### 1. User Registration Flow

```
1. React Component
   └─> useAuth().signUp.email({ email, password, name })

2. better-auth Client
   └─> POST /api/auth/sign-up/email

3. NestJS Backend
   └─> BetterAuthModule receives request

4. better-auth Core
   ├─> Validate input (email format, password strength)
   ├─> Hash password (bcrypt, 12 rounds)
   └─> Call adapter.user.create(data)

5. mongoAdapter
   ├─> Map to UserModel
   └─> UserModel.create({ email, password: hash, name })

6. MongoDB
   └─> Insert document into 'users' collection

7. better-auth Core
   ├─> Generate verification token
   ├─> Call adapter.verification.create(token)
   ├─> Call emailProvider.sendVerificationEmail(email, token)
   ├─> Create session
   └─> Set httpOnly cookie

8. EmailService
   └─> Send verification email via SendGrid/SMTP

9. Response
   └─> Return { user, session } to client
```

---

### 2. OAuth Login Flow (Google)

```
1. React Component
   └─> window.location.href = '/api/auth/sign-in/social/google'

2. NestJS Backend
   └─> better-auth generates OAuth URL with state + PKCE

3. Browser
   └─> 302 Redirect to https://accounts.google.com/o/oauth2/v2/auth

4. User
   └─> Consents, grants permissions

5. Google
   └─> 302 Redirect to /api/auth/callback/google?code=xxx&state=yyy

6. better-auth Core
   ├─> Validate state (CSRF protection)
   ├─> Exchange code for tokens (with PKCE)
   └─> Fetch user profile from Google

7. better-auth Core
   ├─> Call adapter.user.findOne({ email })
   ├─> If not found: adapter.user.create({ email, name, image })
   └─> Call adapter.account.upsert({ userId, provider: 'google', ... })

8. mongoAdapter
   ├─> Update 'users' collection
   └─> Upsert 'accounts' collection

9. better-auth Core
   ├─> Create session
   └─> Set httpOnly cookie

10. Browser
    └─> 302 Redirect to app with cookie set
```

---

### 3. Protected Endpoint Request

```
1. React Component
   └─> fetch('/api/profile', { credentials: 'include' })

2. Browser
   └─> Include Cookie: better-auth.session_token=xxx

3. NestJS Backend
   └─> AuthGuard intercepts request

4. AuthGuard
   ├─> Extract session_token from cookie
   ├─> Call adapter.session.findOne({ token })
   └─> Check if expired

5. mongoAdapter
   └─> Query 'sessions' collection

6. AuthGuard
   ├─> Call adapter.user.findOne({ _id: session.userId })
   └─> Attach user to request.user

7. mongoAdapter
   └─> Query 'users' collection

8. Controller
   └─> @CurrentUser() receives user object

9. Response
   └─> Return profile data to client
```

---

## Database Schema

### users Collection

```typescript
{
  _id: ObjectId,
  email: string,
  emailVerified: boolean,
  password?: string,           // Hashed with bcrypt
  name: string,
  image?: string,
  role: 'user' | 'admin',
  isActive: boolean,
  isBlocked: boolean,
  dateOfBirth?: Date,
  lastLoginAt?: Date,
  passwordChangedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
}
```

### sessions Collection

```typescript
{
  _id: ObjectId,
  token: string,               // Session ID (in cookie)
  userId: ObjectId,            // Reference to users
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string,
  createdAt: Date,
}
```

### accounts Collection (OAuth)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,            // Reference to users
  provider: 'google' | 'github' | 'discord',
  providerId: string,          // Google user ID
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date,
  createdAt: Date,
}
```

### organizations Collection

```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,                // Unique, URL-friendly
  logo?: string,
  createdAt: Date,
}
```

### members Collection

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  role: 'owner' | 'admin' | 'member',
  joinedAt: Date,
}
```

### invitations Collection

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  email: string,
  role: 'admin' | 'member',
  token: string,
  invitedBy: ObjectId,         // User who sent invite
  expiresAt: Date,
  createdAt: Date,
}
```

### verifications Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  token: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'MAGIC_LINK',
  expiresAt: Date,
  createdAt: Date,
}
```

### twoFactors Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  secret: string,              // TOTP secret (base32)
  enabled: boolean,
  backupCodes: string[],       // Bcrypt hashed
  createdAt: Date,
}
```

### passkeys Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  credentialId: string,        // WebAuthn credential ID
  credentialPublicKey: Buffer,
  counter: number,             // Replay attack prevention
  transports: string[],        // ['internal', 'usb', 'nfc', 'ble']
  createdAt: Date,
}
```

---

## Security Architecture

### 1. Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Timing-safe comparisons**: Constant-time verification
- **Strength validation**: Configurable requirements (length, complexity)

### 2. Session Security

- **httpOnly cookies**: Prevent XSS token theft
- **Secure flag**: HTTPS-only in production
- **SameSite=Lax**: CSRF protection
- **Automatic refresh**: Extends session when nearing expiry

### 3. CSRF Protection

- **State parameters**: OAuth flows
- **PKCE**: OAuth 2.1 security (authorization code flow)
- **SameSite cookies**: Browser-level protection

### 4. Rate Limiting

- **Built-in rate limiter**: Per-endpoint limits
- **Memory storage**: Development
- **Redis storage**: Production (distributed)

### 5. Input Validation

- **Zod schemas**: Runtime type checking
- **Automatic sanitization**: SQL/NoSQL injection prevention
- **Parameterized queries**: Mongoose ODM

---

## Configuration Management

### Environment Variables

**Root Application** (`apps/api/.env`):

```bash
# Application
APP_NAME="Trading Platform"
APP_URL="https://yourdomain.com"

# Authentication
AUTH_SECRET="your-secret-minimum-32-characters"
TRUSTED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# OAuth (Optional)
GOOGLE_CLIENT_ID="xxx"
GOOGLE_CLIENT_SECRET="xxx"
GITHUB_CLIENT_ID="xxx"
GITHUB_CLIENT_SECRET="xxx"

# WebAuthn (Passkeys)
RP_ID="yourdomain.com"
```

### ConfigService Integration

```typescript
// apps/api/src/config/configuration.ts
export default () => ({
  auth: {
    appName: process.env.APP_NAME,
    baseURL: process.env.APP_URL,
    authSecret: process.env.AUTH_SECRET,
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [],
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    rpId: process.env.RP_ID,
  },
});
```

```typescript
// packages/authentication/src/services/auth.service.ts
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getAuthInstance(): BetterAuthInstance {
    const config = this.configService.get("auth");
    return createBetterAuthInstance({
      appName: config.appName,
      baseURL: config.baseURL,
      authSecret: config.authSecret,
      // ...
    });
  }
}
```

---

## Performance Considerations

### 1. Session Caching

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,      // 7 days
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5,                  // 5 minutes cache
  },
}
```

**Impact**: Reduces database queries for session validation

---

### 2. Database Indexing

```typescript
// Mongoose schema indexes
UserSchema.index({ email: 1 }, { unique: true });
SessionSchema.index({ token: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
```

**Impact**: Fast lookups, automatic session cleanup

---

### 3. Lazy Loading

```typescript
// Only load better-auth plugins when needed
const authConfig = {
  plugins: user.twoFactorEnabled
    ? [organization, twoFactor, passkey, phoneNumber]
    : [organization, passkey, phoneNumber],
};
```

---

## Testing Architecture

### Unit Tests

```typescript
describe("mongoAdapter", () => {
  it("should create user", async () => {
    const adapter = mongoAdapter();
    const user = await adapter.user.create({
      email: "test@example.com",
      password: "hashed",
    });
    expect(user).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe("Auth API", () => {
  it("should register user", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({
        email: "test@example.com",
        password: "SecurePass123!",
        name: "Test User",
      });
    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
  });
});
```

### E2E Tests

```typescript
describe("Authentication Flow", () => {
  it("should complete full auth cycle", async () => {
    // 1. Register
    const registerRes = await signUp("test@example.com", "pass");

    // 2. Verify email
    const verifyRes = await verifyEmail(token);

    // 3. Login
    const loginRes = await signIn("test@example.com", "pass");

    // 4. Access protected endpoint
    const profileRes = await getProfile(loginRes.sessionToken);

    // 5. Logout
    const logoutRes = await signOut(loginRes.sessionToken);

    expect(profileRes.status).toBe(200);
  });
});
```

---

## Deployment Architecture

### Development

```
Local NestJS → Local MongoDB → Local better-auth
```

### Production

```
NestJS (Cloud) → MongoDB Atlas → better-auth
      ↓
   Redis (rate limiting)
      ↓
   SendGrid (email)
```

---

## Migration from Custom Auth

If migrating from custom authentication:

```typescript
// Old (custom)
@Post('login')
async login(@Body() dto: LoginDto) {
  const user = await this.userRepository.findByEmail(dto.email);
  const valid = await bcrypt.compare(dto.password, user.password);
  const token = this.jwtService.sign({ userId: user._id });
  return { token };
}

// New (better-auth)
// Delete custom controller - better-auth handles it automatically
// POST /api/auth/sign-in/email
```

**Migration Steps**:

1. Install better-auth packages
2. Configure BetterAuthModule
3. Create mongoAdapter
4. Remove custom auth controllers
5. Replace AuthGuard with better-auth AuthGuard
6. Update client to use better-auth client
7. Migrate database schema (users, sessions)

---

## Related Documentation

- [README](../README.md) - Package overview and quick start
- [Authentication Flows](./FLOWS.md) - Flow diagrams with timing
- [Security Best Practices](./SECURITY.md) - Security features
- [API Reference](./API.md) - Complete API documentation
- [better-auth Docs](https://better-auth.com/docs) - Upstream documentation
