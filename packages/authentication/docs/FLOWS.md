# Authentication Flow Diagrams

Complete visual documentation of all authentication flows in the `@repo/authentication` package.

---

## 1. Credentials Login Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /auth/login
     │ { email, password }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user by email                                                │
│    └─> UserRepository.findByEmail(email)                             │
│                                                                       │
│ 2. Verify password                                                   │
│    └─> bcrypt.compare(password, user.hashedPassword)                 │
│                                                                       │
│ 3. Check email verification                                          │
│    └─> if (!user.emailVerified) throw UnauthorizedException          │
│                                                                       │
│ 4. Check 2FA status                                                  │
│    └─> if (user.twoFactorEnabled) return { requiresTwoFactor }       │
│                                                                       │
│ 5. Generate JWT tokens                                               │
│    ├─> accessToken (15 min)                                          │
│    └─> refreshToken (7 days)                                         │
│                                                                       │
│ 6. Create session                                                    │
│    ├─> SessionRepository.create()                                    │
│    └─> Redis.setSession() [cache]                                    │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { accessToken, refreshToken, user }
└─────────┘
```

**Success Path**: Email + Password → User Found → Password Valid → Email Verified → No 2FA → Tokens Generated → Session Created → Login Complete

**Error Paths**:

- User not found → `401 Unauthorized`
- Invalid password → `401 Unauthorized`
- Email not verified → `401 Please verify your email`
- 2FA enabled → `{ requiresTwoFactor: true, userId }` (proceed to 2FA flow)

---

## 2. Registration & Email Verification Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /auth/register
     │ { email, password, name }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Check if user exists                                              │
│    └─> if (exists) throw ConflictException                           │
│                                                                       │
│ 2. Hash password (bcrypt, 12 rounds)                                 │
│    └─> hashedPassword = bcrypt.hash(password, 12)                    │
│                                                                       │
│ 3. Create user                                                       │
│    └─> UserRepository.create({                                       │
│           email, password: hashedPassword, name,                     │
│           emailVerified: false                                       │
│        })                                                             │
│                                                                       │
│ 4. Generate verification token                                       │
│    └─> token = crypto.randomBytes(32).toString('hex')                │
│                                                                       │
│ 5. Store verification token                                          │
│    └─> VerificationRepository.create({                               │
│           userId, token, type: 'EMAIL_VERIFICATION',                 │
│           expiresAt: now + 24h                                       │
│        })                                                             │
│                                                                       │
│ 6. Send verification email                                           │
│    └─> EmailService.sendVerificationEmail(                           │
│           email, token, verificationUrl                              │
│        )                                                              │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true, message: "Check your email" }
└─────────┘


─── User clicks email link ───


┌─────────┐
│  Client │ GET /auth/verify-email?token=xxx
└────┬────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find verification token                                           │
│    └─> VerificationRepository.findByToken(token)                     │
│                                                                       │
│ 2. Validate token                                                    │
│    └─> if (!token || expired) throw BadRequestException              │
│                                                                       │
│ 3. Mark email as verified                                            │
│    └─> UserRepository.update(userId, { emailVerified: true })        │
│                                                                       │
│ 4. Delete verification token                                         │
│    └─> VerificationRepository.delete(token.id)                       │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true } → Redirect to login
└─────────┘
```

---

## 3. Two-Factor Authentication (2FA) Flow

### 3.1 Enable 2FA

```
┌─────────┐
│  Client │ (Authenticated user)
└────┬────┘
     │
     │ POST /auth/2fa/enable
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate TOTP secret                                              │
│    └─> secret = speakeasy.generateSecret({                           │
│           name: 'Investment Trading Portfolio',                      │
│           issuer: 'TradingApp'                                       │
│        })                                                             │
│                                                                       │
│ 2. Store secret (not yet enabled)                                    │
│    └─> TwoFactorRepository.create({                                  │
│           userId, secret: secret.base32,                             │
│           enabled: false                                             │
│        })                                                             │
│                                                                       │
│ 3. Generate QR code                                                  │
│    └─> qrCode = QRCode.toDataURL(secret.otpauth_url)                 │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { secret: base32, qrCode: dataURL }
└────┬────┘
     │
     │ User scans QR with authenticator app
     │
     │ POST /auth/2fa/verify
     │ { code: "123456" }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find 2FA record                                                   │
│    └─> TwoFactorRepository.findByUserId(userId)                      │
│                                                                       │
│ 2. Verify TOTP code                                                  │
│    └─> verified = speakeasy.totp.verify({                            │
│           secret: twoFactor.secret,                                  │
│           encoding: 'base32',                                        │
│           token: code,                                               │
│           window: 2  // Allow ±60 seconds                            │
│        })                                                             │
│                                                                       │
│ 3. Enable 2FA if valid                                               │
│    └─> TwoFactorRepository.update({ enabled: true })                 │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true, message: "2FA enabled" }
└─────────┘
```

### 3.2 Login with 2FA

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /auth/login → { requiresTwoFactor: true, userId }
     │
     │ POST /auth/2fa/verify
     │ { userId, code: "123456" }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Verify TOTP code                                                  │
│    └─> speakeasy.totp.verify()                                       │
│                                                                       │
│ 2. Generate JWT tokens                                               │
│    └─> { accessToken, refreshToken }                                 │
│                                                                       │
│ 3. Create session                                                    │
│    └─> SessionRepository.create() + Redis.setSession()               │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { accessToken, refreshToken, user }
└─────────┘
```

---

## 4. Passkey (WebAuthn) Flow

### 4.1 Register Passkey

```
┌─────────┐
│  Client │ (Authenticated user)
└────┬────┘
     │
     │ POST /auth/passkey/register-start
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Get user details                                                  │
│    └─> UserRepository.findById(userId)                               │
│                                                                       │
│ 2. Generate WebAuthn registration options                            │
│    └─> options = generateRegistrationOptions({                       │
│           rpName: 'Investment Trading Portfolio',                    │
│           rpID: 'yourdomain.com',                                    │
│           userID: user.id,                                           │
│           userName: user.email,                                      │
│           attestationType: 'none',                                   │
│           authenticatorSelection: {                                  │
│             residentKey: 'preferred',                                │
│             userVerification: 'preferred'                            │
│           }                                                           │
│        })                                                             │
│                                                                       │
│ 3. Store challenge temporarily                                       │
│    └─> Redis.set(`passkey:challenge:${userId}`,                      │
│                    options.challenge, 300) // 5 min                  │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← WebAuthn Options (challenge, rpId, etc.)
└────┬────┘
     │
     │ navigator.credentials.create({ publicKey: options })
     │ User interacts with authenticator (Touch ID, YubiKey, etc.)
     │
     │ POST /auth/passkey/register-finish
     │ { credential: {...} }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Retrieve challenge                                                │
│    └─> challenge = Redis.get(`passkey:challenge:${userId}`)          │
│                                                                       │
│ 2. Verify registration response                                      │
│    └─> verification = verifyRegistrationResponse({                   │
│           response: credential,                                      │
│           expectedChallenge: challenge,                              │
│           expectedOrigin: 'https://yourdomain.com',                  │
│           expectedRPID: 'yourdomain.com'                             │
│        })                                                             │
│                                                                       │
│ 3. Store passkey credential                                          │
│    └─> PasskeyRepository.create({                                    │
│           userId,                                                     │
│           credentialID: verification.credentialID,                   │
│           credentialPublicKey: verification.publicKey,               │
│           counter: verification.counter                              │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true }
└─────────┘
```

### 4.2 Login with Passkey

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /auth/passkey/login-start
     │ { email }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user and passkeys                                            │
│    └─> user = UserRepository.findByEmail(email)                      │
│    └─> passkeys = PasskeyRepository.findByUserId(user.id)            │
│                                                                       │
│ 2. Generate authentication options                                   │
│    └─> options = generateAuthenticationOptions({                     │
│           rpID: 'yourdomain.com',                                    │
│           allowCredentials: passkeys.map(pk => ({                    │
│             id: pk.credentialID,                                     │
│             type: 'public-key'                                       │
│           }))                                                         │
│        })                                                             │
│                                                                       │
│ 3. Store challenge                                                   │
│    └─> Redis.set(`passkey:auth:${user.id}`, challenge, 300)          │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← WebAuthn Options
└────┬────┘
     │
     │ navigator.credentials.get({ publicKey: options })
     │ User authenticates with passkey
     │
     │ POST /auth/passkey/login-finish
     │ { credential: {...} }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Verify authentication response                                    │
│    └─> verification = verifyAuthenticationResponse({...})            │
│                                                                       │
│ 2. Update counter (prevent replay attacks)                           │
│    └─> PasskeyRepository.update({ counter: newCounter })             │
│                                                                       │
│ 3. Generate tokens & create session                                  │
│    └─> { accessToken, refreshToken }                                 │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { accessToken, refreshToken, user }
└─────────┘
```

---

## 5. Password Reset Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /auth/forgot-password
     │ { email }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user by email                                                │
│    └─> user = UserRepository.findByEmail(email)                      │
│    └─> if (!user) return success (security: don't reveal existence)  │
│                                                                       │
│ 2. Generate reset token                                              │
│    └─> token = crypto.randomBytes(32).toString('hex')                │
│                                                                       │
│ 3. Store reset token                                                 │
│    └─> VerificationRepository.create({                               │
│           userId, token, type: 'PASSWORD_RESET',                     │
│           expiresAt: now + 1h                                        │
│        })                                                             │
│                                                                       │
│ 4. Send reset email                                                  │
│    └─> EmailService.sendPasswordResetEmail(email, token, resetUrl)   │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true, message: "Check your email" }
└─────────┘


─── User clicks email link ───


┌─────────┐
│  Client │ POST /auth/reset-password
└────┬────┘ { token, newPassword }
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate token                                                    │
│    └─> verification = VerificationRepository.findByToken(token)      │
│    └─> if (!token || expired) throw BadRequestException              │
│                                                                       │
│ 2. Hash new password                                                 │
│    └─> hashedPassword = bcrypt.hash(newPassword, 12)                 │
│                                                                       │
│ 3. Update password                                                   │
│    └─> UserRepository.update(userId, {                               │
│           password: hashedPassword                                   │
│        })                                                             │
│                                                                       │
│ 4. Invalidate all sessions                                           │
│    └─> SessionRepository.deleteByUserId(userId)                      │
│    └─> Redis.deletePattern(`session:${userId}:*`)                    │
│                                                                       │
│ 5. Delete reset token                                                │
│    └─> VerificationRepository.delete(token.id)                       │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true } → Redirect to login
└─────────┘
```

---

## 6. Token Refresh Flow

```
┌─────────┐
│  Client │ (Access token expired)
└────┬────┘
     │
     │ POST /auth/refresh
     │ { refreshToken }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Verify refresh token (JWT)                                        │
│    └─> payload = jwtService.verify(refreshToken)                     │
│                                                                       │
│ 2. Find session                                                      │
│    └─> session = SessionRepository.findByToken(refreshToken)         │
│    └─> if (!session || session.expiresAt < now) throw Unauthorized   │
│                                                                       │
│ 3. Generate new access token                                         │
│    └─> accessToken = jwtService.sign(payload, { expiresIn: '15m' })  │
│                                                                       │
│ 4. Optionally rotate refresh token                                   │
│    └─> newRefreshToken = jwtService.sign(payload, { expiresIn:'7d'}) │
│    └─> SessionRepository.update({ token: newRefreshToken })          │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { accessToken, refreshToken }
└─────────┘
```

---

## 7. Logout Flow

```
┌─────────┐
│  Client │ (Authenticated)
└────┬────┘
     │
     │ POST /auth/logout
     │ Authorization: Bearer <accessToken>
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Extract user from JWT                                             │
│    └─> user = jwtService.verify(accessToken)                         │
│                                                                       │
│ 2. Find and delete session                                           │
│    └─> session = SessionRepository.findByUserId(user.id)             │
│    └─> SessionRepository.delete(session.id)                          │
│                                                                       │
│ 3. Delete from Redis cache                                           │
│    └─> Redis.deleteSession(session.id)                               │
│                                                                       │
│ 4. Blacklist access token (optional, for strict security)            │
│    └─> Redis.set(`blacklist:${accessToken}`, '1',                    │
│                    ttl: 15min) // Until token expires naturally       │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true }
└─────────┘
```

---

## 8. OAuth Flow (Google Example)

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ GET /auth/oauth/google
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate OAuth authorization URL                                  │
│    └─> url = oauthClient.generateAuthUrl({                           │
│           scope: ['openid', 'email', 'profile'],                     │
│           redirect_uri: 'http://localhost:3004/auth/oauth/google/cb' │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← Redirect to Google OAuth (user consents)
└─────────┘
     │
     │ Google redirects back with code
     │
     │ GET /auth/oauth/google/callback?code=xxx
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AuthService                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Exchange code for tokens                                          │
│    └─> tokens = oauthClient.getToken(code)                           │
│                                                                       │
│ 2. Get user profile from Google                                      │
│    └─> profile = oauthClient.getUserInfo(tokens.access_token)        │
│                                                                       │
│ 3. Find or create user                                               │
│    └─> user = UserRepository.findByEmail(profile.email)              │
│    └─> if (!user) user = UserRepository.create({                     │
│           email: profile.email,                                      │
│           name: profile.name,                                        │
│           emailVerified: true, // Google verified                    │
│           avatar: profile.picture                                    │
│        })                                                             │
│                                                                       │
│ 4. Link OAuth account                                                │
│    └─> AccountRepository.create({                                    │
│           userId: user.id,                                           │
│           provider: 'google',                                        │
│           providerAccountId: profile.sub,                            │
│           accessToken: tokens.access_token,                          │
│           refreshToken: tokens.refresh_token                         │
│        })                                                             │
│                                                                       │
│ 5. Generate JWT tokens & create session                              │
│    └─> { accessToken, refreshToken }                                 │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { accessToken, refreshToken, user }
└─────────┘
```

---

## Security Considerations

### Token Lifetimes

- **Access Token**: 15 minutes (short-lived)
- **Refresh Token**: 7 days (long-lived, stored in session)
- **Verification Token**: 24 hours (email verification)
- **Password Reset Token**: 1 hour (security-sensitive)
- **2FA Window**: ±60 seconds (2 time steps)

### Session Management

- Sessions stored in both MongoDB (persistent) and Redis (cache)
- Session invalidation on password change
- Logout invalidates current session only
- Optional: "Logout all devices" invalidates all user sessions

### Rate Limiting

Applied to all authentication endpoints to prevent brute force attacks.

---

## Related Documentation

- [Security Best Practices](./SECURITY.md)
- [API Reference](./API.md)
- [Authentication Package README](../README.md)
