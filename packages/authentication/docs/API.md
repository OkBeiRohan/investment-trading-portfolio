# API Reference - Authentication Package

Complete API endpoint documentation for better-auth integration.

---

## Overview

**Base URL**: `/api/auth` (configured in BetterAuthModule)

All authentication endpoints are provided automatically by **better-auth**. No custom endpoint implementations needed.

**Authentication**: Most endpoints require session cookie (`better-auth.session_token`)

**Rate Limiting**: Built-in rate limiting applied per endpoint (see limits below)

---

## Core Authentication

### Sign Up (Email)

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created)**:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "createdAt": "2024-12-12T10:00:00Z"
  },
  "session": {
    "id": "ses_456",
    "userId": "usr_123",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Rate Limit**: 3 requests / hour

---

### Sign In (Email)

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true
  },
  "session": {
    "id": "ses_789",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Response (200 OK - 2FA Required)**:

```json
{
  "requiresTwoFactor": true,
  "tempToken": "tmp_abc123"
}
```

**Rate Limit**: 5 requests / minute

---

### Sign Out

```http
POST /api/auth/sign-out
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 100 requests / minute

---

### Get Session

```http
GET /api/auth/get-session
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "role": "user",
    "isActive": true
  },
  "session": {
    "id": "ses_789",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Response (401 Unauthorized)**: If session invalid or expired

**Rate Limit**: 100 requests / minute

---

## OAuth (Social Sign-On)

### Initiate Social Login

```http
GET /api/auth/sign-in/social/google
GET /api/auth/sign-in/social/github
GET /api/auth/sign-in/social/discord
```

**Response**: 302 Redirect to OAuth provider

**Callback**: `GET /api/auth/callback/{provider}` (handled automatically)

**Rate Limit**: 10 requests / minute

---

## Password Management

### Forgot Password

```http
POST /api/auth/forget-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Rate Limit**: 3 requests / 15 minutes

---

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 5 requests / minute

---

### Change Password

```http
POST /api/auth/change-password
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 5 requests / minute

---

## Email Verification

### Verify Email

```http
GET /api/auth/verify-email?token=xxx
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Response (400 Bad Request)**: If token invalid or expired

**Rate Limit**: 10 requests / minute

---

### Resend Verification Email

```http
POST /api/auth/resend-verification-email
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 3 requests / hour

---

## User Management

### Update User

```http
POST /api/auth/update-user
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "name": "Jane Doe",
  "image": "https://example.com/avatar.jpg"
}
```

**Response (200 OK)**:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Jane Doe",
    "image": "https://example.com/avatar.jpg"
  }
}
```

**Rate Limit**: 10 requests / minute

---

### Change Email

```http
POST /api/auth/change-email
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "newEmail": "newemail@example.com"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Verification email sent to new address"
}
```

**Rate Limit**: 3 requests / hour

---

## Two-Factor Authentication

### Enable 2FA

```http
POST /api/auth/two-factor/enable
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": [
    "ABC123XYZ",
    "DEF456UVW",
    ...
  ]
}
```

**Rate Limit**: 5 requests / minute

---

### Verify 2FA Code

```http
POST /api/auth/two-factor/verify
Content-Type: application/json

{
  "code": "123456",
  "tempToken": "tmp_abc123"
}
```

**Response (200 OK)**:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "session": {
    "id": "ses_789",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Rate Limit**: 5 requests / minute

---

### Disable 2FA

```http
POST /api/auth/two-factor/disable
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "password": "UserPassword123!"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 5 requests / minute

---

## Passkeys (WebAuthn)

### Register Passkey (Start)

```http
POST /api/auth/passkey/register
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "challenge": "randomBase64Challenge",
  "rp": {
    "name": "Trading App",
    "id": "yourdomain.com"
  },
  "user": {
    "id": "usr_123",
    "name": "user@example.com",
    "displayName": "John Doe"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ]
}
```

**Usage**: Pass to `navigator.credentials.create()`

**Rate Limit**: 10 requests / minute

---

### Register Passkey (Finish)

```http
POST /api/auth/passkey/register
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "credential": { /* WebAuthn credential from browser */ }
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "passkeyId": "pk_789"
}
```

**Rate Limit**: 10 requests / minute

---

### Authenticate with Passkey (Start)

```http
POST /api/auth/passkey/authenticate
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**:

```json
{
  "challenge": "randomBase64Challenge",
  "allowCredentials": [
    {
      "id": "credentialId1",
      "type": "public-key"
    }
  ]
}
```

**Usage**: Pass to `navigator.credentials.get()`

**Rate Limit**: 10 requests / minute

---

### Authenticate with Passkey (Finish)

```http
POST /api/auth/passkey/authenticate
Content-Type: application/json

{
  "assertion": { /* WebAuthn assertion from browser */ }
}
```

**Response (200 OK)**:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "session": {
    "id": "ses_789",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Rate Limit**: 10 requests / minute

---

### List Passkeys

```http
GET /api/auth/passkey/list
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "passkeys": [
    {
      "id": "pk_789",
      "name": "MacBook Pro TouchID",
      "createdAt": "2024-12-01T10:00:00Z"
    },
    {
      "id": "pk_790",
      "name": "YubiKey 5",
      "createdAt": "2024-12-05T14:30:00Z"
    }
  ]
}
```

**Rate Limit**: 100 requests / minute

---

### Delete Passkey

```http
DELETE /api/auth/passkey/delete
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "passkeyId": "pk_789"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Rate Limit**: 10 requests / minute

---

## Magic Link (Passwordless)

### Send Magic Link

```http
POST /api/auth/sign-in/magic-link
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

**Rate Limit**: 3 requests / 15 minutes

---

### Verify Magic Link

```http
GET /api/auth/magic-link/verify?token=xxx
```

**Response**: 302 Redirect to app with session cookie set

**Rate Limit**: 10 requests / minute

---

## Phone Number Verification

### Send OTP

```http
POST /api/auth/phone-number/send-otp
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "OTP sent to +919876543210"
}
```

**Rate Limit**: 3 requests / 15 minutes

---

### Verify OTP

```http
POST /api/auth/phone-number/verify
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "user": {
    "phoneNumber": "+919876543210",
    "phoneNumberVerified": true
  }
}
```

**Rate Limit**: 5 requests / minute

---

## Organization Management

### Create Organization

```http
POST /api/auth/organization/create
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "name": "Acme Trading",
  "slug": "acme-trading"
}
```

**Response (201 Created)**:

```json
{
  "organization": {
    "id": "org_123",
    "name": "Acme Trading",
    "slug": "acme-trading",
    "createdAt": "2024-12-12T10:00:00Z"
  },
  "role": "owner"
}
```

**Rate Limit**: 5 requests / hour

---

### List Organizations

```http
GET /api/auth/organization/list
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "organizations": [
    {
      "id": "org_123",
      "name": "Acme Trading",
      "slug": "acme-trading",
      "role": "owner"
    },
    {
      "id": "org_456",
      "name": "Beta Corp",
      "slug": "beta-corp",
      "role": "member"
    }
  ]
}
```

**Rate Limit**: 100 requests / minute

---

### Get Organization

```http
GET /api/auth/organization/get-full-organization?organizationId=org_123
Cookie: better-auth.session_token=xxx
```

**Response (200 OK)**:

```json
{
  "organization": {
    "id": "org_123",
    "name": "Acme Trading",
    "slug": "acme-trading"
  },
  "members": [
    {
      "id": "mem_789",
      "userId": "usr_123",
      "role": "owner",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "id": "mem_790",
      "userId": "usr_456",
      "role": "admin",
      "user": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    }
  ],
  "invitations": [
    {
      "id": "inv_111",
      "email": "bob@example.com",
      "role": "member",
      "status": "pending"
    }
  ]
}
```

**Rate Limit**: 100 requests / minute

---

### Update Organization

```http
POST /api/auth/organization/update
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_123",
  "name": "Acme Trading Inc."
}
```

**Response (200 OK)**:

```json
{
  "organization": {
    "id": "org_123",
    "name": "Acme Trading Inc.",
    "slug": "acme-trading"
  }
}
```

**Permission**: Owner or Admin

**Rate Limit**: 10 requests / minute

---

### Delete Organization

```http
DELETE /api/auth/organization/delete
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_123"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Permission**: Owner only

**Rate Limit**: 5 requests / hour

---

### Set Active Organization

```http
POST /api/auth/organization/set-active
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_456"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "activeOrganizationId": "org_456"
}
```

**Rate Limit**: 100 requests / minute

---

### Invite Member

```http
POST /api/auth/organization/invite-member
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_123",
  "email": "bob@example.com",
  "role": "member"
}
```

**Response (200 OK)**:

```json
{
  "invitation": {
    "id": "inv_111",
    "email": "bob@example.com",
    "role": "member",
    "expiresAt": "2024-12-19T10:00:00Z"
  }
}
```

**Permission**: Owner or Admin

**Rate Limit**: 10 requests / hour

---

### Accept Invitation

```http
POST /api/auth/organization/accept-invitation
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "invitationId": "inv_111"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "membership": {
    "organizationId": "org_123",
    "role": "member"
  }
}
```

**Rate Limit**: 10 requests / minute

---

### Revoke Invitation

```http
POST /api/auth/organization/revoke-invitation
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "invitationId": "inv_111"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Permission**: Owner or Admin

**Rate Limit**: 10 requests / minute

---

### Remove Member

```http
POST /api/auth/organization/remove-member
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_123",
  "userId": "usr_456"
}
```

**Response (200 OK)**:

```json
{
  "success": true
}
```

**Permission**: Owner or Admin (cannot remove owner)

**Rate Limit**: 10 requests / minute

---

### Update Member Role

```http
POST /api/auth/organization/update-member-role
Cookie: better-auth.session_token=xxx
Content-Type: application/json

{
  "organizationId": "org_123",
  "userId": "usr_456",
  "role": "admin"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "member": {
    "userId": "usr_456",
    "role": "admin"
  }
}
```

**Permission**: Owner only

**Rate Limit**: 10 requests / minute

---

## Error Responses

All endpoints may return error responses:

### 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "statusCode": 400
}
```

**Common Codes**:

- `VALIDATION_ERROR`: Invalid input data
- `INVALID_TOKEN`: Token expired or invalid
- `WEAK_PASSWORD`: Password doesn't meet requirements

---

### 401 Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid credentials",
  "statusCode": 401
}
```

**Common Codes**:

- `INVALID_CREDENTIALS`: Wrong email/password
- `SESSION_EXPIRED`: Session token expired
- `EMAIL_NOT_VERIFIED`: Email verification required

---

### 403 Forbidden

```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions",
  "statusCode": 403
}
```

**Common Codes**:

- `INSUFFICIENT_PERMISSIONS`: Missing required role
- `ORGANIZATION_ACCESS_DENIED`: Not a member

---

### 409 Conflict

```json
{
  "error": "USER_EXISTS",
  "message": "User with this email already exists",
  "statusCode": 409
}
```

**Common Codes**:

- `USER_EXISTS`: Email already registered
- `ORGANIZATION_SLUG_EXISTS`: Slug already taken

---

### 429 Too Many Requests

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later",
  "statusCode": 429,
  "retryAfter": 60
}
```

---

### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## Client Usage Examples

### React (Next.js)

```typescript
'use client';
import { useAuth } from '@repo/auth-client';

export default function LoginForm() {
  const { signIn, signUp, signOut, user } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await signIn.email({ email, password });
    if (error) {
      console.error('Login failed:', error.message);
    } else {
      console.log('Logged in:', data.user);
    }
  };

  return (
    <div>
      {user ? (
        <button onClick={() => signOut()}>Sign Out</button>
      ) : (
        <button onClick={() => handleLogin('user@example.com', 'pass')}>
          Sign In
        </button>
      )}
    </div>
  );
}
```

---

### NestJS (Server-Side)

```typescript
import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import {
  AuthGuard,
  CurrentUser,
  Roles,
  RolesGuard,
} from "@repo/authentication";

@Controller("profile")
@UseGuards(AuthGuard, RolesGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Post("update")
  updateProfile(@CurrentUser() user: User, @Body() data: UpdateProfileDto) {
    // Update logic
  }

  @Delete("admin-only")
  @Roles("admin")
  dangerousAction(@CurrentUser() user: User) {
    // Only admins can access
  }
}
```

---

## Related Documentation

- [Authentication Flows](./FLOWS.md) - Flow diagrams with timing
- [Security Best Practices](./SECURITY.md) - Security features
- [Architecture](./ARCHITECTURE.md) - System architecture
- [better-auth API Docs](https://better-auth.com/docs/api) - Upstream documentation
