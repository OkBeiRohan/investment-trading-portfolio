# Database Schema Implementation Status

## ✅ Completed

1. **Added TypeScript Configuration** (`tsconfig.json`)
   - Enabled decorators: `experimentalDecorators: true`, `emitDecoratorMetadata: true`
   - Disabled strict property initialization: `strictPropertyInitialization: false`

2. **Added Interface Imports**
   - All schema files now import their corresponding interfaces from `@repo/schema`
   - Using pattern: `import { Type as IType } from '@repo/schema'`

3. **Added `implements` Clauses**
   - All schema classes now implement their interfaces using `Omit<IType, '_id' | 'createdAt' | 'updatedAt'>`
   - This ensures compile-time type checking

4. **Fixed Critical Type Mismatches**
   - ✅ `TradingSignal.prediction`: Changed from `string` to literal union `"VOL_UP" | "VOL_DOWN" | "NEUTRAL"`
   - ✅ `TradingSignal.metadata.modelVersions`: Changed from `Map` to `Record<string, string>`
   - ✅ `Order.status`: Changed from `string` to literal union
   - ✅ `Order.totalCost`: Changed from optional to required
   - ✅ `OrderLeg.side`: Changed from `string` to `"BUY" | "SELL"`
   - ✅ `OrderLeg.orderType`: Changed to literal union
   - ✅ `Position.exchange`: Changed to literal union with required
   - ✅ `Position.status`: Changed to literal union `"OPEN" | "CLOSED"`
   - ✅ `Position.unrealizedPnL`: Changed to required
   - ✅ `Position.costs`: Changed to required
   - ✅ `Position.provider`: Changed to required
   - ✅ `PositionLeg.side`: Changed to literal union
   - ✅ `Greeks`: All properties made required (delta, gamma, vega, theta)
   - ✅ `Costs`: All properties made required (brokerage, stt, slippage, total)

## ⚠️ Remaining Type Mismatches

### Strategy Schema

Need to fix:

1. `type` - Change from `string` to literal union of all strategy types
2. `StrategyLeg.transactionType` - Change from `string` to `"BUY" | "SELL"`
3. `StrategyLeg` - Missing `price` as required field (currently optional)
4. `RiskProfile` - Make required (not optional), and make maxProfit, maxLoss, breakeven required
5. `EntryConditions` - Make minConfidence required
6. `EntryConditions.prediction` - Change to literal union

### PerformanceMetrics Schema

Need to fix:

1. `period` - Change from `string` to literal union `"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"`
2. `Metrics` - Make required (not optional) and all its properties required
3. `Trades` - Make required (not optional) and all its properties required
4. `Costs` - Make required (not optional) and all its properties required

### RLAgentState Schema

Need to fix:

1. `agentType` - Change from `string` to literal union `"DELTA_HEDGING" | "OPTIMAL_EXECUTION"`
2. `StateSnapshot` - Make required (not optional)
3. `StateSnapshot.episodeCount` - Make required
4. `StateSnapshot.epsilon` - Make required
5. `StateSnapshot.qTable` - Change from `Map` to `Record<string, unknown>`
6. `Performance` - Make required (not optional)
7. `Performance` - All properties should be required

### FeatureSnapshot Schema

Need to fix:

1. `features` - Make required (not optional)
2. `metadata` - Make required (not optional)
3. `Metadata.missingFields` - Make required
4. `Metadata.version` - Make required
5. `MACD` - All properties should be required when present

## 📝 Pattern to Follow

For string enums, use literal union types:

```typescript
// ❌ Wrong
@Prop({ enum: ["BUY", "SELL"] })
side: string;

// ✅ Correct
@Prop({ enum: ["BUY", "SELL"] })
side: "BUY" | "SELL";
```

For required nested objects:

```typescript
// ❌ Wrong
@Prop({ type: Metrics })
metrics?: Metrics;

// ✅ Correct
@Prop({ type: Metrics, required: true })
metrics: Metrics;
```

For required properties in nested classes:

```typescript
// ❌ Wrong
class Metrics {
  @Prop()
  sharpeRatio?: number;
}

// ✅ Correct
class Metrics {
  @Prop({ required: true })
  sharpeRatio: number;
}
```

## 🎯 Next Steps

1. Fix all remaining type mismatches listed above
2. Run TypeScript compiler to verify no errors
3. Test database operations in actual app
4. Update README.md with new usage patterns (already created)

## 📚 Reference

See `packages/schema/src/trading/index.ts` for the exact interface definitions that schemas must match.

All schema classes follow the pattern:

```typescript
export class SchemaName implements Omit<ISchemaName, '_id' | 'createdAt' | 'updatedAt'>
```

This ensures that Mongoose schemas exactly match the Zod schema types, providing both compile-time (TypeScript) and runtime (Zod) validation.

## 🔗 Upstox API Types

The Upstox API documentation was reviewed. Key types to implement in `@repo/schema`:

### Market Quote Response

```typescript
{
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  }
  depth: {
    buy: Array<{ quantity: number; price: number; orders: number }>;
    sell: Array<{ quantity: number; price: number; orders: number }>;
  }
  timestamp: string;
  instrument_token: string;
  symbol: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_trade_time: string;
  oi_day_high: number;
  oi_day_low: number;
}
```

These types are already defined in `packages/schema/src/trading/market-data.schema.ts` as:

- `quoteSchema`
- `ohlcSchema`
- `marketDepthSchema`

The existing schemas match the Upstox API response structure well.
