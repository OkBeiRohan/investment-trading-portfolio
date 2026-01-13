# Compute Engine Quick Reference

## 🚀 Quick Start

### Build & Generate Types

```bash
cd services/compute-engine
cargo build --release
cargo test --lib  # Generates TypeScript types
```

### Import in TypeScript

```typescript
import {
  computeMarketState,
  extractLightgbmInput,
  extractLobSnapshot,
  extractOptionChainEntry,
  extractLobState,
  extractFutureLobContext,
  buildTftSequencePoint,
} from "@repo/compute-engine";

import type {
  MarketSnapshot,
  MarketState,
  LightGBMInput,
  TFTInput,
  LiTInput,
} from "@repo/schema/market-data/generated";
```

## 📦 NAPI Functions

| Function                    | Input             | Output             | Use Case                                |
| --------------------------- | ----------------- | ------------------ | --------------------------------------- |
| `computeMarketState()`      | `MarketSnapshot`  | `MarketState`      | MSE: Compress 50k signals → 33 features |
| `extractLightgbmInput()`    | `MarketState`     | `LightGBMInput`    | Extract 33 features for LightGBM        |
| `buildTftSequencePoint()`   | 8 scalars         | `TFTSequencePoint` | Build single timestep for TFT           |
| `extractLobSnapshot()`      | `MarketSnapshot`  | `LOBSnapshot`      | Extract raw LOB for LiT                 |
| `extractOptionChainEntry()` | `OptionTick`      | `OptionChainEntry` | Convert option to chain entry           |
| `extractLobState()`         | `OptionTick`      | `LOBState`         | Extract option LOB for PPO              |
| `extractFutureLobContext()` | `NiftyFutureTick` | `FutureLOBContext` | Extract future LOB for PPO              |

## 🗄️ QuestDB Tables

### Raw Market Data (3 tables)

- `raw_market_data_future` - NIFTY Future ticks
- `raw_market_data_constituents` - 50 stock ticks
- `raw_market_data_options` - Option chain + Greeks

### Features (2 tables)

- `market_state_encoder_output` - MSE: 33 features
- `training_labels` - Ground truth labels

### Model Sequences (2 tables)

- `tft_sequence_data` - TFT time-series (8 features/timestep)
- `lit_lob_snapshots` - LiT raw LOB snapshots

### Model Predictions (7 tables)

- `lightgbm_predictions` - Directional probabilities
- `tft_predictions` - Expected range + regime
- `lit_predictions` - Micro-move probabilities
- `meta_learner_predictions` - Final trade decision
- `strike_selector_outputs` - Strike + lot selection
- `ppo_execution_outputs` - Execution timing
- `exit_manager_outputs` - Exit decisions

## 💡 Usage Examples

### 1. Market State Computation

```typescript
const snapshot: MarketSnapshot = {
  timestamp: Date.now(),
  nifty_future: futureData,
  constituents: [
    /* 50 stocks */
  ],
  options: [
    /* option chain */
  ],
  india_vix: 15.5,
};

const state = computeMarketState(snapshot);
// Result: { macro_state: {...}, micro_state: {...}, volatility_state: {...} }

await questdb.insertMarketState(state);
```

### 2. LightGBM Features

```typescript
const lightgbmInput = extractLightgbmInput(state);
// Result: { pct_stocks_above_vwap: 0.65, fut_return_1m: 0.002, ... } (33 features)

await questdb.insert("market_state_encoder_output", lightgbmInput);
```

### 3. TFT Sequence Building

```typescript
const sequence: TFTSequencePoint[] = [];

for (let i = 0; i < 60; i++) {
  const point = buildTftSequencePoint(
    indexReturn,
    indexRealizedVol,
    breadthScore,
    futReturn,
    futVolume,
    atmIv,
    ivChange,
    timestamp - i * 60000 // 1 minute intervals
  );
  sequence.push(point);
}

const tftInput: TFTInput = {
  sequence,
  day_of_week: 1,
  minutes_from_open: 45,
};
```

### 4. LiT LOB Snapshots

```typescript
const lobSequence: LOBSnapshot[] = [];

for (const snapshot of last100Snapshots) {
  lobSequence.push(extractLobSnapshot(snapshot));
}

const litInput: LiTInput = { lob_sequence: lobSequence };
```

### 5. Strike Selection

```typescript
const optionChain = options.map(extractOptionChainEntry);

const strikeInput: StrikeSelectorInput = {
  available_balance: 100000,
  risk_per_trade: 2000,
  expected_move: 50,
  direction: "bullish",
  option_chain: optionChain,
  max_delta: 0.5,
  min_gamma: 0.01,
};
```

### 6. PPO Execution

```typescript
const ppoInput: PPOExecutionInput = {
  option_lob: extractLobState(selectedOption),
  future_lob: extractFutureLobContext(niftyFuture),
  remaining_qty: 75,
  time_to_expiry: 3600,
  urgency: 0.7,
};
```

## 🔧 Troubleshooting

### Types Not Found

```bash
cd services/compute-engine
cargo clean
cargo test --lib
ls ../../packages/schema/src/market-data/generated/
```

### Build Errors

```bash
cargo update
cargo build --release
```

### QuestDB Connection

```typescript
const health = await questdb.query("SELECT 1");
console.log("QuestDB:", health);
```

## 📚 Documentation

- **Full Integration Guide**: `docs/COMPUTE_ENGINE_INTEGRATION.md`
- **Implementation Summary**: `COMPUTE_ENGINE_IMPLEMENTATION_COMPLETE.md`
- **Architecture**: `docs/MARKET_STATE_ENCODER.md`
- **Model Contracts**: `packages/schema/src/market-data/model-contracts.schema.ts`

## 🎯 Performance Targets

- **MSE Computation**: <1ms (Rust)
- **Feature Extraction**: <0.1ms
- **QuestDB Batch Insert**: 100,000+ rows/sec
- **NAPI Overhead**: ~0 (zero-copy)

---

**Quick Links**:

- Rust Types: `services/compute-engine/src/types.rs`
- NAPI Functions: `services/compute-engine/src/lib.rs`
- QuestDB Schemas: `packages/schema/src/market-data/questdb-tables.schema.ts`
- Generated Types: `packages/schema/src/market-data/generated/`
