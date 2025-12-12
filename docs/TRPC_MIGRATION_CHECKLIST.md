# tRPC Architecture Migration Checklist

> **Status**: Ready to delete `@repo/trpc` package
>
> **Architecture Change**: From separate tRPC package → Routers in API app + Type export to schema

---

## ✅ Completed (Documentation & Implementation)

### Phase 1: Web App Implementation

- [x] Created local tRPC client (`apps/web/src/lib/trpc/client.ts`)
  - Uses `createTRPCReact<AppRouter>()` from `@trpc/react-query`
  - Imports AppRouter type from `@repo/schema/api`
- [x] Created TrpcProvider (`apps/web/src/lib/trpc/provider.tsx`)
  - QueryClient configuration
  - httpBatchLink with credentials
  - Proper React provider setup
- [x] Updated providers.tsx to use local TrpcProvider
- [x] Updated all web app documentation (4 files)

### Phase 2: API App Documentation

- [x] Updated API README.md
  - Added AppRouter export documentation
  - Updated shared packages list
- [x] Updated API copilot instructions
  - Removed @repo/trpc references
  - Added note about auto-export

### Phase 3: Root Documentation

- [x] Updated DEVELOPER_GUIDE.md
  - Rewrote "Adding a New API Endpoint" section
  - Changed from packages/trpc to apps/api
- [x] Updated packages/schema/README.md
  - Replaced @repo/trpc section with apps/api section
  - Documented AppRouter export pattern
- [x] Updated PROJECT_STATUS.md
  - Replaced @repo/trpc status with new architecture
  - Added benefits and implementation details
- [x] Updated DOCUMENTATION_STATUS.md
  - Changed tRPC section to "DOCUMENTED ✅"
  - Updated metrics (60% → 75% coverage)
- [x] Updated root copilot instructions
  - Added tRPC Architecture section
  - Updated @repo/schema description

### Phase 4: New Documentation

- [x] Created comprehensive migration guide (`docs/TRPC_ARCHITECTURE.md`)
  - Architecture diagrams
  - Implementation patterns
  - Common use cases
  - Troubleshooting guide
  - Performance & security
  - Testing strategies
- [x] Created migration checklist (this file)
- [x] Updated main README.md with documentation links

**Total Files Updated**: 15 files
**Total Files Created**: 2 files
**Documentation Coverage Improvement**: 60% → 75%

---

## 🔜 Pending Tasks (Implementation)

### Step 1: Delete @repo/trpc Package

```bash
# 1. Remove package directory
Remove-Item -Recurse -Force packages\trpc

# 2. Update root package.json
# Remove from workspaces array if explicitly listed

# 3. Update pnpm-workspace.yaml
# Verify packages/trpc is not explicitly listed (or remove it)

# 4. Clean install
pnpm install
```

**Expected Errors**:

- Web app will show TypeScript errors (AppRouter type doesn't exist yet)
- This is expected and will be resolved in Step 2

### Step 2: Implement API Routers

Create tRPC routers in `apps/api/src/*/*.router.ts`:

#### 2a. Wealth Router

```bash
# Create directory
New-Item -ItemType Directory -Force apps\api\src\wealth
```

```typescript
// apps/api/src/wealth/wealth.router.ts
import { Router, Query, Input } from "@mguay/nestjs-trpc";
import { z } from "zod";
import { netWorthDataSchema, assetAllocationSchema } from "@repo/schema";

@Router({ alias: "wealth" })
export class WealthRouter {
  constructor(private readonly wealthService: WealthService) {}

  @Query({
    input: z.object({ organizationId: z.string() }),
    output: netWorthDataSchema,
  })
  async getNetWorth(@Input() input: { organizationId: string }) {
    return this.wealthService.getNetWorth(input.organizationId);
  }

  @Query({
    input: z.object({ organizationId: z.string() }),
    output: z.array(assetAllocationSchema),
  })
  async getAssetAllocation(@Input() input: { organizationId: string }) {
    return this.wealthService.getAssetAllocation(input.organizationId);
  }
}
```

#### 2b. Trade Router

```bash
# Create directory
New-Item -ItemType Directory -Force apps\api\src\trade
```

```typescript
// apps/api/src/trade/trade.router.ts
import { Router, Query, Mutation, Input } from "@mguay/nestjs-trpc";
import { z } from "zod";
import { strategySchema, positionSchema } from "@repo/schema";

@Router({ alias: "trade" })
export class TradeRouter {
  constructor(private readonly tradeService: TradeService) {}

  @Query({
    input: z.object({ organizationId: z.string() }),
    output: z.array(strategySchema),
  })
  async getActiveStrategies(@Input() input: { organizationId: string }) {
    return this.tradeService.getActiveStrategies(input.organizationId);
  }

  @Mutation({
    input: z.object({
      strategyId: z.string(),
      parameters: z.record(z.unknown()),
    }),
    output: z.object({ success: z.boolean() }),
  })
  async updateStrategyParameters(
    @Input() input: { strategyId: string; parameters: Record<string, unknown> }
  ) {
    await this.tradeService.updateParameters(
      input.strategyId,
      input.parameters
    );
    return { success: true };
  }
}
```

#### 2c. Nested Options Router

```typescript
// apps/api/src/trade/options/options.router.ts
import { Router, Query, Input } from "@mguay/nestjs-trpc";
import { z } from "zod";
import { volatilitySurfaceSchema, gammaExposureSchema } from "@repo/schema";

@Router({ alias: "options" })
export class OptionsRouter {
  @Query({
    input: z.object({ symbol: z.string(), expiry: z.string() }),
    output: volatilitySurfaceSchema,
  })
  async volatilitySurface(@Input() input: { symbol: string; expiry: string }) {
    return this.optionsService.getVolatilitySurface(input.symbol, input.expiry);
  }

  @Query({
    input: z.object({ symbol: z.string() }),
    output: gammaExposureSchema,
  })
  async gammaExposure(@Input() input: { symbol: string }) {
    return this.optionsService.getGammaExposure(input.symbol);
  }
}

// Nest in TradeRouter
@Router({ alias: "trade" })
export class TradeRouter {
  @Router({ alias: "options" })
  optionsRouter() {
    return OptionsRouter;
  }
}
```

#### 2d. Account Router

```bash
New-Item -ItemType Directory -Force apps\api\src\account
```

```typescript
// apps/api/src/account/account.router.ts
@Router({ alias: "account" })
export class AccountRouter {
  @Query({ input: z.void(), output: userProfileSchema })
  async getProfile() {
    return this.accountService.getProfile();
  }

  @Query({ input: z.void(), output: z.array(linkedAccountSchema) })
  async getLinkedAccounts() {
    return this.accountService.getLinkedAccounts();
  }
}
```

#### 2e. Organization Router

```bash
New-Item -ItemType Directory -Force apps\api\src\organization
```

```typescript
// apps/api/src/organization/organization.router.ts
@Router({ alias: "organization" })
export class OrganizationRouter {
  @Query({ input: z.void(), output: z.array(organizationSchema) })
  async getAll() {
    return this.organizationService.getUserOrganizations();
  }

  @Query({
    input: z.object({ orgId: z.string() }),
    output: z.array(teamSchema),
  })
  async getTeams(@Input("orgId") orgId: string) {
    return this.organizationService.getTeams(orgId);
  }
}
```

#### 2f. Admin Router (Protected)

```bash
New-Item -ItemType Directory -Force apps\api\src\admin
```

```typescript
// apps/api/src/admin/admin.router.ts
import { UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";

@Router({ alias: "admin" })
@UseGuards(AdminGuard)
export class AdminRouter {
  @Query({ input: z.void(), output: z.array(trainingRunSchema) })
  async getTrainingRuns() {
    return this.adminService.getTrainingRuns();
  }

  @Mutation({
    input: z.object({ type: z.enum(["GLOBAL", "STRATEGY", "USER"]) }),
    output: z.object({ success: z.boolean() }),
  })
  async triggerKillSwitch(@Input("type") type: string) {
    await this.adminService.triggerKillSwitch(type);
    return { success: true };
  }
}
```

#### 2g. Register Routers in AppModule

```typescript
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { TRPCModule } from "@mguay/nestjs-trpc";
import { UserRouter } from "./user/user.router";
import { WealthRouter } from "./wealth/wealth.router";
import { TradeRouter } from "./trade/trade.router";
import { AccountRouter } from "./account/account.router";
import { OrganizationRouter } from "./organization/organization.router";
import { AdminRouter } from "./admin/admin.router";

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: "./node_modules/@repo/schema/src/api/app-router.ts",
    }),
    // ... other modules
  ],
  controllers: [
    UserRouter,
    WealthRouter,
    TradeRouter,
    AccountRouter,
    OrganizationRouter,
    AdminRouter,
  ],
})
export class AppModule {}
```

### Step 3: Add Missing Types to @repo/schema

```bash
# Create types file
New-Item -ItemType File -Force packages\schema\src\wealth\index.ts
```

```typescript
// packages/schema/src/wealth/index.ts
import { z } from "zod";

export const netWorthDataSchema = z.object({
  liquidAssets: z.record(z.number()),
  lockedAssets: z.record(z.number()),
  totalLiabilities: z.number(),
  netWorth: z.number(),
  lastUpdated: z.date(),
});

export const assetAllocationSchema = z.object({
  category: z.string(),
  subcategory: z.string(),
  value: z.number(),
  percentage: z.number(),
});

export type NetWorthData = z.infer<typeof netWorthDataSchema>;
export type AssetAllocation = z.infer<typeof assetAllocationSchema>;
```

```typescript
// packages/schema/src/trade/index.ts
export const strategySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["STRADDLE", "IRON_CONDOR", "STRANGLE", "CUSTOM"]),
  isActive: z.boolean(),
  parameters: z.record(z.unknown()),
});

export const positionSchema = z.object({
  id: z.string(),
  strategyId: z.string(),
  instrument: z.string(),
  entryPrice: z.number(),
  quantity: z.number(),
  currentValue: z.number(),
  pnl: z.number(),
});

export const volatilitySurfaceSchema = z.object({
  strikes: z.array(z.number()),
  expiries: z.array(z.string()),
  ivs: z.array(z.array(z.number())),
});

export const gammaExposureSchema = z.object({
  strikes: z.array(z.number()),
  gammaExposure: z.array(z.number()),
  flipZone: z.number().optional(),
});
```

```typescript
// packages/schema/src/account/index.ts
export const linkedAccountSchema = z.object({
  accountId: z.string(),
  provider: z.enum(["UPSTOX", "ZERODHA", "BINANCE", "BANK"]),
  type: z.enum(["BROKER", "EXCHANGE", "BANK"]),
  lastSync: z.date(),
  isActive: z.boolean(),
});
```

```typescript
// packages/schema/src/organization/index.ts
export const teamSchema = z.object({
  teamId: z.string(),
  name: z.string(),
  memberCount: z.number(),
  permissions: z.array(z.string()),
});
```

```typescript
// packages/schema/src/admin/index.ts
export const trainingRunSchema = z.object({
  runId: z.string(),
  modelType: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  epochs: z.array(
    z.object({
      epoch: z.number(),
      trainingLoss: z.number(),
      validationLoss: z.number(),
    })
  ),
});
```

### Step 4: Build and Verify

```bash
# Build API app (generates AppRouter type)
cd apps\api
pnpm build

# Verify AppRouter file exists
Get-Content ..\..\packages\schema\src\api\app-router.ts

# Build web app (should compile without errors now)
cd ..\web
pnpm build
```

### Step 5: Test tRPC Client

```typescript
// apps/web/src/app/test-trpc/page.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export default function TestTrpcPage() {
  const { data: user } = trpc.user.getUser.useQuery({ id: 'test-123' });
  const { data: netWorth } = trpc.wealth.getNetWorth.useQuery({
    organizationId: 'org-123',
  });

  return (
    <div>
      <h1>tRPC Test Page</h1>
      <pre>{JSON.stringify({ user, netWorth }, null, 2)}</pre>
    </div>
  );
}
```

Visit `http://localhost:3000/test-trpc` and verify data loads.

### Step 6: Update Dependencies

```bash
# Remove @repo/trpc from package.json files
# apps/web/package.json
# apps/api/package.json

# Add direct tRPC dependencies if not already present
cd apps\web
pnpm add @trpc/client @trpc/react-query @trpc/server

cd ..\api
pnpm add @trpc/server @mguay/nestjs-trpc

# Root install
cd ..\..
pnpm install
```

---

## ✅ Validation Checklist

After completing all steps, verify:

### Code Validation

- [ ] `packages/trpc` directory deleted
- [ ] No remaining `@repo/trpc` imports in codebase
  ```bash
  # Search for any remaining references
  git grep "@repo/trpc"
  # Should return: no matches
  ```
- [ ] `@repo/schema/src/api/app-router.ts` exists and exports AppRouter
- [ ] Web app compiles without TypeScript errors
  ```bash
  cd apps\web
  pnpm build
  ```
- [ ] API app compiles without errors
  ```bash
  cd apps\api
  pnpm build
  ```

### Runtime Validation

- [ ] API server starts successfully
  ```bash
  cd apps\api
  pnpm dev
  ```
- [ ] Web app starts successfully
  ```bash
  cd apps\web
  pnpm dev
  ```
- [ ] tRPC queries work in browser
  - Open DevTools Network tab
  - Should see `/trpc/user.getUser,wealth.getNetWorth` batch requests
- [ ] tRPC mutations work
  - Test updating strategy parameters
  - Should see successful response
- [ ] AuthContext prevents multiple fetches
  - Open React DevTools
  - Verify single session fetch on mount
- [ ] Organization scoping works
  - Verify all data is scoped to active organization

### Documentation Validation

- [ ] All documentation reflects new architecture
  ```bash
  # Verify no stale references
  git grep "@repo/trpc" -- "*.md"
  # Should return: no matches
  ```
- [ ] README.md updated with new docs links
- [ ] TRPC_ARCHITECTURE.md is comprehensive
- [ ] DEVELOPER_GUIDE.md has correct instructions

---

## 📝 Summary

**What Changed**:

- ❌ Removed: `@repo/trpc` package (separate tRPC routers)
- ✅ Added: tRPC routers in `apps/api/src/*/*.router.ts`
- ✅ Added: AppRouter type export to `@repo/schema`
- ✅ Added: Local tRPC client creation in web app

**Benefits**:

- Single source of truth (API app)
- Automatic type propagation
- Simplified dependency graph
- No circular dependencies
- Easier maintenance

**Migration Effort**:

- Documentation: ✅ Complete (15 files updated)
- Implementation: ⏳ Pending (6 routers + services needed)
- Testing: ⏳ Pending (integration tests needed)

**Estimated Time**: 4-6 hours for full implementation

---

## 🆘 Troubleshooting

### Error: "Cannot find module '@repo/schema/api'"

**Cause**: AppRouter type not generated yet

**Solution**:

```bash
cd apps\api
pnpm build
```

### Error: "Property 'wealth' does not exist on type 'CreateTRPCReact'"

**Cause**: WealthRouter not registered in AppModule

**Solution**: Add `WealthRouter` to `controllers` array in `app.module.ts`

### Error: "Session not found"

**Cause**: Authentication not configured properly

**Solution**: Verify Better Auth backend is running and cookies are being sent

### Error: "Organization not found"

**Cause**: User doesn't have active organization set

**Solution**: Ensure user has joined/created an organization in the database

---

## 📚 Additional Resources

- [tRPC Architecture Guide](TRPC_ARCHITECTURE.md) - Comprehensive implementation guide
- [Developer Guide](../DEVELOPER_GUIDE.md) - How to add new API endpoints
- [Web App Authentication](../apps/web/docs/AUTHENTICATION.md) - Auth state management
- [Data Access Layer](../apps/web/docs/DATA_ACCESS_LAYER.md) - Secure data fetching

---

**Last Updated**: December 5, 2025  
**Status**: Ready for Implementation ✅
