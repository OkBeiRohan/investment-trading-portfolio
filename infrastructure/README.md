# Infrastructure - Project Quantum

Production-grade infrastructure for algorithmic trading system with QuestDB, MongoDB, Redis, and monitoring stack.

---

## Directory Structure

```
infrastructure/
├── docker/                    # Docker Compose for local development
│   └── docker-compose.yml
├── kubernetes/                # Kubernetes manifests for production (TODO)
└── monitoring/                # Prometheus + Grafana configs (TODO)
```

---

## Docker Compose Setup (Local Development)

> **Note**: Individual Dockerfiles for microservices (algo-worker, api, web, etc.) still need to be created. The current Docker Compose setup covers database infrastructure only.

### Services

| Service     | Image               | Port                         | Purpose                                         |
| ----------- | ------------------- | ---------------------------- | ----------------------------------------------- |
| **QuestDB** | questdb/questdb:8.0 | 9000 (UI), 8812 (PostgreSQL) | Time-series database for ticks/candles/features |
| **MongoDB** | mongo:8.0           | 27017                        | Document store for signals/orders/positions     |
| **Redis**   | redis:7.2-alpine    | 6379                         | Event bus (Streams) + hot state cache           |

### Quick Start

```bash
# Start all services
cd infrastructure/docker
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f questdb mongodb redis

# Stop services
docker-compose down

# Stop and remove volumes (DESTRUCTIVE - deletes all data)
docker-compose down -v
```

### Data Persistence

All services use Docker volumes for data persistence:

- **QuestDB**: `questdb_data` → `/var/lib/questdb`
- **MongoDB**: `mongodb_data` → `/data/db`
- **Redis**: `redis_data` → `/data` (AOF + RDB snapshots)

### Accessing Services

#### QuestDB

- **Console UI**: http://localhost:9000
- **PostgreSQL Connection**:
  ```bash
  psql -h localhost -p 8812 -U admin -d qdb
  ```
- **ILP (InfluxDB Line Protocol)**: Port 9000 (for high-speed ingestion)

#### MongoDB

- **Connection String**: `mongodb://localhost:27017/trading`
- **Compass**: Use connection string above

#### Redis

- **CLI**:
  ```bash
  docker exec -it $(docker ps -qf "name=redis") redis-cli
  ```
- **Redis Streams**:
  ```bash
  XREAD STREAMS market-data trading-signals 0-0 0-0
  ```

---

## Production Deployment (Kubernetes)

> **Status**: Planned future phase (not yet started)

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Kubernetes Cluster                             │
│                                                 │
│  ┌───────────────┐  ┌───────────────┐         │
│  │  QuestDB      │  │  MongoDB      │         │
│  │  StatefulSet  │  │  ReplicaSet   │         │
│  │  (3 replicas) │  │  (3 replicas) │         │
│  └───────────────┘  └───────────────┘         │
│                                                 │
│  ┌───────────────┐  ┌───────────────┐         │
│  │  Redis        │  │  Algo Worker  │         │
│  │  Sentinel     │  │  Deployment   │         │
│  │  (HA)         │  │  (Auto-scale) │         │
│  └───────────────┘  └───────────────┘         │
└─────────────────────────────────────────────────┘
```

### Deployment Checklist

- [ ] Create namespace: `kubectl create ns trading`
- [ ] Deploy QuestDB StatefulSet with persistent volumes
- [ ] Deploy MongoDB with replica set init script
- [ ] Deploy Redis Sentinel for high availability
- [ ] Configure Ingress for QuestDB UI (HTTPS)
- [ ] Set up Prometheus ServiceMonitor
- [ ] Configure Horizontal Pod Autoscaler for algo-worker

---

## Monitoring Stack (Prometheus + Grafana)

> **Status**: Planned future phase (not yet started)

### Components

- **Prometheus**: Metrics scraping and storage
- **Grafana**: Visualization dashboards
- **Alertmanager**: Slack/Email alerts
- **Node Exporter**: System metrics (CPU, memory, disk)

### Key Dashboards

1. **Trading Performance**:
   - Tick-to-trade latency (p50, p95, p99)
   - Order fill rate
   - Strategy PnL
   - Sharpe ratio (rolling 30d)

2. **System Health**:
   - QuestDB ingestion rate
   - MongoDB replica lag
   - Redis memory usage
   - Algo-worker CPU/memory

3. **ML Models**:
   - Inference latency (GPU vs CPU)
   - Model confidence distribution
   - Prediction accuracy (live vs backtest)

### Alert Rules

```yaml
# Critical Alerts
- Latency > 500ms (p95) → PagerDuty
- Daily loss > ₹50,000 → Slack + Email
- QuestDB disk >90% → Email

# Warning Alerts
- Redis memory >80% → Slack
- MongoDB replica lag >5s → Email
- Model inference failure rate >5% → Slack
```

---

## Infrastructure as Code (Planned Future Phase)

### Terraform (Planned)

```hcl
# Provision GCP VMs or AWS EC2 instances
# Set up VPC, firewall rules, persistent disks

module "questdb_cluster" {
  source = "./modules/questdb"
  replicas = 3
  disk_size_gb = 500
}

module "mongodb_replica_set" {
  source = "./modules/mongodb"
  replicas = 3
  disk_size_gb = 200
}
```

### Ansible (Planned)

```yaml
# Configure OS optimizations
- name: Optimize Linux for low-latency trading
  hosts: algo_worker
  tasks:
    - name: Disable CPU frequency scaling
      sysctl:
        name: kernel.sched_latency_ns
        value: "10000000"
    - name: Apply PREEMPT-RT kernel patches
      # ...
```

---

## Network Architecture (Production)

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │  (HTTPS/TLS)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  VPC/Private    │
                    │   Network       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐
    │ QuestDB  │      │  MongoDB   │     │   Redis    │
    │ Cluster  │      │ Replica Set│     │  Sentinel  │
    └──────────┘      └────────────┘     └────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Algo Worker   │
                    │   Deployment    │
                    └─────────────────┘
```

**Security**:

- All inter-service communication within VPC (no public IPs)
- MongoDB authentication + TLS enabled
- Redis `requirepass` + ACLs
- QuestDB UI accessible only via authenticated Ingress

---

## Backup Strategy

### QuestDB

- **Hourly**: Hot backup to S3/GCS (incremental)
- **Daily**: Full snapshot to cold storage
- **Retention**: 30 days (ticks), 1 year (candles/features)

### MongoDB

- **Hourly**: Oplog backup to S3/GCS
- **Daily**: Full replica set snapshot
- **Retention**: 5 years (SEBI compliance for orders/audit)

### Redis

- **Every 15 min**: RDB snapshot to disk
- **AOF**: Append-only file for point-in-time recovery
- **Retention**: 7 days

---

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Service | RTO     | RPO     | Recovery Procedure        |
| ------- | ------- | ------- | ------------------------- |
| QuestDB | <15 min | <1 hour | Restore from S3 snapshot  |
| MongoDB | <10 min | <1 hour | Restore from oplog backup |
| Redis   | <5 min  | <15 min | Restore from RDB + AOF    |

### Circuit Breaker Activation

Auto-triggered when:

- Daily loss > ₹50,000
- Drawdown > 20%
- Latency > 500ms sustained for 30s
- Data feed stale >10s

**Action**: Liquidate all positions at market price, stop trading, notify ops team.

---

## Cost Estimation (Production - GCP/AWS)

| Resource                     | Spec                        | Monthly Cost (USD)      |
| ---------------------------- | --------------------------- | ----------------------- |
| QuestDB Cluster (3x VMs)     | 8 vCPU, 32GB RAM, 500GB SSD | $600                    |
| MongoDB Replica Set (3x VMs) | 4 vCPU, 16GB RAM, 200GB SSD | $400                    |
| Redis Sentinel (3x VMs)      | 2 vCPU, 8GB RAM, 50GB SSD   | $200                    |
| Algo Worker (Auto-scaling)   | 2-4 vCPU, 8-16GB RAM        | $150-300                |
| Load Balancer + Networking   |                             | $50                     |
| **Total**                    |                             | **~$1,400-1,550/month** |

---

## Local Development Tips

### Reset All Data

```bash
docker-compose down -v
docker-compose up -d
```

### Access Logs

```bash
# QuestDB
docker-compose logs -f questdb | grep ERROR

# MongoDB ops
docker exec -it $(docker ps -qf "name=mongodb") mongosh --eval "rs.status()"

# Redis memory usage
docker exec -it $(docker ps -qf "name=redis") redis-cli INFO memory
```

### Performance Tuning

**QuestDB** (edit `docker-compose.yml`):

```yaml
environment:
  - QDB_CAIRO_WRITER_DATA_APPEND_PAGE_SIZE=16777216 # 16MB (faster writes)
  - QDB_PG_NET_ACTIVE_CONNECTION_LIMIT=64 # More connections
```

**MongoDB** (edit `/etc/mongod.conf` in container):

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8 # Increased cache
```

**Redis** (edit `redis.conf`):

```conf
maxmemory 4gb
maxmemory-policy allkeys-lru
```

---

**Last Updated**: March 17, 2026
**Status**: Docker Compose ready (databases only), Dockerfiles for microservices TODO, K8s/Monitoring/Terraform planned future phases
