# GitHub Copilot Instructions - @repo/schema

## Package Role

You are working on the **shared schema package** for the trading monorepo. This package is the **single source of truth** for ALL types, interfaces, and validation schemas across the entire codebase.

## Core Principle

**ALL types, interfaces, and Zod schemas MUST be defined in this package. Apps and other packages consume these types but NEVER create their own.**

## Package Structure

```
packages/schema/
├── src/
│   ├── index.ts                # Main exports
│   ├── common/                 # Shared base types
│   │   ├── index.ts
│   │   ├── pagination.schema.ts
│   │   ├── response.schema.ts
│   │   └── errors.schema.ts
│   ├── user/                   # User-related schemas
│   │   ├── index.ts
│   │   ├── user.schema.ts
│   │   └── auth.schema.ts
│   ├── trading/                # Trading domain
│   │   ├── index.ts
│   │   ├── enums.ts
│   │   ├── base.ts
│   │   ├── signal.schema.ts
│   │   ├── order.schema.ts
│   │   ├── position.schema.ts
│   │   ├── strategy.schema.ts
│   │   ├── performance.schema.ts
│   │   ├── feature.schema.ts
│   │   └── rl-agent.schema.ts
│   └── market/                 # Market data schemas
│       ├── index.ts
│       ├── instrument.schema.ts
│       ├── tick.schema.ts
│       └── candle.schema.ts
├── scripts/
│   └── generate-json-schema.ts # Zod → JSON Schema converter
├── docs/
│   ├── ARCHITECTURE.md
│   └── PROGRESS.md
├── README.md
└── package.json
```

## What Belongs Here

### ✅ DO Include

1. **Zod Schemas**
   - Runtime validation schemas
   - Input/output schemas for APIs
   - Database document schemas

2. **TypeScript Types**
   - Inferred from Zod schemas
   - Type utilities (Omit, Pick, Partial variations)
   - Union and intersection types

3. **Enums**
   - All application enums
   - Status codes
   - Type discriminators

4. **Base Schemas**
   - Reusable schema fragments
   - Common validation rules
   - Composed schema builders

### ❌ DON'T Include

1. **Business Logic** - That belongs in apps
2. **Database Connections** - That's @repo/database
3. **API Handlers** - Apps handle HTTP
4. **ML Models** - That's app-specific

## Schema Design Principles

### 1. DRY - Don't Repeat Yourself

**NEVER duplicate schemas. Use TypeScript's type system:**

```typescript
// ✅ CORRECT - Composition with extends
import { z } from "zod";

const baseOrderSchema = z.object({
  quantity: z.number().positive(),
  price: z.number().positive(),
  transactionType: z.enum(["BUY", "SELL"]),
});

export const orderLegSchema = baseOrderSchema.extend({
  instrumentKey: z.string(),
  status: z.enum(["PENDING", "FILLED", "REJECTED"]),
});

export const multiLegOrderSchema = z.object({
  legs: z.array(orderLegSchema),
  strategy: z.string(),
});

// ✅ CORRECT - Type utilities
export type OrderCreateInput = Omit<Order, "_id" | "createdAt" | "updatedAt">;
export type OrderUpdateInput = Partial<OrderCreateInput>;

// ❌ WRONG - Duplication
export const orderLegSchema = z.object({
  quantity: z.number().positive(), // Already in baseOrderSchema!
  price: z.number().positive(), // Duplicate!
  transactionType: z.enum(["BUY", "SELL"]), // Duplicate!
  instrumentKey: z.string(),
});
```

### 2. One Schema Per File (Logical Grouping)

```typescript
// ✅ CORRECT - signal.schema.ts
export const tradingSignalSchema = z.object({
  /* ... */
});
export const modelContributionsSchema = z.object({
  /* ... */
});
export const signalMetadataSchema = z.object({
  /* ... */
});

export type TradingSignal = z.infer<typeof tradingSignalSchema>;
export type ModelContributions = z.infer<typeof modelContributionsSchema>;

// ❌ WRONG - Everything in one file
// trading.schema.ts with 20 different schemas
```

### 3. Extract Common Patterns

```typescript
// base.ts - Reusable base schemas
export const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userRefSchema = z.object({
  userId: z.string(),
});

// Use in specific schemas
export const orderSchema = z
  .object({
    orderId: z.string(),
    // ... order fields
  })
  .merge(timestampSchema)
  .merge(userRefSchema);
```

### 4. Export Both Schema and Type

```typescript
// ✅ ALWAYS export both
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;

// Now consumers can use:
// - userSchema for validation
// - User type for type checking
```

## File Organization Rules

### Enums File

```typescript
// trading/enums.ts - ALL enums for trading domain
export const OrderTypeEnum = z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]);
export const OrderStatusEnum = z.enum([
  "PENDING",
  "FILLED",
  "REJECTED",
  "CANCELLED",
]);
export const ExchangeEnum = z.enum(["NSE", "BSE", "MCX"]);
export const PositionTypeEnum = z.enum(["LONG", "SHORT"]);

export type OrderType = z.infer<typeof OrderTypeEnum>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
// ...
```

### Index File Pattern

```typescript
// trading/index.ts - Re-export everything
export * from "./enums";
export * from "./base";
export * from "./signal.schema";
export * from "./order.schema";
export * from "./position.schema";
export * from "./strategy.schema";
export * from "./performance.schema";
export * from "./feature.schema";
export * from "./rl-agent.schema";
```

## Type Generation Workflow

### TypeScript → JSON Schema → Python

```typescript
// Step 1: Define Zod schema
export const featureSnapshotSchema = z.object({
  timestamp: z.date(),
  symbol: z.string(),
  features: z.object({
    realizedVol5d: z.number(),
    rsi14: z.number(),
    macd: z.object({
      value: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }),
  }),
});

export type FeatureSnapshot = z.infer<typeof featureSnapshotSchema>;

// Step 2: Generate JSON Schema (automated)
// pnpm generate-json-schema

// Step 3: Generate Python types (automated)
// python scripts/generate_types.py
```

## Validation Best Practices

### Input Validation

```typescript
// ✅ Strict validation for inputs
export const createOrderInputSchema = z
  .object({
    quantity: z.number().int().positive().max(10000),
    price: z.number().positive().max(100000),
    instrumentKey: z.string().regex(/^[A-Z]+_[A-Z]+\|.+$/),
    transactionType: OrderTypeEnum,
  })
  .strict(); // Don't allow extra fields

// ✅ Use for API input validation
app.post("/orders", (req, res) => {
  const validated = createOrderInputSchema.parse(req.body);
  // ...
});
```

### Output Schemas

```typescript
// ✅ Define expected outputs
export const orderResponseSchema = orderSchema.extend({
  status: OrderStatusEnum,
  filledQuantity: z.number().nonnegative(),
  averagePrice: z.number().positive().optional(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;
```

## Consumer Usage

### In Apps

```typescript
// apps/algo-worker/src/services/signal.service.ts
import { type TradingSignal, tradingSignalSchema } from '@repo/schema';

async saveSignal(data: unknown): Promise<TradingSignal> {
  // ✅ Validate at runtime
  const validated = tradingSignalSchema.parse(data);

  // ✅ Type-safe from here
  return this.repository.create(validated);
}
```

### In Database Package

```typescript
// packages/database/src/schemas/trading-signal.schema.ts
import { type TradingSignal } from "@repo/schema";

@Schema({ timestamps: true })
export class TradingSignal implements TradingSignal {
  // ✅ Mongoose schema implements Zod type
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  prediction: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";

  // ...
}
```

## Common Mistakes to Avoid

❌ **DON'T** create types in apps  
❌ **DON'T** duplicate schema definitions  
❌ **DON'T** put too many schemas in one file  
❌ **DON'T** use `any` or `unknown` without validation  
❌ **DON'T** skip runtime validation for external inputs

✅ **DO** use composition (extends, merge, pick, omit)  
✅ **DO** export both schema and type  
✅ **DO** organize by domain (user, trading, market)  
✅ **DO** validate all external inputs  
✅ **DO** use strict() for input schemas

## Documentation Requirements

**After adding new schemas:**

1. Update `README.md` with usage examples
2. Update `docs/ARCHITECTURE.md` if adding new domain
3. Update `docs/PROGRESS.md` with completion status
4. Add JSDoc comments to exported schemas

**Example JSDoc:**

````typescript
/**
 * Trading signal schema for ML model predictions
 *
 * @example
 * ```typescript
 * const signal: TradingSignal = {
 *   userId: 'user123',
 *   timestamp: new Date(),
 *   prediction: 'VOL_UP',
 *   confidence: 0.85,
 *   // ...
 * };
 * ```
 */
export const tradingSignalSchema = z.object({
  // ...
});
````

## Type Generation Scripts

### generate-json-schema.ts

```typescript
// Must export all schemas for Python generation
import { zodToJsonSchema } from "zod-to-json-schema";
import { writeFileSync } from "fs";

// Import and convert
import { tradingSignalSchema, orderSchema } from "../src/trading";

const schemas = {
  TradingSignal: zodToJsonSchema(tradingSignalSchema),
  Order: zodToJsonSchema(orderSchema),
  // ...
};

writeFileSync("./generated/schemas.json", JSON.stringify(schemas, null, 2));
```

**Run with:** `pnpm generate-json-schema`

## Progress Tracking

Track schema implementation by domain:

- **User Domain**: 100% (user, auth)
- **Trading Domain**: 100% (signal, order, position, strategy, performance)
- **Market Domain**: 80% (tick, candle, instrument)
- **Common Domain**: 100% (pagination, response, errors)
