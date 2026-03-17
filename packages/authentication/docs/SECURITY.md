# Security Best Practices - Authentication Package

> **Last Updated**: March 17, 2026

Comprehensive security guidelines for better-auth integration.

---

## Overview

**better-auth** provides enterprise-grade security out of the box. This document outlines the built-in security features and best practices for configuration.

**Key Security Features**:

- ✅ Automatic bcrypt password hashing (12 rounds)
- ✅ Built-in CSRF protection
- ✅ Rate limiting with configurable rules
- ✅ Secure httpOnly cookies
- ✅ XSS protection
- ✅ Session management with automatic refresh
- ✅ OAuth 2.1 with PKCE
- ✅ WebAuthn (passkey) security
- ✅ Two-factor authentication

---

## 1. Password Security

### Automatic Hashing

better-auth automatically hashes passwords using bcrypt with 12 salt rounds:

```typescript
// Automatic - no custom code needed
POST /api/auth/sign-up/email
{
  "email": "user@example.com",
  "password": "SecurePassword123!"  // ← Automatically hashed with bcrypt
}
```

**What better-auth does**:

- Uses bcrypt with 12 salt rounds (industry standard)
- Validates password strength automatically
- Uses timing-safe comparison to prevent timing attacks
- Never stores plaintext passwords

### Password Requirements

Configure password rules in your auth config:

```typescript
// src/config/auth.config.ts
export const createAuthConfig = (options: AuthConfigOptions) => ({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },
});
```

**Recommended rules**:

- Minimum 12 characters
- Mixed case (upper + lower)
- At least one number
- At least one special character
- Maximum 128 characters (prevent DoS)

---

## 2. Session Security

### Secure Cookies

better-auth automatically sets secure httpOnly cookies:

```http
Set-Cookie: better-auth.session_token=<token>;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=604800
```

**Security properties**:

- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only sent over HTTPS in production
- **SameSite=Lax**: CSRF protection
- **Max-Age**: 7 days (configurable)

### Session Configuration

```typescript
// src/config/auth.config.ts
session: {
  expiresIn: 60 * 60 * 24 * 7,      // 7 days
  updateAge: 60 * 60 * 24,           // Update session daily
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5,                  // 5 minutes cookie cache
  },
}
```

### Automatic Session Refresh

better-auth automatically refreshes sessions when they're nearing expiry:

```typescript
// Automatic - no custom code needed
// If session expires in < 1 day, better-auth extends it by 7 days
```

---

## 3. CSRF Protection

### Automatic CSRF Tokens

better-auth includes built-in CSRF protection:

```typescript
// State parameter for OAuth (automatic)
GET /api/auth/sign-in/social/google
  → Generates state: crypto.randomBytes(16).toString('hex')
  → Stores in session
  → Validates on callback

// PKCE for OAuth 2.1 (automatic)
  → Generates code_verifier and code_challenge
  → Prevents authorization code interception
```

### SameSite Cookies

better-auth sets `SameSite=Lax` by default, preventing CSRF attacks:

```http
Set-Cookie: better-auth.session_token=xxx; SameSite=Lax
```

---

## 4. Rate Limiting

### Built-in Rate Limiter

better-auth includes automatic rate limiting:

```typescript
// src/config/auth.config.ts
rateLimit: {
  enabled: true,
  window: 60000,        // 60 seconds
  max: 100,             // 100 requests per window
  storage: "memory",    // or "redis" for distributed systems
}
```

### Endpoint-Specific Limits

better-auth applies stricter limits to sensitive endpoints:

| Endpoint                           | Limit        | Window     |
| ---------------------------------- | ------------ | ---------- |
| `POST /api/auth/sign-in/email`     | 5 requests   | 1 minute   |
| `POST /api/auth/sign-up/email`     | 3 requests   | 1 hour     |
| `POST /api/auth/forget-password`   | 3 requests   | 15 minutes |
| `POST /api/auth/two-factor/verify` | 5 requests   | 1 minute   |
| All other endpoints                | 100 requests | 1 minute   |

### Custom Rate Limits (Optional)

```typescript
// Override specific endpoint limits
import { rateLimit } from 'better-auth';

@Post('custom-endpoint')
@UseGuards(rateLimit({ max: 10, window: 60000 }))
async customEndpoint() {
  // 10 requests per minute
}
```

---

## 5. XSS Protection

### HttpOnly Cookies

better-auth stores session tokens in httpOnly cookies, preventing JavaScript access:

```typescript
// ❌ CANNOT access token via JavaScript
localStorage.getItem("token"); // undefined
document.cookie; // does not include session_token

// ✅ Token automatically sent with requests
fetch("/api/auth/get-session", {
  credentials: "include", // Include cookies
});
```

### Content Security Policy

Enable CSP headers in production:

```typescript
// apps/api/src/main.ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);
```

---

## 6. OAuth Security

### PKCE (Proof Key for Code Exchange)

better-auth automatically implements PKCE for OAuth 2.1:

```typescript
// Automatic - no custom code needed
1. Generate code_verifier (random 43-128 chars)
2. Generate code_challenge = base64url(sha256(code_verifier))
3. Send code_challenge to OAuth provider
4. Exchange authorization code with code_verifier
5. Provider validates code_verifier matches code_challenge
```

**Security benefits**:

- Prevents authorization code interception attacks
- No need for client_secret in public clients
- Required for OAuth 2.1 compliance

### State Parameter

better-auth generates and validates state parameters:

```typescript
// Automatic CSRF protection for OAuth
1. Generate state: crypto.randomBytes(16).toString('hex')
2. Store in session
3. Send to OAuth provider
4. Validate on callback
```

---

## 7. Two-Factor Authentication

### TOTP Security

better-auth uses industry-standard TOTP (Time-based One-Time Password):

```typescript
// Automatic configuration
{
  algorithm: "SHA1",
  digits: 6,
  step: 30,           // 30-second time window
  window: 1,          // ±30 seconds tolerance
}
```

### Backup Codes

better-auth generates 10 backup codes when 2FA is enabled:

```typescript
// Automatic - bcrypt hashed (12 rounds)
backupCodes: [
  "$2b$12$...", // Hashed backup code 1
  "$2b$12$...", // Hashed backup code 2
  // ... 8 more codes
];
```

**Security features**:

- One-time use (deleted after successful use)
- Bcrypt hashed (never stored in plaintext)
- 8-character alphanumeric codes

---

## 8. Passkey (WebAuthn) Security

### WebAuthn Configuration

better-auth automatically configures WebAuthn with secure defaults:

```typescript
// Registration options (automatic)
{
  rp: { name: "Trading App", id: "yourdomain.com" },
  user: { id: userId, name: email, displayName: name },
  pubKeyCredParams: [
    { type: "public-key", alg: -7 },   // ES256 (preferred)
    { type: "public-key", alg: -257 }, // RS256 (fallback)
  ],
  authenticatorSelection: {
    residentKey: "preferred",          // Enable passwordless
    userVerification: "preferred",     // Prefer biometric/PIN
  },
  attestation: "none",                 // No attestation needed
  timeout: 60000,                      // 60 seconds
}
```

### Replay Attack Prevention

better-auth tracks credential counters to prevent replay attacks:

```typescript
// Automatic counter validation
1. Store initial counter on registration
2. On authentication, verify new counter > old counter
3. Update stored counter
4. Reject if counter doesn't increment (replay attack detected)
```

---

## 9. Email Security

### Verification Tokens

better-auth generates cryptographically secure tokens:

```typescript
// Automatic token generation
token = crypto.randomBytes(32).toString('hex')  // 64 hex characters

// Automatic expiration
expiresAt = now + 24 hours  // Email verification
expiresAt = now + 15 minutes  // Magic link
expiresAt = now + 1 hour   // Password reset
```

### One-Time Use

All tokens are single-use:

```typescript
// Automatic - token deleted after use
1. User clicks link
2. better-auth validates token
3. Token is deleted from database
4. Subsequent clicks return 404
```

---

## 10. Database Security

### Parameterized Queries

better-auth uses Mongoose ODM with automatic parameterization:

```typescript
// ✅ Safe - automatic parameterization
users.findOne({ email: userInput });

// ❌ Never construct queries manually
db.collection.find({ $where: userInput }); // NoSQL injection!
```

### Input Validation

better-auth validates all inputs automatically:

```typescript
// Automatic validation
POST /api/auth/sign-up/email
{
  "email": "invalid-email",  // ← Rejected: invalid email format
  "password": "weak"         // ← Rejected: password too short
}
```

---

## 11. Environment Variables

### Required Secrets

```bash
# apps/api/.env

# AUTH_SECRET: Must be 32+ characters, cryptographically random
AUTH_SECRET=your-secret-key-minimum-32-characters-long

# Generate secure secret:
# Unix/Mac: openssl rand -base64 32
# Windows: [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Secret Management

**❌ NEVER**:

- Commit secrets to version control
- Hardcode secrets in code
- Use weak secrets ("secret123")
- Share secrets across environments

**✅ ALWAYS**:

- Use environment variables
- Rotate secrets every 6-12 months
- Use different secrets for dev/staging/production
- Store secrets in secure vault (AWS Secrets Manager, Azure Key Vault)

---

## 12. Common Vulnerabilities (Prevented)

### SQL/NoSQL Injection

**Protected**: Mongoose ODM with automatic parameterization

```typescript
// ✅ Safe - parameterized
users.findOne({ email: userEmail });

// ❌ Vulnerable (don't do this)
db.collection.find({ $where: `this.email == '${userEmail}'` });
```

### XSS (Cross-Site Scripting)

**Protected**: HttpOnly cookies prevent token theft

```typescript
// ✅ Token in httpOnly cookie (safe)
Set-Cookie: better-auth.session_token=xxx; HttpOnly

// ❌ Token in localStorage (vulnerable to XSS)
localStorage.setItem('token', xxx)  // Don't do this
```

### CSRF (Cross-Site Request Forgery)

**Protected**: SameSite cookies + state parameters

```typescript
// ✅ Automatic CSRF protection
Set-Cookie: better-auth.session_token=xxx; SameSite=Lax
```

### Timing Attacks

**Protected**: Constant-time comparisons

```typescript
// ✅ better-auth uses constant-time comparison
bcrypt.compare(password, hashedPassword); // Constant time

// ❌ Vulnerable (don't do this)
password === hashedPassword; // Variable time
```

### Brute Force

**Protected**: Built-in rate limiting

```typescript
// ✅ Automatic rate limiting
POST /api/auth/sign-in/email
  → 5 requests per minute
  → After 5 failed attempts: 429 Too Many Requests
```

---

## 13. Incident Response

### Suspected Breach

1. **Immediate Actions**:

   ```typescript
   // Invalidate all sessions
   await sessions.deleteMany({});

   // Force password reset for all users
   await users.updateMany({}, { forcePasswordReset: true });

   // Rotate AUTH_SECRET
   // Update environment variable and restart services
   ```

2. **Investigation**:
   - Check audit logs (enable in better-auth)
   - Review failed authentication attempts
   - Analyze suspicious IP addresses
   - Check for unusual API activity

3. **Communication**:
   - Notify affected users
   - Provide incident timeline
   - Explain remediation steps
   - Offer credit monitoring (if applicable)

### Enable Audit Logging

```typescript
// src/config/auth.config.ts
export const createAuthConfig = (options: AuthConfigOptions) => ({
  // ... other config
  advanced: {
    auditLog: {
      enabled: true,
      events: [
        "user.signUp",
        "user.signIn",
        "user.signOut",
        "user.failedSignIn",
        "twoFactor.enabled",
        "twoFactor.disabled",
        "passkey.registered",
        "organization.created",
      ],
    },
  },
});
```

---

## 14. Security Checklist

### Production Deployment

- [ ] AUTH_SECRET is 32+ characters, cryptographically random
- [ ] HTTPS enabled (Secure cookies require HTTPS)
- [ ] Rate limiting enabled
- [ ] Email verification enabled for sign-ups
- [ ] CSRF protection enabled (automatic)
- [ ] Content Security Policy configured
- [ ] Secrets stored in secure vault
- [ ] Different secrets for production vs dev
- [ ] Audit logging enabled
- [ ] Regular security updates (npm audit)
- [ ] 2FA encouraged for admin users
- [ ] Passkeys offered as phishing-resistant option

### Ongoing Maintenance

- [ ] Rotate AUTH_SECRET every 6-12 months
- [ ] Monitor failed authentication attempts
- [ ] Review audit logs weekly
- [ ] Update better-auth monthly (security patches)
- [ ] Test authentication flows after updates
- [ ] Review and update password policies annually
- [ ] Conduct security audits quarterly

---

## 15. Testing Security

### Example Security Tests

```typescript
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

describe("Security Tests", () => {
  let app: INestApplication;

  it("should reject weak passwords", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({
        email: "test@example.com",
        password: "weak", // Too short
      })
      .expect(400);
  });

  it("should enforce rate limiting on login", async () => {
    // Attempt 6 logins (limit is 5)
    for (let i = 0; i < 6; i++) {
      const response = await request(app.getHttpServer())
        .post("/api/auth/sign-in/email")
        .send({
          email: "test@example.com",
          password: "wrong",
        });

      if (i < 5) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429); // Rate limited
      }
    }
  });

  it("should set httpOnly cookies", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-in/email")
      .send({
        email: "test@example.com",
        password: "correct",
      })
      .expect(200);

    const cookie = response.headers["set-cookie"][0];
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });
});
```

---

## Related Documentation

- [Authentication Flows](./FLOWS.md) - Flow diagrams with security details
- [API Reference](./API.md) - API endpoint documentation
- [Architecture](./ARCHITECTURE.md) - System architecture
- [better-auth Security](https://better-auth.com/docs/concepts/security) - Upstream documentation
