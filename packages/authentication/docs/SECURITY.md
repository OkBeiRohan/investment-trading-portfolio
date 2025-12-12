# Security Best Practices - Authentication Package

Comprehensive security guidelines for the `@repo/authentication` package.

---

## 1. Password Security

### Hashing Requirements

✅ **ALWAYS use bcrypt with 12+ salt rounds**:

```typescript
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // Minimum 12, recommended 14 for high-security

// Hash password
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

❌ **NEVER**:

- Store passwords in plain text
- Use MD5, SHA1, or other non-salted hashes
- Use salt rounds < 12
- Implement custom password hashing

### Password Requirements

```typescript
export const PASSWORD_RULES = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
} as const;

// Validation regex
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,128}$/;
```

**Rationale**:

- 12+ characters: Resists brute force (2^68 combinations)
- Mixed case + numbers + special chars: Prevents dictionary attacks
- Max 128 chars: Prevents DoS via extremely long passwords

---

## 2. Token Management

### JWT Configuration

```typescript
// Access Token (short-lived)
const accessToken = this.jwtService.sign(payload, {
  secret: process.env.JWT_ACCESS_SECRET,
  expiresIn: "15m", // ✅ Short lifetime
  algorithm: "HS256", // ✅ Secure algorithm
});

// Refresh Token (long-lived, but revocable)
const refreshToken = this.jwtService.sign(payload, {
  secret: process.env.JWT_REFRESH_SECRET, // ⚠️ DIFFERENT secret
  expiresIn: "7d",
  algorithm: "HS256",
});
```

### Secret Requirements

✅ **JWT secrets MUST**:

- Be at least 32 bytes (256 bits)
- Use cryptographically secure random generation
- Be different for access vs refresh tokens
- Be rotated every 6-12 months

```bash
# Generate secure secret (Unix/Mac)
openssl rand -base64 32

# Generate secure secret (Windows PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

❌ **NEVER**:

- Hardcode secrets in code
- Use weak secrets (e.g., "secret123")
- Commit secrets to version control
- Reuse secrets across environments

### Token Storage

**Client-Side**:

- ✅ Store access token in memory (React state/context)
- ✅ Store refresh token in httpOnly cookie (if using cookies)
- ✅ Use localStorage ONLY if necessary (XSS risk)
- ❌ NEVER store tokens in sessionStorage (persists across tabs)

**Server-Side**:

- ✅ Store refresh tokens in MongoDB (revocable)
- ✅ Cache active sessions in Redis (fast lookup)
- ✅ Implement token blacklist for logout

---

## 3. Session Security

### Session Configuration

```typescript
@Injectable()
export class SessionService {
  async createSession(userId: string, refreshToken: string) {
    const session = await this.sessionRepo.create({
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: request.ip, // ✅ Track IP for suspicious activity
      userAgent: request.headers["user-agent"], // ✅ Track device
      createdAt: new Date(),
    });

    // Cache in Redis for fast lookup
    await this.redis.setSession(session.id, session, 7 * 24 * 60 * 60);

    return session;
  }
}
```

### Session Invalidation

✅ **Invalidate sessions when**:

- User logs out
- User changes password
- User enables/disables 2FA
- Suspicious activity detected
- Token expires naturally

```typescript
async invalidateAllUserSessions(userId: string) {
  // Delete from MongoDB
  await this.sessionRepo.deleteByUserId(userId);

  // Delete from Redis
  await this.redis.deletePattern(`session:${userId}:*`);
}
```

---

## 4. Rate Limiting

### Endpoint-Specific Limits

```typescript
// Login endpoint (prevent brute force)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
@Post('login')
async login(@Body() dto: LoginDto) {
  // ...
}

// Registration endpoint (prevent spam)
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
@Post('register')
async register(@Body() dto: RegisterDto) {
  // ...
}

// Password reset (prevent enumeration)
@Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 min
@Post('forgot-password')
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  // ...
}
```

### IP-Based Blocking

```typescript
@Injectable()
export class IpBlockService {
  private readonly MAX_FAILED_ATTEMPTS = 10;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  async recordFailedAttempt(ip: string) {
    const key = `failed:${ip}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      // Set expiry on first attempt
      await this.redis.expire(key, this.BLOCK_DURATION / 1000);
    }

    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.redis.set(`blocked:${ip}`, "1", this.BLOCK_DURATION / 1000);
      throw new TooManyRequestsException("IP temporarily blocked");
    }
  }

  async isBlocked(ip: string): Promise<boolean> {
    return (await this.redis.get(`blocked:${ip}`)) !== null;
  }
}
```

---

## 5. Input Validation

### Use Zod Schemas

✅ **Always validate with Zod**:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128), // Don't reveal password rules in error
});

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/\d/, 'Must contain number')
    .regex(/[@$!%*?&]/, 'Must contain special character'),
  name: z.string().min(1).max(100),
});

// In controller
@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
  // dto is validated and type-safe
}
```

### Sanitization

```typescript
import { escape } from "validator";

// Sanitize user input before storage
const sanitizedName = escape(dto.name.trim());
```

---

## 6. Two-Factor Authentication (2FA)

### TOTP Configuration

```typescript
import * as speakeasy from "speakeasy";

// Generate secret
const secret = speakeasy.generateSecret({
  name: "Investment Trading Portfolio",
  issuer: "YourCompany",
  length: 32, // ✅ Use 32 bytes for security
});

// Verify with time window
const verified = speakeasy.totp.verify({
  secret: twoFactor.secret,
  encoding: "base32",
  token: userCode,
  window: 2, // ✅ Allow ±60 seconds (2 time steps)
});
```

### Backup Codes

✅ **Provide backup codes when enabling 2FA**:

```typescript
async generateBackupCodes(userId: string) {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex'); // 8-char hex
    codes.push(code);
  }

  // Hash before storing (like passwords)
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  );

  await this.twoFactorRepo.update(userId, {
    backupCodes: hashedCodes,
  });

  return codes; // Return plaintext ONCE for user to save
}
```

---

## 7. Passkey (WebAuthn) Security

### Registration Options

```typescript
import { generateRegistrationOptions } from "@simplewebauthn/server";

const options = await generateRegistrationOptions({
  rpName: "Investment Trading Portfolio",
  rpID: "yourdomain.com", // ✅ Must match actual domain
  userID: user.id,
  userName: user.email,
  attestationType: "none", // ✅ 'none' for privacy, 'direct' for enterprise
  authenticatorSelection: {
    authenticatorAttachment: "platform", // ✅ Prefer platform (Touch ID, Windows Hello)
    residentKey: "preferred", // ✅ Allow discoverable credentials
    userVerification: "preferred", // ✅ Biometric verification
  },
  excludeCredentials: existingPasskeys.map((pk) => ({
    id: pk.credentialID,
    type: "public-key",
  })), // ✅ Prevent duplicate registration
});
```

### Verification

```typescript
import { verifyRegistrationResponse } from "@simplewebauthn/server";

const verification = await verifyRegistrationResponse({
  response: credential,
  expectedChallenge: storedChallenge,
  expectedOrigin: "https://yourdomain.com", // ✅ Must match actual origin
  expectedRPID: "yourdomain.com",
  requireUserVerification: true, // ✅ Enforce biometric/PIN
});

if (!verification.verified) {
  throw new BadRequestException("Passkey verification failed");
}

// ✅ Store counter to prevent replay attacks
await this.passkeyRepo.create({
  userId,
  credentialID: verification.registrationInfo.credentialID,
  credentialPublicKey: verification.registrationInfo.credentialPublicKey,
  counter: verification.registrationInfo.counter, // ✅ CRITICAL for security
});
```

---

## 8. Email Security

### Verification Tokens

```typescript
// Generate cryptographically secure token
const token = crypto.randomBytes(32).toString("hex");

// Store with expiration
await this.verificationRepo.create({
  userId,
  token,
  type: "EMAIL_VERIFICATION",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
});

// ✅ One-time use: delete after verification
await this.verificationRepo.delete(verificationId);
```

### Email Content

❌ **NEVER include**:

- Passwords or password hints
- Full credit card numbers
- Social security numbers
- Raw API tokens

✅ **DO include**:

- Time-limited verification links
- Clear instructions
- Support contact information
- Expiration time

---

## 9. CORS & CSRF Protection

### CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL, // ✅ Specific origin, not '*'
  credentials: true, // ✅ Required for cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

### CSRF Protection

```typescript
import * as csurf from "csurf";

// Enable CSRF for state-changing operations
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: "strict",
    },
  })
);
```

---

## 10. Secure Headers

### Helmet Configuration

```typescript
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: "deny", // Prevent clickjacking
    },
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // Enable XSS filter
  })
);
```

---

## 11. Audit Logging

### Log Security Events

```typescript
@Injectable()
export class AuditLogService {
  async log(event: {
    userId?: string;
    action: string;
    ip: string;
    userAgent: string;
    success: boolean;
    metadata?: Record<string, any>;
  }) {
    await this.mongo.collection('audit_log').insertOne({
      ...event,
      timestamp: new Date(),
    });
  }
}

// Usage in AuthService
async login(email: string, password: string, request: Request) {
  try {
    // ... authentication logic

    await this.auditLog.log({
      userId: user.id,
      action: 'LOGIN',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      success: true,
    });
  } catch (error) {
    await this.auditLog.log({
      action: 'LOGIN_FAILED',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      success: false,
      metadata: { email, error: error.message },
    });
    throw error;
  }
}
```

---

## 12. Environment Variables

### Required Variables

```bash
# Secrets (32+ bytes each)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
AUTH_SECRET= # For better-auth

# URLs
APP_URL=https://yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
TRUSTED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com

# Database
MONGODB_URI=mongodb://localhost:27017/trading

# OAuth (if using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Secrets Management

✅ **Production**:

- Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
- Rotate secrets every 6-12 months
- Never log secrets

✅ **Development**:

- Use `.env` file (gitignored)
- Use different secrets than production
- Document required variables in `.env.example`

---

## 13. Common Vulnerabilities

### Prevent SQL/NoSQL Injection

✅ **Use Mongoose/Prisma**:

```typescript
// ✅ SAFE: Mongoose escapes automatically
const user = await this.userModel.findOne({ email });

// ❌ UNSAFE: Raw MongoDB query without validation
const user = await this.mongo
  .collection("users")
  .findOne({ email: req.body.email });
```

### Prevent XSS

✅ **Sanitize output in templates**:

```typescript
// In React/Next.js, use proper escaping
<div>{user.name}</div> {/* ✅ React auto-escapes */}
<div dangerouslySetInnerHTML={{ __html: user.bio }} /> {/* ❌ DANGEROUS */}
```

### Prevent Timing Attacks

✅ **Use constant-time comparison**:

```typescript
import { timingSafeEqual } from "crypto";

// ✅ SAFE: Constant-time comparison
const isValid = timingSafeEqual(
  Buffer.from(storedToken),
  Buffer.from(providedToken)
);

// ❌ UNSAFE: Early return reveals information
if (storedToken !== providedToken) {
  throw new Error("Invalid token");
}
```

---

## 14. Testing Security

### Unit Tests

```typescript
describe("AuthService - Security", () => {
  it("should reject weak passwords", async () => {
    await expect(
      authService.register("test@example.com", "weak", "Test User")
    ).rejects.toThrow("Password must be at least 12 characters");
  });

  it("should not reveal user existence on login", async () => {
    const result1 = await authService.login(
      "nonexistent@example.com",
      "password"
    );
    const result2 = await authService.login(
      "exists@example.com",
      "wrongpassword"
    );

    // Both should return same error
    expect(result1.error).toBe("Invalid credentials");
    expect(result2.error).toBe("Invalid credentials");
  });

  it("should invalidate sessions on password change", async () => {
    await authService.changePassword(userId, "oldpass", "newpass");

    const sessions = await sessionRepo.findByUserId(userId);
    expect(sessions).toHaveLength(0);
  });
});
```

---

## 15. Incident Response

### Breach Response Plan

If credentials are compromised:

1. **Immediate Actions** (< 1 hour):
   - Invalidate all sessions
   - Force password reset for affected users
   - Rotate JWT secrets
   - Block suspicious IPs

2. **Investigation** (< 24 hours):
   - Review audit logs
   - Identify scope of breach
   - Document timeline

3. **Communication** (< 72 hours):
   - Notify affected users
   - Report to authorities if required (GDPR, etc.)
   - Publish post-mortem (internal)

4. **Prevention** (ongoing):
   - Implement additional security measures
   - Update security documentation
   - Train team on new procedures

---

## Related Documentation

- [Authentication Flow Diagrams](./FLOWS.md)
- [API Reference](./API.md)
- [Authentication Package README](../README.md)
- [NestJS ConfigModule Pattern](../../docs/NESTJS_CONFIG_PATTERN.md)
