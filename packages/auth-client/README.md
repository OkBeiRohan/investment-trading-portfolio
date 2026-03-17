# @repo/auth-client

> **Client-side Better Auth hooks and utilities for React/Next.js applications.**

**Last Updated**: March 17, 2026

---

## Purpose

This package provides the Better Auth **client instance** for browser environments:

- ✅ Configured Better Auth client singleton
- ✅ React hooks for authentication state
- ✅ Passkey authentication support
- ✅ Organization plugin integration

### Why Separate Package?

`@repo/auth-client` is separated from `@repo/authentication` to:

1. Avoid pulling server-side dependencies into client bundles
2. Prevent React/Next.js from being required in NestJS services
3. Enable tree-shaking and smaller bundle sizes

---

## Installation

```bash
# Client apps (web)
pnpm add @repo/auth-client
```

---

## Usage

### React/Next.js Components

```typescript
import { authClient } from "@repo/auth-client";

// Check session
const { data: session, isPending } = authClient.useSession();

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});

// Sign out
await authClient.signOut();

// Passkey authentication
await authClient.passkey.addPasskey();
await authClient.signIn.passkey();
```

### Organization Context

```typescript
import { authClient } from "@repo/auth-client";

// Get active organization
const { data: org } = authClient.useActiveOrganization();

// Switch organization
await authClient.organization.setActive({ organizationId: "org_123" });

// List member organizations
const orgs = await authClient.organization.list();
```

### Protected Routes (Next.js)

```typescript
// middleware.ts
import { authClient } from "@repo/auth-client";

export async function middleware(request: NextRequest) {
  const session = await authClient.getSession();
  
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}
```

---

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `authClient.useSession()` | React hook for session state |
| `authClient.signIn.email()` | Email/password sign in |
| `authClient.signIn.social()` | OAuth sign in (Google, GitHub) |
| `authClient.signIn.passkey()` | Passkey sign in |
| `authClient.signUp.email()` | Email registration |
| `authClient.signOut()` | Sign out |
| `authClient.getSession()` | Get session (server-side) |

### Organization Methods

| Method | Description |
|--------|-------------|
| `authClient.useActiveOrganization()` | React hook for active org |
| `authClient.organization.list()` | List user's organizations |
| `authClient.organization.setActive()` | Switch active organization |
| `authClient.organization.create()` | Create new organization |

### Passkey Methods

| Method | Description |
|--------|-------------|
| `authClient.passkey.addPasskey()` | Register new passkey |
| `authClient.passkey.listPasskeys()` | List registered passkeys |
| `authClient.passkey.deletePasskey()` | Remove passkey |

---

## Configuration

The client is pre-configured in `src/client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { passkeyClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [
    passkeyClient(),
    organizationClient(),
  ],
});
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `better-auth` | Core authentication |
| `@better-auth/passkey` | Passkey plugin |

### Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | ^18.0.0 |
| `next` | ^14.0.0 or ^15.0.0 |

---

## Related Documentation

- [@repo/authentication README](../authentication/README.md) - Server-side auth
- [apps/web Authentication](../../apps/web/docs/AUTHENTICATION.md) - Web app auth patterns
- [Better Auth Docs](https://www.better-auth.com/docs)

---

**Status**: Active  
**Technology**: Better Auth, React, Next.js
