# @repo/trpc

Shared tRPC router for type-safe API communication between frontend and backend.

## Overview

**Purpose**: Centralized tRPC router providing end-to-end type safety across the monorepo

## Features

- ✅ Type-safe API routes
- ✅ Automatic TypeScript type inference
- ✅ Input validation with Zod
- ✅ Shared between `api` server and `web` client
- ✅ Subscription support for real-time updates
- ✅ **Automatic authentication** with credential forwarding
- ✅ **Auto-retry on 401** (refresh session + retry request)
- ✅ **Graceful logout** if session cannot be refreshed

## Authentication

**All tRPC requests are automatically authenticated** with cookies forwarded to the backend.

### Client-Side (Automatic)

```tsx
// Cookies are automatically included
const { data: user } = trpc.user.getProfile.useQuery();
```

**What Happens**:

1. Request sent with `credentials: "include"` (cookies forwarded)
2. If backend returns 401 → Auth link refreshes session
3. If refresh succeeds → Original request retried automatically
4. If refresh fails → User redirected to login

### Server-Side (Server Components)

```tsx
import { serverTrpc } from "@repo/trpc/server";

export default async function ProfilePage() {
  // Cookies from Next.js request are automatically forwarded
  const user = await serverTrpc.user.getProfile.query();
  return <div>Welcome, {user.name}</div>;
}
```

**See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed flow diagrams.**

## Installation

This package is part of the monorepo. Import in your apps:

### Server-Side (NestJS)

```typescript
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { TrpcModule } from "@repo/trpc";

@Module({
  imports: [TrpcModule],
})
export class AppModule {}
```

### Client-Side (Next.js)

```tsx
// apps/web/src/app/providers.tsx
import { TrpcProvider } from "@repo/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}

// apps/web/src/components/posts.tsx
import { trpc } from "@repo/trpc";

export function PostsList() {
  // Simple, clean API - no need for useQuery()!
  const { data: posts, isLoading } = trpc.postsRouter.findAll.useQuery();

  const createPost = trpc.postsRouter.create.useMutation();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {posts?.map((post) => (
        <div key={post.id}>{post.caption}</div>
      ))}
      <button
        onClick={() =>
          createPost.mutate({ image: "img.jpg", caption: "Hello!" })
        }
      >
        Create Post
      </button>
    </div>
  );
}
```

## Router Structure

```typescript
src/
├── index.ts                # Main exports (appRouter, AppRouter type)
├── context.ts              # tRPC context (auth, db)
├── middleware.ts           # Authentication middleware
└── routers/
    ├── user.router.ts      # User management routes
    ├── portfolio.router.ts # Portfolio queries
    ├── trading.router.ts   # Trading signals/positions
    └── market.router.ts    # Market data subscriptions
```

## Example Routes

### Portfolio Router

```typescript
// packages/trpc/src/routers/portfolio.router.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { portfolioSummarySchema } from "@repo/schema";

export const portfolioRouter = router({
  getSummary: publicProcedure
    .input(z.object({ userId: z.string() }))
    .output(portfolioSummarySchema)
    .query(async ({ input, ctx }) => {
      return ctx.db.portfolio.findByUserId(input.userId);
    }),

  getPositions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.positions.findAll({ userId: input.userId });
    }),
});
```

### Trading Router (with Subscriptions)

```typescript
// packages/trpc/src/routers/trading.router.ts
import { observable } from "@trpc/server/observable";
import { tradingSignalSchema } from "@repo/schema";

export const tradingRouter = router({
  getSignals: publicProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return ctx.db.signals.find().limit(input.limit).toArray();
    }),

  // Real-time signal subscription
  onSignalCreated: publicProcedure.subscription(({ ctx }) => {
    return observable<TradingSignal>((emit) => {
      const handler = (signal: TradingSignal) => {
        emit.next(signal);
      };

      ctx.events.on("signal:created", handler);

      return () => {
        ctx.events.off("signal:created", handler);
      };
    });
  }),
});
```

## Usage in Next.js

### Page Component

```typescript
// apps/web/src/app/portfolio/page.tsx
'use client';
import { trpc } from '@/utils/trpc';

export default function PortfolioPage() {
  const { data, isLoading } = trpc.portfolio.getSummary.useQuery({
    userId: 'user-123',
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Portfolio Summary</h1>
      <p>Total Value: {data?.totalValue}</p>
    </div>
  );
}
```

### Real-Time Subscriptions

```typescript
// apps/web/src/components/SignalFeed.tsx
'use client';
import { trpc } from '@/utils/trpc';
import { useEffect, useState } from 'react';

export function SignalFeed() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);

  trpc.trading.onSignalCreated.useSubscription(undefined, {
    onData(signal) {
      setSignals((prev) => [signal, ...prev]);
    },
  });

  return (
    <div>
      {signals.map((signal) => (
        <SignalCard key={signal._id} signal={signal} />
      ))}
    </div>
  );
}
```

## Context Setup

```typescript
// packages/trpc/src/context.ts
import { db } from "@repo/database";
import type { inferAsyncReturnType } from "@trpc/server";

export async function createContext() {
  return {
    db, // MongoDB collections
    user: null, // Set by auth middleware
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

## Authentication Middleware

```typescript
// packages/trpc/src/middleware.ts
import { TRPCError } from "@trpc/server";

export const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user, // User is now non-nullable
    },
  });
});

// Protected procedure
export const protectedProcedure = publicProcedure.use(isAuthed);
```

## Type Safety Workflow

```
Define Schema (@repo/schema)
    ↓
Use in tRPC Router (input/output validation)
    ↓
Auto-generate TypeScript types
    ↓
Frontend gets full type inference
```

## Benefits

1. **End-to-End Type Safety**: Types flow from backend to frontend automatically
2. **No API Boilerplate**: No need to manually define REST endpoints
3. **Runtime Validation**: Zod schemas validate inputs at runtime
4. **Auto-completion**: Full IntelliSense in frontend code
5. **Real-Time Support**: Built-in subscription mechanism

## Architecture Rules

- ✅ **DO**: Use `@repo/schema` for all input/output types
- ✅ **DO**: Use `@repo/database` for database access
- ✅ **DO**: Keep routers focused (one router per domain)
- ❌ **DON'T**: Define types locally (use @repo/schema)
- ❌ **DON'T**: Access external APIs directly (use services)

## Documentation

- [Copilot Instructions](.github/copilot-instructions.md)
- [tRPC Documentation](https://trpc.io/)
- [API Routes Reference](docs/API_ROUTES.md) (TODO)

## Stack

- tRPC
- Zod (via @repo/schema)
- TypeScript

## Contributing

Follow the coding standards in `.github/copilot-instructions.md`.
