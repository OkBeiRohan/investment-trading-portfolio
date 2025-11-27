# GitHub Copilot Instructions - Root

## Project Overview

This is a **monorepo** for an algorithmic trading system built with Turborepo, managing multiple apps and shared packages.

```
investment-trading-portfolio/
├── apps/
│   ├── algo-worker/        # Algorithmic trading engine (NestJS)
│   ├── api/                # REST API server (NestJS)
│   ├── web/                # Dashboard UI (Next.js)
│   ├── market-feeder/      # Market data ingestion (NestJS)
│   ├── data-processor/     # Feature engineering (NestJS)
│   └── training-pipeline/  # ML training (Kedro)
└── packages/
    ├── schema/             # Shared Zod schemas & types
    ├── database/           # Database clients (MongoDB, QuestDB, Redis)
    ├── market-sdk/         # Market data SDK (Upstox, Yahoo, Binance)
    ├── trpc/        # Shared tRPC router
    ├── eslint-config/      # Shared ESLint config
    ├── typescript-config/  # Shared TypeScript config
    └── jest-config/        # Shared Jest config
```

## Core Principles

### 1. Shared Package Architecture

**CRITICAL: All apps MUST use shared packages. NEVER duplicate code.**

```typescript
// ✅ CORRECT - Import from shared packages
import { type User, userSchema } from "@repo/schema";
import { QuestDBService, RedisService } from "@repo/database";
import { UpstoxClient } from "@repo/market-sdk";

// ❌ WRONG - Local implementations
import { UpstoxClient } from "./utils/upstox"; // NEVER
import { connectDB } from "./db"; // NEVER
```

### 2. Database Package is Single Source

**CRITICAL: ALL database connections, schemas, and repositories MUST be in `@repo/database`.**

- ✅ **DO**: Use exported services from `@repo/database`
- ✅ **DO**: Define all database schemas in `@repo/database/src/schemas`
- ✅ **DO**: Create repositories in `@repo/database/src/repositories`
- ❌ **DON'T**: Install `@nestjs/mongoose` in apps
- ❌ **DON'T**: Create database connections in apps
- ❌ **DON'T**: Define schemas or models in apps

**Example - Correct Usage:**

```typescript
// apps/algo-worker/src/app.module.ts
import {
  TradingDatabaseModule,
  QuestDBModule,
  RedisModule,
} from "@repo/database";

@Module({
  imports: [
    TradingDatabaseModule, // MongoDB connection + schemas
    QuestDBModule, // QuestDB connection
    RedisModule, // Redis connection
  ],
})
export class AppModule {}

// apps/algo-worker/src/engines/signal/signal.service.ts
import { Injectable } from "@nestjs/common";
import { TradingSignalRepository } from "@repo/database";

@Injectable()
export class SignalService {
  constructor(
    private readonly signalRepo: TradingSignalRepository // ✅ From @repo/database
  ) {}

  async saveSignal(data: any) {
    return this.signalRepo.create(data); // ✅ Use repository
  }
}
```

### 3. Schema Package is Single Source of Truth

**ALL types, interfaces, and Zod schemas MUST be in `@repo/schema`.**

- ✅ **DO**: Define all types in `@repo/schema`
- ✅ **DO**: Use Zod for runtime validation
- ✅ **DO**: Export both Zod schemas and TypeScript types
- ❌ **DON'T**: Create type definitions in apps
- ❌ **DON'T**: Define interfaces in service files
- ❌ **DON'T**: Duplicate schemas

### 4. Documentation Requirements

**EVERY feature implementation MUST update documentation:**

1. **After creating a feature:**
   - Update `README.md` with usage instructions
   - Update architecture docs in `docs/` folder
   - Add code examples if it's a public API
   - Update progress tracking file

2. **Documentation Structure:**

   ```
   app-or-package/
   ├── README.md              # Overview, quick start, API reference
   ├── docs/
   │   ├── ARCHITECTURE.md    # Design decisions, structure
   │   ├── PROGRESS.md        # Implementation status
   │   ├── API.md             # API documentation (if applicable)
   │   └── EXAMPLES.md        # Usage examples
   └── .github/
       └── copilot-instructions.md
   ```

3. **Progress Tracking:**
   - Each app/package MUST have `docs/PROGRESS.md`
   - Update after completing each feature
   - Include: completed features, in-progress, planned

### 5. Type Safety

- Use **strict TypeScript** everywhere
- Enable all strict compiler options
- Use Zod for runtime validation
- Generate Python types from Zod schemas

### 6. Error Handling

- Use custom exception classes
- Never use generic `Error` or `any`
- Log errors with context
- Implement proper HTTP status codes

### 7. Testing

- Unit tests for business logic
- Integration tests for database operations
- E2E tests for API endpoints
- Mock external dependencies

## Development Workflow

### Adding a New Feature

1. **Check shared packages first** - Can you use existing code?
2. **Define types** - Add to `@repo/schema` if new types needed
3. **Implement feature** - In the appropriate app/package
4. **Write tests** - Unit, integration, and E2E as needed
5. **Update documentation** - README, architecture docs, progress
6. **Update copilot instructions** - If workflow changes

### Creating a New Shared Package

1. Create package in `packages/` directory
2. Add `package.json` with proper exports
3. Add to `pnpm-workspace.yaml`
4. Create `.github/copilot-instructions.md`
5. Create `docs/` folder with architecture docs
6. Export from package root `index.ts`
7. Update root copilot instructions

## Package-Specific Rules

### @repo/schema

- Define all types and Zod schemas
- One schema per file (logical grouping)
- Export both schema and type
- Use composition over duplication

### @repo/database

- ALL database logic lives here
- Export modules, services, and repositories
- No database code in apps
- Provide health check methods

### @repo/market-sdk

- Multi-provider support (Upstox, Yahoo, Binance)
- Use provider factory pattern
- Implement unified interfaces
- Handle authentication centrally

## CI/CD & Build

- Use `turbo` for all commands
- Build shared packages before apps
- Run tests in parallel
- Use caching for faster builds

## Code Quality Standards

- **ESLint**: Must pass with no errors
- **TypeScript**: Strict mode, no `any` types
- **Prettier**: Auto-format all code
- **Tests**: Maintain >80% coverage
- **Documentation**: Keep up-to-date

## When Making Changes

1. ✅ Check if shared package already exists
2. ✅ Use TypeScript strict mode
3. ✅ Add tests for new code
4. ✅ Update documentation
5. ✅ Update progress tracking
6. ✅ Follow established patterns
7. ✅ Use dependency injection
8. ✅ Handle errors properly

## Common Anti-Patterns to Avoid

❌ Installing database packages in apps  
❌ Defining types outside @repo/schema  
❌ Duplicating logic across apps  
❌ Skipping documentation updates  
❌ Using `any` types  
❌ Creating database connections in apps  
❌ Bypassing shared packages  
❌ Committing without tests

## Getting Help

- Check app-specific `.github/copilot-instructions.md`
- Review `docs/ARCHITECTURE.md` in each package
- Look at existing code patterns
- Check `docs/PROGRESS.md` for implementation status
