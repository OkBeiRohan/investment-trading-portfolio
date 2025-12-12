# Data Access Layer (DAL) Documentation

## Overview

The Data Access Layer (DAL) provides a secure, centralized approach to data fetching and mutations in the Next.js application. It implements security best practices from the [Next.js Security Blog](https://nextjs.org/blog/security-nextjs-server-components-actions).

> **Status**: ✅ DAL Implementation Complete | ⏳ API Routes Pending
>
> The DAL structure is fully implemented and ready to use. The corresponding tRPC API routes need to be implemented in the API backend (`apps/api`) to match these DAL calls.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Components                         │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  tRPC Hooks  │         │Server Actions│                 │
│  │ (useQuery)   │         │ (mutations)  │                 │
│  └──────┬───────┘         └──────┬───────┘                 │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
┌─────────▼────────────────────────▼──────────────────────────┐
│              Server Components / Server Actions             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Data Access Layer (DAL)                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │  lib/data/ │  │lib/actions/│  │  lib/dal   │    │  │
│  │  │  (reads)   │  │  (writes)  │  │  (auth)    │    │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │  │
│  └────────┼───────────────┼───────────────┼───────────┘  │
│           │               │               │               │
│           └───────────────┴───────────────┘               │
│                           │                                │
│                    ┌──────▼──────┐                        │
│                    │ Auth Session│ ──────────────┐        │
│                    │ Verification│               │        │
│                    └─────────────┘               │        │
│                                                  │        │
└──────────────────────────────────────────────────┼────────┘
                                                   │
                    ┌──────────────────────────────▼────────┐
                    │      NestJS API Backend               │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Better Auth (/api/auth/*)      │  │
                    │  │  - Session Management           │  │
                    │  │  - Organization Management      │  │
                    │  │  - User Authentication          │  │
                    │  └─────────────────────────────────┘  │
                    │  ┌─────────────────────────────────┐  │
                    │  │  tRPC Server (apps/api)         │  │
                    │  │  - Data Operations              │  │
                    │  │  - Business Logic               │  │
                    │  └─────────────────────────────────┘  │
                    └───────────────────────────────────────┘
```

## Key Principles

1. **Always Verify Session**: All data access requires authentication
2. **Organization Scoping**: All queries are scoped to the user's active organization
3. **Permission Checking**: Sensitive operations check specific permissions
4. **Input Validation**: All inputs are validated using Zod schemas
5. **Resource Ownership**: Verify resources belong to user's organization before access
6. **Centralized Access**: All data access goes through the DAL, never directly to APIs

## Directory Structure

```
src/lib/
├── dal.ts                    # Core DAL utilities (verifySession, permissions)
├── data/                     # Data fetching (for Server Components)
│   ├── index.ts              # Public API exports
│   ├── wealth.ts             # Wealth management queries
│   ├── trading.ts            # Trading queries
│   ├── account.ts            # Account queries
│   ├── organization.ts       # Organization queries
│   └── admin.ts              # Admin queries (restricted)
├── actions/                  # Server Actions (for mutations)
│   ├── index.ts              # Public API exports
│   ├── wealth.ts             # Wealth mutations
│   ├── trading.ts            # Trading mutations
│   ├── account.ts            # Account mutations
│   ├── organization.ts       # Organization mutations
│   └── admin.ts              # Admin mutations (restricted)
└── trpc/
    ├── client.ts             # Client-side tRPC (for Client Components)
    └── server.ts             # Server-side tRPC (for Server Components)
```

## Usage Patterns

### 1. Server Components (Data Fetching)

```typescript
// app/(dashboards)/wealth/overview/page.tsx
import { getNetWorthData, getAssetAllocation } from '@/lib/data';

export default async function WealthOverviewPage() {
  // Automatic session verification and org scoping
  const netWorth = await getNetWorthData();
  const assets = await getAssetAllocation();

  return (
    <div>
      <NetWorthWaterfall data={netWorth} />
      <AssetAllocationSunburst data={assets} />
    </div>
  );
}
```

**What happens behind the scenes:**

1. `verifySession()` checks authentication (redirects to login if not authenticated)
2. `getUserOrganization()` gets active organization ID
3. tRPC query includes `organizationId` automatically
4. API returns only data for that organization

### 2. Client Components (Mutations via Server Actions)

```typescript
// components/trade/strategies/LiveTunerPanel.tsx
'use client';

import { updateStrategyParameters } from '@/lib/actions';
import { toast } from 'sonner';

export function LiveTunerPanel({ strategyId }: Props) {
  const [stopLoss, setStopLoss] = useState(10);

  const handleUpdate = async () => {
    const result = await updateStrategyParameters({
      strategyId,
      parameters: { stopLoss }
    });

    if (result.success) {
      toast.success('Parameters updated in real-time');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div>
      <Slider value={stopLoss} onChange={setStopLoss} />
      <Button onClick={handleUpdate}>Update</Button>
    </div>
  );
}
```

**What happens behind the scenes:**

1. Input validation with Zod schema
2. `verifySession()` checks authentication
3. `hasPermission('trade.manageStrategies')` checks permission
4. `assertResourceOwnership()` verifies strategy belongs to user's org
5. tRPC mutation updates the strategy
6. `revalidatePath()` refreshes affected pages
7. Returns `{success: boolean, message?: string}`

### 3. Protected Admin Operations

```typescript
// components/admin/risk/KillSwitchPanel.tsx
'use client';

import { triggerKillSwitch } from '@/lib/actions';

export function KillSwitchPanel() {
  const handleGlobalKillSwitch = async () => {
    const result = await triggerKillSwitch({
      type: 'GLOBAL',
      reason: 'Emergency system halt triggered by admin'
    });

    if (result.success) {
      toast.success('Kill switch activated');
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleGlobalKillSwitch}
    >
      🚨 ACTIVATE KILL SWITCH
    </Button>
  );
}
```

**What happens behind the scenes:**

1. `verifySession()` checks authentication
2. `hasPermission('admin.executeKillSwitch')` checks admin permission
3. If user lacks permission, throws error (caught and returned as `{success: false}`)
4. Only admins/owners can trigger kill switches

## Core DAL Functions

### Authentication

```typescript
// lib/dal.ts

/**
 * Verify session (cached per request)
 * Redirects to login if not authenticated
 *
 * Connects to NestJS API backend via Better Auth client.
 * The authClient is configured to use /api/auth which is proxied to the backend.
 */
export const verifySession = cache(async () => {
  // Get session from Better Auth backend (NestJS API at /api/auth/*)
  const session = await authClient.getSession({
    fetchOptions: {
      credentials: "include", // Send cookies for authentication
    },
  });

  if (!session?.data) redirect("/login");
  return { userId: session.data.user.id, user: session.data.user };
});

/**
 * Get authenticated user
 */
export const getUser = cache(async () => {
  const session = await verifySession();
  return session.user;
});

/**
 * Get user's active organization
 *
 * The active organization ID is stored in the session.
 * Uses Better Auth organization plugin to fetch full organization details.
 */
export const getUserOrganization = cache(async () => {
  const session = await verifySession();

  // Get active organization ID from session
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) throw new Error("No active organization found");

  // Fetch full organization details from backend
  const orgDetails = await authClient.organization.getFullOrganization({
    query: { organizationId: activeOrgId },
  });

  // Extract user's role from organization members
  const membership = orgDetails.data.members?.find(
    (m) => m.userId === session.userId
  );

  return {
    organizationId: activeOrgId,
    role: membership?.role || "member",
  };
});
```

### Permission Checking

```typescript
/**
 * Check if user has permission
 */
export const hasPermission = cache(
  async (permission: string): Promise<boolean> => {
    const { role } = await getUserOrganization();

    // Implement RBAC logic
    if (role === "owner") return true;
    if (role === "admin") return adminPermissions.includes(permission);
    return memberPermissions.includes(permission);
  }
);

/**
 * Assert permission (throw if missing)
 */
export async function assertPermission(permission: string): Promise<void> {
  const canPerform = await hasPermission(permission);
  if (!canPerform) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Verify resource ownership
 */
export async function assertResourceOwnership(
  resourceOrgId: string
): Promise<void> {
  const { organizationId } = await getUserOrganization();
  if (resourceOrgId !== organizationId) {
    throw new Error(
      "Access denied: Resource belongs to different organization"
    );
  }
}
```

### Type-Safe Wrappers

```typescript
/**
 * Execute with authentication
 */
export async function withAuth<T>(
  fetcher: (session: Session) => Promise<T>
): Promise<T> {
  const session = await verifySession();
  return fetcher(session);
}

/**
 * Execute with permission check
 */
export async function withPermission<T>(
  permission: string,
  mutator: (session: Session) => Promise<T>
): Promise<T> {
  const session = await verifySession();
  await assertPermission(permission);
  return mutator(session);
}
```

## Permission Model

### Permission Format

Permissions follow the format: `<module>.<action>`

Examples:

- `wealth.view` - View wealth data
- `wealth.manageAssets` - Add/update/delete assets
- `trade.view` - View trading data
- `trade.executeStrategies` - Start/stop strategies
- `trade.manageStrategies` - Create/update/delete strategies
- `organization.viewMembers` - View organization members
- `organization.manageMembers` - Invite/remove members
- `admin.*` - All admin permissions

### Role Hierarchy

```typescript
Owner: ["*"]; // All permissions
Admin: ["admin.*", "trade.*", "wealth.*", "organization.*"];
Member: ["trade.view", "wealth.view"];
```

## Security Best Practices

### ✅ DO

```typescript
// ✅ Always use DAL functions
import { getNetWorthData } from "@/lib/data";
const data = await getNetWorthData();

// ✅ Validate all inputs
const schema = z.object({
  strategyId: z.string().min(1),
  parameters: z.record(z.unknown()),
});
const validated = schema.parse(params);

// ✅ Check permissions for mutations
return withPermission("trade.manageStrategies", async () => {
  // mutation logic
});

// ✅ Verify resource ownership
await assertResourceOwnership(strategy.organizationId);

// ✅ Return success/error objects
return { success: true, data: result };
```

### ❌ DON'T

```typescript
// ❌ Never bypass DAL
const data = await fetch('/api/wealth'); // WRONG

// ❌ Never trust client-provided IDs without verification
async function deleteAsset(assetId: string) {
  await db.delete(assetId); // WRONG - no ownership check
}

// ❌ Never skip permission checks
async function executeStrategy(strategyId: string) {
  // Missing: await assertPermission('trade.executeStrategies');
  await trpc.trade.strategies.start.mutate({ strategyId });
}

// ❌ Never expose errors to client
catch (error) {
  return { success: false, message: error.message }; // WRONG - exposes internals
}
```

## Error Handling

All Server Actions return a standardized response:

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; message: string };
```

Example:

```typescript
export async function createStrategy(
  params: CreateStrategyParams
): Promise<ActionResult<{ strategyId: string }>> {
  try {
    // Validate input
    const validated = schema.parse(params);

    // Check permissions
    return withPermission("trade.manageStrategies", async () => {
      const strategy = await trpc.trade.strategies.create.mutate(validated);
      return { success: true, data: { strategyId: strategy.id } };
    });
  } catch (error) {
    console.error("Failed to create strategy:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create strategy",
    };
  }
}
```

## Testing

### Unit Testing DAL Functions

```typescript
import { verifySession, hasPermission } from "@/lib/dal";

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => mockCookies),
}));

describe("DAL", () => {
  it("should verify session", async () => {
    const session = await verifySession();
    expect(session.userId).toBe("user123");
  });

  it("should check permissions correctly", async () => {
    const canManage = await hasPermission("trade.manageStrategies");
    expect(canManage).toBe(true);
  });
});
```

### Integration Testing Server Actions

```typescript
import { updateStrategyParameters } from "@/lib/actions";

describe("updateStrategyParameters", () => {
  it("should update parameters with valid permission", async () => {
    const result = await updateStrategyParameters({
      strategyId: "strategy123",
      parameters: { stopLoss: 10 },
    });

    expect(result.success).toBe(true);
  });

  it("should reject without permission", async () => {
    // Mock user without permission
    const result = await updateStrategyParameters({
      strategyId: "strategy123",
      parameters: { stopLoss: 10 },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Permission denied");
  });
});
```

## Migration Guide

### Before (Direct tRPC Calls)

```typescript
// ❌ Old approach - no security checks
export default async function TradePage() {
  const strategies = await trpc.trade.strategies.getAll.query();
  return <StrategyList strategies={strategies} />;
}
```

### After (Using DAL)

```typescript
// ✅ New approach - automatic auth & org scoping
import { getActiveStrategies } from '@/lib/data';

export default async function TradePage() {
  const strategies = await getActiveStrategies();
  return <StrategyList strategies={strategies} />;
}
```

## References

- [Next.js Security in Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [tRPC Server-Side Calls](https://trpc.io/docs/server/server-side-calls)
- [Better Auth Session Management](https://better-auth.com/docs/concepts/session)
- [Zod Validation](https://zod.dev/)

---

## Next Steps

### 1. Implement tRPC API Routes

Add the following routers to `apps/api/src/app.module.ts` (tRPC routers are now defined in the API app):

```typescript
const appRouter = t.router({
  user: userRouter, // existing
  wealth: wealthRouter,
  trade: tradeRouter,
  account: accountRouter,
  organization: organizationRouter,
  admin: adminRouter,
});
```

Each router should implement the procedures called by the DAL:

- `wealth.getNetWorth`, `wealth.getAssetAllocation`, etc.
- `trade.options.volatilitySurface`, `trade.strategies.getAll`, etc.
- `account.getProfile`, `account.getLinkedAccounts`, etc.
- `organization.getAll`, `organization.getTeams`, etc.
- `admin.aiModels.getTrainingRuns`, `admin.risk.triggerKillSwitch`, etc.

### 2. Implement Backend Business Logic

In `apps/api`, implement the actual business logic for each tRPC procedure:

- Connect to databases (MongoDB, QuestDB, Redis)
- Apply organization scoping
- Enforce permissions
- Return properly typed data

### 3. Add Type Definitions

Add missing types to `@repo/schema`:

- `NetWorthData`, `AssetHierarchy`
- `VolatilitySurface`, `GammaExposure`, `Strategy`, `Position`
- `LinkedAccount`, `SecuritySettings`
- `TrainingRun`, `ModelDrift`, `TradeTrace`

---

**Status**: Implemented ✅ (Frontend DAL) | Pending ⏳ (Backend API Routes)  
**Last Updated**: December 5, 2025
