---
applyTo: "packages/schema/**"
---

# @repo/schema - Coding Instructions

> Single source of truth for all TypeScript types and Zod schemas.

---

## Design Principles

### 1. Validate ALL External Data

**RULE**: ANY data from external sources (API responses, user input, DB queries) MUST be validated with Zod.

```typescript
// ❌ BAD: Trusting external data
const quote = await fetch('/api/quote').then(r => r.json());
const price = quote.ltp; // What if quote.ltp is undefined?

// ✅ GOOD: Validate with Zod
import { MarketQuoteSchema } from '@repo/schema';

const rawQuote = await fetch('/api/quote').then(r => r.json());
const quote = MarketQuoteSchema.parse(rawQuote); // Throws if invalid
const price = quote.ltp; // TypeScript knows ltp exists
```

**Why**: Prevents runtime errors, catches API contract violations early, provides type safety.

### 2. Co-located Types and Schemas

Every Zod schema MUST have a corresponding TypeScript type:

```typescript
import { z } from 'zod';

// 1. Define Zod schema
export const TradingSignalSchema = z.object({
  userId: z.string().uuid(),
  instrumentKey: z.string(),
  prediction: z.enum(['VOL_UP', 'VOL_DOWN', 'NEUTRAL']),
  confidence: z.number().min(0).max(1),
  modelScores: z.record(z.string(), z.number()),
  timestamp: z.date(),
});

// 2. Infer TypeScript type
export type TradingSignal = z.infer<typeof TradingSignalSchema>;
```

**NEVER define types manually** when Zod can infer them.

---

## Schema Organization

```
packages/schema/src/
├── trading/
│   ├── signal.schema.ts       # TradingSignalSchema
│   ├── order.schema.ts        # OrderSchema
│   ├── position.schema.ts     # PositionSchema
│   └── index.ts               # Re-exports
├── market/
│   ├── quote.schema.ts        # MarketQuoteSchema
│   ├── tick.schema.ts         # TickDataSchema
│   ├── candle.schema.ts       # CandleSchema
│   └── index.ts
├── user/
│   ├── user.schema.ts         # UserSchema
│   ├── auth.schema.ts         # LoginSchema, RegisterSchema
│   └── index.ts
└── index.ts                   # Main exports
```

**Naming Convention**: `{Entity}Schema` for schemas, `{Entity}` for TypeScript types.

---

## Common Patterns

### 1. Nested Objects

```typescript
const PositionSchema = z.object({
  instrumentKey: z.string(),
  quantity: z.number().int(),
  avgPrice: z.number(),
  greeks: z.object({
    delta: z.number(),
    gamma: z.number(),
    vega: z.number(),
    theta: z.number(),
  }),
});
```

### 2. Enums

```typescript
// ✅ GOOD: Use z.enum for strict values
const OrderTypeSchema = z.enum(['MARKET', 'LIMIT', 'STOP_LOSS']);

// ❌ BAD: Using z.string() with no validation
const OrderTypeSchema = z.string(); // Any string allowed!
```

### 3. Optional Fields

```typescript
const OrderSchema = z.object({
  quantity: z.number(),
  price: z.number().optional(), // For MARKET orders
  stopPrice: z.number().optional(), // For STOP_LOSS orders
});
```

### 4. Default Values

```typescript
const ConfigSchema = z.object({
  maxLeverage: z.number().default(1.5),
  riskPerTrade: z.number().default(0.02),
  enableGPU: z.boolean().default(false),
});
```

### 5. Refinements (Custom Validation)

```typescript
const OrderSchema = z.object({
  quantity: z.number().int().positive(),
  price: z.number().positive(),
}).refine(
  (data) => data.quantity * data.price <= 1_000_000, // Max order value ₹10L
  { message: 'Order value exceeds ₹10,00,000 limit' }
);
```

---

## SEBI 2024-2025 Compliance Schemas

### Algo ID Validation

```typescript
const AlgoIdSchema = z.string().regex(
  /^PROJ_QUANTUM_v\d+\.\d+\.\d+_USER_[a-zA-Z0-9-]+$/,
  'Invalid algoId format. Must be PROJ_QUANTUM_v{version}_USER_{userId}'
);

const OrderRequestSchema = z.object({
  algoId: AlgoIdSchema,
  strategyType: z.enum(['IRON_CONDOR', 'LONG_STRADDLE', 'BULL_PUT_SPREAD', 'BACKTEST']),
  // ... other fields
});
```

### Pre-Trade Risk Check Result

```typescript
const RiskCheckResultSchema = z.object({
  passed: z.boolean(),
  checks: z.object({
    positionLimitOk: z.boolean(),
    marginSufficientOk: z.boolean(),
    leverageWithinBoundsOk: z.boolean(),
    greeksExposureOk: z.boolean(),
  }),
  rejectionReason: z.string().optional(),
  timestamp: z.date(),
});
```

---

## API Response Validation

### Upstox API Response

```typescript
const UpstoxQuoteResponseSchema = z.object({
  status: z.literal('success'),
  data: z.record(
    z.string(), // instrument_key
    z.object({
      ltp: z.number(),
      ohlc: z.object({
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
      }),
      volume: z.number(),
      // ... other fields
    })
  ),
});

// Usage
const validated = UpstoxQuoteResponseSchema.parse(apiResponse);
```

---

## Form Validation (tRPC + React Hook Form)

### tRPC Input Schema

```typescript
export const placeOrderInput = z.object({
  instrumentKey: z.string().min(1, 'Instrument key is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  orderType: z.enum(['MARKET', 'LIMIT']),
  price: z.number().optional(),
  transactionType: z.enum(['BUY', 'SELL']),
}).refine(
  (data) => data.orderType !== 'LIMIT' || data.price !== undefined,
  { message: 'Price is required for LIMIT orders', path: ['price'] }
);
```

---

## Testing

### Schema Validation Tests

```typescript
import { TradingSignalSchema } from '@repo/schema';

describe('TradingSignalSchema', () => {
  it('should validate correct signal', () => {
    const validSignal = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      instrumentKey: 'NSE_INDEX|Nifty 50',
      prediction: 'VOL_UP',
      confidence: 0.78,
      modelScores: { xgboost: 0.8, cnn_lstm: 0.75 },
      timestamp: new Date(),
    };
    
    expect(() => TradingSignalSchema.parse(validSignal)).not.toThrow();
  });

  it('should reject invalid confidence', () => {
    const invalidSignal = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      instrumentKey: 'NSE_INDEX|Nifty 50',
      prediction: 'VOL_UP',
      confidence: 1.5, // Invalid: >1
      modelScores: {},
      timestamp: new Date(),
    };
    
    expect(() => TradingSignalSchema.parse(invalidSignal)).toThrow();
  });
});
```

---

## Performance Considerations

### Use `.safeParse()` for Non-Critical Validation

```typescript
// ❌ BAD: Throws on invalid data (kills request)
const quote = MarketQuoteSchema.parse(apiResponse);

// ✅ GOOD: Returns success/error object
const result = MarketQuoteSchema.safeParse(apiResponse);
if (!result.success) {
  logger.warn('Invalid quote', result.error);
  return fallbackQuote;
}
const quote = result.data;
```

### Transform Data During Validation

```typescript
const TickDataSchema = z.object({
  timestamp: z.string().transform((str) => new Date(str)), // ISO string → Date
  price: z.string().transform((str) => parseFloat(str)),   // String → Number
  volume: z.number(),
});
```

---

**Last Updated**: November 29, 2025
**Status**: Production-Ready

