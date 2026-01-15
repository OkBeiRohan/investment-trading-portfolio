# Phase 1 Implementation - Core Infrastructure

## Status: 🚧 In Progress

### Checklist

#### 1. Type Definitions ⏳

- [ ] Create new `types.rs` with NAPI + ts-rs decorators
  - [ ] `FeatureInput` struct (WITHOUT vwap field - it's computed)
  - [ ] `FutureTick` struct
  - [ ] `ConstituentTick` struct
  - [ ] `OptionTick` struct
  - [ ] `FeatureOutput` struct (33 fields)
  - [ ] `ComputeResult` struct
  - [ ] `FeatureTimingLog` struct
- [ ] Generate TypeScript types (`cargo test --features ts-rs`)
- [ ] Create Zod schemas in `@repo/schema/src/compute-engine/`
  - [ ] `feature-input.schema.ts`
  - [ ] `feature-output.schema.ts`
  - [ ] `compute-result.schema.ts`
- [ ] Add validation tests

#### 2. Feature Trait & Registry ⏳

- [ ] Create `features/mod.rs` with:
  - [ ] `Feature` trait
  - [ ] `ComputedDependencies` struct
  - [ ] `FeatureTiming` struct
  - [ ] `FeatureResult` struct
- [ ] Test trait compilation with dummy feature

#### 3. Historical Cache ⏳

- [ ] Create `cache/rolling_window.rs`
  - [ ] Generic `RollingWindow<T>` struct
  - [ ] `push()`, `get()`, `as_slice()` methods
- [ ] Create `cache/mod.rs` with `HistoricalCache`
  - [ ] Price/volume/OI windows
  - [ ] Per-constituent caches
  - [ ] `update()` method
- [ ] Add unit tests

#### 4. Update Dependencies

- [ ] Update `Cargo.toml`

  ```toml
  [dependencies]
  napi = { version = "2", features = ["async", "serde-json"] }
  napi-derive = "2"
  serde = { version = "1", features = ["derive"] }
  serde_json = "1"
  rayon = "1.8"
  chrono = { version = "0.4", features = ["serde"] }
  thiserror = "1"

  [dev-dependencies]
  criterion = "0.5"
  ts-rs = "7"
  ```

#### 5. Update Build Configuration

- [ ] Update `build.rs` for NAPI-RS if needed
- [ ] Update `.gitignore` for generated TypeScript files

## Next Steps

After Phase 1 completion:

- [ ] Move to Phase 2: Shared Dependencies
- [ ] Update progress in `IMPLEMENTATION_ROADMAP.md`

## Notes

**IMPORTANT**: VWAP is NOT provided as input. It is computed from historical price/volume data in the cache.

**Changes from original design**:

- Removed `vwap` field from `FutureTick` and `ConstituentTick` input structures
- VWAP calculation is part of shared dependencies phase

## Files to Create

```
src/
├── types.rs                   ← Phase 1 (rewrite)
├── features/
│   └── mod.rs                 ← Phase 1
├── cache/
│   ├── mod.rs                 ← Phase 1
│   └── rolling_window.rs      ← Phase 1
└── lib.rs                     ← Already updated (placeholder)
```

## Testing

```bash
# Test types compile
cargo check

# Run unit tests
cargo test

# Generate TypeScript types
cargo test --features ts-rs

# Verify TypeScript types created
ls ../../packages/schema/src/compute-engine/generated/
```
