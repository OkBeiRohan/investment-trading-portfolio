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
        callbackURL: "/account/linked-accounts",
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
   - User lands on `/account/linked-accounts`

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

- **Upstox tokens**: Valid for 24 hours (86400 seconds)
- **Refresh tokens**: Currently not supported by Upstox v2 API
- **Re-authentication**: Users must re-link account when token expires

## API Endpoints (Provided by better-auth)

### Link Account

```http
POST /api/auth/oauth2/link
Content-Type: application/json
Cookie: better-auth.session_token=xxx

{
  "providerId": "upstox",
  "callbackURL": "/account/linked-accounts"
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

**Cause**: User hasn't connected Upstox account

**Solution**: Direct user to `/account/linked-accounts` to connect

### "Upstox session expired"

**Cause**: Access token expired (>24 hours old)

**Solution**: User must re-link account (Upstox doesn't support refresh tokens)

### "Invalid redirect URI"

**Cause**: Redirect URI mismatch in Upstox app settings

**Solution**:

1. Go to Upstox Developer Console
2. Update redirect URI to match `UPSTOX_REDIRECT_URI` in `.env`
3. Ensure format: `https://yourdomain.com/api/auth/oauth2/callback/upstox`

### OAuth callback error

**Cause**: Missing or invalid environment variables

**Solution**:

1. Verify `UPSTOX_CLIENT_ID` and `UPSTOX_CLIENT_SECRET` are set
2. Restart API server after changing `.env`
3. Check logs for better-auth initialization errors

## Testing

### Local Development

1. Start ngrok tunnel:

   ```bash
   ngrok http 3004
   ```

2. Update Upstox app redirect URI to:

   ```
   https://your-ngrok-url.ngrok.io/api/auth/oauth2/callback/upstox
   ```

3. Update `.env`:

   ```bash
   UPSTOX_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/auth/oauth2/callback/upstox
   APP_URL=https://your-ngrok-url.ngrok.io
   ```

4. Test OAuth flow

### Production Deployment

1. Update Upstox app redirect URI:

   ```
   https://api.yourdomain.com/api/auth/oauth2/callback/upstox
   ```

2. Set environment variables on Render/Vercel:
   ```bash
   UPSTOX_CLIENT_ID=production_client_id
   UPSTOX_CLIENT_SECRET=production_client_secret
   UPSTOX_REDIRECT_URI=https://api.yourdomain.com/api/auth/oauth2/callback/upstox
   ```

## Related Documentation

- [better-auth Generic OAuth Plugin](https://better-auth.com/docs/plugins/generic-oauth)
- [Upstox API Documentation](https://upstox.com/developer/api-documentation/authentication)
- [market-sdk README](../market-sdk/README.md)
- [Authentication Package](../authentication/README.md)

## Future Enhancements

- [ ] Token refresh automation (when Upstox supports it)
- [ ] Multiple broker support (Zerodha, Fyers)
- [ ] Token health monitoring
- [ ] Automatic re-authentication prompts
