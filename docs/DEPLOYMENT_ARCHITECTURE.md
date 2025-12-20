# Deployment Architecture - Hybrid Local-Cloud Strategy

> **For small teams (1-2 users) running algorithmic trading locally with RTX GPU acceleration.**

---

## 🎯 Design Principles

### **What We Are**

- **Small personal team** (maximum 2 concurrent users)
- **Local execution** (Windows PC or ArchLinux with RTX GPU)
- **Individual purpose** (not institutional HFT)
- **Non-cloud algo execution** (latency-sensitive components stay local)

### **What We Are NOT**

- ❌ High-Frequency Trading (HFT) firm requiring co-location
- ❌ Cloud-based algo execution (no need for static IP compliance)
- ❌ Institutional setup with 10+ OPS throughput
- ❌ Multi-tenant SaaS platform

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUD (Hosted)                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Web UI     │───▶│   API (NestJS)│◀──▶│ Cloud Redis  │ │
│  │  (Next.js)   │    │   Auth, CRUD  │    │ (Config Sync)│ │
│  └──────────────┘    └──────────────┘    └──────┬───────┘ │
│                                                    │         │
└────────────────────────────────────────────────────┼─────────┘
                                                     │
                                            Secure WebSocket
                                                     │
┌────────────────────────────────────────────────────┼─────────┐
│                 LOCAL (Windows/ArchLinux)          │         │
│                                                     ▼         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          algo-worker (NestJS + Worker Threads)      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │    │
│  │  │ Perception│─▶│  Cortex  │─▶│   Prediction     │ │    │
│  │  │(WebSocket)│  │(Features)│  │(GPU Inference)   │ │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │    │
│  │  │ Cognition│─▶│Execution │─▶│   Upstox API     │ │    │
│  │  │(Strategy)│  │(Orders)  │  │   (Broker)       │ │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┼───────────────────────────────┐   │
│  │    Local Databases   │                               │   │
│  │  ┌─────────┐  ┌──────▼───┐  ┌──────────────────┐   │   │
│  │  │ QuestDB │  │  Redis   │  │     MongoDB      │   │   │
│  │  │(Ticks)  │  │(Hot State)│  │(Positions, Logs) │   │   │
│  │  └─────────┘  └──────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  training-pipeline (Python/Kedro + GPU)              │   │
│  │  Runs nightly to train models, export to ONNX       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Deployment Strategy

### **Cloud-Hosted Components**

#### 1. **Web Dashboard (Next.js)**

- **Location**: Vercel/Netlify/AWS S3 + CloudFront
- **Purpose**: User interface for monitoring trades, configuring strategies
- **Why Cloud**: Accessible from anywhere, no local port forwarding needed
- **Latency Tolerance**: 200-500ms (human perception)

#### 2. **API Backend (NestJS)**

- **Location**: AWS EC2 (Mumbai) / DigitalOcean
- **Purpose**:
  - User authentication (2FA, JWT)
  - CRUD operations for user configs
  - Historical data queries (backtests, reports)
  - Proxy for non-latency-sensitive operations
- **Why Cloud**: Centralized state, accessible from multiple devices
- **Latency Tolerance**: 100-200ms

#### 3. **Cloud Redis (Config Sync)**

- **Location**: AWS ElastiCache / Redis Cloud
- **Purpose**:
  - Real-time config changes (enable/disable strategies)
  - User preferences sync
  - Alert/notification queue
- **Why Cloud**: Bridge between cloud UI and local algo-worker
- **Data Flow**:
  - User changes config in Web UI → API writes to Cloud Redis
  - Local algo-worker subscribes to Cloud Redis → detects change → hot-reloads config

---

### **Local Components** (Critical Path)

#### 1. **algo-worker (Trading Engine)**

- **Location**: Local Windows PC or ArchLinux (same machine as RTX GPU)
- **Purpose**:
  - Real-time market data ingestion (Upstox WebSocket)
  - Feature engineering (Rust NAPI-RS + Drift-Adaptive Normalization)
  - ML inference (ONNX + TensorRT on RTX GPU)
  - Order execution (direct Upstox API calls)
  - Position tracking and exit management
- **Why Local**:
  - **Latency**: <100ms end-to-end required (cloud adds 50-200ms network)
  - **GPU Access**: TensorRT/CUDA inference needs local RTX GPU
  - **Data Privacy**: Market data stays on-premises
  - **No Static IP Compliance**: Not using cloud brokers, local IP acceptable
- **Performance Target**: <150ms (tick → signal → order)

#### 2. **QuestDB (Time-Series Database)**

- **Location**: Local (same machine or LAN)
- **Purpose**:
  - Store tick data (every price update)
  - Store 1m/5m/15m candles
  - Store engineered features
  - Training data for ML pipeline
- **Why Local**:
  - **Write Throughput**: 1M+ inserts/sec required (cloud limited by network)
  - **Query Speed**: Training pipeline needs <1s feature queries
  - **Storage Cost**: 10GB/day tick data = expensive cloud transfer fees

#### 3. **MongoDB (Document Store)**

- **Location**: Local
- **Purpose**:
  - Trading signals history
  - Order ledger (audit trail)
  - Position history (closed positions)
  - User trading configs (hot cache from Cloud Redis)
- **Why Local**:
  - **Compliance**: 5-year audit trail stays on-premises
  - **Query Speed**: Algo-worker needs <10ms config lookups

#### 4. **Redis (Event Bus + Hot State)**

- **Location**: Local
- **Purpose**:
  - Redis Streams for internal events (Perception → Cortex → Prediction...)
  - Hot state cache (active positions, latest prices)
  - Circuit breaker status
- **Why Local**:
  - **Latency**: Sub-millisecond pub/sub required for event-driven architecture
  - **Different from Cloud Redis**: This is for **local event bus**, Cloud Redis for **config sync**

#### 5. **training-pipeline (ML Training)**

- **Location**: Local (scheduled nightly, GPU-accelerated)
- **Purpose**:
  - Fetch data from QuestDB
  - Train 8 ML models (XGBoost, CNN-LSTM, GINN, SVM, Transformer, TimesNet, WFTNet, LightGBM)
  - Export to ONNX (FP16 quantization)
  - Copy to algo-worker/models/ directory
- **Why Local**:
  - **GPU Access**: Training requires RTX GPU (8-12 hours per full training)
  - **Data Access**: Direct QuestDB connection (no cloud egress fees)
  - **Cost**: Cloud GPU instances = $2-5/hour, local RTX = free

---

## 🔄 Data Flow Patterns

### **Pattern 1: User Configuration Change**

```
1. User opens Web UI (cloud) → enables "Iron Condor" strategy
2. UI sends POST /api/config to API (cloud)
3. API validates → writes to Cloud Redis: SET user:1:config {...}
4. Local algo-worker (subscribed to Cloud Redis) detects change
5. algo-worker hot-reloads config → starts analyzing Iron Condor signals
6. No restart required
```

**Latency**: 500-2000ms (acceptable, config changes are rare)

### **Pattern 2: Live Trading Execution** (Critical Path)

```
1. Upstox WebSocket (cloud broker) → Local algo-worker (direct connection)
   Latency: ~20-50ms (Mumbai broker to local ISP)

2. algo-worker Perception layer → Redis Stream (local)
   Latency: <1ms

3. algo-worker Cortex → compute features (Rust) → Redis Stream (local)
   Latency: 2-5ms

4. algo-worker Prediction → ONNX inference (TensorRT GPU) → Redis Stream (local)
   Latency: 5-15ms (GPU TensorRT)

5. algo-worker Cognition → risk checks → Redis Stream (local)
   Latency: 2-5ms

6. algo-worker Execution → Upstox REST API (cloud broker)
   Latency: 30-80ms

Total: <150ms (tick → order)
```

**Why This Stays Local**: Adding cloud hop (algo-worker in cloud) would add 50-200ms network latency, degrading execution quality.

### **Pattern 3: Historical Data Query** (Non-Critical)

```
1. User requests backtest report in Web UI (cloud)
2. UI sends GET /api/backtest?strategy=X to API (cloud)
3. API connects to Local QuestDB (via VPN/SSH tunnel or public endpoint)
4. Fetches data, computes metrics, returns to UI

Alternative: Pre-compute reports nightly, store in cloud MongoDB, serve directly
```

**Latency**: 5-10 seconds (acceptable, not time-sensitive)

---

## 🚀 Performance Optimizations for Local Deployment

### **1. Node.js Worker Threads for GPU Inference**

**Problem**: GPU inference (ONNX Runtime) blocks Node.js event loop, causing 20-50ms stalls.

**Solution**: Dedicated Worker Thread for ML models.

```typescript
// algo-worker/src/prediction/prediction-worker.ts
import { Worker } from "worker_threads";
import { SharedArrayBuffer } from "buffer";

// Main thread (event loop)
const featureBuffer = new SharedArrayBuffer(1 * 60 * 13 * 8); // 60 timesteps, 13 features, Float64
const resultBuffer = new SharedArrayBuffer(3 * 8); // 3 classes (VOL_UP, NEUTRAL, VOL_DOWN)

const worker = new Worker("./inference-worker.js", {
  workerData: { featureBuffer, resultBuffer },
});

// Inference worker (separate thread with GPU access)
// inference-worker.js
const ort = require("onnxruntime-node");
const { parentPort, workerData } = require("worker_threads");

const session = await ort.InferenceSession.create("xgboost.onnx", {
  executionProviders: ["TensorrtExecutionProvider", "CUDAExecutionProvider"],
});

parentPort.on("message", async () => {
  const features = new Float32Array(workerData.featureBuffer);
  const output = await session.run({ input: features });

  const result = new Float64Array(workerData.resultBuffer);
  result.set(output.output.data);

  parentPort.postMessage("done");
});
```

**Impact**:

- Eliminates event loop blocking
- GPU inference no longer delays WebSocket message processing
- Latency: 10-30ms (GPU) vs 50-200ms (blocked event loop)

---

### **2. Zero-Copy Data Sharing (SharedArrayBuffer)**

**Problem**: Serializing/deserializing tick data between threads costs 5-10ms.

**Solution**: SharedArrayBuffer for raw binary data.

```typescript
// Perception layer writes directly to shared memory
const tickBuffer = new SharedArrayBuffer(1000 * 8); // 1000 ticks, 8 bytes each
const tickView = new Float64Array(tickBuffer);

// WebSocket handler
upstoxWs.on("tick", (tick) => {
  tickView[tickIndex++] = tick.price;
  tickView[tickIndex++] = tick.volume;
  // No JSON.stringify/parse overhead
});

// Cortex layer reads directly from shared memory
const features = computeFeatures(tickView); // Zero-copy access
```

**Impact**:

- Saves 5-10ms per 1000 ticks
- Reduces GC pressure (no temporary objects)

---

### **3. Object Pooling for Hot Paths**

**Problem**: Creating new Order objects on every signal triggers GC (50-500ms pauses).

**Solution**: Pre-allocate object pool at startup.

```typescript
// Execution layer
class OrderPool {
  private pool: Order[] = [];

  constructor() {
    // Pre-allocate 10,000 orders
    for (let i = 0; i < 10000; i++) {
      this.pool.push(new Order());
    }
  }

  borrow(): Order {
    return this.pool.pop() || new Order(); // Fallback if pool exhausted
  }

  return(order: Order) {
    order.reset(); // Clear fields
    this.pool.push(order);
  }
}

// Usage
const order = orderPool.borrow();
order.symbol = "NIFTY2350023000CE";
order.quantity = 50;
await execute(order);
orderPool.return(order); // Return to pool instead of GC
```

**Impact**:

- Flat memory profile (no heap growth)
- Eliminates GC pauses during high-volume periods

---

### **4. V8 Garbage Collection Tuning**

**Problem**: Default V8 settings trigger frequent major GC (500ms pauses).

**Solution**: Tune heap size and GC behavior.

```bash
# Start algo-worker with optimized V8 flags
node --max-old-space-size=8192 \          # 8GB heap (large for 2 users)
     --max-semi-space-size=128 \          # 128MB young generation
     --expose-gc \                        # Explicit GC control
     --gc-interval=3600000 \              # Force GC every hour (not during trading)
     dist/main.js
```

**Impact**:

- Major GC only during market close (3:30 PM IST)
- Minor GC pauses: <5ms (acceptable)

---

## 🛡️ Security & Reliability

### **VPN/SSH Tunnel for Cloud-Local Communication**

If API needs to query local QuestDB:

```bash
# On local machine: Expose QuestDB via SSH tunnel
ssh -R 9000:localhost:9000 user@cloud-api-server

# Cloud API connects to localhost:9000 → tunnels to local QuestDB
```

**Alternative**: Use WireGuard VPN for persistent secure connection.

---

### **Failover Strategy**

#### **Scenario 1: Local Power Outage**

- **Impact**: Trading stops (algo-worker down)
- **Mitigation**: UPS (Uninterruptible Power Supply) for 15-30 min graceful shutdown
- **Recovery**: Positions stored in MongoDB, can be resumed on reboot

#### **Scenario 2: Internet Outage**

- **Impact**: Cannot send orders (Upstox API unreachable)
- **Mitigation**:
  - Secondary ISP (mobile hotspot)
  - Circuit breaker auto-squares-off positions if connection lost >30 sec

#### **Scenario 3: Cloud Redis Down**

- **Impact**: Cannot receive new config changes from UI
- **Mitigation**: Local Redis has cached copy, algo-worker continues with last known config

#### **Scenario 4: RTX GPU Failure**

- **Impact**: ML inference fails
- **Mitigation**: Fallback to CPU inference (ONNX Runtime CPUExecutionProvider)
- **Degradation**: Latency increases to 100-200ms (still acceptable for non-HFT)

---

## 📊 Cost Analysis (Local vs Cloud Algo Execution)

### **Local Deployment (Our Choice)**

| Component         | Hardware/Service              | Monthly Cost                 |
| ----------------- | ----------------------------- | ---------------------------- |
| Algo Worker       | Local PC (RTX 3060, 32GB RAM) | ₹0 (one-time ₹80K)           |
| QuestDB           | Local SSD (500GB)             | ₹0                           |
| MongoDB           | Local HDD (2TB)               | ₹0                           |
| Redis             | Local RAM                     | ₹0                           |
| Training Pipeline | Local GPU (nightly)           | ₹0 (electricity ~₹500/month) |
| **Cloud**         |                               |                              |
| Web UI            | Vercel (Hobby)                | ₹0                           |
| API Backend       | DigitalOcean ($12 droplet)    | ₹1,000                       |
| Cloud Redis       | Redis Cloud (30MB free)       | ₹0                           |
| **Total**         |                               | **₹1,500/month**             |

---

### **Cloud Algo Execution (NOT Recommended)**

| Component         | Service                         | Monthly Cost      |
| ----------------- | ------------------------------- | ----------------- |
| Algo Worker       | AWS EC2 g4dn.xlarge (GPU)       | ₹25,000           |
| QuestDB           | AWS RDS + EBS (500GB)           | ₹8,000            |
| MongoDB           | Atlas M10                       | ₹6,000            |
| Redis             | ElastiCache                     | ₹3,000            |
| Training Pipeline | AWS EC2 g4dn.xlarge (8hr/night) | ₹10,000           |
| Data Transfer     | Egress (10GB/day)               | ₹5,000            |
| **Total**         |                                 | **₹57,000/month** |

**Verdict**: Local deployment saves ₹55,500/month (₹6.6 lakh/year) with **NO performance degradation** for non-HFT use cases.

---

## 🎯 What We Ignore from the Report

### **1. Full C++/Rust Rewrite**

- **Report Claim**: Necessary for sub-microsecond HFT
- **Our Reality**: 2 users, <10 OPS, 100ms latency acceptable
- **Decision**: ⚠️ Partial Adoption. We use **Rust Bindings (NAPI-RS)** for heavy feature engineering (Cortex layer) to save CPU, but keep core logic in Node.js/TypeScript.

### **2. LMAX Disruptor Pattern**

- **Report Claim**: Lock-free ring buffers for millions of events/sec
- **Our Reality**: ~1000 events/sec (tick data)
- **Decision**: ❌ Redis Streams adequate. Adds unnecessary complexity.

### **3. Co-location / Proximity Hosting**

- **Report Claim**: AWS Mumbai for <5ms latency to NSE
- **Our Reality**: Algo runs locally, not in cloud
- **Decision**: ❌ Not applicable. Local ISP latency (20-50ms) acceptable.

### **4. Static IP Mandate**

- **Report Claim**: SEBI requires static IP for cloud algo execution
- **Our Reality**: Algo runs locally, Upstox API accepts residential IP
- **Decision**: ❌ Not applicable. No compliance burden.

### **5. TimescaleDB**

- **Report Claim**: Use TimescaleDB for time-series
- **Our Reality**: Already using QuestDB (22x faster writes)
- **Decision**: ❌ QuestDB superior. No migration needed.

### **6. 10 OPS Threshold Complexity**

- **Report Claim**: Need token bucket, drip feed, exit prioritization for >10 OPS
- **Our Reality**: 2 users, ~2-5 orders/min (0.05 OPS)
- **Decision**: ✅ Implement simple rate limiter (safety), but not critical.

---

## ✅ What We Adopt from the Report

### **1. Worker Threads for GPU Inference** ✅ CRITICAL

- **Impact**: Eliminates event loop blocking (20-50ms saved)
- **Implementation**: Separate thread for ONNX Runtime, SharedArrayBuffer for data

### **2. Order Flow Imbalance (OFI)** ✅ HIGH

- **Impact**: Early signal detection (100-500ms edge)
- **Implementation**: Parse Depth-30 WebSocket, compute OFI every tick

### **3. Reinforcement Learning Execution Agent** ✅ HIGH

- **Impact**: Adaptive order placement (minimize slippage)
- **Implementation**: PPO agent trained on microstructure (bid-ask spread, queue position)

### **4. Combinatorial Purged Cross-Validation** ✅ CRITICAL

- **Impact**: Eliminate overfitting (prevents false backtest Sharpe)
- **Implementation**: Replace standard TimeSeriesSplit with CPCV in Kedro pipeline

### **5. Mamba / PatchTST Models** ✅ HIGH

- **Impact**: Better forecasting than LSTM (10-20% Sharpe improvement)
- **Implementation**: Adopt Mamba (SSM) and PatchTST as core Level-0 models.

### **6. Zero-Allocation Patterns** ✅ HIGH

- **Impact**: Eliminate GC pauses (500ms → 5ms)
- **Implementation**: Object pooling, TypedArrays, pre-allocated buffers

---

## 📝 Summary

**Our Optimized Architecture**:

- ✅ **Dashboard + API in Cloud** (Vercel + DigitalOcean)
- ✅ **Algo Worker on Local RTX GPU** (Windows/ArchLinux)
- ✅ **Cloud Redis for Config Sync** (bridge between cloud UI and local algo)
- ✅ **All Databases Local** (QuestDB, MongoDB, Redis Streams)
- ✅ **Training Pipeline on Local GPU** (nightly scheduled)

**Performance**: <150ms end-to-end latency (tick → order)  
**Cost**: ₹1,500/month (vs ₹57,000 for cloud algo)  
**Scalability**: Handles 2-5 users comfortably  
**Compliance**: SEBI-compliant (Algo ID, rate limiting)

**Next Steps**: Implement Worker Threads, OFI features, CPCV validation (see todo list).
