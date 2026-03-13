# Algo-Worker Inference Engine

> **5-Tier hierarchical model inference with ONNX Runtime, GPU/CPU thread allocation, Worker Thread isolation, and data-resolution-aligned caching.**

**Last Updated**: March 13, 2026

---

## Overview

The algo-worker runs a **5-Tier Data-Bound Hierarchical AI** system where each tier operates at a different data resolution, on a different schedule, and with dedicated compute resources. The inference engine manages GPU/CPU allocation, ONNX Runtime Execution Providers, Worker Thread pools, and Redis-based tier output caching.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        INFERENCE ENGINE — 5-TIER PIPELINE                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 0: Pre-Market Gap Predictor (XGBoost)                             │   │
│  │ Schedule: Once @ 09:08:05 IST │ EP: CPU │ Worker: main │ ~2ms         │   │
│  │ Input: 12 overnight features from QuestDB daily_ohlcv                  │   │
│  │ Output → Redis tier0:gap:{date} (TTL: end of day)                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 1: Macro Director (HMM + PatchTST)                                │   │
│  │ Schedule: Once @ 09:09:00 IST │ EP: CPU │ Worker: main │ ~8ms         │   │
│  │ Input: 32 daily features from QuestDB (26yr history)                    │   │
│  │ Output → Redis tier1:regime:{date} (TTL: end of day)                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: Intraday Navigator (LightGBM + TFT + Mamba)                    │   │
│  │ Schedule: Every 60s │ EP: TensorRT/CUDA │ Worker: dedicated threads    │   │
│  │ Input: 80+ 1-min features (fresh) + Tier 0/1 (from cache)             │   │
│  │ LightGBM: CPU Worker Thread │ TFT: GPU Worker Thread │ Mamba: GPU WT  │   │
│  │ Output → Redis tier2:predictions:{ts} (TTL: 2hr rolling)              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 3: Microstructure Scalper (LiT Transformer)                       │   │
│  │ Schedule: Every 100ms │ EP: CUDA │ Worker: dedicated high-freq thread  │   │
│  │ Input: 14 order flow features (compute-engine Rust)                    │   │
│  │ Output → Redis tier3:microstructure:{ts} (TTL: 10s)                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 4: Meta-Learner (Contextual Gating Network)                       │   │
│  │ Schedule: Every 60s │ EP: CPU │ Worker: main │ ~2ms                    │   │
│  │ Input: 4 Redis reads (tier0 + tier1 + tier2 + tier3 cached outputs)    │   │
│  │ Output → final_signal, confidence, position_action                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## GPU / CPU Thread Allocation

### Hardware Assumption

```
CPU:  8+ cores (e.g., Intel i7-13700K / AMD Ryzen 7 7800X)
GPU:  NVIDIA RTX 3050+ (4GB+ VRAM) for CUDA/TensorRT inference
RAM:  32GB DDR5
OS:   Windows 11 / Arch Linux
```

### Thread Allocation Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPUTE RESOURCE ALLOCATION                          │
│                                                                              │
│  CPU CORES                                                                   │
│  ═════════                                                                   │
│  Core 0:  Node.js Event Loop (main thread)                                  │
│           - Redis subscriptions, event routing, Tier 0/1/4 inference        │
│           - ONNX interOpNumThreads = 1                                      │
│                                                                              │
│  Core 1:  Tier 2 — LightGBM Worker Thread                                  │
│           - CPU-only inference (LightGBM is tree-based, no GPU benefit)     │
│           - ONNX: CPUExecutionProvider                                      │
│           - intraOpNumThreads = 2 (LightGBM uses OpenMP internally)        │
│                                                                              │
│  Core 2:  Tier 2 — TFT Worker Thread                                       │
│           - GPU inference via TensorRT EP                                   │
│           - ONNX session pinned to GPU device 0                             │
│           - CPU fallback if GPU unavailable                                 │
│                                                                              │
│  Core 3:  Tier 2 — Mamba Worker Thread                                     │
│           - GPU inference via CUDA EP                                       │
│           - ONNX session pinned to GPU device 0                             │
│           - Shares CUDA stream with TFT (different ONNX sessions)          │
│                                                                              │
│  Core 4:  Tier 3 — LiT High-Frequency Worker Thread                       │
│           - GPU inference (100ms loop, 10 inferences/sec)                  │
│           - Dedicated CUDA stream for low-latency                          │
│           - ONNX: CUDAExecutionProvider, arena_extend_strategy = kSameAsRequested
│                                                                              │
│  Core 5:  compute-engine (Rust/Rayon) — Feature Computation                │
│           - Called by market-feeder, runs in its own process                │
│           - Rayon thread pool: 4 threads for parallel feature computation  │
│                                                                              │
│  Core 6-7: OS + Redis + QuestDB                                            │
│                                                                              │
│  GPU (RTX 3050+)                                                            │
│  ═══════════════                                                            │
│  CUDA Stream 0:  TFT + Mamba (Tier 2, sequential within 60s cycle)         │
│  CUDA Stream 1:  LiT (Tier 3, independent 100ms loop)                     │
│  VRAM Budget:                                                                │
│    TFT ONNX model:    ~120 MB                                               │
│    Mamba ONNX model:  ~80 MB                                                │
│    LiT ONNX model:    ~60 MB                                                │
│    Workspace:         ~200 MB                                               │
│    Total:             ~460 MB (fits in 4GB VRAM)                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Allocation

| Decision                     | Rationale                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| LightGBM on CPU              | Tree-based models don't benefit from GPU. CPU inference is faster (~5ms) than GPU kernel launch overhead      |
| TFT/Mamba on GPU             | Sequence models (attention, SSM) have massive speedup on GPU: 35ms → 12ms for TFT                             |
| LiT on dedicated CUDA stream | 100ms loop cannot contend with 60s-cycle models. Separate stream prevents head-of-line blocking               |
| Tier 0/1/4 on main thread    | Small models (<2ms each), fire infrequently (once/day or once/60s). Worker Thread overhead unjustified        |
| Rayon in separate process    | compute-engine runs inside market-feeder (different process), so Rayon threads don't compete with algo-worker |

---

## ONNX Runtime Configuration

### Execution Provider Priority

```typescript
// config/onnx.config.ts

export const onnxSessionConfigs = {
  // Tier 0: XGBoost — CPU only (fires once/day, ~2ms)
  tier0_xgboost: {
    executionProviders: ['CPUExecutionProvider'],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    enableMemPattern: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  },

  // Tier 1: HMM + PatchTST — CPU only (fires once/day, ~8ms)
  tier1_hmm: {
    executionProviders: ['CPUExecutionProvider'],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 2,
  },
  tier1_patchtst: {
    executionProviders: ['CPUExecutionProvider'],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 2,
  },

  // Tier 2: LightGBM — CPU Worker Thread (every 60s, ~5ms)
  tier2_lightgbm: {
    executionProviders: ['CPUExecutionProvider'],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    enableMemPattern: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 2, // LightGBM internal parallelism
  },

  // Tier 2: TFT — GPU Worker Thread (every 60s, ~12ms GPU / ~35ms CPU)
  tier2_tft: {
    executionProviders: [
      {
        name: 'TensorrtExecutionProvider',
        deviceId: 0,
        trt_max_workspace_size: 1 << 30, // 1 GB
        trt_fp16_enable: true, // FP16 for 2x throughput
        trt_engine_cache_enable: true,
        trt_engine_cache_path: './models/trt_cache/',
      },
      {
        name: 'CUDAExecutionProvider',
        deviceId: 0,
        arena_extend_strategy: 'kSameAsRequested',
        cudnn_conv_algo_search: 'DEFAULT',
        gpu_mem_limit: 256 * 1024 * 1024, // 256 MB limit
      },
      'CPUExecutionProvider', // Fallback
    ],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    enableMemPattern: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 1, // GPU does the work, CPU threads minimal
  },

  // Tier 2: Mamba — GPU Worker Thread (every 60s, ~10ms GPU / ~25ms CPU)
  tier2_mamba: {
    executionProviders: [
      {
        name: 'CUDAExecutionProvider',
        deviceId: 0,
        arena_extend_strategy: 'kSameAsRequested',
        gpu_mem_limit: 128 * 1024 * 1024, // 128 MB limit
      },
      'CPUExecutionProvider',
    ],
    graphOptimizationLevel: 'all' as const,
    enableMemPattern: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  },

  // Tier 3: LiT — Dedicated GPU (every 100ms, ~8ms)
  tier3_lit: {
    executionProviders: [
      {
        name: 'CUDAExecutionProvider',
        deviceId: 0,
        arena_extend_strategy: 'kSameAsRequested',
        cudnn_conv_algo_search: 'DEFAULT',
        gpu_mem_limit: 128 * 1024 * 1024,
      },
      'CPUExecutionProvider',
    ],
    graphOptimizationLevel: 'all' as const,
    enableMemPattern: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  },

  // Tier 4: Meta-Learner — CPU (every 60s, ~2ms)
  tier4_meta: {
    executionProviders: ['CPUExecutionProvider'],
    graphOptimizationLevel: 'all' as const,
    enableCpuMemArena: true,
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  },
};
```

### EP Selection Rationale

| Model                 | Primary EP            | Why                                                                                          |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| XGBoost (Tier 0)      | CPU                   | Tree model. ~500 trees × depth 6. CPU inference ~2ms. GPU launch overhead alone is 1ms.      |
| HMM (Tier 1)          | CPU                   | Statistical model. Matrix operations on [4×4] transition matrix. Negligible compute.         |
| PatchTST (Tier 1)     | CPU                   | Small transformer (4 layers, 64 dim). Fires once/day. CPU ~5ms sufficient.                   |
| LightGBM (Tier 2)     | CPU                   | 1024 trees × depth 8. GBDT natively CPU-optimal. GPU overhead negates gains at this scale.   |
| TFT (Tier 2)          | TensorRT > CUDA > CPU | 6-layer encoder-decoder + multi-head attention on [80×120]. TensorRT FP16: 12ms vs CPU 35ms. |
| Mamba (Tier 2)        | CUDA > CPU            | Selective state-space model. CUDA scan operations: 10ms vs CPU 25ms.                         |
| LiT (Tier 3)          | CUDA > CPU            | Fires 10×/sec. Must be <10ms. CUDA: 8ms vs CPU: 18ms. CPU would miss 100ms deadline.         |
| Meta-Learner (Tier 4) | CPU                   | 3-layer MLP on 24 inputs. <2ms on CPU. No GPU needed.                                        |

---

## Worker Thread Architecture

### Pool Structure

```typescript
// services/inference/worker-pool.service.ts
import { Worker } from 'worker_threads';

@Injectable()
export class WorkerPoolService implements OnModuleInit {
  private tier2Workers = {
    lightgbm: null as Worker | null,
    tft: null as Worker | null,
    mamba: null as Worker | null,
  };
  private tier3Worker: Worker | null = null;

  async onModuleInit() {
    // Tier 2: Three dedicated Worker Threads
    this.tier2Workers.lightgbm = new Worker(
      './dist/workers/tier2-lightgbm.worker.js',
      { workerData: { model: 'models/tier2_lightgbm.onnx', ep: 'cpu' } },
    );
    this.tier2Workers.tft = new Worker('./dist/workers/tier2-tft.worker.js', {
      workerData: { model: 'models/tier2_tft.onnx', ep: 'tensorrt' },
    });
    this.tier2Workers.mamba = new Worker(
      './dist/workers/tier2-mamba.worker.js',
      { workerData: { model: 'models/tier2_mamba.onnx', ep: 'cuda' } },
    );

    // Tier 3: Dedicated high-frequency Worker Thread
    this.tier3Worker = new Worker('./dist/workers/tier3-lit.worker.js', {
      workerData: { model: 'models/tier3_lit.onnx', ep: 'cuda', loopMs: 100 },
    });

    // Pre-warm all models (dummy inference to trigger JIT/TRT compilation)
    await this.warmupAllModels();
  }

  async runTier2Parallel(
    features: Float32Array,
    sequence: Float32Array,
  ): Promise<Tier2Output> {
    // Fire all three Tier 2 models in parallel
    const [lgbm, tft, mamba] = await Promise.all([
      this.postAndWait(this.tier2Workers.lightgbm!, {
        type: 'infer',
        features,
      }),
      this.postAndWait(this.tier2Workers.tft!, {
        type: 'infer',
        features: sequence,
      }),
      this.postAndWait(this.tier2Workers.mamba!, {
        type: 'infer',
        features: sequence,
      }),
    ]);

    return { lgbm, tft, mamba };
  }

  private postAndWait(worker: Worker, data: unknown): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const handler = (msg: {
        type: string;
        result?: Float32Array;
        error?: string;
      }) => {
        worker.removeListener('message', handler);
        if (msg.type === 'result') resolve(msg.result!);
        else reject(new Error(msg.error));
      };
      worker.on('message', handler);
      worker.postMessage(data);
    });
  }
}
```

### Worker Thread Internals (GPU)

```typescript
// workers/tier2-tft.worker.js
import { parentPort, workerData } from 'worker_threads';
import * as ort from 'onnxruntime-node';
import { onnxSessionConfigs } from '../config/onnx.config.js';

let session: ort.InferenceSession;

async function init() {
  // Load ONNX model with TensorRT EP in this thread
  session = await ort.InferenceSession.create(
    workerData.model,
    onnxSessionConfigs.tier2_tft,
  );

  // Pre-warm: first inference triggers TensorRT engine build (~10s)
  const dummy = new Float32Array(80 * 120);
  const tensor = new ort.Tensor('float32', dummy, [1, 120, 80]);
  await session.run({ input: tensor });

  parentPort!.postMessage({ type: 'ready' });
}

parentPort!.on(
  'message',
  async (msg: { type: string; features?: Float32Array }) => {
    if (msg.type === 'infer') {
      const tensor = new ort.Tensor('float32', msg.features!, [1, 120, 80]);
      const result = await session.run({ input: tensor });
      const output = result.output.data as Float32Array;
      parentPort!.postMessage({ type: 'result', result: output });
    }
  },
);

init();
```

### Tier 3 Self-Driving Loop

```typescript
// workers/tier3-lit.worker.js
import { parentPort, workerData } from 'worker_threads';
import * as ort from 'onnxruntime-node';
import { createClient } from 'redis';

let session: ort.InferenceSession;
let redis: ReturnType<typeof createClient>;

async function init() {
  session = await ort.InferenceSession.create(workerData.model, {
    /* CUDA EP config */
  });

  redis = createClient();
  await redis.connect();

  parentPort!.postMessage({ type: 'ready' });

  // Self-driving 100ms loop — independent of main thread
  setInterval(runInference, workerData.loopMs);
}

async function runInference() {
  // Read latest LOB features from Redis (written by compute-engine)
  const raw = await redis.get('lob:features:latest');
  if (!raw) return;

  const features = new Float32Array(JSON.parse(raw));
  const tensor = new ort.Tensor('float32', features, [1, 14]);
  const result = await session.run({ input: tensor });

  const output = result.output.data as Float32Array;

  // Cache output for Tier 4 to read
  await redis.set(
    'tier3:microstructure:latest',
    JSON.stringify(Array.from(output)),
    {
      EX: 10, // 10-second TTL
    },
  );
}

init();
```

---

## Model Warm-Up Protocol

Cold ONNX sessions take 50-500ms on first inference (graph optimization, TensorRT engine compilation). Warm-up eliminates this from the trading-critical path.

```typescript
async warmupAllModels(): Promise<void> {
  const warmups = [
    // Tier 0: XGBoost (12 features)
    { session: this.tier0Session, shape: [1, 12], name: 'tier0_xgboost' },
    // Tier 1: HMM (32 features)
    { session: this.tier1HmmSession, shape: [1, 32], name: 'tier1_hmm' },
    // Tier 1: PatchTST (32 × 252 daily)
    { session: this.tier1PatchTstSession, shape: [1, 252, 32], name: 'tier1_patchtst' },
    // Tier 4: Meta-Learner (24 fused inputs)
    { session: this.tier4MetaSession, shape: [1, 24], name: 'tier4_meta' },
  ];

  // Main-thread models (sequential warm-up)
  for (const w of warmups) {
    const dummy = new Float32Array(w.shape.reduce((a, b) => a * b, 1));
    const tensor = new ort.Tensor('float32', dummy, w.shape);
    await w.session.run({ input: tensor });
    console.log(`[warmup] ${w.name} ready`);
  }

  // Worker-thread models warm up during Worker init (see worker code above)
  // TFT TensorRT engine: first inference takes ~10s (cached to disk for future starts)
}
```

---

## 60-Second Inference Cycle

```
T+0ms     market-feeder emits CandleComplete → Redis features:live
T+1ms     algo-worker receives 117 features
T+2ms     Feature Router splits features by tier

T+3ms     ┌── Tier 2 parallel (Worker Threads) ──────────────────────┐
          │  LightGBM Worker (CPU):  80+ features → P(up/down/flat)  │  ~5ms
          │  TFT Worker (GPU):      [80×120] → quantile forecasts    │  ~12ms
          │  Mamba Worker (GPU):    [80×120] → direction probs       │  ~10ms
          └──────────────────────────────────────────────────────────-┘
          (all fire simultaneously via Promise.all)

T+15ms    All Tier 2 results ready
          → Cache to Redis: tier2:predictions:{ts}

T+16ms    Read cached Tier 3 output from Redis
          ← tier3:microstructure:latest (from 100ms loop)

T+17ms    Read cached Tier 0/1 outputs from Redis
          ← tier0:gap:{date} + tier1:regime:{date}

T+18ms    Tier 4 Meta-Learner (CPU, main thread, ~2ms)
          ← Fuse: Tier 0 (4 vals) + Tier 1 (6 vals) + Tier 2 (9 vals) + Tier 3 (5 vals)
          → Output: final_signal, confidence, position_action

T+20ms    INFERENCE COMPLETE — hand off to Strategy & Risk Layer
```

### Tier 3 Independent Loop (Concurrent)

```
Every 100ms (independent of 60s cycle):
  T+0ms    Read LOB snapshot from Redis (written by market-feeder/compute-engine)
  T+1ms    LiT Worker (GPU): 14 features → buy_pressure, sell_pressure, slippage
  T+9ms    Cache to Redis: tier3:microstructure:{ts} (TTL 10s)

  Throughput: 10 inferences/second
  GPU utilization: ~80ms/100ms = 80% on CUDA Stream 1
```

---

## Feature Input per Tier

| Tier  | Model        | Input Features                        | Shape          | Source                        |
| ----- | ------------ | ------------------------------------- | -------------- | ----------------------------- |
| **0** | XGBoost      | 12 overnight features                 | `[1, 12]`      | QuestDB `global_market_data`  |
| **1** | HMM          | 32 daily features                     | `[1, 32]`      | QuestDB `daily_ohlcv` (26yr)  |
| **1** | PatchTST     | 32 daily features × 252 days          | `[1, 252, 32]` | QuestDB `daily_ohlcv`         |
| **2** | LightGBM     | 80+ point features + Tier 0/1 context | `[1, 84]`      | Redis `features:live` + cache |
| **2** | TFT          | 80 features × 120 timesteps           | `[1, 120, 80]` | Redis rolling 2hr cache       |
| **2** | Mamba        | 80 features × 120 timesteps           | `[1, 120, 80]` | Redis rolling 2hr cache       |
| **3** | LiT          | 14 order flow features                | `[1, 14]`      | Redis `lob:features:latest`   |
| **4** | Meta-Learner | 24 fused values (4+6+9+5)             | `[1, 24]`      | Redis tier0/1/2/3 caches      |

---

## Performance Targets

| Component             | Target    | GPU (RTX 3050)           | CPU Fallback                  |
| --------------------- | --------- | ------------------------ | ----------------------------- |
| Tier 0 XGBoost        | <5ms      | N/A (CPU)                | 2ms                           |
| Tier 1 HMM + PatchTST | <10ms     | N/A (CPU)                | 8ms                           |
| Tier 2 LightGBM       | <10ms     | N/A (CPU)                | 5ms                           |
| Tier 2 TFT            | <15ms     | **12ms** (TensorRT FP16) | 35ms                          |
| Tier 2 Mamba          | <12ms     | **10ms** (CUDA)          | 25ms                          |
| Tier 3 LiT            | <10ms     | **8ms** (CUDA)           | 18ms (misses 100ms deadline!) |
| Tier 4 Meta-Learner   | <3ms      | N/A (CPU)                | 2ms                           |
| **Total 60s cycle**   | **<25ms** | **~20ms**                | ~85ms (too slow)              |

**GPU is required for production**. Without GPU, TFT+Mamba alone take 60ms (exceeds budget), and Tier 3 cannot maintain 100ms loop.

---

## Model File Layout

```
apps/algo-worker/models/
├── tier0_xgboost.onnx              # 12 features → gap prediction (~1 MB)
├── tier1_hmm.onnx                  # 32 features → regime state (~500 KB)
├── tier1_patchtst.onnx             # [252, 32] → daily trend (~5 MB)
├── tier2_lightgbm.onnx             # 84 features → P(up/down/flat) (~8 MB)
├── tier2_tft.onnx                  # [120, 80] → multi-horizon quantiles (~45 MB)
├── tier2_mamba.onnx                # [120, 80] → direction probabilities (~30 MB)
├── tier3_lit.onnx                  # 14 features → buy/sell pressure (~20 MB)
├── tier4_meta.onnx                 # 24 inputs → final signal (~2 MB)
├── trt_cache/                      # TensorRT engine cache (auto-generated)
│   ├── tier2_tft_fp16.engine
│   └── tier2_tft_fp16.profile
└── model_versions.json             # Version manifest with SHA-256 checksums
```

---

## Error Handling & Fallbacks

| Failure                    | Detection                        | Fallback                                                                                          |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| GPU unavailable at startup | ONNX EP negotiation fails        | Fall back to CPUExecutionProvider for all models                                                  |
| GPU OOM during inference   | CUDA error caught in Worker      | Kill Worker, restart with CPU EP, alert ops                                                       |
| Worker Thread crash        | `worker.on('exit')` handler      | Restart Worker, skip current cycle, use last cached output                                        |
| ONNX model file missing    | `InferenceSession.create` throws | Refuse to start. Log error. No silent degradation.                                                |
| TensorRT cache stale       | Version mismatch in manifest     | Delete cache, rebuild engine on next warm-up (~10s)                                               |
| Tier output stale (Redis)  | TTL expiry check before read     | Use last known value with `stale: true` flag, reduce confidence by 50%                            |
| Inference timeout (>100ms) | `Promise.race` with deadline     | Cancel, use last cached output, increment timeout counter. Trip circuit breaker at 3 consecutive. |

---

## Monitoring Metrics

```typescript
// Prometheus metrics for inference engine
const metrics = {
  'inference.tier0_latency_ms': Histogram({ buckets: [1, 2, 5, 10] }),
  'inference.tier1_latency_ms': Histogram({ buckets: [2, 5, 10, 20] }),
  'inference.tier2_lgbm_ms': Histogram({ buckets: [2, 5, 10, 20] }),
  'inference.tier2_tft_ms': Histogram({ buckets: [5, 10, 15, 25, 50] }),
  'inference.tier2_mamba_ms': Histogram({ buckets: [5, 10, 15, 25] }),
  'inference.tier3_lit_ms': Histogram({ buckets: [2, 5, 8, 10, 15] }),
  'inference.tier4_meta_ms': Histogram({ buckets: [1, 2, 3, 5] }),
  'inference.total_cycle_ms': Histogram({ buckets: [10, 15, 20, 30, 50, 80] }),
  'inference.tier3_loop_hz': Gauge(), // Should be ~10 Hz
  'inference.gpu_memory_mb': Gauge(),
  'inference.worker_restarts': Counter({ labels: ['tier'] }),
  'inference.ep_fallbacks': Counter({ labels: ['tier', 'from_ep', 'to_ep'] }),
};
```

---

## Related Documentation

- [layers/03-PREDICTION.md](./layers/03-PREDICTION.md) — Prediction layer (5-tier signal flow)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 6-layer system architecture
- [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Session timing
- [TIER0_MODELS.md](../../docs/ml/TIER0_MODELS.md) through [TIER4_MODELS.md](../../docs/ml/TIER4_MODELS.md) — Model architectures
- [compute-engine README](../../packages/compute-engine/README.md) — Rust feature computation
