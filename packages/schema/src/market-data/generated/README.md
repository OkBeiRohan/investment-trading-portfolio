# Type Safety Architecture

## Overview

This project uses **ts-rs** for end-to-end type safety between Rust (compute-engine) and TypeScript (market-feeder, API, web).

```
Rust Structs (Source of Truth)
    ↓ ts-rs (automatic)
TypeScript Types (Generated)
    ↓ Used by
market-feeder → compute-engine (NAPI) → QuestDB
```

## Key Principles

1. **Rust types are the source of truth** - All core data structures defined in `packages/compute-engine-napi/src/types.rs`
2. **NO manual type duplication** - TypeScript types auto-generated via ts-rs
3. **NO Zod for internal data** - Zod only used at validation boundaries (frontend API, external broker data)
4. **Unified market data structure** - One `MarketTick` type for all instruments (futures, stocks, options)

## Type Generation Workflow

### 1. Define Types in Rust

```rust
// packages/compute-engine-napi/src/types.rs
use ts_rs::TS;

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct MarketTick {
    pub timestamp: i64,
    pub symbol: String,
    pub ltp: f64,
    // ... more fields
}
```

### 2. Generate TypeScript Types

```bash
cd packages/schema
pnpm run generate:rust-types
```

This runs `cargo test --lib` in compute-engine-napi, which triggers ts-rs to generate `.ts` files.

### 3. Import in TypeScript

```typescript
// market-feeder, API, web, etc.
import type {
  MarketTick,
  MarketState,
} from "@repo/schema/market-data/generated";

const tick: MarketTick = {
  timestamp: Date.now(),
  symbol: "NIFTY24JANFUT",
  ltp: 21500,
  // TypeScript enforces exact Rust struct shape
};
```

## Directory Structure

```
packages/schema/src/market-data/
├── generated/           # Auto-generated from Rust (via ts-rs)
│   ├── index.ts
│   ├── BidAskLevel.ts
│   ├── MarketTick.ts
│   ├── MarketState.ts
│   └── ... (13 types total)
├── raw-market-data.types.ts    # Manual unified types (until Rust migration)
├── market-state.types.ts       # Manual MSE types (until Rust migration)
├── questdb-tables.schema.ts    # QuestDB SQL schemas
└── index.ts                    # Re-exports all
```

## Data Flow

### Historical Data Collection (Training)

```
Upstox/Binance → market-feeder
    → MarketSnapshot → compute-engine (NAPI)
    → MarketState (MSE output)
    → QuestDB (features table)
    → training-pipeline (Python)
```

### Live Trading

```
Upstox/Binance → algo-worker
    → MarketSnapshot → compute-engine (NAPI)
    → MarketState (MSE output)
    → LightGBM/TFT/LiT models
    → Trade signals
```

## Why ts-rs?

### Before (Manual)

❌ Duplicate type definitions  
❌ Drift between Rust and TypeScript  
❌ Manual synchronization burden  
❌ Runtime errors from type mismatches

### After (ts-rs)

✅ Single source of truth (Rust)  
✅ Automatic type generation  
✅ Compile-time guarantees  
✅ Zero drift - types always in sync

## When to Use Zod

**Use Zod ONLY for validation at boundaries:**

1. **Frontend API** - Validate user input from web dashboard
2. **External broker data** - Validate Upstox/Binance WebSocket messages
3. **Configuration files** - Validate strategy parameters from UI

**DO NOT use Zod for:**

- Internal data flow (market-feeder → compute-engine → QuestDB)
- Performance-critical paths (adds 10-50ms overhead per validation)
- Data you control (use TypeScript types)

## Example: Adding a New Type

### 1. Add to Rust

```rust
// packages/compute-engine-napi/src/types.rs
#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/schema/src/market-data/generated/")]
pub struct TFTInput {
    pub sequence: Vec<TFTSequenceItem>,
    pub day_of_week: i32,
}
```

### 2. Regenerate

```bash
pnpm run generate:rust-types
```

### 3. Use in TypeScript

```typescript
import type { TFTInput } from "@repo/schema/market-data/generated";

const input: TFTInput = {
  /* ... */
};
// Type-safe, no runtime overhead
```

## Troubleshooting

### Type generation fails

```bash
cd packages/compute-engine-napi
cargo clean
cargo test --lib
```

### Types not updating

1. Check `packages/schema/src/market-data/generated/` exists
2. Ensure `#[ts(export)]` attribute is on struct
3. Rebuild compute-engine: `pnpm build`

### Import errors

```typescript
// ❌ Wrong
import { MarketState } from "@repo/schema/market-data";

// ✅ Correct
import type { MarketState } from "@repo/schema/market-data/generated";
```

## Migration Status

- [x] Core types defined in Rust
- [x] ts-rs integration
- [x] Auto-generation script
- [ ] Migrate all manual types to Rust
- [ ] Remove legacy Zod schemas
- [ ] Update market-feeder to use generated types
- [ ] Update algo-worker to use generated types
