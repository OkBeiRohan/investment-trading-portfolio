# @repo/schema

Centralized Zod schemas and TypeScript types for the entire monorepo.

## Purpose

This package serves as the **single source of truth** for all data structures, types, and validation schemas across the investment-trading-portfolio monorepo. It ensures type safety and consistency between:

- NestJS backend applications (`api`, `algo-worker`)
- Next.js frontend (`web`)
- Shared packages (`database`, `market-sdk`, `trpc`)

## Architecture Principle

**No types or interfaces should be defined outside of `@repo/schema`**

All packages must import types from this central location to prevent:

- Type duplication
- Schema drift between packages
- Inconsistent validation logic
- Maintenance overhead

## Package Structure

```
src/
├── index.ts                    # Main export file
├── common/                     # Shared utilities
│   ├── response.schema.ts     # API response schemas
│   └── index.ts
├── user/                       # User authentication & management
│   ├── user.schema.ts         # User model
│   ├── auth.schema.ts         # Login, register, JWT
│   ├── password.schema.ts     # Password management
│   ├── email-verification.schema.ts
│   ├── two-factor.schema.ts
│   ├── user-update.schema.ts
│   ├── user-query.schema.ts
│   ├── user-delete.schema.ts
│   ├── session.schema.ts
│   ├── user.enums.ts         # User roles, sort enums
│   └── index.ts
└── trading/                    # Trading & market data
    ├── index.ts               # Trading enums & core schemas
    ├── market-data.schema.ts  # Instruments, quotes, option chains
    ├── portfolio.schema.ts    # Positions, holdings, funds
    ├── websocket.schema.ts    # Real-time stream types
    └── api.schema.ts          # API config & responses
```

## Usage

### Importing Schemas

```typescript
// Import user schemas
import { userSchema, userLoginSchema, type User } from "@repo/schema";

// Import trading schemas
import {
  orderSchema,
  tradingSignalSchema,
  type Order,
  type TradingSignal,
} from "@repo/schema";

// Import market data types
import {
  type Instrument,
  type OptionGreeks,
  type MarketDataFeed,
} from "@repo/schema";

// Import enums
import { ExchangeEnum, OrderTypeEnum, ProductTypeEnum } from "@repo/schema";
```

### Validation

```typescript
import { orderSchema } from "@repo/schema";

// Validate data
const result = orderSchema.safeParse(rawData);
if (!result.success) {
  console.error("Validation errors:", result.error);
}

// Parse with error throwing
const validatedOrder = orderSchema.parse(rawData);
```

### With tRPC

```typescript
import { z } from "zod";
import { orderSchema } from "@repo/schema";

export const orderRouter = router({
  createOrder: publicProcedure
    .input(orderSchema)
    .mutation(async ({ input }) => {
      // input is fully typed and validated
      return await db.orders.create(input);
    }),
});
```

### With MongoDB/Mongoose

```typescript
import { Schema, model } from "mongoose";
import { type TradingSignal } from "@repo/schema";

const tradingSignalMongooseSchema = new Schema<TradingSignal>({
  userId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  prediction: {
    type: String,
    enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"],
    required: true,
  },
  // ... other fields
});

export const TradingSignalModel = model<TradingSignal>(
  "TradingSignal",
  tradingSignalMongooseSchema
);
```

## Schema Categories

### User Schemas

All user authentication, authorization, and profile management schemas:

- User CRUD operations
- Authentication (login, register, JWT, 2FA)
- Password management (reset, change, forgot)
- Email verification
- Session management
- User queries and pagination

### Trading Schemas

Comprehensive trading and market data schemas:

#### Core Trading

- `tradingSignalSchema` - ML model predictions
- `orderSchema` - Order placement and tracking
- `positionSchema` - Position management
- `strategySchema` - Trading strategy definitions
- `performanceMetricsSchema` - Performance analytics
- `rlAgentStateSchema` - RL agent persistence

#### Market Data

- `instrumentSchema` - Instrument definitions
- `quoteSchema` - Real-time quotes
- `optionGreeksSchema` - Option Greeks (delta, gamma, vega, theta)
- `optionChainDataSchema` - Option chain data
- `marketDepthSchema` - Order book depth
- `candleSchema` - OHLC candlestick data

#### Portfolio

- `tradingPositionSchema` - Active positions
- `holdingSchema` - Long-term holdings
- `fundsSchema` - Account funds and margins
- `portfolioSummarySchema` - Portfolio overview

#### WebSocket Streams

- `marketDataFeedSchema` - Real-time market updates
- `portfolioStreamFeedSchema` - Portfolio updates
- `webSocketConfigSchema` - WebSocket configuration

#### API

- `apiConfigSchema` - API client configuration
- `apiResponseSchema` - Standardized API responses
- `apiErrorSchema` - Error handling
- `paginationParamsSchema` - Pagination utilities

### Common Schemas

Reusable utilities:

- `successResponseSchema` - Success responses
- `errorResponseSchema` - Error responses
- `createPaginatedResponseSchema` - Pagination factory

## Enums

All enums are defined as Zod enums for runtime validation:

```typescript
// Trading enums
ExchangeEnum; // NSE_EQ, NSE_FO, BSE_EQ, etc.
ProductTypeEnum; // INTRADAY, DELIVERY, CARRYFORWARD
TransactionTypeEnum; // BUY, SELL
OrderTypeEnum; // MARKET, LIMIT, STOP_LOSS
ValidityEnum; // DAY, IOC, GTC
OrderStatusEnum; // PENDING, OPEN, COMPLETE, etc.
InstrumentTypeEnum; // EQUITY, FUTURES, OPTIONS, etc.
OptionTypeEnum; // CALL, PUT

// User enums
userRoleEnum; // user, admin, premium
sortOrderEnum; // asc, desc
userSortByEnum; // createdAt, updatedAt, email, etc.
```

## Type Inference

All TypeScript types are inferred from Zod schemas:

```typescript
import { z } from "zod";

export const orderSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  // ... fields
});

// Type is automatically inferred
export type Order = z.infer<typeof orderSchema>;
```

This ensures:

- Types always match validation schemas
- No manual type maintenance
- Runtime and compile-time safety

## Integration with Other Packages

### @repo/database

Uses schemas for Mongoose model type definitions:

```typescript
import { type TradingSignal } from '@repo/schema';

const schema = new Schema<TradingSignal>({ ... });
export const TradingSignalModel = model<TradingSignal>(...);
```

### @repo/market-sdk

Re-exports all trading types for API interactions:

```typescript
// market-sdk/src/index.ts
export type * from "@repo/schema";

// Now consumers can import from market-sdk
import { type Order, type Position } from "@repo/market-sdk";
```

### apps/api

The API backend defines tRPC routers using `@mguay/nestjs-trpc` decorators.
The AppRouter type is auto-exported to `@repo/schema/src/api/app-router.ts`:

```typescript
// apps/api/src/user/user.router.ts
import { Router, Query, Input } from "@mguay/nestjs-trpc";
import { userSchema } from "@repo/schema";

@Router({ alias: "user" })
export class UserRouter {
  @Query({ input: z.object({ id: z.string() }), output: userSchema })
  getUser(@Input("id") id: string) {
    // Implementation
  }
}

// Web app imports AppRouter type from schema
import type { AppRouter } from "@repo/schema/api";
import { createTRPCReact } from "@trpc/react-query";
const trpc = createTRPCReact<AppRouter>();
```

## Best Practices

### ✅ Do

- Define all types in `@repo/schema`
- Use Zod schemas for validation
- Infer TypeScript types from schemas
- Keep related schemas in the same file
- Export both schema and type
- Use descriptive schema names

### ❌ Don't

- Create duplicate type definitions in other packages
- Use TypeScript interfaces for data models
- Define enums outside of this package
- Mix validation logic with business logic
- Create circular dependencies

## Migration Guide

If you find types/interfaces in other packages:

1. Move the schema to appropriate location in `@repo/schema`
2. Update imports in the original package
3. Delete the old type definition
4. Run type checking: `pnpm typecheck`

## Development

### Adding New Schemas

1. Create schema file in appropriate directory
2. Export from directory's `index.ts`
3. Ensure main `src/index.ts` exports the directory
4. Add tests if needed

```typescript
// src/trading/my-new.schema.ts
import { z } from "zod";

export const myNewSchema = z.object({
  field: z.string(),
});

export type MyNew = z.infer<typeof myNewSchema>;
```

```typescript
// src/trading/index.ts
export * from "./my-new.schema";
```

### Type Checking

```bash
# Check types across entire monorepo
pnpm typecheck

# Check only schema package
cd packages/schema
pnpm check-types
```

## Dependencies

- `zod` - Schema validation and type inference

## License

Private - Part of investment-trading-portfolio monorepo

---

**Last Updated**: March 17, 2026
