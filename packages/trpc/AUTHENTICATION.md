# Authentication Flow in tRPC

## Overview

This document explains how authentication works in the tRPC client, including:

1. **Automatic credential forwarding** (cookies sent with every request)
2. **Automatic session refresh** on 401 errors
3. **Graceful retry logic** (retry request after refresh)
4. **Automatic logout** if session cannot be refreshed

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Component                        │
│  const user = trpc.user.getProfile.useQuery();              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   tRPC Client (react.ts)                    │
│  Links: [authLink, httpBatchLink]                           │
└───────┬────────────────────────────┬────────────────────────┘
        │                            │
        │ 1. Request                 │ 2. Response
        ▼                            │
┌──────────────────┐                 │
│   Auth Link      │◀────────────────┘
│  (auth-link.ts)  │
└────┬─────────────┘
     │
     │ If 401 Error:
     │ 1. Call authClient.getSession() to refresh
     │ 2. If success → Retry original request
     │ 3. If fail → Redirect to login
     │
     ▼
┌──────────────────┐
│   HTTP Link      │
│ (httpBatchLink)  │
│ credentials:     │
│   "include"      │────────────────────────────┐
└──────────────────┘                            │
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS API Backend                        │
│  /api/trpc                                                  │
│  better-auth checks cookies → returns 401 if invalid       │
└─────────────────────────────────────────────────────────────┘
```

---

## Client-Side Authentication (React Components)

### How It Works

1. **tRPC client configured with credentials**:

   ```typescript
   // packages/trpc/src/client/react.ts
   httpBatchLink({
     url: "/api/trpc",
     fetch(url, options) {
       return fetch(url, {
         ...options,
         credentials: "include", // ← Cookies sent automatically
       });
     },
   });
   ```

2. **Auth link handles 401 errors**:
   ```typescript
   // packages/trpc/src/client/auth-link.ts
   if (err.data?.httpStatus === 401) {
     // Refresh session
     const session = await authClient.getSession();

     if (session?.data) {
       // Retry original request
       next(op).subscribe(observer);
     } else {
       // Redirect to login
       window.location.href = "/authentication/login";
     }
   }
   ```

### Usage in Components

```tsx
"use client";
import { trpc } from "@repo/trpc";

function Dashboard() {
  // Cookies are automatically included
  // 401 errors are automatically handled
  const { data: user } = trpc.user.getProfile.useQuery();

  const updateProfile = trpc.user.updateProfile.useMutation();

  return <div>Welcome, {user?.name}</div>;
}
```

**What Happens Behind the Scenes**:

1. Request sent to `/api/trpc` with `credentials: "include"`
2. Browser automatically includes cookies (session, CSRF, etc.)
3. If backend returns 401:
   - Auth link calls `authClient.getSession()` to refresh
   - If refresh succeeds → Original request retried
   - If refresh fails → User redirected to login

---

## Server-Side Authentication (Server Components)

### How It Works

Server Components cannot use cookies automatically (no browser context). We must:

1. Read cookies from Next.js `cookies()` API
2. Forward them to the backend via `cookie` header

```typescript
// packages/trpc/src/server/caller.ts
export const serverTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3004/api/trpc",
      async headers() {
        const cookieStore = await cookies();
        const allCookies = cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");

        return {
          cookie: allCookies, // ← Forward all cookies
        };
      },
    }),
  ],
});
```

### Usage in Server Components

```tsx
// app/profile/page.tsx
import { serverTrpc } from "@repo/trpc/server";

export default async function ProfilePage() {
  // Cookies are automatically forwarded
  const user = await serverTrpc.user.getProfile.query();

  return <div>Welcome, {user.name}</div>;
}
```

### Usage in Server Actions

```tsx
// app/actions.ts
"use server";
import { serverTrpc } from "@repo/trpc/server";

export async function updateProfile(data: UpdateProfileInput) {
  // Cookies from the request are automatically forwarded
  return serverTrpc.user.updateProfile.mutate(data);
}
```

**What Happens Behind the Scenes**:

1. Next.js Server Component/Action has access to `cookies()`
2. `serverTrpc` reads all cookies from the request
3. Forwards them to backend in `cookie` header
4. Backend validates session from cookies
5. Returns data or 401 error

---

## Authentication Flow Examples

### Example 1: Successful Request

```
1. User: trpc.user.getProfile.useQuery()
2. HTTP Link: fetch("/api/trpc", { credentials: "include" })
3. Browser: Includes "better-auth.session_token" cookie
4. Backend: Validates session → Returns user data
5. User: Receives data
```

### Example 2: Session Expired (Refresh Succeeds)

```
1. User: trpc.user.getProfile.useQuery()
2. HTTP Link: fetch("/api/trpc", { credentials: "include" })
3. Backend: Session expired → Returns 401
4. Auth Link: Detects 401 → Calls authClient.getSession()
5. Backend: Refresh token valid → Returns new session (sets new cookie)
6. Auth Link: Retries original request
7. Backend: New session valid → Returns user data
8. User: Receives data (unaware of refresh)
```

### Example 3: Session Expired (Refresh Fails)

```
1. User: trpc.user.getProfile.useQuery()
2. HTTP Link: fetch("/api/trpc", { credentials: "include" })
3. Backend: Session expired → Returns 401
4. Auth Link: Detects 401 → Calls authClient.getSession()
5. Backend: Refresh token expired → Returns null
6. Auth Link: Redirect to login
7. User: Sees login page
```

---

## Session Refresh Logic

Better Auth handles session refresh automatically:

1. **Access Token** (short-lived, 15 minutes):
   - Stored in `better-auth.session_token` cookie
   - Sent with every request
   - If expired → Backend returns 401

2. **Refresh Token** (long-lived, 7 days):
   - Stored in `better-auth.refresh_token` cookie (httpOnly)
   - Used by `authClient.getSession()` to get new access token
   - If expired → User must log in again

**Automatic Refresh Flow**:

```typescript
// When authClient.getSession() is called:
1. Better Auth checks if access token is expired
2. If expired, uses refresh token to get new access token
3. Sets new session cookie
4. Returns new session
```

---

## Security Features

### 1. HttpOnly Cookies

- Session tokens stored in httpOnly cookies
- Cannot be accessed by JavaScript (XSS protection)
- Automatically sent with requests

### 2. Credentials Include

- Client-side: `credentials: "include"` in fetch
- Server-side: Forward `cookie` header
- Ensures cookies are sent cross-origin

### 3. Automatic Retry

- Auth link retries failed requests after refresh
- Prevents "Session expired" errors from reaching UI
- Seamless user experience

### 4. Graceful Logout

- If refresh fails, user redirected to login
- No cryptic 401 errors shown to user
- Clean separation of concerns

---

## Troubleshooting

### Issue: "401 Unauthorized" Errors

**Symptom**: Every tRPC call returns 401

**Cause**: Cookies not being sent

**Solution**:

1. Check `credentials: "include"` in `httpBatchLink`
2. Verify backend allows credentials (CORS)
3. Ensure `better-auth.session_token` cookie exists (check DevTools)

### Issue: Infinite Redirect Loop

**Symptom**: App keeps redirecting to login

**Cause**: `authClient.getSession()` returns 401

**Solution**:

1. Check refresh token is valid (not expired)
2. Verify backend `/api/auth/get-session` endpoint works
3. Clear cookies and log in again

### Issue: Server Component 401 Errors

**Symptom**: Server Components get 401, but Client Components work

**Cause**: Cookies not forwarded to backend

**Solution**:

1. Use `serverTrpc` instead of `trpc` in Server Components
2. Verify `cookies()` API returns cookies
3. Check backend receives `cookie` header

---

## Testing

### Test Auth Link Retry Logic

```typescript
// Mock 401 error
const mockTrpc = createTRPCClient({
  links: [
    authLink(authClient),
    // Mock link that returns 401 on first call, success on second
    createMockLink(),
  ],
});

// Should retry and succeed
const user = await mockTrpc.user.getProfile.query();
expect(user).toBeDefined();
```

### Test Automatic Logout

```typescript
// Mock failed refresh
vi.spyOn(authClient, "getSession").mockResolvedValue(null);

// Should redirect to login
await mockTrpc.user.getProfile.query();
expect(window.location.href).toBe("/authentication/login");
```

---

## Related Documentation

- [tRPC Usage Guide](./USAGE.md) - How to use tRPC client
- [Better Auth Docs](https://better-auth.com/docs) - Session management
- [Next.js Security](https://nextjs.org/blog/security-nextjs-server-components-actions) - Best practices
