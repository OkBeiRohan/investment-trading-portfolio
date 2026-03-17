# Authentication Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/authentication` (`@repo/authentication`)

## Overview

Server-side Better Auth integration for NestJS services, replacing Passport.js/JWT.

## Key Changes

- `AuthModule` provides `AuthGuard`, `SessionDecorator`, `BetterAuthService`
- Multi-tenant support with organization plugin
- 2FA (TOTP) and passkey support built-in
- Upstox account linking via custom OAuth provider
- Session stored in MongoDB, cached in Redis

## Migration Steps

1. Remove `@nestjs/passport`, `passport-jwt`, `passport-local`
2. Add `@repo/authentication` to service dependencies
3. Import `AuthModule.forRoot()` in `AppModule`
4. Replace `@UseGuards(JwtAuthGuard)` with `@UseGuards(AuthGuard)`
5. Replace `@Request() req.user` with `@Session() session`
6. Configure Better Auth env variables
7. Test auth flows: login, register, 2FA, session refresh
