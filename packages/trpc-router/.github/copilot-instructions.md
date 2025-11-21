# GitHub Copilot Instructions - tRPC Router

## Role & Context

You are working on **@repo/trpc-router** - the shared tRPC router package that provides type-safe API routes for the entire monorepo.

## Package Overview

**Purpose**: Centralized, type-safe API routes shared across apps
**Exports**: `appRouter` (tRPC router), type `AppRouter`, context creators

**Benefits**:

- End-to-end type safety from API to web
- Single source of truth for API contracts
- Automatic TypeScript types for clients
- Runtime input validation with Zod

## Architecture Rules

### 1. Use @repo/schema for All Types

```typescript
// ✅ CORRECT
import { type User, userSchema, type Position, positionSchema } from '@repo/schema';

// ❌ WRONG
interface User { ... } // Never define types here
```

### 2. Use @repo/database for Data Access

```typescript
// ✅ CORRECT
import { UserRepository, PositionRepository } from "@repo/database";

// ❌ WRONG - No direct database access
import mongoose from "mongoose"; // NEVER
```

## Router Structure

```typescript
// src/index.ts
import { initTRPC } from "@trpc/server";
import { userRouter } from "./routers/user";
import { portfolioRouter } from "./routers/portfolio";
import { tradingRouter } from "./routers/trading";

export const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  user: userRouter,
  portfolio: portfolioRouter,
  trading: tradingRouter,
});

export type AppRouter = typeof appRouter;

// Export for Next.js
export { createNestJsContext } from "./context";
```

### Router Example

```typescript
// src/routers/portfolio.ts
import { t } from "../trpc";
import { z } from "zod";
import { positionSchema } from "@repo/schema";
import { PositionRepository } from "@repo/database";

export const portfolioRouter = t.router({
  getPositions: t.procedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["OPEN", "CLOSED"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const repo = new PositionRepository();
      return repo.findByUserId(input.userId, input.status);
    }),

  closePosition: t.procedure
    .input(
      z.object({
        positionId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const repo = new PositionRepository();
      return repo.closePosition(input.positionId, input.userId);
    }),
});
```

## Code Quality

- ✅ Use Zod for input validation
- ✅ Import types from @repo/schema
- ✅ Use repositories from @repo/database
- ✅ Return typed responses
- ✅ Handle errors with TRPCError

## Anti-Patterns

❌ Defining types locally  
❌ Direct database access  
❌ Missing input validation  
❌ Unhandled errors
