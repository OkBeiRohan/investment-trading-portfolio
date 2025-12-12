# Data Access Layer - Quick Reference

> **Status**: ✅ Frontend DAL Complete | ⏳ Backend API Routes Needed
>
> The DAL is ready to use. Implement corresponding tRPC routes in `apps/api`. The AppRouter type will be exported from `@repo/schema`.

## Structure Overview

```
src/lib/
├── dal.ts                      # Core DAL utilities
├── data/                       # Server Component data fetching
│   ├── index.ts                # Public API
│   ├── wealth.ts               # Wealth queries
│   ├── trading.ts              # Trading queries
│   ├── account.ts              # Account queries
│   ├── organization.ts         # Organization queries
│   └── admin.ts                # Admin queries
├── actions/                    # Server Actions (mutations)
│   ├── index.ts                # Public API
│   ├── wealth.ts               # Wealth mutations
│   ├── trading.ts              # Trading mutations
│   ├── account.ts              # Account mutations
│   ├── organization.ts         # Organization mutations
│   └── admin.ts                # Admin mutations
└── trpc/
    ├── client.ts               # Client-side tRPC
    └── server.ts               # Server-side tRPC
```

## Quick Start

### Server Components (Read Data)

```typescript
import { getNetWorthData } from '@/lib/data';

export default async function Page() {
  const data = await getNetWorthData();
  return <Component data={data} />;
}
```

### Client Components (Mutate Data)

```typescript
'use client';
import { updateStrategyParameters } from '@/lib/actions';

export function Component() {
  const handleUpdate = async () => {
    const result = await updateStrategyParameters({ ... });
    if (result.success) {
      toast.success('Updated!');
    }
  };

  return <Button onClick={handleUpdate}>Update</Button>;
}
```

## Security Features

✅ Automatic session verification  
✅ Organization scoping  
✅ Permission checking  
✅ Input validation (Zod)  
✅ Resource ownership verification  
✅ Centralized error handling

## See Full Documentation

→ [DATA_ACCESS_LAYER.md](./DATA_ACCESS_LAYER.md)
