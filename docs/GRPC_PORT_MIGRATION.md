# Port Configuration Summary - gRPC Microservices Architecture

## Overview

All backend services use **gRPC** for inter-service communication. Only the web frontend (Next.js) uses HTTP.

## Port Allocation

### Databases

| Service     | Port  | Protocol | Description                        |
| ----------- | ----- | -------- | ---------------------------------- |
| **QuestDB** | 8812  | TCP      | PostgreSQL wire protocol (queries) |
| **QuestDB** | 9000  | HTTP/TCP | REST API + Web Console + ILP       |
| **QuestDB** | 9003  | HTTP     | Min health server                  |
| **MongoDB** | 27017 | TCP      | Database                           |
| **Redis**   | 6379  | TCP      | Cache/Event bus                    |

### Microservices (gRPC)

| Service                  | Port  | Description                     |
| ------------------------ | ----- | ------------------------------- |
| **api**                  | 50050 | tRPC + gRPC gateway             |
| **algo-worker**          | 50051 | Trading engine (ONNX inference) |
| **market-feeder**        | 50052 | Real-time market data ingestion |
| **data-processor**       | 50053 | ETL and feature engineering     |
| **notification-service** | 50054 | Alerts and notifications        |
| **wealth-analyzer**      | 50055 | Portfolio analytics             |
| **wealth-management**    | 50056 | Portfolio management            |
| **document-processor**   | 50057 | Document parsing and indexing   |

### Frontend (HTTP only)

| Service | Port | Protocol | Description       |
| ------- | ---- | -------- | ----------------- |
| **web** | 3000 | HTTP     | Next.js dashboard |

### Monitoring

| Service        | Port | Protocol | Description           |
| -------------- | ---- | -------- | --------------------- |
| **Grafana**    | 3005 | HTTP     | Metrics visualization |
| **Prometheus** | 9090 | HTTP     | Metrics collection    |

## Updated Environment Variables

### All Microservices

```bash
# Remove: PORT=3XXX (no longer needed)
# Add:    GRPC_PORT=500XX
GRPC_PORT=50051  # Example for algo-worker
```

### QuestDB Configuration

```bash
QUESTDB_PG_PORT=8812   # PostgreSQL wire (queries)
QUESTDB_ILP_PORT=9000  # InfluxDB Line Protocol (writes)
```

## Next Steps

1. ✅ Port configurations updated in all `.env` files
2. ⏳ Update service main.ts to use `createMicroservice()` (market-feeder done)
3. ⏳ Configure gRPC clients in consuming services
4. ⏳ Update docker-compose.yml service definitions
5. ⏳ Update PORT_ALLOCATION.md (done)
