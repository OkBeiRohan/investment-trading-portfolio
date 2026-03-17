# Web Dashboard Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `apps/web`  
> **Framework**: Next.js 16 (App Router, Turbopack, RSC)

## Prerequisites

- Node.js >=20.9
- pnpm 10.32+

## Breaking Changes

### Next.js 16 (from 15)
- **Turbopack is default** -- no `--turbo` flag needed, 10x faster HMR
- **Node.js 18 dropped** -- minimum is 20.9
- React 19.2+ required

### Auth Migration
- **From**: NextAuth.js / custom JWT
- **To**: Better Auth via `@repo/auth-client`
- Session stored in httpOnly cookies
- `authClient.signIn.email()` replaces `signIn("credentials")`
- Middleware uses Better Auth session check

### tRPC v11
- **From**: `trpc.useQuery()` / `trpc.useMutation()`
- **To**: `useTRPC()` with `queryOptions()` syntax
- Server-side: `prefetch()` + `HydrateClient` for RSC

## Step-by-Step Migration

1. Update `package.json`: `"next": "16.1.6"`, `"react": "19.2.4"`
2. Create `middleware.ts` for route protection
3. Replace any NextAuth imports with `@repo/auth-client`
4. Update tRPC client hooks to v11 syntax
5. Remove `--turbo` flags from dev scripts (now default)
6. Test all auth flows (login, register, 2FA, linked accounts)
7. Verify RSC data fetching with tRPC prefetch

## Environment Variables

```env
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3004
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing Checklist

- [ ] Login/Register flow works
- [ ] 2FA flow works
- [ ] Upstox account linking works
- [ ] Protected routes redirect to login
- [ ] tRPC queries load data correctly
- [ ] Theme toggle works
- [ ] Build completes without errors
