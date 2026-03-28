# Layer 3: Prediction Engine — 5-Tier Hierarchical Inference

**Purpose**: Run 5-tier model hierarchy via MLflow Model Serving REST endpoints with Redis-cached tier outputs. Produces final trading signal via Tier 4 Meta-Learner fusion.

---

## Overview

The Prediction layer coordinates 8 models across 5 tiers via MLflow Model Serving endpoints, each operating at a different data resolution and schedule. Tier 2 models are called in parallel via HTTP POST `/invocations`. Tier 3 runs on its own 100ms loop. Tier 4 reads cached outputs from all upstream tiers.

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
│  Serving:      CPU endpoint │    CPU + GPU eps   │   GPU endpoint            │
│  Calls:        Sequential   │    Parallel HTTP   │   High-freq HTTP loop     │
│                                                                               │
│  Total 60s cycle: <25ms (GPU) │ Tier 3 loop: <10ms per iteration             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 0: Pre-Market Gap Predictor

**Fires**: Once at 09:08:05 IST (after NSE pre-open freeze)
**Model**: XGBoost (500 trees, depth 6) via MLflow serving
**Endpoint**: POST `/tier0/invocations`
**Registry**: `models:/tier0-xgboost@champion`

```typescript
@Injectable()
export class Tier0Service {
  constructor(private readonly httpClient: InferenceHttpClient) {}

  async predict(overnightFeatures: Tier0Input): Promise<Tier0Output> {
    const response = await this.httpClient.invoke(
      mlflowEndpoints.tier0_xgboost.url,
      {
        dataframe_split: {
          columns: [
            'gap', 'gift_nifty_return', 'es_return', 'nq_return', 'brent_return',
            'gold_return', 'dxy_change', 'us10y_change', 'vix_close', 'nikkei_return',
            'finbert_sentiment', 'prev_day_range',
          ],
          data: [Object.values(overnightFeatures)],
        },
      },
    );

    const output = response.predictions[0];
    const prediction: Tier0Output = {
      expected_gap_pct: output[0],
      expected_volatility_30m: output[1],
      directional_bias: output[2],
      confidence: output[3],
    };

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
**Models**: HMM (regime) + PatchTST (daily trend) via MLflow serving
**Endpoints**: POST `/tier1-hmm/invocations` + POST `/tier1-patchtst/invocations`
**Registry**: `models:/tier1-hmm@champion` + `models:/tier1-patchtst@champion`

```typescript
@Injectable()
export class Tier1Service {
  constructor(private readonly httpClient: InferenceHttpClient) {}

  async predict(dailyFeatures: Tier1Input): Promise<Tier1Output> {
    const [regime, trend] = await Promise.all([
      this.httpClient.invoke(mlflowEndpoints.tier1_hmm.url, {
        dataframe_split: { columns: [], data: [dailyFeatures.features32] },
      }),
      this.httpClient.invoke(mlflowEndpoints.tier1_patchtst.url, {
        dataframe_split: { columns: [], data: [dailyFeatures.sequence252.flat()] },
      }),
    ]);

    const prediction: Tier1Output = {
      regime_state: regime.predictions.state,
      regime_confidence: regime.predictions.confidence,
      daily_direction: trend.predictions.direction,
      daily_magnitude: trend.predictions.magnitude,
      trend_confidence: trend.predictions.confidence,
      regime_probs: regime.predictions.probs,
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
**Models**: LightGBM + TFT + Mamba (parallel ensemble via MLflow serving)
**Endpoints**: 3 parallel POST `/invocations` calls
**Registry**: `models:/tier2-lightgbm@champion`, `models:/tier2-tft@champion`, `models:/tier2-mamba@champion`

### Parallel Execution

```typescript
@Injectable()
export class Tier2Service {
  constructor(private readonly httpClient: InferenceHttpClient) {}

  async predict(features: Tier2Input): Promise<Tier2Output> {
    const tier0 = await this.redis.get(`tier0:gap:${today()}`);
    const tier1 = await this.redis.get(`tier1:regime:${today()}`);
    const regimeContext = this.buildRegimeContext(tier0, tier1);

    const augmented = this.augmentFeatures(
      features.pointFeatures,
      regimeContext,
    );

    const start = performance.now();
    const [lgbm, tft, mamba] = await Promise.all([
      this.httpClient.invoke(mlflowEndpoints.tier2_lightgbm.url, {
        dataframe_split: { columns: [], data: [augmented] },
      }),
      this.httpClient.invoke(mlflowEndpoints.tier2_tft.url, {
        dataframe_split: { columns: [], data: [features.sequence120x80.flat()] },
      }),
      this.httpClient.invoke(mlflowEndpoints.tier2_mamba.url, {
        dataframe_split: { columns: [], data: [features.sequence120x80.flat()] },
      }),
    ]);
    const latency = performance.now() - start;

    const prediction: Tier2Output = {
      lgbm_probs: lgbm.predictions,
      tft_quantiles: tft.predictions,
      mamba_probs: mamba.predictions,
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

### MLflow Serving Endpoint Details

| Endpoint                    | Model    | GPU Required | Input Shape    | Latency (GPU) | Latency (CPU) |
| --------------------------- | -------- | ------------ | -------------- | ------------- | ------------- |
| `/tier2-lgbm/invocations`  | LightGBM | No           | `[1, 84]`      | N/A           | 5ms           |
| `/tier2-tft/invocations`   | TFT      | Yes          | `[1, 120, 80]` | **12ms**      | 35ms          |
| `/tier2-mamba/invocations` | Mamba    | Yes          | `[1, 120, 80]` | **10ms**      | 25ms          |

**Effective Tier 2 latency**: max(5, 12, 10) = **~12ms** (parallel HTTP calls), not 5+12+10=27ms.

---

## Tier 3: Microstructure Scalper

**Fires**: Every 100ms (self-driving loop calling MLflow endpoint)
**Model**: LiT Transformer (phased activation)
**Endpoint**: POST `/tier3/invocations`
**Registry**: `models:/tier3-lit@champion` (GPU container required -- CPU too slow for 100ms loop)

```typescript
// Tier 3 runs INDEPENDENTLY of the 60s cycle.
// A setInterval loop calls the MLflow endpoint and caches results to Redis.
// The 60s cycle reads the cached output.

// In 60s cycle:
async getTier3Output(): Promise<Tier3Output> {
  const cached = await this.redis.get('tier3:microstructure:latest');
  if (!cached) return this.defaultTier3Output();
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
**Model**: Contextual Gating Network via MLflow serving
**Endpoint**: POST `/tier4/invocations`
**Registry**: `models:/tier4-meta@champion`

```typescript
@Injectable()
export class Tier4Service {
  constructor(private readonly httpClient: InferenceHttpClient) {}

  async predict(): Promise<Tier4Output> {
    const [tier0, tier1, tier2, tier3] = await Promise.all([
      this.redis.get(`tier0:gap:${today()}`),
      this.redis.get(`tier1:regime:${today()}`),
      this.redis.get(`tier2:predictions:latest`),
      this.redis.get('tier3:microstructure:latest'),
    ]);

    const input = this.buildMetaInput(
      JSON.parse(tier0!), // 4 values: gap_pct, volatility, bias, confidence
      JSON.parse(tier1!), // 6 values: regime_probs[4], direction, magnitude
      JSON.parse(tier2!), // 9 values: lgbm_probs[3], ensemble_dir, ensemble_conf, agreement, ...
      JSON.parse(tier3!), // 5 values: buy_pressure, sell_pressure, slippage, confidence, phase
    );

    const response = await this.httpClient.invoke(
      mlflowEndpoints.tier4_meta.url,
      { dataframe_split: { columns: [], data: [input] } },
    );

    const output = response.predictions[0];
    return {
      final_signal: output[0],
      confidence: output[1],
      position_action: this.decodeAction(output[2]),
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

| Stage                               | Target    | GPU Containers | CPU-Only Containers   |
| ----------------------------------- | --------- | -------------- | --------------------- |
| Feature receipt (Redis)             | <1ms      | 0.5ms          | 0.5ms                 |
| Feature routing                     | <1ms      | 0.3ms          | 0.3ms                 |
| Tier 2 parallel HTTP /invocations   | <15ms     | **12ms**       | 35ms (TFT bottleneck) |
| Tier 3 cache read                   | <1ms      | 0.5ms          | 0.5ms                 |
| Tier 0/1 cache read                 | <1ms      | 0.5ms          | 0.5ms                 |
| Tier 4 HTTP /invocations            | <3ms      | 2ms            | 2ms                   |
| **Total prediction**                | **<25ms** | **~16ms**      | ~39ms                 |

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
- `prediction.endpoint_health{tier}` — MLflow serving endpoint health status
- `prediction.http_errors_total{tier,status_code}` — HTTP error count per endpoint
- `prediction.cache_fallback_total{tier}` — Fallback to cached output count

---

**See Also**:

- [02-FEATURE-ENGINE.md](./02-FEATURE-ENGINE.md) — Previous layer (feature computation)
- [04-STRATEGY-RISK.md](./04-STRATEGY-RISK.md) — Next layer (strategy selection)
- [INFERENCE_ENGINE.md](../INFERENCE_ENGINE.md) — MLflow Model Serving endpoints, health checks, @champion loading
- [MODEL_PIPELINE_WORKFLOW.md](../../../docs/ml/MODEL_PIPELINE_WORKFLOW.md) — Session timing
