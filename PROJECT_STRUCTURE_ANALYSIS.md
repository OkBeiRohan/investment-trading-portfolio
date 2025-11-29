# Project Structure Analysis & Recommendations

## Current Structure Assessment

### ✅ What's Good

1. **Turborepo Monorepo**: Excellent choice for code sharing and build optimization
2. **Apps vs Packages Separation**: Clean separation of deployable apps and shared libraries
3. **Shared Packages**: `@repo/schema`, `@repo/database`, `@repo/market-sdk` follow DRY principles

### 🔄 Recommended Changes for Event-Driven Architecture

Based on 2024-2025 research on production HFT systems, here are structural improvements:

---

## 1. Algo-Worker Restructuring (Event-Driven Layers)

### Current Structure
```
apps/algo-worker/src/
├── engines/
│   ├── data/
│   ├── signal/
│   ├── policy/
│   └── execution/
└── trading-orchestrator.service.ts
```

### ❌ Problem
- Engines are tightly coupled through `trading-orchestrator.service.ts`
- No clear event-driven boundaries
- Doesn't align with the 7-Layer Cognitive Architecture

### ✅ Recommended Structure
```
apps/algo-worker/src/
├── layers/                          # NEW: 7-Layer Architecture
│   ├── perception/                  # Layer 1: Data Ingestion
│   │   ├── market-data.consumer.ts
│   │   └── news.consumer.ts
│   ├── cortex/                      # Layer 2: Feature Engineering
│   │   ├── feature.service.ts
│   │   └── sentiment.service.ts
│   ├── prediction/                  # Layer 3: Alpha Generation
│   │   ├── tft.service.ts
│   │   └── ensemble.service.ts
│   ├── cognition/                   # Layer 4: Strategy & RL
│   │   ├── rl-agent.service.ts
│   │   └── strategy.service.ts
│   ├── execution/                   # Layer 5: Action
│   │   ├── order.service.ts
│   │   └── smart-router.service.ts
│   ├── memory/                      # Layer 6: Storage
│   │   ├── questdb.writer.ts
│   │   └── redis.cache.ts
│   └── control/                     # Layer 7: Ops
│       ├── metrics.service.ts
│       └── health.service.ts
├── events/                          # NEW: Event Definitions
│   ├── market-data.event.ts
│   ├── trading-signal.event.ts
│   └── order.event.ts
├── event-sequencer/                 # NEW: Deterministic Event Loop
│   ├── sequencer.service.ts
│   └── event-processor.ts
└── main.ts
```

**Benefits**:
- Clear layer boundaries (matches ARCHITECTURE.md)
- Event-driven by default
- Easier to profile latency per layer

---

## 2. Create `@repo/ai-models` Package (MISSING)

### ❌ Current Problem
- ML models likely scattered across `apps/algo-worker` and `apps/training-pipeline`
- No shared ONNX model interface

### ✅ Recommended Structure
```
packages/ai-models/
├── src/
│   ├── interfaces/
│   │   └── model.interface.ts       # IModel { load(), predict(), unload() }
│   ├── models/
│   │   ├── tft/
│   │   │   ├── tft.model.ts
│   │   │   └── metadata.json
│   │   ├── xgboost/
│   │   │   ├── xgboost.model.ts
│   │   │   └── metadata.json
│   │   └── finbert/
│   │       ├── finbert.model.ts
│   │       └── metadata.json
│   └── registry/
│       └── model-registry.service.ts
└── README.md
```

**Why**: Centralized model management, versioning, and hot-reload logic.

---

## 3. Move Event Bus to `@repo/event-bus` (RECOMMENDED)

### ❌ Current Problem
- Redis Streams logic likely embedded in apps
- No shared event publisher/consumer

### ✅ Recommended Structure
```
packages/event-bus/
├── src/
│   ├── publishers/
│   │   ├── market-data.publisher.ts
│   │   └── trading-signal.publisher.ts
│   ├── consumers/
│   │   ├── base.consumer.ts
│   │   └── consumer-group.ts
│   ├── events/
│   │   ├── base.event.ts
│   │   └── event.schemas.ts
│   └── index.ts
└── README.md
```

**Why**: Enforce event-driven architecture across all apps.

---

## 4. Infrastructure Enhancements

### ✅ Add Monitoring Configs

```
infrastructure/
├── docker/
│   └── docker-compose.yml           # ✅ Exists
├── kubernetes/                      # ❌ Empty (planned)
│   ├── deployments/
│   │   ├── questdb.yaml
│   │   ├── mongodb.yaml
│   │   ├── redis.yaml
│   │   └── algo-worker.yaml
│   ├── services/
│   └── ingress/
└── monitoring/                      # ❌ Empty (planned)
    ├── prometheus/
    │   └── config.yml
    ├── grafana/
    │   ├── dashboards/
    │   │   ├── trading-performance.json
    │   │   └── system-health.json
    │   └── datasources.yml
    └── alertmanager/
        └── config.yml
```

---

## 5. Scripts Directory Organization

### Current (Likely Unstructured)
```
scripts/
├── (various scripts)
```

### ✅ Recommended
```
scripts/
├── dev/                     # Development helpers
│   ├── reset-databases.sh
│   └── seed-test-data.sh
├── deploy/                  # Deployment scripts
│   ├── backup-questdb.sh
│   └── sync-models.sh
├── ml/                      # ML-specific scripts
│   ├── train-models.sh
│   └── export-onnx.sh
└── monitoring/              # Monitoring setup
    └── setup-grafana.sh
```

---

## 6. Missing Critical Directories

### Add These

```
investment-trading-portfolio/
├── models/                  # NEW: ONNX Model Registry
│   ├── tft/
│   │   └── v1.0.0/
│   │       ├── model.onnx
│   │       ├── metadata.json
│   │       └── SHA256SUM
│   ├── xgboost/
│   └── finbert/
├── data/                    # NEW: Training Data Exports
│   ├── exports/
│   │   └── features_2024.parquet
│   └── backtest-results/
└── logs/                    # NEW: Application Logs (gitignored)
    ├── algo-worker/
    ├── market-feeder/
    └── training-pipeline/
```

---

## Implementation Priority

### Phase 1 (Immediate - Week 1)
1. ✅ Create `@repo/ai-models` package
2. ✅ Create `@repo/event-bus` package
3. ✅ Add `models/` directory for ONNX registry
4. ✅ Add `data/` directory for training exports

### Phase 2 (Short-term - Weeks 2-3)
1. ✅ Refactor `algo-worker` to 7-layer structure
2. ✅ Move all event logic to `@repo/event-bus`
3. ✅ Implement event sequencer

### Phase 3 (Medium-term - Weeks 4-6)
1. ⏳ Populate `infrastructure/kubernetes/`
2. ⏳ Populate `infrastructure/monitoring/`
3. ⏳ Organize `scripts/` directory

---

## Migration Strategy

### Step 1: Create New Packages (No Breaking Changes)
```bash
pnpm create turbo@latest
# Add @repo/ai-models
# Add @repo/event-bus
```

### Step 2: Gradual Migration
- Move one layer at a time (start with Perception)
- Keep old `engines/` folder until migration complete
- Use feature flags to switch between old/new architecture

### Step 3: Remove Legacy Code
- Delete `engines/` folder after all layers migrated
- Update all imports
- Run full test suite

---

## Summary

### High-Impact Changes
1. **Create `@repo/ai-models`**: Shared ONNX model interface
2. **Create `@repo/event-bus`**: Enforce event-driven architecture
3. **Restructure `algo-worker`**: Align with 7-Layer Cognitive Architecture

### Medium-Impact Changes
1. Add `models/` directory for ONNX registry
2. Add infrastructure configs (K8s, monitoring)
3. Organize scripts directory

### Current Structure Rating: 7/10
**Strengths**: Good monorepo setup, shared packages
**Weaknesses**: No event-bus abstraction, 7-layer structure not reflected in code

**Target Rating: 9.5/10** (after implementing recommendations)

---

**Recommendation**: Start with creating `@repo/ai-models` and `@repo/event-bus` packages in Phase 1, then gradually refactor `algo-worker` to the 7-layer structure.
