# Algo Worker - Production Algorithmic Trading System

## Complete Architecture Redesign (2025)

---

## 🏗️ **TURBOREPO STRUCTURE**

```
investment-trading-portfolio/
├── apps/
│   ├── algo-worker/              # 🎯 Core Trading Engine (NestJS)
│   ├── training-pipeline/        # 🧠 NEW: Python ML Training (Kedro/MLflow)
│   ├── data-processor/           # 📊 NEW: Data ETL & Normalization
│   ├── market-feeder/            # 📡 NEW: Real-time Data Ingestion
│   ├── api/                      # 🔌 Backend API (NestJS + tRPC)
│   └── web/                      # 🌐 Next.js 16 Dashboard
│
├── packages/
│   ├── schema/                   # 📋 Zod Schemas (Single Source of Truth)
│   ├── database/                 # 💾 Multi-DB Package (MongoDB + QuestDB + Redis)
│   ├── market-sdk/               # 📈 Market Data SDK (Upstox + Yahoo + Binance)
│   ├── trpc/              # 🔗 Shared tRPC Routes
│   ├── ai-models/                # 🤖 NEW: ONNX Model Registry
│   └── common-utils/             # 🛠️ Shared Utilities
│
└── infrastructure/
    ├── docker/                   # 🐳 Docker Compose for all services
    ├── kubernetes/               # ☸️ K8s configs for production
    └── monitoring/               # 📊 Grafana + Prometheus configs
```

---

## 🧠 **1. AI/ML ARCHITECTURE (State-of-the-Art 2025)**

### **Model Stack: Hybrid Ensemble + RL**

#### **PHASE 1: Feature Extraction Models**

```
┌─────────────────────────────────────────────────────────────┐
│  FEATURE EXTRACTION LAYER (Time-Series Specialists)         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   TimesNet   │  │   WFTNet     │  │  Transformer │     │
│  │  (Inception) │  │  (Wavelet)   │  │ (Attention)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                          │                                 │
│                   [Feature Vector]                         │
│                   128-256 dimensions                       │
└─────────────────────────────────────────────────────────────┘
```

**TimesNet** (ICML 2023): Multi-scale temporal patterns
**WFTNet** (2024): Wavelet-based feature extraction
**Transformer**: Self-attention for long-range dependencies

#### **PHASE 2: Prediction Models (Ensemble)**

```
┌─────────────────────────────────────────────────────────────┐
│  L0 BASE LEARNERS (Parallel Ensemble)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   XGBoost    │  │ CNN-LSTM     │  │    GINN      │     │
│  │  Classifier  │  │   Hybrid     │  │ GARCH+LSTM   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         │                 │                 │              │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐     │
│  │     SVM      │  │ Transformer  │  │    LightGBM  │     │
│  │   (RBF)      │  │   (Galformer)│  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                          │                                 │
│                  [6 Probability Outputs]                   │
└─────────────────────────────────────────────────────────────┘
```

#### **PHASE 3: Meta-Learning + RL Integration**

```
┌─────────────────────────────────────────────────────────────┐
│  L1 META-LEARNER + RL POLICY                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────┐         │
│  │  Self-Rewarding Network (SRDRL)                │         │
│  │  - Learns optimal reward function dynamically  │         │
│  │  - Uses Sharpe/Sortino as expert labels        │         │
│  └────────────────┬───────────────────────────────┘         │
│                   │                                         │
│  ┌────────────────┴───────────────────────────────┐         │
│  │  TD3 / SAC Agent (Continuous Actions)          │         │
│  │  - Portfolio allocation                         │         │
│  │  - Position sizing                              │         │
│  │  - Dynamic hedging                              │         │
│  └────────────────┬───────────────────────────────┘         │
│                   │                                         │
│            [Trading Signal]                                 │
│     {action, confidence, metadata}                          │
└─────────────────────────────────────────────────────────────┘
```

### **Target Variables**

**Primary**: 4-hour ATM IV change (Binary: UP/DOWN)
**Secondary**: Sharpe-optimized portfolio weights (Continuous)

### **Training Architecture (apps/training-pipeline)**

```python
# Architecture: Kedro + MLflow + Optuna
training-pipeline/
├── conf/
│   ├── base/
│   │   ├── catalog.yml          # Data catalog
│   │   ├── parameters.yml       # Hyperparameters
│   │   └── logging.yml
│   └── local/
│       └── credentials.yml      # API keys, DB credentials
│
├── src/training_pipeline/
│   ├── pipelines/
│   │   ├── data_ingestion/      # Fetch from TimescaleDB
│   │   ├── feature_engineering/ # Technical indicators + Greeks
│   │   ├── train_timesnet/      # Feature extraction training
│   │   ├── train_ensemble/      # L0 models
│   │   ├── train_meta_learner/  # L1 stacking
│   │   ├── train_rl_agent/      # RL policy training
│   │   └── export_onnx/         # Model export
│   │
│   ├── models/
│   │   ├── timesnet.py          # TimesNet implementation
│   │   ├── wftnet.py            # Wavelet Feature Transform
│   │   ├── transformer.py       # Custom Transformer
│   │   ├── ensemble.py          # Stacking ensemble
│   │   └── rl_agent.py          # TD3/SAC agent
│   │
│   └── experiments/
│       └── mlflow_tracking.py   # Experiment tracking
│
├── notebooks/                   # Jupyter notebooks for EDA
├── models/                      # Saved model checkpoints
└── onnx/                        # Exported ONNX files
```

**Key Libraries**:

- **Kedro**: Pipeline orchestration
- **MLflow**: Experiment tracking, model registry
- **Optuna**: Hyperparameter optimization
- **PyTorch 2.5+**: Model training
- **ONNX Runtime**: Export & validation

### **ONNX Export Pipeline**

```python
# Export script with GPU optimization
import torch
import onnxruntime as ort

def export_to_onnx(model, export_path):
    """Export PyTorch model to ONNX with optimization"""

    # Create dummy input
    dummy_input = torch.randn(1, 60, 13)  # (batch, seq_len, features)

    # Export with Dynamo (PyTorch 2.5+)
    torch.onnx.export(
        model,
        dummy_input,
        export_path,
        dynamo=True,                    # Use torch.export (recommended)
        opset_version=17,               # Latest stable opset
        do_constant_folding=True,       # Optimize constants
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={                  # Support variable batch sizes
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        optimize=True,                  # Enable ONNX optimizations
        verify=True                     # Validate with ONNX Runtime
    )

    # Verify GPU support
    providers = ort.get_available_providers()
    assert 'CUDAExecutionProvider' in providers, "GPU not available"

    print(f"✅ Model exported to {export_path}")
    print(f"📊 Available providers: {providers}")
```

---

## 💾 **2. DATABASE ARCHITECTURE**

### **Multi-Database Strategy**

```
┌───────────────────────────────────────────────────────────┐
│  DATABASE LAYER (packages/database)                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  QuestDB (Time-Series Database)             │         │
│  │  ─────────────────────────────────          │         │
│  │  Purpose: High-Performance Time-Series Data │         │
│  │  - Tick data (price, volume, Greeks)        │         │
│  │  - OHLCV candles (1m, 5m, 15m, 1h, 1d)     │         │
│  │  - Order book snapshots                     │         │
│  │  - Feature snapshots (for model training)   │         │
│  │                                              │         │
│  │  Benefits:                                   │         │
│  │  ✓ 10-20x faster ingestion vs TimescaleDB   │         │
│  │  ✓ PostgreSQL-compatible SQL                │         │
│  │  ✓ Built-in HTTP API (no driver needed)     │         │
│  │  ✓ Lightweight (no PostgreSQL dependency)   │         │
│  │  ✓ Optimized for append-only workloads      │         │
│  │  ✓ Auto-partitioning by time                │         │
│  │  ✓ Easy Windows development setup           │         │
│  └─────────────────────────────────────────────┘         │
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  MongoDB                                     │         │
│  │  ────────                                    │         │
│  │  Purpose: Application Data                  │         │
│  │  - User accounts & auth                     │         │
│  │  - Trading strategies                       │         │
│  │  - Orders & positions                       │         │
│  │  - Performance metrics                      │         │
│  │  - RL agent states                          │         │
│  │                                              │         │
│  │  Benefits:                                   │         │
│  │  ✓ Flexible schema (rapid iteration)        │         │
│  │  ✓ Document model (nested data)             │         │
│  │  ✓ Change streams (real-time updates)       │         │
│  │  ✓ @nestjs/mongoose integration             │         │
│  └─────────────────────────────────────────────┘         │
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  Redis                                       │         │
│  │  ─────                                       │         │
│  │  Purpose: Real-Time State & Caching         │         │
│  │  - WebSocket connection state               │         │
│  │  - Subscription routing (instrument→socket) │         │
│  │  - Pub/Sub for market data distribution     │         │
│  │  - Session management                       │         │
│  │  - Rate limiting                             │         │
│  │                                              │         │
│  │  Benefits:                                   │         │
│  │  ✓ Sub-millisecond latency                  │         │
│  │  ✓ Pub/Sub for microservices                │         │
│  │  ✓ Atomic operations (locks, queues)        │         │
│  │  ✓ Persistence (AOF + RDB)                  │         │
│  └─────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### **Database Module Implementation**

```typescript
// packages/database/src/index.ts
export * from './timescale';
export * from './mongodb';
export * from './redis';

// Multi-database module
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        // TimescaleDB (TypeORM)
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            url: config.get('TIMESCALE_URL'),
            entities: [TickData, Candle, OrderBookSnapshot, FeatureSnapshot],
            synchronize: false, // Use migrations
          }),
          inject: [ConfigService],
        }),

        // MongoDB (Mongoose)
        MongooseModule.forRootAsync({
          connectionName: 'trading',
          useFactory: (config: ConfigService) => ({
            uri: config.get('MONGODB_URI') + '/trading',
          }),
          inject: [ConfigService],
        }),

        // Redis
        RedisModule.forRoot(),
      ],
      exports: [TypeOrmModule, MongooseModule, RedisModule],
    };
  }
}
```

### **TimescaleDB Schema**

```sql
-- Create hypertable for tick data
CREATE TABLE tick_data (
    time TIMESTAMPTZ NOT NULL,
    instrument_key VARCHAR(50) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    volume BIGINT NOT NULL,
    bid_price DECIMAL(18, 8),
    ask_price DECIMAL(18, 8),
    bid_size BIGINT,
    ask_size BIGINT,
    -- Greeks (for options)
    delta DECIMAL(10, 6),
    gamma DECIMAL(10, 6),
    vega DECIMAL(10, 6),
    theta DECIMAL(10, 6),
    iv DECIMAL(10, 6)
);

-- Convert to hypertable (auto-partitioning)
SELECT create_hypertable('tick_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- Create index for fast queries
CREATE INDEX idx_tick_instrument_time ON tick_data (instrument_key, time DESC);

-- Continuous aggregate for 5-minute candles
CREATE MATERIALIZED VIEW candles_5m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    instrument_key,
    first(price, time) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, time) AS close,
    sum(volume) AS volume
FROM tick_data
GROUP BY bucket, instrument_key;

-- Refresh policy (auto-update every 1 minute)
SELECT add_continuous_aggregate_policy('candles_5m',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');

-- Retention policy (keep tick data for 90 days)
SELECT add_retention_policy('tick_data', INTERVAL '90 days');
```

---

## 📡 **3. REAL-TIME DATA ARCHITECTURE**

### **apps/market-feeder (Dedicated Microservice)**

```
┌───────────────────────────────────────────────────────────┐
│  MARKET FEEDER (Standalone NestJS App)                    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  WebSocket Multiplexer Service              │         │
│  │  ─────────────────────────────              │         │
│  │  Handles Upstox connection limits:          │         │
│  │  - Max 2-5 sockets (Basic/Plus)             │         │
│  │  - 3,000-5,000 keys per socket (by mode)    │         │
│  │                                              │         │
│  │  Algorithm: Priority-Based Bin Packing      │         │
│  │  ────────────────────────────────           │         │
│  │  1. Assign priority to each instrument      │         │
│  │     • CRITICAL: Nifty 50, Bank Nifty        │         │
│  │     • HIGH: ATM options                     │         │
│  │     • MEDIUM: Near OTM                      │         │
│  │     • LOW: Deep OTM                         │         │
│  │                                              │         │
│  │  2. First-Fit allocation to sockets         │         │
│  │  3. Evict LOW priority if capacity reached  │         │
│  │  4. Store state in Redis                    │         │
│  └─────────────────────────────────────────────┘         │
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  Data Flow                                   │         │
│  │  ─────────                                   │         │
│  │                                              │         │
│  │  Upstox WebSocket                            │         │
│  │       ↓                                      │         │
│  │  Protobuf Decoder                            │         │
│  │       ↓                                      │         │
│  │  Data Normalization                          │         │
│  │       ↓                                      │         │
│  │  ┌─────────────┬─────────────────────┐      │         │
│  │  │             │                     │      │         │
│  │  ↓             ↓                     ↓      │         │
│  │  Redis PubSub  TimescaleDB     MongoDB      │         │
│  │  (real-time)   (historical)    (metadata)   │         │
│  └─────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### **WebSocket Multiplexer Implementation**

```typescript
// apps/market-feeder/src/websocket/multiplexer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@repo/database';

enum Priority {
  CRITICAL = 1, // Indices (Nifty 50, Bank Nifty)
  HIGH = 2, // ATM options
  MEDIUM = 3, // Near OTM (±5 strikes)
  LOW = 4, // Deep OTM (>±5 strikes)
}

interface SocketState {
  id: string;
  url: string;
  load: number; // Current subscriptions
  capacity: number; // Max based on mode (3000-5000)
  keys: Set<string>;
  connection: WebSocket;
}

@Injectable()
export class MultiplexerService {
  private sockets: Map<string, SocketState> = new Map();
  private readonly MAX_SOCKETS = 5; // Upstox Plus limit
  private readonly logger = new Logger(MultiplexerService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly upstoxAuth: UpstoxAuthService,
  ) {}

  /**
   * Subscribe to instrument with intelligent allocation
   */
  async subscribe(
    instrumentKey: string,
    priority: Priority,
    mode: 'ltpc' | 'full' | 'option_greeks' = 'option_greeks',
  ): Promise<void> {
    // Check if already subscribed
    const existingSocket =
      await this.redis.getSocketForInstrument(instrumentKey);
    if (existingSocket) {
      this.logger.debug(
        `${instrumentKey} already subscribed on ${existingSocket}`,
      );
      return;
    }

    // Get capacity based on mode
    const capacity = this.getModeCapacity(mode);

    // Try to fit in existing socket (First-Fit)
    for (const [socketId, socket] of this.sockets) {
      if (socket.load < socket.capacity) {
        await this.addToSocket(socketId, instrumentKey, mode);
        await this.redis.setSocketForInstrument(instrumentKey, socketId);
        this.logger.log(
          `✅ ${instrumentKey} → ${socketId} (${socket.load}/${socket.capacity})`,
        );
        return;
      }
    }

    // Create new socket if under limit
    if (this.sockets.size < this.MAX_SOCKETS) {
      const newSocket = await this.createSocket(mode, capacity);
      await this.addToSocket(newSocket.id, instrumentKey, mode);
      await this.redis.setSocketForInstrument(instrumentKey, newSocket.id);
      this.logger.log(`✅ ${instrumentKey} → NEW ${newSocket.id}`);
      return;
    }

    // Eviction: Find lowest priority subscription
    const evictionCandidate = await this.findEvictionCandidate();
    if (evictionCandidate && evictionCandidate.priority > priority) {
      await this.evict(evictionCandidate.instrumentKey);
      await this.subscribe(instrumentKey, priority, mode);
      this.logger.warn(
        `⚠️ Evicted ${evictionCandidate.instrumentKey} for ${instrumentKey}`,
      );
    } else {
      this.logger.error(
        `❌ Cannot subscribe ${instrumentKey}: capacity reached`,
      );
      throw new Error('Subscription capacity exceeded');
    }
  }

  private getModeCapacity(mode: string): number {
    const capacities = {
      ltpc: 5000,
      full: 2000,
      option_greeks: 3000,
    };
    return capacities[mode] || 3000;
  }

  private async createSocket(
    mode: string,
    capacity: number,
  ): Promise<SocketState> {
    // Get one-time authorized URL from Upstox
    const token = await this.upstoxAuth.getAccessToken();
    const response = await fetch(
      'https://api.upstox.com/v3/feed/market-data-feed/authorize',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const { data } = await response.json();
    const url = data.authorizedRedirectUri;

    // Create WebSocket connection
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer'; // Required for Protobuf

    const socketId = `ws-${Date.now()}`;
    const socket: SocketState = {
      id: socketId,
      url,
      load: 0,
      capacity,
      keys: new Set(),
      connection: ws,
    };

    // Set up event handlers
    ws.on('open', () => this.logger.log(`Socket ${socketId} connected`));
    ws.on('message', (data) => this.handleMessage(socketId, data));
    ws.on('error', (err) => this.handleError(socketId, err));
    ws.on('close', () => this.handleClose(socketId));

    this.sockets.set(socketId, socket);
    await this.redis.sadd('upstox:sockets', socketId);

    return socket;
  }

  private async handleMessage(socketId: string, data: Buffer): Promise<void> {
    // Decode Protobuf
    const decoded = this.protoDecoder.decode(data);
    if (!decoded) return;

    // Publish to Redis for distribution
    await this.redis.publish('market:feed', JSON.stringify(decoded));

    // Save to TimescaleDB (async, non-blocking)
    this.saveToTimescale(decoded).catch((err) =>
      this.logger.error('TimescaleDB save failed', err),
    );
  }
}
```

---

## 🔄 **4. DATA PROCESSING PIPELINE**

### **apps/data-processor (ETL & Normalization)**

```
┌───────────────────────────────────────────────────────────┐
│  DATA PROCESSOR (NestJS Microservice)                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────┐         │
│  │  Scheduled Jobs (Bull Queue)                │         │
│  │  ────────────────────────                   │         │
│  │                                              │         │
│  │  1. Historical Data Fetch (Daily 6 PM)      │         │
│  │     → Yahoo Finance / Upstox Historical API │         │
│  │     → Store in TimescaleDB                  │         │
│  │                                              │         │
│  │  2. Feature Calculation (Every 5 min)       │         │
│  │     → Read from TimescaleDB                 │         │
│  │     → Calculate technical indicators        │         │
│  │     → Store feature snapshots               │         │
│  │                                              │         │
│  │  3. Training Data Export (Weekly)           │         │
│  │     → Query TimescaleDB (labeled data)      │         │
│  │     → Export to Parquet for training        │         │
│  │     → Trigger training-pipeline              │         │
│  │                                              │         │
│  │  4. Data Quality Checks (Hourly)            │         │
│  │     → Validate completeness                 │         │
│  │     → Fill missing values (forward-fill)    │         │
│  │     → Flag anomalies (>3σ)                  │         │
│  └─────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### **Feature Engineering Service**

```typescript
// apps/data-processor/src/features/technical-indicators.service.ts
import { Injectable } from '@nestjs/common';
import * as talib from 'talib';

@Injectable()
export class TechnicalIndicatorsService {
  /**
   * Calculate all technical indicators for training
   */
  async calculateFeatures(candles: Candle[]): Promise<FeatureSnapshot> {
    const close = candles.map((c) => c.close);
    const high = candles.map((c) => c.high);
    const low = candles.map((c) => c.low);
    const volume = candles.map((c) => c.volume);

    return {
      // Realized Volatility (multiple windows)
      realizedVol5d: this.realizedVolatility(close, 5),
      realizedVol10d: this.realizedVolatility(close, 10),
      realizedVol20d: this.realizedVolatility(close, 20),

      // Momentum
      rsi14: talib.RSI(close, { optInTimePeriod: 14 }),

      // MACD
      macd: talib.MACD(close, {
        optInFastPeriod: 12,
        optInSlowPeriod: 26,
        optInSignalPeriod: 9,
      }),

      // Moving Averages
      sma20: talib.SMA(close, { optInTimePeriod: 20 }),
      sma50: talib.SMA(close, { optInTimePeriod: 50 }),
      ema20: talib.EMA(close, { optInTimePeriod: 20 }),

      // Volatility
      bbands: talib.BBANDS(close, {
        optInTimePeriod: 20,
        optInNbDevUp: 2,
        optInNbDevDn: 2,
      }),

      // Volume
      obv: talib.OBV(close, volume),
      adx: talib.ADX(high, low, close, { optInTimePeriod: 14 }),

      // Sentiment (requires market-wide data)
      indiaVix: await this.getVIXLevel(),
      pcrVolume: await this.getPCR('volume'),
      pcrOI: await this.getPCR('oi'),
      maxPain: await this.calculateMaxPain(),

      // Options (Greeks from Upstox)
      atmIV: await this.getATMImpliedVolatility(),
      volSkew: await this.calculateVolatilitySkew(),
      termStructure: await this.calculateTermStructure(),
    };
  }

  private realizedVolatility(prices: number[], window: number): number {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const recent = returns.slice(-window);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance =
      recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;

    return Math.sqrt(variance * 252); // Annualized
  }
}
```

---

## 🎯 **5. ALGO-WORKER ARCHITECTURE**

### **Inference Pipeline**

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.service.ts
import * as ort from 'onnxruntime-node';

@Injectable()
export class SignalEngineService {
  private sessions: Map<string, ort.InferenceSession> = new Map();

  async onModuleInit() {
    // Load ONNX models with GPU
    const provider = 'CUDAExecutionProvider';

    this.sessions.set(
      'timesnet',
      await ort.InferenceSession.create('models/timesnet.onnx', {
        executionProviders: [provider, 'CPUExecutionProvider'],
      }),
    );

    this.sessions.set(
      'xgboost',
      await ort.InferenceSession.create('models/xgboost.onnx', {
        executionProviders: [provider, 'CPUExecutionProvider'],
      }),
    );

    // ... load other models
  }

  async generateSignal(features: FeatureVector): Promise<TradingSignal> {
    const startTime = Date.now();

    // 1. Feature extraction
    const extractedFeatures = await this.runFeatureExtractor(features);

    // 2. Ensemble predictions
    const predictions = await Promise.all([
      this.runModel('xgboost', extractedFeatures),
      this.runModel('cnn_lstm', extractedFeatures),
      this.runModel('ginn', extractedFeatures),
      this.runModel('svm', extractedFeatures),
      this.runModel('transformer', extractedFeatures),
      this.runModel('lightgbm', extractedFeatures),
    ]);

    // 3. Meta-learner (stacking)
    const metaInput = new Float32Array(predictions);
    const metaOutput = await this.runModel('meta_learner', metaInput);

    // 4. RL policy (if enabled)
    let action = null;
    if (this.config.useRL) {
      action = await this.runRLAgent(metaOutput, this.getMarketState());
    }

    const latency = Date.now() - startTime;

    const signal: TradingSignal = {
      prediction: metaOutput[0] > 0.5 ? 'VOL_UP' : 'VOL_DOWN',
      confidence: Math.abs(metaOutput[0] - 0.5) * 2,
      probability: metaOutput[0],
      modelContributions: {
        xgboost: predictions[0],
        cnnLstm: predictions[1],
        ginn: predictions[2],
        svm: predictions[3],
        transformer: predictions[4],
        lightgbm: predictions[5],
      },
      rlAction: action,
      metadata: {
        latencyMs: latency,
        timestamp: new Date(),
      },
    };

    // Save to MongoDB
    await this.signalRepo.save(signal);

    return signal;
  }

  private async runModel(
    modelName: string,
    input: Float32Array,
  ): Promise<number> {
    const session = this.sessions.get(modelName);
    const tensor = new ort.Tensor('float32', input, [1, input.length]);
    const output = await session.run({ input: tensor });
    return output.output.data[0] as number;
  }
}
```

---

## 📊 **6. MONITORING & OBSERVABILITY**

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'

services:
  # Databases
  timescaledb:
    image: timescale/timescaledb-ha:pg16
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - timescale_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:7
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - '3000:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards

  # Apps
  market-feeder:
    build: ./apps/market-feeder
    environment:
      REDIS_URL: redis://redis:6379
      TIMESCALE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@timescaledb:5432/trading
    depends_on:
      - redis
      - timescaledb

  data-processor:
    build: ./apps/data-processor
    environment:
      TIMESCALE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@timescaledb:5432/trading
      MONGODB_URI: mongodb://mongodb:27017
    depends_on:
      - timescaledb
      - mongodb

  algo-worker:
    build: ./apps/algo-worker
    environment:
      MONGODB_URI: mongodb://mongodb:27017
      REDIS_URL: redis://redis:6379
    volumes:
      - ./models:/app/models # ONNX models
    depends_on:
      - mongodb
      - redis
```

---

## 🎓 **7. DEVELOPMENT WORKFLOW**

```bash
# 1. Data Collection (Run daily)
cd apps/data-processor
npm run job:fetch-historical

# 2. Feature Engineering (Continuous)
npm run job:calculate-features

# 3. Export Training Data (Weekly)
npm run job:export-training-data

# 4. Train Models (Execute in training-pipeline)
cd apps/training-pipeline
kedro run --pipeline train_all

# 5. Export to ONNX
kedro run --pipeline export_onnx

# 6. Deploy Models (Copy to algo-worker)
cp onnx/*.onnx ../algo-worker/models/

# 7. Test Inference
cd ../algo-worker
npm run test:inference

# 8. Start Trading
npm run start:prod
```

---

## 📈 **PERFORMANCE TARGETS**

| Metric               | Target        | Current (Est.) |
| -------------------- | ------------- | -------------- |
| Signal Latency (GPU) | < 50ms        | 30-40ms        |
| Pipeline E2E         | < 2s          | 1.5s           |
| Sharpe Ratio         | > 1.5         | TBD (backtest) |
| Max Drawdown         | < 20%         | TBD            |
| Data Ingestion       | 10K ticks/sec | 5K ticks/sec   |
| Model Update Freq    | Weekly        | N/A            |

---

## 🚀 **NEXT STEPS (Priority Order)**

1. ✅ **Implement TimescaleDB integration** (Week 1)
2. ✅ **Build market-feeder with WebSocket multiplexer** (Week 1-2)
3. ✅ **Set up data-processor with Bull queues** (Week 2)
4. ✅ **Implement feature engineering pipeline** (Week 2-3)
5. ⏳ **Build training-pipeline with Kedro** (Week 3-4)
6. ⏳ **Train baseline models (XGBoost, LSTM)** (Week 4)
7. ⏳ **Implement Transformer + ensemble** (Week 5-6)
8. ⏳ **Add RL agent (TD3/SAC)** (Week 6-7)
9. ⏳ **Export to ONNX and integrate** (Week 7)
10. ⏳ **Backtest with walk-forward validation** (Week 8)

---

## 🔗 **REFERENCES**

**Research Papers**:

- Self-Rewarding Deep RL (SRDRL) - Mathematics 2024
- LLM + RL for Trading - ICLR 2025 submission
- Transformer Time-Series - Multiple 2024 papers
- TD3/SAC for Portfolio Management - MDPI 2025

**Technologies**:

- TimescaleDB vs InfluxDB comparison
- ONNX Runtime GPU optimization
- WebSocket multiplexing patterns
- NestJS microservices architecture
