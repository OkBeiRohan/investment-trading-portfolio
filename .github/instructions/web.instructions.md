---
applyTo: "apps/web/**"
---

# GitHub Copilot Instructions - Web Dashboard (UFOS)

## Role & Context

You are working on the **Web Dashboard** - the Next.js frontend implementing the **Quantum Investments and Trades** platform (Unified Financial Operating System - UFOS). This is a comprehensive trading and wealth management platform with multi-dashboard architecture, organization-level multi-tenancy, and forensic AI observability.

## Application Overview

**Purpose**: Unified Financial Operating System bridging algorithmic trading and holistic wealth management
**Port**: 3000
**Stack**: Next.js 16 (App Router, RSC), React, TypeScript, TailwindCSS, Better Auth, tRPC

**Core Modules**:

1. **Wealth Management Dashboard** ("Financial Sanctum") - Net worth tracking, multi-asset aggregation, legacy planning
2. **Algorithmic Trading Cockpit** ("Combat Cockpit") - Nifty Options analytics, Greeks visualization, strategy micromanagement
3. **Debt & Loan Optimization** (New) - Intelligent arbitrage between investment returns and loan interest rates. AI-powered recommendations for prepaying loans vs investing surplus lumpsum.
4. **Account Dashboard** - Profile, linked accounts, security, preferences
5. **Organization Management Dashboard** - Multi-tenancy with teams, roles, RBAC
6. **Admin "God Mode" Dashboard** - AI model observability, kill switches, compliance monitoring

## Critical Architecture Rules

### 1. Multi-Dashboard Modularity (CRITICAL)

**EVERY dashboard is a self-contained module with:**

- **Dedicated routes** under `app/(dashboards)/{module}/`
- **Dedicated tRPC routers** (e.g., `wealth.*`, `trade.*`, `admin.*`)
- **Isolated layouts** with module-specific sidebar navigation
- **Separate Zustand stores** for local UI state
- **Access control** via organization/team permissions

```typescript
// ❌ BAD: Mixing concerns across dashboards
import { useWealthData } from "@/hooks/wealth";
// ... then using it in trade dashboard

// ✅ GOOD: Clear module separation
// In app/(dashboards)/wealth/overview/page.tsx
import { getNetWorthData } from "@/lib/data";

const netWorth = await getNetWorthData();

// In app/(dashboards)/trade/options/greeks/page.tsx
import { getVolatilitySurface } from "@/lib/data";

const surface = await getVolatilitySurface({
  symbol: "NIFTY",
  expiry: "WEEKLY",
});
```

### 2. Organization-First Design (CRITICAL)

**ALL data access is scoped to organizations and teams:**

```typescript
// ✅ CORRECT: Use DAL which automatically scopes to organization
import { getNetWorthData } from '@/lib/data';

export default async function WealthPage() {
  const netWorth = await getNetWorthData(); // Automatic org scoping
  return <NetWorthWaterfall data={netWorth} />;
}

// ✅ CORRECT: Client Components use tRPC hooks
import { trpc } from '@/lib/trpc/client';

export function LiveData() {
  // Organization context automatically added by provider
  const { data } = trpc.wealth.getNetWorth.useQuery();
  return <Display data={data} />;
}
```

**Permission Checking Before Render:**

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function ExecuteStrategyButton() {
  const { can } = usePermissions();

  if (!can('trade.executeStrategies')) {
    return null; // Or <DisabledButton />
  }

  return <Button onClick={executeStrategy}>Execute</Button>;
}
```

### 3. Shared Package Usage (MANDATORY)

**ALWAYS use shared packages for type safety - NEVER duplicate:**

```typescript
// ✅ CORRECT - Use shared packages
import { type TradingSignal, type Position, type NetWorthData } from '@repo/schema';
import { trpc } from '@/lib/trpc';
import { authClient } from '@repo/authentication';

// ❌ WRONG - Local type definitions
interface TradingSignal { ... } // NEVER
interface NetWorthData { ... } // NEVER
```

**Shared Packages:**

- `@repo/schema` - Zod schemas, TypeScript types, and tRPC AppRouter type (source of truth)
- `@repo/authentication` - Better Auth client configuration
- `@repo/eslint-config`, `@repo/typescript-config` - Config packages

### 4. Data Access Layer (DAL) - MANDATORY

**ALL data access MUST go through the Data Access Layer:**

```typescript
// ✅ CORRECT - Use DAL for Server Components
import { getNetWorthData, getActiveStrategies } from '@/lib/data';

export default async function WealthOverviewPage() {
  // Automatic session verification (via NestJS Better Auth backend)
  // Automatic org scoping
  const netWorth = await getNetWorthData();
  return <NetWorthWaterfall data={netWorth} />;
}

// ✅ CORRECT - Use Server Actions for mutations
import { updateStrategyParameters } from '@/lib/actions';

export function LiveTunerPanel() {
  const handleUpdate = async () => {
    const result = await updateStrategyParameters({
      strategyId: 'strategy123',
      parameters: { stopLoss: 10 }
    });
    if (result.success) toast.success('Updated');
  };
}

// ❌ WRONG - Direct tRPC calls (bypasses security)
import { trpc } from '@/lib/trpc/server';
const data = await trpc.wealth.getNetWorth.query(); // Security risk!
```

**DAL Benefits:**

- ✅ Automatic session verification via NestJS Better Auth backend (`/api/auth/*`)
- ✅ Organization scoping (all queries scoped to user's active org)
- ✅ Permission checking (sensitive operations require specific permissions)
- ✅ Input validation (Zod schemas validate all inputs)
- ✅ Resource ownership verification (prevents cross-org access)
- ✅ Centralized error handling

**Reference**: See [DATA_ACCESS_LAYER.md](../../apps/web/docs/DATA_ACCESS_LAYER.md) for full documentation

### 5. Data Fetching Strategy

**Use appropriate pattern based on component type:**

#### Server Components (RSC) - Preferred for Initial Data

```typescript
// app/(dashboards)/wealth/overview/page.tsx
import { trpc } from '@/lib/trpc-server'; // Note: server version
import { getServerSession } from '@/hooks/auth';

export default async function WealthOverviewPage() {
  const session = await getServerSession();
  const netWorth = await trpc.wealth.getNetWorth.query({
    organizationId: session.user.activeOrganizationId,
  });

  return <NetWorthWaterfall data={netWorth} />;
}
```

#### Client Components - For Interactivity

```typescript
// components/trade/VolatilitySurface.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function VolatilitySurface() {
  const { data, isLoading } = trpc.trade.options.volatilitySurface.useQuery(
    { symbol: 'NIFTY', expiry: 'WEEKLY' },
    { refetchInterval: 5000 } // poll every 5 seconds
  );

  if (isLoading) return <Skeleton3D />;
  return <Plotly3DSurface data={data} />;
}
```

#### Real-Time Subscriptions - For Live Data

```typescript
// components/trade/LiveGEXDashboard.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function LiveGEXDashboard() {
  const { data } = trpc.trade.options.gammaExposure.useSubscription(
    { symbol: 'NIFTY' },
    {
      onData: (gex) => {
        console.log('GEX updated:', gex.flipZone);
      },
    }
  );

  return <GEXHistogram data={data} />;
}
```

### 5. Next.js App Router Structure (Multi-Dashboard)

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── verify/
├── (dashboards)/
│   ├── wealth/              # Module 1: Wealth Management
│   │   ├── overview/        # Net Worth Waterfall
│   │   ├── assets/          # Asset Allocation (Sunburst)
│   │   ├── [assetId]/       # Deep dive (PF, NPS, Crypto, etc.)
│   │   ├── legacy/          # Life Beat & Estate Planning
│   │   └── analytics/       # Time-Machine, Sankey flows
│   ├── trade/               # Module 2: Algo Trading Cockpit
│   │   ├── options/         # Nifty Options Analytics
│   │   │   ├── greeks/      # Greeks Command Center
│   │   │   ├── volatility/  # 3D Surface, Max Pain
│   │   │   └── gex/         # Gamma Exposure Dashboard
│   │   ├── strategies/      # Strategy Management
│   │   │   ├── active/      # Running strategies with live tuner
│   │   │   ├── create/      # Node-based canvas (no-code)
│   │   │   └── [strategyId]/# Strategy detail & backtests
│   │   ├── execution/       # Order book, fills, slippage
│   │   └── analytics/       # Performance attribution
│   ├── account/             # Module 3: Account Dashboard
│   │   ├── profile/         # User profile & KYC
│   │   ├── linked-accounts/ # Brokerage/bank/exchange connections
│   │   ├── security/        # 2FA, API tokens, sessions
│   │   └── preferences/     # Notifications, display settings
│   ├── organization/        # Module 4: Organization Management
│   │   ├── overview/        # Org dashboard home
│   │   ├── teams/           # Team creation & management
│   │   ├── members/         # Member list, invitations, roles
│   │   ├── access-control/  # RBAC configuration
│   │   └── billing/         # Subscription & usage (future)
│   └── admin/               # Module 5: God Mode (Admin only)
│       ├── ai-models/       # Model training telemetry
│       │   ├── training/    # Loss curves, epoch tracking
│       │   ├── inference/   # Drift detection, confidence vs. reality
│       │   └── explainability/ # SHAP plots, feature importance
│       ├── agents/          # Agentic trace waterfalls
│       ├── risk/            # Kill switches, circuit breakers
│       ├── compliance/      # Audit trail, regulatory limits
│       └── system/          # Infrastructure health
└── api/
    └── trpc/[trpc]/         # tRPC API endpoint
```

**Layout Pattern:**

- Each dashboard module has its own `layout.tsx` with module-specific sidebar
- Shared `DashboardLayout` wrapper provides org switcher and header
- Use `loading.tsx` and `error.tsx` per route for proper UX

### 6. Authentication with Better Auth

**Better Auth Setup:**

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client";
import {
  organizationClient,
  twoFactorClient,
  passkeyClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), twoFactorClient(), passkeyClient()],
});

// Hooks in app hooks/auth/
export { useAuth } from "@/hooks/auth/use-auth";
export { useOrganizationData } from "@/hooks/auth/use-organization-data";
export { getServerSession } from "@/hooks/auth"; // For RSC
```

### 7. Protected Routes with Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/hooks/auth";

export async function middleware(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const hasAdminAccess =
      session.user.role === "ADMIN" || session.user.role === "OWNER";
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wealth/:path*",
    "/trade/:path*",
    "/admin/:path*",
    "/organization/:path*",
  ],
};
```

## Dashboard-Specific Development Patterns

### Module 1: Wealth Management Dashboard

**Key Components:**

```typescript
// components/wealth/NetWorthWaterfall.tsx
'use client';

import { type NetWorthData } from '@repo/schema';

interface Props {
  data: NetWorthData;
}

export function NetWorthWaterfall({ data }: Props) {
  const liquidTotal = Object.values(data.liquidAssets).reduce((a, b) => a + b, 0);
  const lockedTotal = Object.values(data.lockedAssets).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 bg-green-100 p-4 rounded">
          <h3>Liquid Assets (Firepower)</h3>
          <p className="text-2xl font-bold">₹{liquidTotal.toLocaleString()}</p>
        </div>
        <div className="flex-1 bg-blue-100 p-4 rounded">
          <h3>Locked Assets (Fortress)</h3>
          <p className="text-2xl font-bold">₹{lockedTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="text-xl font-bold">
        True Net Worth: ₹{(liquidTotal + lockedTotal - data.totalLiabilities).toLocaleString()}
      </div>
    </div>
  );
}
```

**Sunburst Chart (Asset Allocation):**

```typescript
// components/wealth/AssetAllocationSunburst.tsx
'use client';

import dynamic from 'next/dynamic';
import { type AssetHierarchy } from '@repo/schema';

const D3Sunburst = dynamic(() => import('./D3SunburstImpl'), { ssr: false });

export function AssetAllocationSunburst({ data }: { data: AssetHierarchy[] }) {
  const handleSegmentClick = (segment: AssetHierarchy) => {
    // Filter dashboard context to this asset class
    router.push(`/wealth/assets/${segment.level1.toLowerCase()}`);
  };

  return <D3Sunburst data={data} onSegmentClick={handleSegmentClick} />;
}
```

### Module 2: Algorithmic Trading Cockpit

**Greeks Visualization:**

```typescript
// components/trade/options/GreeksCommandCenter.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { VolatilitySurface3D } from './VolatilitySurface3D';
import { GEXHistogram } from './GEXHistogram';
import { VannaHeatmap } from './VannaHeatmap';

export function GreeksCommandCenter() {
  const { data: volSurface } = trpc.trade.options.volatilitySurface.useSubscription(
    { symbol: 'NIFTY' }
  );

  const { data: gex } = trpc.trade.options.gammaExposure.useSubscription(
    { symbol: 'NIFTY' }
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <VolatilitySurface3D data={volSurface} />
      </div>
      <GEXHistogram data={gex} />
      <VannaHeatmap />
    </div>
  );
}
```

**Live Parameter Tuning:**

```typescript
// components/trade/strategies/LiveTunerPanel.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Slider } from '@/components/ui/slider';

export function LiveTunerPanel({ strategyId }: { strategyId: string }) {
  const { data: strategy } = trpc.trade.strategies.get.useQuery({ id: strategyId });
  const { mutate: updateParams } = trpc.trade.strategies.updateParameters.useMutation({
    onSuccess: () => {
      toast.success('Parameters updated (applied in real-time)');
    },
  });

  const [stopLoss, setStopLoss] = useState(strategy?.parameters.stopLossPercent ?? 10);

  const handleStopLossChange = (value: number[]) => {
    setStopLoss(value[0]);
    // Debounced update to backend
    debouncedUpdate({ strategyId, stopLossPercent: value[0] });
  };

  return (
    <div className="space-y-4 p-4 border rounded">
      <h3>Live Tuner</h3>
      <div>
        <label>Stop Loss: {stopLoss}%</label>
        <Slider
          value={[stopLoss]}
          onValueChange={handleStopLossChange}
          min={5}
          max={50}
          step={1}
        />
      </div>
      {/* More parameter controls */}
    </div>
  );
}
```

**Node-Based Strategy Canvas:**

```typescript
// components/trade/strategies/StrategyCanvas.tsx
'use client';

import ReactFlow, { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  risk: RiskNode,
  context: ContextNode,
};

export function StrategyCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const handleSaveStrategy = async () => {
    await trpc.trade.strategies.create.mutate({
      name: 'Custom Strategy',
      nodes,
      edges,
    });
  };

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
      />
      <button onClick={handleSaveStrategy}>Save Strategy</button>
    </div>
  );
}
```

### Module 3: Account Dashboard

**Linked Accounts Management:**

```typescript
// components/account/LinkedAccountsList.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LinkedAccountsList() {
  const { data: accounts } = trpc.account.getLinkedAccounts.useQuery();
  const { mutate: unlink } = trpc.account.unlinkAccount.useMutation();

  return (
    <div className="space-y-4">
      {accounts?.map((account) => (
        <Card key={account.accountId}>
          <div className="flex justify-between items-center p-4">
            <div>
              <h3>{account.provider}</h3>
              <p className="text-sm text-gray-600">
                {account.type} • Last sync: {new Date(account.lastSync).toLocaleString()}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => unlink({ accountId: account.accountId })}
            >
              Unlink
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Module 4: Organization Management

**Organization Switcher:**

```typescript
// components/organization/OrganizationSwitcher.tsx
'use client';

import { useOrganization } from '@/hooks/organization/use-organization';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';

export function OrganizationSwitcher() {
  const { organizations, activeOrganizationId, switchOrganization } = useOrganization();

  return (
    <Select value={activeOrganizationId} onValueChange={switchOrganization}>
      <SelectTrigger className="w-[200px]">
        {organizations.find(o => o.id === activeOrganizationId)?.name}
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Team Management:**

```typescript
// components/organization/TeamsList.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { usePermissions } from '@/hooks/usePermissions';

export function TeamsList() {
  const { can } = usePermissions();
  const { data: teams } = trpc.organization.getTeams.useQuery();
  const { mutate: createTeam } = trpc.organization.createTeam.useMutation();

  if (!can('organization.manageTeams')) {
    return <p>You don't have permission to manage teams.</p>;
  }

  return (
    <div>
      {teams?.map((team) => (
        <TeamCard key={team.teamId} team={team} />
      ))}
      <Button onClick={() => createTeam({ name: 'New Team' })}>
        Create Team
      </Button>
    </div>
  );
}
```

### Module 5: Admin "God Mode"

**AI Model Training Dashboard:**

```typescript
// components/admin/ai-models/TrainingTelemetryDashboard.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function TrainingTelemetryDashboard() {
  const { data: runs } = trpc.admin.aiModels.getTrainingRuns.useQuery();

  return (
    <div className="space-y-6">
      {runs?.map((run) => (
        <div key={run.runId} className="border rounded p-4">
          <h3>{run.modelType} - Run {run.runId}</h3>

          <LineChart width={800} height={300} data={run.epochs}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="epoch" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="trainingLoss" stroke="#8884d8" name="Training Loss" />
            <Line type="monotone" dataKey="validationLoss" stroke="#82ca9d" name="Validation Loss" />
          </LineChart>

          {run.epochs.some((e, i) =>
            i > 0 && e.validationLoss > run.epochs[i-1].validationLoss
          ) && (
            <div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
              ⚠️ Overfitting detected: Validation loss diverging
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Kill Switch Panel:**

```typescript
// components/admin/risk/KillSwitchPanel.tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function KillSwitchPanel() {
  const [confirmSlide, setConfirmSlide] = useState(0);
  const { mutate: triggerKillSwitch } = trpc.admin.risk.triggerKillSwitch.useMutation();

  const handleGlobalKillSwitch = () => {
    if (confirmSlide === 100) {
      triggerKillSwitch({ type: 'GLOBAL' });
      setConfirmSlide(0);
    }
  };

  return (
    <div className="border-4 border-red-600 p-6 rounded-lg bg-red-50">
      <h2 className="text-2xl font-bold text-red-800 mb-4">
        🚨 EMERGENCY KILL SWITCH
      </h2>

      <p className="mb-4">Slide to activate global system halt:</p>

      <Slider
        value={[confirmSlide]}
        onValueChange={(v) => setConfirmSlide(v[0])}
        max={100}
        step={1}
        className="mb-4"
      />

      <Button
        variant="destructive"
        disabled={confirmSlide < 100}
        onClick={handleGlobalKillSwitch}
        className="w-full"
      >
        {confirmSlide === 100 ? 'ACTIVATE KILL SWITCH' : `Slide to ${100 - confirmSlide}%`}
      </Button>

      <ul className="mt-4 text-sm text-gray-700">
        <li>✓ Cancel all open orders</li>
        <li>✓ Close all positions (market exit)</li>
        <li>✓ Revoke API tokens</li>
        <li>✓ Disable non-admin logins</li>
      </ul>
    </div>
  );
}
```

**Agentic Trace Waterfall:**

```typescript
// components/admin/agents/TraceWaterfall.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { type TradeTrace } from '@repo/schema';

function SpanView({ span }: { span: Span }) {
  return (
    <div className="ml-4 border-l-2 border-gray-300 pl-4 py-2">
      <div className="flex justify-between items-center">
        <span className="font-medium">{span.name}</span>
        <span className="text-sm text-gray-600">{span.duration}ms</span>
      </div>
      <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
        {JSON.stringify(span.attributes, null, 2)}
      </pre>
      {span.children.map((child) => (
        <SpanView key={child.spanId} span={child} />
      ))}
    </div>
  );
}

export function TraceWaterfall({ traceId }: { traceId: string }) {
  const { data: trace } = trpc.admin.agents.getTrace.useQuery({ traceId });

  if (!trace) return <div>Loading trace...</div>;

  return (
    <div className="border rounded p-4">
      <h3>Trade Trace: {trace.tradeOpportunityId}</h3>
      <p>Decision: <strong>{trace.decision}</strong></p>
      <p>Total Duration: {trace.totalDuration}ms</p>

      <div className="mt-4">
        <SpanView span={trace.rootSpan} />
      </div>
    </div>
  );
}
```

## State Management

### Zustand for Local UI State

```typescript
// stores/tradeStore.ts
import { create } from "zustand";

interface TradeState {
  selectedStrategy: string | null;
  liveTunerOpen: boolean;
  chartTimeframe: "1D" | "1W" | "1M";
  setSelectedStrategy: (id: string | null) => void;
  toggleLiveTuner: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedStrategy: null,
  liveTunerOpen: false,
  chartTimeframe: "1D",
  setSelectedStrategy: (id) => set({ selectedStrategy: id }),
  toggleLiveTuner: () =>
    set((state) => ({ liveTunerOpen: !state.liveTunerOpen })),
}));
```

### React Query (via tRPC) for Server State

```typescript
// Automatic caching, deduplication, background refetching
const { data: portfolio } = trpc.wealth.getPortfolio.useQuery();

// Optimistic updates
const { mutate: updateStrategy } = trpc.trade.strategies.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await trpcUtils.trade.strategies.getAll.cancel();

    // Snapshot current data
    const previous = trpcUtils.trade.strategies.getAll.getData();

    // Optimistically update
    trpcUtils.trade.strategies.getAll.setData(undefined, (old) =>
      old?.map((s) => (s.id === newData.id ? { ...s, ...newData } : s))
    );

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    trpcUtils.trade.strategies.getAll.setData(undefined, context?.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    trpcUtils.trade.strategies.getAll.invalidate();
  },
});
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy visualization libraries
const Plotly3DSurface = dynamic(() => import('@/components/trade/Plotly3DSurface'), {
  loading: () => <Skeleton3D />,
  ssr: false, // disable SSR for plotly
});

const D3SankeyDiagram = dynamic(() => import('@/components/wealth/D3SankeyDiagram'), {
  loading: () => <SkeletonChart />,
  ssr: false,
});
```

### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component for automatic optimization
<Image
  src="/assets/organization-logo.png"
  alt="Organization Logo"
  width={200}
  height={50}
  priority // for above-the-fold images
/>
```

### Data Caching Strategy

```typescript
// tRPC query with stale-while-revalidate
const { data } = trpc.wealth.getNetWorth.useQuery(undefined, {
  staleTime: 60 * 1000, // 1 minute
  cacheTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

// Admin queries: less frequent refetch
const { data: auditLog } = trpc.admin.compliance.getAuditTrail.useQuery(
  undefined,
  {
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // no background refetch
  }
);
```

## Testing

```typescript
// Unit test example
describe('PositionCard', () => {
  it('renders position data', () => {
    const position = {
      id: '1',
      strategy: 'LONG_STRADDLE',
      instrument: 'NIFTY50',
      pnl: 1500,
      pnlPercent: 5.2,
    };

    render(<PositionCard position={position} />);
    expect(screen.getByText('LONG_STRADDLE')).toBeInTheDocument();
    expect(screen.getByText('+₹1500.00')).toBeInTheDocument();
  });
});
```

## Environment Variables

```bash
# .env.local
# Authentication
BETTER_AUTH_SECRET=<your-secret>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3004
NEXT_PUBLIC_TRPC_URL=http://localhost:3004/trpc

# Feature Flags
NEXT_PUBLIC_ENABLE_ADMIN_MODE=true
NEXT_PUBLIC_ENABLE_LEGACY_PLANNING=true
NEXT_PUBLIC_ENABLE_CRYPTO_ASSETS=true

# External Services
UPSTOX_API_KEY=<your-key>
BLOCKCHAIN_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<key>
INSURANCE_OCR_API_KEY=<your-key>
```

## Code Quality Standards

- **TypeScript Strict Mode**: Always enabled
- **ESLint**: Must pass with no errors
- **Prettier**: Auto-format all code
- **Accessibility**: Follow WCAG 2.1 AA standards
- **Tests**: Critical user flows covered

## When Making Changes

1. ✅ Use @repo/schema for all types
2. ✅ Use tRPC for API calls (type-safe)
3. ✅ Implement proper loading states
4. ✅ Handle errors gracefully
5. ✅ Add loading skeletons
6. ✅ Test on mobile devices
7. ✅ Optimize images and assets
8. ✅ Use semantic HTML
9. ✅ Check organization/team permissions before rendering
10. ✅ Ensure data is scoped to active organization

## Common Anti-Patterns to Avoid

❌ Defining types locally (use @repo/schema)  
❌ Direct API calls (use tRPC)  
❌ Missing loading states  
❌ No error boundaries  
❌ Inline styles instead of Tailwind  
❌ Unoptimized images  
❌ Missing accessibility attributes  
❌ Client-side data fetching without caching  
❌ Global data queries without organization scope  
❌ Mixing dashboard concerns (wealth logic in trade components)

## Documentation

Keep these files updated:

- `README.md` - Quick start, project overview
- `docs/ARCHITECTURE.md` - System architecture
- `docs/PROJECT_STATUS.md` - Implementation status
- `docs/COMPONENTS.md` - Component library (TODO)
- `docs/DASHBOARD_PATTERNS.md` - Multi-dashboard design patterns (TODO)

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [tRPC](https://trpc.io/docs)
- [Better Auth](https://better-auth.com/docs)
- [Recharts](https://recharts.org/en-US/)
- [D3.js](https://d3js.org/)
- [React Flow](https://reactflow.dev/)

---

**Last Updated**: December 25, 2025  
**Status**: Active Development - UFOS Implementation