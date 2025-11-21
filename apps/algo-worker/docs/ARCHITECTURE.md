# Algo Worker - 4-Engine Architecture Implementation

## Overview

The algo-worker application has been structured following a modular 4-engine architecture as defined in the copilot instructions. Each engine is decoupled and focused on specific responsibilities in the algorithmic trading pipeline.

## Architecture

```
apps/algo-worker/src/engines/
├── data/              # DataEngine - Market data & features
├── signal/            # SignalEngine - ML inference & signals
├── policy/            # PolicyEngine - Strategy & risk management
└── execution/         # ExecutionEngine - Order execution & positions
```

## Engine 1: DataEngine

**Location**: `src/engines/data/`

**Responsibilities**:

- Real-time market data ingestion via @repo/market-sdk
- Feature engineering in TypeScript
- MongoDB time-series feature storage
- CSV export for Python model training

**Services**:

- `DataCollectionService`: Fetches market data (historical, option chain, VIX, PCR)
- `FeatureEngineeringService`: Calculates technical indicators (RSI, MACD, realized vol)
- `FeatureStoreService`: Manages MongoDB time-series collections
- `TrainingDataService`: Exports labeled CSV data for Python training

**Key Features**:

- Realized Volatility (5d, 10d, 20d rolling windows)
- RSI (14-period)
- MACD (12, 26, 9)
- Moving Average Crossovers (EMA, SMA)
- Market Sentiment (India VIX, PCR, Max Pain)
- Option Metrics (ATM IV, Vol Skew, Term Structure)

---

## Engine 2: SignalEngine

**Location**: `src/engines/signal/`

**Responsibilities**:

- Load ONNX models (onnxruntime-node)
- Run ML inference with GPU acceleration (CUDA)
- Generate trading signals via ensemble stacking
- Persist signals to MongoDB

**Services**:

- `ModelLoaderService`: Loads and manages ONNX models (XGBoost, CNN-LSTM, GINN, SVM, Stacking)
- `SignalEngineService`: Orchestrates ensemble inference and signal generation

**ML Pipeline**:

1. **L0 Models** (Base Learners):
   - XGBoost Classifier
   - CNN-LSTM Hybrid
   - GARCH-Informed Neural Network (GINN)
   - Support Vector Machine (SVM)

2. **L1 Model** (Meta-Learner):
   - Logistic Regression Stacker
   - Combines L0 predictions → final signal

**Signal Output**:

```typescript
{
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL',
  confidence: 0.0-1.0,
  probability: 0.0-1.0,
  modelContributions: {
    xgboost: 0.72,
    cnnLstm: 0.68,
    ginn: 0.65,
    svm: 0.75
  }
}
```

---

## Engine 3: PolicyEngine

**Location**: `src/engines/policy/`

**Responsibilities**:

- Select appropriate options strategy based on signal
- Validate risk limits before opening positions
- Calculate position sizing using Kelly Criterion
- Portfolio risk management (Greeks, drawdown, leverage)

**Services**:

- `StrategySelectionService`: Maps signals to strategies (LONG_STRADDLE, IRON_CONDOR, etc.)
- `RiskManagementService`: Validates risk limits (daily loss, drawdown, Greeks)
- `PositionSizingService`: Calculates optimal lot sizes using Kelly Criterion

**Strategy Matrix**:

```
VOL_UP:
  - High Confidence (>0.7): LONG_STRADDLE
  - Medium Confidence (0.55-0.7): LONG_STRANGLE

VOL_DOWN:
  - High Confidence (>0.7): IRON_CONDOR
  - Medium Confidence (0.55-0.7): SHORT_STRANGLE

NEUTRAL:
  - Bullish Bias: BULL_PUT_SPREAD
  - Bearish Bias: BEAR_CALL_SPREAD
```

**Risk Limits**:

- Max Daily Loss: -₹50,000
- Max Drawdown: -₹100,000
- Max Positions: 5
- Max Portfolio Delta: ±500
- Max Portfolio Vega: ±100
- Max Leverage: 1.5x

---

## Engine 4: ExecutionEngine

**Location**: `src/engines/execution/`

**Responsibilities**:

- Place multi-leg orders via Upstox API (@repo/market-sdk)
- Monitor order fills and execution quality
- Track open positions and P&L
- Calculate portfolio Greeks in real-time

**Services**:

- `OrderPlacementService`: Places/modifies/cancels orders via Upstox
- `ExecutionMonitorService`: Monitors fills, slippage, execution metrics
- `PositionManagerService`: Tracks positions, calculates P&L and Greeks

**Order Types**:

- Market Orders (immediate execution)
- Limit Orders (price guarantee)
- Multi-Leg Orders (simultaneous execution)
- Stop-Loss Orders (risk management)

**Position Tracking**:

- Real-time P&L (unrealized + realized)
- Greeks aggregation (delta, gamma, vega, theta)
- Transaction costs (brokerage, STT, slippage)
- Entry/exit prices and timestamps

---

## Data Flow

```
1. DataEngine
   ├─> Fetch market data (Upstox/Yahoo/Binance)
   ├─> Calculate features (TypeScript)
   ├─> Store in MongoDB (time-series)
   └─> Export CSV (Python training)

2. SignalEngine
   ├─> Load ONNX models (GPU/CPU)
   ├─> Run inference on features
   ├─> Ensemble predictions (L0 → L1)
   └─> Generate TradingSignal

3. PolicyEngine
   ├─> Select strategy (based on signal)
   ├─> Calculate position size (Kelly)
   ├─> Validate risk limits
   └─> Generate Strategy object

4. ExecutionEngine
   ├─> Build multi-leg order
   ├─> Place order (Upstox API)
   ├─> Monitor fills (WebSocket)
   └─> Create/update Position
```

---

## Database Architecture

### QuestDB vs TimescaleDB Decision

**Decision**: Use **QuestDB** for time-series data instead of TimescaleDB.

**Rationale**:

1. **Performance**: QuestDB offers 10-20x faster ingestion rates for time-series data
2. **Simplicity**: Standalone binary, no PostgreSQL dependency
3. **SQL Compatibility**: PostgreSQL-compatible SQL dialect
4. **Built-in HTTP API**: REST API for queries without additional drivers
5. **Time-Series Native**: Optimized for append-only time-series data patterns
6. **Resource Efficient**: Lower memory footprint than TimescaleDB+PostgreSQL
7. **Development Experience**: Easier local setup on Windows

**Use Cases**:

- **QuestDB**: Tick data, candles, features, market data (high-frequency writes)
- **MongoDB**: Signals, orders, positions, performance metrics (complex queries, relationships)
- **Redis**: Real-time pub/sub, caching, session management

### QuestDB Schema

```sql
-- Tick data (high-frequency price updates)
CREATE TABLE ticks (
    timestamp TIMESTAMP,
    symbol SYMBOL,
    price DOUBLE,
    volume LONG,
    bid DOUBLE,
    ask DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- OHLCV candles (1min, 5min, 15min, 1hour, 1day)
CREATE TABLE candles (
    timestamp TIMESTAMP,
    symbol SYMBOL,
    timeframe SYMBOL,
    open DOUBLE,
    high DOUBLE,
    low DOUBLE,
    close DOUBLE,
    volume LONG
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Option Greeks and implied volatility
CREATE TABLE option_greeks (
    timestamp TIMESTAMP,
    symbol SYMBOL,
    strike DOUBLE,
    expiry DATE,
    option_type SYMBOL,  -- 'CALL' or 'PUT'
    delta DOUBLE,
    gamma DOUBLE,
    vega DOUBLE,
    theta DOUBLE,
    iv DOUBLE  -- Implied volatility
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Engineered features (from data-processor)
CREATE TABLE features (
    timestamp TIMESTAMP,
    symbol SYMBOL,
    -- Underlying features
    realized_vol_5d DOUBLE,
    realized_vol_10d DOUBLE,
    realized_vol_20d DOUBLE,
    rsi_14 DOUBLE,
    macd_value DOUBLE,
    macd_signal DOUBLE,
    macd_histogram DOUBLE,
    sma_20 DOUBLE,
    sma_50 DOUBLE,
    ema_12 DOUBLE,
    ema_26 DOUBLE,
    -- Sentiment features
    india_vix DOUBLE,
    india_vix_ma5 DOUBLE,
    pcr_volume DOUBLE,
    pcr_oi DOUBLE,
    max_pain DOUBLE,
    -- Option features
    atm_iv DOUBLE,
    vol_skew DOUBLE,
    term_structure DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

### MongoDB Collections

All trading activity is persisted to MongoDB for dashboard integration:

- `features`: Feature snapshots with metadata (backup/audit trail)
- `tradingSignals`: ML predictions and confidence scores
- `orders`: Order history with fills and execution metrics
- `positions`: Open/closed positions with P&L and Greeks
- `performanceMetrics`: Daily/weekly/monthly performance stats
- `rlAgentStates`: RL agent checkpoints and training history

---

## Type Safety Workflow

**Principle**: Single source of truth for all type definitions.

### 1. Define Schema in @repo/schema (Zod)

```typescript
// packages/schema/src/trading/signal.schema.ts
import { z } from 'zod';

export const tradingSignalSchema = z.object({
  userId: z.string(),
  timestamp: z.date(),
  prediction: z.enum(['VOL_UP', 'VOL_DOWN', 'NEUTRAL']),
  confidence: z.number().min(0).max(1),
  probability: z.number().min(0).max(1),
  modelContributions: z.object({
    xgboost: z.number(),
    cnnLstm: z.number(),
    ginn: z.number(),
    svm: z.number(),
  }),
  createdAt: z.date(),
});

export type TradingSignal = z.infer<typeof tradingSignalSchema>;
```

### 2. Use in @repo/database (Mongoose)

```typescript
// packages/database/src/schemas/trading-signal.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type TradingSignal } from '@repo/schema';

@Schema({ timestamps: true })
export class TradingSignalDocument implements TradingSignal {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, enum: ['VOL_UP', 'VOL_DOWN', 'NEUTRAL'] })
  prediction: 'VOL_UP' | 'VOL_DOWN' | 'NEUTRAL';

  // ... rest of fields
}

export const TradingSignalSchema = SchemaFactory.createForClass(
  TradingSignalDocument,
);
```

### 3. Use in Services (Type-Safe)

```typescript
// apps/algo-worker/src/engines/signal/signal-engine.service.ts
import { Injectable } from '@nestjs/common';
import { TradingSignalRepository } from '@repo/database';
import { type TradingSignal, tradingSignalSchema } from '@repo/schema';

@Injectable()
export class SignalEngineService {
  constructor(private readonly signalRepo: TradingSignalRepository) {}

  async saveSignal(
    signal: Omit<TradingSignal, '_id' | 'createdAt'>,
  ): Promise<TradingSignal> {
    // Runtime validation with Zod
    const validated = tradingSignalSchema.parse(signal);

    // Type-safe database operation
    return this.signalRepo.create(validated);
  }
}
```

**Benefits**:

- ✅ Compile-time type checking (TypeScript)
- ✅ Runtime validation (Zod)
- ✅ Single source of truth (no type drift)
- ✅ Auto-completion and IntelliSense
- ✅ Refactoring safety

---

## Integration Points

### Shared Packages

All services use shared packages:

- `@repo/schema`: Zod schemas and TypeScript types (single source of truth)
- `@repo/database`: Multi-database package (MongoDB, QuestDB, Redis)
- `@repo/market-sdk`: Upstox API wrapper

### TODO: Implementation Steps

1. **Update @repo/database**:
   - Add MongoDB collection helpers for trading collections
   - Implement repository pattern for each collection

2. **Implement @repo/market-sdk**:
   - Upstox OAuth2 authentication
   - Market data WebSocket (MarketDataStreamerV3)
   - Portfolio WebSocket (PortfolioDataStreamer)
   - Order API (place/modify/cancel)

3. **Wire up services**:
   - Replace TODO comments with actual @repo/database calls
   - Connect DataCollectionService to @repo/market-sdk
   - Implement real-time WebSocket streaming

4. **ML Model Training**:
   - Export features using TrainingDataService
   - Train Python models (XGBoost, CNN-LSTM, GINN, SVM, Stacking)
   - Export to ONNX format
   - Load models using ModelLoaderService

5. **Testing**:
   - Unit tests for each service
   - Integration tests for engine interactions
   - Backtest with historical data

---

## File Structure

```
apps/algo-worker/src/engines/
├── data/
│   ├── data-engine.module.ts               # NestJS module
│   ├── data-collection.service.ts          # Market data ingestion
│   ├── feature-engineering.service.ts      # Feature calculations
│   ├── feature-store.service.ts            # MongoDB time-series
│   └── training-data.service.ts            # CSV export
├── signal/
│   ├── signal-engine.module.ts             # NestJS module
│   ├── model-loader.service.ts             # ONNX model management
│   └── signal-engine.service.ts            # Ensemble inference
├── policy/
│   ├── policy-engine.module.ts             # NestJS module
│   ├── strategy-selection.service.ts       # Strategy mapping
│   ├── risk-management.service.ts          # Risk validation
│   └── position-sizing.service.ts          # Kelly Criterion
└── execution/
    ├── execution-engine.module.ts          # NestJS module
    ├── order-placement.service.ts          # Order execution
    ├── execution-monitor.service.ts        # Fill monitoring
    └── position-manager.service.ts         # Position tracking
```

---

## Dual-Environment Setup

### Development Environment (Windows 11)

**Purpose**: Local development, testing, and model experimentation

**Stack**:

- Windows 11 Pro
- Node.js 20.x (LTS)
- Python 3.10+ (Anaconda/Poetry)
- Docker Desktop (for MongoDB, QuestDB, Redis)
- VS Code with Copilot

**Services**:

```bash
# Start infrastructure with Docker Compose
cd infrastructure/docker
docker-compose up -d mongodb questdb redis

# Start apps locally
cd apps/algo-worker
pnpm dev  # Port 3001

cd apps/market-feeder
pnpm dev  # Port 3002

cd apps/data-processor
pnpm dev  # Port 3003
```

**Benefits**:

- Fast iteration cycle
- Full IDE support
- Easy debugging with breakpoints
- GPU access for model training (if CUDA-enabled GPU available)

### Production Environment (ArchLinux Server)

**Purpose**: Live trading, 24/7 uptime, production workloads

**Stack**:

- ArchLinux (lightweight, rolling release)
- Docker + Docker Compose
- PM2 for process management
- Nginx as reverse proxy
- Systemd for service management

**Deployment**:

```bash
# Build all apps
pnpm build

# Deploy with Docker Compose
cd infrastructure/docker
docker-compose -f docker-compose.prod.yml up -d

# Or use PM2 for Node.js apps
pm2 start ecosystem.config.js --env production
```

**Production Configuration**:

- Environment variables in `.env.production`
- SSL/TLS certificates (Let's Encrypt)
- Firewall rules (ufw)
- Log rotation (PM2 + logrotate)
- Automated backups (cron jobs)

**Monitoring**:

- PM2 Dashboard: Process health, CPU, memory
- QuestDB Console: `http://server:9000`
- MongoDB Compass: Remote connection
- Application logs: `/var/log/trading/`

### Development → Production Workflow

1. **Develop on Windows**: Code, test, train models
2. **Commit to Git**: Push to repository
3. **CI/CD Pipeline**: GitHub Actions builds and tests
4. **Deploy to ArchLinux**: Manual or automated deployment
5. **Monitor**: PM2 dashboard, logs, alerts

---

## Backup Strategy

### MongoDB Backup

**Strategy**: Automated daily backups with 30-day retention

```bash
#!/bin/bash
# Backup script: /opt/trading/scripts/backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
RETENTION_DAYS=30

# Create backup
mongodump \
  --uri="mongodb://localhost:27017/trading" \
  --out="$BACKUP_DIR/mongo_$DATE" \
  --gzip

# Compress backup
tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" "$BACKUP_DIR/mongo_$DATE"
rm -rf "$BACKUP_DIR/mongo_$DATE"

# Remove old backups
find "$BACKUP_DIR" -name "mongo_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "MongoDB backup completed: mongo_$DATE.tar.gz"
```

**Cron Schedule**:

```cron
# /etc/cron.d/trading-backups
0 2 * * * /opt/trading/scripts/backup-mongodb.sh >> /var/log/trading/backup.log 2>&1
```

### QuestDB Backup

**Strategy**: Snapshot-based backups with configurable retention

```bash
#!/bin/bash
# Backup script: /opt/trading/scripts/backup-questdb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/questdb"
QUESTDB_ROOT="/var/lib/questdb/db"
RETENTION_DAYS=7  # Shorter retention for large time-series data

# Stop writes (graceful)
curl -X POST "http://localhost:9000/admin/snapshot" || true

# Copy database files
rsync -av --delete "$QUESTDB_ROOT/" "$BACKUP_DIR/questdb_$DATE/"

# Compress backup
tar -czf "$BACKUP_DIR/questdb_$DATE.tar.gz" "$BACKUP_DIR/questdb_$DATE"
rm -rf "$BACKUP_DIR/questdb_$DATE"

# Remove old backups
find "$BACKUP_DIR" -name "questdb_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "QuestDB backup completed: questdb_$DATE.tar.gz"
```

**Cron Schedule**:

```cron
# Weekly backups (QuestDB is append-only, less critical)
0 3 * * 0 /opt/trading/scripts/backup-questdb.sh >> /var/log/trading/backup.log 2>&1
```

### Redis Backup

**Strategy**: RDB snapshots with AOF persistence

**Configuration** (`redis.conf`):

```conf
# RDB snapshots
save 900 1      # After 900 sec (15 min) if at least 1 key changed
save 300 10     # After 300 sec (5 min) if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed

# AOF persistence
appendonly yes
appendfsync everysec

# Backup directory
dir /var/lib/redis
dbfilename dump.rdb
```

**Backup Script**:

```bash
#!/bin/bash
# Copy RDB snapshot
cp /var/lib/redis/dump.rdb /backup/redis/dump_$(date +%Y%m%d).rdb

# Retention: 7 days
find /backup/redis -name "dump_*.rdb" -mtime +7 -delete
```

### Disaster Recovery

**MongoDB Restore**:

```bash
mongorestore --uri="mongodb://localhost:27017/trading" --gzip /backup/mongodb/mongo_20250121.tar.gz
```

**QuestDB Restore**:

```bash
# Stop QuestDB
systemctl stop questdb

# Restore data
tar -xzf /backup/questdb/questdb_20250121.tar.gz -C /var/lib/questdb/db/

# Start QuestDB
systemctl start questdb
```

**Redis Restore**:

```bash
# Stop Redis
systemctl stop redis

# Restore RDB
cp /backup/redis/dump_20250121.rdb /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis
```

### Cloud Backup (Optional)

For production, consider syncing backups to cloud storage:

```bash
# Upload to AWS S3
aws s3 sync /backup/ s3://trading-backups/ --storage-class GLACIER

# Or Google Cloud Storage
gsutil -m rsync -r /backup/ gs://trading-backups/
```

---

## Next Steps

1. **Wire up engines in app.module.ts**: Import all 4 engine modules
2. **Implement @repo/database**: Add MongoDB collections and repositories
3. **Implement @repo/market-sdk**: Complete Upstox API integration
4. **Train ML models**: Use exported features to train Python models
5. **Export to ONNX**: Convert trained models to ONNX format
6. **Test inference**: Verify GPU-accelerated inference works
7. **Backtest**: Run historical backtests with walk-forward validation
8. **Deploy**: Docker containerization with GPU support

---

## Notes

- All type errors are expected (workspace packages not yet wired up)
- TODO comments mark integration points for @repo/database and @repo/market-sdk
- Services use pessimistic assumptions (slippage, costs) as per instructions
- Async methods without await are TODOs (will be implemented with actual DB/API calls)
- Schema types imported from @repo/schema ensure consistency across all apps
