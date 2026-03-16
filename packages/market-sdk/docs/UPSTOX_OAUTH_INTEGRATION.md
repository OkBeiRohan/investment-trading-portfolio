# Upstox OAuth Integration

Complete integration of Upstox broker account linking using better-auth's generic OAuth plugin.

## Overview

Users can link their Upstox trading accounts to the platform using OAuth 2.0. The access token is securely stored and used by `@repo/market-sdk` to place orders and fetch market data on behalf of the user.

## Architecture

```
User → Web App → API (better-auth) → Upstox OAuth
                  ↓
            MongoDB (Account collection)
                  ↓
            market-sdk (uses access token)
```

## Setup

### 1. Get Upstox API Credentials

1. Go to [Upstox Developer Console](https://account.upstox.com/developer/apps)
2. Create a new app
3. Get `Client ID` and `Client Secret`
4. Set Redirect URI to: `https://yourdomain.com/api/auth/oauth2/callback/upstox`

### 2. Configure Environment Variables

Add to `apps/api/.env`:

```bash
# Upstox OAuth (required for broker linking)
UPSTOX_CLIENT_ID=your_client_id_here
UPSTOX_CLIENT_SECRET=your_client_secret_here
UPSTOX_REDIRECT_URI=http://localhost:3004/api/auth/oauth2/callback/upstox  # Dev
# UPSTOX_REDIRECT_URI=https://api.yourdomain.com/api/auth/oauth2/callback/upstox  # Production
```

### 3. Verify Configuration

The Upstox OAuth provider is automatically enabled in better-auth if the environment variables are set.

Check `packages/authentication/src/server/auth.config.ts`:

- `genericOAuth` plugin is configured with Upstox endpoints
- Provider ID: `"upstox"`
- Callback URL: `/api/auth/oauth2/callback/upstox`

## Usage

### Client-Side (Next.js/React)

```tsx
"use client";
import { createAuthClient, genericOAuthClient } from "@repo/auth-client";

export default function LinkedAccountsPage() {
  const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    plugins: [genericOAuthClient()],
  });

  const handleLinkUpstox = async () => {
    try {
      await authClient.oauth2.link({
        providerId: "upstox",
        callbackURL: "/account/linked",
      });
    } catch (error) {
      console.error("Failed to link Upstox:", error);
    }
  };

  return (
    <div>
      <h1>Linked Accounts</h1>
      <button onClick={handleLinkUpstox}>Connect Upstox Account</button>
    </div>
  );
}
```

### Server-Side (NestJS - Using market-sdk)

```typescript
import { Injectable } from "@nestjs/common";
import { UpstoxProvider } from "@repo/market-sdk";

@Injectable()
export class TradingService {
  constructor(private upstox: UpstoxProvider) {}

  async placeOrder(userId: string, params: OrderParams) {
    // AuthManager automatically fetches token from Account collection
    return this.upstox.placeOrder(userId, params);
  }
}
```

## OAuth Flow

### Step-by-Step

1. **User clicks "Connect Upstox"**
   - Client calls `upstoxClient.linkUpstox()`
   - Redirects to: `/api/auth/sign-in/oauth2?providerId=upstox`

2. **better-auth initiates OAuth**
   - Redirects to Upstox authorization page:
     ```
     https://api.upstox.com/v2/login/authorization/dialog?
       client_id=YOUR_CLIENT_ID
       &redirect_uri=https://yourdomain.com/api/auth/oauth2/callback/upstox
       &response_type=code
     ```

3. **User authorizes on Upstox**
   - User logs into Upstox
   - Grants permissions to the app
   - Upstox redirects back with `code` parameter

4. **better-auth handles callback**
   - Endpoint: `/api/auth/oauth2/callback/upstox`
   - Exchanges `code` for `access_token`:

     ```
     POST https://api.upstox.com/v2/login/authorization/token
     Content-Type: application/x-www-form-urlencoded

     code=AUTHORIZATION_CODE
     &client_id=YOUR_CLIENT_ID
     &client_secret=YOUR_CLIENT_SECRET
     &redirect_uri=YOUR_REDIRECT_URI
     &grant_type=authorization_code
     ```

5. **Upstox returns tokens**

   ```json
   {
     "access_token": "eyJh...",
     "token_type": "Bearer",
     "expires_in": 86400,
     "user_id": "ABC123"
   }
   ```

6. **better-auth stores in MongoDB**
   - Collection: `account`
   - Document:
     ```json
     {
       "userId": "usr_xyz",
       "providerId": "upstox",
       "accountId": "ABC123",
       "accessToken": "eyJh...",
       "accessTokenExpiresAt": "2024-12-21T10:00:00Z",
       "createdAt": "2024-12-20T10:00:00Z"
     }
     ```

7. **Redirect to success page**
   - User lands on `/account/linked`

## Token Management

### Storage

Tokens are stored in the `account` collection (managed by better-auth):

| Field                 | Type   | Description            |
| --------------------- | ------ | ---------------------- |
| userId                | string | User's ID              |
| providerId            | string | Always "upstox"        |
| accountId             | string | Upstox user_id         |
| accessToken           | string | OAuth access token     |
| accessTokenExpiresAt  | Date   | Token expiry           |
| refreshToken          | string | Refresh token (if any) |
| refreshTokenExpiresAt | Date   | Refresh token expiry   |

### Retrieval (market-sdk)

```typescript
import { AuthManagerService } from '@repo/market-sdk';

// In your NestJS service
constructor(private authManager: AuthManagerService) {}

async placeOrder(userId: string) {
  // Fetches token from Account collection
  const token = await this.authManager.getAccessToken(userId);

  // Throws UnauthorizedException if:
  // - No Upstox account linked
  // - Token expired
  // - Token missing
}
```

### Token Expiry

- **Upstox tokens**: Valid for 24 hours (expires at end of trading day IST)
- **Refresh tokens**: NOT supported by Upstox v2 API
- **Re-authentication**: Users must complete Phase 2 re-auth each morning (~7am)
- **market-sdk impact**: Token marked as expired in Redis → automatically removed from pool until re-auth

---

## Phase 2: Daily Re-Authentication

Every morning, all users with trading enabled (and all admins with `isDataCollectionEnabled`) must re-authenticate with Upstox.

### Why this is needed

Upstox deliberately does NOT support refresh tokens. This is a deliberate regulatory/security choice. The user must log in to Upstox every day to receive a new access token.

### Endpoint Design

```bash
# Step 1: Start re-auth
GET /api/auth/upstox/reauth/start
  → Generates authorization URL with UPSTOX_REAUTH_REDIRECT_URI
  → Redirects to Upstox login page

# Step 2: Upstox redirects back
GET /api/auth/upstox/reauth/callback?code=XYZ&state=<csrf>
  → Exchanges code for new access_token
  → Overwrites previous day's token in MongoDB accounts collection
  → Publishes Redis event: auth:token_refreshed:{userId}
```

### market-sdk Integration

After Phase 2 completes:

1. `AuthManagerService` picks up the new token (either via Redis event subscription or next DB read)
2. Calls `GET /v2/user/profile` on Upstox to get/update `user_type`
3. Updates Redis cache with new token (6h TTL)
4. Recalculates pool rate limits for this user's token
5. If `isDataCollectionEnabled = true`: admin token re-added to WebSocket connection pool

### Additional Env Variables for Phase 2

```bash
# Separate redirect URI for daily re-auth flow
UPSTOX_REAUTH_REDIRECT_URI=http://localhost:3004/api/auth/upstox/reauth/callback
# Production:
# UPSTOX_REAUTH_REDIRECT_URI=https://api.yourdomain.com/api/auth/upstox/reauth/callback
```

> ⚠️ Both redirect URIs (Phase 1 and Phase 2) must be explicitly allowed in the Upstox Developer Console app settings.

---

## API Endpoints (Provided by better-auth)

### Link Account

```http
POST /api/auth/oauth2/link
Content-Type: application/json
Cookie: better-auth.session_token=xxx

{
  "providerId": "upstox",
  "callbackURL": "/account/linked"
}
```

**Response**: 302 Redirect to Upstox authorization page

### Callback (Automatic)

```http
GET /api/auth/oauth2/callback/upstox?code=AUTHORIZATION_CODE
```

**Response**: 302 Redirect to `callbackURL` or default dashboard

### Check Link Status

```typescript
import { AuthManagerService } from "@repo/market-sdk";

const hasUpstox = await authManager.hasUpstoxAccount(userId);
```

### Unlink Account

```typescript
await authManager.revokeUpstoxAccount(userId);
```

## Security

### Token Storage

- ✅ Tokens stored in MongoDB (encrypted at rest)
- ✅ Never exposed to client-side
- ✅ Only accessible by server-side market-sdk
- ✅ Session cookies required (httpOnly, Secure)

### OAuth Security

- ✅ Uses OAuth 2.0 Authorization Code flow
- ✅ Client secret stored server-side only
- ✅ Redirect URI validated
- ✅ State parameter for CSRF protection (handled by better-auth)

### SEBI Compliance

All orders placed via Upstox must include:

- `algoId`: Unique identifier for the trading strategy
- Audit trail logging

See `packages/market-sdk/README.md` for SEBI compliance details.

## Troubleshooting

### "No Upstox account linked"

**Cause**: User hasn't completed Phase 1 (initial account link)

**Solution**: Direct user to Settings → Upstox → Connect Account

### "Upstox session expired" (daily)

**Cause**: Access token expired at end of previous trading day (normal, happens every day)

**Solution**: User must complete Phase 2 re-auth (the web app will show a re-auth prompt automatically). market-sdk will gracefully skip this user's token from the pool until re-auth completes.

### "Invalid redirect URI"

**Cause**: Phase 1 or Phase 2 redirect URI not registered in Upstox app settings

**Solution**:
1. Go to Upstox Developer Console
2. Add BOTH redirect URIs:
   - `https://yourdomain.com/api/auth/upstox/callback` (Phase 1)
   - `https://yourdomain.com/api/auth/upstox/reauth/callback` (Phase 2)

### OAuth callback error

**Cause**: Missing or invalid environment variables

**Solution**:
1. Verify `UPSTOX_CLIENT_ID` and `UPSTOX_CLIENT_SECRET` are set
2. Verify both `UPSTOX_REDIRECT_URI` and `UPSTOX_REAUTH_REDIRECT_URI` are set
3. Restart API server after changing `.env`
4. Check logs for better-auth initialization errors

## Related Documentation

- [better-auth Generic OAuth Plugin](https://better-auth.com/docs/plugins/generic-oauth)
- [Upstox Authentication Docs](https://upstox.com/developer/api-documentation/authentication)
- [Upstox Login (Daily Re-Auth)](https://upstox.com/developer/api-documentation/login)
- [Authentication Package README](../../packages/authentication/README.md)
- [market-sdk README](../README.md)
- [Web App Architecture](../../apps/web/ARCHITECTURE.md)

## Future Enhancements

- [ ] Multiple broker support (Zerodha, Fyers)
- [ ] Token health monitoring dashboard (admin view)
- [ ] Automatic push notification at 7am to remind users to re-auth
- [ ] Biometric re-auth for mobile web (WebAuthn)
