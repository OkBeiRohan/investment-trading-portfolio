# API Gateway Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `apps/api`  
> **Framework**: NestJS 11

## Breaking Changes

### Auth: Passport.js/JWT to Better Auth
- Remove `@nestjs/passport`, `passport-jwt`, `passport-local`
- Install `@thallesp/nestjs-better-auth`
- Use `AuthModule` from `@repo/authentication`
- Replace `@UseGuards(JwtAuthGuard)` with `@UseGuards(AuthGuard)`
- Replace `@Request() req.user` with `@Session() session`

### tRPC v11 with NestJS
- Use `nestjs-trpc-v2` with `@Router`, `@Query`, `@Mutation` decorators
- Rust-powered type generation (10-50x faster)

## Step-by-Step

1. Remove Passport.js dependencies
2. Add `@repo/authentication` to dependencies
3. Import `AuthModule` in `AppModule`
4. Replace all JWT guards with Better Auth guards
5. Update tRPC middleware to use Better Auth session
6. Test all API endpoints with authenticated requests

## Environment Variables

```env
PORT=3004
BETTER_AUTH_SECRET=<same-as-web>
BETTER_AUTH_URL=http://localhost:3004
MONGODB_URI=mongodb://localhost:27017/quantum
REDIS_HOST=localhost
REDIS_PORT=6379
```
