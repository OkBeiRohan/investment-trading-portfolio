# Feature Store Architecture

> **Centralized feature management system for ML model consistency, reproducibility, and development velocity**

**Last Updated**: January 13, 2026  
**Status**: High ROI Enhancement  
**Related**: [MARKET_STATE_ENCODER.md](./MARKET_STATE_ENCODER.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Executive Summary

### The Problem

**Current State**: Features computed inline in multiple services

- FeatureCacheService (algo-worker)
- TechnicalIndicatorService (algo-worker)
- Market State Encoder (algo-worker)
- Training pipeline feature engineering (training-pipeline)

**Pain Points**:

- ❌ Feature definitions duplicated across systems
- ❌ Training/serving skew (different feature implementations)
- ❌ No versioning (can't reproduce historical predictions)
- ❌ Hard to discover which features exist
- ❌ No consistency guarantees

### The Solution: Feature Store

> **Single source of truth for all feature definitions, serving both real-time inference and historical training**

**Benefits**:

- ✅ **Consistency**: Same feature code for training & serving
- ✅ **Reproducibility**: Version-controlled feature definitions
- ✅ **Velocity**: Reuse features across models, no reimplementation
- ✅ **Auditability**: Track feature lineage and transformations
- ✅ **Quality**: Centralized data validation and monitoring

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│ FEATURE STORE ARCHITECTURE                           │
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 1. FEATURE DEFINITIONS (Version-Controlled)         │
│    ├─ feature_registry.yaml                         │
│    ├─ technical_indicators.py                       │
│    ├─ option_features.py                            │
│    └─ market_state_aggregates.py                    │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. STREAMING LAYER (Online Features)                │
│    ├─ Faust/Kafka Streams (real-time computation)   │
│    ├─ Redis (hot cache, <1s TTL)                    │
│    └─ Feature API (gRPC for <1ms serving)           │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. BATCH LAYER (Offline Features)                   │
│    ├─ Kedro pipelines (scheduled computation)       │
│    ├─ QuestDB (historical storage)                  │
│    └─ Feature materialization jobs                  │
└───────────────────┬─────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. SERVING LAYER                                     │
│    ├─ Online: algo-worker → Feature API (gRPC)      │
│    ├─ Offline: training-pipeline → QuestDB (SQL)    │
│    └─ Point-in-time correctness guaranteed          │
└─────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Feature Registry (Definition Layer)

**Purpose**: Centralized, version-controlled repository of all feature definitions

**Schema** (YAML):

```yaml
# features/technical_indicators.yaml
features:
  - name: rsi_14
    version: v1.2.0
    description: "Relative Strength Index (14-period)"
    entity: symbol
    value_type: float64
    tags: [technical, momentum]

    online_computation:
      source: market_data_stream
      window: 14
      refresh_interval_ms: 1000

    offline_computation:
      source: questdb.ohlcv_1s
      sql: |
        SELECT
          timestamp,
          symbol,
          calc_rsi(close, 14) AS rsi_14
        FROM ohlcv_1s
        WHERE timestamp >= $start_time

    validation:
      min_value: 0.0
      max_value: 100.0
      null_policy: propagate

    dependencies:
      - close_price

  - name: atm_iv
    version: v2.0.0
    description: "At-the-money implied volatility"
    entity: underlying_symbol
    value_type: float64
    tags: [options, volatility]

    online_computation:
      source: option_chain_stream
      logic: |
        def compute_atm_iv(option_chain, spot_price):
          atm_strike = nearest_strike(spot_price)
          return option_chain[atm_strike].iv

    offline_computation:
      source: mongodb.option_chain_snapshots
      aggregation: |
        db.option_chain_snapshots.aggregate([
          { $match: { timestamp: { $gte: start_time } } },
          { $project: {
              timestamp: 1,
              underlying: 1,
              atm_iv: { $arrayElemAt: [
                "$strikes.iv", 
                { $indexOfArray: ["$strikes.strike", "$atm_strike"] }
              ]}
          }}
        ])
```

**Why YAML + Code Co-Location**:

- YAML: Metadata, dependencies, validation rules
- Python/TypeScript: Complex computation logic
- Version control: Git tags for feature versions
- CI/CD: Automated testing of feature changes

---

### 2. Streaming Computation Layer (Online Features)

**Purpose**: Real-time feature computation for low-latency inference (<100ms)

**Technology Stack**:

```python
# Faust streaming application (Python)
import faust
from typing import Dict

app = faust.App('feature-store', broker='kafka://localhost:9092')

class MarketTick(faust.Record):
    timestamp: int
    symbol: str
    price: float
    volume: float

class Features(faust.Record):
    timestamp: int
    symbol: str
    rsi_14: float
    ema_20: float
    atr_14: float

market_data_topic = app.topic('market_data', value_type=MarketTick)
features_topic = app.topic('features', value_type=Features)

# Windowed aggregation for RSI
@app.agent(market_data_topic)
async def compute_rsi(ticks):
    window = []

    async for tick in ticks:
        window.append(tick.price)
        if len(window) > 14:
            window.pop(0)

        if len(window) == 14:
            rsi = calculate_rsi(window)

            feature = Features(
                timestamp=tick.timestamp,
                symbol=tick.symbol,
                rsi_14=rsi,
                # ... other features
            )

            # Publish to features topic
            await features_topic.send(value=feature)

            # Cache in Redis for immediate serving
            await redis.set(
                f"features:{tick.symbol}:latest",
                feature.to_json(),
                ex=60  # 60s TTL
            )
```

**Integration with algo-worker**:

```typescript
// Feature serving API (gRPC for <1ms latency)
@Injectable()
export class FeatureStoreClient {
  private client: FeatureStoreServiceClient;

  async getOnlineFeatures(
    entity: string,
    featureNames: string[]
  ): Promise<Record<string, number>> {
    // gRPC call to feature store
    const response = await this.client.GetOnlineFeatures({
      entity,
      feature_names: featureNames,
    });

    return response.features;
  }

  // Fallback to Redis for cached features
  async getCachedFeatures(symbol: string): Promise<Features> {
    const cached = await this.redis.get(`features:${symbol}:latest`);
    return JSON.parse(cached);
  }
}

// Usage in prediction layer
const features = await this.featureStore.getOnlineFeatures("NIFTY50", [
  "rsi_14",
  "ema_20",
  "atm_iv",
  "pcr_volume",
]);

const prediction = await this.lightgbm.predict(features);
```

**Latency Target**: <1ms for cached features, <5ms for computed features

---

### 3. Batch Materialization Layer (Offline Features)

**Purpose**: Pre-compute historical features for training and backtesting

**Kedro Pipeline**:

```python
# src/training_pipeline/pipelines/materialize_features/pipeline.py
from kedro.pipeline import Pipeline, node

def create_pipeline(**kwargs) -> Pipeline:
    return Pipeline([
        node(
            func=fetch_raw_data,
            inputs="params:date_range",
            outputs="raw_market_data",
            name="fetch_raw_data",
        ),
        node(
            func=compute_technical_indicators,
            inputs="raw_market_data",
            outputs="technical_features",
            name="compute_technical_indicators",
        ),
        node(
            func=compute_option_features,
            inputs=["raw_market_data", "option_chain_data"],
            outputs="option_features",
            name="compute_option_features",
        ),
        node(
            func=join_features,
            inputs=["technical_features", "option_features"],
            outputs="feature_table",
            name="join_features",
        ),
        node(
            func=materialize_to_questdb,
            inputs="feature_table",
            outputs=None,
            name="materialize_to_questdb",
        ),
    ])
```

**Storage Schema** (QuestDB):

```sql
-- Feature materialization table
CREATE TABLE features_materialized (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  feature_version VARCHAR,

  -- Technical indicators
  rsi_14 DOUBLE,
  ema_20 DOUBLE,
  atr_14 DOUBLE,
  macd DOUBLE,

  -- Options features
  atm_iv DOUBLE,
  pcr_volume DOUBLE,
  vol_skew DOUBLE,

  -- Market state
  breadth_score DOUBLE,
  alignment_score DOUBLE,

  -- Metadata
  computation_timestamp TIMESTAMP,
  feature_set_hash VARCHAR
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Index for fast retrieval
CREATE INDEX idx_features_symbol_time
ON features_materialized(symbol, timestamp);
```

**Point-in-Time Correctness**:

```python
# Ensure no lookahead bias in feature serving
def get_features_at_time(symbol: str, timestamp: int) -> Features:
    """
    Get features as they would have appeared at timestamp
    (no future information leakage)
    """
    query = f"""
    SELECT * FROM features_materialized
    WHERE symbol = '{symbol}'
      AND timestamp <= {timestamp}
      AND computation_timestamp <= {timestamp}
    ORDER BY timestamp DESC
    LIMIT 1
    """

    return questdb.query(query)
```

---

### 4. Feature Serving Layer

#### **Online Serving (algo-worker)**

```typescript
// High-performance feature serving
@Injectable()
export class OnlineFeatureService {
  private grpcClient: FeatureStoreServiceClient;
  private redis: Redis;

  async getFeatures(
    symbol: string,
    featureNames: string[],
    timestamp?: number
  ): Promise<Float32Array> {
    // 1. Try hot cache (Redis)
    const cached = await this.redis.hget(
      `features:${symbol}:latest`,
      featureNames.join(",")
    );

    if (cached && this.isFresh(cached, 1000)) {
      return this.deserialize(cached);
    }

    // 2. Fetch from feature store gRPC
    const features = await this.grpcClient.GetOnlineFeatures({
      entity: symbol,
      feature_names: featureNames,
      as_of_timestamp: timestamp,
    });

    // 3. Cache for 1s
    await this.redis.hset(
      `features:${symbol}:latest`,
      featureNames.join(","),
      this.serialize(features),
      "EX",
      1
    );

    return this.toFloat32Array(features);
  }
}
```

#### **Offline Serving (training-pipeline)**

```python
# Kedro data catalog integration
# conf/base/catalog.yml
training_features:
  type: pandas.SQLQueryDataSet
  credentials: questdb
  sql: |
    SELECT * FROM features_materialized
    WHERE symbol = '${params:symbol}'
      AND timestamp >= '${params:train_start}'
      AND timestamp <= '${params:train_end}'
    ORDER BY timestamp ASC
  load_args:
    index_col: timestamp
```

---

## Feature Versioning & Lineage

### Version Control Strategy

```python
# features/registry.py
class FeatureVersion:
    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version  # Semantic versioning: v1.2.3

    def compute(self, data):
        # Load specific version of feature logic
        module = importlib.import_module(f'features.{self.name}.{self.version}')
        return module.compute(data)

# Training pipeline locks feature versions
feature_manifest = {
    'model': 'lightgbm_v3.1.0',
    'features': {
        'rsi_14': 'v1.2.0',
        'atm_iv': 'v2.0.0',
        'breadth_score': 'v1.0.1',
    },
    'trained_at': '2026-01-13T10:30:00Z',
}

# Inference uses same versions
features = feature_store.get_features(
    'NIFTY50',
    feature_manifest['features']
)
```

### Lineage Tracking

```yaml
# Feature lineage graph
features:
  rsi_14:
    version: v1.2.0
    dependencies:
      - close_price (raw)
    transformations:
      - window: 14
      - algorithm: wilder_smoothing

  breadth_score:
    version: v1.0.1
    dependencies:
      - rsi_14: v1.2.0
      - ema_20: v1.1.0
      - constituents_data (raw)
    transformations:
      - aggregation: weighted_average
      - normalization: z_score
```

---

## Implementation Roadmap

### Phase 1: Foundation (High ROI)

**Goal**: Centralize existing feature definitions, no behavioral changes

1. **Extract Feature Registry**
   - ✅ Create `features/` directory with YAML definitions
   - ✅ Migrate FeatureCacheService logic to versioned modules
   - ✅ Implement feature versioning (Git tags)

2. **Build Feature API**
   - ✅ gRPC service for online feature serving
   - ✅ REST API for feature discovery
   - ✅ Redis caching layer

3. **Integrate with Training Pipeline**
   - ✅ Kedro catalog reads from feature registry
   - ✅ Point-in-time correctness for backtests
   - ✅ Feature materialization jobs

**Timeline**: 2-3 weeks  
**ROI**: Eliminate training/serving skew, 50% faster model development

---

### Phase 2: Streaming Computation (High ROI)

**Goal**: Real-time feature computation with Kafka/Faust

1. **Deploy Streaming Infrastructure**
   - ✅ Kafka cluster setup
   - ✅ Faust streaming app deployment
   - ✅ Schema registry for feature types

2. **Migrate Feature Computation**
   - ✅ Port technical indicators to Faust agents
   - ✅ Port Market State Encoder aggregations
   - ✅ Windowed computations (rolling averages)

3. **Performance Optimization**
   - ✅ Benchmark streaming latency (<5ms target)
   - ✅ Implement feature caching strategies
   - ✅ Monitor data freshness

**Timeline**: 3-4 weeks  
**ROI**: <5ms feature serving latency, horizontal scalability

---

### Phase 3: Advanced Features (Optional)

**Goal**: ML-powered features, automated validation

1. **Feature Monitoring**
   - 🔬 Drift detection (feature distribution changes)
   - 🔬 Data quality checks (null rates, outliers)
   - 🔬 Correlation tracking (feature redundancy)

2. **Automated Feature Engineering**
   - 🔬 AutoFE (automated feature generation)
   - 🔬 Feature selection pipelines
   - 🔬 Synthetic feature creation

3. **Advanced Storage**
   - 🔬 Feature embeddings (vector database)
   - 🔬 Graph-based feature relationships
   - 🔬 Time-travel queries (historical feature reconstruction)

**Timeline**: 4-6 weeks  
**ROI**: Medium (research-focused)

---

## Technology Stack

| Component              | Technology              | Rationale                            |
| ---------------------- | ----------------------- | ------------------------------------ |
| **Feature Registry**   | YAML + Git              | Version control, human-readable      |
| **Online Computation** | Faust (Kafka Streams)   | Python-native, fast streaming        |
| **Online Storage**     | Redis                   | <1ms latency, in-memory              |
| **Offline Storage**    | QuestDB                 | 22x faster than ClickHouse for OHLCV |
| **Serving API**        | gRPC (protocol buffers) | <1ms RPC latency                     |
| **Orchestration**      | Kedro                   | ML pipeline framework                |
| **Monitoring**         | Prometheus + Grafana    | Standard observability               |
| **Lineage Tracking**   | MLflow (experiment log) | Model-feature version relationships  |

---

## Comparison: Before vs After

| Aspect                  | Before (Current)               | After (Feature Store)        |
| ----------------------- | ------------------------------ | ---------------------------- |
| **Feature Definitions** | Scattered across services      | Centralized registry         |
| **Consistency**         | Training ≠ Serving (skew risk) | Guaranteed consistency       |
| **Versioning**          | No versioning                  | Semantic versioning (v1.2.3) |
| **Reproducibility**     | Hard (feature code changes)    | Easy (version-locked)        |
| **Development Speed**   | Slow (reimplementing features) | Fast (reuse existing)        |
| **Auditability**        | Minimal (logs only)            | Full lineage tracking        |
| **Latency**             | ~20ms (inline computation)     | <5ms (cached + streaming)    |
| **Discovery**           | Tribal knowledge               | Searchable registry          |

---

## References & Industry Practices

**Established Feature Stores**:

- Feast (open-source, backed by Tecton)
- Hopsworks (unified batch + streaming)
- AWS SageMaker Feature Store
- Google Vertex AI Feature Store

**Our Approach**: Lightweight, custom-built for trading-specific needs

- Lower latency than general-purpose stores (<1ms vs 5-10ms)
- Point-in-time correctness for backtesting (critical for finance)
- Direct QuestDB integration (no data duplication)

**Key Research**:

- "Feature Stores for ML" - Google, 2020
- "Eliminating Training-Serving Skew" - Uber, 2019
- "Real-Time Feature Computation at Scale" - Netflix, 2021

---

## Action Items

**Immediate (High ROI)**:

1. ✅ Create feature registry schema (YAML)
2. ✅ Extract top 20 features to registry
3. ✅ Build gRPC feature serving API
4. ✅ Integrate with algo-worker prediction layer
5. ✅ Benchmark latency improvements

**Short-Term (2-4 weeks)**:

1. ✅ Deploy Kafka + Faust streaming layer
2. ✅ Migrate FeatureCacheService to streaming
3. ✅ Implement point-in-time correctness for training
4. ✅ Set up feature materialization jobs

**Long-Term (R&D)**:

1. 🔬 Automated feature engineering (AutoFE)
2. 🔬 Feature drift monitoring
3. 🔬 Graph-based feature relationships

---

**Last Updated**: January 13, 2026  
**Status**: High ROI Enhancement (Phase 1 recommended)  
**Owner**: Architect + QuantResearcher
