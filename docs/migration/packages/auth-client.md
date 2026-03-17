# Auth Client Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/auth-client` (`@repo/auth-client`)

## Overview

React client SDK for Better Auth, providing hooks and utilities for the web dashboard.

## Key Changes

- `authClient` singleton with typed plugin methods
- `signIn.email()`, `signIn.social()` replace NextAuth `signIn()`
- `useSession()` hook for client-side session access
- Automatic token refresh via httpOnly cookies
- Upstox OAuth linking via `authClient.linkSocial()`

## Migration Steps

1. Remove `next-auth` from `apps/web`
2. Add `@repo/auth-client` to web app dependencies
3. Replace `useSession()` from next-auth with Better Auth version
4. Replace `signIn()` / `signOut()` calls
5. Update middleware for route protection
6. Test all auth flows in the browser
7. Verify cookie-based session persistence
