# Authentication Flows

> **Last Updated**: March 17, 2026

Complete visual documentation of authentication flows using **better-auth**.

---

## Overview

All authentication flows are handled automatically by **better-auth**. This document shows what happens behind the scenes when users authenticate.

**Key Points**:

- better-auth handles all authentication logic
- No custom code needed for standard flows
- Automatic security best practices
- Built-in rate limiting and CSRF protection
- Flexible plugin system for advanced features

---

## 1. Email & Password Authentication

### Registration Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/sign-up/email
     │ { email, password, name }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate input (email format, password strength)                 │
│                                                                       │
│ 2. Check if user exists                                              │
│    └─> if exists: return error                                       │
│                                                                       │
│ 3. Hash password with bcrypt (12 rounds)                             │
│    └─> bcrypt.hash(password, 12)                                     │
│                                                                       │
│ 4. Create user in MongoDB                                            │
│    └─> users.create({ email, password: hash, name })                 │
│                                                                       │
│ 5. Generate verification token (if email verification enabled)       │
│    └─> crypto.randomBytes(32).toString('hex')                        │
│                                                                       │
│ 6. Store verification in database                                    │
│    └─> verifications.create({ userId, token, expiresAt })            │
│                                                                       │
│ 7. Send verification email via EmailService                          │
│    └─> emailService.sendVerificationEmail({ user, url, token })      │
│                                                                       │
│ 8. Create session                                                    │
│    └─> sessions.create({ userId, expiresAt })                        │
│                                                                       │
│ 9. Set secure httpOnly cookie                                        │
│    └─> Set-Cookie: better-auth.session_token=xxx; HttpOnly; Secure  │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { user, session }
└─────────┘
```

**Timeline**: ~200-500ms

---

### Login Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/sign-in/email
     │ { email, password }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user by email                                                │
│    └─> users.findOne({ email })                                      │
│    └─> if not found: return 401                                      │
│                                                                       │
│ 2. Verify password                                                   │
│    └─> bcrypt.compare(password, user.password)                       │
│    └─> if invalid: return 401                                        │
│                                                                       │
│ 3. Check if email is verified (if required)                          │
│    └─> if (!user.emailVerified): return error                        │
│                                                                       │
│ 4. Check if 2FA is enabled                                           │
│    └─> if (user.twoFactorEnabled):                                   │
│        return { requiresTwoFactor: true, userId }                    │
│                                                                       │
│ 5. Create session                                                    │
│    └─> sessions.create({ userId, expiresAt: now + 7 days })          │
│                                                                       │
│ 6. Set secure httpOnly cookie                                        │
│    └─> Set-Cookie: better-auth.session_token=xxx                     │
│                                                                       │
│ 7. Update lastLoginAt                                                │
│    └─> users.update({ _id: userId }, { lastLoginAt: now })           │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { user, session }
└─────────┘
```

**Timeline**: ~100-300ms

---

## 2. Social Sign-On (OAuth)

### Google OAuth Flow

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ GET /api/auth/sign-in/social/google
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate OAuth state (CSRF protection)                            │
│    └─> state = crypto.randomBytes(16).toString('hex')                │
│                                                                       │
│ 2. Generate PKCE challenge (OAuth 2.1 security)                      │
│    └─> code_verifier, code_challenge                                 │
│                                                                       │
│ 3. Store state in session                                            │
│    └─> sessions.create({ state, code_verifier, provider: 'google' }) │
│                                                                       │
│ 4. Build Google OAuth URL                                            │
│    └─> https://accounts.google.com/o/oauth2/v2/auth?                 │
│        client_id=...&redirect_uri=...&state=...&code_challenge=...   │
└─────────────────────────────────────────────────────────────────────┘
     │
     │ 302 Redirect to Google
     ▼
┌───────────────┐
│ Google OAuth  │ User consents, grants permissions
└───────┬───────┘
        │
        │ 302 Redirect with code
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GET /api/auth/callback/google                     │
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate state parameter (prevent CSRF)                           │
│    └─> if (state !== stored_state): return error                     │
│                                                                       │
│ 2. Exchange authorization code for tokens                            │
│    └─> POST https://oauth2.googleapis.com/token                      │
│        { code, client_id, client_secret, code_verifier }             │
│    └─> returns { access_token, refresh_token, id_token }             │
│                                                                       │
│ 3. Fetch user profile from Google                                    │
│    └─> GET https://www.googleapis.com/oauth2/v1/userinfo             │
│        Authorization: Bearer {access_token}                           │
│    └─> returns { id, email, name, picture }                          │
│                                                                       │
│ 4. Find or create user                                               │
│    └─> user = users.findOne({ email })                               │
│    └─> if not found:                                                 │
│        user = users.create({ email, name, image: picture })          │
│                                                                       │
│ 5. Create or update OAuth account                                    │
│    └─> accounts.upsert({                                             │
│          userId, provider: 'google', providerId: google_id,          │
│          access_token, refresh_token                                 │
│        })                                                             │
│                                                                       │
│ 6. Create session                                                    │
│    └─> sessions.create({ userId, expiresAt })                        │
│                                                                       │
│ 7. Set secure cookie                                                 │
│    └─> Set-Cookie: better-auth.session_token=xxx                     │
└─────────────────────────────────────────────────────────────────────┘
     │
     │ 302 Redirect to app
     ▼
┌─────────┐
│  Client │ ← Authenticated (cookie set)
└─────────┘
```

**Timeline**: ~2-5 seconds (includes user consent)

**Supported Providers**: Google, GitHub, Discord, Apple, Facebook, Twitter, and 40+ more

---

## 3. Magic Link (Passwordless)

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/sign-in/magic-link
     │ { email }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user by email                                                │
│    └─> user = users.findOne({ email })                               │
│    └─> if not found: create user                                     │
│                                                                       │
│ 2. Generate secure token                                             │
│    └─> token = crypto.randomBytes(32).toString('hex')                │
│                                                                       │
│ 3. Store token with expiry (15 minutes)                              │
│    └─> verifications.create({                                        │
│          userId, token, type: 'magic-link',                          │
│          expiresAt: now + 15 minutes                                 │
│        })                                                             │
│                                                                       │
│ 4. Send email with magic link                                        │
│    └─> emailService.sendMagicLink({                                  │
│          email, url: `/api/auth/magic-link/verify?token=xxx`         │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true, message: "Check your email" }
└─────────┘


─── User clicks email link ───


┌─────────┐
│  Client │ GET /api/auth/magic-link/verify?token=xxx
└────┬────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find verification token                                           │
│    └─> verification = verifications.findOne({ token })               │
│    └─> if not found or expired: return error                         │
│                                                                       │
│ 2. Delete verification token (one-time use)                          │
│    └─> verifications.deleteOne({ _id: verification._id })            │
│                                                                       │
│ 3. Create session                                                    │
│    └─> sessions.create({ userId: verification.userId })              │
│                                                                       │
│ 4. Set secure cookie                                                 │
│    └─> Set-Cookie: better-auth.session_token=xxx                     │
└─────────────────────────────────────────────────────────────────────┘
     │
     │ 302 Redirect to app
     ▼
┌─────────┐
│  Client │ ← Authenticated
└─────────┘
```

**Timeline**:

- Send link: ~100-200ms
- Verify link: ~100-300ms

---

## 4. Passkey (WebAuthn)

### Passkey Registration

```
┌─────────┐
│  Client │ (Authenticated user)
└────┬────┘
     │
     │ POST /api/auth/passkey/register
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate WebAuthn registration options                            │
│    └─> challenge = crypto.randomBytes(32)                            │
│    └─> options = {                                                   │
│          challenge: base64url(challenge),                            │
│          rp: { name: "Trading App", id: "yourdomain.com" },          │
│          user: { id: userId, name: email, displayName: name },       │
│          pubKeyCredParams: [                                         │
│            { type: "public-key", alg: -7 },  // ES256                │
│            { type: "public-key", alg: -257 } // RS256                │
│          ],                                                           │
│          authenticatorSelection: {                                   │
│            residentKey: "preferred",                                 │
│            userVerification: "preferred"                             │
│          },                                                           │
│          timeout: 60000                                              │
│        }                                                              │
│                                                                       │
│ 2. Store challenge in session (for verification)                     │
│    └─> sessions.update({ userId }, { passkeyChallenge: challenge })  │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { options }
└────┬────┘
     │
     │ navigator.credentials.create({ publicKey: options })
     │ (Browser prompts for biometric / security key)
     ▼
┌─────────────┐
│   Browser   │ User authenticates with fingerprint/Face ID
└─────┬───────┘
      │
      │ Returns credential
      ▼
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/passkey/register (with credential)
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Verify credential                                                 │
│    └─> Validate challenge matches stored value                       │
│    └─> Verify signature                                              │
│    └─> Verify origin                                                 │
│                                                                       │
│ 2. Store passkey in database                                         │
│    └─> passkeys.create({                                             │
│          userId, credentialId, publicKey, counter,                   │
│          transports: ['internal', 'usb', 'nfc', 'ble']               │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true }
└─────────┘
```

### Passkey Authentication

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/passkey/authenticate
     │ { email }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find user by email                                                │
│    └─> user = users.findOne({ email })                               │
│                                                                       │
│ 2. Get user's passkeys                                               │
│    └─> passkeys = passkeys.find({ userId })                          │
│    └─> if no passkeys: return error                                  │
│                                                                       │
│ 3. Generate WebAuthn authentication options                          │
│    └─> challenge = crypto.randomBytes(32)                            │
│    └─> options = {                                                   │
│          challenge: base64url(challenge),                            │
│          rpId: "yourdomain.com",                                     │
│          allowCredentials: passkeys.map(pk => ({                     │
│            id: pk.credentialId,                                      │
│            type: "public-key"                                        │
│          })),                                                         │
│          userVerification: "preferred",                              │
│          timeout: 60000                                              │
│        }                                                              │
│                                                                       │
│ 4. Store challenge                                                   │
│    └─> store challenge for verification                              │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { options }
└────┬────┘
     │
     │ navigator.credentials.get({ publicKey: options })
     ▼
┌─────────────┐
│   Browser   │ User authenticates
└─────┬───────┘
      │
      ▼
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/passkey/authenticate (with assertion)
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Find passkey by credential ID                                     │
│    └─> passkey = passkeys.findOne({ credentialId })                  │
│                                                                       │
│ 2. Verify assertion                                                  │
│    └─> Validate challenge                                            │
│    └─> Verify signature using stored public key                      │
│    └─> Check counter (prevent replay attacks)                        │
│    └─> Verify origin                                                 │
│                                                                       │
│ 3. Update passkey counter                                            │
│    └─> passkeys.update({ credentialId }, { counter: newCounter })    │
│                                                                       │
│ 4. Create session                                                    │
│    └─> sessions.create({ userId, expiresAt })                        │
│                                                                       │
│ 5. Set secure cookie                                                 │
│    └─> Set-Cookie: better-auth.session_token=xxx                     │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { user, session }
└─────────┘
```

**Timeline**: ~500-2000ms (depends on biometric speed)

---

## 5. Two-Factor Authentication

### Enable 2FA

```
┌─────────┐
│  Client │ (Authenticated user)
└────┬────┘
     │
     │ POST /api/auth/two-factor/enable
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Generate TOTP secret                                              │
│    └─> secret = crypto.randomBytes(20).toString('base32')            │
│                                                                       │
│ 2. Create otpauth URL                                                │
│    └─> url = `otpauth://totp/TradingApp:${email}?                    │
│               secret=${secret}&issuer=TradingApp`                    │
│                                                                       │
│ 3. Generate QR code                                                  │
│    └─> qrCode = await QRCode.toDataURL(url)                          │
│                                                                       │
│ 4. Store secret (not yet enabled)                                    │
│    └─> twoFactors.create({                                           │
│          userId, secret, enabled: false                              │
│        })                                                             │
│                                                                       │
│ 5. Generate backup codes                                             │
│    └─> codes = Array(10).fill().map(() => randomBytes(8).toString()) │
│    └─> hash backup codes with bcrypt                                 │
│    └─> twoFactors.update({ userId }, { backupCodes: hashedCodes })   │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { secret, qrCode, backupCodes }
└────┬────┘
     │
     │ User scans QR code with Google Authenticator / Authy
     │
     │ POST /api/auth/two-factor/verify
     │ { code: "123456" }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Get user's 2FA config                                             │
│    └─> twoFactor = twoFactors.findOne({ userId })                    │
│                                                                       │
│ 2. Verify TOTP code                                                  │
│    └─> valid = speakeasy.totp.verify({                               │
│          secret: twoFactor.secret,                                   │
│          encoding: 'base32',                                         │
│          token: code,                                                │
│          window: 1 // ±30 seconds tolerance                          │
│        })                                                             │
│    └─> if invalid: return error                                      │
│                                                                       │
│ 3. Enable 2FA                                                        │
│    └─> twoFactors.update({ userId }, { enabled: true })              │
│    └─> users.update({ _id: userId }, { twoFactorEnabled: true })     │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true }
└─────────┘
```

### Login with 2FA

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/sign-in/email
     │ { email, password }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate credentials (see Login Flow above)                       │
│                                                                       │
│ 2. Check if 2FA enabled                                              │
│    └─> if (user.twoFactorEnabled):                                   │
│        Create temporary token, return { requiresTwoFactor: true }    │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { requiresTwoFactor: true, tempToken }
└────┬────┘
     │
     │ Prompt user for 2FA code
     │
     │ POST /api/auth/two-factor/verify
     │ { code: "123456", tempToken }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Verify temp token                                                 │
│    └─> Validate tempToken hasn't expired (5 minutes)                 │
│                                                                       │
│ 2. Verify TOTP code                                                  │
│    └─> valid = speakeasy.totp.verify({...})                          │
│    └─> if invalid: check backup codes                                │
│                                                                       │
│ 3. If valid, create session                                          │
│    └─> sessions.create({ userId, expiresAt })                        │
│                                                                       │
│ 4. Set secure cookie                                                 │
│    └─> Set-Cookie: better-auth.session_token=xxx                     │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { user, session }
└─────────┘
```

**Timeline**:

- Enable 2FA: ~100-200ms
- Login with 2FA: ~200-400ms

---

## 6. Session Management

### Get Session

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ GET /api/auth/get-session
     │ Cookie: better-auth.session_token=xxx
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Extract session token from cookie                                 │
│    └─> token = cookies['better-auth.session_token']                  │
│                                                                       │
│ 2. Find session in database                                          │
│    └─> session = sessions.findOne({ token })                         │
│    └─> if not found: return 401                                      │
│                                                                       │
│ 3. Check if expired                                                  │
│    └─> if (session.expiresAt < now): return 401                      │
│                                                                       │
│ 4. Get user data                                                     │
│    └─> user = users.findOne({ _id: session.userId })                 │
│                                                                       │
│ 5. Auto-refresh session if nearing expiry                            │
│    └─> if (session.expiresAt - now < 1 day):                         │
│        sessions.update({ _id: session._id }, {                       │
│          expiresAt: now + 7 days                                     │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { user, session }
└─────────┘
```

### Logout

```
┌─────────┐
│  Client │
└────┬────┘
     │
     │ POST /api/auth/sign-out
     │ Cookie: better-auth.session_token=xxx
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Extract session token                                             │
│    └─> token = cookies['better-auth.session_token']                  │
│                                                                       │
│ 2. Delete session from database                                      │
│    └─> sessions.deleteOne({ token })                                 │
│                                                                       │
│ 3. Clear cookie                                                      │
│    └─> Set-Cookie: better-auth.session_token=; Max-Age=0             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true }
└─────────┘
```

**Timeline**:

- Get session: ~50-100ms
- Logout: ~50-100ms

---

## 7. Organization Management

### Create Organization

```
┌─────────┐
│  Client │ (Authenticated user)
└────┬────┘
     │
     │ POST /api/auth/organization/create
     │ { name, slug }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth (organization plugin)            │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate input                                                    │
│    └─> Check slug is unique                                          │
│    └─> Check slug format (alphanumeric + hyphens)                    │
│                                                                       │
│ 2. Create organization                                               │
│    └─> organizations.create({                                        │
│          name, slug, createdAt, ownerId: userId                      │
│        })                                                             │
│                                                                       │
│ 3. Add user as owner                                                 │
│    └─> members.create({                                              │
│          organizationId, userId, role: 'owner', joinedAt             │
│        })                                                             │
│                                                                       │
│ 4. Set as active organization                                        │
│    └─> sessions.update({ userId }, {                                 │
│          activeOrganizationId: organizationId                        │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { organization, role: 'owner' }
└─────────┘
```

### Invite Member

```
┌─────────┐
│  Client │ (Authenticated organization admin)
└────┬────┘
     │
     │ POST /api/auth/organization/invite-member
     │ { organizationId, email, role }
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         better-auth (organization plugin)            │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Check permissions                                                 │
│    └─> member = members.findOne({ organizationId, userId })          │
│    └─> if (member.role !== 'owner' && member.role !== 'admin'):      │
│        return 403                                                    │
│                                                                       │
│ 2. Check if user already member                                      │
│    └─> existing = members.findOne({ organizationId, email })         │
│    └─> if exists: return error                                       │
│                                                                       │
│ 3. Generate invitation token                                         │
│    └─> token = crypto.randomBytes(32).toString('hex')                │
│                                                                       │
│ 4. Create invitation                                                 │
│    └─> invitations.create({                                          │
│          organizationId, email, role, token,                         │
│          invitedBy: userId, expiresAt: now + 7 days                  │
│        })                                                             │
│                                                                       │
│ 5. Send invitation email                                             │
│    └─> emailService.sendInvitationEmail({                            │
│          email, organizationName, inviterName,                       │
│          invitationLink: `/api/auth/organization/accept?token=xxx`,  │
│          role                                                         │
│        })                                                             │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────┐
│  Client │ ← { success: true, invitation }
└─────────┘
```

**Timeline**:

- Create organization: ~100-200ms
- Invite member: ~200-400ms

---

## Security Features

All flows include automatic security:

1. **Rate Limiting**: All endpoints have built-in rate limits
2. **CSRF Protection**: State parameters, PKCE for OAuth
3. **XSS Protection**: httpOnly cookies, no tokens in localStorage
4. **SQL Injection**: Parameterized queries, ORM protection
5. **Timing Attacks**: Constant-time comparisons for tokens
6. **Brute Force**: Account lockout after failed attempts
7. **Session Fixation**: New session ID on login
8. **Replay Attacks**: Challenge/response for passkeys, counter tracking

---

## Error Handling

better-auth returns standardized error responses:

```typescript
{
  error: string; // Error code: "INVALID_CREDENTIALS", "RATE_LIMIT_EXCEEDED"
  message: string; // Human-readable message
  statusCode: number; // HTTP status code
}
```

**Common errors**:

- `401 Unauthorized`: Invalid credentials, expired session
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: User already exists, duplicate email
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Related Documentation

- [Security Best Practices](./SECURITY.md) - Security features and guidelines
- [API Reference](./API.md) - Complete API endpoint documentation
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [better-auth Official Docs](https://better-auth.com/docs) - Upstream documentation
