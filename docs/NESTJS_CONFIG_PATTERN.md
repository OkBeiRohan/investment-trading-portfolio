# NestJS ConfigModule Pattern - Environment Variables Guide

## Overview

This guide explains the proper NestJS pattern for handling environment variables in a monorepo with workspace packages.

## ✅ Answers to Common Questions

### Q1: "NestJS doesn't support process.env?"

**Answer**: NestJS **does** support `process.env`, but with important caveats:

- ✅ **Root apps** (like `apps/api`) can load `.env` files via `ConfigModule.forRoot()`
- ❌ **Workspace packages** (like `@repo/authentication`) **cannot** load their own `.env` files
- ✅ Packages must receive config via **dependency injection** from the root app

**Why?** NestJS only loads `.env` files at the application entry point (main.ts). Packages are libraries consumed by apps, not standalone applications.

### Q2: "Should I always use ConfigModule?"

**Answer**: **YES**, especially for:

1. **Type Safety**: Validate environment variables with Zod/class-validator
2. **Default Values**: Provide sensible defaults for development
3. **Centralized Configuration**: One source of truth for all config
4. **Testability**: Easy to mock configuration in tests
5. **Transformation**: Convert strings to proper types (numbers, booleans, arrays)
6. **Error Handling**: Fail fast with clear error messages if config is invalid

**Anti-Pattern** ❌:

```typescript
const secret = process.env.AUTH_SECRET; // No validation, no defaults, no type safety
```

**Best Practice** ✅:

```typescript
constructor(private readonly config: ConfigService) {}

getSecret() {
  return this.config.get('auth.secret'); // Type-safe, validated, with defaults
}
```

### Q3: "Should I create a separate configuration for authentication?"

**Answer**: **NO** - Extend the root app's configuration instead.

**Why?**

- ConfigModule is global when set with `isGlobal: true`
- All modules can access the same configuration
- Avoids duplicate .env files
- Maintains single source of truth

**Pattern**:

1. ✅ Add auth fields to `apps/api/src/environment/index.ts`
2. ✅ ConfigModule automatically exposes these to all modules
3. ✅ Authentication package imports ConfigService and reads `config.auth.*`

---

## Architecture Pattern

```
┌───────────────────────────────────────────────────────────┐
│                     apps/api (Root App)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ConfigModule.forRoot({ isGlobal: true })           │ │
│  │  Loads: apps/api/.env                               │ │
│  │  Schema: apps/api/src/environment/index.ts          │ │
│  └─────────────────────┬───────────────────────────────┘ │
│                        │                                  │
│                        ▼                                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Zod Validation + Transformation                    │ │
│  │  - Validate all env vars                            │ │
│  │  - Apply defaults                                   │ │
│  │  - Transform types (string → number, boolean)       │ │
│  │  - Group into sections (app, auth, mongodb, etc)    │ │
│  └─────────────────────┬───────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────┘
                         │
                         │ (ConfigService injected globally)
                         │
     ┌───────────────────┼───────────────────────────┐
     │                   │                           │
     ▼                   ▼                           ▼
┌──────────┐    ┌──────────────────┐    ┌──────────────────┐
│ UserModule│    │ @repo/authentication│    │ @repo/database   │
│           │    │                     │    │                  │
│ Injects:  │    │ Injects:            │    │ Injects:         │
│ ConfigSvc │    │ ConfigService       │    │ ConfigService    │
│           │    │                     │    │                  │
│ Reads:    │    │ Reads:              │    │ Reads:           │
│ config.*  │    │ config.auth.*       │    │ config.mongodb.* │
└───────────┘    └─────────────────────┘    └──────────────────┘
```

---

## Implementation Details

### Step 1: Define Environment Schema (Root App)

**File**: `apps/api/src/environment/index.ts`

```typescript
import z from "zod";

export const environmentSchema = z
  .object({
    // App
    NODE_ENV: z
      .enum(["development", "production", "staging", "test"])
      .default("development"),
    PORT: z
      .string()
      .default("3004")
      .transform((val) => parseInt(val, 10)),
    DEVTOOLS: z
      .string()
      .default("false")
      .transform((val) => val === "true"),

    // MongoDB
    MONGODB_URI: z.string().default("mongodb://localhost:27017"),

    // Authentication
    APP_NAME: z.string().default("Investment Trading Portfolio"),
    APP_URL: z.string().default("http://localhost:3004"),
    AUTH_SECRET: z.string().min(32),
    TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),

    // Social Providers (optional)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // ... more providers
  })
  .transform((data) => ({
    // Transformed, grouped config
    environment: data.NODE_ENV,
    port: data.PORT,
    devtools: data.DEVTOOLS,

    mongodb: {
      uri: data.MONGODB_URI,
    },

    auth: {
      appName: data.APP_NAME,
      appUrl: data.APP_URL,
      secret: data.AUTH_SECRET,
      trustedOrigins: data.TRUSTED_ORIGINS.split(",").map((o) => o.trim()),
      socialProviders: {
        google: data.GOOGLE_CLIENT_ID
          ? {
              clientId: data.GOOGLE_CLIENT_ID,
              clientSecret: data.GOOGLE_CLIENT_SECRET!,
            }
          : undefined,
        // ... more providers
      },
    },
  }));

export type IEnvironment = z.infer<typeof environmentSchema>;
```

**Key Features**:

- ✅ Type-safe schema with Zod
- ✅ Default values for development
- ✅ Type transformations (string → number, boolean)
- ✅ Grouping (flat .env → nested config object)
- ✅ Array transformations (CSV string → array)

### Step 2: Load Configuration (Root App)

**File**: `apps/api/src/environment/configuration.ts`

```typescript
import { environmentSchema } from "./index";
import { registerAs } from "@nestjs/config";

export const CONFIG_TOKEN = "config";

export default registerAs(CONFIG_TOKEN, () => {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());

    const errors = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errors}\n\nCheck your .env file and ensure all required variables are set.`
    );
  }

  return result.data;
});
```

**Key Features**:

- ✅ Uses `safeParse()` for better error handling
- ✅ Clear error messages showing which fields failed
- ✅ Fails fast on startup (not at runtime)

### Step 3: Register ConfigModule (Root App)

**File**: `apps/api/src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import registerConfiguration from "./environment/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ CRITICAL: Makes config available to all modules
      load: [registerConfiguration],
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 4: Use Config in Workspace Package

**File**: `packages/authentication/src/config/auth.config.ts`

```typescript
export interface AuthConfigOptions {
  appName: string;
  appUrl: string;
  secret: string;
  trustedOrigins: string[];
  socialProviders?: {
    google?: { clientId: string; clientSecret: string };
    github?: { clientId: string; clientSecret: string };
  };
}

export const createAuthConfig = (options: AuthConfigOptions) => ({
  appName: options.appName,
  baseURL: options.appUrl,
  secret: options.secret,
  trustedOrigins: options.trustedOrigins,
  // ... use options instead of process.env
});
```

**File**: `packages/authentication/src/services/auth.service.ts`

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAuthConfig } from "../config/auth.config";

@Injectable()
export class AuthService {
  constructor(
    private readonly adapterFactory: BetterAuthAdapterFactory,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService // ✅ Inject ConfigService
  ) {}

  getAuthInstance() {
    const config = this.configService.get("config"); // ✅ Read from ConfigService

    return createBetterAuthInstance({
      adapter: this.adapterFactory.createAdapter(
        config.environment === "development" // ✅ No more process.env
      ),
      options: createAuthConfig({
        appName: config.auth.appName,
        appUrl: config.auth.appUrl,
        secret: config.auth.secret,
        trustedOrigins: config.auth.trustedOrigins,
        socialProviders: config.auth.socialProviders,
      }),
      // ...
    });
  }
}
```

**File**: `packages/authentication/src/auth.module.ts`

```typescript
import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Global()
@Module({
  imports: [
    ConfigModule, // ✅ Import ConfigModule (it's global, but explicit is better)
    // ... other imports
  ],
  providers: [AuthService /* ... */],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## .env File Structure

**File**: `apps/api/.env`

```bash
# Environment
NODE_ENV=development
PORT=3004
DEVTOOLS=true

# MongoDB
MONGODB_URI=mongodb://localhost:27017

# Authentication (REQUIRED)
APP_NAME=Investment Trading Portfolio
APP_URL=http://localhost:3004
AUTH_SECRET=your-secret-key-minimum-32-characters-long
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3004
FRONTEND_URL=http://localhost:3000

# Social Providers (OPTIONAL)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret

# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

---

## Migration Checklist

If you have a package using direct `process.env` access, follow these steps:

### ✅ Checklist

- [ ] **Step 1**: Add required fields to `apps/api/src/environment/index.ts`
- [ ] **Step 2**: Update `apps/api/.env` with new variables
- [ ] **Step 3**: Create config interface in package (e.g., `AuthConfigOptions`)
- [ ] **Step 4**: Change config constants to factory functions accepting config
- [ ] **Step 5**: Inject `ConfigService` into package services
- [ ] **Step 6**: Replace `process.env.FIELD` with `config.section.field`
- [ ] **Step 7**: Import `ConfigModule` in package module (if not already)
- [ ] **Step 8**: Remove package's local `.env` file (no longer needed)
- [ ] **Step 9**: Test with missing env vars to verify error handling
- [ ] **Step 10**: Update package README with config requirements

---

## Common Pitfalls

### ❌ Anti-Pattern 1: Direct process.env in Package

```typescript
// packages/authentication/src/config/auth.config.ts
export const AUTH_CONFIG = {
  secret: process.env.AUTH_SECRET, // ❌ Won't work in package
};
```

**Why it fails**: Packages don't load .env files, only root apps do.

**Fix**:

```typescript
export const createAuthConfig = (options: { secret: string }) => ({
  secret: options.secret, // ✅ Accepts config from root app
});
```

### ❌ Anti-Pattern 2: Separate .env in Package

```
packages/
  authentication/
    .env  # ❌ This won't be loaded by NestJS
```

**Why it fails**: ConfigModule.forRoot() is only called in root app (apps/api).

**Fix**: Move all env vars to `apps/api/.env`

### ❌ Anti-Pattern 3: Not Validating Environment

```typescript
const port = parseInt(process.env.PORT || "3000"); // ❌ No validation
```

**Why it's bad**: Fails at runtime if PORT is invalid (e.g., "abc")

**Fix**: Use Zod schema with proper validation

---

## Benefits of This Pattern

1. **Type Safety**: TypeScript knows exact shape of config
2. **Early Validation**: Fail at startup, not during request handling
3. **Single Source of Truth**: All env vars in one place
4. **Better DX**: IntelliSense shows available config fields
5. **Testability**: Easy to inject mock config
6. **Documentation**: Schema serves as documentation
7. **Default Values**: Dev environment works out of the box
8. **Transformations**: Automatic type conversions

---

## Testing with Mock Config

```typescript
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "config") {
                return {
                  auth: {
                    secret: "test-secret",
                    appUrl: "http://test.com",
                  },
                  environment: "test",
                };
              }
            }),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it("should use config from ConfigService", () => {
    const instance = authService.getAuthInstance();
    expect(instance.config.secret).toBe("test-secret");
  });
});
```

---

## Summary

**Key Takeaways**:

1. ✅ **Always use ConfigModule** for environment variables in NestJS
2. ✅ **Root app owns configuration** - packages consume via injection
3. ✅ **Validate with Zod** - fail fast with clear errors
4. ✅ **Group related config** - flat .env → nested objects
5. ❌ **Never use process.env directly** in packages
6. ❌ **Never create separate .env** in packages

**Pattern**: Root app loads → validates → transforms → injects globally → packages consume

This ensures type safety, validation, and a single source of truth for all configuration.

---

**Last Updated**: December 11, 2024  
**Status**: ✅ Implemented - Authentication package migrated to ConfigModule pattern
