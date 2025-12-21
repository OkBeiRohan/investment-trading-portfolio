# Developer Guide - Investment Trading Portfolio

**Last Updated:** November 29, 2025

## Table of Contents

1. [Environment Setup](#environment-setup)
   - [Windows Development Setup](#windows-development-setup)
   - [ArchLinux Production Setup](#archlinux-production-setup)
2. [Development Workflow](#development-workflow)
3. [Type Generation &amp; Schema Management](#type-generation--schema-management)
4. [Database Management](#database-management)
5. [Testing Strategy](#testing-strategy)
6. [Debugging Guide](#debugging-guide)
7. [Common Issues &amp; Solutions](#common-issues--solutions)
8. [Deployment](#deployment)

---

## Environment Setup

### Windows Development Setup

#### Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm 9+** (install via `npm install -g pnpm`)
- **Python 3.11+** (for ML training)
- **MongoDB 8.0+** (local or Docker)
- **QuestDB 8.0+** (local or Docker) - _Primary Time-Series Store_
- **Redis 7.0+** (local or Docker)
- **Git for Windows**
- **VS Code** (recommended IDE)

#### Initial Setup

```powershell
# Clone repository
git clone https://github.com/OkBeiRohan/investment-trading-portfolio.git
cd investment-trading-portfolio

# Install dependencies
pnpm install

# Copy environment variables
Copy-Item ".env.example" ".env"
Copy-Item "apps/algo-worker/.env.example" "apps/algo-worker/.env"
Copy-Item "apps/api/.env.example" "apps/api/.env"
Copy-Item "apps/web/.env.example" "apps/web/.env"

# Configure environment variables
# Edit .env files with your credentials

# Start databases via Docker (recommended)
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Build all packages
pnpm turbo build

# Start algo-worker in development
cd apps/algo-worker
pnpm dev
```

#### Windows-Specific Configuration

1. **Python Environment:**

   ```powershell
   cd apps/algo-worker/ml
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. **VS Code Extensions:**
   - ESLint
   - Prettier
   - Python
   - MongoDB for VS Code
   - Thunder Client (API testing)

3. **PowerShell Execution Policy:**

   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

---

### ArchLinux Production Setup

#### Prerequisites

```bash
# Update system
sudo pacman -Syu

# Install dependencies
sudo pacman -S nodejs npm python python-pip mongodb redis git

# Install pnpm
sudo npm install -g pnpm

# Install QuestDB (via AUR)
yay -S questdb
```

#### Production Configuration

```bash
# Clone repository
git clone https://github.com/your-org/investment-trading-portfolio.git
cd investment-trading-portfolio

# Install dependencies
pnpm install

# Build all packages
pnpm turbo build

# Setup PM2
sudo npm install -g pm2

# Configure systemd services
sudo systemctl enable mongodb
sudo systemctl enable redis
sudo systemctl enable questdb

# Start services
sudo systemctl start mongodb
sudo systemctl start redis
sudo systemctl start questdb

# Run with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

#### Production Environment Variables

Create `.env.production`:

```bash
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017

# QuestDB (Time-Series for ML Training)
QUESTDB_HOST=localhost
QUESTDB_PORT=8812  # PG Wire Protocol
QUESTDB_ILP_PORT=9000 # InfluxDB Line Protocol (Fast Ingestion)
QUESTDB_USER=admin
QUESTDB_PASSWORD=quest

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# API Keys
UPSTOX_API_KEY=<your-key>
UPSTOX_API_SECRET=<your-secret>
```

---

## Development Workflow

### 1. Shared Package Development

**CRITICAL RULE**: All shared code MUST go in `packages/` directory.

#### Adding a New Type

```bash
# 1. Define schema in @repo/schema
cd packages/schema/src/trading
nano new-feature.schema.ts

# 2. Export from index.ts
nano index.ts

# 3. Build schema package
cd ../..
pnpm build

# 4. Use in apps
# Apps will automatically have the new types after build
```

#### Modifying Database Schemas

```bash
# 1. Update Mongoose schema in @repo/database
cd packages/database/src/schemas
nano your-schema.schema.ts

# 2. Update module registration
nano ../database.module.ts

# 3. Build database package
cd ../..
pnpm build

# 4. Apps will have updated schemas after rebuild
```

### 2. Adding a New API Endpoint

```bash
# 1. Define request/response types in @repo/schema
cd packages/schema/src/api
nano your-endpoint.schema.ts

# 2. Add tRPC router in API app
cd apps/api/src
# Create router file (e.g., portfolio/portfolio.router.ts)
# Define procedures using @mguay/nestjs-trpc decorators
# Register router in app.module.ts

# 3. AppRouter type auto-exports to @repo/schema/src/api/app-router.ts

# 4. Test
pnpm test
```

### 3. Adding a New ML Model

```bash
# 1. Train model in Python
cd apps/algo-worker/ml/training
python train_xgboost.py

# 2. Export to ONNX
python export_onnx.py

# 3. Update model loader
cd ../../src/engines/signal
nano model-loader.service.ts

# 4. Add metadata
# Use ModelMetadataService to register model version

# 5. Test inference
pnpm test models
```

---

## Type Generation & Schema Management

### Zod-to-TypeScript Workflow

**All types flow from Zod schemas:**

```
@repo/schema (Zod) → TypeScript types → All apps
```

#### Adding a New Schema

```typescript
// packages/schema/src/trading/my-feature.schema.ts
import { z } from "zod";

export const myFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  createdAt: z.date(),
});

export type MyFeature = z.infer<typeof myFeatureSchema>;

// Input types for API
export type MyFeatureCreateInput = Omit<MyFeature, "id" | "createdAt">;
export type MyFeatureUpdateInput = Partial<MyFeatureCreateInput>;
```

#### Generating Python Types (Future)

```bash
# When needed, we can generate Python types from Zod
pnpm turbo generate:python-types
```

---

## Database Management

### MongoDB

**ALL MongoDB code MUST be in `@repo/database`.**

#### Creating a New Repository

```typescript
// packages/database/src/repositories/my-feature.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MyFeature } from "../schemas/my-feature.schema";

@Injectable()
export class MyFeatureRepository {
  constructor(
    @InjectModel(MyFeature.name)
    private readonly model: Model<MyFeature>
  ) {}

  async create(data: any): Promise<MyFeature> {
    const doc = new this.model(data);
    await doc.save();
    return doc.toObject();
  }

  async findById(id: string): Promise<MyFeature | null> {
    const doc = await this.model.findById(id);
    return doc ? doc.toObject() : null;
  }
}
```

### QuestDB

**Primary store for High-Frequency Tick Data & Candles.**
Used by `market-feeder` for ingestion and `training-pipeline` (Python) for ML training.

#### Writing Data (Node.js)

```typescript
import { QuestDBService } from '@repo/database';

async saveFeatures(data: FeatureData): Promise<void> {
  // Uses ILP (InfluxDB Line Protocol) for maximum speed
  await this.questdb.insertFeatures([data]);
}
```

#### Querying Data (Python / Pandas)

```python
import psycopg2
import pandas as pd

# Connect via Postgres Wire Protocol
conn = psycopg2.connect(
    host="localhost",
    port="8812",
    user="admin",
    password="quest",
    database="qdb"
)

# Read into DataFrame for Training
df = pd.read_sql((
    "SELECT timestamp, price, volume "
    "FROM ticks "
    "WHERE symbol = 'NIFTY50' "
    "AND timestamp > dateadd('d', -30, now())"
), conn)
```

### Redis

**Caching and pub/sub.**

#### Pub/Sub Pattern

```typescript
import { RedisService } from "@repo/database";

// Publisher (market-feeder)
await redis.publishMarketData({
  symbol: "NIFTY50",
  price: 19500,
  timestamp: new Date(),
});

// Subscriber (data-processor)
redis.subscribeToMarketData((data) => {
  console.log("Received:", data);
});
```

---

## Testing Strategy

### Unit Tests

```bash
# Run all tests
pnpm turbo test

# Run tests for specific package
cd packages/schema
pnpm test

# Run with coverage
pnpm test:cov
```

### Integration Tests

```bash
# Test database integration
cd apps/algo-worker
pnpm test:e2e
```

### Testing Best Practices

1. **Mock External Dependencies**: Use Jest mocks for Upstox API, external services
2. **Test Database Operations**: Use in-memory MongoDB for testing
3. **Test Type Safety**: Ensure Zod validation catches errors
4. **Test Error Handling**: Verify exceptions are caught and logged

---

## Debugging Guide

### VS Code Launch Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Algo Worker",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/apps/algo-worker",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debugging Python Models

```bash
cd apps/algo-worker/ml
python -m pdb training/train_xgboost.py
```

### Database Debugging

#### MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/trading

# View collections
show collections

# Query signals
db.trading_signals.find().sort({timestamp: -1}).limit(10)
```

#### QuestDB

```bash
# Connect to QuestDB web console
# Open http://localhost:9000

# Query features
SELECT * FROM features ORDER BY timestamp DESC LIMIT 100;
```

#### Redis

```bash
# Connect to Redis
redis-cli

# Monitor pub/sub
SUBSCRIBE market-data

# View keys
KEYS *
```

---

## Common Issues & Solutions

### Issue 1: Type Errors After Schema Changes

**Problem**: TypeScript errors after updating @repo/schema

**Solution**:

```bash
# Rebuild schema package
cd packages/schema
pnpm build

# Rebuild apps
cd ../../apps/algo-worker
pnpm build
```

### Issue 2: Database Connection Failures

**Problem**: Cannot connect to MongoDB/QuestDB/Redis

**Solution**:

```bash
# Check if services are running
docker ps

# Restart services
docker-compose restart mongodb questdb redis

# Check logs
docker logs <container-id>
```

### Issue 3: Model Loading Errors

**Problem**: ONNX models fail to load

**Solution**:

```bash
# Verify model files exist
ls apps/algo-worker/ml/models/

# Re-export models
cd apps/algo-worker/ml/training
python export_onnx.py

# Check model checksums
# Use ModelMetadataService.verifyModelIntegrity()
```

### Issue 4: Python Environment Issues

**Problem**: Python dependencies not found

**Solution**:

```bash
# Windows
cd apps/algo-worker/ml
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Linux
cd apps/algo-worker/ml
source venv/bin/activate
pip install -r requirements.txt
```

### Issue 5: PM2 Process Not Starting

**Problem**: PM2 fails to start apps

**Solution**:

```bash
# Check PM2 logs
pm2 logs

# Delete and restart
pm2 delete all
pm2 start ecosystem.config.js

# Check environment variables
pm2 env 0
```

---

## Deployment

### Manual Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm turbo build

# 4. Run database migrations (if any)
# MongoDB migrations are auto-applied

# 5. Restart services
pm2 restart all
```

### Automated Deployment (Future)

- GitHub Actions for CI/CD
- Docker containers for deployment
- Kubernetes for orchestration
- Blue-green deployment strategy

---

## Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [QuestDB Documentation](https://questdb.io/docs/)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

---

## Support

For issues and questions:

1. Check this guide first
2. Review app-specific README in `apps/*/README.md`
3. Check package-specific docs in `packages/*/README.md`
4. Review `docs/PROGRESS.md` for implementation status
5. Create an issue on GitHub

---

**Remember**: Follow the copilot instructions in `.github/copilot-instructions.md` for code generation rules.
