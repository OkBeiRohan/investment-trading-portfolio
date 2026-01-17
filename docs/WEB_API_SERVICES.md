# Web Dashboard & API Services Architecture

> **Real-time trading dashboard, model monitoring, and API gateway for Quantum Investments and Trades.**

**Last Updated**: January 18, 2026

---

## Overview

This document describes the **cloud-hosted services** that provide:
- Real-time trading dashboard (Next.js)
- API gateway for all services (NestJS + tRPC)
- Model performance monitoring and analytics
- User configuration management

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUD (Render/Vercel)                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    WEB DASHBOARD (Next.js 16)                          │ │
│  │                                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │ Trading      │  │ Model        │  │ Portfolio    │  │ Wealth     │ │ │
│  │  │ Cockpit      │  │ Monitor      │  │ Analytics    │  │ Dashboard  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                              tRPC / REST                                    │
│                                    ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    API GATEWAY (NestJS + tRPC)                         │ │
│  │                                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │ Auth         │  │ User Config  │  │ Model        │  │ Wealth     │ │ │
│  │  │ Module       │  │ Module       │  │ Metrics      │  │ Module     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                          Redis Pub/Sub (Upstash)                            │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL (Trading Machine)                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    algo-worker (NestJS + GPU)                       │   │
│  │  • Real-time trading                                                │   │
│  │  • ML inference (ONNX Runtime)                                      │   │
│  │  • Publishes: positions, orders, signals, metrics                   │   │
│  │  • Subscribes: user config, commands                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Web Dashboard (apps/web)

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | Zustand + TanStack Query |
| Real-time | Server-Sent Events (SSE) |
| Charts | Recharts + Lightweight Charts |
| Auth | NextAuth.js v5 |

### Pages Structure

```
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Dashboard layout with sidebar
│   ├── page.tsx                # Overview / Home
│   ├── trading/
│   │   ├── page.tsx            # Trading cockpit
│   │   ├── positions/page.tsx  # Open positions
│   │   ├── orders/page.tsx     # Order history
│   │   └── signals/page.tsx    # Live signals
│   ├── models/
│   │   ├── page.tsx            # Model overview
│   │   ├── performance/page.tsx
│   │   ├── predictions/page.tsx
│   │   └── config/page.tsx     # Model configuration
│   ├── portfolio/
│   │   ├── page.tsx            # Portfolio analytics
│   │   ├── pnl/page.tsx        # P&L analysis
│   │   └── risk/page.tsx       # Risk metrics
│   └── wealth/
│       ├── page.tsx            # Net worth dashboard
│       ├── accounts/page.tsx   # Account management
│       └── insights/page.tsx   # AI insights
├── api/
│   ├── auth/[...nextauth]/route.ts
│   └── trpc/[trpc]/route.ts
└── layout.tsx                  # Root layout
```

### Trading Cockpit Components

```tsx
// components/trading/TradingCockpit.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { LiveChart } from './LiveChart';
import { PositionTable } from './PositionTable';
import { SignalPanel } from './SignalPanel';
import { RiskGauge } from './RiskGauge';

export function TradingCockpit() {
  const { data: marketData } = useSSE<MarketData>('/api/stream/market');
  const { data: positions } = useSSE<Position[]>('/api/stream/positions');
  const { data: signals } = useSSE<Signal[]>('/api/stream/signals');

  return (
    <div className="grid grid-cols-12 gap-4 h-screen p-4">
      {/* Live Chart - Left 8 columns */}
      <div className="col-span-8 bg-card rounded-lg border">
        <LiveChart data={marketData} positions={positions} />
      </div>
      
      {/* Signal Panel - Right 4 columns */}
      <div className="col-span-4 space-y-4">
        <SignalPanel signals={signals} />
        <RiskGauge positions={positions} />
      </div>
      
      {/* Positions - Bottom */}
      <div className="col-span-12 bg-card rounded-lg border">
        <PositionTable positions={positions} />
      </div>
    </div>
  );
}
```

### Model Performance Dashboard

```tsx
// components/models/ModelPerformance.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export function ModelPerformance() {
  const { data: metrics } = trpc.models.getPerformanceMetrics.useQuery();

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Model Cards */}
      {metrics?.models.map((model) => (
        <ModelCard key={model.name} model={model} />
      ))}
      
      {/* Accuracy Over Time */}
      <div className="col-span-3 bg-card rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Accuracy Trend (Last 7 Days)</h3>
        <LineChart width={800} height={300} data={metrics?.accuracyHistory}>
          <XAxis dataKey="date" />
          <YAxis domain={[0.5, 1]} />
          <Tooltip />
          <Line type="monotone" dataKey="lgb_accuracy" stroke="#8884d8" name="LightGBM" />
          <Line type="monotone" dataKey="tft_accuracy" stroke="#82ca9d" name="TFT" />
          <Line type="monotone" dataKey="meta_accuracy" stroke="#ffc658" name="Meta-Learner" />
        </LineChart>
      </div>
      
      {/* Horizon Breakdown */}
      <div className="col-span-3 bg-card rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Performance by Horizon</h3>
        <HorizonBreakdown data={metrics?.horizonMetrics} />
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: ModelMetrics }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold">{model.name}</h4>
        <StatusBadge status={model.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Accuracy" value={`${(model.accuracy * 100).toFixed(1)}%`} />
        <Metric label="AUC" value={model.auc.toFixed(3)} />
        <Metric label="Latency" value={`${model.latencyMs.toFixed(1)}ms`} />
        <Metric label="Calls Today" value={model.callsToday.toLocaleString()} />
      </div>
    </div>
  );
}
```

---

## 2. API Gateway (apps/api)

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | NestJS 10 |
| API Layer | tRPC + REST (hybrid) |
| Auth | Passport.js + JWT |
| Validation | Zod (via @repo/schema) |
| Database | MongoDB + Redis |

### Module Structure

```
apps/api/src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── upstox.strategy.ts
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   └── user.router.ts          # tRPC router
│   ├── trading/
│   │   ├── trading.module.ts
│   │   ├── trading.service.ts
│   │   ├── trading.router.ts       # tRPC router
│   │   └── trading.gateway.ts      # WebSocket gateway
│   ├── models/
│   │   ├── models.module.ts
│   │   ├── models.service.ts
│   │   └── models.router.ts        # tRPC router
│   ├── wealth/
│   │   ├── wealth.module.ts
│   │   ├── wealth.service.ts
│   │   └── wealth.router.ts        # tRPC router
│   └── config-sync/
│       ├── config-sync.module.ts
│       ├── config-sync.service.ts  # Redis pub/sub to algo-worker
│       └── config-sync.gateway.ts
├── trpc/
│   ├── trpc.module.ts
│   ├── trpc.router.ts              # Root router
│   └── trpc.context.ts
└── common/
    ├── guards/
    ├── filters/
    └── interceptors/
```

### tRPC Router Example

```typescript
// modules/models/models.router.ts
import { z } from 'zod';
import { router, protectedProcedure } from '@/trpc/trpc.router';
import { TRPCError } from '@trpc/server';

export const modelsRouter = router({
  // Get all model performance metrics
  getPerformanceMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      const metrics = await ctx.modelsService.getPerformanceMetrics(ctx.user.id);
      return metrics;
    }),
  
  // Get predictions for a specific horizon
  getPredictions: protectedProcedure
    .input(z.object({
      horizon: z.enum(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      return ctx.modelsService.getPredictions(input.horizon, input.limit);
    }),
  
  // Get model configuration
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.modelsService.getConfig(ctx.user.id);
    }),
  
  // Update model configuration
  updateConfig: protectedProcedure
    .input(z.object({
      enabledModels: z.array(z.string()),
      horizons: z.array(z.enum(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])),
      confidenceThreshold: z.number().min(0).max(1)
    }))
    .mutation(async ({ ctx, input }) => {
      // Update config in MongoDB
      const config = await ctx.modelsService.updateConfig(ctx.user.id, input);
      
      // Sync to algo-worker via Redis
      await ctx.configSyncService.publishConfigUpdate(ctx.user.id, config);
      
      return config;
    }),
  
  // Get model weights from meta-learner
  getModelWeights: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.modelsService.getLatestModelWeights();
    }),
  
  // Trigger model retrain (admin only)
  triggerRetrain: protectedProcedure
    .input(z.object({
      modelName: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      
      return ctx.modelsService.triggerRetrain(input.modelName, input.reason);
    })
});
```

### Config Sync Service (Redis Pub/Sub)

```typescript
// modules/config-sync/config-sync.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigSyncService implements OnModuleInit {
  private publisher: Redis;
  private subscriber: Redis;
  
  constructor(private configService: ConfigService) {}
  
  async onModuleInit() {
    const redisUrl = this.configService.get('UPSTASH_REDIS_URL');
    
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    
    // Subscribe to events from algo-worker
    await this.subscriber.subscribe(
      'trading:position_update',
      'trading:order_filled',
      'trading:signal',
      'model:prediction',
      'model:metrics'
    );
    
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }
  
  private handleMessage(channel: string, message: string) {
    const data = JSON.parse(message);
    
    switch (channel) {
      case 'trading:position_update':
        this.emitPositionUpdate(data);
        break;
      case 'trading:order_filled':
        this.emitOrderFilled(data);
        break;
      case 'model:prediction':
        this.emitPrediction(data);
        break;
      case 'model:metrics':
        this.storeMetrics(data);
        break;
    }
  }
  
  // Publish config update to algo-worker
  async publishConfigUpdate(userId: string, config: any) {
    await this.publisher.publish('config:update', JSON.stringify({
      userId,
      config,
      timestamp: Date.now()
    }));
  }
  
  // Publish command to algo-worker
  async publishCommand(userId: string, command: string, params: any) {
    await this.publisher.publish('command', JSON.stringify({
      userId,
      command,
      params,
      timestamp: Date.now()
    }));
  }
}
```

---

## 3. Model Monitoring & Analytics

### Metrics Collection

```typescript
// Types for model metrics
interface ModelMetrics {
  modelName: string;
  horizon: string;
  timestamp: Date;
  
  // Accuracy metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  
  // Calibration
  expectedCalibrationError: number;
  maxCalibrationError: number;
  
  // Performance
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  
  // Volume
  predictionsCount: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  
  // Financial metrics
  signalPnL: number;
  signalSharpe: number;
  signalMaxDrawdown: number;
}

// MongoDB aggregation for daily metrics
async function aggregateDailyMetrics(date: Date): Promise<ModelMetrics[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return await db.collection('predictions').aggregate([
    {
      $match: {
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: { modelName: '$modelName', horizon: '$horizon' },
        accuracy: { $avg: { $cond: ['$isCorrect', 1, 0] } },
        count: { $sum: 1 },
        avgLatency: { $avg: '$latencyMs' },
        // ... more aggregations
      }
    }
  ]).toArray();
}
```

### Dashboard Alerts

```typescript
// Alert configuration
const ALERT_THRESHOLDS = {
  accuracy: {
    warning: 0.55,
    critical: 0.50
  },
  latency: {
    warning: 100,  // ms
    critical: 200
  },
  drift: {
    warning: 0.1,  // ADWIN delta
    critical: 0.2
  }
};

// Alert service
@Injectable()
class AlertService {
  async checkModelHealth(metrics: ModelMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Accuracy check
    if (metrics.accuracy < ALERT_THRESHOLDS.accuracy.critical) {
      alerts.push({
        severity: 'critical',
        model: metrics.modelName,
        message: `Accuracy dropped to ${(metrics.accuracy * 100).toFixed(1)}%`,
        action: 'Consider retraining or disabling model'
      });
    } else if (metrics.accuracy < ALERT_THRESHOLDS.accuracy.warning) {
      alerts.push({
        severity: 'warning',
        model: metrics.modelName,
        message: `Accuracy at ${(metrics.accuracy * 100).toFixed(1)}%`
      });
    }
    
    // Latency check
    if (metrics.latencyP95Ms > ALERT_THRESHOLDS.latency.critical) {
      alerts.push({
        severity: 'critical',
        model: metrics.modelName,
        message: `P95 latency at ${metrics.latencyP95Ms}ms`,
        action: 'Check GPU memory, consider model simplification'
      });
    }
    
    return alerts;
  }
}
```

---

## 4. Real-Time Data Flow

### Server-Sent Events (SSE)

```typescript
// API route for SSE streaming
// apps/api/src/modules/trading/trading.controller.ts

@Controller('stream')
export class TradingStreamController {
  constructor(
    private tradingService: TradingService,
    private configSyncService: ConfigSyncService
  ) {}
  
  @Get('positions')
  @Sse()
  async streamPositions(@Req() req: AuthenticatedRequest): AsyncGenerator<MessageEvent> {
    const userId = req.user.id;
    
    // Initial data
    yield {
      data: JSON.stringify(await this.tradingService.getPositions(userId))
    };
    
    // Subscribe to updates
    const subscription = this.configSyncService.positionUpdates$
      .pipe(filter(update => update.userId === userId));
    
    for await (const update of subscription) {
      yield { data: JSON.stringify(update.positions) };
    }
  }
  
  @Get('signals')
  @Sse()
  async streamSignals(@Req() req: AuthenticatedRequest): AsyncGenerator<MessageEvent> {
    const userId = req.user.id;
    
    const subscription = this.configSyncService.signals$
      .pipe(filter(signal => signal.userId === userId));
    
    for await (const signal of subscription) {
      yield { data: JSON.stringify(signal) };
    }
  }
  
  @Get('model-predictions')
  @Sse()
  async streamPredictions(): AsyncGenerator<MessageEvent> {
    for await (const prediction of this.configSyncService.predictions$) {
      yield {
        data: JSON.stringify({
          timestamp: prediction.timestamp,
          horizon: prediction.horizon,
          direction: prediction.direction,
          confidence: prediction.confidence,
          modelWeights: prediction.modelWeights
        })
      };
    }
  }
}
```

### Client-Side SSE Hook

```tsx
// hooks/useSSE.ts
import { useState, useEffect, useCallback } from 'react';

export function useSSE<T>(url: string, options?: EventSourceInit) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  
  useEffect(() => {
    const eventSource = new EventSource(url, options);
    
    eventSource.onopen = () => {
      setStatus('open');
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (e) {
        setError(e as Error);
      }
    };
    
    eventSource.onerror = (e) => {
      setStatus('closed');
      setError(new Error('SSE connection failed'));
    };
    
    return () => {
      eventSource.close();
    };
  }, [url]);
  
  return { data, error, status };
}
```

---

## 5. Deployment Configuration

### Environment Variables

```env
# apps/api/.env
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://...
UPSTASH_REDIS_URL=rediss://...

# Auth
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://quantum-trades.vercel.app

# Upstox OAuth
UPSTOX_CLIENT_ID=your-client-id
UPSTOX_CLIENT_SECRET=your-client-secret
UPSTOX_REDIRECT_URI=https://api.quantum-trades.com/auth/upstox/callback
```

### Render Configuration

```yaml
# render.yaml
services:
  - type: web
    name: quantum-api
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: node dist/main.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: quantum-mongodb
          property: connectionString
    autoDeploy: true
    
  - type: web
    name: quantum-web
    env: static
    buildCommand: pnpm install && pnpm build
    staticPublishPath: ./apps/web/.next
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY
```

---

## Related Documentation

- [README.md](../../README.md) - Project overview
- [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md) - Full deployment guide
- [ml/README.md](./ml/README.md) - AI/ML documentation
- [algo-worker/README.md](../../apps/algo-worker/README.md) - Trading engine
