# Algo-Worker Inference Engine

> **5-Tier hierarchical model inference via MLflow Model Serving REST endpoints, @champion alias model loading, health-checked serving containers, and Redis-cached tier outputs.**

**Last Updated**: March 29, 2026

---

## Overview

The algo-worker runs a **5-Tier Data-Bound Hierarchical AI** system where each tier operates at a different data resolution, on a different schedule, and with its own MLflow serving endpoint. The inference engine manages HTTP connections to MLflow serving containers, endpoint health checks, @champion alias model resolution, and Redis-based tier output caching.

Models are **not** loaded into the algo-worker process. Instead, each model is served by an MLflow Model Serving container that exposes a REST `/invocations` endpoint. The algo-worker sends feature payloads via HTTP POST and receives predictions in response. Models are loaded from the **MLflow Registry** using `@champion` aliases, which point to the latest production-promoted version.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        INFERENCE ENGINE — 5-TIER PIPELINE                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 0: Pre-Market Gap Predictor (XGBoost)                             │   │
│  │ Schedule: Once @ 09:08:05 IST │ Endpoint: /tier0/invocations │ ~2ms   │   │
│  │ Input: 12 overnight features from QuestDB daily_ohlcv                  │   │
│  │ Output → Redis tier0:gap:{date} (TTL: end of day)                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 1: Macro Director (HMM + PatchTST)                                │   │
│  │ Schedule: Once @ 09:09:00 IST │ Endpoint: /tier1/invocations │ ~8ms   │   │
│  │ Input: 32 daily features from QuestDB (26yr history)                    │   │
│  │ Output → Redis tier1:regime:{date} (TTL: end of day)                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: Intraday Navigator (LightGBM + TFT + Mamba)                    │   │
│  │ Schedule: Every 60s │ Endpoints: 3 parallel POST /invocations          │   │
│  │ Input: 80+ 1-min features (fresh) + Tier 0/1 (from cache)             │   │
│  │ LightGBM: /tier2-lgbm/invocations │ TFT: /tier2-tft/invocations      │   │
│  │ Mamba: /tier2-mamba/invocations                                        │   │
│  │ Output → Redis tier2:predictions:{ts} (TTL: 2hr rolling)              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 3: Microstructure Scalper (LiT Transformer)                       │   │
│  │ Schedule: Every 100ms │ Endpoint: /tier3/invocations                   │   │
│  │ Input: 14 order flow features (compute-engine Rust)                    │   │
│  │ Output → Redis tier3:microstructure:{ts} (TTL: 10s)                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      ↓ cached                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 4: Meta-Learner (Contextual Gating Network)                       │   │
│  │ Schedule: Every 60s │ Endpoint: /tier4/invocations │ ~2ms              │   │
│  │ Input: 4 Redis reads (tier0 + tier1 + tier2 + tier3 cached outputs)    │   │
│  │ Output → final_signal, confidence, position_action                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## MLflow Model Serving Architecture

### How It Works

1. **Training Pipeline** trains models and logs them to the MLflow Tracking Server.
2. Models are registered in the **MLflow Model Registry** and promoted with `@champion` aliases.
3. **MLflow Model Serving containers** load the `@champion` version of each model at startup.
4. The **algo-worker** calls each container's `/invocations` endpoint via HTTP POST with a JSON or dataframe payload.
5. The serving container runs inference and returns predictions as JSON.

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────────────┐
│  Training    │     │  MLflow Registry │     │  MLflow Serving Containers │
│  Pipeline    │────→│  (model store)   │────→│                           │
│              │     │                  │     │  tier0-xgboost:5001       │
│  trains +    │     │  @champion alias │     │  tier1-hmm:5002           │
│  registers   │     │  per model       │     │  tier1-patchtst:5003      │
│  models      │     │                  │     │  tier2-lgbm:5004          │
└──────────────┘     └──────────────────┘     │  tier2-tft:5005           │
                                               │  tier2-mamba:5006         │
                                               │  tier3-lit:5007           │
                                               │  tier4-meta:5008          │
                                               └──────────┬────────────────┘
                                                          │
                                                   POST /invocations
                                                          │
                                               ┌──────────▼────────────────┐
                                               │      Algo-Worker          │
                                               │  (HTTP client, no model   │
                                               │   files, no GPU mgmt)     │
                                               └───────────────────────────┘
```

### @champion Alias Loading

Each model in the MLflow Registry has a `@champion` alias that points to the currently promoted production version. When a serving container starts, it resolves the alias and loads that specific model version.

```
models:/tier0-xgboost@champion     → v12  (promoted 2026-03-28)
models:/tier1-hmm@champion         → v8   (promoted 2026-03-25)
models:/tier1-patchtst@champion    → v6   (promoted 2026-03-25)
models:/tier2-lightgbm@champion    → v15  (promoted 2026-03-27)
models:/tier2-tft@champion         → v9   (promoted 2026-03-27)
models:/tier2-mamba@champion       → v7   (promoted 2026-03-27)
models:/tier3-lit@champion         → v4   (promoted 2026-03-20)
models:/tier4-meta@champion        → v11  (promoted 2026-03-28)
```

Promoting a new `@champion` version is done through the training pipeline's quality gate. Restarting the serving container picks up the new version.

---

## Endpoint Configuration

### Serving Endpoint Map

```typescript
// config/mlflow-endpoints.ts

export const mlflowEndpoints = {
  tier0_xgboost: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier0/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier0/health`,
    model: 'models:/tier0-xgboost@champion',
    timeoutMs: 5000,
    retries: 1,
  },

  tier1_hmm: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier1-hmm/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier1-hmm/health`,
    model: 'models:/tier1-hmm@champion',
    timeoutMs: 5000,
    retries: 1,
  },
  tier1_patchtst: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier1-patchtst/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier1-patchtst/health`,
    model: 'models:/tier1-patchtst@champion',
    timeoutMs: 10000,
    retries: 1,
  },

  tier2_lightgbm: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier2-lgbm/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier2-lgbm/health`,
    model: 'models:/tier2-lightgbm@champion',
    timeoutMs: 10000,
    retries: 1,
  },
  tier2_tft: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier2-tft/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier2-tft/health`,
    model: 'models:/tier2-tft@champion',
    timeoutMs: 15000,
    retries: 1,
  },
  tier2_mamba: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier2-mamba/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier2-mamba/health`,
    model: 'models:/tier2-mamba@champion',
    timeoutMs: 12000,
    retries: 1,
  },

  tier3_lit: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier3/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier3/health`,
    model: 'models:/tier3-lit@champion',
    timeoutMs: 10000,
    retries: 0, // No retry at 100ms cadence — use cached value on failure
  },

  tier4_meta: {
    url: `${MLFLOW_SERVING_BASE_URL}/tier4/invocations`,
    healthUrl: `${MLFLOW_SERVING_BASE_URL}/tier4/health`,
    model: 'models:/tier4-meta@champion',
    timeoutMs: 5000,
    retries: 1,
  },
};
```

### Request / Response Format

All endpoints accept the MLflow serving `dataframe_split` format:

```typescript
// POST /tier0/invocations
// Content-Type: application/json

// Request
{
  "dataframe_split": {
    "columns": [
      "gap", "gift_nifty_return", "es_return", "nq_return",
      "brent_return", "gold_return", "dxy_change", "us10y_change",
      "vix_close", "nikkei_return", "finbert_sentiment", "prev_day_range"
    ],
    "data": [[0.012, 0.003, -0.001, 0.005, 0.02, -0.01, 0.15, 0.03, 14.2, 0.008, 0.35, 1.2]]
  }
}

// Response
{
  "predictions": [0.45, 0.032, 0.28, 0.82]
}
```

---

## Health Checks

Each MLflow serving container exposes health endpoints. The algo-worker checks these at startup and periodically during the trading session.

### Startup Health Gate

```typescript
@Injectable()
export class InferenceHealthService implements OnModuleInit {
  async onModuleInit() {
    const endpoints = Object.entries(mlflowEndpoints);
    const results = await Promise.allSettled(
      endpoints.map(([name, cfg]) => this.checkHealth(name, cfg.healthUrl)),
    );

    const unhealthy = results.filter((r) => r.status === 'rejected');
    if (unhealthy.length > 0) {
      throw new Error(
        `MLflow serving endpoints not ready: ${unhealthy.length}/${endpoints.length} failed`,
      );
    }

    this.logger.log('All MLflow serving endpoints healthy');
  }

  async checkHealth(name: string, healthUrl: string): Promise<void> {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`${name} health check failed: ${res.status}`);
  }
}
```

### Periodic Health Monitoring

| Check                         | Interval | Action on Failure                                           |
| ----------------------------- | -------- | ----------------------------------------------------------- |
| Endpoint `/health` response   | 30s      | Mark endpoint unhealthy, use last cached output             |
| Response latency p95          | 60s      | Alert if >2x expected latency                              |
| Consecutive failures (3+)     | Per call | Trip circuit breaker, pause new entries                     |
| Container restart detected    | Startup  | Wait for `/health` 200 before routing inference             |

---

## Serving Container Deployment

Each model runs in its own Docker container via `mlflow models serve`. The containers are managed by `docker-compose.yml`.

### Docker Compose (excerpt)

```yaml
# infrastructure/docker/docker-compose.yml (MLflow serving section)
services:
  mlflow-tier0:
    image: mlflow-serving:latest
    command: >
      mlflow models serve
        --model-uri models:/tier0-xgboost@champion
        --host 0.0.0.0 --port 5001 --no-conda
    ports:
      - "5001:5001"
    environment:
      MLFLOW_TRACKING_URI: http://mlflow:5000

  mlflow-tier2-tft:
    image: mlflow-serving:latest
    command: >
      mlflow models serve
        --model-uri models:/tier2-tft@champion
        --host 0.0.0.0 --port 5005 --no-conda
    ports:
      - "5005:5005"
    environment:
      MLFLOW_TRACKING_URI: http://mlflow:5000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  mlflow-tier3-lit:
    image: mlflow-serving:latest
    command: >
      mlflow models serve
        --model-uri models:/tier3-lit@champion
        --host 0.0.0.0 --port 5007 --no-conda
    ports:
      - "5007:5007"
    environment:
      MLFLOW_TRACKING_URI: http://mlflow:5000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Resource Allocation

GPU and CPU resources are managed by the serving containers, not the algo-worker. The algo-worker is a pure HTTP client.

| Container              | GPU Required | Rationale                                                           |
| ---------------------- | ------------ | ------------------------------------------------------------------- |
| tier0-xgboost          | No           | Tree model, CPU inference ~2ms                                      |
| tier1-hmm              | No           | Statistical model, negligible compute                               |
| tier1-patchtst         | No           | Small transformer (4 layers, 64 dim), fires once/day                |
| tier2-lightgbm         | No           | 1024 trees, GBDT natively CPU-optimal                               |
| tier2-tft              | Yes          | 6-layer encoder-decoder, GPU accelerated: 12ms vs CPU 35ms         |
| tier2-mamba            | Yes          | Selective state-space model, CUDA scan: 10ms vs CPU 25ms           |
| tier3-lit              | Yes          | 10 inferences/sec, must be <10ms per call. CPU too slow (18ms)     |
| tier4-meta             | No           | 3-layer MLP on 24 inputs, <2ms on CPU                              |

---

## Warm-Up Protocol

Cold MLflow serving containers take several seconds to load models and JIT-compile optimizations. Warm-up is performed at startup before the trading session begins.

```typescript
async warmupAllEndpoints(): Promise<void> {
  const warmups = [
    { name: 'tier0_xgboost', url: mlflowEndpoints.tier0_xgboost.url, shape: [1, 12] },
    { name: 'tier1_hmm', url: mlflowEndpoints.tier1_hmm.url, shape: [1, 32] },
    { name: 'tier1_patchtst', url: mlflowEndpoints.tier1_patchtst.url, shape: [1, 252, 32] },
    { name: 'tier2_lightgbm', url: mlflowEndpoints.tier2_lightgbm.url, shape: [1, 84] },
    { name: 'tier2_tft', url: mlflowEndpoints.tier2_tft.url, shape: [1, 120, 80] },
    { name: 'tier2_mamba', url: mlflowEndpoints.tier2_mamba.url, shape: [1, 120, 80] },
    { name: 'tier3_lit', url: mlflowEndpoints.tier3_lit.url, shape: [1, 14] },
    { name: 'tier4_meta', url: mlflowEndpoints.tier4_meta.url, shape: [1, 24] },
  ];

  for (const w of warmups) {
    const dummy = Array(w.shape.reduce((a, b) => a * b, 1)).fill(0);
    await fetch(w.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataframe_split: { columns: [], data: [dummy] } }),
    });
    this.logger.log(`[warmup] ${w.name} ready`);
  }
}
```

---

## 60-Second Inference Cycle

```
T+0ms     market-feeder emits CandleComplete → Redis features:live
T+1ms     algo-worker receives 117 features
T+2ms     Feature Router splits features by tier

T+3ms     ┌── Tier 2 parallel (HTTP POST to MLflow endpoints) ──────────┐
          │  POST /tier2-lgbm/invocations:  80+ features → P(up/down/flat) │  ~5ms
          │  POST /tier2-tft/invocations:   [80x120] → quantile forecasts  │  ~12ms
          │  POST /tier2-mamba/invocations:  [80x120] → direction probs    │  ~10ms
          └────────────────────────────────────────────────────────────────┘
          (all fire simultaneously via Promise.all)

T+15ms    All Tier 2 results ready
          → Cache to Redis: tier2:predictions:{ts}

T+16ms    Read cached Tier 3 output from Redis
          ← tier3:microstructure:latest (from 100ms loop)

T+17ms    Read cached Tier 0/1 outputs from Redis
          ← tier0:gap:{date} + tier1:regime:{date}

T+18ms    POST /tier4/invocations (Meta-Learner, ~2ms)
          ← Fuse: Tier 0 (4 vals) + Tier 1 (6 vals) + Tier 2 (9 vals) + Tier 3 (5 vals)
          → Output: final_signal, confidence, position_action

T+20ms    INFERENCE COMPLETE — hand off to Strategy & Risk Layer
```

### Tier 3 Independent Loop (Concurrent)

```
Every 100ms (independent of 60s cycle):
  T+0ms    Read LOB snapshot from Redis (written by market-feeder/compute-engine)
  T+1ms    POST /tier3/invocations: 14 features → buy_pressure, sell_pressure, slippage
  T+9ms    Cache to Redis: tier3:microstructure:{ts} (TTL 10s)

  Throughput: 10 inferences/second
```

---

## Feature Input per Tier

| Tier  | Model        | Input Features                        | Shape          | Source                        |
| ----- | ------------ | ------------------------------------- | -------------- | ----------------------------- |
| **0** | XGBoost      | 12 overnight features                 | `[1, 12]`      | QuestDB `global_market_data`  |
| **1** | HMM          | 32 daily features                     | `[1, 32]`      | QuestDB `daily_ohlcv` (26yr)  |
| **1** | PatchTST     | 32 daily features x 252 days          | `[1, 252, 32]` | QuestDB `daily_ohlcv`         |
| **2** | LightGBM     | 80+ point features + Tier 0/1 context | `[1, 84]`      | Redis `features:live` + cache |
| **2** | TFT          | 80 features x 120 timesteps           | `[1, 120, 80]` | Redis rolling 2hr cache       |
| **2** | Mamba        | 80 features x 120 timesteps           | `[1, 120, 80]` | Redis rolling 2hr cache       |
| **3** | LiT          | 14 order flow features                | `[1, 14]`      | Redis `lob:features:latest`   |
| **4** | Meta-Learner | 24 fused values (4+6+9+5)             | `[1, 24]`      | Redis tier0/1/2/3 caches      |

---

## Performance Targets

| Component              | Target    | MLflow Serving (GPU containers) | CPU-Only Containers             |
| ---------------------- | --------- | ------------------------------- | ------------------------------- |
| Tier 0 XGBoost         | <5ms      | N/A (CPU container)             | 2ms                             |
| Tier 1 HMM + PatchTST  | <10ms     | N/A (CPU container)             | 8ms                             |
| Tier 2 LightGBM        | <10ms     | N/A (CPU container)             | 5ms                             |
| Tier 2 TFT             | <15ms     | **12ms** (GPU container)        | 35ms                            |
| Tier 2 Mamba           | <12ms     | **10ms** (GPU container)        | 25ms                            |
| Tier 3 LiT             | <10ms     | **8ms** (GPU container)         | 18ms (misses 100ms deadline!)   |
| Tier 4 Meta-Learner    | <3ms      | N/A (CPU container)             | 2ms                             |
| **Total 60s cycle**    | **<25ms** | **~20ms**                       | ~85ms (too slow)                |

GPU-enabled serving containers are required for production. Without GPU, TFT+Mamba alone take 60ms (exceeds budget), and Tier 3 cannot maintain the 100ms loop.

---

## Error Handling & Fallbacks

| Failure                         | Detection                       | Fallback                                                                                          |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Endpoint unreachable            | HTTP connection refused/timeout | Use last cached Redis output, mark endpoint unhealthy                                             |
| Endpoint returns 5xx            | HTTP status code check          | Retry once (if configured), then fall back to cached output                                       |
| Serving container crash         | Health check fails              | Docker auto-restarts container, skip current cycle, use cached output                             |
| Model version mismatch          | @champion alias check at boot   | Log warning, serving container loads whatever @champion resolves to                               |
| Tier output stale (Redis)       | TTL expiry check before read    | Use last known value with `stale: true` flag, reduce confidence by 50%                            |
| Inference timeout (>100ms)      | `AbortSignal.timeout` deadline  | Cancel, use last cached output, increment timeout counter. Trip circuit breaker at 3 consecutive. |
| MLflow Registry unreachable     | Container startup failure       | Container retries with backoff; algo-worker refuses to start until health checks pass             |

---

## Monitoring Metrics

```typescript
const metrics = {
  'inference.tier0_latency_ms': Histogram({ buckets: [1, 2, 5, 10] }),
  'inference.tier1_latency_ms': Histogram({ buckets: [2, 5, 10, 20] }),
  'inference.tier2_lgbm_ms': Histogram({ buckets: [2, 5, 10, 20] }),
  'inference.tier2_tft_ms': Histogram({ buckets: [5, 10, 15, 25, 50] }),
  'inference.tier2_mamba_ms': Histogram({ buckets: [5, 10, 15, 25] }),
  'inference.tier3_lit_ms': Histogram({ buckets: [2, 5, 8, 10, 15] }),
  'inference.tier4_meta_ms': Histogram({ buckets: [1, 2, 3, 5] }),
  'inference.total_cycle_ms': Histogram({ buckets: [10, 15, 20, 30, 50, 80] }),
  'inference.tier3_loop_hz': Gauge(),
  'inference.endpoint_health': Gauge({ labels: ['tier'] }),
  'inference.http_errors_total': Counter({ labels: ['tier', 'status_code'] }),
  'inference.cache_fallback_total': Counter({ labels: ['tier'] }),
};
```

---

## Related Documentation

- [layers/03-PREDICTION.md](./layers/03-PREDICTION.md) -- Prediction layer (5-tier signal flow)
- [ARCHITECTURE.md](./ARCHITECTURE.md) -- 6-layer system architecture
- [MODEL_PIPELINE_WORKFLOW.md](../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) -- Session timing
- [TIER0_MODELS.md](../../docs/ml/TIER0_MODELS.md) through [TIER4_MODELS.md](../../docs/ml/TIER4_MODELS.md) -- Model architectures
- [compute-engine README](../../packages/compute-engine/README.md) -- Rust feature computation
