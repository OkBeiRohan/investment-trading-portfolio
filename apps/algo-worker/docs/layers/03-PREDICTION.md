# Layer 3: Prediction Engine — 5-Tier Hierarchical Inference

**Purpose**: Run 5-tier model hierarchy with dedicated Worker Threads, GPU/CPU execution providers, and Redis-cached tier outputs. Produces final trading signal via Tier 4 Meta-Learner fusion.

---

## Overview

The Prediction layer coordinates 8 ONNX models across 5 tiers, each operating at a different data resolution and schedule. Tier 2 models run in parallel Worker Threads. Tier 3 runs on its own 100ms loop. Tier 4 reads cached outputs from all upstream tiers.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: 5-TIER PREDICTION ENGINE                        │
│                                                                               │
│  TIER 0 (once/day)  ─→ tier0:gap:{date}        ─┐                           │
│  TIER 1 (once/day)  ─→ tier1:regime:{date}      ─┤                           │
│  TIER 2 (every 60s) ─→ tier2:predictions:{ts}   ─┤──→ TIER 4 ──→ Signal    │
│  TIER 3 (every 100ms)→ tier3:microstructure:{ts} ─┘    (fusion)              │
│                                                                               │
│  Resolution:   1d candle    │    1m candle       │   100ms LOB               │
│  GPU/CPU:      CPU only     │    CPU + GPU       │   GPU dedicated           │
│  Thread:       Main thread  │    Worker Threads  │   Worker Thread           │
│                                                                               │
│  Total 60s cycle: <25ms (GPU) │ Tier 3 loop: <10ms per iteration             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 0: Pre-Market Gap Predictor

**Fires**: Once at 09:08:05 IST (after NSE pre-open freeze)
**Model**: XGBoost (500 trees, depth 6) via ONNX
**Thread**: Main thread (no Worker needed — fires once, <2ms)
**EP**: CPUExecutionProvider

```typescript
@Injectable()
export class Tier0Service {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create(
      'models/tier0_xgboost.onnx',
      onnxSessionConfigs.tier0_xgboost,
    );
  }

  async predict(overnightFeatures: Tier0Input): Promise<Tier0Output> {
    // 12 features: gap, gift_nifty_return, es_return, nq_return, brent_return,
    //              gold_return, dxy_change, us10y_change, vix_close, nikkei_return,
    //              finbert_sentiment, prev_day_range
    const input = new Float32Array(Object.values(overnightFeatures));
    const tensor = new ort.Tensor('float32', input, [1, 12]);
    const result = await this.session.run({ input: tensor });

    const output = result.output.data as Float32Array;
    const prediction: Tier0Output = {
      expected_gap_pct: output[0],
      expected_volatility_30m: output[1],
      directional_bias: output[2], // -1 to +1
      confidence: output[3],
    };

    // Cache for the entire day
    await this.redis.set(`tier0:gap:${today()}`, JSON.stringify(prediction), {
      EX: 28800,
    });
    return prediction;
  }
}
```

| Input                 | Output                                | Latency | Cache TTL  |
| --------------------- | ------------------------------------- | ------- | ---------- |
| 12 overnight features | gap_pct, volatility, bias, confidence | ~2ms    | End of day |

---

## Tier 1: Macro Director

**Fires**: Once at 09:09:00 IST
**Models**: HMM (regime) + PatchTST (daily trend) via ONNX
**Thread**: Main thread (<8ms total, fires once)
**EP**: CPUExecutionProvider

```typescript
@Injectable()
export class Tier1Service {
  private hmmSession: ort.InferenceSession;
  private patchTstSession: ort.InferenceSession;

  async predict(dailyFeatures: Tier1Input): Promise<Tier1Output> {
    // Run HMM + PatchTST sequentially (both small, total <8ms)
    const [regime, trend] = await Promise.all([
      this.runHMM(dailyFeatures.features32), // [1, 32] → regime state
      this.runPatchTST(dailyFeatures.sequence252), // [1, 252, 32] → trend
    ]);

    const prediction: Tier1Output = {
      regime_state: regime.state, // BULL_TRENDING | BEAR_TRENDING | VOLATILE | RANGING
      regime_confidence: regime.confidence,
      daily_direction: trend.direction, // -1 to +1
      daily_magnitude: trend.magnitude,
      trend_confidence: trend.confidence,
      regime_probs: regime.probs, // [4] softmax
    };

    await this.redis.set(
      `tier1:regime:${today()}`,
      JSON.stringify(prediction),
      { EX: 28800 },
    );
    return prediction;
  }
}
```

| Input                    | Output                                   | Latency | Cache TTL  |
| ------------------------ | ---------------------------------------- | ------- | ---------- |
| 32 daily features (26yr) | regime, direction, magnitude, confidence | ~8ms    | End of day |

---

## Tier 2: Intraday Navigator

**Fires**: Every 60 seconds on CandleComplete event
**Models**: LightGBM + TFT + Mamba (parallel ensemble)
**Threads**: 3 dedicated Worker Threads (1 CPU + 2 GPU)
**EP**: LightGBM=CPU, TFT=TensorRT/CUDA, Mamba=CUDA

### Parallel Execution

```typescript
@Injectable()
export class Tier2Service {
  constructor(private workerPool: WorkerPoolService) {}

  async predict(features: Tier2Input): Promise<Tier2Output> {
    // Read cached Tier 0/1 outputs (appended as regime context)
    const tier0 = await this.redis.get(`tier0:gap:${today()}`);
    const tier1 = await this.redis.get(`tier1:regime:${today()}`);
    const regimeContext = this.buildRegimeContext(tier0, tier1);

    // Augment 1-min features with daily regime context (4 extra features)
    const augmented = this.augmentFeatures(
      features.pointFeatures,
      regimeContext,
    );

    // Fire all 3 models in parallel via Worker Threads
    const start = performance.now();
    const [lgbm, tft, mamba] = await Promise.all([
      this.workerPool.runLightGBM(augmented), // CPU Worker: ~5ms
      this.workerPool.runTFT(features.sequence120x80), // GPU Worker: ~12ms
      this.workerPool.runMamba(features.sequence120x80), // GPU Worker: ~10ms
    ]);
    const latency = performance.now() - start;

    // Combine (simple average for now, Tier 4 does regime-weighted fusion)
    const prediction: Tier2Output = {
      lgbm_probs: lgbm.probs, // [3] P(up, down, flat)
      tft_quantiles: tft.quantiles, // [3×3] quantiles × horizons
      mamba_probs: mamba.probs, // [3] P(up, down, flat)
      ensemble_direction: this.ensembleVote(lgbm, tft, mamba),
      ensemble_confidence: this.ensembleConfidence(lgbm, tft, mamba),
      model_agreement: this.agreement(lgbm, tft, mamba),
      latency_ms: latency,
    };

    await this.redis.set(
      `tier2:predictions:${Date.now()}`,
      JSON.stringify(prediction),
      { EX: 7200 },
    );
    return prediction;
  }
}
```

### Worker Thread Details

| Worker                  | Model    | EP              | Pinned Core | Input Shape    | Latency (GPU) | Latency (CPU) |
| ----------------------- | -------- | --------------- | ----------- | -------------- | ------------- | ------------- |
| `tier2-lightgbm.worker` | LightGBM | CPU             | Core 1      | `[1, 84]`      | N/A           | 5ms           |
| `tier2-tft.worker`      | TFT      | TensorRT > CUDA | Core 2      | `[1, 120, 80]` | **12ms**      | 35ms          |
| `tier2-mamba.worker`    | Mamba    | CUDA            | Core 3      | `[1, 120, 80]` | **10ms**      | 25ms          |

**Effective Tier 2 latency**: max(5, 12, 10) = **~12ms** (GPU parallel), not 5+12+10=27ms.

---

## Tier 3: Microstructure Scalper

**Fires**: Every 100ms (self-driving loop in dedicated Worker Thread)
**Model**: LiT Transformer (phased activation)
**Thread**: Dedicated high-frequency Worker Thread (Core 4)
**EP**: CUDAExecutionProvider (required — CPU too slow for 100ms loop)

```typescript
// Tier 3 runs INDEPENDENTLY of the 60s cycle.
// Its Worker Thread has its own Redis connection and inference loop.
// The main thread never calls Tier 3 — it reads the cached output.

// In 60s cycle:
async getTier3Output(): Promise<Tier3Output> {
  const cached = await this.redis.get('tier3:microstructure:latest');
  if (!cached) return this.defaultTier3Output(); // Neutral with low confidence
  return JSON.parse(cached);
}
```

| Input                  | Output                                    | Loop Interval | Latency | GPU Required                    |
| ---------------------- | ----------------------------------------- | ------------- | ------- | ------------------------------- |
| 14 order flow features | buy_pressure, sell_pressure, slippage_est | 100ms         | ~8ms    | Yes (CPU=18ms, misses deadline) |

### Phased Activation

Tier 3 activates in 3 phases based on data availability:

| Phase       | Active When | Model                            | Confidence Ceiling |
| ----------- | ----------- | -------------------------------- | ------------------ |
| **Phase 1** | Day 1-30    | Analytical rules (OFI threshold) | 0.50               |
| **Phase 2** | Day 31-90   | Shallow MLP (2 layers)           | 0.65               |
| **Phase 3** | Day 91+     | Full LiT Transformer             | 1.00               |

Transition is automatic based on accumulated LOB sample count.

---

## Tier 4: Meta-Learner & Strategy Fusion

**Fires**: Every 60 seconds (after Tier 2 completes)
**Model**: Contextual Gating Network via ONNX
**Thread**: Main thread (24 inputs, ~2ms)
**EP**: CPUExecutionProvider

```typescript
@Injectable()
export class Tier4Service {
  private session: ort.InferenceSession;

  async predict(): Promise<Tier4Output> {
    // Read ALL cached tier outputs from Redis
    const [tier0, tier1, tier2, tier3] = await Promise.all([
      this.redis.get(`tier0:gap:${today()}`),
      this.redis.get(`tier1:regime:${today()}`),
      this.redis.get(`tier2:predictions:latest`),
      this.redis.get('tier3:microstructure:latest'),
    ]);

    // Fuse into 24-dimensional input vector
    const input = this.buildMetaInput(
      JSON.parse(tier0!), // 4 values: gap_pct, volatility, bias, confidence
      JSON.parse(tier1!), // 6 values: regime_probs[4], direction, magnitude
      JSON.parse(tier2!), // 9 values: lgbm_probs[3], ensemble_dir, ensemble_conf, agreement, ...
      JSON.parse(tier3!), // 5 values: buy_pressure, sell_pressure, slippage, confidence, phase
    );

    const tensor = new ort.Tensor('float32', input, [1, 24]);
    const result = await this.session.run({ input: tensor });
    const output = result.output.data as Float32Array;

    return {
      final_signal: output[0], // -1 (strong sell) to +1 (strong buy)
      confidence: output[1], // 0 to 1
      position_action: this.decodeAction(output[2]), // ENTER_LONG | ENTER_SHORT | HOLD | EXIT
      tier_weights: {
        tier0: output[3],
        tier1: output[4],
        tier2: output[5],
        tier3: output[6],
      },
    };
  }
}
```

### Regime-Adaptive Weighting

The Contextual Gating Network learns to weight tiers differently based on regime:

| Regime            | Tier 0 Weight | Tier 1 Weight | Tier 2 Weight | Tier 3 Weight |
| ----------------- | ------------- | ------------- | ------------- | ------------- |
| **BULL_TRENDING** | 0.05          | 0.25          | 0.55          | 0.15          |
| **BEAR_TRENDING** | 0.05          | 0.25          | 0.50          | 0.20          |
| **VOLATILE**      | 0.10          | 0.15          | 0.35          | 0.40          |
| **RANGING**       | 0.05          | 0.20          | 0.45          | 0.30          |

These are learned defaults — the network can deviate based on context.

---

## Signal Output

```typescript
interface PredictionOutput {
  timestamp: number;

  // Tier 4 final signal
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  signal: number; // -1 to +1
  confidence: number; // 0 to 1
  action: 'ENTER_LONG' | 'ENTER_SHORT' | 'HOLD' | 'EXIT';

  // Tier weight transparency
  tierWeights: {
    tier0: number;
    tier1: number;
    tier2: number;
    tier3: number;
  };

  // Per-tier raw outputs (for observability)
  tierOutputs: {
    tier0: Tier0Output;
    tier1: Tier1Output;
    tier2: Tier2Output;
    tier3: Tier3Output;
  };

  // Context
  regime: 'BULL_TRENDING' | 'BEAR_TRENDING' | 'VOLATILE' | 'RANGING';
  modelAgreement: number; // 0 to 1. How aligned are Tier 2 sub-models?

  // Performance
  latency: {
    tier2_parallel_ms: number;
    tier4_fusion_ms: number;
    total_ms: number;
  };
}
```

### Signal Thresholds

| Condition                             | Action                                       |
| ------------------------------------- | -------------------------------------------- |
| `confidence >= 0.70 && signal > 0.2`  | Strong LONG → Execute at full position size  |
| `confidence >= 0.70 && signal < -0.2` | Strong SHORT → Execute at full position size |
| `confidence 0.55-0.70`                | Medium signal → Execute at 50% position size |
| `confidence < 0.55`                   | Weak signal → Skip                           |
| `modelAgreement < 0.5`                | Models disagree → Reduce confidence by 25%   |
| First 5 minutes (caution mode)        | Require `confidence >= 0.85`                 |

---

## Latency Budget

| Stage                     | Target    | GPU Actual | CPU-Only Fallback     |
| ------------------------- | --------- | ---------- | --------------------- |
| Feature receipt (Redis)   | <1ms      | 0.5ms      | 0.5ms                 |
| Feature routing           | <1ms      | 0.3ms      | 0.3ms                 |
| Tier 2 parallel inference | <15ms     | **12ms**   | 35ms (TFT bottleneck) |
| Tier 3 cache read         | <1ms      | 0.5ms      | 0.5ms                 |
| Tier 0/1 cache read       | <1ms      | 0.5ms      | 0.5ms                 |
| Tier 4 Meta-Learner       | <3ms      | 2ms        | 2ms                   |
| **Total prediction**      | **<25ms** | **~16ms**  | ~39ms                 |

---

## Monitoring Metrics

- `prediction.tier0_latency_ms` — Tier 0 XGBoost inference
- `prediction.tier1_latency_ms` — Tier 1 HMM + PatchTST combined
- `prediction.tier2_parallel_ms` — Tier 2 total (max of 3 workers)
- `prediction.tier2_{lgbm,tft,mamba}_ms` — Individual Tier 2 models
- `prediction.tier3_loop_hz` — Tier 3 actual loop frequency (target: 10 Hz)
- `prediction.tier3_latency_ms` — Tier 3 LiT per inference
- `prediction.tier4_fusion_ms` — Tier 4 Meta-Learner
- `prediction.total_cycle_ms` — Full 60s cycle prediction latency
- `prediction.signals_total{direction}` — Signal counts by direction
- `prediction.model_agreement` — Tier 2 sub-model agreement ratio
- `prediction.confidence_histogram` — Distribution of confidence scores
- `prediction.gpu_utilization_pct` — GPU usage (nvidia-smi)
- `prediction.worker_restart_total{tier}` — Worker Thread crash count

---

**See Also**:

- [02-FEATURE-ENGINE.md](./02-FEATURE-ENGINE.md) — Previous layer (feature computation)
- [04-STRATEGY-RISK.md](./04-STRATEGY-RISK.md) — Next layer (strategy selection)
- [INFERENCE_ENGINE.md](../INFERENCE_ENGINE.md) — GPU/CPU allocation details
- [MODEL_PIPELINE_WORKFLOW.md](../../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Session timing
