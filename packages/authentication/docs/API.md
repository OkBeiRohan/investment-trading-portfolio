# API Reference - Authentication Package

Complete API documentation for the `@repo/authentication` package.

---

## Base URL

```
http://localhost:3004/auth  # Development
https://api.yourdomain.com/auth  # Production
```

---

## Authentication

### Register

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:

```typescript
{
  email: string; // Valid email address
  password: string; // Min 12 chars, mixed case, number, special char
  name: string; // User's display name
}
```

**Response** (201 Created):

```typescript
{
  success: true;
  message: "Registration successful. Please check your email to verify your account.";
}
```

**Errors**:

- `400 Bad Request`: Invalid input (email format, weak password)
- `409 Conflict`: User with this email already exists
- `429 Too Many Requests`: Rate limit exceeded (3 per hour)

---

### Verify Email

Verify user's email address with token from email.

**Endpoint**: `GET /auth/verify-email`

**Query Parameters**:

```typescript
{
  token: string; // Verification token from email
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Email verified successfully. You can now log in.";
}
```

**Errors**:

- `400 Bad Request`: Invalid or expired token
- `404 Not Found`: Token not found

---

### Login

Authenticate user with email and password.

**Endpoint**: `POST /auth/login`

**Request Body**:

```typescript
{
  email: string;
  password: string;
}
```

**Response** (200 OK):

_Without 2FA_:

```typescript
{
  accessToken: string; // JWT, expires in 15 minutes
  refreshToken: string; // JWT, expires in 7 days
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    createdAt: Date;
  }
}
```

_With 2FA_:

```typescript
{
  requiresTwoFactor: true;
  userId: string; // Use this for 2FA verification
}
```

**Errors**:

- `401 Unauthorized`: Invalid credentials or email not verified
- `429 Too Many Requests`: Rate limit exceeded (5 per minute)

---

### Refresh Token

Get a new access token using refresh token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:

```typescript
{
  refreshToken: string;
}
```

**Response** (200 OK):

```typescript
{
  accessToken: string;
  refreshToken: string; // New refresh token (optional, if rotating)
}
```

**Errors**:

- `401 Unauthorized`: Invalid or expired refresh token
- `404 Not Found`: Session not found

---

### Logout

Invalidate current session.

**Endpoint**: `POST /auth/logout`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Logged out successfully";
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token

---

### Get Current User

Get authenticated user's profile.

**Endpoint**: `GET /auth/me`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token

---

## Password Management

### Forgot Password

Request password reset email.

**Endpoint**: `POST /auth/forgot-password`

**Request Body**:

```typescript
{
  email: string;
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "If an account exists with this email, a password reset link has been sent.";
}
```

**Note**: Response is same whether email exists or not (security: don't reveal user existence)

**Errors**:

- `429 Too Many Requests`: Rate limit exceeded (3 per 15 minutes)

---

### Reset Password

Reset password with token from email.

**Endpoint**: `POST /auth/reset-password`

**Request Body**:

```typescript
{
  token: string; // Reset token from email
  newPassword: string; // Min 12 chars, mixed case, number, special char
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Password reset successfully. Please log in with your new password.";
}
```

**Errors**:

- `400 Bad Request`: Invalid token, weak password, or expired token
- `404 Not Found`: Token not found

---

### Change Password

Change password for authenticated user.

**Endpoint**: `POST /auth/change-password`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  oldPassword: string;
  newPassword: string;
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Password changed successfully. All sessions have been invalidated.";
}
```

**Errors**:

- `400 Bad Request`: Weak new password
- `401 Unauthorized`: Invalid old password or missing token
- `429 Too Many Requests`: Rate limit exceeded

---

## Two-Factor Authentication (2FA)

### Enable 2FA

Generate QR code for authenticator app.

**Endpoint**: `POST /auth/2fa/enable`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  secret: string;  // Base32 encoded secret (for manual entry)
  qrCode: string;  // Data URL of QR code image
  backupCodes: string[];  // Array of 10 backup codes
}
```

**Note**: Save backup codes securely. They are shown only once.

**Errors**:

- `401 Unauthorized`: Invalid or missing access token
- `409 Conflict`: 2FA already enabled

---

### Verify 2FA

Verify TOTP code and enable 2FA.

**Endpoint**: `POST /auth/2fa/verify`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  code: string; // 6-digit TOTP code from authenticator app
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Two-factor authentication enabled successfully.";
}
```

**Errors**:

- `400 Bad Request`: Invalid code
- `401 Unauthorized`: Invalid or missing access token
- `429 Too Many Requests`: Rate limit exceeded (5 per minute)

---

### Disable 2FA

Disable two-factor authentication.

**Endpoint**: `POST /auth/2fa/disable`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  code: string; // 6-digit TOTP code or backup code
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Two-factor authentication disabled successfully.";
}
```

**Errors**:

- `400 Bad Request`: Invalid code
- `401 Unauthorized`: Invalid or missing access token

---

### Regenerate Backup Codes

Generate new backup codes (invalidates old ones).

**Endpoint**: `POST /auth/2fa/regenerate-backup-codes`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  code: string; // 6-digit TOTP code to confirm
}
```

**Response** (200 OK):

```typescript
{
  backupCodes: string[];  // Array of 10 new backup codes
}
```

**Errors**:

- `400 Bad Request`: Invalid code
- `401 Unauthorized`: Invalid or missing access token
- `404 Not Found`: 2FA not enabled

---

## Passkeys (WebAuthn)

### Start Passkey Registration

Get WebAuthn registration options.

**Endpoint**: `POST /auth/passkey/register-start`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: string;
    alg: number;
  }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment?: string;
    residentKey: string;
    userVerification: string;
  };
  excludeCredentials: Array<{
    id: string;
    type: string;
  }>;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token

---

### Finish Passkey Registration

Verify and store passkey credential.

**Endpoint**: `POST /auth/passkey/register-finish`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
  }
  type: string;
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  verified: boolean;
  message: "Passkey registered successfully.";
}
```

**Errors**:

- `400 Bad Request`: Invalid credential or verification failed
- `401 Unauthorized`: Invalid or missing access token

---

### Start Passkey Login

Get WebAuthn authentication options.

**Endpoint**: `POST /auth/passkey/login-start`

**Request Body**:

```typescript
{
  email: string;
}
```

**Response** (200 OK):

```typescript
{
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: string;
  }>;
  userVerification: string;
}
```

**Errors**:

- `404 Not Found`: No passkeys found for this email

---

### Finish Passkey Login

Verify passkey and authenticate.

**Endpoint**: `POST /auth/passkey/login-finish`

**Request Body**:

```typescript
{
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  type: string;
}
```

**Response** (200 OK):

```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    // ... other user fields
  }
}
```

**Errors**:

- `400 Bad Request`: Invalid credential or verification failed
- `401 Unauthorized`: Authentication failed

---

### List Passkeys

Get all registered passkeys for authenticated user.

**Endpoint**: `GET /auth/passkey/list`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  passkeys: Array<{
    id: string;
    credentialID: string;
    createdAt: Date;
    lastUsed?: Date;
    device?: string; // User agent when registered
  }>;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token

---

### Delete Passkey

Remove a passkey.

**Endpoint**: `DELETE /auth/passkey/:id`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  success: true;
  message: "Passkey deleted successfully.";
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token
- `404 Not Found`: Passkey not found

---

## OAuth

### Start OAuth Flow

Redirect to OAuth provider.

**Endpoint**: `GET /auth/oauth/:provider`

**Supported Providers**: `google`, `github`, `discord`

**Response**: Redirects to OAuth provider's consent page

**Example**:

```
GET /auth/oauth/google
→ Redirects to https://accounts.google.com/o/oauth2/v2/auth?...
```

---

### OAuth Callback

Handle OAuth provider redirect.

**Endpoint**: `GET /auth/oauth/:provider/callback`

**Query Parameters**:

```typescript
{
  code: string;     // Authorization code from provider
  state?: string;   // CSRF protection token
  error?: string;   // Error from provider
}
```

**Response**: Redirects to frontend with tokens

**Success**:

```
→ Redirects to https://app.yourdomain.com/auth/callback?
    accessToken=xxx&refreshToken=yyy
```

**Error**:

```
→ Redirects to https://app.yourdomain.com/auth/error?
    error=access_denied
```

---

## Organizations

### Create Organization

Create a new organization.

**Endpoint**: `POST /auth/organization/create`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  name: string;     // Organization name
  slug: string;     // URL-friendly slug
  logo?: string;    // Logo URL (optional)
}
```

**Response** (201 Created):

```typescript
{
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: Date;
  members: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'member';
  }>;
}
```

**Errors**:

- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid or missing access token
- `409 Conflict`: Slug already exists

---

### List Organizations

Get all organizations for authenticated user.

**Endpoint**: `GET /auth/organization/list`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string;
    role: "owner" | "admin" | "member";
    createdAt: Date;
  }>;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token

---

### Get Organization

Get full organization details.

**Endpoint**: `GET /auth/organization/:id`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: Date;
  updatedAt?: Date;
  members: Array<{
    userId: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: 'admin' | 'member';
    status: 'pending' | 'accepted' | 'expired';
    expiresAt: Date;
  }>;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token
- `403 Forbidden`: Not a member of this organization
- `404 Not Found`: Organization not found

---

### Set Active Organization

Switch to a different organization.

**Endpoint**: `POST /auth/organization/set-active`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  organizationId: string;
}
```

**Response** (200 OK):

```typescript
{
  success: true;
  organizationId: string;
}
```

**Errors**:

- `401 Unauthorized`: Invalid or missing access token
- `403 Forbidden`: Not a member of this organization
- `404 Not Found`: Organization not found

---

### Invite Member

Invite a user to organization.

**Endpoint**: `POST /auth/organization/:id/invite`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**:

```typescript
{
  email: string;
  role: "admin" | "member";
}
```

**Response** (201 Created):

```typescript
{
  id: string;
  email: string;
  role: "admin" | "member";
  status: "pending";
  expiresAt: Date; // 7 days from now
}
```

**Errors**:

- `400 Bad Request`: Invalid email or role
- `401 Unauthorized`: Invalid or missing access token
- `403 Forbidden`: Not an admin of this organization
- `404 Not Found`: Organization not found
- `409 Conflict`: User already a member or has pending invite

---

### Accept Invite

Accept organization invitation.

**Endpoint**: `POST /auth/organization/invite/:token/accept`

**Headers**:

```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):

```typescript
{
  success: true;
  organization: {
    id: string;
    name: string;
    slug: string;
  }
  role: "admin" | "member";
}
```

**Errors**:

- `400 Bad Request`: Invalid or expired token
- `401 Unauthorized`: Invalid or missing access token
- `404 Not Found`: Invite not found

---

## Error Responses

All error responses follow this format:

```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limits

| Endpoint                     | Limit        | Window     |
| ---------------------------- | ------------ | ---------- |
| `POST /auth/login`           | 5 requests   | 1 minute   |
| `POST /auth/register`        | 3 requests   | 1 hour     |
| `POST /auth/forgot-password` | 3 requests   | 15 minutes |
| `POST /auth/2fa/verify`      | 5 requests   | 1 minute   |
| `POST /auth/passkey/*`       | 10 requests  | 1 minute   |
| All other endpoints          | 100 requests | 1 minute   |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640000000
```

---

## Webhooks (Future)

Coming soon: Webhook support for real-time notifications of authentication events.

---

## Related Documentation

- [Authentication Flow Diagrams](./FLOWS.md)
- [Security Best Practices](./SECURITY.md)
- [Authentication Package README](../README.md)
