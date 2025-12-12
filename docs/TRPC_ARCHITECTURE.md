# tRPC Architecture - Migration Guide

## Overview

The monorepo has transitioned from a separate `@repo/trpc` package to a streamlined architecture where:

- ✅ **tRPC routers** are defined in `apps/api` using `@mguay/nestjs-trpc`
- ✅ **AppRouter type** is auto-exported to `@repo/schema/src/api/app-router.ts`
- ✅ **Web app** creates tRPC client locally using the AppRouter type
- ✅ **No separate tRPC package** needed

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/api (NestJS)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TRPCModule.forRoot({                                 │  │
│  │    autoSchemaFile: '@repo/schema/src/api/app-router.ts'│
│  │  })                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┼─────────────────────────────┐  │
│  │  Routers               ▼                              │  │
│  │  ├─ user.router.ts   ─────┐                          │  │
│  │  ├─ wealth.router.ts ─────┤                          │  │
│  │  ├─ trade.router.ts  ─────┤  Auto-generates          │  │
│  │  ├─ account.router.ts ────┤  AppRouter type          │  │
│  │  ├─ org.router.ts    ─────┤                          │  │
│  │  └─ admin.router.ts  ─────┘                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ exports AppRouter type
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              @repo/schema (Shared Types)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/api/app-router.ts (Auto-generated)              │  │
│  │  export type AppRouter = typeof appRouter;           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ imports AppRouter type
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   apps/web (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/lib/trpc/client.ts                               │  │
│  │  import type { AppRouter } from '@repo/schema/api';  │  │
│  │  export const trpc = createTRPCReact<AppRouter>();   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/lib/trpc/provider.tsx                            │  │
│  │  Creates tRPC client with httpBatchLink              │  │
│  │  Wraps app with QueryClientProvider                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. API Backend (apps/api)

**Define routers using `@mguay/nestjs-trpc` decorators:**

```typescript
// apps/api/src/user/user.router.ts
import { Router, Query, Mutation, Input } from "@mguay/nestjs-trpc";
import { z } from "zod";
import { userSchema } from "@repo/schema";

@Router({ alias: "user" })
export class UserRouter {
  constructor(private readonly userService: UserService) {}

  @Query({
    input: z.object({ id: z.string() }),
    output: userSchema,
  })
  getUser(@Input("id") id: string) {
    return this.userService.findById(id);
  }

  @Mutation({
    input: userSchema.pick({ name: true, email: true }),
    output: userSchema,
  })
  createUser(@Input() input: { name: string; email: string }) {
    return this.userService.create(input);
  }
}
```

**Register in app.module.ts:**

```typescript
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { TRPCModule } from "@mguay/nestjs-trpc";
import { UserRouter } from "./user/user.router";
import { WealthRouter } from "./wealth/wealth.router";
import { TradeRouter } from "./trade/trade.router";

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile: "./node_modules/@repo/schema/src/api/app-router.ts",
    }),
  ],
  controllers: [UserRouter, WealthRouter, TradeRouter],
})
export class AppModule {}
```

---

### 2. Schema Package (@repo/schema)

**AppRouter type is auto-generated:**

```typescript
// @repo/schema/src/api/app-router.ts (AUTO-GENERATED)
export type AppRouter = {
  user: {
    getUser: Procedure<{ input: { id: string }; output: User }>;
    createUser: Procedure<{ input: CreateUserInput; output: User }>;
  };
  wealth: {
    getNetWorth: Procedure<{ input: void; output: NetWorthData }>;
    // ... more procedures
  };
  // ... more routers
};
```

**Export from index:**

```typescript
// @repo/schema/src/api/index.ts
export type { AppRouter } from "./app-router";
```

---

### 3. Web App (apps/web)

**Create tRPC client:**

```typescript
// apps/web/src/lib/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@repo/schema/api";

export const trpc = createTRPCReact<AppRouter>();
```

**Create tRPC provider:**

```typescript
// apps/web/src/lib/trpc/provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from './client';

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include', // Send cookies for auth
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**Mount in app:**

```typescript
// apps/web/src/app/providers.tsx
'use client';

import { TrpcProvider } from '@/lib/trpc/provider';
import { AuthProvider } from '@/contexts/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <AuthProvider>{children}</AuthProvider>
    </TrpcProvider>
  );
}
```

**Use in components:**

```typescript
// apps/web/src/components/Dashboard.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export function Dashboard() {
  const { data: user, isLoading } = trpc.user.getUser.useQuery({ id: '123' });

  if (isLoading) return <Loading />;
  return <div>Welcome, {user.name}!</div>;
}
```

---

## Migration Checklist

### For Developers

- [ ] Remove all imports from `@repo/trpc`
- [ ] Update imports to use `@repo/schema/api` for AppRouter type
- [ ] Use local tRPC client creation in web app
- [ ] Update API app to use `@mguay/nestjs-trpc` decorators
- [ ] Ensure `autoSchemaFile` points to `@repo/schema/src/api/app-router.ts`

### For Documentation

- [x] Update root copilot instructions
- [x] Update API app documentation
- [x] Update web app documentation
- [x] Update schema package documentation
- [x] Update developer guide
- [x] Update project status
- [x] Update documentation status

---

## Benefits of New Architecture

### ✅ Single Source of Truth

- API routers are defined once in `apps/api`
- No duplication between separate tRPC package and API implementation
- AppRouter type automatically reflects API structure

### ✅ Simplified Dependency Graph

**Before:**

```
apps/web → @repo/trpc → apps/api (circular dependency risk)
```

**After:**

```
apps/api → @repo/schema (AppRouter type)
apps/web → @repo/schema (AppRouter type)
```

### ✅ Easier Maintenance

- Add/update routers in one place (`apps/api`)
- Type safety automatically propagates to web app
- No need to manually sync types across packages

### ✅ Better Developer Experience

- IntelliSense works perfectly (single source of truth)
- Refactoring is easier (rename procedures in API, web app updates automatically)
- Less boilerplate (no need to manage separate tRPC package)

---

## Common Patterns

### Pattern 1: Query with Parameters

```typescript
// API (apps/api/src/wealth/wealth.router.ts)
@Query({
  input: z.object({
    organizationId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
  }),
  output: netWorthDataSchema,
})
getNetWorth(@Input() input: GetNetWorthInput) {
  return this.wealthService.getNetWorth(input);
}

// Web (apps/web)
const { data } = trpc.wealth.getNetWorth.useQuery({
  organizationId: 'org-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

### Pattern 2: Mutation with Optimistic Updates

```typescript
// Web (apps/web)
const utils = trpc.useContext();

const { mutate } = trpc.user.updateProfile.useMutation({
  onMutate: async (newData) => {
    await utils.user.getProfile.cancel();
    const previous = utils.user.getProfile.getData();
    utils.user.getProfile.setData(undefined, newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    utils.user.getProfile.setData(undefined, context?.previous);
  },
  onSettled: () => {
    utils.user.getProfile.invalidate();
  },
});
```

### Pattern 3: Nested Routers

```typescript
// API (apps/api/src/trade/trade.router.ts)
@Router({ alias: "trade" })
export class TradeRouter {
  // Nested router for options
  @Router({ alias: "options" })
  optionsRouter() {
    return OptionsRouter;
  }

  @Query({ input: z.void(), output: z.array(strategySchema) })
  getStrategies() {
    return this.tradeService.getStrategies();
  }
}

// Usage in web app
const { data: strategies } = trpc.trade.getStrategies.useQuery();
const { data: volSurface } = trpc.trade.options.volatilitySurface.useQuery();
```

---

## Troubleshooting

### Issue: "Cannot find module '@repo/schema/api'"

**Solution**: Ensure the API app has generated the AppRouter file:

```bash
cd apps/api
pnpm build
# This generates @repo/schema/src/api/app-router.ts
```

### Issue: "Property 'createClient' does not exist on type..."

**Solution**: The AppRouter type is not properly imported. Check:

1. API app has `autoSchemaFile` configured in TRPCModule
2. `@repo/schema/src/api/app-router.ts` exists
3. Web app imports from `@repo/schema/api` (not `@repo/trpc`)

### Issue: "tRPC procedures not showing in IntelliSense"

**Solution**: Rebuild the API app to regenerate AppRouter type:

```bash
cd apps/api
pnpm build
```

Then restart the TypeScript server in your editor.

---

## Performance Considerations

### HTTP Batch Link

The web app uses `httpBatchLink` to batch multiple tRPC requests into a single HTTP call:

```typescript
// Multiple queries in same component
const user = trpc.user.getUser.useQuery({ id: "1" });
const profile = trpc.user.getProfile.useQuery();
const settings = trpc.user.getSettings.useQuery();

// Result: Single HTTP request with all 3 queries batched
```

### Query Caching

React Query (TanStack Query) provides automatic caching:

```typescript
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          cacheTime: 5 * 60 * 1000, // 5 minutes
          refetchOnWindowFocus: false,
        },
      },
    })
);
```

---

## Security

### Authentication

All tRPC requests include cookies for authentication:

```typescript
httpBatchLink({
  url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include", // ← Send cookies
    });
  },
});
```

### Authorization

Use guards in API routers:

```typescript
@Router({ alias: "admin" })
@UseGuards(AdminGuard)
export class AdminRouter {
  // All procedures require admin role
}
```

---

## Testing

### API Router Tests

```typescript
// apps/api/src/user/user.router.spec.ts
describe("UserRouter", () => {
  let router: UserRouter;
  let service: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserRouter, { provide: UserService, useValue: mockService }],
    }).compile();

    router = module.get(UserRouter);
  });

  it("should get user by id", async () => {
    const result = await router.getUser("123");
    expect(result).toEqual({ id: "123", name: "Test" });
  });
});
```

### Web App Integration Tests

```typescript
// apps/web/src/lib/trpc/client.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { trpc } from './client';

const wrapper = ({ children }) => (
  <TrpcProvider>{children}</TrpcProvider>
);

test('fetches user data', async () => {
  const { result } = renderHook(() => trpc.user.getUser.useQuery({ id: '1' }), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: '1', name: 'Test' });
});
```

---

## Summary

| Aspect              | Old (@repo/trpc)     | New (API + Schema) |
| ------------------- | -------------------- | ------------------ |
| **Router Location** | `packages/trpc/src/` | `apps/api/src/`    |
| **Type Export**     | Manual               | Auto-generated     |
| **Client Creation** | `@repo/trpc/client`  | Local in web app   |
| **Maintenance**     | Two places           | One place (API)    |
| **Type Safety**     | Manual sync          | Automatic          |
| **Dependencies**    | Circular risk        | Clean hierarchy    |

**Key Takeaway**: Routers live in API app, types auto-export to schema, web app creates client locally. Simple, maintainable, type-safe! 🎉
