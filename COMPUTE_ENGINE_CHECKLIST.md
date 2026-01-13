# Compute Engine Implementation Checklist

## ✅ Completed

- [x] Remove Zod from internal market data (use types only)
- [x] Create unified `MarketTick` structure (one type for all instruments)
- [x] Integrate ts-rs for automatic TypeScript type generation from Rust
- [x] Implement Market State Encoder (MSE) in Rust with all 5 state components:
  - [x] Macro State (breadth indicators)
  - [x] Micro State (NIFTY Future microstructure)
  - [x] Volatility State (options + VIX)
  - [x] Execution State (LOB quality)
  - [x] Portfolio State (position tracking)
- [x] Define QuestDB table schemas (6 tables)
- [x] Create type generation script
- [x] Create migration script
- [x] Write comprehensive documentation

## 🔄 To Do Next

### 1. Run Type Generation (First Time)

```bash
cd services/compute-engine-napi
cargo test --lib
```

**Expected output:**

- Creates `packages/schema/src/market-data/generated/*.ts` files
- 13 TypeScript type files generated

**Verify:**

```bash
ls packages/schema/src/market-data/generated/
# Should see: BidAskLevel.ts, MarketSnapshot.ts, MarketState.ts, etc.
```

### 2. Rename compute-engine-napi → compute-engine

**Option A: Automated (Recommended)**

```powershell
.\scripts\migrate-compute-engine.ps1
```

**Option B: Manual**

```bash
rm -rf services/compute-engine  # Delete old
mv services/compute-engine-napi services/compute-engine
# Then update references in:
# - root package.json (workspaces)
# - services/market-feeder/package.json (dependencies)
# - services/compute-engine/package.json (name)
# - services/compute-engine/Cargo.toml (name)
```

### 3. Build & Test Compute Engine

```bash
cd services/compute-engine
pnpm install
pnpm build  # Builds Rust → NAPI binding
```

**Verify NAPI binding works:**

```bash
node -e "const { computeMarketState } = require('./'); console.log('✅ NAPI loaded')"
```

### 4. Update market-feeder

**A. Install new dependency:**

```bash
cd services/market-feeder
pnpm add @repo/compute-engine@workspace:*
```

**B. Update imports:**

```typescript
// Before
import type { JsMarketDataPoint } from "@repo/compute-engine-napi";

// After
import type {
  MarketSnapshot,
  MarketState,
} from "@repo/schema/market-data/generated";
import { computeMarketState } from "@repo/compute-engine";
```

**C. Update compute-engine.service.ts:**

```typescript
import { Injectable, Logger } from "@nestjs/common";
import type {
  MarketSnapshot,
  MarketState,
} from "@repo/schema/market-data/generated";
import { computeMarketState } from "@repo/compute-engine";

@Injectable()
export class ComputeEngineService {
  private readonly logger = new Logger(ComputeEngineService.name);

  /**
   * Compute market state from raw snapshot
   */
  async compute(snapshot: MarketSnapshot): Promise<MarketState> {
    try {
      return computeMarketState(snapshot);
    } catch (error) {
      this.logger.error("Failed to compute market state", error);
      throw error;
    }
  }
}
```

### 5. Update @repo/database for QuestDB

**A. Create market-state.service.ts:**

```typescript
// packages/database/src/questdb/services/market-state.service.ts
import { Injectable } from "@nestjs/common";
import { QuestDBService } from "../questdb.service";
import type { MarketState } from "@repo/schema/market-data/generated";
import { ALL_TABLE_CREATION_STATEMENTS } from "@repo/schema/market-data";

@Injectable()
export class MarketStateRepository {
  constructor(private readonly questdb: QuestDBService) {}

  async createTables(): Promise<void> {
    for (const sql of ALL_TABLE_CREATION_STATEMENTS) {
      await this.questdb.exec(sql);
    }
  }

  async insertMarketState(state: MarketState): Promise<void> {
    const sql = `
      INSERT INTO market_state_encoder_output
      VALUES (
        ${state.timestamp},
        -- Macro
        ${state.macroState.pctStocksAboveVwap},
        ${state.macroState.pctStocksAboveEma20},
        -- ... all 33 columns
      )
    `;
    await this.questdb.exec(sql);
  }
}
```

### 6. E2E Test

**A. Create test snapshot:**

```typescript
const testSnapshot: MarketSnapshot = {
  timestamp: Date.now(),
  niftyFuture: {
    timestamp: Date.now(),
    symbol: "NIFTY24JANFUT",
    ltp: 21500,
    open: 21450,
    high: 21550,
    low: 21400,
    close: 21500,
    volume: 1000000,
    bids: Array(20).fill({ price: 21499, quantity: 100 }),
    asks: Array(20).fill({ price: 21501, quantity: 100 }),
    openInterest: 5000000,
    oiChange: 10000,
  },
  constituents: Array(50).fill({
    timestamp: Date.now(),
    symbol: "RELIANCE",
    ltp: 2500,
    // ... rest of fields
  }),
  options: [],
  indiaVix: 15.2,
};
```

**B. Test computation:**

```typescript
const state = await computeEngineService.compute(testSnapshot);
console.log("Market State:", state);
// Should log 33 features
```

**C. Test QuestDB insertion:**

```typescript
await marketStateRepo.insertMarketState(state);
const result = await questdb.query(
  "SELECT * FROM market_state_encoder_output LIMIT 1"
);
console.log("Stored:", result);
```

## 📋 Verification Checklist

After completing all steps:

- [ ] TypeScript types generated in `packages/schema/src/market-data/generated/`
- [ ] compute-engine renamed and building successfully
- [ ] market-feeder can import and call `computeMarketState`
- [ ] QuestDB tables created
- [ ] Can insert MarketState to QuestDB
- [ ] End-to-end test passes (snapshot → MSE → QuestDB)
- [ ] No TypeScript errors in workspace
- [ ] Old `compute-engine.backup` can be deleted

## 🚨 Troubleshooting

### ts-rs types not generating

```bash
cd services/compute-engine
cargo clean
cargo test --lib --verbose
```

Check output for:

```
Exporting BidAskLevel to ../../packages/schema/src/market-data/generated/BidAskLevel.ts
```

### NAPI build fails

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install napi-rs CLI
npm install -g @napi-rs/cli

# Rebuild
cd services/compute-engine
pnpm build
```

### Import errors in TypeScript

```typescript
// ❌ Wrong
import { MarketState } from "@repo/schema/market-data";

// ✅ Correct
import type { MarketState } from "@repo/schema/market-data/generated";
```

### QuestDB connection fails

```bash
# Start QuestDB
pnpm run db:start

# Check connection
curl http://localhost:9000/exec?query=SELECT%201
```

## 📚 Documentation References

- **Type Safety**: `packages/schema/src/market-data/generated/README.md`
- **Implementation**: `docs/COMPUTE_ENGINE_IMPLEMENTATION.md`
- **Model Contracts**: See `MarketState` interface for all 33 features
- **QuestDB Schemas**: `packages/schema/src/market-data/questdb-tables.schema.ts`

## ⏭️ Future Enhancements

Once basic flow is working:

1. Implement `HistoricalDataCache` in market-feeder (maintain EMA, VWAP, etc.)
2. Add remaining model contract types (TFT, LiT, PPO)
3. Implement max pain calculation in MSE
4. Add performance benchmarks (<5ms target for MSE)
5. Integrate with algo-worker for live trading
